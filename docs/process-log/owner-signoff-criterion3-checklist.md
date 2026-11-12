# Owner sign-off — критерий 3 (имплементация)

**Продукт:** Деканат+ · MGIMO×AI Challenge  
**Live:** https://dekanat.177.177.212.34.sslip.io · API https://api.dekanat.177.177.212.34.sslip.io  
**Дата черновика:** 2026-11-12  
**Кто закрывает кр.3:** Гуськов Роман (owner)  
**Собрал агент:** автоматические проверки + скриншоты; **финальная галочка только у Романа**.

Легенда статусов:

| Метка | Значение |
|-------|----------|
| ✅ AGENT | Проверено агентом на live 2026-11-12 |
| ⬜ ROMAN | Нужен глаз / клик owner |
| ❌ SKIP | Вне сдачи (Telegram отменён) |

---

## 1. Прототип открывается и работает

| # | Проверка | Статус | Доказательство / заметка |
|---|----------|--------|---------------------------|
| 1.1 | Web `/` отдаёт 200, форма входа + demo quick-login | ✅ AGENT | `curl` 200; скрин `screenshots/2026-11-12/login-demo-mobile.png` |
| 1.2 | API `/auth/demo-personas` 200, 6 persona | ✅ AGENT | student×3, teacher, staff, admin |
| 1.3 | Demo-login `student-anna` → JWT + `/today` | ✅ AGENT | UI + API; скрин `today-mobile.png`, `today-desktop.png` |
| 1.4 | Расписание группы 2МЭО-01 на неделе | ✅ AGENT | `schedule-mobile.png` (подгруппы RUZ) |
| 1.5 | Клубы: каталог ≈97 | ✅ AGENT | API count **97**; `clubs-mobile.png` |
| 1.6 | Staff очередь заявок (`staff-elena`) | ✅ AGENT | `staff-requests-mobile.png` — очередь Борис/Анна |
| 1.7 | In-product AI chat отвечает с дисклеймером | ✅ AGENT | `ai-chat-mobile.png`; API smoke ранее `source: zcode` |
| 1.8 | Happy-path глазами жюри (2–3 мин) | ⬜ ROMAN | Пройти login → сегодня → пары → клубы → AI → staff |

---

## 2. Mobile viewport / телефон

| # | Проверка | Статус | Доказательство / заметка |
|---|----------|--------|---------------------------|
| 2.1 | Web PWA / узкий viewport 390×844 | ✅ AGENT | Пакет скринов `*-mobile.png` |
| 2.2 | Desktop layout (топ-навигация) | ✅ AGENT | `today-desktop.png` |
| 2.3 | Expo app против live API | ⬜ ROMAN | Команды: `docs/process-log/2026-11-12-mobile-expo-live-dogfood.md` |
| 2.4 | Store-ready / APK на устройстве | ⬜ ROMAN | Не блокер стенда web; по желанию `./scripts/build-android-apk.sh` |

---

## 3. Security / изоляция (IDOR) и секреты

| # | Проверка | Статус | Доказательство / заметка |
|---|----------|--------|---------------------------|
| 3.1 | Чужую заявку студент не читает | ✅ AGENT | Boris `GET /requests/{annaId}` → **404** `Request not found`; у Бориса в списке только своя |
| 3.2 | Demo quick-login без паролей в бандле | ✅ AGENT | UI: «пароли в приложение не попадают»; `POST /auth/demo-login` + personaId |
| 3.3 | Секреты не в git (`.env` / ZCODE) | ✅ AGENT | Live smoke ключ только на VPS (ранее); в репо `.env.example` |
| 3.4 | CORS для web + Expo localhost | ✅ AGENT | `Origin: https://dekanat…` и `http://localhost:8081` / `http://127.0.0.1:8081` → allow |
| 3.5 | Ручной IDOR / чужой профиль / staff-only | ⬜ ROMAN | Spot-check в UI: студент не видит `/staff/requests` |
| 3.6 | Нет боевых ПДн / лого вуза | ⬜ ROMAN | Вымышленные demo ФИО; визуально нет логотипа МГИМО |

---

## 4. Demo-аккаунты

Источник: `docs/DEMO.md`. Пароль email-login: `Demo123!` (не для кнопок).

| personaId | Ожидание | Статус |
|-----------|----------|--------|
| `student-anna` | Студент, долги/риск, группа 2МЭО-01 | ✅ AGENT (UI+API) |
| `student-boris` | Студент, своя заявка «справка» | ✅ AGENT (API list) |
| `student-roman` | Студент Гуськов | ⬜ ROMAN (кнопка на `/` есть) |
| `teacher-ivanova` | Кабинет преподавателя | ⬜ ROMAN (persona в API; UI-кнопка на login) |
| `staff-elena` | Очередь заявок | ✅ AGENT (UI) |
| `admin-platform` | Админ | ⬜ ROMAN |

`DEMO_QUICK_LOGIN` на live включён (кнопки видны).

---

## 5. Дисклеймер и бриф

| # | Проверка | Статус | Доказательство / заметка |
|---|----------|--------|---------------------------|
| 5.1 | Баннер: неофициальный кабинет + RUZ | ✅ AGENT | На всех снятых экранах верхняя тёмная полоса |
| 5.2 | Дисклеймер ответа ИИ | ✅ AGENT | «…не официальная позиция вуза» на `ai-chat-mobile.png` |
| 5.3 | HTTPS / доступ из РФ без VPN | ⬜ ROMAN | sslip.io live; owner подтверждает R1 с телефона в РФ |
| 5.4 | Telegram-бот в сдаче | ❌ SKIP | Owner 2026-11-12: поверхность отменена |

---

## 6. Решение owner

```
[ ] Кр.3: можно показывать жюри (web/PWA)
[ ] Замечания перед показом: _______________________________
[ ] Дата / подпись: _______________
```

Пока чеклист **не подписан** — в PDF жюри писать «sign-off в очереди у owner», не «готово на 10/10».

---

## Артефакты рядом

- Скриншоты: `docs/process-log/screenshots/2026-11-12/`
- Черновик PDF: `jury-process-draft-2026-11-12.md` / `.pdf`
- Mobile dogfood: `2026-11-12-mobile-expo-live-dogfood.md`
