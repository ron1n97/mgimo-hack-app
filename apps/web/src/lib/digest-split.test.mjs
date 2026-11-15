import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirror of digest-split.ts / API today-digest (Moscow calendar). */
function moscowDateStringOf(isoOrDate) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate);
}

function moscowWeekBounds(day) {
  const [y, m, d] = day.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
  }).format(noonUtc);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const offset = map[weekday] ?? 0;
  const monday = new Date(noonUtc);
  monday.setUTCDate(monday.getUTCDate() - offset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: moscowDateStringOf(monday),
    to: moscowDateStringOf(sunday),
  };
}

function splitDigestFeed(items, day) {
  const { from, to } = moscowWeekBounds(day);
  const today = [];
  const week = [];
  for (const item of items) {
    if (!item.startsAt) continue;
    const evDay = moscowDateStringOf(item.startsAt);
    if (evDay === day) today.push(item);
    if (evDay >= from && evDay <= to) week.push(item);
  }
  return { today, week };
}

describe("digest-split", () => {
  it("puts Moscow-noon stub on the Moscow calendar day", () => {
    assert.equal(moscowDateStringOf("2026-11-15T09:00:00.000Z"), "2026-11-15");
  });

  it("week bounds Mon–Sun for a Sunday", () => {
    const { from, to } = moscowWeekBounds("2026-11-15");
    assert.equal(from, "2026-11-09");
    assert.equal(to, "2026-11-15");
  });

  it("keeps weekly stubs visible when today is empty (weekend)", () => {
    const items = [
      { id: "1", startsAt: "2026-11-12T18:00:00.000Z", title: "midweek" },
      { id: "2", startsAt: "2026-11-14T09:00:00.000Z", title: "fri" },
    ];
    const { today, week } = splitDigestFeed(items, "2026-11-15");
    assert.equal(today.length, 0);
    assert.equal(week.length, 2);
  });

  it("surfaces today stub on the matching Moscow day", () => {
    const items = [
      { id: "t", startsAt: "2026-11-15T09:00:00.000Z", title: "today" },
      { id: "w", startsAt: "2026-11-12T18:00:00.000Z", title: "week" },
    ];
    const { today, week } = splitDigestFeed(items, "2026-11-15");
    assert.equal(today.length, 1);
    assert.equal(today[0].id, "t");
    assert.equal(week.length, 2);
  });
});
