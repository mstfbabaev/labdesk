import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment
from app.models.order import Order
from app.models.user import User
from app.schemas.order import OrderCreate, OrderStatusUpdate

ALLOWED_TRANSITIONS = {
    "new": ["in_progress"],
    "in_progress": ["ready"],
    "ready": ["issued"],
    "issued": [],
}


async def create_order(db: AsyncSession, data: OrderCreate, doctor: User) -> Order:
    order = Order(
        doctor_id=doctor.id,
        patient_name=data.patient_name,
        work_type=data.work_type,
        delivery_date=data.delivery_date,
        comment=data.comment,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def get_stats(db: AsyncSession) -> dict:
    from app.models.order_file import OrderFile
    rows = (await db.execute(
        select(Order.status, func.count()).group_by(Order.status)
    )).all()
    counts = {r[0]: r[1] for r in rows}
    today = date.today()
    overdue = (await db.execute(
        select(func.count()).where(Order.delivery_date < today, Order.status != "issued")
    )).scalar_one()
    total_files = (await db.execute(select(func.count()).select_from(OrderFile))).scalar_one()
    return {
        "new": counts.get("new", 0),
        "in_progress": counts.get("in_progress", 0),
        "ready": counts.get("ready", 0),
        "issued": counts.get("issued", 0),
        "overdue": overdue,
        "total_files": total_files,
    }


async def get_orders(
    db: AsyncSession,
    current_user: User,
    page: int,
    page_size: int,
    status_filter: str | None,
    doctor_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
    sort_by: str,
    order_dir: str,
    search: str | None = None,
) -> tuple[list[Order], int]:
    q = select(Order).options(selectinload(Order.doctor), selectinload(Order.files))

    if current_user.role == "doctor":
        q = q.where(Order.doctor_id == current_user.id)
    elif doctor_id:
        q = q.where(Order.doctor_id == doctor_id)

    if status_filter:
        q = q.where(Order.status == status_filter)
    if date_from:
        q = q.where(Order.delivery_date >= date_from)
    if date_to:
        q = q.where(Order.delivery_date <= date_to)
    if search:
        q = q.where(Order.patient_name.ilike(f"%{search}%"))

    sort_col = getattr(Order, sort_by, Order.created_at)
    if order_dir == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    orders = result.scalars().all()
    return orders, total


async def get_order(db: AsyncSession, order_id: uuid.UUID, current_user: User) -> Order:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.doctor),
            selectinload(Order.files),
            selectinload(Order.comments).selectinload(Comment.author),
        )
        .where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == "doctor" and order.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return order


async def delete_order(db: AsyncSession, order_id: uuid.UUID) -> None:
    from app.models.order_file import OrderFile
    from app.services import storage_service

    result = await db.execute(
        select(Order).options(selectinload(Order.files)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    for f in order.files:
        try:
            storage_service.delete_file(f.storage_key)
        except Exception:
            pass

    await db.delete(order)
    await db.commit()


async def update_status(db: AsyncSession, order_id: uuid.UUID, data: OrderStatusUpdate) -> tuple[Order, str]:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if data.status not in ALLOWED_TRANSITIONS.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{order.status}' to '{data.status}'",
        )
    old_status = order.status
    order.status = data.status
    await db.commit()
    await db.refresh(order)
    return order, old_status
