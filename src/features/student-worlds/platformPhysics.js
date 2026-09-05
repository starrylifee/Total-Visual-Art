import { BEACH_BOUNDS, BEACH_SPAWN } from './movement.js';

export const spawnCharacter = (spawn = BEACH_SPAWN) => ({ height: 0, ...spawn, velocity: 0, jumpsUsed: 0 });
export const EXPLORE_BOUNDS = { ...BEACH_BOUNDS, minZ: -34 };
export const waterFloor = z => z >= -8.5 ? 0 : -0.85 * Math.min(1, (-z - 8.5) / 2);
export const isSwimming = p => p.z < -8.8 && p.height < -0.35;
const BODY_HEIGHT = 1.78;
const STEP = 0.16;

// columnsAt returns solid vertical spans under the character's footprint.
// The renderer supplies spans from the actual meshes, including curved surfaces.
export function stepCharacter(state, dx, dz, dt, requested, columnsAt, bounds = EXPLORE_BOUNDS, floorAt = (x, z) => waterFloor(z)) {
  let p = { ...state };
  if (requested && p.jumpsUsed < 2) { p.velocity = 8.8; p.jumpsUsed++; }
  const count = Math.max(1, Math.ceil(dt / (1 / 120)), Math.ceil(Math.hypot(dx, dz) / 0.08));
  const h = dt / count;
  const spans = (x, z) => [{ bottom: -10, top: floorAt(x, z) }, ...columnsAt(x, z)];
  const canEnter = (x, z) => x >= bounds.minX + 0.32 && x <= bounds.maxX - 0.32 && z >= bounds.minZ + 0.32 && z <= bounds.maxZ - 0.32 &&
    !spans(x, z).some(s => s.top > p.height + STEP && s.bottom < p.height + BODY_HEIGHT - 0.02);
  for (let i = 0; i < count; i++) {
    if (canEnter(p.x + dx / count, p.z)) p.x += dx / count;
    if (canEnter(p.x, p.z + dz / count)) p.z += dz / count;
    const surfaces = spans(p.x, p.z);
    // Small changes along a curved surface are walkable while grounded.
    if (p.velocity === 0 && p.jumpsUsed === 0) {
      const support = Math.max(...surfaces.filter(s => s.top <= p.height + STEP).map(s => s.top));
      if (Math.abs(support - p.height) <= STEP) p.height = support;
      else p.jumpsUsed = 1; // Walking off a ledge leaves one air jump.
    }
    let nextHeight = p.height + p.velocity * h - 8 * h * h;
    let velocity = p.velocity - 16 * h;
    if (p.velocity > 0) {
      const ceiling = Math.min(...surfaces.filter(s => s.bottom >= p.height + BODY_HEIGHT - 0.001).map(s => s.bottom));
      if (nextHeight + BODY_HEIGHT >= ceiling) { nextHeight = ceiling - BODY_HEIGHT; velocity = 0; }
    }
    if (velocity <= 0) {
      const landing = Math.max(...surfaces.filter(s => s.top <= p.height + 0.001 && s.top >= nextHeight).map(s => s.top));
      if (Number.isFinite(landing)) { nextHeight = landing; velocity = 0; p.jumpsUsed = 0; }
    }
    p.height = nextHeight; p.velocity = velocity;
  }
  return p;
}
