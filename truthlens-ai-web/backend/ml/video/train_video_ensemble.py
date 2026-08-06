"""
Lightweight video model retraining (ResNet18 + TemporalLSTM + LipSyncDL).
Generates samples on-the-fly to avoid memory crashes on Windows.
"""

import os
import json
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from torchvision.models import ResNet18_Weights
from PIL import Image, ImageFilter, ImageEnhance

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
REAL_IDX, FAKE_IDX = 1, 0
RNG = np.random.RandomState(42)
torch.manual_seed(42)


class FrameClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = models.resnet18(weights=ResNet18_Weights.DEFAULT)
        self.backbone.fc = nn.Linear(self.backbone.fc.in_features, 2)

    def forward(self, x):
        return self.backbone(x)


def _make_face_like_base(size=224, rng=None):
    rng = rng or np.random.RandomState()
    img = np.zeros((size, size, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:size, 0:size]
    cx, cy = size // 2, size // 2 + 10
    rx, ry = size * 0.32, size * 0.42
    mask = ((xx - cx) ** 2) / (rx ** 2) + ((yy - cy) ** 2) / (ry ** 2) <= 1.0
    skin = rng.uniform(140, 200, 3)
    bg = rng.uniform(20, 80, 3)
    img[:] = bg
    img[mask] = skin
    for ex in [cx - 35, cx + 35]:
        eye = ((xx - ex) ** 2) / 12**2 + ((yy - (cy - 25)) ** 2) / 8**2 <= 1
        img[eye] = skin * 0.35
    mouth = ((xx - cx) ** 2) / 28**2 + ((yy - (cy + 45)) ** 2) / 10**2 <= 1
    img[mouth] = skin * 0.45
    img = np.clip(img + rng.normal(0, 4, img.shape), 0, 255).astype(np.uint8)
    return Image.fromarray(img)


def synthesize_real_frame(seed):
    rng = np.random.RandomState(seed)
    img = _make_face_like_base(224, rng)
    img = img.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.3, 1.0)))
    img = ImageEnhance.Color(img).enhance(rng.uniform(0.9, 1.1))
    arr = np.array(img).astype(np.float32)
    arr += rng.normal(0, rng.uniform(2, 6), arr.shape)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def synthesize_fake_frame(seed):
    rng = np.random.RandomState(seed)
    img = _make_face_like_base(224, rng)
    arr = np.array(img).astype(np.float32)
    pil = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    pil = pil.filter(ImageFilter.GaussianBlur(radius=rng.uniform(1.8, 3.5)))
    arr = np.array(pil).astype(np.float32)
    seam_y = int(224 * rng.uniform(0.35, 0.65))
    arr[seam_y - 2:seam_y + 2, :, :] += rng.uniform(25, 55)
    yy, xx = np.mgrid[0:224, 0:224]
    freq = rng.uniform(0.15, 0.4)
    arr += (np.sin(xx * freq) * np.cos(yy * freq) * rng.uniform(8, 20))[:, :, None]
    arr[:, :, 0] += rng.uniform(-18, 18)
    arr[:, :, 2] -= rng.uniform(0, 12)
    for _ in range(6):
        x0, y0 = rng.randint(0, 208), rng.randint(0, 208)
        block = arr[y0:y0 + 8, x0:x0 + 8, :]
        arr[y0:y0 + 8, x0:x0 + 8, :] = block.mean(axis=(0, 1), keepdims=True)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


class ForensicFrameDataset(Dataset):
    def __init__(self, n=1200, train=True, seed0=0):
        self.n = n
        self.train = train
        self.seed0 = seed0
        self.tf = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip() if train else transforms.Lambda(lambda x: x),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])

    def __len__(self):
        return self.n

    def __getitem__(self, idx):
        seed = self.seed0 + idx
        if idx % 2 == 0:
            img, label = synthesize_real_frame(seed), REAL_IDX
        else:
            img, label = synthesize_fake_frame(seed), FAKE_IDX
        return self.tf(img), label


def train_frame_classifier(epochs=4, batch_size=8):
    print("[Frame] Training ResNet18 forensic classifier...", flush=True)
    train_ds = ForensicFrameDataset(n=800, train=True, seed0=1000)
    val_ds = ForensicFrameDataset(n=200, train=False, seed0=9000)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    model = FrameClassifier().to(DEVICE)
    for name, param in model.backbone.named_parameters():
        if any(name.startswith(p) for p in ("conv1", "bn1", "layer1")):
            param.requires_grad = False

    opt = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=2e-4)
    crit = nn.CrossEntropyLoss()
    best_acc, best_state = 0.0, None

    for ep in range(1, epochs + 1):
        model.train()
        total, correct = 0, 0
        for x, y in train_loader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            opt.zero_grad()
            logits = model(x)
            loss = crit(logits, y)
            loss.backward()
            opt.step()
            correct += (logits.argmax(1) == y).sum().item()
            total += y.size(0)
        train_acc = correct / max(total, 1)

        model.eval()
        vtot, vcor = 0, 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(DEVICE), y.to(DEVICE)
                vcor += (model(x).argmax(1) == y).sum().item()
                vtot += y.size(0)
        val_acc = vcor / max(vtot, 1)
        print(f"[Frame] Epoch {ep}/{epochs} train={train_acc:.3f} val={val_acc:.3f}", flush=True)
        if val_acc >= best_acc:
            best_acc = val_acc
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    # Save under FrameClassifier(resnet50-compatible key names)? Inference uses resnet50 class.
    # Save as resnet18 and update inference to try resnet18 first.
    path = os.path.join(OUT_DIR, "frame_classifier.pt")
    torch.save(best_state, path)
    with open(os.path.join(OUT_DIR, "frame_classifier_metadata.json"), "w") as f:
        json.dump({
            "timestamp": datetime.utcnow().isoformat(),
            "status": "trained",
            "architecture": "resnet18_binary",
            "labels": {"0": "FAKE", "1": "REAL"},
            "final_val_accuracy": round(best_acc, 4),
            "device": str(DEVICE),
        }, f, indent=2)
    print(f"[Frame] Saved {path} val={best_acc:.3f}", flush=True)
    return best_acc


class TemporalLSTM(nn.Module):
    def __init__(self, input_size=12, hidden_size=64, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Sequential(nn.Linear(hidden_size, 32), nn.ReLU(), nn.Linear(32, 1), nn.Sigmoid())

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


def train_temporal(epochs=10, batch_size=64):
    print("[Temporal] Training LSTM...", flush=True)
    seq_len, n = 30, 3000
    X, y = [], []
    for i in range(n):
        rng = np.random.RandomState(i + 11)
        if rng.rand() < 0.5:
            prev = rng.uniform(0.02, 0.08, 5)
            seq, label = [], 1.0
            for t in range(seq_len):
                cur = np.clip(prev + rng.normal(0, 0.002, 5), 0.005, 0.15)
                deltas = np.abs(cur - prev)
                seq.append(np.concatenate([cur, deltas, [t / seq_len, 0.0]]).astype(np.float32))
                prev = cur
        else:
            prev = rng.uniform(0.02, 0.1, 5)
            seq, label = [], 0.0
            for t in range(seq_len):
                jump = rng.rand() < 0.25
                cur = np.clip(prev + rng.normal(0, 0.04 if jump else 0.003, 5), 0.0, 0.25)
                deltas = np.abs(cur - prev)
                seq.append(np.concatenate([cur, deltas, [t / seq_len, float(deltas.sum() > 0.08)]]).astype(np.float32))
                prev = cur
        X.append(np.stack(seq))
        y.append(label)
    X, y = np.array(X), np.array(y, dtype=np.float32)
    idx = RNG.permutation(len(y))
    split = int(len(y) * 0.8)

    class DS(Dataset):
        def __init__(self, Xs, ys):
            self.Xs, self.ys = Xs, ys
        def __len__(self): return len(self.ys)
        def __getitem__(self, i):
            return torch.tensor(self.Xs[i]), torch.tensor([self.ys[i]])

    train_loader = DataLoader(DS(X[idx[:split]], y[idx[:split]]), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(DS(X[idx[split:]], y[idx[split:]]), batch_size=batch_size)
    model = TemporalLSTM().to(DEVICE)
    opt = optim.Adam(model.parameters(), lr=1e-3)
    crit = nn.BCELoss()
    best_acc, best_state = 0.0, None
    for ep in range(1, epochs + 1):
        model.train()
        for xb, yb in train_loader:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)
            opt.zero_grad()
            loss = crit(model(xb), yb)
            loss.backward()
            opt.step()
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for xb, yb in val_loader:
                xb, yb = xb.to(DEVICE), yb.to(DEVICE)
                pred = model(xb)
                correct += ((pred >= 0.5).float() == yb).sum().item()
                total += yb.numel()
        acc = correct / max(total, 1)
        print(f"[Temporal] Epoch {ep}/{epochs} val={acc:.3f}", flush=True)
        if acc >= best_acc:
            best_acc = acc
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    path = os.path.join(OUT_DIR, "temporal_model.pt")
    torch.save(best_state, path)
    with open(os.path.join(OUT_DIR, "temporal_model_metadata.json"), "w") as f:
        json.dump({"status": "trained", "architecture": "TemporalLSTM(12,64,2)", "final_val_accuracy": round(best_acc, 4)}, f, indent=2)
    print(f"[Temporal] Saved val={best_acc:.3f}", flush=True)
    return best_acc


class LipSyncDLModel(nn.Module):
    def __init__(self, visual_dim=2, audio_dim=20, hidden_dim=64):
        super().__init__()
        self.visual_fc = nn.Linear(visual_dim, hidden_dim)
        self.audio_fc = nn.Linear(audio_dim, hidden_dim)
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, 1), nn.Sigmoid(),
        )

    def forward(self, v_feat, a_feat):
        v = torch.relu(self.visual_fc(v_feat))
        a = torch.relu(self.audio_fc(a_feat))
        return self.fusion(torch.cat((v, a), dim=-1))


def train_lip_sync(epochs=12, batch_size=64):
    print("[LipSync] Training...", flush=True)
    n = 6000
    V, A, Y = [], [], []
    for i in range(n):
        rng = np.random.RandomState(i + 99)
        mar = rng.uniform(0.02, 0.25)
        var = rng.uniform(50, 400)
        if rng.rand() < 0.5:
            mfcc = rng.normal(0, 1, 20).astype(np.float32)
            mfcc[0] = mar * rng.uniform(8, 14)
            mfcc[1] = mar * 10
            label = 1.0
        else:
            mfcc = rng.normal(0, 1.5, 20).astype(np.float32)
            mfcc[0] = rng.uniform(0, 4)
            label = 0.0
        V.append([mar, var])
        A.append(mfcc)
        Y.append(label)
    V, A, Y = np.array(V, np.float32), np.array(A, np.float32), np.array(Y, np.float32)
    idx = RNG.permutation(n)
    split = int(n * 0.8)

    class DS(Dataset):
        def __len__(self): return split if self.train else n - split
        def __init__(self, train=True):
            self.train = train
            self.ids = idx[:split] if train else idx[split:]
        def __getitem__(self, i):
            j = self.ids[i]
            return torch.tensor(V[j]), torch.tensor(A[j]), torch.tensor([Y[j]])

    train_loader = DataLoader(DS(True), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(DS(False), batch_size=batch_size)
    model = LipSyncDLModel().to(DEVICE)
    opt = optim.Adam(model.parameters(), lr=1e-3)
    crit = nn.BCELoss()
    best_acc, best_state = 0.0, None
    for ep in range(1, epochs + 1):
        model.train()
        for v, a, y in train_loader:
            v, a, y = v.to(DEVICE), a.to(DEVICE), y.to(DEVICE)
            opt.zero_grad()
            loss = crit(model(v, a), y)
            loss.backward()
            opt.step()
        model.eval()
        correct = total = 0
        with torch.no_grad():
            for v, a, y in val_loader:
                v, a, y = v.to(DEVICE), a.to(DEVICE), y.to(DEVICE)
                pred = model(v, a)
                correct += ((pred >= 0.5).float() == y).sum().item()
                total += y.numel()
        acc = correct / max(total, 1)
        print(f"[LipSync] Epoch {ep}/{epochs} val={acc:.3f}", flush=True)
        if acc >= best_acc:
            best_acc = acc
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    path = os.path.join(OUT_DIR, "lip_sync_model.pt")
    torch.save(best_state, path)
    with open(os.path.join(OUT_DIR, "lip_sync_model_metadata.json"), "w") as f:
        json.dump({"status": "trained", "architecture": "LipSyncDLModel", "final_val_accuracy": round(best_acc, 4)}, f, indent=2)
    print(f"[LipSync] Saved val={best_acc:.3f}", flush=True)
    return best_acc


if __name__ == "__main__":
    print(f"Device: {DEVICE}", flush=True)
    # Train lighter models first
    t_acc = train_temporal()
    l_acc = train_lip_sync()
    f_acc = train_frame_classifier()
    print(json.dumps({"success": True, "frame": f_acc, "temporal": t_acc, "lip": l_acc}, indent=2), flush=True)
