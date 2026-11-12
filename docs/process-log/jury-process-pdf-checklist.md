# Чеклист PDF сдачи для жюри (критерий 2 — нейротехнологии)

Источник требований: бриф жюри + [`docs/CRITERIA.md`](../CRITERIA.md) §2.  
**Черновик PDF:** [`jury-process-draft-2026-11-12.md`](./jury-process-draft-2026-11-12.md) → [`jury-process-draft-2026-11-12.pdf`](./jury-process-draft-2026-11-12.pdf).

Связанный след домена расписания: [`2026-11-11-ruz-domain-and-jury-process.md`](./2026-11-11-ruz-domain-and-jury-process.md).

---

## Разделы PDF (обязательные по брифу)

### 1. Проблема студентов и выбор разделов

- [x] Проблема студентов своими словами (из [`docs/PAINS.md`](../PAINS.md)) — в черновике
- [x] Почему эти разделы кабинета (связь боль → экран) — в черновике
- [ ] Что узнали у однокурсников: опрос / фокус-группа
  - Статус R-SURVEY / R-FG: см. [`docs/questions.md`](../questions.md) — **Q1 / Q1b всё ещё open**
  - Черновик опроса: [`docs/research/survey-draft.md`](../research/survey-draft.md)
- [x] Честно: FG/опрос не закрыты — в черновике явно, без выдуманных результатов

### 2. Полный перечень ИИ-инструментов / IDE / сервисов

| Инструмент / сервис | Зачем (черновик) | В PDF? |
|---------------------|------------------|--------|
| Cursor (агенты / Composer) | Основная среда вайб-сборки | [x] |
| Скилл `/idea` | Стратегия до кода (P0–P4) | [x] |
| ironring / worktrees | Изоляция фич, merge на main | [x] |
| Z Code (OpenRouter-compatible) | In-product AI1–AI4 | [x] |
| Docker / Compose / GHCR / VPS | Имплементация и выкладка | [x] |
| Caddy / sslip.io | HTTPS live | [x] |
| RUZ `ruz.mgimo.ru` | Живое расписание (не ИИ, но в процессе) | [x] |
| OR-Tools CP-SAT (research only) | Постановка авторасписания, **без кода в MVP** | [x] |
| gstack / browse / прочие QA | По факту использования | [x] |
| Next / Expo | Web/PWA + mobile | [x] |
| Telegram bot | **Отменено** owner 2026-11-12 — не поверхность сдачи | [x] (как cancelled) |

### 3. Ключевые промпты и диалоги по этапам / фичам

- [x] Этап 0 — `/idea` → strategy (`docs/process-log/2026-11-04-strategy-idea-skill.md`)
- [x] Scaffold / build start (`2026-11-08-build-start.md`)
- [x] Competitive research (`2026-11-08-competitive-research.md`)
- [x] Ironring batch фич (`ironring-batch-2026-11-10-11.md`)
- [x] RUZ-домен + матмодель (`2026-11-11-ruz-domain-and-jury-process.md`)
- [x] Удачные промпты: короткие цитаты owner + что сделал агент (сжато в черновике)
- [x] Неудачные: честные фейлы (MC overwrite, RUZ конфликты, Wish, tip-cut/OOM)
- [ ] Расширить цитаты промптов до «verbatim якорей» перед финальной сдачей

### 4. Скриншоты пути: идея → макет → кабинет

- [ ] Идея / стратегия (vault или хаб ideas)
- [ ] Ранний UI / wire (если есть)
- [ ] Сегодня: студент (сегодня/расписание/заявки)
- [ ] Сотрудник / преподаватель
- [ ] Mobile / PWA
- [ ] Удачные кадры + 1–2 «как ломалось» (error/empty, если уместно)

### 5. Вход, хранение данных, защита — простыми словами

- [x] Регистрация / login / JWT (без секретов в PDF)
- [x] Только вымышленные ПДн; demo accounts
- [x] IDOR: «видишь только своё» (демо-сценарий)
- [x] Пароли bcrypt/argon2; секреты в `.env`
- [x] Дисклеймер: не офиц. сервис вуза
- [ ] Owner sign-off кр.3 явно в финальном PDF

Указатель: [`docs/DEMO.md`](../DEMO.md), ADR auth, owner sign-off кр.3.

### 6. Этапы, сделанные вручную (owner)

- [x] Ребут / доступ VPS, DNS, HTTPS (Caddy / sslip.io)
- [x] Demo accounts и seed
- [ ] Sign-off «можно жюри» (критерий 3)
- [x] LLM ключ на VPS; Telegram-поверхность **отменена** 2026-11-12

---

## Откуда собирать сырьё

| Путь | Что взять |
|------|-----------|
| `docs/process-log/*` | Хронология, фейлы, инструменты |
| `docs/process-log/ironring-batch-2026-11-10-11.md` | Сводка ночного батча фич |
| `docs/DEMO.md` | Скрипт жюри + аккаунты |
| `CHANGELOG.md` / `docs/releases/` | Что реально shipped |
| `docs/PAINS.md` + `docs/research/` | Боли и исследования |
| `docs/AI_FEATURES.md` | In-product AI |
| `docs/research/timetable-optimization-model.md` | Доказательство глубины ИИ-постановки (модель, не солвер) |
| `CLAUDE.md` / `SCOPE.md` | Инструкции агентам = «проработка файлов для ИИ» |

---

## Definition of done для финального PDF

- [ ] Все 6 разделов брифа заполнены (скриншоты + FG)
- [x] Есть и удачи, и фейлы (в черновике)
- [x] Нет реальных секретов / боевых ПДн / лого вуза
- [x] Явная связь с критериями 1–4
- [x] Черновой экспорт PDF (`jury-process-draft-2026-11-12.pdf`)
- [ ] Финальный PDF сдачи после survey/FG + скринов + owner sign-off

Дата каркаса: 2026-11-11 · черновик PDF: 2026-11-12.
