#!/usr/bin/env python3
"""Train LogisticRegression for digest event vs junk → artifacts/.

Primary: sentence-transformers embeddings + LogReg (real ML head, not kNN).
Fallback: TF-IDF char_wb + LogReg (--offline or if ST missing).

Also writes model.json for TF-IDF (pure TS infer) or meta for embedding joblib.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
LABELS = ROOT / "data" / "labels.jsonl"
OUT_JSON = ROOT / "artifacts" / "model.json"
OUT_TFIDF = ROOT / "artifacts" / "model-tfidf.json"
OUT_JOBLIB = ROOT / "artifacts" / "model.joblib"

CLASS_ORDER = ["junk", "event"]
ST_MODEL = os.environ.get(
    "DIGEST_ST_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
)


def load_labels(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def train_sentence_transformers(texts: list[str], y: np.ndarray) -> dict:
    from sentence_transformers import SentenceTransformer

    encoder = SentenceTransformer(ST_MODEL)
    X = encoder.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    X = np.asarray(X, dtype=np.float64)

    clf = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        C=1.0,
        solver="lbfgs",
    )
    cv_f1 = None
    if len(texts) >= 8:
        scores = cross_val_score(
            clf, X, y, cv=min(5, len(texts) // 2), scoring="f1"
        )
        cv_f1 = float(scores.mean())
    clf.fit(X, y)

    bundle = {
        "backend": "sentence_transformers",
        "st_model": ST_MODEL,
        "clf": clf,
        "classes": CLASS_ORDER,
        "thresholds": {"low": 0.35, "high": 0.65},
        "normalize": True,
    }
    OUT_JOBLIB.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, OUT_JOBLIB)

    meta = {
        "type": "logreg_st_joblib",
        "version": 1,
        "joblib": "model.joblib",
        "st_model": ST_MODEL,
        "classes": CLASS_ORDER,
        "coef": clf.coef_.astype(float).tolist(),
        "intercept": clf.intercept_.astype(float).tolist(),
        "thresholds": {"low": 0.35, "high": 0.65},
        "embed": {
            "backend": "sentence_transformers",
            "model": ST_MODEL,
            "dimensions": int(X.shape[1]),
            "normalize": True,
        },
        "metrics": {
            "train_accuracy": float(clf.score(X, y)),
            "cv_f1": cv_f1,
            "n": len(texts),
        },
    }
    return meta


def train_offline(texts: list[str], y: np.ndarray) -> dict:
    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=1,
                    max_features=4096,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    class_weight="balanced",
                    C=1.0,
                    solver="lbfgs",
                ),
            ),
        ]
    )
    cv_f1 = None
    if len(texts) >= 8:
        scores = cross_val_score(
            pipe, texts, y, cv=min(5, len(texts) // 2), scoring="f1"
        )
        cv_f1 = float(scores.mean())
    pipe.fit(texts, y)
    tfidf: TfidfVectorizer = pipe.named_steps["tfidf"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    return {
        "type": "logreg_tfidf",
        "version": 1,
        "tfidf": {
            "analyzer": "char_wb",
            "ngram_range": [3, 5],
            "vocabulary": {k: int(v) for k, v in tfidf.vocabulary_.items()},
            "idf": tfidf.idf_.astype(float).tolist(),
        },
        "classes": CLASS_ORDER,
        "coef": clf.coef_.astype(float).tolist(),
        "intercept": clf.intercept_.astype(float).tolist(),
        "thresholds": {"low": 0.35, "high": 0.65},
        "metrics": {
            "train_accuracy": float(pipe.score(texts, y)),
            "cv_f1": cv_f1,
            "n": len(texts),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--offline",
        action="store_true",
        help="TF-IDF LogReg only (no sentence-transformers download)",
    )
    args = parser.parse_args()

    rows = load_labels(LABELS)
    texts = [r["text"] for r in rows]
    y = np.asarray([CLASS_ORDER.index(r["label"]) for r in rows], dtype=np.int64)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    # Always keep a pure-TS TF-IDF artifact for alpine/Docker fallback.
    tfidf_artifact = train_offline(texts, y)
    OUT_TFIDF.write_text(
        json.dumps(tfidf_artifact, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    if args.offline:
        artifact = tfidf_artifact
        OUT_JSON.write_text(
            json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    else:
        try:
            artifact = train_sentence_transformers(texts, y)
            OUT_JSON.write_text(
                json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except Exception as exc:  # noqa: BLE001
            print(
                f"ST train failed ({exc}); using TF-IDF as model.json",
                file=sys.stderr,
            )
            artifact = tfidf_artifact
            OUT_JSON.write_text(
                json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8"
            )

    print(
        json.dumps(
            {
                "wrote_json": str(OUT_JSON),
                "wrote_tfidf": str(OUT_TFIDF),
                "wrote_joblib": str(OUT_JOBLIB) if OUT_JOBLIB.exists() else None,
                "metrics": artifact["metrics"],
                "type": artifact["type"],
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
