from pathlib import Path
import re
import time

import cv2
import numpy as np
import pytesseract

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.validation import (
    extract_information,
    validate_information,
    extract_passport_information,
    validate_passport,
    validate_aadhaar_checksum,
)


router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)


# ============================================================
# CONFIGURATION
# ============================================================

BACKEND_ROOT = Path(
    __file__
).resolve().parents[2]

UPLOAD_DIR = (
    BACKEND_ROOT
    / "storage"
    / "uploads"
)


TESSERACT_PATH = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


if Path(TESSERACT_PATH).exists():
    pytesseract.pytesseract.tesseract_cmd = (
        TESSERACT_PATH
    )


# ============================================================
# REQUEST MODEL
# ============================================================

class OCRRequest(BaseModel):
    fileId: str
    documentType: str


# ============================================================
# FILE LOOKUP
# ============================================================

def find_uploaded_file(file_id: str) -> Path:
    file_id = file_id.strip()

    matches = list(
        UPLOAD_DIR.glob(f"{file_id}.*")
    )

    if matches:
        return matches[0]

    # Helpful debugging information
    existing_files = [
        file.name
        for file in UPLOAD_DIR.iterdir()
        if file.is_file()
    ]

    raise HTTPException(
        status_code=404,
        detail={
            "message": "Uploaded document not found",
            "fileIdReceived": file_id,
            "uploadDirectory": str(UPLOAD_DIR),
            "existingFiles": existing_files,
        },
    )
# ============================================================
# TESSERACT CHECK
# ============================================================

def check_tesseract():

    try:
        version = (
            pytesseract
            .get_tesseract_version()
        )

        return str(version)

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Tesseract OCR is not available. "
                f"{exc}"
            ),
        )


# ============================================================
# AADHAAR IMAGE PROCESSING
# ============================================================

def process_aadhaar(
    image_path: Path,
) -> dict:

    start = time.perf_counter()

    image = cv2.imread(
        str(image_path)
    )

    if image is None:
        raise ValueError(
            "OpenCV could not read the image"
        )

    height, width = image.shape[:2]

    # Same lower 120-pixel region used
    # by the supplied Aadhaar code.
    region = image[
        max(0, height - 120):height,
        0:width,
    ]

    if (
        region is None
        or region.size == 0
    ):
        raise ValueError(
            "Aadhaar OCR region is empty"
        )

    gray = cv2.cvtColor(
        region,
        cv2.COLOR_BGR2GRAY,
    )

    _, threshold = cv2.threshold(
        gray,
        127,
        255,
        cv2.THRESH_BINARY,
    )

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    enhanced = clahe.apply(
        threshold
    )

    # Tesseract
    raw_text = (
        pytesseract
        .image_to_string(
            enhanced
        )
    )

    cleaned_text = (
        raw_text
        .strip()
        .replace("\n", "")
        .replace(" ", "")
    )

    aadhaar_match = re.search(
        r"\d{12}",
        cleaned_text,
    )

    aadhaar_no = (
        aadhaar_match.group()
        if aadhaar_match
        else ""
    )

    checksum_valid = False

    if aadhaar_no:
        checksum_valid = (
            validate_aadhaar_checksum(
                aadhaar_no
            )
        )

    # Also use your supplied general
    # OCR information extraction.
    extracted = extract_information(
        raw_text
    )

    validation = validate_information(
        extracted
    )

    processing_time = (
        time.perf_counter()
        - start
    )

    extracted_fields = [
        {
            "key": "name",
            "label": "Name",
            "value": extracted.get(
                "name",
                "",
            ),
            "confidence": 100
            if validation["name"] == "PASS"
            else 0,
            "source": "ocr",
            "verified":
                validation["name"] == "PASS",
        },
        {
            "key": "dateOfBirth",
            "label": "Date of Birth",
            "value": extracted.get(
                "dob",
                "",
            ),
            "confidence": 100
            if validation["dob"] == "PASS"
            else 0,
            "source": "ocr",
            "verified":
                validation["dob"] == "PASS",
        },
        {
            "key": "aadhaarNumber",
            "label": "Aadhaar Number",
            "value": aadhaar_no
            or extracted.get(
                "id_number",
                "",
            ),
            "confidence": 100
            if checksum_valid
            else 0,
            "source": "ocr",
            "verified": checksum_valid,
        },
    ]

    return {
        "documentType": "aadhaar",
        "extractedFields": extracted_fields,
        "mrz": None,
        "overallConfidence": validation[
            "score"
        ],
        "processingTime": processing_time,
        "rawText": raw_text,

        "aadhaarNumber": aadhaar_no,
        "checksumValid": checksum_valid,

        "validation": validation,

        "status": "success",
    }


# ============================================================
# PASSPORT DESKEW
# ============================================================

def deskew_passport(
    image,
):
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    _, threshold = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY_INV
        + cv2.THRESH_OTSU,
    )

    coords = np.column_stack(
        np.where(
            threshold > 0
        )
    )

    if len(coords) == 0:
        return image

    angle = cv2.minAreaRect(
        coords
    )[-1]

    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    height, width = image.shape[:2]

    center = (
        width // 2,
        height // 2,
    )

    matrix = cv2.getRotationMatrix2D(
        center,
        angle,
        1.0,
    )

    return cv2.warpAffine(
        image,
        matrix,
        (width, height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


# ============================================================
# PASSPORT OCR
# ============================================================

def process_passport(
    image_path: Path,
) -> dict:

    start = time.perf_counter()

    image = cv2.imread(
        str(image_path)
    )

    if image is None:
        raise ValueError(
            "OpenCV could not read passport image"
        )

    # Same logic as supplied passport OCR.
    straight = deskew_passport(
        image
    )

    straight = cv2.resize(
        straight,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC,
    )

    gray = cv2.cvtColor(
        straight,
        cv2.COLOR_BGR2GRAY,
    )

    # Try supplied eng+hin configuration.
    try:

        raw_text = (
            pytesseract
            .image_to_string(
                gray,
                lang="eng+hin",
                config="--psm 6",
            )
        )

    except Exception:

        # Fallback to English if Hindi
        # language data is unavailable.
        raw_text = (
            pytesseract
            .image_to_string(
                gray,
                lang="eng",
                config="--psm 6",
            )
        )

    passport_fields = (
        extract_passport_information(
            raw_text
        )
    )

    validation_results, score = (
        validate_passport(
            passport_fields
        )
    )

    # --------------------------------------------------------
    # MRZ
    # --------------------------------------------------------

    mrz = extract_mrz(
        image
    )

    processing_time = (
        time.perf_counter()
        - start
    )

    extracted_fields = []

    field_map = [
        (
            "surname",
            "Surname",
            "Surname",
        ),
        (
            "given_name",
            "Given Name",
            "Given Name",
        ),
        (
            "date_of_birth",
            "Date of Birth",
            "Date of Birth",
        ),
        (
            "card_number",
            "Card Number",
            "Card Number",
        ),
        (
            "sex",
            "Sex",
            "Sex",
        ),
        (
            "date_of_issue",
            "Date of Issue",
            "Date of Issue",
        ),
        (
            "date_of_expiry",
            "Date of Expiry",
            "Date of Expiry",
        ),
        (
            "personal_number",
            "Personal Number",
            "Personal Number",
        ),
    ]

    for key, label, validation_key in field_map:

        passed = validation_results.get(
            validation_key,
            False,
        )

        extracted_fields.append(
            {
                "key": key,
                "label": label,
                "value": passport_fields.get(
                    key,
                    "",
                ),
                "confidence": 100
                if passed
                else 0,
                "source": "ocr",
                "verified": passed,
            }
        )

    return {
        "documentType": "passport",
        "extractedFields": extracted_fields,

        "mrz": mrz,

        "overallConfidence": score,

        "processingTime": processing_time,

        "rawText": raw_text,

        "passportData": passport_fields,

        "validation": {
            "checks": validation_results,
            "score": score,
        },

        "status": "success",
    }


# ============================================================
# MRZ EXTRACTION
# ============================================================

def extract_mrz(
    image,
):
    """
    Uses the supplied MRZ approach:
    inspect lower 50% of passport image,
    preprocess and extract long MRZ-like lines.
    """

    height, width = image.shape[:2]

    mrz_region = image[
        int(height * 0.50):height,
        0:width,
    ]

    gray = cv2.cvtColor(
        mrz_region,
        cv2.COLOR_BGR2GRAY,
    )

    gray = cv2.resize(
        gray,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC,
    )

    _, binary = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY
        + cv2.THRESH_OTSU,
    )

    config = (
        "--psm 6 "
        "-c tessedit_char_whitelist="
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
    )

    text = (
        pytesseract
        .image_to_string(
            binary,
            lang="eng",
            config=config,
        )
    )

    lines = []

    for line in text.splitlines():

        line = line.upper()

        line = re.sub(
            r"[^A-Z0-9<]",
            "",
            line,
        )

        if len(line) >= 20:
            lines.append(line)

    if len(lines) < 2:
        return None

    return {
        "line1": lines[-2],
        "line2": lines[-1],
        "parsedFields": {},
    }


# ============================================================
# DEBUG CHECK
# ============================================================

def run_debug_checks(
    image_path: Path,
) -> dict:

    checks = {
        "tesseract": False,
        "file": False,
        "opencv": False,
        "mrz_region": False,
    }

    # Tesseract
    try:
        pytesseract.get_tesseract_version()
        checks["tesseract"] = True
    except Exception:
        pass

    # File
    if image_path.exists():
        checks["file"] = True

    if not checks["file"]:
        return checks

    # OpenCV
    image = cv2.imread(
        str(image_path)
    )

    if image is None:
        return checks

    checks["opencv"] = True

    height, width = image.shape[:2]

    region = image[
        max(0, height - 120):height,
        0:width,
    ]

    if (
        region is not None
        and region.size > 0
    ):
        checks["mrz_region"] = True

    return checks


# ============================================================
# OCR API
# ============================================================

@router.post("")
def run_ocr(
    request: OCRRequest,
):

    file_path = find_uploaded_file(
        request.fileId
    )

    document_type = (
        request.documentType
        .lower()
        .strip()
    )

    # Current OCR implementation
    # handles images, not PDF.
    if file_path.suffix.lower() == ".pdf":

        raise HTTPException(
            status_code=400,
            detail=(
                "PDF OCR is not implemented "
                "in the current OCR engine. "
                "Convert the PDF page to an image "
                "before OCR."
            ),
        )

    # Verify OCR environment.
    debug = run_debug_checks(
        file_path
    )

    if not debug["tesseract"]:
        raise HTTPException(
            status_code=500,
            detail="Tesseract OCR is not installed or configured.",
        )

    if not debug["opencv"]:
        raise HTTPException(
            status_code=400,
            detail="OpenCV could not read the uploaded image.",
        )

    try:

        if document_type in {
            "aadhaar",
            "aadhar",
        }:

            result = process_aadhaar(
                file_path
            )

        elif document_type in {
            "passport",
        }:

            result = process_passport(
                file_path
            )

        else:

            # General OCR fallback:
            image = cv2.imread(
                str(file_path)
            )

            if image is None:
                raise ValueError(
                    "Could not read uploaded image"
                )

            gray = cv2.cvtColor(
                image,
                cv2.COLOR_BGR2GRAY,
            )

            raw_text = (
                pytesseract
                .image_to_string(
                    gray,
                    lang="eng",
                    config="--psm 6",
                )
            )

            result = {
                "documentType":
                    document_type,

                "extractedFields": [],

                "mrz": None,

                "overallConfidence": 0,

                "processingTime": 0,

                "rawText": raw_text,

                "status": "success",
            }

        return {
            "success": True,
            "data": result,
        }

    except HTTPException:
        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {exc}",
        ) from exc