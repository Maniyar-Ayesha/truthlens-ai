import sys
import os
import json
import math
import random
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

REAL_LABEL_IDX = 1
FAKE_LABEL_IDX = 0


class LipSyncDataset(Dataset):
    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        features, label = self.samples[idx]
        return torch.tensor(features, dtype=torch.float32), torch.tensor(label, dtype=torch.long)


class LipSyncModel(nn.Module):
    def __init__(self, seq_len=12):
        super().__init__()
        self.seq_len = seq_len
        self.net = nn.Sequential(
            nn.Linear(seq_len * 2, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)


def generate_synthetic_lip_sync_data(n_samples=3000, seq_len=12):
    samples = []
    random.seed(42)

    for _ in range(n_samples):
        mouth_ratios = []
        face_variances = []

        if random.random() < 0.5:
            for _ in range(seq_len):
                mv = random.uniform(0.05, 0.5)
                fv = mv / random.uniform(0.01, 0.05)
                mouth_ratios.append(mv / fv if fv > 0 else 0.0)
                face_variances.append(fv)
            label = 1
        else:
            for _ in range(seq_len):
                mv = random.uniform(0.001, 0.01)
                fv = random.uniform(0.1, 0.5)
                mouth_ratios.append(mv / fv if fv > 0 else 0.0)
                face_variances.append(fv)
            label = 0

        features = []
        for m, f in zip(mouth_ratios, face_variances):
            features.extend([m, f])

        samples.append((features, label))

    return samples


def train_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for features, labels in dataloader:
        features = features.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(features)
        loss = criterion(outputs, labels.unsqueeze(1).float())
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * features.size(0)
        predicted = (outputs >= 0.5).float().squeeze()
        total += labels.size(0)
        correct += (predicted == labels.float()).sum().item()

    if total == 0:
        return 0.0, 0.0
    return running_loss / total, correct / total


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, "lip_sync_model.pt")
    metadata_path = os.path.join(script_dir, "lip_sync_model_metadata.json")
    seq_len = 12

    random.seed(42)
    torch.manual_seed(42)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    samples = generate_synthetic_lip_sync_data(n_samples=3000, seq_len=seq_len)
    random.shuffle(samples)

    n_total = len(samples)
    n_train = int(n_total * 0.8)
    train_samples = samples[:n_train]
    val_samples = samples[n_train:]

    train_dataset = LipSyncDataset(train_samples)
    val_dataset = LipSyncDataset(val_samples)

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=0)

    model = LipSyncModel(seq_len=seq_len)
    model = model.to(device)

    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=1e-3)

    best_val_acc = 0.0
    epochs = 15

    for epoch in range(epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)

        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for features, labels in val_loader:
                features = features.to(device)
                labels = labels.to(device)
                outputs = model(features)
                predicted = (outputs >= 0.5).float().squeeze()
                total += labels.size(0)
                correct += (predicted == labels.float()).sum().item()
        val_acc = correct / total if total > 0 else 0.0

        print(f"Epoch {epoch+1}/{epochs} - Loss: {train_loss:.4f} - Train Acc: {train_acc:.4f} - Val Acc: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_path)

    metadata = {
        "timestamp": datetime.now().isoformat(),
        "status": "trained",
        "architecture": "mlp(seq_len*2,64,32,1)",
        "seq_len": seq_len,
        "input_features": seq_len * 2,
        "output_type": "sigmoid_in_sync_score",
        "epochs": epochs,
        "batch_size": 64,
        "learning_rate": 1e-3,
        "optimizer": "Adam",
        "loss": "BCELoss",
        "train_size": n_train,
        "val_size": n_total - n_train,
        "final_train_accuracy": round(train_acc, 4),
        "final_val_accuracy": round(best_val_acc, 4),
        "device": str(device),
        "note": "Trained on synthetic lip-sync pattern data derived from mouth-variance-to-face-variance ratios.",
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Final Best Validation Accuracy: {best_val_acc:.4f}")
    print(f"Model saved to: {output_path}")
    print(f"Metadata saved to: {metadata_path}")


if __name__ == "__main__":
    main()
