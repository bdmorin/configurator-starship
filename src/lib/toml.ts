import { parse as parseSmolToml, stringify as stringifySmolToml } from "smol-toml";

/**
 * Draft representation of a starship.toml config — a split-up view that the
 * UI can edit piece by piece without losing fidelity. We preserve:
 *   - top-level scalar keys (format, palette, add_newline, …)
 *   - [module] tables (and their sub-tables like [directory.substitutions])
 *   - [[module.array_tables]] like [[battery.display]]
 *   - [palettes.<name>] blocks
 *   - unknown tables — round-tripped as-is so we never drop user data
 */
export interface ConfigDraft {
  topLevel: Record<string, unknown>;
  modules: Record<string, Record<string, unknown>>;
  palettes: Record<string, Record<string, string>>;
  unknown: Record<string, unknown>;
}

export function emptyDraft(): ConfigDraft {
  return { topLevel: {}, modules: {}, palettes: {}, unknown: {} };
}

export function parseConfig(toml: string): ConfigDraft {
  if (!toml.trim()) return emptyDraft();
  const raw = parseSmolToml(toml) as Record<string, unknown>;
  const draft = emptyDraft();
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("$")) {
      draft.topLevel[key] = value;
      continue;
    }
    if (key === "palettes" && value && typeof value === "object") {
      draft.palettes = value as Record<string, Record<string, string>>;
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      draft.modules[key] = value as Record<string, unknown>;
      continue;
    }
    draft.topLevel[key] = value;
  }
  return draft;
}

export function stringifyConfig(draft: ConfigDraft): string {
  // Assemble a well-ordered object so the TOML output reads naturally:
  //   top-level, then modules alphabetical, then palettes.
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(draft.topLevel)) out[k] = v;
  if (Object.keys(draft.palettes).length) out.palettes = draft.palettes;
  const moduleNames = Object.keys(draft.modules).sort();
  for (const m of moduleNames) {
    const body = draft.modules[m];
    if (body && Object.keys(body).length > 0) out[m] = body;
  }
  for (const [k, v] of Object.entries(draft.unknown)) out[k] = v;
  return stringifySmolToml(out);
}

// ─── format string tokenizer ─────────────────────────────────────────────────

export type FormatToken =
  | { kind: "module"; name: string; start: number; end: number }
  | { kind: "variable"; name: string; start: number; end: number }
  | { kind: "styled"; text: string; style: string; start: number; end: number }
  | { kind: "literal"; text: string; start: number; end: number };

/**
 * Parse a starship format string into a token stream. This is the minimum
 * needed by the UI: enough to render colored chips above the textarea and
 * offer $-autocomplete. We deliberately don't try to *validate* the format —
 * starship itself does that; our job is to visualize.
 *
 * Recognized syntax:
 *   $module         → module token
 *   ${variable}     → variable token
 *   [text](style)   → styled group (nested brackets inside text are kept)
 *   everything else → literal
 */
export function tokenizeFormat(src: string): FormatToken[] {
  const tokens: FormatToken[] = [];
  let i = 0;

  const pushLiteral = (from: number, to: number) => {
    if (to <= from) return;
    const text = src.slice(from, to);
    if (!text) return;
    tokens.push({ kind: "literal", text, start: from, end: to });
  };

  let litStart = 0;
  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\" && i + 1 < src.length) {
      // Preserve escapes as literal
      i += 2;
      continue;
    }

    if (ch === "$") {
      // $module or ${var}
      pushLiteral(litStart, i);
      const start = i;
      i++;
      if (src[i] === "{") {
        i++;
        const nameStart = i;
        while (i < src.length && src[i] !== "}") i++;
        const name = src.slice(nameStart, i);
        if (src[i] === "}") i++;
        tokens.push({ kind: "variable", name, start, end: i });
      } else {
        const nameStart = i;
        while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) i++;
        const name = src.slice(nameStart, i);
        tokens.push({ kind: "module", name, start, end: i });
      }
      litStart = i;
      continue;
    }

    if (ch === "[") {
      // Try to match [text](style) — walk the balanced brackets for text
      const start = i;
      let depth = 0;
      let j = i;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "\\" && j + 1 < src.length) { j++; continue; }
        if (c === "[") depth++;
        else if (c === "]") {
          depth--;
          if (depth === 0) break;
        }
      }
      if (j < src.length && src[j] === "]" && src[j + 1] === "(") {
        const text = src.slice(i + 1, j);
        // walk the parens
        let k = j + 2;
        let pdepth = 1;
        for (; k < src.length && pdepth > 0; k++) {
          const c = src[k];
          if (c === "\\" && k + 1 < src.length) { k++; continue; }
          if (c === "(") pdepth++;
          else if (c === ")") pdepth--;
          if (pdepth === 0) break;
        }
        if (pdepth === 0) {
          const style = src.slice(j + 2, k);
          pushLiteral(litStart, start);
          tokens.push({ kind: "styled", text, style, start, end: k + 1 });
          i = k + 1;
          litStart = i;
          continue;
        }
      }
      // not a styled group — treat as literal
      i++;
      continue;
    }

    i++;
  }
  pushLiteral(litStart, src.length);
  return tokens;
}

/**
 * Parse a starship `style` string: space-separated tokens of the form
 *   fg:<color>, bg:<color>, <color> (fg shorthand), bold/italic/underline/…
 * Used by the palette picker to populate swatches and let users click-to-set.
 */
export interface ParsedStyle {
  fg?: string;
  bg?: string;
  modifiers: string[];
  unknown: string[];
}

export function parseStyle(style: string): ParsedStyle {
  const out: ParsedStyle = { modifiers: [], unknown: [] };
  const MODS = new Set(["bold", "italic", "underline", "dimmed", "inverted", "blink", "hidden", "strikethrough"]);
  for (const tok of style.split(/\s+/).filter(Boolean)) {
    if (tok.startsWith("fg:")) out.fg = tok.slice(3);
    else if (tok.startsWith("bg:")) out.bg = tok.slice(3);
    else if (MODS.has(tok.toLowerCase())) out.modifiers.push(tok.toLowerCase());
    else if (!out.fg) out.fg = tok; // bare color = fg
    else out.unknown.push(tok);
  }
  return out;
}

export function renderStyle(s: ParsedStyle): string {
  const parts: string[] = [];
  if (s.fg) parts.push(`fg:${s.fg}`);
  if (s.bg) parts.push(`bg:${s.bg}`);
  parts.push(...s.modifiers);
  parts.push(...s.unknown);
  return parts.join(" ").trim();
}
