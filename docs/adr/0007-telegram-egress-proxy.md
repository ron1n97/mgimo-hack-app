# 0007. Telegram egress proxy for RU VPS

## Статус
Принято

## Дата
2026-11-09

## Контекст
`api.telegram.org` недоступен с российского VPS (таймауты на все IP Telegram). Cloudflare WARP на хосте не регистрируется (WARP API). Бот на VPS без исходящего канала к Bot API молчит.

## Решение
1. Бот ходит в Telegram только через `TELEGRAM_PROXY` (HTTP CONNECT, `undici.ProxyAgent`).
2. На VPS бот в `network_mode: host`, прокси по умолчанию `http://127.0.0.1:40000`.
3. Порт `:40000` — reverse SSH tunnel с рабочей машины разработчика (Mac) + локальный HTTP-прокси (`gost`), KeepAlive через LaunchAgent `com.dekanat.tg-egress`.
4. Когда появится стабильный egress на самом VPS (WARP/внешний HTTP-прокси вне РФ) — достаточно сменить `TELEGRAM_PROXY`, код бота не трогаем.

## Последствия
- Пока Mac не онлайн / LaunchAgent не запущен — бот на VPS не может поллить Telegram.
- Не хранить bot token в логах прокси; туннель слушает `0.0.0.0:40000` только пока нужен демо-стенд (при необходимости ограничить firewall).
