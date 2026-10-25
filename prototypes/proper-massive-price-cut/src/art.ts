import { W, H, REACH, COOLDOWN, pathLength, pointOn, type Point, type World, type Fan, type Cat, type Rope } from './world';
type Ctx = CanvasRenderingContext2D;
const INK = '#182b39', CREAM = '#fff4d9', MINT = '#c8ff74', RED = '#f55770';
function line(c: Ctx, a: Point, b: Point, color: string, width = 2) { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
function oval(c: Ctx, x: number, y: number, rx: number, ry: number, color: string, border = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
  if (border) { c.strokeStyle = INK; c.lineWidth = border; c.stroke(); }
}
function box(c: Ctx, x: number, y: number, w: number, h: number, r: number, color: string, border = 0) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = color; c.fill();
  if (border) { c.lineWidth = border; c.strokeStyle = INK; c.stroke(); }
}
function text(c: Ctx, s: string, x: number, y: number, size: number, color = CREAM, weight = 800) {
  c.font = `${weight} ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.fillStyle = color; c.fillText(s, x, y);
}
function face(c: Ctx, skin: string, mood: 'calm' | 'joy' | 'shock' | 'laugh' | 'angry', look = 0) {
  oval(c, 0, 0, 12, 14, skin, 1.8); oval(c, -12, 1, 2.5, 4, skin); oval(c, 12, 1, 2.5, 4, skin);
  const dark = '#332b36';
  if (mood === 'joy' || mood === 'laugh') {
    for (const x of [-4.5, 4.5]) { c.beginPath(); c.arc(x, -1, 2.5, Math.PI, 0); c.strokeStyle = dark; c.lineWidth = 1.8; c.stroke(); }
  } else {
    oval(c, -4.5, -1, mood === 'shock' ? 3.8 : 1.8, mood === 'shock' ? 4.3 : 2.2, mood === 'shock' ? '#fff' : dark);
    oval(c, 4.5, -1, mood === 'shock' ? 3.8 : 1.8, mood === 'shock' ? 4.3 : 2.2, mood === 'shock' ? '#fff' : dark);
    if (mood === 'shock') { oval(c, -4, -1, 1.3, 2, dark); oval(c, 5, -1, 1.3, 2, dark); }
  }
  if (mood === 'angry') {
    line(c, { x: -9, y: -8 }, { x: -2, y: -4 }, dark, 2.7);
    line(c, { x: 2, y: -4 }, { x: 9, y: -8 }, dark, 2.7);
    c.beginPath(); c.arc(0, 12, 4.5, Math.PI, Math.PI * 2); c.strokeStyle = dark; c.lineWidth = 2; c.stroke();
    oval(c, -8, 5, 3.5, 2.3, '#f28179'); oval(c, 8, 5, 3.5, 2.3, '#f28179');
  } else if (mood === 'shock') oval(c, 0, 8, 3.4, 4.6, dark);
  else if (mood === 'laugh') { oval(c, 0, 8, 6, 5.5, dark); box(c, -4, 4, 8, 2.8, 1, '#fff'); }
  else { c.beginPath(); c.arc(0, 4, mood === 'joy' ? 5 : 3, 0, Math.PI); c.strokeStyle = dark; c.lineWidth = 1.6; c.stroke(); }
  if (look % 3 === 0) { oval(c, -8, 5, 2.4, 1.2, '#df8a75'); oval(c, 8, 5, 2.4, 1.2, '#df8a75'); }
}
const skins = ['#efc2a2', '#b77b54', '#f0d1b7', '#81543e', '#d8a37b'];
const shirts = ['#f8b653', '#67cfc4', '#b497e9', '#f58a9c', '#88b5ef', '#c8e079'];
export function drawFan(c: Ctx, f: Fan, now: number, scale = 1) {
  c.save(); c.translate(f.x, f.y); c.scale(scale, scale);
  const fallen = f.state === 'falling', happy = f.state === 'through';
  if (fallen) { c.rotate(f.age * 12 * (f.turn < 0 ? -1 : 1)); c.scale(1 + Math.sin(Math.min(1, f.age * 5) * Math.PI) * .22, 1); }
  const bob = Math.sin(now * 10 + f.look) * 2, skin = skins[f.look % skins.length], shirt = shirts[f.look % shirts.length];
  if (!fallen) oval(c, 0, 20, 12, 3, '#11262c38');
  const kick = Math.sin(now * 12 + f.look) * (fallen ? 14 : 4);
  line(c, { x: -4, y: 9 }, { x: -5 - kick / 2, y: 21 }, INK, 5);
  line(c, { x: 4, y: 9 }, { x: 5 + kick / 2, y: 21 }, INK, 5);
  box(c, -10, -7 + bob, 20, 22, 6, shirt, 1.6);
  const lift = fallen || happy ? -23 : 8;
  line(c, { x: -9, y: -3 + bob }, { x: -18, y: lift + Math.sin(now * 15) * 4 }, skin, 5);
  line(c, { x: 9, y: -3 + bob }, { x: 18, y: lift - Math.sin(now * 15) * 4 }, skin, 5);
  c.translate(0, -17 + bob); face(c, skin, fallen ? 'shock' : happy ? 'joy' : 'calm', f.look);
  const hair = f.look % 2 ? '#573e31' : '#2b2c38';
  c.beginPath(); c.arc(0, -2, 12.5, Math.PI, Math.PI * 2); c.lineTo(11, -5); c.quadraticCurveTo(-1, -2, -11, -5); c.fillStyle = hair; c.fill();
  if (f.look % 4 === 0) { box(c, -13, -14, 26, 7, 3, shirt, 1.5); line(c, { x: -15, y: -8 }, { x: 16, y: -8 }, INK, 2); }
  c.restore();
}
function drawCat(c: Ctx, cat: Cat, now: number) {
  c.save(); c.translate(cat.x, cat.y);
  const angry = cat.angry > 0, laughing = cat.laugh > 0 && !angry;
  c.rotate(angry ? Math.sin(now * 34) * .08 : laughing ? Math.sin(now * 23) * .13 : cat.side * -.05);
  oval(c, 0, 39, 25, 7, '#10222b50');
  box(c, -22, 0, 44, 36, 10, cat.look % 2 ? '#66517c' : '#2d5263', 2);
  oval(c, 0, 17, 24, 24, cat.look % 2 ? '#66517c' : '#2d5263', 2);
  c.fillStyle = CREAM; c.beginPath(); c.moveTo(-8, 0); c.lineTo(0, 28); c.lineTo(9, 0); c.fill();
  c.fillStyle = '#f9b94e'; c.beginPath(); c.moveTo(0, 2); c.lineTo(-4, 11); c.lineTo(1, 23); c.lineTo(5, 10); c.fill();
  text(c, '£', 13, 30, 12, '#fff4d9');
  c.save(); c.translate(0, -11); c.scale(1.25, 1.1); face(c, skins[(cat.look + 1) % skins.length], angry ? 'angry' : laughing ? 'laugh' : 'calm');
  c.strokeStyle = INK; c.lineWidth = 1.2; c.strokeRect(-9, -4, 7, 5); c.strokeRect(2, -4, 7, 5); line(c, { x: -2, y: -2 }, { x: 2, y: -2 }, INK, 1);
  if (cat.look % 2) { oval(c, -3, 5, 4, 1.8, '#54383b'); oval(c, 3, 5, 4, 1.8, '#54383b'); }
  c.restore();
  oval(c, cat.side * (angry ? 25 : cat.working > 0 ? 26 + Math.sin(now * 18) * 4 : 21), angry ? -18 + Math.sin(now * 28) * 3 : 2, 6, 7, '#dfae90', 1.5);
  if (angry) {
    text(c, 'GRR!', cat.side * 8, -47, 14, '#ff9f96');
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 17, -29); c.quadraticCurveTo(side * 27, -37, side * 20, -44); c.strokeStyle = '#fbd9cb'; c.lineWidth = 2; c.stroke(); }
  } else if (laughing) { text(c, 'HA!', cat.side * 10, -46 - Math.sin(now * 14) * 4, 16, '#ffe49a'); }
  else if (cat.working > 0) { text(c, 'VIP+', 0, -42, 11, '#ffb7ba'); }
  c.restore();
}
export function drawSam(c: Ctx, x: number, y: number, happy: boolean, time: number, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const bob = happy ? Math.sin(time * 10) * 2 : 0;
  c.translate(0, bob);
  box(c, -18, -1, 36, 40, 8, '#f8f2dc', 2);
  for (const n of [-12, 0, 12]) box(c, n - 3, 0, 6, 34, 1, INK);
  line(c, { x: -10, y: 34 }, { x: -12, y: 55 }, INK, 9); line(c, { x: 10, y: 34 }, { x: 12, y: 55 }, INK, 9);
  line(c, { x: -17, y: 4 }, { x: -28, y: happy ? -24 : 20 }, '#edbd9d', 7);
  line(c, { x: 17, y: 4 }, { x: 28, y: happy ? -24 : 20 }, '#edbd9d', 7);
  c.save(); c.translate(0, -18); c.scale(1.22, 1.22); face(c, '#edbd9d', happy ? 'joy' : 'shock');
  c.fillStyle = '#624631'; c.beginPath(); c.moveTo(-13, -3); c.lineTo(-15, -15); c.lineTo(-8, -21); c.lineTo(-5, -17); c.lineTo(5, -22); c.lineTo(12, -17); c.lineTo(15, -7); c.lineTo(10, -10); c.lineTo(4, -8); c.lineTo(-8, -10); c.fill(); c.restore();
  c.save(); c.translate(5, 22); c.rotate(-.5);
  oval(c, 0, 0, 13, 17, '#d9913d', 2); oval(c, 0, -6, 9, 11, '#d9913d', 2); box(c, -3, -38, 6, 32, 2, '#65443a', 1.5);
  oval(c, 0, -5, 3, 4, INK); line(c, { x: 0, y: -38 }, { x: 0, y: 8 }, CREAM, .8); c.restore(); c.restore();
}
function drawRope(c: Ctx, r: Rope, now: number) {
  c.save(); c.lineCap = 'round';
  const p = Math.min(1, r.age / r.draw);
  if (r.cut) {
    const t = r.snapped / .48;
    c.globalAlpha = Math.max(0, 1 - t);
    for (const [anchor, sign] of [[r.a, 1], [r.b, -1]] as [Point, number][]) {
      const end = { x: r.cut.x + (anchor.x - r.cut.x) * t * .65, y: r.cut.y + (anchor.y - r.cut.y) * t * .65 };
      c.beginPath(); c.moveTo(anchor.x, anchor.y); c.quadraticCurveTo((anchor.x + end.x) / 2, (anchor.y + end.y) / 2 + Math.sin(t * 14) * 27 * sign * (1 - t), end.x, end.y);
      c.strokeStyle = RED; c.lineWidth = 5; c.stroke();
    }
  } else {
    // Drawn geometry is the same straight segment used for swipe and fan collisions.
    const end = { x: r.a.x + (r.b.x - r.a.x) * p, y: r.a.y + (r.b.y - r.a.y) * p };
    if (p < 1) { c.setLineDash([4, 7]); line(c, r.a, r.b, '#ffe8ba50', 2); c.setLineDash([]); }
    line(c, { x: r.a.x, y: r.a.y + 4 }, { x: end.x, y: end.y + 4 }, '#14273370', 6);
    line(c, r.a, end, p < 1 ? '#ffb4a6' : RED, p < 1 ? 3 : 5);
    c.setLineDash([2, 10]); c.lineDashOffset = -now * 8; line(c, r.a, end, '#ffdeb1', 1.5); c.setLineDash([]);
    oval(c, r.a.x, r.a.y, 4, 4, '#efd18b', 1); oval(c, end.x, end.y, 4, 4, '#efd18b', 1);
    if (p < 1) text(c, 'TYING…', (r.a.x + r.b.x) / 2, (r.a.y + r.b.y) / 2 - 9, 10, '#ffe8ba');
  }
  c.restore();
}
export function scissors(c: Ctx, x: number, y: number, angle: number, open: number, scale = 1) {
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(scale, scale);
  for (const sign of [-1, 1]) {
    c.save(); c.rotate(sign * (.07 + open * .38));
    c.beginPath(); c.moveTo(-4, -3); c.lineTo(26, -.5); c.lineTo(0, 4); c.lineTo(-5, 3); c.closePath(); c.fillStyle = sign > 0 ? '#ecf5f3' : '#9db6bd'; c.strokeStyle = INK; c.lineWidth = 1.5; c.fill(); c.stroke();
    c.beginPath(); c.ellipse(-14, sign * 3, 10, 6.5, sign * .2, 0, Math.PI * 2); c.strokeStyle = INK; c.lineWidth = 7; c.stroke(); c.strokeStyle = '#55e0d2'; c.lineWidth = 4; c.stroke();
    c.restore();
  }
  oval(c, 0, 0, 3, 3, '#f5ce7c', 1.3); c.restore();
}
export function render(c: Ctx, w: World, now: number, path: Point[] | null) {
  c.clearRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#244d53'); g.addColorStop(1, '#13363f'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#24484f';
  for (let y = 120; y < H; y += 52) for (let x = 60; x < 380; x += 64) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y + 12); c.lineTo(x + 60, y); c.lineTo(x + 30, y - 12); c.fill(); }
  // Stage, admission line and portrait headliner form the goal at the top.
  box(c, 54, 0, 312, 90, 14, '#102d35', 2); box(c, 66, 9, 288, 26, 7, MINT);
  text(c, 'ALL STANDING. ALL TOGETHER.', 210, 27, 12, INK);
  for (let i = 0; i < 12; i++) oval(c, 76 + i * 24.4, 44, 2, 2, '#ffe49a');
  drawSam(c, 210, 64, w.passed > 0 && w.comboAge > 0, now, .48);
  text(c, 'THE WAY IN', 116, 73, 11, '#d5eccb'); text(c, '£85*', 307, 75, 18, CREAM);
  c.setLineDash([5, 6]); line(c, { x: 59, y: 98 }, { x: 361, y: 98 }, '#c8ff7466', 2); c.setLineDash([]);
  text(c, '↑', 88, 121, 18, '#c8ff74'); text(c, '↑', 332, 121, 18, '#c8ff74');
  // Side balconies keep executives away from the usable crowd lanes.
  for (const cat of w.cats) box(c, cat.side > 0 ? 0 : 373, cat.y - 38, 47, 88, 9, '#102b3599');
  const walking = w.fans.filter(f => f.state !== 'falling').sort((a, b) => a.y - b.y);
  for (const f of walking) drawFan(c, f, now);
  for (const r of w.ropes) drawRope(c, r, now);
  for (const cat of w.cats) drawCat(c, cat, now);
  for (const f of w.fans) if (f.state === 'falling') drawFan(c, f, now);
  if (w.phase === 'intro') {
    for (let i = 0; i < 6; i++) drawFan(c, { id: i, x: 94 + i % 4 * 78, y: 540 + Math.floor(i / 4) * 49, speed: 0, look: i * 7, state: 'walking', age: 0, turn: 1 }, now);
  }
  if (path?.length) {
    const used = pathLength(path); c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); path.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.strokeStyle = '#c8ff74aa'; c.lineWidth = 9; c.stroke();
    c.strokeStyle = '#efffe8'; c.lineWidth = 2; c.stroke(); oval(c, path[0].x, path[0].y, 5, 5, MINT);
    const p = path[path.length - 1]; text(c, `${Math.max(0, Math.round((REACH - used) / REACH * 100))}% REACH`, Math.max(60, Math.min(360, p.x)), Math.max(20, p.y - 19), 11, MINT); c.restore();
  }
  for (const s of w.slashes) {
    const t = Math.min(1, Math.max(0, (s.age - .035) / .12)), p = pointOn(s.path, s.length * t);
    const prev = pointOn(s.path, Math.max(0, s.length * t - 4)), next = pointOn(s.path, Math.min(s.length, s.length * t + 4));
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, s.age / .035, (.43 - s.age) / .16));
    c.beginPath(); s.path.forEach((v, i) => i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)); c.strokeStyle = '#9dffb17a'; c.lineWidth = 4; c.stroke();
    const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
    const nearest = s.hits.length ? Math.min(...s.hits.map(h => Math.abs(s.age - (.035 + h.distance / s.length * .12)))) : 1;
    const open = Math.min(1, nearest / .025);
    scissors(c, p.x - Math.cos(angle) * 28, p.y - Math.sin(angle) * 28, angle, open, 1.2); c.restore();
  }
  const bubbles: { x: number; y: number; w: number; h: number }[] = [];
  for (const f of w.fx) {
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, ((f.life ?? .9) - f.age) * 4));
    if (f.speech) {
      c.font = '800 14px system-ui, sans-serif';
      const lines: string[] = []; let row = '';
      for (const word of f.text.split(' ')) { const next = row ? `${row} ${word}` : word; if (row && c.measureText(next).width > 148) { lines.push(row); row = word; } else row = next; }
      if (row) lines.push(row);
      const width = Math.max(...lines.map(s => c.measureText(s).width)) + 20, height = lines.length * 17 + 13;
      const x = Math.max(5, Math.min(W - width - 5, f.x - width / 2));
      let y = Math.max(5, f.y - height - 31 - f.age * 13);
      for (let attempt = 0; attempt <= bubbles.length; attempt++) {
        const overlap = bubbles.find(b => x < b.x + b.w + 5 && x + width + 5 > b.x && y < b.y + b.h + 6 && y + height + 6 > b.y);
        if (!overlap) break;
        const above = overlap.y - height - 7;
        y = above >= 5 ? above : Math.max(...bubbles.map(b => b.y + b.h)) + 7;
      }
      bubbles.push({ x, y, w: width, h: height });
      box(c, x + 2, y + 3, width, height, 9, '#102b3566'); box(c, x, y, width, height, 9, CREAM, 1.7);
      c.beginPath(); c.moveTo(x + width / 2 - 5, y + height - 1); c.lineTo(x + width / 2, y + height + 8); c.lineTo(x + width / 2 + 6, y + height - 1); c.fillStyle = CREAM; c.fill();
      lines.forEach((s, i) => text(c, s, x + width / 2, y + 19 + i * 17, 14, INK, 800));
    } else text(c, f.text, Math.max(37, Math.min(W - 37, f.x)), f.y - f.age * 40 - 17, f.text.includes('ROPES') ? 19 : 13, f.color, 950);
    c.restore();
  }
  const ready = 1 - w.cooldown / COOLDOWN;
  box(c, 76, 608, 268, 29, 10, '#0c2734d9');
  text(c, ready >= 1 ? 'SWIPE ACROSS ROPES' : 'SCISSORS RECHARGING…', 210, 627, 11, ready >= 1 ? '#dcf5d6' : '#b4c7c8');
  if (w.flash > 0) { c.fillStyle = `rgba(255,102,102,${w.flash * .25})`; c.fillRect(0, 0, W, H); }
}
export function resultImage(w: World, url: string): HTMLCanvasElement {
  const card = document.createElement('canvas'); card.width = 1080; card.height = 1350;
  const c = card.getContext('2d')!; c.fillStyle = INK; c.fillRect(0, 0, 1080, 1350);
  box(c, 48, 48, 984, 1254, 40, CREAM);
  text(c, 'PROPER MASSIVE', 540, 148, 47, INK, 950); text(c, 'PRICE CUT', 540, 218, 72, INK, 950);
  const celebrating = w.passed >= w.missed && w.passed > 0;
  text(c, w.passed ? `I GOT ${w.passed} FANS IN.` : 'THE ROPES WON THIS ROUND.', 540, 287, 27, '#48646b');
  drawSam(c, 540, 465, celebrating, 0, 3.2);
  for (let i = 0; i < 6; i++) drawFan(c, { id: i, x: 200 + i % 3 * 340, y: 468 + Math.floor(i / 3) * 220, speed: 0, look: i * 19, state: celebrating ? 'through' : 'falling', age: 0, turn: 0 }, 0, 2.2);
  box(c, 110, 730, 860, 173, 24, MINT); text(c, String(w.score), 540, 853, 116, INK, 950);
  text(c, `${w.passed} FANS IN  ·  ${w.missed} BLOCKED  ·  ${w.bestMultiplier}× BEST`, 540, 964, 28, INK);
  text(c, '60 seconds. How many can you get through?', 540, 1047, 31, INK);
  text(c, 'Inspired by Sam Fender’s ticket-price intervention.', 540, 1124, 23, '#48646b');
  text(c, 'Fictional arcade comedy · Unofficial', 540, 1162, 22, '#48646b');
  c.font = '19px system-ui'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(url, 540, 1240, 850);
  return card;
}
