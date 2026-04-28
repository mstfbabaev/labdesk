"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('admin', 'doctor');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE order_status AS ENUM ('new', 'in_progress', 'ready', 'issued');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            role user_role NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            refresh_token_jti VARCHAR(255),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_id UUID NOT NULL REFERENCES users(id),
            patient_name VARCHAR(255) NOT NULL,
            work_type VARCHAR(255) NOT NULL,
            delivery_date DATE NOT NULL,
            comment TEXT,
            status order_status NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_doctor_id ON orders(doctor_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS order_files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            uploaded_by_id UUID NOT NULL REFERENCES users(id),
            original_filename VARCHAR(500) NOT NULL,
            storage_key VARCHAR(1000) UNIQUE NOT NULL,
            file_size_bytes BIGINT NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON order_files(order_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            author_id UUID NOT NULL REFERENCES users(id),
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_comments_order_id ON comments(order_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS comments CASCADE")
    op.execute("DROP TABLE IF EXISTS order_files CASCADE")
    op.execute("DROP TABLE IF EXISTS orders CASCADE")
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.execute("DROP TYPE IF EXISTS order_status")
    op.execute("DROP TYPE IF EXISTS user_role")
