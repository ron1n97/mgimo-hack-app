---
evidence: sim
trial_id: 002
seed: jury=marketing_heavy crowd=150 ruz=flaky host=vercel_lottery pdf=thin_cursor scope=locked_C team=2_focused
outcome: fail:FM_pdf
dominant_fm: FM_pdf
---
# Events (6 steps)
1. D1–3 operator locks C; student_user hits RUZ flaky (timeouts). world: core=0.15 ruz_ok=0.7
2. D4–7 hero works when RUZ up; competitor_team ships polished landing+CRUD. world: core=0.5 polish_gap=-1
3. D8–11 PDF = Cursor chat dump, thin process. world: pdf_score=3.0 (crit.2 risk)
4. D12–14 team polishes UI for marketing optics; PDF not deepened. world: pdf_score=3.2 core=0.85
5. submit on Vercel; lottery cold-start ok this window. world: host=ok brief=ok
6. jury marketing_heavy: demo looks neat but crit.2 kills thin AI-process. world: avg=5.1 → fail:FM_pdf
# Critic
Noise: marketing_heavy vs eng weight on crit.2 is assumed; FM_crowd also plausible at 150 but PDF score forced dominant. Vercel “ok this window” is lucky draw, not host proof.
