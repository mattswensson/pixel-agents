/**
 * The standalone host's own Directory contribution.
 *
 * Every host contributes its native context as read-only `source: 'host'`
 * Directories: VS Code its workspace folders (adapters/vscode), standalone the
 * directory the server was started from. The entry is merged with the
 * user-defined ones by directories.ts, which is what stamps `source` and
 * `isDefault` — a host only says what and where.
 */

import * as fs from 'fs';
import * as path from 'path';

import type { HostDirectoryEntry } from './directories.js';

/** Display name for a Directory path: its basename, falling back to the path
 *  itself for a filesystem root (basename('/') === ''). */
export function directoryNameFor(dirPath: string): string {
  return path.basename(dirPath) || dirPath;
}

/** Directory name for an agent's working directory. A Claude Code worktree
 *  (`<repo>/.claude/worktrees/<session>`) belongs to the repo that owns it, so it
 *  is named after that repo, not after the throwaway worktree folder — Remote
 *  Control starts one worktree per session, named after the session id. */
export function directoryNameFromCwd(cwd: string | undefined): string | undefined {
  if (!cwd) return undefined;
  const marker = `${path.sep}.claude${path.sep}worktrees${path.sep}`;
  const at = cwd.indexOf(marker);
  if (at > 0) return directoryNameFor(cwd.slice(0, at));
  return directoryNameFor(cwd);
}

const WORKTREE_HASH_MARKER = '--claude-worktrees-';

/** The repo directory a worktree's Claude project folder belongs to, e.g.
 *  `-Users-me-code-pixel-agents--claude-worktrees-bridge-cse-01E7` -> pixel-agents.
 *  Claude flattens `/` (and `.`) to `-`, so the repo path is recovered by finding
 *  the split that exists on disk. Undefined for any other folder, or if the repo
 *  is gone. */
export function directoryNameFromWorktreeHash(hash: string): string | undefined {
  const at = hash.indexOf(WORKTREE_HASH_MARKER);
  if (at <= 0) return undefined;
  const tokens = hash.slice(0, at).replace(/^-+/, '').split('-');
  const walk = (base: string, i: number): string | undefined => {
    if (i === tokens.length) return base;
    for (let j = tokens.length; j > i; j--) {
      const next = path.join(base, tokens.slice(i, j).join('-'));
      if (fs.existsSync(next)) {
        const found = walk(next, j);
        if (found) return found;
      }
    }
    return undefined;
  };
  const repo = walk(path.sep, 0);
  return repo ? directoryNameFor(repo) : undefined;
}

/** The directory the standalone server was started from. */
export function hostDirectory(): HostDirectoryEntry {
  const cwd = process.cwd();
  return { name: directoryNameFor(cwd), path: cwd };
}
