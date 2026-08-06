import sys
import json
import re
import string
import os
import joblib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NEWS_DIR = os.path.join(SCRIPT_DIR, "news")

MODEL_FILES = {
    "lr": os.path.join(NEWS_DIR, "news_model.pkl"),
    "rf": os.path.join(NEWS_DIR, "news_model_rf.pkl"),
    "nb": os.path.join(NEWS_DIR, "news_model_nb.pkl"),
    "vec": os.path.join(NEWS_DIR, "vectorizer.pkl"),
}

WEIGHTS = {"lr": 0.40, "rf": 0.35, "nb": 0.25}


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"www\S+", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"[0-9]", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_top_features(vectorizer, vector, n=5):
    try:
        feature_names = vectorizer.get_feature_names_out()
        arr = vector.toarray()[0]
        top_indices = arr.argsort()[::-1][:n]
        return [feature_names[i] for i in top_indices if arr[i] > 0]
    except Exception:
        return []


def load_models():
    vectorizer = joblib.load(MODEL_FILES["vec"])
    model_lr = joblib.load(MODEL_FILES["lr"])
    model_rf = joblib.load(MODEL_FILES["rf"])
    model_nb = joblib.load(MODEL_FILES["nb"])
    return vectorizer, model_lr, model_rf, model_nb


vectorizer, model_lr, model_rf, model_nb = load_models()


def predict(text):
    cleaned = clean_text(text)
    news_vector = vectorizer.transform([cleaned])

    weighted_real_prob = 0.0
    total_weight = 0.0

    predictions = []
    confidences = []
    model_names = []

    probs_lr = model_lr.predict_proba(news_vector)[0]
    fake_lr, real_lr = probs_lr[0], probs_lr[1]
    weighted_real_prob += real_lr * WEIGHTS["lr"]
    total_weight += WEIGHTS["lr"]
    predictions.append("REAL" if real_lr >= 0.5 else "FAKE")
    confidences.append(round(max(fake_lr, real_lr) * 100, 2))
    model_names.append("LogisticRegression")

    probs_rf = model_rf.predict_proba(news_vector)[0]
    fake_rf, real_rf = probs_rf[0], probs_rf[1]
    weighted_real_prob += real_rf * WEIGHTS["rf"]
    total_weight += WEIGHTS["rf"]
    predictions.append("REAL" if real_rf >= 0.5 else "FAKE")
    confidences.append(round(max(fake_rf, real_rf) * 100, 2))
    model_names.append("RandomForest")

    probs_nb = model_nb.predict_proba(news_vector)[0]
    fake_nb, real_nb = probs_nb[0], probs_nb[1]
    weighted_real_prob += real_nb * WEIGHTS["nb"]
    total_weight += WEIGHTS["nb"]
    predictions.append("REAL" if real_nb >= 0.5 else "FAKE")
    confidences.append(round(max(fake_nb, real_nb) * 100, 2))
    model_names.append("NaiveBayes")

    final_real_prob = weighted_real_prob / total_weight
    final_fake_prob = 1.0 - final_real_prob

    if final_real_prob >= 0.55:
        prediction_str = "REAL"
    elif final_fake_prob >= 0.55:
        prediction_str = "FAKE"
    else:
        prediction_str = "UNCERTAIN"

    if prediction_str == "REAL":
        # Map real probability into 85–99 display range
        mapped_conf = 85.0 + ((final_real_prob - 0.55) / 0.45) * 14.0
        mapped_conf = min(99.0, max(85.0, mapped_conf))
    elif prediction_str == "FAKE":
        # Map fake intensity into 10–35 display range
        mapped_conf = 10.0 + ((final_fake_prob - 0.55) / 0.45) * 25.0
        mapped_conf = min(35.0, max(10.0, mapped_conf))
    else:
        diff = abs(final_real_prob - 0.50)
        mapped_conf = 50.0 + diff * 190.0
        mapped_conf = min(69.0, max(50.0, mapped_conf))

    top_features = get_top_features(vectorizer, news_vector, n=5)

    return {
        "prediction": prediction_str,
        "confidence": round(mapped_conf, 2),
        "raw_model_confidence": round(max(final_real_prob, final_fake_prob) * 100, 2),
        "model_type": f"Ensemble({' + '.join(model_names)})",
        "low_confidence": prediction_str == "UNCERTAIN",
        "top_features": top_features,
        "fake_prob": round(final_fake_prob * 100, 2),
        "real_prob": round(final_real_prob * 100, 2),
        "individual_predictions": predictions,
        "individual_confidences": confidences,
        "model_types": model_names,
    }


def run_server():
    sys.stdout.write(json.dumps({"status": "ready"}) + "\n")
    sys.stdout.flush()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            text = request.get("text", "")
            result = predict(text)
            sys.stdout.write(json.dumps(result) + "\n")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({"error": str(e)}) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    if "--server" in sys.argv:
        run_server()
    elif len(sys.argv) >= 2:
        news_text = sys.argv[1]
        result = predict(news_text)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)