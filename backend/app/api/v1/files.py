import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.order import Order
from app.models.order_file import OrderFile
from app.models.user import User
from app.schemas.order_file import (
    ConfirmUploadRequest,
    FileOut,
    PresignDownloadResponse,
    PresignUploadRequest,
    PresignUploadResponse,
)
from app.services import storage_service

router = APIRouter(prefix="/orders/{order_id}/files", tags=["files"])


async def _get_accessible_order(order_id: uuid.UUID, current_user: User, db: AsyncSession) -> Order:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == "doctor" and order.doctor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return order


@router.post("/presign-upload", response_model=PresignUploadResponse)
async def presign_upload(
    order_id: uuid.UUID,
    body: PresignUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_accessible_order(order_id, current_user, db)
    url, storage_key = storage_service.generate_presign_upload(
        str(order_id), body.filename, body.content_type, body.file_size_bytes
    )
    return PresignUploadResponse(presigned_url=url, storage_key=storage_key)


@router.post("/confirm", response_model=FileOut, status_code=201)
async def confirm_upload(
    order_id: uuid.UUID,
    body: ConfirmUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_accessible_order(order_id, current_user, db)

    if not storage_service.verify_file_exists(body.storage_key):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found in storage")

    order_file = OrderFile(
        order_id=order_id,
        uploaded_by_id=current_user.id,
        original_filename=body.original_filename,
        storage_key=body.storage_key,
        file_size_bytes=body.file_size_bytes,
        content_type=body.content_type,
    )
    db.add(order_file)
    await db.commit()
    await db.refresh(order_file)
    return order_file


@router.get("/{file_id}/presign-download", response_model=PresignDownloadResponse)
async def presign_download(
    order_id: uuid.UUID,
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_accessible_order(order_id, current_user, db)
    result = await db.execute(select(OrderFile).where(OrderFile.id == file_id, OrderFile.order_id == order_id))
    order_file = result.scalar_one_or_none()
    if not order_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    url = storage_service.generate_presign_download(order_file.storage_key, order_file.original_filename)
    return PresignDownloadResponse(presigned_url=url, filename=order_file.original_filename)


@router.delete("/{file_id}", status_code=204)
async def delete_file(
    order_id: uuid.UUID,
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await _get_accessible_order(order_id, current_user, db)
    result = await db.execute(select(OrderFile).where(OrderFile.id == file_id, OrderFile.order_id == order_id))
    order_file = result.scalar_one_or_none()
    if not order_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if current_user.role == "doctor" and order_file.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    storage_service.delete_file(order_file.storage_key)
    await db.delete(order_file)
    await db.commit()
