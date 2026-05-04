import { useMemo, useState, useCallback } from "react";
import { useStore } from "../lib/store";
import type { FieldSchema, ModuleSchema } from "../lib/types";

export function ModuleEditor() {
  const schema = useStore((s) => s.schema);
  const draft = useStore((s) => s.draft);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const modules = schema?.modules ?? [];
  const filtered = useMemo(
    () => modules.filter((m) => m.name.includes(filter.toLowerCase()) || (m.description ?? "").toLowerCase().includes(filter.toLowerCase())),
    [modules, filter],
  );
  const inDraft = new Set(Object.keys(draft.modules));
  const selected = active ? modules.find((m) => m.name === active) : null;

  const copyModuleName = useCallback((name: string) => {
    navigator.clipboard.writeText(`$${name}`);
    setCopied(name);
    setTimeout(() => setCopied(null), 600);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 0, height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: "1px solid var(--border)", paddingRight: 8 }}>
        <input className="search" placeholder="search modules…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div style={{ overflow: "auto", flex: 1 }}>
          {filtered.map((m) => (
            <div
              key={m.name}
              className={`module-row ${active === m.name ? "active" : ""} ${inDraft.has(m.name) ? "in-draft" : ""}`}
              onClick={() => setActive(m.name)}
              onDoubleClick={() => copyModuleName(m.name)}
              title={`${m.description ?? ""}\ndouble-click to copy $${m.name}`}
            >
              <span>{m.name}</span>
              {copied === m.name && <span style={{ fontSize: 9, color: "var(--success)" }}>copied</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflow: "auto", minHeight: 0, paddingLeft: 12 }}>
        {!selected && <div className="muted" style={{ padding: "16px 0" }}>Select a module. Green dot = customized. Double-click to copy <code>$name</code>.</div>}
        {selected && <ModuleForm mod={selected} />}
      </div>
    </div>
  );
}

function ModuleForm({ mod }: { mod: ModuleSchema }) {
  const draft = useStore((s) => s.draft);
  const patchModule = useStore((s) => s.patchModule);
  const deleteModuleField = useStore((s) => s.deleteModuleField);
  const resetModule = useStore((s) => s.resetModule);
  const patchTopLevel = useStore((s) => s.patchTopLevel);
  const [flashInsert, setFlashInsert] = useState(false);

  const current = draft.modules[mod.name] ?? {};
  const format = (draft.topLevel.format as string) ?? "$all";
  const isInFormat = format.includes(`$${mod.name}`);

  const insertIntoFormat = () => {
    const sep = format.endsWith("\\\n") || format.endsWith("\n") ? "" : "\\\n";
    patchTopLevel("format", format + sep + `$${mod.name}`);
    setFlashInsert(true);
    setTimeout(() => setFlashInsert(false), 600);
  };

  const copyName = () => {
    navigator.clipboard.writeText(`$${mod.name}`);
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
        <h2
          style={{ margin: 0, fontSize: 16, fontFamily: "var(--mono)", cursor: "pointer" }}
          onClick={copyName}
          title="click to copy"
        >
          [{mod.name}]
        </h2>
        {isInFormat
          ? <span className="badge ok" style={{ fontSize: 10 }}>in format</span>
          : <button
              className={flashInsert ? "primary copy-flash" : "primary"}
              style={{ fontSize: 11, padding: "2px 8px" }}
              onClick={insertIntoFormat}
            >
              + add to format
            </button>
        }
        <div className="grow" />
        <button className="ghost small" onClick={copyName} title="Copy $module_name">copy</button>
        <button className="ghost small" onClick={() => resetModule(mod.name)} title="Remove all customizations">reset</button>
      </div>
      {mod.description && <p className="muted small" style={{ margin: "0 0 8px" }}>{mod.description}</p>}

      {mod.fields.length === 0 && mod.subTables.length === 0 && mod.arrayTables.length === 0 && (
        <div style={{ padding: "12px 0" }}>
          <p className="muted small" style={{ margin: "0 0 8px" }}>
            No configurable fields in schema. This module works with defaults, or you can add custom TOML fields below.
          </p>
          <CustomFieldAdder moduleName={mod.name} />
        </div>
      )}

      {mod.fields.map((f) => (
        <FieldEditor
          key={f.name}
          field={f}
          value={current[f.name]}
          onChange={(v) => patchModule(mod.name, f.name, v)}
          onReset={() => deleteModuleField(mod.name, f.name)}
          paletteColors={paletteColors(draft.palettes, (draft.topLevel.palette as string) ?? null)}
        />
      ))}

      {mod.subTables.map((st) => (
        <SubTableEditor
          key={st.name}
          mod={mod.name}
          sub={st.name}
          kind={st.kind}
          description={st.description}
          value={(current[st.name] as Record<string, unknown>) ?? {}}
          onChange={(v) => patchModule(mod.name, st.name, v)}
        />
      ))}

      {mod.arrayTables.map((at) => (
        <div key={at.name} className="section">
          <h3>[[{mod.name}.{at.name}]]</h3>
          <p className="muted small">Array-of-tables. Use the TOML tab to edit entries directly.</p>
        </div>
      ))}
    </div>
  );
}

function CustomFieldAdder({ moduleName }: { moduleName: string }) {
  const patchModule = useStore((s) => s.patchModule);
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  return (
    <div className="row">
      <input type="text" placeholder="field name" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: 140 }} />
      <input type="text" placeholder="value" value={val} onChange={(e) => setVal(e.target.value)} className="grow" />
      <button onClick={() => {
        if (!key) return;
        let parsed: unknown = val;
        if (val === "true") parsed = true;
        else if (val === "false") parsed = false;
        else if (/^-?\d+$/.test(val)) parsed = Number(val);
        patchModule(moduleName, key, parsed);
        setKey(""); setVal("");
      }}>+ field</button>
    </div>
  );
}

function FieldEditor({ field, value, onChange, onReset, paletteColors }: {
  field: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  onReset: () => void;
  paletteColors: { name: string; hex: string }[];
}) {
  const isSet = value !== undefined;
  const effective = isSet ? value : field.default;
  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
      <div className="row">
        <code style={{ color: isSet ? "var(--accent)" : "var(--fg-dim)", fontSize: 12 }}>{field.name}</code>
        <span className="badge">{field.type}</span>
        {isSet && <button className="ghost small" onClick={onReset}>reset</button>}
      </div>
      {field.description && <div className="muted small" style={{ margin: "2px 0" }}>{field.description}</div>}
      <div style={{ marginTop: 4 }}>
        <Input field={field} value={effective} onChange={onChange} paletteColors={paletteColors} />
      </div>
      {field.default !== undefined && <div className="muted small">default: <code>{JSON.stringify(field.default)}</code></div>}
    </div>
  );
}

function Input({ field, value, onChange, paletteColors }: {
  field: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
  paletteColors: { name: string; hex: string }[];
}) {
  if (field.type === "boolean") {
    return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (field.type === "number") {
    return <input type="number" value={typeof value === "number" ? value : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} style={{ width: "100%" }} />;
  }
  if (field.type === "array") {
    return <textarea rows={3} value={Array.isArray(value) ? value.join("\n") : ""} onChange={(e) => onChange(e.target.value.split("\n").filter(Boolean))} placeholder="one item per line" style={{ width: "100%" }} />;
  }
  if (field.name === "style" || field.name.endsWith("_style")) {
    return <StyleInput value={String(value ?? "")} onChange={onChange} paletteColors={paletteColors} />;
  }
  const longish = field.name === "format" || field.name === "right_format" || field.name === "continuation_prompt" || (typeof value === "string" && value.length > 50);
  if (longish) {
    return <textarea rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} style={{ width: "100%" }} />;
  }
  return <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} style={{ width: "100%" }} />;
}

function StyleInput({ value, onChange, paletteColors }: { value: string; onChange: (v: string) => void; paletteColors: { name: string; hex: string }[] }) {
  return (
    <div>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. 'bold fg:red bg:yellow'" style={{ width: "100%" }} />
      {paletteColors.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div className="muted small">click a swatch to insert:</div>
          <div className="swatches" style={{ marginTop: 4 }}>
            {paletteColors.map((c) => (
              <button
                key={c.name}
                className="swatch"
                style={{ background: c.hex }}
                title={`${c.name} = ${c.hex}`}
                onClick={() => {
                  const existing = value.split(/\s+/).filter(Boolean);
                  const asFg = `fg:${c.name}`;
                  const asBg = `bg:${c.name}`;
                  const bare = c.name;
                  let next: string[];
                  if (existing.includes(bare) || existing.includes(asFg)) {
                    next = existing.filter((x) => x !== bare && x !== asFg);
                    next.push(asBg);
                  } else if (existing.includes(asBg)) {
                    next = existing.filter((x) => x !== asBg);
                  } else {
                    next = [...existing, asFg];
                  }
                  onChange(next.join(" "));
                }}
              >
                <span className="name">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubTableEditor({ mod, sub, kind, description, value, onChange }: {
  mod: string;
  sub: string;
  kind: "map" | "table";
  description?: string;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const entries = Object.entries(value ?? {});
  return (
    <div className="section">
      <h3>[{mod}.{sub}]</h3>
      {description && <p className="muted small" style={{ margin: "0 0 6px" }}>{description}</p>}
      {entries.map(([k, v]) => (
        <div key={k} className="row" style={{ marginBottom: 4 }}>
          <input type="text" value={k} readOnly style={{ width: 180 }} />
          <input type="text" value={String(v)} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className="grow" />
          <button className="ghost" onClick={() => { const next = { ...value }; delete next[k]; onChange(next); }}>×</button>
        </div>
      ))}
      <div className="row">
        <input type="text" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} style={{ width: 180 }} />
        <input type="text" placeholder="value" value={newVal} onChange={(e) => setNewVal(e.target.value)} className="grow" />
        <button onClick={() => { if (newKey) { onChange({ ...value, [newKey]: newVal }); setNewKey(""); setNewVal(""); } }}>+ add</button>
      </div>
    </div>
  );
}

function paletteColors(palettes: Record<string, Record<string, string>>, active: string | null): { name: string; hex: string }[] {
  if (!active) return [];
  const p = palettes[active];
  if (!p) return [];
  return Object.entries(p).map(([name, hex]) => ({ name, hex }));
}
