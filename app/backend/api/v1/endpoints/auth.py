from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from api import deps
from core.rate_limit import rate_limit_auth, rate_limit_login, rate_limit_register
from models.users import User
from schemas.users import UserCreate, UserOut, Token, SingleUserResponse
from services.auth import AuthService
from core.config import settings

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit_register)])
async def register(
    user_in: UserCreate, 
    db: AsyncSession = Depends(deps.get_db)
):
    user = await AuthService.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Cet email est déjà enregistré."
        )
    new_user = await AuthService.create_user(db, user_in=user_in)
    
    verification_token = await AuthService.create_verification_token(db, new_user.id)
    
    return {"data": new_user, "verification_token": verification_token}


@router.post("/login", dependencies=[Depends(rate_limit_login)])
async def login(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    ip_address = request.client.host
    user = await AuthService.authenticate(
        db, email=form_data.username, password=form_data.password, ip_address=ip_address
    )
    
    if user == "lockout":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives. Compte temporairement bloqué (15 min)."
        )
    
    if user == "unverified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "EMAIL_NOT_VERIFIED",
                    "message": "Veuillez vérifier votre email avant de vous connecter.",
                    "status": 403
                }
            }
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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

@router.post("/refresh")
async def refresh(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    body: dict = Body(default={})
):
    refresh_token = refresh_token_cookie or body.get("refresh_token")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Session expirée ou invalide.")
    
    new_access_token = await AuthService.refresh_session(
        db, 
        refresh_token=refresh_token,
        ip=request.client.host,
        device=request.headers.get("user-agent")
    )
    
    if not new_access_token:
        raise HTTPException(status_code=401, detail="Session invalide.")
        
    return {
        "data": {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(deps.get_db),
    refresh_token: Optional[str] = Cookie(None)
):
    if refresh_token:
        await AuthService.logout(db, refresh_token=refresh_token)
    
    response.delete_cookie("refresh_token")
    return None

@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(deps.get_db)):
    success = await AuthService.verify_email(db, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de vérification invalide ou expiré."
        )
    return {"message": "Email vérifié avec succès."}

@router.post("/forgot-password", dependencies=[Depends(rate_limit_auth)])
async def forgot_password(email: str, db: AsyncSession = Depends(deps.get_db)):
    # Create token if user exists (always returns 200 to prevent enumeration)
    await AuthService.create_password_reset_token(db, email)
    return {"message": "Si l'email existe, un lien de réinitialisation a été envoyé."}

@router.post("/reset-password", dependencies=[Depends(rate_limit_auth)])
async def reset_password(token: str, new_password: str, db: AsyncSession = Depends(deps.get_db)):
    success = await AuthService.reset_password(db, token, new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de réinitialisation invalide ou expiré."
        )
    return {"message": "Mot de passe mis à jour et sessions révoquées."}

@router.get("/test-token")
async def test_token(token: str = Depends(deps.reusable_oauth2)):
    return {"message": "Système JWT fonctionnel.", "token": token}

@router.get("/me", response_model=SingleUserResponse)
async def get_me(current_user: User = Depends(deps.get_current_user)):
    """
    Returns the profile of the currently authenticated user.
    """
    return {"data": current_user}
