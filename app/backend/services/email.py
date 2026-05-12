import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_brevo_client():
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY
    return sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

async def send_verification_email(to_email: str, to_name: str, token: str):
    verify_url = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"
    try:
        client = get_brevo_client()
        email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            sender={
                "email": settings.BREVO_SENDER_EMAIL,
                "name": settings.BREVO_SENDER_NAME
            },
            subject="Verify your PulsePrice account",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2 style="color:#6366f1;">Welcome to PulsePrice!</h2>
                <p>Hi {to_name},</p>
                <p>Please verify your email address by clicking the button below:</p>
                <a href="{verify_url}" 
                   style="display:inline-block;background:#6366f1;color:white;
                          padding:12px 24px;border-radius:6px;text-decoration:none;
                          margin:16px 0;">
                    Verify Email
                </a>
                <p>Or copy this link:<br/><a href="{verify_url}">{verify_url}</a></p>
                <p style="color:#999;font-size:12px;">
                    This link expires in 24 hours. If you didn't create an account, ignore this email.
                </p>
            </div>
            """
        )
        client.send_transac_email(email)
        logger.info(f"Verification email sent to {to_email}")
    except ApiException as e:
        logger.error(f"Brevo error sending verification email: {e}")
    except Exception as e:
        logger.error(f"Unexpected error sending verification email: {e}")

async def send_password_reset_email(to_email: str, to_name: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
    try:
        client = get_brevo_client()
        email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            sender={
                "email": settings.BREVO_SENDER_EMAIL,
                "name": settings.BREVO_SENDER_NAME
            },
            subject="Reset your PulsePrice password",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2 style="color:#6366f1;">Password Reset Request</h2>
                <p>Hi {to_name},</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_url}"
                   style="display:inline-block;background:#6366f1;color:white;
                          padding:12px 24px;border-radius:6px;text-decoration:none;
                          margin:16px 0;">
                    Reset Password
                </a>
                <p>Or copy this link:<br/><a href="{reset_url}">{reset_url}</a></p>
                <p style="color:#999;font-size:12px;">
                    This link expires in 1 hour. If you didn't request this, ignore this email.
                </p>
            </div>
            """
        )
        client.send_transac_email(email)
        logger.info(f"Password reset email sent to {to_email}")
    except ApiException as e:
        logger.error(f"Brevo error sending password reset email: {e}")
    except Exception as e:
        logger.error(f"Unexpected error sending password reset email: {e}")

async def send_price_drop_email(
    to_email: str,
    to_name: str,
    product_name: str,
    old_price: float,
    new_price: float,
    drop_percent: float,
    platform: str
):
    try:
        client = get_brevo_client()
        email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email, "name": to_name}],
            sender={
                "email": settings.BREVO_SENDER_EMAIL,
                "name": settings.BREVO_SENDER_NAME
            },
            subject=f"Price Drop Alert: {product_name} dropped {drop_percent:.1f}%!",
            html_content=f"""
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                <h2 style="color:#6366f1;">Price Drop Alert! 🎉</h2>
                <p>Hi {to_name},</p>
                <p>Good news! A product on your watchlist just dropped in price.</p>
                <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
                    <h3 style="margin:0 0 8px 0;">{product_name}</h3>
                    <p style="margin:4px 0;">Platform: {platform}</p>
                    <p style="margin:4px 0;">
                        <span style="text-decoration:line-through;color:#999;">${old_price:.2f}</span>
                        &nbsp;→&nbsp;
                        <span style="color:#10b981;font-weight:bold;font-size:1.2em;">${new_price:.2f}</span>
                    </p>
                    <p style="color:#10b981;margin:4px 0;">You save {drop_percent:.1f}%!</p>
                </div>
                <a href="{settings.FRONTEND_URL}/dashboard"
                   style="display:inline-block;background:#6366f1;color:white;
                          padding:12px 24px;border-radius:6px;text-decoration:none;">
                    View on PulsePrice
                </a>
                <p style="color:#999;font-size:12px;margin-top:16px;">
                    You received this because you enabled email notifications.
                    You can disable them in your Settings.
                </p>
            </div>
            """
        )
        client.send_transac_email(email)
        logger.info(f"Price drop email sent to {to_email} for {product_name}")
    except Exception as e:
        logger.error(f"Failed to send price drop email: {e}")
