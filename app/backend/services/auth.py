from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.users import User
from core.security import hash_password
from schemas.users import UserCreate 
from core.security import verify_password

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str):
        """Vérifie si un email existe déjà"""
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate):
        """Inscrit un nouvel utilisateur (Client ou Entrepreneur)"""
        hashed_pw = hash_password(user_in.password)
        
        db_user = User(
            email=user_in.email,
            password_hash=hashed_pw,
            full_name=user_in.full_name,
            role=user_in.role,
            auth_provider="local"
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user


    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str):
        user = await AuthService.get_user_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user
