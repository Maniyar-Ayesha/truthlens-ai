import os
import sys
import zipfile
import subprocess
from PIL import Image, ImageDraw

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

KAGGLE_DATASET_ID = "xhlulu/140k-real-and-fake-faces"

def ensure_dataset_folders():
    for split in ["train", "validation", "test"]:
        for category in ["real", "fake"]:
            path = os.path.join(DATASET_DIR, split, category)
            os.makedirs(path, exist_ok=True)
    print(f"[DatasetLoader] Ensured directory structure at: {DATASET_DIR}")

def setup_kaggle_credentials():
    kaggle_dir = os.path.expanduser("~/.kaggle")
    kaggle_json = os.path.join(kaggle_dir, "kaggle.json")
    
    if os.path.exists(kaggle_json):
        print(f"[KaggleSetup] Found credentials at: {kaggle_json}")
        return True
    
    if "KAGGLE_USERNAME" in os.environ and "KAGGLE_KEY" in os.environ:
        print("[KaggleSetup] Environment variables KAGGLE_USERNAME & KAGGLE_KEY detected.")
        return True

    print("\n[KaggleSetup WARNING] kaggle.json credential file not found.")
    print("To download the 140K Real and Fake Faces dataset automatically:")
    print("1. Log in to Kaggle.com -> Account Settings -> Create New API Token")
    print("2. Save kaggle.json to: ~/.kaggle/kaggle.json")
    print("3. Execute: kaggle datasets download -d xhlulu/140k-real-and-fake-faces\n")
    return False

def download_and_extract_dataset():
    ensure_dataset_folders()
    if not setup_kaggle_credentials():
        print("[KaggleSetup] Generating benchmark synthetic dataset for immediate training verification...")
        generate_benchmark_samples()
        return

    zip_path = os.path.join(DATASET_DIR, "140k-real-and-fake-faces.zip")
    try:
        print(f"[KaggleSetup] Downloading dataset {KAGGLE_DATASET_ID}...")
        cmd = ["kaggle", "datasets", "download", "-d", KAGGLE_DATASET_ID, "-p", DATASET_DIR]
        subprocess.run(cmd, check=True)
        
        if os.path.exists(zip_path):
            print(f"[KaggleSetup] Extracting {zip_path}...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(DATASET_DIR)
            os.remove(zip_path)
            print("[KaggleSetup] Dataset extracted successfully.")
    except Exception as e:
        print(f"[KaggleSetup ERROR] Failed Kaggle download: {e}")
        print("[KaggleSetup] Falling back to synthetic benchmark sample generation...")
        generate_benchmark_samples()

def generate_benchmark_samples(num_per_class=40):
    ensure_dataset_folders()
    print(f"[BenchmarkGen] Generating {num_per_class} synthetic images per class using Pillow...")
    
    splits = {"train": 0.7, "validation": 0.15, "test": 0.15}
    
    for split, ratio in splits.items():
        count = int(num_per_class * ratio * 2)
        for i in range(count):
            # Real Image: Smooth natural gradient with face geometry
            real_img = Image.new('RGB', (224, 224), color=(240, 210, 180))
            d_real = ImageDraw.Draw(real_img)
            d_real.ellipse([50, 40, 174, 184], fill=(220, 170, 130), outline=(180, 130, 90), width=2)
            d_real.ellipse([80, 80, 100, 100], fill=(50, 50, 50))
            d_real.ellipse([124, 80, 144, 100], fill=(50, 50, 50))
            d_real.arc([80, 130, 144, 160], start=0, end=180, fill=(150, 50, 50), width=3)
            real_img.save(os.path.join(DATASET_DIR, split, "real", f"real_{i:03d}.jpg"))

            # Fake Image: GAN artifact border & noise features
            fake_img = Image.new('RGB', (224, 224), color=(30, 41, 59))
            d_fake = ImageDraw.Draw(fake_img)
            d_fake.rectangle([20, 20, 204, 204], outline=(255, 0, 0), width=4)
            d_fake.ellipse([50, 40, 174, 184], fill=(100, 200, 255), outline=(255, 0, 255), width=3)
            d_fake.line([30, 30, 194, 194], fill=(0, 255, 0), width=2)
            fake_img.save(os.path.join(DATASET_DIR, split, "fake", f"fake_{i:03d}.jpg"))

    print("[BenchmarkGen] Synthetic benchmark samples created cleanly in dataset/ subdirectories.")

if __name__ == "__main__":
    download_and_extract_dataset()
