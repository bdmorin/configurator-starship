import { useState } from "react";
import { useStore } from "../lib/store";
import { api } from "../lib/api";

export function SaveDialog({ onClose }: { onClose: () => void }) {
  const shell = useStore((s) => s.shell);
  const currentToml = useStore((s) => s.currentToml);
  const [target, setTarget] = useState(shell?.home_config_path ?? "~/.config/starship.toml");
  const [stage, setStage] = useState<"edit" | "conflict" | "done">("edit");
  const [conflict, setConflict] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const content = currentToml();

  async function attemptSave(overwrite: boolean) {
    setSaving(true);
    setError(null);
    try {
      await api.save(target, content, overwrite);
      setStage("done");
    } catch (e: any) {
      if (e?.status === 409 && e?.data?.existing) {
        setConflict(e.data.existing);
        setStage("conflict");
      } else {
        setError(e?.message ?? String(e));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        {stage === "edit" && (
          <>
            <h2>Save config</h2>
            <p className="muted small">Writes are restricted to paths inside your $HOME.</p>
            <div className="field-row">
              <label className="label">target</label>
              <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} className="grow" />
            </div>
            <details>
              <summary className="muted small">preview contents</summary>
              <pre>{content}</pre>
            </details>
            {error && <div className="badge err" style={{ marginTop: 8 }}>{error}</div>}
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={onClose}>Cancel</button>
              <button className="primary" disabled={saving} onClick={() => attemptSave(false)}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
        {stage === "conflict" && (
          <>
            <h2>{target} already exists</h2>
            <p className="muted small">Compare before overwriting. This action cannot be undone.</p>
            <details open>
              <summary>existing ({conflict?.length ?? 0} bytes)</summary>
              <pre>{conflict}</pre>
            </details>
            <details>
              <summary>new ({content.length} bytes)</summary>
              <pre>{content}</pre>
            </details>
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={onClose}>Cancel</button>
              <button className="danger" disabled={saving} onClick={() => attemptSave(true)}>
                {saving ? "Writing…" : "Overwrite"}
              </button>
            </div>
          </>
        )}
        {stage === "done" && (
          <>
            <h2>Saved to {target}</h2>
            <p className="muted small">Reload your shell or open a new terminal to see it.</p>
            {shell?.init_snippet && (
              <>
                <p className="muted small">If this is your first time, add to your shell init:</p>
                <pre>{shell.init_snippet}</pre>
              </>
            )}
            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button className="primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
