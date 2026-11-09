/**
 * Strip model chrome so the cabinet stores a real заявление, not a markdown essay.
 */
export function sanitizeDraftText(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  // Drop trailing "примечания / что заполнить / checklist" blocks
  text = text.split(
    /\n+\s*(?:---+\s*)?(?:\*\*|__)?\s*(?:примечания|что заполнить|важно|заметки|checklist|notes)(?:\s|\(|:|$)[\s\S]*$/i,
  )[0];

  // Remove fenced code / bold markers / heading hashes
  text = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '');

  // Drop placeholder bracket lines the model invents when data is missing
  text = text
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\[.+\]$/.test(t)) return false;
      if (/не указан/i.test(t) && /факультет|направление|групп/i.test(t)) {
        return false;
      }
      return true;
    })
    .join('\n');

  // Collapse 3+ blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

export function isProfilePlaceholder(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === 'не указан' ||
    v === 'не указана' ||
    v === 'без группы' ||
    v === 'n/a'
  );
}
