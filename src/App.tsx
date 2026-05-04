import { useEffect, useState } from "react";
import { useStore } from "./lib/store";
import { Terminal } from "./components/Terminal";
import { FormatBuilder } from "./components/FormatBuilder";
import { ModuleEditor } from "./components/ModuleEditor";
import { PalettePicker } from "./components/PalettePicker";
import { PresetGallery } from "./components/PresetGallery";
import { TomlSource } from "./components/TomlSource";
import { ContextControls } from "./components/ContextControls";
import { SaveDialog } from "./components/SaveDialog";
import { DemoBanner } from "./components/DemoBanner";
import { api } from "./lib/api";

type Tab = "format" | "modules" | "palettes" | "presets" | "toml";

export function App() {
  const bootstrap = useStore((s) => s.bootstrap);
  const shell = useStore((s) => s.shell);
  const dirty = useStore((s) => s.dirty);
  const previewPending = useStore((s) => s.previewPending);
  const previewError = useStore((s) => s.previewError);
  const [tab, setTab] = useState<Tab>("format");
  const [saving, setSaving] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    bootstrap().then(() => setBooted(true));
  }, [bootstrap]);

  if (!booted) {
    return <div style={{ padding: 40, color: "var(--fg-dim)" }}>Booting… shelling out to starship…</div>;
  }

  return (
    <div className="app">
      {api.isDemo() && <DemoBanner />}
      <header className="header">
        <h1><span className="rocket">🚀</span>starship-config</h1>
        {shell && (
          <div className="shell-info">
            <span className="badge">{shell.shell_name}</span>{" "}
            <span className="badge">{shell.starship_version}</span>{" "}
            <span>{shell.home_config_path}</span>
            {shell.home_config_exists ? <span className="badge ok">loaded</span> : <span className="badge warn">no config</span>}
            {" "}
            {dirty && <span className="badge warn">dirty</span>}
            {" "}
            {previewPending && <span className="badge">rendering…</span>}
            {" "}
            {previewError && <span className="badge err" title={previewError}>error</span>}
          </div>
        )}
        <div className="actions">
          <button onClick={() => navigator.clipboard.writeText(useStore.getState().currentToml())}>Copy TOML</button>
          <button className="primary" onClick={() => setSaving(true)}>Save…</button>
        </div>
      </header>

      <div className="split">
        <div className="pane">
          <div className="tabs">
            <button className={`tab ${tab === "format" ? "active" : ""}`} onClick={() => setTab("format")}>Format</button>
            <button className={`tab ${tab === "modules" ? "active" : ""}`} onClick={() => setTab("modules")}>Modules</button>
            <button className={`tab ${tab === "palettes" ? "active" : ""}`} onClick={() => setTab("palettes")}>Palettes</button>
            <button className={`tab ${tab === "presets" ? "active" : ""}`} onClick={() => setTab("presets")}>Presets</button>
            <button className={`tab ${tab === "toml" ? "active" : ""}`} onClick={() => setTab("toml")}>TOML</button>
          </div>
          <div className="tab-body">
            {tab === "format" && <FormatBuilder />}
            {tab === "modules" && <ModuleEditor />}
            {tab === "palettes" && <PalettePicker />}
            {tab === "presets" && <PresetGallery />}
            {tab === "toml" && <TomlSource />}
          </div>
        </div>

        <div className="pane">
          <Terminal />
          <ContextControls />
          <div className="section" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <h3>Explain</h3>
            <ExplainPanel />
          </div>
        </div>
      </div>

      {saving && <SaveDialog onClose={() => setSaving(false)} />}
    </div>
  );
}

function ExplainPanel() {
  const explain = useStore((s) => s.preview?.explain);
  if (!explain) return <div className="muted small">No active modules.</div>;
  return <pre className="explain-pre">{stripAnsi(explain)}</pre>;
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
