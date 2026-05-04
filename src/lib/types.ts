export type FieldType = "string" | "number" | "boolean" | "array" | "map" | "table" | "unknown";

export interface FieldSchema {
  name: string;
  type: FieldType;
  default: unknown;
  description?: string;
}

export interface ModuleSchema {
  name: string;
  description?: string;
  fields: FieldSchema[];
  subTables: { name: string; kind: "map" | "table"; description?: string }[];
  arrayTables: { name: string; fields: FieldSchema[] }[];
}

export interface Schema {
  topLevel: FieldSchema[];
  modules: ModuleSchema[];
  moduleNames: string[];
}

export interface ShellInfo {
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

export interface PreviewContext {
  cwd?: string;
  status?: number;
  cmd_duration?: number;
  jobs?: number;
  shlvl?: number;
  keymap?: string;
  terminal_width?: number;
}

export interface PreviewResponse {
  prompt: string;
  explain: string;
  stderr: string;
}
