# Безопасность Деканат+ (текущее состояние)

Конкурсный концепт, не офиц. сервис вуза. Только вымышленные ПДн. Ниже — фактическая модель на момент релиза, не маркетинговый чеклист.

## Аутентификация и сессии

- Вход: email/password (bcrypt) и demo-persona login для жюри.
- API: JWT Bearer; web хранит токен в `localStorage` (ADR 0005) — удобство демо, не идеал для прод-банковского контура.
- Роли: `STUDENT` | `STAFF` | `ADMIN` | `TEACHER`; guard `JwtAuthGuard` + `RolesGuard` на чувствительных маршрутах.

## Авторизация / IDOR

- Оценки, заявки, задачи студента — фильтр по `userId` / `studentUserId` / `groupRuzId` из JWT, не из query «чужой id».
- Staff queue заявок и PATCH статусов — только `STAFF`/`ADMIN`.
- Карточка студента (ФИО, группа, подгруппа, курс) — PATCH `/admin/students/:id` только staff/admin; студент не может менять эти поля через `/auth/me`.
- Задания преподавателя видны студентам только своей `groupRuzId` (denormalized на `LessonTask`).

## Данные и секреты

- Postgres — source of truth; секреты только в `.env` (см. `.env.example`).
- RUZ — внешний read mirror; локальные правки пар (`source=LOCAL`, `isMoved`/`isCancelled`) не затираются как «офиц. расписание вуза».
- Telegram bot product surface снят; публичный ingest TG/VK для дайджеста — только открытые каналы.

## Уведомления

- In-app лента + Web Push (VAPID). Без `VAPID_*` пуш молча не уходит, лента работает.
- Push kinds: `grade_*`, `digest_*`, `deanery_*`, `schedule_*` (ADR 0013).
- Объявления деканата: `POST /notifications/announce` (staff) → fan-out студентам.

## AI

- Z Code OpenAI-compatible client; ключ из env; stub fallback без ключа.
- Tools role-scoped: студент не получает staff-queue tools; staff не получает чужие оценки через `get_grades`.
- Черновики заявлений — sanitize + ГОСТ-сборка на сервере; не доверяем сырому LLM как «факту».

## Поверхности

- Web/PWA (service worker), mobile Expo, ingest workers.
- CORS/JWT на API; SW версионируется, чтобы не залипать на 401-кэше логина.

## Известные ограничения (честно)

- JWT в localStorage уязвим к XSS — CSP/санитайз UI обязательны при ужесточении.
- Demo login упрощает вход жюри — отключить на любом «почти боевом» стенде.
- VAPID должен быть выставлен на VPS; iOS пуш только после Add to Home Screen.
- Нет полноценного audit log / 2FA / SSO вуза — вне scope хакатона.
