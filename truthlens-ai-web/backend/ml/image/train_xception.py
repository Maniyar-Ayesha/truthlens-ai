import os
import sys
import json
import datetime
import random
import numpy as np
import warnings

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, transforms
from PIL import Image


def get_xception_model(num_classes=2, device=None):
    try:
        from torchvision.models import xception
        from torchvision.models import Xception_Weights
        model = xception(weights=Xception_Weights.DEFAULT)
        model.fc = nn.Linear(model.fc.in_features, num_classes)
        return model
    except Exception as e:
        warnings.warn(f"Xception not available in torchvision, falling back: {e}")
        raise


def get_transforms(input_size=299):
    train_transform = transforms.Compose([
        transforms.Resize((input_size + 32, input_size + 32)),
        transforms.RandomResizedCrop(input_size),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((input_size + 32, input_size + 32)),
        transforms.CenterCrop(input_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def train_epoch(model, dataloader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for batch_idx, (inputs, targets) in enumerate(dataloader):
        inputs, targets = inputs.to(device), targets.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += targets.size(0)
        correct += predicted.eq(targets).sum().item()

        if (batch_idx + 1) % 10 == 0 or (batch_idx + 1) == len(dataloader):
            print(f"  Batch {batch_idx + 1}/{len(dataloader)} | Loss: {loss.item():.4f}")

    epoch_loss = running_loss / total if total > 0 else 0.0
    epoch_acc = 100.0 * correct / total if total > 0 else 0.0
    return epoch_loss, epoch_acc


def validate(model, dataloader, criterion, device):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for inputs, targets in dataloader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()

    epoch_loss = running_loss / total if total > 0 else 0.0
    epoch_acc = 100.0 * correct / total if total > 0 else 0.0
    return epoch_loss, epoch_acc


class SyntheticImageDataset(Dataset):
    def __init__(self, n_samples=2000, image_size=299, num_classes=2):
        self.samples = []
        random.seed(42)
        np.random.seed(42)

        for i in range(n_samples):
            label = i % num_classes
            if label == 0:
                arr = np.random.randint(100, 200, (image_size, image_size, 3), dtype=np.uint8)
            else:
                arr = np.random.randint(0, 255, (image_size, image_size, 3), dtype=np.uint8)
            img = Image.fromarray(arr)
            self.samples.append((img, label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        return self.samples[idx]


def train_model(model, train_dataset, val_dataset, device, epochs=10, batch_size=16):
    train_transform, val_transform = get_transforms()

    class TransformWrapper(Dataset):
        def __init__(self, dataset, transform):
            self.dataset = dataset
            self.transform = transform

        def __len__(self):
            return len(self.dataset)

        def __getitem__(self, idx):
            img, label = self.dataset[idx]
            if self.transform:
                img = self.transform(img)
            return img, label

    train_dataset = TransformWrapper(train_dataset, train_transform)
    val_dataset = TransformWrapper(val_dataset, val_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4, pin_memory=True)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-5)

    best_acc = 0.0

    for epoch in range(epochs):
        print(f"\nEpoch {epoch + 1}/{epochs}")
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")

        val_loss, val_acc = validate(model, val_loader, criterion, device)
        print(f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}%")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), save_path)
            print(f"  Best model saved with accuracy: {best_acc:.2f}%")

    return best_acc, len(train_dataset), len(val_dataset)


def main():
    if len(sys.argv) > 1:
        dataset_path = sys.argv[1]
    else:
        dataset_path = "Dataset/"

    script_dir = os.path.dirname(os.path.abspath(__file__))
    save_path = os.path.join(script_dir, "xception_model.pt")
    metadata_path = os.path.join(script_dir, "xception_metadata.json")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    input_size = 299
    train_transform, val_transform = get_transforms(input_size=input_size)

    dataset_exists = False
    train_size = 0
    val_size = 0
    classes = []

    if os.path.isdir(dataset_path):
        train_dir = os.path.join(dataset_path, "train")
        val_dir = os.path.join(dataset_path, "val")

        if os.path.isdir(train_dir) and os.path.isdir(val_dir):
            try:
                train_dataset = datasets.ImageFolder(root=train_dir, transform=train_transform)
                val_dataset = datasets.ImageFolder(root=val_dir, transform=val_transform)
                train_size = len(train_dataset)
                val_size = len(val_dataset)
                classes = train_dataset.classes
                dataset_exists = True
                print(f"Dataset found: {train_size} train samples, {val_size} val samples")
                print(f"Classes: {classes}")
            except Exception as e:
                warnings.warn(f"Failed to load dataset: {e}")
        else:
            warnings.warn(f"Dataset directory '{dataset_path}' does not contain 'train' and 'val' folders.")
    else:
        warnings.warn(f"Dataset directory '{dataset_path}' does not exist.")

    if dataset_exists and train_size > 0 and val_size > 0:
        model = get_xception_model(num_classes=2, device=device)
        model = model.to(device)

        best_acc, train_size, val_size = train_model(model, train_dataset, val_dataset, device)

        print(f"\nTraining complete. Best validation accuracy: {best_acc:.2f}%")

        metadata = {
            "model_type": "xception",
            "num_classes": 2,
            "classes": classes,
            "input_size": input_size,
            "accuracy": round(best_acc, 2),
            "dataset_path": os.path.abspath(dataset_path),
            "trained_at": datetime.datetime.now().isoformat(),
        }
    else:
        print(f"\nWarning: Dataset not found or empty. Generating synthetic training data.")
        synthetic_train = SyntheticImageDataset(n_samples=2000)
        synthetic_val = SyntheticImageDataset(n_samples=500)

        model = get_xception_model(num_classes=2, device=device)
        model = model.to(device)

        best_acc, train_size, val_size = train_model(model, synthetic_train, synthetic_val, device)

        classes = ["real", "fake"]

        print(f"\nTraining complete on synthetic data. Best validation accuracy: {best_acc:.2f}%")

        metadata = {
            "model_type": "xception",
            "num_classes": 2,
            "classes": classes,
            "input_size": input_size,
            "accuracy": round(best_acc, 2),
            "dataset_path": "synthetic_generated",
            "trained_at": datetime.datetime.now().isoformat(),
        }

    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path}")


if __name__ == "__main__":
    main()
