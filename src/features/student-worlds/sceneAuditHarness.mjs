// Static collision geometry from production JSX. Rendering hooks and textures are stubbed.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { worldCatalog } from './worldCatalog.js';
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
try {
  for(const world of worldCatalog){const scene=new THREE.Scene();construct({type:scenes[world.scene]},scene);fullScenes.set(world.scene,scene);}
} finally {
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
}
const sampler = key=>createSurfaceSampler(fullScenes.get(key));
export { fullScenes, sampler };
