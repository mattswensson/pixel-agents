/**
 * Idle agents head for the break room: when an agent has nothing to do it
 * walks to a free seat inside the BREAK_AREA_LABEL Area and sits until work
 * resumes, then returns to its desk. OfficeState domain-model test (no catalog
 * needed: seats are injected), like greeter/teammateSeating.
 *
 * Run with: npm test
 */

import assert from 'node:assert/strict';

import { test } from 'vitest';

import { BREAK_AREA_LABEL } from '../src/constants.js';
import { OfficeState } from '../src/office/engine/officeState.js';
import type { OfficeLayout, Seat } from '../src/office/types.js';
import { CharacterState, Direction, TileType } from '../src/office/types.js';

// Area colour is irrelevant to seating; a placeholder keeps the colour-literal lint rule happy.
const AREA_TEST_COLOR = String.fromCharCode(35) + 'ffffff';
const COLS = 12;
const ROWS = 4;

function seat(uid: string, col: number, row: number): Seat {
  return { uid, seatCol: col, seatRow: row, facingDir: Direction.DOWN, assigned: false };
}

/** Open floor; columns 8+ are the break room. Three desks (cols 1-3), two lounge seats. */
function office(): OfficeState {
  const areaTiles: Array<string | null> = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) areaTiles.push(c >= 8 ? BREAK_AREA_LABEL : null);
  const layout: OfficeLayout = {
    version: 1,
    cols: COLS,
    rows: ROWS,
    tiles: new Array<TileType>(COLS * ROWS).fill(TileType.FLOOR_1),
    furniture: [],
    areas: [{ label: BREAK_AREA_LABEL, color: AREA_TEST_COLOR }],
    areaTiles,
  };
  const os = new OfficeState(layout);
  os.seats = new Map([
    ['desk-a', seat('desk-a', 1, 1)],
    ['desk-b', seat('desk-b', 2, 1)],
    ['desk-c', seat('desk-c', 3, 1)],
    ['sofa-a', seat('sofa-a', 9, 1)],
    ['sofa-b', seat('sofa-b', 10, 1)],
  ]);
  return os;
}

function run(os: OfficeState, seconds: number): void {
  for (let i = 0; i < seconds * 4; i++) os.update(0.25);
}

test('lounge seats are exactly the seats inside the break-room Area', () => {
  assert.deepEqual(office().getLoungeSeatIds().sort(), ['sofa-a', 'sofa-b']);
});

test('an idle agent walks to a break-room seat and sits; work sends it back to its desk', () => {
  const os = office();
  os.addAgent(1, undefined, undefined, 'desk-a', true);
  const ch = os.getCharacters().find((c) => c.id === 1)!;
  os.setAgentActive(1, true);
  run(os, 5);
  assert.equal(ch.state, CharacterState.TYPE, 'working at the desk');

  os.setAgentActive(1, false);
  run(os, 120);
  const lounge = os.seats.get(ch.loungeSeatId!)!;
  assert.ok(lounge, 'claimed a lounge seat');
  assert.equal(lounge.assigned, true, 'the seat is held');
  assert.deepEqual([ch.tileCol, ch.tileRow], [lounge.seatCol, lounge.seatRow]);
  assert.equal(ch.state, CharacterState.TYPE, 'sitting there');
  assert.ok(ch.tileCol >= 8, 'in the break room');

  os.setAgentActive(1, true);
  run(os, 60);
  const desk = os.seats.get('desk-a')!;
  assert.deepEqual([ch.tileCol, ch.tileRow], [desk.seatCol, desk.seatRow], 'back at the desk');
  assert.equal(lounge.assigned, false, 'lounge seat released');
  assert.equal(ch.loungeSeatId ?? null, null);
});

test('two idle agents take different lounge seats; a third finds none and just wanders', () => {
  const os = office();
  for (const id of [1, 2, 3]) os.addAgent(id, undefined, undefined, undefined, true);
  for (const id of [1, 2, 3]) os.setAgentActive(id, false);
  run(os, 200);
  const held = os
    .getCharacters()
    .map((c) => c.loungeSeatId)
    .filter(Boolean);
  assert.equal(new Set(held).size, 2, 'both seats taken, once each');
  assert.equal(held.length, 2, 'the third agent holds none');
});

test('removing a sitting agent frees its lounge seat', () => {
  const os = office();
  os.addAgent(1, undefined, undefined, undefined, true);
  os.setAgentActive(1, false);
  run(os, 120);
  const ch = os.getCharacters().find((c) => c.id === 1)!;
  const held = ch.loungeSeatId!;
  assert.ok(held);
  os.removeAgent(1);
  assert.equal(os.seats.get(held)!.assigned, false);
});
