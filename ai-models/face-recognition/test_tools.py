import contextlib
import io
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from compare_faces import compare, main

class FaceToolsTests(unittest.TestCase):
    def test_missing_input_fails_without_loading_models(self):
        with self.assertRaises(ValueError):
            compare('missing-document.png', 'missing-selfie.png')

    def test_empty_input_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'empty.png'
            path.touch()
            with self.assertRaises(ValueError):
                compare(path, path)

    def test_detection_enabled_and_no_claim_of_liveness(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'synthetic.png'
            path.write_bytes(b'synthetic fixture, decoded only by test double')
            calls = []
            def verify(**kwargs):
                calls.append(kwargs)
                return {'verified': False, 'distance': .9, 'threshold': .6}
            result = compare(path, path, verify)
            self.assertFalse(result['verified'])
            self.assertEqual(result['liveness'], 'not_checked')
            self.assertEqual(calls[0]['detector_backend'], 'opencv')
            self.assertTrue(calls[0]['enforce_detection'])

    def test_cli_requires_explicit_inputs(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            main([])
        self.assertEqual(error.exception.code, 2)

    def test_split_creates_directories_and_rejects_stale_output(self):
        script = Path(__file__).with_name('split_data.py')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'images').mkdir()
            (root / 'labels').mkdir()
            for i in range(5):
                (root / 'images' / f'{i}.jpg').write_bytes(b'synthetic')
                (root / 'labels' / f'{i}.txt').write_text('')
            first = subprocess.run([sys.executable, str(script)], cwd=root, capture_output=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(len(list((root / 'dataset/images/train').glob('*.jpg'))), 4)
            self.assertEqual(len(list((root / 'dataset/images/val').glob('*.jpg'))), 1)
            second = subprocess.run([sys.executable, str(script)], cwd=root, capture_output=True)
            self.assertNotEqual(second.returncode, 0)

if __name__ == '__main__':
    unittest.main()
