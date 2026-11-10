---
name: ironring
description: >-
  Project overlay: Iron Ring for mgimo-hack-app (dekanat-plus). This file IS
  /ironring in this repo — read it first for the binding card and local gates,
  then follow the global cycle/gates at ~/.claude/skills/ironring/SKILL.md.
---

# Iron Ring — mgimo-hack-app

**This file is the project `/ironring`.** Do not re-discover binding from scratch
each turn: use the card below, then run the global skill’s `task` / `batch` /
`release` cycles and hard gates
(`~/.claude/skills/ironring/SKILL.md` + `references/gates.md`).

Details: `references/project-binding.md`.

## Binding card

```text
project_root:     /Users/ron1n97/projects/stuff/mgimo-hack-app
base_branch:      main                    # origin/HEAD → origin/main (verified)
worktree_root:    .claude/worktrees/<slug>
                  # Policy: create under repo .claude/worktrees/; one task =
                  # one worktree; remove + prune after merge/cancel. Path may
                  # already exist with sibling trees — do not solo on dirty root.
version_sources:  apps/*/package.json + packages/*/package.json (semver, e.g. 0.1.0)
                  CHANGELOG.md
                  docs/releases/vX.Y.Z.md (when cutting a named slice)
version_ui_proof: GAP — web has no visible release/version string in UI yet.
                  Until fixed: gate 9 = CHANGELOG/docs/releases + package.json
                  agreement; note «версии в UI нет» in the cycle report.
                  Prefer adding a small footer/about later rather than faking proof.
child_skills:
  release-ci-fix:     ~/.claude/skills/release-ci-fix/SKILL.md
  release-to-customer: ~/.claude/skills/release-to-customer/SKILL.md
  land-and-deploy:     ~/.claude/skills/land-and-deploy/SKILL.md
  release-report:      ~/.claude/skills/release-report/SKILL.md
  acceptance-run:      ~/.claude/skills/acceptance-run/SKILL.md
  e2e-ui-test:         ~/.claude/skills/e2e-ui-test/SKILL.md
  verify-fix-pair:     ~/.claude/skills/verify-fix-pair/SKILL.md
  qa / qa-only:        ~/.claude/skills/qa/SKILL.md | qa-only/SKILL.md
  ship:                ~/.claude/skills/ship/SKILL.md
  idea (project):      ~/.cursor/skills/idea/SKILL.md
ui_browser:       cursor-ide-browser MCP (preferred primary channel here)
test_gate:        pnpm test
                  # root script: filter ./apps/api + ./apps/worker
                  # also: pnpm --filter <pkg> test for narrow TDD loops
                  # pre-commit: not present yet (.pre-commit-config.yaml absent);
                  # when added — run before commit per CLAUDE.md
merge_host:       GitHub · ron1n97/mgimo-hack-app · gh (PR/CI/merge)
```

## Local gates (CLAUDE.md / ADR)

Stop the cycle (same severity as global hard gates) if these break:

1. **TDD critical zones** — auth/IDOR isolation, request statuses, RUZ→UI
   schedule mapping, AI fallback: test first, then implement; no “UI-only” close
   without the relevant unit/smoke green under `test_gate`.
2. **No real PII** — only fictional personal data; secrets in `.env` only
   (`.env.example` in git); passwords bcrypt/argon2.
3. **Infra SoT** — Docker Compose · Postgres · Redis · workers; no SQLite as
   source of truth. UI/API checks for product features assume Compose (or
   equivalent) is up when the feature needs DB/workers.
4. **VPS / RU hosting** — URL reachable from RF without VPN through 28.11.2026;
   not sole Vercel/Railway; mirror required; owner confirms R1 before calling
   a public demo “live”. Deploy path: Docker Compose (+ CI) onto owner RU host.
5. **Telegram egress (ADR 0007)** — bot reaches Telegram only via
   `TELEGRAM_PROXY` (HTTP CONNECT). On VPS: `network_mode: host`, default
   proxy `http://127.0.0.1:40000` (reverse SSH + local gost / LaunchAgent
   `com.dekanat.tg-egress`). Do not treat “bot silent on VPS” as an app bug
   until egress/tunnel is confirmed; never log bot token through the proxy.

## Modes & report

Same as global: name `task` | `batch` | `release`, wait for explicit merge ok,
cleanup worktrees, short gate report (UI / CI / merge / version incl. UI gap).
