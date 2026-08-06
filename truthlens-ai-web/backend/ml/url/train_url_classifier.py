#!/usr/bin/env python3
"""Training script for the URL phishing classifier.

Usage:
    python train_url_classifier.py [path/to/dataset.csv]

If no dataset is provided or the file does not exist, a synthetic
dataset is generated automatically for demonstration purposes.

Outputs:
    url_model.pkl        - sklearn Pipeline (preprocessor + classifier)
    url_vectorizer.pkl   - feature extraction preprocessor
    url_metadata.json    - training metadata
"""

import sys
import os
import json
import math
import random
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix

from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from backend.ml.url.features import (
    URLTextExtractor,
    URLNumericExtractor,
    generate_synthetic_dataset,
)


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(SCRIPT_DIR, "..")
MODEL_PATH = os.path.join(ML_DIR, "url_model.pkl")
VECTORIZER_PATH = os.path.join(ML_DIR, "url_vectorizer.pkl")
METADATA_PATH = os.path.join(ML_DIR, "url_metadata.json")

DEFAULT_DATASET = os.path.join(SCRIPT_DIR, "dataset", "phishing_urls.csv")


def load_dataset(dataset_path):
    """Load a CSV dataset or fall back to synthetic data."""
    if dataset_path and os.path.exists(dataset_path):
        df = pd.read_csv(dataset_path)
        if "url" not in df.columns or "label" not in df.columns:
            raise ValueError("CSV must contain 'url' and 'label' columns")
        return df
    print(f"Dataset not found at {dataset_path}. Generating synthetic dataset...")
    data = generate_synthetic_dataset(n_samples=1200)
    return pd.DataFrame(data)


def main():
    dataset_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATASET

    df = load_dataset(dataset_path)

    if df["label"].dtype in [np.int64, np.float64, int, float]:
        df["label"] = df["label"].map({0: "SAFE", 1: "UNSAFE"})

    print(f"Loaded {len(df)} samples.")
    print(f"  Positive (phishing): {(df['label'] == 'UNSAFE').sum()}")
    print(f"  Negative (legitimate): {(df['label'] == 'SAFE').sum()}")

    X = df["url"].astype(str).values
    y = df["label"].values

    text_branch = Pipeline([
        ("domain", URLTextExtractor()),
        ("tfidf", TfidfVectorizer(
            analyzer="char",
            ngram_range=(3, 5),
            max_features=5000,
            sublinear_tf=True,
        )),
    ])

    numeric_branch = Pipeline([
        ("features", URLNumericExtractor()),
    ])

    preprocessor = FeatureUnion([
        ("text", text_branch),
        ("numeric", numeric_branch),
    ])

    pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=4,
            random_state=42,
        )),
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Training model...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Training accuracy: {accuracy:.4f}")
    print(classification_report(y_test, y_pred, target_names=["SAFE", "UNSAFE"]))

    os.makedirs(ML_DIR, exist_ok=True)

    print(f"Saving model to {MODEL_PATH}")
    joblib.dump(pipeline, MODEL_PATH, compress=3)

    print(f"Saving vectorizer to {VECTORIZER_PATH}")
    joblib.dump(pipeline.named_steps["preprocessor"], VECTORIZER_PATH, compress=3)

    feature_names = (
        pipeline.named_steps["preprocessor"]
        .transformer_list[1][1]
        .named_steps["features"]
        .feature_names_
    )

    metadata = {
        "model_type": type(pipeline.named_steps["classifier"]).__name__,
        "accuracy": round(accuracy, 4),
        "dataset_path": os.path.abspath(dataset_path),
        "n_samples": int(len(df)),
        "n_features": "TfidfVectorizer(char 3-5, max 5000) + 17 numeric features",
        "numeric_feature_names": feature_names,
        "parameters": pipeline.named_steps["classifier"].get_params(),
    }

    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Metadata saved to {METADATA_PATH}")
    print("Done!")


if __name__ == "__main__":
    main()
