import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, BoxGeometry, TorusGeometry, MeshBasicMaterial } from 'three';
import { spawnCharacter, stepCharacter, isSwimming, EXPLORE_BOUNDS } from './platformPhysics.js';
import { createSurfaceSampler } from './platformSurfaces.js';
const empty = () => [];
const tick = (p, jump = false, sample = empty, dx = 0) => stepCharacter(p, dx, 0, 1 / 60, jump, sample);

test('walks into water, floats, returns to sand without getting stuck at shoreline', () => {
  const sand = (x, z) => z > -8.5 ? [{ bottom: -0.65, top: -0.05 }] : [];
  let p = { ...spawnCharacter(), z: -7 };
  for (let i = 0; i < 150; i++) p = stepCharacter(p, 0, -0.04, 1 / 60, false, sand);
  assert.ok(isSwimming(p)); assert.ok(Math.abs(p.height + 0.85) < 1e-6);
  for (let i = 0; i < 180; i++) p = stepCharacter(p, 0, 0.04, 1 / 60, false, sand);
  assert.ok(p.z > -7); assert.equal(isSwimming(p), false); assert.equal(p.height, 0);
});
test('water entry after a jump lands afloat and distant sea remains bounded', () => {
  let p = { ...spawnCharacter(), z: -12, height: 3, velocity: -1, jumpsUsed: 2 };
  for (let i = 0; i < 180; i++) p = tick(p);
  assert.ok(isSwimming(p));
  for (let i = 0; i < 500; i++) p = stepCharacter(p, 0, -0.1, 1 / 60, false, empty);
  assert.ok(p.z >= EXPLORE_BOUNDS.minZ + 0.32);
  assert.ok(Number.isFinite(p.height));
});

test('two jumps allowed, third rejected, landing replenishes both', () => {
  let p = tick(spawnCharacter(), true);
  for (let i = 0; i < 30; i++) p = tick(p);
  p = tick(p, true);
  assert.equal(p.jumpsUsed, 2);
  assert.deepEqual(tick(p, true), tick(p, false));
  for (let i = 0; i < 180; i++) p = tick(p);
  assert.equal(p.height, 0); assert.equal(p.jumpsUsed, 0);
  assert.ok(tick(p, true).velocity > 0);
});
test('lands on raised surface and falls when walking off its edge', () => {
  const box = x => Math.abs(x) < 1 ? [{ bottom: 0, top: 1.2 }] : [];
  let p = { ...spawnCharacter(), height: 3, velocity: -1, jumpsUsed: 2 };
  for (let i = 0; i < 60; i++) p = tick(p, false, box);
  assert.equal(p.height, 1.2); assert.equal(p.jumpsUsed, 0);
  for (let i = 0; i < 80; i++) p = tick(p, false, box, 0.04);
  assert.equal(p.height, 0);
});
test('cannot enter solid sides, can jump onto a box from the side', () => {
  const box = x => x >= 1 && x <= 2 ? [{ bottom: 0, top: 1.2 }] : [];
  let p = spawnCharacter();
  for (let i = 0; i < 60; i++) p = tick(p, false, box, 0.03);
  assert.ok(p.x < 1);
  p = tick(p, true, box);
  for (let i = 0; i < 25; i++) p = tick(p, false, box, 0.025);
  for (let i = 0; i < 100; i++) p = tick(p, false, box);
  assert.ok(p.x >= 1 && p.x <= 2); assert.equal(p.height, 1.2);
});
test('overhead surfaces stop the head, double jump can reach parasol height', () => {
  const roof = () => [{ bottom: 3.6, top: 4.8 }];
  let p = tick(spawnCharacter(), true, roof);
  for (let i = 0; i < 20; i++) { p = tick(p, false, roof); assert.ok(p.height <= 3.6 - 1.78 + 1e-6); }
  p = tick(spawnCharacter(), true); let peak = 0;
  for (let i = 0; i < 100; i++) { p = tick(p, i === 31); peak = Math.max(peak, p.height); }
  assert.ok(peak > 4.8);
});
test('mesh sampler uses real box top and torus hole instead of a filled cylinder', () => {
  const scene = new Scene();
  const box = new Mesh(new BoxGeometry(4, 1.2, 2), new MeshBasicMaterial());
  box.position.set(-8, 0.6, 5); box.userData.walkable = true; scene.add(box);
  const ring = new Mesh(new TorusGeometry(1.14, 0.38, 16, 48), new MeshBasicMaterial());
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.45, 0); ring.userData.walkable = true; scene.add(ring);
  const sample = createSurfaceSampler(scene);
  assert.ok(Math.abs(Math.max(...sample(-8, 5).map(s => s.top)) - 1.2) < 1e-6);
  assert.equal(sample(0, 0).length, 0);
  assert.ok(Math.max(...sample(1.14, 0).map(s => s.top)) > 0.8);
  box.geometry.dispose(); box.material.dispose(); ring.geometry.dispose(); ring.material.dispose();
});
