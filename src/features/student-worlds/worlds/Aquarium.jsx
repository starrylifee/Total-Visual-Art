import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { DoubleSide, MeshStandardMaterial } from 'three';
import Character from '../Character';
import { pencilTexture } from '../materials';

function Solid({ position, scale=[1,1,1], rotation, material, shape='box', args, walkable=true }) {
  return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>
    {shape==='box' ? <boxGeometry/> : shape==='sphere' ? <sphereGeometry args={args||[1,16,12]}/> : <cylinderGeometry args={args||[1,1,1,18]}/>}
    {shape==='box' && <Edges color="#55514c"/>}
  </mesh>;
}

function Fish({ position, color, material, phase=0, scale=1 }) {
  const ref=useRef();
  useFrame(({clock})=>{const t=clock.elapsedTime*.7+phase;ref.current.position.x=position[0]+Math.sin(t)*1.1;ref.current.rotation.y=Math.sin(t)>.0?0:Math.PI;});
  return <group ref={ref} position={position} scale={scale} userData={{nonSolid:true}}>
    <Solid shape="sphere" scale={[.65,.32,.18]} material={material} walkable={false}/>
    <Solid shape="cylinder" args={[0,.34,.55,3]} position={[-.72,0,0]} rotation={[0,0,Math.PI/2]} material={material} walkable={false}/>
    <mesh position={[.42,.09,.17]}><sphereGeometry args={[.045,6,6]}/><meshBasicMaterial color="#252a2b"/></mesh>
  </group>;
}

function Jelly({position,material,phase=0}){
  const ref=useRef();
  useFrame(({clock})=>{ref.current.position.y=position[1]+Math.sin(clock.elapsedTime+phase)*.18;});
  return <group ref={ref} position={position} userData={{nonSolid:true}}>
    <mesh material={material}><sphereGeometry args={[.58,14,8,0,Math.PI*2,0,Math.PI/2]}/></mesh>
    {[-.3,0,.3].map((x,i)=><Solid key={x} shape="cylinder" args={[.035,.055,1.05,7]} position={[x,-.52,0]} material={material} walkable={false} rotation={[0,0,(i-1)*.13]}/>) }
  </group>;
}

function Person({position,shirt,pants='#41647b',variant=0,behavior='sit',rotation=0,scale=1.35}){
  return <group position={position} rotation={[0,rotation,0]} scale={scale}><Character shirt={shirt} pants={pants} variant={variant} behavior={behavior}/></group>;
}

function Boat({position=[0,0,0],rotation=0,materials,people=false,small=false}){
  const s=small?.72:1;
  return <group position={position} rotation={[0,rotation,0]} scale={s}>
    <Solid position={[0,.45,0]} scale={[8,.45,3.7]} material={materials.white}/>
    <Solid position={[0,.72,0]} scale={[7.3,.24,3.15]} material={materials.orange}/>
    <Solid position={[0,.91,0]} scale={[6.8,.18,2.65]} material={materials.cream}/>
    <Solid position={[0,1.02,0]} scale={[5.7,.16,1.8]} material={materials.wood}/>
    <Solid position={[0,1.18,-1.35]} scale={[6.4,.55,.18]} material={materials.white}/>
    <Solid position={[0,1.18,1.35]} scale={[6.4,.55,.18]} material={materials.white}/>
    <Solid position={[3.25,1.18,0]} scale={[.2,.55,2.7]} material={materials.white}/>
    <Solid position={[-3.25,1.18,0]} scale={[.2,.55,2.7]} material={materials.white}/>
    {[-2.2,-.8,.8,2.2].map(x=><Solid key={x} position={[x,1.22,0]} scale={[.16,.18,2.5]} material={materials.orange}/>) }
    {people&&<>
      <Person position={[-2.3,1.28,-.15]} shirt="#bd4b3c" pants="#735449" variant={2} behavior="sit" rotation={-.3}/>
      <Person position={[-.8,1.28,.15]} shirt="#e4c7a3" pants="#795844" variant={1} behavior="sit" rotation={.15}/>
      <Person position={[.9,1.28,-.2]} shirt="#ef8350" pants="#6698a9" variant={3} behavior="sit" rotation={-.15}/>
      <Person position={[2.25,1.28,.1]} shirt="#f0cb45" pants="#d77d51" variant={0} behavior="sit" rotation={.35}/>
    </>}
  </group>;
}

export default function Aquarium(){
  const materials=useMemo(()=>Object.fromEntries(Object.entries({water:'#8fcbdc',deck:'#9d8f7f',white:'#f7f1df',cream:'#fff8e9',orange:'#e79549',wood:'#a86f4c',grey:'#777f83',purple:'#9b75b3',blue:'#3e8fc2',yellow:'#f0c856',pink:'#de7892',green:'#63a57a'}).map(([k,c],i)=>{const map=pencilTexture(c,230+i);if(['water','deck'].includes(k))map.repeat.set(9,9);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);
  useEffect(()=>()=>Object.values(materials).forEach(m=>{m.map.dispose();m.dispose();}),[materials]);
  return <group>
    <Solid position={[0,-1.55,22]} scale={[80,.45,48]} material={materials.water} walkable={false}/>
    <mesh position={[0,-.07,12]} rotation={[-Math.PI/2,0,0]} receiveShadow userData={{nonSolid:true}}><planeGeometry args={[80,32]}/><meshStandardMaterial map={materials.water.map} transparent opacity={.48} depthWrite={false} side={DoubleSide}/></mesh>
    {/* Rear indoor feed-zone and dock, matching the pale shop strip at the top of the drawing. */}
    <Solid position={[0,-.05,-9]} scale={[34,.2,10]} material={materials.deck}/>
    <Solid position={[-9,2.2,-13]} scale={[11,4.4,.7]} material={materials.white}/>
    <Solid position={[-9,4.7,-12.55]} scale={[6.4,1.15,.22]} material={materials.orange}/>
    <mesh position={[-9,4.7,-12.4]}><boxGeometry args={[5.8,.8,.1]}/><meshStandardMaterial color="#f6ead0"/></mesh>
    {[-13,-11,-9,-7,-5].map((x,i)=><group key={x} position={[x,2.3,-12.2]}>
      <Solid position={[0,.7,0]} scale={[.05,1.2,.05]} material={materials.grey}/>
      <Solid position={[0,0,0]} scale={[.7,.9,.22]} material={[materials.yellow,materials.pink,materials.blue,materials.green,materials.orange][i]}/>
    </group>)}
    <Solid position={[3,1.2,-11]} scale={[4,2.4,3]} material={materials.grey}/>
    <Boat position={[8,.05,-7]} rotation={-.12} materials={materials} small/>
    {/* Main white/orange boat dominates the foreground as in the source. */}
    <Boat position={[-3,0,3.8]} rotation={-.08} materials={materials} people/>
    {/* Added access steps make the main subject reachable from the dock. */}
    {Array.from({length:8},(_,i)=><Solid key={i} position={[-3.2,(i+1)*.15-.075,-4.7+i*.62]} scale={[1.7,.15,.7]} material={materials.deck}/>) }
    <Solid position={[-3.2,.95,.35]} scale={[1.7,.18,2]} material={materials.deck}/>
    <Fish position={[-11,-.38,3]} material={materials.blue} phase={0}/>
    <Fish position={[7,-.42,4]} material={materials.blue} phase={2} scale={1.2}/>
    <Fish position={[-7,-.48,12]} material={materials.yellow} phase={4} scale={.8}/>
    <Fish position={[3,-.48,14]} material={materials.pink} phase={5} scale={.7}/>
    <Jelly position={[-12,-.15,8]} material={materials.purple}/>
    <Jelly position={[11,-.1,0]} material={materials.white} phase={2}/>
    {[-12,-5,4,11].map((x,i)=><group key={x} position={[x,.1,10+i%2*3]} userData={{nonSolid:true}}>{[0,1,2].map(j=><mesh key={j} position={[j*.3,j*.45,0]}><sphereGeometry args={[.08+j*.025,8,6]}/><meshBasicMaterial color="#eefbff" transparent opacity={.75}/></mesh>)}</group>)}
  </group>;
}
