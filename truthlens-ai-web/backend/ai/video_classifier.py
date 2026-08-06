import sys
import json
import os

os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
os.environ.setdefault("USE_TF", "0")

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

REAL_LABEL_IDX = 1
FAKE_LABEL_IDX = 0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "ml", "video", "frame_classifier.pt")
FORENSIC_MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "ml", "video", "frame_forensic_model.pkl")
FORENSIC_SCALER_PATH = os.path.join(SCRIPT_DIR, "..", "ml", "video", "frame_forensic_scaler.pkl")

IMAGE_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Disable HF by default on Windows to avoid TF/native crashes
ENABLE_HF = os.environ.get("ENABLE_HF_VIDEO", "0") == "1"
_hf_pipe = None
_forensic = None
_forensic_scaler = None


class FrameClassifier(nn.Module):
    def __init__(self, num_classes=2, model_type="resnet18"):
        super().__init__()
        self.model_type = model_type
        if model_type == "efficientnet":
            self.backbone = models.efficientnet_b0(weights=None)
            self.backbone.classifier[1] = nn.Linear(self.backbone.classifier[1].in_features, num_classes)
        elif model_type == "resnet18":
            self.backbone = models.resnet18(weights=None)
            self.backbone.fc = nn.Linear(self.backbone.fc.in_features, num_classes)
        else:
            self.backbone = models.resnet50(weights=None)
            self.backbone.fc = nn.Linear(self.backbone.fc.in_features, num_classes)

    def forward(self, x):
        return self.backbone(x)


def load_model(model_path):
    if not os.path.exists(model_path):
        return None, "missing"

    for model_type in ("resnet18", "resnet50", "efficientnet"):
        try:
            model = FrameClassifier(num_classes=2, model_type=model_type)
            state_dict = torch.load(model_path, map_location="cpu")
            if isinstance(state_dict, dict) and "state_dict" in state_dict:
                state_dict = state_dict["state_dict"]
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            return model, model_type
        except Exception:
            continue
    return None, "unknown"


def get_hf_pipe():
    global _hf_pipe
    if not ENABLE_HF:
        return None
    if _hf_pipe is not None:
        return _hf_pipe if _hf_pipe is not False else None
    try:
        from transformers import pipeline
        _hf_pipe = pipeline(
            "image-classification",
            model="prithivMLmods/Deep-Fake-Detector-v2-Model",
            device=-1,
        )
        return _hf_pipe
    except Exception:
        try:
            from transformers import pipeline
            _hf_pipe = pipeline(
                "image-classification",
                model="dima806/deepfake_vs_real_image_detection",
                device=-1,
            )
            return _hf_pipe
        except Exception:
            _hf_pipe = False
            return None


def hf_predict(pil_img):
    pipe = get_hf_pipe()
    if not pipe:
        return None
    try:
        preds = pipe(pil_img)
        fake_p, real_p = 0.0, 0.0
        for p in preds:
            label = str(p.get("label", "")).upper()
            score = float(p.get("score", 0.0))
            if any(k in label for k in ("FAKE", "DEEPFAKE", "AI", "GENERATED")):
                fake_p = max(fake_p, score)
            elif any(k in label for k in ("REAL", "AUTHENTIC", "ORIGINAL")):
                real_p = max(real_p, score)
        if fake_p + real_p <= 0 and preds:
            top = preds[0]
            if "REAL" in str(top.get("label", "")).upper():
                real_p = float(top["score"])
                fake_p = 1.0 - real_p
            else:
                fake_p = float(top["score"])
                real_p = 1.0 - fake_p
        total = fake_p + real_p
        if total <= 0:
            return None
        return real_p / total, fake_p / total
    except Exception:
        return None


def load_forensic():
    global _forensic, _forensic_scaler
    if _forensic is not False and _forensic is not None:
        return _forensic, _forensic_scaler
    try:
        import joblib
        if os.path.isfile(FORENSIC_MODEL_PATH) and os.path.isfile(FORENSIC_SCALER_PATH):
            _forensic = joblib.load(FORENSIC_MODEL_PATH)
            _forensic_scaler = joblib.load(FORENSIC_SCALER_PATH)
            return _forensic, _forensic_scaler
    except Exception:
        pass
    _forensic = False
    _forensic_scaler = None
    return None, None


def forensic_predict(pil_img):
    clf, scaler = load_forensic()
    if clf is None:
        return None
    try:
        arr = np.asarray(pil_img.convert("RGB"), dtype=np.uint8)
        gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
        gray_f = gray.astype(np.float32)
        lap = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        noise = gray_f - cv2.GaussianBlur(gray_f, (5, 5), 0)
        noise_std = float(np.std(noise))
        color_std = float(np.std(arr.astype(np.float32), axis=(0, 1)).mean())
        ch_diff = float(np.mean(np.abs(arr[:, :, 0].astype(np.float32) - arr[:, :, 2].astype(np.float32))))
        edges = cv2.Canny(gray, 50, 150)
        edge_density = float(np.mean(edges) / 255.0)
        hist = cv2.calcHist([gray], [0], None, [8], [0, 256]).flatten()
        hist = hist / (hist.sum() + 1e-6)
        feat = np.concatenate([
            np.array([lap / 1000.0, noise_std / 50.0, color_std / 50.0, ch_diff / 50.0, edge_density], dtype=np.float32),
            hist.astype(np.float32),
        ]).reshape(1, -1)
        Xs = scaler.transform(feat)
        proba = clf.predict_proba(Xs)[0]
        classes = list(clf.classes_)
        real_i = classes.index(REAL_LABEL_IDX) if REAL_LABEL_IDX in classes else 1
        fake_i = classes.index(FAKE_LABEL_IDX) if FAKE_LABEL_IDX in classes else 0
        return float(proba[real_i]), float(proba[fake_i])
    except Exception:
        return None


def preprocess_face(face_img):
    pil_img = Image.fromarray(face_img)
    transform = transforms.Compose([
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    return transform(pil_img).unsqueeze(0), pil_img.resize((IMAGE_SIZE, IMAGE_SIZE))


def detect_face_roi(frame_rgb):
    h, w, _ = frame_rgb.shape
    try:
        gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
        if len(faces):
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            pad = int(0.15 * max(fw, fh))
            y1, y2 = max(0, y - pad), min(h, y + fh + pad)
            x1, x2 = max(0, x - pad), min(w, x + fw + pad)
            return frame_rgb[y1:y2, x1:x2], True
    except Exception:
        pass

    ch, cw = h // 2, w // 2
    side = min(h, w, 224) // 2
    return frame_rgb[max(0, ch - side):ch + side, max(0, cw - side):cw + side], False


def main():
    try:
        video_path = sys.argv[1]
        frame_indices_str = sys.argv[2] if len(sys.argv) > 2 else ""

        model, model_type = load_model(MODEL_PATH)
        if model is None:
            print(json.dumps({
                "error": "Failed to load frame classifier model. Retrain with train_video_ensemble.py",
                "classifications": [],
                "model_type": model_type,
            }))
            sys.exit(0)

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(json.dumps({"error": "Could not open video", "classifications": [], "model_type": model_type}))
            sys.exit(0)

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        if total_frames <= 0:
            print(json.dumps({"error": "No frames found", "classifications": [], "model_type": model_type}))
            sys.exit(0)

        if frame_indices_str:
            try:
                frame_indices = [int(x) for x in frame_indices_str.split(",") if x.strip()]
                frame_indices = [i for i in frame_indices if 0 <= i < total_frames]
            except ValueError:
                frame_indices = []
        else:
            step = max(total_frames // 16, 1)
            frame_indices = list(range(0, total_frames, step))[:16]

        classifications = []
        softmax = nn.Softmax(dim=1)
        hf_used = False

        for idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            success, frame = cap.read()
            if not success:
                continue

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            best_face, face_found = detect_face_roi(frame_rgb)

            try:
                input_tensor, pil_face = preprocess_face(best_face)
                with torch.no_grad():
                    logits = model(input_tensor)
                    probs = softmax(logits)
                    cnn_real = float(probs[0][REAL_LABEL_IDX])
                    cnn_fake = float(probs[0][FAKE_LABEL_IDX])
            except Exception:
                cnn_real, cnn_fake = 0.5, 0.5
                pil_face = Image.fromarray(best_face)

            forensic = forensic_predict(pil_face)
            hf = hf_predict(pil_face)

            real_prob, fake_prob = cnn_real, cnn_fake
            w_cnn, w_for, w_hf = 0.55, 0.45, 0.0

            if forensic is not None:
                f_real, f_fake = forensic
                real_prob = w_cnn * cnn_real + w_for * f_real
                fake_prob = w_cnn * cnn_fake + w_for * f_fake
            if hf is not None:
                hf_real, hf_fake = hf
                hf_used = True
                real_prob = 0.5 * real_prob + 0.5 * hf_real
                fake_prob = 0.5 * fake_prob + 0.5 * hf_fake

            # Normalize
            s = real_prob + fake_prob
            if s > 0:
                real_prob, fake_prob = real_prob / s, fake_prob / s

            if real_prob >= 0.55:
                verdict = "REAL"
            elif fake_prob >= 0.55:
                verdict = "FAKE"
            else:
                verdict = "UNCERTAIN"

            classifications.append({
                "frame_number": idx,
                "timestamp_sec": round(idx / fps, 2),
                "verdict": verdict,
                "confidence": round(max(real_prob, fake_prob), 4),
                "real_prob": round(real_prob, 4),
                "fake_prob": round(fake_prob, 4),
                "face_detected": bool(face_found),
                "cnn_real": round(cnn_real, 4),
                "cnn_fake": round(cnn_fake, 4),
            })

        cap.release()

        print(json.dumps({
            "classifications": classifications,
            "model_type": f"{model_type}+HF" if hf_used else model_type,
            "hf_used": hf_used,
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "classifications": [],
            "model_type": "unknown",
        }))
        sys.exit(0)


if __name__ == "__main__":
    main()
