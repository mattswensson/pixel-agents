/**
 * The two texts an agent shows: the command line in the agent list
 * (getActivityText) and the one-word state over its character (getStatusWord).
 *
 * Run with: npm test
 */

import assert from 'node:assert/strict';

import { test } from 'vitest';

import { getActivityText, getStatusWord } from '../src/office/activityText.js';
import type { ToolActivity } from '../src/office/types.js';

function tool(status: string, extra: Partial<ToolActivity> = {}): ToolActivity {
  return { toolId: status, status, done: false, ...extra } as ToolActivity;
}

test('the list shows the latest unfinished tool', () => {
  const tools = { 1: [tool('git status', { done: true }), tool('npm run package')] };
  assert.equal(getActivityText(1, tools, true, null, false), 'npm run package');
});

test('between tools of an active turn it keeps the last one; otherwise it says Idle', () => {
  const tools = { 1: [tool('git push', { done: true })] };
  assert.equal(getActivityText(1, tools, true, null, false), 'git push');
  assert.equal(getActivityText(1, tools, false, null, false), 'Idle');
  assert.equal(getActivityText(2, {}, false, null, false), 'Idle');
});

test('a permission wait overrides everything in the list', () => {
  const tools = { 1: [tool('rm -rf x', { permissionWait: true })] };
  assert.equal(getActivityText(1, tools, true, null, false), 'Needs approval');
  assert.equal(getActivityText(1, {}, true, 'permission', false), 'Needs approval');
});

test('over a character: Active, Idle, Waiting, or Needs approval — never a command', () => {
  assert.equal(getStatusWord(true, null, false, false), 'Active');
  assert.equal(getStatusWord(false, null, false, false), 'Idle');
  assert.equal(getStatusWord(false, 'waiting', true, false), 'Waiting');
  assert.equal(getStatusWord(false, 'waiting', false, false), 'Idle', 'a finished turn is just idle');
  assert.equal(getStatusWord(true, 'permission', false, false), 'Needs approval');
  assert.equal(getStatusWord(true, null, false, true), 'Needs approval');
});
