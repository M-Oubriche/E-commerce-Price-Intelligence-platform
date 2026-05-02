from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from api import deps
from schemas.users import UserCreate, UserOut, Token
from services.auth import AuthService
from core.config import settings

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
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
    return {"data": new_user}


@router.post("/login")
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
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return {
        "data": {
            "access_token": access_token, 
            "token_type": "bearer"
        }
    }

@router.post("/refresh")
async def refresh(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    refresh_token: Optional[str] = Cookie(None)
):
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
    # To be implemented with EmailVerificationToken logic
    return {"message": "Email vérifié avec succès."}

@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(deps.get_db)):
    # Always return 200 to prevent email enumeration
    return {"message": "Si l'email existe, un lien de réinitialisation a été envoyé."}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db: AsyncSession = Depends(deps.get_db)):
    # To be implemented with PasswordResetToken logic
    return {"message": "Mot de passe mis à jour."}

@router.get("/test-token")
async def test_token(token: str = Depends(deps.reusable_oauth2)):
    return {"message": "Système JWT fonctionnel.", "token": token}
