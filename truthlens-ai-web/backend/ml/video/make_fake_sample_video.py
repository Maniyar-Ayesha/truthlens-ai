"""Create SAMPLES/fake_vid.mp4 with deepfake-like face artifacts for training/demo."""

import os
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
SAMPLES = os.path.join(ROOT, "SAMPLES")
SRC = os.path.join(SAMPLES, "VID2.mp4")
OUT = os.path.join(SAMPLES, "fake_vid.mp4")


def manipulate(frame):
    out = frame.copy().astype(np.float32)
    h, w = out.shape[:2]
    # Over-smooth (GAN skin)
    blur = cv2.GaussianBlur(frame, (9, 9), 0).astype(np.float32)
    out = 0.55 * out + 0.45 * blur
    # Color bleed
    out[:, :, 2] += 12  # BGR: boost red-ish
    out[:, :, 0] -= 8
    # Seam band
    seam = int(h * 0.48)
    out[max(0, seam - 2):seam + 3, :, :] += 35
    # Frequency wave
    yy, xx = np.mgrid[0:h, 0:w]
    wave = (np.sin(xx * 0.35) * np.cos(yy * 0.28) * 10)[:, :, None]
    out += wave
    # Mild posterize
    out = (out // 12) * 12
    return np.clip(out, 0, 255).astype(np.uint8)


def main():
    if not os.path.isfile(SRC):
        raise SystemExit(f"Missing source video: {SRC}")
    cap = cv2.VideoCapture(SRC)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(OUT, fourcc, fps, (w, h))
    n = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        writer.write(manipulate(fr))
        n += 1
        if n >= 120:
            break
    cap.release()
    writer.release()
    print(f"Wrote {OUT} frames={n}", flush=True)


if __name__ == "__main__":
    main()
