# Iron Ring batch report — 2026-11-10 … 2026-11-11 (UTC+4)

**Mode:** `release` (user asleep; explicit merge-to-main + VPS publish + verify + full process log)  
**Repo:** `/Users/ron1n97/projects/stuff/mgimo-hack-app`  
**Base:** `main`  
**Intended live:** https://dekanat.177.177.212.34.sslip.io · https://api.dekanat.177.177.212.34.sslip.io  
**VPS:** `root@177.177.212.34` · `/opt/mgimo-hack-app` · compose `-p dekanat`

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Inventory (branches / worktrees / dirty main)](#2-inventory-branches--worktrees--dirty-main)
3. [ADR collisions and final numbering](#3-adr-collisions-and-final-numbering)
4. [Merge order and outcomes](#4-merge-order-and-outcomes)
5. [Workstream diary — Nov 10–11](#5-workstream-diary--nov-10-11)
6. [Tests](#6-tests)
7. [Deploy to VPS](#7-deploy-to-vps)
8. [UI verification](#8-ui-verification)
9. [Leftovers / skipped / gaps](#9-leftovers--skipped--gaps)
10. [Cleanup](#10-cleanup)
11. [Appendix — tip hash & URLs](#11-appendix--tip-hash--urls)

---

## 1. Executive summary

**Code merge: DONE.** All planned feature branches are on `main` and pushed to GitHub. ADR collisions renumbered 0007–0015. Local unit tests green (api 100 + worker 16). Web merge syntax fix committed (`cbc6674`).

**VPS publish: BLOCKED / PARTIAL.** Host is **889 MiB RAM**; concurrent agent “racers” retagged/deleted images and repeatedly `docker compose`’d until **OOM (exit 137)**. Heavy `docker save|load` paused by operator instruction. At report close: postgres+redis healthy; API briefly restarted on existing `subgroup` tag; web/caddy/HTTPS **not reliably 200**. Tip image `cbc66742432c` for api/web/worker was **deleted on VPS by a racer**; do **not** reload until memory is calm and racers are gone.

**UI verify:** not completed (site unstable). No data faking.

---

## 2. Inventory (branches / worktrees / dirty main)

### Worktrees at start

| Path | Branch | Notes |
|------|--------|-------|
| repo root | `main` | Dirty: Telegram egress + partial RUZ (stale vs tip) |
| `.claude/worktrees/ruz-subgroup-schedule` | `fix/ruz-subgroup-schedule` | lessonOid, subgroup, SoT |
| `.claude/worktrees/fix-profile-role-group-picker` | `fix/profile-role-group-picker` | admin any-group / student own+subgroup |
| `.claude/worktrees/feat-pwa-web-push` | `feat/pwa-web-push` | VAPID / PushSubscription |
| `.claude/worktrees/feat-teacher-lesson-assignments` | `feat/teacher-lesson-assignments` | + timetable research docs |
| `.claude/worktrees/feat-mobile-liquid-glass-nav` | `feat/mobile-liquid-glass-nav` | liquid glass nav |
| `.claude/worktrees/feat-demo-quick-login` | `feat/demo-quick-login` | passwordless personas |
| `.claude/worktrees/feat-in-app-ai-assistant` | `feat/in-app-ai-assistant` | chat + widget DSL |
| `.claude/worktrees/feat-https-caddy-sslip` | `feat/https-caddy-sslip` | Caddy + sslip |
| `/…/mgimo-hack-app-clubs` | `feat/clubs-digest-tags` | clubs registry + digest |

### Dirty `main` resolution

- **Committed first:** Telegram `TELEGRAM_PROXY` + undici, ADR 0007, `scripts/tg-egress-keepalive.sh`, ironring overlay, DEPLOY telegram notes.  
- **Discarded:** stale RUZ dirty tree (superseded by `fix/ruz-subgroup-schedule`).  
- **Gitignored:** `scripts/bin/gost`, `scripts/logs/*`, `.claude/`.  
- **Compose:** kept HTTPS Caddy; bot host-net + localhost API bind for egress (not the dirty main regression that published web on `:80`).

---

## 3. ADR collisions and final numbering

| ADR | Title |
|-----|-------|
| 0007 | Telegram egress proxy (RU VPS) |
| 0008 | Subgroup schedule preference |
| 0009 | Schedule source of truth (DB-first) |
| 0010 | Teacher lesson assignments |
| 0011 | Timetable optimization model (research) |
| 0012 | Clubs digest / tags |
| 0013 | Notification delivery (Web Push) |
| 0014 | In-app AI assistant |
| 0015 | Profile role group picker |

---

## 4. Merge order and outcomes

1. `fix/ruz-subgroup-schedule` — migrations `01500` + `13000` + SoT  
2. `feat/clubs-digest-tags` — `10000`  
3. `feat/pwa-web-push` — `20000` (schema conflict with clubs → both kept)  
4. `feat/teacher-lesson-assignments` — `03000` + research docs  
5. `feat/mobile-liquid-glass-nav`  
6. `fix/profile-role-group-picker` (kept SoT lazy-pull; role UX from branch)  
7. `feat/demo-quick-login`  
8. `feat/in-app-ai-assistant`  
9. `feat/https-caddy-sslip` (+ telegram bot host-net blend)

**Follow-up commit:** `cbc6674` — fix truncated `addDigestSource` after merge; teacher AI suggestions.

**Prisma order:** init → phone → subgroup → teacher → clubs → staff view group → push.

---

## 5. Workstream diary — Nov 10–11

### 5.1 Cabinets / UX (earlier main)

Week calendar, Today lessons, grades extras, staff/admin cabinets; contest signup soft fields; human empty states; short RU signatures.

### 5.2 AI draft honesty + GOST Word

Submission-ready drafts; **honest draft source** (no silent stub); Word export **GOST R 7.0.97**.

### 5.3 Telegram blocked in RF + egress

`api.telegram.org` blocked; WARP failed; ADR 0007: undici `ProxyAgent` + Mac **gost** SSH reverse tunnel `:40000` + LaunchAgent keepalive. Phone-login bot UX + polling restart. Bot often `network_mode: host`.

### 5.4 CI/CD / Docker

GHCR Actions; VPS can’t pull → **docker save|ssh load**; Alpine/OpenSSL/Prisma/Nest `dist/main.js`; bot `pnpm deploy`.

### 5.5 Clubs

XLSX→JSON registry; tags/subscriptions; EventCandidate moderation stub; **no k-NN yet**; ADR 0012.

### 5.6 RUZ

Parallels normal; lessonOid upsert; subGroup/stream; `preferredSubGroupOids`; 4th-year search terms; **DB-first SoT** (ADR 0008/0009).

### 5.7 Teacher cabinet

`Role.TEACHER`, assignments, tasks; ADR 0010.

### 5.8 Timetable model

md + GOST docx; OR-Tools recommendation; ADR 0011 (research only).

### 5.9 PWA Web Push

PushSubscription + VAPID UI; ADR 0013; needs VAPID keys on VPS for live push.

### 5.10 Liquid glass nav

Role-aware bottom tabs; clubs tab retained for students.

### 5.11 HTTPS Caddy sslip.io

Caddy TLS; bake `NEXT_PUBLIC_API_URL=https://api.dekanat.…sslip.io` (fixes «Сервер недоступен»).

### 5.12 Demo quick login

`DEMO_QUICK_LOGIN` + personas; `docs/DEMO.md`.

### 5.13 In-app AI + widget DSL

FAB/sheet chat; ADR 0014.

### 5.14 Profile role groups

Staff/admin any catalog group view; student own+subgroup; teacher contacts-only; ADR 0015.

### 5.15 Ironring overlay

`.cursor/skills/ironring/` project binding.

---

## 6. Tests

| Package | Result |
|---------|--------|
| `apps/api` | **26** suites · **100** tests passed |
| `apps/worker` | **4** suites · **16** tests passed |

Fixed before green: Prisma client regen (`source`); `pnpm install` for `web-push`.

CI: push to `main` — CI green; Deploy workflow **failed** (expected without GHCR pull rights / race) — not used as sole ship path.

---

## 7. Deploy to VPS

### What landed locally → GitHub

- `main` tip: **`cbc66742432cbb0ee04e5b04bf32c265d0bab218`**  
- Images built amd64: api/worker/web/bot for tip (and prior `0fd93e0f34f2`)  
- First `docker save|load` of tip succeeded; later **racers deleted** tip api/web/worker tags on VPS  
- Compose/Caddyfile synced at least once; `.env` HTTPS URLs + demo flags set (IMAGE_TAG repeatedly overwritten by racers: `subgroup` / `demo-stable` / `profile-role-*` / `sot-*`)

### Checklist (honest)

| Step | Status |
|------|--------|
| Images built amd64 | **yes** (local) |
| save\|load tip | **yes then wiped** by racer `docker rmi` |
| Compose + Caddyfile synced | **partial** (file thrash / STABLE / RACER copies) |
| migrate deploy | **unknown** on final tip image (API flapped) |
| seed/seed-extras | **not confirmed** this night |
| Containers healthy + HTTPS 200 | **no** at report close |
| Heavy reload after OOM | **paused** (operator) |

### Root causes of VPS chaos

1. **889 MiB RAM** — compose recreate / multi-image load → **OOM 137**.  
2. **Multiple concurrent SSH agents** (same origin IP) retagging all aliases, deleting tip images, running `stabilize.sh`, restoring `demo-stable`.  
3. `stabilize.sh` disabled once as `stabilize.sh.DISABLED`; may return if another agent rewrites it.

### Gentle recovery attempt (no new image load)

- After pause: memory ~360 MiB free.  
- Started **API only** with existing `IMAGE_TAG=subgroup` → container **Up**.  
- Attempt to start web+caddy hit SSH drop; HTTPS **not verified green**.  
- **Do not** load `cbc6674` images until racers stopped and RAM calm.

---

## 8. UI verification

Channel intended: cursor-ide-browser. **Not run** — HTTPS not stable.

| Check | Result | Notes |
|-------|--------|-------|
| HTTPS web | **fail / down** | curl 000/502 during churn |
| HTTPS API from web | **fail / down** | |
| Student login / schedule / subgroup | **not checked** | |
| Admin group view label | **not checked** | |
| Teacher / clubs / liquid nav | **not checked** | |

---

## 9. Leftovers / skipped / gaps

- **VPS tip deploy unfinished** — highest priority next wake.  
- Stop all competing deploy agents before any compose.  
- Reload only tip images when RAM >~400 MiB free and no racers; start postgres→redis→api→web→caddy; skip bot/worker until stable.  
- Clubs: no k-NN. Timetable: research only. Push: needs VAPID. Telegram: Mac tunnel. Version string still absent in UI.  
- Worktree cleanup deferred while VPS unstable (local trees still present).  
- Prior commits may contain Co-authored-by trailers — not amended.

---

## 10. Cleanup

**Not done** (blocked on VPS / operator pause). When calm:

```bash
git worktree remove .claude/worktrees/<merged-slug>
git worktree prune
```

---

## 11. Appendix — tip hash & URLs

| Item | Value |
|------|-------|
| `main` tip | `cbc66742432cbb0ee04e5b04bf32c265d0bab218` |
| Web (intended) | https://dekanat.177.177.212.34.sslip.io |
| API (intended) | https://api.dekanat.177.177.212.34.sslip.io |
| Report | `docs/process-log/ironring-batch-2026-11-10-11.md` |

### Merged on main (all intended)

Telegram egress · RUZ subgroup+SoT · clubs · PWA push · teacher · liquid-glass · profile role · demo login · in-app AI · HTTPS Caddy · ironring overlay · timetable research · web build fix.

### Skipped / deferred

- Final VPS tip cut + migrate/seed confirm  
- UI browser verify  
- Worktree remove  
- Reloading tip images (paused — OOM / racers)
