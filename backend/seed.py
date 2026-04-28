"""Creates or updates the admin user on startup using env vars."""
import asyncio
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core.security import hash_password
from app.models.user import User


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    email = os.getenv("ADMIN_EMAIL", "admin@labdesk.local")
    password = os.getenv("ADMIN_PASSWORD", "admin123")
    first_name = os.getenv("ADMIN_FIRST_NAME", "Admin")
    last_name = os.getenv("ADMIN_LAST_NAME", "User")

    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == "admin"))
        admin = result.scalar_one_or_none()

        if admin:
            admin.email = email
            admin.hashed_password = hash_password(password)
            admin.first_name = first_name
            admin.last_name = last_name
            await db.commit()
            print(f"Admin updated: {email}")
        else:
            admin = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                hashed_password=hash_password(password),
                role="admin",
            )
            db.add(admin)
            await db.commit()
            print(f"Admin created: {email}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
