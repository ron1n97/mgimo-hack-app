import assert from "node:assert/strict";
import { summarizeDigestItem } from "./digest-summary.ts";

{
  const s = summarizeDigestItem({
    title: "Турнир по настольному теннису",
    body: "Сбор 21 ноября в 19:30. Регистрация: https://forms.gle/abc123 подробности в канале https://t.me/c/1/2",
    url: "https://t.me/club/42",
    startsAt: "2026-11-21T16:30:00.000Z",
    club: { name: "Спортклуб" },
  });
  assert.equal(s.club, "Спортклуб");
  assert.equal(s.title, "Турнир по настольному теннису");
  assert.ok(s.day);
  assert.equal(s.time, "19:30");
  assert.equal(s.registrationUrl, "https://forms.gle/abc123");
  assert.equal(s.postUrl, "https://t.me/club/42");
  assert.ok(!JSON.stringify(s).includes("Сбор 21"));
}

{
  const s = summarizeDigestItem({
    title: "Лекция",
    body: "Завтра в 18:00 зал 3",
    url: null,
    startsAt: null,
    club: { name: "Дебаты" },
  });
  assert.equal(s.day, "Завтра");
  assert.equal(s.time, "18:00");
  assert.equal(s.registrationUrl, null);
  assert.equal(s.postUrl, null);
}

console.log("digest-summary.spec.ts: ok");
