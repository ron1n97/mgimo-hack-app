import { isProfilePlaceholder } from './sanitize-draft';

export type ApplicationProfile = {
  fullName: string;
  faculty?: string;
  program?: string;
  course?: number;
  groupLabel?: string;
};

/** GOST R 7.0.97-2016 layout for student заявление (university practice). */
export const GOST = {
  pageWidth: 11906,
  pageHeight: 16838,
  marginLeft: 1701, // 30 mm
  marginRight: 850, // 15 mm
  marginTop: 1134, // 20 mm
  marginBottom: 1134, // 20 mm
  font: 'Times New Roman',
  fontSize: 28, // 14 pt
  line: 360, // 1.5
  firstLineIndent: 709, // 1.25 cm
} as const;

export function cleanProfile(profile: {
  fullName: string;
  faculty?: string | null;
  program?: string | null;
  course?: number | null;
  groupLabel?: string | null;
}): ApplicationProfile {
  return {
    fullName: profile.fullName.trim(),
    faculty: isProfilePlaceholder(profile.faculty)
      ? undefined
      : profile.faculty?.trim(),
    program: isProfilePlaceholder(profile.program)
      ? undefined
      : profile.program?.trim(),
    course: profile.course && profile.course > 0 ? profile.course : undefined,
    groupLabel: isProfilePlaceholder(profile.groupLabel)
      ? undefined
      : profile.groupLabel?.trim(),
  };
}

/** Right-side addressee block (кому / от кого). */
export function buildAddresseeLines(profile: ApplicationProfile): string[] {
  const lines: string[] = ['Декану'];
  lines.push(
    profile.faculty ? `факультета «${profile.faculty}»` : 'факультета',
  );
  lines.push('');
  const who: string[] = [];
  if (profile.course) who.push(`студента(ки) ${profile.course} курса`);
  else who.push('студента(ки) ____ курса');
  if (profile.groupLabel) who.push(`группы ${profile.groupLabel}`);
  lines.push(who.join(' '));
  if (profile.program) lines.push(profile.program);
  lines.push(profile.fullName);
  return lines;
}

/**
 * Keep only substantive paragraphs (drop шапка, title, date/signature, notes).
 */
export function extractStatementBody(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return text;

  text = text.split(
    /\n+\s*(?:---+\s*)?(?:\*\*|__)?\s*(?:примечания|что заполнить|важно|заметки|checklist|notes)(?:\s|\(|:|$)[\s\S]*$/i,
  )[0];

  const lines = text.split('\n');
  const out: string[] = [];
  let started = false;

  for (const line of lines) {
    const t = line
      .trim()
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/, '');
    if (!t) {
      if (started) out.push('');
      continue;
    }
    if (/^заявление\.?$/i.test(t)) {
      started = true;
      continue;
    }
    if (/^(дата|подпись)(?:\s|:|$)/i.test(t)) {
      if (started) break;
      continue;
    }
    if (
      !started &&
      (/^декану\b/i.test(t) ||
        /^от\s+/i.test(t) ||
        /^\[.+\]$/.test(t) ||
        (/факультет|курс|групп|направлен|студент/i.test(t) &&
          !/^прошу\b/i.test(t)))
    ) {
      continue;
    }
    if (/^прошу\b/i.test(t) || started || t.length > 50) {
      started = true;
      out.push(t);
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const SURNAME_TAIL =
  /(ов|ова|ев|ева|ёв|ёва|ин|ина|ын|ына|ский|ская|цкий|цкая|ук|юк|енко|ко)$/i;

/** И.О. Фамилия — supports «Фамилия Имя Отчество» and «Имя Фамилия». */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '__________';
  if (parts.length === 1) return parts[0];

  let family: string;
  let nameParts: string[];
  if (parts.length === 2 && SURNAME_TAIL.test(parts[1]) && !SURNAME_TAIL.test(parts[0])) {
    // Имя Фамилия
    family = parts[1];
    nameParts = [parts[0]];
  } else {
    // Фамилия Имя Отчество
    family = parts[0];
    nameParts = parts.slice(1);
  }
  const initials = nameParts
    .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ''))
    .join('');
  return `${initials} ${family}`.trim();
}

function monthRu(m: number): string {
  return [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ][m];
}

export function formatGostDate(d = new Date()): string {
  return `«${String(d.getDate()).padStart(2, '0')}» ${monthRu(d.getMonth())} ${d.getFullYear()} г.`;
}

/** Full plain-text заявление for the editable field. */
export function assembleApplicationText(
  profile: ApplicationProfile,
  body: string,
): string {
  const essence = extractStatementBody(body) || body.trim();
  return [
    ...buildAddresseeLines(profile),
    '',
    'ЗАЯВЛЕНИЕ',
    '',
    essence,
    '',
    `${formatGostDate()}                          ___________ / ${shortName(profile.fullName)} /`,
  ].join('\n');
}
