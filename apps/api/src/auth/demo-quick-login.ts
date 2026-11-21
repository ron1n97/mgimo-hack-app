/**
 * Demo quick-login gate for the contest stand.
 * Passwords stay on the server; clients only send personaId.
 */
export function isDemoQuickLoginEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const flag = (env.DEMO_QUICK_LOGIN ?? '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'yes') {
    return true;
  }
  if (flag === '0' || flag === 'false' || flag === 'no') {
    return false;
  }
  // Local / test DX: on unless production
  return (env.NODE_ENV ?? 'development') !== 'production';
}

export type DemoPersonaRoleHint =
  | 'student'
  | 'teacher'
  | 'staff'
  | 'admin';

export type DemoPersona = {
  id: string;
  email: string;
  /** Russian button label, e.g. «Войти как студент Рискова» */
  buttonLabel: string;
  roleHint: DemoPersonaRoleHint;
};

/** Server catalog — emails map to seed users; never ship passwords to the client. */
export const DEMO_PERSONAS: readonly DemoPersona[] = [
  {
    id: 'student-anna',
    email: 'anna.risk@demo.local',
    buttonLabel: 'Войти как студент Рискова',
    roleHint: 'student',
  },
  {
    id: 'student-boris',
    email: 'boris.ok@demo.local',
    buttonLabel: 'Войти как студент Спокойный',
    roleHint: 'student',
  },
  {
    id: 'student-roman',
    email: 'roman.guskov@demo.local',
    buttonLabel: 'Войти как студент Гуськов',
    roleHint: 'student',
  },
  {
    id: 'student-kirill',
    email: 'kirill.meo@demo.local',
    buttonLabel: 'Войти как студент Орлов (МЭО)',
    roleHint: 'student',
  },
  {
    id: 'staff-elena',
    email: 'staff@demo.local',
    buttonLabel: 'Войти как сотрудник Соколова',
    roleHint: 'staff',
  },
  {
    id: 'admin-platform',
    email: 'admin@demo.local',
    buttonLabel: 'Войти как администратор',
    roleHint: 'admin',
  },
] as const;

export function findDemoPersona(personaId: string): DemoPersona | undefined {
  return DEMO_PERSONAS.find((p) => p.id === personaId);
}

/** Public DTO — no emails/passwords. */
export function publicDemoPersonas(): Array<{
  id: string;
  buttonLabel: string;
  roleHint: DemoPersonaRoleHint;
}> {
  return DEMO_PERSONAS.map(({ id, buttonLabel, roleHint }) => ({
    id,
    buttonLabel,
    roleHint,
  }));
}
