# 0007. Teacher cabinet: lesson assignments without solver

## Статус
Принято

## Дата
2026-11-11

## Контекст
Нужен MVP кабинета преподавателя: «мои пары», ДЗ к слоту, видимость студентам группы, назначение пар деканатом. Open-source timetable solver и полный constraint engine — вне scope.

## Решение
1. Роль `TEACHER` + `TeacherProfile` (отдельно от STAFF).
2. Деканат создаёт `LessonTeacherAssignment` (конкретный `ScheduleLesson` или soft-key `groupRuzId`+`discipline`).
3. Преподаватель вешает `LessonTask` на своё assignment; студенты читают по `groupRuzId` профиля.
4. IDOR: чужой teacher → `NotFound`; student scoped by `groupRuzId`. Solver / auto-timetable — позже.

## Последствия
- Additive migration (`Role.TEACHER`, 3 таблицы).
- Демо: `teacher@demo.local` / `Demo123!`.
- Нет оптимизации расписания, нет submission/grading ДЗ.
