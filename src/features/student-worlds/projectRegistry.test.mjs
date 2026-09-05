import test from 'node:test';
import assert from 'node:assert/strict';
import { defineDrawingProject, defaultProject, getDrawingProject } from './projectRegistry.js';

test('old URLs and unknown projects retain the summer collection', () => {
  assert.equal(getDrawingProject(null), defaultProject);
  assert.equal(getDrawingProject('unknown'), defaultProject);
  assert.equal(getDrawingProject('summer-vacation'), defaultProject);
  assert.equal(defaultProject.worlds.length, 20);
  for (const world of defaultProject.worlds) assert.ok(defaultProject.scenes[world.scene]);
});

test('another project can reuse local world IDs without sharing scene/config state', () => {
  const worlds = [{ id: '08', title: '다른 그림', scene: 'garden' }];
  const configs = { garden: { spawn: { x: 0, z: 0, height: 0 }, bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, map: [], floorAt: () => 0, isSwimming: () => false } };
  let loads = 0;
  const project = defineDrawingProject({ id: 'garden-project', title: '우리 정원', worlds, configs, loadScenes: async () => { loads++; return { default: { garden: () => null } }; } });
  assert.equal(project.worlds, worlds);
  assert.equal(project.configs, configs);
  assert.ok(project.scenes.garden);
  assert.equal(loads, 0, 'unopened projects must not load scene bundles');
  assert.equal(defaultProject.scenes.garden, undefined);
});

test('project definitions reject missing config and duplicate world IDs', () => {
  const base = { id: 'new', title: '새 프로젝트', loadScenes: async () => ({ default: {} }) };
  assert.throws(() => defineDrawingProject({ ...base, worlds: [] }));
  assert.throws(() => defineDrawingProject({ ...base, worlds: [{ id: '01', scene: 'missing' }] }), /Missing world config/);
  assert.throws(() => defineDrawingProject({ ...base, worlds: [{ id: '01' }, { id: '01' }] }), /Duplicate/);
});
