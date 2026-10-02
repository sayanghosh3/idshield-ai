import io
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFont
from app.main import app
from app.api import documents, ocr, face
from app.health import service_health


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        image = Image.new('RGB', (320, 200), 'white')
        output = io.BytesIO()
        image.save(output, format='PNG')
        self.image = output.getvalue()

    def test_storage_path_is_independent_of_working_directory(self):
        self.assertEqual(documents.UPLOAD_DIR.resolve(), ocr.UPLOAD_DIR.resolve())

    def test_local_frontend_fallback_port_can_reach_backend(self):
        response = self.client.options('/api/documents', headers={
            'Origin': 'http://127.0.0.1:5174',
            'Access-Control-Request-Method': 'POST',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers['access-control-allow-origin'], 'http://127.0.0.1:5174')

    def test_health_does_not_claim_missing_dependencies_are_live(self):
        with patch('app.health.pytesseract.get_tesseract_version', side_effect=RuntimeError()), patch('app.health.find_spec', return_value=None):
            result = self.client.get('/health')
            self.assertEqual(result.status_code, 200)
            health = result.json()
            self.assertEqual(health['status'], 'PARTIALLY AVAILABLE')
            self.assertEqual(health['modules']['ocr']['status'], 'UNAVAILABLE')
            self.assertEqual(health['modules']['face']['status'], 'UNAVAILABLE')
            self.assertEqual(health['modules']['government']['status'], 'NOT CONNECTED')
            self.assertEqual(health['modules']['liveness']['status'], 'NOT IMPLEMENTED')
        with patch('app.health.pytesseract.get_tesseract_version', return_value='test'), patch('app.health.find_spec', return_value=object()):
            self.assertEqual(service_health()['modules']['face']['status'], 'NOT CHECKED')
            self.assertEqual(service_health(True)['status'], 'ONLINE')

    def test_synthetic_api_pipeline_with_ocr_and_face_inference_stubbed(self):
        # Exercise real routing, storage, parsing, validation, forensics and risk.
        # Native OCR and optional model inference are deliberately stubbed, not accuracy tests.
        with tempfile.TemporaryDirectory() as folder, patch.object(documents, 'UPLOAD_DIR', Path(folder)), patch.object(ocr, 'UPLOAD_DIR', Path(folder)):
            uploaded = self.client.post('/api/documents', files={'file': ('synthetic.png', self.image, 'image/png')})
            self.assertEqual(uploaded.status_code, 200)
            file_id = uploaded.json()['data']['fileId']
            with patch.object(ocr, 'collect_ocr_candidates', return_value=[{'text': 'SYNTHETIC EXAMPLE PASSPORT', 'confidence': 50}]), patch.object(ocr, 'select_general_ocr', return_value=('SYNTHETIC EXAMPLE PASSPORT', 50)):
                extracted = self.client.post('/api/ocr', json={'fileId': file_id, 'documentType': 'passport'})
            self.assertEqual(extracted.status_code, 200, extracted.text)
            data = extracted.json()['data']
            validated = self.client.post('/api/validate', json={'ocrResult': data, 'documentType': 'passport'})
            self.assertEqual(validated.status_code, 200, validated.text)
            forensic = self.client.post('/api/tampering/analyze', files={'file': ('synthetic.png', self.image, 'image/png')})
            self.assertEqual(forensic.status_code, 200, forensic.text)
            self.assertIn('signals', forensic.json()['data'])
            comparison = {'verified': False, 'distance': 0.9, 'threshold': 0.68, 'model': 'ArcFace', 'detector': 'opencv', 'liveness': 'not_checked'}
            with patch.object(face, 'run_face_comparison', return_value=comparison):
                compared = self.client.post('/api/face/verify', files={key: ('synthetic.png', self.image, 'image/png') for key in ['document', 'presented']})
            self.assertEqual(compared.status_code, 200)
            self.assertEqual(compared.json()['data']['presentedFace']['livenessStatus'], 'not_checked')
            risk = self.client.post('/api/risk', json={'ocr': data, 'validation': validated.json()['data'], 'tampering': forensic.json()['data'], 'face': compared.json()['data']})
            self.assertEqual(risk.status_code, 200)
            self.assertTrue(any(item['id'] == 'ocr-low-confidence' for item in risk.json()['data']['contributors']))

    def test_native_ocr_on_synthetic_text_when_available(self):
        if service_health()["modules"]["ocr"]["status"] != "LIVE":
            self.skipTest("Native Tesseract unavailable")
        image = Image.new("RGB", (1400, 700), "white")
        draw = ImageDraw.Draw(image)
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 50)
        except OSError:
            font = ImageFont.load_default(size=50)
        draw.multiline_text((60, 60), "SYNTHETIC TEST DOCUMENT\nPASSPORT\nSURNAME EXAMPLE\nGIVEN NAME SYNTHETIC\nNOT A VALID IDENTITY DOCUMENT", fill="black", font=font, spacing=25)
        output = io.BytesIO()
        image.save(output, format="PNG")
        with tempfile.TemporaryDirectory() as folder, patch.object(documents, "UPLOAD_DIR", Path(folder)), patch.object(ocr, "UPLOAD_DIR", Path(folder)):
            uploaded = self.client.post("/api/documents", files={"file": ("synthetic.png", output.getvalue(), "image/png")})
            result = self.client.post("/api/ocr", json={"fileId": uploaded.json()["data"]["fileId"], "documentType": "passport"})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertIn("SYNTHETIC", result.json()["data"]["rawText"].upper())

    def test_invalid_upload_and_face_dependency_error(self):
        self.assertEqual(self.client.post('/api/tampering/analyze', files={'file': ('text.txt', b'not an image', 'text/plain')}).status_code, 415)
        with patch.object(face, 'run_face_comparison', side_effect=RuntimeError('Optional model unavailable')):
            result = self.client.post('/api/face/verify', files={key: ('synthetic.png', self.image, 'image/png') for key in ['document', 'presented']})
        self.assertGreaterEqual(result.status_code, 400)
        self.assertNotIn('data', result.json())


if __name__ == '__main__':
    unittest.main()
