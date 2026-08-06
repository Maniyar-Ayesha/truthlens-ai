import sys
import os
import json
import re
import math
import random
import urllib.parse
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline

ML_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(ML_DIR, "url_model.pkl")
VECTORIZER_PATH = os.path.join(ML_DIR, "url_vectorizer.pkl")

REAL_URLS = [
    "google.com",
    "github.com",
    "microsoft.com",
    "wikipedia.org",
    "openai.com",
    "amazon.in",
    "sbi.co.in",
    "icicibank.com",
    "apple.com",
    "youtube.com",
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "netflix.com",
    "spotify.com",
    "reddit.com",
    "stackoverflow.com",
    "medium.com",
    "aws.amazon.com",
    "cloud.google.com",
    "docs.python.org",
    "pypi.org",
    "npmjs.com",
    "ubuntu.com",
    "debian.org",
    "archlinux.org",
    "mozilla.org",
    "chromium.org",
    "w3.org",
    "ietf.org",
    "icann.org",
    "who.int",
    "nih.gov",
    "nasa.gov",
    "usa.gov",
    "irs.gov",
    "bbb.org",
    "irs.gov",
    "paypal.com",
    "visa.com",
    "mastercard.us",
    "bankofamerica.com",
    "wellsfargo.com",
    "chase.com",
    "citibank.com",
    "usaa.com",
    "amex.com",
    "capitalone.com",
    "discover.com",
]

FAKE_URLS = [
    "g00gle-login.com",
    "amaz0n-support.xyz",
    "secure-paytm-login.ru",
    "bank-verification.top",
    "paypal-security-alert.xyz",
    "microsoftverify.info",
    "freegift2026.click",
    "login-facebook-support.top",
    "secure-upi-login.xyz",
    "update-bank-account.click",
    "appleid-verify.xyz",
    "amazon-rewards.top",
    "google-accounts-security.ru",
    "netflix-billing-update.click",
    "password-reset-google.xyz",
    "microsoft365-login.top",
    "facebook-verify-account.xyz",
    "crypto-wallet-secure.click",
    "bank-login-verify.ru",
    "instagram-verify.xyz",
    "twitter-verify.com",
    "linkedin-premium.xyz",
    "apple-support-free.click",
    "google-drive-storage.top",
    "adobe-creative-cloud.xyz",
    "dhl-package-delivery.ru",
    "fedex-tracking.click",
    "paypal-confirm.xyz",
    "chase-bank-alert.top",
    "wells-fargo-secure.xyz",
    "amazon-prime-video.ru",
    "zoom-meeting-link.click",
    "microsoft-teams.xyz",
    "google-cloud.xyz",
    "apple-icloud.xyz",
    "whatsapp-web-verification.ru",
    "telegram-premium.click",
    "discord-nitro.xyz",
    "steam-wallet.top",
    "epic-games-store.xyz",
    "google-play.xyz",
    "microsoft-store.top",
    "apple-store.xyz",
    "paytm-wallet.ru",
    "phonepe-verify.click",
    "google-pagespeed.xyz",
    "fb-login-verify.top",
    "twitter-follow.xyz",
    "linkedin-job-alert.ru",
    "amazon-gift-card.click",
    "google-form.xyz",
    "dropbox-share.top",
    "onedrive-login.xyz",
    "icloud-backup.ru",
    "iclaid-restore.click",
    "yahoo-mail.xyz",
    "outlook-login.top",
    "hotmail-support.xyz",
    "windows-update.ru",
    "adobe-reader.click",
    "flash-player-update.xyz",
    "java-update.top",
    "chrome-extension.xyz",
    "firefox-addon.ru",
    "ubuntu-driver.click",
    "nvidia-geforce.xyz",
    "amd-radeon.top",
    "intel-driver.xyz",
    "cisco-webex.ru",
    "slack-login.click",
    "trello-board.xyz",
    "asana-project.top",
    "notion-workspace.xyz",
    "google-docs.ru",
    "dropbox-file.click",
    "box-cloud.xyz",
    "onedrive-share.top",
    "github-enterprise.xyz",
    "gitlab-ci.ru",
    "bitbucket-login.click",
    "jira-board.xyz",
    "confluence-wiki.top",
    "atlassian.xyz",
    "docker-hub.ru",
    "kubernetes.click",
    "terraform-cloud.xyz",
    "ansible-topology.top",
    "chef-server.xyz",
    "puppet-lab.ru",
    "saltstack.click",
    "vagrant-cloud.xyz",
    "vault-hashicorp.top",
    "nomad-cluster.xyz",
    "consul-discover.ru",
    "terraform-apply.click",
    "pulumi-cloud.xyz",
]

PHISHING_KEYWORDS = [
    "login", "verify", "account", "bank", "secure", "password", "update",
    "confirm", "click", "free", "gift", "claim", "bonus", "lottery",
    "winner", "prize", "urgent", "verify", "support", "restore",
    "recovery", "alert", "notification", "suspended", "locked",
    "security", "authenticate", "credential", "personal", "information",
    "identity", "billing", "payment", "subscription", "upgrade",
    "activation", "enroll", "enrollment", "application", "apply",
    "verify", "validation", "confirm", "token", "pin", "otp",
]

SUSPICIOUS_TLDS = [
    ".xyz", ".top", ".click", ".loan", ".ru", ".tk", ".ml", ".ga",
    ".cf", ".gq", ".pw", ".cc", ".info", ".biz", ".pw", ".su",
]

TRUSTED_TLDS = [
    ".gov", ".edu", ".org", ".int", ".mil",
]

def extract_features(url):
    features = {}
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.hostname or ""
        path = parsed.path or ""
        query = parsed.query or ""
        full_url = url

        features["has_https"] = 1 if full_url.startswith("https://") else 0
        features["url_length"] = len(full_url)
        features["domain_length"] = len(domain)
        features["path_length"] = len(path)
        features["query_length"] = len(query)
        features["total_length"] = len(full_url)

        features["has_ip"] = 1 if re.match(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", domain) else 0
        features["has_port"] = 1 if ":" in domain else 0
        features["has_at"] = 1 if "@" in full_url else 0
        features["has_double_slash"] = 1 if "//" in path else 0
        features["hyphen_count"] = domain.count("-")
        features["underscore_count"] = domain.count("_")
        features["digit_count"] = sum(c.isdigit() for c in domain)
        features["digit_ratio"] = sum(c.isdigit() for c in full_url) / max(len(full_url), 1)
        features["special_char_count"] = sum(1 for c in full_url if not c.isalnum() and c not in ".-_:/")
        features["tld_suspicious"] = 1 if domain.endswith(tuple(SUSPICIOUS_TLDS)) else 0
        features["tld_trusted"] = 1 if domain.endswith(tuple(TRUSTED_TLDS)) else 0

        features["suspicious_keywords"] = sum(
            1 for kw in PHISHING_KEYWORDS if kw in full_url.lower()
        )
        features["subdomain_count"] = domain.count(".")
        features["has_redirect"] = 1 if "redirect" in full_url.lower() or "url=" in full_url.lower() else 0
        features["has_tracking"] = 1 if any(t in full_url.lower() for t in ["utm_", "fbclid", "gclid", "ref="]) else 0

        domain_parts = domain.split(".")
        features["domain_depth"] = len(domain_parts)
        features["tld_length"] = len(domain_parts[-1]) if domain_parts else 0

        features["is_shortened"] = 1 if any(
            s in domain for s in ["bit.ly", "tinyurl", "goo.gl", "t.co", "ow.ly", "is.gd"]
        ) else 0

        features["url_entropy"] = len(set(full_url)) / max(len(full_url), 1)

        features["has_www"] = 1 if domain.startswith("www.") else 0

        features["has_https_mismatch"] = 1 if "https" in full_url.lower() and not full_url.startswith("https://") else 0

        features["sensitive_path"] = 1 if any(kw in path.lower() for kw in ["login", "verify", "auth", "bank", "account", "password"]) else 0

        features["query_params_count"] = len(query.split("&")) if query else 0

        features["is_numeric_domain"] = 1 if domain.replace(".", "").isdigit() else 0

        features["consecutive_special"] = 1 if re.search(r"[^a-zA-Z0-9]{3,}", domain) else 0

        features["uppercase_ratio"] = sum(1 for c in full_url if c.isupper()) / max(len(full_url), 1)

        label = 1

    except Exception:
        features = {
            "has_https": 0, "url_length": 0, "domain_length": 0, "path_length": 0,
            "query_length": 0, "total_length": 0, "has_ip": 0, "has_port": 0,
            "has_at": 0, "has_double_slash": 0, "hyphen_count": 0,
            "underscore_count": 0, "digit_count": 0, "digit_ratio": 0,
            "special_char_count": 0, "tld_suspicious": 0, "tld_trusted": 0,
            "suspicious_keywords": 0, "subdomain_count": 0, "has_redirect": 0,
            "has_tracking": 0, "domain_depth": 0, "tld_length": 0, "is_shortened": 0,
            "url_entropy": 0, "has_www": 0, "has_https_mismatch": 0,
            "sensitive_path": 0, "query_params_count": 0, "is_numeric_domain": 0,
            "consecutive_special": 0, "uppercase_ratio": 0,
        }
        label = 0

    return features, label

def generate_phishing_urls(count):
    templates = [
        "https://{domain}-{subdomain}.{tld}",
        "https://www.{domain}.{tld}/login",
        "https://{domain}.{tld}/verify",
        "https://{domain}-secure.{tld}/account",
        "http://{domain}.{tld}/bank",
        "https://{subdomain}.{domain}.{tld}/update",
        "https://{domain}{number}.{tld}/auth",
        "http://secure-{domain}.{tld}/login",
        "https://{domain}-{keyword}.{tld}",
        "https://www-{domain}.{tld}/verify",
    ]
    domains = ["google", "amazon", "microsoft", "apple", "facebook", "twitter", "paypal", "bank", "icici", "sbi", "wells", "chase", "dropbox", "netflix", "spotify", "zoom", "microsoft", "adobe", "steam", "epic", "apple", "google", "linkedin", "instagram", "whatsapp"]
    subdomains = ["secure", "login", "verify", "auth", "account", "update", "billing", "support", "customer", "webmail", "admin", "portal", "gateway", "auth"]
    tlds = [".xyz", ".top", ".click", ".loan", ".ru", ".tk", ".ml", ".ga", ".cf", ".gq", ".pw", ".cc", ".info", ".biz"]
    keywords = ["free", "gift", "bonus", "claim", "prize", "winner", "lottery", "reward", "offer", "deal"]
    numbers = ["123", "2024", "2025", "2026", "account", "secure", "backup"]

    urls = []
    for i in range(count):
        template = random.choice(templates)
        url = template.format(
            domain=random.choice(domains),
            subdomain=random.choice(subdomains),
            tld=random.choice(tlds),
            number=random.choice(numbers),
            keyword=random.choice(keywords),
        )
        urls.append(url)
    return urls

def generate_benign_urls(count):
    templates = [
        "https://www.{domain}.com/{page}",
        "https://{domain}.org/{page}",
        "https://www.{domain}.gov/{page}",
        "https://{domain}.edu/{page}",
        "https://www.{domain}.net/{page}",
        "https://api.{domain}.com/{endpoint}",
        "https://docs.{domain}.com/{page}",
        "https://blog.{domain}.org/{page}",
        "https://www.{domain}.com/products/{page}",
        "https://help.{domain}.com/{page}",
    ]
    domains = ["google", "github", "microsoft", "wikipedia", "openai", "amazon", "apple", "youtube", "facebook", "netflix", "spotify", "reddit", "stackoverflow", "medium", "aws", "cloud", "docs", "pypi", "npm", "ubuntu", "debian", "archlinux", "mozilla", "chromium", "w3", "ietf", "icann", "nih", "nasa", "bbb", "paypal", "visa", "mastercard", "bankofamerica", "wellsfargo", "chase", "citibank", "usaa", "amex", "capitalone", "discover", "dhl", "fedex", "ups", "usps"]
    pages = ["home", "about", "contact", "login", "dashboard", "settings", "profile", "help", "support", "docs", "blog", "news", "api", "status", "terms", "privacy", "jobs", "careers", "products", "services", "pricing", "features", "download", "upgrade", "trial", "demo", "tutorial", "guide", "faq", "community", "forum", "wiki", "knowledge", "base", "center", "portal", "webmail", "mail", "calendar", "drive", "storage", "cloud", "sync", "backup", "restore"]

    urls = []
    for i in range(count):
        template = random.choice(templates)
        url = template.format(
            domain=random.choice(domains),
            page=random.choice(pages),
            endpoint=random.choice(pages),
        )
        urls.append(url)
    return urls

def train_url_model():
    print("=" * 70)
    print("       TRUTHLENS AI – URL MODEL RETRAINING PIPELINE")
    print("=" * 70)

    # Generate balanced dataset
    real_count = max(len(REAL_URLS), 1000)
    fake_count = max(len(FAKE_URLS), 1000)

    print(f"\n[1] Generating balanced dataset...")
    print(f"    REAL URLs: {len(REAL_URLS)} + {real_count - len(REAL_URLS)} generated = {real_count}")
    print(f"    FAKE URLs: {len(FAKE_URLS)} + {fake_count - len(FAKE_URLS)} generated = {fake_count}")

    all_real = REAL_URLS + generate_benign_urls(real_count - len(REAL_URLS))
    all_fake = FAKE_URLS + generate_phishing_urls(fake_count - len(FAKE_URLS))

    random.shuffle(all_real)
    random.shuffle(all_fake)

    X = []
    y = []

    for url in all_real:
        feats, label = extract_features(url)
        X.append(feats)
        y.append(label)

    for url in all_fake:
        feats, label = extract_features(url)
        X.append(feats)
        y.append(0)

    df = pd.DataFrame(X)
    df["label"] = y

    print(f"\n[2] Dataset shape: {df.shape}")
    print(f"    REAL (label=1): {sum(y)} URLs")
    print(f"    FAKE (label=0): {len(y) - sum(y)} URLs")

    feature_names = [c for c in df.columns if c != "label"]
    X_array = df[feature_names].values
    y_array = df["label"].values

    # Save vectorizer for text-based features
    vectorizer = TfidfVectorizer(
        analyzer="char",
        ngram_range=(2, 4),
        max_features=500,
        lowercase=True,
    )
    X_tfidf = vectorizer.fit_transform([str(a) for a in X_array])

    print(f"\n[3] Training models...")

    models = {
        "RandomForest": RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        ),
        "LogisticRegression": LogisticRegression(
            max_iter=1000,
            C=1.0,
            solver="lbfgs",
            random_state=42,
            class_weight="balanced",
        ),
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}

    for name, model in models.items():
        print(f"\n    Training {name}...")

        pipe = Pipeline([
            ("tfidf", vectorizer),
            ("classifier", model),
        ])

        cv_scores = cross_val_score(pipe, [str(a) for a in X_array], y_array, cv=cv, scoring="accuracy")
        mean_cv = cv_scores.mean()
        std_cv = cv_scores.std()

        pipe.fit([str(a) for a in X_array], y_array)

        y_pred = pipe.predict([str(a) for a in X_array])
        accuracy = accuracy_score(y_array, y_pred)
        precision = precision_score(y_array, y_pred, average="weighted")
        recall = recall_score(y_array, y_pred, average="weighted")
        f1 = f1_score(y_array, y_pred, average="weighted")
        cm = confusion_matrix(y_array, y_pred)

        results[name] = {
            "model": pipe,
            "cv_accuracy": mean_cv,
            "cv_std": std_cv,
            "train_accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "confusion_matrix": cm.tolist(),
        }

        print(f"    {name}: CV Accuracy = {mean_cv:.4f} ± {std_cv:.4f}")
        print(f"    {name}: Train Accuracy = {accuracy:.4f}, Precision = {precision:.4f}, Recall = {recall:.4f}, F1 = {f1:.4f}")

    best_name = max(results, key=lambda k: results[k]["cv_accuracy"])
    best_model = results[best_name]

    print(f"\n[4] Best model: {best_name} (CV Accuracy: {best_model['cv_accuracy']:.4f})")

    print(f"\n[5] Saving models...")
    joblib.dump(best_model["model"], MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)
    print(f"    Saved: {MODEL_PATH}")
    print(f"    Saved: {VECTORIZER_PATH}")

    print(f"\n[6] Generating test predictions...")
    test_real = random.sample(REAL_URLS, min(20, len(REAL_URLS)))
    test_fake = random.sample(FAKE_URLS, min(20, len(FAKE_URLS)))

    real_preds = best_model["model"].predict(test_real)
    fake_preds = best_model["model"].predict(test_fake)

    real_correct = sum(1 for p in real_preds if p == 1)
    fake_correct = sum(1 for p in fake_preds if p == 0)

    print(f"\n    REAL URL Test (20): {real_correct}/20 correct = {real_correct/20*100:.1f}%")
    print(f"    FAKE URL Test (20): {fake_correct}/20 correct = {fake_correct/20*100:.1f}%")

    print(f"\n[7] Detailed classification report:")
    y_pred_all = best_model["model"].predict([str(a) for a in X_array])
    print(classification_report(y_array, y_pred_all, target_names=["FAKE", "REAL"]))

    print(f"\n[8] Confusion Matrix:")
    print(f"    {best_model['confusion_matrix']}")

    report = {
        "best_model": best_name,
        "models": {
            name: {
                "cv_accuracy": r["cv_accuracy"],
                "cv_std": r["cv_std"],
                "train_accuracy": r["train_accuracy"],
                "precision": r["precision"],
                "recall": r["recall"],
                "f1": r["f1"],
                "confusion_matrix": r["confusion_matrix"],
            }
            for name, r in results.items()
        },
        "test_real_accuracy": real_correct / 20 * 100,
        "test_fake_accuracy": fake_correct / 20 * 100,
        "dataset_size": len(df),
        "real_count": int(sum(y)),
        "fake_count": int(len(y) - sum(y)),
        "feature_count": len(feature_names),
    }

    report_path = os.path.join(ML_DIR, "url_training_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n    Report saved: {report_path}")

    return best_model["model"], vectorizer, report

if __name__ == "__main__":
    model, vectorizer, report = train_url_model()
    print(f"\n{'=' * 70}")
    print("       URL MODEL RETRAINING COMPLETE")
    print(f"{'=' * 70}")
