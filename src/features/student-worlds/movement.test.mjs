import test from 'node:test';
import assert from 'node:assert/strict';
import { movePlayer, isWalkable, movementVector, BEACH_BOUNDS, BEACH_COLLIDERS, BEACH_SPAWN } from './movement.js';
import { stepJump, clampPitch, DEFAULT_PITCH } from './movement.js';

test('jump rises, rejects an airborne re-jump, and lands exactly on the ground', () => {
  let state = stepJump({ height: 0, velocity: 0 }, 1 / 60, true);
  assert.ok(state.height > 0 && state.velocity > 0);
  assert.deepEqual(stepJump(state, 1 / 60, true), stepJump(state, 1 / 60, false));
  let peak = 0;
  for (let i = 0; i < 120; i++) { state = stepJump(state, 1 / 60); peak = Math.max(peak, state.height); }
  assert.ok(peak > 1 && peak < 1.3);
  assert.deepEqual(state, { height: 0, velocity: 0 });
  assert.ok(stepJump(state, 1 / 60, true).height > 0);
});
test('jump is frame-rate independent and pitch remains bounded', () => {
  const run = dt => { let s = { height: 0, velocity: 0 }; for (let i = 0; i < Math.round(0.5 / dt); i++) s = stepJump(s, dt, i === 0); return s; };
  assert.ok(Math.abs(run(1 / 30).height - run(1 / 120).height) < 1e-9);
  assert.equal(clampPitch(-100), -0.1); assert.equal(clampPitch(100), 1.05);
  assert.equal(clampPitch(DEFAULT_PITCH), DEFAULT_PITCH);
});

test('spawn is clear; shoreline and every outer boundary contain the player', () => {
  assert.equal(isWalkable(BEACH_SPAWN.x, BEACH_SPAWN.z, BEACH_BOUNDS, BEACH_COLLIDERS), true);
  for (const [dx, dz] of [[100, 0], [-100, 0], [0, 100], [0, -100]]) {
    const p = movePlayer(BEACH_SPAWN, dx, dz);
    assert.ok(isWalkable(p.x, p.z, BEACH_BOUNDS, BEACH_COLLIDERS));
    assert.ok(p.z >= -6.48 && p.z <= 14.68);
  }
});
test('cannot tunnel through shop or rings even with an oversized movement', () => {
  assert.ok(movePlayer({ x: -8, z: 10 }, 0, -20).z > 6.7);
  assert.ok(movePlayer({ x: -1.8, z: 8 }, 0, -20).z > 4.2);
});
test('slides beside a wall instead of sticking', () => {
  const p = movePlayer({ x: -8, z: 6.75 }, 1, -1);
  assert.ok(p.x > -7.1);
  assert.ok(p.z > 6.7);
});
test('diagonal speed equals forward speed and direction follows camera', () => {
  const p = movementVector(new Set(['forward', 'right']), 0, 3);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - 3) < 1e-9);
  const turned = movementVector(new Set(['forward']), Math.PI / 2, 3);
  assert.ok(Math.abs(turned.x + 3) < 1e-9);
  assert.ok(Math.abs(turned.z) < 1e-9);
});
