# @dekanat/mobile

Expo Router (студент): Сегодня · Неделя · Оценки · Заявки · Лента.

Тема: ink / cream / copper. Auth JWT в SecureStore (`lib/auth-store`), API через `EXPO_PUBLIC_API_URL` + Bearer.

## Запуск

Из корня монорепо (предпочтительно):

```bash
pnpm install
pnpm --filter @dekanat/shared build
EXPO_PUBLIC_API_URL=http://localhost:3001 pnpm --filter @dekanat/mobile dev
```

Или из пакета:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:3001 pnpm dev
```

API должен слушать тот же хост/порт (для устройства — LAN IP, не `localhost`).

Демо: `anna.risk@demo.local` / `Demo123!`

Проверка типов: `pnpm --filter @dekanat/mobile typecheck`

## Android APK

Сборка APK — скриптом в корне репозитория:

```bash
./scripts/build-android-apk.sh
```

(Скрипт может добавляться/уточняться соседними задачами; смотрите его help/комментарии.)

## Дисклеймер

В UI есть пометка: концепт MGIMO×AI Challenge, не официальный сервис вуза.
