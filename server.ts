/**
 * starship-config — local Bun API server.
 *
 * Shells out to the `starship` binary for rendering and schema extraction.
 * Binds to 127.0.0.1 only. No authentication, no CORS: localhost is the fence.
 */

import { spawn } from "bun";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { moduleDescriptions, fieldDescriptions } from "./src/lib/descriptions";

const PORT = Number(process.env.PORT ?? 4873);
const HOST = process.env.HOST ?? "127.0.0.1";
const IS_PROD = process.env.NODE_ENV === "production";

// ──────────────────────────────────────────────────────────────────────────────
// starship helpers
// ──────────────────────────────────────────────────────────────────────────────

async function runStarship(args: string[], env: Record<string, string> = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn({
    cmd: ["starship", ...args],
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

async function starshipVersion(): Promise<string> {
  const { stdout } = await runStarship(["--version"]);
  return stdout.split("\n")[0]?.trim() ?? "unknown";
}

// ──────────────────────────────────────────────────────────────────────────────
// schema — generated from `starship print-config --default`
// ──────────────────────────────────────────────────────────────────────────────

type FieldType = "string" | "number" | "boolean" | "array" | "map" | "table" | "unknown";

interface FieldSchema {
  name: string;
  type: FieldType;
  default: unknown;
  description?: string;
}

interface ModuleSchema {
  name: string;
  description?: string;
  fields: FieldSchema[];
  subTables: { name: string; kind: "map" | "table"; description?: string }[];
  arrayTables: { name: string; fields: FieldSchema[] }[];
}

interface Schema {
  topLevel: FieldSchema[];
  modules: ModuleSchema[];
  moduleNames: string[];
}

function inferType(value: unknown): FieldType {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (value && typeof value === "object") return "table";
  return "unknown";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Starship embeds `i64::MAX` (9223372036854775807) as a "no truncation"
 * sentinel. JS Number can't hold it losslessly and smol-toml refuses. Replace
 * any integer literal past Number.MAX_SAFE_INTEGER with a representable
 * sentinel so parsing succeeds. We only rewrite bare integer literals on RHS.
 */
function sanitizeTomlIntegers(toml: string): string {
  return toml.replace(/(=\s*)(-?\d{16,})(?=\s|$)/gm, (_, eq: string, num: string) => {
    const big = BigInt(num);
    if (big > BigInt(Number.MAX_SAFE_INTEGER) || big < BigInt(Number.MIN_SAFE_INTEGER)) {
      return `${eq}999999999`;
    }
    return `${eq}${num}`;
  });
}

async function buildSchema(): Promise<Schema> {
  const { stdout } = await runStarship(["print-config", "--default"]);
  const parsed = parseToml(sanitizeTomlIntegers(stdout)) as Record<string, unknown>;

  const topLevel: FieldSchema[] = [];
  const modules: ModuleSchema[] = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (key.startsWith("$")) continue; // $schema
    if (!isPlainObject(value)) {
      topLevel.push({
        name: key,
        type: inferType(value),
        default: value,
        description: fieldDescriptions[`__top.${key}`],
      });
      continue;
    }

    // Top-level containers we don't want to treat as modules
    if (key === "palettes" || key === "profiles") continue;

    const mod: ModuleSchema = {
      name: key,
      description: moduleDescriptions[key],
      fields: [],
      subTables: [],
      arrayTables: [],
    };

    for (const [fk, fv] of Object.entries(value)) {
      if (Array.isArray(fv) && fv.length > 0 && isPlainObject(fv[0])) {
        // e.g. battery.display = [{threshold, style}, ...]
        mod.arrayTables.push({
          name: fk,
          fields: Object.entries(fv[0] as Record<string, unknown>).map(([ak, av]) => ({
            name: ak,
            type: inferType(av),
            default: av,
          })),
        });
      } else if (isPlainObject(fv)) {
        // sub-tables like aws.region_aliases — assume map of string→string
        const entries = Object.entries(fv);
        const isMap = entries.length === 0 || entries.every(([, ev]) => typeof ev === "string");
        mod.subTables.push({
          name: fk,
          kind: isMap ? "map" : "table",
          description: fieldDescriptions[`${key}.${fk}`],
        });
      } else {
        mod.fields.push({
          name: fk,
          type: inferType(fv),
          default: fv,
          description: fieldDescriptions[`${key}.${fk}`],
        });
      }
    }

    modules.push(mod);
  }

  // Also fetch the full module list from `starship module --list` — catches
  // modules that don't appear in print-config --default (e.g. `custom`).
  const { stdout: listOut } = await runStarship(["module", "--list"]);
  const allNames = listOut
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const existing = new Set(modules.map((m) => m.name));
  for (const n of allNames) {
    if (!existing.has(n)) {
      modules.push({ name: n, description: moduleDescriptions[n], fields: [], subTables: [], arrayTables: [] });
    }
  }

  modules.sort((a, b) => a.name.localeCompare(b.name));
  const moduleNames = modules.map((m) => m.name);
  return { topLevel, modules, moduleNames };
}

let schemaCache: Schema | null = null;
async function getSchema(): Promise<Schema> {
  if (!schemaCache) schemaCache = await buildSchema();
  return schemaCache;
}

// ──────────────────────────────────────────────────────────────────────────────
// shell + environment introspection
// ──────────────────────────────────────────────────────────────────────────────

interface ShellInfo {
  shell: string;
  shell_name: string;
  home: string;
  cwd: string;
  home_config_path: string;
  home_config_exists: boolean;
  home_config_content: string | null;
  starship_version: string;
  init_snippet: string;
}

function shellInitSnippet(shellName: string): string {
  switch (shellName) {
    case "zsh": return 'eval "$(starship init zsh)"';
    case "bash": return 'eval "$(starship init bash)"';
    case "fish": return "starship init fish | source";
    case "pwsh":
    case "powershell": return "Invoke-Expression (&starship init powershell)";
    case "nu":
    case "nushell": return "mkdir ~/.cache/starship\nstarship init nu | save -f ~/.cache/starship/init.nu";
    default: return `# unknown shell "${shellName}" — see https://starship.rs/#installation`;
  }
}

async function getShellInfo(): Promise<ShellInfo> {
  const shell = process.env.SHELL ?? "/bin/sh";
  const shellName = shell.split("/").pop() ?? "sh";
  const home = homedir();
  const cwd = process.cwd();
  const home_config_path = process.env.STARSHIP_CONFIG ?? join(home, ".config", "starship.toml");
  const home_config_exists = existsSync(home_config_path);
  const home_config_content = home_config_exists ? readFileSync(home_config_path, "utf8") : null;
  return {
    shell,
    shell_name: shellName,
    home,
    cwd,
    home_config_path,
    home_config_exists,
    home_config_content,
    starship_version: await starshipVersion(),
    init_snippet: shellInitSnippet(shellName),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// preview — render draft config with simulated context
// ──────────────────────────────────────────────────────────────────────────────

interface PreviewContext {
  cwd?: string;
  status?: number;
  cmd_duration?: number;
  jobs?: number;
  shlvl?: number;
  keymap?: string;
  terminal_width?: number;
  pipestatus?: string;
}

function previewArgs(ctx: PreviewContext): string[] {
  const args: string[] = [];
  if (ctx.cwd) args.push("--path", ctx.cwd, "--logical-path", ctx.cwd);
  if (ctx.status !== undefined) args.push("--status", String(ctx.status));
  if (ctx.cmd_duration !== undefined) args.push("--cmd-duration", String(ctx.cmd_duration));
  if (ctx.jobs !== undefined) args.push("--jobs", String(ctx.jobs));
  if (ctx.shlvl !== undefined) args.push("--shlvl", String(ctx.shlvl));
  if (ctx.keymap) args.push("--keymap", ctx.keymap);
  if (ctx.terminal_width !== undefined) args.push("--terminal-width", String(ctx.terminal_width));
  if (ctx.pipestatus) args.push("--pipestatus", ctx.pipestatus);
  return args;
}

function withTempConfig<T>(content: string, fn: (path: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "starship-config-"));
  const file = join(dir, "starship.toml");
  writeFileSync(file, content, "utf8");
  return fn(file).finally(() => {
    try {
      require("node:fs").rmSync(dir, { recursive: true, force: true });
    } catch {}
  });
}

async function renderPreview(config: string, ctx: PreviewContext): Promise<{ prompt: string; explain: string; stderr: string }> {
  return withTempConfig(config, async (path) => {
    const env = { STARSHIP_CONFIG: path };
    const args = previewArgs(ctx);
    const [prompt, explain] = await Promise.all([
      runStarship(["prompt", ...args], env),
      runStarship(["explain", ...args], env),
    ]);
    return {
      prompt: prompt.stdout,
      explain: explain.stdout,
      stderr: prompt.stderr || explain.stderr,
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// presets
// ──────────────────────────────────────────────────────────────────────────────

async function listPresets(): Promise<string[]> {
  const { stdout } = await runStarship(["preset", "--list"]);
  return stdout.split("\n").map((s) => s.trim()).filter(Boolean);
}

async function getPreset(name: string): Promise<string> {
  // Allow only alphanumerics + hyphen/underscore — belt-and-suspenders against
  // arg injection even though we exec without a shell.
  if (!/^[a-z0-9_-]+$/i.test(name)) throw new Error("invalid preset name");
  const { stdout, exitCode } = await runStarship(["preset", name]);
  if (exitCode !== 0) throw new Error(`preset "${name}" not found`);
  return stdout;
}

// ──────────────────────────────────────────────────────────────────────────────
// save
// ──────────────────────────────────────────────────────────────────────────────

function normalizeSavePath(raw: string): string {
  let p = raw;
  if (p.startsWith("~")) p = join(homedir(), p.slice(1));
  p = resolve(p);
  // Only permit writes inside $HOME. This tool is personal; keep the blast
  // radius there.
  if (!p.startsWith(homedir())) throw new Error("refusing to write outside $HOME");
  return p;
}

// ──────────────────────────────────────────────────────────────────────────────
// HTTP
// ──────────────────────────────────────────────────────────────────────────────

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function serverError(e: unknown): Response {
  const msg = e instanceof Error ? e.message : String(e);
  return json({ error: msg }, { status: 500 });
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  try {
    if (pathname === "/api/health") return json({ ok: true });

    if (pathname === "/api/shell" && req.method === "GET") {
      return json(await getShellInfo());
    }

    if (pathname === "/api/schema" && req.method === "GET") {
      return json(await getSchema());
    }

    if (pathname === "/api/presets" && req.method === "GET") {
      return json({ presets: await listPresets() });
    }

    if (pathname.startsWith("/api/presets/") && req.method === "GET") {
      const name = decodeURIComponent(pathname.slice("/api/presets/".length));
      const content = await getPreset(name);
      return json({ name, content });
    }

    if (pathname === "/api/preview" && req.method === "POST") {
      const body = (await req.json()) as { config: string; context?: PreviewContext };
      if (typeof body?.config !== "string") return json({ error: "config required" }, { status: 400 });
      const out = await renderPreview(body.config, body.context ?? {});
      return json(out);
    }

    if (pathname === "/api/save" && req.method === "POST") {
      const body = (await req.json()) as { path: string; content: string; overwrite?: boolean };
      if (typeof body?.path !== "string" || typeof body?.content !== "string") {
        return json({ error: "path and content required" }, { status: 400 });
      }
      const target = normalizeSavePath(body.path);
      const exists = existsSync(target);
      if (exists && !body.overwrite) {
        return json({ error: "target exists; pass overwrite:true to replace", existing: readFileSync(target, "utf8") }, { status: 409 });
      }
      writeFileSync(target, body.content, "utf8");
      return json({ ok: true, path: target });
    }

    return json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return serverError(e);
  }
}

// In production, also serve the built client from ./dist.
async function handleStatic(url: URL): Promise<Response | null> {
  if (!IS_PROD) return null;
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = Bun.file(`./dist${path}`);
  if (await file.exists()) return new Response(file);
  // SPA fallback
  const index = Bun.file("./dist/index.html");
  if (await index.exists()) return new Response(index);
  return null;
}

Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return handle(req);
    const stat = await handleStatic(url);
    return stat ?? new Response("dev: client is served by Vite on :5173", { status: 404 });
  },
});

console.log(`⚓ starship-config API listening on http://${HOST}:${PORT}`);
if (!IS_PROD) console.log(`   dev client: http://${HOST}:5173`);
