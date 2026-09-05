import React,{useEffect,useMemo} from 'react';
import { Edges } from '@react-three/drei';
import { DoubleSide,MeshStandardMaterial } from 'three';
import Character from '../Character';
import { pencilTexture } from '../materials';
function Solid({position,scale=[1,1,1],rotation,material,shape='box',args,walkable=true}){return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>{shape==='box'?<boxGeometry/>:shape==='sphere'?<sphereGeometry args={[1,16,12]}/>:<cylinderGeometry args={args||[1,1,1,10]}/>} {shape==='box'&&<Edges color="#45484b"/>}</mesh>}
function Tree({position,leaf,trunk,scale=1}){return <group position={position} scale={scale}><Solid position={[0,2.4,0]} scale={[.55,4.8,.55]} shape="cylinder" material={trunk}/>{[[-.8,5,0],[.7,5.2,0],[0,6,0]].map((p,i)=><Solid key={i} position={p} scale={[1.5,1.7,1.1]} shape="sphere" material={leaf}/>)}</group>}
export default function Dabotap(){
 const m=useMemo(()=>Object.fromEntries(Object.entries({ground:'#c98748',stone:'#777a7c',dark:'#575a5c',sky:'#6195c4',yellow:'#c79d12',orange:'#c68725',green:'#398358',trunk:'#674331'}).map(([k,c],i)=>{const map=pencilTexture(c,380+i);map.repeat.set(['ground','sky','stone'].includes(k)?7:3,['ground','sky','stone'].includes(k)?7:3);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);useEffect(()=>()=>Object.values(m).forEach(x=>{x.map.dispose();x.dispose()}),[m]);
 return <group>
  <Solid position={[0,-.32,0]} scale={[44,.55,42]} material={m.ground}/><Solid position={[0,11,-31]} scale={[45,22,.5]} material={m.sky} walkable={false}/>
  <group scale={.56} position={[0,0,-7]}>
  {/* Broad trapezoid in the drawing is approximated by stacked, shrinking stone bases. */}
  <Solid position={[0,.35,-7]} scale={[16,.7,12]} material={m.stone}/><Solid position={[0,1.05,-7]} scale={[14.5,.7,10.5]} material={m.dark}/><Solid position={[0,1.75,-7]} scale={[12.8,.7,9]} material={m.stone}/>
  {Array.from({length:18},(_,i)=><Solid key={i} position={[0,(i+1)*.18-.09,12-i*.88]} scale={[3.5,.18,.95]} material={i%2?m.dark:m.stone}/>) }
  <Solid position={[0,3.55,-7]} scale={[11.2,.45,7.2]} material={m.stone}/>
  {[[-6,5.4,-9],[6,5.4,-9],[-6,5.4,-5],[6,5.4,-5]].map((p,i)=><Solid key={i} position={p} scale={[.75,3.7,.75]} material={m.dark}/>) }
  <Solid position={[0,7.25,-7]} scale={[12.8,.5,8]} material={m.stone}/><Solid position={[0,7.8,-7]} scale={[10.5,.55,6.4]} material={m.dark}/>
  {[[-4.6,9,-9],[0,9,-9],[4.6,9,-9],[-4.6,9,-5],[0,9,-5],[4.6,9,-5]].map((p,i)=><Solid key={i} position={p} scale={[.45,2.2,.45]} material={m.stone}/>) }
  <Solid position={[0,10.25,-7]} scale={[11,.55,7]} material={m.stone}/><Solid position={[0,10.9,-7]} scale={[8.5,.45,5.2]} material={m.dark}/>
  {[[-3.5,12,-8.8],[-1.2,12,-8.8],[1.2,12,-8.8],[3.5,12,-8.8],[-3.5,12,-5.2],[3.5,12,-5.2]].map((p,i)=><Solid key={i} position={p} scale={[.35,2.1,.35]} material={m.stone}/>) }
  <Solid position={[0,13.25,-7]} scale={[9.5,.5,5.8]} material={m.stone}/>
  {[1.2,.9,.65].map((s,i)=><Solid key={i} position={[0,14+i*.9,-7]} scale={[s,.75,s]} shape="cylinder" args={[1,1,1,8]} material={i%2?m.dark:m.stone}/>) }
  </group>
  <Solid position={[13,15,-29]} scale={[3.3,3.3,.5]} shape="sphere" material={m.yellow} walkable={false}/>
  <Tree position={[-16,0,-7]} leaf={m.orange} trunk={m.trunk} scale={1.2}/><Tree position={[15,0,-7]} leaf={m.orange} trunk={m.trunk}/><Tree position={[17,0,5]} leaf={m.green} trunk={m.trunk} scale={.8}/>
  <group position={[-12,0,7]} scale={1.4}><Character shirt="#4581b0" pants="#55585a" variant={2} behavior="wave"/></group>
 </group>;
}
