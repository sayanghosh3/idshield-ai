from fastapi import FastAPI
from app.health import service_health
from app.api import face
from fastapi.middleware.cors import CORSMiddleware

from app.api.audit import router as audit_router
from app.api.documents import router as documents_router
from app.api.ocr import router as ocr_router
from app.api.validation import router as validation_router
from app.api.tampering import router as tampering_router
from app.api.face import router as face_router
from app.api.risk import router as risk_router


app = FastAPI(
    title="IDShield AI API",
    description=(
        "Backend API for AI-powered fake identity "
        "and document screening."
    ),
    version="0.1.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

app.include_router(
    audit_router
)

app.include_router(
    documents_router
)

app.include_router(
    ocr_router
)

app.include_router(
    validation_router
)

app.include_router(
    tampering_router
)

app.include_router(
    face_router
)

app.include_router(
    risk_router
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "service": "IDShield AI API",
        "status": "running",
        "version": "0.1.0",
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():
    return service_health(face.MODEL_READY)
