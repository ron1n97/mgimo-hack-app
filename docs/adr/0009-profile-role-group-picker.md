# 0009. Profile fields gated by role (group picker)

## Статус
Принято

## Дата
2026-11-11

## Контекст
Один экран «Профиль» показывал «Учебная группа» всем ролям. У staff/admin нет зачисления — им нужен просмотр расписания любой группы из каталога RUZ. Преподавателю блок учебной группы не нужен.

## Решение
1. **STUDENT** — enrollment: факультет / программа / курс / «Учебная группа» + подгруппы при наличии в sync.
2. **STAFF / ADMIN** — `StaffProfile.scheduleGroupRuzId|Label` («Группа для просмотра расписания»), каталог `/schedule/groups`; без course/faculty/program/subgroups.
3. **TEACHER** (и прочие non-student) — без блока учебной группы; API отклоняет student enrollment fields.
4. `assertProfileFieldsForRole` на `PATCH /auth/me`; `schedule.forUser` читает student enrollment либо staff view group.

## Последствия
- Миграция `StaffProfile.scheduleGroup*`.
- UI и API обязаны оставаться согласованными: staff не шлёт `course`/`preferredSubGroupOids`.
