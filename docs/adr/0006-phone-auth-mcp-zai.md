# 0006. Phone auth for Telegram + MCP cabinet tools + z.ai

## Статус
Принято

## Дата
2026-11-08

## Контекст
Нужен ИИ-бот с действиями от имени аккаунта; Hermes уже использует z.ai Coding Plan (`glm-5.3`). Пароль в чате плох; контакт Telegram даёт номер.

## Решение
1. `User.phoneE164` + `telegramId`; `POST /auth/login-phone`.
2. LLM: `ZCODE_*` → `https://api.z.ai/api/coding/paas/v4`, model `glm-5.3`.
3. Общий пакет `@dekanat/cabinet-tools` + stdio MCP `@dekanat/mcp` + Telegram agent с tool-calling.
4. Отдельный `TELEGRAM_BOT_TOKEN` (не токен Hermes gateway).

## Последствия
+ Единая поверхность tools для бота и IDE.
+ Auth без пароля в Telegram при привязанном телефоне.
− Нужен выделенный BotFather-бот; демо-телефоны вымышленные.
