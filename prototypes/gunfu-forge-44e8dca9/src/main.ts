import './style.css';
import { mountShell } from './shell';

type Vec = { x: number; y: number };
type Phase = 'ready' | 'playing' | 'upgrade' | 'won' | 'lost';
type Slot = 'shoot' | 'reload';
type Modifier = { id: string; slot: Slot; name: string; detail: string; order: number };
type Enemy = Vec & { id: number; ranged: boolean; hp: number; timer: number; wind: number; aim: Vec; hit: number };
type Bullet = Vec & { vx: number; vy: number; life: number; hostile: boolean; pierce: boolean; hits: Set<number> };
type Fx = Vec & { end: Vec; life: number; max: number; color: string; ring: boolean };
const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const canvas = $<HTMLCanvasElement>('#game'), ctx = canvas.getContext('2d')!;
const W = 960, H = 480;
const catalog: Modifier[] = [
  { id: 'backdash', slot: 'shoot', name: 'Backdash', detail: 'Retreat before firing; brief dodge.', order: 0 },
  { id: 'sidestep', slot: 'shoot', name: 'Sidestep', detail: 'Step left of aim before firing; brief dodge.', order: 0 },
  { id: 'dash', slot: 'reload', name: 'Dash', detail: 'Dash with movement, or retreat when still.', order: 0 },
  { id: 'fan', slot: 'shoot', name: 'Fan', detail: 'Three angled bullets for one ammo.', order: 2 },
  { id: 'pierce', slot: 'shoot', name: 'Pierce', detail: 'Bullets pass through targets; line them up.', order: 3 },
  { id: 'shock', slot: 'reload', name: 'Pulse', detail: 'On refill, damage and push nearby enemies.', order: 2 },
  { id: 'guard', slot: 'reload', name: 'Guard', detail: 'Protect the first 0.3s of reload windup.', order: 1 },
];
let phase: Phase = 'ready', round = 1, kills = 0, shots = 0, reloads = 0, dashes = 0;
let chosen: string[] = [], enemies: Enemy[] = [], bullets: Bullet[] = [], effects: Fx[] = [];
let player: Vec = { x: W / 2, y: H / 2 };
let health = 6, ammo = 6, cooldown = 0, loading = 0, hurt = 0, guard = 0, clock = 0, shake = 0;
let pending = 0, spawnTimer = 0, serial = 0, last = performance.now(), messageTimer = 0;
const keys = new Set<string>(), shootPointers = new Set<number>();
let padPointer: number | null = null, stick: Vec = { x: 0, y: 0 };
const unit = (v: Vec): Vec => { const n = Math.hypot(v.x, v.y); return n ? { x: v.x / n, y: v.y / n } : { x: 1, y: 0 }; };
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: Vec, margin = 18) => { v.x = Math.max(margin, Math.min(W - margin, v.x)); v.y = Math.max(margin, Math.min(H - margin, v.y)); };
const mods = (slot: Slot) => catalog.filter(m => chosen.includes(m.id) && m.slot === slot).sort((a, b) => a.order - b.order);
const has = (id: string) => chosen.includes(id);
const label = (slot: Slot, extra?: Modifier) => [...mods(slot), ...(extra ? [extra] : [])].sort((a, b) => a.order - b.order).map(m => m.name).concat(slot === 'shoot' ? 'Shoot' : 'Reload').join(' + ');
function clearInput() { keys.clear(); shootPointers.clear(); padPointer = null; stick = { x: 0, y: 0 }; $('#pad-knob').style.transform = ''; }
const shellPaused = mountShell(2, clearInput);
let blurred = false;
const paused = () => shellPaused() || document.hidden || blurred;
function say(text: string) { $('#status').textContent = text; messageTimer = 2.3; }
function aim(): Vec {
  const enemy = [...enemies].filter(e => e.hp > 0).sort((a, b) => dist(player, a) - dist(player, b))[0];
  return enemy ? unit({ x: enemy.x - player.x, y: enemy.y - player.y }) : { x: 1, y: 0 };
}
function movement(): Vec {
  const v = { x: stick.x + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), y: stick.y + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) };
  const n = Math.hypot(v.x, v.y); return n > 1 ? unit(v) : v;
}
function fx(a: Vec, b: Vec, color: string, life = 0.2, ring = false) { effects.push({ ...a, end: { ...b }, color, life, max: life, ring }); }
function dash(v: Vec, distance: number) {
  const old = { ...player }; player.x += v.x * distance; player.y += v.y * distance; clamp(player);
  fx(old, player, '#70ffdc', 0.3); guard = Math.max(guard, 0.12); dashes++;
}
// Ordered pipeline: movement -> protection -> payload configuration -> action.
function execute(slot: Slot) {
  if (phase !== 'playing' || paused() || loading > 0) return;
  if (slot === 'shoot' && (cooldown > 0 || ammo === 0)) { if (ammo === 0) say('Magazine empty — Reload / R / K'); return; }
  if (slot === 'reload' && ammo === 6) return;
  const target = [...enemies].filter(e => e.hp > 0).sort((a, b) => dist(player, a) - dist(player, b))[0];
  let direction = aim();
  let fan = false, piercing = false;
  for (const modifier of mods(slot)) {
    switch (modifier.id) {
      case 'backdash': dash({ x: -direction.x, y: -direction.y }, 66); break;
      case 'sidestep': dash({ x: direction.y, y: -direction.x }, 60); break;
      case 'dash': { const move = movement(); dash(Math.hypot(move.x, move.y) > 0.1 ? unit(move) : { x: -direction.x, y: -direction.y }, 108); break; }
      case 'guard': guard = Math.max(guard, 0.3); break;
      case 'fan': fan = true; break;
      case 'pierce': piercing = true; break;
      // Pulse is a completion modifier, resolved when the vulnerable windup ends.
    }
  }
  if (slot === 'reload') { loading = 0.9; reloads++; say(`${label('reload')} · winding up`); return; }
  // Keep the intended target, but aim from the post-dash position.
  if (target) direction = unit({ x: target.x - player.x, y: target.y - player.y });
  ammo--; shots++; cooldown = 0.32;
  const angle = Math.atan2(direction.y, direction.x);
  for (const offset of fan ? [-0.22, 0, 0.22] : [0]) {
    bullets.push({ x: player.x + direction.x * 18, y: player.y + direction.y * 18, vx: Math.cos(angle + offset) * 700, vy: Math.sin(angle + offset) * 700, life: 1.5, hostile: false, pierce: piercing, hits: new Set() });
  }
  fx(player, { x: player.x + direction.x * 32, y: player.y + direction.y * 32 }, '#fff3ac', 0.09);
  if (chosen.length) say(label('shoot'));
}
function damageEnemy(enemy: Enemy, damage = 1) {
  enemy.hp -= damage; enemy.hit = 0.12;
  fx(enemy, { x: 22, y: 0 }, '#ffb778', 0.22, true);
  if (enemy.hp <= 0) { kills++; fx(enemy, { x: 42, y: 0 }, '#ff708f', 0.38, true); }
}
function damagePlayer() {
  if (hurt > 0 || guard > 0 || phase !== 'playing') return;
  health--; hurt = 1; shake = 0.17;
  say('Hit! Keep moving through the warning lines.');
  if (health <= 0) { phase = 'lost'; clearInput(); showOverlay('Run ended', `${kills} opponents defeated. Rebuild your style.`, 'Try again'); }
}
function spawn() {
  const points = [{ x: 50, y: 65 }, { x: 910, y: 65 }, { x: 910, y: 415 }, { x: 50, y: 415 }, { x: 480, y: 45 }, { x: 480, y: 435 }];
  const options = points.filter(p => dist(player, p) > 285);
  const point = options[serial % options.length];
  const ranged = round > 1 && serial % 4 === 3;
  enemies.push({ ...point, id: serial++, ranged, hp: ranged ? 2 : round > 2 ? 3 : 2, timer: 1.1, wind: 0, aim: { x: 0, y: 0 }, hit: 0 });
  fx(point, { x: 38, y: 0 }, ranged ? '#c8a2ff' : '#ff708f', 0.6, true);
}
function beginRound() {
  phase = 'playing'; clearInput(); enemies = []; bullets = []; effects = [];
  pending = [6, 8, 10, 12][round - 1]; spawnTimer = 0.2;
  player = { x: W / 2, y: H / 2 }; ammo = 6; loading = 0; cooldown = 0; hurt = 0.6; guard = 0;
  $('#overlay').hidden = true; $('#upgrades').hidden = true;
  canvas.focus({ preventScroll: true });
  say(`Round ${round} · ${pending} opponents. Clear the dojo.`);
}
function reset(start = false) {
  phase = 'ready'; round = 1; kills = shots = reloads = dashes = serial = 0; chosen = [];
  health = ammo = 6; enemies = []; bullets = []; effects = []; loading = cooldown = guard = hurt = 0;
  player = { x: W / 2, y: H / 2 }; clearInput(); $('#upgrades').hidden = true;
  if (start) beginRound(); else showOverlay('GUNFU / FORGE', 'Clear four rounds. Fuse movement into attacks. Build your fighting style.', 'Start training');
  sync();
}
function showOverlay(title: string, text: string, button: string) {
  $('#overlay').hidden = false; $('#overlay-title').textContent = title; $('#overlay-copy').textContent = text; $('#start').textContent = button;
}
function intermission() {
  clearInput(); bullets = []; health = Math.min(6, health + 2);
  if (round === 4) { phase = 'won'; showOverlay('STYLE COMPLETE', `${kills} opponents defeated · ${dashes} fused dashes. Try a different style.`, 'Play again'); say('All four rounds cleared. Your style is complete.'); return; }
  phase = 'upgrade';
  const offers = round === 1 ? catalog.slice(0, 3) : catalog.filter(m => !has(m.id) && !(['backdash', 'sidestep'].includes(m.id) && (has('backdash') || has('sidestep')))).sort((a, b) => {
    const priorities = ['fan', 'pierce', 'shock', 'guard', 'dash', 'backdash', 'sidestep'];
    return priorities.indexOf(a.id) - priorities.indexOf(b.id);
  }).slice(0, 3);
  $('#upgrades').hidden = false;
  $('#upgrade-title').textContent = `Round ${round} clear · +2 health · choose a fusion`;
  document.querySelectorAll<HTMLButtonElement>('button.upgrade').forEach((button, i) => {
    const modifier = offers[i]; button.dataset.modifier = modifier.id; button.dataset.slot = modifier.slot;
    button.replaceChildren();
    const slot = document.createElement('small'); slot.textContent = `${modifier.slot.toUpperCase()} SLOT`;
    const title = document.createElement('strong'); title.textContent = `+ ${modifier.name}`;
    const preview = document.createElement('span'); preview.textContent = `${label(modifier.slot)} → ${label(modifier.slot, modifier)}`;
    const detail = document.createElement('span'); detail.className = 'detail'; detail.textContent = modifier.detail;
    button.append(slot, title, preview, detail);
    button.onclick = () => { if (phase !== 'upgrade' || paused()) return; chosen.push(modifier.id); round++; beginRound(); sync(); };
  });
  say('Effects persist. Choose one upgrade to begin the next round.');
}
function update(dt: number) {
  clock += dt; cooldown = Math.max(0, cooldown - dt); hurt = Math.max(0, hurt - dt); guard = Math.max(0, guard - dt); shake = Math.max(0, shake - dt);
  effects.forEach(e => e.life -= dt); effects = effects.filter(e => e.life > 0);
  const move = movement(); player.x += move.x * 205 * dt; player.y += move.y * 205 * dt; clamp(player);
  if (loading > 0) {
    loading -= dt;
    if (loading <= 0) {
      loading = 0; ammo = 6; say('Magazine ready');
      if (has('shock')) {
        fx(player, { x: 145, y: 0 }, '#c8a2ff', 0.4, true);
        for (const enemy of enemies) if (enemy.hp > 0 && dist(player, enemy) < 145) { damageEnemy(enemy); const v = unit({ x: enemy.x - player.x, y: enemy.y - player.y }); enemy.x += v.x * 80; enemy.y += v.y * 80; clamp(enemy); }
      }
    }
  }
  if (keys.has('r') || keys.has('k')) execute('reload');
  if (shootPointers.size || keys.has(' ') || keys.has('j')) execute('shoot');
  spawnTimer -= dt;
  if (pending && spawnTimer <= 0 && enemies.length < 5) { spawn(); pending--; spawnTimer = round === 1 ? 2 : 1.6; }
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    enemy.hit = Math.max(0, enemy.hit - dt); enemy.timer -= dt;
    const direction = unit({ x: player.x - enemy.x, y: player.y - enemy.y });
    if (enemy.wind > 0) {
      enemy.wind -= dt;
      if (enemy.wind <= 0) {
        if (enemy.ranged) bullets.push({ x: enemy.x, y: enemy.y, vx: enemy.aim.x * 235, vy: enemy.aim.y * 235, life: 4, hostile: true, pierce: false, hits: new Set() });
        else {
          const old = { x: enemy.x, y: enemy.y }; enemy.x += enemy.aim.x * 110; enemy.y += enemy.aim.y * 110; clamp(enemy);
          fx(old, enemy, '#ff708f', 0.2);
          if (segmentDistance(player, old, enemy) < 29) damagePlayer();
        }
        enemy.timer = enemy.ranged ? 1.8 : 1.25;
      }
    } else if (enemy.timer <= 0 && (enemy.ranged || dist(player, enemy) < 145)) {
      enemy.wind = enemy.ranged ? 0.7 : 0.55; enemy.aim = direction;
    } else {
      const speed = enemy.ranged ? (dist(player, enemy) < 230 ? -36 : dist(player, enemy) > 330 ? 35 : 0) : 52 + round * 6;
      enemy.x += direction.x * speed * dt; enemy.y += direction.y * speed * dt; clamp(enemy);
    }
  }
  for (const bullet of bullets) {
    const old = { x: bullet.x, y: bullet.y }; bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.hostile) { if (segmentDistance(player, old, bullet) < 17) { damagePlayer(); bullet.life = 0; } }
    else for (const enemy of enemies) {
      if (enemy.hp <= 0 || bullet.hits.has(enemy.id) || bullet.life <= 0) continue;
      if (segmentDistance(enemy, old, bullet) < 21) { damageEnemy(enemy); bullet.hits.add(enemy.id); if (!bullet.pierce) bullet.life = 0; }
    }
  }
  bullets = bullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);
  enemies = enemies.filter(e => e.hp > 0);
  if (!pending && !enemies.length && phase === 'playing') intermission();
  messageTimer -= dt;
  if (messageTimer <= 0 && phase === 'playing') $('#status').textContent = loading > 0 ? 'Reloading… keep moving' : `${enemies.length + pending} remaining · WASD / arrows move · Space / J shoot · R / K reload`;
}
function segmentDistance(p: Vec, a: Vec, b: Vec) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function sync() {
  $('#health').textContent = `${health}/6`; $('#ammo').textContent = loading > 0 ? '… /6' : `${ammo}/6`; $('#wave').textContent = `${round}/4`;
  $('#style').textContent = `${label('shoot')}  •  ${label('reload')}`;
  $('#shoot-name').textContent = label('shoot'); $('#reload-name').textContent = loading > 0 ? 'Refilling…' : label('reload');
  document.querySelectorAll<HTMLElement>('.combat-control').forEach(el => el.style.visibility = phase === 'playing' ? 'visible' : 'hidden');
  const values = { phase, round, kills, shots, reloads, dashes, modifiers: chosen.join(','), playerX: player.x.toFixed(2), playerY: player.y.toFixed(2) };
  for (const [key, value] of Object.entries(values)) canvas.dataset[key] = String(value);
}
function circle(x: number, y: number, r: number, color: string, fill = false) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.fillStyle = color; fill ? ctx.fill() : ctx.stroke();
}
function draw() {
  const dpr = Math.min(devicePixelRatio || 1, 3), width = Math.max(1, Math.round(canvas.clientWidth * dpr)), height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
  ctx.fillStyle = '#09151e'; ctx.fillRect(0, 0, W, H); ctx.save();
  if (shake > 0) ctx.translate(Math.sin(clock * 110) * 3, Math.cos(clock * 100) * 3);
  ctx.lineWidth = 1; ctx.strokeStyle = '#16303b';
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = '#3a716f'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
  circle(W / 2, H / 2, 100, '#1d4249'); circle(W / 2, H / 2, 106, '#1d4249');
  ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#28505a'; ctx.fillText('FORGE  /  TRAINING FLOOR', W / 2, H / 2 + 6);
  for (const effect of effects) {
    ctx.globalAlpha = effect.life / effect.max; ctx.lineWidth = effect.ring ? 3 : 8;
    if (effect.ring) circle(effect.x, effect.y, effect.end.x * (1 - effect.life / effect.max) + 3, effect.color);
    else { ctx.strokeStyle = effect.color; ctx.beginPath(); ctx.moveTo(effect.x, effect.y); ctx.lineTo(effect.end.x, effect.end.y); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  for (const enemy of enemies) {
    const color = enemy.hit > 0 ? '#ffffff' : enemy.ranged ? '#c59aff' : '#ff718a';
    if (enemy.wind > 0) {
      ctx.lineWidth = enemy.ranged ? 3 : 18; ctx.strokeStyle = enemy.ranged ? '#c59aff88' : '#ff718a55';
      ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(enemy.x + enemy.aim.x * (enemy.ranged ? 700 : 110), enemy.y + enemy.aim.y * (enemy.ranged ? 700 : 110)); ctx.stroke();
      ctx.lineWidth = 3; circle(enemy.x, enemy.y, 27, '#ffe2af');
    }
    ctx.fillStyle = color; ctx.beginPath();
    if (enemy.ranged) { ctx.moveTo(enemy.x, enemy.y - 19); ctx.lineTo(enemy.x + 19, enemy.y); ctx.lineTo(enemy.x, enemy.y + 19); ctx.lineTo(enemy.x - 19, enemy.y); }
    else { ctx.moveTo(enemy.x, enemy.y - 19); ctx.lineTo(enemy.x + 18, enemy.y + 15); ctx.lineTo(enemy.x - 18, enemy.y + 15); }
    ctx.closePath(); ctx.fill(); circle(enemy.x, enemy.y, 5, '#18212c', true);
    ctx.fillStyle = '#ffe6ee'; for (let i = 0; i < enemy.hp; i++) ctx.fillRect(enemy.x - 10 + i * 8, enemy.y + 25, 5, 3);
  }
  for (const bullet of bullets) {
    ctx.strokeStyle = bullet.hostile ? '#e3acff' : '#ffe8a4'; ctx.lineWidth = bullet.hostile ? 7 : 4;
    ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(bullet.x - bullet.vx * 0.025, bullet.y - bullet.vy * 0.025); ctx.stroke();
  }
  const direction = aim(); ctx.globalAlpha = hurt > 0 && Math.floor(clock * 16) % 2 ? 0.45 : 1;
  ctx.lineWidth = 3; circle(player.x, player.y, 15, '#75ffe0', true); circle(player.x, player.y, 20, '#c4fff0');
  const recoil = cooldown > 0.24 ? 6 : 0;
  ctx.strokeStyle = '#fff6c7'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + direction.x * (27 - recoil), player.y + direction.y * (27 - recoil)); ctx.stroke();
  ctx.globalAlpha = 1;
  if (guard > 0) { ctx.lineWidth = 5; circle(player.x, player.y, 29, '#fff1ae'); }
  if (loading > 0) { ctx.strokeStyle = '#c59aff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(player.x, player.y, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - loading / 0.9)); ctx.stroke(); }
  ctx.restore();
}
function frame(now: number) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (phase === 'playing' && !paused()) update(dt);
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
const shoot = $('#shoot');
shoot.addEventListener('pointerdown', e => { if (paused() || phase !== 'playing') return; e.preventDefault(); shoot.setPointerCapture(e.pointerId); shootPointers.add(e.pointerId); execute('shoot'); sync(); });
shoot.addEventListener('pointerup', e => shootPointers.delete(e.pointerId));
shoot.addEventListener('pointercancel', clearInput);
shoot.addEventListener('lostpointercapture', e => shootPointers.delete(e.pointerId));
shoot.addEventListener('click', e => { if (e.detail === 0) execute('shoot'); });
$('#reload').addEventListener('click', () => execute('reload'));
$('#reload').addEventListener('pointercancel', clearInput);
$('#start').addEventListener('click', () => { if (!paused()) reset(true); });
$('#restart').addEventListener('click', () => reset(true));
window.addEventListener('keydown', e => {
  if (paused() || phase !== 'playing' || (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter'))) return;
  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'j', 'r', 'k'].includes(key)) {
    e.preventDefault(); keys.add(key); if (!e.repeat && (key === ' ' || key === 'j')) execute('shoot'); if (!e.repeat && (key === 'r' || key === 'k')) execute('reload');
  }
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { blurred = true; clearInput(); });
window.addEventListener('focus', () => { blurred = false; clearInput(); last = performance.now(); });
document.addEventListener('visibilitychange', clearInput);
window.addEventListener('orientationchange', clearInput);
reset(); requestAnimationFrame(frame);
