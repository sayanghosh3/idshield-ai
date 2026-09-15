from __future__ import annotations

import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import pytesseract
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pytesseract import Output


router = APIRouter(
    prefix="/api/ocr",
    tags=["OCR"],
)


# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

UPLOAD_DIR = (
    BACKEND_DIR
    / "storage"
    / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# TESSERACT
# ============================================================

def configure_tesseract() -> None:
    candidates = [
        os.getenv("TESSERACT_CMD"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Tesseract-OCR\tesseract.exe",
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            return


configure_tesseract()


# ============================================================
# REQUEST MODELS
# ============================================================

class OCRRequest(BaseModel):
    file_id: Optional[str] = Field(
        default=None,
        alias="fileId",
    )

    document_id: Optional[str] = Field(
        default=None,
        alias="documentId",
    )

    document_type: str = Field(
        default="passport",
        alias="documentType",
    )


class MRZRequest(BaseModel):
    ocr_result: Dict[str, Any] = Field(
        alias="ocrResult",
    )


# ============================================================
# DOCUMENT HELPERS
# ============================================================

def normalize_document_type(
    value: str,
) -> str:
    value = (
        value or ""
    ).strip().lower()

    aliases = {
        "aadhar": "aadhaar",
        "aadhar_card": "aadhaar",
        "aadhaar_card": "aadhaar",
        "identity": "aadhaar",
        "id": "aadhaar",
        "passport": "passport",
    }

    return aliases.get(
        value,
        value,
    )


def resolve_file_id(
    request: OCRRequest,
) -> str:
    file_id = (
        request.file_id
        or request.document_id
    )

    if not file_id:
        raise HTTPException(
            status_code=400,
            detail="fileId is required",
        )

    return file_id


def resolve_uploaded_file(
    file_id: str,
) -> Path:

    safe_name = Path(file_id).name

    if safe_name != file_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid file reference",
        )

    root = UPLOAD_DIR.resolve()

    exact = UPLOAD_DIR / safe_name

    if exact.exists():
        try:
            exact.resolve().relative_to(root)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid file reference",
            ) from exc

        return exact

    matches = [
        path
        for path in UPLOAD_DIR.glob(
            f"{safe_name}.*"
        )
        if path.suffix.lower()
        in {
            ".jpg",
            ".jpeg",
            ".png",
            ".pdf",
        }
    ]

    if len(matches) == 1:
        return matches[0]

    if len(matches) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "Multiple files match "
                f"fileId '{file_id}'"
            ),
        )

    raise HTTPException(
        status_code=404,
        detail=(
            f"Uploaded document not found: "
            f"{file_id}"
        ),
    )


def load_image(
    file_path: Path,
) -> np.ndarray:

    if file_path.suffix.lower() == ".pdf":
        raise HTTPException(
            status_code=415,
            detail=(
                "PDF OCR is not implemented yet. "
                "Please upload JPG or PNG."
            ),
        )

    image = cv2.imread(
        str(file_path),
        cv2.IMREAD_COLOR,
    )

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded image",
        )

    return image


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_date(
    value: str,
) -> str:

    match = re.fullmatch(
        r"(\d{2})[/-](\d{2})[/-](\d{4})",
        value.strip(),
    )

    if not match:
        return ""

    return (
        f"{match.group(1)}-"
        f"{match.group(2)}-"
        f"{match.group(3)}"
    )


def valid_date(
    value: str,
) -> bool:

    if not value:
        return False

    try:
        datetime.strptime(
            value,
            "%d-%m-%Y",
        )
        return True
    except ValueError:
        return False


def normalize_name(
    value: str,
) -> str:

    value = value.strip()

    value = re.sub(
        r"^[•·▪●◦.,:;|_\-+=*#]+",
        "",
        value,
    )

    value = re.sub(
        r"[•·▪●◦.,:;|_\-+=*#]+$",
        "",
        value,
    )

    value = re.sub(
        r"[^A-Za-zÀ-ÿ' -]",
        "",
        value,
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    ).strip()

    return value


def valid_name(
    value: str,
) -> bool:

    value = normalize_name(
        value
    )

    if len(value) < 2:
        return False

    return bool(
        re.fullmatch(
            r"[A-Za-zÀ-ÿ]+"
            r"(?:[A-Za-zÀ-ÿ' -]*"
            r"[A-Za-zÀ-ÿ])?",
            value,
        )
    )


# ============================================================
# DESKEW / PREPROCESSING
# ============================================================

def deskew(
    image: np.ndarray,
) -> Tuple[np.ndarray, float]:

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

    if len(coords) < 100:
        return image, 0.0

    angle = cv2.minAreaRect(
        coords
    )[-1]

    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    if abs(angle) > 12:
        return image, 0.0

    if abs(angle) < 0.1:
        return image, 0.0

    height, width = image.shape[:2]

    matrix = cv2.getRotationMatrix2D(
        (
            width // 2,
            height // 2,
        ),
        angle,
        1.0,
    )

    rotated = cv2.warpAffine(
        image,
        matrix,
        (
            width,
            height,
        ),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return (
        rotated,
        float(angle),
    )


def build_variants(
    image: np.ndarray,
    document_type: str,
) -> List[
    Tuple[str, np.ndarray]
]:

    straight, _ = deskew(
        image
    )

    enlarged = cv2.resize(
        straight,
        None,
        fx=3,
        fy=3,
        interpolation=cv2.INTER_CUBIC,
    )

    gray = cv2.cvtColor(
        enlarged,
        cv2.COLOR_BGR2GRAY,
    )

    clahe = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8, 8),
    )

    enhanced = clahe.apply(
        gray
    )

    variants = [
        (
            "gray",
            gray,
        ),
        (
            "enhanced",
            enhanced,
        ),
    ]

    if document_type == "aadhaar":

        adaptive = cv2.adaptiveThreshold(
            enhanced,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )

        otsu = cv2.threshold(
            enhanced,
            0,
            255,
            cv2.THRESH_BINARY
            + cv2.THRESH_OTSU,
        )[1]

        variants.extend(
            [
                (
                    "adaptive",
                    adaptive,
                ),
                (
                    "otsu",
                    otsu,
                ),
            ]
        )

    return variants


# ============================================================
# TESSERACT
# ============================================================

def run_tesseract(
    image: np.ndarray,
    language: str,
    psm: int,
) -> Tuple[
    str,
    float,
]:

    try:
        data = pytesseract.image_to_data(
            image,
            lang=language,
            config=f"--psm {psm}",
            output_type=Output.DICT,
        )

    except pytesseract.TesseractNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Tesseract was not found. "
                "Set TESSERACT_CMD or install Tesseract-OCR."
            ),
        ) from exc

    lines: Dict[
        Tuple[int, int, int],
        List[str],
    ] = {}

    confidences: List[
        float
    ] = []

    for index, word in enumerate(
        data.get(
            "text",
            [],
        )
    ):

        word = (
            word or ""
        ).strip()

        if not word:
            continue

        try:
            level = int(
                data[
                    "level"
                ][index]
            )

            block = int(
                data[
                    "block_num"
                ][index]
            )

            paragraph = int(
                data[
                    "par_num"
                ][index]
            )

            line = int(
                data[
                    "line_num"
                ][index]
            )

            confidence = float(
                data[
                    "conf"
                ][index]
            )

        except (
            KeyError,
            ValueError,
            TypeError,
            IndexError,
        ):
            continue

        if level < 5:
            continue

        key = (
            block,
            paragraph,
            line,
        )

        lines.setdefault(
            key,
            [],
        ).append(
            word
        )

        if confidence >= 0:
            confidences.append(
                confidence
            )

    text = "\n".join(
        " ".join(
            words
        )
        for words in lines.values()
        if words
    ).strip()

    average_confidence = (
        sum(confidences)
        / len(confidences)
        if confidences
        else 0.0
    )

    return (
        text,
        round(
            average_confidence,
            2,
        ),
    )


def collect_ocr_candidates(
    image: np.ndarray,
    document_type: str,
) -> List[
    Dict[str, Any]
]:

    language = (
        "eng+hin"
        if document_type == "aadhaar"
        else "eng"
    )

    candidates: List[
        Dict[str, Any]
    ] = []

    variants = build_variants(
        image,
        document_type,
    )

    for variant_name, variant in variants:

        for psm in (
            6,
            11,
        ):

            text, confidence = (
                run_tesseract(
                    variant,
                    language,
                    psm,
                )
            )

            if not text.strip():
                continue

            candidates.append(
                {
                    "text":
                        text,

                    "confidence":
                        confidence,

                    "variant":
                        variant_name,

                    "psm":
                        psm,
                }
            )

    return candidates


def select_general_ocr(
    candidates: List[
        Dict[str, Any]
    ],
) -> Tuple[
    str,
    float,
]:

    if not candidates:
        return (
            "",
            0.0,
        )

    ranked = sorted(
        candidates,
        key=lambda item: (
            float(
                item[
                    "confidence"
                ]
            )
            + min(
                len(
                    item["text"]
                ) / 100,
                20,
            )
        ),
        reverse=True,
    )

    best = ranked[0]

    return (
        best["text"],
        round(
            float(
                best[
                    "confidence"
                ]
            ),
            2,
        ),
    )


# ============================================================
# AADHAAR NUMBER
# ============================================================

def extract_aadhaar_number(
    text_sources: List[
        str
    ],
) -> str:

    # First pass: explicit 4-4-4 grouping.
    for text in text_sources:

        matches = re.findall(
            r"\b"
            r"(\d{4})"
            r"[\s-]+"
            r"(\d{4})"
            r"[\s-]+"
            r"(\d{4})"
            r"\b",
            text,
        )

        for parts in matches:

            candidate = "".join(
                parts
            )

            if len(candidate) == 12:
                return candidate

    # Second pass: remove non-digits from each OCR result.
    for text in text_sources:

        digits = re.sub(
            r"\D",
            "",
            text,
        )

        match = re.search(
            r"\d{12}",
            digits,
        )

        if match:
            return match.group(
                0
            )

    return ""


# ============================================================
# AADHAAR DOB
# ============================================================

def extract_aadhaar_dob(
    text_sources: List[
        str
    ],
) -> str:

    labeled_patterns = [
        r"(?:DOB|D0B|Date\s+of\s+Birth|Birth)"
        r"[^\d]{0,20}"
        r"(\d{2}[/-]\d{2}[/-]\d{4})",

        r"(?:जन्म|जन्म\s+तिथि)"
        r"[^\d]{0,20}"
        r"(\d{2}[/-]\d{2}[/-]\d{4})",
    ]

    # Prefer explicitly labeled DOB.
    for text in text_sources:

        for pattern in labeled_patterns:

            match = re.search(
                pattern,
                text,
                re.IGNORECASE,
            )

            if not match:
                continue

            value = normalize_date(
                match.group(
                    1
                )
            )

            if valid_date(
                value
            ):
                return value

    # Fallback to any valid date.
    for text in text_sources:

        dates = re.findall(
            r"\b\d{2}[/-]\d{2}[/-]\d{4}\b",
            text,
        )

        for raw in dates:

            value = normalize_date(
                raw
            )

            if valid_date(
                value
            ):
                return value

    return ""


# ============================================================
# AADHAAR NAME
# ============================================================

def extract_aadhaar_name(
    text_sources: List[
        str
    ],
    aadhaar_dob: str,
) -> str:

    scored_candidates: List[
        Tuple[
            str,
            float,
        ]
    ] = []

    blocked_terms = {
        "government",
        "india",
        "authority",
        "identification",
        "unique",
        "aadhaar",
        "aadhar",
        "address",
        "enrolment",
        "enrollment",
        "help",
        "male",
        "female",
        "dob",
        "date",
        "birth",
        "year",
        "resident",
    }

    for text in text_sources:

        lines = [
            re.sub(
                r"\s+",
                " ",
                line,
            ).strip()
            for line in text.splitlines()
            if line.strip()
        ]

        for index, line in enumerate(
            lines
        ):

            # ------------------------------------------------
            # Strongest signal:
            # line immediately before the DOB line
            # ------------------------------------------------

            if re.search(
                r"(DOB|D0B|Date\s+of\s+Birth)",
                line,
                re.IGNORECASE,
            ):

                if index > 0:

                    candidate = normalize_name(
                        lines[
                            index - 1
                        ]
                    )

                    if valid_name(
                        candidate
                    ):

                        scored_candidates.append(
                            (
                                candidate,
                                100,
                            )
                        )

            # ------------------------------------------------
            # Explicit name label
            # ------------------------------------------------

            if re.search(
                r"\bname\b|नाम",
                line,
                re.IGNORECASE,
            ):

                match = re.search(
                    r"(?:name|नाम)"
                    r"\s*[:\-]?\s*(.+)$",
                    line,
                    re.IGNORECASE,
                )

                if match:

                    candidate = normalize_name(
                        match.group(
                            1
                        )
                    )

                    if valid_name(
                        candidate
                    ):

                        scored_candidates.append(
                            (
                                candidate,
                                120,
                            )
                        )

                if index + 1 < len(lines):

                    candidate = normalize_name(
                        lines[
                            index + 1
                        ]
                    )

                    if valid_name(
                        candidate
                    ):

                        scored_candidates.append(
                            (
                                candidate,
                                110,
                            )
                        )

            # ------------------------------------------------
            # Lines that contain the DOB value
            # often have the person's details nearby.
            # ------------------------------------------------

            if (
                aadhaar_dob
                and aadhaar_dob
                in line
            ):

                if index > 0:

                    candidate = normalize_name(
                        lines[
                            index - 1
                        ]
                    )

                    if valid_name(
                        candidate
                    ):

                        scored_candidates.append(
                            (
                                candidate,
                                95,
                            )
                        )

            # ------------------------------------------------
            # Generic candidate
            # ------------------------------------------------

            candidate = normalize_name(
                line
            )

            if not valid_name(
                candidate
            ):
                continue

            words = candidate.split()

            if not (
                2
                <= len(words)
                <= 5
            ):
                continue

            lower = candidate.lower()

            if any(
                blocked in lower
                for blocked in blocked_terms
            ):
                continue

            # Reject lines that are obviously too long.
            if len(candidate) > 40:
                continue

            scored_candidates.append(
                (
                    candidate,
                    40,
                )
            )

    if not scored_candidates:
        return ""

    # Aggregate identical names. This is important because
    # different Tesseract passes may recognize the same name.
    aggregated: Dict[
        str,
        float,
    ] = {}

    for candidate, score in scored_candidates:

        key = candidate.lower()

        aggregated[key] = (
            aggregated.get(
                key,
                0,
            )
            + score
        )

    best_key = max(
        aggregated,
        key=aggregated.get,
    )

    for candidate, _ in scored_candidates:

        if candidate.lower() == best_key:
            return candidate

    return ""


# ============================================================
# VERHOEFF
# ============================================================

def verhoeff_validate(
    number: str,
) -> bool:

    if not re.fullmatch(
        r"\d{12}",
        number,
    ):
        return False

    d = [
        [0,1,2,3,4,5,6,7,8,9],
        [1,2,3,4,0,6,7,8,9,5],
        [2,3,4,0,1,7,8,9,5,6],
        [3,4,0,1,2,8,9,5,6,7],
        [4,0,1,2,3,9,5,6,7,8],
        [5,9,8,7,6,0,4,3,2,1],
        [6,5,9,8,7,1,0,4,3,2],
        [7,6,5,9,8,2,1,0,4,3],
        [8,7,6,5,9,3,2,1,0,4],
        [9,8,7,6,5,4,3,2,1,0],
    ]

    p = [
        [0,1,2,3,4,5,6,7,8,9],
        [1,5,7,6,2,8,3,0,9,4],
        [5,8,0,3,7,9,6,1,4,2],
        [8,9,1,6,0,4,3,5,2,7],
        [9,4,5,3,1,2,6,8,7,0],
        [4,2,8,6,5,7,3,9,0,1],
        [2,7,9,3,8,0,6,5,1,4],
        [7,0,4,6,9,1,3,2,5,8],
    ]

    inv = [
        0,4,3,2,1,
        5,6,7,8,9,
    ]

    checksum = 0

    for index, digit in enumerate(
        reversed(
            [
                int(x)
                for x in number
            ]
        )
    ):

        if index == 0:

            checksum = d[
                checksum
            ][
                inv[digit]
            ]

        else:

            checksum = d[
                checksum
            ][
                p[
                    index % 8
                ][digit]
            ]

    return checksum == 0


# ============================================================
# AADHAAR RESULT
# ============================================================

def build_aadhaar_result(
    candidates: List[
        Dict[str, Any]
    ],
) -> Dict[str, Any]:

    texts = [
        item["text"]
        for item in candidates
    ]

    raw_text = texts[0] if texts else ""

    # Use all OCR passes independently for fields.
    name = extract_aadhaar_name(
        texts,
        extract_aadhaar_dob(
            texts
        ),
    )

    dob = extract_aadhaar_dob(
        texts
    )

    number = extract_aadhaar_number(
        texts
    )

    confidence_values = [
        float(
            item["confidence"]
        )
        for item in candidates
        if float(
            item["confidence"]
        ) > 0
    ]

    average_confidence = (
        sum(confidence_values)
        / len(confidence_values)
        if confidence_values
        else 0
    )

    checksum_ok = (
        verhoeff_validate(
            number
        )
    )

    checks = {
        "Name":
            bool(name),

        "Date of Birth":
            valid_date(dob),

        "Aadhaar Number Format":
            bool(
                re.fullmatch(
                    r"\d{12}",
                    number,
                )
            ),

        "Aadhaar Verhoeff Check":
            checksum_ok,
    }

    score = round(
        (
            sum(
                checks.values()
            )
            / len(checks)
        )
        * 100,
        2,
    )

    fields = [
        {
            "key":
                "name",

            "label":
                "Name",

            "value":
                name,

            "confidence":
                round(
                    average_confidence
                    if name
                    else 0,
                    2,
                ),

            "source":
                "ocr",

            "verified":
                bool(name),
        },
        {
            "key":
                "date_of_birth",

            "label":
                "Date of Birth",

            "value":
                dob,

            "confidence":
                round(
                    average_confidence
                    if dob
                    else 0,
                    2,
                ),

            "source":
                "ocr",

            "verified":
                valid_date(dob),
        },
        {
            "key":
                "aadhaar_number",

            "label":
                "Aadhaar Number",

            "value":
                number,

            "confidence":
                round(
                    average_confidence
                    if number
                    else 0,
                    2,
                ),

            "source":
                "ocr",

            "verified":
                checksum_ok,
        },
    ]

    return {
        "rawText":
            raw_text,

        "fields":
            fields,

        "data": {
            "name":
                name,

            "date_of_birth":
                dob,

            "aadhaar_number":
                number,
        },

        "validation": {
            "checks":
                checks,

            "score":
                score,
        },
    }


# ============================================================
# PASSPORT
# ============================================================

def extract_passport_names(
    text: str,
) -> Tuple[
    str,
    str,
]:

    lines = [
        re.sub(
            r"\s+",
            " ",
            line,
        ).strip()
        for line in text.splitlines()
        if line.strip()
    ]

    surname = ""
    given_name = ""

    for index, line in enumerate(
        lines
    ):

        if re.search(
            r"surname",
            line,
            re.IGNORECASE,
        ):

            match = re.search(
                r"surname\s*[:\-]?\s*(.+)$",
                line,
                re.IGNORECASE,
            )

            if match:

                candidate = normalize_name(
                    match.group(
                        1
                    )
                )

                if valid_name(
                    candidate
                ):
                    surname = candidate

            if not surname and index + 1 < len(lines):

                candidate = normalize_name(
                    lines[
                        index + 1
                    ]
                )

                if valid_name(
                    candidate
                ):
                    surname = candidate

        if re.search(
            r"given\s+name",
            line,
            re.IGNORECASE,
        ):

            match = re.search(
                r"given\s+name\s*[:\-]?\s*(.+)$",
                line,
                re.IGNORECASE,
            )

            if match:

                candidate = normalize_name(
                    match.group(
                        1
                    )
                )

                if valid_name(
                    candidate
                ):
                    given_name = candidate

            if not given_name and index + 1 < len(lines):

                candidate = normalize_name(
                    lines[
                        index + 1
                    ]
                )

                if valid_name(
                    candidate
                ):
                    given_name = candidate

    return (
        surname,
        given_name,
    )


def extract_passport_dates(
    text: str,
) -> Tuple[
    str,
    str,
    str,
]:

    dates = [
        normalize_date(
            value
        )
        for value in re.findall(
            r"\b\d{2}[/-]\d{2}[/-]\d{4}\b",
            text,
        )
    ]

    dates = [
        value
        for value in dates
        if valid_date(value)
    ]

    dob = (
        dates[0]
        if len(dates) > 0
        else ""
    )

    issue = (
        dates[1]
        if len(dates) > 1
        else ""
    )

    expiry = (
        dates[2]
        if len(dates) > 2
        else ""
    )

    return (
        dob,
        issue,
        expiry,
    )


def extract_passport_number(
    text: str,
) -> str:

    upper = text.upper()

    patterns = [
        r"(?:PASSPORT\s*(?:NO|NUMBER)|CARD\s*(?:NO|NUMBER))"
        r"[\s:.-]*([A-Z0-9]{7,9})",

        r"\b[A-Z]\d{7}\b",

        r"\b\d{9}\b",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            upper,
        )

        if match:

            return re.sub(
                r"[^A-Z0-9]",
                "",
                (
                    match.group(1)
                    if match.lastindex
                    else match.group(0)
                ),
            )

    return ""


def extract_passport_sex(
    text: str,
) -> str:

    match = re.search(
        r"(?:SEX|GENDER)"
        r"[\s:.-]*"
        r"(MALE|FEMALE|M|F)\b",
        text,
        re.IGNORECASE,
    )

    if not match:
        return ""

    return (
        "F"
        if match.group(
            1
        ).upper().startswith("F")
        else "M"
    )


def parse_mrz(
    text: str,
) -> Tuple[
    Optional[
        Dict[str, Any]
    ],
    List[str],
]:

    lines = [
        re.sub(
            r"[^A-Z0-9<]",
            "",
            line.upper(),
        )
        for line in text.splitlines()
    ]

    lines = [
        line
        for line in lines
        if len(line) >= 30
    ]

    candidates = []

    for index in range(
        len(lines) - 1
    ):

        first = lines[index]
        second = lines[
            index + 1
        ]

        if (
            first.startswith("P<")
            and len(first) >= 35
            and len(second) >= 35
        ):

            candidates.append(
                (
                    first,
                    second,
                )
            )

    if not candidates:
        return (
            None,
            [],
        )

    line1, line2 = max(
        candidates,
        key=lambda pair:
        len(pair[0])
        + len(pair[1]),
    )

    line1 = line1[
        :44
    ].ljust(
        44,
        "<",
    )

    line2 = line2[
        :44
    ].ljust(
        44,
        "<",
    )

    names = line1[
        5:44
    ].split(
        "<<"
    )

    surname = (
        names[0]
        .replace(
            "<",
            " ",
        )
        .strip()
    )

    given_names = (
        names[1]
        .replace(
            "<",
            " ",
        )
        .strip()
        if len(names) > 1
        else ""
    )

    parsed = {
        "document_code":
            line1[:2],

        "issuing_state":
            line1[2:5],

        "surname":
            surname,

        "given_names":
            given_names,

        "passport_number":
            line2[:9].replace(
                "<",
                "",
            ),

        "nationality":
            line2[10:13],

        "date_of_birth_raw":
            line2[13:19],

        "sex":
            line2[20:21],

        "expiry_raw":
            line2[21:27],

        "personal_number":
            line2[28:42].replace(
                "<",
                "",
            ),
    }

    return (
        parsed,
        [
            line1,
            line2,
        ],
    )


def mrz_date(
    value: str,
) -> str:

    if not re.fullmatch(
        r"\d{6}",
        value,
    ):
        return ""

    yy = int(
        value[:2]
    )

    mm = int(
        value[2:4]
    )

    dd = int(
        value[4:6]
    )

    current_yy = (
        datetime.now().year
        % 100
    )

    year = (
        1900 + yy
        if yy > current_yy
        else 2000 + yy
    )

    try:
        datetime(
            year,
            mm,
            dd,
        )
    except ValueError:
        return ""

    return (
        f"{dd:02d}-"
        f"{mm:02d}-"
        f"{year:04d}"
    )


def build_passport_result(
    text: str,
    confidence: float,
) -> Dict[str, Any]:

    surname, given_name = (
        extract_passport_names(
            text
        )
    )

    dob, issue, expiry = (
        extract_passport_dates(
            text
        )
    )

    card_number = (
        extract_passport_number(
            text
        )
    )

    sex = (
        extract_passport_sex(
            text
        )
    )

    mrz_data, mrz_lines = (
        parse_mrz(
            text
        )
    )

    if mrz_data:

        surname = (
            mrz_data[
                "surname"
            ]
            or surname
        )

        given_name = (
            mrz_data[
                "given_names"
            ]
            or given_name
        )

        card_number = (
            mrz_data[
                "passport_number"
            ]
            or card_number
        )

        sex = (
            mrz_data[
                "sex"
            ]
            or sex
        )

        dob = (
            mrz_date(
                mrz_data[
                    "date_of_birth_raw"
                ]
            )
            or dob
        )

        expiry = (
            mrz_date(
                mrz_data[
                    "expiry_raw"
                ]
            )
            or expiry
        )

    checks = {
        "Surname":
            valid_name(
                surname
            ),

        "Given Name":
            valid_name(
                given_name
            ),

        "Date of Birth":
            valid_date(
                dob
            ),

        "Card Number":
            bool(
                re.fullmatch(
                    r"[A-Z0-9]{7,9}",
                    card_number,
                )
            ),

        "Sex":
            sex in {
                "M",
                "F",
            },

        "Date of Issue":
            valid_date(
                issue
            )
            if issue
            else False,

        "Date of Expiry":
            valid_date(
                expiry
            )
            if expiry
            else False,
    }

    if (
        valid_date(dob)
        and valid_date(issue)
    ):

        checks[
            "Issue After Birth"
        ] = (
            datetime.strptime(
                issue,
                "%d-%m-%Y",
            )
            >=
            datetime.strptime(
                dob,
                "%d-%m-%Y",
            )
        )

    else:

        checks[
            "Issue After Birth"
        ] = False

    if (
        valid_date(issue)
        and valid_date(expiry)
    ):

        checks[
            "Expiry After Issue"
        ] = (
            datetime.strptime(
                expiry,
                "%d-%m-%Y",
            )
            >
            datetime.strptime(
                issue,
                "%d-%m-%Y",
            )
        )

    else:

        checks[
            "Expiry After Issue"
        ] = False

    fields = [
        {
            "key":
                "surname",

            "label":
                "Surname",

            "value":
                surname,

            "confidence":
                confidence
                if surname
                else 0,

            "source":
                "mrz"
                if mrz_data
                else "ocr",

            "verified":
                checks[
                    "Surname"
                ],
        },
        {
            "key":
                "given_name",

            "label":
                "Given Name",

            "value":
                given_name,

            "confidence":
                confidence
                if given_name
                else 0,

            "source":
                "mrz"
                if mrz_data
                else "ocr",

            "verified":
                checks[
                    "Given Name"
                ],
        },
        {
            "key":
                "date_of_birth",

            "label":
                "Date of Birth",

            "value":
                dob,

            "confidence":
                confidence
                if dob
                else 0,

            "source":
                "ocr",

            "verified":
                checks[
                    "Date of Birth"
                ],
        },
        {
            "key":
                "card_number",

            "label":
                "Card Number",

            "value":
                card_number,

            "confidence":
                confidence
                if card_number
                else 0,

            "source":
                "mrz"
                if mrz_data
                else "ocr",

            "verified":
                checks[
                    "Card Number"
                ],
        },
        {
            "key":
                "sex",

            "label":
                "Sex",

            "value":
                sex,

            "confidence":
                confidence
                if sex
                else 0,

            "source":
                "mrz"
                if mrz_data
                else "ocr",

            "verified":
                checks[
                    "Sex"
                ],
        },
        {
            "key":
                "date_of_issue",

            "label":
                "Date of Issue",

            "value":
                issue,

            "confidence":
                confidence
                if issue
                else 0,

            "source":
                "ocr",

            "verified":
                checks[
                    "Date of Issue"
                ],
        },
        {
            "key":
                "date_of_expiry",

            "label":
                "Date of Expiry",

            "value":
                expiry,

            "confidence":
                confidence
                if expiry
                else 0,

            "source":
                "mrz"
                if mrz_data
                else "ocr",

            "verified":
                checks[
                    "Date of Expiry"
                ],
        },
    ]

    return {
        "fields":
            fields,

        "data": {
            "surname":
                surname,

            "given_name":
                given_name,

            "date_of_birth":
                dob,

            "date_of_issue":
                issue,

            "date_of_expiry":
                expiry,

            "card_number":
                card_number,

            "sex":
                sex,

            "personal_number":
                (
                    mrz_data[
                        "personal_number"
                    ]
                    if mrz_data
                    else ""
                ),
        },

        "mrz_data":
            mrz_data,

        "mrz_lines":
            mrz_lines,

        "validation": {
            "checks":
                checks,

            "score":
                round(
                    (
                        sum(
                            checks.values()
                        )
                        / len(checks)
                    )
                    * 100,
                    2,
                ),
        },
    }


# ============================================================
# RESPONSE HELPERS
# ============================================================

def finalize_fields(
    fields: List[
        Dict[str, Any]
    ],
) -> List[
    Dict[str, Any]
]:

    result = []

    for source in fields:

        field = dict(
            source
        )

        if field.get(
            "value"
        ):

            confidence = float(
                field.get(
                    "confidence",
                    0,
                )
            )

            if field.get(
                "verified"
            ):
                confidence += 5

            if field.get(
                "source"
            ) == "mrz":
                confidence += 5

            field[
                "confidence"
            ] = round(
                min(
                    confidence,
                    100,
                ),
                2,
            )

        else:

            field[
                "confidence"
            ] = 0

        result.append(
            field
        )

    return result


# ============================================================
# OCR ENDPOINT
# ============================================================

@router.post("")
def extract_ocr(
    request: OCRRequest,
) -> Dict[str, Any]:

    started = time.perf_counter()

    document_type = normalize_document_type(
        request.document_type
    )

    if document_type not in {
        "aadhaar",
        "passport",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported documentType. "
                "Use 'aadhaar' or 'passport'."
            ),
        )

    file_id = resolve_file_id(
        request
    )

    file_path = resolve_uploaded_file(
        file_id
    )

    image = load_image(
        file_path
    )

    candidates = collect_ocr_candidates(
        image,
        document_type,
    )

    if not candidates:
        raise HTTPException(
            status_code=422,
            detail=(
                "OCR completed but no text "
                "could be extracted."
            ),
        )

    raw_text, confidence = (
        select_general_ocr(
            candidates
        )
    )

    if document_type == "aadhaar":

        extraction = (
            build_aadhaar_result(
                candidates
            )
        )

        # Keep the best general OCR text for debugging.
        raw_text = (
            extraction.get(
                "rawText"
            )
            or raw_text
        )

    else:

        extraction = (
            build_passport_result(
                raw_text,
                confidence,
            )
        )

    fields = finalize_fields(
        extraction[
            "fields"
        ]
    )

    processing_time = (
        time.perf_counter()
        - started
    )

    result: Dict[str, Any] = {
        "documentType":
            document_type,

        "extractedFields":
            fields,

        "mrz":
            None,

        "overallConfidence":
            round(
                confidence,
                2,
            ),

        "processingTime":
            round(
                processing_time,
                4,
            ),

        "rawText":
            raw_text,

        "validation":
            extraction[
                "validation"
            ],

        "status":
            "success",

        "metadata": {
            "fileName":
                file_path.name,

            "fileSize":
                file_path.stat().st_size,

            "ocrConfidence":
                round(
                    confidence,
                    2,
                ),

            "ocrEngine":
                "tesseract",

            "aadhaarFieldEnsemble":
                document_type
                == "aadhaar",
        },
    }

    if document_type == "aadhaar":

        result[
            "aadhaarData"
        ] = extraction[
            "data"
        ]

    else:

        result[
            "passportData"
        ] = extraction[
            "data"
        ]

        if extraction.get(
            "mrz_data"
        ):

            lines = extraction[
                "mrz_lines"
            ]

            result[
                "mrz"
            ] = {
                "line1":
                    lines[0]
                    if lines
                    else "",

                "line2":
                    lines[1]
                    if len(lines) > 1
                    else "",

                "line3":
                    None,

                "parsedFields":
                    extraction[
                        "mrz_data"
                    ],
            }

    return {
        "success":
            True,

        "data":
            result,
    }


# ============================================================
# MRZ ENDPOINT
# ============================================================

@router.post("/mrz")
def parse_mrz_endpoint(
    request: MRZRequest,
) -> Dict[str, Any]:

    raw_text = str(
        request.ocr_result.get(
            "rawText",
            "",
        )
    )

    if not raw_text:
        raise HTTPException(
            status_code=400,
            detail=(
                "ocrResult.rawText is required"
            ),
        )

    parsed, lines = parse_mrz(
        raw_text
    )

    if not parsed:
        return {
            "success": True,
            "data": None,
        }

    return {
        "success": True,
        "data": {
            "line1":
                lines[0]
                if lines
                else "",

            "line2":
                lines[1]
                if len(lines) > 1
                else "",

            "line3":
                None,

            "parsedFields":
                parsed,
        },
    }