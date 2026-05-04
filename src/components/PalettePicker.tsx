import { useState, useCallback } from "react";
import { useStore } from "../lib/store";

export function PalettePicker() {
  const draft = useStore((s) => s.draft);
  const addPalette = useStore((s) => s.addPalette);
  const renamePalette = useStore((s) => s.renamePalette);
  const setPaletteColor = useStore((s) => s.setPaletteColor);
  const deletePaletteColor = useStore((s) => s.deletePaletteColor);
  const patchTopLevel = useStore((s) => s.patchTopLevel);

  const active = (draft.topLevel.palette as string) ?? "";
  const paletteNames = Object.keys(draft.palettes);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState<string | null>(paletteNames[0] ?? null);

  const cur = selected ? draft.palettes[selected] : null;

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <label className="muted small">active palette</label>
        <select value={active} onChange={(e) => patchTopLevel("palette", e.target.value || undefined)}>
          <option value="">(none)</option>
          {paletteNames.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <input type="text" placeholder="new palette name…" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button onClick={() => { if (newName) { addPalette(newName); setSelected(newName); setNewName(""); } }}>+ palette</button>
      </div>

      <div className="chip-list" style={{ marginBottom: 12 }}>
        {paletteNames.map((p) => (
          <span
            key={p}
            className={`chip ${selected === p ? "selected" : ""}`}
            onClick={() => setSelected(p)}
          >
            {p}
          </span>
        ))}
      </div>

      {selected && cur && <PaletteEditor
        name={selected}
        colors={cur}
        onRename={(n) => { renamePalette(selected, n); setSelected(n); }}
        onSet={(k, v) => setPaletteColor(selected, k, v)}
        onDelete={(k) => deletePaletteColor(selected, k)}
      />}

      {paletteNames.length === 0 && <p className="muted small">No palettes yet. Add one above, or switch to the Presets tab to apply a preset that ships with palettes.</p>}
    </div>
  );
}

function PaletteEditor({ name, colors, onRename, onSet, onDelete }: {
  name: string;
  colors: Record<string, string>;
  onRename: (n: string) => void;
  onSet: (k: string, v: string) => void;
  onDelete: (k: string) => void;
}) {
  const [rename, setRename] = useState(name);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("#89b4fa");
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const entries = Object.entries(colors);

  const copyColor = useCallback((colorName: string) => {
    navigator.clipboard.writeText(colorName);
    setCopied(colorName);
    setTimeout(() => setCopied(null), 800);
  }, []);

  return (
    <div className="section">
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="muted small">rename</label>
        <input type="text" value={rename} onChange={(e) => setRename(e.target.value)} onBlur={() => rename !== name && onRename(rename)} />
        <div className="grow" />
        <span className="muted small">{entries.length} colors · click to copy name</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
        {entries.map(([k, hex]) => (
          <div
            key={k}
            className="palette-color-card"
            onClick={() => copyColor(k)}
            title={`Click to copy "${k}" for use in style strings (e.g. fg:${k})`}
          >
            <div className="palette-color-swatch" style={{ background: hex }} />
            <div className="palette-color-info">
              <span className="palette-color-name">
                {copied === k ? "copied!" : k}
              </span>
              {editing === k ? (
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => onSet(k, e.target.value)}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  style={{ width: "100%", fontSize: 10, padding: "1px 4px" }}
                />
              ) : (
                <span
                  className="palette-color-hex"
                  onDoubleClick={(e) => { e.stopPropagation(); setEditing(k); }}
                  title="double-click to edit hex"
                >
                  {hex}
                </span>
              )}
            </div>
            <input
              type="color"
              value={normalizeHex(hex)}
              onChange={(e) => { e.stopPropagation(); onSet(k, e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 20, height: 20, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
              title="open color picker"
            />
            <button
              className="ghost small"
              onClick={(e) => { e.stopPropagation(); onDelete(k); }}
              title="delete color"
            >×</button>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <input type="text" placeholder="color name" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <input type="color" value={normalizeHex(newVal)} onChange={(e) => setNewVal(e.target.value)} style={{ width: 28, height: 24, padding: 0, border: "none" }} />
        <input type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)} style={{ width: 90 }} />
        <button onClick={() => { if (newKey) { onSet(newKey, newVal); setNewKey(""); } }}>+ color</button>
      </div>
    </div>
  );
}

function normalizeHex(hex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const [, r, g, b] = hex.match(/#(.)(.)(.)/) ?? [];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
}
