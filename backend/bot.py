"""
Telegram bot for LabDesk.
Run: .venv\Scripts\python.exe bot.py
"""
import sys
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

from app.config import settings

TOKEN = settings.TELEGRAM_BOT_TOKEN
if not TOKEN:
    print("ERROR: TELEGRAM_BOT_TOKEN not set in .env")
    sys.exit(1)

BASE = f"https://api.telegram.org/bot{TOKEN}"

WELCOME = (
    "👋 <b>Добро пожаловать в LabDesk!</b>\n\n"
    "Я буду уведомлять вас, когда статус вашего заказа изменится.\n\n"
    "🔑 Ваш Chat ID: <code>{chat_id}</code>\n\n"
    "Сообщите этот ID администратору лаборатории — он введёт его в настройках, "
    "и вы начнёте получать уведомления о своих заказах."
)


def send(chat_id: int, text: str) -> None:
    try:
        httpx.post(
            f"{BASE}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=10,
        )
    except Exception as e:
        print(f"[send error] {e}")


def handle_update(update: dict) -> None:
    msg = update.get("message") or update.get("edited_message")
    if not msg:
        return
    chat_id = msg.get("chat", {}).get("id")
    text = (msg.get("text") or "").strip()
    if not chat_id or not text:
        return

    if text.startswith("/start"):
        send(chat_id, WELCOME.format(chat_id=chat_id))
    elif text.startswith("/id") or text.startswith("/myid"):
        send(chat_id, f"Ваш Chat ID: <code>{chat_id}</code>")


def run() -> None:
    print(f"[LabDesk Bot] Starting polling...")
    offset = 0
    while True:
        try:
            r = httpx.get(
                f"{BASE}/getUpdates",
                params={"offset": offset, "timeout": 30, "allowed_updates": ["message"]},
                timeout=35,
            )
            data = r.json()
            if not data.get("ok"):
                print(f"[error] Telegram API: {data}")
                time.sleep(5)
                continue
            for upd in data.get("result", []):
                offset = upd["update_id"] + 1
                handle_update(upd)
        except httpx.TimeoutException:
            pass  # normal for long polling
        except Exception as e:
            print(f"[poll error] {e}")
            time.sleep(5)


if __name__ == "__main__":
    run()
