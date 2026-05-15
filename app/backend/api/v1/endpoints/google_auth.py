from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
import uuid
import logging

from core.config import settings
from api import deps
from models.users import User, UserRole
from schemas.users import UserOut
from services.auth import AuthService

logger = logging.getLogger(__name__)
router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str          # Google ID token from frontend

class GoogleConfirmRequest(BaseModel):
    token: str
    role: UserRole

class GoogleAuthResponse(BaseModel):
    is_new_user: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user: Optional[UserOut] = None

@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(
    payload: GoogleAuthRequest, 
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db)
):
    # 1. Verify the Google ID token
    try:
        id_info = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except Exception as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = id_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    # 2. Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        # User doesn't exist, tell frontend to ask for a role
        return {
            "is_new_user": True,
            "access_token": None,
            "refresh_token": None,
            "user": None
        }

    # User exists, proceed with login
    if not user.google_sub:
        user.google_sub = id_info.get("sub")
        await db.commit()

    ip_address = request.client.host
    access_token, refresh_token = await AuthService.create_session(
        db, 
        user_id=user.id, 
        role=user.role, 
        email=user.email,
        ip=ip_address,
        device=request.headers.get("user-agent")
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return {
        "is_new_user": False,
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user)
    }

@router.post("/google/confirm", response_model=GoogleAuthResponse)
async def google_confirm(
    payload: GoogleConfirmRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(deps.get_db)
):
    try:
        id_info = id_token.verify_oauth2_token(
            payload.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = id_info.get("email")
    full_name = id_info.get("name", "")
    google_sub = id_info.get("sub")

    # Final check
    result = await db.execute(select(User).where(User.email == email))
    if result.scalars().first():
         raise HTTPException(status_code=400, detail="User already exists")

    # Create user with CHOSEN role
    user = User(
        id=uuid.uuid4(),
        email=email,
        full_name=full_name,
        google_sub=google_sub,
        role=payload.role,
        email_verified=True,
        auth_provider="google",
        password_hash=None
    )
    db.add(user)
    await db.flush()

    from models.preferences import AlertPreference, DisplayPreference
    db.add(AlertPreference(user_id=user.id))
    db.add(DisplayPreference(user_id=user.id))
    await db.commit()
    await db.refresh(user)

    ip_address = request.client.host
    access_token, refresh_token = await AuthService.create_session(
        db, 
        user_id=user.id, 
        role=user.role, 
        email=user.email,
        ip=ip_address,
        device=request.headers.get("user-agent")
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )

    return {
        "is_new_user": False,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": UserOut.model_validate(user)
    }
