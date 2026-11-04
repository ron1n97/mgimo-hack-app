---
evidence: sim
trial_id: 003
seed: jury=mixed crowd=80 ruz=stable host=down_review pdf=forensic scope=locked_C team=2_focused
outcome: fail:FM_host
dominant_fm: FM_host
---
# Events (6 steps)
1. D1–3 operator builds on Timeweb staging; student_user OK. world: core=0.25 uptime=0.99
2. D4–7 Process Theatre + RUZ stable. world: core=0.6
3. D8–11 forensic PDF solid. world: pdf_score=8.0 core=0.82
4. D12–14 migrate public URL to cheaper host path; DNS cutover. world: host_risk=+2
5. submit: link resolves for team; brief pass. world: host=ok_pre brief=ok
6. jury week: host down_review — jury_expert cannot open demo 23–27.11. world: uptime_review=0 → fail:FM_host (scores N/A)
# Critic
Noise: cutover-to-failure path is dramatized; down_review could be ISP/jury-side. Forensic PDF quality unused once host fails — sequence bias, not causal proof.
