import { useStore } from "../lib/store";

/**
 * Knobs that feed `starship prompt` flags — let the user see how their prompt
 * looks in different scenarios (failed command, long command, deep shell, …)
 * without having to actually run those commands.
 */
export function ContextControls() {
  const context = useStore((s) => s.context);
  const setContext = useStore((s) => s.setContext);
  const shell = useStore((s) => s.shell);

  return (
    <div className="ctx-bar">
      <label>cwd
        <input
          type="text"
          value={context.cwd ?? ""}
          onChange={(e) => setContext({ cwd: e.target.value || undefined })}
          placeholder={shell?.cwd}
        />
      </label>
      <label>exit
        <input type="number" value={context.status ?? 0} onChange={(e) => setContext({ status: Number(e.target.value) })} />
      </label>
      <label>duration(ms)
        <input type="number" value={context.cmd_duration ?? 0} onChange={(e) => setContext({ cmd_duration: Number(e.target.value) })} />
      </label>
      <label>jobs
        <input type="number" value={context.jobs ?? 0} onChange={(e) => setContext({ jobs: Number(e.target.value) })} />
      </label>
      <label>shlvl
        <input type="number" value={context.shlvl ?? 1} onChange={(e) => setContext({ shlvl: Number(e.target.value) })} />
      </label>
      <label>keymap
        <select value={context.keymap ?? "viins"} onChange={(e) => setContext({ keymap: e.target.value })}>
          <option value="viins">viins</option>
          <option value="vicmd">vicmd</option>
          <option value="visual">visual</option>
          <option value="replace">replace</option>
        </select>
      </label>
      <label>width
        <input type="number" value={context.terminal_width ?? 120} onChange={(e) => setContext({ terminal_width: Number(e.target.value) })} />
      </label>
    </div>
  );
}
