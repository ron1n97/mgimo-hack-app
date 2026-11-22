import {
  findDemoPersona,
  isDemoQuickLoginEnabled,
  publicDemoPersonas,
} from './demo-quick-login';

describe('isDemoQuickLoginEnabled', () => {
  it('is off in production by default', () => {
    expect(
      isDemoQuickLoginEnabled({ NODE_ENV: 'production' }),
    ).toBe(false);
  });

  it('is on in non-production by default', () => {
    expect(
      isDemoQuickLoginEnabled({ NODE_ENV: 'development' }),
    ).toBe(true);
    expect(isDemoQuickLoginEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isDemoQuickLoginEnabled({})).toBe(true);
  });

  it('turns on when DEMO_QUICK_LOGIN is truthy even in production', () => {
    expect(
      isDemoQuickLoginEnabled({
        NODE_ENV: 'production',
        DEMO_QUICK_LOGIN: 'true',
      }),
    ).toBe(true);
    expect(
      isDemoQuickLoginEnabled({
        NODE_ENV: 'production',
        DEMO_QUICK_LOGIN: '1',
      }),
    ).toBe(true);
  });

  it('turns off when DEMO_QUICK_LOGIN is explicitly false', () => {
    expect(
      isDemoQuickLoginEnabled({
        NODE_ENV: 'development',
        DEMO_QUICK_LOGIN: 'false',
      }),
    ).toBe(false);
    expect(
      isDemoQuickLoginEnabled({
        NODE_ENV: 'development',
        DEMO_QUICK_LOGIN: '0',
      }),
    ).toBe(false);
  });
});

describe('demo persona catalog', () => {
  it('exposes public personas without emails', () => {
    const pub = publicDemoPersonas();
    expect(pub.length).toBeGreaterThanOrEqual(5);
    for (const row of pub) {
      expect(row).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          buttonLabel: expect.stringMatching(/^Войти как /),
          roleHint: expect.stringMatching(/student|teacher|staff|admin/),
        }),
      );
      expect(row).not.toHaveProperty('email');
      expect(JSON.stringify(row)).not.toMatch(/Demo123/);
    }
  });

  it('resolves known persona ids to seed emails', () => {
    expect(findDemoPersona('student-anna')?.email).toBe(
      'anna.risk@demo.local',
    );
    expect(findDemoPersona('staff-elena')?.email).toBe('staff@demo.local');
    expect(findDemoPersona('teacher-ivanova')).toBeUndefined();
    expect(findDemoPersona('student-daria')).toBeUndefined();
    expect(findDemoPersona('nope')).toBeUndefined();
  });

  it('does not expose student Guskov as a quick-login persona', () => {
    expect(findDemoPersona('student-roman')).toBeUndefined();
    expect(
      publicDemoPersonas().some(
        (p) => p.id === 'student-roman' || /Гуськов/i.test(p.buttonLabel),
      ),
    ).toBe(false);
  });
});
