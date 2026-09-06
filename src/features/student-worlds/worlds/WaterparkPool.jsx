import React, { useEffect, useMemo } from 'react';
import { Edges, Line } from '@react-three/drei';
import { DoubleSide, MeshStandardMaterial } from 'three';
import Character from '../Character';
import { pencilTexture } from '../materials';

function Solid({ position, size=[1,1,1], material, rotation, cylinder }) {
  return <mesh position={position} scale={size} rotation={rotation} material={material} castShadow receiveShadow userData={{walkable:true}}>
    {cylinder ? <cylinderGeometry args={[1,1,1,24]}/> : <boxGeometry/>}<Edges color="#4d5455"/>
  </mesh>;
}
function Person({position,shirt,pants,variant=0,behavior='wave',scale=1.4,rotation=0}) {
  return <group position={position} scale={scale} rotation={[0,rotation,0]}><Character shirt={shirt} pants={pants} variant={variant} behavior={behavior} barefoot goggles/></group>;
}
function Tube({position,color,material}) {
  return <mesh position={position} rotation={[-Math.PI/2,0,0]} material={material} castShadow receiveShadow userData={{walkable:true}}><torusGeometry args={[0.85,0.28,10,24]}/></mesh>;
}
export default function WaterparkPool(){
  const mats=useMemo(()=>Object.fromEntries(Object.entries({water:'#5ca5cf',deck:'#d7d2c4',yellow:'#efca2f',green:'#4eaa65',brick:'#a65b48',red:'#c14550',blue:'#3e82ac',purple:'#80529b',orange:'#df9445'}).map(([k,c],i)=>{
    const map=pencilTexture(c,150+i);if(k==='water'||k==='deck')map.repeat.set(10,10);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})];
  })),[]);
  useEffect(()=>()=>Object.values(mats).forEach(m=>{m.map.dispose();m.dispose();}),[mats]);
  return <group>
    <Solid position={[0,-0.3,-42]} size={[180,.6,80]} material={mats.deck}/>
    <mesh position={[0,-.07,43]} rotation={[-Math.PI/2,0,0]} material={mats.water} receiveShadow userData={{nonSolid:true}}><planeGeometry args={[180,90]}/></mesh>
    {/* Left yellow flume follows the large curve wrapping the original scene. */}
    <group position={[-11,0,-1]}>
      {Array.from({length:24},(_,i)=>{const a=-1.15+i*.105,r=8.2,x=Math.cos(a)*r,z=Math.sin(a)*r+3,y=5.8-i*.23;return <Solid key={i} position={[x,y,z]} size={[2.8,.22,1.2]} rotation={[0,-a,0]} material={mats.yellow}/>;})}
      {Array.from({length:46},(_,i)=><Solid key={`s${i}`} position={[-1.5,-.775+i*.15,3-i*(9.2/45)]} size={[1.8,.15,.27]} material={mats.brick}/>)}
      <Solid position={[-1.5,6,-8]} size={[4,.25,3]} material={mats.yellow}/>
    </group>
    {/* Central red play castle with green tunnel and a walkable stair. */}
    <group position={[-2,0,-8]}>
      <Solid position={[0,1.8,0]} size={[5,3.6,4]} material={mats.brick}/>
      {[-1.7,0,1.7].map(x=><Solid key={x} position={[x,4,0]} size={[1.2,1.2,4]} material={mats.brick}/>) }
      <mesh position={[0,1.2,2.03]}><torusGeometry args={[1,0.3,8,20,Math.PI]}/><meshStandardMaterial color="#403e3c"/></mesh>
      <Solid position={[4.2,.8,1]} size={[4.5,.2,2.6]} rotation={[0,0,-.12]} material={mats.green}/>
      {/* Approach from the front: the old left stair ended under the yellow flume. */}
      {Array.from({length:36},(_,i)=><Solid key={i} position={[2,-.775+i*.15,10-i*(7.8/35)]} size={[1.6,.15,.28]} material={mats.brick}/>)}
    </group>
    {/* Right yellow/green chute and its nearby steps. */}
    <group position={[10,0,-6]}>
      {Array.from({length:18},(_,i)=><Solid key={i} position={[0,4.8-i*.27,i*.72]} size={[2.6,.2,.86]} rotation={[i*.025,0,0]} material={i<9?mats.yellow:mats.green}/>)}
      {Array.from({length:39},(_,i)=><Solid key={`r${i}`} position={[3.2,-.775+i*.15,16-i*(14.95/38)]} size={[1.7,.15,.45]} material={mats.brick}/>)}
      <Solid position={[1.5,4.9,-.5]} size={[5,.22,2.5]} material={mats.yellow}/>
    </group>
    {[[ -8,-.55,7,'#8cc65d',mats.green,1],[0,-.65,8,'#65b4d2',mats.yellow,2],[7,-.65,6,'#a55ab0',mats.green,3]].map(([x,y,z,shirt,tube,v])=><group key={x} position={[x,y,z]}><Tube position={[0,.55,0]} material={tube}/><Person position={[0,0,0]} shirt={shirt} pants="#365f87" variant={v} behavior="wave"/></group>)}
    <Person position={[-13,-.65,12]} shirt="#e7ce46" pants="#6ba0c5" variant={1}/>
    <Person position={[12,-.65,10]} shirt="#e56f91" pants="#e56f91" variant={2} behavior="chat"/>
    <Person position={[8,-.65,1]} shirt="#a860b1" pants="#5d7895" variant={3} behavior="sit"/>
    <Person position={[-8,2,-8]} shirt="#4da35f" pants="#4da35f" variant={2}/>
    <Line points={[[-16,.03,14],[16,.03,14]]} color="#416f9a" lineWidth={4}/>
  </group>;
}
