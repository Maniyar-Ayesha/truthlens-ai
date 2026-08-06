import sys
import os
import json
import math
import random
from datetime import datetime

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

REAL_LABEL_IDX = 1
FAKE_LABEL_IDX = 0


class TemporalDataset(Dataset):
    def __init__(self, samples):
        self.samples = samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        features, label = self.samples[idx]
        return torch.tensor(features, dtype=torch.float32), torch.tensor(label, dtype=torch.long)


class TemporalModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(2, 32),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(16, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)


def generate_synthetic_temporal_data(n_samples=3000):
    samples = []
    random.seed(42)
    np.random.seed(42)

    for _ in range(n_samples):
        seq_len = random.randint(8, 24)
        index = 0

        if random.random() < 0.5:
            # consistent: similar mean brightness values
            base_mean = random.uniform(30, 200)
            brightness_vals = [base_mean + random.uniform(-5, 5) for _ in range(seq_len)]
            label = 1
        else:
            # inconsistent: wildly varying mean brightness
            brightness_vals = [random.uniform(10, 245) for _ in range(seq_len)]
            label = 0

        frame_indices = list(range(seq_len))
        index_ratios = [i / max(seq_len - 1, 1) for i in frame_indices]

        for i in range(1, len(brightness_vals)):
            a = brightness_vals[i - 1]
            b = brightness_vals[i]
            dist = abs(a - b) / (abs(a) + abs(b) + 1e-6)
            features = [index_ratios[i], 1.0 - min(dist, 1.0)]
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
    output_path = os.path.join(script_dir, "temporal_model.pt")
    metadata_path = os.path.join(script_dir, "temporal_model_metadata.json")

    random.seed(42)
    torch.manual_seed(42)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    samples = generate_synthetic_temporal_data(n_samples=3000)
    random.shuffle(samples)

    n_total = len(samples)
    n_train = int(n_total * 0.8)
    train_samples = samples[:n_train]
    val_samples = samples[n_train:]

    train_dataset = TemporalDataset(train_samples)
    val_dataset = TemporalDataset(val_samples)

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=0)

    model = TemporalModel()
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
        "architecture": "mlp(2,32,16,1)",
        "input_features": 2,
        "output_type": "sigmoid_consistency_score",
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
        "note": "Trained on synthetic temporal consistency data using per-frame mean brightness differences.",
    }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Final Best Validation Accuracy: {best_val_acc:.4f}")
    print(f"Model saved to: {output_path}")
    print(f"Metadata saved to: {metadata_path}")


if __name__ == "__main__":
    main()
