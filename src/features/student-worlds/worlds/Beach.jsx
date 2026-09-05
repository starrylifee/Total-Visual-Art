import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { pencilTexture, signTexture } from '../materials';
import Character from '../Character';

const colors = { sand: '#eddbb6', blue: '#208ec8', red: '#d9364c', yellow: '#f8ce30', green: '#87c13d', orange: '#f58e30', wood: '#ac7050', white: '#fff4dc', grey: '#77848c' };

function Solid({ position, scale = [1, 1, 1], material, shape = 'box', args, rotation, outline = true }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow material={material} userData={{ walkable: true }}>
    {shape === 'box' ? <boxGeometry args={args || [1, 1, 1]} /> : shape === 'sphere' ? <sphereGeometry args={args || [1, 16, 12]} /> : <cylinderGeometry args={args || [0.1, 0.1, 1, 10]} />}
    {outline && shape !== 'sphere' && <Edges threshold={28} color="#444644" />}
  </mesh>;
}

export const Person = Character;

function Ring({ position, rotation, materials }) {
  return <group position={position} rotation={rotation}>
    {[0, 1, 2, 3].map(i => <mesh key={i} rotation={[0, 0, i * Math.PI / 2]} material={i % 2 ? materials.yellow : materials.red} castShadow receiveShadow userData={{ walkable: true }}>
      <torusGeometry args={[1.14, 0.38, 10, 14, Math.PI / 2]} />
    </mesh>)}
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2 + 0.35) * 1.16, Math.sin(i * Math.PI / 2 + 0.35) * 1.16, 0.37]} rotation={[0, 0, i * Math.PI / 2 + 0.35]}>
      <torusGeometry args={[0.12, 0.025, 5, 10, Math.PI * 1.5]} /><meshStandardMaterial color="#464735" />
    </mesh>)}
  </group>;
}

function Ocean({ material, white }) {
  const waves = useRef();
  useFrame(({ clock }) => {
    waves.current.children.forEach((wave, i) => {
      wave.position.z = -8.5 - i * 2.8 + Math.sin(clock.elapsedTime * 0.55 + i) * 0.7;
      wave.scale.x = 1 + Math.sin(clock.elapsedTime * 0.4 + i) * 0.04;
    });
  });
  return <group userData={{ nonSolid: true }}>
    <Solid position={[0, -0.22, -40]} scale={[130, 0.3, 65]} material={material} outline={false} />
    <group ref={waves}>{Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[i % 2 ? 3 : -3, -0.035, -8.5 - i * 2.8]} rotation={[-Math.PI / 2, 0, 0]} material={white}>
      <planeGeometry args={[28 + i * 4, 0.07 + i * 0.015]} />
    </mesh>)}</group>
  </group>;
}

function Dolphin({ material }) {
  const ref = useRef();
  useFrame(({ clock }) => { ref.current.position.y = 0.8 + Math.sin(clock.elapsedTime * 0.75) * 0.5; });
  return <group ref={ref} position={[-8, 1, -15]} rotation={[0, 0, -0.25]} userData={{ nonSolid: true }}>
    <Solid shape="sphere" position={[0, 0, 0]} scale={[1.7, 0.55, 0.55]} material={material} />
    <Solid shape="sphere" position={[1.55, -0.05, 0]} scale={[0.7, 0.2, 0.24]} material={material} />
    <Solid shape="cylinder" args={[0, 0.45, 0.8, 3]} position={[0, 0.65, 0]} material={material} />
    <Solid shape="sphere" position={[-1.6, 0, 0]} scale={[0.4, 0.16, 0.85]} material={material} />
    <mesh position={[1, 0.16, 0.43]}><sphereGeometry args={[0.075, 8, 6]} /><meshBasicMaterial color="#292e30" /></mesh>
  </group>;
}

export default function Beach() {
  const materials = useMemo(() => Object.fromEntries(Object.entries(colors).map(([key, color], i) => {
    const map = pencilTexture(color, i + 1);
    if (key === 'sand') map.repeat.set(12, 12);
    if (key === 'blue') map.repeat.set(6, 6);
    return [key, new MeshStandardMaterial({ map, roughness: 1 })];
  })), []);
  const sign = useMemo(signTexture, []);
  useEffect(() => () => { Object.values(materials).forEach(m => { m.map.dispose(); m.dispose(); }); sign.dispose(); }, [materials, sign]);
  return <BeachObjects materials={materials} sign={sign} />;
}

function BeachObjects({ materials, sign }) {
  return <group>
    <>
      <Solid position={[0, -0.35, 41.5]} scale={[160, 0.6, 100]} material={materials.sand} outline={false} />
      {/* The rope marks the walkable edge; the surrounding sand keeps orbit views grounded. */}
      {[-14.7, 14.7].map(x => <group key={x}>
        {[-6, 0, 5, 10, 15.5].map(z => <Solid key={z} shape="cylinder" args={[0.07, 0.09, 0.85, 7]} position={[x, 0.42, z]} material={materials.wood} />)}
        <Solid shape="cylinder" args={[0.025, 0.025, 21.5, 6]} position={[x, 0.64, 4.75]} rotation={[Math.PI / 2, 0, 0]} material={materials.white} outline={false} />
      </group>)}
      {[-10, -5, 0, 5, 10].map(x => <Solid key={x} shape="cylinder" args={[0.07, 0.09, 0.85, 7]} position={[x, 0.42, 15.5]} material={materials.wood} />)}
      <Solid shape="cylinder" args={[0.025, 0.025, 29.4, 6]} position={[0, 0.64, 15.5]} rotation={[0, 0, Math.PI / 2]} material={materials.white} outline={false} />
      <Ocean material={materials.blue} white={materials.white} />
      <Dolphin material={materials.grey} />
      <Solid shape="sphere" position={[19, 17, -35]} scale={[5, 5, 1]} material={materials.red} />
      {[-22, -5, 10].map((x, i) => <group key={x} position={[x, 13 + i % 2 * 3, -30 - i * 6]}>
        {[0, 1, 2, 3].map(j => <Solid key={j} shape="sphere" position={[j * 1.3, Math.sin(j * 2) * 0.35, 0]} scale={[1.8, 0.8 + j % 2 * 0.4, 0.65]} material={materials.white} />)}
      </group>)}
      <group position={[7, 0, 0.1]}>
        <Solid shape="cylinder" args={[0.1, 0.13, 4.4, 10]} position={[0, 2.2, 0]} material={materials.orange} />
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 4.2, 0]} material={[materials.blue, materials.green, materials.orange, materials.blue][i % 4]} castShadow receiveShadow userData={{ walkable: true }}>
          <cylinderGeometry args={[0.06, 3.1, 1.15, 1, 1, true, i * Math.PI / 4, Math.PI / 4]} /><Edges color="#43514b" />
        </mesh>)}
      </group>
      <Ring position={[-1.8, 1.5, 2.2]} rotation={[-0.3, -0.3, -0.2]} materials={materials} />
      <Ring position={[-0.3, 0.45, 0.9]} rotation={[-Math.PI / 2, 0.1, 0.5]} materials={materials} />
      <group position={[-8, 0, 5]}>
        <Solid position={[0, 0.6, 0]} scale={[4.7, 1.2, 2.3]} material={materials.wood} />
        {[-2.25, 2.25].map(x => <Solid key={x} position={[x, 1.9, -0.85]} scale={[0.12, 3.8, 0.12]} material={materials.wood} />)}
        <mesh position={[0, 3.35, -0.75]} castShadow userData={{ walkable: true }}><boxGeometry args={[4.95, 1.1, 0.12]} /><meshStandardMaterial map={sign} roughness={1} /></mesh>
        {[-1.6, -0.55, 0.55, 1.6].map(x => <group key={x} position={[x, 2.12, -0.6]}>
          <Solid scale={[0.62, 0.83, 0.18]} material={materials.yellow} />
          <Solid position={[0, 0.13, 0.11]} scale={[0.09, 0.5, 0.05]} material={materials.wood} />
          <Solid position={[0, -0.13, 0.12]} scale={[0.62, 0.07, 0.04]} material={materials.grey} />
        </group>)}
      </group>
      <group position={[6, 0, 4.5]}>
        <Solid position={[0, 0.015, 0]} scale={[4.5, 0.06, 3.4]} material={materials.wood} />
        {[-1, 1].map(x => <Solid key={x} position={[x * 2.14, 0.052, 0]} scale={[0.12, 0.015, 3.4]} material={materials.white} outline={false} />)}
        {[[-1, 0.18, 0.6], [0.65, 0.18, -0.45]].map((p, i) => <group key={i} position={p}>
          <Solid shape="cylinder" args={[0.55, 0.48, 0.08, 20]} material={materials.white} />
          {[-0.2, 0.2].map(x => <Solid key={x} shape="sphere" position={[x, 0.1, 0]} scale={[0.14, 0.08, 0.17]} material={materials.red} />)}
        </group>)}
        <Solid shape="cylinder" args={[0.22, 0.17, 0.65, 12]} position={[1.2, 0.35, 0.65]} material={materials.blue} />
        <Solid shape="cylinder" args={[0.035, 0.035, 0.7, 8]} position={[1.2, 0.8, 0.65]} material={materials.white} />
      </group>
      <group position={[-10, 0, -4]}>
        <Solid position={[0, 0.35, 0]} scale={[2.4, 0.7, 1.9]} material={materials.yellow} />
        <Solid position={[0, 1, 0]} scale={[1.35, 0.9, 1.2]} material={materials.yellow} />
        {[-0.5, 0, 0.5].map(x => <Solid key={x} position={[x, 1.62, 0]} scale={[0.3, 0.35, 1.2]} material={materials.yellow} />)}
        <Solid position={[0, 1.9, 0]} scale={[0.06, 1.5, 0.06]} material={materials.wood} />
        <Solid position={[0.3, 2.45, 0]} scale={[0.6, 0.35, 0.04]} material={materials.blue} />
      </group>
      <Person position={[3.7, 0, 1.7]} shirt="#8ec1d1" rotation={0.3} variant={1} behavior="wave" />
      <Person position={[-7.8, 0, -3.8]} shirt="#eee7d7" rotation={-1.1} variant={2} behavior="build" />
      <Person position={[-10.9, 0, 7.3]} shirt="#e9d7cd" rotation={1.3} variant={3} behavior="chat" />
      <Person position={[-8.9, 0, 7.8]} shirt="#fff0d8" rotation={-0.8} variant={1} behavior="chat" />
      <Person position={[-7.3, 0, 7.5]} shirt="#d4e6c7" rotation={-1.2} variant={2} behavior="wave" />
      <Person position={[-9, 0, 3.4]} shirt="#ab8da9" rotation={0} variant={3} behavior="chat" />
      <Person position={[8.8, 0.06, 4.8]} shirt="#f2ddae" rotation={-1.4} variant={2} behavior="sit" />
      <group position={[-5, 0, -0.5]}>
        <Solid position={[0, 0.02, 0]} scale={[2.6, 0.07, 3.5]} material={materials.white} />
        <group position={[0, 0.34, 0.6]} rotation={[-Math.PI / 2, 0, 0]}><Person shirt="#f5eee0" variant={3} behavior="rest" /></group>
      </group>
      <group position={[12, 0.1, -24]} rotation={[0, -0.3, 0]}>
        <Solid scale={[3.5, 0.45, 1.8]} material={materials.green} />
        <Person position={[-0.6, 0.25, 0]} shirt="#f2ecdf" variant={1} behavior="sit" />
        <Ring position={[0.7, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} materials={materials} />
      </group>
    </>
  </group>;
}
