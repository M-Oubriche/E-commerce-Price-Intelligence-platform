from fastapi import FastAPI
from api.v1.endpoints import auth # Import de nouveau fichier

app = FastAPI(title="PulsePrice API")

# On branche le module d'authentification
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

@app.get("/health")
async def health():
    return "OK"