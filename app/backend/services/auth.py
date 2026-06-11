import uuid
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete

from models.users import User, UserSession, LoginAttempt, EmailVerificationToken, PasswordResetToken, AuthProvider
from models.preferences import AlertPreference, DisplayPreference
from core.security import hash_password, verify_password, create_access_token, create_refresh_token
from core.redis import get_redis
from core.config import settings
from schemas.users import UserCreate
from services.email import send_verification_email, send_password_reset_email

class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str):
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalars().first()

    @staticmethod
    async def create_user(db: AsyncSession, user_in: UserCreate):
        """Register user + auto-create preferences + verification token"""
        hashed_pw = hash_password(user_in.password)
        
        db_user = User(
            email=user_in.email,
            password_hash=hashed_pw,
            full_name=user_in.full_name,
            role=user_in.role,
            auth_provider=AuthProvider.LOCAL
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
    async def create_verification_token(db: AsyncSession, user_id: uuid.UUID):
        """Generate a 24h verification token"""
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        db_token = EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db.add(db_token)
        await db.commit()

        # Send Email
        user_result = await db.execute(select(User).filter(User.id == user_id))
        user = user_result.scalars().first()
        if user:
            await send_verification_email(user.email, user.full_name, raw_token)

        return raw_token

    @staticmethod
    async def verify_email(db: AsyncSession, token: str):
        """Verify email using token hash"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        result = await db.execute(
            select(EmailVerificationToken)
            .filter(EmailVerificationToken.token_hash == token_hash, EmailVerificationToken.is_used == False)
        )
        db_token = result.scalars().first()
        
        if not db_token or db_token.expires_at < datetime.now(timezone.utc):
            return False
            
        # Update User
        await db.execute(
            update(User)
            .where(User.id == db_token.user_id)
            .values(email_verified=True, email_verified_at=datetime.now(timezone.utc))
        )
        
        # Mark token used
        db_token.is_used = True
        await db.commit()
        return True

    @staticmethod
    async def create_password_reset_token(db: AsyncSession, email: str):
        """Generate a 1h password reset token if user exists"""
        user = await AuthService.get_user_by_email(db, email)
        if not user:
            return None
            
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        db_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at
        )
        db.add(db_token)
        await db.commit()

        # Send Email
        await send_password_reset_email(user.email, user.full_name, raw_token)

        return raw_token

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str):
        """Reset password and revoke all sessions"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        result = await db.execute(
            select(PasswordResetToken)
            .filter(PasswordResetToken.token_hash == token_hash, PasswordResetToken.is_used == False)
        )
        db_token = result.scalars().first()
        
        if not db_token or db_token.expires_at < datetime.now(timezone.utc):
            return False
            
        # Update User Password
        hashed_pw = hash_password(new_password)
        await db.execute(
            update(User)
            .where(User.id == db_token.user_id)
            .values(password_hash=hashed_pw)
        )
        
        # Mark token used
        db_token.is_used = True
        
        # Revoke ALL sessions
        await AuthService.revoke_all_user_sessions(db, db_token.user_id)
        
        await db.commit()
        return True

    @staticmethod
    async def revoke_all_user_sessions(db: AsyncSession, user_id: uuid.UUID):
        """Delete all user sessions from Redis and mark revoked in DB"""
        # 1. Fetch all active session hashes for this user from DB
        result = await db.execute(
            select(UserSession.refresh_token_hash)
            .filter(UserSession.user_id == user_id, UserSession.is_revoked == False)
        )
        hashes = result.scalars().all()
        
        # 2. Delete from Redis
        for rt_hash in hashes:
            get_redis().delete(f"session:{rt_hash}")
            
        # 3. Mark all as revoked in DB
        await db.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id)
            .values(is_revoked=True)
        )

    @staticmethod
    async def delete_user(db: AsyncSession, user: User):
        """
        Fully deletes a user and all associated data.
        1. Revokes all sessions (Redis + DB)
        2. Clears user-specific Redis keys (notifications, etc)
        3. Deletes user from DB (Cascades handle related tables)
        """
        # 1. Revoke sessions
        await AuthService.revoke_all_user_sessions(db, user.id)
        
        # 2. Clear Redis Notifications queue/history for this user
        get_redis().delete(f"notifications:{user.id}")
        
        # 3. Delete user object
        await db.delete(user)
        await db.commit()

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str, ip_address: str):
        """Authenticate with brute-force protection and logging"""
        lockout_key = f"login:failed:{ip_address}"
        failed_attempts = get_redis().get(lockout_key)
        
        if failed_attempts and int(failed_attempts) >= 5:
            await AuthService._log_login_attempt(db, email, ip_address, False, "account_lockout")
            await db.commit()
            return "lockout"

        user = await AuthService.get_user_by_email(db, email=email)
        
        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            get_redis().incr(lockout_key)
            get_redis().expire(lockout_key, 900)  # 15 minutes
            await AuthService._log_login_attempt(db, email, ip_address, False, "invalid_credentials")
            await db.commit()
            return None

        if not user.email_verified:
            await AuthService._log_login_attempt(db, email, ip_address, False, "email_not_verified")
            await db.commit()
            return "unverified"

        if not user.is_active:
            await AuthService._log_login_attempt(db, email, ip_address, False, "account_disabled")
            await db.commit()
            return None

        # Success
        get_redis().delete(lockout_key)
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
        get_redis().hset(redis_key, mapping=session_data)
        get_redis().expire(redis_key, int(timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS).total_seconds()))

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
        get_redis().delete(f"session:{rt_hash}")

    @staticmethod
    async def refresh_session(db: AsyncSession, refresh_token: str, ip: str, device: str):
        """Redis-first refresh, fallback to DB"""
        rt_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        redis_key = f"session:{rt_hash}"
        
        session_data = get_redis().hgetall(redis_key)
        
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
            get_redis().hset(redis_key, mapping=session_data)
            get_redis().expire(redis_key, int((row.UserSession.expires_at - datetime.now(timezone.utc)).total_seconds()))
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
