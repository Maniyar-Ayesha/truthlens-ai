"""Predict REAL/FAKE from forensic feature vector using trained joblib model."""
import sys
import json
import os
import joblib
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(SCRIPT_DIR, "..", "ml", "image")
MODEL_PATH = os.path.join(ML_DIR, "forensic_model.pkl")
SCALER_PATH = os.path.join(ML_DIR, "forensic_scaler.pkl")


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "features required"}))
        sys.exit(1)

    if not os.path.isfile(MODEL_PATH) or not os.path.isfile(SCALER_PATH):
        print(json.dumps({"error": "forensic model missing"}))
        sys.exit(1)

    features = json.loads(sys.argv[1])
    vec = np.array([
        float(features.get("ela_score", 0)),
        float(features.get("noise_level", 0)),
        float(features.get("noise_uniformity", 0.5)),
        float(features.get("has_exif", 0)),
        float(features.get("width_norm", 0.5)),
        float(features.get("height_norm", 0.5)),
        float(features.get("compression_artifact", 0)),
        float(features.get("edge_inconsistency", 0)),
    ], dtype=float).reshape(1, -1)

    scaler = joblib.load(SCALER_PATH)
    model = joblib.load(MODEL_PATH)
    Xs = scaler.transform(vec)
    probs = model.predict_proba(Xs)[0]
    # classes: 0=FAKE, 1=REAL
    classes = list(getattr(model, "classes_", [0, 1]))
    fake_idx = classes.index(0) if 0 in classes else 0
    real_idx = classes.index(1) if 1 in classes else 1
    fake_prob = float(probs[fake_idx]) * 100
    real_prob = float(probs[real_idx]) * 100

    if real_prob >= 70:
        status = "REAL"
    elif fake_prob >= 70:
        status = "FAKE"
    else:
        status = "UNCERTAIN"

    print(json.dumps({
        "status": status,
        "confidence": round(max(fake_prob, real_prob), 2),
        "fake_prob": round(fake_prob, 2),
        "real_prob": round(real_prob, 2),
        "model_type": "ForensicEnsemble(LR+RF+GB)",
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
