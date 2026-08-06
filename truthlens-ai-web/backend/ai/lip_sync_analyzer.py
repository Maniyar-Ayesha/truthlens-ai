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
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LIP_SYNC_MODEL_PATH = os.path.join(SCRIPT_DIR, "..", "ml", "video", "lip_sync_model.pt")


class LipSyncDLModel(nn.Module):
    def __init__(self, visual_dim=2, audio_dim=20, hidden_dim=64):
        super().__init__()
        self.visual_fc = nn.Linear(visual_dim, hidden_dim)
        self.audio_fc = nn.Linear(audio_dim, hidden_dim)
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, v_feat, a_feat):
        v = torch.relu(self.visual_fc(v_feat))
        a = torch.relu(self.audio_fc(a_feat))
        return self.fusion(torch.cat((v, a), dim=-1))


def load_lip_sync_model(model_path):
    model = LipSyncDLModel()
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Lip sync model missing: {model_path}")
    state_dict = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model


def extract_audio_mfcc(video_path, n_frames):
    try:
        import librosa
        import moviepy.editor as mp_editor

        video_clip = mp_editor.VideoFileClip(video_path)
        if video_clip.audio is None:
            video_clip.close()
            return np.zeros((n_frames, 20), dtype=np.float32)

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_audio:
            audio_path = tmp_audio.name
        video_clip.audio.write_audiofile(audio_path, logger=None)
        video_clip.close()

        y, sr = librosa.load(audio_path, sr=16000)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=20).T
        os.remove(audio_path)
        if len(mfcc) == 0:
            return np.zeros((n_frames, 20), dtype=np.float32)
        # resample rows to n_frames
        idxs = np.linspace(0, len(mfcc) - 1, n_frames).astype(int)
        return mfcc[idxs].astype(np.float32)
    except Exception:
        return np.zeros((n_frames, 20), dtype=np.float32)


def mouth_features_from_frame(frame_bgr, face_cascade):
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))
    if len(faces) == 0:
        h, w = gray.shape
        mouth = gray[int(h * 0.55):int(h * 0.85), int(w * 0.3):int(w * 0.7)]
    else:
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        mouth = gray[y + int(fh * 0.55):y + fh, x + int(fw * 0.2):x + int(fw * 0.8)]

    if mouth.size == 0:
        return 0.05, 10.0

    # Approximate MAR via edge intensity / width ratio
    edges = cv2.Canny(mouth, 50, 150)
    mar = float(np.mean(edges)) / 255.0
    variance = float(np.var(mouth))
    return mar, variance


def main():
    try:
        video_path = sys.argv[1]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(json.dumps({
                "error": "Could not open video",
                "lip_sync_score": 50.0,
                "is_in_sync": True,
                "mismatched_frames": [],
                "points": ["Video could not be opened"],
            }))
            sys.exit(0)

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        if total_frames <= 0:
            print(json.dumps({
                "error": "No frames",
                "lip_sync_score": 50.0,
                "is_in_sync": True,
                "mismatched_frames": [],
                "points": [],
            }))
            sys.exit(0)

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        max_samples = min(40, total_frames)
        step = max(total_frames // max_samples, 1)
        visual_features = []
        index = 0
        while index < total_frames and len(visual_features) < max_samples:
            cap.set(cv2.CAP_PROP_POS_FRAMES, index)
            success, frame = cap.read()
            if not success:
                break
            mar, variance = mouth_features_from_frame(frame, face_cascade)
            visual_features.append({
                "mar": mar,
                "variance": variance,
                "frame_number": index,
                "timestamp_sec": round(index / fps, 2),
            })
            index += step
        cap.release()

        if len(visual_features) < 2:
            print(json.dumps({
                "lip_sync_score": 55.0,
                "is_in_sync": True,
                "mismatched_frames": [],
                "points": ["Not enough frames for lip-sync analysis"],
            }))
            sys.exit(0)

        audio_features = extract_audio_mfcc(video_path, len(visual_features))
        model = load_lip_sync_model(LIP_SYNC_MODEL_PATH)

        scores = []
        mismatched_frames = []
        with torch.no_grad():
            for i, vf in enumerate(visual_features):
                a_feat = torch.tensor(audio_features[i], dtype=torch.float32).unsqueeze(0)
                v_feat = torch.tensor([vf["mar"], vf["variance"]], dtype=torch.float32).unsqueeze(0)
                score = float(model(v_feat, a_feat).item())
                scores.append(score)
                if score < 0.35:
                    mismatched_frames.append({
                        "frame_number": vf["frame_number"],
                        "timestamp_sec": vf["timestamp_sec"],
                        "mar": vf["mar"],
                        "ratio": score,
                    })

        mean_score = sum(scores) / len(scores) if scores else 0.5
        lip_sync_score = round(mean_score * 100, 2)
        is_in_sync = lip_sync_score >= 50

        print(json.dumps({
            "lip_sync_score": lip_sync_score,
            "is_in_sync": is_in_sync,
            "mismatched_frames": mismatched_frames[:20],
            "points": [
                f"Lip sync score: {lip_sync_score:.1f}%",
                f"Frames analyzed: {len(visual_features)}",
                "Model inference: OpenCV mouth features + MFCC (MediaPipe disabled for stability)",
                f"Mismatched frames detected: {len(mismatched_frames)}",
            ],
        }))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "lip_sync_score": 50.0,
            "is_in_sync": True,
            "mismatched_frames": [],
            "points": [f"Lip sync fallback used: {str(e)}"],
        }))
        sys.exit(0)


if __name__ == "__main__":
    main()
