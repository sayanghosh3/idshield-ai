from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.audit import router as audit_router
from app.api.documents import router as documents_router


# ============================================================
# IDShield AI - FastAPI Application
# ============================================================

app = FastAPI(
    title="IDShield AI API",
    description="Backend API for AI-powered fake identity and document screening.",
    version="0.1.0",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================
# Allows the React/Vite frontend to communicate with FastAPI
# during development.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(audit_router)
app.include_router(documents_router)

# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "service": "IDShield AI",
        "status": "running",
        "version": "0.1.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "IDShield AI API",
        "version": "0.1.0",
    }