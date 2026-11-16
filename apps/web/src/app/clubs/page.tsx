"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createClub,
  fetchClubs,
  fetchDigestFeed,
  fetchInterests,
  fetchTags,
  setInterestTags,
  subscribeClub,
  unsubscribeClub,
} from "@/lib/api";
import { splitDigestFeed } from "@/lib/digest-split";
import type { Club, ClubTag, DigestFeedItem, StudentInterests } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

type ClubsTab = "digest" | "catalog";

function formatEventWhen(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  });
  // Date-only parses use 00:00 MSK — omit fake midnight clock.
  if (time === "00:00") return date;
  return `${date}, ${time}`;
}

function DigestItem({
  item,
  idPrefix,
}: {
  item: DigestFeedItem;
  idPrefix: string;
}) {
  const when = formatEventWhen(item.startsAt);
  return (
    <li
      key={`${idPrefix}-${item.id}`}
      className="border-b border-cream-deep/80 py-3 last:border-b-0"
    >
      <div className="flex gap-3">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover bg-cream-deep"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted">
            {item.club?.name}
            {when ? ` · ${when}` : ""}
          </p>
          <h3 className="font-medium text-ink">{item.title}</h3>
          {item.body ? (
            <p className="mt-1 line-clamp-3 text-sm text-ink-muted">{item.body}</p>
          ) : null}
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-copper underline-offset-2 hover:underline"
            >
              Открыть в Telegram →
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [tags, setTags] = useState<ClubTag[]>([]);
  const [interests, setInterests] = useState<StudentInterests | null>(null);
  /** Personalized feed (subscriptions). Empty until user picks tags/clubs. */
  const [interestFeed, setInterestFeed] = useState<DigestFeedItem[]>([]);
  /** All approved stubs — powers «Что сегодня» / «Недельный дайджест». */
  const [publicFeed, setPublicFeed] = useState<DigestFeedItem[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formSources, setFormSources] = useState("");
  const [tab, setTab] = useState<ClubsTab>("digest");

  const subscribedClubIds = useMemo(
    () => new Set((interests?.clubs ?? []).map((c) => c.id)),
    [interests],
  );
  const subscribedTagIds = useMemo(
    () => new Set((interests?.tags ?? []).map((t) => t.id)),
    [interests],
  );

  const { todayFeed, weekFeed } = useMemo(() => {
    const { today, week } = splitDigestFeed(publicFeed);
    return { todayFeed: today, weekFeed: week };
  }, [publicFeed]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clubList, tagList, mine, personalized, allDigest] = await Promise.all([
        fetchClubs({
          tag: activeTag ?? undefined,
          q: q.trim() || undefined,
        }),
        fetchTags(),
        fetchInterests(),
        fetchDigestFeed("subscribed"),
        fetchDigestFeed(),
      ]);
      setClubs(clubList);
      setTags(tagList);
      setInterests(mine);
      setInterestFeed(personalized);
      setPublicFeed(allDigest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [activeTag, q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#weekly-digest") {
      setTab("digest");
    }
  }, []);

  async function toggleTagInterest(tag: ClubTag) {
    setBusy(true);
    setError(null);
    try {
      const next = new Set(subscribedTagIds);
      if (next.has(tag.id)) next.delete(tag.id);
      else next.add(tag.id);
      const updated = await setInterestTags([...next]);
      setInterests(updated);
      const digest = await fetchDigestFeed("subscribed");
      setInterestFeed(digest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить интересы");
    } finally {
      setBusy(false);
    }
  }

  async function toggleClubSub(club: Club) {
    setBusy(true);
    setError(null);
    try {
      const updated = subscribedClubIds.has(club.id)
        ? await unsubscribeClub(club.id)
        : await subscribeClub(club.id);
      setInterests(updated);
      const digest = await fetchDigestFeed("subscribed");
      setInterestFeed(digest);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось подписаться");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createClub({
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sourceUrls: formSources
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setFormName("");
      setFormDesc("");
      setFormTags("");
      setFormSources("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать клуб");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Клубы</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Сначала дайджест анонсов — каталог клубов отдельно, без бесконечной
            прокрутки.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab("catalog");
            setShowForm((v) => !v);
          }}
          className="shrink-0 rounded-xl bg-copper px-3.5 py-2 text-sm font-semibold text-cream hover:bg-copper-dark"
        >
          {showForm ? "Скрыть форму" : "Заявить клуб"}
        </button>
      </header>

      <div
        role="tablist"
        aria-label="Разделы клубов"
        className="sticky top-0 z-20 -mx-1 flex gap-1 border-b border-cream-deep bg-cream/95 px-1 py-2 backdrop-blur"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "digest"}
          onClick={() => setTab("digest")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            tab === "digest"
              ? "bg-ink text-cream"
              : "text-ink-muted hover:bg-white/50 hover:text-ink"
          }`}
        >
          Дайджест
          {!loading ? (
            <span className="ml-1.5 font-normal opacity-80">
              {todayFeed.length + weekFeed.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "catalog"}
          onClick={() => setTab("catalog")}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            tab === "catalog"
              ? "bg-ink text-cream"
              : "text-ink-muted hover:bg-white/50 hover:text-ink"
          }`}
        >
          Каталог
          {!loading ? (
            <span className="ml-1.5 font-normal opacity-80">{clubs.length}</span>
          ) : null}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Мои интересы</h2>
        <p className="text-sm text-ink-muted">
          Теги фильтруют персональную ленту и будущие пуши.
        </p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const on = subscribedTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={busy}
                onClick={() => void toggleTagInterest(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  on
                    ? "bg-ink text-cream"
                    : "border border-cream-deep bg-white/40 text-ink-muted hover:text-ink"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
          {!loading && tags.length === 0 ? (
            <span className="text-sm text-ink-muted">Тегов пока нет</span>
          ) : null}
        </div>
      </section>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && tab === "digest" ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Что сегодня</h2>
            <p className="text-sm text-ink-muted">
              Анонсы на сегодня. Подписка не нужна.
            </p>
            {todayFeed.length === 0 ? (
              <p className="text-sm text-ink-muted">
                На сегодня анонсов нет
                {weekFeed.length
                  ? ` · смотрите недельный дайджест (${weekFeed.length})`
                  : ""}
                .
              </p>
            ) : (
              <ul>
                {todayFeed.map((item) => (
                  <DigestItem key={item.id} item={item} idPrefix="today" />
                ))}
              </ul>
            )}
          </section>

          <section id="weekly-digest" className="scroll-mt-28 space-y-3">
            <h2 className="font-serif text-xl text-ink">Недельный дайджест</h2>
            <p className="text-sm text-ink-muted">
              Сводка на текущую неделю — удобнее ежедневного шума.
            </p>
            {weekFeed.length === 0 ? (
              <p className="text-sm text-ink-muted">На этой неделе пока пусто.</p>
            ) : (
              <ul>
                {weekFeed.map((item) => (
                  <DigestItem key={item.id} item={item} idPrefix="week" />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Лента по интересам</h2>
            <p className="text-sm text-ink-muted">
              Только одобренные анонсы по вашим тегам и клубам.
            </p>
            {interestFeed.length === 0 ? (
              <EmptyState
                title="Пока пусто"
                description="Выберите теги выше или откройте каталог и добавьте клубы в интересы."
              />
            ) : (
              <ul>
                {interestFeed.map((item) => (
                  <DigestItem key={item.id} item={item} idPrefix="interest" />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setTab("catalog")}
              className="text-sm font-medium text-copper underline-offset-2 hover:underline"
            >
              Открыть каталог клубов →
            </button>
          </section>
        </div>
      ) : null}

      {!loading && !error && tab === "catalog" ? (
        <div className="space-y-6">
          {showForm ? (
            <form
              onSubmit={onCreate}
              className="space-y-3 border-y border-cream-deep py-4"
            >
              <p className="text-sm text-ink-muted">
                Заявка уходит в статус draft — сотрудник подтверждает в кабинете.
              </p>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Название"
                className="w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm"
                required
              />
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Кратко о клубе"
                rows={2}
                className="w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm"
              />
              <input
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="Теги через запятую (Спорт, Творчество…)"
                className="w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm"
              />
              <input
                value={formSources}
                onChange={(e) => setFormSources(e.target.value)}
                placeholder="Ссылки TG/VK через запятую"
                className="w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
              >
                Отправить на подтверждение
              </button>
            </form>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-xl text-ink">Каталог</h2>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск"
                className="ml-auto w-40 rounded-lg border border-cream-deep bg-white/50 px-2.5 py-1 text-sm md:w-56"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-full px-3 py-1 text-xs ${
                  !activeTag
                    ? "bg-copper text-cream"
                    : "border border-cream-deep text-ink-muted"
                }`}
              >
                Все
              </button>
              {tags.map((tag) => (
                <button
                  key={`filter-${tag.id}`}
                  type="button"
                  onClick={() =>
                    setActiveTag(tag.slug === activeTag ? null : tag.slug)
                  }
                  className={`rounded-full px-3 py-1 text-xs ${
                    activeTag === tag.slug
                      ? "bg-copper text-cream"
                      : "border border-cream-deep text-ink-muted"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {clubs.length === 0 ? (
              <EmptyState
                title="Клубов нет"
                description="Заявите свой или дождитесь подтверждения реестра."
              />
            ) : (
              <ul className="divide-y divide-cream-deep/80">
                {clubs.map((club) => {
                  const sub = subscribedClubIds.has(club.id);
                  return (
                    <li key={club.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-ink">{club.name}</h3>
                            {club.status === "DRAFT" ? (
                              <span className="text-[11px] uppercase tracking-wide text-copper">
                                на подтверждении
                              </span>
                            ) : null}
                            {club.digestEnabled ? (
                              <span className="text-[11px] text-ink-muted">
                                дайджест
                              </span>
                            ) : null}
                          </div>
                          {club.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                              {club.description}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {club.tags.map((t) => (
                              <span
                                key={t.id}
                                className="rounded-full bg-cream-deep/70 px-2 py-0.5 text-[11px] text-ink-muted"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                          {club.sources.length > 0 ? (
                            <p className="mt-2 text-xs text-ink-muted">
                              Источники:{" "}
                              {club.sources
                                .map((s) => s.kind.toLowerCase())
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                        {club.status === "CONFIRMED" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void toggleClubSub(club)}
                            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                              sub
                                ? "border border-ink/20 text-ink"
                                : "bg-ink text-cream"
                            }`}
                          >
                            {sub ? "Отписаться" : "В интересы"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
