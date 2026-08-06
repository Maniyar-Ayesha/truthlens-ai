"""Shared feature extractors for URL phishing classification."""

import re
import math
import random
from urllib.parse import urlparse

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.base import BaseEstimator, TransformerMixin


SUSPICIOUS_KEYWORDS = [
    "login", "verify", "account", "update", "secure", "banking", "confirm",
    "password", "free", "gift", "claim", "bonus", "lottery", "urgent", "winner",
    "prize", "paypal", "ebay", "amazon", "apple", "microsoft", "google",
    "facebook", "netflix", "bank", "transfer", "wire", "crypto", "bitcoin",
    "wallet",
]

SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "top", "click", "download", "link", "xyz",
    "loan", "ru", "cn", "pw", "cc", "biz", "info", "online", "site",
}

SHORTENED_DOMAINS = [
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
]


class URLTextExtractor(BaseEstimator, TransformerMixin):
    """Extract domain names from raw URLs for TF-IDF vectorization."""

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        domains = []
        for url in X:
            try:
                parsed = urlparse(str(url))
                netloc = parsed.netloc
                if not netloc:
                    netloc = str(url).split("/")[0]
                if netloc.startswith("www."):
                    netloc = netloc[4:]
                domains.append(netloc)
            except Exception:
                domains.append(str(url))
        return domains


class URLNumericExtractor(BaseEstimator, TransformerMixin):
    """Extract 17 numeric features from raw URLs."""

    def __init__(self):
        self.suspicious_keywords = SUSPICIOUS_KEYWORDS
        self.suspicious_tlds = SUSPICIOUS_TLDS
        self.shortened_domains = SHORTENED_DOMAINS
        self.feature_names_ = [
            "url_length", "has_https", "has_ip", "hyphen_count", "underscore_count",
            "digit_count", "at_count", "double_slash_count", "suspicious_keywords_count",
            "subdomain_count", "has_redirect", "has_tracking", "tld_suspicious",
            "domain_depth", "tld_length", "is_shortened", "url_entropy",
        ]

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        features = []
        for url in X:
            features.append(self._extract_features(url))
        return csr_matrix(np.array(features, dtype=np.float64))

    def _extract_features(self, url):
        url = str(url)
        lower = url.lower()

        try:
            parsed = urlparse(url)
            domain = parsed.hostname or ""
            path = parsed.path or ""
        except Exception:
            domain = ""
            path = ""

        url_length = len(url)
        has_https = 1 if lower.startswith("https://") else 0
        has_ip = 1 if re.match(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", domain) else 0
        hyphen_count = domain.count("-")
        underscore_count = domain.count("_")
        digit_count = sum(c.isdigit() for c in domain)
        at_count = url.count("@")
        double_slash_count = url.count("//") - (1 if url.startswith("http") else 0)
        suspicious_keywords_count = sum(
            1 for kw in self.suspicious_keywords if kw in lower
        )
        subdomain_count = max(domain.count(".") - 1, 0)
        has_redirect = 1 if "redirect" in lower or "url=" in lower else 0
        has_tracking = 1 if any(t in lower for t in ["utm_", "fbclid", "gclid", "ref="]) else 0

        domain_parts = domain.split(".")
        tld = domain_parts[-1] if domain_parts else ""
        tld_suspicious = 1 if tld in self.suspicious_tlds else 0
        domain_depth = len(domain_parts) if domain_parts else 0
        tld_length = len(tld)

        is_shortened = 1 if any(s in domain for s in self.shortened_domains) else 0

        unique_chars = len(set(url))
        total_chars = max(len(url), 1)
        url_entropy = unique_chars / total_chars

        return [
            url_length,
            has_https,
            has_ip,
            hyphen_count,
            underscore_count,
            digit_count,
            at_count,
            double_slash_count,
            suspicious_keywords_count,
            subdomain_count,
            has_redirect,
            has_tracking,
            tld_suspicious,
            domain_depth,
            tld_length,
            is_shortened,
            url_entropy,
        ]


def generate_synthetic_dataset(n_samples=1000):
    """Generate a small synthetic URL phishing dataset for demo purposes."""
    random.seed(42)
    np.random.seed(42)

    legitimate_domains = [
        "google.com", "facebook.com", "amazon.com", "microsoft.com", "github.com",
        "wikipedia.org", "reddit.com", "twitter.com", "linkedin.com", "apple.com",
        "netflix.com", "youtube.com", "stackoverflow.com", "medium.com", "bbc.com",
        "cnn.com", "nytimes.com", "theguardian.com", "apnews.com", "reuters.com",
        "indiatoday.in", "timesofindia.indiatimes.com", "who.int", "nih.gov",
        "nasa.gov", "gov.in", "nic.in",
    ]

    urls = []
    labels = []

    legitimate_paths = [
        "", "/search", "/about", "/contact", "/products", "/blog", "/news", "/help",
        "/login", "/signup", "/dashboard", "/settings", "/profile",
    ]
    legitimate_queries = [
        "", "?q=test", "?page=1", "?id=123", "?lang=en", "?ref=home",
    ]

    for _ in range(n_samples // 2):
        domain = random.choice(legitimate_domains)
        path = random.choice(legitimate_paths)
        query = random.choice(legitimate_queries)
        scheme = "https://" if random.random() > 0.1 else "http://"
        urls.append(f"{scheme}{domain}{path}{query}")
        labels.append(0)

    phishing_templates = [
        lambda d: f"http://{d}/login?verify=account&secure=1",
        lambda d: f"http://{d}/secure-banking?update=password",
        lambda d: f"https://{d}/free-gift?claim=winner",
        lambda d: f"http://{d}/urgent-action?suspended=account",
        lambda d: f"http://192.168.1.1/@{d}/secure-login",
        lambda d: f"http://{d}-verify.com/account",
        lambda d: f"http://{d}.tk/secure-login",
        lambda d: f"http://{d}.ml/update-password",
        lambda d: f"http://bit.ly/xyz123/@{d}",
        lambda d: f"http://{d}/login?redirect=http://malicious.com",
        lambda d: f"http://{d}?utm_source=attack&fbclid=xyz",
        lambda d: f"http://{d}-secure-update.com/verify",
        lambda d: f"http://{d}.click/download/urgent",
        lambda d: f"http://{d}.top/crypto-wallet/login",
        lambda d: f"http://{d}.xyz/free-iphone/claim",
    ]

    suspicious_domains = [
        "secure-login", "account-verify", "paypa1", "amazon-gift",
        "free-iphone", "claim-prize", "click-here", "login-secure",
        "password-reset", "verify-account", "update-your-account",
        "suspended-account", "urgent-action", "bank-update", "crypto-wallet",
    ]

    for _ in range(n_samples // 2):
        if random.random() < 0.6:
            base = random.choice(suspicious_domains)
            tld = random.choice(["tk", "ml", "ga", "cf", "gq", "top", "click", "xyz", "loan", "ru"])
            domain = f"{base}.{tld}"
        else:
            domain = random.choice(legitimate_domains)

        template = random.choice(phishing_templates)
        urls.append(template(domain))
        labels.append(1)

    combined = list(zip(urls, labels))
    random.shuffle(combined)
    urls, labels = zip(*combined)

    return {"url": list(urls), "label": list(labels)}
