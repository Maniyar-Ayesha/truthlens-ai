"""
TruthLens AI – Dataset Similarity Search
=========================================
Searches Fake.csv and True.csv for the top-N most similar articles
to the input query using TF-IDF cosine similarity.

Usage:
    python dataset_search.py "<news text>" [top_n]

Output: JSON array of top matching articles
"""

import sys
import json
import os
import re
import string
import pickle

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR  = os.path.join(SCRIPT_DIR, "..", "Dataset")
FAKE_CSV     = os.path.join(DATASET_DIR, "Fake.csv")
TRUE_CSV     = os.path.join(DATASET_DIR, "True.csv")
CACHE_FILE   = os.path.join(SCRIPT_DIR, "dataset_cache.pkl")

MAX_ROWS     = 5000   # Sample size to keep memory & speed manageable
TOP_N_DEFAULT = 5


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"www\S+",  "", text)
    text = re.sub(r"<.*?>",   "", text)
    text = re.sub(r"[0-9]",   "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_and_cache_dataset():
    """Load dataset from CSVs, vectorize, and cache to disk."""
    rows_per_file = MAX_ROWS // 2

    fake_df = pd.read_csv(FAKE_CSV, usecols=["title", "text"], nrows=rows_per_file)
    true_df = pd.read_csv(TRUE_CSV, usecols=["title", "text"], nrows=rows_per_file)

    fake_df["label"] = "FAKE"
    true_df["label"] = "REAL"

    df = pd.concat([fake_df, true_df], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Build combined text column
    df["combined"] = (df["title"].fillna("") + " " + df["text"].fillna("")).apply(clean_text)

    # Remove empty rows
    df = df[df["combined"].str.len() > 10].reset_index(drop=True)

    # Vectorize
    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=8000,
        ngram_range=(1, 2),
        min_df=2,
    )
    matrix = vectorizer.fit_transform(df["combined"])

    cache = {
        "vectorizer": vectorizer,
        "matrix":     matrix,
        "titles":     df["title"].fillna("Unknown").tolist(),
        "labels":     df["label"].tolist(),
        "texts":      df["text"].fillna("").str[:200].tolist(),
    }

    with open(CACHE_FILE, "wb") as f:
        pickle.dump(cache, f)

    return cache


def load_cache():
    """Load cached vectorizer + matrix, or build from scratch."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "rb") as f:
                cache = pickle.load(f)
            # Basic validation
            if "vectorizer" in cache and "matrix" in cache:
                return cache
        except Exception:
            pass
    return load_and_cache_dataset()


def search(query_text, top_n=TOP_N_DEFAULT):
    cache      = load_cache()
    vectorizer = cache["vectorizer"]
    matrix     = cache["matrix"]
    titles     = cache["titles"]
    labels     = cache["labels"]
    texts      = cache["texts"]

    cleaned_query = clean_text(query_text)
    query_vec     = vectorizer.transform([cleaned_query])
    scores        = cosine_similarity(query_vec, matrix).flatten()

    top_indices = scores.argsort()[::-1][:top_n]

    results = []
    for idx in top_indices:
        sim_score = float(scores[idx])
        if sim_score < 0.01:
            continue
        results.append({
            "title":       titles[idx],
            "label":       labels[idx],
            "similarity":  round(sim_score * 100, 2),
            "snippet":     texts[idx][:150],
        })

    return results


# ─── Main ───────────────────────────────────────────────────────────────────────
if len(sys.argv) < 2:
    print(json.dumps([]))
    sys.exit(0)

query = sys.argv[1]
top_n = int(sys.argv[2]) if len(sys.argv) > 2 else TOP_N_DEFAULT

try:
    matches = search(query, top_n)
    print(json.dumps(matches))
except Exception as e:
    # Never crash – return empty list with error flag
    print(json.dumps({"error": str(e), "matches": []}))
