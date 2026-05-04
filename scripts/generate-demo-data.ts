#!/usr/bin/env bun
/**
 * Generates public/demo-data.json for the GitHub Pages demo build.
 *
 * Pulls schema, presets, and a sample preview from a running local server
 * (start `bun dev` in another terminal first). The resulting JSON is committed
 * to the repo — CI does not need a starship binary to build the demo.
 *
 * Re-run when starship releases new modules or you change schema generation:
 *   bun scripts/generate-demo-data.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";

const API = process.env.STARSHIP_CONFIG_API ?? "http://127.0.0.1:4873";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return (await r.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}`);
  return (await r.json()) as T;
}

console.log(`Pulling demo data from ${API}…`);

const [schema, presetsList, shell] = await Promise.all([
  get<{ modules: { name: string }[]; moduleNames: string[] }>("/api/schema"),
  get<{ presets: string[] }>("/api/presets"),
  get<Record<string, unknown>>("/api/shell").catch(() => null),
]);

console.log(`  schema:  ${schema.modules?.length ?? 0} modules`);
console.log(`  presets: ${presetsList.presets?.length ?? 0}`);

const presets: Record<string, string> = {};
for (const name of presetsList.presets) {
  const r = await get<{ name: string; content: string }>(`/api/presets/${encodeURIComponent(name)}`);
  presets[name] = r.content;
  process.stdout.write(".");
}
process.stdout.write("\n");

const samplePreview = await post<{ prompt: string; explain: string }>("/api/preview", {
  config: "",
  context: {
    cwd: "/home/astronaut/src/rocket-ship",
    status: 0,
    cmd_duration: 420,
    jobs: 0,
    shlvl: 1,
    terminal_width: 120,
  },
}).catch((e) => {
  console.warn(`  preview render failed: ${e.message}`);
  return { prompt: "", explain: "" };
});

const data = {
  generatedAt: new Date().toISOString(),
  starshipVersion: (shell as { starship_version?: string } | null)?.starship_version ?? "unknown",
  shell: {
    shell_name: "demo",
    starship_version: (shell as { starship_version?: string } | null)?.starship_version ?? "unknown",
    home_config_path: "~/.config/starship.toml",
    home_config_exists: false,
    home_config_content: "",
  },
  schema,
  presets,
  samplePreview,
};

mkdirSync("public", { recursive: true });
const out = JSON.stringify(data, null, 2);
writeFileSync("public/demo-data.json", out);
console.log(`✓ wrote public/demo-data.json (${(out.length / 1024).toFixed(1)} KB)`);
