/**
 * Curated descriptions for common modules and fields. The long tail of
 * rarely-used modules ships with no description — the field name + default
 * value are usually enough signal.
 *
 * Source of truth: https://starship.rs/config/
 */

export const moduleDescriptions: Record<string, string> = {
  character: "The prompt character shown before your input. Changes color on command failure.",
  directory: "The current working directory, with truncation and substitutions.",
  cmd_duration: "How long the previous command took to run.",
  time: "The current local time.",
  username: "The active user's username.",
  hostname: "The system hostname — optionally only shown over SSH.",
  os: "An OS-specific icon for the current platform.",
  line_break: "Inserts a blank line between the status segments and the input line.",
  jobs: "Number of currently running background jobs.",
  battery: "Laptop battery level and charging state.",
  memory_usage: "System RAM and swap usage.",
  shell: "The currently running shell (bash/zsh/fish/…).",
  status: "The exit status of the previous command.",
  shlvl: "Current shell nesting level ($SHLVL).",
  sudo: "Shown when sudo credentials are cached.",
  container: "Detected container runtime (Docker, Podman, etc.).",
  custom: "User-defined modules — run a command and render its output.",

  // VCS
  git_branch: "Current git branch and tracking info.",
  git_commit: "Current commit hash (when detached HEAD or tagged).",
  git_state: "Git operation in progress (rebase, merge, etc.).",
  git_status: "Working-tree status: staged, unstaged, ahead, behind.",
  git_metrics: "Added/removed line counts in the working tree.",
  hg_branch: "Current Mercurial branch.",
  fossil_branch: "Current Fossil branch.",
  pijul_channel: "Current Pijul channel.",

  // Cloud
  aws: "AWS profile and region (from AWS_PROFILE / AWS_REGION).",
  gcloud: "Active gcloud config (project, account, region).",
  azure: "Active Azure subscription.",
  openstack: "Active OpenStack cloud + project.",

  // Containers / infra
  docker_context: "The currently selected Docker context.",
  kubernetes: "The active kubeconfig context and namespace.",
  terraform: "Terraform workspace and version.",
  helm: "Helm version in directories with charts.",
  pulumi: "Active Pulumi stack.",
  nix_shell: "Shown inside a `nix-shell`/`nix develop`.",

  // Languages — we only describe the common ones; the rest carry their own
  // well-known names.
  nodejs: "Node.js version when package.json / *.js is present.",
  python: "Python version and active virtualenv/conda env.",
  rust: "Rust toolchain version.",
  golang: "Go version.",
  java: "Java version.",
  ruby: "Ruby version.",
  php: "PHP version.",
  elixir: "Elixir version.",
  haskell: "Haskell GHC version.",
  deno: "Deno version.",
  bun: "Bun version.",
  dotnet: ".NET SDK version.",
  swift: "Swift version.",
  zig: "Zig version.",
  c: "C compiler version (gcc/clang/cc).",
  cpp: "C++ compiler version.",
  lua: "Lua interpreter version.",
  perl: "Perl version.",
  kotlin: "Kotlin version.",
  scala: "Scala version.",
  crystal: "Crystal version.",
  dart: "Dart / Flutter version.",
  erlang: "Erlang/OTP version.",
  fennel: "Fennel version.",
  nim: "Nim version.",
  ocaml: "OCaml version.",
  purescript: "PureScript version.",
  raku: "Raku version.",
  rlang: "R version.",
  red: "Red version.",
  solidity: "Solidity compiler version.",
  typst: "Typst version.",
  vlang: "V language version.",

  // Package / env managers
  package: "Version from package metadata (package.json, Cargo.toml, …).",
  conda: "Active conda environment.",
  pixi: "Active pixi environment.",
  mise: "Active mise tools.",
  direnv: "Shown when direnv is active in the current directory.",

  env_var: "Render an arbitrary environment variable.",
};

export const fieldDescriptions: Record<string, string> = {
  // Top-level
  "__top.format": "The full prompt format string. $module inserts a module; [text](style) applies styling.",
  "__top.right_format": "Right-aligned format string (shown on the right side of the prompt).",
  "__top.continuation_prompt": "Prompt shown on continuation lines (multi-line commands).",
  "__top.scan_timeout": "Max milliseconds starship will scan files before giving up (default 30).",
  "__top.command_timeout": "Max milliseconds starship will wait for external commands.",
  "__top.add_newline": "Add a blank line before the prompt each time.",
  "__top.follow_symlinks": "Resolve symlinks when scanning for project markers.",
  "__top.palette": "Name of the active palette from [palettes.*] to use for named colors.",

  // Character
  "character.success_symbol": "Shown after the previous command succeeded.",
  "character.error_symbol": "Shown after the previous command failed.",
  "character.vimcmd_symbol": "Shown when in vi-command mode.",

  // Directory
  "directory.truncation_length": "Number of parent directories to show (default 3).",
  "directory.truncation_symbol": "Prefix added when the path is truncated (default '').",
  "directory.home_symbol": "Replaces $HOME in the path (default '~').",
  "directory.read_only": "Symbol shown when the directory is not writable.",
  "directory.substitutions": "Map of path substring → replacement. Useful for icons on common dirs.",

  // cmd_duration
  "cmd_duration.min_time": "Only show duration when the command took at least this many ms.",
  "cmd_duration.show_milliseconds": "Include milliseconds in the rendered duration.",
  "cmd_duration.show_notifications": "Send a desktop notification when min_time_to_notify is exceeded.",

  // time
  "time.time_format": "strftime format for rendering the time (e.g. %R, %T).",
  "time.disabled": "The time module is disabled by default; flip to show it.",

  // git_status
  "git_status.ahead": "Format token when the branch is ahead of its upstream.",
  "git_status.behind": "Format token when the branch is behind its upstream.",
  "git_status.conflicted": "Format token for unresolved merge conflicts.",
  "git_status.untracked": "Format token for untracked files.",
  "git_status.modified": "Format token for modified files.",
  "git_status.staged": "Format token for staged files.",

  // Common across all modules
  "aws.format": "Format string rendered when the module is active. Available variables depend on the module.",
  "aws.symbol": "Icon or text rendered at the start of the module.",
  "aws.style": "TOML style string: e.g. 'bold yellow', 'fg:#ff0 bg:blue'.",
  "aws.disabled": "Hide the module entirely.",
};
