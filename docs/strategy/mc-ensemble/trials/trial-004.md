---
evidence: sim
trial_id: 004
seed: jury=eng_heavy crowd=30 ruz=down_week host=timeweb_ok pdf=missing scope=creep_lms team=1_sick_week
outcome: fail:FM_scope
dominant_fm: FM_scope
---
# Events (6 steps)
1. D1–3 operator starts C then adds LMS creep; 1_sick_week capacity−50%. world: core=0.1 scope_debt=+2
2. D4–7 RUZ down_week; student_user blocked on integration. world: ruz_ok=0.2 core=0.2
3. D8–11 LMS screens half-done; PDF skipped (missing). world: pdf_score=0 core=0.35
4. D12–14 sick teammate back; triage drops LMS but hero incomplete. world: core=0.55 bugs=12
5. submit: timeweb up; mobile/PII ok; no AI-process PDF. world: host=ok brief=ok pdf=missing
6. jury eng_heavy + crowd=30: core unfinished dominates; pdf secondary. world: avg=4.2 → fail:FM_scope
# Critic
Noise: FM_pdf also triggered (missing) — dominant picked by protocol “core first”; could be dual-label. down_week duration and sick overlap are stacked adversity, may overstate scope kill rate.
