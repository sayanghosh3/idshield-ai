from fastapi import APIRouter, HTTPException
from typing import Optional


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit"]
)


# Temporary in-memory audit records.
# Later this will be replaced by PostgreSQL.
audit_events = []


@router.get("")
def get_audit_events(
    case_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Get audit events with optional filters.
    """

    events = audit_events

    if case_id:
        events = [
            event for event in events
            if event.get("caseId") == case_id
        ]

    if category:
        events = [
            event for event in events
            if event.get("category") == category
        ]

    if status:
        events = [
            event for event in events
            if event.get("status") == status
        ]

    return {
        "count": len(events),
        "events": events
    }


@router.get("/{event_id}")
def get_audit_event(event_id: str):
    """
    Get a single audit event by ID.
    """

    for event in audit_events:
        if event.get("id") == event_id:
            return event

    raise HTTPException(
        status_code=404,
        detail="Audit event not found"
    )