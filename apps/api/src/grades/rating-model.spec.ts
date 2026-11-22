import {
  buildSemesterRating,
  ectsFromScore,
  labelFromScore,
  parseGradeScore,
  scoreToFivePoint,
} from './rating-model';

describe('rating-model', () => {
  it('parses 100-point, five-point and special grades', () => {
    expect(parseGradeScore('95')).toBe(95);
    expect(parseGradeScore('91,16')).toBeCloseTo(91.16);
    expect(parseGradeScore('5')).toBe(100);
    expect(parseGradeScore('4')).toBe(80);
    expect(parseGradeScore('3')).toBe(60);
    expect(parseGradeScore('2')).toBe(40);
    expect(parseGradeScore('зачет')).toBe(100);
    expect(parseGradeScore('неявка')).toBe(0);
    expect(parseGradeScore('')).toBeNull();
  });

  it('maps score to ECTS and RU label', () => {
    expect(ectsFromScore(95)).toBe('A');
    expect(ectsFromScore(70)).toBe('D');
    expect(ectsFromScore(60)).toBe('E');
    expect(ectsFromScore(40)).toBe('F');
    expect(labelFromScore(95)).toBe('Отлично');
    expect(labelFromScore(70)).toBe('Удовлетворительно');
    expect(labelFromScore(0)).toBe('Неудовлетворительно');
  });

  it('builds semester blocks with weighted overall (A2-style demo)', () => {
    const rating = buildSemesterRating(
      [
        {
          discipline: 'Микроэкономика',
          grade: '95',
          gradeType: 'exam',
          semester: '2025-весна',
          isDebt: false,
        },
        {
          discipline: 'Логика',
          grade: 'зачет',
          gradeType: 'pass',
          semester: '2025-весна',
          isDebt: false,
        },
        {
          discipline: 'Математический анализ',
          grade: '60',
          gradeType: 'exam',
          semester: '2025-весна',
          isDebt: false,
        },
      ],
      '2025-весна',
      { socialAvg: 4.8, bonus: 0 },
    );

    expect(rating.exams).toHaveLength(2);
    expect(rating.passes).toHaveLength(1);
    expect(rating.b2).toBeGreaterThan(70);
    expect(rating.b1).toBeGreaterThan(0);
    expect(rating.b3).toBeCloseTo(96, 0);
    expect(rating.overall).toBeGreaterThan(70);
    expect(rating.ects).toMatch(/^[A-F]$/);
    expect(rating.current[0].cuts).toHaveLength(3);
    expect(scoreToFivePoint(95)).toBe(5);
  });

  it('keeps debt exams visible and pulls overall down', () => {
    const calm = buildSemesterRating(
      [
        {
          discipline: 'Право',
          grade: '95',
          gradeType: 'exam',
          semester: '2025-осень',
          isDebt: false,
        },
      ],
      '2025-осень',
      { socialAvg: 4.5, bonus: 10 },
    );
    const risk = buildSemesterRating(
      [
        {
          discipline: 'Право',
          grade: 'неявка',
          gradeType: 'exam',
          semester: '2025-осень',
          isDebt: true,
        },
        {
          discipline: 'История',
          grade: '2',
          gradeType: 'exam',
          semester: '2025-осень',
          isDebt: true,
        },
      ],
      '2025-осень',
      { socialAvg: 3.2, bonus: 0 },
    );
    expect(risk.exams.some((e) => e.isDebt)).toBe(true);
    expect(risk.overall).toBeLessThan(calm.overall);
  });
});
