import { useMemo, useRef, useState, useCallback } from "react";
import { useStore } from "../lib/store";
import { tokenizeFormat, type FormatToken } from "../lib/toml";

export function FormatBuilder() {
  const draft = useStore((s) => s.draft);
  const schema = useStore((s) => s.schema);
  const patchTopLevel = useStore((s) => s.patchTopLevel);

  const format = (draft.topLevel.format as string) ?? "$all";
  const rightFormat = (draft.topLevel.right_format as string) ?? "";
  const continuation = (draft.topLevel.continuation_prompt as string) ?? "";
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="format-editor">
      <div>
        <div className="row" style={{ margin: "0 0 4px" }}>
          <h3 className="muted small" style={{ margin: 0 }}>format</h3>
          <div className="grow" />
          <button className="ghost small" onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "pill view" : "raw edit"}
          </button>
        </div>
        <p className="muted small" style={{ margin: "0 0 6px" }}>
          Click a pill to copy it. Click a module chip below to insert. Toggle "raw edit" for full control.
        </p>

        {showRaw ? (
          <>
            <ChipPalette onInsert={(snippet) => insertInto("format-ta", snippet, format, (v) => patchTopLevel("format", v))} schemaModules={schema?.moduleNames ?? []} />
            <FormatTextarea id="format-ta" value={format} onChange={(v) => patchTopLevel("format", v)} modules={schema?.moduleNames ?? []} />
          </>
        ) : (
          <>
            <FormatPills format={format} onChange={(v) => patchTopLevel("format", v)} />
            <ChipPalette onInsert={(snippet) => {
              patchTopLevel("format", format + snippet);
            }} schemaModules={schema?.moduleNames ?? []} />
          </>
        )}
      </div>

      <div>
        <h3 className="muted small" style={{ margin: "0 0 4px" }}>right_format</h3>
        <FormatTextarea id="right-ta" value={rightFormat} onChange={(v) => patchTopLevel("right_format", v)} modules={schema?.moduleNames ?? []} />
      </div>

      <div>
        <h3 className="muted small" style={{ margin: "0 0 4px" }}>continuation_prompt</h3>
        <input type="text" value={continuation} onChange={(e) => patchTopLevel("continuation_prompt", e.target.value)} placeholder="[∙](bright-black) " />
      </div>

      <div>
        <h3 className="muted small" style={{ margin: "0 0 4px" }}>top-level flags</h3>
        <div className="field-row">
          <label className="label">add_newline</label>
          <input type="checkbox" checked={Boolean(draft.topLevel.add_newline ?? true)} onChange={(e) => patchTopLevel("add_newline", e.target.checked)} />
        </div>
        <div className="field-row">
          <label className="label">palette</label>
          <select value={(draft.topLevel.palette as string) ?? ""} onChange={(e) => patchTopLevel("palette", e.target.value || undefined)}>
            <option value="">(none)</option>
            {Object.keys(draft.palettes).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field-row">
          <label className="label">scan_timeout (ms)</label>
          <input type="number" value={(draft.topLevel.scan_timeout as number) ?? 30} onChange={(e) => patchTopLevel("scan_timeout", Number(e.target.value))} />
        </div>
        <div className="field-row">
          <label className="label">command_timeout (ms)</label>
          <input type="number" value={(draft.topLevel.command_timeout as number) ?? 500} onChange={(e) => patchTopLevel("command_timeout", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

function FormatPills({ format, onChange }: { format: string; onChange: (v: string) => void }) {
  const tokens = useMemo(() => tokenizeFormat(format), [format]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);

  const copyToken = useCallback((token: FormatToken, idx: number) => {
    const raw = format.slice(token.start, token.end);
    navigator.clipboard.writeText(raw);
    setFlash(idx);
    setTimeout(() => setFlash(null), 400);
  }, [format]);

  const removeToken = useCallback((token: FormatToken) => {
    const next = format.slice(0, token.start) + format.slice(token.end);
    onChange(next);
  }, [format, onChange]);

  const handleDragStart = (idx: number) => setDragging(idx);
  const handleDrop = (targetIdx: number) => {
    if (dragging === null || dragging === targetIdx) { setDragging(null); return; }
    const toks = [...tokens];
    const [moved] = toks.splice(dragging, 1);
    toks.splice(targetIdx, 0, moved);
    const rebuilt = toks.map((t) => format.slice(t.start, t.end)).join("");
    onChange(rebuilt);
    setDragging(null);
  };

  const pillClass = (t: FormatToken) => {
    if (t.kind === "module") return "pill module";
    if (t.kind === "styled") return "pill styled";
    if (t.kind === "variable") return "pill variable";
    return "pill literal";
  };

  const pillLabel = (t: FormatToken) => {
    if (t.kind === "module") return `$${t.name}`;
    if (t.kind === "variable") return `\${${t.name}}`;
    if (t.kind === "styled") return `[${t.text || "…"}](${t.style})`;
    return t.text.replace(/\\\n/g, "↵").replace(/\n/g, "⏎").slice(0, 20);
  };

  return (
    <div className="pill-strip">
      {tokens.map((t, i) => (
        <span
          key={`${i}-${t.start}`}
          className={`${pillClass(t)} ${flash === i ? "copy-flash" : ""} ${dragging === i ? "dragging" : ""}`}
          title={`click to copy · right-click to remove\n${format.slice(t.start, t.end)}`}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          onClick={() => copyToken(t, i)}
          onContextMenu={(e) => { e.preventDefault(); removeToken(t); }}
        >
          {pillLabel(t)}
        </span>
      ))}
      {tokens.length === 0 && <span className="muted small">No format tokens — click a module chip below to add one.</span>}
    </div>
  );
}

function ChipPalette({ schemaModules, onInsert }: { schemaModules: string[]; onInsert: (snippet: string) => void }) {
  const [filter, setFilter] = useState("");
  const shown = schemaModules.filter((m) => m.includes(filter.toLowerCase()));
  return (
    <div style={{ margin: "4px 0 8px" }}>
      <input className="search" placeholder="filter modules…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="chip-list" style={{ maxHeight: 120, overflow: "auto" }}>
        <span className="chip" onClick={() => onInsert("$all")} title="Shorthand for every default module">$all</span>
        <span className="chip" onClick={() => onInsert("\\\n")} title="Backslash-newline (continues format on next line)">\\n</span>
        <span className="chip" onClick={() => onInsert("$line_break")} title="Insert a newline">$line_break</span>
        {shown.map((m) => (
          <span key={m} className="chip" onClick={() => onInsert(`$${m}`)}>${m}</span>
        ))}
      </div>
    </div>
  );
}

function FormatTextarea({ id, value, onChange, modules }: { id: string; value: string; onChange: (v: string) => void; modules: string[] }) {
  const [suggest, setSuggest] = useState<{ at: number; query: string } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(next: string) {
    onChange(next);
    const ta = taRef.current;
    if (!ta) return;
    const caret = ta.selectionStart;
    const before = next.slice(0, caret);
    const m = before.match(/\$([A-Za-z0-9_]*)$/);
    if (m) setSuggest({ at: caret - m[0].length, query: m[1] });
    else setSuggest(null);
  }

  function pickSuggestion(name: string) {
    if (!suggest || !taRef.current) return;
    const ta = taRef.current;
    const caret = ta.selectionStart;
    const next = value.slice(0, suggest.at) + "$" + name + value.slice(caret);
    onChange(next);
    setSuggest(null);
    requestAnimationFrame(() => {
      ta.focus();
      const newCaret = suggest.at + 1 + name.length;
      ta.setSelectionRange(newCaret, newCaret);
    });
  }

  const matches = suggest
    ? modules.filter((m) => m.startsWith(suggest.query.toLowerCase())).slice(0, 8)
    : [];

  return (
    <div style={{ position: "relative" }}>
      <textarea
        id={id}
        ref={taRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggest(null), 150)}
        spellCheck={false}
      />
      {suggest && matches.length > 0 && (
        <div style={{ position: "absolute", right: 8, top: 8, background: "var(--bg-panel-2)", border: "1px solid var(--border)", borderRadius: 4, padding: 4, zIndex: 10, minWidth: 160 }}>
          {matches.map((m) => (
            <div key={m} onMouseDown={(e) => { e.preventDefault(); pickSuggestion(m); }} style={{ padding: "3px 6px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: 12 }}>
              ${m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function insertInto(id: string, snippet: string, value: string, onChange: (v: string) => void) {
  const ta = document.getElementById(id) as HTMLTextAreaElement | null;
  if (!ta) { onChange(value + snippet); return; }
  const start = ta.selectionStart ?? value.length;
  const end = ta.selectionEnd ?? value.length;
  const next = value.slice(0, start) + snippet + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + snippet.length;
    ta.setSelectionRange(pos, pos);
  });
}
