"""
TruthLens AI – Video Deepfake Detector (Upgraded)
===================================================
Extracts frames, runs each through HuggingFace deepfake classifier,
and returns structured per-frame results + overall verdict.

Usage:
    python deepfake_detector.py <video_path>

Output: JSON object with status, confidence, per-frame breakdown
"""

import sys
import json
import os
import cv2
import torch
from PIL import Image
from transformers import pipeline

video_path = sys.argv[1]

MODEL_NAME = "prithivMLmods/deepfake-detector-model-v1"

print("Loading ResNet...")
try:
    classifier = pipeline(
        "image-classification",
        model=MODEL_NAME,
        device=0 if torch.cuda.is_available() else -1,
    )
except Exception as e:
    print(json.dumps({
        "status":        "UNCERTAIN",
        "confidence":    "0%",
        "explanation":   f"Failed to load deepfake model: {str(e)}",
        "key_points":    ["Model could not be loaded. Check HuggingFace cache or internet connection."],
        "sources_checked": ["HuggingFace Model"],
        "frames_analyzed": 0,
        "frame_results": [],
    }))
    sys.exit(0)


def extract_frames(path, max_frames=12):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise Exception("Could not open video file")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS) or 25

    if total_frames <= 0:
        raise Exception("No frames found in video")

    step   = max(total_frames // max_frames, 1)
    frames = []
    index  = 0

    while len(frames) < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, index)
        success, frame = cap.read()
        if not success:
            break
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frames.append({
            "image":         Image.fromarray(frame),
            "frame_number":  index,
            "timestamp_sec": round(index / fps, 2),
        })
        index += step
        if index >= total_frames:
            break

    cap.release()
    return frames


try:
    frame_data = extract_frames(video_path, max_frames=12)
    frame_results = []
    fake_scores   = []
    real_scores   = []

    for fd in frame_data:
        preds      = classifier(fd["image"])
        fake_score = 0.0
        real_score = 0.0

        for pred in preds:
            label = pred["label"].lower()
            score = pred["score"]
            if "fake" in label or "deepfake" in label:
                fake_score = score
            if "real" in label or "authentic" in label:
                real_score = score

        fake_scores.append(fake_score)
        real_scores.append(real_score)

        frame_results.append({
            "frame_number":  fd["frame_number"],
            "timestamp_sec": fd["timestamp_sec"],
            "fake_score":    round(fake_score * 100, 1),
            "real_score":    round(real_score * 100, 1),
            "verdict":       "FAKE" if fake_score > real_score else "REAL",
        })

    avg_fake = sum(fake_scores) / len(fake_scores) if fake_scores else 0
    avg_real = sum(real_scores) / len(real_scores) if real_scores else 0

    fake_frame_count = sum(1 for s in fake_scores if s > 0.5)
    real_frame_count = len(fake_scores) - fake_frame_count

    if avg_fake > avg_real:
        status     = "FAKE"
        confidence = round(avg_fake * 100)
        explanation = (
            f"The video appears to be a deepfake. "
            f"{fake_frame_count} out of {len(frame_data)} analyzed frames were classified as manipulated."
        )
    else:
        status     = "REAL"
        confidence = round(avg_real * 100)
        explanation = (
            f"The video appears authentic. "
            f"{real_frame_count} out of {len(frame_data)} analyzed frames were classified as genuine."
        )

    result = {
        "status":          status,
        "confidence":      f"{confidence}%",
        "explanation":     explanation,
        "frames_analyzed": len(frame_data),
        "frame_results":   frame_results,
        "key_points": [
            f"{len(frame_data)} frames extracted and analyzed.",
            f"Average fake probability: {round(avg_fake * 100)}%",
            f"Average real probability: {round(avg_real * 100)}%",
            f"{fake_frame_count} frame(s) flagged as deepfake.",
            "Analysis powered by HuggingFace deepfake classification model.",
        ],
        "sources_checked": [
            "OpenCV Frame Extraction",
            f"HuggingFace: {MODEL_NAME}",
        ],
    }

    print(json.dumps(result))
    sys.exit(0)

except Exception as e:
    print(json.dumps({
        "status":          "UNCERTAIN",
        "confidence":      "0%",
        "explanation":     f"Video analysis failed: {str(e)}",
        "frames_analyzed": 0,
        "frame_results":   [],
        "key_points":      ["The video could not be processed. Check format and file size."],
        "sources_checked": ["OpenCV", "HuggingFace Deepfake Model"],
    }))
    sys.exit(0)