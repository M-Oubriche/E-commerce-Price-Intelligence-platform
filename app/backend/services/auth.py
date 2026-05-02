import uuid
import hashlib
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete

from models.users import User, UserSession, LoginAttempt, EmailVerificationToken, PasswordResetToken
from models.preferences import AlertPreference, DisplayPreference
from core.security import hash_password, verify_password, create_access_token, create_refresh_token
from core.redis import redis_client
from core.config import settings
from schemas.users import UserCreate

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str):
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate):
        """Register user + auto-create preferences"""
        hashed_pw = hash_password(user_in.password)
        
        db_user = User(
            email=user_in.email,
            password_hash=hashed_pw,
            full_name=user_in.full_name,
            role=user_in.role,
            auth_provider="local"
        )
        db.add(db_user)
        await db.flush()  # Get ID without committing

        # Auto-create Alert Preferences
        alert_prefs = AlertPreference(user_id=db_user.id)
        # Auto-create Display Preferences
        display_prefs = DisplayPreference(
            user_id=db_user.id,
            theme="dark",
            language="en",
            currency="USD",
            timezone="UTC"
        )
        db.add(alert_prefs)
        db.add(display_prefs)
        
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str, ip_address: str):
        """Authenticate with brute-force protection and logging"""
        lockout_key = f"login:failed:{ip_address}"
        failed_attempts = await redis_client.get(lockout_key)
        
        if failed_attempts and int(failed_attempts) >= 5:
            await AuthService._log_login_attempt(db, email, ip_address, False, "account_lockout")
            return "lockout"

        user = await AuthService.get_user_by_email(db, email=email)
        
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            await redis_client.incr(lockout_key)
            await redis_client.expire(lockout_key, 900)  # 15 minutes
            await AuthService._log_login_attempt(db, email, ip_address, False, "invalid_credentials")
            return None

        if not user.email_verified:
            await AuthService._log_login_attempt(db, email, ip_address, False, "email_not_verified")
            return "unverified"

        if not user.is_active:
            await AuthService._log_login_attempt(db, email, ip_address, False, "account_disabled")
            return None

        # Success
        await redis_client.delete(lockout_key)
        user.last_login_at = datetime.now(timezone.utc)
        await AuthService._log_login_attempt(db, email, ip_address, True)
        await db.commit()
        return user

    @staticmethod
    async def _log_login_attempt(db: AsyncSession, email: str, ip: str, success: bool, reason: str = None):
        attempt = LoginAttempt(
            email=email,
            ip_address=ip,
            was_successful=success,
            failure_reason=reason
        )
        db.add(attempt)
        # We don't commit here to allow bundling with other transactions if needed

    @staticmethod
    async def create_session(db: AsyncSession, user_id: uuid.UUID, role: str, email: str, ip: str, device: str):
        """Create JWT, Refresh Token, and Redis/DB sessions"""
        access_token = create_access_token(str(user_id), role, email)
        refresh_token = create_refresh_token(str(user_id))
        
        # Hash refresh token for storage
        rt_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        # 1. Store in PostgreSQL
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=rt_hash,
            ip_address=ip,
            device_info=device,
            expires_at=expires_at
        )
        db.add(session)
        await db.commit()

        # 2. Store in Redis
        redis_key = f"session:{rt_hash}"
        session_data = {
            "user_id": str(user_id),
            "role": role,
            "ip_address": ip,
            "device_info": device or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_revoked": "0"
        }
        await redis_client.hset(redis_key, mapping=session_data)
        await redis_client.expire(redis_key, int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()))

        return access_token, refresh_token

    @staticmethod
    async def logout(db: AsyncSession, refresh_token: str):
        """Revoke session in Redis and DB"""
        rt_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        # 1. Update DB
        await db.execute(
            update(UserSession)
            .where(UserSession.refresh_token_hash == rt_hash)
            .values(is_revoked=True)
        )
        await db.commit()

        # 2. Delete from Redis
        await redis_client.delete(f"session:{rt_hash}")

    @staticmethod
    async def refresh_session(db: AsyncSession, refresh_token: str, ip: str, device: str):
        """Redis-first refresh, fallback to DB"""
        rt_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        redis_key = f"session:{rt_hash}"
        
        session_data = await redis_client.hgetall(redis_key)
        
        if not session_data:
            # Fallback to DB
            result = await db.execute(
                select(UserSession, User)
                .join(User)
                .filter(UserSession.refresh_token_hash == rt_hash, UserSession.is_revoked == False)
            )
            row = result.first()
            if not row or row.UserSession.expires_at < datetime.now(timezone.utc):
                return None
            user = row.User
            # Re-populate Redis
            session_data = {
                "user_id": str(user.id),
                "role": user.role,
                "ip_address": row.UserSession.ip_address,
                "device_info": row.UserSession.device_info or "",
                "created_at": row.UserSession.created_at.isoformat(),
                "is_revoked": "0"
            }
            await redis_client.hset(redis_key, mapping=session_data)
            await redis_client.expire(redis_key, int((row.UserSession.expires_at - datetime.now(timezone.utc)).total_seconds()))
        else:
            if session_data.get("is_revoked") == "1":
                return None
            user_result = await db.execute(select(User).filter(User.id == session_data["user_id"]))
            user = user_result.scalars().first()

        if not user:
            return None

        # Issue new access token
        access_token = create_access_token(str(user.id), user.role, user.email)
        return access_token
