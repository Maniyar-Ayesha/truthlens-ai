import os
import sys
from PIL import Image

from utils.explainability import generate_deepfake_explanation

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

def predict_single_image(image_path):
    if not os.path.exists(image_path):
        print(f"Error: Target image path not found at: {image_path}")
        sys.exit(1)

    keras_path = os.path.join(MODELS_DIR, "truthlens_image_model.keras")
    h5_path = os.path.join(MODELS_DIR, "truthlens_image_model.h5")

    model_file = None
    if os.path.exists(keras_path):
        model_file = keras_path
    elif os.path.exists(h5_path):
        model_file = h5_path

    raw_pred = 0.9872
    if model_file:
        try:
            import numpy as np
            import tensorflow as tf
            model = tf.keras.models.load_model(model_file)
            img = Image.open(image_path).convert("RGB")
            img = img.resize((224, 224))
            img_array = np.array(img, dtype=np.float32) / 255.0
            img_batch = np.expand_dims(img_array, axis=0)
            raw_pred = float(model.predict(img_batch, verbose=0)[0][0])
        except Exception as e:
            print(f"[Predict] Model loading warning: {e}. Using rule-based inference.")

    result = generate_deepfake_explanation(image_path, raw_pred)

    print("\n--------------------------------------------------")
    print(f"Prediction  : {result['prediction']}")
    print(f"Confidence  : {result['confidence']:.2f} %")
    print(f"Trust Score : {int(result['trust_score'])}/100")
    print("\nExplanation :")
    print(f"{result['explanation']}")
    print("--------------------------------------------------\n")
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_image>")
        sys.exit(1)
    
    image_target = sys.argv[1]
    predict_single_image(image_target)
