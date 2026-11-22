import {
  parseAssistantMarkup,
  resolveWidgetHref,
  stripWidgetMarkup,
} from './widget-markup';

describe('widget markup DSL', () => {
  it('parses canonical {{widget:...}} tags into parts', () => {
    const input =
      'Сегодня пара:\n{{widget:lesson|id=les1|title=Международное право|time=09:00-10:30}}\nи заявка {{widget:request|id=req9|title=Справка|status=SUBMITTED}}';

    const { parts, widgets } = parseAssistantMarkup(input, 'STUDENT');

    expect(widgets).toHaveLength(2);
    expect(widgets[0]).toMatchObject({
      kind: 'lesson',
      id: 'les1',
      title: 'Международное право',
      time: '09:00-10:30',
      href: '/schedule?lesson=les1',
    });
    expect(widgets[1]).toMatchObject({
      kind: 'request',
      id: 'req9',
      href: '/requests?id=req9',
    });
    expect(parts.map((p) => p.type)).toEqual(['text', 'widget', 'text', 'widget']);
  });

  it('parses [[shorthand]] tags including bare today/schedule', () => {
    const input =
      'Открой [[today]] или [[schedule]]. Пара [[lesson:id=abc|title=ИЯ]]. Долг [[grade:id=g1|title=Экономика]]. Задача [[task:id=t1]]. Событие [[event:id=e1]].';

    const { widgets } = parseAssistantMarkup(input, 'STUDENT');
    expect(widgets.map((w) => w.kind)).toEqual([
      'today',
      'schedule',
      'lesson',
      'grade',
      'task',
      'event',
    ]);
    expect(widgets.find((w) => w.kind === 'today')?.href).toBe('/today');
    expect(widgets.find((w) => w.kind === 'schedule')?.href).toBe('/schedule');
    expect(widgets.find((w) => w.kind === 'task')?.href).toBe('/grades?task=t1');
    expect(widgets.find((w) => w.kind === 'event')?.href).toBe(
      '/notifications/e1',
    );
  });

  it('resolves staff request href to queue', () => {
    expect(resolveWidgetHref({ kind: 'request', id: 'r1' }, 'STAFF')).toBe(
      '/staff/requests?id=r1',
    );
    expect(resolveWidgetHref({ kind: 'request', id: 'r1' }, 'ADMIN')).toBe(
      '/staff/requests?id=r1',
    );
    expect(resolveWidgetHref({ kind: 'request', id: 'r1' }, 'TEACHER')).toBe(
      '/requests?id=r1',
    );
  });

  it('honors explicit href attr and ignores unknown kinds as text', () => {
    const { parts, widgets } = parseAssistantMarkup(
      'Ok {{widget:request|id=x|href=/custom/path}} and {{widget:spaceship|id=1}}',
      'STUDENT',
    );
    expect(widgets).toHaveLength(1);
    expect(widgets[0].href).toBe('/custom/path');
    expect(parts.some((p) => p.type === 'text' && p.text.includes('spaceship'))).toBe(
      true,
    );
  });

  it('stripWidgetMarkup leaves readable plain text', () => {
    expect(
      stripWidgetMarkup(
        'Пара {{widget:lesson|id=1|title=Право}} завтра',
      ),
    ).toBe('Пара Право завтра');
  });

  it('strips orphan list bullets and folds parenthetical into subtitle', () => {
    const input = [
      '**Пары:**',
      '- {{widget:lesson|id=les1|title=Право|time=09:00-10:20}}',
      '(Потапов Н.А., зал 7)',
      '- {{widget:lesson|id=les2|title=Японский|time=10:35-11:55}}',
      '(Сумская Н.В., ауд. 2051)',
    ].join('\n');

    const { parts, widgets } = parseAssistantMarkup(input, 'STUDENT');
    expect(widgets).toHaveLength(2);
    expect(widgets[0].subtitle).toBe('Потапов Н.А., зал 7');
    expect(widgets[1].subtitle).toBe('Сумская Н.В., ауд. 2051');
    expect(parts.map((p) => p.type)).toEqual(['text', 'widget', 'widget']);
    expect(parts[0]).toMatchObject({ type: 'text', text: '**Пары:**' });
  });
});
