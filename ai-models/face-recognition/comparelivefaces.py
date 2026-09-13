# compare_faces.py
from ultralytics import YOLO
from deepface import DeepFace
import numpy as np
from PIL import Image

yolo_model = YOLO("runs/detect/train-3/weights/best.pt")

def get_face_array(image_path):
    results = yolo_model(image_path)
    boxes = results[0].boxes

    if len(boxes) == 0:
        print(f"No face found in {image_path}")
        return None

    box = boxes[0].xyxy[0].tolist()
    x1, y1, x2, y2 = map(int, box)

    img = Image.open(image_path).convert("RGB")
    face_crop = img.crop((x1, y1, x2, y2))

    return np.array(face_crop)

img1_path = r"C:\Users\YASHOSHREE\Desktop\SIH\FACE TRAINING MODEL\face_detector_project\images\20231216_182037.jpg"  # document photo
img2_path = "webcam_capture.jpg"  # live capture

face1 = get_face_array(img1_path)
face2 = get_face_array(img2_path)

if face1 is not None and face2 is not None:
    result = DeepFace.verify(
        img1_path=face1,
        img2_path=face2,
        model_name="ArcFace",
        detector_backend="skip",
        enforce_detection=False
    )

    print("Same person?", result["verified"])
    print("Distance score:", result["distance"])
    print("Threshold used:", result["threshold"])
else:
    print("Could not compare — face not detected in one or both images.")