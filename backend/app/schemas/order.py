import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.user import UserSummary


class OrderCreate(BaseModel):
    patient_name: str
    work_type: str
    delivery_date: date
    comment: str | None = None


class OrderStatusUpdate(BaseModel):
    status: Literal["new", "in_progress", "ready", "issued"]


class OrderFileSummary(BaseModel):
    id: uuid.UUID
    original_filename: str
    file_size_bytes: int
    content_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: uuid.UUID
    text: str
    author: UserSummary
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderSummary(BaseModel):
    id: uuid.UUID
    patient_name: str
    work_type: str
    delivery_date: date
    status: str
    created_at: datetime
    doctor: UserSummary
    file_count: int = 0

    model_config = {"from_attributes": True}


class OrderDetail(BaseModel):
    id: uuid.UUID
    patient_name: str
    work_type: str
    delivery_date: date
    comment: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    doctor: UserSummary
    files: list[OrderFileSummary]
    comments: list[CommentOut]

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    items: list[OrderSummary]
    total: int
    page: int
    page_size: int
