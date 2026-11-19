# 0019. Оценки и задания преподавателей

## Статус
Принято

## Дата
2026-11-19

## Контекст
Два разных контура смешивались в голове продукта: «успеваемость» (оценки/зачёты/долги) и «задания по парам» (домашка от преподавателя). Старый Grade — плоский seed-список. LessonTask висел на LessonTeacherAssignment, но UI «Учёба» показывал только Grade.

## Решение
Разделить SoT и UI; оба артефакта **крепятся к паре**:

1. **Grade** — академический результат с обязательным `scheduleLessonId` при создании (`POST /grades`). Поля `discipline` копируются с пары. Студент только читает. Картина «как у меня дела» = оценки + долги (`isDebt`).

2. **LessonTeacherAssignment** — ownership: staff назначает TEACHER на **конкретный slot** (`scheduleLessonId`) или soft group+discipline. Soft-назначение без пары **не** принимает задания.

3. **LessonTask** — только если у assignment есть `scheduleLessonId`. Scope студентам по `groupRuzId`. Не подменяет Grade.

4. Экран **/grades** показывает долги/оценки (с датой пары) + открытые задания (с привязкой к слоту).

5. AI `get_grades` → overview (grades + debts + lesson-bound tasks).

## Последствия
- Нет одной таблицы «всё про учёбу».
- Перенос пары (LOCAL `isMoved`) не трогает Grade/Task.
- Следующий шаг при реальном LMS: GradeSource enum + sync worker; сейчас — демо-данные + ручной staff.
