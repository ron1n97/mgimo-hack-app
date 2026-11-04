# mgimo-hack-app — Цифровой деканат будущего

MGIMO×AI Challenge · **Вайб-кодинг** · Option C+ (criteria-first · AI imba · pains).

Канон стратегии: `~/ideas/mgimo-hack-app/digital-dekanat/`  
Vault: `/Users/ron1n97/ron1n_vault/ideas/digital-dekanat/`

## Имба (не спорно)

1. Критерии жюри на 100% → `docs/CRITERIA.md`
2. In-product ИИ → `docs/AI_FEATURES.md`
3. Боли стейкхолдеров → `docs/PAINS.md` + исследования → `docs/research/`
4. Всё через ИИ + документация процесса → `docs/process-log/` + PDF сдачи
5. Качество как в боевых репо: TDD, pre-commit, ADR, мелкие коммиты
6. Release log обязательно → `CHANGELOG.md` / `docs/releases/`

## Критерии → кто закрывает

| # | Критерий | Как закрываем |
|---|----------|----------------|
| 1 | Проработанность | Опросник в группу + фокус-группа студентов (`docs/research/`) |
| 2 | Нейротехнологии | Только ИИ-сборка; process-log; скилл `/idea`; in-product AI1–AI3 |
| 3 | Имплементация | **Owner (Роман)** ведёт проверку «работает / mobile / security / аккаунты» |
| 4 | Качество | Дисциплина из этого `CLAUDE.md` + UX/empty/error/loading |

Итог = среднее экспертов ([Регламент §7](https://challenge.mgimo.ai/rules)).

## Scope

`SCOPE.md` = Y/N. Спор → вычеркнуть, не добавить. Kill-switch → A.

---

## Правила работы с проектом (практики боевых CLAUDE.md)

### TDD

Каждая задача с логикой — строго TDD:
1. Написать тест (падает)
2. Реализовать код
3. Убедиться, что тест проходит

Критичные зоны без исключений: auth/изоляция (IDOR), статусы заявок, маппинг RUZ→UI, AI fallback.

### Мелкие коммиты

Частые атомарные коммиты вместо одного «весь кабинет».

### Pre-commit

Когда появится `.pre-commit-config.yaml` — перед коммитом:

```bash
pre-commit run --files <changed...>
# или
pre-commit run --all-files
```

Коммит только если pre-commit зелёный.

### ADR и вопросы

- [`docs/adr/`](docs/adr/) — Architecture Decision Records
- [`docs/questions.md`](docs/questions.md) — открытые вопросы (таблица)

Перед архитектурным предложением — сверка с `docs/adr/`.  
Принял решение в ходе работы — **сам** пишешь/обновляешь ADR, не ждёшь просьбы.

Формат ADR: `docs/adr/NNNN-короткое-название.md`

```markdown
# NNNN. Название

## Статус
Принято / Предложено / Отклонено

## Дата

## Контекст

## Решение

## Последствия
```

### Секреты и данные

- Секреты только `.env` (в git — `.env.example`)
- Только вымышленные ПДн; не боевые системы вуза
- Пароли — bcrypt/argon2

### Хостинг

URL из РФ без VPN до 28.11.2026. Не sole Vercel/Railway. Mirror обязателен. Owner подтверждает R1.

### Process log + релизы

- `docs/process-log/` — промпты, фейлы, инструменты (в т.ч. `/idea`) → PDF
- `CHANGELOG.md` — человеческий перечень релизов
- `docs/releases/vX.Y.Z.md` — детали релиза при необходимости

### Демо

`docs/DEMO.md` — скрипт жюри + аккаунты.

---

## Стек (дефолт)

Next.js App Router + TypeScript · session auth · SQLite/Postgres · RUZ + seed · RU-хост.  
Смена — только ADR.

## Команда

| Роль | Кто |
|------|-----|
| Капитан / сдача | Максим Костюничев |
| Билд + кр.3 sign-off | Гуськов Роман (+ ИИ-агенты) |

## Запрещено до freeze

Dual СамГТУ · LMS-столп · «офиц. сервис МГИМО» · лого вуза · реальные ПДн · FAQ-чат как единственный ИИ.
