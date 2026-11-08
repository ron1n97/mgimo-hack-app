# Build brief — что нужно от владельца, чтобы агенты собрали «взрослое» приложение

Дата: 2026-11-08 · статус: **ждём ответы** (без них стартуем на дефолтах ниже и риск scope creep к дедлайну 22.11).

## Уже известно (не надо повторять)

- Бриф конкурса + критерии + Option C+ + AI1–3 + PAINS.
- **МГИМО RUZ публичный JSON API жив:**  
  `GET https://ruz.mgimo.ru/api/search?term=…&type=group|lecturer`  
  `GET https://ruz.mgimo.ru/api/schedule/group/{id}?start=YYYY.MM.DD&finish=YYYY.MM.DD`  
  (проверено curl 2026-11-04 и 2026-11-08). Это тот же класс, что RUZ у ФУ/ВШЭ; Дневач/Кампус берут вузы из разных источников (сайт / 1С / Галактика / Excel) — **для МГИМО нам Дневач не нужен**, есть прямой RUZ.
- Команда: Роман + Максим; репо private; сдача 22.11.

## Дефолт архитектуры (если не возражаешь — так и делаем)

```
[ PWA (Next.js) ]     [ Telegram bot ]
         \               /
          \             /
        [ API Gateway / BFF ]
                  |
     +------------+------------+
     | Postgres | Redis | MinIO? |
     +------------+------------+
     | workers: ruz-sync, notify, ai |
     +-------------------------------+
              Docker Compose (prod-like)
              CI → registry → host (Timeweb/YC)
```

| Слой | Дефолт |
|------|--------|
| Frontend | Next.js App Router → **PWA** (manifest + service worker) |
| API | NestJS или FastAPI (одно; ADR при старте) |
| Auth | email/login + password (argon2) · JWT access + refresh · httpOnly cookies для web · отдельный bot deep-link token |
| DB | **PostgreSQL** (не SQLite) |
| Cache/queue | Redis + worker для sync RUZ / уведомлений |
| Bot | Telegram Bot API (aiogram/grammy) |
| Infra | `docker compose` · multi-service · `.env.example` · **без ручного SSH-ритуала**: один `compose up` / CI deploy |
| RU host | Timeweb Apps / Yandex Cloud VM+compose + mirror |
| AI | серверный провайдер (ключ в env); mock fallback |

**Не в v1 конкурса (если не скажешь иное):** native iOS/Android stores, Kubernetes, multi-region, SSO МГИМО, реальные ПДн, парсинг Дневач.

---

## Что дописать тебе (скопируй блок и заполни)

### 1. Цель версии
- [ ] **A.** Contest-winning v1 к 22.11 (полноценная архитектура, но узкий продукт)  
- [ ] **B.** Contest + задел «платформа» (лишние поверхности только если не рвут дедлайн)  
- [ ] **C.** Игнор дедлайна / долгий продукт  

Выбор: ___

### 2. Поверхности (отметь Y/N)
| Поверхность | Y/N | Коммент |
|-------------|-----|---------|
| Web PWA | | |
| Telegram bot | | |
| «Все платформы» = PWA + bot достаточно? | | |
| Native apps (Expo) | | обычно N до 22.11 |
| Кабинет сотрудника | | |
| Админка | | |

### 3. Хостинг / доступ
- Провайдер: Timeweb / Yandex Cloud / другой: ___  
- Кто платит картой и создаёт аккаунт: Роман / Максим  
- Домен (если есть) или `*.timeweb…`: ___  
- Нужен ли CI (GitHub Actions → auto deploy): да / нет  

### 4. Auth
- Логин: email / student_id / телефон: ___  
- Регистрация открытая (для жюри) или только invite/seed: ___  
- OAuth (Яндекс/VK): да / нет  
- 2FA: нет (дефолт) / да  

### 5. Расписание МГИМО
- Синк: все группы через RUZ search+schedule (worker) — ок? да / нет  
- Частота sync: раз в N часов: ___ (дефолт 6h + on-demand)  
- Хранить историю недель: сколько: ___  
- Offline PWA cache последней недели: да / нет  

### 6. Данные кроме расписания
Оценки / заявки / уведомления в конкурсе = **seed + пользовательский ввод**.  
Нужен ли импорт ещё чего-то открытого: ___ / нет  

### 7. ИИ
- Провайдер: GigaChat / YandexGPT / OpenAI-proxy / только mock: ___  
- Ключ уже есть? куда класть (не в чат): ___  

### 8. Bot сценарии (минимум)
- [ ] Логин / привязка аккаунта  
- [ ] Расписание на сегодня  
- [ ] Статус заявок  
- [ ] Пуш о переносе  
Другое: ___  

### 9. Нефункционалка
- Ожидаемая нагрузка жюри: ~N юзеров ___  
- Целевой RPS / «scalable» = горизонтально API+worker за compose scale? да  
- Логи/метрики: минимум stdout + healthchecks / полноценный Grafana: ___  

### 10. Юр / бриф
- Подтверди: дисклеймер концепта, fake PII, без лого МГИМО, §6 IP при сдаче — ок  
- Реальные студенческие логины/пароли вуза — **запрет** (уже в SCOPE)  

### 11. Разделение с Максимом
- Кто approve PRs: ___  
- Кто владеет хостом/DNS: ___  
- Кто ведёт опрос/ФГ: ___  

---

## Минимальный ответ «одной простынёй», после которого можно гнать агентов

> Версия A к 22.11. Поверхности: PWA + Telegram bot. Стек: Next + Nest/FastAPI + Postgres + Redis + Docker Compose + CI на Timeweb/YC. Auth: регистрация + login/password, JWT. Расписание: полный sync всех групп MGIMO из ruz.mgimo.ru. Оценки/заявки/уведомления — seed+CRUD. AI: &lt;провайдер&gt;. Кабинет сотрудника: нет. Native: нет. Хост оплачивает &lt;кто&gt;. Ключ LLM дам в .env на сервере. Go.

Пока этого текста нет — агенты либо ждут, либо стартуют **строго на дефолтах** с риском переделки.
