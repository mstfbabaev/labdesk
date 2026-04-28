import asyncio
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.notification import Notification

STATUS_LABELS = {
    "new": "Новый",
    "in_progress": "В работе",
    "ready": "Готов к выдаче",
    "issued": "Выдан",
}


# ── Delivery ──────────────────────────────────────────────────────────────────

async def _send_telegram(payload: dict) -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": payload["chat_id"], "text": payload["text"], "parse_mode": "HTML"},
        )
        resp.raise_for_status()


async def _send_webhook(payload: dict) -> None:
    if not settings.WEBHOOK_URL:
        raise ValueError("WEBHOOK_URL not set")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(settings.WEBHOOK_URL, json=payload)
        resp.raise_for_status()


async def _deliver(notification_id: uuid.UUID) -> None:
    """Background coroutine: send notification and update status."""
    async with AsyncSessionLocal() as db:
        notif = (await db.execute(
            select(Notification).where(Notification.id == notification_id)
        )).scalar_one_or_none()
        if not notif:
            return

        notif.attempts += 1
        try:
            if notif.channel == "telegram":
                await _send_telegram(notif.payload)
            elif notif.channel == "webhook":
                await _send_webhook(notif.payload)
            notif.status = "sent"
            notif.sent_at = datetime.now(timezone.utc)
            notif.error = None
        except Exception as exc:
            notif.status = "failed"
            notif.error = str(exc)

        await db.commit()


def _schedule(notification_id: uuid.UUID) -> None:
    """Fire-and-forget: schedule delivery in the running event loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_deliver(notification_id))
    except RuntimeError:
        pass  # no running loop — skip


# ── Public helpers ─────────────────────────────────────────────────────────────

async def notify_status_changed(
    db: AsyncSession,
    order_id: uuid.UUID,
    patient_name: str,
    old_status: str,
    new_status: str,
    doctor_id: uuid.UUID,
    telegram_chat_id: str | None,
) -> None:
    to_send: list[Notification] = []

    if telegram_chat_id:
        text = (
            f"📋 <b>Статус заказа изменён</b>\n"
            f"Пациент: {patient_name}\n"
            f"Статус: {STATUS_LABELS.get(old_status, old_status)} → "
            f"<b>{STATUS_LABELS.get(new_status, new_status)}</b>"
        )
        n = Notification(
            order_id=order_id, recipient_id=doctor_id,
            event="status_changed", channel="telegram", status="pending",
            payload={"chat_id": telegram_chat_id, "text": text},
        )
        db.add(n)
        to_send.append(n)

    if settings.WEBHOOK_URL:
        n = Notification(
            order_id=order_id,
            event="status_changed", channel="webhook", status="pending",
            payload={"event": "status_changed", "order_id": str(order_id),
                     "patient_name": patient_name,
                     "old_status": old_status, "new_status": new_status},
        )
        db.add(n)
        to_send.append(n)

    if not to_send:
        return

    await db.commit()
    for n in to_send:
        await db.refresh(n)
        _schedule(n.id)


async def notify_order_created(
    db: AsyncSession,
    order_id: uuid.UUID,
    patient_name: str,
    work_type: str,
    doctor_name: str,
) -> None:
    from app.models.user import User

    admins = (await db.execute(
        select(User).where(
            User.role == "admin",
            User.is_active.is_(True),
            User.telegram_chat_id.isnot(None),
        )
    )).scalars().all()

    to_send: list[Notification] = []

    text = (
        f"🆕 <b>Новый заказ</b>\n"
        f"Пациент: {patient_name}\n"
        f"Работа: {work_type}\n"
        f"Врач: {doctor_name}"
    )

    for admin in admins:
        n = Notification(
            order_id=order_id,
            recipient_id=admin.id,
            event="order_created", channel="telegram", status="pending",
            payload={"chat_id": admin.telegram_chat_id, "text": text},
        )
        db.add(n)
        to_send.append(n)

    if settings.WEBHOOK_URL:
        n = Notification(
            order_id=order_id,
            event="order_created", channel="webhook", status="pending",
            payload={"event": "order_created", "order_id": str(order_id),
                     "patient_name": patient_name, "work_type": work_type,
                     "doctor_name": doctor_name},
        )
        db.add(n)
        to_send.append(n)

    if not to_send:
        return

    await db.commit()
    for n in to_send:
        await db.refresh(n)
        _schedule(n.id)


async def retry_deliver(notification_id: uuid.UUID) -> None:
    """Called from the API when admin manually retries a failed notification."""
    _schedule(notification_id)
