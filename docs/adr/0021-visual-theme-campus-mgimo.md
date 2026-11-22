# 0021. Visual theme: Кампус × MGIMO palette

## Статус
Принято

## Дата
2026-11-22

## Контекст
Продукт жил на cream/copper (editorial). После ресёрча концепций выбран **вариант A «Кампус»** с наложением цветов с [mgimo.ru/about/logo](https://mgimo.ru/about/logo/) (SVG fills + CSS сайта). Полный брендбук вуза в открытом доступе отсутствует. Герб/wordmark МГИМО в UI запрещены (конкурсный freeze).

## Решение
Единые токены в `packages/shared` `BRAND_COLORS` (+ зеркало в `apps/web/tailwind.config.ts`):

| Token (legacy name) | Role | Hex |
|---------------------|------|-----|
| ink | onSurface / chrome | `#162256` |
| cream | surface | `#F3F4F8` |
| creamDeep | surfaceContainer | `#E8EAF2` |
| copper | primary | `#18488B` |
| copperDark | primary pressed | `#123A6E` |
| inkMuted | onSurfaceVariant | `#5A6478` |
| accent | tertiary / status | `#C32827` |
| link | links | `#1586C8` |

Web/PWA: Montserrat (sans=serif alias), themeColor/manifest обновлены. Mobile читает shared. Имена `cream`/`copper` сохранены, чтобы не переписывать все className.

## Последствия
- Все экраны web/mobile/PWA меняют вид через токены.
- Layout Concept A: `apps/web/src/components/campus.tsx` (PageHeader, ListPanel, NowChip, …) на login / today / schedule / clubs + shell.
- Mobile: shared colors + контраст hero «Сегодня».
- Иконки PWA пока старые — отдельный таск при необходимости.
- Документы/PDF брендбука в `docs/brand/` устарели относительно продукта.
