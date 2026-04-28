import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_type: Mapped[str] = mapped_column(String(255), nullable=False)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("new", "in_progress", "ready", "issued", name="order_status"),
        default="new",
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    doctor: Mapped["User"] = relationship("User", back_populates="orders", lazy="select")
    files: Mapped[list["OrderFile"]] = relationship("OrderFile", back_populates="order", cascade="all, delete-orphan", lazy="select")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="order", cascade="all, delete-orphan", lazy="select", order_by="Comment.created_at")
