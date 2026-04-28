import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, computed_field


class UserBase(BaseModel):
    email: str
    first_name: str
    last_name: str


class UserCreate(UserBase):
    password: str
    role: Literal["admin", "doctor"] = "doctor"


class UserUpdate(BaseModel):
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    password: str | None = None


class UserOut(UserBase):
    id: uuid.UUID
    role: str
    is_active: bool
    telegram_chat_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class UserSummary(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
