import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3 } from 'three';

export const slideLayouts = [
  { key: 'blue', color: '#55a3d0', start: [-3, 6, -9], stairsX: -7, steps: 40, points: [[-3, 6, -9], [-4.7, 4.6, -5], [-2, 2.4, 0], [-2.8, 0.08, 6]] },
  { key: 'red', color: '#be4165', start: [9, 6.9, -10], stairsX: 13, steps: 46, points: [[9, 6.9, -10], [6, 5.5, -5], [8.2, 3.4, 1], [10, 1.2, 7], [5.5, 0.08, 11]] },
];
export function slideSamples(layout) {
  const curve = new CatmullRomCurve3(layout.points.map(p => new Vector3(...p)));
  return Array.from({ length: 81 }, (_, i) => {
    const center = curve.getPoint(i / 80), tangent = curve.getTangent(i / 80);
    const side = new Vector3(tangent.z, 0, -tangent.x).normalize();
    return { center, side };
  });
}
export function slideGeometry(layout) {
  const samples = slideSamples(layout), vertices = [], indices = [];
  for (const { center, side } of samples) for (const [sign, drop] of [[-1, 0], [1, 0], [-1, -0.16], [1, -0.16]]) {
    const p = center.clone().addScaledVector(side, sign * 1.15); vertices.push(p.x, p.y + drop, p.z);
  }
  const quad = (a,b,c,d) => indices.push(a,b,c,a,c,d);
  for(let i=0;i<samples.length-1;i++) { const a=i*4,b=a+4; quad(a,b,b+1,a+1); quad(a+2,a+3,b+3,b+2); quad(a,a+2,b+2,b); quad(a+1,b+1,b+3,a+3); }
  quad(0,1,3,2); const e=(samples.length-1)*4; quad(e,e+2,e+3,e+1);
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
const flows = slideLayouts.map(slideSamples);
export function slideFlowAt(p) {
  if (p.jumpsUsed || Math.abs(p.velocity) > 0.1) return { x: 0, z: 0 };
  for (const samples of flows) for (let i=0;i<samples.length-1;i++) {
    const a=samples[i].center,b=samples[i+1].center, dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));
    if (Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)<0.95 && Math.abs(p.height-(a.y+(b.y-a.y)*t))<0.22) {
      const length=Math.hypot(dx,dz); return {x:dx/length*4.2,z:dz/length*4.2};
    }
  }
  return {x:0,z:0};
}
