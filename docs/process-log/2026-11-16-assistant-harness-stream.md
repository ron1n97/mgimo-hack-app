# 2026-11-16 — Assistant harness stream

## Промпт / запрос
Dogfood: thinking/output ассистента не как harness — нужен набор текста в реальном времени и **конкретные** шаги (tools), а не generic «думаю».

## Что сделали
1. `ai-chat.ts`: `onEvent` + `ChatStep` labels для model/tool; emit running→done.
2. Nest `POST /ai/chat/stream` NDJSON.
3. Web: `streamAiChat`, live `AssistantThinking` steps, `AssistantReveal` typewriter.
4. ADR 0018, тесты `ai-chat.spec` / auth.

## Фейлы
- Первая UX-итерация с фейковыми шагами отклонена владельцем — заменена на реальные tool/model events.
