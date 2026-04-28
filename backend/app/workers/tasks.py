import uuid
from datetime import datetime, timezone

import httpx
from celery.exceptions import MaxRetriesExceededError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.workers.celery_app import celery_app

_engine = None
_Session = None


def _get_session():
    global _engine, _Session
    if _engine is None:
        _engine = create_engine(settings.sync_database_url, pool_pre_ping=True)
        _Session = sessionmaker(bind=_engine)
    return _Session()


@celery_app.task(bind=True, max_retries=3, name="notifications.send")
def send_notification(self, notification_id: str) -> dict:
    from app.models.notification import Notification

    db = _get_session()
    notif = None
    try:
        notif = db.get(Notification, uuid.UUID(notification_id))
        if not notif:
            return {"error": "notification not found"}

        notif.attempts += 1
        db.commit()

        if notif.channel == "telegram":
            _send_telegram(notif.payload)
        elif notif.channel == "webhook":
            _send_webhook(notif.payload)
        else:
            raise ValueError(f"Unknown channel: {notif.channel}")

        notif.status = "sent"
        notif.sent_at = datetime.now(timezone.utc)
        notif.error = None
        db.commit()
        return {"status": "sent"}

    except Exception as exc:
        error_msg = str(exc)
        # Exponential backoff: 60s → 120s → 240s
        countdown = 60 * (2 ** self.request.retries)
        try:
            raise self.retry(exc=exc, countdown=countdown)
        except MaxRetriesExceededError:
            if notif:
                notif.status = "failed"
                notif.error = error_msg
                db.commit()
            return {"status": "failed", "error": error_msg}
    finally:
        db.close()


def _send_telegram(payload: dict) -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not configured")
    chat_id = payload.get("chat_id")
    if not chat_id:
        raise ValueError("No chat_id in payload")
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    with httpx.Client(timeout=10) as client:
        resp = client.post(url, json={
            "chat_id": chat_id,
            "text": payload.get("text", ""),
            "parse_mode": "HTML",
        })
        resp.raise_for_status()


def _send_webhook(payload: dict) -> None:
    url = settings.WEBHOOK_URL
    if not url:
        raise ValueError("WEBHOOK_URL not configured")
    with httpx.Client(timeout=10) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
