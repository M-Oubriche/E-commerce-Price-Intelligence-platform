from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
import uuid
import logging

from core.config import settings
from api import deps
from models.users import User, UserRole
from models.preferences import AlertPreference, DisplayPreference
from services.auth import AuthService

logger = logging.getLogger(__name__)
router = APIRouter()

class GoogleAuthRequest(BaseModel):
    token: str          # Google ID token from frontend
    role: str = "client"  # client or reseller — only used for new users

@router.post("/google")
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
    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during Google token verification: {e}")
        raise HTTPException(status_code=401, detail=f"Verification error: {str(e)}")

    email = id_info.get("email")
    full_name = id_info.get("name", "")
    google_sub = id_info.get("sub")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    # 2. Check if user exists
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if user:
        # Update google_sub if not set
        if not user.google_sub:
            user.google_sub = google_sub
            await db.commit()
    else:
        # Create new user
        role = UserRole.RESELLER if payload.role == "reseller" else UserRole.CLIENT
        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=full_name,
            google_sub=google_sub,
            role=role,
            email_verified=True,
            auth_provider="google",
            password_hash=None
        )
        db.add(user)
        await db.flush()

        # Auto-create preferences
        db.add(AlertPreference(user_id=user.id))
        db.add(DisplayPreference(user_id=user.id))
        await db.commit()
        await db.refresh(user)

    ip_address = request.client.host
    # 3. Create session and return JWT
    # We use AuthService methods for consistency
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
        "data": {
            "access_token": access_token, 
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    }
