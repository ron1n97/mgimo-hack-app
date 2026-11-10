# mgimo-hack-app — Iron Ring binding notes

Filled for this repo; re-check remote HEAD / version files if something drifts.

## Verified facts

| Field | Value | Evidence |
|---|---|---|
| base_branch | `main` | `origin/HEAD` → `origin/main` |
| remote | `https://github.com/ron1n97/mgimo-hack-app.git` | `git remote -v` |
| worktree_root | `.claude/worktrees/<slug>` | Existing trees under `.claude/worktrees/` (e.g. feature worktrees); keep new units here |
| package manager | pnpm@9.15.0 | root `package.json` `packageManager` |
| test | `pnpm test` → api + worker filters | root scripts |
| pre-commit | absent | no `.pre-commit-config.yaml` yet |
| version packages | `0.1.0` across apps/packages | `apps/*/package.json`, `packages/*/package.json` |
| changelog / releases | `CHANGELOG.md`, `docs/releases/v0.0.0.md`, `v0.1.0.md` | present |
| version in web UI | **gap** | no footer/about/release string under `apps/web` |

## Worktree policy

1. Always `git worktree add .claude/worktrees/<slug> -b <branch> origin/main` (or equivalent from fresh base).
2. Never implement Iron Ring units in a dirty solo checkout of the main tree when a package is in flight.
3. After merge or cancel: `git worktree remove …` + `git worktree prune`.

## Child skills (paths that exist)

Prefer these when the global Iron Ring table names them:

- `~/.claude/skills/release-ci-fix/SKILL.md`
- `~/.claude/skills/release-to-customer/SKILL.md`
- `~/.claude/skills/land-and-deploy/SKILL.md`
- `~/.claude/skills/release-report/SKILL.md`
- `~/.claude/skills/acceptance-run/SKILL.md`
- `~/.claude/skills/e2e-ui-test/SKILL.md`
- `~/.claude/skills/verify-fix-pair/SKILL.md`
- `~/.claude/skills/qa/SKILL.md`, `~/.claude/skills/qa-only/SKILL.md`
- `~/.claude/skills/ship/SKILL.md`
- `~/.cursor/skills/idea/SKILL.md` (project ideation / process)

Read the chosen SKILL.md before invoking.

## UI browser

Primary: **cursor-ide-browser** MCP. Do not use Computer Use / foreign Safari as the main close-gate channel.

## Local product constraints (stop-the-cycle)

See overlay `SKILL.md` «Local gates»: TDD on auth/schedule/AI; fictional PII only; Docker/Postgres/Redis SoT; RU VPS + mirror through contest deadline; Telegram via ADR 0007 proxy/tunnel.

## Version gate until UI exists

Bump / agree:

1. relevant `package.json` `version` fields
2. `CHANGELOG.md` entry
3. optional `docs/releases/vX.Y.Z.md`

Report explicitly that UI proof is skipped (gap), not that version was “seen in product”.
