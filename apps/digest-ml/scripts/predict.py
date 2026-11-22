#!/usr/bin/env python3
"""Predict digest labels. stdin JSON → stdout JSON.

Input:  {"texts": ["...", "..."]}
Output: {"predictions":[{"label":"event|junk","p_event":0.8,"uncertain":false}, ...]}
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
JOBLIB = Path(
    os.environ.get("DIGEST_ML_JOBLIB") or (ROOT / "artifacts" / "model.joblib")
)


def main() -> int:
    payload = json.loads(sys.stdin.read() or "{}")
    texts = payload.get("texts") or []
    if not isinstance(texts, list):
        print(json.dumps({"error": "texts must be list"}))
        return 2
    if not JOBLIB.exists():
        print(json.dumps({"error": f"missing {JOBLIB}"}))
        return 3

    bundle = joblib.load(JOBLIB)
    clf = bundle["clf"]
    thresholds = bundle.get("thresholds") or {"low": 0.35, "high": 0.65}
    encoder_name = bundle["st_model"]

    from sentence_transformers import SentenceTransformer

    encoder = SentenceTransformer(encoder_name)
    X = np.asarray(
        encoder.encode(texts, normalize_embeddings=True, show_progress_bar=False),
        dtype=np.float64,
    )
    proba = clf.predict_proba(X)
    classes = list(clf.classes_)
    event_idx = classes.index(1) if 1 in classes else len(classes) - 1

    low, high = float(thresholds["low"]), float(thresholds["high"])
    preds = []
    for row in proba:
        p_event = float(row[event_idx])
        preds.append(
            {
                "label": "event" if p_event >= 0.5 else "junk",
                "p_event": p_event,
                "uncertain": low < p_event < high,
            }
        )
    print(json.dumps({"predictions": preds}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
