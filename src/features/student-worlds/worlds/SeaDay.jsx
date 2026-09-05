import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Line } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import Character from '../Character';
import { pencilTexture } from '../materials';

function Block({ position, size, material, rotation }) {
  return <mesh position={position} rotation={rotation} material={material} castShadow receiveShadow userData={{ walkable: true }}>
    <boxGeometry args={size} /><Edges color="#36566b" threshold={25} />
  </mesh>;
}

function Friends() {
  const float = useRef();
  const swimmer = useRef();
  useFrame(({ clock }) => {
    float.current.position.y = -0.65 + Math.sin(clock.elapsedTime * 1.3) * 0.07;
    swimmer.current.position.y = 0.17 + Math.sin(clock.elapsedTime * 1.6) * 0.08;
    swimmer.current.position.x = -5 + Math.sin(clock.elapsedTime * 0.35) * 0.4;
  });
  return <group userData={{ nonSolid: true }}>
    <group ref={float} position={[-8, -0.65, -5]} scale={1.9}>
      <Character shirt="#de7096" pants="#de7096" variant={0} goggles behavior="chat" />
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.1, 1]} castShadow>
        <torusGeometry args={[0.46, 0.14, 10, 30]} /><meshStandardMaterial color="#ffd62b" roughness={0.65} />
      </mesh>
    </group>
    <group position={[-3.9, -0.65, -5.1]} scale={1.9}><Character shirt="#408da9" pants="#408da9" variant={2} behavior="wave" /></group>
    <group ref={swimmer} position={[-5, 0.17, -0.4]} rotation={[0, 0, -Math.PI / 2]} scale={1.65}>
      <Character shirt="#282a31" pants="#282a31" variant={0} swimming walking />
    </group>
  </group>;
}

export default function SeaDay() {
  const ripples = useRef();
  const materials = useMemo(() => Object.fromEntries(Object.entries({ water: '#246f9c', blue: '#235d87', paper: '#eadac3' }).map(([key, color], i) => {
    const map = pencilTexture(color, 31 + i);
    if (key === 'water') map.repeat.set(18, 18);
    return [key, new MeshStandardMaterial({ map, roughness: 0.95 })];
  })), []);
  useEffect(() => () => Object.values(materials).forEach(m => { m.map.dispose(); m.dispose(); }), [materials]);
  useFrame(({ clock }) => { ripples.current.position.z = Math.sin(clock.elapsedTime * 0.4) * 0.35; });
  return <group>
    {/* The drawing contains no sandy shore: water surrounds the entire scene. */}
    <mesh position={[0, -0.07, -15]} rotation={[-Math.PI / 2, 0, 0]} material={materials.water} receiveShadow userData={{ nonSolid: true }}><planeGeometry args={[180, 180]} /></mesh>
    <group ref={ripples} userData={{ nonSolid: true }}>
      {Array.from({ length: 26 }, (_, i) => <Line key={i} points={Array.from({ length: 15 }, (_, j) => [j * 4 - 28, -0.035, -42 + i * 2.5 + Math.sin(j * 2.3 + i) * 0.2])} color={i % 3 ? '#73a3b9' : '#b6bdba'} lineWidth={i % 3 ? 1 : 1.8} transparent opacity={0.5} />)}
    </group>
    {/* Light rectangular cells with thick blue ribs, interpreted as a floating platform. */}
    <group position={[7, 0, -5]} rotation={[0, -0.06, 0]}>
      <Block position={[0, -0.1, 0]} size={[11.8, 0.5, 3.4]} material={materials.blue} />
      {Array.from({ length: 8 }, (_, i) => [-0.79, 0.79].map((z, row) => <Block key={`${i}-${row}`} position={[-5.12 + i * 1.46, 0.18, z]} size={[1.22, 0.12, 1.3]} rotation={[0, (i % 3 - 1) * 0.015, 0]} material={materials.paper} />))}
    </group>
    {/* A shallow access stair is an added interpretation, not an observed object. */}
    {Array.from({ length: 7 }, (_, i) => <Block key={i} position={[7, (-0.7 + i * 0.15) - 0.075, 1 - i * 0.7]} size={[2.2, 0.15, 0.76]} material={i % 2 ? materials.paper : materials.blue} />)}
    <Friends />
  </group>;
}
