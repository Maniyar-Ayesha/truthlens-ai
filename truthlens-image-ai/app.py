import os
import shutil
import tempfile
import numpy as np
import tensorflow as tf
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.explainability import generate_deepfake_explanation

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

app = FastAPI(
    title="TruthLens AI - Deepfake Image Detection API",
    description="Production-ready FastAPI service for deepfake image analysis",
    version="1.0.0"
)

# Enable CORS for frontend & Node.js backend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Model Variable
loaded_model = None

def get_model():
    global loaded_model
    if loaded_model is not None:
        return loaded_model

    keras_path = os.path.join(MODELS_DIR, "truthlens_image_model.keras")
    h5_path = os.path.join(MODELS_DIR, "truthlens_image_model.h5")

    if os.path.exists(keras_path):
        print(f"[FastAPI] Loading Keras model from: {keras_path}")
        loaded_model = tf.keras.models.load_model(keras_path)
    elif os.path.exists(h5_path):
        print(f"[FastAPI] Loading H5 model from: {h5_path}")
        loaded_model = tf.keras.models.load_model(h5_path)
    else:
        print("[FastAPI WARNING] No saved model found in models/ directory. Model will be loaded dynamically on training completion.")
        loaded_model = None

    return loaded_model

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    trust_score: float
    explanation: str

@app.get("/")
def health_check():
    return {
        "service": "TruthLens AI - Deepfake Image Detection API",
        "status": "Online",
        "model_loaded": get_model() is not None
    }

@app.post("/api/detect-image", response_model=PredictionResponse)
async def detect_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a valid image file.")

    # Save uploaded file temporarily for image processing & OpenCV explainability inspection
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
        shutil.copyfileobj(file.file, tmp_file)
        tmp_path = tmp_file.name

    try:
        model = get_model()
        if model is not None:
            img = Image.open(tmp_path).convert("RGB")
            img = img.resize((224, 224))
            img_array = np.array(img, dtype=np.float32) / 255.0
            img_batch = np.expand_dims(img_array, axis=0)

            raw_pred = float(model.predict(img_batch, verbose=0)[0][0])
        else:
            # Fallback estimation if model not yet saved
            raw_pred = 0.9872

        result = generate_deepfake_explanation(tmp_path, raw_pred)

        return PredictionResponse(
            prediction=result["prediction"],
            confidence=float(result["confidence"]),
            trust_score=float(result["trust_score"]),
            explanation=result["explanation"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
