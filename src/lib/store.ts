import { create } from "zustand";
import type { Schema, ShellInfo, PreviewContext, PreviewResponse } from "./types";
import { api } from "./api";
import { type ConfigDraft, emptyDraft, parseConfig, stringifyConfig } from "./toml";

interface Store {
  // Loaded once from the server
  schema: Schema | null;
  shell: ShellInfo | null;
  presets: string[];

  // Working draft
  draft: ConfigDraft;
  dirty: boolean;

  // Preview simulation
  context: PreviewContext;
  preview: PreviewResponse | null;
  previewError: string | null;
  previewPending: boolean;

  // actions
  bootstrap: () => Promise<void>;
  setDraft: (next: ConfigDraft) => void;
  patchTopLevel: (key: string, value: unknown) => void;
  deleteTopLevel: (key: string) => void;
  patchModule: (name: string, field: string, value: unknown) => void;
  deleteModuleField: (name: string, field: string) => void;
  resetModule: (name: string) => void;
  addPalette: (name: string) => void;
  renamePalette: (oldName: string, newName: string) => void;
  setPaletteColor: (palette: string, color: string, hex: string) => void;
  deletePaletteColor: (palette: string, color: string) => void;
  setContext: (ctx: Partial<PreviewContext>) => void;
  loadFromString: (toml: string) => void;
  refreshPreview: () => Promise<void>;
  currentToml: () => string;
}

const defaultContext: PreviewContext = {
  cwd: undefined,
  status: 0,
  cmd_duration: 1337,
  jobs: 0,
  shlvl: 1,
  keymap: "viins",
  terminal_width: 120,
};

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<Store>((set, get) => ({
  schema: null,
  shell: null,
  presets: [],
  draft: emptyDraft(),
  dirty: false,
  context: { ...defaultContext },
  preview: null,
  previewError: null,
  previewPending: false,

  async bootstrap() {
    const [schema, shell, presets] = await Promise.all([api.schema(), api.shell(), api.presets()]);
    const ctx: PreviewContext = { ...defaultContext, cwd: shell.cwd };
    const seed = shell.home_config_content ? parseConfig(shell.home_config_content) : emptyDraft();
    set({ schema, shell, presets: presets.presets, draft: seed, context: ctx, dirty: false });
    await get().refreshPreview();
  },

  setDraft(next) {
    set({ draft: next, dirty: true });
    scheduleRefresh(get);
  },

  patchTopLevel(key, value) {
    const d = clone(get().draft);
    d.topLevel[key] = value;
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  deleteTopLevel(key) {
    const d = clone(get().draft);
    delete d.topLevel[key];
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  patchModule(name, field, value) {
    const d = clone(get().draft);
    if (!d.modules[name]) d.modules[name] = {};
    d.modules[name][field] = value;
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  deleteModuleField(name, field) {
    const d = clone(get().draft);
    if (d.modules[name]) delete d.modules[name][field];
    if (d.modules[name] && Object.keys(d.modules[name]).length === 0) delete d.modules[name];
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  resetModule(name) {
    const d = clone(get().draft);
    delete d.modules[name];
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  addPalette(name) {
    if (!name) return;
    const d = clone(get().draft);
    if (!d.palettes[name]) d.palettes[name] = {};
    set({ draft: d, dirty: true });
  },

  renamePalette(oldName, newName) {
    if (oldName === newName || !newName) return;
    const d = clone(get().draft);
    if (!d.palettes[oldName]) return;
    d.palettes[newName] = d.palettes[oldName];
    delete d.palettes[oldName];
    if (d.topLevel.palette === oldName) d.topLevel.palette = newName;
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  setPaletteColor(palette, color, hex) {
    const d = clone(get().draft);
    if (!d.palettes[palette]) d.palettes[palette] = {};
    d.palettes[palette][color] = hex;
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  deletePaletteColor(palette, color) {
    const d = clone(get().draft);
    if (d.palettes[palette]) delete d.palettes[palette][color];
    set({ draft: d, dirty: true });
    scheduleRefresh(get);
  },

  setContext(ctx) {
    set({ context: { ...get().context, ...ctx } });
    scheduleRefresh(get);
  },

  loadFromString(toml) {
    try {
      const draft = parseConfig(toml);
      set({ draft, dirty: true });
      scheduleRefresh(get);
    } catch (e) {
      set({ previewError: e instanceof Error ? e.message : String(e) });
    }
  },

  async refreshPreview() {
    const state = get();
    const toml = state.currentToml();
    set({ previewPending: true });
    try {
      const preview = await api.preview(toml, state.context);
      set({ preview, previewError: preview.stderr ? preview.stderr : null, previewPending: false });
    } catch (e) {
      set({ previewError: e instanceof Error ? e.message : String(e), previewPending: false });
    }
  },

  currentToml() {
    return stringifyConfig(get().draft);
  },
}));

function clone(d: ConfigDraft): ConfigDraft {
  return {
    topLevel: { ...d.topLevel },
    modules: Object.fromEntries(Object.entries(d.modules).map(([k, v]) => [k, { ...v }])),
    palettes: Object.fromEntries(Object.entries(d.palettes).map(([k, v]) => [k, { ...v }])),
    unknown: { ...d.unknown },
  };
}

function scheduleRefresh(get: () => Store) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { void get().refreshPreview(); }, 150);
}
