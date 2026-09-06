import React,{useEffect,useMemo} from 'react';import {Edges} from '@react-three/drei';import {DoubleSide,MeshStandardMaterial} from 'three';import Character from '../Character';import {pencilTexture} from '../materials';
function Solid({position,scale=[1,1,1],rotation,material,shape='box',walkable=true}){return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>{shape==='box'?<boxGeometry/>:shape==='sphere'?<sphereGeometry args={[1,16,12]}/>:<cylinderGeometry args={[1,1,1,18]}/>} {shape==='box'&&<Edges color="#343638"/>}</mesh>}
function Wheel({position,m,r=1.35}){return <group position={position} rotation={[Math.PI/2,0,0]}><Solid scale={[r,.55,r]} shape="cylinder" material={m.black}/><Solid scale={[r*.55,.58,r*.55]} shape="cylinder" material={m.grey}/></group>}
function Building({position,scale,m}){return <group position={position}><Solid scale={scale} material={m.building}/>{[-1,0,1].flatMap(x=>[1,3,5,7].map(y=><Solid key={`${x}${y}`} position={[x*scale[0]*.55,y-scale[1]/2+.4,scale[2]/2+.03]} scale={[.45,.65,.05]} material={m.blue} walkable={false}/>))}</group>}
export default function MovingCity(){const m=useMemo(()=>Object.fromEntries(Object.entries({road:'#696b6d',ground:'#d5a072',building:'#858789',blue:'#789dd0',taxi:'#55585b',black:'#292b2d',grey:'#9a9c9d',lime:'#b3d847',red:'#bf2d3b',orange:'#d28a36'}).map(([k,c],i)=>{const map=pencilTexture(c,520+i);map.repeat.set(['road','building'].includes(k)?6:2,['road','building'].includes(k)?6:2);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);useEffect(()=>()=>Object.values(m).forEach(x=>{x.map.dispose();x.dispose()}),[m]);return <group>
 <Solid position={[0,-.35,0]} scale={[42,.6,42]} material={m.ground}/><Solid position={[0,.01,-6]} scale={[42,.08,25]} material={m.road}/>
 {[[-15,5,-20,7,13,4],[-8,6,-22,5,15,4],[-2,7,-23,5,17,4],[5,7,-23,7,18,4],[13,5,-21,6,13,4],[18,7,-24,4,18,4]].map((a,i)=><Building key={i} position={[a[0],a[1],a[2]]} scale={[a[3],a[4],a[5]]} m={m}/>) }
 <group position={[0,0,-3]}><Solid position={[0,1.8,0]} scale={[14,3.1,6]} material={m.taxi}/><Solid position={[-1,3.8,0]} scale={[7,1.4,5.4]} material={m.taxi}/><Solid position={[-1,4.05,2.73]} scale={[2.4,1,0.08]} material={m.blue}/><Solid position={[2,4.05,2.73]} scale={[2.4,1,.08]} material={m.blue}/><Solid position={[-1,5,0]} scale={[3,.45,1.5]} material={m.lime}/><Solid position={[6.6,1.8,2.7]} scale={[.55,.35,.08]} material={m.red}/><Solid position={[6.6,1.8,-2.7]} scale={[.55,.35,.08]} material={m.red}/><Wheel position={[-4.2,.5,3]} m={m}/><Wheel position={[4.2,.5,3]} m={m}/><Wheel position={[-4.2,.5,-3]} m={m}/><Wheel position={[4.2,.5,-3]} m={m}/></group>
 {/* Motorcycle: black engine block, tank and seat between two wheels, a leaning fork with handlebar, and a helmeted rider leaning forward. */}
 <group position={[-14,0,5]} scale={1.4}>
  <Wheel position={[-1.5,.95,0]} m={m} r={.95}/><Wheel position={[1.3,.95,0]} m={m} r={.95}/>
  <Solid position={[-.1,.9,0]} scale={[1.7,.9,.7]} material={m.black}/>
  <Solid position={[-1.5,1.85,0]} scale={[1.3,.22,.8]} material={m.black}/>
  <Solid position={[.55,1.6,0]} scale={[1.3,.6,.7]} material={m.taxi}/>
  <Solid position={[-.65,1.7,0]} scale={[1.4,.28,.75]} material={m.black}/>
  <Solid position={[-.3,.5,.45]} scale={[1.9,.2,.2]} material={m.grey}/>
  {[-.22,.22].map(z=><Solid key={z} position={[1.45,1.45,z]} rotation={[0,0,-.3]} scale={[.12,1.15,.12]} shape="cylinder" material={m.grey} walkable={false}/>)}
  <Solid position={[1.6,2.05,0]} rotation={[Math.PI/2,0,0]} scale={[.1,1.4,.1]} shape="cylinder" material={m.grey} walkable={false}/>
  {[-.62,.62].map(z=><Solid key={z} position={[1.6,2.05,z]} rotation={[Math.PI/2,0,0]} scale={[.16,.3,.16]} shape="cylinder" material={m.black} walkable={false}/>)}
  <Solid position={[1.85,1.55,0]} scale={[.24,.24,.24]} shape="sphere" material={m.orange} walkable={false}/>
  <group position={[.35,1.46,0]} rotation={[0,0,-.35]}>
   <group rotation={[0,Math.PI/2,0]} scale={1.2}><Character shirt="#333638" pants="#333638" variant={1} behavior="build"/></group>
   <Solid position={[0,1.2,0]} scale={[.38,.38,.38]} shape="sphere" material={m.black} walkable={false}/>
  </group>
 </group>
 <group position={[14,0,4]}><Solid position={[0,1,0]} scale={[5,2.2,3]} material={m.black}/><Wheel position={[-1.4,.35,1.5]} m={m}/><Wheel position={[1.4,.35,1.5]} m={m}/></group>
 </group>}
