# CLAUDE.md

Project-level guidance for AI assistants (Claude Code, Cursor, Copilot, etc.) working on this repo.

## What this project is

A local-only web wizard for configuring [starship](https://starship.rs) prompts. Real-time preview is the killer feature — every edit fires `starship prompt` against a temp config in <150ms.

The frontend is React + Vite + zustand. The backend is a tiny Bun HTTP server that shells out to the `starship` binary. **The starship binary is the source of truth** — never reimplement its rendering or schema in JS.

## Security model — non-negotiable

- Server binds `127.0.0.1` only. Never change to `0.0.0.0`.
- No auth, no CORS — localhost is the fence.
- Save writes are jailed to `$HOME` via `normalizeSavePath()` in `server.ts`. Don't add features that escape this.
- Any feature suggesting "expose to network", "share with team", "sync to cloud" is out of scope. This is a personal tool. Tell the user no.

## Architecture quirks worth knowing

### `i64::MAX` integer sentinels in starship configs
Starship serializes `i64::MAX` (`9223372036854775807`) for "unlimited" fields like `truncation_length`. JS `Number.MAX_SAFE_INTEGER` is `2^53 - 1`, smaller. `smol-toml` rejects values that overflow safe integers. **Workaround:** `sanitizeTomlIntegers()` in `server.ts` regex-replaces 16+ digit literals with `999999999` before parsing. If you see TOML parse failures from preset content, this is the first place to look.

### React.StrictMode is removed (`src/main.tsx`)
xterm.js holds imperative DOM references and renderer state. StrictMode's intentional double-mount in dev breaks xterm with `Cannot read property 'dimensions' of undefined`. Tried `requestAnimationFrame` defer, `scrollback: 0`, try/catch around `.write()` — none stuck. Removing StrictMode was the only fix. Don't put it back.

### Preview is rendered by the real binary, in a temp dir
`withTempConfig()` writes the draft to `mkdtempSync()`, sets `STARSHIP_CONFIG=<temp>`, runs `starship prompt`. This means previews exactly match what the user will see — no JS approximation. It also means startup time matters: the server runs `starship --version` once at boot to warm the path.

### Format string tokenizer (`src/lib/toml.ts`)
The format builder treats the format string as a token stream: `$module`, `[text](style)`, `${variable}`, literal. Tokens carry `start`/`end` byte offsets so drag-to-reorder rebuilds the string from slices, not from re-serialized AST. Don't try to "improve" this by switching to a real parser unless you also handle escape sequences correctly.

### Demo mode (`VITE_DEMO_MODE=1`)
The Pages build serves a static `public/demo-data.json` with baked schema/presets/sample-preview. `src/lib/api.ts` branches on the env var and reads from JSON instead of `/api/*`. Save throws a friendly error in demo mode. Adding a new endpoint? Add a demo-mode branch too.

## File conventions

- TypeScript, strict-ish. `bun run typecheck` must be clean.
- Functional React components, hooks only. No classes.
- No `any` — use `unknown` and narrow.
- Default to no comments. Only write a comment when the *why* is non-obvious (e.g. the i64::MAX hack above warrants one).
- No multi-line comment blocks. Single-line only.
- Don't add error handling for impossible cases. Trust framework guarantees.

## Common tasks

### "Add a new module field type"
1. Update `FieldType` in `server.ts` and `src/lib/types.ts`.
2. Update schema generator in `server.ts` (`buildSchema()`).
3. Add an Input variant in `src/components/ModuleEditor.tsx`.
4. Re-run `bun run demo:data` to refresh the static schema.

### "Update Pages demo with fresh starship data"
```sh
bun dev                      # terminal 1
bun run demo:data            # terminal 2 → writes public/demo-data.json
git add public/demo-data.json && git commit -m "refresh demo data for starship X.Y.Z"
```
Pages workflow rebuilds on push.

### "Test in production-build mode locally"
```sh
bun run build
bun run start
# → http://127.0.0.1:4873 serves the bundled client + API
```
This is the same path `bunx github:bdmorin/configurator-starship` takes.

## Testing

No formal unit tests yet. Smoke testing via Playwright in `ai/browser-scripts/`:
- `smoke-test.ts` — boots the app, walks the tabs, asserts no console errors
- `screenshots.ts` / `v2-screenshots.ts` — capture visual state for review

Run after substantive UI changes. Don't claim a UI feature works without actually loading it in a browser.

## What I tried and discarded

- `React.StrictMode` — broke xterm (see above).
- A "headless preview" mode that called `starship` from the client via a service worker — can't spawn binaries from the browser, full stop.
- Replacing xterm with a hand-rolled ANSI renderer — too many SGR edge cases. xterm handles them correctly.
- Bundling a JS TOML parser that handles big integers — `smol-toml` is fine with the `i64::MAX` regex preprocessor.

## When in doubt

- The user (Brian) values clarity over cleverness, OBVIOUS naming, no half-finished features. If a feature has 3 valid approaches, ask before picking.
- Don't add abstractions for hypothetical futures. Three similar lines beats a premature helper.
- "Just do" — when given a clear directive, execute. Don't present menus. Escalate only genuine blockers.
