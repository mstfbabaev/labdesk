import uuid

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.config import settings

MAX_FILE_SIZE = 700 * 1024 * 1024  # 700 MB
ALLOWED_EXTENSIONS = {".stl", ".zip", ".jpg", ".jpeg", ".png"}
ALLOWED_CONTENT_TYPES = {
    "model/stl",
    "application/octet-stream",
    "application/zip",
    "application/x-zip-compressed",
    "image/jpeg",
    "image/png",
}


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=f"{'https' if settings.MINIO_USE_SSL else 'http'}://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def _validate_file(filename: str, file_size_bytes: int) -> None:
    import os
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 700 MB limit",
        )


def generate_presign_upload(order_id: str, filename: str, content_type: str, file_size_bytes: int) -> tuple[str, str]:
    _validate_file(filename, file_size_bytes)
    import os
    ext = os.path.splitext(filename)[1].lower()
    storage_key = f"orders/{order_id}/{uuid.uuid4()}{ext}"
    client = _get_client()
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": storage_key,
            "ContentType": content_type,
        },
        ExpiresIn=900,  # 15 minutes
    )
    return url, storage_key


def generate_presign_download(storage_key: str, filename: str) -> str:
    client = _get_client()
    url = client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": storage_key,
            "ResponseContentDisposition": f'attachment; filename="{filename}"',
        },
        ExpiresIn=3600,
    )
    return url


def verify_file_exists(storage_key: str) -> bool:
    client = _get_client()
    try:
        client.head_object(Bucket=settings.MINIO_BUCKET, Key=storage_key)
        return True
    except ClientError:
        return False


def delete_file(storage_key: str) -> None:
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.MINIO_BUCKET, Key=storage_key)
    except ClientError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Storage error: {e}")
