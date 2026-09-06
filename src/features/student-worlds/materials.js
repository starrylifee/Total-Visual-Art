import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace } from 'three';

// Code-native pencil strokes; no external AI generation or changes to the original.
export function pencilTexture(color, seed = 7) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  let value = seed;
  const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  for (let i = 0; i < 4500; i++) {
    const x = random() * 256, y = random() * 256;
    ctx.strokeStyle = i % 4 ? 'rgba(255,250,232,0.22)' : 'rgba(36,48,51,0.09)';
    ctx.lineWidth = 0.4 + random() * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 13 + 2, y - random() * 7); ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function signTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e7e5d6'; ctx.fillRect(0, 0, 768, 192);
  ctx.strokeStyle = '#3b4345'; ctx.lineWidth = 7; ctx.strokeRect(9, 9, 750, 174);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 114px "Malgun Gothic", sans-serif';
  ctx.strokeText('구명조끼', 384, 103); ctx.fillStyle = '#e57b7b'; ctx.fillText('구명조끼', 384, 103);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

// School emblem drawn in code: white disc, green ring, a green spire with a yellow core and the two syllables.
export function emblemTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 128, 122, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2f7a3f'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#2f7a3f'; ctx.beginPath(); ctx.moveTo(128, 34); ctx.lineTo(186, 196); ctx.lineTo(128, 160); ctx.lineTo(70, 196); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.moveTo(128, 74); ctx.lineTo(160, 172); ctx.lineTo(128, 150); ctx.lineTo(96, 172); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2f7a3f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 46px "Malgun Gothic", sans-serif';
  ctx.fillText('신', 62, 128); ctx.fillText('답', 194, 128);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

// A yellow armband label such as "친절"; the text repeats so it reads from most angles.
export function bandTexture(label = '친절', background = '#f5d433', ink = '#2a2a2a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 60px "Malgun Gothic", sans-serif';
  for (let i = 0; i < 4; i++) ctx.fillText(label, 64 + i * 128, 66);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  return texture;
}

// Armband for 신곰: a yellow band filling the whole canvas (dark edge lines) with "친절" drawn once at the
// centre. Wrapped around a closed cylinder whose seam starts at -PI, so u=0.5 (the text) faces +z.
export function armBandTexture(label = '친절', band = '#f3d23a', ink = '#3a2a14') {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = band; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = ink; ctx.fillRect(0, 0, 512, 8); ctx.fillRect(0, 120, 512, 8);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 66px "Malgun Gothic", sans-serif';
  ctx.fillText(label, 256, 66);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping; texture.wrapT = ClampToEdgeWrapping;
  return texture;
}

// Yellow awareness ribbon with a dark outline on a transparent square.
export function ribbonTexture(fill = '#f3d23a', outline = '#3a2416') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  const draw = (width, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(128, 84, 40, 62, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(100, 136); ctx.lineTo(186, 240); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(156, 136); ctx.lineTo(70, 240); ctx.stroke();
  };
  draw(44, outline); draw(24, fill);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

// Leaf skin for 신답's two leaves: green blade, a dark midrib and four pairs of side veins.
// The extruded leaf's cap UVs are its local x/y, so repeat/offset map the blade box onto the canvas.
export function leafTexture(width = 0.4, length = 0.72, blade = '#6cb83c', vein = '#4f9a30') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 512, 256, 0);
  grad.addColorStop(0, blade); grad.addColorStop(1, '#8fd05a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = vein; ctx.lineCap = 'round';
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(128, 500); ctx.lineTo(128, 40); ctx.stroke();
  ctx.lineWidth = 3.5;
  [430, 340, 250, 165].forEach((y, i) => {
    const reach = 92 - i * 14;
    ctx.beginPath(); ctx.moveTo(128, y); ctx.quadraticCurveTo(128 - reach * 0.55, y - 40, 128 - reach, y - 95); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, y); ctx.quadraticCurveTo(128 + reach * 0.55, y - 40, 128 + reach, y - 95); ctx.stroke();
  });
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  texture.repeat.set(1 / width, 1 / length); texture.offset.set(0.5, 0);
  return texture;
}

// Vertical six-colour gradient for 용석핑's rainbow hair (top row = first colour).
export function rainbowHairTexture(colors = ['#e2708a', '#f0a05a', '#f2d24e', '#8fc76b', '#6fb2e6', '#a685d6']) {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  const stops = [0, 0.2, 0.38, 0.56, 0.76, 1];
  colors.forEach((color, i) => grad.addColorStop(stops[i] ?? i / (colors.length - 1), color));
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 32, 256);
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
  return texture;
}

// 신답's hood: green sphere map with the white face window painted in (flush with the hood, no flange),
// a slightly darker rim suggesting the lip. Rows are widened by 1/cos(latitude) so the window stays
// elliptical on the sphere. Returns { map, emissiveMap } — the emissive map is white only on the window.
export function hoodTexture(green = '#6cb83c', rim = '#4f9a30', face = '#ffffff', centerY = -0.03, halfWidth = 0.36, halfHeight = 0.28, radius = 0.44, yScale = 0.95) {
  const W = 1024, H = 512;
  const make = (background, rimColor, faceColor) => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background; ctx.fillRect(0, 0, W, H);
    const cx = W * 0.25;                                     // phi = pi/2 -> +z
    const thetaC = Math.acos(centerY / (radius * yScale)); // polar angle of the window centre
    const cy = (thetaC / Math.PI) * H;                       // v = 1 - theta/pi, canvas y = (1 - v) * H
    const ry = (halfHeight / radius) / Math.PI * H;
    const rx = (halfWidth / radius) / (Math.PI * 2) * W;
    const paint = (color, grow) => {
      ctx.fillStyle = color;
      for (let y = Math.floor(cy - ry - grow); y <= Math.ceil(cy + ry + grow); y++) {
        const dy = (y - cy) / (ry + grow);
        if (Math.abs(dy) > 1) continue;
        const lat = Math.PI / 2 - (y / H) * Math.PI;
        const half = (rx + grow) * Math.sqrt(1 - dy * dy) / Math.max(0.2, Math.cos(lat));
        ctx.fillRect(cx - half, y, half * 2, 1);
      }
    };
    if (rimColor) paint(rimColor, 7);
    paint(faceColor, 0);
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace;
    return texture;
  };
  return { map: make(green, rim, face), emissiveMap: make('#000000', null, '#ffffff') };
}
