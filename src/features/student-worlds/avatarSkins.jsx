import React, { useEffect, useMemo } from 'react';
import { Path, Shape, Vector2 } from 'three';
import { armBandTexture, emblemTexture, hoodTexture, leafTexture, rainbowHairTexture, ribbonTexture } from './materials';

// Mascot bodies that share the Character animation rig. Every skin must attach the same refs:
// bodyRef, headRef, eyesRef and the eight joints hipL/R, kneeL/R, armL/R, elbowL/R.
// Joint groups get their rotation overwritten every frame, so fixed poses live in an inner group.

function Ball({ position, scale = [1, 1, 1], radius = 0.1, color, roughness = 0.75, rotation, emissive, emissiveIntensity = 0, segments = [18, 14], map, emissiveMap }) {
  return <mesh position={position} scale={scale} rotation={rotation} castShadow><sphereGeometry args={[radius, segments[0], segments[1]]} /><meshStandardMaterial color={color} map={map} roughness={roughness} emissive={emissive || '#000000'} emissiveMap={emissiveMap} emissiveIntensity={emissiveIntensity} /></mesh>;
}
// A capsule hanging down from the group origin; `length` is the total height including both round caps.
function Bone({ length, radius, color, roughness = 0.75, map }) {
  return <mesh position={[0, -length / 2, 0]} castShadow><capsuleGeometry args={[radius, Math.max(0.01, length - radius * 2), 4, 12]} /><meshStandardMaterial color={color} map={map} roughness={roughness} /></mesh>;
}
// A textured strip that hugs a cylinder wall (theta 0 = +z). width/height in world units.
function CylPatch({ radius, width, height, angle = 0, position, map }) {
  const arc = width / radius;
  return <mesh position={position}><cylinderGeometry args={[radius, radius, height, 16, 1, true, angle - arc / 2, arc]} /><meshStandardMaterial map={map} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
// A textured square that hugs a sphere, centred on +z and lifted `elevation` radians above the equator.
function SpherePatch({ radius, size, elevation = 0, scale, position, map }) {
  const half = size / 2 / radius;
  return <mesh position={position} scale={scale}><sphereGeometry args={[radius, 16, 12, Math.PI / 2 - half, half * 2, Math.PI / 2 - elevation - half, half * 2]} /><meshStandardMaterial map={map} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
function useTexture(factory) {
  const texture = useMemo(factory, [factory]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
function roundedRect(path, w, h, r) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
}
function starShape(outer, inner = outer * 0.46) {
  const shape = new Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer, a = Math.PI / 2 + i * Math.PI / 5;
    if (i) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return shape;
}
// A flat five-pointed star facing +z.
function Star({ position, size = 0.04, color = '#f2c94c', rotation }) {
  const shape = useMemo(() => starShape(size), [size]);
  return <mesh position={position} rotation={rotation}><extrudeGeometry args={[shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 }]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>;
}

// 신곰: a stocky brown bear with a low green drum cap, a kindness armband and a yellow ribbon.
// Head and body are almost the same width, the face is flat and the legs are two short lumps.
export function SingomSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const fur = '#a87550', earIn = '#8f6046', green = '#3a7a4e', greenDark = '#2f6641', ink = '#2a1a15';
  const emblem = useTexture(emblemTexture);
  const ribbon = useTexture(ribbonTexture);
  const armBand = useTexture(armBandTexture);
  return <group ref={bodyRef}>
    {/* Body: an upright capsule three quarters as wide as the head, slightly flattened front to back. */}
    <group position={[0, 0.46, 0]} scale={[1, 1, 0.85]}>
      <mesh castShadow><capsuleGeometry args={[0.38, 0.1, 8, 36]} /><meshStandardMaterial color={fur} roughness={0.75} /></mesh>
      <CylPatch radius={0.386} width={0.2} height={0.2} angle={0.42} position={[0, 0.04, 0]} map={ribbon} />
    </group>
    <group ref={headRef} position={[0, 1.0, 0]}>
      <Ball scale={[1, 0.88, 0.9]} radius={0.5} color={fur} segments={[36, 24]} />
      {[-1, 1].map(side => <group key={side} position={[side * 0.4, 0.25, -0.05]}>
        <Ball radius={0.12} color={fur} />
        <Ball position={[0, 0, 0.07]} scale={[1, 1, 0.5]} radius={0.055} color={earIn} />
      </group>)}
      <group ref={eyesRef} position={[0, 0.06, 0.43]}>
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.2, 0, 0]} scale={[1, 1.15, 0.4]} radius={0.036} color={ink} roughness={0.8} />)}
      </group>
      <Ball position={[0, -0.03, 0.443]} scale={[1.4, 0.9, 0.5]} radius={0.049} color={ink} roughness={0.3} />
      <mesh position={[0, -0.1, 0.443]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.054, 0.007, 5, 12, Math.PI]} /><meshStandardMaterial color={ink} /></mesh>
      {[-1, 1].map(side => <Ball key={side} position={[side * 0.3, -0.05, 0.34]} scale={[1, 1, 0.3]} radius={0.07} color="#f19ba6" />)}
      {/* Cap: a low drum narrower than the head with a thin all-round brim that covers the top of the ears. */}
      <group position={[0, 0.3, 0]}>
        <mesh position={[0, 0.085, 0]} castShadow><cylinderGeometry args={[0.34, 0.345, 0.17, 28]} /><meshStandardMaterial color={green} roughness={0.55} /></mesh>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.34, 0.34, 0.01, 28]} /><meshStandardMaterial color={greenDark} roughness={0.55} /></mesh>
        <mesh position={[0, -0.005, 0.05]} scale={[1, 1, 0.8]} castShadow><cylinderGeometry args={[0.47, 0.47, 0.022, 32]} /><meshStandardMaterial color={green} roughness={0.55} /></mesh>
        <CylPatch radius={0.349} width={0.14} height={0.14} position={[0, 0.085, 0]} map={emblem} />
      </group>
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        {/* Legs: one smooth lump per side, most of it hidden inside the body. */}
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.18, 0.28, 0]}>
          <Bone length={0.29} radius={0.145} color={fur} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.12, 0]}>
            <Ball position={[0, -0.02, 0.005]} radius={0.145} color={fur} />
          </group>
        </group>
        {/* Arms: equal-radius capsules so the elbow does not read as a seam; the right arm carries the band. */}
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.37, 0.63, 0]}>
          <Bone length={0.32} radius={0.105} color={fur} />
          {side === 1 && <mesh position={[0, -0.13, 0]} rotation={[0, side * 0.7, 0]}><cylinderGeometry args={[0.113, 0.113, 0.13, 24, 1, true, -Math.PI, Math.PI * 2]} /><meshStandardMaterial map={armBand} roughness={0.6} polygonOffset polygonOffsetFactor={-2} /></mesh>}
          <group ref={jointRef(`elbow${tag}`)} position={[0, -0.16, 0]}>
            <Bone length={0.18} radius={0.105} color={fur} />
          </group>
        </group>
      </group>;
    })}
  </group>;
}

// 신답: a green sprout with a glossy white face inside a hood, two big leaves growing from one stem.
export function SindapSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const green = '#6cb83c', leafColor = '#5fae35', stem = '#4a8f24', ink = '#3b322c';
  const leafLength = 0.8, leafWidth = 0.37;
  const emblem = useTexture(emblemTexture);
  const leafFactory = useMemo(() => () => leafTexture(leafWidth + 0.06, leafLength + 0.06), [leafWidth, leafLength]);
  const leafMap = useTexture(leafFactory);
  const hood = useMemo(() => hoodTexture(green), [green]);
  useEffect(() => () => { hood.map.dispose(); hood.emissiveMap.dispose(); }, [hood]);
  const leafShape = useMemo(() => {
    const shape = new Shape(), w = leafWidth * 0.68;
    shape.moveTo(0, 0);
    shape.bezierCurveTo(-w, leafLength * 0.12, -w * 1.04, leafLength * 0.6, 0, leafLength);
    shape.bezierCurveTo(w * 1.04, leafLength * 0.6, w, leafLength * 0.12, 0, 0);
    return shape;
  }, [leafLength, leafWidth]);
  return <group ref={bodyRef}>
    <Ball position={[0, 0.5, 0]} scale={[1, 1.05, 0.85]} radius={0.29} color={green} />
    <SpherePatch radius={0.294} size={0.27} elevation={0.2} scale={[1, 1.05, 0.85]} position={[0, 0.5, 0]} map={emblem} />
    <group ref={headRef} position={[0, 1.12, 0]}>
      {/* Hood with the white face window painted into its texture: flush with the surface (no flange,
          no polygon intersection) and lit up by an emissive map so it reads as pure white. */}
      <Ball scale={[1, 0.95, 0.9]} radius={0.44} color="#ffffff" map={hood.map} emissive="#ffffff" emissiveMap={hood.emissiveMap} emissiveIntensity={0.22} roughness={0.35} segments={[36, 24]} />
      <group ref={eyesRef} position={[0, -0.075, 0.385]}>
        {[-1, 1].map(side => <Ball key={side} position={[side * 0.12, 0, 0]} scale={[1.5, 1, 0.5]} radius={0.025} color={ink} roughness={0.3} />)}
      </group>
      <Ball position={[0, -0.095, 0.393]} scale={[1, 1, 0.5]} radius={0.017} color={ink} roughness={0.3} />
      {/* Stem on the crown and two leaves in a V, tilted a little backwards. */}
      <group position={[0, 0.39, -0.04]}>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.03, 0.045, 0.1, 10]} /><meshStandardMaterial color={stem} roughness={0.7} /></mesh>
        {[-1, 1].map(side => <group key={side} position={[side * 0.01, 0.06, 0]} rotation={[-0.35, side * 0.3, -side * 0.62]}>
          <mesh position={[0, 0, -0.03]} castShadow>
            <extrudeGeometry args={[leafShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3 }]} />
            <meshStandardMaterial attach="material-0" map={leafMap} roughness={0.6} />
            <meshStandardMaterial attach="material-1" color={leafColor} roughness={0.6} />
          </mesh>
        </group>)}
      </group>
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.13, 0.24, 0]}>
          <Bone length={0.12} radius={0.1} color={green} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.1, 0]}>
            <Bone length={0.08} radius={0.1} color={green} />
            <Ball position={[0, -0.05, 0.03]} scale={[1.05, 0.75, 1.25]} radius={0.14} color="#ffffff" roughness={0.45} />
          </group>
        </group>
        {/* Arms flare outwards at 45 degrees; the inner group holds that pose so the rig can still swing them. */}
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.22, 0.6, 0]}>
          <group rotation={[0, 0, side * 0.55]}>
            <Bone length={0.13} radius={0.085} color={green} />
            <group ref={jointRef(`elbow${tag}`)} position={[0, -0.1, 0]}>
              <Bone length={0.1} radius={0.08} color={green} />
              <Ball position={[0, -0.08, 0]} radius={0.1} color="#ffffff" roughness={0.45} />
            </group>
          </group>
        </group>
      </group>;
    })}
  </group>;
}

// 용석핑: a chibi girl with a huge head, thick rounded-square glasses, a star tiara, white horns,
// a pink bob with scalloped bangs and long rainbow hair flowing down behind.
export function YongseokpingSkin({ bodyRef, headRef, eyesRef, jointRef }) {
  const skin = '#f4d4c2', hair = '#d9667c', top = '#e9a1b7', skirt = '#f5c3d5', frill = '#fbe6ee', ink = '#1f1b1b', brow = '#6b4a3e', horn = '#f7efe8';
  const rainbow = useTexture(rainbowHairTexture);
  const lensShape = useMemo(() => {
    const shape = new Shape(); roundedRect(shape, 0.25, 0.2, 0.07);
    const hole = new Path(); roundedRect(hole, 0.21, 0.16, 0.055); shape.holes.push(hole);
    return shape;
  }, []);
  // Tiara band: a circle lying on the hair dome (centre [0,0.04,-0.02], r 0.465), tilted 0.6 rad backwards.
  const tilt = 0.6, bandR = 0.355, bandCenter = [0, 0.04 + 0.3 * Math.cos(tilt), -0.02 - 0.3 * Math.sin(tilt)];
  const bandPoint = (phi, lift) => [Math.cos(phi) * (bandR + lift), bandCenter[1] + Math.sin(phi) * (bandR + lift) * Math.sin(tilt), bandCenter[2] + Math.sin(phi) * (bandR + lift) * Math.cos(tilt)];
  const bangs = [-0.27, -0.18, -0.09, 0, 0.09, 0.18, 0.27];
  // Lathe profile for one rainbow strand: narrow bottom, widest just under the bob, rounded top.
  const strand = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; points.push(new Vector2(0.045 + 0.115 * Math.pow(t, 0.8), t * 0.6)); }
    for (let i = 1; i <= 4; i++) { const a = i / 4 * Math.PI / 2; points.push(new Vector2(0.16 * Math.cos(a), 0.6 + 0.09 * Math.sin(a))); }
    return points;
  }, []);
  return <group ref={bodyRef}>
    <Ball position={[0, 0.62, 0]} scale={[1, 0.9, 0.85]} radius={0.24} color={top} roughness={0.8} />
    <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.2, 0.42, 0.3, 24]} /><meshStandardMaterial color={skirt} roughness={0.8} /></mesh>
    <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.42, 0.4, 0.06, 24]} /><meshStandardMaterial color={frill} roughness={0.8} /></mesh>
    <Star position={[0, 0.53, 0.27]} size={0.05} rotation={[-0.3, 0, 0.2]} />
    <Star position={[-0.1, 0.38, 0.34]} size={0.04} rotation={[-0.5, 0, 0.3]} />
    <group ref={headRef} position={[0, 1.1, 0]}>
      <Ball scale={[1, 0.95, 0.93]} radius={0.44} color={skin} roughness={0.6} />
      {/* Bob: a dome on top plus a lower band around the sides and back that leaves the face open. */}
      <mesh position={[0, 0.04, -0.02]} castShadow><sphereGeometry args={[0.465, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.33]} /><meshStandardMaterial color={hair} roughness={0.7} /></mesh>
      <mesh position={[0, 0.04, -0.02]} castShadow><sphereGeometry args={[0.465, 24, 10, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24, Math.PI * 0.3, Math.PI * 0.37]} /><meshStandardMaterial color={hair} roughness={0.7} /></mesh>
      {bangs.map((x, i) => {
        const theta = Math.asin(Math.min(1, Math.abs(x) / 0.353));
        return <Ball key={i} position={[x, 0.27 - (i % 2) * 0.012, 0.353 * 0.93 * Math.cos(theta) + 0.035]} scale={[1, 1.1, 0.55]} radius={0.07} color={hair} roughness={0.7} />;
      })}
      {/* Rainbow hair: two smooth tapered strands per side, tucked under the bob, flaring out at the bottom
          and ending in a purple curl. */}
      {[-1, 1].map(side => <group key={side}>
        <mesh position={[side * 0.38, -0.72, -0.2]} rotation={[0, 0, side * 0.2]} castShadow><latheGeometry args={[strand, 16]} /><meshStandardMaterial map={rainbow} roughness={0.65} /></mesh>
        <mesh position={[side * 0.5, -0.64, -0.03]} rotation={[0, 0, side * 0.35]} scale={[0.8, 0.85, 0.8]} castShadow><latheGeometry args={[strand, 16]} /><meshStandardMaterial map={rainbow} roughness={0.65} /></mesh>
        <mesh position={[side * 0.445, -0.745, -0.18]} rotation={[0, 0, side * 1.2]}><capsuleGeometry args={[0.045, 0.06, 4, 10]} /><meshStandardMaterial color="#a685d6" roughness={0.65} /></mesh>
      </group>)}
      {/* White horns rising from the top corners, curving a little outwards. */}
      {[-1, 1].map(side => <group key={side} position={[side * 0.3, 0.33, -0.02]} rotation={[0.05, 0, -side * 0.22]}>
        <mesh position={[0, 0.11, 0]} castShadow><cylinderGeometry args={[0.04, 0.09, 0.22, 12]} /><meshStandardMaterial color={horn} roughness={0.5} /></mesh>
        <group position={[0, 0.22, 0]} rotation={[0, 0, -side * 0.4]}>
          <mesh position={[0, 0.07, 0]}><coneGeometry args={[0.041, 0.15, 12]} /><meshStandardMaterial color={horn} roughness={0.5} /></mesh>
        </group>
      </group>)}
      {/* Gold tiara: a band hugging the dome with three stars standing on its front. */}
      <mesh position={bandCenter} rotation={[-Math.PI / 2 - tilt, 0, Math.PI]}><torusGeometry args={[bandR, 0.024, 6, 32, Math.PI]} /><meshStandardMaterial color="#f2c94c" roughness={0.4} /></mesh>
      <Star position={bandPoint(Math.PI / 2, 0.03)} size={0.085} rotation={[-0.45, 0, 0]} />
      {[-1, 1].map(side => <Star key={side} position={bandPoint(Math.PI / 2 - side * 0.5, 0.025)} size={0.055} rotation={[-0.45, 0, -side * 0.35]} />)}
      <Star position={[0, 0.14, 0.42]} size={0.035} />
      {/* Eyes behind the glasses, thick brows above them. */}
      <group ref={eyesRef} position={[0, -0.04, 0.395]}>
        {[-1, 1].map(side => <group key={side} position={[side * 0.16, 0, 0]}>
          <Ball scale={[1, 1.2, 0.4]} radius={0.075} color="#7a5ea3" roughness={0.3} />
          <Ball position={[side * 0.024, 0.032, 0.028]} radius={0.021} color="#ffffff" roughness={0.2} />
        </group>)}
      </group>
      {[-1, 1].map(side => <mesh key={side} position={[side * 0.16, 0.1, 0.36]} rotation={[0, -side * 0.55, Math.PI / 2 + side * 0.12]}><capsuleGeometry args={[0.02, 0.1, 4, 8]} /><meshStandardMaterial color={brow} roughness={0.6} /></mesh>)}
      {/* Thick black rounded-square frames with temples running back along the head. */}
      <group position={[0, -0.03, 0.43]}>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.16, 0, 0]}><extrudeGeometry args={[lensShape, { depth: 0.022, bevelEnabled: false }]} /><meshStandardMaterial color={ink} roughness={0.4} /></mesh>)}
        <mesh position={[0, 0.02, 0.01]}><boxGeometry args={[0.07, 0.018, 0.018]} /><meshStandardMaterial color={ink} roughness={0.4} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * 0.316, 0.02, -0.06]} rotation={[0, -side * 0.55, 0]}><boxGeometry args={[0.016, 0.016, 0.14]} /><meshStandardMaterial color={ink} roughness={0.4} /></mesh>)}
      </group>
      {[-1, 1].map(side => <Ball key={side} position={[side * 0.28, -0.15, 0.29]} scale={[1, 0.75, 0.3]} radius={0.09} color="#f0a3ad" />)}
      <Ball position={[0, -0.09, 0.41]} scale={[1, 0.8, 0.6]} radius={0.026} color="#e9b8a4" />
      <mesh position={[0, -0.19, 0.362]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.045, 0.007, 5, 12, Math.PI]} /><meshStandardMaterial color="#b56a6a" /></mesh>
    </group>
    {[-1, 1].map(side => {
      const tag = side === -1 ? 'L' : 'R';
      return <group key={side}>
        <group ref={jointRef(`hip${tag}`)} position={[side * 0.11, 0.3, 0]}>
          <Bone length={0.16} radius={0.08} color={skin} />
          <group ref={jointRef(`knee${tag}`)} position={[0, -0.13, 0]}>
            <Bone length={0.12} radius={0.08} color={skin} />
            <Ball position={[0, -0.1, 0.02]} scale={[1, 0.7, 1.2]} radius={0.09} color={skin} />
          </group>
        </group>
        <group ref={jointRef(`arm${tag}`)} position={[side * 0.26, 0.74, 0]}>
          <Ball position={[0, -0.03, 0]} radius={0.1} color={top} roughness={0.8} />
          <Bone length={0.2} radius={0.07} color={skin} />
          <group ref={jointRef(`elbow${tag}`)} position={[0, -0.16, 0]}>
            {/* Forearms fold forward and inward so the hands meet at the chest around the little star. */}
            <group rotation={[-1.3, 0, -side * 0.7]}>
              <Bone length={0.12} radius={0.07} color={skin} />
              <Ball position={[0, -0.11, 0]} radius={0.085} color={skin} />
            </group>
          </group>
        </group>
      </group>;
    })}
  </group>;
}

export const avatarSkins = { singom: SingomSkin, sindap: SindapSkin, yongseokping: YongseokpingSkin };
export { avatarOptions } from './avatarCatalog.js';
