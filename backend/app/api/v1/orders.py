import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.order import OrderCreate, OrderDetail, OrderListResponse, OrderStatusUpdate, OrderSummary
from app.services import order_service
from app.services import notification_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderDetail, status_code=201)
async def create_order(
    body: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "doctor":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only doctors can create orders")
    order = await order_service.create_order(db, body, current_user)
    detail = await order_service.get_order(db, order.id, current_user)

    try:
        await notification_service.notify_order_created(
            db=db,
            order_id=order.id,
            patient_name=order.patient_name,
            work_type=order.work_type,
            doctor_name=current_user.full_name,
        )
    except Exception:
        pass

    return detail


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    return await order_service.get_stats(db)


@router.get("", response_model=OrderListResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    doctor_id: uuid.UUID | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    sort_by: str = Query("created_at"),
    order: str = Query("desc"),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders, total = await order_service.get_orders(
        db, current_user, page, page_size, status, doctor_id, date_from, date_to, sort_by, order, search
    )
    items = []
    for o in orders:
        items.append(
            OrderSummary(
                id=o.id,
                patient_name=o.patient_name,
                work_type=o.work_type,
                delivery_date=o.delivery_date,
                status=o.status,
                created_at=o.created_at,
                doctor=o.doctor,
                file_count=len(o.files),
            )
        )
    return OrderListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=OrderDetail)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await order_service.get_order(db, order_id, current_user)


@router.delete("/{order_id}", status_code=204)
async def delete_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    await order_service.delete_order(db, order_id)


@router.patch("/{order_id}/status", response_model=OrderDetail)
async def update_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: User = Depends(require_admin),
):
    updated, old_status = await order_service.update_status(db, order_id, body)

    doctor = (await db.execute(select(User).where(User.id == updated.doctor_id))).scalar_one_or_none()

    try:
        await notification_service.notify_status_changed(
            db=db,
            order_id=order_id,
            patient_name=updated.patient_name,
            old_status=old_status,
            new_status=updated.status,
            doctor_id=updated.doctor_id,
            telegram_chat_id=doctor.telegram_chat_id if doctor else None,
        )
    except Exception:
        pass

    return await order_service.get_order(db, order_id, current_user)
