# 0008. Subgroup preference for RUZ schedule parallels

## Статус
Принято

## Дата
2026-11-11

## Контекст
В RUZ у одной академической группы в одном слоте часто несколько параллельных пар (языки / потоки), размеченных `subGroup` / `subGroupOid` / `stream`. Фильтр только по `groupRuzId` показывает все параллели сразу. Upsert без `lessonOid` ещё и схлопывал same-discipline параллели.

## Решение
1. `ruzExternalId = String(lessonOid)`; на `ScheduleLesson` хранить `subGroup`, `subGroupOid`, `stream`, `streamOid`.
2. В `StudentProfile` — `preferredSubGroupOids[]`; после выбора учебной группы студент отмечает свои подгруппы.
3. `schedule.forUser` / Today фильтруют по предпочтению (пары без `subGroupOid` остаются).  
   Студент **никогда** не видит чужие подгруппы: без `preferredSubGroupOids` — только whole-group; `showAll` игнорируется для STUDENT; `groupRuzId` query нельзя подменить. Staff/admin могут `showAll` для просмотра.
4. Discovery sync использует course-prefixed search terms (`1МЭО`…`4МЭО`, `1МО-`…), не глотает error-dict RUZ как `[]`.

## Последствия
- Нужна миграция Prisma + повторный sync, чтобы заполнить дискриминаторы и 4-й курс в каталоге.
- Старые строки без `lessonOid` в rawJson останутся под legacy-id до следующего sync.
