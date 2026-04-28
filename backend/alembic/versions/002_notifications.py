"""notifications and telegram_chat_id

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID,
            recipient_id UUID,
            event VARCHAR(50) NOT NULL,
            channel VARCHAR(20) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            payload JSONB NOT NULL DEFAULT '{}',
            error TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            sent_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notifications")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS telegram_chat_id")
