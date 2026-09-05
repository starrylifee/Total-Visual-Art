import test from 'node:test';
import assert from 'node:assert/strict';
import { worldConfigs } from './worldConfigs.js';
import { spawnCharacter, stepCharacter, EXPLORE_BOUNDS, waterFloor, isSwimming } from './platformPhysics.js';
import { Scene, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { createSurfaceSampler } from './platformSurfaces.js';
import { slideLayouts, slideGeometry, slideSamples, slideFlowAt } from './slideLayout.js';

test('both slide meshes provide a continuous downhill ride to water', () => {
  for (const layout of slideLayouts) {
    const scene=new Scene(); const mesh=new Mesh(slideGeometry(layout),new MeshBasicMaterial({side:2})); mesh.userData.walkable=true; scene.add(mesh);
    const sample=createSurfaceSampler(scene), c=worldConfigs.happyWaterpark;
    const start=slideSamples(layout)[2].center;
    let p=spawnCharacter({x:start.x,z:start.z,height:start.y+0.2});
    for(let i=0;i<1500;i++) {const flow=slideFlowAt(p); p=stepCharacter(p,flow.x/60,flow.z/60,1/60,false,sample,c.bounds,c.floorAt);}
    assert.ok(p.z>layout.points.at(-1)[2]-1, `slide ${layout.key} stuck ${p.z}`);
    mesh.geometry.dispose();mesh.material.dispose();
  }
});

test('slide flow does not drag swimmers or airborne jumpers', () => {
  assert.deepEqual(slideFlowAt({x:-3,z:-9,height:-0.85,jumpsUsed:0,velocity:0}),{x:0,z:0});
  assert.deepEqual(slideFlowAt({x:-3,z:-9,height:6,jumpsUsed:1,velocity:2}),{x:0,z:0});
});

test('waterpark foreground swims, rear lawn stays dry, central shoreline is reversible', () => {
  const c = worldConfigs.waterparkDay;
  let p = spawnCharacter(c.spawn);
  assert.equal(c.isSwimming(p), true);
  for (let i = 0; i < 340; i++) p = stepCharacter(p, 0, -0.05, 1 / 60, false, () => [], c.bounds, c.floorAt);
  assert.ok(p.z < -1);
  assert.equal(p.height, 0);
  assert.equal(c.isSwimming(p), false);
  for (let i = 0; i < 160; i++) p = stepCharacter(p, 0, 0.05, 1 / 60, false, () => [], c.bounds, c.floorAt);
  assert.equal(p.height, -0.85);
  assert.equal(c.isSwimming(p), true);
});

test('waterpark actual shallow stair meshes lead from water to mattress', () => {
  const scene = new Scene(), c = worldConfigs.waterparkDay;
  const add = (x, y, z, size) => { const m = new Mesh(new BoxGeometry(...size), new MeshBasicMaterial()); m.position.set(x, y, z); m.userData.walkable = true; scene.add(m); };
  add(-10, 0.08, 10, [3.3, 0.35, 6]);
  for (let i = 0; i < 8; i++) add(-10, -0.775 + i * 0.15, 16 - i * 0.45, [0.95, 0.15, 0.49]);
  const sample = createSurfaceSampler(scene);
  let p = spawnCharacter({ x: -10, z: 16.6, height: -0.85 });
  for (let i = 0; i < 105; i++) p = stepCharacter(p, 0, -0.05, 1 / 60, false, sample, c.bounds, c.floorAt);
  assert.ok(p.z < 12, `stuck at ${p.z}`);
  assert.ok(Math.abs(p.height - 0.255) < 0.01);
  assert.equal(c.isSwimming(p), false);
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
});

test('pool dive lands in water and shallow end returns to dry deck', () => {
  const c = worldConfigs.divingPool;
  assert.equal(c.isSwimming(spawnCharacter(c.spawn)), false);
  let p = spawnCharacter({ x: -6, z: 5, height: 0.86 });
  for (let i = 0; i < 180; i++) p = stepCharacter(p, 0.03, 0, 1 / 60, i === 0, () => [], c.bounds, c.floorAt);
  assert.equal(c.isSwimming(p), true);
  for (let i = 0; i < 190; i++) p = stepCharacter(p, 0, 0.05, 1 / 60, false, () => [], c.bounds, c.floorAt);
  assert.ok(p.z > 12);
  assert.equal(p.height, 0);
  assert.equal(c.isSwimming(p), false);
  assert.equal(c.floorAt(-11, 5), 0);
});

test('actual pool starting-block meshes can be climbed from side steps', () => {
  const scene = new Scene();
  const add = (x, y, sx, sy, sz) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), new MeshBasicMaterial());
    mesh.position.set(x, y, 5); mesh.userData.walkable = true; scene.add(mesh);
  };
  add(-8.6, 0.36, 2.6, 0.72, 2.5);
  add(-8.5, 0.79, 3.2, 0.14, 2.8);
  for (let i = 0; i < 5; i++) add(-11.7 + i * 0.42, (i + 1) * 0.14 - 0.07, 0.46, 0.14, 1.5);
  const sample = createSurfaceSampler(scene), c = worldConfigs.divingPool;
  let p = spawnCharacter({ x: -12.5, z: 5, height: 0 });
  for (let i = 0; i < 90; i++) p = stepCharacter(p, 0.05, 0, 1 / 60, false, sample, c.bounds, c.floorAt);
  assert.ok(p.x > -9, `stuck at ${p.x}`);
  assert.ok(Math.abs(p.height - 0.86) < 0.01);
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
});

test('first beach preserves its terrain, bounds and spawn', () => {
  const c = worldConfigs.beach;
  assert.deepEqual(c.bounds, EXPLORE_BOUNDS);
  assert.deepEqual(spawnCharacter(c.spawn), spawnCharacter());
  for (const z of [-30, -10, -9, 0, 12]) {
    assert.equal(c.floorAt(0, z), waterFloor(z));
    assert.equal(c.isSwimming({ z, height: -0.85 }), isSwimming({ z, height: -0.85 }));
  }
});

test('sea day starts swimming and stays afloat across its whole water area', () => {
  const c = worldConfigs.seaDay;
  let p = spawnCharacter(c.spawn);
  assert.equal(c.isSwimming(p), true);
  for (let i = 0; i < 240; i++) p = stepCharacter(p, 0, -0.08, 1 / 60, false, () => [], c.bounds, c.floorAt);
  assert.equal(p.height, -0.85);
  assert.ok(p.z < -10);
  assert.equal(c.isSwimming(p), true);
});

test('sea day access stair allows swimming to platform and back', () => {
  const c = worldConfigs.seaDay;
  const columns = (x, z) => {
    const spans = [];
    for (let i = 0; i < 7; i++) {
      if (Math.abs(x - 7) < 1.1 && Math.abs(z - (1 - i * 0.7)) <= 0.38) spans.push({ bottom: -0.85 + i * 0.15, top: -0.7 + i * 0.15 });
    }
    if (z < -3.3 && z > -6.7) spans.push({ bottom: -0.35, top: 0.24 });
    return spans;
  };
  let p = spawnCharacter({ x: 7, z: 2, height: -0.85 });
  for (let i = 0; i < 140; i++) p = stepCharacter(p, 0, -0.05, 1 / 60, false, columns, c.bounds, c.floorAt);
  assert.ok(p.z < -4);
  assert.ok(p.height > 0);
  assert.equal(c.isSwimming(p), false);
  for (let i = 0; i < 170; i++) p = stepCharacter(p, 0, 0.05, 1 / 60, false, columns, c.bounds, c.floorAt);
  assert.equal(c.isSwimming(p), true);
  assert.equal(p.height, -0.85);
});
