from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Assessment"],
)


class RiskInput(BaseModel):
    validation: Optional[Dict[str, Any]] = None
    tampering: Optional[Dict[str, Any]] = None
    face: Optional[Dict[str, Any]] = None
    ocr: Optional[Dict[str, Any]] = None


class RiskContributor(BaseModel):
    id: str
    factor: str
    type: str
    impact: int
    description: str


class RiskResult(BaseModel):
    score: int = Field(ge=0, le=100)
    level: str
    contributors: List[RiskContributor]
    explanation: List[str]
    recommendation: str
    analysisId: str
    method: str


def clamp_score(value: float) -> int:
    return max(0, min(100, round(value)))


def calculate_validation_risk(
    validation: Optional[Dict[str, Any]],
) -> tuple[float, List[RiskContributor], List[str]]:
    if not validation:
        return (
            15.0,
            [
                RiskContributor(
                    id="validation-not-available",
                    factor="Document validation",
                    type="negative",
                    impact=5,
                    description="Validation results were not available.",
                )
            ],
            [
                "Document validation results were not available, so a baseline validation risk was applied."
            ],
        )

    score = 0.0
    contributors: List[RiskContributor] = []
    explanation: List[str] = []

    overall_status = validation.get(
        "overallStatus",
        "warning",
    )

    passed = int(validation.get("passed", 0) or 0)
    warnings = int(validation.get("warnings", 0) or 0)
    failed = int(validation.get("failed", 0) or 0)

    if overall_status == "fail":
        score += 35

        contributors.append(
            RiskContributor(
                id="validation-failure",
                factor="Document validation",
                type="negative",
                impact=35,
                description="One or more document validation checks failed.",
            )
        )

        explanation.append(
            "Document validation contains failed checks."
        )

    elif overall_status == "warning":
        score += 15

        contributors.append(
            RiskContributor(
                id="validation-warning",
                factor="Document validation",
                type="negative",
                impact=15,
                description="Document validation produced warnings.",
            )
        )

        explanation.append(
            "Document validation produced warnings requiring review."
        )

    else:
        contributors.append(
            RiskContributor(
                id="validation-pass",
                factor="Document validation",
                type="positive",
                impact=0,
                description="Document validation checks passed.",
            )
        )

        explanation.append(
            "Document validation did not identify a structural failure."
        )

    if failed > 0:
        additional_failure_risk = min(
            failed * 5,
            20,
        )
        score += additional_failure_risk

    if warnings > 0:
        additional_warning_risk = min(
            warnings * 2,
            10,
        )
        score += additional_warning_risk

    if passed > 0 and failed == 0:
        explanation.append(
            f"{passed} validation check(s) passed."
        )

    return score, contributors, explanation


def calculate_tampering_risk(
    tampering: Optional[Dict[str, Any]],
) -> tuple[float, List[RiskContributor], List[str]]:
    if not tampering:
        return (
            20.0,
            [
                RiskContributor(
                    id="tampering-not-available",
                    factor="Forensic analysis",
                    type="negative",
                    impact=10,
                    description="Tampering analysis results were not available.",
                )
            ],
            [
                "Forensic analysis was not available, so a conservative baseline risk was applied."
            ],
        )

    score = 0.0
    contributors: List[RiskContributor] = []
    explanation: List[str] = []

    tampering_score = float(
        tampering.get(
            "overallScore",
            tampering.get(
                "tamperingScore",
                0,
            ),
        )
        or 0
    )

    tampering_score = max(
        0.0,
        min(
            100.0,
            tampering_score,
        ),
    )

    score += tampering_score * 0.45

    verdict = str(
        tampering.get(
            "overallStatus",
            tampering.get(
                "verdict",
                "clean",
            ),
        )
    ).lower()

    if verdict in {"tampered", "high"}:
        impact = max(
            30,
            round(tampering_score * 0.6),
        )

        contributors.append(
            RiskContributor(
                id="tampering-high",
                factor="Document forensics",
                type="negative",
                impact=impact,
                description="Forensic analysis indicates a high probability of document manipulation.",
            )
        )

        explanation.append(
            f"Forensic analysis produced a tampering score of {tampering_score:.1f}%."
        )

    elif verdict in {"suspicious", "medium"}:
        impact = max(
            15,
            round(tampering_score * 0.4),
        )

        contributors.append(
            RiskContributor(
                id="tampering-medium",
                factor="Document forensics",
                type="negative",
                impact=impact,
                description="Forensic analysis detected suspicious image signals.",
            )
        )

        explanation.append(
            f"Forensic analysis produced a suspicious tampering score of {tampering_score:.1f}%."
        )

    else:
        contributors.append(
            RiskContributor(
                id="tampering-clean",
                factor="Document forensics",
                type="positive",
                impact=0,
                description="No strong forensic tampering indicators were detected.",
            )
        )

        explanation.append(
            f"Forensic analysis produced a low tampering score of {tampering_score:.1f}%."
        )

    return score, contributors, explanation


def calculate_face_risk(
    face: Optional[Dict[str, Any]],
) -> tuple[float, List[RiskContributor], List[str]]:
    if not face:
        return (
            25.0,
            [
                RiskContributor(
                    id="face-not-available",
                    factor="Face verification",
                    type="negative",
                    impact=15,
                    description="Face verification results were not available.",
                )
            ],
            [
                "Face verification was not available, so identity-match confidence could not be established."
            ],
        )

    verified = bool(
        face.get(
            "verified",
            False,
        )
    )

    decision = str(
        face.get(
            "decision",
            "mismatch",
        )
    ).lower()

    similarity = float(
        face.get(
            "similarity",
            0,
        )
        or 0
    )

    similarity = max(
        0.0,
        min(
            100.0,
            similarity,
        ),
    )

    if verified and decision == "match":
        score = max(
            0.0,
            (100.0 - similarity) * 0.15,
        )

        contributors = [
            RiskContributor(
                id="face-match",
                factor="Face verification",
                type="positive",
                impact=0,
                description=f"Document and presented-person faces matched with {similarity:.1f}% similarity.",
            )
        ]

        explanation = [
            f"Face verification returned a match with {similarity:.1f}% similarity."
        ]

        return score, contributors, explanation

    score = max(
        35.0,
        100.0 - similarity,
    )

    contributors = [
        RiskContributor(
            id="face-mismatch",
            factor="Face verification",
            type="negative",
            impact=round(score),
            description=f"Document and presented-person faces did not match. Similarity was {similarity:.1f}%.",
        )
    ]

    explanation = [
        f"Face verification returned a mismatch with {similarity:.1f}% similarity."
    ]

    return score, contributors, explanation


def calculate_ocr_risk(
    ocr: Optional[Dict[str, Any]],
) -> tuple[float, List[RiskContributor], List[str]]:
    if not ocr:
        return 5.0, [], []

    confidence = float(
        ocr.get(
            "confidence",
            100,
        )
        or 0
    )

    confidence = max(
        0.0,
        min(
            100.0,
            confidence,
        ),
    )

    risk = max(
        0.0,
        (100.0 - confidence) * 0.15,
    )

    if confidence < 70:
        contributor = RiskContributor(
            id="ocr-low-confidence",
            factor="OCR confidence",
            type="negative",
            impact=round(risk),
            description=f"OCR confidence is relatively low at {confidence:.1f}%.",
        )

        return (
            risk,
            [contributor],
            [
                f"OCR confidence was {confidence:.1f}%, increasing uncertainty in extracted identity fields."
            ],
        )

    return (
        risk,
        [
            RiskContributor(
                id="ocr-confidence",
                factor="OCR confidence",
                type="positive",
                impact=0,
                description=f"OCR confidence is {confidence:.1f}%.",
            )
        ],
        [
            f"OCR confidence was {confidence:.1f}%."
        ],
    )


def determine_risk_level(
    score: int,
) -> str:
    if score >= 70:
        return "high"

    if score >= 40:
        return "review"

    return "low"


def determine_recommendation(
    level: str,
) -> str:
    if level == "high":
        return "manual_review"

    if level == "review":
        return "secondary_inspection"

    return "clear"


@router.post("")
def calculate_risk(
    payload: RiskInput,
) -> dict[str, Any]:
    total_score = 0.0

    contributors: List[RiskContributor] = []
    explanation: List[str] = []

    validation_score, validation_contributors, validation_explanation = (
        calculate_validation_risk(
            payload.validation
        )
    )

    tampering_score, tampering_contributors, tampering_explanation = (
        calculate_tampering_risk(
            payload.tampering
        )
    )

    face_score, face_contributors, face_explanation = (
        calculate_face_risk(
            payload.face
        )
    )

    ocr_score, ocr_contributors, ocr_explanation = (
        calculate_ocr_risk(
            payload.ocr
        )
    )

    total_score += validation_score
    total_score += tampering_score
    total_score += face_score
    total_score += ocr_score

    contributors.extend(
        validation_contributors
    )
    contributors.extend(
        tampering_contributors
    )
    contributors.extend(
        face_contributors
    )
    contributors.extend(
        ocr_contributors
    )

    explanation.extend(
        validation_explanation
    )
    explanation.extend(
        tampering_explanation
    )
    explanation.extend(
        face_explanation
    )
    explanation.extend(
        ocr_explanation
    )

    score = clamp_score(
        total_score
    )

    level = determine_risk_level(
        score
    )

    recommendation = determine_recommendation(
        level
    )

    return {
        "success": True,
        "data": {
            "score": score,
            "level": level,
            "contributors": [
                contributor.model_dump()
                for contributor in contributors
            ],
            "explanation": explanation,
            "recommendation": recommendation,
            "analysisId": f"risk-{id(payload)}",
            "method": "weighted-multi-factor-risk-engine",
        },
    }