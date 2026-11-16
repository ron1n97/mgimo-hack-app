export const WIDGET_KINDS = [
  'lesson',
  'task',
  'grade',
  'event',
  'request',
  'today',
  'schedule',
  'notification',
] as const;

export type WidgetKind = (typeof WIDGET_KINDS)[number];

export type AssistantRole = 'STUDENT' | 'STAFF' | 'ADMIN' | 'TEACHER' | string;

export type AssistantWidget = {
  kind: WidgetKind;
  id?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  status?: string;
  href: string;
  attrs: Record<string, string>;
};

export type AssistantPart =
  | { type: 'text'; text: string }
  | { type: 'widget'; widget: AssistantWidget };

const KIND_SET = new Set<string>(WIDGET_KINDS);

const CANONICAL_RE =
  /\{\{widget:([a-z]+)((?:\|[a-zA-Z0-9_-]+=[^|}]*)*)\}\}/g;
const SHORT_BARE_RE = /\[\[(today|schedule)\]\]/g;
const SHORT_TYPED_RE =
  /\[\[(lesson|task|grade|event|request|notification):([^\]]+)\]\]/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!raw) return attrs;
  for (const chunk of raw.split('|')) {
    if (!chunk) continue;
    const eq = chunk.indexOf('=');
    if (eq <= 0) continue;
    const key = chunk.slice(0, eq).trim();
    const value = chunk.slice(eq + 1).trim();
    if (key) attrs[key] = value;
  }
  return attrs;
}

function isWidgetKind(value: string): value is WidgetKind {
  return KIND_SET.has(value);
}

export function resolveWidgetHref(
  input: { kind: WidgetKind; id?: string; href?: string },
  role: AssistantRole,
): string {
  if (input.href && input.href.startsWith('/')) return input.href;
  const id = input.id;
  const staffQueue = role === 'STAFF' || role === 'ADMIN';

  switch (input.kind) {
    case 'today':
      return '/today';
    case 'schedule':
      return id ? `/schedule?lesson=${encodeURIComponent(id)}` : '/schedule';
    case 'lesson':
      return id ? `/schedule?lesson=${encodeURIComponent(id)}` : '/schedule';
    case 'grade':
      return id ? `/grades?id=${encodeURIComponent(id)}` : '/grades';
    case 'task':
      return id ? `/grades?task=${encodeURIComponent(id)}` : '/grades';
    case 'event':
    case 'notification':
      return id
        ? `/notifications?id=${encodeURIComponent(id)}`
        : '/notifications';
    case 'request':
      if (staffQueue) {
        return id
          ? `/staff/requests?id=${encodeURIComponent(id)}`
          : '/staff/requests';
      }
      return id ? `/requests?id=${encodeURIComponent(id)}` : '/requests';
    default:
      return '/today';
  }
}

function toWidget(
  kind: WidgetKind,
  attrs: Record<string, string>,
  role: AssistantRole,
): AssistantWidget {
  const id = attrs.id;
  const href = resolveWidgetHref(
    { kind, id, href: attrs.href },
    role,
  );
  return {
    kind,
    id,
    title: attrs.title,
    subtitle: attrs.subtitle,
    time: attrs.time,
    status: attrs.status,
    href,
    attrs,
  };
}

type MatchHit = {
  index: number;
  length: number;
  widget?: AssistantWidget;
  raw: string;
};

function collectHits(text: string, role: AssistantRole): MatchHit[] {
  const hits: MatchHit[] = [];

  for (const match of text.matchAll(CANONICAL_RE)) {
    const kindRaw = match[1] ?? '';
    const raw = match[0];
    const index = match.index ?? 0;
    if (!isWidgetKind(kindRaw)) {
      hits.push({ index, length: raw.length, raw });
      continue;
    }
    const attrs = parseAttrs((match[2] ?? '').replace(/^\|/, ''));
    hits.push({
      index,
      length: raw.length,
      raw,
      widget: toWidget(kindRaw, attrs, role),
    });
  }

  for (const match of text.matchAll(SHORT_BARE_RE)) {
    const kind = match[1] as WidgetKind;
    const raw = match[0];
    hits.push({
      index: match.index ?? 0,
      length: raw.length,
      raw,
      widget: toWidget(kind, {}, role),
    });
  }

  for (const match of text.matchAll(SHORT_TYPED_RE)) {
    const kind = match[1] as WidgetKind;
    const attrs = parseAttrs(match[2] ?? '');
    const raw = match[0];
    hits.push({
      index: match.index ?? 0,
      length: raw.length,
      raw,
      widget: toWidget(kind, attrs, role),
    });
  }

  hits.sort((a, b) => a.index - b.index || b.length - a.length);
  const filtered: MatchHit[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.index < cursor) continue;
    filtered.push(hit);
    cursor = hit.index + hit.length;
  }
  return filtered;
}

export function parseAssistantMarkup(
  text: string,
  role: AssistantRole = 'STUDENT',
): { parts: AssistantPart[]; widgets: AssistantWidget[] } {
  const hits = collectHits(text, role);
  const parts: AssistantPart[] = [];
  let cursor = 0;

  for (const hit of hits) {
    if (hit.index > cursor) {
      parts.push({ type: 'text', text: text.slice(cursor, hit.index) });
    }
    if (hit.widget) {
      parts.push({ type: 'widget', widget: hit.widget });
    } else {
      parts.push({ type: 'text', text: hit.raw });
    }
    cursor = hit.index + hit.length;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', text: text.slice(cursor) });
  }

  if (parts.length === 0 && text) {
    parts.push({ type: 'text', text });
  }

  const tidied = tidyAssistantParts(parts);
  const widgets = tidied
    .filter((p): p is Extract<AssistantPart, { type: 'widget' }> => p.type === 'widget')
    .map((p) => p.widget);
  return { parts: tidied, widgets };
}

const ORPHAN_BULLET_LINE = /^\s*[-*•]\s*$/;
const TRAILING_LIST_MARKER = /(?:^|\n)\s*[-*•]\s*$/;
const LEADING_LIST_MARKER = /^\s*[-*•]\s*(?:\n|$)/;
const PAREN_ONLY = /^\s*\(([^)]+)\)\s*$/;

/** Drop orphan `-` / `•` list markers left after widget extraction. */
export function tidyAssistantText(text: string): string {
  return text
    .replace(TRAILING_LIST_MARKER, '')
    .replace(LEADING_LIST_MARKER, '')
    .split('\n')
    .filter((line) => !ORPHAN_BULLET_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Clean text around widgets: strip lone bullets, fold `(meta)` lines
 * into the previous widget subtitle when empty.
 */
export function tidyAssistantParts(parts: AssistantPart[]): AssistantPart[] {
  const out: AssistantPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === 'widget') {
      let widgetPart = part;
      const next = parts[i + 1];
      if (next?.type === 'text') {
        const cleaned = tidyAssistantText(next.text);
        const meta = cleaned.match(PAREN_ONLY);
        if (meta && !widgetPart.widget.subtitle) {
          widgetPart = {
            type: 'widget',
            widget: { ...widgetPart.widget, subtitle: meta[1] },
          };
          i += 1;
        }
      }
      out.push(widgetPart);
      continue;
    }

    const cleaned = tidyAssistantText(part.text);
    if (!cleaned) continue;
    out.push({ type: 'text', text: cleaned });
  }
  return out;
}

export function stripWidgetMarkup(text: string): string {
  return text
    .replace(CANONICAL_RE, (_full, _kind, attrRaw: string) => {
      const attrs = parseAttrs(String(attrRaw ?? '').replace(/^\|/, ''));
      return attrs.title || attrs.id || '';
    })
    .replace(SHORT_TYPED_RE, (_full, _kind, attrRaw: string) => {
      const attrs = parseAttrs(String(attrRaw ?? ''));
      return attrs.title || attrs.id || '';
    })
    .replace(SHORT_BARE_RE, (_full, kind: string) => kind)
    .replace(/\s{2,}/g, ' ')
    .trim();
}
