import { STAFF } from './model.js';

const WIDTH = 720;
const HEIGHT = 400;
const RADIUS = 13;
const REACH = 82;
const SPEED = 270;
const GRID = 16;
const TABLES = [];
for (const y of [148, 310]) for (const x of [145, 360, 575]) TABLES.push({ x, y });
const SPAWN = { x: 385, y: 229 };
const DIRECTIONS = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function walkable(x, y) {
  return x >= 28 && x <= WIDTH - 28 && y >= 81 && y <= HEIGHT - 28
    && TABLES.every(table => Math.hypot(x - table.x, y - table.y) >= 44 + RADIUS);
}

function route(start, target) {
  // Search a small grid so a tap on the far side of a table still finds an aisle.
  const nodes = [];
  const columns = 43;
  for (let y = 84; y <= 372; y += GRID) {
    for (let i = 0; i < columns; i++) {
      const x = 24 + i * GRID;
      nodes.push(walkable(x, y) ? { x, y } : null);
    }
  }
  const nearest = point => nodes.reduce((best, node, index) =>
    node && (best < 0 || distance(node, point) < distance(nodes[best], point)) ? index : best, -1);
  const from = nearest(start), to = nearest(target);
  const previous = new Map([[from, -1]]);
  const queue = [from];
  for (let i = 0; i < queue.length && !previous.has(to); i++) {
    const current = queue[i];
    const column = current % columns;
    const next = [current - columns, current + columns];
    if (column > 0) next.push(current - 1);
    if (column < columns - 1) next.push(current + 1);
    for (const neighbor of next) {
      if (!nodes[neighbor] || previous.has(neighbor)) continue;
      // Adjacent grid endpoints can both clear a circle while their segment clips it.
      const a = nodes[current], b = nodes[neighbor];
      if (!walkable((a.x + b.x) / 2, (a.y + b.y) / 2)) continue;
      previous.set(neighbor, current);
      queue.push(neighbor);
    }
  }
  if (!previous.has(to)) return [];
  const path = [];
  for (let index = to; index !== -1; index = previous.get(index)) path.push(nodes[index]);
  return path.reverse();
}

export function createFloor(canvas) {
  const ctx = canvas.getContext('2d');
  const player = { ...SPAWN, angle: Math.PI / 2, stride: 0 };
  const held = new Set();
  let path = [];
  let destination = null;
  const staffRoutes = new WeakMap();

  function staffPosition(role, member, slot) {
    const home = { x: (role === 'waitress' ? 216 : 488) + slot * 32, y: 84 };
    const trip = member.trip;
    if (!trip) return { ...home, angle: Math.PI / 2, stride: 0 };
    if (!staffRoutes.has(trip)) {
      const table = TABLES[trip.index];
      staffRoutes.set(trip, route(home, { x: table.x, y: table.y - 65 }));
    }
    const steps = staffRoutes.get(trip);
    if (steps.length < 2) return { ...home, angle: Math.PI / 2, stride: 0 };
    const fraction = Math.min(1, Math.max(0, trip.remaining / STAFF[role].travel));
    const progress = (trip.returning ? fraction : 1 - fraction) * (steps.length - 1);
    const index = Math.min(steps.length - 2, Math.floor(progress));
    const a = steps[index], b = steps[index + 1], offset = progress - index;
    return {
      x: a.x + (b.x - a.x) * offset, y: a.y + (b.y - a.y) * offset,
      angle: Math.atan2(b.y - a.y, b.x - a.x) + (trip.returning ? Math.PI : 0),
      stride: progress * 1.5,
    };
  }

  function nearestTable() {
    let nearest = -1, range = REACH;
    TABLES.forEach((table, index) => {
      const gap = distance(player, table);
      if (gap < range) { nearest = index; range = gap; }
    });
    return nearest;
  }

  function pointAt(event) {
    const bounds = canvas.getBoundingClientRect();
    const tap = { x: (event.clientX - bounds.left) * WIDTH / bounds.width,
      y: (event.clientY - bounds.top) * HEIGHT / bounds.height };
    const table = TABLES.find(center => distance(tap, center) <= 46);
    let target = tap;
    if (table) {
      // Choose the accessible side nearest the player.
      const approaches = Array.from({ length: 12 }, (_, i) => ({
        x: table.x + 70 * Math.cos(i * Math.PI / 6),
        y: table.y + 70 * Math.sin(i * Math.PI / 6),
      })).filter(point => walkable(point.x, point.y));
      target = approaches.reduce((best, point) => distance(point, player) < distance(best, player) ? point : best);
    }
    path = route(player, target);
    destination = path.at(-1) ?? null;
  }

  function update(dt, locked) {
    if (locked) { path = []; destination = null; return; }
    let dx = 0, dy = 0;
    for (const key of held) { dx += DIRECTIONS[key][0]; dy += DIRECTIONS[key][1]; }
    if (dx || dy) { path = []; destination = null; }
    else if (path.length) {
      if (distance(player, path[0]) < 2) path.shift();
      if (!path.length) { destination = null; return; }
      dx = path[0].x - player.x;
      dy = path[0].y - player.y;
    }
    const magnitude = Math.hypot(dx, dy);
    if (!magnitude) return;
    const step = path.length ? Math.min(SPEED * dt, magnitude) : SPEED * dt;
    const x = player.x + dx / magnitude * step;
    const y = player.y + dy / magnitude * step;
    if (walkable(x, player.y)) player.x = x;
    if (walkable(player.x, y)) player.y = y;
    player.angle = Math.atan2(dy, dx);
    player.stride += dt * 18;
  }

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function disc(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function label(value, x, y, size, color) {
    ctx.font = `800 ${size}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }

  function figure(x, y, angle, shirt, skin, stride = 0, highlighted = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    if (highlighted) disc(0, 0, 19, '#e8ab535c');
    disc(2, 4, 15, '#0e0b09a0');
    const gait = Math.sin(stride) * 4;
    rect(-9, 7 + gait, 7, 11, '#1e1b19');
    rect(2, 7 - gait, 7, 11, '#1e1b19');
    disc(0, 1, 13, shirt);
    disc(-13, 1 + gait, 4, skin);
    disc(13, 1 - gait, 4, skin);
    disc(0, -6, 9, skin);
    disc(0, -9, 7, '#36251f');
    rect(-6, 6, 12, 4, highlighted ? '#ffd480' : shirt);
    ctx.restore();
  }

  function draw(game, selected, menu) {
    rect(0, 0, WIDTH, HEIGHT, '#402b21');
    for (let x = 0; x < WIDTH; x += 30) {
      rect(x, 0, 29, HEIGHT, x % 60 ? '#483024' : '#503528');
      for (let y = (x % 60 ? 0 : 30); y < HEIGHT; y += 90) rect(x, y, 29, 1, '#291d17');
    }
    rect(0, 0, WIDTH, 16, '#211915');
    rect(0, 16, 15, HEIGHT, '#2a1d17');
    rect(WIDTH - 15, 16, 15, HEIGHT, '#2a1d17');
    rect(0, HEIGHT - 16, WIDTH, 16, '#2a1d17');
    rect(280, 18, 160, 43, '#211813');
    rect(281, 49, 158, 12, '#95582e');
    for (let i = 0; i < 9; i++) rect(294 + i * 15, 32 - i % 3 * 4, 8, 16 + i % 3 * 4, ['#467862', '#b4773f', '#8a9c60'][i % 3]);
    label('BAR', 360, 61, 12, '#ffe0a1');
    rect(299, 383, 122, 17, '#846048');
    label('ENTRANCE', 360, 391, 12, '#ffdb9d');

    game.tables.forEach((table, index) => {
      const { x, y } = TABLES[index];
      const fight = table.status === 'fighting';
      const accent = fight ? '#ff866e' : table.heat >= 40 ? '#ef9b4f' : '#806047';
      const active = index === selected;
      if (active || fight) disc(x, y, 51, fight ? '#ae443555' : '#d1a66044');
      for (const side of [-1, 1]) {
        rect(x + side * 52 - 9, y - 12, 18, 25, '#3c261d');
        rect(x + side * 52 - 7, y - 10, 14, 19, '#78503a');
      }
      disc(x + 3, y + 5, 38, '#241810');
      disc(x, y, 38, active ? '#ffd480' : accent);
      disc(x, y, 35, fight ? '#914631' : '#91603a');
      disc(x, y, 31, fight ? '#793b2d' : '#805331');
      label(String(index + 1), x, y, 22, '#ffebcd');
      if (table.status !== 'empty') {
        const wobble = fight ? Math.sin(game.remaining * 28) * 7 : 0;
        figure(x - 53 + wobble, y, 0, '#4c7367', '#d4976e');
        figure(x + 53 - wobble, y, Math.PI, '#755f88', '#b97551');
        rect(x - 31, y + 47, 62, 5, '#231916');
        rect(x - 31, y + 47, 62 * Math.min(table.heat / 68, 1), 5, accent);
      }
      if (table.status === 'ordering' || fight) {
        const caption = fight ? `FIGHT · ${Math.ceil(table.fight)}s` : menu[table.order].name.toUpperCase();
        rect(x - 53, y - 63, 106, 21, fight ? '#722e27' : '#241a14');
        label(caption, x, y - 52, 14, fight ? '#ffd1c2' : '#ffd480');
      }
      if (table.hit > 0) label('✦', x + 29, y - 30, 24, '#ffdf93');
      if (table.staffNote) {
        rect(x - 57, y + 55, 114, 20, '#211c15');
        label(table.staffNote.text, x, y + 65, 12, '#c5e2a7');
      }
    });
    for (const [role, crew] of Object.entries(game.staff)) {
      const waitress = role === 'waitress';
      crew.forEach((member, slot) => {
        const { x, y, angle, stride } = staffPosition(role, member, slot);
        figure(x, y, angle, waitress ? '#c5554e' : '#55767e', '#d2966a', stride);
        if (member.cooldown > 0) {
          rect(x - 15, y - 33, 30, 17, '#211c15');
          label(`${Math.ceil(member.cooldown)}s`, x, y - 24, 13, '#ffd480');
        } else {
          label(waitress ? 'SERVER' : 'BOUNCER', x, y - 22, 11, '#ffe0a3');
        }
      });
    }
    if (destination) {
      ctx.strokeStyle = '#ffd480';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(destination.x, destination.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    figure(player.x, player.y, player.angle, '#dfa443', '#e4ad81', player.stride, true);
    label('YOU', player.x, player.y - 26, 12, '#ffe0a3');
  }

  return {
    update, draw, pointAt, nearestTable,
    keyDown(code) { if (!DIRECTIONS[code]) return false; held.add(code); return true; },
    keyUp(code) { held.delete(code); },
    stop() { held.clear(); path = []; destination = null; },
    reset() { Object.assign(player, SPAWN, { angle: Math.PI / 2, stride: 0 }); this.stop(); },
  };
}
