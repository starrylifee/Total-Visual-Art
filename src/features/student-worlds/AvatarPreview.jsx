import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Character from './Character';

function Turntable({ avatar, spin, behavior }) {
  const group = useRef();
  useFrame((_, delta) => { if (spin && group.current) group.current.rotation.y += delta * 0.6; });
  return <group ref={group} position={[0, -0.85, 0]}><Character avatar={avatar} behavior={behavior} /></group>;
}

// A small front-facing render of one avatar, used by the picker and the library header.
export default function AvatarPreview({ avatar, spin = true, behavior = 'idle', className = '' }) {
  return <div className={`sw-avatar-preview ${className}`}>
    <Canvas camera={{ position: [0, 0.15, 4.4], fov: 30 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} frameloop="always">
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.35} />
      <Turntable avatar={avatar} spin={spin} behavior={behavior} />
    </Canvas>
  </div>;
}
