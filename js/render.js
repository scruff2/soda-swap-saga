'use strict';
// Canvas renderer: procedurally drawn candies (cached as sprites), board,
// blockers, effects and touch/mouse input.

const PAL = [
  { base: '#f0222e', light: '#ffa0a0', dark: '#7c000c' }, // red jelly bean
  { base: '#ff8a12', light: '#ffd596', dark: '#9c3e00' }, // orange lozenge
  { base: '#ffd21a', light: '#fff8b4', dark: '#a87000' }, // yellow lemon drop
  { base: '#3fc423', light: '#c0f7a4', dark: '#126406' }, // green square
  { base: '#2a8cff', light: '#b2daff', dark: '#08389a' }, // blue lollipop head
  { base: '#b23cf0', light: '#ecb8ff', dark: '#520a82' }, // purple cluster
];

function candyPath(ctx, color, R) {
  ctx.beginPath();
  switch (color) {
    case 0: ctx.ellipse(0, 0, R * 0.98, R * 0.62, -0.62, 0, Math.PI * 2); break;
    case 1: {
      // Puffy lozenge: rounded octagon.
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.PI / 8;
        const x = Math.cos(a) * R * 0.88, y = Math.sin(a) * R * 0.88;
        const am = ((i - 0.5) / n) * Math.PI * 2 + Math.PI / 8;
        const cx = Math.cos(am) * R * 0.98, cy = Math.sin(am) * R * 0.98;
        if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(cx, cy, x, y);
      }
      break;
    }
    case 2:
      ctx.moveTo(-R, 0);
      ctx.bezierCurveTo(-R * 0.7, -R * 0.95, R * 0.7, -R * 0.95, R, 0);
      ctx.bezierCurveTo(R * 0.7, R * 0.95, -R * 0.7, R * 0.95, -R, 0);
      break;
    case 3: {
      const s = R * 0.74, k = R * 0.3;
      ctx.moveTo(-s + k, -s);
      ctx.arcTo(s, -s, s, s, k); ctx.arcTo(s, s, -s, s, k);
      ctx.arcTo(-s, s, -s, -s, k); ctx.arcTo(-s, -s, s, -s, k);
      break;
    }
    case 4: ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2); break;
    case 5: {
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * R * 0.92, y = Math.sin(a) * R * 0.92;
        const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
        const cx = Math.cos(am) * R * 0.62, cy = Math.sin(am) * R * 0.62;
        if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(cx, cy, x, y);
      }
      break;
    }
  }
  ctx.closePath();
}

function shade(ctx, p, R) {
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.05, 0, 0, R * 1.15);
  g.addColorStop(0, p.light);
  g.addColorStop(0.45, p.base);
  g.addColorStop(1, p.dark);
  return g;
}

function gloss(ctx, R, alpha = 0.75) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-R * 0.28, -R * 0.38, R * 0.3, R * 0.14, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.6;
  ctx.beginPath();
  ctx.arc(R * 0.08, -R * 0.5, R * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBaseCandy(ctx, color, R) {
  const p = PAL[color];
  // drop shadow
  ctx.save();
  ctx.translate(0, R * 0.09);
  candyPath(ctx, color, R);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fill();
  ctx.restore();
  candyPath(ctx, color, R);
  ctx.fillStyle = shade(ctx, p, R);
  ctx.fill();
  ctx.lineWidth = R * 0.06;
  ctx.strokeStyle = p.dark;
  ctx.stroke();
  // shape-specific detail
  ctx.save();
  candyPath(ctx, color, R);
  ctx.clip();
  if (color === 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = R * 0.08;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, Math.PI * 2); ctx.stroke();
  } else if (color === 4) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = R * 0.12;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const rr = (a / (Math.PI * 4)) * R * 0.75;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (color === 3) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = R * 0.07;
    const s = R * 0.48;
    ctx.strokeRect(-s, -s, s * 2, s * 2);
  } else if (color === 5) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  gloss(ctx, R);
}

function drawStripes(ctx, color, R, dir) {
  ctx.save();
  candyPath(ctx, color, R);
  ctx.clip();
  if (dir === 'v') ctx.rotate(Math.PI / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const y of [-0.5, 0, 0.5]) {
    ctx.fillRect(-R * 1.2, y * R - R * 0.09, R * 2.4, R * 0.18);
  }
  ctx.restore();
  candyPath(ctx, color, R);
  ctx.lineWidth = R * 0.06;
  ctx.strokeStyle = PAL[color].dark;
  ctx.stroke();
  gloss(ctx, R, 0.6);
}

function drawWrapped(ctx, color, R) {
  const p = PAL[color];
  ctx.lineJoin = 'round';
  // twisted wrapper ends
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * R * 0.5, 0);
    ctx.lineTo(s * R * 1.0, -R * 0.55);
    ctx.quadraticCurveTo(s * R * 0.86, 0, s * R * 1.0, R * 0.55);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -R * 0.55, 0, R * 0.55);
    g.addColorStop(0, p.light); g.addColorStop(0.5, p.base); g.addColorStop(1, p.dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = R * 0.05; ctx.strokeStyle = p.dark; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = R * 0.04;
    ctx.beginPath(); ctx.moveTo(s * R * 0.6, 0); ctx.lineTo(s * R * 0.94, -R * 0.3); ctx.stroke();
  }
  // wrapper body
  const s = R * 0.62, k = R * 0.22;
  ctx.beginPath();
  ctx.moveTo(-s + k, -s);
  ctx.arcTo(s, -s, s, s, k); ctx.arcTo(s, s, -s, s, k);
  ctx.arcTo(-s, s, -s, -s, k); ctx.arcTo(-s, -s, s, -s, k);
  ctx.closePath();
  ctx.fillStyle = shade(ctx, p, R * 0.8);
  ctx.fill();
  ctx.lineWidth = R * 0.06; ctx.strokeStyle = p.dark; ctx.stroke();
  // shiny cellophane highlights
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.rotate(-0.7);
  ctx.fillRect(-R, -R * 0.42, R * 2, R * 0.16);
  ctx.fillRect(-R, R * 0.05, R * 2, R * 0.07);
  ctx.restore();
  ctx.save();
  ctx.scale(0.45, 0.45);
  candyPath(ctx, color, R);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
  gloss(ctx, R * 0.85, 0.7);
}

function drawColorBomb(ctx, R) {
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.05, 0, 0, R);
  g.addColorStop(0, '#9a5a32'); g.addColorStop(0.55, '#5a2e12'); g.addColorStop(1, '#2a1205');
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(0, R * 0.08, R * 0.86, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2); ctx.fill();
  const rnd = U.seeded(42);
  const cols = ['#ff3b5c', '#ffd21a', '#3fc423', '#2a8cff', '#ffffff', '#ff8a12', '#d06bff'];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * R * 0.72;
    ctx.save();
    ctx.translate(Math.cos(a) * d, Math.sin(a) * d);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = cols[i % cols.length];
    const w = R * 0.24, h = R * 0.09;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  gloss(ctx, R, 0.45);
}

function drawIngredient(ctx, type, R) {
  if (type === 0) {
    // cherry pair
    ctx.strokeStyle = '#2f7d16'; ctx.lineWidth = R * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.32, R * 0.05); ctx.quadraticCurveTo(-R * 0.1, -R * 0.55, R * 0.12, -R * 0.78); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R * 0.34, R * 0.12); ctx.quadraticCurveTo(R * 0.25, -R * 0.4, R * 0.12, -R * 0.78); ctx.stroke();
    ctx.fillStyle = '#4caf26';
    ctx.beginPath(); ctx.ellipse(R * 0.36, -R * 0.72, R * 0.26, R * 0.12, -0.4, 0, Math.PI * 2); ctx.fill();
    for (const [x, y] of [[-R * 0.34, R * 0.32], [R * 0.36, R * 0.38]]) {
      ctx.save(); ctx.translate(x, y);
      const p = { light: '#ff9aa0', base: '#e0102a', dark: '#6a0010' };
      ctx.fillStyle = shade(ctx, p, R * 0.42);
      ctx.beginPath(); ctx.arc(0, 0, R * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.dark; ctx.lineWidth = R * 0.04; ctx.stroke();
      gloss(ctx, R * 0.42, 0.8);
      ctx.restore();
    }
  } else {
    // hazelnut
    const p = { light: '#e8b878', base: '#a8642a', dark: '#4e2a0c' };
    ctx.fillStyle = shade(ctx, p, R);
    ctx.beginPath(); ctx.ellipse(0, R * 0.12, R * 0.72, R * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.dark; ctx.lineWidth = R * 0.05; ctx.stroke();
    ctx.fillStyle = '#5e3812';
    ctx.beginPath(); ctx.ellipse(0, -R * 0.42, R * 0.64, R * 0.3, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,160,0.35)'; ctx.lineWidth = R * 0.03;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * R * 0.2, -R * 0.42); ctx.lineTo(i * R * 0.15, -R * 0.66); ctx.stroke(); }
    gloss(ctx, R * 0.9, 0.5);
  }
}

const BEAR_TINTS = [
  { base: '#ff4f7a', light: '#ffc2d2', dark: '#a0103a' },
  { base: '#ffa62e', light: '#ffe2a8', dark: '#a85a00' },
  { base: '#44cf6a', light: '#bff5cc', dark: '#137a32' },
  { base: '#4fa4ff', light: '#c4e2ff', dark: '#1450a8' },
];

function drawBear(ctx, tint, R) {
  const p = BEAR_TINTS[tint % BEAR_TINTS.length];
  ctx.save();
  ctx.globalAlpha *= 0.95;
  const fill = shade(ctx, p, R);
  ctx.fillStyle = fill; ctx.strokeStyle = p.dark; ctx.lineWidth = R * 0.05;
  const blob = (x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
  blob(-R * 0.36, R * 0.72, R * 0.2, R * 0.14);  // feet
  blob(R * 0.36, R * 0.72, R * 0.2, R * 0.14);
  blob(0, R * 0.32, R * 0.5, R * 0.5);           // body
  blob(-R * 0.5, R * 0.2, R * 0.16, R * 0.22);   // arms
  blob(R * 0.5, R * 0.2, R * 0.16, R * 0.22);
  blob(-R * 0.34, -R * 0.74, R * 0.16, R * 0.16); // ears
  blob(R * 0.34, -R * 0.74, R * 0.16, R * 0.16);
  blob(0, -R * 0.38, R * 0.46, R * 0.4);         // head
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(0, -R * 0.24, R * 0.2, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a0a18';
  for (const x of [-0.16, 0.16]) { ctx.beginPath(); ctx.arc(x * R, -R * 0.44, R * 0.06, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, -R * 0.3, R * 0.07, R * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a0a18'; ctx.lineWidth = R * 0.03;
  ctx.beginPath(); ctx.arc(0, -R * 0.26, R * 0.09, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.ellipse(-R * 0.15, R * 0.15, R * 0.12, R * 0.22, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  gloss(ctx, R * 0.8, 0.5);
}

function drawFish(ctx, color, R) {
  const p = PAL[color] || PAL[0];
  ctx.save();
  // tail
  ctx.beginPath();
  ctx.moveTo(R * 0.45, 0);
  ctx.lineTo(R * 0.95, -R * 0.42);
  ctx.quadraticCurveTo(R * 0.78, 0, R * 0.95, R * 0.42);
  ctx.closePath();
  ctx.fillStyle = p.base; ctx.fill();
  ctx.lineWidth = R * 0.05; ctx.strokeStyle = p.dark; ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(-R * 0.08, 0, R * 0.7, R * 0.44, 0, 0, Math.PI * 2);
  ctx.fillStyle = shade(ctx, p, R * 0.8); ctx.fill(); ctx.stroke();
  // fins and scales
  ctx.fillStyle = p.dark;
  ctx.beginPath(); ctx.moveTo(-R * 0.2, -R * 0.42); ctx.quadraticCurveTo(R * 0.05, -R * 0.68, R * 0.25, -R * 0.36); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = R * 0.04;
  for (const x of [0.0, 0.2]) { ctx.beginPath(); ctx.arc(x * R, 0, R * 0.2, -1, 1); ctx.stroke(); }
  // eye
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-R * 0.45, -R * 0.08, R * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-R * 0.48, -R * 0.08, R * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.dark; ctx.lineWidth = R * 0.04;
  ctx.beginPath(); ctx.arc(-R * 0.62, R * 0.12, R * 0.08, -0.5, 1.2); ctx.stroke();
  ctx.restore();
  gloss(ctx, R * 0.75, 0.6);
}

function drawColoring(ctx, color, R) {
  drawBaseCandy(ctx, color, R);
  ctx.save();
  candyPath(ctx, color, R);
  ctx.clip();
  // painted rainbow swirl
  const rainbow = ['#ff3b5c', '#ff9a1f', '#ffe14d', '#3fd45a', '#3b9cff', '#b84dff'];
  ctx.lineWidth = R * 0.14;
  for (let i = 0; i < rainbow.length; i++) {
    ctx.strokeStyle = rainbow[i];
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, R * (0.12 + i * 0.12), i * 0.9, i * 0.9 + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.14, 0, Math.PI * 2); ctx.fill();
  candyPath(ctx, color, R);
  ctx.lineWidth = R * 0.07; ctx.strokeStyle = '#fff'; ctx.stroke();
  gloss(ctx, R, 0.6);
}

function drawBottle(ctx, color, R) {
  const p = PAL[color] || PAL[0];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(-R * 0.16, -R * 0.92);
    ctx.lineTo(R * 0.16, -R * 0.92);
    ctx.lineTo(R * 0.18, -R * 0.55);
    ctx.quadraticCurveTo(R * 0.52, -R * 0.42, R * 0.5, -R * 0.1);
    ctx.lineTo(R * 0.5, R * 0.72);
    ctx.quadraticCurveTo(R * 0.5, R * 0.9, R * 0.32, R * 0.9);
    ctx.lineTo(-R * 0.32, R * 0.9);
    ctx.quadraticCurveTo(-R * 0.5, R * 0.9, -R * 0.5, R * 0.72);
    ctx.lineTo(-R * 0.5, -R * 0.1);
    ctx.quadraticCurveTo(-R * 0.52, -R * 0.42, -R * 0.18, -R * 0.55);
    ctx.closePath();
  };
  path();
  const g = ctx.createLinearGradient(-R * 0.5, 0, R * 0.5, 0);
  g.addColorStop(0, p.dark); g.addColorStop(0.35, p.light); g.addColorStop(0.6, p.base); g.addColorStop(1, p.dark);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = R * 0.06; ctx.strokeStyle = p.dark; ctx.stroke();
  // cap
  ctx.fillStyle = '#e8e8f0';
  ctx.fillRect(-R * 0.2, -R * 1.0, R * 0.4, R * 0.16);
  ctx.strokeStyle = '#8a8aa0'; ctx.lineWidth = R * 0.03; ctx.strokeRect(-R * 0.2, -R * 1.0, R * 0.4, R * 0.16);
  // label
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-R * 0.5, R * 0.05, R, R * 0.36);
  ctx.fillStyle = p.base;
  ctx.beginPath(); ctx.arc(0, R * 0.23, R * 0.12, 0, Math.PI * 2); ctx.fill();
  // bubbles inside
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (const [x, y, r] of [[-0.2, -0.2, 0.06], [0.15, 0.6, 0.05], [-0.1, 0.7, 0.04], [0.2, -0.05, 0.04]]) {
    ctx.beginPath(); ctx.arc(x * R, y * R, r * R, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-R * 0.38, -R * 0.2, R * 0.1, R * 0.9);
}

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = new Map();
    this.effects = [];
    this.particles = [];
    this.popups = [];
    this.dying = [];
    this.selected = null;
    this.mode = null; // null | 'hammer' | 'switch'
    this.onAction = null;
    this.shake = 0;
    this.bindInput();
  }

  setGame(game) {
    this.game = game;
    this.effects = []; this.particles = []; this.popups = []; this.dying = [];
    this.selected = null; this.mode = null;
    this.boardLayer = null;
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth, h = parent.clientHeight;
    if (!w || !h) return;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (!this.game) return;
    const W = this.canvas.width, H = this.canvas.height;
    const g = this.game;
    const pad = 8 * dpr;
    const cs = Math.floor(Math.min((W - pad * 2) / g.cols, (H - pad * 2) / g.rows));
    if (cs !== this.cs) this.sprites.clear();
    this.cs = cs;
    this.ox = Math.round((W - cs * g.cols) / 2);
    this.oy = Math.round((H - cs * g.rows) / 2);
    this.boardLayer = null;
  }

  sprite(key, draw) {
    let s = this.sprites.get(key);
    if (s) return s;
    const size = Math.ceil(this.cs * 1.3);
    s = document.createElement('canvas');
    s.width = s.height = size;
    const c = s.getContext('2d');
    c.translate(size / 2, size / 2);
    draw(c, this.cs * 0.44);
    this.sprites.set(key, s);
    return s;
  }

  candySprite(k) {
    if (k.kind === 'bear') return this.sprite('bear' + k.tint, (c, R) => drawBear(c, k.tint, R));
    if (k.bottle) return this.sprite('bottle' + k.color, (c, R) => drawBottle(c, k.color, R));
    const sp = k.special;
    if (sp === 'b') return this.sprite('bomb', (c, R) => drawColorBomb(c, R));
    return this.sprite(k.color + ':' + (sp || ''), (c, R) => {
      if (sp === 'w') drawWrapped(c, k.color, R);
      else if (sp === 'f') drawFish(c, k.color, R);
      else if (sp === 'c') drawColoring(c, k.color, R);
      else { drawBaseCandy(c, k.color, R); if (sp === 'h' || sp === 'v') drawStripes(c, k.color, R, sp); }
    });
  }

  // ---------- input ----------
  bindInput() {
    const cv = this.canvas;
    cv.style.touchAction = 'none';
    let start = null;
    cv.addEventListener('pointerdown', e => {
      if (!this.game) return;
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      const cell = this.cellAt(e);
      start = { x: e.clientX, y: e.clientY, cell, moved: false };
    });
    cv.addEventListener('pointermove', e => {
      if (!start || start.moved || !start.cell || this.mode === 'hammer') return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      const th = (this.cs / this.dpr) * 0.3;
      if (Math.abs(dx) < th && Math.abs(dy) < th) return;
      start.moved = true;
      const dr = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
      const dc = dr ? 0 : Math.sign(dx);
      const to = this.game.get(start.cell.r + dr, start.cell.c + dc);
      this.selected = null;
      if (to) this.action('swap', start.cell, to);
    });
    const up = e => {
      if (!start) return;
      const s = start;
      start = null;
      if (s.moved || !s.cell) return;
      const cell = this.cellAt(e);
      if (cell !== s.cell) return;
      if (this.mode === 'hammer') { this.action('hammer', cell); return; }
      if (this.selected && this.selected !== cell && Math.abs(this.selected.r - cell.r) + Math.abs(this.selected.c - cell.c) === 1) {
        const a = this.selected;
        this.selected = null;
        this.action('swap', a, cell);
      } else {
        this.selected = this.selected === cell ? null : cell;
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { start = null; });
  }

  action(type, a, b) { if (this.onAction) this.onAction(type, a, b); }

  cellAt(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * this.dpr, y = (e.clientY - rect.top) * this.dpr;
    const c = Math.floor((x - this.ox) / this.cs), r = Math.floor((y - this.oy) / this.cs);
    const cell = this.game.get(r, c);
    return cell && cell.tile ? cell : null;
  }

  px(c) { return this.ox + (c + 0.5) * this.cs; }
  py(r) { return this.oy + (r + 0.5) * this.cs; }

  // ---------- events from game ----------
  on(type, d) {
    const now = performance.now();
    switch (type) {
      case 'pop': {
        if (d.candy) this.dying.push(d.candy);
        const col = d.color >= 0 ? PAL[d.color].base : '#ffffff';
        for (let i = 0; i < 7; i++) this.particle(d.c, d.r, col, 1);
        break;
      }
      case 'bearFloat': this.dying.push(d.candy); for (let i = 0; i < 12; i++) this.particle(d.c, d.r, '#ffffff', 1.4); break;
      case 'bearFree': this.effects.push({ type: 'bearFree', ...d, t0: now, dur: 1200 }); for (let i = 0; i < 20; i++) this.particle(d.c + (d.w - 1) / 2, d.r + (d.h - 1) / 2, '#ffe36b', 2); break;
      case 'fish': this.effects.push({ type: 'fish', ...d, t0: now }); break;
      case 'soda': this.effects.push({ type: 'ring', r: d.r, c: d.c, t0: now, dur: 500, color: '#e9a6ff' }); for (let i = 0; i < 10; i++) this.particle(d.c, d.r, '#f4d4ff', 1.8); break;
      case 'jam': for (let i = 0; i < 4; i++) this.particle(d.c, d.r, '#d0103a', 1); break;
      case 'honeyBreak': for (let i = 0; i < 8; i++) this.particle(d.c, d.r, '#ffb42a', 1.4); break;
      case 'ice': for (let i = 0; i < 6; i++) this.particle(d.c, d.r, '#e0f6ff', 1.3); break;
      case 'score': {
        if (d.pts < 60) break;
        const col = d.color >= 0 ? PAL[d.color].light : d.color === -2 ? '#c8f0ff' : d.color === -3 ? '#ff8aa8' : '#ffffff';
        this.popups.push({ x: d.c, y: d.r, text: String(d.pts), color: col, t0: now, big: d.pts >= 1000 });
        break;
      }
      case 'beam': this.effects.push({ type: 'beam', ...d, t0: now, dur: 420 }); this.shake = Math.max(this.shake, 4); break;
      case 'blast': this.effects.push({ type: 'blast', ...d, t0: now, dur: 450 }); this.shake = Math.max(this.shake, 8);
        for (let i = 0; i < 14; i++) this.particle(d.c, d.r, d.color >= 0 ? PAL[d.color].light : '#fff', 2.5);
        break;
      case 'lightning': this.effects.push({ type: 'lightning', ...d, t0: now, dur: 650 }); break;
      case 'flash': this.effects.push({ type: 'flash', t0: now, dur: 700 }); this.shake = 14; break;
      case 'make': this.effects.push({ type: 'ring', r: d.r, c: d.c, t0: now, dur: 380, color: '#ffffff' }); break;
      case 'crumble': for (let i = 0; i < 10; i++) this.particle(d.c, d.r, d.type === 'choc' ? '#6b3a1e' : d.type === 'honey' ? '#ffb42a' : '#e8f4ff', 1.5); break;
      case 'chocGrow': this.effects.push({ type: 'ring', r: d.r, c: d.c, t0: now, dur: 300, color: '#6b3a1e' }); break;
      case 'hammer': this.effects.push({ type: 'hammer', r: d.r, c: d.c, t0: now, dur: 400 }); this.shake = 8; break;
      case 'fish': this.effects.push({ type: 'ring', r: d.r, c: d.c, t0: now, dur: 300, color: '#ffe36b' }); break;
      case 'bombExplode': this.effects.push({ type: 'flash', t0: now, dur: 900 }); this.shake = 20; break;
    }
  }

  particle(c, r, color, power) {
    if (this.particles.length > 500) return;
    const a = Math.random() * Math.PI * 2, s = (0.002 + Math.random() * 0.004) * power;
    this.particles.push({ x: c + 0.5, y: r + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.002, life: 1, color, size: 0.05 + Math.random() * 0.07 });
  }

  // ---------- drawing ----------
  buildBoardLayer() {
    const g = this.game, cs = this.cs;
    const cv = document.createElement('canvas');
    cv.width = this.canvas.width; cv.height = this.canvas.height;
    const c = cv.getContext('2d');
    const tile = (r, col) => { const x = g.get(r, col); return x && x.tile; };
    // soft outer glow
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.35)';
    c.shadowBlur = cs * 0.25;
    c.fillStyle = 'rgba(24,30,90,0.55)';
    for (const cell of g.cells()) if (cell.tile) c.fillRect(this.ox + cell.c * cs - 2, this.oy + cell.r * cs - 2, cs + 4, cs + 4);
    c.restore();
    for (const cell of g.cells()) {
      if (!cell.tile) continue;
      c.fillStyle = (cell.r + cell.c) % 2 ? 'rgba(52,66,150,0.75)' : 'rgba(40,52,128,0.75)';
      c.fillRect(this.ox + cell.c * cs, this.oy + cell.r * cs, cs, cs);
    }
    c.strokeStyle = 'rgba(210,225,255,0.85)';
    c.lineWidth = Math.max(2, cs * 0.04);
    c.lineCap = 'round';
    c.beginPath();
    for (const cell of g.cells()) {
      if (!cell.tile) continue;
      const x = this.ox + cell.c * cs, y = this.oy + cell.r * cs;
      if (!tile(cell.r - 1, cell.c)) { c.moveTo(x, y); c.lineTo(x + cs, y); }
      if (!tile(cell.r + 1, cell.c)) { c.moveTo(x, y + cs); c.lineTo(x + cs, y + cs); }
      if (!tile(cell.r, cell.c - 1)) { c.moveTo(x, y); c.lineTo(x, y + cs); }
      if (!tile(cell.r, cell.c + 1)) { c.moveTo(x + cs, y); c.lineTo(x + cs, y + cs); }
    }
    c.stroke();
    this.boardLayer = cv;
  }

  roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  cellRect(cell, m = 0) {
    const cs = this.cs;
    return [this.ox + cell.c * cs + m, this.oy + cell.r * cs + m, cs - 2 * m, cs - 2 * m];
  }

  drawJam(c, cell) {
    const cs = this.cs, [x, y, w, h] = this.cellRect(cell, cs * 0.03);
    const g = c.createRadialGradient(x + w * 0.4, y + h * 0.35, cs * 0.05, x + w / 2, y + h / 2, cs * 0.7);
    g.addColorStop(0, '#ff6a8a'); g.addColorStop(1, '#a8001e');
    c.fillStyle = g;
    this.roundRect(c, x, y, w, h, cs * 0.22);
    c.globalAlpha = 0.8; c.fill(); c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.ellipse(x + w * 0.3, y + h * 0.25, w * 0.14, h * 0.07, -0.5, 0, Math.PI * 2); c.fill();
  }

  drawIce(c, cell) {
    const cs = this.cs, [x, y, w, h] = this.cellRect(cell, cs * 0.03);
    this.roundRect(c, x, y, w, h, cs * 0.12);
    c.fillStyle = cell.ice >= 2 ? 'rgba(190,232,255,0.82)' : 'rgba(205,240,255,0.55)';
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = cs * (cell.ice >= 2 ? 0.06 : 0.035); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = cs * 0.02;
    c.beginPath();
    c.moveTo(x + w * 0.15, y + h * 0.2); c.lineTo(x + w * 0.4, y + h * 0.45); c.lineTo(x + w * 0.3, y + h * 0.8);
    c.moveTo(x + w * 0.4, y + h * 0.45); c.lineTo(x + w * 0.8, y + h * 0.55);
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    this.roundRect(c, x + w * 0.1, y + h * 0.08, w * 0.45, h * 0.1, cs * 0.05); c.fill();
  }

  drawRectBear(c, b, t, alpha = 1) {
    const cs = this.cs;
    const x = this.ox + (b.c + b.w / 2) * cs, y = this.oy + (b.r + b.h / 2) * cs;
    const spr = this.sprite('bear' + b.tint, (cc, R) => drawBear(cc, b.tint, R));
    const size = Math.min(b.w, b.h) * cs * 1.05;
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.drawImage(spr, -size * 0.65, -size * 0.65, size * 1.3, size * 1.3);
    c.restore();
  }

  drawHoneyBear(c, b) {
    const cs = this.cs;
    const x = this.ox + b.c * cs + cs * 0.04, y = this.oy + b.r * cs + cs * 0.04, w = b.w * cs - cs * 0.08, h = b.h * cs - cs * 0.08;
    this.drawRectBear(c, b, 0, 1);
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(255,214,90,0.75)'); g.addColorStop(1, 'rgba(232,140,10,0.85)');
    this.roundRect(c, x, y, w, h, cs * 0.25);
    c.fillStyle = g; c.globalAlpha = 0.45 + 0.4 * (b.hp / b.maxHp); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = '#b86a00'; c.lineWidth = cs * 0.05; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    this.roundRect(c, x + w * 0.08, y + h * 0.06, w * 0.5, cs * 0.1, cs * 0.05); c.fill();
    c.font = `${Math.round(cs * 0.34)}px "Lilita One", sans-serif`;
    c.textAlign = 'right'; c.textBaseline = 'bottom';
    c.lineWidth = cs * 0.06; c.strokeStyle = '#6a3a00'; c.strokeText(b.hp, x + w - cs * 0.06, y + h - cs * 0.02);
    c.fillStyle = '#fff'; c.fillText(b.hp, x + w - cs * 0.06, y + h - cs * 0.02);
  }

  drawHoney(c, cell) {
    const cs = this.cs, [x, y, w, h] = this.cellRect(cell, cs * 0.05);
    this.roundRect(c, x, y, w, h, cs * 0.25);
    c.fillStyle = 'rgba(255,176,30,0.55)'; c.fill();
    c.strokeStyle = '#c87800'; c.lineWidth = cs * 0.05; c.stroke();
    c.fillStyle = 'rgba(255,190,40,0.85)';
    c.beginPath(); c.ellipse(x + w * 0.3, y + h, w * 0.1, h * 0.12, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(x + w * 0.7, y + h * 0.98, w * 0.07, h * 0.09, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    this.roundRect(c, x + w * 0.12, y + h * 0.08, w * 0.4, h * 0.1, cs * 0.05); c.fill();
  }

  // Fizzy soda filling the board from the bottom.
  drawSoda(c, t) {
    const g = this.game, cs = this.cs;
    if (!g.sodaOn || g.sodaVis <= 0) return;
    const top = this.oy + (g.rows - g.sodaVis) * cs;
    const bottom = this.oy + g.rows * cs;
    c.save();
    c.beginPath();
    for (const cell of g.cells()) if (cell.tile) c.rect(this.ox + cell.c * cs, this.oy + cell.r * cs, cs, cs);
    c.clip();
    c.beginPath();
    c.moveTo(this.ox, bottom);
    const W = g.cols * cs;
    for (let x = 0; x <= W; x += cs / 6) c.lineTo(this.ox + x, top + Math.sin(x / cs * 1.6 + t / 300) * cs * 0.06);
    c.lineTo(this.ox + W, bottom);
    c.closePath();
    const grd = c.createLinearGradient(0, top, 0, bottom);
    grd.addColorStop(0, 'rgba(240,130,255,0.55)'); grd.addColorStop(1, 'rgba(140,50,220,0.6)');
    c.fillStyle = grd; c.fill();
    // rising bubbles
    if (!this.bubbles) this.bubbles = [];
    if (this.bubbles.length < 40 && Math.random() < 0.3) this.bubbles.push({ x: Math.random() * g.cols, y: g.rows, s: 0.03 + Math.random() * 0.06, v: 0.0008 + Math.random() * 0.0012 });
    c.fillStyle = 'rgba(255,255,255,0.55)';
    const sTop = g.rows - g.sodaVis;
    this.bubbles = this.bubbles.filter(b => b.y > sTop);
    for (const b of this.bubbles) {
      b.y -= b.v * 16;
      c.beginPath(); c.arc(this.ox + b.x * cs, this.oy + b.y * cs, cs * b.s, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = 'rgba(255,230,255,0.9)'; c.lineWidth = cs * 0.04;
    c.beginPath();
    for (let x = 0; x <= W; x += cs / 6) {
      const yy = top + Math.sin(x / cs * 1.6 + t / 300) * cs * 0.06;
      if (x === 0) c.moveTo(this.ox + x, yy); else c.lineTo(this.ox + x, yy);
    }
    c.stroke();
    c.restore();
  }

  drawBlocker(c, cell) {
    const cs = this.cs, x = this.ox + cell.c * cs, y = this.oy + cell.r * cs, b = cell.blocker, m = cs * 0.03;
    if (b.type === 'hbear') return;
    if (b.type === 'frost') {
      const tints = ['#ffffff', '#e2f1ff', '#c4e2ff', '#a8d0fa', '#8fbdf0'];
      const tint = tints[Math.min(4, b.hp - 1)];
      const g = c.createLinearGradient(x, y, x, y + cs);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, tint);
      this.roundRect(c, x + m, y + m, cs - 2 * m, cs - 2 * m, cs * 0.2);
      c.fillStyle = g; c.fill();
      c.strokeStyle = '#7aa6d8'; c.lineWidth = cs * 0.035; c.stroke();
      // layered meringue swirls
      c.strokeStyle = 'rgba(110,150,210,0.55)'; c.lineWidth = cs * 0.03;
      for (let i = 0; i < b.hp; i++) {
        c.beginPath();
        c.arc(x + cs / 2, y + cs / 2, cs * (0.08 + i * 0.07), 0, Math.PI * 2);
        c.stroke();
      }
      if (b.hp > 1) {
        c.font = `bold ${Math.round(cs * 0.26)}px sans-serif`;
        c.textAlign = 'right'; c.textBaseline = 'bottom';
        c.fillStyle = '#3f6da8';
        c.fillText(b.hp, x + cs - m * 4, y + cs - m * 3);
      }
    } else if (b.type === 'choc') {
      this.roundRect(c, x + m, y + m, cs - 2 * m, cs - 2 * m, cs * 0.12);
      c.fillStyle = '#4a2410'; c.fill();
      const q = (cs - 2 * m) / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const qx = x + m + i * q + cs * 0.04, qy = y + m + j * q + cs * 0.04, qs = q - cs * 0.08;
        const g = c.createLinearGradient(qx, qy, qx + qs, qy + qs);
        g.addColorStop(0, '#9b5a30'); g.addColorStop(1, '#5c2e12');
        this.roundRect(c, qx, qy, qs, qs, cs * 0.05);
        c.fillStyle = g; c.fill();
      }
    }
  }

  drawCandy(c, k, t) {
    const cs = this.cs;
    const spr = this.candySprite(k);
    let scale = k.scale, rot = k.rot;
    const h = this.game.hint;
    if (h && (h.a.candy === k || h.b.candy === k)) {
      rot += Math.sin(t / 70) * 0.18 * Math.max(0, Math.sin(t / 400));
      scale *= 1 + 0.06 * Math.max(0, Math.sin(t / 400));
    }
    if (this.selected && this.selected.candy === k) scale *= 1.1 + Math.sin(t / 120) * 0.05;
    if (k.armed) scale *= 1.05 + Math.sin(t / 60) * 0.1;
    const x = this.px(k.x), y = this.py(k.y);
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, k.alpha));
    c.translate(x, y);
    if (rot) c.rotate(rot);
    if (k.armed) {
      c.fillStyle = 'rgba(255,255,200,0.45)';
      c.beginPath(); c.arc(0, 0, cs * 0.55, 0, Math.PI * 2); c.fill();
    }
    if (scale !== 1) c.scale(scale, scale);
    c.drawImage(spr, -spr.width / 2, -spr.height / 2);
    c.restore();
  }

  draw(t, dt) {
    const c = this.ctx, g = this.game;
    if (!g || !this.cs) return;
    if (!this.boardLayer) this.buildBoardLayer();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.shake > 0.3) {
      c.translate((Math.random() - 0.5) * this.shake * this.dpr, (Math.random() - 0.5) * this.shake * this.dpr);
      this.shake *= Math.pow(0.9, dt / 16);
    }
    c.drawImage(this.boardLayer, 0, 0);
    const cs = this.cs;
    for (const cell of g.cells()) if (cell.tile && cell.jam) this.drawJam(c, cell);
    for (const b of g.iceBears) if (!b.freed) this.drawRectBear(c, b, t, 0.95);
    for (const cell of g.cells()) if (cell.tile && cell.ice) this.drawIce(c, cell);
    for (const cell of g.cells()) if (cell.blocker) this.drawBlocker(c, cell);
    this.drawSoda(c, t);
    if (this.selected && this.selected.tile) {
      c.fillStyle = 'rgba(255,255,255,0.25)';
      this.roundRect(c, this.ox + this.selected.c * cs + 2, this.oy + this.selected.r * cs + 2, cs - 4, cs - 4, cs * 0.15);
      c.fill();
    }
    // candies, clipped to the board so new candies slide in from the top
    c.save();
    c.beginPath();
    c.rect(this.ox, this.oy, cs * g.cols, cs * g.rows);
    c.clip();
    this.dying = this.dying.filter(k => k.alpha > 0.01);
    for (const k of this.dying) this.drawCandy(c, k, t);
    for (const cell of g.cells()) if (cell.candy && !cell.candy.dying) this.drawCandy(c, cell.candy, t);
    c.restore();
    for (const cell of g.cells()) if (cell.honey) this.drawHoney(c, cell);
    for (const hb of g.honeyBears) if (!hb.freed) this.drawHoneyBear(c, hb);
    // Ghost of each trapped ice bear so players can see what they're freeing.
    for (const b of g.iceBears) if (!b.freed) this.drawRectBear(c, b, t, 0.38);
    this.drawEffects(c, t, dt);
  }

  drawEffects(c, t, dt) {
    const cs = this.cs, g = this.game;
    const W = cs * g.cols, H = cs * g.rows;
    this.effects = this.effects.filter(e => t - e.t0 < (e.dur || 480));
    for (const e of this.effects) {
      const p = (t - e.t0) / (e.dur || 480);
      c.save();
      if (e.type === 'beam') {
        const col = e.color >= 0 ? PAL[e.color].light : '#ffffff';
        const w = cs * (e.big ? 0.9 : 0.6) * (1 - p);
        c.globalAlpha = 1 - p * 0.6;
        c.globalCompositeOperation = 'lighter';
        const ext = Math.min(1, p * 3);
        if (e.dir === 'h') {
          const y = this.py(e.r), x0 = this.px(e.c);
          const grd = c.createLinearGradient(0, y - w, 0, y + w);
          grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, col); grd.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = grd;
          const l = Math.max(x0 - this.ox, this.ox + W - x0) * ext;
          c.fillRect(Math.max(this.ox, x0 - l), y - w, Math.min(W, l * 2), w * 2);
          c.fillStyle = '#fff';
          c.fillRect(Math.max(this.ox, x0 - l), y - w * 0.15, Math.min(W, l * 2), w * 0.3);
        } else {
          const x = this.px(e.c), y0 = this.py(e.r);
          const grd = c.createLinearGradient(x - w, 0, x + w, 0);
          grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, col); grd.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = grd;
          const l = Math.max(y0 - this.oy, this.oy + H - y0) * ext;
          c.fillRect(x - w, Math.max(this.oy, y0 - l), w * 2, Math.min(H, l * 2));
          c.fillStyle = '#fff';
          c.fillRect(x - w * 0.15, Math.max(this.oy, y0 - l), w * 0.3, Math.min(H, l * 2));
        }
      } else if (e.type === 'blast') {
        const x = this.px(e.c), y = this.py(e.r);
        const rad = cs * (e.radius + 0.5) * U.ease.outCubic(p) * 1.3;
        c.globalCompositeOperation = 'lighter';
        const grd = c.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, `rgba(255,255,220,${0.9 * (1 - p)})`);
        grd.addColorStop(0.7, `rgba(255,200,120,${0.5 * (1 - p)})`);
        grd.addColorStop(1, 'rgba(255,150,80,0)');
        c.fillStyle = grd;
        c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
        c.strokeStyle = `rgba(255,255,255,${1 - p})`; c.lineWidth = cs * 0.08 * (1 - p);
        c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.stroke();
      } else if (e.type === 'ring') {
        const x = this.px(e.c), y = this.py(e.r);
        c.strokeStyle = e.color; c.globalAlpha = 1 - p; c.lineWidth = cs * 0.08;
        c.beginPath(); c.arc(x, y, cs * (0.3 + p * 0.5), 0, Math.PI * 2); c.stroke();
      } else if (e.type === 'lightning') {
        const x0 = this.px(e.c), y0 = this.py(e.r);
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
        const shown = Math.ceil(e.targets.length * Math.min(1, p * 2.5));
        const rnd = U.seeded(Math.floor(t / 50));
        for (let i = 0; i < shown; i++) {
          const [r, cc] = e.targets[i];
          const x1 = this.px(cc), y1 = this.py(r);
          for (const [lw, col] of [[cs * 0.12, 'rgba(120,200,255,0.5)'], [cs * 0.04, '#ffffff']]) {
            c.strokeStyle = col; c.lineWidth = lw;
            c.beginPath(); c.moveTo(x0, y0);
            const seg = 6;
            for (let s = 1; s < seg; s++) {
              const f = s / seg;
              c.lineTo(x0 + (x1 - x0) * f + (rnd() - 0.5) * cs * 0.4, y0 + (y1 - y0) * f + (rnd() - 0.5) * cs * 0.4);
            }
            c.lineTo(x1, y1); c.stroke();
          }
        }
      } else if (e.type === 'fish') {
        const p2 = Math.min(1, p);
        const x0 = this.px(e.c), y0 = this.py(e.r), x1 = this.px(e.tc), y1 = this.py(e.tr);
        const lift = -cs * 1.2 * Math.sin(Math.PI * p2);
        const x = x0 + (x1 - x0) * p2, y = y0 + (y1 - y0) * p2 + lift;
        const ang = Math.atan2((y1 - y0) + (-cs * 1.2 * Math.PI * Math.cos(Math.PI * p2)), x1 - x0);
        const spr = this.sprite(e.color + ':f', (cc, R) => drawFish(cc, Math.max(0, e.color), R));
        c.translate(x, y);
        c.rotate(ang + Math.PI);
        c.drawImage(spr, -spr.width / 2, -spr.height / 2);
      } else if (e.type === 'bearFree') {
        const lift = U.ease.outCubic(p) * cs * 1.5;
        c.translate(0, -lift);
        this.drawRectBear(c, e, t, 1 - Math.max(0, p - 0.6) / 0.4);
      } else if (e.type === 'flash') {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = `rgba(255,255,255,${0.85 * (1 - p)})`;
        c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else if (e.type === 'hammer') {
        const x = this.px(e.c), y = this.py(e.r);
        c.translate(x + cs * 0.4, y - cs * 0.4);
        c.rotate(-1.2 + U.ease.inQuad(Math.min(1, p * 1.6)) * 1.4);
        c.fillStyle = '#f2e6c8'; c.fillRect(-cs * 0.05, 0, cs * 0.1, cs * 0.9);
        c.translate(0, 0);
        const grd = c.createRadialGradient(0, 0, 0, 0, 0, cs * 0.4);
        grd.addColorStop(0, '#ff8ad0'); grd.addColorStop(1, '#d01a7a');
        c.fillStyle = grd;
        c.beginPath(); c.arc(0, 0, cs * 0.38, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = cs * 0.06;
        c.beginPath(); c.arc(0, 0, cs * 0.22, 0, Math.PI * 1.5); c.stroke();
      }
      c.restore();
    }
    // particles
    const k = dt;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.00001 * k; p.life -= 0.0018 * k;
      c.globalAlpha = Math.max(0, p.life);
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(this.ox + p.x * cs, this.oy + p.y * cs, cs * p.size, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    // score popups
    this.popups = this.popups.filter(p => t - p.t0 < 900);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (const p of this.popups) {
      const q = (t - p.t0) / 900;
      const fs = Math.round(cs * (p.big ? 0.42 : 0.32) * (q < 0.15 ? 0.6 + q * 2.6 : 1));
      c.font = `${fs}px "Lilita One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
      c.globalAlpha = q > 0.7 ? (1 - q) / 0.3 : 1;
      const x = this.px(p.x), y = this.py(p.y) - q * cs * 0.6;
      c.lineWidth = fs * 0.18; c.strokeStyle = 'rgba(40,10,60,0.9)';
      c.strokeText(p.text, x, y);
      c.fillStyle = p.color; c.fillText(p.text, x, y);
    }
    c.globalAlpha = 1;
  }
}

if (typeof window !== 'undefined') window.drawCandyIcon = (ctx, color, special, R) => {
  if (special === 'b') drawColorBomb(ctx, R);
  else if (special === 'bear') drawBear(ctx, color, R);
  else if (special === 'bottle') drawBottle(ctx, color, R);
  else if (special === 'f') drawFish(ctx, color, R);
  else if (special === 'c') drawColoring(ctx, color, R);
  else if (special === 'w') drawWrapped(ctx, color, R);
  else { drawBaseCandy(ctx, color, R); if (special === 'h' || special === 'v') drawStripes(ctx, color, R, special); }
};
