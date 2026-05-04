import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useStore } from "../lib/store";

/**
 * xterm.js-backed preview. We feed raw ANSI from `starship prompt` — xterm
 * handles SGR escapes, 256-color, truecolor, and Unicode wide chars. For Nerd
 * Font glyphs to render the user needs a Nerd-Font-enabled system font; we
 * list a fallback stack that covers most installs.
 */
export function Terminal() {
  const container = useRef<HTMLDivElement>(null);
  const term = useRef<XTerm | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const preview = useStore((s) => s.preview);

  useEffect(() => {
    if (!container.current) return;
    const t = new XTerm({
      fontFamily: '"MesloLGS NF", "FiraCode Nerd Font", "Hack Nerd Font", "JetBrainsMono Nerd Font", "SF Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      theme: {
        background: "#0b0b14",
        foreground: "#cdd6f4",
        cursor: "#cdd6f4",
      },
      cursorBlink: false,
      disableStdin: true,
      convertEol: true,
      allowProposedApi: true,
      // scrollback: 0 disables the Viewport scroll-sync internals, which
      // otherwise race with the renderer on first paint and throw
      // `reading 'dimensions' of undefined`. A prompt never needs scrollback.
      scrollback: 0,
    });
    const f = new FitAddon();
    t.loadAddon(f);
    t.open(container.current);
    // xterm's renderer needs one paint before fit() can read dimensions.
    // Calling fit() synchronously after open() races with that, throwing
    // "reading 'dimensions' of undefined". rAF defers it safely.
    requestAnimationFrame(() => { try { f.fit(); } catch {} });
    term.current = t;
    fit.current = f;

    const onResize = () => { try { f.fit(); } catch {} };
    const ro = new ResizeObserver(onResize);
    ro.observe(container.current);

    return () => {
      ro.disconnect();
      t.dispose();
      term.current = null;
      fit.current = null;
    };
  }, []);

  useEffect(() => {
    const t = term.current;
    if (!t) return;
    // xterm can throw during write/reset if its Viewport hasn't rendered
    // once yet — race between our initial preview arriving and xterm's
    // first renderer paint. Swallow: the next preview update lands fine.
    const tryWrite = () => {
      try {
        t.reset();
        if (preview?.prompt) t.write(preview.prompt);
      } catch {
        requestAnimationFrame(tryWrite);
      }
    };
    requestAnimationFrame(tryWrite);
  }, [preview?.prompt]);

  return (
    <div className="preview-terminal">
      <div ref={container} className="xterm" style={{ height: "100%" }} />
    </div>
  );
}
