import React, { useEffect, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { DoubleSide, MeshStandardMaterial } from 'three';
import { pencilTexture } from '../materials';

function Solid({position,scale=[1,1,1],rotation,material,shape='box',args,walkable=true}){
  return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>
    {shape==='box'?<boxGeometry/>:shape==='sphere'?<sphereGeometry args={args||[1,20,14]}/>:<coneGeometry args={args||[1,1,5]}/>}
    {shape==='box'&&<Edges color="#4d5550"/>}
  </mesh>;
}

function Cloud({position,material,scale=1}){
  return <group position={position} scale={scale} userData={{nonSolid:true}}>{[[-1,0,0],[0,.25,0],[1,0,0],[-.45,.35,0],[.5,.45,0]].map((p,i)=><Solid key={i} position={p} scale={[1.1,.7,.35]} shape="sphere" material={material} walkable={false}/>)}</group>;
}

export default function SunsetValley(){
  const mats=useMemo(()=>Object.fromEntries(Object.entries({ground:'#dcaab3',orange:'#e98a43',green:'#268b50',mint:'#89b99c',red:'#a41136',rose:'#c96578',blue:'#3978ad',cloud:'#a6a29b',path:'#d9a5b4'}).map(([k,c],i)=>{const map=pencilTexture(c,300+i);map.repeat.set(k==='ground'?10:4,k==='ground'?10:4);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);
  useEffect(()=>()=>Object.values(mats).forEach(m=>{m.map.dispose();m.dispose();}),[mats]);
  return <group>
    <Solid position={[0,-.35,0]} scale={[42,.6,45]} material={mats.ground}/>
    {/* Warm central valley keeps the orange/pink wedge between both mountains. */}
    <Solid position={[0,-.01,-7]} scale={[8,.08,34]} material={mats.orange}/>
    <Solid position={[0,.04,7]} scale={[3.5,.1,13]} material={mats.path}/>
    {/* Broad stepped ridges remain climbable with the common double jump. */}
    {Array.from({length:9},(_,i)=><Solid key={`l${i}`} position={[-11.5+i*.45,i*.38-0.05,-5-i*1.8]} scale={[9-i*.35,.36,4.5]} material={mats.green}/>) }
    {Array.from({length:8},(_,i)=><Solid key={`r${i}`} position={[11.5-i*.38,i*.34-0.05,-5-i*1.9]} scale={[8.5-i*.3,.32,4.5]} material={mats.mint}/>) }
    <Solid position={[-11,4.7,-17]} scale={[10,9,10]} shape="cone" args={[1,1,5]} material={mats.green}/>
    <Solid position={[11,4.1,-17]} scale={[10,8,10]} shape="cone" args={[1,1,5]} material={mats.mint}/>
    {/* The low red sunset is the focal point of the drawing. */}
    <Solid position={[0,4.3,-28]} scale={[3.7,3.7,.7]} shape="sphere" material={mats.red} walkable={false}/>
    <Solid position={[0,10,-31]} scale={[35,10,.4]} material={mats.rose} walkable={false}/>
    <Solid position={[0,19,-32]} scale={[40,8,.5]} material={mats.blue} walkable={false}/>
    <Cloud position={[-10,14,-29]} material={mats.cloud} scale={1.4}/>
    <Cloud position={[12,10.5,-28]} material={mats.cloud} scale={1.25}/>
  </group>;
}
