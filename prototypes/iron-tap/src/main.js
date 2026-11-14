import './style.css';
import { createFloor } from './floor.js';
import {
  SHIFT_SECONDS, TOTAL_SHIFTS, GOAL, MENU, STAFF, EJECT_COST, CASE_COST,
  createGame, profit, wages, beginShift, canServe, serve, canStepIn,
  stepIn, eject, hire, restock, advance, staffIdleReason,
} from './model.js';

const el = id => document.getElementById(id);
const money = value => value < 0 ? `−$${Math.abs(value)}` : `$${value}`;
const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
const modal = el('modal');
text(el('target'), `Three shifts. ${money(GOAL)} profit.`);
let game = createGame();
let modalMode = 'intro';
let lastTick = performance.now();

const floor = createFloor(el('floor'));
el('floor').addEventListener('pointerdown', event => {
  if (!modal.open && game.phase === 'open' && !game.scuffle) floor.pointAt(event);
});

const pours = MENU.map((drink, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `${drink.name} <kbd>${index + 1}</kbd><small>$${drink.price} · ${drink.units} stock</small>`;
  button.addEventListener('click', () => atTable(table => serve(game, table, index)));
  el('pours').append(button);
  return button;
});

function atTable(action) {
  const index = floor.nearestTable();
  if (index >= 0) act(() => action(index));
}

function interact() {
  atTable(index => {
    const table = game.tables[index];
    if (game.scuffle || table.status === 'fighting' || table.heat >= 40) stepIn(game, index);
    else if (table.status === 'ordering') serve(game, index, table.order);
  });
}

function act(action) {
  if (modal.open) return;
  action();
  render();
}

function stateLabel(table) {
  if (table.status === 'fighting') return `FIGHT · ${Math.ceil(table.fight)}s`;
  if (table.status === 'empty') return 'Empty';
  if (table.status === 'drinking') return table.heat >= 40 ? 'Drinking · Heated' : 'Drinking';
  return `Order · ${Math.ceil(table.wait)}s${table.heat >= 40 ? ' · Heated' : ''}`;
}

function render() {
  text(el('profit'), money(profit(game)));
  el('profit').classList.toggle('loss', profit(game) < 0);
  text(el('cash'), money(game.cash));
  text(el('stock'), String(game.stock));
  text(el('night'), `Night ${game.shift} / ${TOTAL_SHIFTS}`);
  text(el('clock'), `0:${String(Math.ceil(game.remaining)).padStart(2, '0')}`);
  text(el('dispatch'), game.message);
  const index = floor.nearestTable();
  const selected = game.tables[index];
  const ordering = selected?.status === 'ordering';
  const heated = selected?.status === 'fighting' || selected?.heat >= 40;
  const dealWithTrouble = Boolean(game.scuffle || heated);
  text(el('selected'), selected ? `Table ${index + 1} · ${selected.name}` : 'Table service');
  text(el('order'), ordering ? MENU[selected.order].name : selected ? stateLabel(selected) : 'Out of reach');
  text(el('nearby'), selected ? `${selected.name} · ${stateLabel(selected)}` : 'Walk to a table');
  text(el('interact').firstChild, game.scuffle ? 'Finish ' : heated ? 'Step in ' : ordering ? `Serve ${MENU[selected.order].name.toLowerCase()} ` : 'Interact ');
  el('interact').disabled = !selected || !(dealWithTrouble
    ? canStepIn(game, selected)
    : ordering && canServe(game, selected, MENU[selected.order]));
  pours.forEach((button, index) => {
    button.disabled = !selected || !canServe(game, selected, MENU[index]);
    button.classList.toggle('matched', ordering && selected.order === index);
  });
  el('brawl').disabled = !selected || !canStepIn(game, selected);
  text(el('brawl').firstChild, game.scuffle ? 'Finish ' : 'Step in ');
  el('scuffle').hidden = !game.scuffle;
  if (game.scuffle) el('timing-marker').style.left = `${game.scuffle.progress * 100}%`;
  el('eject').disabled = !selected || game.phase !== 'open' || Boolean(game.scuffle) || selected.status === 'empty' || game.cash < EJECT_COST;
  el('restock').disabled = game.phase !== 'open' || game.cash < CASE_COST;
  el('pause').disabled = game.phase !== 'open';
  text(el('stamina'), `Stamina ${Math.floor(game.stamina)}%${game.serviceDelay > 0.35 ? ' · Recovering' : ''}`);
  text(el('wages'), `${money(wages(game))} wages / shift`);
  for (const role of Object.keys(STAFF)) {
    const crew = game.staff[role];
    const moving = crew.filter(member => member.trip && !member.trip.returning).length;
    const ready = crew.filter(member => !member.trip && member.cooldown <= 0).length;
    const completed = crew.reduce((sum, member) => sum + member.completed, 0);
    const recovery = Math.ceil(Math.min(...crew.map(member => member.cooldown)));
    const activity = moving ? `${moving} en route`
      : ready ? staffIdleReason(game, role)
      : crew.some(member => member.trip) ? 'Returning'
      : `Recovering ${recovery}s`;
    text(el(`${role}-status`), crew.length
      ? `${crew.length} / 2 · ${activity} · ${completed} ${role === 'waitress' ? 'served' : 'cleared'}`
      : `0 / 2 · ${role === 'waitress' ? 'Serve orders' : 'Break up fights'}`);
    el(`hire-${role}`).disabled = game.phase !== 'open' || crew.length >= 2 || game.cash < STAFF[role].cost;
  }
}

const instructions = `<p>Work ${TOTAL_SHIFTS} ${SHIFT_SECONDS}-second nights and make <strong>${money(GOAL)} in profit</strong>.</p>
  <ul><li>Walk up to a table. Press Space or use the button under the floor to serve its order. Stronger drinks add more heat.</li>
  <li>Step in to cool a heated table. If a fight starts, step in and tap Finish when the marker reaches the gold zone.</li>
  <li>Hire waitresses to serve orders and bouncers to clear fights. Restock when the bar runs low.</li></ul>
  <p>Move with WASD or arrows, or tap a table. Space interacts, 1–3 pours a drink, F steps in, and G ejects. Z hires a waitress, X hires a bouncer, R restocks, and P pauses.</p>`;

function show(mode, kicker, title, body, button) {
  floor.stop();
  modalMode = mode;
  text(el('modal-kicker'), kicker);
  text(el('modal-title'), title);
  el('modal-body').innerHTML = body;
  text(el('modal-action'), button);
  if (!modal.open) modal.showModal();
}

function start() {
  beginShift(game);
  floor.reset();
  resume();
  render();
}

function resume() {
  modal.close();
  lastTick = performance.now();
  el('floor').focus({ preventScroll: true });
}

function pause() {
  if (game.phase !== 'open' || modal.open) return;
  show('pause', `Night ${game.shift} / ${TOTAL_SHIFTS}`, 'On break',
    '<p>The shift clock is paused.</p>', 'Resume shift');
}

function closeShift() {
  if (game.phase === 'break') {
    show('break', `Night ${game.shift} complete`, 'Last orders',
      `<p>Shift profit <strong>${money(game.shifts.at(-1))}</strong>. Total <strong>${money(profit(game))}</strong>.</p>
       <p>Next shift wages ${money(wages(game))}. Stock remaining ${game.stock}.</p>`,
      `Open night ${game.shift + 1}`);
  } else {
    show('results', `${game.shift} ${game.shift === 1 ? 'night' : 'nights'} worked`,
      profit(game) >= GOAL ? 'House wins' : game.cash <= 0 ? 'Till empty' : 'Doors shut',
      `<p><strong>${money(profit(game))}</strong> profit · ${money(GOAL)} target.</p>
       <p>${money(game.revenue)} sales and tips · ${money(game.expenses)} expenses.</p>
       <p>${game.served} orders served · ${game.fighters} fights you broke up · ${money(game.damage)} damage.</p>`,
      'Run it back');
  }
}

el('modal-action').addEventListener('click', () => {
  if (modalMode === 'results') game = createGame();
  if (modalMode === 'break') game.shift++;
  if (['intro', 'break', 'results'].includes(modalMode)) start();
  else resume();
});
modal.addEventListener('cancel', event => {
  event.preventDefault();
  if (modalMode === 'pause' || modalMode === 'help') resume();
});

el('help').addEventListener('click', () => show('help', 'IRON TAP', 'Work the room', instructions, 'Back to the pub'));
el('pause').addEventListener('click', pause);
el('interact').addEventListener('click', interact);
el('brawl').addEventListener('click', () => atTable(index => stepIn(game, index)));
el('eject').addEventListener('click', () => atTable(index => eject(game, index)));
el('restock').addEventListener('click', () => act(() => restock(game)));
for (const role of Object.keys(STAFF)) el(`hire-${role}`).addEventListener('click', () => act(() => hire(game, role)));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => floor.stop());
document.addEventListener('keyup', event => floor.keyUp(event.code));

document.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toUpperCase();
  if (!event.repeat && key === 'P' && modalMode === 'pause' && modal.open) { resume(); return; }
  if (modal.open || game.phase !== 'open') return;
  if (floor.keyDown(event.code)) { event.preventDefault(); return; }
  if (event.repeat) return;
  if (event.code === 'Space' && !event.target.closest('button')) { event.preventDefault(); interact(); }
  else if (/^[1-3]$/.test(key)) atTable(index => serve(game, index, Number(key) - 1));
  else if (key === 'F') atTable(index => stepIn(game, index));
  else if (key === 'G') atTable(index => eject(game, index));
  else if (key === 'Z') act(() => hire(game, 'waitress'));
  else if (key === 'X') act(() => hire(game, 'bouncer'));
  else if (key === 'R') act(() => restock(game));
  else if (key === 'P') pause();
});

setInterval(() => {
  const now = performance.now();
  const seconds = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  if (modal.open || game.phase !== 'open') return;
  advance(game, seconds);
  render();
  if (game.phase !== 'open') closeShift();
}, 100);

let frameTime = performance.now();
function drawFrame(now) {
  const dt = Math.min(0.04, (now - frameTime) / 1000);
  frameTime = now;
  if (!modal.open && game.phase === 'open') floor.update(dt, Boolean(game.scuffle));
  floor.draw(game, floor.nearestTable(), MENU);
  requestAnimationFrame(drawFrame);
}
requestAnimationFrame(drawFrame);

render();
show('intro', 'IRON TAP', 'Open the doors', instructions, 'Start night 1');
