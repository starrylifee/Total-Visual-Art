import React,{useEffect,useMemo} from 'react';
import {DoubleSide,MeshStandardMaterial} from 'three';
import {pencilTexture} from '../materials';

function Solid({position,scale=[1,1,1],material,shape='sphere',args,walkable=true}){return <mesh position={position} scale={scale} material={material} castShadow receiveShadow userData={walkable?{walkable:true}:{nonSolid:true}}>{shape==='sphere'?<sphereGeometry args={args||[1,28,18]}/>:shape==='torus'?<torusGeometry args={args||[1,.22,12,30]}/>:<cylinderGeometry args={args||[1,1,1,24]}/>}</mesh>}

export default function MoonCrater(){
 const m=useMemo(()=>Object.fromEntries(Object.entries({space:'#17181b',moon:'#aaa7a0',rim:'#77746f',dark:'#514f4c'}).map(([k,c],i)=>{const map=pencilTexture(c,820+i);map.repeat.set(6,6);return[k,new MeshStandardMaterial({map,roughness:1,side:DoubleSide})]})),[]);
 useEffect(()=>()=>Object.values(m).forEach(x=>{x.map.dispose();x.dispose()}),[m]);
 const craters=[[-9,-2,3.2],[-5,7,1.7],[-3,-5,2.4],[1,2,2.5],[5,-6,1.3],[8,1,2.2],[10,7,1.5],[-1,10,1.1],[4,10,1.7]];
 return <group>
  <Solid position={[0,-4,0]} scale={[18,5.2,18]} material={m.moon}/>
  {craters.map(([x,z,s],i)=><group key={i} position={[x,.18,z]}><Solid rotation={[-Math.PI/2,0,0]} scale={[s,.22,s]} shape="torus" args={[1,.32,10,28]} material={m.rim}/><Solid position={[0,-.12,0]} scale={[s*.72,.11,s*.72]} shape="cylinder" args={[1,1,1,22]} material={m.dark}/></group>)}
  {Array.from({length:18},(_,i)=><Solid key={`star${i}`} position={[-25+(i*13)%50,10+(i%5)*3,-28]} scale={[.08,.08,.08]} material={m.moon} walkable={false}/>)}
 </group>;
}
