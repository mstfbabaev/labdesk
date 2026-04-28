import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: uuid.UUID
    order_id: Optional[uuid.UUID]
    recipient_id: Optional[uuid.UUID]
    event: str
    channel: str
    status: str
    error: Optional[str]
    attempts: int
    sent_at: Optional[datetime]
    created_at: datetime
    payload: dict

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    total: int


class TelegramUpdate(BaseModel):
    telegram_chat_id: Optional[str] = None


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    status_filter: Optional[str] = Query(None, alias="status"),
    channel: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = select(Notification).order_by(Notification.created_at.desc())
    if status_filter:
        q = q.where(Notification.status == status_filter)
    if channel:
        q = q.where(Notification.channel == channel)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (await db.execute(q.offset((page - 1) * page_size).limit(page_size))).scalars().all()
    return NotificationListResponse(items=items, total=total)


@router.get("/stats")
async def notification_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    rows = (await db.execute(
        select(Notification.status, func.count()).group_by(Notification.status)
    )).all()
    counts = {r[0]: r[1] for r in rows}
    return {
        "pending": counts.get("pending", 0),
        "sent": counts.get("sent", 0),
        "failed": counts.get("failed", 0),
        "total": sum(counts.values()),
    }


@router.post("/{notification_id}/retry", status_code=200)
async def retry_notification(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    notif = (await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )).scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notif.status != "failed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only failed notifications can be retried")

    notif.status = "pending"
    notif.error = None
    await db.commit()

    from app.services.notification_service import retry_deliver
    await retry_deliver(notification_id)
    return {"queued": True, "id": str(notification_id)}


@router.patch("/telegram/{user_id}", status_code=200)
async def set_user_telegram(
    user_id: uuid.UUID,
    body: TelegramUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.telegram_chat_id = body.telegram_chat_id
    await db.commit()
    return {"user_id": str(user_id), "telegram_chat_id": user.telegram_chat_id}
