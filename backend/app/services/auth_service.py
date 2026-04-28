from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models.user import User

REFRESH_COOKIE = "refresh_token"
COOKIE_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


async def login(email: str, password: str, db: AsyncSession, response: Response) -> str:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")

    access_token = create_access_token(str(user.id), user.role)
    refresh_token, jti = create_refresh_token(str(user.id))

    user.refresh_token_jti = jti
    await db.commit()

    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=False,  # set True in production with HTTPS
    )
    return access_token


async def refresh(refresh_token: str | None, db: AsyncSession, response: Response) -> str:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    jti = payload.get("jti")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active or user.refresh_token_jti != jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revoked")

    access_token = create_access_token(str(user.id), user.role)
    new_refresh, new_jti = create_refresh_token(str(user.id))

    user.refresh_token_jti = new_jti
    await db.commit()

    response.set_cookie(
        key=REFRESH_COOKIE,
        value=new_refresh,
        httponly=True,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        secure=False,
    )
    return access_token


async def logout(user: User, db: AsyncSession, response: Response) -> None:
    user.refresh_token_jti = None
    await db.commit()
    response.delete_cookie(REFRESH_COOKIE)
