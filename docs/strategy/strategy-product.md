---
type: strategy
idea_slug: digital-dekanat
status: canonical
evidence: mixed
updated: 2026-11-04
---

# Strategy — Product (Option C)

## Playing to Win

| | |
|--|--|
| **Where to play** | Номинация Вайб-кодинг · прототип ЛК «цифровой деканат» · скин **МГИМО** · аудитория оценки = жюри (не прод-студенты) |
| **How to win** | Max среднего 4×10: полное ядро + один hero-сценарий + forensic ИИ-процесс + RU-uptime + mobile |
| **Отказы** | Dual СамГТУ v1 · LMS/чат как столп · админка сотрудника · generic FAQ-бот · фичи «жалко отдать» по §6 · Vercel/Railway как единственный хост |

## JTBD (для жюри и для студента в демо)

1. **Жюри:** «за 5 минут понять, что это умный концепт деканата, собранный с ИИ, и что он реально работает на телефоне».  
2. **Студент (симулированный):** «увидеть день/учёбу → понять статус → подать справку/заявку без очереди в голове».

## Opportunity → Bet

```
Outcome: топ-3 номинации (avg экспертов)
  └ Opportunities: связный сервис vs фрагменты RUZ/ЛК/чаты; доказать вайб-процесс; доверие (изоляция)
       └ Bet C: Process Theatre + RUZ + PDF-с-D1 + ≤2 усилителя
            └ Assumption tests: R1–R5 (hypotheses-out)
```

## Обязательное ядро (Y) / усилители

**Y (must):** auth+2 профиля · schedule (RUZ + seed fallback) · grades «как дела» · заявки/справки+статус · уведомления · mobile ≥360 · изоляция · дисклеймер концепта · без лого вуза · fake PII.

**Усилители (взять ровно 2):**
1. **Narrative seeds** — student A academic-risk + overdue справка; student B «всё спокойно».  
2. **Status theater** заявок (таймлайн + «почему ждём») **или** in-product AI draft заявки из контекста — **одно** из двух на D9; второе только если буфер.

Security IDOR-check = не «фича», а **демо-шаг** в скрипте (R5).

## Техконтур (рекомендация, не догма)

- **Stack:** Next.js (или аналог) + простая БД (SQLite/Postgres) + session auth; пароли bcrypt/argon2; секреты в env.  
- **Schedule:** клиент/сервер к `ruz.mgimo.ru` + кэш/seed.  
- **Host:** Timeweb Cloud Apps или Yandex Cloud; **mirror** второго URL до экспертизы.  
- **AI in build:** Cursor (+ что ещё команда реально жжёт) — всё в PDF-лог.

Kill-switch → **A (Checklist Floor):** если к D3 нет schedule path (RUZ|seed), или к D10 mobile ядра красный.

## 14-дневный план (календарь от 2026-11-04)

| Дни | Фокус | Owner hint |
|-----|-------|------------|
| D1 | Scope lock 1p · 2 personas · PDF-лог шаблон · репо | оба |
| D2–3 | Auth · профили · изоляция · stub host R1 | Роман код / Максим R1+аккаунты |
| D4–5 | Schedule RUZ+fallback | Роман |
| D6 | Grades + «как дела» | Роман |
| D7–8 | Заявки/статус/уведомления + status theater | оба |
| D9 | ≤1 усилитель (AI draft **или** polish) | Роман |
| D10 | Mobile pass · RU deploy · mirror | Максим хост |
| D11–12 | PDF процесса + видео≤5м | Максим PDF / Роман запись |
| D13 | Hostile QA + R5 checklist | оба |
| D14 | Freeze · сдача капитаном в ЛК (с 8.11 форма) | **Максим** |

Буфер: любые «ещё идеи» только взамен вычеркнутого Y/усилителя.
