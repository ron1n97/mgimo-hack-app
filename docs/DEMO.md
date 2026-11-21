# Демо-стенд: аккаунты и быстрый вход

Неофициальный кабинет для хакатона. Все ФИО и почты вымышленные.

## Быстрый вход (кнопки на странице входа)

На `/` появляются кнопки вроде «Войти как студент Рискова», если API
разрешил demo quick-login. Клиент вызывает `POST /auth/demo-login` с
`personaId` — **пароли в JS-бандл не попадают**.

| personaId | Кнопка | Почта (seed) | Роль / привязка |
|-----------|--------|--------------|-----------------|
| `student-anna` | Войти как студент Рискова | `anna.risk@demo.local` | студент МЭО · `2МЭО-01` · подгруппа `501` · риск/долги |
| `student-boris` | Войти как студент Спокойный | `boris.ok@demo.local` | студент МЭО · `2МЭО-02` · подгруппа `602` |
| `student-roman` | Войти как студент Гуськов | `roman.guskov@demo.local` | студент МЭО · `2МЭО-01` · подгруппа `501` |
| `student-kirill` | Войти как студент Орлов (МЭО) | `kirill.meo@demo.local` | студент МЭО · `4МЭО-01` · подгруппа `804` |
| `staff-elena` | Войти как сотрудник Соколова | `staff@demo.local` | сотрудник деканата МЭО |
| `admin-platform` | Войти как администратор | `admin@demo.local` | админ |

Пароль для обычного входа по почте (не через кнопки): `Demo123!`

### Профиль студента

Направление, программа, курс, учебная группа и языковая подгруппа —
**read-only** в ЛК (данные из seed / «базы»). Расписание берётся по
`groupRuzId` + `preferredSubGroupOids`. Сотрудник/админ по-прежнему
может выбрать любую группу для просмотра.

### Дайджест клубов

Где смотреть:
1. **`/today` («Сегодня»)** — блок «Клубы сегодня» + карточка «Недельный дайджест».
2. **`/clubs` («Клубы»)** — вкладка **«Дайджест»** по умолчанию (сегодня / неделя /
   лента по интересам); каталог клубов — отдельная вкладка, не под бесконечным списком.

Источники ленты:
- Seed `Дайджест: …` / демо-stubs (MSK-неделя) — ADR 0016.
- Live TG: публичные каналы `t.me/s/…` (ADR 0017). Staff → `/staff/clubs` →
  «Стянуть посты из Telegram» (JWT), либо worker cron / `pnpm digest:tg`.
- Live VK: опционально при `VK_SERVICE_TOKEN` (PENDING → модерация).

После успешного TG-ingest seed-stubs `Демо:…` уходят в REJECTED.

### PWA-баннер «Установить»

Нативного `beforeinstallprompt` Chrome **часто нет** (уже установлено / критерии
installability / не Chrome / iOS). In-app подсказка «Установить приложение» —
сверху справа на кабинете и на экране входа (через ~2.5 с). iOS: «Поделиться» →
«На экран Домой». Снести sessionStorage `dekanat_pwa_install_dismissed`, если жали «Позже».

### Сброс на логин

JWT в `localStorage` (не cookie). Старый SW `dekanat-web-v2` кэшировал cross-origin
API **401** без Authorization → после входа клиент чистил сессию. С `dekanat-web-v3`
API/HTML не кэшируются. Если всё ещё кидает на `/`: hard refresh / «Unregister» SW.

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
# донаполнить студентов без wipe:
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

Полный seed создаёт ~5 вымышленных студентов с разных факультетов/групп
и stub-события клубов (сегодня + неделя).

## API

- `GET /auth/demo-personas` → `{ items: [{ id, buttonLabel, roleHint }] }`
- `POST /auth/demo-login` body `{ "personaId": "student-anna" }` → тот же JWT, что у `/auth/login`
