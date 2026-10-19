import './style.css';
import { mountShell } from './shell';

type Tile = 'dirt' | 'ore' | 'floor' | 'nest' | 'core';
type Point = { x: number; y: number };
type Turret = Point & { cooldown: number; angle: number };
type Enemy = Point & { hp: number; max: number; path: Point[]; step: number };
type Shot = { from: Point; to: Point; life: number };
type Pulse = Point & { life: number; color: string };
const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const el = (id: string) => document.getElementById(id)!;
const button = (id: string) => document.querySelector<HTMLButtonElement>(`#${id}`)!;
const COLS = 19, ROWS = 13, SIZE = 40, W = COLS * SIZE, H = ROWS * SIZE;
const COST = 45, ORE = 30, RANGE = 3.1;
const core = { x: 9, y: 6 };
const nests: Point[] = [{ x: 1, y: 3 }, { x: 12, y: 1 }, { x: 17, y: 6 }, { x: 7, y: 11 }];
const quotas = [5, 7, 9, 12];
let map: Tile[][] = [], distances: number[][] = [], active: number[] = [];
let turrets: Turret[] = [], enemies: Enemy[] = [], shots: Shot[] = [], pulses: Pulse[] = [];
let credits = 100, health = 100, wave = 0, kills = 0;
let phase: 'plan' | 'wave' | 'won' | 'lost' = 'plan';
let tool: 'dig' | 'turret' = 'dig';
let hover: Point | null = null;
let spawnTimer = 0, remainingSpawns = 0, spawnIndex = 0, last = performance.now(), accumulator = 0;
const paused=mountShell(W/H,()=>{last=performance.now();accumulator=0;});
const inside = (p: Point) => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;
const neighbors = (p: Point) => [{ x: p.x + 1, y: p.y }, { x: p.x - 1, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y - 1 }].filter(inside);
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const walkable = (p: Point) => ['floor', 'nest', 'core'].includes(map[p.y][p.x]);
function say(message: string) { el('status').textContent = message; }

function connect(announce = true) {
  distances = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(-1));
  distances[core.y][core.x] = 0;
  const queue: Point[] = [core];
  for (let i = 0; i < queue.length; i++) {
    for (const p of neighbors(queue[i])) {
      if (walkable(p) && distances[p.y][p.x] < 0) {
        distances[p.y][p.x] = distances[queue[i].y][queue[i].x] + 1;
        queue.push(p);
      }
    }
  }
  nests.forEach((p, i) => {
    if (distances[p.y][p.x] >= 0 && !active.includes(i)) {
      active.push(i);
      if (announce) {
        pulses.push({ ...p, life: 2.8, color: '#ff756b' });
        say(`NEST ${i + 1} AWAKENED! Permanent new front. Next wave: ${active.length * quotas[wave]} enemies.`);
      }
    }
  });
}

function reset() {
  map = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill('dirt'));
  for (let x = 1; x <= 5; x++) map[3][x] = 'floor';
  for (let y = 3; y <= 6; y++) map[y][5] = 'floor';
  for (let x = 5; x <= 9; x++) map[6][x] = 'floor';
  for (const [x, y] of [[5, 2], [6, 2], [8, 5], [9, 4], [10, 3], [11, 2], [12, 2], [11, 6], [13, 6], [15, 6], [16, 6], [8, 8], [8, 9], [7, 10], [6, 10], [3, 7], [3, 8]]) map[y][x] = 'ore';
  nests.forEach(p => { map[p.y][p.x] = 'nest'; });
  map[core.y][core.x] = 'core';
  credits = 100; health = 100; wave = 0; kills = 0; phase = 'plan'; tool = 'turret';
  turrets = []; enemies = []; active = []; shots = []; pulses = []; hover = null;
  remainingSpawns = 0; spawnTimer = 0; spawnIndex = 0; accumulator = 0; last = performance.now();
  connect(false);
  say('Place two turrets along the bent tunnel. Dig gold ore for +30 credits; watch the sleeping nests.');
  updateUI();
}

function valid(p: Point) {
  if (phase !== 'plan') return false;
  const tile = map[p.y][p.x];
  if (tool === 'dig') return (tile === 'dirt' || tile === 'ore') && neighbors(p).some(n => distances[n.y][n.x] >= 0);
  return tile === 'floor' && !turrets.some(t => same(t, p)) && credits >= COST;
}

function feedback(p: Point | null): string {
  if (phase === 'won' || phase === 'lost') return 'Expedition complete. Press R or Restart to begin again.';
  if (phase === 'wave' && !p) return 'Combat underway. Digging and building resume after the wave.';
  if (!p) return tool === 'dig' ? 'Dig: choose earth or ore beside a connected tunnel.' : 'Turret: choose a tunnel tile. Range: 3.1 tiles • Cost: 45.';
  const tile = map[p.y][p.x];
  const prefix = `Tile ${p.x + 1}, ${p.y + 1} · `;
  if (tile === 'nest') return prefix + (distances[p.y][p.x] >= 0 ? 'ACTIVE NEST — sends enemies every wave.' : 'DORMANT NEST — digging beside it opens a new front!');
  if (tile === 'core') return prefix + 'CORE — protect it through four waves.';
  if (phase !== 'plan') return 'Excavation and construction locked during combat.';
  if (tool === 'dig') {
    if (tile === 'floor') return prefix + 'Already excavated. Switch to Turret [2].';
    if (!valid(p)) return prefix + 'Out of reach. Dig from a cardinal edge of your tunnel.';
    const risk = neighbors(p).some(n => map[n.y][n.x] === 'nest' && distances[n.y][n.x] < 0);
    return prefix + (tile === 'ore' ? 'Mine ore: +30 credits.' : 'Dig earth: free, no credits.') + (risk ? ' WARNING: awakens a nest!' : '');
  }
  if (tile !== 'floor') return prefix + 'Excavate this tile before building.';
  if (turrets.some(t => same(t, p))) return prefix + 'Turret installed. Enemies can pass through.';
  return prefix + (credits < COST ? 'Need 45 credits. Mine ore to fund a turret.' : 'Build turret: 45 credits. Does not block movement.');
}

function useTile(p: Point) {
  if (phase !== 'plan') return;
  hover = p;
  if (!valid(p)) { say(feedback(p)); updateUI(); return; }
  if (tool === 'dig') {
    const ore = map[p.y][p.x] === 'ore';
    map[p.y][p.x] = 'floor';
    if (ore) credits += ORE;
    pulses.push({ ...p, life: 0.65, color: ore ? '#ffd36b' : '#9eb4af' });
    say(ore ? 'Ore extracted. +30 credits.' : 'Tunnel extended. Longer routes give turrets more time.');
    connect();
  } else {
    credits -= COST; turrets.push({ ...p, cooldown: 0, angle: -Math.PI / 2 });
    say('Turret online. Its tunnel stays open to enemies.');
  }
  updateUI();
}

function startWave() {
  if (phase !== 'plan') return;
  wave++; phase = 'wave'; remainingSpawns = active.length * quotas[wave - 1]; spawnTimer = 0.3; spawnIndex = 0;
  hover = null;
  say(`Wave ${wave}: ${remainingSpawns} enemies incoming from ${active.length} active nest${active.length === 1 ? '' : 's'}.`);
  updateUI();
}

function pathFrom(p: Point): Point[] {
  const path: Point[] = [{ ...p }];
  let current = p;
  while (!same(current, core)) {
    const next = neighbors(current).find(n => distances[n.y][n.x] === distances[current.y][current.x] - 1);
    if (!next) break;
    path.push(next); current = next;
  }
  return path;
}

function updateUI() {
  canvas.dataset.phase=phase;
  button('confirm').disabled=phase!=='plan'||!hover||!valid(hover);
  button('confirm').textContent=hover?`Confirm ${tool}`:'Tap map to select';
  for(const direction of ['left','right','up','down']) button(`tile-${direction}`).disabled=phase!=='plan';
  el('stage').textContent = phase === 'plan' ? `PLAN ${wave + 1} / 4` : phase === 'won' ? 'SECURED' : phase === 'lost' ? 'CORE LOST' : `WAVE ${wave} / 4`;
  el('health').textContent = `${health}%`;
  el('health').style.color = health <= 30 ? '#ff8278' : '#81e1c5';
  el('credits').textContent = `${credits}`;
  el('nests').textContent = `${active.length} / 4`;
  el('count').textContent = `${phase === 'plan' ? active.length * quotas[wave] : remainingSpawns + enemies.length}`;
  el('count-label').textContent = phase === 'plan' ? 'NEXT WAVE' : 'REMAINING';
  button('start').disabled = phase !== 'plan';
  button('start').textContent = phase === 'won' ? 'Frontier secured' : phase === 'lost' ? 'Core destroyed' : phase === 'wave' ? 'Wave in progress…' : `Start wave ${wave + 1} →`;
  button('repair').disabled = phase !== 'plan' || health === 100 || credits < 25;
  for (const name of ['dig', 'turret'] as const) {
    button(name).disabled = phase !== 'plan';
    button(name).setAttribute('aria-pressed', String(tool === name));
  }
  el('hover').textContent = feedback(hover);
  el('selected').textContent = phase === 'plan' ? `${tool === 'dig' ? 'DIG' : 'TURRET'} · ${hover?`tile ${hover.x+1}, ${hover.y+1}`:'tap map to select'}` : phase === 'wave' ? 'COMBAT · BUILD LOCKED' : 'RUN COMPLETE';
}

function tick(dt: number) {
  shots = shots.filter(s => (s.life -= dt) > 0);
  pulses = pulses.filter(p => (p.life -= dt) > 0);
  if (phase !== 'wave') return;
  spawnTimer -= dt;
  if (remainingSpawns > 0 && spawnTimer <= 0) {
    const source = nests[active[spawnIndex % active.length]];
    const hp = 26 + (wave - 1) * 8;
    enemies.push({ ...source, hp, max: hp, path: pathFrom(source), step: 1 });
    remainingSpawns--; spawnIndex++; spawnTimer += 0.88 / Math.sqrt(active.length);
  }
  for (const turret of turrets) {
    turret.cooldown -= dt;
    const target = enemies.filter(e => e.hp > 0 && distance(turret, e) <= RANGE).sort((a, b) => (a.path.length - a.step) - (b.path.length - b.step))[0];
    if (target) {
      turret.angle = Math.atan2(target.y - turret.y, target.x - turret.x);
      if (turret.cooldown <= 0) {
        target.hp -= 14; turret.cooldown = 0.48;
        shots.push({ from: { ...turret }, to: { x: target.x, y: target.y }, life: 0.12 });
        if (target.hp <= 0) { kills++; pulses.push({ x: target.x, y: target.y, life: 0.3, color: '#ff8b77' }); }
      }
    }
  }
  enemies = enemies.filter(e => e.hp > 0);
  for (const enemy of enemies) {
    const target = enemy.path[enemy.step];
    if (!target) continue;
    const d = distance(enemy, target), step = (1.45 + wave * 0.09) * dt;
    if (d <= step) { enemy.x = target.x; enemy.y = target.y; enemy.step++; }
    else { enemy.x += (target.x - enemy.x) / d * step; enemy.y += (target.y - enemy.y) / d * step; }
    if (enemy.step >= enemy.path.length) {
      enemy.hp = 0; health = Math.max(0, health - 10);
      pulses.push({ ...core, life: 0.6, color: '#ff756b' });
    }
  }
  enemies = enemies.filter(e => e.hp > 0);
  if (health <= 0) {
    phase = 'lost'; say(`Core breached on wave ${wave}. ${kills} enemies stopped. Restart instantly with R.`);
  } else if (remainingSpawns === 0 && enemies.length === 0) {
    if (wave === 4) { phase = 'won'; say(`Frontier secured! ${health}% core integrity · ${kills} enemies stopped. Press R for another expedition.`); }
    else { phase = 'plan'; credits += 25; say(`Wave ${wave} cleared. +25 supply credits. Mine, build, or repair before the next wave.`); }
  }
  updateUI();
}

function circle(x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function draw(now: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(W * dpr), pixelHeight = Math.round(H * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
  ctx.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
  ctx.fillStyle = '#111d22'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const tile = map[y][x], px = x * SIZE, py = y * SIZE, cx = px + 20, cy = py + 20;
    ctx.fillStyle = tile === 'dirt' || tile === 'ore' ? ((x + y) % 2 ? '#332e29' : '#38312a') : '#192b32';
    ctx.fillRect(px + 1, py + 1, SIZE - 2, SIZE - 2);
    if (tile === 'dirt' || tile === 'ore') {
      ctx.strokeStyle = '#514439'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(px + 8, py + 12 + x % 4); ctx.lineTo(px + 17, py + 9 + x % 4); ctx.moveTo(px + 25, py + 28); ctx.lineTo(px + 30, py + 32); ctx.stroke();
    }
    if (tile === 'ore') {
      ctx.fillStyle = '#eabb59'; ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy - 11); ctx.lineTo(cx + 3, cy - 2); ctx.lineTo(cx, cy + 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe5a1'; ctx.beginPath(); ctx.moveTo(cx + 3, cy + 6); ctx.lineTo(cx + 7, cy - 8); ctx.lineTo(cx + 13, cy + 1); ctx.closePath(); ctx.fill();
    }
    if (tile === 'floor') circle(cx, cy, 1.4, '#34515a');
    if (tile === 'nest') {
      const index = nests.findIndex(n => n.x === x && n.y === y), awake = active.includes(index);
      ctx.strokeStyle = awake ? '#ff776c' : '#b397bd'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? 11 : 17; const nx = cx + Math.cos(a) * r, ny = cy + Math.sin(a) * r; if (i === 0) ctx.moveTo(nx, ny); else ctx.lineTo(nx, ny); }
      ctx.closePath(); ctx.stroke(); circle(cx, cy, 7 + (awake ? Math.sin(now / 220) : 0), awake ? '#a84342' : '#56465e');
      ctx.fillStyle = '#fff0e5'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(index + 1), cx, cy + 4);
    }
    if (tile === 'core') {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#81e1c5'; ctx.shadowColor = '#81e1c5'; ctx.shadowBlur = 15; ctx.fillRect(-11, -11, 22, 22); ctx.shadowBlur = 0; ctx.fillStyle = '#173b3a'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    }
    if (phase === 'plan' && tool === 'dig' && valid({ x, y })) { ctx.strokeStyle = '#88d1ba55'; ctx.lineWidth = 1; ctx.strokeRect(px + 3, py + 3, 34, 34); }
  }
  if (hover && phase === 'plan') {
    const x = hover.x * SIZE, y = hover.y * SIZE;
    if (tool === 'turret') {
      circle(x + 20, y + 20, RANGE * SIZE, '#7bdcc316');
      ctx.strokeStyle = '#81e1c580'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 20, y + 20, RANGE * SIZE, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = valid(hover) ? '#d4ffe7' : '#ff8b77'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, 36, 36);
  }
  for (const t of turrets) {
    const x = t.x * SIZE + 20, y = t.y * SIZE + 20;
    ctx.fillStyle = '#0b191f'; ctx.fillRect(x - 13, y - 13, 26, 26);
    ctx.strokeStyle = '#8ed8d6'; ctx.lineWidth = 2; ctx.strokeRect(x - 11, y - 11, 22, 22);
    circle(x, y, 8, '#65abae');
    ctx.strokeStyle = '#dbfff0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t.angle) * 17, y + Math.sin(t.angle) * 17); ctx.stroke();
  }
  for (const e of enemies) {
    const x = e.x * SIZE + 20, y = e.y * SIZE + 20;
    ctx.fillStyle = '#ff7e70'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x, y + 3); ctx.lineTo(x - 10, y + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#10191e'; ctx.fillRect(x - 11, y - 16, 22, 3); ctx.fillStyle = '#ffb49c'; ctx.fillRect(x - 11, y - 16, 22 * e.hp / e.max, 3);
  }
  for (const s of shots) {
    ctx.strokeStyle = '#d8fff0'; ctx.lineWidth = 2; ctx.globalAlpha = s.life / 0.12;
    ctx.beginPath(); ctx.moveTo(s.from.x * SIZE + 20, s.from.y * SIZE + 20); ctx.lineTo(s.to.x * SIZE + 20, s.to.y * SIZE + 20); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of pulses) {
    ctx.strokeStyle = p.color; ctx.globalAlpha = Math.min(1, p.life * 2); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x * SIZE + 20, p.y * SIZE + 20, 22 + (1 - p.life % 1) * 22, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (phase === 'won' || phase === 'lost') {
    ctx.fillStyle = '#09151de0'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = phase === 'won' ? '#81e1c5' : '#ff8b77'; ctx.font = 'bold 40px system-ui';
    ctx.fillText(phase === 'won' ? 'FRONTIER SECURED' : 'CORE BREACHED', W / 2, H / 2 - 28);
    ctx.fillStyle = '#e0e9e8'; ctx.font = '18px system-ui'; ctx.fillText(`${wave} / 4 waves launched · ${kills} enemies stopped · ${health}% integrity`, W / 2, H / 2 + 10);
    ctx.font = '16px system-ui'; ctx.fillText('Press R or use Restart to dig a new route', W / 2, H / 2 + 48);
  }
}

function pointer(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.min(COLS - 1, Math.floor((event.clientX - rect.left) / rect.width * COLS))), y: Math.max(0, Math.min(ROWS - 1, Math.floor((event.clientY - rect.top) / rect.height * ROWS))) };
}
canvas.addEventListener('pointermove', event => { if(event.pointerType!=='mouse'||event.buttons||paused())return; hover = pointer(event); updateUI(); });
// Keep the inspected tile selected after the finger leaves the map.

canvas.addEventListener('pointerdown', event => { if(paused())return;event.preventDefault(); canvas.focus({ preventScroll: true }); hover=pointer(event);if(event.pointerType==='mouse')useTile(hover);else updateUI(); });
function moveCursor(dx:number,dy:number){if(phase!=='plan'||paused())return;const p=hover??core;hover={x:Math.max(0,Math.min(COLS-1,p.x+dx)),y:Math.max(0,Math.min(ROWS-1,p.y+dy))};updateUI();}
button('tile-left').onclick=()=>moveCursor(-1,0);button('tile-right').onclick=()=>moveCursor(1,0);button('tile-up').onclick=()=>moveCursor(0,-1);button('tile-down').onclick=()=>moveCursor(0,1);button('confirm').onclick=()=>{if(hover)useTile(hover);};
function select(next: 'dig' | 'turret') { if (phase === 'plan') { tool = next; updateUI(); } }
button('dig').addEventListener('click', () => select('dig'));
button('turret').addEventListener('click', () => select('turret'));
button('start').addEventListener('click', startWave);
button('restart').addEventListener('click', reset);
button('repair').addEventListener('click', () => {
  if (phase !== 'plan' || health === 100 || credits < 25) return;
  credits -= 25; health = Math.min(100, health + 30); say('Core repaired: +30 integrity, up to 100%.'); updateUI();
});
window.addEventListener('keydown', event => {
  if (paused() || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'r') reset();
  if (key === '1' || key === 'd') select('dig');
  if (key === '2' || key === 't') select('turret');
  if (key === 'n') startWave();
  if (document.activeElement === canvas) {
    if (key.startsWith('arrow')) {
      event.preventDefault(); const p = hover ?? { ...core };
      hover = { x: Math.max(0, Math.min(COLS - 1, p.x + (key === 'arrowright' ? 1 : key === 'arrowleft' ? -1 : 0))), y: Math.max(0, Math.min(ROWS - 1, p.y + (key === 'arrowdown' ? 1 : key === 'arrowup' ? -1 : 0))) }; updateUI();
    }
    if ((key === 'enter' || key === ' ') && hover) { event.preventDefault(); useTile(hover); }
  }
});
function frame(now: number) {
  accumulator += document.hidden || paused() ? 0 : Math.min((now - last) / 1000, 0.1); last = now;
  while (accumulator >= 1 / 60) { tick(1 / 60); accumulator -= 1 / 60; }
  draw(now); requestAnimationFrame(frame);
}
reset(); requestAnimationFrame(frame);
