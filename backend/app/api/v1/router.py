from fastapi import APIRouter

from app.api.v1 import auth, comments, files, notifications, orders, users

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(orders.router)
router.include_router(files.router)
router.include_router(comments.router)
router.include_router(notifications.router)
