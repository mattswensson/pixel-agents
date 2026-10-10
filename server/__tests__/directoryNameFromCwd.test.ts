import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

import { directoryNameFromCwd, directoryNameFromProjectHash } from '../src/hostDirectory.js';

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

describe('directoryNameFromProjectHash', () => {
  it('recovers a hyphenated repo name from a plain project folder', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-hash-'));
    try {
      fs.mkdirSync(path.join(root, 'code', 'blender-add-ons'), { recursive: true });
      const hash = `${root.replace(/[/.]/g, '-')}-code-blender-add-ons`;
      expect(directoryNameFromProjectHash(hash)).toBe('blender-add-ons');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('recovers a hyphenated repo name from a worktree project folder', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pa-hash-'));
    try {
      fs.mkdirSync(path.join(root, 'code', 'pixel-agents'), { recursive: true });
      const hash = `${root.replace(/[/.]/g, '-')}-code-pixel-agents--claude-worktrees-bridge-cse-01E7`;
      expect(directoryNameFromProjectHash(hash)).toBe('pixel-agents');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('is undefined for a non-worktree folder or a repo that is gone', () => {
    expect(directoryNameFromProjectHash('-nowhere-code-planet8')).toBeUndefined();
    expect(
      directoryNameFromProjectHash('-nowhere-at-all--claude-worktrees-bridge-cse-01E7'),
    ).toBeUndefined();
  });
});
