# Демо-стенд: аккаунты и быстрый вход

Неофициальный кабинет для хакатона. Все ФИО и почты вымышленные.

## Быстрый вход (кнопки на странице входа)

На `/` появляются кнопки вроде «Войти как студент Рискова», если API
разрешил demo quick-login. Клиент вызывает `POST /auth/demo-login` с
`personaId` — **пароли в JS-бандл не попадают**.

| personaId | Кнопка | Почта (seed) | Роль в UI |
|-----------|--------|--------------|-----------|
| `student-anna` | Войти как студент Рискова | `anna.risk@demo.local` | студент (риск / долги) |
| `student-boris` | Войти как студент Спокойный | `boris.ok@demo.local` | студент |
| `student-roman` | Войти как студент Гуськов | `roman.guskov@demo.local` | студент |
| `teacher-ivanova` | Войти как преподаватель Иванова | `teacher@demo.local` | сотрудник (кафедра; до `Role.TEACHER`) |
| `staff-elena` | Войти как сотрудник Деканатская | `staff@demo.local` | сотрудник деканата |
| `admin-platform` | Войти как администратор | `admin@demo.local` | админ |

Пароль для обычного входа по почте (не через кнопки): `Demo123!`

## Как включить на demo VPS

В `/opt/mgimo-hack-app/.env` (или GitHub secret `PROD_ENV`):

```bash
DEMO_QUICK_LOGIN=true
# опционально, если хотите явно пометить фронт при следующем билде:
NEXT_PUBLIC_DEMO_LOGIN=1
```

Затем перезапуск API (кнопки подтянутся с `GET /auth/demo-personas` без
обязательного rebuild web):

```bash
cd /opt/mgimo-hack-app
docker compose up -d api
# если teacher@ ещё нет в БД:
docker compose exec api node -e "console.log('prefer: pnpm --filter @dekanat/api seed:extras')"
```

Локально / `NODE_ENV!==production` быстрый вход **включён по умолчанию**.
В production без флага — **выключен** (`403` на `/auth/demo-login`).

Явно выключить даже в dev: `DEMO_QUICK_LOGIN=false`.

## Seed

```bash
pnpm --filter @dekanat/api seed
# или донаполнить без полного wipe:
pnpm --filter @dekanat/api seed:extras
```

## API

- `GET /auth/demo-personas` → `{ items: [{ id, buttonLabel, roleHint }] }`
- `POST /auth/demo-login` body `{ "personaId": "student-anna" }` → тот же JWT, что у `/auth/login`
