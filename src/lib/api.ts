import type { Schema, ShellInfo, PreviewContext, PreviewResponse } from "./types";

const DEMO = !!import.meta.env.VITE_DEMO_MODE;

interface DemoData {
  generatedAt: string;
  starshipVersion: string;
  shell: ShellInfo;
  schema: Schema;
  presets: Record<string, string>;
  samplePreview: PreviewResponse;
}

let demoCache: Promise<DemoData> | null = null;
function loadDemo(): Promise<DemoData> {
  if (!demoCache) {
    const url = `${import.meta.env.BASE_URL}demo-data.json`;
    demoCache = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`demo-data.json: ${r.status}`);
      return r.json() as Promise<DemoData>;
    });
  }
  return demoCache;
}

async function jget<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return (await r.json()) as T;
}

async function jpost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error((data as { error?: string })?.error ?? r.statusText), { status: r.status, data });
  return data as T;
}

export const api = {
  isDemo: () => DEMO,
  shell: async (): Promise<ShellInfo> => {
    if (DEMO) return (await loadDemo()).shell;
    return jget<ShellInfo>("/api/shell");
  },
  schema: async (): Promise<Schema> => {
    if (DEMO) return (await loadDemo()).schema;
    return jget<Schema>("/api/schema");
  },
  presets: async (): Promise<{ presets: string[] }> => {
    if (DEMO) return { presets: Object.keys((await loadDemo()).presets) };
    return jget<{ presets: string[] }>("/api/presets");
  },
  preset: async (name: string): Promise<{ name: string; content: string }> => {
    if (DEMO) {
      const d = await loadDemo();
      return { name, content: d.presets[name] ?? "" };
    }
    return jget<{ name: string; content: string }>(`/api/presets/${encodeURIComponent(name)}`);
  },
  preview: async (config: string, context: PreviewContext): Promise<PreviewResponse> => {
    if (DEMO) return (await loadDemo()).samplePreview;
    return jpost<PreviewResponse>("/api/preview", { config, context });
  },
  save: async (path: string, content: string, overwrite = false): Promise<{ ok: true; path: string }> => {
    if (DEMO) {
      throw Object.assign(
        new Error("Save is disabled in the static demo. Install locally to write your config: bunx github:bdmorin/configurator-starship"),
        { status: 503 },
      );
    }
    return jpost<{ ok: true; path: string }>("/api/save", { path, content, overwrite });
  },
};
