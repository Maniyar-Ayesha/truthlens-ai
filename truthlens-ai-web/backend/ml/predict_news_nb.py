import sys
import json
import re
import string
import os
import joblib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NEWS_DIR = os.path.join(SCRIPT_DIR, "news")

def find_file(filename):
    p1 = os.path.join(NEWS_DIR, filename)
    if os.path.exists(p1):
        return p1
    p2 = os.path.join(SCRIPT_DIR, filename)
    if os.path.exists(p2):
        return p2
    return None

NB_PATH = find_file("news_model_nb.pkl")
VEC_PATH = find_file("vectorizer.pkl")

model = joblib.load(NB_PATH) if NB_PATH else None
vectorizer = joblib.load(VEC_PATH) if VEC_PATH else None

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

if len(sys.argv) < 2:
    print(json.dumps({"error": "No text provided"}))
    sys.exit(1)

news_text = sys.argv[1]
cleaned = clean_text(news_text)

if not model or not vectorizer:
    print(json.dumps({
        "prediction": "UNCERTAIN",
        "confidence": 55.0,
        "model_type": "NaiveBayes",
        "low_confidence": True,
        "top_features": [],
        "fake_prob": 50.0,
        "real_prob": 50.0,
    }))
    sys.exit(0)

news_vector = vectorizer.transform([cleaned])
probs = model.predict_proba(news_vector)[0]
fake_prob, real_prob = probs[0], probs[1]

if real_prob >= 0.55:
    prediction_str = "REAL"
    conf = 70.0 + (real_prob - 0.50) * 60.0
    conf = min(100.0, max(70.0, conf))
elif fake_prob >= 0.55:
    prediction_str = "FAKE"
    conf = 10.0 + (fake_prob - 0.50) * 80.0
    conf = min(50.0, max(10.0, conf))
else:
    prediction_str = "UNCERTAIN"
    conf = 50.0 + abs(real_prob - 0.50) * 190.0
    conf = min(69.0, max(50.0, conf))

top_features = get_top_features(vectorizer, news_vector, n=5)

result = {
    "prediction": prediction_str,
    "confidence": round(conf, 2),
    "model_type": "NaiveBayes",
    "low_confidence": prediction_str == "UNCERTAIN",
    "top_features": top_features,
    "fake_prob": round(fake_prob * 100, 2),
    "real_prob": round(real_prob * 100, 2),
}

print(json.dumps(result))