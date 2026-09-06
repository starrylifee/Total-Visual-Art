import React, { useEffect, useMemo } from 'react';
import { bandTexture, emblemTexture } from './materials';

// Mascot bodies that share the Character animation rig. Every skin must attach the same refs:
// bodyRef, headRef, eyesRef and the eight joints hipL/R, kneeL/R, armL/R, elbowL/R.

function Ball({ position, scale = [1, 1, 1], radius = 0.1, color, roughness = 0.75, rotation }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><sphereGeometry args={[radius, 18, 14]} /><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
}
function Bone({ length, radius, color, roughness = 0.75 }) {
  return <mesh position={[0, -length / 2, 0]} castShadow><capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 4, 12]} /><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
}
function Decal({ position, rotation, radius, map }) {
  return <mesh position={position} rotation={rotation}><circleGeometry args={[radius, 32]} /><meshStandardMaterial map={map} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
function useTexture(factory) {
  const texture = useMemo(factory, [factory]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// 신곰: a round brown bear with a green cap, a kindness armband and a yellow ribbon.
// Proportions follow the reference: head as tall as the body, stubby legs, no neck.
export function SingomSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const emblem = useTexture(emblemTexture);
  const band = useTexture(bandTexture);
  const fur = '#b0693d', furDark = '#8f5230', furLight = '#d39a6c', green = '#2d5f3c';
  return <group ref={bodyRef}>
    <Ball position={[0, 0.62, 0]} scale={[1, 1, 0.85]} radius={0.32} color={fur} />
    {/* Yellow awareness ribbon on the chest: a loop with two crossed tails. */}
    <group position={[-0.14, 0.7, 0.29]} rotation={[-0.15, 0, 0]}>
      <mesh position={[0, 0.05, 0]} scale={[0.7, 1, 0.4]}><torusGeometry args={[0.045, 0.012, 6, 16]} /><meshStandardMaterial color="#f5d433" /></mesh>
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, -0.4]}><boxGeometry args={[0.024, 0.14, 0.012]} /><meshStandardMaterial color="#f5d433" /></mesh>
      <mesh position={[0, -0.05, 0.004]} rotation={[0, 0, 0.4]}><boxGeometry args={[0.024, 0.14, 0.012]} /><meshStandardMaterial color="#f5d433" /></mesh>
    </group>
    <group ref={headRef} position={[0, 1.25, 0]}>
      <Ball scale={[1, 0.9, 0.92]} radius={0.46} color={fur} />
      <Ball position={[0, -0.1, 0.35]} scale={[1.2, 0.8, 0.6]} radius={0.15} color={fur} />
      {[-1, 1].map(side => <group key={side} position={[side * 0.38, 0.33, -0.02]}>
        <Ball radius={0.13} color={fur} />
        <Ball position={[0, 0, 0.07]} scale={[1, 1, 0.6]} radius={0.075} color={furLight} />
      </group>)}
      <group ref={eyesRef} position={[0, 0.03, 0.4]}>
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.15, 0, 0]} scale={[1, 1.1, 0.5]} radius={0.036} color="#2b211c" roughness={0.3} />)}
      </group>
      <Ball position={[0, -0.06, 0.45]} scale={[1.25, 0.8, 0.6]} radius={0.04} color="#3a2419" roughness={0.3} />
      <mesh position={[0, -0.12, 0.45]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.045, 0.008, 5, 12, Math.PI]} /><meshStandardMaterial color="#3a2419" /></mesh>
      {[-1, 1].map(side => <Ball key={side} position={[side * 0.27, -0.06, 0.34]} scale={[1, 0.8, 0.3]} radius={0.075} color="#f2a0a8" />)}
      {/* Green cap: crown, short brim in front and the emblem on the crown face. */}
      <group position={[0, 0.34, 0.02]} rotation={[0.1, 0, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow><cylinderGeometry args={[0.33, 0.35, 0.22, 28]} /><meshStandardMaterial color={green} roughness={0.7} /></mesh>
        <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.33, 0.33, 0.012, 28]} /><meshStandardMaterial color="#27523a" roughness={0.7} /></mesh>
        <mesh position={[0, -0.035, 0.13]} scale={[1, 1, 0.8]}><cylinderGeometry args={[0.41, 0.41, 0.03, 28]} /><meshStandardMaterial color={green} roughness={0.7} /></mesh>
        <Decal position={[0, 0.09, 0.352]} rotation={[-0.06, 0, 0]} radius={0.09} map={emblem} />
      </group>
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.15, 0.34, 0]}>
          <Bone length={0.2} radius={0.125} color={fur} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.15, 0]}>
            <Bone length={0.16} radius={0.125} color={fur} />
            <Ball position={[0, -0.1, 0.02]} scale={[1, 0.65, 1.15]} radius={0.13} color={fur} />
          </group>
        </group>
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.31, 0.8, 0]}>
          <Bone length={0.18} radius={0.1} color={fur} />
          {side === 1 && <mesh position={[0, -0.12, 0]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.107, 0.107, 0.08, 24, 1, true]} /><meshStandardMaterial map={band} roughness={0.6} /></mesh>}
          <group ref={jointRef(`elbow${tag}`)} position={[0, -0.16, 0]}>
            <Bone length={0.14} radius={0.1} color={fur} />
            <Ball position={[0, -0.14, 0]} radius={0.115} color={fur} />
          </group>
        </group>
      </group>;
    })}
  </group>;
}

// 신답: a green sprout with a white face inside a hood, two leaves on top and the emblem on its chest.
export function SindapSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const emblem = useTexture(emblemTexture);
  const green = '#6fbe3c', hood = '#5ba632', leaf = '#79c447', vein = '#4f9a2c', white = '#f7f7f2', ink = '#3a3128';
  return <group ref={bodyRef}>
    <Ball position={[0, 0.55, 0]} scale={[1, 1.05, 0.85]} radius={0.3} color={green} />
    <Decal position={[0, 0.56, 0.258]} rotation={[-0.05, 0, 0]} radius={0.1} map={emblem} />
    <group ref={headRef} position={[0, 1.2, 0]}>
      <Ball scale={[1, 0.95, 0.95]} radius={0.44} color={hood} />
      {/* The white face is a flat dome pushed in front of the hood, with a rounded green lip hiding the seam. */}
      <Ball position={[0, -0.02, 0.22]} scale={[0.9, 0.86, 0.5]} radius={0.42} color={white} roughness={0.55} />
      <mesh position={[0, -0.02, 0.21]} scale={[1, 0.96, 1]}><torusGeometry args={[0.375, 0.04, 10, 40]} /><meshStandardMaterial color={hood} roughness={0.75} /></mesh>
      <group ref={eyesRef} position={[0, -0.03, 0.425]}>
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.13, 0, 0]} scale={[1.6, 1, 0.5]} radius={0.028} color={ink} roughness={0.3} />)}
      </group>
      <Ball position={[0, -0.055, 0.43]} scale={[1, 1, 0.5]} radius={0.02} color={ink} roughness={0.3} />
      {/* Two leaves growing from the crown of the hood. */}
      {[-1, 1].map(side => <group key={side} position={[side * 0.06, 0.36, -0.03]} rotation={[-0.2, 0, -side * 0.62]}>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.02, 0.03, 0.08, 8]} /><meshStandardMaterial color={vein} /></mesh>
        <Ball position={[0, 0.3, 0]} scale={[0.46, 1, 0.16]} radius={0.27} color={leaf} roughness={0.6} />
        <mesh position={[0, 0.3, 0.035]}><boxGeometry args={[0.012, 0.44, 0.012]} /><meshStandardMaterial color={vein} /></mesh>
      </group>)}
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.13, 0.3, 0]}>
          <Bone length={0.16} radius={0.1} color={green} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.12, 0]}>
            <Bone length={0.12} radius={0.1} color={green} />
            <Ball position={[0, -0.1, 0.02]} scale={[1, 0.7, 1.2]} radius={0.12} color={white} roughness={0.55} />
          </group>
        </group>
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.28, 0.72, 0]}>
          <Bone length={0.16} radius={0.085} color={green} />
          <group ref={jointRef(`elbow${tag}`)} position={[0, -0.14, 0]}>
            <Bone length={0.12} radius={0.08} color={green} />
            <Ball position={[0, -0.13, 0]} radius={0.1} color={white} roughness={0.55} />
          </group>
        </group>
      </group>;
    })}
  </group>;
}

function Star({ position, size = 0.04, color = '#f5cf3a', rotation }) {
  return <mesh position={position} rotation={rotation}><octahedronGeometry args={[size, 0]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>;
}

// 용석핑: a chibi girl with pink hair, rainbow pigtails, black glasses, a star tiara and a pink dress.
export function YongseokpingSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const skin = '#f6d6c0', hair = '#e0627d', dress = '#f2a7c1', frill = '#fbe3ee', ink = '#2a2424';
  const rainbow = ['#e0627d', '#f0a05a', '#f2d24e', '#8fc76b', '#6fb2e6', '#a685d6'];
  return <group ref={bodyRef}>
    <Ball position={[0, 0.66, 0]} scale={[1, 0.9, 0.85]} radius={0.25} color={dress} />
    <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.2, 0.42, 0.3, 24]} /><meshStandardMaterial color={dress} roughness={0.8} /></mesh>
    <mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.42, 0.4, 0.06, 24]} /><meshStandardMaterial color={frill} roughness={0.8} /></mesh>
    <Star position={[0.05, 0.7, 0.24]} size={0.035} />
    <group ref={headRef} position={[0, 1.22, 0]}>
      <Ball scale={[1, 0.95, 0.93]} radius={0.44} color={skin} roughness={0.6} />
      {/* Hair cap and bangs. */}
      <mesh position={[0, 0.06, -0.02]} castShadow><sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color={hair} roughness={0.7} /></mesh>
      {[-2, -1, 0, 1, 2].map(i => <Ball key={i} position={[i * 0.15, 0.3 - Math.abs(i) * 0.03, 0.29 + (2 - Math.abs(i)) * 0.03]} scale={[1, 1.1, 0.7]} radius={0.11} color={hair} roughness={0.7} />)}
      {/* Rainbow pigtails hanging down at both sides. */}
      {[-1, 1].map(side => <group key={side} position={[side * 0.42, -0.05, -0.08]}>
        {rainbow.map((color, i) => <Ball key={i} position={[side * (0.02 + i * 0.03), -i * 0.14, -i * 0.02]} scale={[1, 1.2, 1]} radius={0.12 - i * 0.008} color={color} roughness={0.65} />)}
      </group>)}
      {/* White horn-like ears. */}
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.36, 0.3, -0.02]} rotation={[0.15, 0, -side * 0.85]}><coneGeometry args={[0.08, 0.32, 12]} /><meshStandardMaterial color="#fbfaf6" roughness={0.5} /></mesh>)}
      {/* Tiara with three stars and a star on the forehead. */}
      <mesh position={[0, 0.3, 0.27]} rotation={[-0.55, 0, 0]}><torusGeometry args={[0.2, 0.014, 6, 24, Math.PI]} /><meshStandardMaterial color="#f5cf3a" roughness={0.4} /></mesh>
      <Star position={[0, 0.45, 0.27]} size={0.055} rotation={[0, 0, 0.3]} />
      {[-1, 1].map(side => <Star key={side} position={[side * 0.16, 0.39, 0.27]} size={0.04} rotation={[0, 0, -side * 0.3]} />)}
      <Star position={[0, 0.12, 0.42]} size={0.03} />
      {/* Glasses and big violet eyes. */}
      <group ref={eyesRef} position={[0, -0.04, 0.405]}>
        {[-1, 1].map(side => <group key={side} position={[side * 0.15, 0, 0]}>
          <Ball scale={[1, 1.15, 0.45]} radius={0.062} color="#7c5aa6" roughness={0.3} />
          <Ball position={[side * 0.02, 0.028, 0.028]} radius={0.016} color="#ffffff" roughness={0.2} />
        </group>)}
      </group>
      <group position={[0, -0.03, 0.435]}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.15, 0, 0]}><torusGeometry args={[0.1, 0.014, 6, 24]} /><meshStandardMaterial color={ink} roughness={0.4} /></mesh>)}
        <mesh><boxGeometry args={[0.1, 0.014, 0.014]} /><meshStandardMaterial color={ink} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.31, 0.01, -0.12]} rotation={[0, side * 0.2, 0]}><boxGeometry args={[0.014, 0.014, 0.26]} /><meshStandardMaterial color={ink} /></mesh>)}
      </group>
      {[-1, 1].map(side => <Ball key={side} position={[side * 0.27, -0.13, 0.31]} scale={[1, 0.75, 0.3]} radius={0.07} color="#f5aeb7" />)}
      <Ball position={[0, -0.1, 0.42]} scale={[1, 0.8, 0.6]} radius={0.028} color="#e9b8a4" />
      <mesh position={[0, -0.18, 0.4]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.04, 0.007, 5, 12, Math.PI]} /><meshStandardMaterial color="#b56a6a" /></mesh>
      {[-1, 1].map(side => <Star key={side} position={[side * 0.43, -0.12, 0.05]} size={0.03} />)}
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.12, 0.3, 0]}>
          <Bone length={0.16} radius={0.09} color={skin} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.13, 0]}>
            <Bone length={0.12} radius={0.09} color={skin} />
            <Ball position={[0, -0.1, 0.02]} scale={[1, 0.7, 1.2]} radius={0.1} color={skin} />
          </group>
        </group>
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.26, 0.8, 0]}>
          <Bone length={0.14} radius={0.095} color={dress} />
          <Bone length={0.2} radius={0.075} color={skin} />
          <group ref={jointRef(`elbow${tag}`)} position={[0, -0.16, 0]}>
            <Bone length={0.12} radius={0.075} color={skin} />
            <Ball position={[0, -0.13, 0]} radius={0.09} color={skin} />
          </group>
        </group>
      </group>;
    })}
  </group>;
}

export const avatarSkins = { singom: SingomSkin, sindap: SindapSkin, yongseokping: YongseokpingSkin };
export { avatarOptions } from './avatarCatalog.js';
