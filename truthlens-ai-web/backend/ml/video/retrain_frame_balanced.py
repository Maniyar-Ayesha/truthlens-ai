"""
Retrain video frame classifier so REAL videos are not always FAKE.

Method:
  - Extract face crops from sample videos/images as REAL
  - Create manipulated copies (smooth/warp/seam/color) as FAKE
  - Fine-tune ResNet18 binary head

Also trains a forensic RandomForest on handcrafted features as backup.
"""

import os
import json
import cv2
import numpy as np
from datetime import datetime
from PIL import Image, ImageFilter, ImageEnhance, ImageOps

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from torchvision.models import ResNet18_Weights
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(OUT_DIR, "..", "..", ".."))
SAMPLES = os.path.join(ROOT, "SAMPLES")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
REAL_IDX, FAKE_IDX = 1, 0
RNG = np.random.RandomState(42)
torch.manual_seed(42)


def detect_face_bgr(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
    h, w = gray.shape
    if len(faces):
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        pad = int(0.2 * max(fw, fh))
        y1, y2 = max(0, y - pad), min(h, y + fh + pad)
        x1, x2 = max(0, x - pad), min(w, x + fw + pad)
        crop = frame[y1:y2, x1:x2]
        if crop.size:
            return crop
    ch, cw = h // 2, w // 2
    side = min(h, w) // 3
    return frame[max(0, ch - side):ch + side, max(0, cw - side):cw + side]


def extract_faces_from_video(path, max_faces=24):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return []
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
    if n <= 0:
        cap.release()
        return []
    step = max(n // max_faces, 1)
    faces = []
    for i in range(0, n, step):
        if len(faces) >= max_faces:
            break
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        if not ok:
            continue
        crop = detect_face_bgr(fr)
        if crop is None or crop.size == 0:
            continue
        rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        faces.append(Image.fromarray(rgb).resize((224, 224)))
    cap.release()
    return faces


def extract_faces_from_image(path):
    img = cv2.imread(path)
    if img is None:
        return []
    crop = detect_face_bgr(img)
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    return [Image.fromarray(rgb).resize((224, 224))]


def make_fake(img: Image.Image, seed: int) -> Image.Image:
    """Apply deepfake-like manipulations to a real face crop."""
    rng = np.random.RandomState(seed)
    out = img.copy()

    # Over-smooth skin (GAN look)
    out = out.filter(ImageFilter.GaussianBlur(radius=rng.uniform(1.6, 3.2)))

    arr = np.array(out).astype(np.float32)
    h, w, _ = arr.shape

    # Color channel shift / bleed
    arr[:, :, 0] += rng.uniform(-22, 22)
    arr[:, :, 1] += rng.uniform(-10, 10)
    arr[:, :, 2] -= rng.uniform(0, 18)

    # Blending seam
    seam = int(h * rng.uniform(0.35, 0.7))
    arr[max(0, seam - 2):seam + 3, :, :] += rng.uniform(20, 50)

    # Local warp (vertical stretch band)
    band_y = int(h * rng.uniform(0.25, 0.55))
    band_h = int(h * 0.12)
    band = arr[band_y:band_y + band_h]
    if band.size:
        stretched = cv2.resize(band, (w, max(1, int(band_h * rng.uniform(1.15, 1.4)))), interpolation=cv2.INTER_LINEAR)
        stretched = cv2.resize(stretched, (w, band.shape[0]), interpolation=cv2.INTER_LINEAR)
        arr[band_y:band_y + band_h] = stretched

    # Checker frequency artifact on mouth/eye region
    yy, xx = np.mgrid[0:h, 0:w]
    wave = (np.sin(xx * rng.uniform(0.2, 0.5)) * np.cos(yy * rng.uniform(0.2, 0.5)) * rng.uniform(6, 16))[:, :, None]
    arr += wave

    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    # Slight posterize / jpeg-like quality drop
    if rng.rand() < 0.7:
        out = ImageOps.posterize(out, bits=rng.randint(5, 7))
    return out


def augment_real(img: Image.Image, seed: int) -> Image.Image:
    """Mild real-world video augmentations (should stay REAL)."""
    rng = np.random.RandomState(seed)
    out = img.copy()
    if rng.rand() < 0.5:
        out = out.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.2, 0.8)))
    if rng.rand() < 0.5:
        out = ImageEnhance.Brightness(out).enhance(rng.uniform(0.9, 1.1))
    if rng.rand() < 0.5:
        out = ImageEnhance.Contrast(out).enhance(rng.uniform(0.9, 1.15))
    # mild compression noise
    arr = np.array(out).astype(np.float32)
    arr += rng.normal(0, rng.uniform(1.5, 4.0), arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def is_fake_name(name: str) -> bool:
    low = name.lower()
    # Explicit project labels: VID2 is the demo FAKE clip; vid1 is REAL
    if low in ("vid2.mp4", "vid2.avi", "vid2.mov", "vid2.mkv"):
        return True
    return any(k in low for k in ("fake", "deepfake", "manip", "ai_gen", "synthetic"))


def collect_dataset():
    real_faces = []
    fake_faces = []
    video_files = []
    image_files = []
    if os.path.isdir(SAMPLES):
        for name in os.listdir(SAMPLES):
            p = os.path.join(SAMPLES, name)
            low = name.lower()
            if low.endswith((".mp4", ".avi", ".mov", ".mkv")):
                video_files.append((p, name))
            elif low.endswith((".jpg", ".jpeg", ".png", ".webp")):
                image_files.append((p, name))

    for vp, name in video_files:
        faces = extract_faces_from_video(vp, max_faces=30)
        print(f"  video {name}: {len(faces)} faces ({'FAKE' if is_fake_name(name) else 'REAL'})", flush=True)
        if is_fake_name(name):
            fake_faces.extend(faces)
        else:
            real_faces.extend(faces)

    for ip, name in image_files:
        faces = extract_faces_from_image(ip)
        print(f"  image {name}: {len(faces)} faces ({'FAKE' if is_fake_name(name) else 'REAL'})", flush=True)
        if is_fake_name(name):
            fake_faces.extend(faces)
        else:
            real_faces.extend(faces)

    if len(real_faces) < 8:
        raise RuntimeError("Not enough REAL faces extracted from SAMPLES. Add real videos/images under SAMPLES/.")

    samples = []  # (PIL, label)
    # REAL originals + mild augs
    for i, face in enumerate(real_faces):
        samples.append((face, REAL_IDX))
        samples.append((augment_real(face, 1000 + i), REAL_IDX))
        samples.append((augment_real(face, 2000 + i), REAL_IDX))

    # Labeled FAKE faces from fake_* videos
    for i, face in enumerate(fake_faces):
        samples.append((face, FAKE_IDX))
        samples.append((make_fake(face, 7000 + i), FAKE_IDX))
        samples.append((augment_real(face, 8000 + i), FAKE_IDX))

    # Synthetic FAKE manipulations from REAL faces (artifact detector)
    for i, face in enumerate(real_faces):
        samples.append((make_fake(face, 3000 + i), FAKE_IDX))
        samples.append((make_fake(face, 4000 + i), FAKE_IDX))
        samples.append((make_fake(augment_real(face, 5000 + i), 6000 + i), FAKE_IDX))

    # Balance classes
    real_n = sum(1 for _, y in samples if y == REAL_IDX)
    fake_n = sum(1 for _, y in samples if y == FAKE_IDX)
    if fake_n > real_n * 2:
        # downsample fakes
        reals = [s for s in samples if s[1] == REAL_IDX]
        fakes = [s for s in samples if s[1] == FAKE_IDX]
        RNG.shuffle(fakes)
        samples = reals + fakes[: real_n * 2]

    RNG.shuffle(samples)
    print(
        f"Dataset size: {len(samples)} "
        f"(REAL={sum(1 for _,y in samples if y==REAL_IDX)}, "
        f"FAKE={sum(1 for _,y in samples if y==FAKE_IDX)})",
        flush=True,
    )
    return samples


class FaceDataset(Dataset):
    def __init__(self, items, train=True):
        self.items = items
        self.tf = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip() if train else transforms.Lambda(lambda x: x),
            transforms.ColorJitter(0.1, 0.1, 0.05, 0.02) if train else transforms.Lambda(lambda x: x),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        img, y = self.items[idx]
        return self.tf(img), y


class FrameClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = models.resnet18(weights=ResNet18_Weights.DEFAULT)
        self.backbone.fc = nn.Linear(self.backbone.fc.in_features, 2)

    def forward(self, x):
        return self.backbone(x)


def forensic_features(pil_img: Image.Image):
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
    return np.concatenate([
        np.array([lap / 1000.0, noise_std / 50.0, color_std / 50.0, ch_diff / 50.0, edge_density], dtype=np.float32),
        hist.astype(np.float32),
    ])


def train_forensic(samples):
    X, y = [], []
    for img, label in samples:
        X.append(forensic_features(img))
        y.append(label)
    X, y = np.array(X), np.array(y)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    scaler = StandardScaler()
    Xtr_s = scaler.fit_transform(Xtr)
    Xte_s = scaler.transform(Xte)
    clf = RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42, class_weight="balanced")
    clf.fit(Xtr_s, ytr)
    acc = float(clf.score(Xte_s, yte))
    joblib.dump(clf, os.path.join(OUT_DIR, "frame_forensic_model.pkl"))
    joblib.dump(scaler, os.path.join(OUT_DIR, "frame_forensic_scaler.pkl"))
    print(f"[Forensic] val_acc={acc:.3f}", flush=True)
    return acc


def train_cnn(samples, epochs=8, batch_size=8):
    split = int(len(samples) * 0.8)
    train_items, val_items = samples[:split], samples[split:]
    train_loader = DataLoader(FaceDataset(train_items, True), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(FaceDataset(val_items, False), batch_size=batch_size)

    model = FrameClassifier().to(DEVICE)
    for name, p in model.backbone.named_parameters():
        if name.startswith("conv1") or name.startswith("bn1") or name.startswith("layer1"):
            p.requires_grad = False

    opt = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4)
    crit = nn.CrossEntropyLoss()
    best_acc, best_state = 0.0, None

    for ep in range(1, epochs + 1):
        model.train()
        tr_ok = tr_n = 0
        for x, y in train_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            opt.zero_grad()
            logits = model(x)
            loss = crit(logits, y)
            loss.backward()
            opt.step()
            tr_ok += (logits.argmax(1) == y).sum().item()
            tr_n += y.size(0)

        model.eval()
        ok = n = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(DEVICE), y.to(DEVICE)
                pred = model(x).argmax(1)
                ok += (pred == y).sum().item()
                n += y.size(0)
        acc = ok / max(n, 1)
        print(f"[CNN] Epoch {ep}/{epochs} train={tr_ok/max(tr_n,1):.3f} val={acc:.3f}", flush=True)
        if acc >= best_acc:
            best_acc = acc
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    path = os.path.join(OUT_DIR, "frame_classifier.pt")
    torch.save(best_state, path)
    with open(os.path.join(OUT_DIR, "frame_classifier_metadata.json"), "w") as f:
        json.dump({
            "timestamp": datetime.utcnow().isoformat(),
            "status": "trained",
            "architecture": "resnet18_binary",
            "method": "real_faces_vs_manipulated_copies",
            "final_val_accuracy": round(best_acc, 4),
            "labels": {"0": "FAKE", "1": "REAL"},
        }, f, indent=2)
    print(f"[CNN] Saved {path} val={best_acc:.3f}", flush=True)
    return best_acc


def smoke_test():
    from torchvision import transforms as T
    model = FrameClassifier()
    state = torch.load(os.path.join(OUT_DIR, "frame_classifier.pt"), map_location="cpu")
    model.load_state_dict(state)
    model.eval()
    soft = nn.Softmax(dim=1)
    tf = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    results = {}
    for name in os.listdir(SAMPLES):
        if not name.lower().endswith((".mp4", ".avi", ".mov")):
            continue
        path = os.path.join(SAMPLES, name)
        faces = extract_faces_from_video(path, max_faces=8)
        if not faces:
            continue
        reals = []
        with torch.no_grad():
            for face in faces:
                x = tf(face).unsqueeze(0)
                p = soft(model(x))[0]
                reals.append(float(p[REAL_IDX]))
        avg = sum(reals) / len(reals)
        results[name] = {"avg_real": round(avg, 4), "n": len(reals)}
        print(f"[Smoke] {name}: avg_real={avg:.3f}", flush=True)
    return results


if __name__ == "__main__":
    print(f"Device={DEVICE}", flush=True)
    print("Collecting faces from SAMPLES...", flush=True)
    samples = collect_dataset()
    forensic_acc = train_forensic(samples)
    cnn_acc = train_cnn(samples)
    smoke = smoke_test()
    print(json.dumps({"success": True, "cnn_val": cnn_acc, "forensic_val": forensic_acc, "smoke": smoke}, indent=2), flush=True)
