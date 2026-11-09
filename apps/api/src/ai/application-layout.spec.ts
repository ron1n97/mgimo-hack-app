import {
  assembleApplicationText,
  extractStatementBody,
  shortName,
} from './application-layout';

describe('extractStatementBody', () => {
  it('keeps only the plea and drops шапка / notes', () => {
    const raw = `Декану
факультета

от Гуськова Романа

ЗАЯВЛЕНИЕ

Прошу предоставить академический отпуск по медицинским показаниям.

Дата: ____
Подпись: ____

---
Примечания:
- мужское имя`;

    const out = extractStatementBody(raw);
    expect(out).toMatch(/^Прошу предоставить/);
    expect(out).not.toMatch(/Декану|ЗАЯВЛЕНИЕ|Примечания|Подпись/i);
  });
});

describe('shortName', () => {
  it('formats Фамилия Имя Отчество as И.О. Фамилия', () => {
    expect(shortName('Гуськов Роман Дмитриевич')).toBe('Р.Д. Гуськов');
  });
});

describe('assembleApplicationText', () => {
  it('builds gost-shaped plain text', () => {
    const text = assembleApplicationText(
      {
        fullName: 'Гуськов Роман Дмитриевич',
        faculty: 'Международные отношения',
        course: 3,
        groupLabel: '2МЭО-01',
      },
      'Прошу предоставить академический отпуск.',
    );
    expect(text).toContain('Декану');
    expect(text).toContain('ЗАЯВЛЕНИЕ');
    expect(text).toContain('Прошу предоставить');
    expect(text).toContain('Р.Д. Гуськов');
    expect(text).not.toContain('Примечания');
  });
});
