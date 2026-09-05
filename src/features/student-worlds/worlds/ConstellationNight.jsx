import React,{useEffect,useMemo} from 'react';
import {DoubleSide,MeshStandardMaterial} from 'three';
import {pencilTexture} from '../materials';
import Character from '../Character';

function Solid({position,scale=[1,1,1],rotation,material,shape='box',args,walkable=true}){return <mesh position={position} scale={scale} rotation={rotation} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>{shape==='box'?<boxGeometry/>:shape==='sphere'?<sphereGeometry args={[1,18,14]}/>:shape==='cone'?<coneGeometry args={args||[1,1,5]}/>:shape==='torus'?<torusGeometry args={args||[1,.25,10,28]}/>:<cylinderGeometry args={args||[1,1,1,18]}/>}</mesh>}
export default function ConstellationNight(){
 const m=useMemo(()=>Object.fromEntries(Object.entries({ground:'#3f4388',road:'#9b9b9f',moon:'#e2ba24',black:'#242326',orange:'#be6840',green:'#5ba638',trunk:'#824b30',star:'#f2cf2b',white:'#ddd8ce'}).map(([k,c],i)=>{const map=pencilTexture(c,850+i);map.repeat.set(5,5);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);useEffect(()=>()=>Object.values(m).forEach(x=>{x.map.dispose();x.dispose()}),[m]);
 return <group>
  <Solid position={[0,-.35,0]} scale={[38,.6,38]} material={m.ground}/><Solid position={[0,.05,-3]} scale={[6,.18,28]} material={m.road}/>
  <Solid position={[-9,4,-13]} scale={[6,.75,5]} shape="torus" args={[1,.42,12,30,Math.PI*1.45]} rotation={[0,0,-.35]} material={m.moon}/><Solid position={[-9,1,-13]} scale={[6,1.2,4]} shape="sphere" material={m.black}/>
  <Solid position={[8,1,-10]} scale={[3.6,1,3]} shape="sphere" material={m.black}/><Solid position={[9,2.2,-5]} scale={[2.2,5,2.2]} rotation={[0,0,-.28]} material={m.orange}/><Solid position={[9,5,-5]} scale={[2.8,1.4,2.8]} shape="cone" args={[1,1,4]} material={m.white}/>
  <Solid position={[-13,2,4]} scale={[1.1,4,1.1]} shape="cylinder" material={m.trunk}/><Solid position={[-13,6,4]} scale={[4,3,4]} shape="sphere" material={m.green}/>
  <Character position={[5,0,3]} shirt="#62a2c8" pants="#ddd8ce" variant={1} behavior="rest"/><Character position={[14,0,-3]} shirt="#9580bf" pants="#ddd8ce" variant={3} behavior="wave"/>
  {Array.from({length:12},(_,i)=><Solid key={i} position={[-16+(i*7)%32,9+(i%4)*2,-18+(i%3)]} scale={[.28,.28,.28]} shape="sphere" material={m.star} walkable={false}/>)}
  {Array.from({length:10},(_,i)=><Solid key={`step${i}`} position={[3+i*.6,(i+1)*.38,8-i*1.1]} scale={[2,.36,.8]} material={m.white}/>) }
 </group>;
}
