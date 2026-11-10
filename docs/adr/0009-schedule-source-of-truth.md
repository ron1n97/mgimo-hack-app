# 0009. Schedule source of truth (DB over casual RUZ overwrite)

## Статус
Принято

## Дата
2026-11-11

## Контекст
Cron RUZ sync upsert’ил пары «вслепую» и мог затирать локальные правки / self-planned слоты. Нужна явная политика: когда тянуть RUZ, когда доверять своей БД.

## Решение
1. **Coverage rule:** если для `groupRuzId` + date range уже есть ≥1 `ScheduleLesson` → DB = SoT; worker и lazy-pull **не** дергают RUZ для этого окна.
2. **Miss → pull:** если строк нет → lazy pull (API при чтении расписания / подгрупп) или cron sync создаёт строки с `source = RUZ`.
3. **Per-row:** поле `ScheduleLesson.source` (`RUZ` | `LOCAL`). Upsert из RUZ **только create** при отсутствии ключа; существующие строки (включая `LOCAL` и уже импортированные `RUZ`) не обновляются.
4. Self-planned / ручные правки помечаются `source = LOCAL` (будущий UI редактирования).

## Последствия
- Отмены/переносы в RUZ не подтянутся автоматически, пока локальное покрытие окна не очищено осознанно.
- Подгруппы в профиле появляются после первого miss-pull или успешного sync на пустую группу.
- Миграция добавляет enum `ScheduleLessonSource` + колонку `source`.
