/* =====================================================================
   TINY QUEST - PvP ARENA
   Real-time fighting game mode (not turn based).
   P1: A/D move, W jump, S block, J attack (3-hit combo), K special.
   Modes: Vs CPU (3 levels) and 2 Players on one keyboard.
   Uses globals from game.js: $, view, menu, hero, IMG, mode.
   The engine (createMatch / step / cpuInput) has no DOM code so it can be tested alone.
===================================================================== */
(function () {
'use strict';

const W = 960, H = 540, FLOOR = 450, GRAV = .85;

/* ---------------- fighters ---------------- */
const FIGHTERS = {
  arlo:  { name: 'Arlo',        icon: '🗡️', hp: 104, spd: 4.4, jump: 16,   w: 50, h: 108, dmg: 1,    reach: 84, sp: 'slash', cost: 40, spName: 'Moon Slash',  desc: 'Balanced fighter. Moon Slash fires a glowing crescent across the arena.' },
  king:  { name: 'Slime King',  icon: '👑', hp: 104, spd: 3.3, jump: 14,   w: 92, h: 86,  dmg: 1.05, reach: 90, sp: 'slam',  cost: 50, spName: 'Royal Slam',  desc: 'Slow but heavy. Royal Slam leaps forward and shakes the whole floor.' },
  frost: { name: 'Frost Slime', icon: '❄️', hp: 102, spd: 4.8, jump: 16.5, w: 76, h: 74,  dmg: 1.04,   reach: 80, sp: 'shard', cost: 40, spName: 'Ice Shard',   desc: 'Fast and slippery. Ice Shard slows whoever it hits.' },
  mud:   { name: 'Mud Slime',   icon: '🟤', hp: 108, spd: 3.8, jump: 15,   w: 80, h: 78,  dmg: 1,    reach: 80, sp: 'mud',     cost: 40, spName: 'Mud Lob',      desc: 'From the Murk Marsh. Mud Lob arcs a sticky blob that leaves a puddle slowing anyone who stands in it.' },
  last:  { name: 'Last King Slime', icon: '🌑', hp: 114, spd: 3.5, jump: 15, w: 94, h: 90, dmg: 1.06, reach: 92, sp: 'eclipse', cost: 55, spName: 'Eclipse Fall', desc: 'The final boss. Eclipse Fall calls moon shards crashing down around you, so keep moving!' },
  fire:  { name: 'Fire Slime',  icon: '🔥', hp: 108, spd: 4.1, jump: 15.5, w: 78, h: 76,  dmg: 1,    reach: 82, sp: 'rush',  cost: 45, spName: 'Blazing Rush', desc: 'Aggressive. Blazing Rush charges straight through the arena.' }
};
const ORDER = ['arlo', 'king', 'frost', 'fire', 'mud', 'last'];
const SP_COLOR = { slash: '#9fd8ff', slam: '#ffd23f', shard: '#7fd8ff', rush: '#ff8a3d', mud: '#a9783a', eclipse: '#ffe27a' };

// light, light, heavy finisher. su = startup, ac = active, rec = recovery (frames at 60fps)
const ATK = [
  { su: 5, ac: 4, rec: 12, dmg: 5, kb: 4, stun: 13 },
  { su: 5, ac: 4, rec: 12, dmg: 5, kb: 5, stun: 13 },
  { su: 7, ac: 5, rec: 19, dmg: 9, kb: 9, stun: 24, launch: 1 }
];
const LEVELS = [
  { name: 'Easy',   react: 18, aggr: .30, blk: .25, sp: .25, punish: .10 },
  { name: 'Normal', react: 8,  aggr: .60, blk: .70, sp: .50, punish: .50 },
  { name: 'Hard',   react: 5,  aggr: .80, blk: .85, sp: .80, punish: .60 }
];

/* One arena per adventure level. fric = how slippery the floor is (.7 normal, higher slides more). */
const ARENAS = {
  village: { name: 'Thimble Hollow',    icon: '🏘️', fric: .7,  amb: 'dust',  desc: 'Level 1 · the sunny village. A friendly place for a fight.' },
  forest:  { name: 'Whispering Forest', icon: '🌲', fric: .7,  amb: 'fly',   desc: 'Level 2 · tall pines and glowing fireflies at dusk.' },
  caves:   { name: 'Slime Caves',       icon: '🕳️', fric: .7,  amb: 'dust',  desc: 'Level 3 · dark rock, dripping stalactites and glowing crystals.' },
  throne:  { name: 'Throne Room',       icon: '🏰', fric: .7,  amb: null,    desc: 'Level 4 · the Slime King\'s hall with a red carpet and banners.' },
  peak:    { name: 'Frostbite Peak',    icon: '🧊', fric: .93, amb: 'snow',  desc: 'Level 5 · slippery ice! You slide when you stop moving.' },
  ember:   { name: 'Ember Caverns',     icon: '🌋', fric: .7,  amb: 'ember', desc: 'Level 6 · a volcano glows over cracked, burning rock.' },
  marsh:   { name: 'Murk Marsh',        icon: '🌿', fric: .7,  amb: 'fly',   desc: 'Level 7 · foggy swamp with dead trees and puddles.' },
  spire:   { name: 'Moon Spire',        icon: '🌑', fric: .7,  amb: 'mote',  desc: 'Level 8 · a floating tower under a giant moon.' }
};
const AORDER = ['village', 'forest', 'caves', 'throne', 'peak', 'ember', 'marsh', 'spire'];

const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* =====================================================================
   ENGINE
===================================================================== */
function newFighter(key, side) {
  const d = FIGHTERS[key];
  return {
    key, d, side, x: side ? W - 250 : 250, y: FLOOR, vx: 0, vy: 0, face: side ? -1 : 1,
    hp: d.hp, ghost: d.hp, en: 0, state: 'idle', t: 0, combo: 0, hitDone: false, chain: false,
    stun: 0, slow: 0, inv: 0, flash: 0, block: false, bst: 0, onGround: true,
    buf: { a: 0, s: 0 }, walk: 0, landed: false, t2: 0, wins: 0, ai: { dur: 0, intent: 'idle' }
  };
}

function createMatch(k1, k2, arenaKey) {
  const ak = ARENAS[arenaKey] ? arenaKey : 'village';
  return {
    arenaKey: ak, arena: ARENAS[ak],
    fighters: [newFighter(k1, 0), newFighter(k2, 1)],
    round: 1, state: 'intro', t: 0, clock: 3600, proj: [], parts: [], waves: [], puddles: [],
    shake: 0, paused: false, winner: null, msg: '', timeUp: false, events: [], sl: false
  };
}

function resetRound(M) {
  M.fighters.forEach((f, i) => {
    Object.assign(f, {
      x: i ? W - 250 : 250, y: FLOOR, vx: 0, vy: 0, face: i ? -1 : 1, hp: f.d.hp, ghost: f.d.hp, en: 0,
      state: 'idle', t: 0, combo: 0, hitDone: false, chain: false, stun: 0, slow: 0, inv: 0, flash: 0,
      block: false, bst: 0, onGround: true, buf: { a: 0, s: 0 }, landed: false, t2: 0, ai: { dur: 0, intent: 'idle' }
    });
  });
  M.proj = []; M.waves = []; M.puddles = []; M.clock = 3600; M.state = 'intro'; M.t = 0; M.timeUp = false; M.msg = '';
}

const ev = (M, type) => M.events.push(type);
const hurt = f => ({ x1: f.x - f.d.w / 2, x2: f.x + f.d.w / 2, y1: f.y - f.d.h, y2: f.y });
const overlap = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function sparks(M, x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rand(1, spd || 6);
    M.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: ri(14, 26), max: 26, c: color, s: rand(2, 5) });
  }
}

// returns 'hit', 'block' or false
function strike(M, atk, def, dmg, kb, stun, opt) {
  opt = opt || {};
  if (def.state === 'ko' || def.inv > 0) return false;
  const dir = opt.dir || (def.x >= atk.x ? 1 : -1);
  let dd = Math.max(1, Math.round(dmg * atk.d.dmg));
  const blocking = def.state === 'idle' && def.block && def.onGround && !opt.force;
  const px = def.x - dir * (def.d.w / 2), py = def.y - def.d.h * .55;
  if (blocking) {
    dd = Math.max(1, Math.round(dd * .15));
    def.hp = Math.max(1, def.hp - dd);          // chip damage can never KO
    def.vx = dir * kb * .7; def.bst = 7;
    atk.vx -= atk.face * 1.5;
    atk.en = Math.min(100, atk.en + 2); def.en = Math.min(100, def.en + 3);
    sparks(M, px, py, '#7fd0ff', 6, 4); ev(M, 'block');
    return 'block';
  }
  def.hp = Math.max(0, def.hp - dd);
  def.state = 'hit'; def.t = 0; def.stun = stun; def.vx = dir * kb; def.block = false; def.bst = 0;
  if (opt.launch || def.hp <= 0) { def.vy = -9; def.onGround = false; def.vx = dir * kb * .9; }
  if (opt.slow) { def.slow = opt.slow; def.slowIcon = opt.icon || '❄️'; }
  def.flash = 7;
  atk.en = Math.min(100, atk.en + 8 + (dd > 8 ? 4 : 0)); def.en = Math.min(100, def.en + 5);
  M.shake = Math.max(M.shake, dd >= 9 ? 10 : 4);
  sparks(M, px, py, dd >= 9 ? '#ffd23f' : '#ffffff', dd >= 9 ? 14 : 8, dd >= 9 ? 8 : 5);
  ev(M, dd >= 9 ? 'heavy' : 'hit');
  if (def.hp <= 0) { def.state = 'ko'; def.t = 0; def.vx = dir * 7; def.vy = -11; def.onGround = false; }
  return 'hit';
}

function addPuddle(M, x, owner) {
  M.puddles.push({ x: clamp(x, 60, W - 60), life: 260, w: 70, owner });
  const mine = M.puddles.filter(p => p.owner === owner);
  if (mine.length > 3) M.puddles.splice(M.puddles.indexOf(mine[0]), 1);
}
function spawnProj(M, f, p) {
  M.proj.push(Object.assign({ x: f.x + f.face * (f.d.w / 2), y: f.y - f.d.h * .55, owner: f.side }, p));
  ev(M, 'special');
}

function startAttack(M, f) {
  f.state = 'attack'; f.t = 0; f.combo = 0; f.hitDone = false; f.chain = false; f.buf.a = 0; f.vx = 0;
  ev(M, 'swing');
}
function startSpecial(M, f) {
  f.en -= f.d.cost; f.state = 'special'; f.t = 0; f.hitDone = false; f.landed = false; f.t2 = 0;
  f.buf.s = 0; f.buf.a = 0; ev(M, 'special');
}
const endSp = f => { f.state = 'idle'; f.t = 0; f.hitDone = false; };

function updAttack(M, f, o) {
  const A = ATK[f.combo];
  f.t++;
  if (f.t <= A.su + A.ac && f.onGround) f.vx = f.face * 2.2; else if (f.onGround) f.vx *= .6;
  if (f.t >= A.su && f.t < A.su + A.ac && !f.hitDone) {
    const reach = f.d.reach + (f.combo === 2 ? 12 : 0);
    const box = f.face > 0
      ? { x1: f.x + 8, x2: f.x + reach, y1: f.y - f.d.h * .98, y2: f.y - f.d.h * .08 }
      : { x1: f.x - reach, x2: f.x - 8, y1: f.y - f.d.h * .98, y2: f.y - f.d.h * .08 };
    if (overlap(box, hurt(o))) {
      const r = strike(M, f, o, A.dmg, A.kb, A.stun, { launch: A.launch });
      if (r) { f.hitDone = true; f.chain = r === 'hit'; }
    }
  }
  // chain into the next hit of the combo, only when the last one connected
  if (f.chain && f.combo < 2 && f.buf.a > 0 && f.t >= A.su + 1) {
    f.combo++; f.t = 0; f.hitDone = false; f.chain = false; f.buf.a = 0; ev(M, 'swing');
    return;
  }
  if (f.t >= A.su + A.ac + A.rec) { f.state = 'idle'; f.t = 0; f.combo = 0; }
}

function updSpecial(M, f, o) {
  f.t++;
  const sp = f.d.sp;
  if (sp === 'slash') {
    f.vx *= .6;
    if (f.t === 10) spawnProj(M, f, { kind: 'slash', vx: f.face * 10, dmg: 14, life: 80, kb: 7, stun: 20, launch: 1 });
    if (f.t >= 26) endSp(f);
  } else if (sp === 'shard') {
    f.vx *= .6;
    if (f.t === 10) spawnProj(M, f, { kind: 'shard', vx: f.face * 12.5, dmg: 10, life: 80, kb: 5, stun: 18, slow: 100 });
    if (f.t >= 24) endSp(f);
  } else if (sp === 'mud') {
    f.vx *= .6;
    if (f.t === 10) spawnProj(M, f, { kind: 'mud', icon: '🟤', vx: f.face * 7.5, vy: -11, g: .55, dmg: 8, life: 120, kb: 4, stun: 14, slow: 120 });
    if (f.t >= 24) endSp(f);
  } else if (sp === 'eclipse') {
    f.vx *= .6;
    if (f.t === 10) {      // three moon shards crash down around where the target stands; they land one after another
      [-130, 0, 130].forEach((off, i) => M.proj.push({ kind: 'drop', owner: f.side, x: clamp(o.x + off, 50, W - 50), y: -40, vx: 0, vy: 16, wait: 24 + i * 12, dmg: 13, kb: 6, stun: 20, launch: 1, life: 160 }));
      ev(M, 'special');
    }
    if (f.t >= 30) endSp(f);
  } else if (sp === 'slam') {
    if (f.t === 1) { f.vy = -14; f.vx = f.face * 6.5; f.onGround = false; f.landed = false; }
    if (!f.landed && f.t > 6 && f.onGround) {
      f.landed = true; f.t2 = 0; M.shake = 14; ev(M, 'slam');
      M.waves.push({ x: f.x, t: 0 });
      const box = { x1: f.x - 130, x2: f.x + 130, y1: f.y - 70, y2: f.y + 5 };
      if (overlap(box, hurt(o))) strike(M, f, o, 16, 9, 26, { launch: 1, force: 1 });
    }
    if (f.landed) { f.t2++; f.vx *= .5; if (f.t2 > 16) endSp(f); }
    if (!f.landed && f.t > 80) endSp(f);
  } else if (sp === 'rush') {
    if (f.t < 8) f.vx *= .5;
    else if (f.t < 24) {
      f.vx = f.face * 13;
      const box = { x1: f.x - f.d.w / 2 - 18, x2: f.x + f.d.w / 2 + 18, y1: f.y - f.d.h, y2: f.y };
      if (!f.hitDone && overlap(box, hurt(o))) { if (strike(M, f, o, 15, 10, 24, { launch: 1 })) f.hitDone = true; }
    } else f.vx *= .7;
    if (f.t >= 38) endSp(f);
  }
}

function updFighter(M, f, o, inp, canAct) {
  const d = f.d;
  f.flash = Math.max(0, f.flash - 1);
  if (f.inv > 0) f.inv--;
  if (f.slow > 0) f.slow--;
  if (f.buf.a > 0) f.buf.a--;
  if (f.buf.s > 0) f.buf.s--;
  if (canAct && inp) { if (inp.a) f.buf.a = 7; if (inp.s) f.buf.s = 7; }
  if (f.en < 100) f.en = Math.min(100, f.en + .04);
  const sp = d.spd * (f.slow > 0 ? .5 : 1);
  const ground = f.onGround;
  const fr = M.arena ? M.arena.fric : .7, slip = fr > .8;

  if (f.state === 'ko') {
    f.t++;
  } else if (f.state === 'hit') {
    f.t++;
    if (f.t >= f.stun && f.onGround) { f.state = 'idle'; f.t = 0; f.inv = 12; }
    else if (f.t >= f.stun + 90) { f.state = 'idle'; f.t = 0; f.inv = 12; }
  } else if (f.state === 'attack') {
    updAttack(M, f, o);
  } else if (f.state === 'special') {
    updSpecial(M, f, o);
  } else {
    f.block = false;
    if (f.bst > 0) { f.bst--; f.block = true; f.vx *= .8; }
    else if (canAct && inp) {
      if (inp.b && ground) { f.block = true; f.vx = 0; }
      else {
        const mv = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
        const tgt = mv * sp * (ground ? 1 : .75);
        f.vx = slip && ground ? (mv === 0 ? f.vx * fr : f.vx + (tgt - f.vx) * .14) : tgt;   // ice: slow to start, glides when you let go
        if (inp.j && ground) { f.vy = -d.jump; f.onGround = false; }
        if (f.buf.s > 0 && f.en >= d.cost) startSpecial(M, f);
        else if (f.buf.a > 0) startAttack(M, f);
      }
    } else if (ground) f.vx *= fr;
    if (f.state === 'idle' && ground) f.face = o.x > f.x ? 1 : -1;
  }

  // physics
  if (f.y < FLOOR || f.vy < 0) { f.vy += GRAV; f.onGround = false; }
  f.y += f.vy; f.x += f.vx;
  if (f.y >= FLOOR) { f.y = FLOOR; if (f.vy > 0) f.vy = 0; f.onGround = true; }
  if (f.onGround && (f.state === 'hit' || f.state === 'ko')) f.vx *= slip ? .95 : .85;
  f.x = clamp(f.x, 40, W - 40);
  if (Math.abs(f.vx) > .5 && f.onGround) f.walk++;
}

function separate(a, b) {
  if (Math.abs(a.y - b.y) > 50) return;
  const min = (a.d.w + b.d.w) / 2 * .85, dx = b.x - a.x, ov = min - Math.abs(dx);
  if (ov > 0) {
    const s = dx >= 0 ? 1 : -1;
    a.x = clamp(a.x - s * ov / 2, 40, W - 40);
    b.x = clamp(b.x + s * ov / 2, 40, W - 40);
  }
}

function endRound(M) {
  const [a, b] = M.fighters;
  let w;
  if (a.hp <= 0 && b.hp <= 0) w = 'draw';
  else if (a.hp <= 0) w = 1;
  else if (b.hp <= 0) w = 0;
  else {
    M.timeUp = true;
    const ra = a.hp / a.d.hp, rb = b.hp / b.d.hp;
    w = ra > rb ? 0 : rb > ra ? 1 : 'draw';
  }
  if (w === 'draw') { a.wins++; b.wins++; M.msg = 'DRAW'; }
  else { M.fighters[w].wins++; M.msg = M.timeUp ? 'TIME UP' : 'K.O.'; }
  M.roundWinner = w; M.state = 'ko'; M.t = 0; ev(M, 'ko');
}

function nextRound(M) {
  const [a, b] = M.fighters;
  if (a.wins >= 2 || b.wins >= 2) {
    M.winner = a.wins === b.wins ? 'draw' : a.wins > b.wins ? 0 : 1;
    M.state = 'over'; M.t = 0;
  } else { M.round++; resetRound(M); }
}

function step(M, inps) {
  const [a, b] = M.fighters;
  M.t++;
  if (M.shake > .3) M.shake *= .85; else M.shake = 0;
  M.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .25; p.life--; });
  M.parts = M.parts.filter(p => p.life > 0);
  M.waves.forEach(w => w.t++);
  M.waves = M.waves.filter(w => w.t < 16);
  [a, b].forEach(f => { f.ghost = f.ghost > f.hp ? Math.max(f.hp, f.ghost - .35) : f.hp; });

  if (M.state === 'over') return;
  if (M.state === 'intro') {
    if (M.t === 50) ev(M, 'round');
    if (M.t === 90) ev(M, 'fight');
    updFighter(M, a, b, null, false); updFighter(M, b, a, null, false); separate(a, b);
    if (M.t >= 95) { M.state = 'fight'; M.t = 0; }
    return;
  }
  if (M.state === 'ko') {
    M.sl = !M.sl;
    if (M.t >= 50 || M.sl) { updFighter(M, a, b, null, false); updFighter(M, b, a, null, false); }
    M.proj = [];
    if (M.t >= 140) nextRound(M);
    return;
  }

  // ---- fight ----
  M.clock--;
  updFighter(M, a, b, inps[0], true);
  updFighter(M, b, a, inps[1], true);
  separate(a, b);

  // mud puddles slow whoever stands in them
  M.puddles.forEach(pd => {
    pd.life--;
    const v = M.fighters[1 - pd.owner];
    if (v.onGround && v.state !== 'ko' && Math.abs(v.x - pd.x) < pd.w + v.d.w * .3) { v.slow = Math.max(v.slow, 8); v.slowIcon = '🟤'; }
  });
  M.puddles = M.puddles.filter(pd => pd.life > 0);

  // projectiles
  for (const p of M.proj) {
    if (p.wait > 0) { p.wait--; continue; }             // moon shards hover (shown as a floor warning) before falling
    p.x += p.vx;
    if (p.vy || p.g) { p.y += p.vy; p.vy += p.g || 0; }
    p.life--;
    const atk = M.fighters[p.owner], vic = M.fighters[1 - p.owner];
    const box = { x1: p.x - 20, x2: p.x + 20, y1: p.y - 18, y2: p.y + 18 };
    if (overlap(box, hurt(vic))) {
      if (strike(M, atk, vic, p.dmg, p.kb, p.stun, { launch: p.launch, slow: p.slow, icon: p.icon, dir: Math.sign(p.vx) })) {
        p.life = 0;
        if (p.kind === 'mud') addPuddle(M, vic.x, p.owner);
      }
    }
    if (p.life > 0 && p.kind === 'mud' && p.y >= FLOOR - 14) { addPuddle(M, p.x, p.owner); sparks(M, p.x, FLOOR - 4, '#8a6a3a', 10, 5); p.life = 0; }
    if (p.life > 0 && p.kind === 'drop' && p.y + 18 >= FLOOR) { sparks(M, p.x, FLOOR - 6, '#ffe27a', 12, 6); M.shake = Math.max(M.shake, 5); p.life = 0; }
    if (p.x < -60 || p.x > W + 60) p.life = 0;
  }
  // opposing projectiles cancel each other
  for (const p of M.proj) for (const q of M.proj) {
    if (p !== q && p.owner !== q.owner && p.life > 0 && q.life > 0 && p.kind !== 'drop' && q.kind !== 'drop' && !(p.wait > 0) && !(q.wait > 0) && Math.abs(p.x - q.x) < 30 && Math.abs(p.y - q.y) < 34) {
      p.life = 0; q.life = 0; sparks(M, (p.x + q.x) / 2, p.y, '#ffffff', 10, 6); ev(M, 'block');
    }
  }
  M.proj = M.proj.filter(p => p.life > 0);

  if (a.hp <= 0 || b.hp <= 0 || M.clock <= 0) endRound(M);
}

/* ---------------- CPU opponent ---------------- */
function incoming(M, f) {
  return M.proj.some(p => p.owner !== f.side && Math.abs(p.x - f.x) < 260 && Math.sign(p.vx) === Math.sign(f.x - p.x));
}
function cpuInput(M, f, o, lvl) {
  const L = LEVELS[lvl] || LEVELS[1], A = f.ai;
  const inp = { l: 0, r: 0, j: 0, b: 0, a: 0, s: 0 };
  if (M.state !== 'fight' || f.state === 'ko' || f.state === 'hit') { A.threatT = 0; return inp; }
  const dx = o.x - f.x, ad = Math.abs(dx), dir = dx >= 0 ? 1 : -1;
  const go = d => { if (d > 0) inp.r = 1; else inp.l = 1; };
  const ATKo = o.state === 'attack' ? ATK[o.combo] : null;
  const oActive = (o.state === 'special' && o.d.sp !== 'slash' && o.d.sp !== 'shard') || (ATKo && o.t < ATKo.su + ATKo.ac);
  const oRecover = ATKo && o.t >= ATKo.su + ATKo.ac;
  const close = ad < o.d.reach + o.d.w / 2 + 30;
  const danger = (oActive && close) || incoming(M, f);

  // 0) step out from under incoming moon shards
  const drop = M.proj.find(p => p.kind === 'drop' && p.owner !== f.side && Math.abs(p.x - f.x) < 80);
  if (drop && f.onGround && f.state === 'idle' && Math.random() < .55 + L.blk * .4) { go(f.x >= drop.x ? 1 : -1); return inp; }

  // 1) defend: decide once per threat whether to block, after a reaction delay
  if (danger) {
    if (!A.sawThreat) { A.sawThreat = true; A.willBlock = Math.random() < L.blk; }
    A.threatT = (A.threatT || 0) + 1;
  } else { A.sawThreat = false; A.threatT = 0; }
  if (danger && A.willBlock && A.threatT >= Math.ceil(L.react / 3) && f.onGround && f.state === 'idle') { inp.b = 1; return inp; }
  if (incoming(M, f) && !A.willBlock && f.onGround && Math.random() < .08) { inp.j = 1; return inp; }

  // 2) punish: the opponent is stuck in recovery
  if (f.state === 'idle' && oRecover && ad < f.d.reach + o.d.w / 2 && Math.random() < L.punish) { inp.a = 1; return inp; }
  if (f.state === 'idle' && f.en >= f.d.cost && (oRecover || o.state === 'hit') && ad > 90 && ad < 420 && Math.random() < L.sp * .15) { inp.s = 1; return inp; }

  // 3) neutral game: approach, poke, retreat, occasionally special
  if (A.dur > 0) A.dur--;
  if (A.dur <= 0) {
    if (f.en >= f.d.cost && ad > 110 && ad < 430 && Math.random() < L.sp * .3) { A.intent = 'special'; A.dur = 6; }
    else if (ad > f.d.reach * .95) { A.intent = Math.random() < .05 ? 'jump' : 'approach'; A.dur = L.react; }
    else {
      const r = Math.random();
      if (r < L.aggr) { A.intent = 'attack'; A.dur = L.react + ri(4, 14); }
      else if (r < L.aggr + .12) { A.intent = 'retreat'; A.dur = 12; }
      else { A.intent = 'idle'; A.dur = L.react; }
    }
  }
  switch (A.intent) {
    case 'approach': go(dir); break;
    case 'jump': go(dir); if (f.onGround) inp.j = 1; break;
    case 'attack': if (ad > f.d.reach * .8) go(dir); if (A.dur % 9 === 0) inp.a = 1; break;
    case 'retreat': go(-dir); break;
    case 'special': inp.s = 1; A.intent = 'idle'; break;
  }
  return inp;
}

/* =====================================================================
   RENDERING + UI (browser only)
===================================================================== */
const ICON_RIVAL = { sw: 2, ar: 4 };
const imgCache = {};
function svgImg(s) { const i = new Image(); i.src = 'data:image/svg+xml,' + encodeURIComponent(s); return i; }
function spritesFor(key, gear) {
  if (key === 'arlo') {
    const k = 'a' + gear.sw + '_' + gear.ar;
    return imgCache[k] || (imgCache[k] = [0, 1, 2].map(fr => svgImg(hero(gear.sw, gear.ar, fr))));
  }
  return [IMG[{ king: 'K', frost: 'i', fire: 'f', mud: 'm', last: 'M' }[key]]];
}

let PV = { mode: 'cpu', lvl: 1, p1: 'arlo', p2: 'king', arena: 'village', step: 1, gear: { sw: 0, ar: 0 } };
let M = null, ctx = null, bgCanvas = null, raf = 0, last = 0, acc = 0, muted = false, rec = { w: 0, l: 0 };
const down = {}; let edge = {};

/* ---------- sound ---------- */
let AC = null;
function sfx(t) {
  if (muted) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const now = AC.currentTime;
    const tone = (f0, f1, dur, type, vol) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
      g.gain.setValueAtTime(vol || .06, now); g.gain.exponentialRampToValueAtTime(.001, now + dur);
      o.connect(g); g.connect(AC.destination); o.start(now); o.stop(now + dur + .02);
    };
    const noise = (dur, vol) => {
      const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = AC.createBufferSource(), g = AC.createGain();
      s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(AC.destination); s.start();
    };
    switch (t) {
      case 'swing': tone(520, 260, .06, 'triangle', .03); break;
      case 'hit': noise(.08, .22); tone(220, 80, .1, 'square', .06); break;
      case 'heavy': noise(.16, .38); tone(140, 40, .2, 'sawtooth', .09); break;
      case 'block': tone(900, 500, .06, 'square', .04); break;
      case 'special': tone(300, 900, .25, 'sawtooth', .05); break;
      case 'slam': noise(.3, .5); tone(90, 30, .3, 'sawtooth', .1); break;
      case 'ko': tone(300, 50, .7, 'sawtooth', .09); noise(.3, .35); break;
      case 'round': tone(440, 440, .12, 'square', .05); break;
      case 'fight': tone(660, 990, .25, 'square', .06); break;
    }
  } catch (e) { /* audio is optional */ }
}

/* ---------- arena backgrounds (each drawn once, then cached) ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function vgrad(g, y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function sky(g, stops) { g.fillStyle = vgrad(g, 0, FLOOR, stops); g.fillRect(0, 0, W, H); }
function ridge(g, R, color, base, amp, step) {
  g.fillStyle = color; g.beginPath(); g.moveTo(0, H); g.lineTo(0, base);
  for (let x = 0; x <= W + step; x += step) g.lineTo(x, base - amp * (.35 + R() * .65));
  g.lineTo(W, H); g.closePath(); g.fill();
}
function pines(g, R, color, base, hMin, hMax, step, jit) {
  g.fillStyle = color;
  for (let x = -20; x < W + 40; x += step + R() * jit) {
    const h = hMin + R() * (hMax - hMin), w = h * .38;
    g.beginPath(); g.moveTo(x - w, base); g.lineTo(x, base - h); g.lineTo(x + w, base); g.closePath(); g.fill();
    g.fillRect(x - 4, base - 2, 8, 10);
  }
}
function glow(g, x, y, r, rgb, a) {
  const gr = g.createRadialGradient(x, y, 1, x, y, r);
  gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function ground(g, stops, top) { g.fillStyle = vgrad(g, top, H, stops); g.fillRect(0, top, W, H - top); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, top, W, 3); }
function stars(g, R, n, maxY) { for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(255,255,255,' + (.2 + R() * .7) + ')'; g.fillRect(R() * W, R() * maxY, 2, 2); } }
function torch(g, x) {
  g.fillStyle = '#5a3a22'; g.fillRect(x - 5, FLOOR - 120, 10, 120);
  glow(g, x, FLOOR - 130, 70, '255,170,60', .85);
  g.fillStyle = '#ffb347'; g.beginPath(); g.arc(x, FLOOR - 130, 9, 0, 7); g.fill();
}
function cloud(g, x, y, s) {
  g.fillStyle = 'rgba(255,255,255,.92)';
  [[0, 0, 40], [34, -8, 32], [-34, -4, 28], [62, 4, 26]].forEach(([dx, dy, r]) => { g.beginPath(); g.ellipse(x + dx * s, y + dy * s, r * s, r * .62 * s, 0, 0, 7); g.fill(); });
}
function crystal(g, x, y, h, color) {
  g.fillStyle = color; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x - 4, y - h); g.lineTo(x + 2, y - h * .8); g.lineTo(x + 10, y); g.closePath(); g.fill();
  glow(g, x, y - h * .5, 60, color === '#7fe8ff' ? '127,232,255' : '255,120,220', .4);
}

const PAINT = {
  village(g, R) {
    sky(g, [[0, '#5db8f5'], [.7, '#bfe6ff'], [1, '#fdf3c8']]);
    glow(g, 800, 90, 170, '255,240,170', .9); g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(800, 90, 34, 0, 7); g.fill();
    cloud(g, 170, 90, 1.1); cloud(g, 470, 55, .8); cloud(g, 640, 140, .9);
    ridge(g, R, '#8cc873', FLOOR - 80, 60, 70); ridge(g, R, '#6fb25a', FLOOR - 36, 40, 50);
    [[90, '#c99a5b', '#a8452f'], [270, '#d9b27a', '#8a4b2d'], [480, '#c28a55', '#a8452f'], [690, '#d9b27a', '#4f7fb0'], [860, '#c99a5b', '#8a4b2d']].forEach(([x, wall, roof], i) => {
      const w = 100 + (i % 2) * 20, h = 72, y = FLOOR - 8;
      g.fillStyle = wall; g.fillRect(x - w / 2, y - h, w, h);
      g.fillStyle = roof; g.beginPath(); g.moveTo(x - w / 2 - 10, y - h); g.lineTo(x, y - h - 50); g.lineTo(x + w / 2 + 10, y - h); g.closePath(); g.fill();
      g.fillStyle = '#5a3a22'; g.fillRect(x - 9, y - 36, 18, 36);
      g.fillStyle = '#ffe7a0'; g.fillRect(x + w / 2 - 30, y - 54, 16, 16); g.fillRect(x - w / 2 + 14, y - 54, 16, 16);
    });
    g.fillStyle = '#8a5a30'; for (let x = 10; x < W; x += 34) g.fillRect(x, FLOOR - 32, 8, 36);
    g.fillRect(0, FLOOR - 26, W, 6); g.fillRect(0, FLOOR - 14, W, 5);
    ground(g, [[0, '#7fc15a'], [.15, '#5aa043'], [1, '#3a6f2b']], FLOOR - 4);
    g.fillStyle = 'rgba(190,150,95,.4)'; g.fillRect(0, FLOOR + 20, W, 24);
  },
  forest(g, R) {
    sky(g, [[0, '#14301f'], [.55, '#2f6b4a'], [1, '#a9cf88']]);
    glow(g, 480, 140, 320, '255,240,160', .35);
    ridge(g, R, '#1c4a33', FLOOR - 90, 60, 60);
    pines(g, R, '#1d5a3b', FLOOR - 40, 170, 250, 62, 22);
    pines(g, R, '#15462d', FLOOR - 16, 130, 210, 50, 18);
    pines(g, R, '#0e3220', FLOOR - 2, 100, 160, 40, 16);
    ground(g, [[0, '#527f38'], [.15, '#3f6a2b'], [1, '#233f18']], FLOOR - 4);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = R() * W, y = FLOOR + 6 + R() * 80; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - 9); g.stroke(); }
  },
  caves(g, R) {
    g.fillStyle = vgrad(g, 0, H, [[0, '#0f0a18'], [.6, '#241a33'], [1, '#3b2d4d']]); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) { g.fillStyle = 'rgba(' + (60 + R() * 30) + ',' + (45 + R() * 25) + ',' + (80 + R() * 30) + ',.35)'; g.beginPath(); g.ellipse(R() * W, R() * FLOOR, 30 + R() * 80, 20 + R() * 50, R() * 3, 0, 7); g.fill(); }
    for (let x = -10; x < W + 20; x += 34 + R() * 30) { const h = 40 + R() * 120; g.fillStyle = '#2f2540'; g.beginPath(); g.moveTo(x - 20, 0); g.lineTo(x + R() * 10 - 5, h); g.lineTo(x + 20, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x - 3, 0, 3, h * .8); }
    for (let x = 30; x < W; x += 70 + R() * 90) { const h = 24 + R() * 50; g.fillStyle = '#322a42'; g.beginPath(); g.moveTo(x - 16, FLOOR); g.lineTo(x, FLOOR - h); g.lineTo(x + 16, FLOOR); g.closePath(); g.fill(); }
    crystal(g, 120, FLOOR, 90, '#7fe8ff'); crystal(g, 160, FLOOR, 60, '#7fe8ff'); crystal(g, 820, FLOOR, 100, '#ff78dc'); crystal(g, 865, FLOOR, 64, '#ff78dc'); crystal(g, 520, FLOOR - 6, 46, '#7fe8ff');
    ground(g, [[0, '#4b4256'], [.2, '#352d3f'], [1, '#1d1825']], FLOOR - 4);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) { let x = R() * W, y = FLOOR + 4; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R() * 40 - 20; y += 8 + R() * 14; g.lineTo(x, y); } g.stroke(); }
  },
  throne(g, R) {
    g.fillStyle = vgrad(g, 0, FLOOR, [[0, '#3a1520'], [.6, '#5e2434'], [1, '#7a3044']]); g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
    for (let y = 0; y < FLOOR; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = ((y / 38) % 2) * 40; x < W; x += 80) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 38); g.stroke(); } }
    [[300], [660]].forEach(([x]) => {
      const wg = vgrad(g, 70, 300, [[0, '#0b1030'], [1, '#27406e']]); g.fillStyle = wg;
      g.beginPath(); g.moveTo(x - 50, 300); g.lineTo(x - 50, 150); g.arc(x, 150, 50, Math.PI, 0); g.lineTo(x + 50, 300); g.closePath(); g.fill();
      g.strokeStyle = '#a58a6a'; g.lineWidth = 8; g.stroke();
      g.fillStyle = '#fff8d2'; g.beginPath(); g.arc(x + 12, 160, 14, 0, 7); g.fill();
    });
    [120, 480, 840].forEach(x => {
      const cg = g.createLinearGradient(x - 28, 0, x + 28, 0); cg.addColorStop(0, '#6b5646'); cg.addColorStop(.5, '#b59a80'); cg.addColorStop(1, '#6b5646');
      g.fillStyle = cg; g.fillRect(x - 28, 40, 56, FLOOR - 40); g.fillRect(x - 38, 30, 76, 16); g.fillRect(x - 38, FLOOR - 14, 76, 14);
    });
    [210, 750].forEach(x => {
      g.fillStyle = '#9b1d2e'; g.fillRect(x - 28, 50, 56, 180); g.beginPath(); g.moveTo(x - 28, 230); g.lineTo(x, 262); g.lineTo(x + 28, 230); g.closePath(); g.fill();
      g.fillStyle = '#f6c343'; g.beginPath(); g.moveTo(x - 16, 130); g.lineTo(x - 11, 104); g.lineTo(x, 120); g.lineTo(x + 11, 104); g.lineTo(x + 16, 130); g.closePath(); g.fill();
    });
    torch(g, 60); torch(g, W - 60);
    ground(g, [[0, '#2f2733'], [.2, '#211b26'], [1, '#14101a']], FLOOR - 4);
    g.fillStyle = '#8a1f2d'; g.beginPath(); g.moveTo(290, FLOOR - 4); g.lineTo(670, FLOOR - 4); g.lineTo(760, H); g.lineTo(200, H); g.closePath(); g.fill();
    g.strokeStyle = '#f6c343'; g.lineWidth = 4; g.beginPath(); g.moveTo(296, FLOOR); g.lineTo(206, H); g.moveTo(664, FLOOR); g.lineTo(754, H); g.stroke();
  },
  peak(g, R) {
    sky(g, [[0, '#8fcfff'], [.6, '#cfeeff'], [1, '#f4fbff']]);
    glow(g, 760, 100, 190, '255,255,255', .8);
    [['#9fb9d8', 1, 210], ['#b9cfe8', .8, 140]].forEach(([col, sc, base], li) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, FLOOR - 30);
      let x = 0; const pts = [];
      while (x < W + 120) { const px = x, py = base + 40 - (R() * 150 + 70) * sc * (li ? .8 : 1) + 60; pts.push([px, py]); g.lineTo(px, py); x += 90 + R() * 80; g.lineTo(x - 40, FLOOR - 30 - (li ? 40 : 10) - R() * 40); }
      g.lineTo(W, FLOOR - 30); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; pts.forEach(([px, py]) => { g.beginPath(); g.moveTo(px - 26, py + 36); g.lineTo(px, py); g.lineTo(px + 26, py + 36); g.lineTo(px + 8, py + 28); g.lineTo(px - 6, py + 40); g.closePath(); g.fill(); });
    });
    ridge(g, R, '#e8f4fb', FLOOR - 40, 30, 80);
    pines(g, R, '#8fbad6', FLOOR - 4, 90, 150, 70, 30);
    for (let x = 40; x < W; x += 90 + R() * 80) { const h = 34 + R() * 56; g.fillStyle = 'rgba(190,235,255,.85)'; g.beginPath(); g.moveTo(x - 12, FLOOR); g.lineTo(x, FLOOR - h); g.lineTo(x + 12, FLOOR); g.closePath(); g.fill(); }
    ground(g, [[0, '#dff3fc'], [.2, '#addbef'], [1, '#7fb6d6']], FLOOR - 4);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { const x = R() * W, y = FLOOR + 10 + R() * 70; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + R() * 80, y - 4); g.stroke(); }
  },
  ember(g, R) {
    sky(g, [[0, '#14070a'], [.55, '#4a1410'], [1, '#b3401a']]);
    glow(g, 480, FLOOR - 90, 440, '255,110,30', .55);
    g.fillStyle = '#1b0c0c'; g.beginPath(); g.moveTo(170, FLOOR); g.lineTo(410, 170); g.lineTo(550, 170); g.lineTo(790, FLOOR); g.closePath(); g.fill();
    glow(g, 480, 170, 120, '255,140,40', .9);
    g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(480, 172, 70, 12, 0, 0, 7); g.fill();
    g.strokeStyle = '#ff9a3a'; g.lineWidth = 5; g.shadowColor = '#ff6a1a'; g.shadowBlur = 14;
    [[470, 175, 430, 280, 400, FLOOR], [500, 175, 540, 270, 580, FLOOR - 10], [485, 178, 480, 300, 470, FLOOR]].forEach(([x0, y0, x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x1, y1, x2, y2); g.stroke(); });
    g.shadowBlur = 0;
    ridge(g, R, '#2a1210', FLOOR - 40, 70, 60);
    g.fillStyle = vgrad(g, FLOOR - 24, FLOOR, [[0, '#ff9a3a'], [1, '#d94a12']]); g.fillRect(0, FLOOR - 22, W, 22);
    ground(g, [[0, '#3a2420'], [.2, '#261512'], [1, '#130a09']], FLOOR - 4);
    g.strokeStyle = 'rgba(255,122,42,.85)'; g.lineWidth = 2; g.shadowColor = '#ff6a1a'; g.shadowBlur = 8;
    for (let i = 0; i < 16; i++) { let x = R() * W, y = FLOOR + 6; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += R() * 50 - 25; y += 8 + R() * 14; g.lineTo(x, y); } g.stroke(); }
    g.shadowBlur = 0;
  },
  marsh(g, R) {
    sky(g, [[0, '#223024'], [.55, '#47603f'], [1, '#a0ad80']]);
    glow(g, 300, 150, 260, '230,240,190', .3);
    [[90, 170], [250, 130], [430, 190], [610, 140], [780, 180], [900, 120]].forEach(([x, h]) => {
      g.strokeStyle = '#1f1a12'; g.lineWidth = 9; g.beginPath(); g.moveTo(x, FLOOR); g.lineTo(x + R() * 14 - 7, FLOOR - h); g.stroke();
      g.lineWidth = 4; for (let k = 0; k < 5; k++) { const by = FLOOR - h * (.35 + k * .14), d = k % 2 ? 1 : -1; g.beginPath(); g.moveTo(x, by); g.lineTo(x + d * (30 + R() * 28), by - 22 - R() * 18); g.stroke(); }
    });
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(230,240,220,.10)'; g.beginPath(); g.ellipse(R() * W, 200 + R() * 220, 160 + R() * 160, 22 + R() * 20, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#36421f'; g.lineWidth = 3;
    for (let x = 0; x < W; x += 12 + R() * 14) { const h = 30 + R() * 50; g.beginPath(); g.moveTo(x, FLOOR); g.quadraticCurveTo(x + 6, FLOOR - h * .6, x + 3 + R() * 10, FLOOR - h); g.stroke(); }
    ground(g, [[0, '#586a38'], [.2, '#41522a'], [1, '#232d16']], FLOOR - 4);
    for (let i = 0; i < 8; i++) { const x = 40 + R() * (W - 80), y = FLOOR + 18 + R() * 70, rx = 36 + R() * 60; g.fillStyle = 'rgba(95,130,120,.6)'; g.beginPath(); g.ellipse(x, y, rx, rx * .16, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - rx * .2, y - 1, rx * .45, rx * .05, 0, 0, 7); g.fill(); }
  },
  spire(g, R) {
    sky(g, [[0, '#04061a'], [.55, '#141a4a'], [1, '#38306e']]);
    stars(g, R, 130, FLOOR - 120);
    glow(g, 480, 140, 300, '200,190,255', .5);
    g.fillStyle = '#f4f0ff'; g.beginPath(); g.arc(480, 140, 74, 0, 7); g.fill();
    g.fillStyle = 'rgba(150,140,200,.35)'; [[455, 120, 16], [500, 165, 12], [478, 100, 9], [510, 128, 7]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    [[130, 250, 90], [320, 190, 60], [660, 210, 70], [840, 270, 100], [520, 300, 50]].forEach(([x, y, w]) => {
      g.fillStyle = '#17153a'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x + w, y); g.lineTo(x + w * .5, y + w * .5); g.lineTo(x, y + w * .85); g.lineTo(x - w * .5, y + w * .45); g.closePath(); g.fill();
      g.fillStyle = 'rgba(160,140,255,.5)'; g.fillRect(x - w, y - 2, w * 2, 3);
    });
    [70, W - 70].forEach(x => {
      g.fillStyle = '#12102e'; g.fillRect(x - 34, 100, 68, FLOOR - 100); g.beginPath(); g.moveTo(x - 40, 100); g.lineTo(x, 36); g.lineTo(x + 40, 100); g.closePath(); g.fill();
      g.fillStyle = '#ffd98a'; for (let y = 140; y < FLOOR - 40; y += 70) g.fillRect(x - 6, y, 12, 26);
    });
    ground(g, [[0, '#5b4b8f'], [.2, '#3e3268'], [1, '#1f1840']], FLOOR - 4);
    g.strokeStyle = 'rgba(120,230,255,.7)'; g.lineWidth = 3; g.shadowColor = '#78e6ff'; g.shadowBlur = 10;
    g.beginPath(); g.ellipse(480, FLOOR + 44, 270, 30, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(480, FLOOR + 44, 190, 20, 0, 0, 7); g.stroke();
    for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; g.beginPath(); g.moveTo(480 + Math.cos(t) * 190, FLOOR + 44 + Math.sin(t) * 20); g.lineTo(480 + Math.cos(t) * 270, FLOOR + 44 + Math.sin(t) * 30); g.stroke(); }
    g.shadowBlur = 0;
  }
};

const bgCache = {};
function getBG(key) {
  if (bgCache[key]) return bgCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  PAINT[key](c.getContext('2d'), rng(AORDER.indexOf(key) * 7919 + 13));
  return (bgCache[key] = c);
}

/* ambient particles: snow, embers, fireflies, dust, magic motes */
let amb = [];
function initAmb(type) {
  amb = []; if (!type) return;
  const n = { dust: 34, fly: 26, snow: 70, ember: 46, mote: 36 }[type];
  for (let i = 0; i < n; i++) amb.push({ x: rand(0, W), y: rand(0, FLOOR + 40), p: rand(0, 7), s: rand(1, 3.2) });
}
function drawAmb(c, type, t) {
  if (!type) return;
  c.save();
  amb.forEach(a => {
    if (type === 'snow') { a.y += .8 + a.s * .3; a.x += Math.sin(t / 40 + a.p) * .4; if (a.y > FLOOR + 70) { a.y = -10; a.x = rand(0, W); } c.fillStyle = 'rgba(255,255,255,.85)'; }
    else if (type === 'ember') { a.y -= .7 + a.s * .25; a.x += Math.sin(t / 30 + a.p) * .5; if (a.y < -10) { a.y = FLOOR + 60; a.x = rand(0, W); } c.fillStyle = 'rgba(255,' + Math.round(110 + a.s * 30) + ',40,.85)'; }
    else if (type === 'mote') { a.y -= .25 + a.s * .1; a.x += Math.sin(t / 45 + a.p) * .35; if (a.y < -10) { a.y = FLOOR + 60; a.x = rand(0, W); } c.fillStyle = 'rgba(190,170,255,' + (.35 + .4 * Math.abs(Math.sin(t / 50 + a.p))) + ')'; }
    else if (type === 'fly') { a.x += Math.sin(t / 50 + a.p) * .45; a.y += Math.cos(t / 60 + a.p) * .3; c.fillStyle = 'rgba(220,255,120,' + (.2 + .7 * Math.abs(Math.sin(t / 40 + a.p))) + ')'; }
    else { a.x += Math.sin(t / 90 + a.p) * .25; a.y += Math.cos(t / 110 + a.p) * .15; c.fillStyle = 'rgba(255,255,255,.18)'; }
    c.fillRect(a.x, a.y, a.s, a.s);
  });
  c.restore();
}

/* ---------- drawing ---------- */
function drawFighter(c, f) {
  const d = f.d, hero_ = f.key === 'arlo';
  const air = Math.max(0, FLOOR - f.y);
  c.fillStyle = 'rgba(0,0,0,' + (.3 - Math.min(.2, air / 900)) + ')';
  c.beginPath(); c.ellipse(f.x, FLOOR + 6, d.w * .55 * (1 - Math.min(.4, air / 500)), 9, 0, 0, 7); c.fill();

  let img = f.spr[0];
  if (hero_ && f.state === 'idle' && f.onGround && Math.abs(f.vx) > .5) img = f.spr[1 + ((f.walk / 7 | 0) % 2)];
  if (!img || !img.complete) return;
  const dh = hero_ ? d.h * 1.2 : d.h * 1.25, dw = hero_ ? dh * 60 / 88 : dh * 1.25;

  const drawBody = (alpha, offX) => {
    c.save();
    c.globalAlpha = alpha;
    let ox = offX || 0, oy = 0, rot = 0, sx = 1, sy = 1;
    if (f.state === 'idle') {
      if (f.onGround) sy = 1 + Math.sin(M.t / 11 + f.side * 2) * .015;
      if (!hero_ && Math.abs(f.vx) > .5 && f.onGround) oy = -Math.abs(Math.sin(f.walk / 5)) * 10;
    }
    if (f.state === 'attack') { const A = ATK[f.combo], p = Math.min(1, f.t / A.su); ox += f.face * p * 14; rot = f.face * .12 * p; }
    if (f.state === 'special' && f.d.sp === 'slam' && !f.landed) { rot = f.face * .25; }
    if (f.state === 'hit') { rot = -f.face * .22; ox -= f.face * 6; }
    if (f.state === 'ko') { rot = -f.face * 1.45 * Math.min(1, f.t / 10); oy = Math.min(1, f.t / 10) * 20; c.globalAlpha = alpha * .75; }
    if (!f.onGround && f.state !== 'ko') { sx = .96; sy = 1.06; }
    c.translate(f.x + ox, f.y + (hero_ ? 7 : 5) + oy);
    c.rotate(rot); c.scale(f.face * sx, sy);
    if (f.flash > 0) { try { c.filter = 'brightness(2.6)'; } catch (e) { /* older browsers */ } }
    if (f.state === 'special') { c.shadowColor = SP_COLOR[f.d.sp]; c.shadowBlur = 26; }
    c.drawImage(img, -dw / 2, -dh, dw, dh);
    c.restore();
  };

  if (f.state === 'special' && f.d.sp === 'rush' && f.t >= 8 && f.t < 26) {
    for (let i = 3; i >= 1; i--) drawBody(.18, -f.face * i * 18);
  }
  drawBody(1, 0);

  // melee slash arc
  if (f.state === 'attack') {
    const A = ATK[f.combo];
    if (f.t >= A.su - 1 && f.t < A.su + A.ac + 3) {
      const k = (f.t - A.su + 1) / (A.ac + 4);
      c.save();
      c.translate(f.x + f.face * d.reach * .55, f.y - d.h * .5); c.scale(f.face, 1); c.rotate(f.combo === 1 ? .4 : -.3);
      c.globalAlpha = Math.max(0, 1 - k);
      c.strokeStyle = f.combo === 2 ? '#ffe27a' : '#ffffff'; c.lineWidth = f.combo === 2 ? 11 : 6; c.lineCap = 'round';
      c.beginPath(); c.arc(-14, 0, d.reach * .5, -1.0, 1.0); c.stroke();
      c.restore();
    }
  }
  // block shield
  if (f.block && f.state === 'idle') {
    c.save(); c.strokeStyle = 'rgba(127,208,255,.9)'; c.lineWidth = 6; c.shadowColor = '#7fd0ff'; c.shadowBlur = 14;
    c.beginPath(); c.arc(f.x + f.face * 8, f.y - d.h * .5, d.h * .62, f.face > 0 ? -1.1 : Math.PI - 1.1, f.face > 0 ? 1.1 : Math.PI + 1.1); c.stroke(); c.restore();
  }
  // slow marker
  if (f.slow > 0) { c.font = '22px serif'; c.textAlign = 'center'; c.fillText(f.slowIcon || '❄️', f.x, f.y - d.h - 18); }
}

function drawProj(c, p) {
  if (p.kind === 'drop' && p.wait > 0) {              // floor warning before a moon shard falls
    const k = .35 + .3 * Math.abs(Math.sin(Date.now() / 90));
    c.save(); c.strokeStyle = 'rgba(255,226,122,' + k * .5 + ')'; c.lineWidth = 16; c.beginPath(); c.moveTo(p.x, 0); c.lineTo(p.x, FLOOR); c.stroke();
    c.fillStyle = 'rgba(255,226,122,' + k + ')'; c.beginPath(); c.ellipse(p.x, FLOOR + 8, 36, 9, 0, 0, 7); c.fill(); c.restore();
    return;
  }
  c.save(); c.translate(p.x, p.y); c.scale(Math.sign(p.vx) || 1, 1);
  if (p.kind === 'drop') {
    c.shadowColor = '#ffe27a'; c.shadowBlur = 22;
    for (let i = 3; i >= 1; i--) { c.globalAlpha = .12 * (4 - i); c.fillStyle = '#fff3b0'; c.fillRect(-5, -22 - i * 22, 10, 22); }
    c.globalAlpha = 1; c.fillStyle = '#fff3b0'; c.strokeStyle = '#d9a441'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 28); c.lineTo(-12, 0); c.lineTo(0, -24); c.lineTo(12, 0); c.closePath(); c.fill(); c.stroke();
  } else if (p.kind === 'mud') {
    c.shadowColor = '#6b4e2b'; c.shadowBlur = 8;
    for (let i = 3; i >= 1; i--) { c.globalAlpha = .18; c.fillStyle = '#6b4e2b'; c.beginPath(); c.arc(-i * 13, i * 3, 9 - i, 0, 7); c.fill(); }
    c.globalAlpha = 1; const mg = c.createRadialGradient(-4, -5, 2, 0, 0, 19); mg.addColorStop(0, '#b98a4c'); mg.addColorStop(1, '#5b4126');
    c.fillStyle = mg; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(-6, -6, 4, 0, 7); c.fill();
  } else if (p.kind === 'slash') {
    c.shadowColor = '#9fd8ff'; c.shadowBlur = 20;
    for (let i = 3; i >= 0; i--) {
      c.globalAlpha = i ? .12 : .95; c.fillStyle = '#c9ecff';
      c.beginPath(); c.arc(-i * 12, 0, 34, -1.2, 1.2); c.arc(-14 - i * 12, 0, 28, 1.2, -1.2, true); c.closePath(); c.fill();
    }
  } else {
    c.shadowColor = '#7fd8ff'; c.shadowBlur = 16;
    for (let i = 3; i >= 0; i--) {
      c.globalAlpha = i ? .15 : 1; c.fillStyle = '#bfefff'; c.strokeStyle = '#4aa8d8'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(26 - i * 14, 0); c.lineTo(0 - i * 14, -9); c.lineTo(-22 - i * 14, 0); c.lineTo(0 - i * 14, 9); c.closePath(); c.fill(); if (!i) c.stroke();
    }
  }
  c.restore();
}

function drawBar(c, x, w, f, right) {
  const y = 26, h = 22, r = f.hp / f.d.hp, g = f.ghost / f.d.hp;
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
  const px = v => right ? x + w - w * v : x;
  c.fillStyle = '#ffd23f'; c.fillRect(px(g), y, w * g, h);                        // trailing damage
  c.fillStyle = r > .3 ? '#5cd05c' : '#e0463c'; c.fillRect(px(r), y, w * r, h);   // health
  c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(px(r), y, w * r, h / 2);
  // energy
  const e = f.en / 100, ey = y + h + 8;
  c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - 3, ey - 2, w * .6 + 6, 14);
  const ew = w * .6, ex = right ? x + w - ew : x;
  const ready = f.en >= f.d.cost;
  c.fillStyle = ready ? '#ffb347' : '#4aa8d8';
  c.fillRect(right ? ex + ew - ew * e : ex, ey, ew * e, 10);
  if (ready) { c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(ex, ey, ew, 10); }
}

function banner(c, text, sub, y) {
  c.save(); c.textAlign = 'center'; c.lineJoin = 'round';
  c.font = 'bold 84px Georgia, serif'; c.lineWidth = 10; c.strokeStyle = '#000'; c.strokeText(text, W / 2, y);
  c.fillStyle = '#ffd23f'; c.fillText(text, W / 2, y);
  if (sub) { c.font = 'bold 26px Georgia, serif'; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(sub, W / 2, y + 44); c.fillStyle = '#fff'; c.fillText(sub, W / 2, y + 44); }
  c.restore();
}

function render() {
  const c = ctx; if (!c || !M) return;
  c.save();
  if (M.shake > 0) c.translate(rand(-M.shake, M.shake) * .6, rand(-M.shake, M.shake) * .6);
  c.drawImage(bgCanvas, 0, 0);
  M.waves.forEach(w => {
    const r = 20 + w.t * 11; c.save(); c.globalAlpha = 1 - w.t / 16; c.strokeStyle = '#ffd23f'; c.lineWidth = 6;
    c.beginPath(); c.ellipse(w.x, FLOOR + 4, r * 1.5, r * .28, 0, 0, 7); c.stroke(); c.restore();
  });
  M.puddles.forEach(pd => {
    c.save(); c.globalAlpha = .85 * Math.min(1, pd.life / 40);
    c.fillStyle = '#4e3820'; c.beginPath(); c.ellipse(pd.x, FLOOR + 8, pd.w, 12, 0, 0, 7); c.fill();
    c.fillStyle = '#6b4e2b'; c.beginPath(); c.ellipse(pd.x - 6, FLOOR + 6, pd.w * .7, 7, 0, 0, 7); c.fill();
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(190,150,90,.85)'; c.beginPath(); c.arc(pd.x + Math.sin(M.t / 20 + i * 2) * pd.w * .5, FLOOR + 6 - Math.abs(Math.sin(M.t / 12 + i)) * 8, 3, 0, 7); c.fill(); }
    c.restore();
  });
  const order = M.fighters.slice().sort((a, b) => a.y - b.y);
  order.forEach(f => drawFighter(c, f));
  M.proj.forEach(p => drawProj(c, p));
  drawAmb(c, M.arena.amb, M.t + M.round * 1000);
  M.parts.forEach(p => { c.globalAlpha = Math.max(0, p.life / p.max); c.fillStyle = p.c; c.fillRect(p.x, p.y, p.s, p.s); });
  c.globalAlpha = 1;
  c.restore();

  // HUD
  const [a, b] = M.fighters;
  drawBar(c, 30, 390, a, false); drawBar(c, W - 30 - 390, 390, b, true);
  c.font = 'bold 18px Georgia, serif'; c.fillStyle = '#fff'; c.textAlign = 'left';
  c.shadowColor = '#000'; c.shadowBlur = 4;
  c.fillText(a.d.icon + ' ' + (PV.mode === 'cpu' ? 'YOU · ' : 'P1 · ') + a.d.name, 32, 20);
  c.textAlign = 'right'; c.fillText(b.d.name + (PV.mode === 'cpu' ? ' · CPU' : ' · P2') + ' ' + b.d.icon, W - 32, 20);
  c.shadowBlur = 0;
  [[a, 32, 'left'], [b, W - 32, 'right']].forEach(([f, x, al]) => {
    for (let i = 0; i < 2; i++) {
      const px = al === 'left' ? x + 8 + i * 22 : x - 8 - i * 22;
      c.fillStyle = i < f.wins ? '#ffd23f' : 'rgba(0,0,0,.5)'; c.strokeStyle = '#fff'; c.lineWidth = 2;
      c.beginPath(); c.arc(px, 86, 8, 0, 7); c.fill(); c.stroke();
    }
  });
  const secs = Math.max(0, Math.ceil(M.clock / 60));
  c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.arc(W / 2, 40, 30, 0, 7); c.fill();
  c.fillStyle = secs <= 10 ? '#ff6b5a' : '#fff'; c.textAlign = 'center'; c.font = 'bold 30px Georgia, serif'; c.fillText(secs, W / 2, 51);

  if (M.state === 'intro') {
    if (M.t < 50) banner(c, 'ROUND ' + M.round, M.arena.icon + ' ' + M.arena.name, 270);
    else banner(c, 'FIGHT!', '', 270);
  } else if (M.state === 'ko') {
    const w = M.roundWinner;
    const who = w === 'draw' ? 'Nobody wins this round' : (PV.mode === 'cpu' ? (w === 0 ? 'You win the round!' : 'CPU wins the round') : 'Player ' + (w + 1) + ' wins the round!');
    banner(c, M.msg, who, 270);
  } else if (M.state === 'over') {
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, W, H);
    const w = M.winner;
    const t = w === 'draw' ? 'DRAW' : PV.mode === 'cpu' ? (w === 0 ? 'YOU WIN!' : 'YOU LOSE') : 'PLAYER ' + (w + 1) + ' WINS!';
    banner(c, t, M.fighters[0].wins + ' – ' + M.fighters[1].wins + (PV.mode === 'cpu' ? '   ·   record ' + rec.w + 'W ' + rec.l + 'L' : ''), 250);
    c.font = '22px Georgia, serif'; c.fillStyle = '#fff'; c.textAlign = 'center';
    c.fillText('Enter: rematch   ·   Esc: leave arena', W / 2, 380);
  }
  if (M.paused) {
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, 0, W, H);
    banner(c, 'PAUSED', 'Esc: resume   ·   Q: leave arena   ·   M: sound on/off', 270);
  }
}

/* ---------- input ---------- */
const K1 = { l: ['KeyA'], r: ['KeyD'], j: ['KeyW'], b: ['KeyS'], a: ['KeyJ'], s: ['KeyK'] };
const K2 = { l: ['ArrowLeft'], r: ['ArrowRight'], j: ['ArrowUp'], b: ['ArrowDown'], a: ['Comma', 'Numpad1'], s: ['Period', 'Numpad2'] };
const merge = (a, b) => { const o = {}; for (const k in a) o[k] = a[k].concat(b[k]); return o; };
const held = (m, k) => m[k].some(c => down[c]);
const pressed = (m, k) => m[k].some(c => edge[c]);
function readKeys(m) {
  return { l: held(m, 'l'), r: held(m, 'r'), b: held(m, 'b'), j: pressed(m, 'j'), a: pressed(m, 'a'), s: pressed(m, 's') };
}

function tick() {
  const cpu = PV.mode === 'cpu';
  const p1 = readKeys(cpu ? merge(K1, K2) : K1);
  const p2 = cpu ? cpuInput(M, M.fighters[1], M.fighters[0], PV.lvl) : readKeys(K2);
  step(M, [p1, p2]);
  edge = {};
  M.events.forEach(sfx); M.events.length = 0;
  if (M.state === 'over' && !M.recorded) {
    M.recorded = true;
    if (cpu) { if (M.winner === 0) rec.w++; else if (M.winner === 1) rec.l++; }
    const again = $('pvAgain'); if (again) again.hidden = false;
  }
}

function frame(ts) {
  raf = requestAnimationFrame(frame);
  if (!last) last = ts;
  acc += Math.min(100, ts - last); last = ts;
  while (acc >= 1000 / 60) { if (!M.paused) tick(); else edge = {}; acc -= 1000 / 60; }
  render();
}

function onKey(e) {
  if (mode !== 'pvp') return;
  if (!e.repeat) edge[e.code] = 1;
  down[e.code] = 1;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { if (M.state === 'over') quit(); else M.paused = !M.paused; }
  else if (e.code === 'KeyQ' && M.paused) quit();
  else if (e.code === 'Enter' && M.state === 'over') rematch();
  else if (e.code === 'KeyM') muted = !muted;
}
if (typeof addEventListener === 'function') {
  addEventListener('keydown', onKey);
  addEventListener('keyup', e => { delete down[e.code]; });
  addEventListener('blur', () => { for (const k in down) delete down[k]; });
}

/* ---------- flow ---------- */
function start() {
  const k2 = PV.p2 === 'rand' ? ORDER[ri(0, ORDER.length - 1)] : PV.p2;
  const ak = PV.arena === 'rand' ? AORDER[ri(0, AORDER.length - 1)] : PV.arena;
  M = createMatch(PV.p1, k2, ak);
  M.fighters[0].spr = spritesFor(PV.p1, PV.gear);
  M.fighters[1].spr = spritesFor(k2, ICON_RIVAL);
  if (!ctx) ctx = $('pvpCv').getContext('2d');
  bgCanvas = getBG(M.arenaKey); initAmb(M.arena.amb);
  $('pvAgain').hidden = true;
  $('pvpHelp').textContent = PV.mode === 'cpu'
    ? 'A/D move · W jump · S block · J attack (tap for a 3-hit combo) · K special (needs energy) · Esc pause · M sound'
    : 'P1: A/D · W · S · J attack · K special      P2: ←/→ · ↑ · ↓ · , attack · . special      Esc pause';
  mode = 'pvp'; view('pvpView');
  cancelAnimationFrame(raf); last = 0; acc = 0;
  raf = requestAnimationFrame(frame);
}
function rematch() { start(); }
function quit() { cancelAnimationFrame(raf); raf = 0; mode = 'text'; menu(); }

function picker() {
  cancelAnimationFrame(raf);
  mode = 'text'; view('textView');
  if (window.TQMusic) TQMusic.pause();
  const cpu = PV.mode === 'cpu';
  const fbtn = (k, sel) => `<button data-k="${k}" class="${sel === k ? 'on' : ''}">${k === 'rand' ? '🎲 Random' : FIGHTERS[k].icon + ' ' + FIGHTERS[k].name}</button>`;
  const info = k => k === 'rand' ? '' : `<b>${FIGHTERS[k].name}</b>: ${FIGHTERS[k].desc} Special: ${FIGHTERS[k].spName} (${FIGHTERS[k].cost} energy).`;
  const wire = (id, fn) => document.querySelectorAll('#' + id + ' button').forEach(b => b.onclick = () => { fn(b.dataset.v !== undefined ? b.dataset.v : b.dataset.k); picker(); });

  if (PV.step === 1) {
    /* ---------- step 1: mode + fighters ---------- */
    $('textView').innerHTML = `<div class="card"><h2>⚔ PvP Arena</h2>
     <p class="muted"><b>Step 1 of 2 · Choose your fighters.</b> Real-time fighting, no turns! Best of 3 rounds. Hit things to build energy, then press K for your special.</p>
     <label>Mode</label>
     <div class="tabs" id="pvMode"><button data-v="cpu" class="${cpu ? 'on' : ''}">🤖 Vs CPU</button><button data-v="2p" class="${cpu ? '' : 'on'}">👥 2 Players</button></div>
     ${cpu ? `<label>CPU level</label><div class="tabs" id="pvLvl">${LEVELS.map((l, i) => `<button data-v="${i}" class="${PV.lvl === i ? 'on' : ''}">${l.name}</button>`).join('')}</div>` : ''}
     <label>${cpu ? 'Your fighter' : 'Player 1 fighter'}</label>
     <div class="fgrid" id="pvF1">${ORDER.map(k => fbtn(k, PV.p1)).join('')}</div>
     <label>${cpu ? 'CPU fighter' : 'Player 2 fighter'}</label>
     <div class="fgrid" id="pvF2">${ORDER.map(k => fbtn(k, PV.p2)).join('')}${cpu ? fbtn('rand', PV.p2) : ''}</div>
     <p class="muted" style="margin-top:10px">${info(PV.p1)}</p>
     <p class="muted">${cpu ? 'Controls: <b>A/D</b> move · <b>W</b> jump · <b>S</b> block · <b>J</b> attack · <b>K</b> special' : '<b>P1</b>: A/D, W jump, S block, J attack, K special.<br><b>P2</b>: ←/→, ↑ jump, ↓ block, <b>,</b> attack, <b>.</b> special.'}</p>
     <div class="list"><button class="primary" id="pvNext">Next ▶ Choose arena</button><button id="pvBack">Back</button></div></div>`;
    wire('pvMode', v => { PV.mode = v; if (v === '2p' && PV.p2 === 'rand') PV.p2 = 'king'; });
    wire('pvLvl', v => { PV.lvl = +v; });
    wire('pvF1', k => { PV.p1 = k; });
    wire('pvF2', k => { PV.p2 = k; });
    $('pvNext').onclick = () => { PV.step = 2; picker(); };
    $('pvBack').onclick = () => menu();
    $('pvNext').focus();
    return;
  }

  /* ---------- step 2: arena ---------- */
  const f1 = FIGHTERS[PV.p1], f2 = PV.p2 === 'rand' ? null : FIGHTERS[PV.p2];
  $('textView').innerHTML = `<div class="card"><h2>⚔ PvP Arena</h2>
   <p class="muted"><b>Step 2 of 2 · Choose the arena.</b> There is one for each adventure level.</p>
   <p style="text-align:center;margin:6px 0 10px"><b>${f1.icon} ${f1.name}</b> &nbsp;vs&nbsp; <b>${f2 ? f2.icon + ' ' + f2.name : '🎲 Random'}</b><br><span class="muted">${cpu ? '🤖 Vs CPU · ' + LEVELS[PV.lvl].name : '👥 2 Players'}</span></p>
   <canvas id="pvPrev" width="320" height="180" style="width:100%;height:auto;border-radius:10px;border:2px solid var(--line);display:block"></canvas>
   <div class="fgrid" id="pvAr" style="margin-top:8px">${AORDER.map(k => `<button data-k="${k}" class="${PV.arena === k ? 'on' : ''}">${ARENAS[k].icon} ${ARENAS[k].name}</button>`).join('')}<button data-k="rand" class="${PV.arena === 'rand' ? 'on' : ''}">🎲 Random arena</button></div>
   <p class="muted">${PV.arena === 'rand' ? 'A surprise arena is picked each match.' : ARENAS[PV.arena].desc}</p>
   <div class="list"><button class="primary" id="pvGo">Fight!</button><button id="pvBack">◀ Back to fighters</button></div></div>`;
  wire('pvAr', k => { PV.arena = k; });
  try {
    const pc = $('pvPrev').getContext('2d');
    if (PV.arena === 'rand') { pc.fillStyle = '#10131f'; pc.fillRect(0, 0, 320, 180); pc.font = '40px serif'; pc.textAlign = 'center'; pc.fillStyle = '#fff'; pc.fillText('🎲', 160, 100); }
    else pc.drawImage(getBG(PV.arena), 0, 0, 320, 180);
  } catch (e) { /* preview is optional */ }
  $('pvGo').onclick = () => { rec = { w: 0, l: 0 }; start(); };
  $('pvBack').onclick = () => { PV.step = 1; picker(); };
  $('pvGo').focus();
}

/* on-screen buttons (touch devices) and the leave / rematch buttons */
function wirePad() {
  document.querySelectorAll('#pvpPad button').forEach(b => {
    const k = b.dataset.k;
    b.onpointerdown = e => { e.preventDefault(); down[k] = 1; edge[k] = 1; };
    b.onpointerup = b.onpointerleave = b.onpointercancel = () => { delete down[k]; };
  });
  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  bind('pvQuit', quit);
  bind('pvPause', () => { if (M) M.paused = !M.paused; });
  bind('pvAgain', rematch);
}

window.TQPvp = {
  open(gear) { PV.gear = gear || { sw: 0, ar: 0 }; PV.step = 1; wirePad(); picker(); },
  levelArena: i => AORDER[i] || 'village',     // adventure level number -> arena name
  bg: getBG,                                   // the arena background (a canvas), also used by the turn-based battles
  _engine: { createMatch, step, cpuInput, FIGHTERS, ORDER, LEVELS, ATK, FLOOR, W, ARENAS, AORDER }
};
})();
