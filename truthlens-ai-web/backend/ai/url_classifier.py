import sys
import json
import os
import re
import urllib.parse
import joblib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(SCRIPT_DIR, "..", "ml")
MODEL_PATH = os.path.join(ML_DIR, "url_model.pkl")

PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

url = sys.argv[1] if len(sys.argv) > 1 else ""


def extract_url_features(url):
    features = {}
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.hostname or ""
        path = parsed.path or ""
        query = parsed.query or ""

        features["has_https"] = 1 if url.startswith("https://") else 0
        features["url_length"] = len(url)
        features["domain_length"] = len(domain)
        features["path_length"] = len(path)
        features["query_length"] = len(query)
        features["has_ip"] = 1 if re.match(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", domain) else 0
        features["has_port"] = 1 if ":" in domain else 0
        features["has_at"] = 1 if "@" in url else 0
        features["has_double_slash"] = 1 if "//" in path else 0
        features["hyphen_count"] = domain.count("-")
        features["underscore_count"] = domain.count("_")
        features["digit_count"] = sum(c.isdigit() for c in domain)
        features["tld_suspicious"] = 1 if domain.endswith((
            ".xyz", ".top", ".click", ".loan", ".ru", ".tk", ".ml", ".ga", ".cf", ".gq"
        )) else 0
        features["suspicious_keywords"] = sum(
            1 for kw in [
                "free", "gift", "claim", "bonus", "lottery", "verify",
                "login", "password", "bank", "urgent", "winner", "prize"
            ] if kw in url.lower()
        )
        features["subdomain_count"] = domain.count(".")
        features["has_redirect"] = 1 if "redirect" in url.lower() or "url=" in url.lower() else 0
        features["has_tracking"] = 1 if any(t in url.lower() for t in ["utm_", "fbclid", "gclid", "ref="]) else 0

        domain_parts = domain.split(".")
        features["domain_depth"] = len(domain_parts)
        features["tld_length"] = len(domain_parts[-1]) if domain_parts else 0
        features["is_shortened"] = 1 if any(s in domain for s in [
            "bit.ly", "tinyurl", "goo.gl", "t.co", "ow.ly", "is.gd"
        ]) else 0
        features["url_entropy"] = len(set(url)) / max(len(url), 1)

    except Exception:
        for key in [
            "has_https", "url_length", "domain_length", "path_length", "query_length",
            "has_ip", "has_port", "has_at", "has_double_slash", "hyphen_count",
            "underscore_count", "digit_count", "tld_suspicious", "suspicious_keywords",
            "subdomain_count", "has_redirect", "has_tracking", "domain_depth",
            "tld_length", "is_shortened", "url_entropy",
        ]:
            features[key] = 0

    return features


def main():
    if not os.path.exists(MODEL_PATH):
        print(json.dumps({
            "error": "Model file not found. Train the URL classifier first.",
            "risk_score": 50,
            "prediction": "SUSPICIOUS",
            "confidence": 50,
            "model_type": "unknown",
            "features": {},
            "fake_prob": 50,
            "real_prob": 50,
        }))
        sys.exit(1)

    pipeline = joblib.load(MODEL_PATH)
    features = extract_url_features(url)

    probabilities = pipeline.predict_proba([url])[0]
    prediction_label = pipeline.predict([url])[0]
    confidence = round(float(max(probabilities)) * 100, 2)

    classifier = pipeline.named_steps["classifier"]
    if hasattr(classifier, "classes_"):
        class_labels = [str(c) for c in classifier.classes_]
    else:
        class_labels = ["SAFE", "SUSPICIOUS", "UNSAFE"]

    if isinstance(prediction_label, (int, float)):
        pred_index = int(prediction_label)
        prediction = class_labels[pred_index] if 0 <= pred_index < len(class_labels) else "SUSPICIOUS"
    else:
        prediction = str(prediction_label).upper()

    if prediction not in ("SAFE", "SUSPICIOUS", "UNSAFE"):
        prediction = "SUSPICIOUS"

    safe_idx = None
    unsafe_idx = None
    for i, label in enumerate(class_labels):
        if label == "SAFE" and safe_idx is None:
            safe_idx = i
        if label == "UNSAFE" and unsafe_idx is None:
            unsafe_idx = i

    if safe_idx is not None:
        real_prob = round(float(probabilities[safe_idx]) * 100, 2)
    else:
        real_prob = round(float(probabilities[0]) * 100, 2) if len(probabilities) > 0 else 50.0

    if unsafe_idx is not None:
        fake_prob = round(float(probabilities[unsafe_idx]) * 100, 2)
    else:
        fake_prob = round(float(probabilities[-1]) * 100, 2) if len(probabilities) > 0 else 50.0

    risk_score = round(fake_prob, 2)

    result = {
        "risk_score": risk_score,
        "prediction": prediction,
        "confidence": confidence,
        "model_type": type(classifier).__name__,
        "features": features,
        "fake_prob": fake_prob,
        "real_prob": real_prob,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({
            "risk_score": 50,
            "prediction": "SUSPICIOUS",
            "confidence": 50,
            "model_type": "unknown",
            "features": {},
            "fake_prob": 50,
            "real_prob": 50,
            "error": str(e),
        }))
