from __future__ import annotations

import tempfile
import time
import uuid
import traceback
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(
    prefix="/api/face",
    tags=["Face Verification"],
)

ALLOWED_IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_image_type(content_type: Optional[str]) -> None:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only PNG and JPEG images are supported.",
        )


async def save_upload_to_temp(
    upload: UploadFile,
    directory: Path,
    prefix: str,
) -> Path:
    validate_image_type(upload.content_type)

    suffix = (
        ".png"
        if upload.content_type == "image/png"
        else ".jpg"
    )

    target = directory / f"{prefix}{suffix}"
    total_size = 0

    try:
        with target.open("wb") as output:
            while True:
                chunk = await upload.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Image must be at most 10 MiB.",
                    )

                output.write(chunk)

    except HTTPException:
        if target.exists():
            target.unlink(missing_ok=True)
        raise

    if total_size == 0:
        if target.exists():
            target.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    return target


def run_face_comparison(
    document_path: Path,
    presented_path: Path,
) -> dict:
    try:
        from deepface import DeepFace
    except ImportError as error:
        raise RuntimeError(
            "DeepFace is not installed. "
            "Install the face-recognition requirements "
            "before using /api/face/verify."
        ) from error

    try:
        result = DeepFace.verify(
            img1_path=str(document_path),
            img2_path=str(presented_path),
            model_name="ArcFace",
            detector_backend="opencv",
            enforce_detection=True,
        )

    except Exception as error:
        print("\n========== DEEPFACE ERROR ==========")
        print(f"Exception type: {type(error).__name__}")
        print(f"Exception message: {error}")
        traceback.print_exc()
        print("====================================\n")

        raise RuntimeError(
            f"DeepFace {type(error).__name__}: {error}"
        ) from error

    return {
        "verified": bool(
            result.get("verified", False)
        ),
        "distance": float(
            result.get("distance", 0.0)
        ),
        "threshold": float(
            result.get("threshold", 0.0)
        ),
        "model": "ArcFace",
        "detector": "opencv",
        "liveness": "not_checked",
    }


def calculate_similarity(
    distance: float,
    threshold: float,
    verified: bool,
) -> float:
    if threshold <= 0:
        return 100.0 if verified else 0.0

    normalized = 1.0 - (
        distance / threshold
    )

    normalized = max(
        0.0,
        min(1.0, normalized),
    )

    return normalized * 100.0


def build_face_response(
    comparison: dict,
    processing_time: float,
) -> dict:
    verified = comparison["verified"]
    distance = comparison["distance"]
    threshold = comparison["threshold"]

    similarity = calculate_similarity(
        distance=distance,
        threshold=threshold,
        verified=verified,
    )

    decision = (
        "match"
        if verified
        else "mismatch"
    )

    return {
        "similarity": round(
            similarity,
            2,
        ),
        "decision": decision,
        "verified": verified,
        "distance": round(
            distance,
            6,
        ),
        "threshold": round(
            threshold,
            6,
        ),
        "model": comparison["model"],
        "detector": comparison["detector"],
        "liveness": comparison["liveness"],
        "documentFace": {
            "detected": True,
            "qualityScore": 100.0,
        },
        "presentedFace": {
            "detected": True,
            "qualityScore": 100.0,
            "livenessStatus": "not_checked",
        },
        "processingTime": round(
            processing_time,
            4,
        ),
        "analysisId": str(
            uuid.uuid4()
        ),
        "method": "deepface-arcface",
    }


@router.post("/verify")
async def verify_face(
    document: UploadFile = File(...),
    presented: UploadFile = File(...),
):
    start_time = time.perf_counter()

    validate_image_type(
        document.content_type
    )

    validate_image_type(
        presented.content_type
    )

    with tempfile.TemporaryDirectory(
        prefix="idshield-face-"
    ) as temp_dir:

        temp_directory = Path(temp_dir)

        document_path = (
            await save_upload_to_temp(
                upload=document,
                directory=temp_directory,
                prefix="document-face",
            )
        )

        presented_path = (
            await save_upload_to_temp(
                upload=presented,
                directory=temp_directory,
                prefix="presented-face",
            )
        )

        try:
            comparison = run_face_comparison(
                document_path=document_path,
                presented_path=presented_path,
            )

        except RuntimeError as error:
            raise HTTPException(
                status_code=503,
                detail=str(error),
            ) from error

        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Face verification failed: "
                    f"{type(error).__name__}: {error}"
                ),
            ) from error

    processing_time = (
        time.perf_counter()
        - start_time
    )

    result = build_face_response(
        comparison=comparison,
        processing_time=processing_time,
    )

    return {
        "success": True,
        "data": result,
    }