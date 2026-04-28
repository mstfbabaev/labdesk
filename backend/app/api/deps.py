from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_token
from app.core.exceptions import credentials_exception, forbidden_exception
from app.database import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise credentials_exception
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise credentials_exception
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exception
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise forbidden_exception
    return current_user


async def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "doctor":
        raise forbidden_exception
    return current_user
