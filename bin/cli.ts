#!/usr/bin/env bun
/**
 * Entry point for `bunx github:bdmorin/configurator-starship`.
 *
 * - Verifies the `starship` binary is on PATH.
 * - Builds the client bundle if `dist/` is missing.
 * - Starts the Bun API server (which also serves the bundle in production).
 * - Best-effort opens the user's default browser.
 */
import { spawn, spawnSync } from "bun";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = process.env.PORT ?? "4873";
const HOST = process.env.HOST ?? "127.0.0.1";
const target = `http://${HOST}:${PORT}`;

function fail(msg: string, code = 1): never {
  console.error(`✗ ${msg}`);
  process.exit(code);
}

const which = spawnSync({ cmd: ["sh", "-c", "command -v starship"] });
if (!which.stdout.toString().trim()) {
  console.error("✗ starship binary not found on PATH.");
  console.error("  Install it: https://starship.rs/#install");
  process.exit(1);
}

if (!existsSync(join(ROOT, "dist", "index.html"))) {
  console.log("First-run build (one-time, ~30s)…");
  const build = spawn({
    cmd: ["bun", "run", "build"],
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await build.exited;
  if (code !== 0) fail("Build failed.", code ?? 1);
}

console.log(`\n🚀 starship-config → ${target}\n   Ctrl+C to stop.\n`);

const opener =
  process.platform === "darwin" ? "open" :
  process.platform === "win32" ? "start" :
  "xdg-open";
spawn({ cmd: [opener, target], stdout: "ignore", stderr: "ignore" }).exited.catch(() => {});

const serverProc = spawn({
  cmd: ["bun", "server.ts"],
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: "production", PORT, HOST },
  stdout: "inherit",
  stderr: "inherit",
});
const stop = () => { try { serverProc.kill(); } catch {} };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
const exit = await serverProc.exited;
process.exit(exit ?? 0);
