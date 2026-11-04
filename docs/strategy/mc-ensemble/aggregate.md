---
type: mc-aggregate
idea_slug: digital-dekanat
status: canonical
evidence: sim
updated: 2026-11-04
note: reconciled after parallel trial writers; canonical = on-disk trials/
---

# Aggregate — N=8 (sim only) — reconciled

| Trial | Outcome | Dominant FM | Key Θ |
|-------|---------|-------------|-------|
| 001 | survive | — | eng_heavy / locked_C / forensic / timeweb |
| 002 | fail | FM_pdf | thin_cursor + crowd 150 (+ vercel secondary) |
| 003 | fail | FM_host | down_review at jury week |
| 004 | fail | FM_scope | creep_lms + sick (+ missing PDF secondary) |
| 005 | fail | FM_pdf | vercel + missing PDF |
| 006 | fail | FM_scope | creep_lms + sick + thin pdf |
| 007 | fail | FM_host | down_review |
| 008 | fail | FM_crowd | dual creep + thin + vercel + split |

**Survive rate (sim):** 1/8 — **не** market proof.

## Frequency

| FM | n/8 | ≥40%? |
|----|-----|-------|
| FM_host | 2 | no (25%) |
| FM_pdf | 2 | no (25%) |
| FM_scope | 2 | no (25%) |
| FM_crowd | 1 | no |
| FM_brief | 0 | no |

Порог ≥40% не пробит. Качественно: **тройной кластер** host / pdf / scope (по 25%) — равный приоритет митигации. FM_brief в этой выборке не доминировал (остаётся R5 как brief-checklist, не как частый sim-killer).

## Sensitivity

| Рычаг | Эффект |
|-------|--------|
| host down_review / vercel | → FM_host или вторичный риск |
| pdf thin/missing | → FM_pdf (часто даже при живом продукте) |
| creep_lms / dual + capacity hit | → FM_scope |
| locked_C + forensic + timeweb | единственный survive (001) |

## Mitigations → hypotheses-out R1–R5

Без изменений по смыслу: RU-host+mirror, PDF с D1, scope lock, narrative≠CRUD, brief/IDOR checklist.
