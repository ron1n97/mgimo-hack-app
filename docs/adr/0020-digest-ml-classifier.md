# 0020. Digest ML classifier (embeddings LogReg + LLM verify)

## Статус
Принято

## Дата
2026-11-22

## Контекст
Эвристики и «близость к эталонам» давали ложные REJECT/APPROVE (ДР из‑за «день», PT-клуб, дебаты). Нужен настоящий классификатор и ИИ только как верификатор на uncertain.

## Решение
1. Обучение: `apps/digest-ml` — **LogisticRegression** на эмбеддингах `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers; Z Code coding-key не отдаёт `/embeddings`). Labels — `data/labels.jsonl`. Артефакты: `model.joblib` + meta `model.json`. Offline/CI: TF-IDF char_wb + LogReg в `model.json`.
2. Инференс: Python `predict.py` (ST→LogReg) → `p(event)`; вне `[low,high]` — APPROVED/REJECTED; mid band — **Z Code** JSON verify. Fallback — TF-IDF в Nest без Python.
3. Staff `/staff/digest` — опциональный override.

## Последствия
- На api/worker нужен `python3` + venv `apps/digest-ml/.venv` (или system site-packages) и `DIGEST_ML_PREDICT_SCRIPT` / `DIGEST_ML_JOBLIB`.
- Переобучение: `apps/digest-ml/.venv/bin/python scripts/train.py`.
- Не kNN к эталонам: линейная голова на эмбеддингах.
