# Iron Ring / overnight inventory — 2026-11-10 … 2026-11-11 (UTC+4)

**Режим:** полный инвентарь всего сделанного за двое суток (не только то, что уехало на VPS этой ночью).  
**Продукт:** Деканат+ (mgimo-hack-app) · MGIMO×AI Challenge  
**Repo:** `/Users/ron1n97/projects/stuff/mgimo-hack-app`  
**Base:** `main` · tip: `839557a` (process-log + SoT follow-ups merged)  
**VPS:** `root@177.177.212.34` · `/opt/mgimo-hack-app` · compose `-p dekanat`  
**SSH:** `-i ~/.ssh/mgimo_hack_app_ed25519 -o IdentitiesOnly=yes`  
**Статус файла:** закоммичен; tip-cut **не** сделан — SSH banner timeout 2× (2026-11-11 вечер), live на `demo-stable`.

---

## Оглавление

1. [Summary](#1-summary)
2. [Live URLs](#2-live-urls)
3. [Feature inventory (полный)](#3-feature-inventory-полный)
4. [Deploy status](#4-deploy-status)
5. [Known gaps](#5-known-gaps)
6. [Commits / refs](#6-commits--refs)
7. [Приложения: ADR, миграции, тесты, worktrees, ironring](#7-приложения-adr-миграции-тесты-worktrees-ironring)

---

## 1. Summary

За **2026-11-09 вечер → 2026-11-11 ~02:00 UTC+4** Деканат+ прошёл от «кабинет + CI/Docker бои» до **полного feature-merge на `main`** и **стабильного HTTPS-демо** на бесплатном `sslip.io`.

**Код:** все запланированные feature/fix-ветки ночи слиты в `main` и запушены на GitHub. ADR-коллизии перенумерованы в ряд **0007–0015**. Локальные unit-тесты зелёные (`apps/api` 100, `apps/worker` 16). После merge починен web-build (`cbc6674`). В Unreleased CHANGELOG и короткий process-log уже лежат (`d8ca375`, `956481e`).

**Live VPS:** спокойно держится на пяти контейнерах с **`IMAGE_TAG=demo-stable`** за Caddy LE. С Mac: web **200**, api `/auth/me` **401**. Bot и worker **выключены** ради RAM (~889 MiB). Tip `main` сейчас `839557a` (SoT follow-ups + process-log) **в git/GitHub есть**, на VPS **ещё не нарезан**. Вечерний tip-cut остановлен: SSH `banner exchange` timeout ×2 при живом HTTPS.

**Смысл двух суток одной фразой:** появился полноценный продуктовый срез (расписание с подгруппами, клубы, push, преподаватель, AI-чат, HTTPS, demo-login, Telegram-egress), а прод-стенд намеренно заморожен на стабильном срезе, пока RAM и соло-оператор не позволят спокойный tip-cut.

### Хронология крупными блоками

| Когда (UTC+4) | Что |
|---------------|-----|
| **11-09 ~20:20–23:10** | CI/CD GHCR + `docker save\|ssh load`; Docker Alpine/OpenSSL/Prisma/Nest/`pnpm deploy` bot; UX кабинетов; AI draft honesty + GOST Word; Telegram phone-login UX; bot **off** by default (RF block) |
| **11-10 день/вечер** | Параллельные worktrees: RUZ subgroup/SoT, clubs, push, teacher, liquid-glass, demo-login, in-app AI, HTTPS sslip, Telegram egress+gost |
| **11-11 ~00:20–01:40** | Feature-коммиты + merge storm на `main`; ADR renumber 0007–0015; research timetable md+docx |
| **11-11 ~01:45–02:05** | Web merge fix; process-log; CHANGELOG + note про VPS race |
| **11-11 после tip** | Follow-up SoT (`1a0a073`, `811a64f`) — **влито в main** (`839557a`) |
| **11-11 ночь** | VPS thrash → calm recovery: gentle hold, `chattr -i`, live 200/401 на `demo-stable` |
| **11-11 вечер (дожим)** | Process-log commit; SoT merge+push; tip-cut STOP (SSH timeout); HTTP 200/401; VAPID route на live → 404 |

---

## 2. Live URLs

| Поверхность | URL | Проверка (Mac) |
|-------------|-----|----------------|
| Web / PWA | https://dekanat.177.177.212.34.sslip.io | **HTTP/2 200** (3/3 с интервалом ~10 с) |
| API | https://api.dekanat.177.177.212.34.sslip.io | `/auth/me` → **401** (ожидаемо без JWT) |
| Caddy → upstream | `http://api:3001/auth/me` | **401**, network alias `api` присутствует |

**Домен:** бесплатный `*.sslip.io` по публичному IP `177.177.212.34` · TLS — **Caddy + Let’s Encrypt** (хост-порты только **80/443**).  
**Bake фронта:** `NEXT_PUBLIC_API_URL` / `PUBLIC_API_URL` → HTTPS API sslip (иначе «Сервер недоступен» с браузера).

**Контейнеры на момент proof:** `dekanat-caddy-1`, `dekanat-web-1` (`web:demo-stable`), `dekanat-api-1` (`api:demo-stable`), `dekanat-redis-1`, `dekanat-postgres-1`.  
API log: `Деканат+ API listening on :3001`.  
**Не в core-five:** `bot`, `worker` (RAM; код egress/прокси на `main`).

```text
$ curl -sS -I https://dekanat.177.177.212.34.sslip.io/ | head -5
HTTP/2 200

$ curl -sS -o /dev/null -w '%{http_code}\n' \
  https://api.dekanat.177.177.212.34.sslip.io/auth/me
401
```

---

## 3. Feature inventory (полный)

Ниже — **весь** инвентарь 10–11 ноября (и вечер 9-го как прямой задел), с указанием: ADR · ключевые коммиты · на `main` tip · live `demo-stable`.

### 3.1 Telegram-бот на VPS + TELEGRAM_PROXY / Mac gost SSH -R (RF block)

**Проблема:** с RU VPS `api.telegram.org` таймаутится на все IP; Cloudflare WARP на хосте не встаёт. Без egress бот молчит.

**Решение (ADR 0007, принято 2026-11-09/закоммичено в `4c39c0e`):**
- Бот ходит в Telegram **только** через `TELEGRAM_PROXY` (HTTP CONNECT, `undici.ProxyAgent`).
- На VPS бот в `network_mode: host`, дефолт прокси `http://127.0.0.1:40000`.
- Порт `:40000` = **SSH reverse tunnel** с Mac: локальный **gost** HTTP-прокси `:11080` + `ssh -R 0.0.0.0:40000:127.0.0.1:11080`.
- Keepalive: `scripts/tg-egress-keepalive.sh` + LaunchAgent `com.dekanat.tg-egress`.
- Бинарь `scripts/bin/gost` и `scripts/logs/*` — в `.gitignore`.
- Документация: `docs/DEPLOY.md` § Telegram bot on RU VPS.

**Сопутствующее:**
- `26c8b54` — phone-login UX бота + чистый restart polling.
- `ad05558` — bot **off** в default VPS compose (RU block).
- Docker bot: `526f3ec` / `a660459` — `pnpm deploy --prod` без `--legacy`, чтобы grammy уезжал в runtime.

**Live:** код+ADR на `main`; на текущем calm-стеке bot **не крутится** (RAM). Пока Mac спит / LaunchAgent мёртв — даже при подъёме bot polling не дойдёт до Telegram.

---

### 3.2 Clubs digest: TG/VK/registry xlsx → JSON, теги, подписки (без k-NN)

**ADR 0012** · коммит `bc2329f` · merge `9c9bf7b`.

- Реестр: xlsx → seed-фикстура `apps/api/prisma/data/clubs-registry.json` (**94** клуба; поля `name/category/structure/vk/telegram/website/note`).
- Prisma: `Club` (DRAFT/CONFIRMED, `digestEnabled`), `Tag`/`ClubTag`, `ClubSource` (url unique), `ClubMembership`, `StudentTagSubscription`, `ClubSubscription`, `EventCandidate` + `EventModerationStatus`.
- API: каталог/создание клуба; staff confirm + digest toggle + digest sources; интересы студента; stub `GET /digest/feed?filter=subscribed`.
- **Явно не делали:** ML k-NN / AI-ранжирование / полноценный TG scraper ingest (out of scope среза).
- Web: страница `/clubs` (студенческий таб в liquid-glass nav).

**Выравнивание с концептом коллеги (§9 / ADR 0012):** кандидаты событий (`EventCandidate`) проходят модерацию (`PENDING` → `APPROVED`/`REJECTED`) **до** публикации в афишу/дайджест — stub API уже отражает этот контур, полноценный кабинет коллеги-модератора как отдельный продукт ещё не развёрнут.

**Миграция:** `20261111010000_clubs_digest_tags`.

---

### 3.3 Schedule / RUZ: lessonOid параллели, subgroup preference, SoT DB-else-RUZ, 4-й курс

**ADR 0008** (подгруппы) · **ADR 0009** (SoT) · коммиты `d6b5d49`, `f79e40d` · merge `b8adaef`.

**Параллели и подгруппы:**
- Upsert-ключ: `ruzExternalId = String(lessonOid)` — иначе same-discipline параллели схлопывались.
- На `ScheduleLesson`: `subGroup`, `subGroupOid`, `stream`, `streamOid`.
- В `StudentProfile`: `preferredSubGroupOids[]`; UI выбора после учебной группы.
- `schedule.forUser` / Today фильтруют по предпочтению; `showAll=1` — все параллели с бейджами; пары без `subGroupOid` остаются видимыми.

**SoT (DB-if-present-else-RUZ):**
- Coverage rule: если для `groupRuzId` + date range уже есть ≥1 урок → **DB = SoT**, worker/lazy-pull RUZ не дёргают.
- Miss → lazy pull (API при чтении) или cron sync с `source = RUZ`.
- Per-row: `ScheduleLesson.source` ∈ {`RUZ`,`LOCAL`}; RUZ upsert не затирает существующие (включая LOCAL).

**4-й курс / пустой каталог:**
- Discovery search terms: course-prefixed `1МЭО`…`4МЭО`, `1МО-`…`4МО-` и др. стебли (`apps/worker/src/ruz/search-terms.ts`) — bare «МЭО» упирается в cap ~15 hits / short-string reject.
- Error-dict RUZ **не** трактуется как пустой список (`parse-response`).
- Следствие: пустые 4-курсные группы в каталоге чинятся search/parse + повторным sync/lazy-pull, а не «молча пусто».

**Follow-up ещё не в `main` (ветка `fix/ruz-subgroup-schedule`):**
- `1a0a073` — enrichment подгрупп из RUZ **без** overwrite LOCAL schedules (уточнение ADR 0009).
- `811a64f` — отдельная follow-up миграция `20261111023000_schedule_lesson_source` без переписывания уже применённого SQL.

**Миграция на merge-path:** `20261111001500_schedule_subgroup_preference`.

---

### 3.4 Admin/staff any-group view vs student own group+subgroup; profile role UX

**ADR 0015** · коммиты `8ffa1fb`, `f1f3d51`, `0fe118b`, `544a5b9` (часть в merge path profile) · merge `70b0935` · renumber `65324e2`.

| Роль | Поведение профиля / расписания |
|------|--------------------------------|
| **STUDENT** | Enrollment: факультет / программа / курс / учебная группа + preferred subgroups |
| **STAFF / ADMIN** | `StaffProfile.scheduleGroupRuzId\|Label` — «Группа для просмотра расписания» из каталога `/schedule/groups`; без course/faculty/program/subgroups |
| **TEACHER** | Контакты-only; блок учебной группы скрыт; API режет student enrollment fields (`assertProfileFieldsForRole` на `PATCH /auth/me`) |

Today hub для staff резолвит view-group (`f1f3d51`).  
**Миграция:** `20261111013000_staff_schedule_view_group`.

---

### 3.5 PWA Web Push + phone UI / liquid-glass BottomNav

**Push — ADR 0013** · `6cdf1bb` · merge `b6a764f`:
- SoT уведомлений = Postgres `Notification`; badge/UI читают только её.
- Fan-out MVP = Web Push (VAPID) → `PushSubscription`; SW `push` + `notificationclick`.
- Kinds на MVP: `grade_*`, `digest_*`; без VAPID env — create работает, push silently no-op.
- Phone UI: `PushPrompt`, страница `/notifications`.
- Telegram/Expo mirror — позже (один dispatcher, отдельные каналы).
- **Миграция:** `20261111020000_push_subscription`.
- **Live caveat:** нужны `VAPID_*` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` на VPS; на `demo-stable` наличие tip-кода **не подтверждено**.

**Liquid-glass nav — `db820b6`, `fbaf85e` · merge `1d0a0c3`:**
- `BottomNav` + `nav-items`: 4 role-aware таба (today / schedule|queue / grades|clubs / profile — набор зависит от роли).
- Mobile-first «liquid glass» нижняя панель; harden fallbacks при отсутствии user/role.

---

### 3.6 Teacher cabinet (dean assigns slots → tasks → students)

**ADR 0010** · `50308c2` · merge `35e2ba2`.

- Роль `Role.TEACHER` + `TeacherProfile` (отдельно от STAFF).
- Деканат создаёт `LessonTeacherAssignment` (конкретный `ScheduleLesson` **или** soft-key `groupRuzId`+`discipline`) поверх RUZ-слотов — **без** solver.
- Преподаватель вешает `LessonTask` на своё assignment; студенты читают по `groupRuzId`.
- IDOR: чужой teacher → NotFound; student scoped by group.
- Демо: `teacher@demo.local` / `Demo123!` (+ seed:extras).
- Web: `/teacher`, `/tasks`.
- **Миграция:** `20261111003000_teacher_lesson_assignments`.
- Merge-fix: teacher AI suggestions в `cbc6674`.

**Не в scope:** авторасписание, submission/grading ДЗ, constraint engine.

---

### 3.7 OSS planner research + формальная матмодель (md + docx → Downloads)

**ADR 0011** (статус: **Предложено**) · `fdaa462`.

- Канон: `docs/research/timetable-optimization-model.md` (~497 строк) — множества/индексы, бинарные назначения $x_{a,t,r,p}$, hard/soft, скаляризация $\lambda_k$, open questions (§ вложенность язык/подгруппа и др.).
- GOST `.docx`: `docs/research/timetable-optimization-model.docx` (26 111 байт) · копия для сдачи/чтения: `/Users/ron1n97/Downloads/timetable-optimization-model.docx`.
- Рекомендация решателя: Google **OR-Tools CP-SAT** sidecar/worker (не request-path API).
- **Кода солвера нет** — research only; продуктовый MVP преподавателя сознательно без solver (согласовано с ADR 0010).

---

### 3.8 HTTPS free domain sslip.io + Caddy LE

**Коммит `c84d5ed` · merge `0fd93e0`.**

- Caddyfile: `dekanat.…sslip.io` → `web:3000`, `api.dekanat.…sslip.io` → `api:3001`.
- Auto-HTTPS Let’s Encrypt; volumes `caddy_data` / `caddy_config`.
- Прод-compose: хост слушает только 80/443.
- Blend с telegram host-net при merge HTTPS ветки.
- **Live: ДА, verified** (это главное, что реально горит на VPS сейчас, независимо от tip image tag).

---

### 3.9 Demo quick-login buttons

**Коммит `3264079` · merge `6a2c10d` · `docs/DEMO.md`.**

- `DEMO_QUICK_LOGIN` + `GET /auth/demo-personas` / `POST /auth/demo-login` `{ personaId }` — пароли **не** в JS-бандле.
- Персоны: `student-anna` / `student-boris` / `student-roman` / `teacher-ivanova` / `staff-elena` / `admin-platform`.
- Dev: включено по умолчанию; production: только с флагом (иначе 403).
- На VPS: флаг в `.env` / `PROD_ENV`; UI кнопки тянутся с API без обязательного rebuild web (`NEXT_PUBLIC_DEMO_LOGIN=1` — optional hint в образе).

---

### 3.10 In-app AI chat + widget DSL (Z Code)

**ADR 0014** · `eb74a23` · merge `d0d31cb` · renumber `362cc6a`.

- Мотив: Telegram на RU VPS хрупкий → нужна **in-product** поверхность с фактами кабинета (не FAQ-энциклопедия).
- `POST /ai/chat` (JWT): история + ответ; `source: zcode|stub` как у draft.
- Role-scoped system prompt (STUDENT/STAFF/ADMIN; TEACHER-compatible) + read-only tools: today / schedule / grades|tasks / requests.
- **Widget DSL:** `{{widget:KIND|…}}` и шорткаты `[[lesson:…]]`, `[[request:…]]`, `[[today]]`, … → интерактивные карточки со ссылками в кабинет.
- Web: FAB + bottom sheet (`AssistantChat` / `WidgetCard`).
- Write-tools / HITL остаются у бота; in-app MVP = чтение + навигация.
- Провайдер: Z Code (OpenRouter-compatible) из env — канон проекта.

---

### 3.11 Colleague cabinet — выравнивание концепта (если есть следы)

Отдельного большого ADR «кабинет коллеги» **нет**. Следы выравнивания:

1. **ADR 0012 / EventCandidate moderation** — явно: «Коллега (концепт §9): кандидаты событий модерируются до публикации в афишу»; API staff: pending queue + approve/reject.
2. **Teacher vs Staff разведение** (ADR 0010 / 0015) — преподаватель ≠ сотрудник деканата; коллега-модератор афиши ближе к staff/digest moderation stub, чем к TEACHER assignments.
3. Ранние боли `docs/PAINS.md` ещё писали «не строим кабинет препода в v1» — **опровергнуто** ночным ADR 0010 (MVP без solver); полный colleague/event-ops UI по-прежнему gap.

Итого: концепт коллеги **зафиксирован в clubs/moderation контуре**, не как отдельный shipped cabinet screen.

---

### 3.12 Cabinets / UX / AI drafts / GOST Word (задел 11-09, уехал в ночь)

Ещё до feature-storm, но часть «всего за 10–11»:

| Коммит | Суть |
|--------|------|
| `a5bc276` | Week calendar, Today lessons, grades extras, **staff и admin cabinets** |
| `14aa64f` | Human cabinet UX: profile group/phone, без developer empty-states |
| `685f4e3` | Contest signup: email/password/name; optional profile |
| `cc00f70` | Honest AI draft source (no silent stub) |
| `dfa5bc3` / `6e4d15c` | Submission-ready drafts + Word **GOST R 7.0.97** |
| `568e8c4` | Short RU signature для «Имя Фамилия» |
| `c08eb70` | Meta description — продуктовый язык, не жаргон конкурса |

---

### 3.13 CI/CD / Docker / image pipeline (задел + уроки)

| Коммит | Суть |
|--------|------|
| `fb828a6` | GH Actions CI + Deploy → GHCR + SSH |
| `40899d1`…`8c62491` | Alpine OpenSSL, prisma cwd, worker generate path, prisma runtime dep |
| `1e9520b` / `b513937` | **docker save\|ssh load** — VPS без `read:packages`; secrets через `gh` |
| `59daf77` | Nest emits `dist/main.js` (не `dist/src/main.js`) |
| bot image | `pnpm deploy --prod` без legacy |

**Урок 889 MiB:** никогда не параллелить `compose up` + image load + несколько SSH-агентов; один контейнер за раз; bot/worker отложить до зелёного HTTPS; не устраивать `pkill -9` compose-войны.

---

### 3.14 Ironring overlay

`4c39c0e` → `.cursor/skills/ironring/SKILL.md` + `references/project-binding.md`: project binding для `/ironring` (base `main`, worktrees под `.claude/worktrees/`, version sources, gap «версии в UI нет»).

---

### 3.15 Aggressive recovery → gentle keeper (операционка ночи)

Наблюдалось: `/usr/local/bin/dekanat-hold.sh` каждые 5 с делал `docker start` cores + `docker stop` bot/worker + **`pkill -9 -f 'docker compose -p dekanat'`** + `chattr +i` на `.env` / Caddyfile / STABLE compose → thrash, SSH 255, 502.

**Заменено** на мягкий hold: start-if-exited (интервал ~30 с), bot/worker stop **только** если MemAvailable &lt; ~200 MiB, **без** pkill compose, **без** iptables wars; `chattr -i` снят. Сайт остался на 200/401 через swap.

---

## 4. Deploy status

### 4.1 Что в git vs что на VPS

| Surface | `main` tip `956481e` | Live VPS `IMAGE_TAG=demo-stable` |
|---------|----------------------|----------------------------------|
| HTTPS Caddy + sslip.io | yes | **yes (verified)** |
| API `/auth/me` 401 | yes | **yes** |
| Demo quick-login plumbing | yes | likely (флаги в `.env`; tip UI unconfirmed) |
| Telegram egress proxy code | yes | older cut возможен; bot **не** в core-five |
| Clubs digest / xlsx / tags | yes | **unknown / older** until tip reload |
| RUZ lessonOid + subgroup + SoT | yes | **partial/unknown** vs tip |
| 4th-year search terms | yes | unknown on demo-stable |
| PWA push + liquid-glass | yes | unknown on demo-stable |
| Teacher cabinet | yes | unknown on demo-stable |
| In-app AI + widget DSL | yes | unknown on demo-stable |
| Profile role group picker | yes | unknown on demo-stable |
| Timetable OSS model md/docx | docs only | N/A (в репо + Downloads) |
| Web build fix `cbc6674` | yes | **not** on demo-stable image |
| SoT follow-ups `1a0a073`/`811a64f` | **не в main** | нет |

### 4.2 Multi-agent race / OOM (что случилось)

При попытке tip-publish: много SSH-сессий; скрипты гоняли `IMAGE_TAG` между `demo-stable` / `subgroup` / `sot-1a0a073` / `cbc66742432c` / `profile-role-*`; stabilize/keepalive; `OWNERSHIP_*` fight-files; parallel compose; `docker rmi` tip-тегов. Compose часто **OOM 137**. HTTPS мигал **502**. Tip web image load’ился, потом **стирался** рейсерами.

### 4.3 Calm recovery checklist

| Шаг | Статус |
|-----|--------|
| Images built amd64 (local tip) | **yes** |
| save\|load tip retained on VPS | **no** (wiped / forced back to demo-stable) |
| Compose + Caddyfile usable | **yes** (`chattr -i` снят) |
| migrate deploy on tip image | **not** on current live tag |
| seed/seed-extras этой ночью на tip | **not confirmed** |
| Containers healthy + HTTPS 200/401 | **yes** на `demo-stable` |
| Gentle hold (no pkill) | **yes** |
| Bot/worker always on | **no** (RAM) |

### 4.4 Root causes

1. **889 MiB RAM** — recreate/multi-load → OOM 137.  
2. **Несколько concurrent SSH-агентов** ретегают алиасы и удаляют tip images.  
3. Агрессивный hold (`pkill -9` compose) усиливал thrash.

### 4.5 Следующий спокойный tip-cut (не делать во сне / параллельно)

Когда MemAvailable ≳ 400 MiB и **один** оператор: load **один** api + **один** web → один раз выставить `IMAGE_TAG` → migrate → verify → не поднимать bot/worker, пока HTTPS зелёный. Подтянуть unmerged SoT follow-ups (`1a0a073`/`811a64f`) в main перед или вместе с tip.

---

## 5. Known gaps

- **Tip images не на VPS** — высший приоритет следующего спокойного окна.  
- **Bot/worker off** на live (RAM); Telegram зависит от Mac gost tunnel.  
- **VAPID** на VPS для живого Web Push — не подтверждён.  
- Clubs: **нет k-NN** / полного TG ingest; лента stub/seed.  
- Timetable solver: **только research**, нет sidecar.  
- Colleague cabinet: moderation stub есть, отдельного UI кабинета коллеги нет.  
- Deep browser QA (login → schedule subgroup → teacher → clubs → AI chat) — **не** прогнан на live; только HTTP 200/401.  
- Version string в UI всё ещё **GAP** (ironring binding).  
- Worktree cleanup deferred.  
- Unmerged SoT hardening на `fix/ruz-subgroup-schedule`.  
- Deploy GHCR workflow часто красный без pull rights / race — ship path = save\|load, не «слепой Actions».  
- Возможные Co-authored-by trailers в старых коммитах — не трогали.

---

## 6. Commits / refs

### 6.1 Tip и ключевые якоря

| Ref | Hash |
|-----|------|
| `main` / `origin/main` tip | `956481ec390ed5a53cfc9a5431e69ab29d4a0643` |
| Ship-fix web after merge | `cbc66742432cbb0ee04e5b04bf32c265d0bab218` |
| First ironring batch note | `d8ca375` |
| Unmerged SoT enrichment | `1a0a073` (на `fix/ruz-subgroup-schedule`) |
| Unmerged source migration follow-up | `811a64f` (на `fix/ruz-subgroup-schedule`) |
| VPS `IMAGE_TAG` | **`demo-stable`** |

### 6.2 Merge order ночи 11-11 (на main)

1. `fix/ruz-subgroup-schedule` → `b8adaef`  
2. `feat/clubs-digest-tags` → `9c9bf7b`  
3. `feat/pwa-web-push` → `b6a764f` (schema conflict с clubs → оба сохранены)  
4. `feat/teacher-lesson-assignments` → `35e2ba2`  
5. `feat/mobile-liquid-glass-nav` → `1d0a0c3`  
6. `fix/profile-role-group-picker` → `70b0935` (+ ADR renumber `65324e2`)  
7. `feat/demo-quick-login` → `6a2c10d`  
8. `feat/in-app-ai-assistant` → `d0d31cb`  
9. `feat/https-caddy-sslip` → `0fd93e0` (+ telegram host-net blend)

Плюс до merge: `4c39c0e` Telegram egress + ironring; ADR renumbers `fdaa462` / `f5ed1e8` / `7f4c864` / `362cc6a`.

**Prisma order (канон ночи):** init → phone → subgroup → teacher → clubs → staff view group → push · (+ follow-up `source` ещё вне main).

### 6.3 Полный список коммитов `main` since 2026-11-09

```
956481e Expand Unreleased changelog and note VPS multi-agent deploy race.
d8ca375 Document Nov 10–11 ironring batch: merges done, VPS tip publish paused.
cbc6674 Fix web build after merge: complete addDigestSource and teacher AI suggestions.
0fd93e0 Merge branch 'feat/https-caddy-sslip'
d0d31cb Merge branch 'feat/in-app-ai-assistant'
6a2c10d Merge branch 'feat/demo-quick-login'
65324e2 Renumber profile role group picker ADR to 0015.
70b0935 Merge branch 'fix/profile-role-group-picker'
1d0a0c3 Merge branch 'feat/mobile-liquid-glass-nav'
35e2ba2 Merge branch 'feat/teacher-lesson-assignments'
b6a764f Merge branch 'feat/pwa-web-push'
9c9bf7b Merge branch 'feat/clubs-digest-tags'
b8adaef Merge branch 'fix/ruz-subgroup-schedule'
362cc6a Renumber in-app AI assistant ADR to 0014.
7f4c864 Renumber notification delivery ADR to 0013.
f5ed1e8 Renumber clubs ADR to 0012 to avoid collision with schedule SoT.
fdaa462 Renumber teacher/timetable ADRs and add optimization model docs.
4c39c0e Add Telegram egress proxy for RU VPS and ironring overlay.
0fe118b Block teacher profiles from student group and enrollment fields.
f1f3d51 Let Today hub resolve staff schedule view groups.
8ffa1fb Gate profile group fields by role for staff schedule oversight.
f79e40d Honor DB as schedule SoT and finish subgroup preference deploy path.
eb74a23 Add in-app AI assistant chat with interactive widget DSL.
3264079 Add passwordless demo quick-login for the contest stand.
c84d5ed Add Caddy HTTPS fronts for sslip.io web and API hosts.
fbaf85e Extract role-aware liquid-glass nav tabs and harden fallbacks.
db820b6 Add liquid-glass mobile bottom nav with four role-aware tabs.
50308c2 Add teacher lesson assignments overlay on RUZ slots.
bc2329f Add clubs registry, digest sources, tags and interest subscriptions.
6cdf1bb Add PWA Web Push delivery and phone notification UI.
d6b5d49 Fix RUZ schedule parallels via lessonOid upsert and subgroup preference.
ad05558 Keep Telegram bot off default VPS compose; RU hosts often block api.telegram.org.
26c8b54 Fix Telegram bot phone-login UX and ensure polling restarts cleanly.
59daf77 Fix API build so Nest emits dist/main.js instead of dist/src/main.js.
a5bc276 Add week calendar, today lesson list, grades extras, staff and admin cabinets.
568e8c4 Fix short signature for two-part Russian names like Имя Фамилия.
6e4d15c Format заявления Word export to GOST R 7.0.97 practice.
dfa5bc3 Make request drafts submission-ready: clean text, profile fields, Word export.
cc00f70 Report real AI draft source instead of silent stub fallback.
c08eb70 Soften public meta description to product language, not contest jargon.
14aa64f Make cabinet UX human: profile group/phone, drop developer empty-state copy.
685f4e3 Allow contest signup with only email/password/name; optional profile fields.
b513937 Document that deploy secrets are managed via gh and images stream over SSH.
a660459 Drop unsupported --legacy flag from pnpm deploy in bot image.
526f3ec Fix bot image: pnpm deploy --prod so runtime deps like grammy ship.
1e9520b Deploy via docker save/load over SSH so VPS needs no GHCR pull rights.
8c62491 Generate Prisma client from apps/api in worker image.
dc3ea48 Make prisma a worker runtime dep so Docker generate finds the CLI.
71787f7 Fix worker Prisma generate path under pnpm monorepo in Docker.
40899d1 Fix worker/api Docker builds: OpenSSL on Alpine and prisma cwd.
fb828a6 Add GitHub Actions CI/CD: GHCR images and SSH deploy to VPS.
```

(~51 коммит на `main` в окне; ~20 с датировкой 11-09, ~30+ с 11-11 включая merges/renumbers.)

### 6.4 CHANGELOG / releases

- `CHANGELOG.md` → секция **[Unreleased]** отражает весь ночной срез + note про pause tip publish.  
- Именованного `docs/releases/vX.Y.Z.md` за 10–11 **нет** (последние: `v0.1.0` 11-08, `v0.0.0` 11-04) — срез пока Unreleased.

---

## 7. Приложения: ADR, миграции, тесты, worktrees, ironring

### 7.1 ADR, написанные / перенумерованные в окне

| ADR | Title | Статус |
|-----|-------|--------|
| 0007 | Telegram egress proxy (RU VPS) | Принято |
| 0008 | Subgroup schedule preference | Принято |
| 0009 | Schedule source of truth (DB-first) | Принято |
| 0010 | Teacher lesson assignments | Принято |
| 0011 | Timetable optimization model (research / CP-SAT) | **Предложено** |
| 0012 | Clubs digest / tags / subscriptions | Принято |
| 0013 | Notification delivery (Web Push) | Принято |
| 0014 | In-app AI assistant + widget DSL | Принято |
| 0015 | Profile role group picker | Принято |

(Ранее уже были 0001–0006 — стратегия/стек/phone-auth; в этот отчёт не пересказываются.)

### 7.2 Миграции Prisma (добавленные в окне на main)

```
20261111001500_schedule_subgroup_preference
20261111003000_teacher_lesson_assignments
20261111010000_clubs_digest_tags
20261111013000_staff_schedule_view_group
20261111020000_push_subscription
```

Вне main (worktree RUZ): `20261111023000_schedule_lesson_source`.

### 7.3 Тесты (локально после merge)

| Package | Result |
|---------|--------|
| `apps/api` | **26** suites · **100** tests passed |
| `apps/worker` | **4** suites · **16** tests passed |

Починки до зелёного: Prisma client regen; `pnpm install` для `web-push`.  
CI unit на push в `main` — green; Deploy workflow — часто fail (ожидаемо без GHCR pull / race) — не sole ship path.

### 7.4 Worktrees / ветки (снимок)

**На старте батча** (исторический inventory):  
`fix/ruz-subgroup-schedule`, `fix/profile-role-group-picker`, `feat/pwa-web-push`, `feat/teacher-lesson-assignments`, `feat/mobile-liquid-glass-nav`, `feat/demo-quick-login`, `feat/in-app-ai-assistant`, `feat/https-caddy-sslip`, `feat/clubs-digest-tags` (+ dirty main с Telegram egress).

**Сейчас (после merge):**
| Path | Branch | Note |
|------|--------|------|
| repo root | `main` @ `956481e` | dirty: этот process-log (+ `tsconfig.tsbuildinfo`) |
| `.claude/worktrees/ruz-subgroup-schedule` | `fix/ruz-subgroup-schedule` @ `811a64f` | **2 коммита впереди main** |
| `/…/mgimo-hack-app-clubs` | `feat/clubs-digest-tags` @ `f5ed1e8` | merged; worktree ещё жив |

Cleanup `git worktree remove` / `prune` — **отложен** до tip-cut.

### 7.5 Dirty main resolution (как чинили перед merge)

- **Закоммитили первыми:** Telegram `TELEGRAM_PROXY` + undici, ADR 0007, keepalive script, ironring overlay, DEPLOY notes.  
- **Выкинули:** stale RUZ dirty tree (superseded веткой subgroup).  
- **Gitignore:** `scripts/bin/gost`, `scripts/logs/*`, `.claude/`.  
- **Compose:** HTTPS Caddy сохранён; bot host-net + localhost API bind для egress (не регрессия «web на :80»).

### 7.6 Артефакты для жюри / сна

| Артефакт | Путь |
|----------|------|
| Этот отчёт | `docs/process-log/ironring-batch-2026-11-10-11.md` |
| Timetable research md | `docs/research/timetable-optimization-model.md` |
| Timetable research docx (repo) | `docs/research/timetable-optimization-model.docx` |
| Timetable research docx (Downloads) | `/Users/ron1n97/Downloads/timetable-optimization-model.docx` |
| Demo script | `docs/DEMO.md` |
| Deploy notes | `docs/DEPLOY.md` |
| CHANGELOG Unreleased | `CHANGELOG.md` |
| Gentle hold (VPS) | `/usr/local/bin/dekanat-hold.sh` |

### 7.7 Сводная формула «что сделано»

**Merged on main:** Telegram egress · RUZ lessonOid/subgroup/SoT/4th-year search · clubs registry+digest+tags+subs · PWA push · teacher cabinet · liquid-glass nav · profile role UX · demo quick-login · in-app AI+widget DSL · HTTPS Caddy sslip.io · ironring overlay · timetable OSS/math model docs · web merge fix · changelog/process-log · (плюс задел 11-09: CI/Docker, cabinets UX, AI draft honesty, GOST Word).

**Live right now:** five-core на **`demo-stable`** за Caddy HTTPS — **web 200 / api 401**, alias `api` OK, gentle hold only; tip cut — завтрашняя спокойная работа, не ночной рейс.

---

*Конец overnight inventory / вечерний дожим.*

### Осталось для tip-cut (когда SSH жив, соло, MemAvailable ≳ 350 MiB)

1. SSH: `docker ps`, `IMAGE_TAG`, `free -m`, `grep -E '^VAPID_' .env | sed 's/=.*/=SET/'` (без значений).
2. Собрать/подтянуть amd64 `api`+`web` под tip `839557a` (или ближайший GHCR SHA); **не** thrash `compose down`.
3. Один `compose -p dekanat up -d` для api/web (migrate отдельно при необходимости `20261111023000_schedule_lesson_source`).
4. Доказать: web 200, `/auth/me` 401, `/notifications/push/vapid-public-key` не 404 (после login — ключ не пустой).
5. Bot/worker поднимать только если MemAvailable > ~350 MiB после healthy api/web.

