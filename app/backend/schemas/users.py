from pydantic import BaseModel, EmailStr, Field
from typing import Optional 
from uuid import UUID
from models.users import UserRole

# Schéma de base partagé
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CLIENT

# Ce que le frontend envoie pour créer un compte
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Minimum 8 caractères")

# Ce que l'API renvoie (Filtre de sortie)
class UserOut(UserBase):
    id: UUID
    is_active: bool
    email_verified: bool

    class Config:
        from_attributes = True

# Schémas pour l'authentification JWT
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: Optional[str] = None

class SingleUserResponse(BaseModel):
    data: UserOut

class RegisterResponse(BaseModel):
    data: UserOut
    verification_token: str