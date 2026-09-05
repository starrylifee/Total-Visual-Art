import { Raycaster, Vector3 } from 'three';

// Only explicitly marked scenery becomes solid. The avatar, people and water do not.
export function createSurfaceSampler(scene) {
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse(object => {
    if (!object.isMesh || !object.userData.walkable) return;
    for (let parent = object; parent; parent = parent.parent) if (parent.userData.nonSolid) return;
    meshes.push(object);
  });
  const down = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 100);
  const up = new Raycaster(new Vector3(), new Vector3(0, 1, 0), 0, 100);
  const cache = new Map();
  function column(x, z) {
    const key = `${Math.round(x * 40)},${Math.round(z * 40)}`;
    if (cache.has(key)) return cache.get(key);
    down.ray.origin.set(x, 50, z); up.ray.origin.set(x, -10, z);
    const bottoms = new Map();
    for (const hit of up.intersectObjects(meshes, false)) {
      if (!bottoms.has(hit.object.id)) bottoms.set(hit.object.id, hit.point.y);
    }
    const seen = new Set();
    const columns = [];
    for (const hit of down.intersectObjects(meshes, false)) {
      if (seen.has(hit.object.id)) continue;
      seen.add(hit.object.id);
      columns.push({ top: hit.point.y, bottom: bottoms.get(hit.object.id) ?? hit.point.y - 0.1 });
    }
    if (cache.size > 6000) cache.clear();
    cache.set(key, columns);
    return columns;
  }
  return (x, z) => [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]].flatMap(([dx, dz]) => column(x + dx, z + dz));
}
