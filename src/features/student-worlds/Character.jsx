import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { pencilTexture } from './materials';
import { avatarSkins } from './avatarSkins';

function Ball({ position, scale = [1, 1, 1], radius = 0.1, color, map }) {
  return <mesh position={position} scale={scale} castShadow><sphereGeometry args={[radius, 12, 10]} /><meshStandardMaterial color={map ? '#ffffff' : color} map={map} roughness={0.9} /></mesh>;
}
function Bone({ length, radius, color }) {
  return <mesh position={[0, -length / 2, 0]} castShadow><capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 4, 10]} /><meshStandardMaterial color={color} roughness={1} /></mesh>;
}

// A reusable articulated character. Each forearm/shin is parented to its joint.
export default function Character({ position = [0, 0, 0], rotation = 0, shirt = '#ed795f', variant = 0,
  walking = false, swimming = false, waterLeaping = false, behavior = 'idle', motion, paused = false, goggles = false, pants, patterned = false, barefoot = false, avatar }) {
  const root = useRef(); const body = useRef(); const head = useRef(); const eyes = useRef();
  const joints = useRef({}); const time = useRef(variant * 1.73);
  const wasAir = useRef(false); const landing = useRef(0);
  const worldPosition = useRef(new Vector3()); const visitorPosition = useRef(new Vector3());
  const skin = ['#e9b48c', '#c68d65', '#f0c7a5', '#dba17d'][variant % 4];
  const hair = ['#382c28', '#4c3125', '#242832', '#67452f'][variant % 4];
  const shorts = pants || ['#365b70', '#a690b1', '#536c49', '#ede5d6'][variant % 4];
  const fabric = useMemo(() => pencilTexture(shirt, variant + 13), [shirt, variant]);
  useEffect(() => () => fabric.dispose(), [fabric]);
  const jointRef = key => value => { joints.current[key] = value; };
  const Skin = avatar ? avatarSkins[avatar] : null;
  useFrame(({ scene }, delta) => {
    if (paused || !body.current) return;
    const dt = Math.min(delta, 0.05); time.current += dt;
    const t = time.current;
    const air = !swimming && !waterLeaping && (motion?.current?.jumpsUsed > 0);
    const swimPose = swimming || waterLeaping;
    if (wasAir.current && !air) landing.current = 0.2;
    wasAir.current = air; landing.current = Math.max(0, landing.current - dt);
    const blend = 1 - Math.exp(-14 * dt);
    const phase = t * (swimming ? (walking ? 7 : 3.5) : 9);
    const gait = walking ? Math.sin(phase) : 0;
    const seated = behavior === 'sit' || behavior === 'build';
    const resting = behavior === 'rest';
    for (const side of [-1, 1]) {
      const tag = side === -1 ? 'L' : 'R';
      let hip = seated ? -1.25 : waterLeaping ? 0.08 * side : swimming ? gait * side * 0.25 : air ? -0.45 - side * 0.18 : gait * side * 0.52;
      let knee = seated ? 1.45 : waterLeaping ? 0.06 : swimming ? 0.3 + Math.max(0, -gait * side) * 0.4 : air ? 0.95 : Math.max(0, -gait * side) * 0.8;
      let shoulder = waterLeaping ? -2.8 : swimming ? -1.5 + Math.sin(phase + side * Math.PI / 2) * 1.6 : air ? -0.7 : -gait * side * 0.5;
      let elbow = waterLeaping ? -0.08 : swimming ? -0.7 - Math.sin(phase + side) * 0.55 : air ? -0.9 : -0.18 - Math.max(0, gait * side) * 0.35;
      let spread = side * -0.1;
      if (behavior === 'wave' && side === 1) { shoulder = -2.35; elbow = -0.35 + Math.sin(t * 4) * 0.4; spread = -0.35; }
      if (behavior === 'chat') { shoulder = -0.45 + Math.sin(t * 1.5 + side) * 0.22; elbow = -0.75 + Math.sin(t * 2 + side) * 0.3; }
      if (behavior === 'dive') { hip = 0; knee = 0.03; shoulder = -Math.PI; elbow = 0; spread = side * -0.03; }
      if (behavior === 'build') { shoulder = -0.85 + Math.sin(t * 2 + side) * 0.22; elbow = -0.6; }
      if (resting) { hip = 0; knee = side === 1 ? 0.45 : 0.1; shoulder = -2.6; elbow = -1.2; spread = -side * 0.65; }
      const targets = { [`hip${tag}`]: hip, [`knee${tag}`]: knee, [`arm${tag}`]: shoulder, [`elbow${tag}`]: elbow };
      Object.entries(targets).forEach(([key, angle]) => { const joint = joints.current[key]; if (joint) joint.rotation.x += (angle - joint.rotation.x) * blend; });
      joints.current[`arm${tag}`].rotation.z += (spread - joints.current[`arm${tag}`].rotation.z) * blend;
    }
    const squat = landing.current * 0.4;
    body.current.position.y = (seated ? -0.49 : 0) - squat + (walking && !swimming && !air ? Math.abs(gait) * 0.025 : Math.sin(t * 2) * 0.004);
    body.current.rotation.z = waterLeaping ? 0 : swimming ? Math.sin(phase) * 0.055 : walking ? gait * 0.018 : 0;
    let look = Math.sin(t * 0.65) * 0.1;
    if (!motion && !resting) {
      const explorer = scene.getObjectByName('student-explorer');
      if (explorer) {
        root.current.getWorldPosition(worldPosition.current); explorer.getWorldPosition(visitorPosition.current);
        if (worldPosition.current.distanceTo(visitorPosition.current) < 4) {
          const angle = Math.atan2(visitorPosition.current.x - worldPosition.current.x, visitorPosition.current.z - worldPosition.current.z) - rotation;
          look = Math.max(-0.55, Math.min(0.55, Math.atan2(Math.sin(angle), Math.cos(angle))));
        }
      }
    }
    head.current.rotation.y += (look - head.current.rotation.y) * blend;
    head.current.rotation.x = swimPose ? -0.32 : behavior === 'build' ? 0.25 : Math.sin(t * 1.2) * 0.025;
    eyes.current.scale.y = t % (4.2 + variant * 0.17) < 0.13 ? 0.12 : 1;
  });
  if (Skin) return <group ref={root} position={position} rotation={[0, rotation, 0]} userData={{ nonSolid: true }}>
    <Skin bodyRef={body} headRef={head} eyesRef={eyes} jointRef={jointRef} behavior={behavior} />
  </group>;
  return <group ref={root} position={position} rotation={[0, rotation, 0]} userData={{ nonSolid: true }}>
    <group ref={body}>
      <Ball position={[0, 1.055, 0]} scale={[1, 1.2, 0.68]} radius={0.255} color={shirt} map={fabric} />
      {patterned && Array.from({ length: 28 }, (_, i) => {
        const angle = i * 2.4, y = 0.89 + (i % 7) * 0.05;
        return <Ball key={i} position={[Math.sin(angle) * 0.22, y, Math.cos(angle) * 0.16]} radius={0.025} color={i % 3 ? '#183a88' : '#198653'} />;
      })}
      <Ball position={[0, 1.31, 0]} radius={0.085} color={skin} />
      {/* A small collar and shirt seam distinguish clothing from the skin. */}
      <mesh position={[0, 1.24, 0.145]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.075, 0.018, 5, 14, Math.PI]} /><meshStandardMaterial color="#f7e6c9" /></mesh>
      <Ball position={[0, 0.79, 0]} scale={[1.2, 0.65, 0.8]} radius={0.19} color={shorts} />
      <group ref={head} position={[0, 1.44, 0]}>
        <Ball scale={[1, 1.02, 0.93]} radius={0.265} color={skin} />
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.262, -0.025, 0]} scale={[0.65, 1, 0.7]} radius={0.07} color={skin} />)}
        <mesh position={[0, 0.06, -0.025]} castShadow><sphereGeometry args={[0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56]} /><meshStandardMaterial color={hair} roughness={1} /></mesh>
        {[-1, 0, 1].map(i => <Ball key={i} position={[i * 0.115, 0.15 - (i + 1) * 0.028, 0.19]} scale={[0.85, 0.55, 0.6]} radius={0.105} color={hair} />)}
        {variant % 3 === 1 && <Ball position={[0, 0.13, -0.3]} scale={[0.9, 1.3, 1]} radius={0.12} color={hair} />}
        <group ref={eyes} position={[0, 0.005, 0.24]}>
          {[-1, 1].map(side => <group key={side} position={[side * 0.095, 0, 0]}>
            <Ball scale={[0.7, 1, 0.42]} radius={0.037} color="#302b29" />
            <Ball position={[0.008, 0.009, 0.015]} radius={0.009} color="#fff9e9" />
          </group>)}
        </group>
        {goggles && <group position={[0, 0.005, 0.27]}>
          {[-1, 1].map(side => <mesh key={side} position={[side * 0.095, 0, 0]}><torusGeometry args={[0.064, 0.014, 6, 16]} /><meshStandardMaterial color="#d36383" /></mesh>)}
          <mesh><boxGeometry args={[0.07, 0.018, 0.018]} /><meshStandardMaterial color="#d36383" /></mesh>
        </group>}
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.16, -0.075, 0.21]} scale={[1, 0.48, 0.13]} radius={0.046} color="#d78f7d" />)}
        <Ball position={[0, -0.044, 0.248]} scale={[0.7, 0.8, 0.8]} radius={0.034} color={skin} />
        <mesh position={[0, -0.085, 0.239]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.052, 0.009, 5, 12, Math.PI]} /><meshStandardMaterial color="#845346" /></mesh>
      </group>
      {[-1, 1].map(side => {
        const tag = side === -1 ? 'L' : 'R';
        return <group key={side}>
          <group ref={jointRef(`hip${tag}`)} position={[side * 0.125, 0.71, 0]}>
            <Bone length={0.31} radius={0.095} color={shorts} />
            <group ref={jointRef(`knee${tag}`)} position={[0, -0.3, 0]}>
              <Ball radius={0.076} color={skin} /><Bone length={0.31} radius={0.066} color={skin} />
              <Ball position={[0, -0.345, 0.065]} scale={[0.9, 0.52, 1.5]} radius={0.13} color={barefoot ? skin : '#f1e6cd'} />
              {!barefoot && <Ball position={[0, -0.392, 0.07]} scale={[0.9, 0.16, 1.5]} radius={0.13} color="#485d62" />}
            </group>
          </group>
          <group ref={jointRef(`arm${tag}`)} position={[side * 0.255, 1.21, 0]} scale={[1, behavior === 'dive' ? 1.65 : 1, 1]}>
            <Bone length={0.17} radius={0.099} color={shirt} />
            <Bone length={0.26} radius={0.066} color={skin} />
            <group ref={jointRef(`elbow${tag}`)} position={[0, -0.25, 0]}>
              <Ball radius={0.066} color={skin} /><Bone length={0.23} radius={0.058} color={skin} />
              <Ball position={[0, -0.25, 0]} scale={[0.8, 1.2, 0.65]} radius={0.075} color={skin} />
              <Ball position={[-side * 0.045, -0.23, 0.025]} radius={0.03} color={skin} />
            </group>
          </group>
        </group>;
      })}
    </group>
  </group>;
}
