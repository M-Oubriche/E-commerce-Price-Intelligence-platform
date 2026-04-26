from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from api import deps
from schemas.users import UserCreate, UserOut, Token
from services.auth import AuthService
from core.security import create_access_token

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate, 
    db: AsyncSession = Depends(deps.get_db)
):
    """
    Inscrit un nouvel utilisateur (Entrepreneur ou Client).
    Vérifie l'unicité de l'email avant création.
    """
    user = await AuthService.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cet email est déjà enregistré dans le système."
        )
    return await AuthService.create_user(db, user_in=user_in)


@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Endpoint de connexion standard OAuth2.
    Vérifie les credentials et retourne un Token JWT.
    Note : form_data.username contient l'email de l'utilisateur.
    """
    # 1. Vérification de l'identité (Email + Password haché)
    user = await AuthService.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Génération du badge d'accès (JWT)
    # On transforme l'UUID en string pour le 'sub' du token
    access_token = create_access_token(subject=str(user.id))
    
    return {
        "access_token": access_token, 
        "token_type": "bearer"
    }

# Ajoute 'token: str = Depends(deps.reusable_oauth2)' dans les paramètres
@router.get("/test-token")
async def test_votre_token(token: str = Depends(deps.reusable_oauth2)):
    """
    Route de validation du Sprint B.
    """
    return {
        "message": "  système JWT fonctionne.",
        "ton_token": token
    }    