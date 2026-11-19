# Timetable CP-SAT sidecar (ADR 0011)

Google OR-Tools CP-SAT entrypoint for the Деканат+ timetable optimizer.

```bash
pip install -r requirements.txt
python3 solve_cpsat.py < instance.json > solution.json
```

API (`POST /timetable/solve`) prefers this script when `python3` + ortools are available; otherwise uses the in-process TypeScript heuristic (`apps/api/src/timetable/solve-heuristic.ts`).

Does **not** overwrite RUZ SoT — solutions are stored in `TimetableSolveRun`.
