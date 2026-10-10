import { describe, expect, it } from 'vitest';

import { directoryNameFromCwd } from '../src/hostDirectory.js';

describe('directoryNameFromCwd', () => {
  it('names an ordinary directory after its basename', () => {
    expect(directoryNameFromCwd('/Users/me/code/planet8')).toBe('planet8');
  });

  it('names a Claude worktree after the repo that owns it', () => {
    expect(
      directoryNameFromCwd('/Users/me/code/pixel-agents/.claude/worktrees/bridge-cse_01E7Esgn'),
    ).toBe('pixel-agents');
  });

  it('is undefined when there is no cwd', () => {
    expect(directoryNameFromCwd(undefined)).toBeUndefined();
  });
});
