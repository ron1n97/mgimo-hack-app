import type { RuzLesson } from '../ruz/client';
import {
  buildRuzExternalId,
  lessonBegin,
  mapRuzLessonFields,
} from './upsert';

/** RUZ-shaped fixtures: same discipline/time, different subGroup — real parallel pattern. */
const parallelA: RuzLesson = {
  lessonOid: 10001,
  date: '2026.11.10',
  beginLesson: '14:30',
  endLesson: '16:00',
  discipline: 'Английский язык (второй)',
  subGroup: '01-нем/англ',
  subGroupOid: 501,
  stream: 'поток А',
  streamOid: 701,
};

const parallelB: RuzLesson = {
  lessonOid: 10002,
  date: '2026.11.10',
  beginLesson: '14:30',
  endLesson: '16:00',
  discipline: 'Английский язык (второй)',
  subGroup: '04-хинди/англ',
  subGroupOid: 504,
  stream: 'поток Б',
  streamOid: 702,
};

describe('RUZ upsert mapping', () => {
  it('uses lessonOid as ruzExternalId (not missing lesson.id fallback)', () => {
    expect(buildRuzExternalId(parallelA, '8033')).toBe('10001');
    expect(buildRuzExternalId(parallelB, '8033')).toBe('10002');
  });

  it('keeps two same-discipline parallel lessons as distinct unique keys', () => {
    const groupRuzId = '8033';
    const keys = [parallelA, parallelB].map((lesson) => {
      const id = buildRuzExternalId(lesson, groupRuzId);
      return `${id}|${groupRuzId}|${lesson.date}|${lessonBegin(lesson)}`;
    });
    expect(new Set(keys).size).toBe(2);
  });

  it('legacy discipline fallback would collide — lessonOid must differ', () => {
    const legacy = (l: RuzLesson) =>
      `8033:${l.date}:${l.beginLesson}:${l.discipline}`;
    expect(legacy(parallelA)).toBe(legacy(parallelB));
    expect(buildRuzExternalId(parallelA, '8033')).not.toBe(
      buildRuzExternalId(parallelB, '8033'),
    );
  });

  it('maps subGroup / stream discriminators from RUZ payload', () => {
    const mapped = mapRuzLessonFields(parallelA, '8033', '2МЭО-01');
    expect(mapped.ruzExternalId).toBe('10001');
    expect(mapped.subGroup).toBe('01-нем/англ');
    expect(mapped.subGroupOid).toBe('501');
    expect(mapped.stream).toBe('поток А');
    expect(mapped.streamOid).toBe('701');
    expect(mapped.discipline).toBe('Английский язык (второй)');
  });
});
