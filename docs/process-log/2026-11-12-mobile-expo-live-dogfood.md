# Mobile Expo → live API (dogfood)

**Дата:** 2026-11-12  
**Цель:** понять, может ли `apps/mobile` бить в публичный API без Telegram и без tip-cut VPS.  
**Статус:** конфиг/CORS проверены агентом; полный Expo-run на устройстве — **за owner**.

## Вывод

Да, mobile **может** указывать на live API:

- URL резолвится из `EXPO_PUBLIC_API_URL` → иначе `expo.extra.apiUrl` → иначе `http://localhost:3001`  
  (`apps/mobile/lib/api.ts`, `apps/mobile/app.json`).
- Live CORS пропускает `http://localhost:8081` и `http://127.0.0.1:8081` (OPTIONS `/auth/login` → 204 + `access-control-allow-origin`).
- Auth: JWT в SecureStore; demo email `anna.risk@demo.local` / `Demo123!` (см. `docs/DEMO.md`).  
  Кнопки demo quick-login — на web; в mobile пока email/password.
- HTTPS live (`https://api.dekanat.177.177.212.34.sslip.io`) подходит для iOS ATS; отдельный cleartext localhost на устройстве не нужен.

Агент **не** поднимал долгий `expo start` (интерактивный Metro / QR) — только `npx expo --version` → `0.22.28`.

## Команды для owner (быстрый dogfood)

Из корня монорепо:

```bash
pnpm install
pnpm --filter @dekanat/shared build

EXPO_PUBLIC_API_URL=https://api.dekanat.177.177.212.34.sslip.io \
  pnpm --filter @dekanat/mobile dev
```

Или:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://api.dekanat.177.177.212.34.sslip.io pnpm dev
```

Дальше:

1. Открыть Expo Go (телефон в той же сети) или симулятор по QR / `i` / `a`.
2. Войти: `anna.risk@demo.local` / `Demo123!`.
3. Проверить Сегодня / Неделя / оценки / заявки; убедиться, что данные совпадают с web live.
4. При ошибке сети — смотреть, что URL именно **api.**dekanat…sslip.io (не web-хост).

Опционально web-preview Expo:

```bash
EXPO_PUBLIC_API_URL=https://api.dekanat.177.177.212.34.sslip.io \
  pnpm --filter @dekanat/mobile exec expo start --web
```

APK (если нужен офлайн стенд):

```bash
./scripts/build-android-apk.sh
```

## Не делать в этом прогоне

- Не менять default `app.json` `apiUrl` на live в git без ADR (ломает локальный docker API).
- Не стартовать Telegram / bot.
- Не tip-cut VPS ради mobile.

## Блокер для «store-ready»

Store listing / иконки / privacy — вне текущего среза. Для жюри достаточно web/PWA + опциональный Expo dogfood.
