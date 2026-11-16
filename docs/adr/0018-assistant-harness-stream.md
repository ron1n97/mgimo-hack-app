# 0018. Assistant harness NDJSON stream

## Статус
Принято

## Дата
2026-11-16

## Контекст
In-product chat (ADR 0014) вызывал LLM синхронно: UI показывал фейковые «думаю»-шаги и выдавал ответ целиком. Жюри и dogfood требуют harness-UX: конкретные tool-шаги в реальном времени и набор текста ответа, а не общий спиннер.

## Решение
- `completeChatTurn` эмитит `ChatStreamEvent`: `step` (running/done) для model-раунда и каждого tool, затем `assistant` + `done`.
- `POST /ai/chat/stream` отдаёт NDJSON (`application/x-ndjson`) с flush по строке; `POST /ai/chat` остаётся JSON-снэпшотом (те же `steps`).
- Web `streamAiChat` читает поток, обновляет live steps; `AssistantReveal` печатает финальный текст typewriter’ом, затем рендерит markdown/виджеты.

## Последствия
- Прокси не должны буферизовать весь ответ (нужен flush / без gzip-буфера на stream path).
- Токенный стрим от Z Code не обязателен для v1: шаги честные, набор текста — клиентский; token stream можно добавить позже без смены event-контракта.
