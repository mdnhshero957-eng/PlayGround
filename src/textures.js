import * as THREE from 'three';

/* ============================================================
   Procedural textures — every pixel is generated at runtime.
   ============================================================ */
const cache = new Map();

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(c, { repeat = [1, 1], nearest = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function cached(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

const hex = (n) => '#' + n.toString(16).padStart(6, '0');

/* ---------------- ground & neighborhood ---------------- */

export function grassTexture() {
  return cached('grass', () => {
    const { c, ctx } = canvas2d(256, 256);
    const r = rng(7);
    ctx.fillStyle = '#4d6b32'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2400; i++) {
      const x = r() * 256, y = r() * 256;
      const g = 70 + r() * 70;
      ctx.fillStyle = `rgba(${Math.floor(g * 0.55)},${Math.floor(g)},${Math.floor(g * 0.35)},${0.25 + r() * 0.5})`;
      ctx.fillRect(x, y, 1 + r() * 2, 1 + r() * 3);
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(90,80,40,${0.05 + r() * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(r() * 256, r() * 256, 10 + r() * 40, 6 + r() * 24, r() * 6, 0, 7);
      ctx.fill();
    }
    return finish(c, { repeat: [26, 26] });
  });
}

export function asphaltTexture() {
  return cached('asphalt', () => {
    const { c, ctx } = canvas2d(256, 256);
    const r = rng(19);
    ctx.fillStyle = '#25252a'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const g = 20 + r() * 55;
      ctx.fillStyle = `rgba(${g},${g},${g + 3},${0.25 + r() * 0.5})`;
      ctx.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
    }
    ctx.strokeStyle = 'rgba(10,10,12,0.5)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = r() * 256, y = r() * 256;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    return finish(c, { repeat: [10, 10] });
  });
}

export function sidewalkTexture() {
  return cached('sidewalk', () => {
    const { c, ctx } = canvas2d(256, 256);
    const r = rng(31);
    ctx.fillStyle = '#8f8b7e'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const g = 100 + r() * 60;
      ctx.fillStyle = `rgba(${g},${g - 4},${g - 12},${0.2 + r() * 0.4})`;
      ctx.fillRect(r() * 256, r() * 256, 2, 2);
    }
    ctx.strokeStyle = 'rgba(60,58,50,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(256, i * 128); ctx.stroke();
    }
    return finish(c, { repeat: [8, 8] });
  });
}

export function concreteTexture(tint = '#7d786c') {
  return cached('concrete' + tint, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(53);
    ctx.fillStyle = tint; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
      ctx.fillRect(r() * 128, r() * 128, 1, 1);
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
      ctx.fillRect(r() * 128, r() * 128, 1, 1);
    }
    return finish(c, { repeat: [3, 3] });
  });
}

export function sidingTexture(color, trim = '#d7d1bd') {
  return cached('siding' + color + trim, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(71);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.17)'; ctx.fillRect(0, y + 8, 128, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(0, y, 128, 1);
    }
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      ctx.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1);
    }
    return finish(c, { repeat: [2.2, 1.6] });
  });
}

export function brickTexture(base = '#8c4a37', mortar = '#c9bda6') {
  return cached('brick' + base + mortar, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(97);
    ctx.fillStyle = mortar; ctx.fillRect(0, 0, 128, 128);
    const bw = 32, bh = 16;
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 5; col++) {
        const x = col * bw + off + 2, y = row * bh + 2;
        const shade = 0.82 + r() * 0.3;
        const c0 = parseInt(base.slice(1), 16);
        const rr = Math.min(255, ((c0 >> 16) & 255) * shade);
        const gg = Math.min(255, ((c0 >> 8) & 255) * shade);
        const bb = Math.min(255, (c0 & 255) * shade);
        ctx.fillStyle = `rgb(${rr|0},${gg|0},${bb|0})`;
        ctx.fillRect(x, y, bw - 4, bh - 4);
      }
    }
    return finish(c, { repeat: [2, 2] });
  });
}

export function roofTexture(color = '#4a3230') {
  return cached('roof' + color, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(113);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 16; row++) {
      const y = row * 8;
      const off = row % 2 ? 8 : 0;
      for (let col = -1; col < 9; col++) {
        const x = col * 16 + off;
        const sh = 0.78 + r() * 0.32;
        ctx.fillStyle = `rgba(${Math.floor(30 * sh)},${Math.floor(22 * sh)},${Math.floor(20 * sh)},0.45)`;
        ctx.fillRect(x + 1, y + 1, 14, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + 7, 16, 1);
      }
    }
    return finish(c, { repeat: [3, 2] });
  });
}

export function hedgeTexture() {
  return cached('hedge', () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(131);
    ctx.fillStyle = '#2c421f'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1100; i++) {
      const g = 45 + r() * 70;
      ctx.fillStyle = `rgba(${g * 0.45},${g},${g * 0.32},${0.35 + r() * 0.5})`;
      const x = r() * 128, y = r() * 128;
      ctx.beginPath(); ctx.arc(x, y, 1 + r() * 3, 0, 7); ctx.fill();
    }
    return finish(c, { repeat: [2, 2] });
  });
}

/* ---------------- dungeon themes ---------------- */

const WALL_PATTERNS = {
  stripe: (ctx, w, h, t, r) => {
    ctx.fillStyle = t.wall[0]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.wall[1];
    for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 12, h);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let x = 0; x < w; x += 32) ctx.fillRect(x + 30, 0, 2, h);
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0.07)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.05)');
    grd.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  },
  tile: (ctx, w, h, t, r) => {
    ctx.fillStyle = t.wall[0]; ctx.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        if ((x / s + y / s) % 2 === 0) { ctx.fillStyle = t.wall[1]; ctx.fillRect(x, y, s, s); }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    for (let i = 0; i <= w; i += s) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i <= h; i += s) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,255,255,0.05)');
    grd.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  },
  panel: (ctx, w, h, t, r) => {
    ctx.fillStyle = t.wall[0]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = t.wall[1];
    for (let y = 8; y < h; y += 44) for (let x = 8; x < w; x += 44) {
      ctx.fillRect(x, y, 32, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y + 30, 32, 3);
      ctx.fillStyle = t.wall[1];
    }
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    for (let x = 0; x < w; x += 44) ctx.fillRect(x, 0, 3, h);
    for (let y = 0; y < h; y += 44) ctx.fillRect(0, y, w, 3);
  },
  flesh: (ctx, w, h, t, r) => {
    ctx.fillStyle = t.wall[0]; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${100 + r() * 80},${20 + r() * 30},${20 + r() * 30},${0.35 + r() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 6 + r() * 24, 4 + r() * 14, r() * 6, 0, 7);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60,10,12,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      let x = r() * w, y = r() * h; ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  },
};

export function hellWallTexture(theme) {
  return cached('hw' + theme.id, () => {
    const { c, ctx } = canvas2d(256, 256);
    const r = rng(theme.seed || 3);
    (WALL_PATTERNS[theme.pattern] || WALL_PATTERNS.stripe)(ctx, 256, 256, theme, r);
    // grime + blood
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = `rgba(0,0,0,${r() * 0.14})`;
      ctx.fillRect(r() * 256, r() * 256, 1 + r() * 4, 1 + r() * 8);
    }
    if (theme.blood !== false) {
      for (let i = 0; i < 5; i++) {
        const x = r() * 256, y = r() * 180;
        ctx.fillStyle = `rgba(90,10,8,${0.35 + r() * 0.35})`;
        ctx.beginPath(); ctx.ellipse(x, y, 4 + r() * 12, 8 + r() * 22, 0, 0, 7); ctx.fill();
        for (let j = 0; j < 4; j++) ctx.fillRect(x + (r() - 0.5) * 18, y + 6, 1 + r() * 2, 6 + r() * 18);
      }
    }
    return finish(c, { repeat: [1, 1] });
  });
}

export function hellFloorTexture(theme) {
  return cached('hf' + theme.id, () => {
    const { c, ctx } = canvas2d(256, 256);
    const r = rng((theme.seed || 3) + 99);
    ctx.fillStyle = theme.floor[0]; ctx.fillRect(0, 0, 256, 256);
    const s = 64;
    for (let y = 0; y < 256; y += s) for (let x = 0; x < 256; x += s) {
      const v = 0.82 + r() * 0.36;
      const base = theme.floor[1];
      const c0 = parseInt(base.slice(1), 16);
      const rr = Math.min(255, ((c0 >> 16) & 255) * v);
      const gg = Math.min(255, ((c0 >> 8) & 255) * v);
      const bb = Math.min(255, (c0 & 255) * v);
      ctx.fillStyle = `rgb(${rr|0},${gg|0},${bb|0})`;
      ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 2, y + 2, s - 4, 2);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += s) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(60,6,6,${0.12 + r() * 0.3})`;
      ctx.beginPath(); ctx.ellipse(r() * 256, r() * 256, 8 + r() * 34, 4 + r() * 20, r() * 6, 0, 7); ctx.fill();
    }
    return finish(c, { repeat: [14, 14] });
  });
}

export function ceilingTexture(theme) {
  return cached('ceil' + theme.id, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng((theme.seed || 3) + 17);
    ctx.fillStyle = theme.ceil || '#17151a'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
      ctx.fillRect(r() * 128, r() * 128, 1, 1);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); let x = r() * 128, y = r() * 128; ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) { x += (r() - .5) * 40; y += (r() - .5) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    return finish(c, { repeat: [7, 7] });
  });
}

export function metalTexture(base = '#5a5d63', accent = '#2a2c31') {
  return cached('metal' + base + accent, () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(151);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      ctx.fillRect(r() * 128, r() * 128, 1 + r() * 3, 1);
    }
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 116, 116);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 12; x < 128; x += 26) { ctx.beginPath(); ctx.arc(x, 12, 2, 0, 7); ctx.fill(); }
    return finish(c, { repeat: [1, 1] });
  });
}

export function doorTexture(theme) {
  return cached('door' + theme.id, () => {
    const { c, ctx } = canvas2d(128, 256);
    ctx.fillStyle = theme.door || '#4a3d33'; ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(14, 14, 100, 100); ctx.fillRect(14, 132, 100, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(14, 14, 100, 3); ctx.fillRect(14, 132, 100, 3);
    ctx.strokeStyle = theme.accent || '#c9a34e'; ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 116, 244);
    // hazard stripe
    ctx.save(); ctx.beginPath(); ctx.rect(0, 114, 128, 14); ctx.clip();
    ctx.fillStyle = '#d8b23c'; ctx.fillRect(0, 114, 128, 14);
    ctx.fillStyle = '#181410';
    for (let x = -20; x < 140; x += 20) { ctx.beginPath(); ctx.moveTo(x, 128); ctx.lineTo(x + 10, 114); ctx.lineTo(x + 20, 114); ctx.lineTo(x + 10, 128); ctx.fill(); }
    ctx.restore();
    // handle
    ctx.fillStyle = theme.accent || '#c9a34e';
    ctx.fillRect(96, 196, 14, 26);
    return finish(c, { repeat: [1, 1] });
  });
}

export function bloodTexture() {
  return cached('blood', () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(177);
    for (let i = 0; i < 26; i++) {
      const x = 20 + r() * 88, y = 20 + r() * 88;
      ctx.fillStyle = `rgba(${70 + r() * 60},${6 + r() * 10},${6 + r() * 10},${0.4 + r() * 0.5})`;
      ctx.beginPath(); ctx.ellipse(x, y, 3 + r() * 18, 2 + r() * 12, r() * 6, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(80,8,8,${0.3 + r() * 0.5})`;
      ctx.beginPath(); ctx.arc(20 + r() * 88, 20 + r() * 88, 0.5 + r() * 2.2, 0, 7); ctx.fill();
    }
    return finish(c, { repeat: [1, 1], nearest: true });
  });
}

export function pentagramTexture(color = '#c22a1d') {
  return cached('penta' + color, () => {
    const { c, ctx } = canvas2d(128, 128);
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(64, 64, 54, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(64, 64, 47, 0, 7); ctx.lineWidth = 1; ctx.stroke();
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      pts.push([64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48]);
    }
    ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const p = pts[(i * 2) % 5];
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2;
      ctx.fillRect(64 + Math.cos(a) * 38 - 1, 64 + Math.sin(a) * 38 - 1, 2, 2);
    }
    return finish(c, { repeat: [1, 1] });
  });
}

export function glowTexture(color = '#ffb347') {
  return cached('glow' + color, () => {
    const { c, ctx } = canvas2d(128, 128);
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, color);
    g.addColorStop(0.25, color + 'cc');
    g.addColorStop(0.6, color + '33');
    g.addColorStop(1, color + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return finish(c, { repeat: [1, 1], srgb: true });
  });
}

export function softCircleTexture(color = 'rgba(255,255,255,0.55)') {
  return cached('soft' + color, () => {
    const { c, ctx } = canvas2d(128, 128);
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return finish(c, { repeat: [1, 1] });
  });
}

export function smokeTexture() {
  return cached('smoke', () => {
    const { c, ctx } = canvas2d(128, 128);
    const r = rng(199);
    for (let i = 0; i < 24; i++) {
      const x = 30 + r() * 68, y = 30 + r() * 68, rad = 10 + r() * 26;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(180,175,170,0.18)');
      g.addColorStop(1, 'rgba(120,115,110,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
    return finish(c, { repeat: [1, 1] });
  });
}

export function cloudTexture() {
  return cached('cloud', () => {
    const { c, ctx } = canvas2d(256, 128);
    const r = rng(211);
    for (let i = 0; i < 32; i++) {
      const x = 40 + r() * 176, y = 45 + r() * 45, rad = 12 + r() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,236,220,0.34)');
      g.addColorStop(1, 'rgba(255,200,180,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
    }
    return finish(c, { repeat: [1, 1] });
  });
}

/* ---------------- signs & labels ---------------- */

export function signTexture({ lines = ['FOR SALE'], bg = '#1c2b1f', fg = '#e9e2cd', accent = '#ffb347', font = 700, size = 26, sub = '' } = {}) {
  const key = 'sign' + lines.join('|') + bg + fg + accent + size + sub;
  return cached(key, () => {
    const { c, ctx } = canvas2d(256, 128);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach((line, i) => {
      let fs = size;
      ctx.font = `${font} ${fs}px "Arial Black", Impact, sans-serif`;
      const maxW = 232;
      const measured = ctx.measureText(line).width;
      if (measured > maxW) {
        fs = Math.max(12, Math.floor(fs * maxW / measured));
        ctx.font = `${font} ${fs}px "Arial Black", Impact, sans-serif`;
      }
      ctx.fillText(line, 128, 64 + (i - (n - 1) / 2) * (fs + 6) - (sub ? 8 : 0));
    });
    if (sub) {
      ctx.fillStyle = accent; ctx.font = `600 12px monospace`;
      ctx.fillText(sub, 128, 108);
    }
    return finish(c, { repeat: [1, 1] });
  });
}

export function labelTexture(text, { bg = 'rgba(0,0,0,0)', fg = '#efe6d2', size = 20 } = {}) {
  return cached('label' + text + fg + size, () => {
    const { c, ctx } = canvas2d(256, 64);
    ctx.clearRect(0, 0, 256, 64);
    if (bg !== 'rgba(0,0,0,0)') { ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 64); }
    ctx.fillStyle = fg; ctx.font = `700 ${size}px "Arial Black", Impact, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
    return finish(c, { repeat: [1, 1] });
  });
}

/* ---------------- character / demon sprites ---------------- */

const SPRITE_SIZE = 96;

function spriteCanvas(w = SPRITE_SIZE, h = SPRITE_SIZE) {
  const { c, ctx } = canvas2d(w, h);
  ctx.clearRect(0, 0, w, h);
  return { c, ctx, w, h };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function outlineRect(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawImp(ctx, frame, attacking) {
  const bob = frame === 1 ? 1 : 0;
  const dark = '#5a150f', mid = '#8b2417', lit = '#b23a22', belly = '#c96a3a';
  // legs
  px(ctx, 30, 62 - bob, 10, 20, dark); px(ctx, 52, 62 + bob, 10, 20, dark);
  px(ctx, 28, 78 - bob, 14, 6, '#3d0d09'); px(ctx, 50, 78 + bob, 14, 6, '#3d0d09');
  // tail
  ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(74, 60); ctx.quadraticCurveTo(88, 64, 86, 74); ctx.stroke();
  // torso
  px(ctx, 28, 34, 38, 30, mid);
  px(ctx, 32, 38, 30, 22, lit);
  px(ctx, 38, 44, 18, 14, belly);
  // spikes / shoulders
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#d8cbb4';
    ctx.beginPath(); ctx.moveTo(30 + i * 12, 36); ctx.lineTo(34 + i * 12, 26); ctx.lineTo(39 + i * 12, 36); ctx.fill();
  }
  // arms
  if (attacking) {
    px(ctx, 14, 30, 12, 26, dark); px(ctx, 10, 24, 10, 12, lit);
    px(ctx, 68, 30, 12, 26, dark); px(ctx, 74, 24, 10, 12, lit);
    ctx.fillStyle = '#e3d4b9';
    for (let i = 0; i < 3; i++) { ctx.fillRect(8 + i * 4, 20, 2, 7); ctx.fillRect(76 + i * 4, 20, 2, 7); }
  } else {
    px(ctx, 18, 40, 11, 22, dark); px(ctx, 66, 40, 11, 22, dark);
    px(ctx, 14, 58, 14, 7, lit); px(ctx, 68, 58, 14, 7, lit);
    ctx.fillStyle = '#d8cbb4';
    for (let i = 0; i < 3; i++) { ctx.fillRect(14 + i * 4, 65, 2, 6); ctx.fillRect(70 + i * 4, 65, 2, 6); }
  }
  // head
  px(ctx, 32, 14, 30, 24, mid);
  px(ctx, 35, 17, 24, 14, lit);
  px(ctx, 36, 30, 22, 6, '#4a110b');
  // horns
  ctx.fillStyle = '#d8cbb4';
  ctx.beginPath(); ctx.moveTo(32, 18); ctx.lineTo(24, 2); ctx.lineTo(38, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(62, 18); ctx.lineTo(72, 2); ctx.lineTo(58, 14); ctx.fill();
  // eyes
  px(ctx, 38, 21, 7, 5, '#ffdf5a'); px(ctx, 52, 21, 7, 5, '#ffdf5a');
  px(ctx, 40, 22, 3, 3, '#ff3a1e'); px(ctx, 54, 22, 3, 3, '#ff3a1e');
  // mouth
  px(ctx, 42, 29, 12, 3, '#2a0806');
  ctx.fillStyle = '#efe6d2';
  for (let i = 0; i < 4; i++) ctx.fillRect(43 + i * 3, 29, 2, 4);
  if (attacking) {
    ctx.fillStyle = 'rgba(255,120,30,0.35)';
    ctx.beginPath(); ctx.arc(48, 30, 18, 0, 7); ctx.fill();
  }
}

function drawZombie(ctx, frame) {
  const bob = frame === 1 ? 1 : 0;
  const uniform = '#5b6440', darkU = '#3c4329', skin = '#93a06a';
  px(ctx, 32, 64 - bob, 12, 22, darkU); px(ctx, 52, 64 + bob, 12, 22, darkU);
  px(ctx, 30, 82 - bob, 16, 5, '#2a2a1c'); px(ctx, 50, 82 + bob, 16, 5, '#2a2a1c');
  px(ctx, 30, 34, 36, 34, uniform);
  px(ctx, 34, 38, 28, 26, '#6d7550');
  px(ctx, 36, 46, 24, 3, darkU); px(ctx, 36, 54, 24, 3, darkU);
  // arms holding rifle
  px(ctx, 20, 42, 14, 12, skin); px(ctx, 60, 42, 16, 12, skin);
  px(ctx, 10, 46, 48, 5, '#2c2a28'); px(ctx, 46, 50, 14, 4, '#4a3a2a');
  px(ctx, 58, 46, 10, 7, '#3a3834');
  // head
  px(ctx, 34, 12, 30, 26, skin);
  px(ctx, 34, 10, 30, 8, '#3f4a2c'); px(ctx, 32, 16, 34, 4, '#2e3520');
  px(ctx, 40, 22, 7, 5, '#c9e07a'); px(ctx, 51, 22, 7, 5, '#c9e07a');
  px(ctx, 42, 23, 3, 3, '#1b2410'); px(ctx, 53, 23, 3, 3, '#1b2410');
  px(ctx, 42, 31, 14, 3, '#4a2a20');
  ctx.fillStyle = '#d8d0b8';
  for (let i = 0; i < 4; i++) ctx.fillRect(43 + i * 4, 31, 2, 3);
  // blood
  px(ctx, 36, 40, 5, 8, 'rgba(90,15,12,0.75)');
  px(ctx, 56, 58, 4, 5, 'rgba(90,15,12,0.6)');
}

function drawPinky(ctx, frame) {
  const bob = frame === 1 ? 2 : 0;
  const pink = '#d97a86', darkP = '#9c3c4e', litP = '#f0a6ad';
  // legs
  for (const [x, off] of [[26, 0], [38, 1], [56, 1], [68, 0]]) {
    px(ctx, x, 66 + (off ? bob : -bob), 9, 18, darkP);
    px(ctx, x - 2, 82 + (off ? bob : -bob), 13, 5, '#5b1c26');
  }
  // body
  px(ctx, 20, 40, 58, 30, darkP);
  px(ctx, 24, 42, 50, 24, pink);
  px(ctx, 28, 48, 20, 14, litP);
  // tail
  ctx.strokeStyle = darkP; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(78, 52); ctx.quadraticCurveTo(92, 56, 90, 40); ctx.stroke();
  // huge head
  px(ctx, 22, 10, 54, 40, pink);
  px(ctx, 26, 14, 46, 20, litP);
  // horns
  ctx.fillStyle = '#efe2c8';
  ctx.beginPath(); ctx.moveTo(24, 14); ctx.lineTo(16, 2); ctx.lineTo(34, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(74, 14); ctx.lineTo(84, 2); ctx.lineTo(66, 10); ctx.fill();
  // eyes
  px(ctx, 30, 20, 8, 7, '#ff4b32'); px(ctx, 62, 20, 8, 7, '#ff4b32');
  px(ctx, 32, 22, 3, 3, '#ffe9b0'); px(ctx, 64, 22, 3, 3, '#ffe9b0');
  // mouth
  px(ctx, 30, 36, 44, 14, '#38060c');
  ctx.fillStyle = '#f1e7cf';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(31 + i * 5.4, 36); ctx.lineTo(34 + i * 5.4, 43); ctx.lineTo(37 + i * 5.4, 36); ctx.fill();
    ctx.beginPath(); ctx.moveTo(31 + i * 5.4, 50); ctx.lineTo(34 + i * 5.4, 44); ctx.lineTo(37 + i * 5.4, 50); ctx.fill();
  }
  // hooves highlight
  px(ctx, 24, 44, 4, 6, darkP);
}

function drawBoss(ctx) {
  const dark = '#5a0f13', mid = '#9e1c22', lit = '#ce3a34';
  // tentacles
  ctx.strokeStyle = dark; ctx.lineWidth = 6;
  for (let i = 0; i < 5; i++) {
    const a = 0.5 + i * 0.55;
    ctx.beginPath(); ctx.moveTo(64, 70);
    ctx.quadraticCurveTo(64 + Math.cos(a) * 40, 80 + Math.sin(a) * 18, 64 + Math.cos(a) * 50, 94);
    ctx.stroke();
  }
  // body sphere
  const g = ctx.createRadialGradient(54, 36, 4, 64, 50, 48);
  g.addColorStop(0, lit); g.addColorStop(0.7, mid); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 48, 40, 0, 7); ctx.fill();
  // veins
  ctx.strokeStyle = 'rgba(60,0,6,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const a = i / 8 * Math.PI * 2;
    ctx.moveTo(64 + Math.cos(a) * 16, 48 + Math.sin(a) * 16);
    ctx.quadraticCurveTo(64 + Math.cos(a + 0.4) * 30, 48 + Math.sin(a + 0.4) * 30, 64 + Math.cos(a) * 39, 48 + Math.sin(a) * 39);
    ctx.stroke();
  }
  // horns
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.moveTo(38, 20); ctx.lineTo(22, 0); ctx.lineTo(48, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(90, 20); ctx.lineTo(106, 0); ctx.lineTo(80, 14); ctx.fill();
  // giant eye
  ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.ellipse(64, 44, 22, 18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0a324'; ctx.beginPath(); ctx.arc(64, 44, 12, 0, 7); ctx.fill();
  ctx.fillStyle = '#160604'; ctx.beginPath(); ctx.arc(64, 44, 5, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(59, 39, 4, 0, 7); ctx.fill();
  // mouth
  ctx.fillStyle = '#250304'; ctx.beginPath(); ctx.ellipse(64, 76, 17, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#efe2c8';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.moveTo(51 + i * 5, 70); ctx.lineTo(53.5 + i * 5, 78); ctx.lineTo(56 + i * 5, 70); ctx.fill();
  }
}

export function demonTexture(type, frame = 0) {
  return cached(`demon-${type}-${frame}`, () => {
    const { c, ctx } = spriteCanvas();
    if (type === 'imp') drawImp(ctx, frame, false);
    else if (type === 'imp-attack') drawImp(ctx, frame, true);
    else if (type === 'zombie') drawZombie(ctx, frame);
    else if (type === 'pinky') drawPinky(ctx, frame);
    else if (type === 'boss') drawBoss(ctx);
    return finish(c, { repeat: [1, 1], nearest: true });
  });
}

export function itemTexture(type) {
  return cached('item-' + type, () => {
    const { c, ctx } = spriteCanvas(64, 64);
    if (type === 'health') {
      px(ctx, 22, 14, 20, 36, '#d7d3c2');
      px(ctx, 24, 16, 16, 8, '#b23a2e');
      px(ctx, 26, 25, 12, 20, '#e9e4d4');
      px(ctx, 29, 28, 6, 14, '#d0392b');
      px(ctx, 25, 31, 14, 6, '#d0392b');
      outlineRect(ctx, 21, 13, 22, 38, '#3c3428');
      px(ctx, 24, 14, 3, 3, '#fff');
    } else if (type === 'armor') {
      ctx.fillStyle = '#5f8f4a';
      ctx.beginPath(); ctx.moveTo(20, 18); ctx.lineTo(44, 18); ctx.lineTo(50, 30); ctx.lineTo(44, 52); ctx.lineTo(32, 58); ctx.lineTo(20, 52); ctx.lineTo(14, 30); ctx.closePath(); ctx.fill();
      px(ctx, 27, 22, 10, 10, '#9bd06e');
      px(ctx, 23, 40, 18, 4, '#37552a');
      outlineRect(ctx, 18, 20, 28, 34, '#26361d');
    } else if (type === 'shells') {
      px(ctx, 12, 26, 40, 26, '#8d2a22'); px(ctx, 12, 26, 40, 6, '#b84030');
      for (let i = 0; i < 4; i++) {
        px(ctx, 17 + i * 9, 16, 6, 14, '#d8b24a'); px(ctx, 17 + i * 9, 16, 6, 6, '#8d2a22');
        px(ctx, 17 + i * 9, 30, 6, 3, '#5a3a1a');
      }
      px(ctx, 17, 36, 30, 3, '#e0c98a'); px(ctx, 17, 42, 22, 3, '#e0c98a');
    } else if (type === 'chaingun') {
      px(ctx, 10, 34, 42, 9, '#3a3d44'); px(ctx, 12, 30, 10, 17, '#25272c');
      px(ctx, 20, 43, 26, 6, '#4a4e56');
      for (let i = 0; i < 4; i++) px(ctx, 48, 31 + i * 4, 9, 3, '#6a6f78');
      px(ctx, 14, 46, 8, 8, '#5a3a26');
    } else if (type === 'key') {
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 25);
      g.addColorStop(0, 'rgba(255,210,110,0.55)'); g.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      px(ctx, 20, 18, 24, 28, '#d9a63a'); px(ctx, 24, 22, 16, 16, '#3a1e12');
      ctx.fillStyle = '#ffd67a';
      ctx.beginPath(); ctx.arc(32, 30, 7, 0, 7); ctx.fill();
      ctx.fillRect(30, 30, 4, 12);
      px(ctx, 26, 38, 12, 3, '#ffd67a');
      outlineRect(ctx, 19, 17, 26, 30, '#7a4a14');
    } else if (type === 'soul') {
      const g = ctx.createRadialGradient(32, 30, 2, 32, 30, 22);
      g.addColorStop(0, '#eaffff'); g.addColorStop(0.5, '#59d6ff'); g.addColorStop(1, 'rgba(20,80,130,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 30, 24, 0, 7); ctx.fill();
      px(ctx, 26, 22, 6, 6, '#fff'); px(ctx, 34, 22, 6, 6, '#fff');
      ctx.fillStyle = '#0a3a4a'; ctx.fillRect(28, 23, 3, 3); ctx.fillRect(36, 23, 3, 3);
    }
    return finish(c, { repeat: [1, 1], nearest: true });
  });
}

export function simPortrait(hp, mood = 'TERRIFIED') {
  // drawn each frame onto HUD canvas — not cached
  const w = 84, h = 84;
  const { c, ctx } = canvas2d(w, h);
  const hurt = hp < 35;
  ctx.fillStyle = '#20130f'; ctx.fillRect(0, 0, w, h);
  // hair
  px(ctx, 20, 14, 44, 22, '#3a2418');
  px(ctx, 18, 28, 12, 20, '#3a2418'); px(ctx, 54, 28, 12, 20, '#3a2418');
  // face
  px(ctx, 22, 20, 40, 42, hurt ? '#c9a184' : '#e0b894');
  px(ctx, 22, 55, 40, 8, hurt ? '#b08b70' : '#c9a17f');
  // eyes
  const eyeH = mood === 'CALM' ? 5 : 7;
  px(ctx, 30, 34 - (hurt ? 1 : 0), 8, eyeH, '#16100d');
  px(ctx, 46, 34 - (hurt ? 1 : 0), 8, eyeH, '#16100d');
  px(ctx, 32, 35, 3, 3, '#f4e8d0'); px(ctx, 48, 35, 3, 3, '#f4e8d0');
  if (hurt) { px(ctx, 28, 31, 12, 2, '#8d2a22'); px(ctx, 44, 31, 12, 2, '#8d2a22'); }
  // mouth
  if (hurt) px(ctx, 34, 52, 16, 9, '#521c18');
  else px(ctx, 35, 52, 14, 4, '#8a5a45');
  // sweat
  if (hurt) {
    px(ctx, 62, 30, 3, 6, 'rgba(160,220,255,0.8)');
    px(ctx, 16, 44, 3, 5, 'rgba(160,220,255,0.8)');
  }
  // plumbob
  ctx.save(); ctx.translate(42, 8);
  const g = ctx.createLinearGradient(0, -8, 0, 10);
  if (hurt) { g.addColorStop(0, '#ffca6b'); g.addColorStop(1, '#e03a22'); }
  else { g.addColorStop(0, '#dcff9a'); g.addColorStop(1, '#3e9a2e'); }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, -1); ctx.lineTo(0, 10); ctx.lineTo(-6, -1); ctx.closePath(); ctx.fill();
  ctx.restore();
  return c;
}

export function avatarTexture(color = '#8fb9a8') {
  return cached('avatar' + color, () => {
    const { c, ctx } = spriteCanvas(64, 64);
    px(ctx, 24, 34, 16, 20, color);
    px(ctx, 24, 18, 16, 16, '#e0b894');
    px(ctx, 22, 14, 20, 8, '#2c2018');
    px(ctx, 27, 25, 3, 3, '#16100d'); px(ctx, 35, 25, 3, 3, '#16100d');
    px(ctx, 27, 44, 4, 10, '#2c2a32'); px(ctx, 34, 44, 4, 10, '#2c2a32');
    return finish(c, { repeat: [1, 1], nearest: true });
  });
}
