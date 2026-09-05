import React,{useEffect,useMemo} from 'react';
import { Edges } from '@react-three/drei';
import { DoubleSide,MeshStandardMaterial } from 'three';
import { pencilTexture } from '../materials';

function Solid({position,scale=[1,1,1],rotation,material,shape='box',walkable=true}){
 return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>
  {shape==='box'?<boxGeometry/>:shape==='rock'?<dodecahedronGeometry args={[1,0]}/>:shape==='sphere'?<sphereGeometry args={[1,14,10]}/>:<cylinderGeometry args={[1,1,1,12]}/>} {shape==='box'&&<Edges color="#555657"/>}
 </mesh>;
}
function Dolmen({position,rotation=0,materials,wide=false}){
 return <group position={position} rotation={[0,rotation,0]}>
  <Solid position={[-1.35,1.25,0]} scale={[.7,2.5,.8]} rotation={[0,0,.08]} material={materials.dark}/>
  <Solid position={[1.35,1.25,0]} scale={[.7,2.5,.8]} rotation={[0,0,-.06]} material={materials.grey}/>
  <Solid position={[0,2.65,0]} scale={[wide?4.3:3.5,.62,1.8]} rotation={[0,.05,-.05]} material={materials.grey}/>
 </group>;
}
function Cloud({position,material}){return <group position={position} userData={{nonSolid:true}}>{[-1,0,1].map((x,i)=><Solid key={x} position={[x,i===1?.25:0,0]} scale={[1.2,.75,.3]} shape="sphere" material={material} walkable={false}/>)}</group>}
export default function DolmenField(){
 const materials=useMemo(()=>Object.fromEntries(Object.entries({grass:'#8fb879',path:'#dfae78',grey:'#87898a',dark:'#5f6265',trunk:'#9b5544',leaf:'#4e9a58',sky:'#79acd1',cloud:'#d6d5ce'}).map(([k,c],i)=>{const map=pencilTexture(c,340+i);map.repeat.set(['grass','path','sky'].includes(k)?9:3,['grass','path','sky'].includes(k)?9:3);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);
 useEffect(()=>()=>Object.values(materials).forEach(m=>{m.map.dispose();m.dispose()}),[materials]);
 return <group>
  <Solid position={[0,-.35,0]} scale={[42,.6,42]} material={materials.grass}/>
  <Solid position={[0,-.01,14]} scale={[42,.08,7]} material={materials.path}/>
  <Solid position={[0,9,-31]} scale={[45,18,.5]} material={materials.sky} walkable={false}/>
  <Dolmen position={[-8,0,-6]} rotation={-.12} materials={materials}/>
  <Dolmen position={[9,0,-8]} rotation={.12} materials={materials} wide/>
  <Solid position={[1,1.45,-8]} scale={[2.7,1.8,2.1]} shape="rock" material={materials.grey}/>
  {[[-8,.6,3,1],[-3,.42,5,.72],[2,.65,4,1.05]].map(([x,y,z,s],i)=><Solid key={i} position={[x,y,z]} scale={[s,y*1.5,s*.8]} shape="rock" material={i===1?materials.dark:materials.grey}/>) }
  <group position={[-15,0,-14]}><Solid position={[0,2.7,0]} scale={[.7,5.4,.7]} shape="cylinder" material={materials.trunk}/><Solid position={[0,6.3,0]} scale={[3.1,3.5,2]} shape="sphere" material={materials.leaf}/></group>
  <Cloud position={[-7,12,-29]} material={materials.cloud}/><Cloud position={[12,12.5,-29]} material={materials.cloud}/>
 </group>;
}
