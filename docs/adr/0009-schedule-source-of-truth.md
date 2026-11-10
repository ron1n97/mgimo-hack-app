# 0009. Schedule source of truth (DB over casual RUZ overwrite)

## Статус
Принято

## Дата
2026-11-11

## Контекст
Cron RUZ sync upsert’ил пары «вслепую» и мог затирать локальные правки / self-planned слоты. Нужна явная политика: когда тянуть RUZ, когда доверять своей БД.

## Решение
1. **Coverage rule:** если для `groupRuzId` + date range уже есть ≥1 `ScheduleLesson` **и** хотя бы у одной строки заполнен `subGroupOid` → DB = SoT; worker и lazy-pull **не** дергают RUZ для этого окна.
2. **Miss → pull:** если строк нет → lazy pull (API при чтении расписания / подгрупп) или cron sync создаёт строки с `source = RUZ`.
3. **Legacy enrichment:** если строки есть, но `subGroupOid` ни у кого не заполнен (импорт до параллелей) → разрешён повторный pull только чтобы дописать дискриминаторы.
4. **Per-row:** поле `ScheduleLesson.source` (`RUZ` | `LOCAL`). `LOCAL` никогда не перезаписывается. Полные `RUZ` строки не трогаем. `RUZ` с `subGroupOid = null` можно обогатить.
5. Self-planned / ручные правки помечаются `source = LOCAL` (будущий UI редактирования).

## Последствия
- Отмены/переносы в RUZ не подтянутся автоматически после того, как окно уже «закрыто» обогащёнными/полными строками.
- Подгруппы в профиле появляются после miss-pull или enrichment-pass.
- Миграция добавляет enum `ScheduleLessonSource` + колонку `source`.
