import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

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
