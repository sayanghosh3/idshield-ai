"""Standalone experimental comparison; not connected to screening decisions."""
import argparse
import json
from pathlib import Path

def compare(document, presented, verify=None):
    paths = [Path(document).expanduser().resolve(), Path(presented).expanduser().resolve()]
    for path in paths:
        if not path.is_file():
            raise ValueError(f"Image not found: {path}")
        if path.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
            raise ValueError('Use a PNG or JPEG image')
        if not 0 < path.stat().st_size <= 10 * 1024 * 1024:
            raise ValueError('Images must contain data and be at most 10 MiB')
    if verify is None:
        try:
            from deepface import DeepFace
        except ImportError as error:
            raise RuntimeError('Install requirements.txt in a Python 3.11 virtual environment') from error
        verify = DeepFace.verify
    # Pass filenames so DeepFace handles color order and alignment.
    result = verify(img1_path=str(paths[0]), img2_path=str(paths[1]), model_name='ArcFace',
                    detector_backend='opencv', enforce_detection=True)
    return {'experimental': True, 'verified': bool(result['verified']),
            'distance': float(result['distance']), 'threshold': float(result['threshold']),
            'liveness': 'not_checked'}

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('document', help='PNG/JPEG document face image')
    parser.add_argument('presented', help='PNG/JPEG presented-person image')
    args = parser.parse_args(argv)
    try:
        print(json.dumps(compare(args.document, args.presented)))
    except (ValueError, RuntimeError) as error:
        parser.exit(2, f'{error}\n')
    except Exception:
        parser.exit(2, 'Comparison unavailable. Check dependencies, model cache and image validity.\n')

if __name__ == '__main__':
    main()
