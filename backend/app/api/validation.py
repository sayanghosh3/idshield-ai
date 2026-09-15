from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/validate",
    tags=["Validation"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class ValidationRequest(BaseModel):
    ocr_result: Optional[Dict[str, Any]] = Field(
        default=None,
        alias="ocrResult",
    )

    document_type: Optional[str] = Field(
        default=None,
        alias="documentType",
    )


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_document_type(
    value: Optional[str],
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


def clean_text(
    value: Any,
) -> str:
    if value is None:
        return ""

    return str(value).strip()


def clean_name(
    value: Any,
) -> str:
    text = clean_text(value)

    # Remove common OCR decoration.
    text = re.sub(
        r"[•·▪●◦]",
        " ",
        text,
    )

    # Remove punctuation at the edges.
    text = text.strip(
        " .,:;|_-+=*#"
    )

    # Collapse whitespace.
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    # Keep name characters only.
    text = re.sub(
        r"[^A-Za-zÀ-ÿ' -]",
        "",
        text,
    )

    return re.sub(
        r"\s+",
        " ",
        text,
    ).strip()


def clean_alphanumeric(
    value: Any,
) -> str:
    text = clean_text(
        value
    ).upper()

    return re.sub(
        r"[^A-Z0-9]",
        "",
        text,
    )


def normalize_date(
    value: Any,
) -> str:
    text = clean_text(
        value
    )

    match = re.fullmatch(
        r"(\d{2})[/-](\d{2})[/-](\d{4})",
        text,
    )

    if not match:
        return ""

    return (
        f"{match.group(1)}-"
        f"{match.group(2)}-"
        f"{match.group(3)}"
    )


# ============================================================
# FIELD VALIDATORS
# ============================================================

def valid_name(
    value: Any,
) -> bool:

    name = clean_name(
        value
    )

    if not name:
        return False

    if len(name) < 2:
        return False

    return bool(
        re.fullmatch(
            r"[A-Za-zÀ-ÿ]+"
            r"(?:[A-Za-zÀ-ÿ' -]*"
            r"[A-Za-zÀ-ÿ])?",
            name,
        )
    )


def valid_date(
    value: Any,
) -> bool:

    date_value = normalize_date(
        value
    )

    if not date_value:
        return False

    try:
        parsed = datetime.strptime(
            date_value,
            "%d-%m-%Y",
        )

        if parsed > datetime.now():
            return False

        return True

    except ValueError:
        return False


def valid_sex(
    value: Any,
) -> bool:
    return clean_text(
        value
    ).upper() in {
        "M",
        "F",
    }


# ============================================================
# AADHAAR VERHOEFF
# ============================================================

def verhoeff_validate(
    number: str,
) -> bool:

    number = re.sub(
        r"\D",
        "",
        clean_text(number),
    )

    if not re.fullmatch(
        r"\d{12}",
        number,
    ):
        return False

    multiplication = [
        [
            0, 1, 2, 3, 4,
            5, 6, 7, 8, 9,
        ],
        [
            1, 2, 3, 4, 0,
            6, 7, 8, 9, 5,
        ],
        [
            2, 3, 4, 0, 1,
            7, 8, 9, 5, 6,
        ],
        [
            3, 4, 0, 1, 2,
            8, 9, 5, 6, 7,
        ],
        [
            4, 0, 1, 2, 3,
            9, 5, 6, 7, 8,
        ],
        [
            5, 9, 8, 7, 6,
            0, 4, 3, 2, 1,
        ],
        [
            6, 5, 9, 8, 7,
            1, 0, 4, 3, 2,
        ],
        [
            7, 6, 5, 9, 8,
            2, 1, 0, 4, 3,
        ],
        [
            8, 7, 6, 5, 9,
            3, 2, 1, 0, 4,
        ],
        [
            9, 8, 7, 6, 5,
            4, 3, 2, 1, 0,
        ],
    ]

    permutation = [
        [
            0, 1, 2, 3, 4,
            5, 6, 7, 8, 9,
        ],
        [
            1, 5, 7, 6, 2,
            8, 3, 0, 9, 4,
        ],
        [
            5, 8, 0, 3, 7,
            9, 6, 1, 4, 2,
        ],
        [
            8, 9, 1, 6, 0,
            4, 3, 5, 2, 7,
        ],
        [
            9, 4, 5, 3, 1,
            2, 6, 8, 7, 0,
        ],
        [
            4, 2, 8, 6, 5,
            7, 3, 9, 0, 1,
        ],
        [
            2, 7, 9, 3, 8,
            0, 6, 5, 1, 4,
        ],
        [
            7, 0, 4, 6, 9,
            1, 3, 2, 5, 8,
        ],
    ]

    inverse = [
        0, 4, 3, 2, 1,
        5, 6, 7, 8, 9,
    ]

    checksum = 0

    digits = [
        int(digit)
        for digit in reversed(number)
    ]

    for index, digit in enumerate(
        digits
    ):
        if index == 0:
            checksum = multiplication[
                checksum
            ][
                inverse[digit]
            ]
        else:
            checksum = multiplication[
                checksum
            ][
                permutation[
                    index % 8
                ][digit]
            ]

    return checksum == 0


# ============================================================
# PASSPORT VALIDATION
# ============================================================

def validate_passport(
    data: Dict[str, Any],
) -> Dict[str, bool]:

    surname = clean_name(
        data.get("surname")
    )

    given_name = clean_name(
        data.get("given_name")
    )

    dob = normalize_date(
        data.get("date_of_birth")
    )

    issue = normalize_date(
        data.get("date_of_issue")
    )

    expiry = normalize_date(
        data.get("date_of_expiry")
    )

    card_number = clean_alphanumeric(
        data.get("card_number")
    )

    sex = clean_text(
        data.get("sex")
    ).upper()

    personal_number = clean_alphanumeric(
        data.get("personal_number")
    )

    checks: Dict[str, bool] = {
        "Surname":
            valid_name(surname),

        "Given Name":
            valid_name(given_name),

        "Date of Birth":
            valid_date(dob),

        "Card Number":
            bool(
                re.fullmatch(
                    r"[A-Z0-9]{7,9}",
                    card_number,
                )
            ),

        "Sex":
            valid_sex(sex),

        "Date of Issue":
            valid_date(issue),

        "Date of Expiry":
            valid_date(expiry),

        "Personal Number":
            (
                bool(
                    re.fullmatch(
                        r"[A-Z0-9]{1,14}",
                        personal_number,
                    )
                )
                if personal_number
                else False
            ),
    }

    if (
        valid_date(dob)
        and valid_date(issue)
    ):
        dob_date = datetime.strptime(
            dob,
            "%d-%m-%Y",
        )

        issue_date = datetime.strptime(
            issue,
            "%d-%m-%Y",
        )

        checks[
            "Issue After Birth"
        ] = (
            issue_date >= dob_date
        )
    else:
        checks[
            "Issue After Birth"
        ] = False

    if (
        valid_date(issue)
        and valid_date(expiry)
    ):
        issue_date = datetime.strptime(
            issue,
            "%d-%m-%Y",
        )

        expiry_date = datetime.strptime(
            expiry,
            "%d-%m-%Y",
        )

        checks[
            "Expiry After Issue"
        ] = (
            expiry_date > issue_date
        )
    else:
        checks[
            "Expiry After Issue"
        ] = False

    return checks


# ============================================================
# AADHAAR VALIDATION
# ============================================================

def validate_aadhaar(
    data: Dict[str, Any],
) -> Dict[str, bool]:

    name = clean_name(
        data.get("name")
    )

    dob = normalize_date(
        data.get("date_of_birth")
    )

    number = re.sub(
        r"\D",
        "",
        clean_text(
            data.get(
                "aadhaar_number"
            )
        ),
    )

    format_valid = bool(
        re.fullmatch(
            r"\d{12}",
            number,
        )
    )

    checksum_valid = (
        verhoeff_validate(
            number
        )
        if format_valid
        else False
    )

    return {
        "Name":
            valid_name(name),

        "Date of Birth":
            valid_date(dob),

        "Aadhaar Number Format":
            format_valid,

        "Aadhaar Verhoeff Check":
            checksum_valid,
    }


# ============================================================
# CHECK LIST FOR FRONTEND
# ============================================================

def build_check_items(
    checks: Dict[str, bool],
    document_type: str,
) -> List[Dict[str, Any]]:

    items: List[
        Dict[str, Any]
    ] = []

    for name, passed in checks.items():

        name_lower = name.lower()

        if (
            "date" in name_lower
            or "birth" in name_lower
            or "expiry" in name_lower
        ):
            category = "dates"

        elif (
            "aadhaar" in name_lower
            or "card number" in name_lower
            or "personal number" in name_lower
        ):
            category = "identifier"

        elif (
            "surname" in name_lower
            or "given name" in name_lower
            or name == "Name"
            or name == "Sex"
        ):
            category = "identity"

        elif (
            "after" in name_lower
        ):
            category = "consistency"

        else:
            category = "document"

        items.append(
            {
                "id": (
                    f"{document_type}-"
                    f"{re.sub(r'[^a-z0-9]+', '-', name_lower).strip('-')}"
                ),

                "name": name,

                "description": (
                    f"{name} check passed."
                    if passed
                    else (
                        f"{name} check failed "
                        "or could not be verified."
                    )
                ),

                "category": category,

                "status": (
                    "pass"
                    if passed
                    else "fail"
                ),
            }
        )

    return items


# ============================================================
# SCORE
# ============================================================

def calculate_score(
    checks: Dict[str, bool],
) -> float:

    if not checks:
        return 0.0

    passed = sum(
        1
        for value in checks.values()
        if value
    )

    return round(
        (
            passed
            / len(checks)
        )
        * 100,
        2,
    )


def get_status(
    score: float,
) -> str:

    if score >= 90:
        return "pass"

    if score >= 60:
        return "warning"

    return "fail"


# ============================================================
# MAIN VALIDATION
# ============================================================

def validate_ocr_result(
    ocr_result: Dict[str, Any],
    document_type: Optional[str] = None,
) -> Dict[str, Any]:

    resolved_type = normalize_document_type(
        document_type
        or ocr_result.get(
            "documentType"
        )
        or "passport"
    )

    if resolved_type not in {
        "aadhaar",
        "passport",
    }:
        raise ValueError(
            "Unsupported document type"
        )

    if resolved_type == "aadhaar":

        data = (
            ocr_result.get(
                "aadhaarData"
            )
            or ocr_result.get(
                "data"
            )
            or {}
        )

        raw_checks = validate_aadhaar(
            data
        )

    else:

        data = (
            ocr_result.get(
                "passportData"
            )
            or ocr_result.get(
                "data"
            )
            or {}
        )

        raw_checks = validate_passport(
            data
        )

    score = calculate_score(
        raw_checks
    )

    status = get_status(
        score
    )

    check_items = build_check_items(
        raw_checks,
        resolved_type,
    )

    passed = sum(
        1
        for check in check_items
        if check["status"] == "pass"
    )

    failed = sum(
        1
        for check in check_items
        if check["status"] == "fail"
    )

    warnings = sum(
        1
        for check in check_items
        if check["status"] == "warning"
    )

    return {
        "documentType":
            resolved_type,

        "overallStatus":
            status,

        "score":
            score,

        "passed":
            passed,

        "warnings":
            warnings,

        "failed":
            failed,

        "checks":
            check_items,

        "rawChecks":
            raw_checks,
    }


# ============================================================
# API ENDPOINT
# ============================================================

@router.post("")
def validate_document(
    request: ValidationRequest,
) -> Dict[str, Any]:

    if not request.ocr_result:
        raise HTTPException(
            status_code=400,
            detail=(
                "ocrResult is required. "
                "Send the OCR response from /api/ocr."
            ),
        )

    try:

        result = validate_ocr_result(
            request.ocr_result,
            request.document_type,
        )

        return {
            "success":
                True,

            "data":
                result,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Document validation failed: "
                f"{exc}"
            ),
        ) from exc