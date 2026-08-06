import sys
import json
import os
import cv2

# Reduce native crash risk from TF/oneDNN side-effects on Windows
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

video_path = sys.argv[1]


def extract_frames(video_path, max_frames=12):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25

    if total_frames <= 0:
        cap.release()
        return []

    step = max(total_frames // max_frames, 1)
    frames = []
    index = 0

    while len(frames) < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        success, frame = cap.read()
        if not success:
            break
        frames.append({
            "image": frame,
            "frame_number": index,
            "timestamp_sec": round(index / fps, 2),
        })
        index += step
        if index >= total_frames:
            break

    cap.release()
    return frames


def detect_faces_opencv(frames):
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    face_detections = []

    for fd in frames:
        image = fd["image"]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces_raw = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(40, 40))
        faces = []
        for (x, y, w, h) in faces_raw:
            faces.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h)})

        face_detections.append({
            "frame_number": fd["frame_number"],
            "timestamp_sec": fd["timestamp_sec"],
            "face_count": len(faces),
            "faces": faces,
        })
    return face_detections


if __name__ == "__main__":
    try:
        frames = extract_frames(video_path, max_frames=12)
        face_detections = detect_faces_opencv(frames)
        frame_results = []

        for fd in face_detections:
            frame_results.append({
                "frame_number": fd["frame_number"],
                "timestamp_sec": fd["timestamp_sec"],
                "verdict": "UNCERTAIN",
                "confidence": 0,
                "face_detected": fd["face_count"] > 0,
                "face_count": fd["face_count"],
            })

        result = {
            "frames_extracted": len(frames),
            "faces_detected": sum(fd["face_count"] for fd in face_detections),
            "face_detections": face_detections,
            "frame_results": frame_results,
        }

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "frames_extracted": 0,
            "faces_detected": 0,
            "face_detections": [],
            "frame_results": [],
            "error": str(e),
        }))
        sys.exit(0)
