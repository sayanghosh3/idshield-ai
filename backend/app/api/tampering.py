from __future__ import annotations

import io
import math
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, File, HTTPException, UploadFile


router = APIRouter(
    prefix="/api/tampering",
    tags=["Tampering"],
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


# ============================================================
# BASIC HELPERS
# ============================================================

def clamp(
    value: float,
    minimum: float = 0.0,
    maximum: float = 100.0,
) -> float:
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def safe_round(
    value: float,
    digits: int = 2,
) -> float:
    return round(
        float(value),
        digits,
    )


def image_entropy(
    image: np.ndarray,
) -> float:
    """
    Shannon entropy of a grayscale image.
    """

    if image.size == 0:
        return 0.0

    histogram = cv2.calcHist(
        [image],
        [0],
        None,
        [256],
        [0, 256],
    )

    histogram = histogram.flatten()

    total = histogram.sum()

    if total <= 0:
        return 0.0

    probabilities = histogram / total

    probabilities = probabilities[
        probabilities > 0
    ]

    return float(
        -np.sum(
            probabilities
            * np.log2(probabilities)
        )
    )


def variance_of_laplacian(
    image: np.ndarray,
) -> float:
    return float(
        cv2.Laplacian(
            image,
            cv2.CV_64F,
        ).var()
    )


def image_dimensions(
    image: np.ndarray,
) -> Tuple[int, int]:
    height, width = image.shape[:2]
    return width, height


# ============================================================
# IMAGE LOADING
# ============================================================

async def read_uploaded_image(
    file: UploadFile,
) -> Tuple[bytes, np.ndarray]:

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported file type. "
                "Upload JPG, JPEG or PNG."
            ),
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "File too large. "
                "Maximum size is 10 MB."
            ),
        )

    array = np.frombuffer(
        content,
        dtype=np.uint8,
    )

    image = cv2.imdecode(
        array,
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to decode image.",
        )

    return content, image


# ============================================================
# ELA - ERROR LEVEL ANALYSIS
# ============================================================

def calculate_ela(
    content: bytes,
    quality: int = 90,
) -> Dict[str, Any]:
    """
    Perform basic Error Level Analysis.

    ELA is useful as a forensic signal, but it is NOT by itself
    proof of manipulation. PNG files and images with unknown
    compression history require especially cautious interpretation.
    """

    try:
        original = Image.open(
            io.BytesIO(content)
        ).convert("RGB")

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to inspect image: {exc}"
            ),
        ) from exc

    buffer = io.BytesIO()

    original.save(
        buffer,
        format="JPEG",
        quality=quality,
    )

    buffer.seek(0)

    recompressed = Image.open(
        buffer
    ).convert("RGB")

    original_np = np.asarray(
        original,
        dtype=np.int16,
    )

    recompressed_np = np.asarray(
        recompressed,
        dtype=np.int16,
    )

    difference = np.abs(
        original_np
        - recompressed_np
    )

    difference_gray = (
        difference.mean(
            axis=2
        )
    )

    mean_error = float(
        difference_gray.mean()
    )

    max_error = float(
        difference_gray.max()
    )

    std_error = float(
        difference_gray.std()
    )

    high_error_ratio = float(
        np.mean(
            difference_gray > 20
        )
    )

    # Convert error statistics into a normalized signal.
    ela_signal = clamp(
        (
            mean_error * 5.0
        )
        + (
            std_error * 0.8
        )
        + (
            high_error_ratio * 35.0
        )
    )

    return {
        "meanError":
            safe_round(
                mean_error
            ),

        "maxError":
            safe_round(
                max_error
            ),

        "stdError":
            safe_round(
                std_error
            ),

        "highErrorRatio":
            safe_round(
                high_error_ratio * 100.0
            ),

        "signal":
            safe_round(
                ela_signal
            ),
    }


# ============================================================
# NOISE ANALYSIS
# ============================================================

def analyze_noise(
    gray: np.ndarray,
) -> Dict[str, Any]:

    denoised = cv2.GaussianBlur(
        gray,
        (5, 5),
        0,
    )

    residual = cv2.absdiff(
        gray,
        denoised,
    )

    global_std = float(
        residual.std()
    )

    height, width = gray.shape[:2]

    rows = np.array_split(
        residual,
        4,
        axis=0,
    )

    cols = np.array_split(
        residual,
        4,
        axis=1,
    )

    regional_means: List[
        float
    ] = []

    for row in rows:
        for col in cols:
            regional_means.append(
                float(
                    col.mean()
                )
            )

    if regional_means:
        regional_mean = float(
            np.mean(
                regional_means
            )
        )

        regional_std = float(
            np.std(
                regional_means
            )
        )

    else:
        regional_mean = 0.0
        regional_std = 0.0

    uniformity_ratio = (
        regional_std
        / max(
            regional_mean,
            0.001,
        )
    )

    anomaly_signal = clamp(
        uniformity_ratio * 25.0
    )

    return {
        "globalNoiseStd":
            safe_round(
                global_std
            ),

        "regionalMean":
            safe_round(
                regional_mean
            ),

        "regionalStd":
            safe_round(
                regional_std
            ),

        "uniformityRatio":
            safe_round(
                uniformity_ratio,
                4,
            ),

        "signal":
            safe_round(
                anomaly_signal
            ),
    }


# ============================================================
# EDGE ANALYSIS
# ============================================================

def analyze_edges(
    gray: np.ndarray,
) -> Dict[str, Any]:

    edges = cv2.Canny(
        gray,
        threshold1=50,
        threshold2=150,
    )

    edge_density = float(
        np.mean(
            edges > 0
        )
    )

    height, width = gray.shape[:2]

    regions = []

    for row_slice in np.array_split(
        edges,
        4,
        axis=0,
    ):

        for block in np.array_split(
            row_slice,
            4,
            axis=1,
        ):

            regions.append(
                float(
                    np.mean(
                        block > 0
                    )
                )
            )

    if regions:
        density_mean = float(
            np.mean(
                regions
            )
        )

        density_std = float(
            np.std(
                regions
            )
        )

    else:
        density_mean = 0.0
        density_std = 0.0

    anomaly_signal = clamp(
        density_std * 300.0
    )

    return {
        "edgeDensity":
            safe_round(
                edge_density * 100.0
            ),

        "regionalMean":
            safe_round(
                density_mean * 100.0
            ),

        "regionalStd":
            safe_round(
                density_std * 100.0
            ),

        "signal":
            safe_round(
                anomaly_signal
            ),
    }


# ============================================================
# TEXTURE ANALYSIS
# ============================================================

def analyze_texture(
    gray: np.ndarray,
) -> Dict[str, Any]:

    blurred = cv2.GaussianBlur(
        gray,
        (3, 3),
        0,
    )

    gradient_x = cv2.Sobel(
        blurred,
        cv2.CV_64F,
        1,
        0,
        ksize=3,
    )

    gradient_y = cv2.Sobel(
        blurred,
        cv2.CV_64F,
        0,
        1,
        ksize=3,
    )

    magnitude = np.sqrt(
        gradient_x ** 2
        + gradient_y ** 2
    )

    mean_gradient = float(
        magnitude.mean()
    )

    std_gradient = float(
        magnitude.std()
    )

    height, width = gray.shape[:2]

    regional_values = []

    for row in np.array_split(
        magnitude,
        4,
        axis=0,
    ):

        for region in np.array_split(
            row,
            4,
            axis=1,
        ):

            regional_values.append(
                float(
                    region.mean()
                )
            )

    regional_std = (
        float(
            np.std(
                regional_values
            )
        )
        if regional_values
        else 0.0
    )

    signal = clamp(
        regional_std * 1.5
    )

    return {
        "meanGradient":
            safe_round(
                mean_gradient
            ),

        "gradientStd":
            safe_round(
                std_gradient
            ),

        "regionalStd":
            safe_round(
                regional_std
            ),

        "signal":
            safe_round(
                signal
            ),
    }


# ============================================================
# METADATA
# ============================================================

def extract_metadata(
    content: bytes,
) -> Dict[str, Any]:

    metadata: Dict[
        str,
        Any,
    ] = {}

    try:
        image = Image.open(
            io.BytesIO(content)
        )

        metadata[
            "format"
        ] = image.format

        metadata[
            "mode"
        ] = image.mode

        metadata[
            "size"
        ] = {
            "width":
                image.width,

            "height":
                image.height,
        }

        metadata[
            "hasExif"
        ] = bool(
            image.getexif()
        )

        metadata[
            "exifCount"
        ] = len(
            image.getexif()
        )

    except Exception:
        metadata[
            "format"
        ] = "unknown"

    return metadata


# ============================================================
# DOCUMENT QUALITY
# ============================================================

def analyze_quality(
    gray: np.ndarray,
) -> Dict[str, Any]:

    blur_score = variance_of_laplacian(
        gray
    )

    entropy = image_entropy(
        gray
    )

    if blur_score < 40:
        blur_status = "poor"

    elif blur_score < 100:
        blur_status = "moderate"

    else:
        blur_status = "good"

    if entropy < 4.0:
        entropy_status = "low"

    elif entropy < 6.0:
        entropy_status = "moderate"

    else:
        entropy_status = "good"

    return {
        "sharpness":
            safe_round(
                blur_score
            ),

        "sharpnessStatus":
            blur_status,

        "entropy":
            safe_round(
                entropy
            ),

        "entropyStatus":
            entropy_status,
    }


# ============================================================
# FORENSIC SCORING
# ============================================================

def calculate_tampering_score(
    ela: Dict[str, Any],
    noise: Dict[str, Any],
    edges: Dict[str, Any],
    texture: Dict[str, Any],
) -> Tuple[
    float,
    str,
]:

    # These are intentionally conservative heuristic weights.
    score = (
        ela["signal"] * 0.40
        + noise["signal"] * 0.20
        + edges["signal"] * 0.20
        + texture["signal"] * 0.20
    )

    score = clamp(
        score
    )

    if score < 25:
        verdict = "low"

    elif score < 55:
        verdict = "medium"

    else:
        verdict = "high"

    return (
        safe_round(score),
        verdict,
    )


# ============================================================
# FINDINGS
# ============================================================

def build_findings(
    tampering_score: float,
    verdict: str,
    ela: Dict[str, Any],
    noise: Dict[str, Any],
    quality: Dict[str, Any],
) -> List[Dict[str, Any]]:

    findings: List[
        Dict[str, Any]
    ] = []

    if ela["highErrorRatio"] > 15:
        findings.append(
            {
                "id":
                    "ela-high-error",

                "category":
                    "compression",

                "severity":
                    "medium",

                "title":
                    "High recompression error",

                "description":
                    (
                        "The image contains regions with "
                        "higher-than-expected error after "
                        "JPEG recompression."
                    ),
            }
        )

    if noise["uniformityRatio"] > 0.50:
        findings.append(
            {
                "id":
                    "noise-inconsistency",

                "category":
                    "noise",

                "severity":
                    "medium",

                "title":
                    "Noise pattern inconsistency",

                "description":
                    (
                        "Different regions of the image "
                        "show noticeably different noise "
                        "characteristics."
                    ),
            }
        )

    if quality["sharpnessStatus"] == "poor":
        findings.append(
            {
                "id":
                    "low-image-quality",

                "category":
                    "quality",

                "severity":
                    "low",

                "title":
                    "Low image sharpness",

                "description":
                    (
                        "The source image may be too blurred "
                        "for reliable forensic analysis."
                    ),
            }
        )

    if not findings:

        findings.append(
            {
                "id":
                    "no-strong-anomalies",

                "category":
                    "forensics",

                "severity":
                    "info",

                "title":
                    "No strong forensic anomalies detected",

                "description":
                    (
                        "The heuristic checks did not identify "
                        "strong localized anomalies."
                    ),
            }
        )

    return findings


# ============================================================
# MAIN ANALYSIS
# ============================================================

def analyze_document(
    content: bytes,
    image: np.ndarray,
) -> Dict[str, Any]:

    started = time.perf_counter()

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    ela = calculate_ela(
        content
    )

    noise = analyze_noise(
        gray
    )

    edges = analyze_edges(
        gray
    )

    texture = analyze_texture(
        gray
    )

    quality = analyze_quality(
        gray
    )

    metadata = extract_metadata(
        content
    )

    score, verdict = (
        calculate_tampering_score(
            ela,
            noise,
            edges,
            texture,
        )
    )

    findings = build_findings(
        score,
        verdict,
        ela,
        noise,
        quality,
    )

    width, height = image_dimensions(
        image
    )

    processing_time = (
        time.perf_counter()
        - started
    )

    return {
        "tamperingScore":
            score,

        "verdict":
            verdict,

        "confidence":
            safe_round(
                clamp(
                    100.0
                    - (
                        quality["sharpnessStatus"]
                        == "poor"
                    ) * 20.0
                )
            ),

        "findings":
            findings,

        "signals": {
            "ela":
                ela,

            "noise":
                noise,

            "edges":
                edges,

            "texture":
                texture,
        },

        "quality":
            quality,

        "metadata":
            metadata,

        "image": {
            "width":
                width,

            "height":
                height,
        },

        "processingTime":
            safe_round(
                processing_time,
                4,
            ),

        "analysisId":
            str(
                uuid.uuid4()
            ),

        "method":
            "heuristic-image-forensics",
    }


# ============================================================
# API ENDPOINT
# ============================================================

@router.post("/analyze")
async def analyze_tampering(
    file: UploadFile = File(...),
) -> Dict[str, Any]:

    content, image = (
        await read_uploaded_image(
            file
        )
    )

    result = analyze_document(
        content,
        image,
    )

    return {
        "success":
            True,

        "data":
            result,
    }