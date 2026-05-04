import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useStore } from "../lib/store";
import { api } from "../lib/api";

export function PresetGallery() {
  const presets = useStore((s) => s.presets);
  const loadFromString = useStore((s) => s.loadFromString);
  const dirty = useStore((s) => s.dirty);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [rendered, setRendered] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    (async () => {
      try {
        const { content } = await api.preset(selected);
        setContent(content);
        const preview = await api.preview(content, { cwd: "/home/astronaut/src/rocket-ship", status: 0, cmd_duration: 420, jobs: 0, shlvl: 1, terminal_width: 120 });
        setRendered(preview.prompt);
      } finally {
        setLoading(false);
      }
    })();
  }, [selected]);

  return (
    <div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Starship ships these presets. Click to preview, then <b>Apply</b> to replace your draft. Your saved <code>~/.config/starship.toml</code> is never touched until you explicitly save.
      </p>
      <div className="chip-list" style={{ marginBottom: 10 }}>
        {presets.map((p) => (
          <span key={p} className={`chip ${selected === p ? "selected" : ""}`} onClick={() => setSelected(p)}>{p}</span>
        ))}
      </div>

      {selected && (
        <div className="section">
          <div className="row" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontFamily: "var(--mono)" }}>{selected}</h3>
            <div className="grow" />
            <button
              className="primary"
              onClick={() => {
                if (dirty && !confirm("Replace current draft with preset? Your unsaved changes will be lost.")) return;
                loadFromString(content);
              }}
            >
              Apply preset
            </button>
          </div>

          <div style={{ height: 100, background: "#0b0b14", borderRadius: 4, padding: 6, marginBottom: 8 }}>
            <PresetTerminal ansi={rendered} loading={loading} />
          </div>

          <details open>
            <summary className="muted small">view TOML</summary>
            <pre style={{ maxHeight: 300, overflow: "auto", fontSize: 11, background: "var(--bg-input)", padding: 8, borderRadius: 4 }}>{content}</pre>
          </details>
        </div>
      )}
    </div>
  );
}

function PresetTerminal({ ansi, loading }: { ansi: string; loading: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const t = new XTerm({
      fontFamily: '"MesloLGS NF", "FiraCode Nerd Font", "Hack Nerd Font", "SF Mono", monospace',
      fontSize: 12,
      theme: { background: "#0b0b14", foreground: "#cdd6f4" },
      disableStdin: true,
      convertEol: true,
      cursorBlink: false,
      allowProposedApi: true,
      scrollback: 0,
    });
    const f = new FitAddon();
    t.loadAddon(f);
    t.open(ref.current);
    requestAnimationFrame(() => { try { f.fit(); } catch {} });
    termRef.current = t;
    const ro = new ResizeObserver(() => { try { f.fit(); } catch {} });
    ro.observe(ref.current);
    return () => { ro.disconnect(); t.dispose(); termRef.current = null; };
  }, []);
  useEffect(() => {
    const t = termRef.current;
    if (!t) return;
    const tryWrite = () => {
      try {
        t.reset();
        if (loading) t.write("…rendering…");
        else if (ansi) t.write(ansi);
      } catch {
        requestAnimationFrame(tryWrite);
      }
    };
    requestAnimationFrame(tryWrite);
  }, [ansi, loading]);
  return <div ref={ref} style={{ height: "100%" }} />;
}
