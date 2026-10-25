export type Point = { x: number; y: number };
export const W = 420, H = 650, ROUND = 60, REACH = 150, COOLDOWN = 0.6;
export type Rope = { id: number; a: Point; b: Point; age: number; draw: number; cat: number; cut: Point | null; snapped: number; claimed: boolean };
export type Fan = Point & { id: number; speed: number; look: number; state: 'walking' | 'falling' | 'through'; age: number; turn: number };
export type Cat = Point & { side: number; laugh: number; angry: number; working: number; look: number };
export type Hit = Point & { rope: number; distance: number; done: boolean };
export type Slash = { path: Point[]; hits: Hit[]; length: number; age: number; rewarded: boolean };
export type FX = Point & { text: string; color: string; age: number; speech?: boolean; life?: number };
export type Sound = { kind: 'cut' | 'laugh' | 'pass' | 'combo'; amount: number };
export type World = {
  phase: 'intro' | 'playing' | 'ended'; time: number; elapsed: number; score: number; passed: number; missed: number;
  multiplier: number; bestMultiplier: number; cuts: number; swipes: number; cooldown: number; flash: number;
  ropes: Rope[]; fans: Fan[]; cats: Cat[]; slashes: Slash[]; fx: FX[]; sounds: Sound[];
  nextFan: number; nextRope: number; serial: number; message: string; comboAge: number;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const complaints = ['My ticket!', 'I wanted to see the show!', 'But I queued for hours!', 'Let me in!', 'Not the rope again!', 'I can hear the encore!'];
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function createWorld(playing = false): World {
  return { phase: playing ? 'playing' : 'intro', time: ROUND, elapsed: 0, score: 0, passed: 0, missed: 0,
    multiplier: 1, bestMultiplier: 1, cuts: 0, swipes: 0, cooldown: 0, flash: 0,
    ropes: [], fans: [], slashes: [], fx: [], sounds: [], nextFan: .2, nextRope: 1.6, serial: 0,
    cats: Array.from({ length: 6 }, (_, i) => ({ x: i % 2 ? 394 : 26, y: 180 + Math.floor(i / 2) * 125, side: i % 2 ? -1 : 1, laugh: 0, angry: 0, working: 0, look: i })),
    message: 'Keep the crowd moving. Swipe across ropes.', comboAge: 0 };
}
export function addPoint(path: Point[], next: Point): boolean {
  const last = path[path.length - 1];
  const used = pathLength(path), left = Math.max(0, REACH - used), d = distance(last, next);
  if (d < .5 || left < .01) return left < .01;
  const t = Math.min(1, left / d);
  path.push({ x: last.x + (next.x - last.x) * t, y: last.y + (next.y - last.y) * t });
  return d >= left;
}
export function pathLength(path: Point[]): number {
  return path.reduce((n, p, i) => n + (i ? distance(path[i - 1], p) : 0), 0);
}
export function pointOn(path: Point[], length: number): Point {
  for (let i = 1; i < path.length; i++) {
    const d = distance(path[i - 1], path[i]);
    if (length <= d) {
      const t = d ? length / d : 0;
      return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
    }
    length -= d;
  }
  return path[path.length - 1];
}
function cross(a: Point, b: Point) { return a.x * b.y - a.y * b.x; }
export function intersection(a: Point, b: Point, c: Point, d: Point): (Point & { t: number }) | null {
  const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y };
  const denom = cross(r, s), q = { x: c.x - a.x, y: c.y - a.y };
  if (Math.abs(denom) < .0001) return null;
  const t = cross(q, s) / denom, u = cross(q, r) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + r.x * t, y: a.y + r.y * t, t } : null;
}
export function swipe(w: World, path: Point[]): boolean {
  if (w.phase !== 'playing' || w.cooldown > 0 || path.length < 2 || pathLength(path) < 10) return false;
  // Re-bound the submitted polyline as well as the live gesture: one length budget, even for zigzags.
  const bounded = [{ ...path[0] }];
  for (const p of path.slice(1)) if (addPoint(bounded, p)) break;
  const hits: Hit[] = [];
  for (const rope of w.ropes) {
    if (rope.cut || rope.claimed) continue;
    let travelled = 0;
    for (let i = 1; i < bounded.length; i++) {
      const hit = intersection(bounded[i - 1], bounded[i], rope.a, rope.b);
      if (hit) { hits.push({ x: hit.x, y: hit.y, rope: rope.id, distance: travelled + hit.t * distance(bounded[i - 1], bounded[i]), done: false }); rope.claimed = true; break; }
      travelled += distance(bounded[i - 1], bounded[i]);
    }
  }
  w.slashes.push({ path: bounded, hits, length: pathLength(bounded), age: 0, rewarded: false });
  w.cooldown = COOLDOWN; w.swipes++;
  w.message = hits.length ? (hits.length > 1 ? `${hits.length} ropes lined up!` : 'Snip! Keep them coming.') : 'Missed the ropes. Aim across the line.';
  return true;
}
function pop(w: World, p: Point, text: string, color: string) { w.fx.push({ ...p, text, color, age: 0 }); }
function spawnRope(w: World) {
  if (w.ropes.filter(r => !r.cut).length >= 7) return;
  const index = Math.floor(rand(0, 6)), cat = w.cats[index];
  const level = Math.floor(index / 2), endLevel = Math.max(0, Math.min(2, level + (Math.random() < .28 ? (Math.random() < .5 ? -1 : 1) : 0)));
  const a = { x: cat.x + cat.side * 19, y: cat.y + rand(-25, 25) };
  const b = { x: cat.side > 0 ? 375 : 45, y: 180 + endLevel * 125 + rand(-27, 27) };
  const draw = .95 - .2 * w.elapsed / ROUND;
  w.ropes.push({ id: ++w.serial, a, b, age: 0, draw, cat: index, cut: null, snapped: 0, claimed: false });
  cat.working = draw;
}
function effects(w: World, dt: number, scoring: boolean) {
  for (const cat of w.cats) { cat.laugh = Math.max(0, cat.laugh - dt); cat.angry = Math.max(0, cat.angry - dt); cat.working = Math.max(0, cat.working - dt); }
  for (const rope of w.ropes) { rope.age += dt; if (rope.cut) rope.snapped += dt; }
  for (const slash of w.slashes) {
    slash.age += dt;
    const along = Math.max(0, Math.min(1, (slash.age - .035) / .12)) * slash.length;
    for (const hit of slash.hits) if (!hit.done && slash.age >= .035 && hit.distance <= along) {
      hit.done = true;
      const rope = w.ropes.find(r => r.id === hit.rope);
      if (rope && !rope.cut) {
        rope.cut = { x: hit.x, y: hit.y }; rope.snapped = 0;
        const owner = w.cats[rope.cat]; owner.angry = 1.5; owner.laugh = 0;
        if (scoring) w.cuts++; pop(w, hit, 'SNIP!', '#fff5c6'); w.sounds.push({ kind: 'cut', amount: 1 });
      }
    }
    if (!slash.rewarded && slash.age >= .155) {
      slash.rewarded = true;
      const n = slash.hits.filter(h => h.done).length;
      if (n >= 2 && scoring) {
        w.multiplier = Math.max(w.multiplier, Math.min(4, n)); w.bestMultiplier = Math.max(w.bestMultiplier, w.multiplier); w.comboAge = 1.6;
        pop(w, pointOn(slash.path, slash.length / 2), `${n} ROPES!  ${w.multiplier}×`, '#c8ff74');
        w.message = `${w.multiplier}× crowd multiplier! Protect it.`; w.sounds.push({ kind: 'combo', amount: n });
      }
    }
  }
  w.slashes = w.slashes.filter(s => s.age < .43);
  w.ropes = w.ropes.filter(r => !r.cut || r.snapped < .48);
  for (const fx of w.fx) fx.age += dt;
  w.fx = w.fx.filter(f => f.age < (f.life ?? .9)).slice(-45);
}
function substep(w: World, dt: number) {
  w.elapsed += dt; w.time = Math.max(0, ROUND - w.elapsed);
  w.cooldown = Math.max(0, w.cooldown - dt); w.flash = Math.max(0, w.flash - dt); w.comboAge = Math.max(0, w.comboAge - dt);
  effects(w, dt, true);
  w.nextFan -= dt;
  if (w.nextFan <= 0) {
    w.nextFan += .65 - .2 * w.elapsed / ROUND;
    const lane = Math.floor(rand(0, 4));
    w.fans.push({ id: ++w.serial, x: 93 + lane * 78 + rand(-9, 9), y: 626, speed: rand(63, 76) + w.elapsed * .25, look: Math.floor(rand(0, 10000)), state: 'walking', age: 0, turn: rand(-1, 1) });
  }
  w.nextRope -= dt;
  if (w.nextRope <= 0) { w.nextRope += 2.2 - 1.15 * w.elapsed / ROUND; spawnRope(w); }
  for (const fan of w.fans) {
    fan.age += dt;
    if (fan.state === 'falling') { fan.y += (170 + fan.age * 1500) * dt; fan.x += fan.turn * 65 * dt; continue; }
    if (fan.state === 'through') { fan.y -= 110 * dt; continue; }
    const previous = { x: fan.x, y: fan.y + 9 }; fan.y -= fan.speed * dt;
    const collision = w.ropes.find(r => !r.cut && r.age >= r.draw && intersection(previous, { x: fan.x, y: fan.y - 10 }, r.a, r.b));
    if (collision) {
      fan.state = 'falling'; fan.age = 0; w.missed++; w.multiplier = 1; w.flash = .18;
      const available = w.cats.filter(c => c.angry === 0), audience = available.length ? available : w.cats;
      const cat = audience[Math.floor(rand(0, audience.length))]; cat.laugh = 1.1;
      w.fx.push({ x: fan.x, y: fan.y - (fan.id % 2) * 27, text: complaints[Math.floor(rand(0, complaints.length))], color: '#fff4d9', age: 0, life: 1.65, speech: true });
      w.message = 'Rope hit! Multiplier reset. Keep cutting.'; w.sounds.push({ kind: 'laugh', amount: 1 });
    } else if (fan.y < 89) {
      fan.state = 'through'; fan.age = 0; w.passed++; w.score += w.multiplier;
      pop(w, fan, `+${w.multiplier}`, '#c8ff74'); w.sounds.push({ kind: 'pass', amount: w.multiplier });
    }
  }
  w.fans = w.fans.filter(f => f.y < 770 && f.y > 20);
}
// Finish already accepted visual actions after zero without changing result statistics.
export function settle(w: World, dt: number) {
  if (w.phase !== 'ended') return;
  effects(w, Math.min(.05, dt), false);
  for (const f of w.fans) if (f.state === 'falling') { f.age += dt; f.y += (170 + f.age * 1500) * dt; }
  w.fans = w.fans.filter(f => f.y < 770);
}
export function advance(w: World, dt: number) {
  if (w.phase !== 'playing') return;
  let remaining = Math.min(Math.max(0, dt), w.time);
  while (remaining > .000001) { const d = Math.min(.025, remaining); substep(w, d); remaining -= d; }
  if (w.time <= .000001) { w.time = 0; w.phase = 'ended'; w.message = 'Time! Every fan counted.'; }
}
