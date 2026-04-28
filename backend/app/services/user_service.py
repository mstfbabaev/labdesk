import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


async def get_users(db: AsyncSession, page: int, page_size: int, role: str | None = None) -> tuple[list[User], int]:
    q = select(User)
    if role:
        q = q.where(User.role == role)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size).order_by(User.created_at.desc()))
    return result.scalars().all(), total


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        hashed_password=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user_id: uuid.UUID, data: UserUpdate) -> User:
    user = await get_user(db, user_id)
    if data.email is not None:
        result = await db.execute(select(User).where(User.email == data.email, User.id != user_id))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already taken")
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.password is not None:
        user.hashed_password = hash_password(data.password)
    await db.commit()
    await db.refresh(user)
    return user


async def set_active(db: AsyncSession, user_id: uuid.UUID, is_active: bool) -> User:
    user = await get_user(db, user_id)
    user.is_active = is_active
    await db.commit()
    await db.refresh(user)
    return user
