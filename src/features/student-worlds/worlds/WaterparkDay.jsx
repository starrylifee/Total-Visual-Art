import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Line } from '@react-three/drei';
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { pencilTexture } from '../materials';
import Character from '../Character';

function Solid({ position, size = [1, 1, 1], material, shape = 'box', args, rotation }) {
  return <mesh position={position} scale={size} material={material} rotation={rotation} castShadow receiveShadow userData={{ walkable: true }}>
    {shape === 'ball' ? <sphereGeometry args={args || [1, 16, 12]} /> : shape === 'cylinder' ? <cylinderGeometry args={args || [1, 1, 1, 24]} /> : <boxGeometry />}
    {shape === 'box' && <Edges color="#657265" />}
  </mesh>;
}

function noticeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const c = canvas.getContext('2d'); c.fillStyle = '#fffbe7'; c.fillRect(0, 0, 512, 256);
  c.strokeStyle = '#3475a7'; c.lineWidth = 10; c.strokeRect(5, 5, 502, 246);
  c.textAlign = 'center'; c.fillStyle = '#303d3d'; c.font = 'bold 65px "Malgun Gothic"'; c.fillText('안전주의', 256, 88);
  c.strokeStyle = '#bc433c'; c.lineWidth = 9; c.beginPath(); c.moveTo(256, 115); c.lineTo(194, 222); c.lineTo(318, 222); c.closePath(); c.stroke();
  c.font = 'bold 64px sans-serif'; c.fillText('!', 256, 210);
  const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
}

function SplashPlayer({ mats }) {
  const droplets = useRef();
  useFrame(({ clock }) => droplets.current.children.forEach((drop, i) => {
    const t = (clock.elapsedTime * 0.75 + i / 9) % 1;
    drop.position.set(-0.7 - t * 3.2, 1.15 + t * 1.1 - t * t * 2, 5.8);
    drop.scale.setScalar(Math.sin(t * Math.PI) * 0.08);
  }));
  return <group userData={{ nonSolid: true }}>
    <group position={[0, -0.65, 6]} scale={1.65}><Character shirt="#dc689e" pants="#73529d" variant={1} behavior="chat" barefoot /></group>
    <Solid position={[-0.85, 1.14, 5.85]} size={[0.72, 0.23, 0.25]} material={mats.blue} />
    <Solid position={[-0.65, 0.95, 5.85]} size={[0.12, 0.4, 0.14]} material={mats.green} />
    <group ref={droplets}>{Array.from({ length: 9 }, (_, i) => <mesh key={i}><sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial color="#65b6dc" /></mesh>)}</group>
  </group>;
}

export default function WaterparkDay() {
  const mats = useMemo(() => Object.fromEntries(Object.entries({ grass: '#a9bd78', water: '#73b3d5', red: '#da6977', green: '#599d4c', yellow: '#edcf73', paper: '#f5edd7', blue: '#538cb9', wood: '#da9b60', black: '#354143' }).map(([k, color], i) => {
    const map = pencilTexture(color, 80 + i); if (k === 'grass' || k === 'water') map.repeat.set(10, 10);
    return [k, new MeshStandardMaterial({ map, roughness: 1 })];
  })), []);
  const sign = useMemo(noticeTexture, []);
  useEffect(() => () => { Object.values(mats).forEach(m => { m.map.dispose(); m.dispose(); }); sign.dispose(); }, [mats, sign]);
  return <group>
    <Solid position={[0, -0.3, -41]} size={[180, 0.6, 80]} material={mats.grass} />
    <mesh position={[0, -0.07, 39]} rotation={[-Math.PI / 2, 0, 0]} material={mats.water} userData={{ nonSolid: true }} receiveShadow><planeGeometry args={[180, 80]} /></mesh>
    {Array.from({ length: 16 }, (_, i) => i * 2 - 15).filter(x => Math.abs(x) > 2).map(x => <group key={x}>
      <Solid position={[x, 0.48, -1.35]} size={[0.27, 1, 0.27]} shape="cylinder" material={mats.wood} />
      {x !== -3 && x < 15 && <Line points={[[x, 0.86, -1.35], [x + 1, 0.52, -1.35], [x + 2, 0.86, -1.35]]} color="#ba5457" lineWidth={4} />}
    </group>)}
    <mesh position={[5.9, 0.73, -1.22]}><boxGeometry args={[2, 1, 0.06]} /><meshStandardMaterial map={sign} /></mesh>
    <mesh position={[0, -0.43, 0]} rotation={[Math.atan2(0.85, 2), 0, 0]} material={mats.grass} userData={{ nonSolid: true }}><boxGeometry args={[3.6, 0.02, Math.hypot(2, 0.85)]} /></mesh>
    {/* Original left-side green mattress and watermelon-shaped float. */}
    <Solid position={[-10, 0.08, 10]} size={[3.3, 0.35, 6]} material={mats.green} />
    <group position={[-10, 0.7, 9]} rotation={[-Math.PI / 2, 0, -0.15]} scale={1.5}><Character shirt="#f1d565" pants="#f1d565" variant={0} barefoot /></group>
    <group position={[-7.3, 0.12, 4]} rotation={[0, 0.2, 0]}>
      <Solid shape="cylinder" args={[2.9, 2.9, 0.42, 36, 1, false, Math.PI / 2, Math.PI]} material={mats.green} />
      <Solid position={[0, 0.25, 0]} shape="cylinder" args={[2.66, 2.66, 0.1, 36, 1, false, Math.PI / 2, Math.PI]} material={mats.red} />
      {[-1.5, -0.6, 0.4, 1.4].map((z, i) => <Solid key={z} position={[-1.25 - (i % 2) * 0.4, 0.32, z]} size={[0.07, 0.025, 0.14]} shape="ball" material={mats.black} />)}
      <group position={[-1, 0.37, 0]} scale={1.55}><Character shirt="#6b9ccc" pants="#6b9ccc" variant={3} behavior="sit" barefoot /></group>
    </group>
    <SplashPlayer mats={mats} />
    {/* Added shallow access steps make the original floats explorable. */}
    {[[-10, 16, 0.45], [8, 16, 0.45], [-9, 8, 0.4]].map(([x, z, spacing]) => <group key={x}>{Array.from({ length: 8 }, (_, i) => <Solid key={i} position={[x, -0.775 + i * 0.15, z - i * spacing]} size={[0.95, 0.15, spacing + 0.04]} material={mats.paper} />)}</group>)}
    <group position={[8, 0.2, 11]} rotation={[-Math.PI / 2, 0, -0.2]}>
      {[0, 1, 2, 3].map(i => <mesh key={i} material={i % 2 ? mats.paper : mats.red} rotation={[0, 0, i * Math.PI / 2]} castShadow userData={{ walkable: true }}><torusGeometry args={[1.65, 0.4, 12, 20, Math.PI / 2]} /></mesh>)}
    </group>
    <group position={[6.8, 0.65, 4.5]} userData={{ nonSolid: true }}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} material={[mats.red, mats.paper, mats.blue, mats.yellow][i % 4]}><sphereGeometry args={[0.77, 8, 14, i * Math.PI / 3, Math.PI / 3]} /></mesh>)}
    </group>
    {/* Right-side picnic: striped mat, melon, bowls, chopsticks and blue sunhat. */}
    <group position={[7, 0, -8]} rotation={[0, -0.15, 0]}>
      <Solid position={[0, 0.025, 0]} size={[9, 0.05, 7]} material={mats.paper} />
      {[-4, -2, 0, 2, 4].map(x => <Solid key={x} position={[x, 0.058, 0]} size={[0.08, 0.02, 7]} material={mats.yellow} />)}
      <Solid position={[-2, 0.85, -1]} size={[0.95, 1, 0.95]} shape="ball" material={mats.green} />
      {[-0.65, -0.25, 0.25, 0.65].map(x => <mesh key={x} position={[-2 + x, 0.85, -1]} rotation={[0, 0, 0.12]}><torusGeometry args={[Math.sqrt(1 - x * x), 0.035, 5, 30]} /><meshStandardMaterial color="#d6e69a" /></mesh>)}
      <Solid position={[-3, 0.18, 1.6]} shape="cylinder" args={[0.9, 0.9, 0.22, 20, 1, false, 0, Math.PI]} material={mats.red} />
      {[-1, 1].map(x => <group key={x} position={[x * 1.3, 0.17, 1.4]}><Solid size={[0.55, 0.2, 0.55]} shape="cylinder" material={mats.blue} /><Solid position={[0, 0.11, 0]} size={[0.44, 0.025, 0.44]} shape="cylinder" material={mats.red} /></group>)}
      {[-0.1, 0.1].map(x => <Solid key={x} position={[x + 0.6, 0.09, 2.5]} size={[0.04, 0.05, 1]} material={mats.red} />)}
      <group position={[2.5, 0.08, -0.5]} scale={1.65}><Character shirt="#9fc8e1" pants="#699bc5" variant={2} behavior="sit" goggles barefoot /><group position={[0, 1.22, 0]}><Solid size={[0.48, 0.06, 0.48]} shape="cylinder" material={mats.blue} /><Solid position={[0, 0.13, 0]} size={[0.29, 0.22, 0.29]} shape="ball" material={mats.blue} /></group></group>
    </group>
    <group position={[-8, 0.03, -13]}>{[-2, -1, 0, 1, 2].map(i => <Solid key={i} position={[0, 0, i * 0.65]} size={[10, 0.04, 0.65]} material={i % 2 ? mats.paper : mats.red} />)}</group>
    {[[-4, -8, mats.blue], [12, -4, mats.red]].map(([x, z, mat]) => <group key={x}>{[-0.3, 0.3].map(dx => <Solid key={dx} position={[x + dx, 0.13, z]} size={[0.38, 0.22, 0.7]} material={mat} />)}</group>)}
    {/* Small cat and bird visible on the original grass. */}
    <group position={[-6, 0, -4]} userData={{ nonSolid: true }}>
      <Solid position={[0, 0.42, 0]} size={[0.42, 0.45, 0.3]} shape="ball" material={mats.paper} />
      <Solid position={[0, 0.95, 0.08]} size={[0.5, 0.4, 0.3]} shape="ball" material={mats.paper} />
      {[-1, 1].map(s => <group key={s}><Solid position={[s * 0.33, 1.28, 0.05]} shape="cylinder" args={[0, 0.2, 0.4, 3]} material={mats.paper} /><Solid position={[s * 0.18, 0.98, 0.36]} size={[0.03, 0.045, 0.025]} shape="ball" material={mats.black} /></group>)}
      <Line points={[[0.3, 0.3, 0], [0.7, 0.45, 0], [0.8, 0.7, 0]]} color="#ece6d3" lineWidth={8} />
    </group>
    <group position={[-12, 0.5, -7]} userData={{ nonSolid: true }}><Solid size={[0.5, 0.35, 0.3]} shape="ball" material={mats.blue} /><Solid position={[-0.35, 0.32, 0]} size={[0.25, 0.3, 0.25]} shape="ball" material={mats.blue} />{[-0.2, 0.2].map(x => <Solid key={x} position={[x, -0.3, 0]} size={[0.04, 0.5, 0.04]} material={mats.blue} />)}</group>
  </group>;
}
