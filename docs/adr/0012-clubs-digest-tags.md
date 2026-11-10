# 0012. Clubs registry, digest sources, tags & subscriptions

## Статус
Принято

## Дата
2026-11-11

## Контекст
Нужен реестр студенческих клубов с источниками TG/VK для будущего дайджеста афиши, без ML k-NN. Студент заявляет клуб → сотрудник подтверждает; digest_enabled и источники — отдельно. Теги и подписки фильтруют ленту и будущие пуши. Коллега (концепт §9): кандидаты событий модерируются до публикации в афишу.

## Решение
- Prisma: `Club` (DRAFT/CONFIRMED, `digestEnabled`), `Tag`/`ClubTag`, `ClubSource` (url unique, optional club), `ClubMembership`, `StudentTagSubscription`, `ClubSubscription`, `EventCandidate` (+ `EventModerationStatus`).
- API: каталог/создание клуба, staff confirm + digest toggle + digest sources, интересы студента, stub `GET /digest/feed?filter=subscribed`.
- Seed из JSON-фикстуры реестра (xlsx → `prisma/data/clubs-registry.json`).
- Ранжирование AI и TG scraper / Web Push — out of scope этого среза.

## Последствия
- IDOR: подписки всегда по JWT `userId`; draft-клубы скрыты от чужих студентов; staff-only confirm/digest/moderation.
- Ingest t.me/s/… и push — другие агенты; лента пока на seed/stub EventCandidate.
