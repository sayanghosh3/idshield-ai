import cv2


def capture_frame(save_path="webcam_capture.jpg"):
    # Open the default webcam
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        cap.release()
        print("Could not access webcam")
        return None

    print("Webcam opened successfully.")
    print("Press SPACE to capture an image.")
    print("Press ESC to cancel.")

    while True:
        ret, frame = cap.read()

        if not ret:
            print("Failed to read frame from webcam")
            save_path = None
            break

        # Show the webcam image
        cv2.imshow("Webcam - Press SPACE to capture", frame)

        # Wait for a keyboard key
        key = cv2.waitKey(1) & 0xFF

        # SPACE = 32
        if key == 32:
            success = cv2.imwrite(save_path, frame)

            if success:
                print(f"Image saved to: {save_path}")
            else:
                print("Could not save the image")
                save_path = None

            break

        # ESC = 27
        elif key == 27:
            print("Cancelled")
            save_path = None
            break

    # Close webcam and window
    cap.release()
    cv2.destroyAllWindows()

    return save_path


if __name__ == "__main__":
    capture_frame()
