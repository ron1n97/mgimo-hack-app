/**
 * Light markdown + cleanup for in-app assistant text parts.
 * Intentionally tiny — no react-markdown dependency.
 */

export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

/** Split inline **bold** / *italic* (no nesting). */
export function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ type: "bold", value: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: "italic", value: match[2] });
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) {
    tokens.push({ type: "text", value: text.slice(cursor) });
  }
  if (tokens.length === 0 && text) {
    tokens.push({ type: "text", value: text });
  }
  return tokens;
}

const ORPHAN_BULLET_LINE = /^\s*[-*•]\s*$/;
const TRAILING_LIST_MARKER = /(?:^|\n)\s*[-*•]\s*$/;
const LEADING_LIST_MARKER = /^\s*[-*•]\s*(?:\n|$)/;
const PAREN_ONLY = /^\s*\(([^)]+)\)\s*$/;

/** Drop orphan `-` / `•` list markers left after widget extraction. */
export function tidyAssistantText(text: string): string {
  return text
    .replace(TRAILING_LIST_MARKER, "")
    .replace(LEADING_LIST_MARKER, "")
    .split("\n")
    .filter((line) => !ORPHAN_BULLET_LINE.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const WIDGET_DSL = /\{\{widget:[^}]+\}\}/g;
const SHORTCUT_DSL = /\[\[[a-z]+(?::[^\]]*)?\]\]/gi;

/** Strip widget DSL + light markdown markers for typewriter preview. */
export function stripAssistantMarkup(text: string): string {
  return tidyAssistantText(
    text
      .replace(WIDGET_DSL, "")
      .replace(SHORTCUT_DSL, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1"),
  );
}

/**
 * Plain text for harness typewriter — never flash raw `{{widget}}` / `[[today]]`.
 * Empty string means skip typing and show the finished message immediately.
 */
export function typingPlainFromParts(
  parts: TidiablePart[] | undefined,
  fallbackText: string,
): string {
  if (parts?.length) {
    const tidied = tidyAssistantParts(parts);
    return tidied
      .filter((p): p is Extract<TidiablePart, { type: "text" }> => p.type === "text")
      .map((p) => stripAssistantMarkup(p.text))
      .filter(Boolean)
      .join("\n\n");
  }
  return stripAssistantMarkup(fallbackText);
}

export type TidiablePart =
  | { type: "text"; text: string }
  | {
      type: "widget";
      widget: {
        subtitle?: string;
        [key: string]: unknown;
      };
    };

/**
 * Clean text around widgets: strip lone bullets, fold `(meta)` lines
 * into the previous widget subtitle when empty.
 */
export function tidyAssistantParts<T extends TidiablePart>(parts: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === "widget") {
      const next = parts[i + 1];
      if (next?.type === "text") {
        const cleaned = tidyAssistantText(next.text);
        const meta = cleaned.match(PAREN_ONLY);
        if (meta && !part.widget.subtitle) {
          out.push({
            ...part,
            widget: { ...part.widget, subtitle: meta[1] },
          } as T);
          i += 1; // consume parenthetical text part
          continue;
        }
      }
      out.push(part);
      continue;
    }

    const cleaned = tidyAssistantText(part.text);
    if (!cleaned) continue;
    out.push({ ...part, text: cleaned });
  }
  return out;
}
