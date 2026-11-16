-- Deduplicate EventCandidate.url before unique index (keep newest createdAt).
DELETE FROM "EventCandidate" a
USING "EventCandidate" b
WHERE a.url IS NOT NULL
  AND a.url = b.url
  AND a."createdAt" < b."createdAt";

CREATE UNIQUE INDEX "EventCandidate_url_key" ON "EventCandidate"("url");
