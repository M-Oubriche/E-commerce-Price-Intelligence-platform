from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from api import deps
from models.system import ActivityLog
from schemas.activity_logs import ActivityLogCreate, ActivityLogOut, ActivityLogListResponse
from models.users import User

router = APIRouter()

@router.post("/", status_code=201)
async def log_activity(
    body: ActivityLogCreate,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User | None = Depends(deps.get_optional_current_user),
):
    log = ActivityLog(
        user_id=current_user.id if current_user else None,
        action=body.action,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        log_metadata=body.log_metadata,
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    await db.commit()
    return {"status": "ok"}


@router.get("/recently-viewed", response_model=ActivityLogListResponse)
async def get_recently_viewed(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    result = await db.execute(
        select(ActivityLog)
        .filter(
            ActivityLog.user_id == current_user.id,
            ActivityLog.action == "product_viewed",
            ActivityLog.entity_type == "product",
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(20)
    )
    logs = result.scalars().all()
    return {"data": logs}
