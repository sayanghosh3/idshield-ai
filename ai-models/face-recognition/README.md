# Experimental face tools

These commands are independent of the React demo and secure document server.
They do not provide liveness verification or validated identity decisions.

Use Python 3.11 in an isolated virtual environment:

```sh
python -m venv .venv
# Activate .venv using the command for your operating system.
python -m pip install -r ai-models/face-recognition/requirements.txt
python ai-models/face-recognition/compare_faces.py document.jpg selfie.jpg
python ai-models/face-recognition/comparelivefaces.py document.jpg webcam_capture.jpg
```

Both commands use OpenCV detection and ArcFace comparison through
[DeepFace](https://pypi.org/project/deepface/). Missing custom YOLO weights are
no longer required. DeepFace may download model weights on first use; prepare
and validate that cache with synthetic images before running offline. Missing
inputs or failed analysis exit with an error, never a successful match.
Model accuracy and full dependency installation have not been validated here.
Validate your platform and freeze its environment before deployment.

The legacy dataset preparation scripts run from this directory. Put TIFF source
folders under raw_data, JPEGs under images, and annotations under labels.
Run convert_images.py followed by split_data.py. The split script requires a
new dataset directory to prevent stale files leaking across train/validation.
Use explicit empty labels for negative examples. Never commit identity images,
captures or datasets.
