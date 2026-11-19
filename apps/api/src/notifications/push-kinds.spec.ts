import { shouldSendWebPush } from './push-kinds';

describe('shouldSendWebPush', () => {
  it('allows grade_*, digest_*, deanery_*, schedule_*', () => {
    expect(shouldSendWebPush('grade_posted')).toBe(true);
    expect(shouldSendWebPush('grade_debt')).toBe(true);
    expect(shouldSendWebPush('digest_morning')).toBe(true);
    expect(shouldSendWebPush('digest_week')).toBe(true);
    expect(shouldSendWebPush('deanery_announce')).toBe(true);
    expect(shouldSendWebPush('schedule_moved')).toBe(true);
  });

  it('skips other kinds', () => {
    expect(shouldSendWebPush('request_status')).toBe(false);
    expect(shouldSendWebPush('academic_debt')).toBe(false);
    expect(shouldSendWebPush('')).toBe(false);
  });
});
