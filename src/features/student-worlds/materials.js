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
