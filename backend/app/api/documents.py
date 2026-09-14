from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile


router = APIRouter(
    prefix="/api/documents",
    tags=["Documents"],
)


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}


# Store uploaded files locally for development.
# Later this can be replaced with object storage.
UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# Upload document
# ---------------------------------------------------------

@router.post("")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a document for screening.

    Supported:
    - JPG/JPEG
    - PNG
    - PDF

    Maximum size: 10 MB
    """

    # Check filename
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided",
        )

    # Check file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Only JPG, PNG and PDF files are allowed."
            ),
        )

    # Generate unique file ID
    file_id = str(uuid4())

    # Preserve extension
    suffix = Path(file.filename).suffix.lower()

    # Internal filename
    saved_filename = f"{file_id}{suffix}"

    file_path = UPLOAD_DIR / saved_filename

    # Read file in chunks so we can enforce size limit
    total_size = 0

    try:
        with file_path.open("wb") as output_file:

            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    output_file.close()

                    if file_path.exists():
                        file_path.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail="File is too large. Maximum size is 10 MB.",
                    )

                output_file.write(chunk)

    except HTTPException:
        raise

    except Exception as exc:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail="Failed to save uploaded file.",
        ) from exc

    finally:
        await file.close()

    # -----------------------------------------------------
    # Response format expected by frontend
    # -----------------------------------------------------

    return {
        "data": {
            "fileId": file_id,
            "fileName": file.filename,
            "size": total_size,
        },
        "success": True,
    }