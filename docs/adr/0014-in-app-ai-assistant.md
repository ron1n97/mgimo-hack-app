# 0014. In-app AI assistant + widget DSL

## Статус
Принято

## Дата
2026-11-11

## Контекст
Telegram-бот на RU VPS часто ломается из‑за блокировок `api.telegram.org` (см. также egress-proxy). Нужна **in-product** поверхность: чат в web UI с теми же фактами кабинета, что AI1–AI3 и bot/MCP. FAQ без состояния = запрещён как единственный ИИ.

## Решение
1. `POST /ai/chat` (JWT) — JSON turn: история + ответ ассистента; `source: zcode|stub` как у draft.
2. Role-scoped system prompt (`STUDENT` / `STAFF` / `ADMIN`; `TEACHER` — совместимый промпт до появления роли в main) + read-only tools: today / schedule / grades|tasks / requests.
3. **Widget DSL** в ответе модели: UI парсит теги в интерактивные карточки со ссылками на маршруты кабинета.
4. Web: floating button + bottom sheet (mobile-first). Не заменяет Telegram и не тянет полный MCP/HITL write-loop.

### DSL (канон)
```
{{widget:KIND|id=...|title=...|time=...|status=...|href=...}}
```
Шорткаты: `[[lesson:id=...]]`, `[[request:id=...]]`, `[[grade:id=...]]`, `[[task:id=...]]`, `[[event:id=...]]`, `[[today]]`, `[[schedule]]`.

`KIND`: `lesson` | `task` | `grade` | `event` | `request` | `today` | `schedule` | `notification`.

## Последствия
+ Чат работает там, где web/API доступны, без Telegram egress.
+ Виджеты ведут в уже существующие экраны — меньше «стена текста».
− Write-tools с HITL остаются в боте; in-app MVP — чтение + навигация.
− Парсер должен быть толерантен к «кривому» markup модели (fallback = plain text).
