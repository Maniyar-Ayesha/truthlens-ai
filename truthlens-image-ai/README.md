# TruthLens AI – Deepfake Image Detection Model Pipeline (`truthlens-image-ai`)

An enterprise, production-ready AI/ML pipeline for **Deepfake Image Detection** built with **TensorFlow 2.x**, **EfficientNetB0**, **FastAPI**, and **OpenCV**.

Designed to train on Kaggle's **140K Real and Fake Faces** dataset, evaluate models with visual performance graphs, run CLI predictions, and serve HTTP inference requests via a FastAPI server for seamless integration with the TruthLens AI Node.js backend.

---

## 🌟 Tech Stack

- **Python**: 3.11+
- **Deep Learning Framework**: TensorFlow 2.x / Keras
- **Computer Vision & Image Processing**: OpenCV, Pillow (PIL), NumPy
- **Architectures**: EfficientNetB0 (Default), EfficientNetV2, ResNet50, Xception
- **Metrics & Graphs**: Scikit-Learn, Matplotlib, Seaborn, Pandas
- **REST API**: FastAPI, Uvicorn, Pydantic
- **DevOps**: Docker, Docker Compose

---

## 📁 Project Structure

```text
truthlens-image-ai/
├── dataset/
│   ├── train/ (real/, fake/)
│   ├── validation/ (real/, fake/)
│   └── test/ (real/, fake/)
├── models/                     # Saved models (truthlens_image_model.keras & .h5)
├── results/                    # Confusion matrix, ROC curve, accuracy & loss graphs
├── utils/
│   ├── download_kaggle.py      # Automated Kaggle API downloader
│   ├── dataset_loader.py       # Augmentation & preprocessing flow
│   ├── model_factory.py        # EfficientNet, ResNet, Xception transfer learning
│   └── explainability.py       # GAN artifact & Trust Score calculation
├── train.py                    # Training pipeline with 5 callbacks
├── evaluate.py                 # Metric evaluation & graph generator
├── predict.py                  # CLI inference script
├── app.py                      # FastAPI REST server (/api/detect-image)
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Container build instructions
├── docker-compose.yml          # Services orchestrator
└── README.md
```

---

## 📥 Kaggle Dataset Setup & Download

### 1. Configure Kaggle Credentials (`kaggle.json`)
1. Log in to [Kaggle.com](https://www.kaggle.com).
2. Go to **Account Settings** -> **API** -> **Create New API Token**.
3. Move `kaggle.json` to:
   - Windows: `C:\Users\<Username>\.kaggle\kaggle.json`
   - Linux/macOS: `~/.kaggle/kaggle.json`

### 2. Download Dataset Automatically
Execute the downloader utility:
```bash
python utils/download_kaggle.py
```

Or run manual Kaggle CLI commands:
```bash
kaggle datasets download -d xhlulu/140k-real-and-fake-faces -p dataset/
unzip dataset/140k-real-and-fake-faces.zip -d dataset/
```

*Note: If no Kaggle token is present, the script automatically generates synthetic benchmark samples for offline pipeline testing.*

---

## 🚀 Installation & Virtual Environment

```bash
# Create Virtual Environment
python -m venv venv

# Activate Virtual Environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
```

---

## 🏋️ Training Pipeline (`train.py`)

Train the transfer learning model with 5 callbacks: `EarlyStopping`, `ReduceLROnPlateau`, `ModelCheckpoint`, `TensorBoard`, and `CSVLogger`.

### Train Default EfficientNetB0 (50 Epochs):
```bash
python train.py --epochs 50 --batch-size 32 --lr 0.0001
```

### Switch Architecture to EfficientNetV2, ResNet50, or Xception:
```bash
# EfficientNetV2
python train.py --model EfficientNetV2 --epochs 50

# ResNet50
python train.py --model ResNet50 --epochs 50

# Xception
python train.py --model Xception --epochs 50
```

The best model checkpoint is automatically saved to:
- `models/truthlens_image_model.keras`
- `models/truthlens_image_model.h5`

---

## 📊 Evaluation & Metric Visualization (`evaluate.py`)

Compute Accuracy, Precision, Recall, F1 Score, ROC AUC, Confusion Matrix, and generate visual performance graphs:

```bash
python evaluate.py
```

Generated Output Files in `results/`:
- `confusion_matrix.png`
- `roc_curve.png`
- `accuracy_graph.png`
- `loss_graph.png`
- `evaluation_metrics.txt`

---

## 🔍 CLI Prediction (`predict.py`)

Run single image inference from the command line:

```bash
python predict.py sample_image.jpg
```

Sample CLI Output:
```text
--------------------------------------------------
Prediction  : Fake
Confidence  : 98.72 %
Trust Score : 96/100

Explanation :
The uploaded image contains GAN artifacts, unnatural facial textures, lighting inconsistencies, and blending artifacts.
--------------------------------------------------
```

---

## 🌐 FastAPI Server (`app.py`)

Launch the production REST API server:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API Documentation:
- **URL**: `http://localhost:8000/docs`

### API Endpoint Specification:
- **Method**: `POST /api/detect-image`
- **Body**: `multipart/form-data` with `file` field containing image

Sample Response Payload:
```json
{
  "prediction": "Fake",
  "confidence": 98.72,
  "trust_score": 96.0,
  "explanation": "The uploaded image contains GAN artifacts, unnatural facial textures, lighting inconsistencies, and blending artifacts."
}
```

---

## 🔗 TruthLens AI Node.js Backend Integration

To call this Python AI inference API from your existing Node.js Express backend (`truthlens-ai-web/backend`):

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function checkImageDeepfake(imageFilePath) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imageFilePath));

    const response = await axios.post('http://localhost:8000/api/detect-image', formData, {
      headers: formData.getHeaders(),
    });

    console.log('AI Verdict:', response.data);
    return response.data;
  } catch (error) {
    console.error('AI Service Error:', error.message);
    throw error;
  }
}
```

---

## 🐳 Docker Deployment

### Build & Run with Docker Compose:
```bash
docker-compose up --build -d
```

### Access API:
- Endpoint: `http://localhost:8000/api/detect-image`
- Swagger Docs: `http://localhost:8000/docs`
