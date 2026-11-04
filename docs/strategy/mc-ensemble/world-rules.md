---
type: mc-world
evidence: sim
updated: 2026-11-04
---

# World rules (deterministic layer)

- Баллы экспертов 0–10 по 4 критериям; итоговый = среднее экспертов (как Регламент).
- «Победа» в trial = попасть в топ-3 номинации при семпле θ_crowd (грубо: survive если avg≥7.0 и нет FM_host/FM_brief; иначе fail).
- Ходы 1..6: D1–3, D4–7, D8–11, D12–14, submit window, jury week.
- Числа (uptime, баги) задаёт world; LLM-роли только выбирают действия из меню.
- Запрет: придумывать цитаты живых жюри; всё `sim:`.
