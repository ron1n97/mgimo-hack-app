import { toolsForRole } from './chat-tools';

describe('chat tools role scope', () => {
  it('gives students today/schedule/grades/requests/digest/notifications', () => {
    const names = toolsForRole('STUDENT').map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'get_today',
        'get_schedule',
        'get_grades',
        'get_requests',
        'get_digest',
        'get_notifications',
      ]),
    );
    expect(names).not.toContain('update_request_status');
    expect(names).not.toContain('create_request');
  });

  it('gives staff/admin staff tools + digest, not grades', () => {
    for (const role of ['STAFF', 'ADMIN'] as const) {
      const names = toolsForRole(role).map((t) => t.function.name);
      expect(names).toContain('get_staff_requests');
      expect(names).toContain('get_staff_overview');
      expect(names).toContain('get_digest');
      expect(names).toContain('get_today');
      expect(names).not.toContain('get_grades');
    }
  });

  it('teacher gets schedule-oriented read tools + digest', () => {
    const names = toolsForRole('TEACHER').map((t) => t.function.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'get_today',
        'get_schedule',
        'get_digest',
        'get_notifications',
      ]),
    );
    expect(names).not.toContain('get_staff_requests');
  });
});

