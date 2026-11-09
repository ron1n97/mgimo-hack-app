import { buildApplicationDocx } from './application-docx';

describe('buildApplicationDocx', () => {
  it('returns a non-empty docx buffer', async () => {
    const buf = await buildApplicationDocx({
      studentName: 'Иванов Иван Иванович',
      faculty: 'Международные отношения',
      program: 'Бакалавриат МО',
      course: 3,
      groupLabel: '2МЭО-01',
      requestType: 'Академический отпуск',
      body: 'Прошу предоставить академический отпуск по медицинским показаниям.',
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.byteLength).toBeGreaterThan(1000);
    // ZIP/docx magic
    expect(buf.subarray(0, 2).toString()).toBe('PK');
  });
});
