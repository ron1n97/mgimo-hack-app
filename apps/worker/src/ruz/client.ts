import { parseRuzArrayResponse } from './parse-response';

export type RuzGroupHit = {
  id: number | string;
  label?: string;
  description?: string;
  type?: string;
};

export type RuzLesson = {
  id?: number | string;
  /** Stable lesson id from RUZ (preferred over missing `id`). */
  lessonOid?: number | string;
  date?: string;
  beginLesson?: string;
  endLesson?: string;
  begin?: string;
  end?: string;
  discipline?: string;
  disciplineFullName?: string;
  lecturer?: string;
  lecturer_title?: string;
  auditorium?: string;
  building?: string;
  kindOfWork?: string;
  group?: string;
  stream?: string;
  streamOid?: number | string;
  subGroup?: string;
  subGroupOid?: number | string;
  [key: string]: unknown;
};

export class RuzClient {
  constructor(private readonly baseUrl: string) {}

  async searchGroups(term: string): Promise<RuzGroupHit[]> {
    const url = new URL('/api/search', this.baseUrl);
    url.searchParams.set('term', term);
    url.searchParams.set('type', 'group');

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`RUZ search failed ${res.status} for term=${term}`);
    }
    const data = parseRuzArrayResponse(await res.json(), 'search', `term=${term}`);
    const hits: RuzGroupHit[] = [];
    for (const item of data) {
      const row = item as Record<string, unknown>;
      const id = row.id ?? row.value ?? row.oid;
      if (id == null) continue;
      hits.push({
        id: id as number | string,
        label: String(row.label ?? row.name ?? row.text ?? id),
        description:
          row.description != null ? String(row.description) : undefined,
        type: row.type != null ? String(row.type) : undefined,
      });
    }
    return hits;
  }

  async scheduleForGroup(
    groupId: string | number,
    start: string,
    finish: string,
  ): Promise<RuzLesson[]> {
    const url = new URL(`/api/schedule/group/${groupId}`, this.baseUrl);
    url.searchParams.set('start', start);
    url.searchParams.set('finish', finish);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `RUZ schedule failed ${res.status} for group=${groupId} ${start}..${finish}`,
      );
    }
    const data = parseRuzArrayResponse(
      await res.json(),
      'schedule',
      `group=${groupId}`,
    );
    return data as RuzLesson[];
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
