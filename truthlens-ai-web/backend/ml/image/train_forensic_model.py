"""
Train a lightweight image forensic ensemble model (joblib).
Uses synthetic forensic feature vectors derived from ELA/noise/metadata heuristics
so predictions are model-based (never random at inference time).

Output:
  backend/ml/image/forensic_model.pkl
  backend/ml/image/forensic_scaler.pkl
  backend/ml/image/forensic_metadata.json
"""

import os
import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import joblib

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
RNG = np.random.RandomState(42)


def synthesize_features(n_real=800, n_fake=800):
    """
    Feature vector (8 dims):
      0 ela_score
      1 noise_level
      2 noise_uniformity
      3 has_exif (0/1)
      4 width_norm
      5 height_norm
      6 compression_artifact
      7 edge_inconsistency
    """
    real = np.column_stack([
        RNG.beta(2, 8, n_real) * 0.45,
        RNG.uniform(0.05, 0.35, n_real),
        RNG.uniform(0.35, 0.75, n_real),
        RNG.binomial(1, 0.75, n_real),
        RNG.uniform(0.3, 1.0, n_real),
        RNG.uniform(0.3, 1.0, n_real),
        RNG.beta(2, 6, n_real) * 0.4,
        RNG.beta(2, 7, n_real) * 0.35,
    ])

    fake = np.column_stack([
        0.35 + RNG.beta(5, 2, n_fake) * 0.65,
        RNG.uniform(0.2, 0.9, n_fake),
        RNG.uniform(0.7, 0.98, n_fake),
        RNG.binomial(1, 0.25, n_fake),
        RNG.uniform(0.2, 1.0, n_fake),
        RNG.uniform(0.2, 1.0, n_fake),
        0.3 + RNG.beta(5, 2, n_fake) * 0.7,
        0.25 + RNG.beta(4, 2, n_fake) * 0.75,
    ])

    X = np.vstack([real, fake])
    y = np.array([1] * n_real + [0] * n_fake)
    idx = RNG.permutation(len(y))
    return X[idx], y[idx]


def main():
    X, y = synthesize_features()
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    clf = VotingClassifier(
        estimators=[
            ("lr", LogisticRegression(max_iter=1000, random_state=42)),
            ("rf", RandomForestClassifier(n_estimators=120, max_depth=8, random_state=42)),
            ("gb", GradientBoostingClassifier(random_state=42)),
        ],
        voting="soft",
    )
    scores = cross_val_score(clf, Xs, y, cv=5, scoring="accuracy")
    clf.fit(Xs, y)

    model_path = os.path.join(OUT_DIR, "forensic_model.pkl")
    scaler_path = os.path.join(OUT_DIR, "forensic_scaler.pkl")
    meta_path = os.path.join(OUT_DIR, "forensic_metadata.json")

    joblib.dump(clf, model_path)
    joblib.dump(scaler, scaler_path)

    meta = {
        "model_type": "Voting(LR+RF+GB)",
        "features": [
            "ela_score",
            "noise_level",
            "noise_uniformity",
            "has_exif",
            "width_norm",
            "height_norm",
            "compression_artifact",
            "edge_inconsistency",
        ],
        "classes": {"0": "FAKE", "1": "REAL"},
        "cv_accuracy_mean": float(np.mean(scores)),
        "cv_accuracy_std": float(np.std(scores)),
        "samples": int(len(y)),
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(json.dumps({"success": True, "cv_accuracy": meta["cv_accuracy_mean"], "paths": [model_path, scaler_path]}))


if __name__ == "__main__":
    main()
