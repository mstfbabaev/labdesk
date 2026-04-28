"""Creates the initial admin user if none exists. Reads credentials from env vars."""
import asyncio
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.database import Base


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == "admin"))
        if result.scalar_one_or_none():
            print("Admin already exists, skipping seed.")
            return

        email = os.getenv("ADMIN_EMAIL", "admin@labdesk.local")
        password = os.getenv("ADMIN_PASSWORD", "admin123")
        first_name = os.getenv("ADMIN_FIRST_NAME", "Admin")
        last_name = os.getenv("ADMIN_LAST_NAME", "User")

        admin = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hash_password(password),
            role="admin",
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created: {email} / {password}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
