from fastapi import APIRouter
from api.v1.endpoints import auth, watchlist, shopper_alerts

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
api_router.include_router(shopper_alerts.router, prefix="/shopper-alerts", tags=["shopper-alerts"])
