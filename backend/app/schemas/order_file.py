import uuid

from pydantic import BaseModel


class PresignUploadRequest(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int


class PresignUploadResponse(BaseModel):
    presigned_url: str
    storage_key: str


class ConfirmUploadRequest(BaseModel):
    storage_key: str
    original_filename: str
    file_size_bytes: int
    content_type: str


class PresignDownloadResponse(BaseModel):
    presigned_url: str
    filename: str


class FileOut(BaseModel):
    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    content_type: str

    model_config = {"from_attributes": True}
