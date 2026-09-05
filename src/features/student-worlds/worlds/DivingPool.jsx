import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { pencilTexture } from '../materials';
import Character from '../Character';

function Box({ position, size, material }) {
  return <mesh position={position} material={material} castShadow receiveShadow userData={{ walkable: true }}><boxGeometry args={size} /><Edges color="#5c686b" /></mesh>;
}

function Diver() {
  const root = useRef();
  useFrame(({ clock }) => {
    root.current.position.y = 1.3 + Math.sin(clock.elapsedTime * 0.7) * 0.18;
    root.current.rotation.y = -0.32 + Math.sin(clock.elapsedTime * 0.4) * 0.025;
  });
  return <group ref={root} position={[-2, 1.3, 1]} rotation={[0, -0.32, -Math.PI / 2 - 0.12]} scale={2.8} userData={{ nonSolid: true }}>
    <Character shirt="#eee8d8" pants="#e9b48c" variant={0} behavior="dive" goggles patterned barefoot />
  </group>;
}

export default function DivingPool() {
  const mats = useMemo(() => Object.fromEntries(Object.entries({ deck: '#bcbdb6', water: '#50a7ce', cream: '#eee0c9', blue: '#1745a1', green: '#138c51', red: '#bd3329' }).map(([k, c], i) => {
    const map = pencilTexture(c, 51 + i); if (k === 'water') map.repeat.set(9, 12); if (k === 'deck') map.repeat.set(4, 8);
    return [k, new MeshStandardMaterial({ map, roughness: 1 })];
  })), []);
  useEffect(() => () => Object.values(mats).forEach(m => { m.map.dispose(); m.dispose(); }), [mats]);
  return <group>
    <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.deck} receiveShadow userData={{ nonSolid: true }}><planeGeometry args={[180, 180]} /></mesh>
    <Box position={[-11, -0.3, -2]} size={[8, 0.6, 32]} material={mats.deck} />
    <Box position={[4, -0.3, 14]} size={[22, 0.6, 4]} material={mats.deck} />
    <Box position={[4, -0.3, -18]} size={[22, 0.6, 4]} material={mats.deck} />
    <Box position={[16, -0.3, -2]} size={[2, 0.6, 36]} material={mats.deck} />
    <mesh position={[4, -0.07, -2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.water} receiveShadow userData={{ nonSolid: true }}><planeGeometry args={[22, 28]} /></mesh>
    {/* Visible shallow exit ramp at the near end; collision uses the same slope. */}
    <mesh position={[4, -0.425, 11]} rotation={[-Math.atan2(0.85, 2), 0, 0]} material={mats.cream} userData={{ nonSolid: true }}><boxGeometry args={[22, 0.02, Math.hypot(2, 0.85)]} /></mesh>
    {[-13, -7, -1, 5, 11].map(z => <group key={z}>
      <Box position={[-8.6, 0.36, z]} size={[2.6, 0.72, 2.5]} material={mats.cream} />
      <Box position={[-8.5, 0.79, z]} size={[3.2, 0.14, 2.8]} material={mats.green} />
      <Box position={[-8.9, 1.02, z - 1]} size={[2.2, 0.35, 0.4]} material={mats.blue} />
      {[0, 1, 2, 3, 4].map(i => <Box key={i} position={[-11.7 + i * 0.42, (i + 1) * 0.14 - 0.07, z]} size={[0.46, 0.14, 1.5]} material={mats.cream} />)}
      <mesh position={[-7.25, 0.37, z]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.2, 0.045, 6, 14]} /><meshStandardMaterial color="#b63631" /></mesh>
    </group>)}
    {[-10, -4, 2, 8].map(z => <group key={z} userData={{ nonSolid: true }}>
      <mesh position={[4, 0.03, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 22, 5]} /><meshStandardMaterial color="#dfd0a2" /></mesh>
      {Array.from({ length: 42 }, (_, i) => <mesh key={i} position={[-6.7 + i * 0.52, 0.07, z + Math.sin(i * 1.9) * 0.035]} material={i < 22 ? mats.red : mats.blue}><sphereGeometry args={[0.19 + (i % 3) * 0.012, 10, 8]} /></mesh>)}
    </group>)}
    <Diver />
  </group>;
}
