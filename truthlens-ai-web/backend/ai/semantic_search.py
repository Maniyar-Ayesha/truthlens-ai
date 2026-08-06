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

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(SCRIPT_DIR, "..", "Dataset")
FAKE_CSV = os.path.join(DATASET_DIR, "Fake.csv")
TRUE_CSV = os.path.join(DATASET_DIR, "True.csv")
CACHE_FILE = os.path.join(SCRIPT_DIR, "semantic_cache.pkl")

MAX_ROWS = 5000
TOP_N_DEFAULT = 5


def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"www\S+", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"[0-9]", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "rb") as f:
                cache = pickle.load(f)
            if "vectorizer" in cache and "matrix" in cache:
                return cache
        except Exception:
            pass
    return None


def build_cache():
    rows_per_file = MAX_ROWS // 2
    fake_df = pd.read_csv(FAKE_CSV, usecols=["title", "text"], nrows=rows_per_file)
    true_df = pd.read_csv(TRUE_CSV, usecols=["title", "text"], nrows=rows_per_file)
    fake_df["label"] = "FAKE"
    true_df["label"] = "REAL"
    df = pd.concat([fake_df, true_df], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df["combined"] = (df["title"].fillna("") + " " + df["text"].fillna("")).apply(clean_text)
    df = df[df["combined"].str.len() > 10].reset_index(drop=True)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        max_features=8000,
        ngram_range=(1, 2),
        min_df=2,
    )
    matrix = vectorizer.fit_transform(df["combined"])

    cache = {
        "vectorizer": vectorizer,
        "matrix": matrix,
        "titles": df["title"].fillna("Unknown").tolist(),
        "labels": df["label"].tolist(),
        "texts": df["text"].fillna("").str[:200].tolist(),
        "sources": ["Fake.csv", "True.csv"],
    }

    with open(CACHE_FILE, "wb") as f:
        pickle.dump(cache, f)

    return cache


def semantic_search(query_text, top_n=TOP_N_DEFAULT):
    cache = load_cache()
    if cache is None:
        cache = build_cache()

    vectorizer = cache["vectorizer"]
    matrix = cache["matrix"]
    titles = cache["titles"]
    labels = cache["labels"]
    texts = cache["texts"]
    sources = cache.get("sources", ["Fake.csv", "True.csv"])

    cleaned_query = clean_text(query_text)
    query_vec = vectorizer.transform([cleaned_query])
    scores = cosine_similarity(query_vec, matrix).flatten()

    top_indices = scores.argsort()[::-1][:top_n]

    results = []
    for idx in top_indices:
        sim_score = float(scores[idx])
        if sim_score < 0.01:
            continue
        results.append({
            "title": titles[idx],
            "source": sources[idx % len(sources)] if idx < len(sources) else "Dataset",
            "label": labels[idx],
            "similarity": round(sim_score * 100, 2),
            "snippet": texts[idx][:150],
        })

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)

    query = sys.argv[1]
    top_n = int(sys.argv[2]) if len(sys.argv) > 2 else TOP_N_DEFAULT

    try:
        matches = semantic_search(query, top_n)
        print(json.dumps(matches))
    except Exception as e:
        print(json.dumps({"error": str(e), "matches": []}))