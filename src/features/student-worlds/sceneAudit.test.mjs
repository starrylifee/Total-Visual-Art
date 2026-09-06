import test from 'node:test';
import assert from 'node:assert/strict';
import { worldCatalog } from './worldCatalog.js';
import { worldConfigs } from './worldConfigs.js';
import { spawnCharacter, stepCharacter } from './platformPhysics.js';
import { sampler } from './sceneAuditHarness.mjs';
function walk(key, spawn, dx, dz, frames, jumpFrames=[]){const c=worldConfigs[key],sample=sampler(key);let p=spawnCharacter(spawn);for(let i=0;i<frames;i++)p=stepCharacter(p,dx,dz,1/60,jumpFrames.includes(i),sample,c.bounds,c.floorAt);return p;}

test('all 20 actual scenes construct collision geometry and support their spawns',()=>{
  for(const world of worldCatalog){const c=worldConfigs[world.scene];const p=walk(world.scene,c.spawn,0,0,120);assert.ok(Number.isFinite(p.height),world.id);assert.ok(Math.abs(p.height-c.spawn.height)<.2,`${world.id} spawn unexpectedly falls/rises: ${p.height}`);}
});

test('aquarium actual water floor permits swimming into deep water and returning to dock',()=>{
  const p=walk('aquarium',{x:2,z:-9,height:0},0,.04,320);
  assert.ok(p.z>3,`blocked at ${p.z}, height=${p.height}`);
  assert.ok(worldConfigs.aquarium.isSwimming(p),`walking on water at ${p.height}`);
  const back=walk('aquarium',p,0,-.04,320);
  assert.ok(back.z<-6&&back.height>=0,`dock return blocked at ${back.z}`);
});

test('waterpark-pool actual shore permits swimming through the visible pool to land',()=>{
  const p=walk('waterparkPool',{x:-3.8,z:5,height:-.85},0,-.03,240);
  assert.ok(p.z<-2,`invisible shore wall at ${p.z}, height=${p.height}`);
  const back=walk('waterparkPool',p,0,.03,240);
  assert.ok(back.z>4&&worldConfigs.waterparkPool.isSwimming(back),'return to water failed');
});

test('waterpark-day actual segmented tube can be escaped from its hole with water jumps',()=>{
  const p=walk('waterparkDay',{x:8,z:11,height:-.85},.035,0,150,[0,16]);
  assert.ok(p.x>10.4,`tube traps avatar at ${p.x}, height=${p.height}`);
  assert.ok(worldConfigs.waterparkDay.isSwimming(p));
});

test('all seven actual water scenes support swimming and a second jump followed by re-entry',()=>{
  const points={beach:[12,-17],seaDay:[0,-8],divingPool:[3,0],waterparkDay:[2,10],happyWaterpark:[0,12],waterparkPool:[-15,15],aquarium:[2,8]};
  for(const [key,[x,z]] of Object.entries(points)){
    const c=worldConfigs[key],sample=sampler(key);
    let p=walk(key,{x,z,height:c.floorAt(x,z)},0,0,90);
    assert.ok(c.isSwimming(p),`${key} falsely standing in water: ${p.height}`);
    let high=p.height;
    for(let i=0;i<180;i++){p=stepCharacter(p,0,0,1/60,i===0||i===16,sample,c.bounds,c.floorAt);high=Math.max(high,p.height);}
    assert.ok(high>2,`${key} cannot water-jump high enough: ${high}`);
    assert.ok(c.isSwimming(p)&&p.jumpsUsed===0,`${key} fails re-entry`);
  }
});

test('remaining actual shores allow intended return routes without invisible water walls',()=>{
  const routes=[['beach',{x:12,z:-14,height:-.85},0,.04,230],['divingPool',{x:3,z:7,height:-.85},0,.04,175],['waterparkDay',{x:0,z:4,height:-.85},0,-.04,175],['happyWaterpark',{x:0,z:2,height:-.85},0,-.04,175]];
  for(const [key,start,dx,dz,frames] of routes){const p=walk(key,start,dx,dz,frames);assert.ok(p.height>=-.05&&!worldConfigs[key].isSwimming(p),`${key} shore blocked ${p.z}/${p.height}`);const back=walk(key,p,-dx,-dz,frames);assert.ok(worldConfigs[key].isSwimming(back),`${key} re-entry blocked`);}
});

test('waterpark-pool actual three stair routes reach their platform height',()=>{
  for(const [x,z,height] of [[-12.5,2.25,6],[0,2.25,4.6],[13.2,10.25,4.9]]){
    const c=worldConfigs.waterparkPool,sample=sampler('waterparkPool');let p=spawnCharacter({x,z,height:c.floorAt(x,z)}),max=p.height;
    for(let i=0;i<700;i++){p=stepCharacter(p,0,-.025,1/60,false,sample,c.bounds,c.floorAt);max=Math.max(max,p.height);}
    assert.ok(max>=height,`stairs x=${x}: stopped ${p.z}/${p.height}, highest=${max}`);
  }
});

test('dessert actual access ramps climb both ice mounds',()=>{
  for(const x of [-5.8,5.8]){
    const c=worldConfigs.dessertCafe,sample=sampler('dessertCafe');let p=spawnCharacter({x,z:8,height:0}),max=0;
    for(let i=0;i<700;i++){p=stepCharacter(p,0,-.025,1/60,false,sample,c.bounds,c.floorAt);max=Math.max(max,p.height);}
    assert.ok(max>6.5,`dessert x=${x} blocked at ${p.z}/${p.height}, highest=${max}`);
  }
});

test('castle front stair reaches the castle itself and returns to water without jumping',()=>{
  const up=walk('waterparkPool',{x:0,z:3,height:-.85},0,-.025,450);
  assert.ok(up.z<-7.5&&up.height>=4.5,`castle not reached: ${up.z}/${up.height}`);
  const back=walk('waterparkPool',up,0,.025,460);
  assert.ok(back.z>2.5&&worldConfigs.waterparkPool.isSwimming(back),`castle return failed: ${back.z}/${back.height}`);
});

test('actual aquarium gangway crosses the water gap and rail in both directions without jumping',()=>{
  for(const x of [-3.3,-3.2,-3.1]){
    const up=walk('aquarium',{x,z:-9,height:0},0,.04,330);
    assert.ok(up.z>4&&up.height>=1,`boat approach blocked: ${JSON.stringify(up)}`);
    const back=walk('aquarium',up,0,-.04,330);
    assert.ok(back.z<-8.5&&back.height>=0&&!worldConfigs.aquarium.isSwimming(back),`boat return blocked: ${JSON.stringify(back)}`);
  }
});
