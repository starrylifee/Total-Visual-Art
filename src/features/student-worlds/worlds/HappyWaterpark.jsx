import React, { useEffect, useMemo } from 'react';
import { Edges, Line } from '@react-three/drei';
import { MeshStandardMaterial, DoubleSide } from 'three';
import Character from '../Character';
import { pencilTexture } from '../materials';
import { slideLayouts, slideGeometry, slideSamples } from '../slideLayout';

function Block({ position, size, material }) {
  return <mesh position={position} material={material} castShadow receiveShadow userData={{walkable:true}}><boxGeometry args={size}/><Edges color="#5b6064"/></mesh>;
}
function Slide({ layout, mats }) {
  const geometry=useMemo(()=>slideGeometry(layout),[layout]);
  const samples=useMemo(()=>slideSamples(layout),[layout]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const [x,y,z]=layout.start;
  return <group>
    <mesh geometry={geometry} material={mats[layout.key]} castShadow receiveShadow userData={{walkable:true}} />
    {[-1,1].map(side=><Line key={side} points={samples.map(s=>s.center.clone().addScaledVector(s.side,side*1.16).add({x:0,y:0.18,z:0}))} color={layout.color} lineWidth={8} />)}
    <mesh position={[x,y-0.15,z-0.9]} material={mats.yellow} castShadow receiveShadow userData={{walkable:true}}><cylinderGeometry args={[3.1,3.1,0.3,32]}/></mesh>
    {[-1.9,1.9].map(dx=><Block key={dx} position={[x+dx,y/2-0.15,z-1]} size={[0.22,y-0.3,0.22]} material={mats.grey}/>)}
    {Array.from({length:layout.steps},(_,i)=><Block key={i} position={[layout.stairsX,(i+1)*0.15-0.075,z+(layout.steps-1-i)*0.35]} size={[2,0.15,0.39]} material={mats.grey}/>)}
    {Array.from({length:6},(_,i)=><Block key={`entry-${i}`} position={[layout.stairsX,-0.775+i*0.15,z+(layout.steps-1)*0.35+(6-i)*0.35]} size={[2,0.15,0.39]} material={mats.grey}/>)}
    <Block position={[(layout.stairsX+x)/2,y-0.1,z]} size={[Math.abs(layout.stairsX-x)+0.5,0.2,1.6]} material={mats.yellow}/>
  </group>;
}
function FloatFriend({ position, shirt, color, scale=1.5, variant=0 }) {
  return <group position={position} scale={scale} userData={{nonSolid:true}}>
    <Character shirt={shirt} pants="#79a8c6" variant={variant} behavior="wave" barefoot />
    <mesh position={[0,0.55,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[0.48,0.13,10,24]}/><meshStandardMaterial color={color}/></mesh>
  </group>;
}
export default function HappyWaterpark() {
  const mats=useMemo(()=>Object.fromEntries(Object.entries({blue:'#55a3d0',red:'#be4165',yellow:'#edcf47',grey:'#74797b',water:'#81b8d9',deck:'#d7d4c7',sun:'#efba48'}).map(([key,color],i)=>{
    const map=pencilTexture(color,110+i); if(key==='water'||key==='deck')map.repeat.set(10,10);
    return [key,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})];
  })),[]);
  useEffect(()=>()=>Object.values(mats).forEach(m=>{m.map.dispose();m.dispose();}),[mats]);
  return <group>
    <Block position={[0,-0.3,-43]} size={[180,0.6,80]} material={mats.deck}/>
    <mesh position={[0,-0.07,37]} rotation={[-Math.PI/2,0,0]} material={mats.water} userData={{nonSolid:true}}><planeGeometry args={[180,80]}/></mesh>
    {slideLayouts.map(layout=><Slide key={layout.key} layout={layout} mats={mats}/>)}
    <group position={[-19,10,-31]} userData={{nonSolid:true}}><mesh material={mats.sun}><sphereGeometry args={[5,32,20]}/></mesh>
      {Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <Line key={i} points={[[Math.cos(a)*5.5,Math.sin(a)*5.5,0],[Math.cos(a)*7,Math.sin(a)*7,0]]} color="#d78b39" lineWidth={4}/>;})}
    </group>
    <FloatFriend position={[-8,-0.65,7]} shirt="#8fbd64" color="#86b955" variant={3} scale={2}/>
    <FloatFriend position={[-12,-0.75,12]} shirt="#f1d455" color="#edd949" variant={1} scale={1.05}/>
    <group position={[-1,-0.65,10]} scale={1.4}><Character shirt="#436db7" pants="#8cbb53" variant={0} behavior="wave" barefoot/></group>
    <group position={[-3.6,3.55,-2.5]} scale={1.4}><Character shirt="#66afd4" pants="#345897" variant={0} behavior="sit" barefoot/></group>
    <group position={[8.3,3.6,1.5]} scale={1.4}><Character shirt="#a786bb" pants="#d79dca" variant={3} behavior="sit" barefoot/></group>
    <group position={[9.3,6.9,-11]} scale={1.35}><Character shirt="#549dc6" pants="#365598" variant={3} behavior="wave" barefoot/></group>
  </group>;
}
