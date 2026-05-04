import { useEffect, useState } from "react";
import { useStore } from "../lib/store";

/**
 * Live TOML view of the draft. Editable — hitting "parse" re-hydrates the
 * structured state so the wizard reflects any free-form edits (lets users
 * paste configs from elsewhere and drop into the UI).
 */
export function TomlSource() {
  const currentToml = useStore((s) => s.currentToml);
  const loadFromString = useStore((s) => s.loadFromString);
  const [text, setText] = useState(currentToml());
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep textarea in sync when draft changes via other tabs — but only if user
  // isn't actively editing (dirty=false).
  useEffect(() => {
    if (!dirty) setText(currentToml());
  }, [currentToml, dirty]);

  // Subscribe so we re-run currentToml on store changes:
  useStore((s) => s.draft);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div className="row">
        <span className="muted small">Free-form edit mode. Click Parse to merge back into the wizard state.</span>
        <div className="grow" />
        <button onClick={() => navigator.clipboard.writeText(text)}>Copy</button>
        <button onClick={() => { setText(currentToml()); setDirty(false); setError(null); }}>Revert</button>
        <button
          className="primary"
          disabled={!dirty}
          onClick={() => {
            try {
              loadFromString(text);
              setDirty(false);
              setError(null);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        >
          Parse
        </button>
      </div>
      {error && <div className="badge err">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        spellCheck={false}
        style={{ flex: 1, minHeight: 200, fontSize: 12 }}
      />
    </div>
  );
}
