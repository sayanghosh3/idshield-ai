from pathlib import Path
from uuid import uuid4


UPLOAD_DIR = Path("storage/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def save_document(
    filename: str,
    content: bytes,
) -> dict:
    file_id = str(uuid4())

    extension = Path(filename).suffix.lower()
    saved_filename = f"{file_id}{extension}"

    file_path = UPLOAD_DIR / saved_filename

    file_path.write_bytes(content)

    return {
        "fileId": file_id,
        "fileName": filename,
        "size": len(content),
        "path": str(file_path),
    }