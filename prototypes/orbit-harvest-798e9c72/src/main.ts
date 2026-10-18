import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ctx = canvas.getContext('2d')!;
const scoreText = document.querySelector<HTMLElement>('#score')!;
const timeText = document.querySelector<HTMLElement>('#time')!;
const statusText = document.querySelector<HTMLElement>('#status')!;
const W = 900, H = 600, goal = 12;
const keys = new Set<string>();
let player = { x: 450, y: 300 }, drone = { x: 90, y: 90 };
let target: { x: number; y: number } | null = null;
let signals: { x: number; y: number; phase: number }[] = [];
let score = 0, remaining = 45, ended = false, last = performance.now();
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function reset() {
  player = { x: 450, y: 300 }; drone = { x: 90, y: 90 };
  score = 0; remaining = 45; ended = false; target = null;
  signals = Array.from({ length: goal }, (_, i) => ({
    x: 90 + (i % 4) * 235, y: 90 + Math.floor(i / 4) * 210, phase: i * 0.7,
  }));
  statusText.textContent = 'Collect 12 signals. Avoid the coral drone.';
  last = performance.now();
}
function finish(won: boolean) {
  ended = true;
  statusText.textContent = won ? 'All signals collected. Restart for another run.' : 'Signal lost. Restart and try another route.';
}
function pointer(event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();
  target = { x: (event.clientX - bounds.left) / bounds.width * W, y: (event.clientY - bounds.top) / bounds.height * H };
}
canvas.addEventListener('pointerdown', event => { canvas.focus(); canvas.setPointerCapture(event.pointerId); pointer(event); });
canvas.addEventListener('pointermove', event => { if (canvas.hasPointerCapture(event.pointerId)) pointer(event); });
canvas.addEventListener('pointerup', () => { target = null; });
canvas.addEventListener('pointercancel', () => { target = null; });
window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) { event.preventDefault(); keys.add(key); }
  if (key === 'r') reset();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); target = null; });
document.querySelector('#restart')!.addEventListener('click', reset);

function glow(x: number, y: number, radius: number, color: string) {
  ctx.shadowBlur = radius * 2; ctx.shadowColor = color; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
}
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.04); last = now;
  if (!ended && !document.hidden) {
    remaining = Math.max(0, remaining - dt);
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (!dx && !dy && target && distance(player, target) > 5) { dx = target.x - player.x; dy = target.y - player.y; }
    const length = Math.hypot(dx, dy) || 1;
    const step = target && !keys.size ? Math.min(260 * dt, distance(player, target)) : 260 * dt;
    player.x = Math.max(18, Math.min(W - 18, player.x + dx / length * step));
    player.y = Math.max(18, Math.min(H - 18, player.y + dy / length * step));
    const chase = distance(player, drone) || 1;
    drone.x += (player.x - drone.x) / chase * (62 + score * 5) * dt;
    drone.y += (player.y - drone.y) / chase * (62 + score * 5) * dt;
    signals = signals.filter(signal => { if (distance(player, signal) < 28) { score++; return false; } return true; });
    if (distance(player, drone) < 27 || remaining <= 0) finish(false);
    else if (score >= goal) finish(true);
  }
  const dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#101b30'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#1d2b43'; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (const signal of signals) glow(signal.x, signal.y, 8 + Math.sin(now / 400 + signal.phase) * 2, '#e4c66b');
  glow(drone.x, drone.y, 17, '#f68780'); glow(player.x, player.y, 14, '#7ce3d0');
  ctx.strokeStyle = '#d1fff5'; ctx.beginPath(); ctx.arc(player.x, player.y, 22, 0, Math.PI * 2); ctx.stroke();
  if (ended) {
    ctx.fillStyle = '#0a1220bf'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#edf4ff'; ctx.font = 'bold 48px system-ui';
    ctx.fillText(score >= goal && remaining > 0 ? 'Signals secured' : 'Signal lost', W / 2, H / 2 - 10);
    ctx.font = '20px system-ui'; ctx.fillText('Press R or tap Restart', W / 2, H / 2 + 35);
  }
  scoreText.textContent = `${score} / ${goal}`; timeText.textContent = `${Math.ceil(remaining)}s`;
  requestAnimationFrame(frame);
}
reset(); requestAnimationFrame(frame);
