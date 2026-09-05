import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import Person from './Character';
import { DEFAULT_PITCH, clampPitch, movementVector } from './movement';
import { spawnCharacter, stepCharacter } from './platformPhysics';
import { createSurfaceSampler } from './platformSurfaces';

function Explorer({ controls, onPosition, onReady, paused, config }) {
  const ref = useRef();
  const player = useRef(spawnCharacter(config.spawn));
  const surfaces = useRef(() => []);
  const groundMarker = useRef();
  const swimmerBody = useRef();
  const swimRef = useRef(false);
  const leapRef = useRef(false);
  const swimTime = useRef(0);
  const [swimming, setSwimming] = useState(false);
  const [waterLeaping, setWaterLeaping] = useState(false);
  const reset = useRef(controls.current.reset);
  const elapsed = useRef(0);
  const movingRef = useRef(false);
  const [walking, setWalking] = useState(false);
  const cameraTarget = useMemo(() => new Vector3(), []);
  const cameraPosition = useMemo(() => new Vector3(), []);
  const { camera, gl, scene } = useThree();
  useEffect(() => { controls.current.yaw = config.spawn.yaw || 0; }, [config, controls]);
  useEffect(() => { surfaces.current = createSurfaceSampler(scene); onReady(); }, [onReady, scene]);
  useEffect(() => {
    const canvas = gl.domElement;
    let drag = null;
    const down = e => { if (e.button !== 0 || paused) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
    const move = e => {
      if (!drag || drag.id !== e.pointerId || paused) return;
      controls.current.yaw -= (e.clientX - drag.x) * 0.006;
      controls.current.pitch = clampPitch(controls.current.pitch + (e.clientY - drag.y) * 0.004);
      drag.x = e.clientX; drag.y = e.clientY;
    };
    const up = () => { drag = null; };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    return () => { canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('lostpointercapture', up); };
  }, [gl, controls, paused]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const c = controls.current;
    const keys = new Set([...c.keys, ...c.touch.values()]);
    if (paused) keys.clear();
    if (reset.current !== c.reset) {
      player.current = spawnCharacter(config.spawn); reset.current = c.reset;
      ref.current.rotation.y = Math.PI + (config.spawn.yaw || 0); c.yaw = config.spawn.yaw || 0; c.pitch = DEFAULT_PITCH;
      c.jumpQueued = false;
      leapRef.current = false; setWaterLeaping(false);
    }
    c.yaw += (Number(keys.has('turnLeft')) - Number(keys.has('turnRight'))) * dt * 1.4;
    c.pitch = clampPitch(c.pitch + (Number(keys.has('lookDown')) - Number(keys.has('lookUp'))) * dt * 0.8);
    const wasSwimming = config.isSwimming(player.current);
    const jumpRequested = c.jumpQueued && !paused;
    if (wasSwimming && jumpRequested && player.current.jumpsUsed === 0) player.current.waterLeaping = true;
    const speed = wasSwimming ? 2.6 : 3.5;
    const v = movementVector(keys, c.yaw, dt * speed);
    const flow = !paused && !c.jumpQueued ? config.flowAt?.(player.current) : null;
    if (flow) { v.x += flow.x * dt; v.z += flow.z * dt; }
    const next = paused ? player.current : stepCharacter(player.current, v.x, v.z, dt, jumpRequested, surfaces.current, config.bounds, config.floorAt);
    const inWater = config.isSwimming(next);
    if (next.waterLeaping && ((inWater && next.velocity <= 0) || (next.velocity === 0 && next.jumpsUsed === 0))) next.waterLeaping = false;
    if (inWater !== swimRef.current) { swimRef.current = inWater; setSwimming(inWater); }
    if (!!next.waterLeaping !== leapRef.current) { leapRef.current = !!next.waterLeaping; setWaterLeaping(!!next.waterLeaping); }
    c.jumpQueued = false;
    const isMoving = Math.hypot(next.x - player.current.x, next.z - player.current.z) > 0.0001;
    if (isMoving) ref.current.rotation.y = Math.atan2(v.x, v.z);
    if (isMoving !== movingRef.current) { movingRef.current = isMoving; setWalking(isMoving); }
    player.current = next;
    if (!paused) swimTime.current += dt;
    ref.current.position.set(next.x, next.height + (inWater ? Math.sin(swimTime.current * 3) * 0.055 : 0), next.z);
    const leapTilt = next.waterLeaping ? Math.max(0.42, Math.min(1.48, 1.02 - next.velocity * 0.065)) : 0;
    swimmerBody.current.rotation.x += (((inWater ? 1.05 : leapTilt)) - swimmerBody.current.rotation.x) * (1 - Math.exp(-10 * dt));
    const support = Math.max(config.floorAt(next.x, next.z), ...surfaces.current(next.x, next.z).filter(s => s.top <= next.height + 0.01).map(s => s.top));
    groundMarker.current.position.y = (inWater ? 0.02 : support + 0.02) - next.height;
    groundMarker.current.scale.setScalar(inWater ? 1 + Math.sin(swimTime.current * 5) * 0.16 : 1);
    const distance = Math.cos(c.pitch) * Math.hypot(13.2, 4.1) - 2.5;
    const cameraHeight = Math.max(0.65, 1.4 + Math.sin(c.pitch) * Math.hypot(13.2, 4.1));
    const viewHeight = Math.max(next.height, -0.2);
    cameraPosition.set(next.x + Math.sin(c.yaw) * distance, cameraHeight + viewHeight, next.z + Math.cos(c.yaw) * distance);
    camera.position.lerp(cameraPosition, 1 - Math.exp(-7 * dt));
    cameraTarget.set(next.x - Math.sin(c.yaw) * 2.5, (config.focusHeight || 1.4) + viewHeight, next.z - Math.cos(c.yaw) * 2.5);
    camera.lookAt(cameraTarget);
    elapsed.current += dt;
    if (elapsed.current > 0.2) { onPosition({ ...next, swimming: inWater }); elapsed.current = 0; }
  });
  return <group ref={ref} name="student-explorer" position={[config.spawn.x, config.spawn.height, config.spawn.z]} rotation={[0, Math.PI + (config.spawn.yaw || 0), 0]}>
    <group ref={swimmerBody} position={[0, 1, 0]}><Person position={[0, -1, 0]} walking={walking} swimming={swimming} waterLeaping={waterLeaping} motion={player} paused={paused} shirt="#ed795f" /></group>
    <mesh ref={groundMarker} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}><ringGeometry args={[0.48, 0.55, 32]} /><meshBasicMaterial color="#fffcdf" /></mesh>
  </group>;
}

function ContextGuard({ onFailure }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onFailure);
    return () => canvas.removeEventListener('webglcontextlost', onFailure);
  }, [gl, onFailure]);
  return null;
}

export default function ExploreScene({ controls, onPosition, onReady, paused, onFailure, config, Scene }) {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5.5, 21.7], fov: 58, near: 0.1, far: 180 }}
    gl={{ antialias: true, alpha: false }} fallback={<div className="sw-render-failure">이 기기에서 3D 화면을 열 수 없어요. 다른 브라우저에서 다시 열어 주세요.</div>}>
    <ContextGuard onFailure={onFailure} />
    <color attach="background" args={[config.background || '#a2d5e5']} />
    <fog attach="fog" args={[config.fog || '#b8dce1', 45, 115]} />
    <hemisphereLight args={['#fff7e4', '#b7aa8f', 1.9]} />
    <directionalLight position={[-12, 22, 14]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={65} shadow-bias={-0.001} />
    <Scene />
    <Explorer controls={controls} onPosition={onPosition} onReady={onReady} paused={paused} config={config} />
  </Canvas>;
}
