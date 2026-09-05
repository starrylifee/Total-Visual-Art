export const BEACH_BOUNDS = { minX: -14, maxX: 14, minZ: -6.8, maxZ: 15 };
export const BEACH_SPAWN = { x: 0, z: 11 };
export const DEFAULT_PITCH = Math.atan2(4.1, 13.2);
export const clampPitch = pitch => Math.max(-0.1, Math.min(1.05, pitch));

export function stepJump(state, dt, requested = false) {
  const velocity = requested && state.height === 0 ? 6.2 : state.velocity;
  const height = state.height + velocity * dt - 8 * dt * dt;
  return height <= 0 ? { height: 0, velocity: 0 } : { height, velocity: velocity - 16 * dt };
}
export const BEACH_COLLIDERS = [
  { x: -8, z: 5, halfX: 2.5, halfZ: 1.4 }, // life jacket shop
  { x: -1.8, z: 2.2, radius: 1.75 },
  { x: -0.3, z: 0.9, radius: 1.7 },
  { x: 7, z: 0.1, radius: 0.2 }, // parasol pole
  { x: -10, z: -4, halfX: 1.25, halfZ: 1.05 }, // sandcastle
];

export function isWalkable(x, z, bounds, colliders, radius = 0.32) {
  if (x < bounds.minX + radius || x > bounds.maxX - radius ||
      z < bounds.minZ + radius || z > bounds.maxZ - radius) return false;
  return !colliders.some(c => {
    if (c.radius != null) return Math.hypot(x - c.x, z - c.z) < c.radius + radius;
    const dx = Math.max(Math.abs(x - c.x) - c.halfX, 0);
    const dz = Math.max(Math.abs(z - c.z) - c.halfZ, 0);
    return Math.hypot(dx, dz) < radius;
  });
}

// Substeps prevent tunnelling; separate axes allow sliding along an obstacle.
export function movePlayer(position, dx, dz, bounds = BEACH_BOUNDS, colliders = BEACH_COLLIDERS) {
  let { x, z } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
  for (let i = 0; i < steps; i++) {
    if (isWalkable(x + dx / steps, z, bounds, colliders)) x += dx / steps;
    if (isWalkable(x, z + dz / steps, bounds, colliders)) z += dz / steps;
  }
  return { x, z };
}

export function movementVector(keys, yaw, distance) {
  let x = Number(keys.has('right')) - Number(keys.has('left'));
  let z = Number(keys.has('back')) - Number(keys.has('forward'));
  const length = Math.hypot(x, z) || 1;
  x = x / length * distance;
  z = z / length * distance;
  return { x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) };
}
