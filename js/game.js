'use strict';
// Soda-rules match-3 engine. No DOM access: rendering, sound and UI subscribe via
// `emit(type, data)`.
// Specials: 'h'/'v' striped, 'w' wrapped, 'f' Swedish fish, 'c' coloring candy, 'b' color bomb.
// Board features: soda (candies float up inside it), bottles, soda bears, ice + bears,
// honey candies, honey bears, jam, frosting, chocolate.

const COLOR_COUNT_MAX = 6;
const NOOP = () => {};

class Game {
  constructor(level, opts = {}) {
    this.L = level;
    this.tw = opts.tweener || new Tweener();
    this.emit = opts.emit || NOOP;
    this.sfx = opts.sfx || NOOP;
    this.colors = Math.min(COLOR_COUNT_MAX, level.colors || 6);
    this.score = 0;
    this.moves = level.moves || 0;
    this.state = 'idle'; // idle | busy | over
    this.nextId = 1;
    this.sodaOn = level.type === 'soda' || level.soda != null;
    this.soda = level.soda || 0; // rows of soda, counted from the bottom
    this.sodaVis = this.soda;
    this.bearsFreed = 0;
    this.bearsSpawned = 0;
    this.chocHit = false;
    this.idleTime = 0;
    this.hint = null;
    this.moveCascade = 0;
    this.moveCount = 0;
    this.blastStamp = 0;
    this.fishTargets = new Set();
    this.stars = level.stars;
    this.result = null;
    this.build();
  }

  // ---------- setup ----------
  build() {
    const g = this.L.grid;
    this.rows = g.length;
    this.cols = g[0].length;
    this.grid = [];
    const bearStart = [], bottleStart = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = g[r][c] || 'X';
        const cell = { r, c, tile: ch !== 'X', ice: 0, blocker: null, honey: false, jam: false, candy: null };
        if (ch === 'i') cell.ice = 1;
        else if (ch === 'I') cell.ice = 2;
        else if (ch >= '1' && ch <= '5') cell.blocker = { type: 'frost', hp: +ch };
        else if (ch === 'C') cell.blocker = { type: 'choc' };
        else if (ch === 'H') cell.honey = true;
        else if (ch === 'J') cell.jam = true;
        else if (ch === 'B') bearStart.push(cell);
        else if (ch === 'O') bottleStart.push(cell);
        row.push(cell);
      }
      this.grid.push(row);
    }
    // Bears hidden under ice: [r, c, w, h]
    this.iceBears = (this.L.iceBears || []).map(([r, c, w, h], i) => ({ id: i, r, c, w, h, freed: false, tint: i % 4 }));
    // Honey bears are multi-cell blockers: [r, c, w, h, hp]
    this.honeyBears = (this.L.honeyBears || []).map(([r, c, w, h, hp], i) => {
      const bear = { id: i, r, c, w, h, hp: hp || 2, maxHp: hp || 2, freed: false, tint: (i + 1) % 4 };
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) this.grid[y][x].blocker = { type: 'hbear', bear };
      return bear;
    });
    this.fillInitial();
    for (const cell of bearStart) { cell.candy = this.makeBear(); cell.candy.x = cell.c; cell.candy.y = cell.r; this.bearsSpawned++; }
    for (const cell of bottleStart) if (cell.candy) cell.candy.bottle = true;
    let guard = 0;
    while (!this.findMoves().length && guard++ < 50) this.fillInitial();
  }

  fillInitial() {
    for (const cell of this.cells()) {
      if (!cell.tile || cell.blocker) continue;
      if (cell.candy && cell.candy.kind !== 'candy') continue;
      const bad = new Set();
      const l1 = this.get(cell.r, cell.c - 1), l2 = this.get(cell.r, cell.c - 2);
      const u1 = this.get(cell.r - 1, cell.c), u2 = this.get(cell.r - 2, cell.c);
      const ul = this.get(cell.r - 1, cell.c - 1);
      const cl1 = this.matchColor(l1), cu1 = this.matchColor(u1);
      if (cl1 >= 0 && cl1 === this.matchColor(l2)) bad.add(cl1);
      if (cu1 >= 0 && cu1 === this.matchColor(u2)) bad.add(cu1);
      // avoid ready-made 2x2 squares
      if (cl1 >= 0 && cl1 === cu1 && cl1 === this.matchColor(ul)) bad.add(cl1);
      let color;
      do { color = U.ri(this.colors); } while (bad.has(color));
      const keepBottle = cell.candy && cell.candy.bottle;
      cell.candy = this.makeCandy(color);
      cell.candy.bottle = !!keepBottle;
      cell.candy.x = cell.c; cell.candy.y = cell.r;
    }
  }

  makeCandy(color, special = null) {
    return { id: this.nextId++, kind: 'candy', color, special, bottle: false, x: 0, y: 0, scale: 1, alpha: 1, rot: 0, armed: false, radius: 1, movedAt: 0, dying: false };
  }

  makeBear() {
    const c = this.makeCandy(-1);
    c.kind = 'bear';
    c.tint = this.bearsSpawned % 4;
    return c;
  }

  // ---------- helpers ----------
  get(r, c) { return r >= 0 && r < this.rows && c >= 0 && c < this.cols ? this.grid[r][c] : null; }
  *cells() { for (const row of this.grid) yield* row; }
  playable(cell) { return !!(cell && cell.tile && !cell.blocker); }
  emptyPlayable(cell) { return this.playable(cell) && !cell.candy; }
  canSwap(cell) { return this.playable(cell) && cell.candy && !cell.honey && !cell.candy.armed && !cell.candy.dying; }
  movable(cell) { return this.playable(cell) && cell.candy && !cell.honey && !cell.candy.dying; }
  matchColor(cell) {
    if (!cell || !cell.tile || cell.blocker || !cell.candy) return -1;
    const k = cell.candy;
    if (k.kind !== 'candy' || k.special === 'b' || k.armed || k.dying) return -1;
    return k.color;
  }
  sodaTop() { return this.sodaOn ? this.rows - this.soda : this.rows; }
  dirOf(r) { return r >= this.sodaTop() ? -1 : 1; } // -1: floats up (in soda), 1: falls down
  // Nearest tile that feeds this cell (against the flow), staying in the same region.
  srcTile(cell) {
    const g = this.dirOf(cell.r);
    for (let i = cell.r - g; i >= 0 && i < this.rows && this.dirOf(i) === g; i -= g) if (this.grid[i][cell.c].tile) return this.grid[i][cell.c];
    return null;
  }
  dstTile(cell) {
    const g = this.dirOf(cell.r);
    for (let i = cell.r + g; i >= 0 && i < this.rows && this.dirOf(i) === g; i += g) if (this.grid[i][cell.c].tile) return this.grid[i][cell.c];
    return null;
  }
  iceLeft() { let n = 0; for (const cell of this.cells()) if (cell.ice) n++; return n; }
  jamLeft() { let n = 0; for (const cell of this.cells()) if (cell.tile && !cell.jam) n++; return n; }
  bearsTotal() {
    const t = this.L.type;
    if (t === 'soda') return this.L.bearCount;
    if (t === 'ice') return this.iceBears.length;
    if (t === 'honey') return this.honeyBears.length;
    return 0;
  }
  neighbors(cell) {
    return [this.get(cell.r - 1, cell.c), this.get(cell.r + 1, cell.c), this.get(cell.r, cell.c - 1), this.get(cell.r, cell.c + 1)].filter(Boolean);
  }
  addScore(pts, r, c, color) {
    if (!pts) return;
    this.score += pts;
    this.emit('score', { pts, r, c, color });
  }

  // ---------- matching ----------
  findGroups() {
    const runs = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const col = this.matchColor(this.grid[r][c]);
        let e = c + 1;
        if (col >= 0) while (e < this.cols && this.matchColor(this.grid[r][e]) === col) e++;
        if (col >= 0 && e - c >= 3) runs.push({ dir: 'h', cells: this.grid[r].slice(c, e) });
        c = e;
      }
    }
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const col = this.matchColor(this.grid[r][c]);
        let e = r + 1;
        if (col >= 0) while (e < this.rows && this.matchColor(this.grid[e][c]) === col) e++;
        if (col >= 0 && e - r >= 3) {
          const cells = [];
          for (let i = r; i < e; i++) cells.push(this.grid[i][c]);
          runs.push({ dir: 'v', cells });
        }
        r = e;
      }
    }
    // 2x2 squares make Swedish fish.
    for (let r = 0; r < this.rows - 1; r++) for (let c = 0; c < this.cols - 1; c++) {
      const col = this.matchColor(this.grid[r][c]);
      if (col < 0) continue;
      const sq = [this.grid[r][c], this.grid[r][c + 1], this.grid[r + 1][c], this.grid[r + 1][c + 1]];
      if (sq.every(x => this.matchColor(x) === col)) runs.push({ dir: 'sq', cells: sq });
    }
    const groups = [];
    for (const run of runs) {
      const hits = groups.filter(g => run.cells.some(cell => g.cells.has(cell)));
      let g;
      if (!hits.length) { g = { runs: [], cells: new Set() }; groups.push(g); }
      else {
        g = hits[0];
        for (const o of hits.slice(1)) {
          o.runs.forEach(x => g.runs.push(x));
          o.cells.forEach(x => g.cells.add(x));
          groups.splice(groups.indexOf(o), 1);
        }
      }
      g.runs.push(run);
      run.cells.forEach(x => g.cells.add(x));
    }
    for (const g of groups) {
      const lines = g.runs.filter(r => r.dir !== 'sq');
      g.maxLen = lines.length ? Math.max(...lines.map(r => r.cells.length)) : 0;
      g.hasH = lines.some(r => r.dir === 'h');
      g.hasV = lines.some(r => r.dir === 'v');
      g.hasSq = g.runs.some(r => r.dir === 'sq');
      g.type = g.maxLen >= 5 ? 'b'
        : (g.hasH && g.hasV) ? (g.cells.size >= 6 ? 'c' : 'w')
          : g.maxLen === 4 ? 's'
            : g.hasSq ? 'f' : null;
      g.color = this.matchColor([...g.cells][0]);
    }
    return groups;
  }

  hasMatchAt(cell) {
    const col = this.matchColor(cell);
    if (col < 0) return false;
    const same = (r, c) => this.matchColor(this.get(r, c)) === col;
    let n = 1;
    for (let c = cell.c - 1; same(cell.r, c); c--) n++;
    for (let c = cell.c + 1; same(cell.r, c); c++) n++;
    if (n >= 3) return true;
    n = 1;
    for (let r = cell.r - 1; same(r, cell.c); r--) n++;
    for (let r = cell.r + 1; same(r, cell.c); r++) n++;
    if (n >= 3) return true;
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      if (same(cell.r + dr, cell.c) && same(cell.r, cell.c + dc) && same(cell.r + dr, cell.c + dc)) return true;
    }
    return false;
  }

  isCombo(x, y) {
    if (!x || !y || x.kind !== 'candy' || y.kind !== 'candy') return false;
    if (x.special === 'b' || y.special === 'b' || x.special === 'c' || y.special === 'c') return true;
    return !!(x.special && y.special);
  }

  findMoves() {
    const out = [];
    for (const a of this.cells()) {
      if (!this.canSwap(a)) continue;
      for (const b of [this.get(a.r, a.c + 1), this.get(a.r + 1, a.c)]) {
        if (!this.canSwap(b)) continue;
        if (this.isCombo(a.candy, b.candy)) { out.push({ a, b, value: 10 }); continue; }
        [a.candy, b.candy] = [b.candy, a.candy];
        const ok = this.hasMatchAt(a) || this.hasMatchAt(b);
        [a.candy, b.candy] = [b.candy, a.candy];
        if (ok) out.push({ a, b, value: 1 });
      }
    }
    return out;
  }

  // ---------- player actions ----------
  async trySwap(a, b, free = false) {
    if (this.state !== 'idle' || !a || !b) return false;
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return false;
    if (!this.canSwap(a) || !this.canSwap(b)) { this.sfx('bad'); return false; }
    this.state = 'busy';
    this.hint = null;
    this.idleTime = 0;
    const x = a.candy, y = b.candy;
    this.sfx('swap');
    a.candy = y; b.candy = x;
    await Promise.all([this.tw.to(x, { x: b.c, y: b.r }, 170, 'inOutQuad'), this.tw.to(y, { x: a.c, y: a.r }, 170, 'inOutQuad')]);
    const combo = this.isCombo(x, y);
    if (!combo && !free && !this.hasMatchAt(a) && !this.hasMatchAt(b)) {
      this.sfx('bad');
      a.candy = x; b.candy = y;
      await Promise.all([this.tw.to(x, { x: a.c, y: a.r }, 170, 'inOutQuad'), this.tw.to(y, { x: b.c, y: b.r }, 170, 'inOutQuad')]);
      this.state = 'idle';
      return false;
    }
    if (!free) this.moves--;
    this.beginMove();
    x.movedAt = y.movedAt = ++this.moveCount * 1000;
    if (combo) await this.runCombo(b, a);
    await this.resolve({ cells: [b, a], dir: a.r === b.r ? 'h' : 'v' });
    await this.endMove(free);
    return true;
  }

  async useHammer(cell) {
    if (this.state !== 'idle' || !cell || !cell.tile) return false;
    if (!cell.candy && !cell.blocker && !cell.ice && !cell.honey) return false;
    if (cell.candy && cell.candy.kind === 'bear') return false;
    this.state = 'busy';
    this.hint = null;
    this.beginMove();
    this.sfx('hammer');
    this.emit('hammer', { r: cell.r, c: cell.c });
    await this.tw.wait(250);
    await this.blast([[cell.r, cell.c, {}]]);
    await this.gravity();
    await this.resolve(null);
    await this.endMove(true);
    return true;
  }

  async useShuffle() {
    if (this.state !== 'idle') return false;
    this.state = 'busy';
    await this.shuffle();
    this.state = 'idle';
    return true;
  }

  placeStartSpecial(type) {
    const cells = [...this.cells()].filter(c => this.canSwap(c) && c.candy.kind === 'candy' && !c.candy.special && !c.candy.bottle);
    if (!cells.length) return;
    const cell = U.pick(cells);
    cell.candy.special = type === 's' ? U.pick(['h', 'v']) : type;
    if (type === 'b') cell.candy.color = -1;
  }

  beginMove() {
    this.chocHit = false;
    this.moveCascade = 0;
    this.moveCleared = 0;
  }

  // ---------- resolution ----------
  async resolve(swap) {
    let guard = 0;
    while (guard++ < 60) {
      const groups = this.findGroups();
      if (groups.length) {
        this.moveCascade++;
        await this.processGroups(groups, swap, this.moveCascade);
        swap = null;
        await this.gravity();
        continue;
      }
      const armed = [...this.cells()].filter(c => c.candy && c.candy.armed);
      if (armed.length) {
        await this.blast([], armed.map(c => ({ type: 'w2', r: c.r, c: c.c, candy: c.candy, jam: c.jam })));
        await this.gravity();
        continue;
      }
      break;
    }
  }

  chooseSpecialCell(g, swap) {
    const cand = [...g.cells].filter(c => c.candy && !c.honey && !c.candy.special && !c.candy.bottle);
    if (!cand.length) return null;
    if (swap) { const s = swap.cells.find(c => cand.includes(c)); if (s) return s; }
    let best = null;
    for (const c of cand) if (!best || c.candy.movedAt > best.candy.movedAt) best = c;
    if (best && best.candy.movedAt > 0) return best;
    const lines = g.runs.filter(r => r.dir !== 'sq');
    if (g.hasH && g.hasV) {
      const hr = lines.find(r => r.dir === 'h'), vr = lines.find(r => r.dir === 'v');
      const inter = hr.cells.find(c => vr.cells.includes(c));
      if (inter && cand.includes(inter)) return inter;
    }
    const run = (lines.length ? lines : g.runs).reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
    const mid = run.cells[Math.floor((run.cells.length - 1) / 2)];
    return cand.includes(mid) ? mid : cand[0];
  }

  async processGroups(groups, swap, cascade) {
    const hits = [];
    const makes = [];
    const adj = new Set();
    for (const g of groups) {
      const base = { b: 200, c: 300, w: 200, s: 120, f: 100 }[g.type] || 60;
      const n = g.cells.size;
      const pts = (base + Math.max(0, n - 5) * 60) * cascade;
      const cellsArr = [...g.cells];
      const mid = cellsArr[Math.floor(cellsArr.length / 2)];
      this.addScore(pts, mid.r, mid.c, g.color);
      // Jam spreads across a match that touches jam.
      if (cellsArr.some(c => c.jam)) for (const c of cellsArr) this.spreadJam(c);
      let sc = null;
      if (g.type) {
        sc = this.chooseSpecialCell(g, swap);
        if (sc) {
          let sp = g.type;
          if (sp === 's') {
            const run = g.runs.find(r => r.dir !== 'sq');
            sp = swap && swap.cells.includes(sc) ? swap.dir : (run.dir === 'h' ? 'v' : 'h');
          }
          makes.push({ cell: sc, sp, others: cellsArr.filter(c => c !== sc) });
        }
      }
      for (const cell of cellsArr) {
        if (cell !== sc) hits.push([cell.r, cell.c, { match: true }]);
        for (const nb of this.neighbors(cell)) if (nb.blocker || nb.honey) adj.add(nb);
      }
    }
    this.sfx('match', cascade);
    if (makes.length) {
      const ps = [];
      for (const m of makes) for (const o of m.others) {
        if (o.candy && !o.candy.special && !o.honey) ps.push(this.tw.to(o.candy, { x: m.cell.c, y: m.cell.r, scale: 0.7 }, 140, 'inQuad'));
      }
      await Promise.all(ps);
      for (const m of makes) {
        const k = m.cell.candy;
        k.special = m.sp;
        if (m.sp === 'b') k.color = -1;
        this.damageIce(m.cell);
        this.emit('make', { r: m.cell.r, c: m.cell.c, sp: m.sp });
        k.scale = 1.4;
        this.tw.to(k, { scale: 1 }, 260, 'outBack');
      }
      this.sfx('special', makes[0].sp);
    }
    for (const b of adj) hits.push([b.r, b.c, { adj: true }]);
    await this.blast(hits);
  }

  spreadJam(cell) {
    if (!cell || !cell.tile || cell.jam) return;
    cell.jam = true;
    this.emit('jam', { r: cell.r, c: cell.c });
    this.addScore(100, cell.r, cell.c, -3);
  }

  async blast(hits, acts = []) {
    this.blastStamp++;
    this.fishTargets = new Set();
    const queue = acts.slice();
    for (const [r, c, o] of hits) this.hit(r, c, queue, o || {});
    let guard = 0;
    let waited = false;
    while (queue.length && guard++ < 300) {
      const wave = queue.splice(0, queue.length);
      for (const a of wave) this.activate(a, queue);
      await this.tw.wait(170);
      waited = true;
    }
    if (hits.length || waited) await this.tw.wait(waited ? 120 : 200);
  }

  hit(r, c, queue, o = {}) {
    const cell = this.get(r, c);
    if (!cell || !cell.tile) return;
    if (o.jam) this.spreadJam(cell);
    if (cell.blocker) {
      if (o.match) return;
      this.damageBlocker(cell);
      return;
    }
    if (cell.honey) {
      // Honey absorbs the hit; the candy inside is freed.
      cell.honey = false;
      this.sfx('honey');
      this.emit('honeyBreak', { r, c });
      this.addScore(60, r, c, -1);
      return;
    }
    if (o.adj) return;
    const k = cell.candy;
    if (!k) { if (!o.match) this.damageIce(cell); return; }
    if (k.kind !== 'candy' || k.dying) return;
    this.damageIce(cell);
    if (k.special) {
      if (k.special === 'w') {
        if (k.armed) return;
        k.armed = true;
        queue.push({ type: 'w', r, c, radius: k.radius, candy: k, color: k.color, jam: cell.jam });
        return;
      }
      this.removeCandy(cell, o.match);
      queue.push({ type: k.special, r, c, color: k.color, candy: k, jam: cell.jam });
      return;
    }
    this.removeCandy(cell, o.match);
  }

  removeCandy(cell, fromMatch) {
    const k = cell.candy;
    if (!k) return;
    cell.candy = null;
    k.dying = true;
    this.moveCleared++;
    if (!fromMatch) this.addScore(60, cell.r, cell.c, k.color);
    if (k.bottle) this.raiseSoda(cell);
    this.emit('pop', { r: cell.r, c: cell.c, color: k.color, special: k.special, candy: k });
    this.tw.to(k, { scale: 0, alpha: 0 }, 180, 'inQuad');
  }

  raiseSoda(cell) {
    if (!this.sodaOn) return;
    this.soda = Math.min(this.rows, this.soda + (this.L.bottleRise || 1));
    this.sfx('soda');
    this.emit('soda', { r: cell.r, c: cell.c });
    this.tw.to(this, { sodaVis: this.soda }, 600, 'outQuad');
  }

  damageIce(cell) {
    if (!cell.ice) return;
    cell.ice--;
    this.addScore(1000, cell.r, cell.c, -2);
    this.emit('ice', { r: cell.r, c: cell.c, left: cell.ice });
    if (cell.ice) return;
    for (const b of this.iceBears) {
      if (b.freed || cell.r < b.r || cell.r >= b.r + b.h || cell.c < b.c || cell.c >= b.c + b.w) continue;
      let clear = true;
      for (let y = b.r; y < b.r + b.h; y++) for (let x = b.c; x < b.c + b.w; x++) if (this.grid[y][x].ice) clear = false;
      if (clear) this.freeBear(b);
    }
  }

  freeBear(b) {
    b.freed = true;
    this.bearsFreed++;
    this.sfx('bear');
    this.addScore(5000, b.r + (b.h - 1) / 2, b.c + (b.w - 1) / 2, -1);
    this.emit('bearFree', { r: b.r, c: b.c, w: b.w, h: b.h, tint: b.tint });
  }

  damageBlocker(cell) {
    const b = cell.blocker;
    if (b.type === 'frost') {
      b.hp--;
      this.sfx('frost');
      this.emit('crumble', { r: cell.r, c: cell.c, type: 'frost' });
      this.addScore(20, cell.r, cell.c, -1);
      if (b.hp <= 0) cell.blocker = null;
    } else if (b.type === 'choc') {
      cell.blocker = null;
      this.chocHit = true;
      this.sfx('choc');
      this.emit('crumble', { r: cell.r, c: cell.c, type: 'choc' });
      this.addScore(20, cell.r, cell.c, -1);
    } else if (b.type === 'hbear') {
      const bear = b.bear;
      if (bear.stamp === this.blastStamp) return; // one honey layer per blast
      bear.stamp = this.blastStamp;
      bear.hp--;
      this.sfx('honey');
      this.emit('crumble', { r: cell.r, c: cell.c, type: 'honey' });
      if (bear.hp <= 0) {
        for (let y = bear.r; y < bear.r + bear.h; y++) for (let x = bear.c; x < bear.c + bear.w; x++) this.grid[y][x].blocker = null;
        this.freeBear(bear);
      }
    }
  }

  colorCounts() {
    const n = new Array(this.colors).fill(0);
    for (const cell of this.cells()) {
      const k = cell.candy;
      if (k && k.kind === 'candy' && k.color >= 0 && !k.dying && !k.special) n[k.color]++;
    }
    return n;
  }

  mostCommonColor(except = -1) {
    const n = this.colorCounts();
    let best = -1;
    for (let i = 0; i < n.length; i++) if (i !== except && n[i] && (best < 0 || n[i] > n[best])) best = i;
    return best;
  }

  // Pick a fish target, preferring cells that advance the level goal.
  fishTarget(fromJam) {
    const taken = this.fishTargets;
    const all = [...this.cells()].filter(c => c.tile && !taken.has(c));
    const inIceBear = c => this.iceBears.some(b => !b.freed && c.r >= b.r && c.r < b.r + b.h && c.c >= b.c && c.c < b.c + b.w);
    const tiers = [
      c => c.ice > 0 && inIceBear(c),
      c => c.blocker && c.blocker.type === 'hbear',
      c => fromJam && !c.jam,
      c => c.candy && c.candy.bottle && !c.candy.dying,
      c => c.blocker || c.honey || c.ice > 0,
      c => this.L.type === 'jam' && !c.jam,
      c => c.candy && c.candy.kind === 'candy' && !c.candy.dying,
    ];
    for (const t of tiers) {
      const opts = all.filter(t);
      if (opts.length) { const pick = U.pick(opts); taken.add(pick); return pick; }
    }
    return null;
  }

  sendFish(from, carry, jam, queue) {
    const t = this.fishTarget(jam);
    if (!t) return;
    this.emit('fish', { r: from.r, c: from.c, tr: t.r, tc: t.c, color: from.color, dur: 480 });
    queue.push({ type: 'fishHit', r: t.r, c: t.c, carry, jam, color: from.color, delay: 2 });
  }

  recolor(from, to, srcR, srcC) {
    const cells = [...this.cells()].filter(c => c.candy && c.candy.kind === 'candy' && c.candy.color === from && !c.candy.special && !c.candy.dying);
    this.emit('lightning', { r: srcR, c: srcC, targets: cells.map(t => [t.r, t.c]), color: to });
    for (const c of cells) {
      c.candy.color = to;
      c.candy.scale = 1.35;
      this.tw.to(c.candy, { scale: 1 }, 260, 'outBack');
    }
  }

  activate(a, queue) {
    const { r, c } = a;
    const jamHit = (rr, cc) => this.hit(rr, cc, queue, { jam: a.jam });
    switch (a.type) {
      case 'h':
      case 'v': {
        this.sfx('stripe');
        this.emit('beam', { r, c, dir: a.type, color: a.color });
        if (a.jam) this.spreadJam(this.get(r, c));
        if (a.type === 'h') { for (let i = 0; i < this.cols; i++) if (i !== c) jamHit(r, i); }
        else for (let i = 0; i < this.rows; i++) if (i !== r) jamHit(i, c);
        break;
      }
      case 'w':
      case 'w1': {
        this.sfx('wrap');
        const rad = a.radius || 1;
        this.emit('blast', { r, c, radius: rad, color: a.color });
        for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) if (dr || dc) jamHit(r + dr, c + dc);
        break;
      }
      case 'w2': {
        let at = null;
        for (const x of this.cells()) if (x.candy === a.candy) at = x;
        if (!at) break;
        const rad = a.candy.radius;
        a.candy.armed = false;
        a.candy.special = null;
        this.removeCandy(at, false);
        this.sfx('wrap');
        this.emit('blast', { r: at.r, c: at.c, radius: rad, color: a.candy.color });
        for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) if (dr || dc) this.hit(at.r + dr, at.c + dc, queue, { jam: at.jam || a.jam });
        break;
      }
      case 'f': {
        this.sfx('fish');
        this.sendFish(a, a.carry || null, a.jam, queue);
        break;
      }
      case 'fishHit': {
        if (a.delay > 0) { a.delay--; queue.push(a); break; }
        jamHit(r, c);
        if (a.carry) queue.push({ type: a.carry, r, c, color: a.color, jam: a.jam, radius: 1 });
        break;
      }
      case 'c': {
        // Coloring candy set off by a blast: paints the most common other color.
        const from = this.mostCommonColor(a.color);
        this.sfx('bomb');
        if (from >= 0 && a.color >= 0) this.recolor(from, a.color, r, c);
        break;
      }
      case 'b': {
        const color = a.target != null ? a.target : this.mostCommonColor();
        this.sfx('bomb');
        const targets = [];
        for (const cell of this.cells()) if (cell.candy && cell.candy.kind === 'candy' && cell.candy.color === color && !cell.candy.dying) targets.push(cell);
        this.emit('lightning', { r, c, targets: targets.map(t => [t.r, t.c]), color });
        for (const t of targets) jamHit(t.r, t.c);
        break;
      }
      case 'cross3': {
        this.sfx('stripe');
        for (let d = -1; d <= 1; d++) {
          this.emit('beam', { r: r + d, c, dir: 'h', color: a.color, big: true });
          this.emit('beam', { r, c: c + d, dir: 'v', color: a.color, big: true });
        }
        for (let d = -1; d <= 1; d++) {
          for (let i = 0; i < this.cols; i++) jamHit(r + d, i);
          for (let i = 0; i < this.rows; i++) jamHit(i, c + d);
        }
        break;
      }
      case 'all': {
        this.sfx('bomb');
        this.emit('flash', {});
        for (const cell of this.cells()) jamHit(cell.r, cell.c);
        break;
      }
    }
  }

  // Turn every plain candy of `color` into special `sp` and set them all off.
  async convertAndFire(color, sp, srcR, srcC, jam) {
    const targets = [...this.cells()].filter(c => c.candy && c.candy.kind === 'candy' && c.candy.color === color && !c.candy.dying && !c.honey);
    this.sfx('bomb');
    this.emit('lightning', { r: srcR, c: srcC, targets: targets.map(t => [t.r, t.c]), color });
    for (const t of targets) {
      if (t.candy.special || t.candy.bottle) continue;
      t.candy.special = (sp === 'h' || sp === 'v') ? U.pick(['h', 'v']) : sp;
      t.candy.scale = 1.3;
      this.tw.to(t.candy, { scale: 1 }, 200, 'outBack');
    }
    this.sfx('special', sp);
    await this.tw.wait(500);
    await this.blast(targets.map(t => [t.r, t.c, { jam }]));
  }

  async runCombo(pos, other) {
    const X = pos.candy, Y = other.candy;
    const sx = X.special, sy = Y.special;
    const has = s => sx === s || sy === s;
    const stripe = s => s === 'h' || s === 'v';
    const big = s => s === 'b' || s === 'c';
    const jam = pos.jam || other.jam;
    this.moveCascade = 1;
    if (big(sx) && big(sy)) {
      this.removeCandy(pos, true); this.removeCandy(other, true);
      this.emit('word', 'combo');
      this.moveCascade = 4;
      await this.tw.wait(150);
      await this.blast([], [{ type: 'all', r: pos.r, c: pos.c, jam }]);
    } else if (has('b')) {
      const bombCell = sx === 'b' ? pos : other;
      const otherCell = bombCell === pos ? other : pos;
      const ok = otherCell.candy;
      this.removeCandy(bombCell, true);
      if (!ok.special) await this.blast([], [{ type: 'b', r: bombCell.r, c: bombCell.c, target: ok.color, jam }]);
      else await this.convertAndFire(ok.color, ok.special, bombCell.r, bombCell.c, jam);
    } else if (has('c')) {
      const cc = sx === 'c' ? pos : other;
      const oc = cc === pos ? other : pos;
      const paint = cc.candy.color, ok = oc.candy;
      this.removeCandy(cc, true);
      this.sfx('bomb');
      if (!ok.special) {
        const from = ok.color !== paint ? ok.color : this.mostCommonColor(paint);
        if (from >= 0) this.recolor(from, paint, cc.r, cc.c);
        await this.tw.wait(450);
      } else {
        await this.convertAndFire(paint, ok.special, cc.r, cc.c, jam);
      }
    } else if (stripe(sx) && stripe(sy)) {
      this.removeCandy(pos, true); this.removeCandy(other, true);
      await this.blast([], [{ type: 'h', r: pos.r, c: pos.c, color: X.color, jam }, { type: 'v', r: pos.r, c: pos.c, color: X.color, jam }]);
    } else if (has('f')) {
      const fc = sx === 'f' ? pos : other;
      const oc = fc === pos ? other : pos;
      const os = oc.candy.special;
      const color = fc.candy.color;
      this.removeCandy(pos, true); this.removeCandy(other, true);
      if (os === 'f') {
        this.emit('word', 'combo');
        await this.blast([], [0, 1, 2].map(() => ({ type: 'f', r: pos.r, c: pos.c, color, jam })));
      } else {
        await this.blast([], [{ type: 'f', r: pos.r, c: pos.c, color, jam, carry: os === 'w' ? 'w1' : os }]);
      }
    } else if (has('w') && (stripe(sx) || stripe(sy))) {
      this.removeCandy(pos, true); this.removeCandy(other, true);
      this.emit('word', 'combo');
      await this.blast([], [{ type: 'cross3', r: pos.r, c: pos.c, color: X.color, jam }]);
    } else if (sx === 'w' && sy === 'w') {
      this.removeCandy(other, true);
      X.radius = 2;
      await this.blast([[pos.r, pos.c]]);
    }
    await this.gravity();
  }

  // ---------- gravity: down above the soda, up inside it ----------
  spawnCandy(cell) {
    const L = this.L;
    const inSoda = this.dirOf(cell.r) < 0;
    // Bears drop in from the top; once soda fills the board they bubble up from below.
    const canBear = !inSoda || this.soda >= this.rows;
    if (L.type === 'soda' && canBear && this.bearsSpawned < L.bearCount && !this._spawnedSpecialThisTick) {
      let onBoard = 0;
      for (const x of this.cells()) if (x.candy && x.candy.kind === 'bear') onBoard++;
      if (onBoard < (L.bearMax || 2) && Math.random() < (onBoard === 0 ? 0.5 : 0.2)) {
        this._spawnedSpecialThisTick = true;
        const k = this.makeBear();
        this.bearsSpawned++;
        return k;
      }
    }
    const k = this.makeCandy(U.ri(this.colors));
    if (this.sodaOn && this.soda < this.rows && Math.random() < (L.bottleChance || 0)) k.bottle = true;
    return k;
  }

  // Process rows from where candies come to rest: bottom of the dry part, top of the soda.
  rowOrder() {
    const top = this.sodaTop();
    const order = [];
    for (let r = top - 1; r >= 0; r--) order.push(r);
    for (let r = top; r < this.rows; r++) order.push(r);
    return order;
  }

  gravityTick(flip) {
    const moved = new Set();
    const moves = [];
    this._spawnedSpecialThisTick = false;
    const order = this.rowOrder();
    for (let c = 0; c < this.cols; c++) {
      for (const r of order) {
        const cell = this.grid[r][c];
        if (!this.emptyPlayable(cell)) continue;
        const u = this.srcTile(cell);
        if (!u) {
          const k = this.spawnCandy(cell);
          k.x = c; k.y = r - this.dirOf(r); k.alpha = 0;
          cell.candy = k;
          moved.add(k);
          moves.push({ k, cell });
        } else if (this.movable(u) && !moved.has(u.candy)) {
          const k = u.candy;
          u.candy = null;
          cell.candy = k;
          moved.add(k);
          moves.push({ k, cell });
        }
      }
    }
    const memo = new Map();
    const fillable = cell => {
      if (memo.has(cell)) return memo.get(cell);
      const u = this.srcTile(cell);
      let v;
      if (!u) v = true;
      else if (u.blocker || u.honey) v = false;
      else if (u.candy) v = !u.candy.dying;
      else v = fillable(u);
      memo.set(cell, v);
      return v;
    };
    const dirs = flip ? [1, -1] : [-1, 1];
    for (const r of order) {
      const g = this.dirOf(r);
      for (let i = 0; i < this.cols; i++) {
        const c = flip ? this.cols - 1 - i : i;
        const cell = this.grid[r][c];
        if (!this.emptyPlayable(cell) || fillable(cell)) continue;
        for (const dc of dirs) {
          const s = this.get(r - g, c + dc);
          if (!s || this.dirOf(s.r) !== g || !this.movable(s) || moved.has(s.candy)) continue;
          const d = this.dstTile(s);
          if (d && this.emptyPlayable(d)) continue;
          const k = s.candy;
          s.candy = null;
          cell.candy = k;
          moved.add(k);
          moves.push({ k, cell });
          memo.clear();
          break;
        }
      }
    }
    return moves;
  }

  async gravity() {
    let dur = 105;
    let flip = false;
    for (let guard = 0; guard < 200; guard++) {
      const moves = this.gravityTick(flip = !flip);
      const freed = this.freeSodaBears();
      if (!moves.length) { if (freed) { await this.tw.wait(250); continue; } break; }
      const stamp = ++this.moveCount * 1000;
      const ps = moves.map(m => {
        m.k.movedAt = stamp + m.cell.c;
        const dist = Math.max(1, Math.abs(m.k.y - m.cell.r));
        return this.tw.to(m.k, { x: m.cell.c, y: m.cell.r, alpha: 1 }, dur * Math.sqrt(dist), 'linear');
      });
      await Promise.all(ps);
      dur = Math.max(55, dur * 0.86);
    }
    this.emit('land', {});
  }

  // Bears are freed as soon as the soda reaches them.
  freeSodaBears() {
    if (!this.sodaOn) return false;
    let any = false;
    const top = this.sodaTop();
    for (const cell of this.cells()) {
      if (cell.r < top || !cell.candy || cell.candy.kind !== 'bear') continue;
      if (Math.abs(cell.candy.y - cell.r) > 0.01) continue;
      const k = cell.candy;
      cell.candy = null;
      k.dying = true;
      this.bearsFreed++;
      this.addScore(5000, cell.r, cell.c, -1);
      this.sfx('bear');
      this.emit('bearFloat', { r: cell.r, c: cell.c, candy: k });
      this.tw.to(k, { y: -1.5, alpha: 0, scale: 1.3 }, 900, 'inQuad');
      any = true;
    }
    return any;
  }

  // ---------- end of move ----------
  async endMove(booster = false) {
    if (!booster && !this.chocHit) {
      const opts = [];
      for (const ch of this.cells()) {
        if (!ch.blocker || ch.blocker.type !== 'choc') continue;
        for (const nb of this.neighbors(ch)) {
          if (this.playable(nb) && nb.candy && nb.candy.kind === 'candy' && !nb.candy.special && !nb.honey) opts.push(nb);
        }
      }
      if (opts.length) {
        const t = U.pick(opts);
        const k = t.candy;
        t.candy = null;
        k.dying = true;
        t.blocker = { type: 'choc' };
        this.sfx('choc');
        this.emit('chocGrow', { r: t.r, c: t.c });
        this.tw.to(k, { scale: 0, alpha: 0 }, 200);
        await this.tw.wait(250);
      }
    }
    if (this.moveCascade >= 2 || this.moveCleared >= 12) {
      const lvl = this.moveCascade >= 6 || this.moveCleared >= 40 ? 4
        : this.moveCascade >= 5 || this.moveCleared >= 30 ? 3
          : this.moveCascade >= 4 || this.moveCleared >= 22 ? 2
            : this.moveCascade >= 3 || this.moveCleared >= 16 ? 1 : 0;
      this.emit('word', ['Sweet!', 'Tasty!', 'Delicious!', 'Divine!', 'Sodalicious!'][lvl]);
    }
    this.emit('hud', {});
    if (this.goalMet()) return this.win();
    if (this.moves <= 0) {
      if (this.L.type === 'score') return this.score >= this.stars[0] ? this.win() : this.finish(false, 'You did not reach the target score.');
      return this.finish(false, this.failReason(), true);
    }
    if (!this.findMoves().length) await this.shuffle();
    this.state = 'idle';
    this.idleTime = 0;
  }

  goalMet() {
    const t = this.L.type;
    if (t === 'soda' || t === 'ice' || t === 'honey') return this.bearsFreed >= this.bearsTotal();
    if (t === 'jam') return this.jamLeft() === 0;
    return false;
  }

  failReason() {
    const t = this.L.type;
    const left = this.bearsTotal() - this.bearsFreed;
    if (t === 'soda' || t === 'ice' || t === 'honey') return `${left} bear${left === 1 ? '' : 's'} still trapped.`;
    if (t === 'jam') return `${this.jamLeft()} square(s) still need jam.`;
    return 'You did not reach the target score.';
  }

  starCount() {
    let n = 0;
    for (const s of this.stars) if (this.score >= s) n++;
    return n;
  }

  update(dt) {
    if (this.state === 'idle') {
      this.idleTime += dt;
      if (this.idleTime > 5000 && !this.hint) {
        const m = this.findMoves();
        if (m.length) this.hint = U.pick(m);
      }
    }
  }

  async continueWith(extraMoves) {
    this.moves += extraMoves;
    this.result = null;
    this.state = 'idle';
    this.idleTime = 0;
    this.emit('hud', {});
  }

  async win() {
    this.state = 'busy';
    if (this.moves > 0 || this.hasSpecials()) await this.sugarCrush();
    return this.finish(true);
  }

  hasSpecials() {
    for (const cell of this.cells()) if (cell.candy && cell.candy.special && !cell.candy.dying) return true;
    return false;
  }

  // Soda-style finale: every move left becomes a Swedish fish.
  async sugarCrush() {
    this.emit('sugarCrush', {});
    await this.tw.wait(1600);
    this.beginMove();
    await this.fireAllSpecials();
    let guard = 0;
    while (this.moves > 0 && guard++ < 200) {
      const opts = [...this.cells()].filter(c => this.canSwap(c) && c.candy.kind === 'candy' && !c.candy.special && !c.candy.bottle);
      if (!opts.length) break;
      const cell = U.pick(opts);
      this.moves--;
      cell.candy.special = 'f';
      cell.candy.scale = 1.5;
      this.tw.to(cell.candy, { scale: 1 }, 220, 'outBack');
      this.addScore(3000, cell.r, cell.c, cell.candy.color);
      this.sfx('special', 'f');
      this.emit('hud', {});
      await this.tw.wait(110);
    }
    await this.tw.wait(300);
    await this.fireAllSpecials();
  }

  async fireAllSpecials() {
    for (let guard = 0; guard < 40; guard++) {
      const specials = [...this.cells()].filter(c => c.candy && c.candy.special && !c.candy.armed && !c.candy.dying && !c.honey);
      if (!specials.length) break;
      await this.blast(specials.slice(0, 4).map(s => [s.r, s.c]));
      await this.gravity();
      await this.resolve(null);
    }
    await this.resolve(null);
  }

  finish(won, reason, canContinue = false) {
    this.state = 'over';
    this.result = { won, reason, stars: won ? Math.max(1, this.starCount()) : 0, score: this.score, canContinue };
    this.emit('end', this.result);
  }

  async shuffle() {
    this.emit('shuffle', {});
    await this.tw.wait(this.tw.instant ? 0 : 900);
    const cells = [...this.cells()].filter(c => this.canSwap(c) && c.candy.kind === 'candy');
    const candies = cells.map(c => c.candy);
    for (let tries = 0; tries < 200; tries++) {
      U.shuffle(candies);
      cells.forEach((c, i) => { c.candy = candies[i]; });
      if (tries > 100) for (const c of cells) if (!c.candy.special) c.candy.color = U.ri(this.colors);
      if (!this.findGroups().length && this.findMoves().length) break;
    }
    await Promise.all(cells.map(c => this.tw.to(c.candy, { x: c.c, y: c.r }, 450, 'inOutQuad')));
    if (this.findGroups().length) { this.beginMove(); await this.resolve(null); }
  }
}

if (typeof module !== 'undefined') module.exports = { Game };
