import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { worldCatalog } from './worldCatalog.js';
import { worldConfigs } from './worldConfigs.js';
import { Scene, Mesh, BoxGeometry, ConeGeometry, MeshBasicMaterial } from 'three';
import { createSurfaceSampler } from './platformSurfaces.js';
import { spawnCharacter, stepCharacter } from './platformPhysics.js';

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

test('all 20 catalog entries have unique playable scenes and original images', () => {
  assert.equal(worldCatalog.length, 20);
  assert.equal(new Set(worldCatalog.map(world => world.id)).size, 20);
  assert.equal(new Set(worldCatalog.map(world => world.scene)).size, 20);
  for (const world of worldCatalog) {
    assert.equal(world.status, 'prototype', `${world.id} has an unexpected review status`);
    assert.ok(worldConfigs[world.scene], `${world.id} has no config`);
    assert.ok(existsSync(resolve(`public/student-worlds/${world.id}/start.jpg`)), `${world.id} has no public start.jpg`);
  }
});

test('every spawn and story-map destination is inside its playable boundary', () => {
  for (const world of worldCatalog) {
    const config = worldConfigs[world.scene], { minX, maxX, minZ, maxZ } = config.bounds;
    assert.ok(config.spawn.x >= minX+.32 && config.spawn.x <= maxX-.32 && config.spawn.z >= minZ+.32 && config.spawn.z <= maxZ-.32, `${world.id} spawn outside avatar-safe bounds`);
    assert.ok(config.map.length > 0, `${world.id} has no story destination`);
    for (const point of config.map) assert.ok(point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ, `${world.id} ${point.label} outside bounds`);
  }
});

test('public start images are byte-identical to the 20 source start.jpg files', { skip: !process.env.STUDENT_DRAWINGS_SOURCE_ROOT }, () => {
  const sourceRoot = process.env.STUDENT_DRAWINGS_SOURCE_ROOT;
  for (const world of worldCatalog) {
    const source = resolve(sourceRoot, world.sourceFolder, 'start.jpg');
    const publicCopy = resolve(`public/student-worlds/${world.id}/start.jpg`);
    assert.ok(existsSync(source), `${world.id} source start.jpg missing`);
    assert.equal(digest(publicCopy), digest(source), `${world.id} public copy differs from source`);
  }
});

test('moon world starts on its curved surface and can walk across it', () => {
  const config = worldConfigs.moonCrater;
  assert.equal(config.spawn.height, config.floorAt(config.spawn.x, config.spawn.z));
  assert.ok(config.floorAt(0, 0) > config.floorAt(0, 13));
});

test('dessert cafe rear stair reaches the top of the giant ice mound', () => {
  const scene = new Scene(), material = new MeshBasicMaterial();
  const add = (geometry, position, scale) => { const mesh = new Mesh(geometry, material); mesh.position.set(...position); mesh.scale.set(...scale); mesh.userData.walkable = true; scene.add(mesh); };
  add(new ConeGeometry(1, 1, 24), [0, 4.1, -4], [4.8, 5.5, 4.8]);
  const ramp = new Mesh(new BoxGeometry(), material); ramp.position.set(0, 3.45, 1.5); ramp.scale.set(1.2, .16, 13.1); ramp.rotation.x = .565; ramp.userData.walkable = true; scene.add(ramp);
  const sample = createSurfaceSampler(scene), config = worldConfigs.dessertCafe;
  let player = spawnCharacter({ x: 0, z: 7, height: 0 });
  let maxHeight = 0;
  for (let i = 0; i < 420; i++) { player = stepCharacter(player, 0, -.03, 1 / 60, false, sample, config.bounds, config.floorAt); maxHeight = Math.max(maxHeight, player.height); }
  assert.ok(player.z < -3, `stair stopped at z=${player.z}`);
  assert.ok(maxHeight > 6.5, `stair stopped at height=${maxHeight}`);
  scene.traverse(object => { if (object.isMesh) object.geometry.dispose(); }); material.dispose();
});

test('waterpark-pool stairs rise from water to all three story platforms', () => {
  const config = worldConfigs.waterparkPool;
  const routes = [
    { count:46, x:-12.5, startZ:2, dz:-(9.2/45), platform:[-12.5,6,-9,4,.25,3], min:6 },
    { count:36, x:0, startZ:2, dz:-(7.8/35), platform:[-2,1.8,-8,5,3.6,4], min:4.5 },
    { count:39, x:13.2, startZ:10, dz:-(14.95/38), platform:[11.5,4.9,-6.5,5,.22,2.5], min:4.9 },
  ];
  for (const route of routes) {
    const scene = new Scene(), material = new MeshBasicMaterial();
    for (let i=0;i<route.count;i++) {
      const mesh = new Mesh(new BoxGeometry(), material); mesh.position.set(route.x,-.775+i*.15,route.startZ+i*route.dz); mesh.scale.set(1.7,.15,Math.abs(route.dz)+.06); mesh.userData.walkable=true; scene.add(mesh);
    }
    const [x,y,z,sx,sy,sz]=route.platform, platform=new Mesh(new BoxGeometry(),material); platform.position.set(x,y,z);platform.scale.set(sx,sy,sz);platform.userData.walkable=true;scene.add(platform);
    const sample=createSurfaceSampler(scene); let player=spawnCharacter({x:route.x,z:route.startZ+.25,height:config.floorAt(route.x,route.startZ+.25)}), max=-10;
    for(let i=0;i<700;i++){player=stepCharacter(player,0,-.025,1/60,false,sample,config.bounds,config.floorAt);max=Math.max(max,player.height);}
    assert.ok(max>=route.min, `route x=${route.x} stopped at height=${max}, z=${player.z}`);
    scene.traverse(object=>{if(object.isMesh)object.geometry.dispose();});material.dispose();
  }
});

test('aquarium dock stairs connect continuously onto the main boat', () => {
  const scene=new Scene(), material=new MeshBasicMaterial(), config=worldConfigs.aquarium;
  for(let i=0;i<8;i++){const mesh=new Mesh(new BoxGeometry(),material);mesh.position.set(-3.2,(i+1)*.15-.075,-4.7+i*.62);mesh.scale.set(1.7,.15,.7);mesh.userData.walkable=true;scene.add(mesh);}
  for(const [position,scale] of [[[-3.2,.95,.35],[1.7,.18,2]],[[-3,.45,3.8],[8,.45,3.7]],[[-3,.72,3.8],[7.3,.24,3.15]],[[-3,.91,3.8],[6.8,.18,2.65]]]){const mesh=new Mesh(new BoxGeometry(),material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.userData.walkable=true;scene.add(mesh);}
  const sample=createSurfaceSampler(scene);let player=spawnCharacter({x:-3.2,z:-5.2,height:0}),max=0;
  for(let i=0;i<420;i++){player=stepCharacter(player,0,.025,1/60,false,sample,config.bounds,config.floorAt);max=Math.max(max,player.height);}
  assert.ok(player.z>1,`boat route stopped at z=${player.z}`);assert.ok(max>.9,`boat route stopped at height=${max}`);
  scene.traverse(object=>{if(object.isMesh)object.geometry.dispose();});material.dispose();
});

test('city avatar can double-jump from road to taxi body, cabin and roof sign', () => {
  const scene=new Scene(),material=new MeshBasicMaterial(),config=worldConfigs.movingCity;
  for(const [position,scale] of [[[0,1.8,-3],[14,3.1,6]],[[-1,3.8,-3],[7,1.4,5.4]],[[-1,5,-3],[3,.45,1.5]]]){const mesh=new Mesh(new BoxGeometry(),material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.userData.walkable=true;scene.add(mesh);}
  const sample=createSurfaceSampler(scene);
  let player=spawnCharacter({x:5,z:1,height:0}),max=0;
  for(let i=0;i<150;i++){const dz=player.z>-.8?-.045:0;player=stepCharacter(player,0,dz,1/60,i===0||i===16,sample,config.bounds,config.floorAt);max=Math.max(max,player.height);}assert.ok(max>3.35&&Math.abs(player.height-3.35)<.02,`taxi body not reached: max=${max}, landed=${player.height}`);
  player=spawnCharacter({x:5,z:-3,height:3.35});max=player.height;
  for(let i=0;i<150;i++){const dx=player.x>1.5?-.05:0;player=stepCharacter(player,dx,0,1/60,i===0||i===16,sample,config.bounds,config.floorAt);max=Math.max(max,player.height);}assert.ok(max>4.5&&Math.abs(player.height-4.5)<.02,`taxi cabin not reached: max=${max}, landed=${player.height}`);
  player=spawnCharacter({x:1.5,z:-3,height:4.5});max=player.height;
  for(let i=0;i<130;i++){const dx=player.x>0?-.035:0;player=stepCharacter(player,dx,0,1/60,i===0,sample,config.bounds,config.floorAt);max=Math.max(max,player.height);}assert.ok(max>5.2&&Math.abs(player.height-5.225)<.03,`taxi sign not reached: max=${max}, landed=${player.height}`);
  scene.traverse(object=>{if(object.isMesh)object.geometry.dispose();});material.dispose();
});

test('dabotap front stairs stay outside the base and upper tiers fit double jump', () => {
  const scale=.56, groupZ=-7;
  const stairEnds=Array.from({length:18},(_,i)=>({z:groupZ+(12-i*.88)*scale,top:((i+1)*.18)*scale}));
  for(const [depth,top] of [[12,.7],[10.5,1.4],[9,2.1]]){const front=groupZ+(-7+depth/2)*scale;const crossing=stairEnds.find(step=>step.z<=front);assert.ok(crossing.top>=top*scale,`stair is too low at base front ${front}`);}
  const platformFront=groupZ+(-7+7.2/2)*scale;
  assert.ok(stairEnds.at(-1).z>platformFront,`last stair ${stairEnds.at(-1).z} enters platform front ${platformFront}`);
  assert.ok(stairEnds.at(-1).top>1.8);
  const tierTops=[3.775,8.075,10.525,11.125,13.5,14.375,15.125,15.825].map(value=>value*scale);
  let player=spawnCharacter({x:0,z:0,height:0});let max=0;
  for(let i=0;i<180;i++){player=stepCharacter(player,0,0,1/60,i===0||i===16,()=>[],{minX:-2,maxX:2,minZ:-2,maxZ:2},()=>0);max=Math.max(max,player.height);}
  const reach=max;
  for(let i=1;i<tierTops.length;i++) assert.ok(tierTops[i]-tierTops[i-1]<reach,`tier gap ${i} exceeds double jump`);
});
