'use strict';
// Level definitions (Soda rules).
// Grid tokens: X hole, . candy, i/I single/double ice, 1-5 frosting layers,
// C chocolate, H candy stuck in honey, J jam already on the square,
// B soda bear (soda levels), O bottle candy.
// Types: score, soda (raise the soda to free bears), ice (free bears under ice),
// honey (free honey bears), jam (spread jam over every square).
// iceBears: [[row, col, width, height]], honeyBears: [[row, col, width, height, layers]]

const COLOR_NAMES = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];
const FULL = '.........';

const HAND_LEVELS = [
  { type: 'score', moves: 20, colors: 5, grid: [
    'XX.....XX', 'X.......X', FULL, FULL, FULL, FULL, 'X.......X', 'XX.....XX'] },
  { type: 'soda', moves: 22, colors: 5, soda: 2, bearCount: 2, bottleChance: 0.09, grid: [
    '...B.B...', FULL, FULL, FULL, FULL, FULL, FULL, FULL] },
  { type: 'ice', moves: 22, colors: 5, iceBears: [[3, 2, 2, 2], [3, 5, 2, 2]], grid: [
    FULL, FULL, '.iiiiiii.', '.iiiiiii.', '.iiiiiii.', '.iiiiiii.', FULL, FULL] },
  { type: 'jam', moves: 30, colors: 5, grid: [
    'XX.....XX', 'X.......X', FULL, '..J...J..', FULL, FULL, 'X.......X', 'XX.....XX'] },
  { type: 'honey', moves: 25, colors: 5, honeyBears: [[2, 1, 2, 2, 2], [2, 6, 2, 2, 2]], grid: [
    FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL] },
  { type: 'score', moves: 24, colors: 5, grid: [
    FULL, FULL, FULL, '111...111', FULL, FULL, FULL, FULL] },
  { type: 'soda', moves: 26, colors: 5, soda: 1, bearCount: 3, bottleChance: 0.08, grid: [
    'XB.....BX', FULL, FULL, '.2.....2.', FULL, FULL, FULL, 'X.......X'] },
  { type: 'ice', moves: 28, colors: 5, iceBears: [[1, 1, 2, 1], [1, 6, 2, 1], [4, 3, 3, 2]], grid: [
    FULL, '.ii...ii.', FULL, '...iii...', '...III...', '...III...', FULL, FULL] },
  { type: 'jam', moves: 32, colors: 5, grid: [
    'CC.....CC', 'C.......C', FULL, '...J.J...', FULL, FULL, 'C.......C', 'CC.....CC'] },
  { type: 'honey', moves: 28, colors: 5, honeyBears: [[3, 3, 3, 2, 3]], grid: [
    FULL, '.H.H.H.H.', FULL, FULL, FULL, FULL, '.H.H.H.H.', FULL] },
  { type: 'score', moves: 25, colors: 6, grid: [
    FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL] },
  { type: 'soda', moves: 30, colors: 5, soda: 0, bearCount: 4, bearMax: 2, bottleChance: 0.08, grid: [
    'B.......B', FULL, FULL, '.C.....C.', FULL, FULL, FULL, FULL, FULL] },
  { type: 'ice', moves: 30, colors: 5, iceBears: [[0, 0, 2, 2], [0, 7, 2, 2], [6, 0, 2, 2], [6, 7, 2, 2]], grid: [
    'II.....II', 'II.....II', FULL, FULL, FULL, FULL, 'II.....II', 'II.....II'] },
  { type: 'jam', moves: 34, colors: 5, grid: [
    '....X....', FULL, '..22.22..', FULL, 'J.......J', FULL, '..22.22..', FULL, '....X....'] },
  { type: 'honey', moves: 32, colors: 5, honeyBears: [[1, 1, 2, 2, 2], [1, 6, 2, 2, 2], [5, 3, 3, 2, 3]], grid: [
    FULL, FULL, FULL, FULL, '.H.....H.', FULL, FULL, FULL] },
  { type: 'soda', moves: 30, colors: 6, soda: 2, bearCount: 4, bottleChance: 0.1, grid: [
    'XX.B.B.XX', 'X.......X', FULL, FULL, FULL, FULL, FULL, 'X.......X', 'XX.....XX'] },
  { type: 'ice', moves: 32, colors: 5, iceBears: [[2, 1, 3, 3], [2, 5, 3, 3]], grid: [
    FULL, FULL, '.iiiIiii.', '.iiiIiii.', '.iiiIiii.', FULL, '..HHHHH..', FULL] },
  { type: 'jam', moves: 36, colors: 5, grid: [
    'J...J...J', FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL] },
  { type: 'honey', moves: 34, colors: 5, honeyBears: [[0, 3, 3, 2, 3], [4, 0, 2, 2, 2], [4, 7, 2, 2, 2]], grid: [
    FULL, FULL, 'C.......C', FULL, FULL, FULL, FULL, FULL] },
  { type: 'soda', moves: 32, colors: 5, soda: 0, bearCount: 5, bearMax: 2, bottleChance: 0.09, grid: [
    '.B..X..B.', '....X....', '...111...', FULL, FULL, FULL, '.C.....C.', FULL, FULL] },
];

const SHAPES = [
  [FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL, FULL],
  ['XX.....XX', 'X.......X', FULL, FULL, FULL, FULL, FULL, 'X.......X', 'XX.....XX'],
  ['....X....', FULL, FULL, FULL, 'X.......X', FULL, FULL, FULL, '....X....'],
  ['X.X.X.X.X', FULL, FULL, FULL, FULL, FULL, FULL, FULL],
  ['XXX...XXX', 'XX.....XX', 'X.......X', FULL, FULL, FULL, 'X.......X', 'XX.....XX', 'XXX...XXX'],
  [FULL, FULL, '..X...X..', FULL, FULL, '..X...X..', FULL, FULL],
];

function generateLevel(n) {
  const rnd = U.seeded(n * 7919 + 101);
  const types = ['soda', 'ice', 'jam', 'honey', 'score', 'ice', 'soda', 'jam', 'honey'];
  const type = types[n % types.length];
  const diff = Math.min(1, (n - 20) / 40);
  const shape = SHAPES[n % SHAPES.length].map(r => r.split(''));
  const rows = shape.length, cols = shape[0].length;
  const rectOk = (r, c, w, h) => {
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (!shape[y] || shape[y][x] !== '.') return false;
    return true;
  };
  const set = (r, c, ch) => { if (shape[r] && shape[r][c] === '.') shape[r][c] = ch; };
  const L = { type, colors: rnd() < 0.3 + diff * 0.5 ? 6 : 5 };
  // Reserve non-overlapping rectangles (marked '#') for bears.
  const placeRects = (count, sizes) => {
    const out = [];
    for (let tries = 0; tries < 300 && out.length < count; tries++) {
      const [w, h] = sizes[Math.floor(rnd() * sizes.length)];
      const r = 1 + Math.floor(rnd() * Math.max(1, rows - h - 1));
      const c = Math.floor(rnd() * (cols - w + 1));
      if (!rectOk(r, c, w, h)) continue;
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) shape[y][x] = '#';
      out.push([r, c, w, h]);
    }
    return out;
  };
  if (type === 'ice') {
    const bears = placeRects(2 + Math.floor(rnd() * (2 + diff * 2)), [[2, 2], [2, 1], [1, 2], [3, 2]]);
    const dbl = rnd() < 0.2 + diff * 0.5;
    for (const [r, c, w, h] of bears) for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) shape[y][x] = dbl && (x + y) % 2 ? 'I' : 'i';
    for (let k = 0; k < 6; k++) set(Math.floor(rnd() * rows), Math.floor(rnd() * cols), 'i');
    L.iceBears = bears;
    L.moves = 22 + bears.length * 3;
  } else if (type === 'honey') {
    const bears = placeRects(2 + Math.floor(rnd() * (1 + diff * 2)), [[2, 2], [3, 2], [2, 1]]);
    L.honeyBears = bears.map(b => [...b, 1 + Math.floor(rnd() * (2 + diff * 2))]);
    for (let k = 0; k < 2 + diff * 6; k++) set(Math.floor(rnd() * rows), Math.floor(rnd() * cols), 'H');
    L.moves = 20 + bears.length * 3;
  } else if (type === 'jam') {
    set(Math.floor(rows / 2), Math.floor(cols / 2), 'J');
    if (rnd() < 0.5) set(rows - 1, 1, 'J');
    set(1, Math.floor(cols / 2), 'J');
    L.moves = 32 + Math.floor(rnd() * 6);
  } else if (type === 'soda') {
    L.soda = Math.floor(rnd() * 3);
    L.bearCount = 2 + Math.floor(rnd() * (2 + diff * 2));
    L.bearMax = 2;
    L.bottleChance = 0.08;
    set(0, 1, 'B');
    L.moves = 18 + L.bearCount * 3;
  } else {
    L.moves = 24 + Math.floor(rnd() * 8);
  }
  if (rnd() < 0.4 + diff * 0.3) {
    const r = 2 + Math.floor(rnd() * (rows - 4));
    const hp = String(1 + Math.floor(rnd() * (1 + diff * 3)));
    for (let c = 0; c < cols; c++) if (rnd() < 0.6) set(r, c, hp);
  }
  if (rnd() < 0.2 + diff * 0.3) for (const c of [0, cols - 1]) { set(rows - 1, c, 'C'); set(rows - 2, c, 'C'); }
  L.grid = shape.map(r => r.join('').replace(/#/g, '.'));
  return L;
}

// Star thresholds derived from the level goal (tuned against a bot player).
function autoStars(L) {
  let tiles = 0, ice = 0;
  for (const row of L.grid) for (const ch of row) {
    if (ch !== 'X') tiles++;
    if (ch === 'i') ice += 1;
    if (ch === 'I') ice += 2;
  }
  const size = tiles / 72;
  let s1;
  if (L.type === 'soda') s1 = L.bearCount * 5000 + L.moves * 450 * size;
  else if (L.type === 'ice') s1 = ice * 1000 + L.iceBears.length * 5000 + L.moves * 300 * size;
  else if (L.type === 'honey') s1 = L.honeyBears.length * 5000 + L.moves * 450 * size;
  else if (L.type === 'jam') s1 = tiles * 100 + L.moves * 450 * size;
  else s1 = L.moves * 300 * size;
  s1 = Math.round(s1 / 500) * 500 || 500;
  return [1, 1.5, 2.1].map(m => Math.round((s1 * m) / 500) * 500);
}

const LEVEL_COUNT = 60;
function getLevel(n) {
  const L = n <= HAND_LEVELS.length ? JSON.parse(JSON.stringify(HAND_LEVELS[n - 1])) : generateLevel(n);
  if (!L.stars) L.stars = autoStars(L);
  return L;
}

function describeGoal(L) {
  switch (L.type) {
    case 'soda': return `Raise the soda to free ${L.bearCount} bears!`;
    case 'ice': return `Break the ice to free ${L.iceBears.length} bears!`;
    case 'honey': return `Free ${L.honeyBears.length} bears from the honey!`;
    case 'jam': return 'Spread jam over the whole board!';
    default: return `Score ${L.stars[0].toLocaleString()} points in ${L.moves} moves!`;
  }
}

if (typeof module !== 'undefined') module.exports = { HAND_LEVELS, getLevel, LEVEL_COUNT, describeGoal, autoStars, COLOR_NAMES };
