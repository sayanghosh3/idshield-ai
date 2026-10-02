from importlib.util import find_spec
import pytesseract


def service_health(face_ready=False):
    try:
        pytesseract.get_tesseract_version()
        ocr = {"status": "LIVE", "detail": "Tesseract executable responds."}
    except Exception:
        ocr = {"status": "UNAVAILABLE", "detail": "Install native Tesseract and set TESSERACT_CMD or PATH."}
    face_installed = find_spec("deepface") is not None
    face = {
        "status": "LIVE" if face_ready else "NOT CHECKED" if face_installed else "UNAVAILABLE",
        "detail": "ArcFace inference succeeded this session." if face_ready else
                  "Dependencies detected; model readiness is verified on first inference." if face_installed else
                  "Install optional face-recognition requirements; model weights are also required.",
    }
    modules = {
        "ocr": ocr,
        "validation": {"status": "LIVE", "detail": "Local field and MRZ checks; no database lookup."},
        "forensics": {"status": "LIVE", "detail": "Heuristic image indicators; not proof of fraud."},
        "face": face,
        "risk": {"status": "LIVE", "detail": "Weighted advisory risk scoring."},
        "government": {"status": "NOT CONNECTED", "detail": "Authorized integration is future work."},
        "liveness": {"status": "NOT IMPLEMENTED", "detail": "No anti-spoofing analysis."},
    }
    return {"status": "ONLINE" if ocr["status"] == face["status"] == "LIVE" else "PARTIALLY AVAILABLE",
            "service": "IDShield AI API", "modules": modules}
