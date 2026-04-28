import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.database import get_db
from app.models.comment import Comment
from app.models.order import Order
from app.models.user import User
from app.schemas.comment import CommentCreate
from app.schemas.order import CommentOut

router = APIRouter(prefix="/orders/{order_id}/comments", tags=["comments"])


async def _check_order_access(order_id: uuid.UUID, current_user: User, db: AsyncSession) -> Order:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == "doctor" and order.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return order


@router.post("", response_model=CommentOut, status_code=201)
async def add_comment(
    order_id: uuid.UUID,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_order_access(order_id, current_user, db)
    comment = Comment(order_id=order_id, author_id=current_user.id, text=body.text)
    db.add(comment)
    await db.commit()
    result = await db.execute(
        select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment.id)
    )
    return result.scalar_one()


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    order_id: uuid.UUID,
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_order_access(order_id, current_user, db)
    result = await db.execute(select(Comment).where(Comment.id == comment_id, Comment.order_id == order_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if current_user.role != "admin" and comment.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    await db.delete(comment)
    await db.commit()
