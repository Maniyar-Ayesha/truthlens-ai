import sys
import json
import os

os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")

import cv2
import numpy as np
import torch
import torch.nn as nn

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPORAL_MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "ml", "video", "temporal_model.pt")


class TemporalLSTM(nn.Module):
    def __init__(self, input_size=12, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


def load_temporal_model(model_path):
    model = TemporalLSTM()
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Temporal model missing: {model_path}")
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def extract_opencv_features(frame_bgr, prev_gray=None):
    """Build 12-dim feature vector without MediaPipe."""
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # center face-ish crop
    y1, y2 = int(h * 0.2), int(h * 0.8)
    x1, x2 = int(w * 0.25), int(w * 0.75)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        roi = gray

    mean = float(np.mean(roi)) / 255.0
    std = float(np.std(roi)) / 255.0
    lap = float(cv2.Laplacian(roi, cv2.CV_64F).var()) / 1000.0
    hist = cv2.calcHist([roi], [0], None, [4], [0, 256]).flatten()
    hist = (hist / (hist.sum() + 1e-6)).astype(np.float32)

    flow_mag = 0.0
    if prev_gray is not None:
        prev_roi = prev_gray[y1:y2, x1:x2]
        if prev_roi.shape == roi.shape:
            flow = cv2.calcOpticalFlowFarneback(prev_roi, roi, None, 0.5, 3, 15, 3, 5, 1.2, 0)
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_mag = float(np.mean(mag)) / 10.0

    feat = np.array([
        mean, std, min(lap, 1.0), flow_mag,
        hist[0], hist[1], hist[2], hist[3],
        abs(mean - 0.5), abs(std - 0.15),
        min(flow_mag * 2, 1.0), 0.0,
    ], dtype=np.float32)
    return feat, gray


def main():
    try:
        video_path = sys.argv[1]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(json.dumps({
                "error": "Could not open video",
                "temporal_consistency": 50.0,
                "frame_variance": 0,
                "suspicious_transitions": [],
                "smooth_regions": [],
            }))
            sys.exit(0)

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            print(json.dumps({
                "error": "No frames found",
                "temporal_consistency": 50.0,
                "frame_variance": 0,
                "suspicious_transitions": [],
                "smooth_regions": [],
            }))
            sys.exit(0)

        step = max(total_frames // 30, 1)
        sequence_features = []
        suspicious_transitions = []
        prev_gray = None
        prev_feat = None

        for idx in range(0, total_frames, step):
            if len(sequence_features) >= 30:
                break
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            success, frame = cap.read()
            if not success:
                break
            feat, prev_gray = extract_opencv_features(frame, prev_gray)
            if prev_feat is not None:
                delta = float(np.sum(np.abs(feat[:4] - prev_feat[:4])))
                if delta > 0.35:
                    suspicious_transitions.append(idx)
            sequence_features.append(feat.tolist())
            prev_feat = feat

        cap.release()

        if len(sequence_features) < 8:
            print(json.dumps({
                "temporal_consistency": 55.0,
                "frame_variance": 0.0,
                "suspicious_transitions": [],
                "smooth_regions": [],
            }))
            sys.exit(0)

        while len(sequence_features) < 30:
            sequence_features.append([0.0] * 12)

        model = load_temporal_model(TEMPORAL_MODEL_PATH)
        with torch.no_grad():
            input_tensor = torch.tensor(sequence_features[:30], dtype=torch.float32).unsqueeze(0)
            consistency_score = float(model(input_tensor).item())

        # Blend model score with heuristic smoothness
        means = [f[0] for f in sequence_features if any(f)]
        frame_variance = float(np.var(means)) if means else 0.0
        heuristic = 1.0 / (1.0 + frame_variance * 20.0)
        final = 0.7 * consistency_score + 0.3 * heuristic

        print(json.dumps({
            "temporal_consistency": round(final * 100, 2),
            "frame_variance": round(frame_variance, 4),
            "suspicious_transitions": suspicious_transitions[:20],
            "smooth_regions": [],
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "temporal_consistency": 50.0,
            "frame_variance": 0,
            "suspicious_transitions": [],
            "smooth_regions": [],
        }))
        sys.exit(0)


if __name__ == "__main__":
    main()
