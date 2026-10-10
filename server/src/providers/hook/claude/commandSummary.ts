/**
 * Short, human labels for tool calls — what an agent is DOING, not the raw input.
 *
 * A Bash command is usually a long pipeline (`cd /x && npm run package 2>&1 | grep …`),
 * and the first 30 characters of that say nothing. `summarizeBashCommand` keeps the part
 * that matters: the program and what it is asked to do (`npm run package`, `git push`).
 */

/** Programs whose next word is a verb worth showing (`git push`, `tmux kill-session`). */
const SUBCOMMAND_PROGRAMS = new Set([
  'git',
  'gh',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  'bun',
  'docker',
  'cargo',
  'brew',
  'tmux',
  'kubectl',
  'pip',
  'pip3',
  'xcodebuild',
  'xcrun',
  'make',
  'launchctl',
  'systemctl',
  'defaults',
]);
/** Programs that take a script: show it by name (`node build.cjs`), never its path. */
const INTERPRETERS = new Set([
  'node',
  'python',
  'python3',
  'ruby',
  'bash',
  'sh',
  'zsh',
  'tsx',
  'ts-node',
  'deno',
  'perl',
]);
/** Wrappers that only decorate another command. */
const WRAPPERS = new Set(['sudo', 'time', 'nohup', 'exec', 'eval', 'command', 'env', 'nice', 'caffeinate']);
/** `npm run build` is a verb plus a target; for these, keep the target too. */
const RUNNERS = new Set(['run', 'exec', 'dlx', 'x']);

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/** Cut the middle out of a long name so both ends stay readable: `very-long-fi…name.png`. */
export function middleEllipsis(text: string, max: number): string {
  if (text.length <= max || max < 5) return text;
  const keep = max - 1;
  const head = Math.ceil(keep * 0.55);
  return `${text.slice(0, head)}…${text.slice(text.length - (keep - head))}`;
}

function baseName(token: string): string {
  const clean = token.replace(/^["'`$(]+|["'`)]+$/g, '');
  const slash = clean.lastIndexOf('/');
  return slash >= 0 ? clean.slice(slash + 1) : clean;
}

const isFlag = (token: string) => token.startsWith('-');

/** The first command of a pipeline worth describing, as tokens. */
function firstCommandTokens(raw: string): string[] {
  // First non-blank line only: heredoc bodies and multi-line scripts are noise.
  const line = raw.split('\n').find((l) => l.trim() !== '') ?? '';
  // Split into simple commands, keep the first that is not a `cd`/`export`/`source`/`set` setup step.
  const segments = line.split(/&&|\|\||;|\|/).map((s) => s.trim());
  for (const segment of segments) {
    let tokens = segment.split(/\s+/).filter(Boolean);
    while (tokens.length > 0 && (ENV_ASSIGNMENT.test(tokens[0]) || WRAPPERS.has(tokens[0]))) {
      tokens = tokens.slice(1);
    }
    // `eval "$(…brew shellenv)"` and friends leave a bare quote behind: skip them.
    if (tokens.length === 0 || /^["'$(]/.test(tokens[0])) continue;
    if (['cd', 'export', 'source', '.', 'set', 'unset', 'pushd', 'popd', 'true', ':'].includes(tokens[0])) continue;
    return tokens;
  }
  return [];
}

export function summarizeBashCommand(command: string, maxLength = 30): string {
  const tokens = firstCommandTokens(command);
  if (tokens.length === 0) return 'shell command';
  const program = baseName(tokens[0]);
  const rest = tokens.slice(1);
  const args = rest.filter((t) => !isFlag(t));
  let summary: string;

  if (SUBCOMMAND_PROGRAMS.has(program)) {
    const verb = args[0] ? baseName(args[0]) : '';
    const target = RUNNERS.has(verb) && args[1] ? ` ${baseName(args[1])}` : '';
    summary = verb ? `${program} ${verb}${target}` : program;
  } else if (INTERPRETERS.has(program)) {
    // `python3 - <<'E'`, `node -e "…"`, `bash -c "…"`: inline code, no script to name.
    const inline = rest.some((t) => t === '-' || t === '-c' || t === '-e' || t.startsWith('<<'));
    const script = !inline && args[0] ? baseName(args[0]) : '';
    summary = script ? `${program} ${script}` : `${program} script`;
  } else {
    // Any other program: just its name. Its first non-flag word is as likely a flag's
    // value or a search pattern (`curl -o /dev/null`, `grep foo`) as a target.
    summary = program;
  }
  return middleEllipsis(summary, maxLength);
}
