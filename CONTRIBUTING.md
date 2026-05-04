# Contributing

Thanks for the interest. This is a small, opinionated tool — PRs welcome, but read this first so we're aligned on direction.

## Dev setup

Requires:
- [Bun](https://bun.sh) ≥ 1.3
- [`starship`](https://starship.rs/#install) on `PATH` (any reasonably recent version)

```sh
git clone https://github.com/bdmorin/configurator-starship.git
cd configurator-starship
bun install
bun dev
```

That starts:
- The Bun API server on `127.0.0.1:4873`
- Vite dev client on `127.0.0.1:5173` with HMR (proxies `/api/*` to the Bun server)

Open the Vite URL.

## Project layout

```
server.ts                 Bun HTTP server, shells out to starship
src/
  App.tsx                 Top-level layout
  components/             FormatBuilder, ModuleEditor, PalettePicker, PresetGallery, ...
  lib/
    api.ts                Client API surface; demo-mode branch
    store.ts              zustand store, debounced preview refresh
    toml.ts               smol-toml wrappers, format tokenizer
    types.ts              Shared types
    descriptions.ts       Hand-curated module/field descriptions
bin/cli.ts                Entry for `bunx github:bdmorin/configurator-starship`
scripts/generate-demo-data.ts   Bake static data for the Pages build
public/demo-data.json     Frozen schema + presets + one sample preview
.github/workflows/        ci.yml (typecheck + build), pages.yml (deploy)
```

## Code style

- TypeScript, strict where it isn't fighting us. `bun run typecheck` should be clean.
- Functional React components, hooks. No class components.
- Small files over big ones — but no premature abstractions. Three similar lines beats a clever helper.
- No comments unless the *why* is non-obvious. Don't narrate code that names itself.
- Ban list: `any` (use `unknown` and narrow), `console.log` left in commits, accidental `0.0.0.0` server binds.

## Testing

There's no formal test suite yet. The smoke scripts under `ai/browser-scripts/` use Playwright to load the app, capture screenshots, and check for console errors.

```sh
# in one terminal
bun dev

# in another
bun ai/browser-scripts/smoke-test.ts
```

For a real change, run `bun run typecheck && bun run build` before pushing — that's what CI runs.

## What's in scope

Yes, please:
- New schema-aware editors for module fields with funky shapes (e.g. arrays-of-tables)
- More palette presets
- Better drag-and-drop UX in the format pill view
- Accessibility improvements (keyboard nav, ARIA labels)
- Bug fixes — especially anything that misbehaves with non-default starship versions

Maybe — open an issue first:
- New tabs / large UI surface additions
- Bundling a different terminal renderer (xterm is load-bearing)

No thanks:
- Auth, CORS, multi-user features (this is a localhost-only tool — that's the security model)
- Cloud sync / SaaS layer (vendor lock conflicts with the project's purpose)
- Replacing the real `starship` binary with a JS reimplementation (the binary is the source of truth)

## PR flow

1. Open an issue describing the change *first* if it's non-trivial.
2. Branch from `main`. Keep PRs scoped — small + clear beats big + comprehensive.
3. `bun run typecheck && bun run build` should pass locally.
4. Update `public/demo-data.json` only if your change requires fresh schema/preset data — see the regenerate command in [README.md](./README.md#demo-mode-github-pages).
5. PRs trigger CI. Pages deploy only fires on `main`.

## Security

The server binds `127.0.0.1` only and writes are jailed to `$HOME`. If you find a way to break either of those invariants, please open a private issue (use GitHub's "Report a vulnerability" flow) rather than a public PR.
