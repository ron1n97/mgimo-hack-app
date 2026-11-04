# SCOPE LOCK — digital-dekanat (Option C+)
Updated: 2026-11-04 · Owner: criteria-first + AI imba + pains

Читать вместе с `CLAUDE.md`, `docs/CRITERIA.md`, `docs/PAINS.md`, `docs/AI_FEATURES.md`.

## Y — must ship

### Бриф-ядро
- [ ] Auth + 2 student profiles (fake PII)
- [ ] Schedule: today + week (RUZ MGIMO + seed fallback)
- [ ] Grades + «how am I doing»
- [ ] Requests/certificates + status (**status theater**)
- [ ] Notifications
- [ ] Mobile ≥360px
- [ ] Data isolation (no IDOR)
- [ ] Password hashing; secrets in env only
- [ ] Contest disclaimer; no official uni logo
- [ ] RU-reachable host + mirror
- [ ] Process PDF / process-log from day 1
- [ ] Jury accounts documented

### Имба (owner lock)
- [ ] Pains surfaced in UI/demo/PDF (`docs/PAINS.md`)
- [ ] Every feature maps to ≥1 criterion (`docs/CRITERIA.md`)
- [ ] **AI1** draft request/certificate from cabinet context
- [ ] **AI2** next actions on grades
- [ ] **AI3** explain notification / schedule change
- [ ] Narrative seeds: student A (risk) + student B (calm)

## N — forbidden until freeze
- SamGTU dual-skin
- LMS / courses as pillar
- Employee admin as blocker (seed OK only if free)
- Generic FAQ chatbot as only AI
- Extra modules without removing a Y item
- Vercel/Railway as sole public URL
- Real PII / real uni systems / official logo

## Kill-switch → Checklist Floor (A)
If by D3 no schedule path (RUZ|seed) OR by D10 mobile core red → keep AI as **mocked UI** + finish brief Y; do not add LMS.

## Arbiter
Dispute → delete a feature, never add. Criteria > pet feature.  
Captains: Maxim (submit), Roman (build).
