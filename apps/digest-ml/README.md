# digest-ml — классификатор мероприятий дайджеста

Не kNN к эталонам: **LogisticRegression на эмбеддингах**, затем **LLM-верификация** на uncertain.

```
text → MiniLM embed → LogReg.predict_proba
         ├─ p_event ≥ high  → APPROVED
         ├─ p_event ≤ low   → REJECTED
         └─ mid band        → Z Code JSON verify
```

Z Code coding-key **не** отдаёт `/embeddings` → локальный `sentence-transformers`.

## Train

```bash
cd apps/digest-ml
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/train.py          # ST + LogReg → model.joblib
.venv/bin/python scripts/train.py --offline # TF-IDF only → model.json (CI)
```

## Labels

`data/labels.jsonl` — `{"id","label":"event"|"junk","text"}`.  
Золото: ручной дайджест НСО 16–20.11 + явный junk из live-ленты.
