# configurator-starship

A local, web-based wizard for building your [starship](https://starship.rs) prompt config — with a live, real-binary preview that updates as you type.

🎭 **[Live demo](https://bdmorin.github.io/configurator-starship/)** (read-only, no live render) · 🚀 **[Run it locally](#run-it)** for the real thing

---

## What it does

- **Real-time preview.** Edits hit the actual `starship` binary in a sandbox; the rendered prompt updates in 150ms.
- **All 100+ modules, all fields.** Schema is generated from `starship print-config --default` — you don't read docs to find a flag.
- **Format builder with pills.** Drag-and-drop `$module` / `[styled]` / `${variable}` tokens. Click a pill to copy, right-click to remove.
- **Palette picker.** Browse colors as actual swatches; click to copy a name like `rosewater` for use in `fg:rosewater`.
- **Preset gallery.** Apply any starship preset, see the rendered prompt, view the TOML.
- **Save back to `~/.config/starship.toml`.** Diff first, never overwrite without confirmation.

## Run it

Requires [Bun](https://bun.sh) and the [`starship`](https://starship.rs/#install) binary on `PATH`.

```sh
bunx github:bdmorin/configurator-starship
```

First run does a one-time build (~30s), then opens `http://127.0.0.1:4873` in your browser. Subsequent runs are instant.

You can also clone and run locally:

```sh
git clone https://github.com/bdmorin/configurator-starship.git
cd configurator-starship
bun install
bun dev
# → http://127.0.0.1:5173
```

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│  React + Vite UI     │  fetch  │  Bun HTTP server     │
│  :5173 (dev)         │ ──────> │  127.0.0.1:4873      │
│  (or served by Bun   │ <────── │  /api/{shell, schema,│
│   in production)     │   JSON  │   presets, preview,  │
└──────────────────────┘         │   save}              │
                                 └────────┬─────────────┘
                                          │ spawn
                                          ▼
                                 ┌──────────────────────┐
                                 │  starship binary     │
                                 │  prompt / explain /  │
                                 │  preset / module     │
                                 └──────────────────────┘
```

**Localhost is the fence.** The server binds `127.0.0.1` only, no auth, no CORS. Save writes are jailed to `$HOME`. Don't expose it to a network you don't trust.

## Demo mode (GitHub Pages)

The Pages deploy at `bdmorin.github.io/configurator-starship` is a static build with a frozen `public/demo-data.json` containing schema + presets + one sample preview. UI works for browsing/editing local state; the preview is static and save is disabled.

To regenerate the demo data after a starship release or schema change:

```sh
bun dev                              # in one terminal
bun run demo:data                    # in another → writes public/demo-data.json
bun run build:demo                   # produces dist/ with /configurator-starship/ base
```

The `pages.yml` workflow re-runs `build:demo` and deploys on every push to `main`.

## Stack

- [Bun](https://bun.sh) — runtime + HTTP server + bundler glue
- [Vite](https://vitejs.dev) + [React](https://react.dev) 18 — client
- [zustand](https://zustand.surge.sh) — state, with debounced preview refresh
- [smol-toml](https://github.com/squirrelchat/smol-toml) — TOML parse/stringify, both client and server
- [@xterm/xterm](https://xtermjs.org) — ANSI/SGR rendering for the preview, with Nerd Font fallback stack

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Issues and PRs welcome.

## License

[MIT](./LICENSE) © Brian Morin
