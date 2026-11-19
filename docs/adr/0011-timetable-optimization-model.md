# 0011. Модель оптимизации расписания (CP-SAT sidecar)

## Статус
Принято — **реализовано v0** (2026-11-19)

## Дата
2026-11-11 (модель) · 2026-11-19 (код солвера)

## Контекст
Нужна формальная постановка авторасписания и рабочий солвер в продукте. Кабинет преподавателя ([0010](./0010-teacher-lesson-assignments.md)) остаётся ручным назначением; оптимизатор — отдельный staff-контур, **не** перезаписывает RUZ SoT ([0009](./0009-schedule-source-of-truth.md)).

## Решение
1. Канон модели: [`docs/research/timetable-optimization-model.md`](../research/timetable-optimization-model.md).
2. **Движки**
   - Primary: Google OR-Tools **CP-SAT** — `apps/solver/solve_cpsat.py` (sidecar, stdin/stdout JSON).
   - Fallback: in-process heuristic — `apps/api/src/timetable/solve-heuristic.ts` (H1–H5/H8/H10 + soft score).
3. API: `POST /timetable/solve`, `GET /timetable/solves` (STAFF/ADMIN). UI: `/staff/timetable`.
4. Persist: `TimetableSolveRun` (proposal only).
5. Переменные v0: activity → `(slot, room, teacher)` на сетке МЭО; когорты из `subGroupOid` / `groupRuzId`.

## Последствия
- Солвер в продукте; на VPS без `ortools` работает heuristic.
- Полный H6–H9 / Wish / двухфазная декомпозиция — следующие итерации.
- RUZ остаётся SoT; apply-to-LOCAL — отдельный шаг.
