import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirror of assistant-text.ts — keep in sync. */
function tokenizeInlineMarkdown(text) {
  const tokens = [];
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

function tidyAssistantText(text) {
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

function stripAssistantMarkup(text) {
  return tidyAssistantText(
    text
      .replace(WIDGET_DSL, "")
      .replace(SHORTCUT_DSL, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1"),
  );
}

function typingPlainFromParts(parts, fallbackText) {
  if (parts?.length) {
    const tidied = tidyAssistantParts(parts);
    return tidied
      .filter((p) => p.type === "text")
      .map((p) => stripAssistantMarkup(p.text))
      .filter(Boolean)
      .join("\n\n");
  }
  return stripAssistantMarkup(fallbackText);
}

function tidyAssistantParts(parts) {
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === "widget") {
      let widgetPart = part;
      const next = parts[i + 1];
      if (next?.type === "text") {
        const cleaned = tidyAssistantText(next.text);
        const meta = cleaned.match(PAREN_ONLY);
        if (meta && !widgetPart.widget.subtitle) {
          widgetPart = {
            ...widgetPart,
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
    out.push({ ...part, text: cleaned });
  }
  return out;
}

describe("tokenizeInlineMarkdown", () => {
  it("renders bold and italic tokens", () => {
    assert.deepEqual(tokenizeInlineMarkdown("**Пары (2МЭО-02):** далее *внимание*"), [
      { type: "bold", value: "Пары (2МЭО-02):" },
      { type: "text", value: " далее " },
      { type: "italic", value: "внимание" },
    ]);
  });

  it("keeps plain text unchanged", () => {
    assert.deepEqual(tokenizeInlineMarkdown("просто текст"), [
      { type: "text", value: "просто текст" },
    ]);
  });
});

describe("tidyAssistantParts", () => {
  it("strips orphan list bullets around widgets", () => {
    const parts = tidyAssistantParts([
      { type: "text", text: "Сегодня.\n\n**Пары:**\n- " },
      {
        type: "widget",
        widget: { kind: "lesson", title: "Право", time: "09:00-10:20" },
      },
      { type: "text", text: "\n- " },
      {
        type: "widget",
        widget: { kind: "lesson", title: "Японский", time: "10:35-11:55" },
      },
    ]);
    assert.deepEqual(
      parts.map((p) => (p.type === "text" ? p.text : p.widget.title)),
      ["Сегодня.\n\n**Пары:**", "Право", "Японский"],
    );
  });

  it("folds parenthetical meta into widget subtitle", () => {
    const parts = tidyAssistantParts([
      {
        type: "widget",
        widget: { kind: "lesson", title: "Право", time: "09:00-10:20" },
      },
      { type: "text", text: "\n(Потапов Н.А., зал 7, Корпус МЭО)\n" },
    ]);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].type, "widget");
    assert.equal(parts[0].widget.subtitle, "Потапов Н.А., зал 7, Корпус МЭО");
  });
});

describe("typingPlainFromParts", () => {
  it("never exposes raw widget DSL during typewriter", () => {
    const plain = typingPlainFromParts(
      [
        { type: "text", text: "**Сегодня** пары:" },
        {
          type: "widget",
          widget: { kind: "lesson", title: "Право" },
        },
      ],
      "raw {{widget:lesson|title=X}} [[today]]",
    );
    assert.equal(plain, "Сегодня пары:");
    assert.equal(plain.includes("{{"), false);
    assert.equal(plain.includes("[["), false);
  });

  it("strips DSL from fallback when parts missing", () => {
    assert.equal(
      typingPlainFromParts(
        undefined,
        "ИИ недоступен\n[[today]]\n{{widget:task|title=Учёба|href=/grades}}",
      ),
      "ИИ недоступен",
    );
  });
});
