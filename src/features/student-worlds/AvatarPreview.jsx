import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Character from './Character';

function Turntable({ avatar, spin, behavior, yaw = 0, walking = false }) {
  const group = useRef();
  useFrame((_, delta) => { if (spin && group.current) group.current.rotation.y += delta * 0.6; });
  return <group ref={group} position={[0, -0.85, 0]} rotation={[0, yaw, 0]}><Character avatar={avatar} behavior={behavior} walking={walking} /></group>;
}

// A small front-facing render of one avatar, used by the picker and the library header.
// yaw (radians), zoom (camera distance multiplier) and walking exist for the dev preview page only.
export default function AvatarPreview({ avatar, spin = true, behavior = 'idle', className = '', yaw = 0, zoom = 1, walking = false }) {
  return <div className={`sw-avatar-preview ${className}`}>
    <Canvas camera={{ position: [0, 0.15, 4.4 * zoom], fov: 30 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} frameloop="always">
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.4} />
      <directionalLight position={[-3, 1.5, -2]} intensity={0.35} />
      <Turntable avatar={avatar} spin={spin} behavior={behavior} yaw={yaw} walking={walking} />
    </Canvas>
  </div>;
}
