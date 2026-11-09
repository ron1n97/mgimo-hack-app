import { isProfilePlaceholder, sanitizeDraftText } from './sanitize-draft';

describe('sanitizeDraftText', () => {
  it('strips markdown notes and bullet checklist after the statement', () => {
    const raw = `Декану факультета

Заявление.

Прошу предоставить академический отпуск.

Дата, подпись

---

**Примечания (не входят в текст заявки):**
- В данных указано мужское имя
- Не указаны факультет`;

    const out = sanitizeDraftText(raw);
    expect(out).toContain('Прошу предоставить академический отпуск');
    expect(out).not.toMatch(/Примечания/i);
    expect(out).not.toContain('мужское имя');
    expect(out).not.toContain('**');
  });

  it('drops pure placeholder bracket lines', () => {
    const out = sanitizeDraftText(
      'Декану\n[ФИО декана]\nот студента\nПрошу отпуск.',
    );
    expect(out).not.toContain('[ФИО декана]');
    expect(out).toContain('Прошу отпуск');
  });
});

describe('isProfilePlaceholder', () => {
  it('detects empty contest defaults', () => {
    expect(isProfilePlaceholder('Не указан')).toBe(true);
    expect(isProfilePlaceholder('Без группы')).toBe(true);
    expect(isProfilePlaceholder('Международные отношения')).toBe(false);
  });
});
