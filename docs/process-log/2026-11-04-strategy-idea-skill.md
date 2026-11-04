# Process log — 2026-11-04 · стратегия до кода

## Инструменты

| Инструмент | Зачем |
|------------|--------|
| **Cursor** (агент Composer) | Весь диалог стратегии и фиксация артефактов |
| **Скилл `/idea`** (`~/.cursor/skills/idea`) | Единый пайплайн валидации/стратегии: P0 Boot → P1 Situation → P2 Options → P3 Monte Carlo ensemble → P4 Gate → decision. Kill-first, доказательства, симуляция≠валидация, Obsidian datalake |
| WebSearch / WebFetch / curl | Регламент challenge.mgimo.ai, RUZ API МГИМО, ландшафт ЛК вузов, хостинг РФ |
| Obsidian vault `ron1n_vault` | Slice `ideas/digital-dekanat/` — situation/options/MC/strategies |
| Хаб `~/ideas/mgimo-hack-app/digital-dekanat/` | RUNS.md, state.md, teardown, MC trials |

## Что сделали с `/idea`

1. P0 — бриф Вайб-кодинг «Цифровой деканат», профиль `product-strategy`, vault path.
2. P1 — situation + teardown «как выиграть», не PMF стартапа.
3. P2 — Options A/B/C/D; выбор **C** (Process Theatre + RUZ).
4. P3 — Monte Carlo N=8, failure-modes host/pdf/scope/crowd/brief → митигации R1–R5.
5. P4 — strategy-product + strategy-comms + decision-log; owner «ок».
6. Pre-build delta — criteria-first, AI imba, PAINS, research plan, CLAUDE.md, release log.

## Промпт-якоря (этапы)

- Owner: полный бриф ЛК + «как выиграть хакатон?»
- Owner: ответы P0 (vault, МГИМО/СамГТУ, команда, только вайб)
- Owner: «давай» = C + MC + P4
- Owner: «ок» на decision
- Owner: AI-фичи + боли + критерии 100% + CLAUDE.md
- Owner: опросник+ФГ · всё через ИИ · кр.3 на Романе · качество через CLAUDE · release log

## Фейлы / уроки

- Параллельные MC-writers перетёрли trials → нужен reconcile aggregate (сделан).
- Путь vault назван `ron1n97_vault`, факт = `ron1n_vault`.
- PDF сдачи ≠ «ИИ парсит PDF в продукте» — уточнили до Options.

## След в сдаче

Раздел PDF «Этап 0 — стратегия»: описать `/idea` как метод работы с задачей до кода + ссылка на хаб идей.
