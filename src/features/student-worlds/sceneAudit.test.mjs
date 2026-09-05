// Integration audit: instantiate static collision geometry from the actual JSX scenes.
// Hooks/characters/line art/textures are stubbed; mesh dimensions, transforms and
// walkable/nonSolid flags come from production components, not copied test geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { worldCatalog } from './worldCatalog.js';
import { worldConfigs } from './worldConfigs.js';
import { spawnCharacter, stepCharacter } from './platformPhysics.js';
import { createSurfaceSampler } from './platformSurfaces.js';

const shims = {
  react: `export const createElement=(type,props,...children)=>({type,props:{...props,children}}); export const Fragment='group'; export const useMemo=f=>f(); export const useEffect=()=>{}; export const useRef=v=>({current:v}); export const useState=v=>[v,()=>{}]; export default {createElement,Fragment};`,
  '@react-three/fiber': 'export const useFrame=()=>{};',
  '@react-three/drei': 'export const Edges=()=>null; export const Line=()=>null;',
  Character: 'export default ()=>null;',
  materials: `import {Texture} from 'three'; export const pencilTexture=()=>new Texture(); export const signTexture=()=>new Texture();`,
};
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('./summerScenes.jsx', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['three'],
  plugins: [{ name: 'static-scene-audit', setup(b) {
    b.onResolve({filter:/^(react|@react-three\/fiber|@react-three\/drei)$|\/(Character|materials)$/}, args => ({path:args.path.split('/').at(-1)==='Character'?'Character':args.path.endsWith('/materials')?'materials':args.path,namespace:'audit'}));
    b.onLoad({filter:/.*/,namespace:'audit'}, args=>({contents:shims[args.path],loader:'js'}));
  }}],
});
const module = {exports:{}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const scenes = module.exports.default;
const canvasContext = new Proxy({}, {get:()=>()=>{},set:()=>true});
// Only the hand-drawn sign canvas needs a DOM stub, and it never affects collision.
const previousDocument = globalThis.document;
globalThis.document = {createElement:()=>({getContext:()=>canvasContext})};

function construct(element, parent) {
  if (!element || typeof element !== 'object') return;
  if (Array.isArray(element)) {element.forEach(e=>construct(e,parent));return;}
  const {type,props:p={}}=element;
  if(typeof type==='function'){construct(type(p),parent);return;}
  const name=typeof type==='string'?type:'';
  if(name.endsWith('Geometry')){const C=THREE[name[0].toUpperCase()+name.slice(1)];assert.ok(C,`Unsupported geometry ${name}`);parent.geometry=new C(...(p.args||[]));return;}
  if(name.endsWith('Material')){const C=THREE[name[0].toUpperCase()+name.slice(1)];parent.material=new C();return;}
  assert.ok(['group','mesh'].includes(name),`Unsupported scene element ${name}`);
  const object=name==='mesh'?new THREE.Mesh(p.geometry||new THREE.BufferGeometry(),p.material||new THREE.MeshBasicMaterial()):new THREE.Group();
  if(p.position)object.position.set(...p.position);
  if(p.rotation)object.rotation.set(...p.rotation);
  if(p.scale)typeof p.scale==='number'?object.scale.setScalar(p.scale):object.scale.set(...p.scale);
  object.userData=p.userData||{};parent.add(object);construct(p.children,object);
}
const fullScenes = new Map();
for(const world of worldCatalog){const scene=new THREE.Scene();construct({type:scenes[world.scene]},scene);fullScenes.set(world.scene,scene);}
globalThis.document=previousDocument;
const sampler = key=>createSurfaceSampler(fullScenes.get(key));
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
  for(const [x,z,height] of [[-12.5,2.25,6],[-6.3,-.75,3.5],[13.2,10.25,4.9]]){
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
