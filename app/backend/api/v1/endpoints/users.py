from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
import hashlib

from api import deps
from models.users import User, UserSession
from schemas.preferences import UserProfileUpdate, UserProfileOut, UserSessionOut
from core.redis import redis_client
from jose import jwt
from core.config import settings

router = APIRouter()

@router.get("/me", response_model=dict)
async def get_my_profile(current_user: User = Depends(deps.get_current_user)):
    # Convert to schema manually for dict response
    user_out = UserProfileOut.model_validate(current_user)
    return {"data": user_out.model_dump()}

@router.patch("/me", response_model=dict)
async def update_my_profile(
    user_in: UserProfileUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.initials is not None:
        current_user.initials = user_in.initials
    if user_in.email is not None:
        # Check if email is already taken
        result = await db.execute(select(User).filter(User.email == user_in.email))
        existing_user = result.scalars().first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=409, detail="Email already registered.")
        current_user.email = user_in.email

    await db.commit()
    await db.refresh(current_user)
    user_out = UserProfileOut.model_validate(current_user)
    return {"data": user_out.model_dump()}

@router.get("/me/sessions", response_model=dict)
async def get_my_sessions(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    result = await db.execute(
        select(UserSession)
        .filter(UserSession.user_id == current_user.id, UserSession.is_revoked == False)
        .order_by(UserSession.last_used_at.desc())
    )
    sessions = result.scalars().all()
    
    sessions_out = [UserSessionOut.model_validate(s).model_dump() for s in sessions]
    return {"data": sessions_out}

@router.delete("/me/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # session_id should be UUID
    import uuid
    try:
        sess_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format.")

    result = await db.execute(
        select(UserSession).filter(
            UserSession.id == sess_uuid, 
            UserSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    # 1. Revoke from Redis
    await redis_client.delete(f"session:{session.refresh_token_hash}")
    
    # 2. Delete from DB
    await db.delete(session)
    await db.commit()
    
    return None
