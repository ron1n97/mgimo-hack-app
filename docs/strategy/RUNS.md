# RUNS — digital-dekanat (append-only)

## RUN 0 — P0 Boot | 2026-11-04

**Вход:** полный бриф Вайб-кодинг из ЛК (владелец вставил текст); вопрос «Как выиграть хакатон?»  
**Профиль:** `product-strategy` (стратегия победы в конкурсе, не startup-валидация ниши «деканат»).  
**Obsidian:** временно режим **A** — `~/ideas/mgimo-hack-app/_vault` (ожидаем подтверждение / путь к личному vault).  
**Пороги:** до P1 не выносим KILL по рынку; kill только для вариантов, которые ломают обязательное ядро или доступность жюри.

**ВЕРДИКТ:** `INSUFFICIENT_DATA`  
**Почему:** нет ответа владельца по vault/вузу/команде/скоупу номинаций; Situation ещё не собран.  
**Что доказано / чего НЕ доказано:** есть канонический текст задания; не доказано, чем команда отличается и под какой вуз целимся.  
**Следующий самый дешёвый тест:** ответы на 4 вопроса P0 (0 ₽, ≤1 день) → P1 Situation (teardown ожидания жюри + ландшафт студенческих кабинетов РФ).

## RUN 0.1 — P0 answers | 2026-11-04

**Вход владельца:** vault ≈ `~/ron1n_vault` (найдено `/Users/ron1n97/ron1n_vault`); вуз МГИМО + вариант СамГТУ; команда Максим (капитан) + Роман; только вайб-кодинг.

**ВЕРДИКТ:** `ADVANCE` (к P1)  
**Почему:** блокирующие вопросы P0 закрыты.  
**Следующий шаг:** P1 Situation.

## RUN 1 — P1 Situation | 2026-11-04

**Вход:** бриф + Регламент + evidence pack порталов + jury teardown.  
**Пороги:** зафиксированы в situation.md до Options.  
**Артефакты:** `situation.md`, `teardown-report.md`, `artifacts/evidence-portals-2026-11-04.md`; vault slice `ideas/digital-dekanat/`.

**ВЕРДИКТ:** `ADVANCE`  
**Почему:**
1. Формула победы = среднее 4×10 ([rules §7](https://challenge.mgimo.ai/rules)).
2. RUZ МГИМО JSON API жив (curl 2026-11-04) — реалистичное расписание без реальных ПДн.
3. Толпа предсказуема; рычаг кр.2 (PDF) и один hero-сценарий — рабочие ставки.

**Что доказано / чего НЕТ:** доказаны правила конкурса и статус-кво каналов МГИМО/СамГТУ; не выбрана продуктовая дифференциация; живая боль студентов не собрана.

**Следующий самый дешёвый тест:** P2 Options (≥3 incl. minimal checklist / close) + T2 RU-хост smoke.

## RUN 2 — P2 Options | 2026-11-04

**Вход:** P1 situation/teardown; уточнение: PDF сдачи ≠ обязательный in-product PDF parser.  
**Варианты:** A Floor / B Walk / C Process Theatre+RUZ / D Dual-skin.  
**Рекомендация агента:** C с auto-downgrade → A.  
**Пороги:** kill из P1 + per-option kills в options.md (заморожены до выбора).

**ВЕРДИКТ:** `HOLD` (ждут выбор владельца)  
**Почему:** Options на столе; без буквы Gate/стратегия преждевременны.  
**Что доказано / чего НЕТ:** доказаны trade-offs ставок; не доказано, какую ставку берёт команда.  
**Следующий тест:** выбор A/B/C/D владельцем → P3 Ensemble (по умолчанию) или сразу P4 если skip MC.

## RUN 2.1 — Owner pick | 2026-11-04

**Вход:** «давай» = принять default P2 (C) + P3 Ensemble.  
**Выбор:** Option **C — Process Theatre + RUZ** (auto-downgrade → A по kills из options.md).  
**ВЕРДИКТ:** `ADVANCE` (к P3)  
**Следующий шаг:** P3 Monte Carlo — failure-modes и N зафиксировать ДО прогона.

## RUN 2.mc — P3 Ensemble | 2026-11-04

**Протокол:** `mc-ensemble/protocol.md` (N=8, FM×5, хрупкость ≥40% — заморожено до прогона).  
**Выбор:** Option C.  
**Исходы (sim):** survive 2/8; FM_host×2; FM_pdf×1; FM_scope×1; FM_crowd×1; FM_brief×1. Ни один FM не ≥40% при разведённых семенах; качественно — 5 классов смерти.

**ВЕРДИКТ:** `HOLD`  
**Почему:** ансамбль дал карту митигаций R1–R5, не proof победы.  
**Что доказано / чего НЕТ:** доказаны (в sim) чувствительности host/pdf/scope; НЕ доказан реальный балл жюри.  
**Следующий шаг:** P4 Gate — strategy-product + strategy-comms + план проверки под C+R1–R5.

## RUN 2.mc.1 — reconcile trials | 2026-11-04

Параллельные writers перезаписали `trials/001–008`. Канон = файлы на диске. Пересчитан `aggregate.md`: survive 1/8; FM_host/pdf/scope по 2/8. Вердикт P3 без смены: `HOLD` (sim ≠ validation). Mitigations R1–R5 держатся.

## RUN 3 — P4 Gate | 2026-11-04

**Вход:** Option C + MC mitigations R1–R5.  
**Артефакты:** `strategy-product.md`, `strategy-comms.md`, `plan-verification.md`, `decision-log.md` (draft).  
**Профиль:** product-strategy → prod+comms, не startup VALIDATE.

**ВЕРДИКТ:** `HOLD`  
**Почему:** стратегия собрана; финальное слово за владельцем (утвердить decision-log). Симуляция по-прежнему ≠ валидация приза.  
**Что доказано / чего НЕТ:** доказан согласованный план исполнения C; не доказан балл жюри.  
**Следующий самый дешёвый тест:** R3 scope lock + R1 host stub сегодня–завтра (≤500₽) → затем P5 Field = билд по плану / либо «ок» на decision-log.

## RUN 3.1 — Owner confirm | 2026-11-04

**Вход:** «ок» на P4 / decision-log.  
**Решение:** Option C canonical; R1–R5 обязательны; усилители = narrative seeds + (status theater XOR AI draft).  
**ВЕРДИКТ:** `ADVANCE`  
**Почему:** человек утвердил стратегию; следующий слой = исполнение (P5 Field / билд).  
**Следующий самый дешёвый тест:** R3 scope lock в репо + R1 host stub (сегодня–завтра).

## RUN 3.2 — Owner delta pre-build | 2026-11-04

**Вход:** (1) in-product ИИ = имба (2) боли student/teacher/deanery зафиксировать и продвигать (3) 100% от критериев + дубль (4) CLAUDE.md в формате агента.

**Изменение scope:** AI1–AI3 → Y; status theater остаётся; criteria-first + PAINS канон. ADR 0001.

**ВЕРДИКТ:** `ADVANCE`  
**Артефакты workspace:** `CLAUDE.md`, `docs/CRITERIA.md`, `docs/PAINS.md`, `docs/AI_FEATURES.md`, `SCOPE.md` обновлён.

## RUN 3.3 — Owner ops model | 2026-11-04

**Согласовано:**
1. Кр.1 = опросник в группу + ФГ студентов
2. Кр.2 = только ИИ + process-log; `/idea` задокументирован
3. Кр.3 = sign-off Романа
4. Кр.4 = жёсткий CLAUDE.md (практики steel-barrel/fin-model)
5. CHANGELOG + docs/releases параллельно PDF

**ВЕРДИКТ:** `ADVANCE`
