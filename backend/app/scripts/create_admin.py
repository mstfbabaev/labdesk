"""
Run: python -m app.scripts.create_admin
Creates the first admin user interactively.
"""
import asyncio
import getpass

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import hash_password


async def main():
    print("=== Create Admin User ===")
    email = input("Email: ").strip()
    first_name = input("First name: ").strip()
    last_name = input("Last name: ").strip()
    password = getpass.getpass("Password: ")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"User with email {email} already exists.")
            return

        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hash_password(password),
            role="admin",
        )
        session.add(user)
        await session.commit()
        print(f"Admin user created: {email}")


if __name__ == "__main__":
    asyncio.run(main())
