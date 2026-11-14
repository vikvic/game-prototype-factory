export const SHIFT_SECONDS = 55;
export const TOTAL_SHIFTS = 3;
export const GOAL = 900;
export const MENU = [
  { name: 'Pint', price: 9, units: 1, heat: 9, key: 'Q' },
  { name: 'Double', price: 16, units: 2, heat: 24, key: 'W' },
  { name: 'Round', price: 25, units: 3, heat: 35, key: 'E' },
];
export const STAFF = {
  waitress: { cost: 24, wage: 12, interval: 6, travel: 1.25 },
  bouncer: { cost: 28, wage: 14, interval: 12, travel: 0.95 },
};
export const EJECT_COST = 7;
export const CASE_COST = 18;
export const CASE_SIZE = 24;
const WAIT_LIMIT = 15;
const FIGHT_LIMIT = 6;
const HEAT_LIMIT = 68;
const STEP_COST = 35;
const SCUFFLE_WINDOW = 1.5;
const FLOOR_NAMES = ['Booth', 'Window', 'Darts', 'Snug', 'Corner', 'Back table'];

export function createGame(random = Math.random) {
  return {
    random, cash: 120, stock: 24, revenue: 0, expenses: 0,
    shift: 1, remaining: SHIFT_SECONDS, phase: 'intro', selected: 0,
    stamina: 100, serviceDelay: 0, scuffle: null, fighters: 0, served: 0, walkouts: 0,
    damage: 0, shifts: [], shiftStartProfit: 0,
    staff: { waitress: [], bouncer: [] },
    tables: FLOOR_NAMES.map((name, index) => ({
      name, status: 'empty', arrives: index * 1.2,
      order: 0, ordersLeft: 0, heat: 0, wait: 0, fight: 0, hit: 0,
      ticket: 0, staffNote: null,
    })),
    message: 'Open the doors to start the first shift.',
  };
}

export const profit = game => game.revenue - game.expenses;
export const wages = game => Object.entries(STAFF).reduce(
  (sum, [role, info]) => sum + info.wage * game.staff[role].length, 0,
);

function spend(game, amount) {
  game.cash -= amount;
  game.expenses += amount;
}

function restTable(game, table, delay = 2.5) {
  table.ticket++;
  table.status = 'empty';
  table.arrives = delay + game.random() * 2;
  table.heat = 0;
  table.wait = 0;
  table.fight = 0;
  table.ordersLeft = 0;
}

function takeOrder(game, table) {
  table.ticket++;
  const draw = game.random();
  const strongOrderChance = 0.21 + game.shift * 0.05;
  table.order = draw < strongOrderChance / 2 ? 2 : draw < strongOrderChance + 0.24 ? 1 : 0;
  table.wait = WAIT_LIMIT;
}

function seat(game, table) {
  table.status = 'ordering';
  table.heat = 4 + game.random() * 12 + (game.shift - 1) * 6;
  table.ordersLeft = 3 + Math.floor(game.random() * 2);
  takeOrder(game, table);
}

export function beginShift(game) {
  game.phase = 'open';
  game.remaining = SHIFT_SECONDS;
  game.shiftStartProfit = profit(game);
  if (game.shift > 1) spend(game, wages(game));
  game.stamina = 100;
  game.serviceDelay = 0;
  game.scuffle = null;
  for (const crew of Object.values(game.staff)) {
    for (const member of crew) {
      member.cooldown = 0;
      member.trip = null;
    }
  }
  game.tables.forEach((table, index) => {
    table.staffNote = null;
    restTable(game, table, index * 0.75);
  });
  game.message = `Night ${game.shift} is open. Keep the rounds moving.`;
}

export function canServe(game, table, drink, automatic = false) {
  return game.phase === 'open' && table.status === 'ordering'
    && game.stock >= drink.units && (automatic || (!game.scuffle && game.serviceDelay <= 0));
}

export function serve(game, index, drinkIndex, automatic = false) {
  const table = game.tables[index];
  const drink = MENU[drinkIndex];
  if (!canServe(game, table, drink, automatic)) return;
  const rightOrder = table.order === drinkIndex;
  const tip = rightOrder && table.wait > 8 ? 3 : 0;
  const sale = rightOrder ? drink.price + tip : Math.floor(drink.price * 0.58);
  game.cash += sale;
  game.revenue += sale;
  game.stock -= drink.units;
  game.served++;
  if (!automatic) game.serviceDelay = 0.55;
  table.heat += drink.heat + (rightOrder ? 0 : 18);
  table.ordersLeft--;
  game.message = `${automatic ? 'Waitress served' : 'Served'} ${drink.name.toLowerCase()} at ${table.name} · +$${sale}${tip ? ' with tip' : ''}.`;
  if (table.heat >= HEAT_LIMIT) startFight(game, table);
  else if (table.ordersLeft <= 0) restTable(game, table);
  else {
    takeOrder(game, table);
    table.status = 'drinking';
    table.arrives = 2.4 + game.random() * 1.1;
  }
}

function startFight(game, table) {
  table.ticket++;
  table.status = 'fighting';
  table.fight = FIGHT_LIMIT;
  table.hit = 0.3;
  game.message = `Fight at ${table.name}! Break it up before something breaks.`;
}

export function canStepIn(game, table) {
  if (game.scuffle) return game.phase === 'open';
  return game.phase === 'open' && game.stamina >= STEP_COST && game.serviceDelay <= 0
    && (table.status === 'fighting' || table.heat >= 40);
}

export function stepIn(game, index) {
  if (game.phase !== 'open') return;
  if (game.scuffle) {
    const { table, progress } = game.scuffle;
    if (progress >= 0.42 && progress <= 0.82) {
      game.scuffle = null;
      game.fighters++;
      restTable(game, table);
      table.hit = 0.3;
      game.serviceDelay = 0.6;
      game.message = `You won the scuffle at ${table.name}. Table cleared.`;
    } else {
      missScuffle(game);
    }
    return;
  }
  const table = game.tables[index];
  if (!canStepIn(game, table)) return;
  game.stamina -= STEP_COST;
  if (table.status === 'fighting') {
    game.scuffle = { table, progress: 0 };
    game.message = `Scuffle at ${table.name}. Tap Finish when the marker enters the gold zone.`;
  } else {
    game.serviceDelay = 0.7;
    table.hit = 0.3;
    table.heat = Math.max(0, table.heat - 30);
    game.message = `You stepped in at ${table.name}. The table cooled down.`;
  }
}

function missScuffle(game) {
  game.scuffle = null;
  game.serviceDelay = 0.9;
  spend(game, 8);
  game.damage += 8;
  game.message = 'Scuffle missed. A glass broke · −$8. The fight is still on.';
}

export function eject(game, index) {
  const table = game.tables[index];
  if (game.phase !== 'open' || game.scuffle || game.cash < EJECT_COST || table.status === 'empty') return;
  spend(game, EJECT_COST);
  restTable(game, table);
  game.message = `${table.name} cleared · $7 lost in refunds.`;
}

export function hire(game, role) {
  const { cost } = STAFF[role];
  const crew = game.staff[role];
  if (game.phase !== 'open' || crew.length >= 2 || game.cash < cost) return;
  spend(game, cost);
  crew.push({ cooldown: 0, trip: null, completed: 0 });
  game.message = `${role === 'waitress' ? 'Waitress' : 'Bouncer'} hired for $${cost}.`;
}

export function restock(game) {
  if (game.phase !== 'open' || game.cash < CASE_COST) return;
  spend(game, CASE_COST);
  game.stock += CASE_SIZE;
  game.message = `Case delivered · +${CASE_SIZE} stock, −$${CASE_COST}.`;
}

function damagePub(game, table) {
  const damage = 14 + game.shift * 4;
  spend(game, damage);
  game.damage += damage;
  restTable(game, table, 3);
  game.message = `Furniture smashed at ${table.name} · −$${damage}.`;
}

function eligibleForStaff(game, table, role) {
  if (role === 'bouncer') return table.status === 'fighting' && game.scuffle?.table !== table;
  return table.heat < 46 && canServe(game, table, MENU[table.order], true);
}

function canReachStaffJob(game, table, role, travel) {
  if (!eligibleForStaff(game, table, role)) return false;
  if (role === 'bouncer') return table.fight > travel;
  return table.wait > travel && coolAtArrival(game, table, travel);
}

function coolAtArrival(game, table, travel) {
  const warmingTime = Math.max(0, travel - Math.max(0, table.wait - 6));
  return table.heat + warmingTime * (2 + game.shift * 0.5) < 46;
}

export function staffIdleReason(game, role) {
  if (role === 'bouncer') {
    const fights = game.tables.filter(table => table.status === 'fighting');
    if (!fights.length) return 'Waiting for a fight';
    if (fights.every(table => game.scuffle?.table === table)) return 'You’re handling it';
    return fights.some(table => canReachStaffJob(game, table, role, STAFF[role].travel))
      ? 'Ready' : 'Too late to reach';
  }
  const orders = game.tables.filter(table => table.status === 'ordering');
  if (!orders.length) return 'Waiting for orders';
  const stocked = orders.filter(table => game.stock >= MENU[table.order].units);
  if (!stocked.length) return 'Need stock';
  const cool = stocked.filter(table => coolAtArrival(game, table, STAFF[role].travel));
  if (!cool.length) return 'Tables too hot';
  return cool.some(table => table.wait > STAFF[role].travel) ? 'Ready' : 'Orders expiring';
}

function finishStaffJob(game, role, member) {
  const trip = member.trip;
  const table = game.tables[trip.index];
  trip.returning = true;
  trip.remaining = STAFF[role].travel;
  if (table.ticket !== trip.ticket || !eligibleForStaff(game, table, role)) return;

  member.cooldown = STAFF[role].interval;
  member.completed++;
  if (role === 'bouncer') {
    restTable(game, table);
    table.hit = 0.3;
    table.staffNote = { text: 'FIGHT CLEARED', remaining: 2 };
    game.message = `Bouncer cleared ${table.name} before the damage.`;
  } else {
    const before = game.revenue;
    serve(game, trip.index, table.order, true);
    table.staffNote = { text: `SERVED +$${game.revenue - before}`, remaining: 2 };
  }
}

function tickStaff(game, seconds) {
  for (const [role, crew] of Object.entries(game.staff)) {
    for (const member of crew) {
      member.cooldown = Math.max(0, member.cooldown - seconds);
      if (member.trip) {
        member.trip.remaining -= seconds;
        if (member.trip.remaining > 0) continue;
        if (member.trip.returning) member.trip = null;
        else {
          finishStaffJob(game, role, member);
          continue;
        }
      }
      if (member.cooldown > 0) continue;
      const urgency = role === 'bouncer' ? 'fight' : 'wait';
      const target = game.tables
        .map((table, index) => ({ table, index }))
        .filter(({ table, index }) => canReachStaffJob(game, table, role, STAFF[role].travel + seconds)
          && !crew.some(({ trip }) => trip && !trip.returning && trip.index === index && trip.ticket === table.ticket))
        .sort((a, b) => a.table[urgency] - b.table[urgency])[0];
      if (target) member.trip = {
        index: target.index, ticket: target.table.ticket, remaining: STAFF[role].travel, returning: false,
      };
    }
  }
}

export function advance(game, seconds) {
  if (game.phase !== 'open') return;
  seconds = Math.min(game.remaining, seconds);
  game.remaining -= seconds;
  game.serviceDelay = Math.max(0, game.serviceDelay - seconds);
  game.stamina = Math.min(100, game.stamina + seconds * 7);
  if (game.scuffle) {
    game.scuffle.progress += seconds / SCUFFLE_WINDOW;
    if (game.scuffle.progress >= 1) missScuffle(game);
  }
  tickStaff(game, seconds);
  for (const table of game.tables) {
    if (table.staffNote) {
      table.staffNote.remaining -= seconds;
      if (table.staffNote.remaining <= 0) table.staffNote = null;
    }
    table.hit = Math.max(0, table.hit - seconds);
    if (table.status === 'empty' || table.status === 'drinking') {
      table.arrives -= seconds;
      if (table.arrives <= 0) {
        if (table.status === 'empty') seat(game, table);
        else table.status = 'ordering';
      }
    } else if (table.status === 'ordering') {
      table.wait -= seconds;
      if (table.wait < 6) table.heat += seconds * (2 + game.shift * 0.5);
      if (table.heat >= HEAT_LIMIT) startFight(game, table);
      else if (table.wait <= 0) {
        game.walkouts++;
        restTable(game, table);
        game.message = `${table.name} walked out waiting for service.`;
      }
    } else if (table.status === 'fighting' && game.scuffle?.table !== table) {
      table.fight -= seconds;
      if (table.fight <= 0) damagePub(game, table);
    }
  }
  if (game.remaining <= 0) {
    game.scuffle = null;
    for (const table of game.tables) if (table.status === 'fighting') damagePub(game, table);
    game.shifts.push(profit(game) - game.shiftStartProfit);
    game.phase = game.shift >= TOTAL_SHIFTS || game.cash <= 0 ? 'results' : 'break';
    game.message = `Night ${game.shift} is closed.`;
  }
}
