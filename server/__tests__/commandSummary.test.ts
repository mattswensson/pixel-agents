import { describe, expect, it } from 'vitest';

import {
  middleEllipsis,
  summarizeBashCommand,
} from '../src/providers/hook/claude/commandSummary.js';

describe('summarizeBashCommand', () => {
  const cases: Array<[string, string]> = [
    ['git push -u origin main', 'git push'],
    ['npm test', 'npm test'],
    ['npm run package 2>&1 | grep -E "rror|built in"', 'npm run package'],
    ['cd /Users/me/code/pixel-agents && npm install', 'npm install'],
    ['cd /x && git status --short && git log --oneline -3', 'git status'],
    ['NODE_ENV=production node dist/cli.js --port 8080', 'node cli.js'],
    ["python3 - <<'E'\nimport json\nE", 'python3 script'],
    ['node -e "console.log(1)"', 'node script'],
    ['/opt/homebrew/bin/node /tmp/pa/shot.cjs', 'node shot.cjs'],
    ['eval "$(/opt/homebrew/bin/brew shellenv zsh)"; tmux kill-session -t pixel-agents', 'tmux kill-session'],
    ['grep -rn "foo" src', 'grep'],
    ['ls -la', 'ls'],
    ['sudo launchctl load x.plist', 'launchctl load'],
    ['tmux capture-pane -p -t pixel-agents | tail -5', 'tmux capture-pane'],
    ['curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/', 'curl'],
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input.slice(0, 48))} -> ${expected}`, () => {
      expect(summarizeBashCommand(input)).toBe(expected);
    });
  }

  it('falls back to a generic label when nothing describable is left', () => {
    expect(summarizeBashCommand('')).toBe('shell command');
    expect(summarizeBashCommand('cd /tmp')).toBe('shell command');
  });

  it('never exceeds the length cap', () => {
    const out = summarizeBashCommand('xcodebuild-with-an-extremely-long-program-name-here test', 20);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe('middleEllipsis', () => {
  it('leaves short names alone and keeps both ends of long ones', () => {
    expect(middleEllipsis('short.png', 20)).toBe('short.png');
    const out = middleEllipsis('a-very-long-file-name-indeed.png', 16);
    expect(out.length).toBe(16);
    expect(out.startsWith('a-very')).toBe(true);
    expect(out.endsWith('.png')).toBe(true);
    expect(out).toContain('…');
  });
});
