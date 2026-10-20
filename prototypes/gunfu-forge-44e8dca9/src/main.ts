import './style.css';
import { mountShell } from './shell';

type Vec = { x: number; y: number };
type Phase = 'ready' | 'playing' | 'upgrade' | 'won' | 'lost';
type Slot = 'punch' | 'kick';
type Modifier = { id: string; slot: Slot; name: string; detail: string; after?: boolean };
type Enemy = Vec & { id: number; heavy: boolean; hp: number; maxHp: number; timer: number; wind: number; aim: Vec; stun: number; down: number; grace: number; hit: number; vx: number; vy: number };
type Attack = { slot: Slot; direction: Vec; elapsed: number; windup: number; active: number; duration: number; range: number; spread: number; damage: number; finisher: boolean; landed: boolean; echoed: boolean; stepped: boolean; victims: Set<number> };
type Fx = Vec & { life: number; max: number; color: string; kind: 'impact' | 'trail' | 'ring'; end: Vec };
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const canvas = $<HTMLCanvasElement>('#game'), ctx = canvas.getContext('2d')!;
const W = 960, H = 480, MAX_HP = 8, ENEMY_ARC = 1.0;
const catalog: Modifier[] = [
  { id: 'lunge', slot: 'punch', name: 'Lunge', detail: 'Step toward your target, then plant and punch.' },
  { id: 'backstep', slot: 'punch', name: 'Backstep', detail: 'Punch first, then retreat after contact.', after: true },
  { id: 'drive', slot: 'kick', name: 'Step-in', detail: 'Close distance before your heavy kick.' },
  { id: 'echo', slot: 'punch', name: 'Double', detail: 'A second close-range blow follows each punch.' },
  { id: 'sweep', slot: 'kick', name: 'Sweep', detail: 'Widen the kick and knock opponents down.' },
  { id: 'shock', slot: 'kick', name: 'Slam', detail: 'Impact catches nearby foes in a small ground slam.' },
  { id: 'guard', slot: 'punch', name: 'Guard', detail: 'Brief protection during punch startup.' },
];
let phase: Phase = 'ready', round = 1, kills = 0, punches = 0, kicks = 0, hits = 0, staggers = 0, knockdowns = 0, dashes = 0, followups = 0;
let chosen: string[] = [], enemies: Enemy[] = [], effects: Fx[] = [], attack: Attack | null = null;
let player: Vec = { x: W / 2, y: H / 2 }, facing: Vec = { x: -1, y: 0 };
let health = MAX_HP, hurt = 0, playerStun = 0, guard = 0, clock = 0, shake = 0, hitstop = 0;
let pending = 0, spawnTimer = 0, serial = 0, last = performance.now(), messageTimer = 0;
let combo = 0, comboTimer = 0, buffer: { slot: Slot; until: number } | null = null;
const keys = new Set<string>(), held: Record<Slot, Set<number>> = { punch: new Set(), kick: new Set() };
let padPointer: number | null = null, stick: Vec = { x: 0, y: 0 };
const unit = (v: Vec): Vec => { const n = Math.hypot(v.x, v.y); return n ? { x: v.x / n, y: v.y / n } : { ...facing }; };
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: Vec, margin = 20) => { v.x = Math.max(margin, Math.min(W - margin, v.x)); v.y = Math.max(margin, Math.min(H - margin, v.y)); };
const has = (id: string) => chosen.includes(id);
const mods = (slot: Slot) => catalog.filter(m => chosen.includes(m.id) && m.slot === slot);
const label = (slot: Slot, extra?: Modifier) => {
  const list = [...mods(slot), ...(extra ? [extra] : [])];
  return [...list.filter(m => !m.after).map(m => m.name), slot === 'punch' ? 'Punch' : 'Kick', ...list.filter(m => m.after).map(m => m.name)].join(' + ');
};
function clearInput() { keys.clear(); held.punch.clear(); held.kick.clear(); buffer = null; padPointer = null; stick = { x: 0, y: 0 }; $('#pad-knob').style.transform = ''; }
const shellPaused = mountShell(2, clearInput);
let blurred = false;
const paused = () => shellPaused() || document.hidden || blurred;
function say(text: string, seconds = 1.4) { $('#status').textContent = text; messageTimer = seconds; }
function target() { return enemies.filter(e => e.hp > 0 && e.down <= 0).sort((a, b) => dist(player, a) - dist(player, b))[0]; }
function movement(): Vec {
  const v = { x: stick.x + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), y: stick.y + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) };
  return Math.hypot(v.x, v.y) > 1 ? unit(v) : v;
}
function fx(a: Vec, color: string, kind: Fx['kind'] = 'impact', size = 26, life = 0.24, end?: Vec) { effects.push({ ...a, end: end || { x: size, y: 0 }, color, life, max: life, kind }); }
function step(direction: Vec, distance: number) {
  const old = { ...player }; player.x += direction.x * distance; player.y += direction.y * distance; clamp(player);
  fx(old, '#70ffdc', 'trail', 0, 0.24, { ...player }); dashes++;
}
function execute(slot: Slot, allowBuffer = true) {
  if (phase !== 'playing' || paused() || playerStun > 0) return;
  if (attack) { if (allowBuffer) buffer = { slot, until: clock + 0.2 }; return; }
  const opponent = target();
  if (opponent) facing = unit({ x: opponent.x - player.x, y: opponent.y - player.y });
  const finisher = slot === 'punch' && combo === 2 && comboTimer > 0;
  if (slot === 'punch') { combo = finisher ? 3 : (comboTimer > 0 && combo < 3 ? combo + 1 : 1); comboTimer = 1.05; punches++; }
  else { combo = 0; comboTimer = 0; kicks++; }
  if (slot === 'punch' && has('lunge')) step(facing, 42);
  if (slot === 'kick' && has('drive')) step(facing, 64);
  if (opponent) facing = unit({ x: opponent.x - player.x, y: opponent.y - player.y });
  if (slot === 'punch' && has('guard')) guard = 0.14;
  const windup = slot === 'kick' ? 0.16 : finisher ? 0.10 : 0.07;
  const active = slot === 'kick' ? 0.12 : 0.09;
  attack = { slot, direction: { ...facing }, elapsed: 0, windup, active,
    duration: slot === 'kick' ? 0.54 : finisher ? 0.38 : 0.32,
    range: slot === 'kick' ? 112 : 76, spread: slot === 'kick' ? (has('sweep') ? 1.6 : 0.9) : 0.85,
    damage: slot === 'kick' || finisher ? 2 : 1, finisher, landed: false, echoed: false, stepped: false, victims: new Set() };
  buffer = null;
}
function strikeEnemy(enemy: Enemy, current: Attack, echo = false) {
  const knockdown = !echo && (current.finisher || (current.slot === 'kick' && has('sweep')));
  enemy.hp -= echo ? 1 : current.damage; enemy.hit = 0.14; enemy.wind = 0;
  enemy.stun = knockdown ? 0.9 : current.slot === 'kick' ? 0.58 : 0.32;
  enemy.down = knockdown ? 0.9 : 0;
  enemy.timer = Math.max(enemy.timer, enemy.stun + 0.35);
  const push = unit({ x: enemy.x - player.x, y: enemy.y - player.y });
  const speed = echo ? 95 : knockdown ? 420 : current.slot === 'kick' ? 340 : 105;
  enemy.vx = push.x * speed; enemy.vy = push.y * speed;
  hits++; staggers++; if (knockdown) knockdowns++;
  fx(enemy, current.slot === 'kick' ? '#bca4ff' : '#ffe29a', 'impact', knockdown ? 42 : 26);
  hitstop = Math.max(hitstop, current.slot === 'kick' || current.finisher ? 0.065 : 0.04); shake = 0.12;
  if (enemy.hp <= 0) { kills++; fx(enemy, '#ff8299', 'ring', 46, 0.4); }
}
function resolveAttack(current: Attack, echo = false) {
  let connected = false;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.down > 0 || enemy.grace > 0 || (!echo && current.victims.has(enemy.id))) continue;
    const delta = { x: enemy.x - player.x, y: enemy.y - player.y }, distance = Math.hypot(delta.x, delta.y);
    const angle = Math.acos(Math.max(-1, Math.min(1, (delta.x * current.direction.x + delta.y * current.direction.y) / (distance || 1))));
    if (distance <= current.range + 18 && angle <= current.spread) {
      current.victims.add(enemy.id); strikeEnemy(enemy, current, echo); connected = true;
    }
  }
  if (connected) { current.landed = true; if (echo) followups++; }
  if (connected && !echo) {
    say(current.finisher ? 'FINISHER · knockdown!' : `${current.slot === 'kick' ? 'KICK · heavy stagger' : `PUNCH ${combo}/3 · stagger`}`);
    if (current.slot === 'kick' && has('shock')) {
      fx(player, '#bca4ff', 'ring', 128, 0.3);
      for (const enemy of enemies) if (enemy.hp > 0 && !current.victims.has(enemy.id) && enemy.down <= 0 && enemy.grace <= 0 && dist(player, enemy) < 128) {
        current.victims.add(enemy.id); strikeEnemy(enemy, current);
      }
    }
  }
}
function damagePlayer(direction: Vec, heavy: boolean) {
  if (hurt > 0 || guard > 0 || phase !== 'playing') return;
  health -= heavy ? 2 : 1; health = Math.max(0, health); hurt = 0.95; playerStun = 0.25;
  player.x += direction.x * 30; player.y += direction.y * 30; clamp(player);
  attack = null; buffer = null; combo = 0; comboTimer = 0; shake = 0.18; hitstop = 0.055;
  fx(player, '#ff718a', 'impact', 35); say('HIT · recover, reposition, then counter');
  if (health === 0) { phase = 'lost'; clearInput(); showOverlay('Run ended', `${kills} opponents defeated. Watch the windup; kick to make space.`, 'Try again'); }
}
function spawn() {
  const points = [{ x: 160, y: 95 }, { x: 800, y: 95 }, { x: 800, y: 385 }, { x: 160, y: 385 }, { x: 480, y: 45 }, { x: 480, y: 435 }];
  const options = points.filter(p => dist(player, p) > 230), point = options[serial % options.length];
  const heavy = round > 1 && serial % 4 === 3, hp = heavy ? 5 : round > 2 ? 4 : 3;
  enemies.push({ ...point, id: serial++, heavy, hp, maxHp: hp, timer: 0.8, wind: 0, aim: { x: 0, y: 0 }, stun: 0, down: 0, grace: 0, hit: 0, vx: 0, vy: 0 });
  fx(point, heavy ? '#c8a2ff' : '#ff708f', 'ring', 36, 0.5);
}
function beginRound() {
  phase = 'playing'; clearInput(); enemies = []; effects = []; attack = null;
  pending = [4, 5, 6, 7][round - 1]; spawnTimer = 0.2;
  player = { x: W / 2, y: H / 2 }; facing = { x: -1, y: 0 };
  playerStun = guard = hitstop = combo = comboTimer = 0; hurt = 0.6;
  $('#overlay').hidden = true; $('#upgrades').hidden = true; canvas.focus({ preventScroll: true });
  say(`Round ${round} · close in. Punch to chain; Kick to create space.`, 2);
}
function reset(start = false) {
  phase = 'ready'; round = 1; kills = punches = kicks = hits = staggers = knockdowns = dashes = followups = serial = 0; chosen = [];
  health = MAX_HP; enemies = []; effects = []; attack = null; playerStun = guard = hurt = hitstop = combo = comboTimer = 0;
  player = { x: W / 2, y: H / 2 }; clearInput(); $('#upgrades').hidden = true;
  if (start) beginRound(); else showOverlay('GUNFU / BRAWLER', 'Get close. Plant your feet. Chain three punches or commit to a heavy kick. Fuse new abilities between rounds.', 'Start brawling');
  sync();
}
function showOverlay(title: string, text: string, button: string) { $('#overlay').hidden = false; $('#overlay-title').textContent = title; $('#overlay-copy').textContent = text; $('#start').textContent = button; }
function intermission() {
  clearInput(); attack = null; health = Math.min(MAX_HP, health + 2);
  if (round === 4) { phase = 'won'; showOverlay('STYLE COMPLETE', `${kills} opponents · ${hits} hits · ${knockdowns} knockdowns. Try a different fighting style.`, 'Brawl again'); say('Four rounds cleared. Fighting style forged.'); return; }
  phase = 'upgrade';
  const priority = ['echo', 'sweep', 'shock', 'guard', 'lunge', 'backstep', 'drive'];
  const offers = round === 1 ? catalog.slice(0, 3) : catalog.filter(m => !has(m.id)).sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id)).slice(0, 3);
  $('#upgrades').hidden = false; $('#upgrade-title').textContent = `Round ${round} clear · +2 health · choose a fusion`;
  document.querySelectorAll<HTMLButtonElement>('button.upgrade').forEach((button, i) => {
    const modifier = offers[i]; button.dataset.modifier = modifier.id; button.dataset.slot = modifier.slot; button.replaceChildren();
    const slot = document.createElement('small'); slot.textContent = `${modifier.slot.toUpperCase()} SLOT`;
    const title = document.createElement('strong'); title.textContent = `+ ${modifier.name}`;
    const preview = document.createElement('span'); preview.textContent = `${label(modifier.slot)} → ${label(modifier.slot, modifier)}`;
    const detail = document.createElement('span'); detail.className = 'detail'; detail.textContent = modifier.detail;
    button.append(slot, title, preview, detail);
    button.onclick = () => { if (phase !== 'upgrade' || paused()) return; chosen.push(modifier.id); round++; beginRound(); sync(); };
  });
  say('Fusions persist. Choose a move, then return to the brawl.');
}
function update(dt: number) {
  clock += dt; hurt = Math.max(0, hurt - dt); playerStun = Math.max(0, playerStun - dt); guard = Math.max(0, guard - dt); shake = Math.max(0, shake - dt);
  comboTimer = Math.max(0, comboTimer - dt); if (!comboTimer && !attack) combo = 0;
  effects.forEach(e => e.life -= dt); effects = effects.filter(e => e.life > 0);
  // Attack commitment plants the player; only authored step/backstep modifiers move them.
  if (!attack && playerStun <= 0) {
    const move = movement(); player.x += move.x * 205 * dt; player.y += move.y * 205 * dt; clamp(player);
    if (Math.hypot(move.x, move.y) > 0.1) facing = unit(move);
    if (buffer && buffer.until >= clock) execute(buffer.slot, false);
    else if (held.kick.size || keys.has('k') || keys.has('r')) execute('kick', false);
    else if (held.punch.size || keys.has('j') || keys.has(' ')) execute('punch', false);
    buffer = null;
  }
  if (attack) {
    const current = attack; current.elapsed += dt;
    if (current.elapsed >= current.windup && current.elapsed <= current.windup + current.active) resolveAttack(current);
    if (has('echo') && current.slot === 'punch' && !current.echoed && current.elapsed >= current.windup + current.active + 0.04) { current.echoed = true; resolveAttack(current, true); }
    if (has('backstep') && current.slot === 'punch' && current.landed && !current.stepped && (!has('echo') || current.echoed) && current.elapsed >= current.windup + current.active) { current.stepped = true; step({ x: -current.direction.x, y: -current.direction.y }, 40); }
    if (current.elapsed >= current.duration) { if (!current.landed) say('WHIFF · get closer', 0.55); attack = null; }
  }
  spawnTimer -= dt;
  if (pending && spawnTimer <= 0 && enemies.length < 4) { spawn(); pending--; spawnTimer = 1.25; }
  let attackers = enemies.filter(e => e.wind > 0 && e.stun <= 0).length;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    enemy.hit = Math.max(0, enemy.hit - dt); enemy.grace = Math.max(0, enemy.grace - dt);
    const wasDown = enemy.down > 0; enemy.down = Math.max(0, enemy.down - dt); enemy.stun = Math.max(0, enemy.stun - dt);
    enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; enemy.vx *= Math.exp(-6 * dt); enemy.vy *= Math.exp(-6 * dt); clamp(enemy);
    if (wasDown && !enemy.down) { enemy.grace = 0.35; enemy.timer = Math.max(enemy.timer, 0.5); }
    if (enemy.stun > 0 || enemy.down > 0) continue;
    enemy.timer -= dt;
    const delta = { x: player.x - enemy.x, y: player.y - enemy.y }, distance = Math.hypot(delta.x, delta.y), direction = unit(delta);
    if (enemy.wind > 0) {
      enemy.wind -= dt;
      if (enemy.wind <= 0) {
        const reach = enemy.heavy ? 128 : 96, dot = direction.x * enemy.aim.x + direction.y * enemy.aim.y;
        fx({ x: enemy.x + enemy.aim.x * reach * 0.6, y: enemy.y + enemy.aim.y * reach * 0.6 }, '#ff718a', 'impact', enemy.heavy ? 28 : 20);
        if (distance < reach && dot > Math.cos(ENEMY_ARC)) damagePlayer(enemy.aim, enemy.heavy);
        enemy.timer = enemy.heavy ? 1.4 : 1.0; attackers--;
      }
    } else if (distance < (enemy.heavy ? 105 : 78) && enemy.timer <= 0 && attackers < 2) {
      enemy.wind = enemy.heavy ? 0.72 : 0.48; enemy.aim = direction; attackers++;
    } else if (distance > 55) {
      const speed = enemy.heavy ? 66 : 88 + round * 3;
      enemy.x += direction.x * speed * dt; enemy.y += direction.y * speed * dt;
    }
    // Soft crowd separation keeps silhouettes and telegraphs readable.
    for (const other of enemies) if (other !== enemy && other.hp > 0 && other.down <= 0) {
      const separation = dist(enemy, other);
      if (separation > 0 && separation < 39) { const push = (39 - separation) * dt * 2; enemy.x += (enemy.x - other.x) / separation * push; enemy.y += (enemy.y - other.y) / separation * push; }
    }
    clamp(enemy);
  }
  enemies = enemies.filter(e => e.hp > 0);
  if (!pending && !enemies.length && phase === 'playing') intermission();
  messageTimer -= dt;
  if (messageTimer <= 0 && phase === 'playing') $('#status').textContent = attack ? 'COMMITTED · feet planted until recovery' : `${enemies.length + pending} remaining · Punch: 3-hit chain · Kick: reach + knockback`;
}
function sync() {
  $('#health').textContent = `${health}/${MAX_HP}`; $('#combo').textContent = `${combo}/3`; $('#wave').textContent = `${round}/4`;
  $('#style').textContent = `${label('punch')}  •  ${label('kick')}`;
  $('#punch-name').textContent = label('punch'); $('#kick-name').textContent = label('kick');
  document.querySelectorAll<HTMLElement>('.combat-control').forEach(el => el.style.visibility = phase === 'playing' ? 'visible' : 'hidden');
  const values = { phase, round, kills, punches, kicks, hits, staggers, knockdowns, dashes, followups, combo, attack: attack?.slot || 'idle', locked: Boolean(attack || playerStun > 0), stunned: enemies.filter(e => e.stun > 0).length, modifiers: chosen.join(','), playerX: player.x.toFixed(2), playerY: player.y.toFixed(2) };
  for (const [key, value] of Object.entries(values)) canvas.dataset[key] = String(value);
}
function circle(x: number, y: number, radius: number, color: string, fill = false) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.fillStyle = color; fill ? ctx.fill() : ctx.stroke(); }
function sector(origin: Vec, direction: Vec, range: number, spread: number, color: string) {
  const angle = Math.atan2(direction.y, direction.x); ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.arc(origin.x, origin.y, range, angle - spread, angle + spread); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function strikeIcon(slot: Slot, position: Vec, direction: Vec, scale = 1) {
  ctx.save(); ctx.translate(position.x, position.y); ctx.rotate(Math.atan2(direction.y, direction.x)); ctx.scale(scale, scale);
  ctx.fillStyle = slot === 'punch' ? '#ffe29a' : '#bca4ff'; ctx.strokeStyle = '#12222d'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (slot === 'punch') { ctx.moveTo(-16, -9); ctx.lineTo(-7, -9); ctx.lineTo(-7, -15); ctx.lineTo(12, -15); ctx.lineTo(19, -8); ctx.lineTo(19, 10); ctx.lineTo(9, 17); ctx.lineTo(-7, 14); ctx.lineTo(-10, 7); ctx.lineTo(-16, 7); }
  else { ctx.moveTo(-18, -7); ctx.lineTo(2, -7); ctx.lineTo(9, 3); ctx.lineTo(22, 4); ctx.lineTo(25, 13); ctx.lineTo(-2, 14); ctx.lineTo(-9, 4); ctx.lineTo(-18, 4); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  if (slot === 'punch') { ctx.strokeStyle = '#927b4e'; for (let x = -1; x < 13; x += 6) { ctx.beginPath(); ctx.moveTo(x, -13); ctx.lineTo(x, -5); ctx.stroke(); } }
  ctx.restore();
}
function draw() {
  const dpr = Math.min(devicePixelRatio || 1, 3), width = Math.max(1, Math.round(canvas.clientWidth * dpr)), height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.setTransform(width / W, 0, 0, height / H, 0, 0); ctx.fillStyle = '#09151e'; ctx.fillRect(0, 0, W, H); ctx.save();
  if (shake > 0) ctx.translate(Math.sin(clock * 110) * 2.5, Math.cos(clock * 100) * 2.5);
  ctx.lineWidth = 1; ctx.strokeStyle = '#16303b';
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#3a716f'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
  circle(W / 2, H / 2, 106, '#1d4249'); ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#28505a'; ctx.fillText('FORGE  /  BRAWL FLOOR', W / 2, H / 2 + 6);
  for (const enemy of enemies) {
    if (enemy.wind > 0) sector(enemy, enemy.aim, enemy.heavy ? 128 : 96, ENEMY_ARC, '#ff718a44');
    ctx.save(); ctx.translate(enemy.x, enemy.y); if (enemy.down > 0) ctx.scale(1.4, 0.45);
    ctx.fillStyle = enemy.hit > 0 ? '#fff8d5' : enemy.heavy ? '#c59aff' : '#ff718a';
    ctx.beginPath();
    if (enemy.heavy) { ctx.moveTo(0, -23); ctx.lineTo(23, 0); ctx.lineTo(0, 23); ctx.lineTo(-23, 0); }
    else { ctx.moveTo(0, -20); ctx.lineTo(19, 15); ctx.lineTo(-19, 15); }
    ctx.closePath(); ctx.fill(); circle(0, -2, 6, '#253243', true); ctx.restore();
    if (enemy.wind > 0) { ctx.lineWidth = 3; circle(enemy.x, enemy.y, 28, '#ffe2af'); }
    if (enemy.stun > 0) { ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#ffe29a'; ctx.fillText(enemy.down > 0 ? '✦ · ✦' : '· ✦ ·', enemy.x, enemy.y - 30); }
    ctx.fillStyle = '#ffdae4'; for (let i = 0; i < enemy.hp; i++) ctx.fillRect(enemy.x - enemy.maxHp * 4 + i * 8, enemy.y + 29, 5, 3);
  }
  if (attack) {
    const active = attack.elapsed >= attack.windup && attack.elapsed <= attack.windup + attack.active;
    sector(player, attack.direction, attack.range, attack.spread, active ? (attack.slot === 'kick' ? '#bca4ff66' : '#ffe29a66') : '#e5fff315');
    const extension = active ? attack.range * 0.75 : 30 + Math.sin(Math.min(1, attack.elapsed / attack.duration) * Math.PI) * 18;
    strikeIcon(attack.slot, { x: player.x + attack.direction.x * extension, y: player.y + attack.direction.y * extension }, attack.direction, active ? 1.35 : 0.9);
  }
  ctx.globalAlpha = hurt > 0 && Math.floor(clock * 16) % 2 ? 0.45 : 1;
  ctx.lineWidth = 3; circle(player.x, player.y, 17, '#75ffe0', true); circle(player.x, player.y, 22, '#c4fff0');
  circle(player.x + facing.x * 7, player.y + facing.y * 7 - 4, 6, '#173a40', true);
  const side = { x: -facing.y, y: facing.x };
  circle(player.x + side.x * 17 + facing.x * 10, player.y + side.y * 17 + facing.y * 10, 6, '#ffe29a', true);
  circle(player.x - side.x * 17 + facing.x * 10, player.y - side.y * 17 + facing.y * 10, 6, '#ffe29a', true); ctx.globalAlpha = 1;
  if (attack) { ctx.strokeStyle = '#ffe29a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(player.x - 16, player.y + 25); ctx.lineTo(player.x + 16, player.y + 25); ctx.stroke(); }
  if (guard > 0) { ctx.lineWidth = 4; circle(player.x, player.y, 30, '#fff1ae'); }
  for (const effect of effects) {
    ctx.globalAlpha = effect.life / effect.max; ctx.lineWidth = 3;
    if (effect.kind === 'ring') circle(effect.x, effect.y, effect.end.x * (1 - effect.life / effect.max) + 3, effect.color);
    else if (effect.kind === 'trail') { ctx.strokeStyle = effect.color; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo(effect.end.x, effect.end.y); ctx.stroke(); }
    else { ctx.fillStyle = effect.color; ctx.beginPath(); for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6, radius = effect.end.x * (i % 2 ? 0.32 : 1); const x = effect.x + Math.cos(angle) * radius, y = effect.y + Math.sin(angle) * radius; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill(); }
  }
  ctx.globalAlpha = 1; ctx.restore();
}
function frame(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (phase === 'playing' && !paused()) { if (hitstop > 0) hitstop = Math.max(0, hitstop - dt); else update(dt); }
  sync(); draw(); requestAnimationFrame(frame);
}
const pad = $('#move-pad');
function updatePad(event: PointerEvent) {
  const bounds = pad.getBoundingClientRect(), dx = event.clientX - bounds.left - bounds.width / 2, dy = event.clientY - bounds.top - bounds.height / 2;
  const radius = bounds.width * 0.32, length = Math.hypot(dx, dy), scale = Math.max(radius, length);
  stick = length < 5 ? { x: 0, y: 0 } : { x: dx / scale, y: dy / scale };
  $('#pad-knob').style.transform = `translate(${stick.x * radius}px,${stick.y * radius}px)`;
}
pad.addEventListener('pointerdown', e => { if (paused() || phase !== 'playing' || padPointer !== null) return; e.preventDefault(); padPointer = e.pointerId; pad.setPointerCapture(e.pointerId); updatePad(e); });
pad.addEventListener('pointermove', e => { if (e.pointerId === padPointer) updatePad(e); });
function releasePad(e: PointerEvent) { if (e.pointerId === padPointer) { padPointer = null; stick = { x: 0, y: 0 }; $('#pad-knob').style.transform = ''; } }
pad.addEventListener('pointerup', releasePad); pad.addEventListener('pointercancel', clearInput); pad.addEventListener('lostpointercapture', releasePad);
for (const slot of ['punch', 'kick'] as Slot[]) {
  const button = $('#' + slot);
  button.addEventListener('pointerdown', e => { if (paused() || phase !== 'playing') return; e.preventDefault(); button.setPointerCapture(e.pointerId); held[slot].add(e.pointerId); execute(slot); sync(); });
  button.addEventListener('pointerup', e => held[slot].delete(e.pointerId));
  button.addEventListener('pointercancel', clearInput); button.addEventListener('lostpointercapture', e => held[slot].delete(e.pointerId));
  button.addEventListener('click', e => { if (e.detail === 0) execute(slot); });
}
$('#start').addEventListener('click', () => { if (!paused()) reset(true); }); $('#restart').addEventListener('click', () => reset(true));
window.addEventListener('keydown', e => {
  if (paused() || phase !== 'playing' || (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter'))) return;
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'j', 'r', 'k'].includes(key)) {
    e.preventDefault(); keys.add(key); if (!e.repeat && (key === ' ' || key === 'j')) execute('punch'); if (!e.repeat && (key === 'r' || key === 'k')) execute('kick');
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { blurred = true; clearInput(); }); window.addEventListener('focus', () => { blurred = false; clearInput(); last = performance.now(); });
document.addEventListener('visibilitychange', clearInput); window.addEventListener('orientationchange', clearInput);
reset(); requestAnimationFrame(frame);
