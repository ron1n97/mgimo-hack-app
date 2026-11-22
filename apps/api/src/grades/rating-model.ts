/**
 * Demo semester rating inspired by typical RU weighted blocks (Б1/Б2/Б3 + bonus).
 * Not an official ЛК — contest fiction only.
 */

export type GradeLike = {
  discipline: string;
  grade: string;
  gradeType: string;
  semester: string;
  isDebt?: boolean;
};

export type RatingOpts = {
  /** Average of six social traits on 1..5 scale */
  socialAvg: number;
  /** 0..100 public/scientific/sports bonus before 0.05 weight */
  bonus: number;
};

export type DisciplineScore = {
  discipline: string;
  score: number;
  fivePoint: number | null;
  label: string;
  ects: string;
  isDebt: boolean;
  display: string;
};

export type CurrentRow = {
  discipline: string;
  cuts: [number, number, number];
  average: number;
};

export type SocialRow = {
  discipline: string;
  erudition: number;
  diligence: number;
  activity: number;
  independent: number;
  ethics: number;
  attendance: number;
  b3: number;
};

export type SemesterRating = {
  semester: string;
  overall: number;
  ects: string;
  label: string;
  b1: number;
  b2: number;
  b3: number;
  bonus: number;
  exams: DisciplineScore[];
  passes: DisciplineScore[];
  current: CurrentRow[];
  social: SocialRow[];
  byDiscipline: DisciplineScore[];
};

const W_B1 = 0.4;
const W_B2 = 0.5;
const W_B3 = 0.1;
const W_BONUS = 0.05;

const FIVE_TO_100: Record<string, number> = {
  '5': 100,
  '4': 80,
  '3': 60,
  '2': 40,
  '1': 20,
};

export function parseGradeScore(raw: string): number | null {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!s) return null;
  if (s === 'неявка' || s === 'н/я' || s === 'н.я.') return 0;
  if (s === 'зачет' || s === 'зачёт' || s === 'pass') return 100;
  if (s === 'незачет' || s === 'незачёт') return 0;
  if (FIVE_TO_100[s] != null) return FIVE_TO_100[s];
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

export function scoreToFivePoint(score: number): number | null {
  if (!Number.isFinite(score)) return null;
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function ectsFromScore(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 85) return 'B';
  if (score >= 75) return 'C';
  if (score >= 65) return 'D';
  if (score >= 60) return 'E';
  return 'F';
}

export function labelFromScore(score: number): string {
  if (score >= 90) return 'Отлично';
  if (score >= 75) return 'Хорошо';
  if (score >= 60) return 'Удовлетворительно';
  return 'Неудовлетворительно';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function isPassType(gradeType: string): boolean {
  const t = gradeType.toLowerCase();
  return t === 'pass' || t.includes('зач');
}

function isExamType(gradeType: string): boolean {
  const t = gradeType.toLowerCase();
  return t === 'exam' || t.includes('экз');
}

function toDisciplineScore(
  g: GradeLike,
  score: number,
): DisciplineScore {
  const five = scoreToFivePoint(score);
  const label = labelFromScore(score);
  const ects = ectsFromScore(score);
  const raw = String(g.grade).trim();
  const display =
    parseGradeScore(raw) != null && /[0-9]/.test(raw) && Number(raw.replace(',', '.')) > 5
      ? `${round2(score)} / «${label}» / «${ects}»`
      : raw.toLowerCase() === 'зачет' || raw.toLowerCase() === 'зачёт'
        ? `${round2(score)} / «Зачет» / «${ects}»`
        : raw.toLowerCase() === 'неявка'
          ? `0 / «Неявка» / «F»`
          : `${raw} · ${round2(score)} / «${label}» / «${ects}»`;
  return {
    discipline: g.discipline,
    score: round2(score),
    fivePoint: five,
    label,
    ects,
    isDebt: Boolean(g.isDebt) || score < 60,
    display,
  };
}

/** Deterministic pseudo-cuts around a semester average for demo UI. */
function cutsAround(average: number, salt: number): [number, number, number] {
  const a = Math.max(0, Math.min(100, average + ((salt % 7) - 3) * 1.5));
  const b = Math.max(0, Math.min(100, average + ((salt % 5) - 2) * 2.2));
  const c = Math.max(0, Math.min(100, average * 3 - a - b));
  return [round2(a), round2(b), round2(Math.max(0, Math.min(100, c)))];
}

function socialForDiscipline(
  discipline: string,
  socialAvg: number,
  salt: number,
): SocialRow {
  const base = Math.max(1, Math.min(5, socialAvg));
  const jitter = (i: number) => {
    const v = base + (((salt + i * 3) % 5) - 2) * 0.15;
    return round2(Math.max(1, Math.min(5, v)));
  };
  const traits = [0, 1, 2, 3, 4, 5].map(jitter);
  const mean = avg(traits);
  return {
    discipline,
    erudition: traits[0],
    diligence: traits[1],
    activity: traits[2],
    independent: traits[3],
    ethics: traits[4],
    attendance: traits[5],
    b3: round2((mean / 5) * 100),
  };
}

export function buildSemesterRating(
  grades: GradeLike[],
  semester: string,
  opts: RatingOpts,
): SemesterRating {
  const rows = grades.filter((g) => g.semester === semester);
  const scored = rows
    .map((g) => {
      const score = parseGradeScore(g.grade);
      if (score == null) return null;
      return { g, score, row: toDisciplineScore(g, score) };
    })
    .filter(Boolean) as Array<{
    g: GradeLike;
    score: number;
    row: DisciplineScore;
  }>;

  const exams = scored
    .filter((x) => isExamType(x.g.gradeType))
    .map((x) => x.row);
  const passes = scored
    .filter((x) => isPassType(x.g.gradeType))
    .map((x) => x.row);
  const session = scored.filter(
    (x) => isExamType(x.g.gradeType) || isPassType(x.g.gradeType),
  );

  const b2 = round2(avg(session.map((x) => x.score)));

  const current: CurrentRow[] = scored.map((x, i) => {
    const cuts = cutsAround(x.score, x.g.discipline.length * 17 + i * 13);
    return {
      discipline: x.g.discipline,
      cuts,
      average: round2(avg(cuts)),
    };
  });
  const b1 = round2(avg(current.map((c) => c.average)));

  const social = scored.map((x, i) =>
    socialForDiscipline(
      x.g.discipline,
      opts.socialAvg,
      x.g.discipline.length * 11 + i,
    ),
  );
  const b3 = round2(
    social.length ? avg(social.map((s) => s.b3)) : (opts.socialAvg / 5) * 100,
  );
  const bonus = round2(Math.max(0, Math.min(100, opts.bonus)));

  let overall = W_B1 * b1 + W_B2 * b2 + W_B3 * b3 + W_BONUS * bonus;
  overall = round2(Math.min(100, overall));

  const byDiscipline = [...scored]
    .sort((a, b) => a.g.discipline.localeCompare(b.g.discipline, 'ru'))
    .map((x) => {
      const blended = round2(
        W_B1 * (current.find((c) => c.discipline === x.g.discipline)?.average ?? x.score) +
          W_B2 * x.score +
          W_B3 * (social.find((s) => s.discipline === x.g.discipline)?.b3 ?? b3),
      );
      return toDisciplineScore(
        { ...x.g, grade: String(blended) },
        blended,
      );
    });

  return {
    semester,
    overall,
    ects: ectsFromScore(overall),
    label: labelFromScore(overall),
    b1,
    b2,
    b3,
    bonus,
    exams,
    passes,
    current,
    social,
    byDiscipline,
  };
}

export function listSemesters(grades: GradeLike[]): string[] {
  return [...new Set(grades.map((g) => g.semester).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a, 'ru'),
  );
}

export function ratingPersonaOpts(fullName: string | null | undefined): RatingOpts {
  const name = (fullName ?? '').toLowerCase();
  if (name.includes('рискова')) return { socialAvg: 3.4, bonus: 0 };
  if (name.includes('спокойный')) return { socialAvg: 4.85, bonus: 12 };
  if (name.includes('орлов')) return { socialAvg: 4.6, bonus: 5 };
  return { socialAvg: 4.4, bonus: 0 };
}
