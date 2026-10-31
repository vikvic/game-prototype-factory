import './style.css';
import { advance, settle, createWorld, addPoint, swipe, W, H, COOLDOWN, STAR_TARGETS, starsForScore, type Point } from './world';
import { render, resultImage, drawSam, drawFan } from './art';
import { Soundtrack } from './sound';
import { analyticsConfigured, analyticsEnabled, setAnalyticsEnabled, trackLoaded, trackRoundStarted, trackRoundCompleted, trackRoundEvent, roundEventTracker } from './analytics';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('game'), context = canvas.getContext('2d')!;
const dialogs = ['pause-dialog', 'help-dialog', 'story-dialog'].map(id => $<HTMLDialogElement>(id));
const sound = new Soundtrack();
let world = createWorld(), paused = false, last = performance.now(), best = 0;
let gesture: { id: number; path: Point[] } | null = null;
let metrics = { scale: 1, ox: 0, oy: 0, width: W, height: H, dpr: 1 };
let card: HTMLCanvasElement | null = null, cardFile: File | null = null, settling = 0;
let landscape = innerWidth > innerHeight;
try { const n = Number(localStorage.getItem('price-cut-best')); if (Number.isFinite(n) && n > 0) best = n; } catch { /* Storage is optional. */ }
function txt(id: string, value: string) { if ($(id).textContent !== value) $(id).textContent = value; }
function clearGesture() {
  const old = gesture; gesture = null;
  if (old) try { if (canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id); } catch { /* Lost/cancelled pointer. */ }
}
function openDialog(id: string) {
  if (dialogs.some(d => d.open)) return;
  clearGesture(); paused = true; $<HTMLDialogElement>(id).showModal();
}
function pause(reason = 'Your crowd and clock are paused.') {
  if (world.phase !== 'playing' || paused) return;
  txt('pause-reason', reason); openDialog('pause-dialog');
}
for (const d of dialogs) d.addEventListener('close', () => { paused = dialogs.some(other => other.open); last = performance.now(); clearGesture(); });
$('pause').onclick = () => pause(); $('help').onclick = () => openDialog('help-dialog'); $('story').onclick = () => openDialog('story-dialog');
$('resume').onclick = () => $<HTMLDialogElement>('pause-dialog').close();
$('help-close').onclick = () => $<HTMLDialogElement>('help-dialog').close();
$('story-close').onclick = () => $<HTMLDialogElement>('story-dialog').close();
$('sound').onclick = () => {
  sound.unlock(); sound.muted = !sound.muted;
  $('sound').setAttribute('aria-pressed', String(sound.muted)); $('sound').setAttribute('aria-label', sound.muted ? 'Enable sound' : 'Mute sound');
  $('sound').textContent = sound.muted ? '♫̸' : '♪';
};
function resize() {
  clearGesture();
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  const scale = Math.min(rect.width / W, rect.height / H);
  metrics = { scale, ox: (rect.width - W * scale) / 2, oy: (rect.height - H * scale) / 2, width: rect.width, height: rect.height, dpr };
  canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const nowLandscape = innerWidth > innerHeight;
  if (nowLandscape !== landscape) pause('Screen rotated. Your score and clock are safe.');
  landscape = nowLandscape;
}
new ResizeObserver(resize).observe(canvas);
function screenPoint(e: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left - metrics.ox) / metrics.scale, y: (e.clientY - rect.top - metrics.oy) / metrics.scale };
}
function commitGesture() {
  if (!gesture) return;
  const g = gesture; gesture = null;
  if (!paused) swipe(world, g.path);
  try { if (canvas.hasPointerCapture(g.id)) canvas.releasePointerCapture(g.id); } catch { /* Pointer already released. */ }
}
canvas.onpointerdown = e => {
  sound.unlock();
  if (e.button !== 0 || gesture || paused || world.phase !== 'playing') return;
  e.preventDefault();
  if (world.cooldown > 0) { txt('message', 'Recharging — watch the green bar.'); $('recharge').parentElement!.classList.add('blocked'); return; }
  const p = screenPoint(e); if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) return;
  canvas.setPointerCapture(e.pointerId); gesture = { id: e.pointerId, path: [p] };
};
canvas.onpointermove = e => {
  if (!gesture || gesture.id !== e.pointerId) return;
  e.preventDefault();
  const coalesced = e.getCoalescedEvents?.();
  for (const sample of coalesced?.length ? coalesced : [e]) {
    const p = screenPoint(sample); p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
    if (addPoint(gesture.path, p)) { commitGesture(); break; }
  }
};
canvas.onpointerup = e => {
  if (!gesture || gesture.id !== e.pointerId) return;
  const p = screenPoint(e); p.x = Math.max(0, Math.min(W, p.x)); p.y = Math.max(0, Math.min(H, p.y));
  addPoint(gesture.path, p); commitGesture();
};
canvas.onpointercancel = e => { if (gesture?.id === e.pointerId) clearGesture(); };
canvas.onlostpointercapture = e => { if (gesture?.id === e.pointerId) clearGesture(); };
function start() {
  sound.unlock(); clearGesture(); for (const d of dialogs) if (d.open) d.close();
  world = createWorld(true); paused = false; card = null; cardFile = null; settling = 0; last = performance.now();
  $('intro').hidden = true; $('result').hidden = true;
  txt('share-status', 'Your score. Your crowd. Your bragging rights.'); canvas.focus({ preventScroll: true });
  trackRoundStarted();
}
$('start').onclick = start; $('replay').onclick = start;
const pageUrl = () => {
  const url = new URL('./', location.href);
  url.search = new URLSearchParams({ utm_source: 'player_share', utm_medium: 'referral', utm_campaign: 'price_cut' }).toString();
  return url.href;
};
function finish() {
  clearGesture(); $('result').hidden = false;
  best = Math.max(best, world.score);
  try { localStorage.setItem('price-cut-best', String(best)); } catch { /* Session score remains available. */ }
  txt('final-score', String(world.score));
  const stars = starsForScore(world.score), celebrating = stars >= 2;
  trackRoundCompleted({ score: world.score, stars, active_play_seconds: world.elapsed, fans_admitted: world.passed, fans_blocked: world.missed, best_multiplier: world.bestMultiplier });
  txt('final-stars', '★'.repeat(stars) + '☆'.repeat(3 - stars));
  $('final-stars').setAttribute('aria-label', `${stars} out of 3 stars`);
  const next = STAR_TARGETS.find(target => target > world.score);
  txt('rating-detail', next ? `${next - world.score} more points for the next star` : 'Three stars! Keep pushing your personal best.');
  txt('final-stats', `${world.passed} fans admitted · ${world.missed} blocked · ${world.bestMultiplier}× best multiplier`);
  txt('best-score', `PERSONAL BEST ${best} · ${world.cuts} ropes snipped`);
  const p = $<HTMLCanvasElement>('result-portrait'), c = p.getContext('2d')!;
  c.clearRect(0, 0, p.width, p.height);
  drawSam(c, 130, 42, celebrating, 0, 1.1);
  for (let i = 0; i < 4; i++) drawFan(c, { id: i, x: [35, 76, 187, 230][i], y: 82, speed: 0, look: i * 13, state: celebrating ? 'through' : 'falling', age: 0, turn: 0 }, 0, .8);
  p.dataset.mood = celebrating ? 'celebrating' : 'exasperated';
  try {
    card = resultImage(world, pageUrl());
    const raw = atob(card.toDataURL('image/png').split(',')[1]);
    cardFile = new File([Uint8Array.from(raw, v => v.charCodeAt(0))], `proper-massive-price-cut-${world.score}.png`, { type: 'image/png' });
  } catch { card = null; cardFile = null; txt('share-status', 'Image unavailable. You can still share your score link.'); }
  $('replay').focus({ preventScroll: true });
}
$('share').onclick = async () => {
  const trackShare = roundEventTracker();
  trackShare('share_initiated', { score: world.score, stars: starsForScore(world.score) });
  const plain: ShareData = { title: 'Proper Massive Price Cut', text: `${world.score} points. ${starsForScore(world.score)}/3 stars. ${world.passed} fans through. ${world.bestMultiplier}× multiplier. Can you open the gates?`, url: pageUrl() };
  try {
    if (navigator.share) {
      let payload = plain;
      try { const image = { ...plain, files: cardFile ? [cardFile] : [] }; if (cardFile && navigator.canShare?.(image)) payload = image; } catch { /* Link share is still usable. */ }
      await navigator.share(payload); trackShare('share_dialog_closed'); txt('share-status', 'Share dialog closed. Your next round is waiting.');
    } else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(`${plain.text}\n${plain.url}`); trackShare('share_link_copied'); txt('share-status', 'Score and link copied. Send them wherever you like.'); }
    else txt('share-status', `Share this page: ${pageUrl()}`);
  } catch (e) { const cancelled = e instanceof DOMException && e.name === 'AbortError'; trackShare(cancelled ? 'share_cancelled' : 'share_failed'); txt('share-status', cancelled ? 'Sharing canceled. Your score stays here.' : 'Sharing unavailable. Save the card or copy the page address.'); }
};
$('save').onclick = () => {
  if (!card) { txt('share-status', 'Card unavailable. Copy the page address to share.'); return; }
  try { const a = document.createElement('a'); a.href = card.toDataURL('image/png'); a.download = `price-cut-${world.score}.png`; a.click(); trackRoundEvent('result_save_requested', { score: world.score }); txt('share-status', 'Score card download requested.'); }
  catch { txt('share-status', 'Saving unavailable. Your score and replay are still here.'); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('You left the game. The clock is paused.'); last = performance.now(); });
window.addEventListener('blur', () => pause('Game paused while you were away.'));
window.addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || dialogs.some(d => d.open)) return;
  const key = e.key.toLowerCase();
  if (key === 'p' || key === 'escape') { e.preventDefault(); pause(); }
  else if (key === 'h') { e.preventDefault(); openDialog('help-dialog'); }
  else if (key === 'r') { e.preventDefault(); start(); }
});
function updateUi() {
  txt('score', String(world.score)); txt('fans', String(world.passed)); txt('multiplier', `${world.multiplier}×`); txt('time', String(Math.ceil(world.time)));
  const stars = starsForScore(world.score), next = STAR_TARGETS.find(target => target > world.score);
  txt('stars', '★'.repeat(stars) + '☆'.repeat(3 - stars)); $('stars').setAttribute('aria-label', `${stars} out of 3 stars`);
  txt('star-progress', next ? `Next ★ at ${next} · ${next - world.score} to go` : '3 STARS · KEEP SCORING!');
  $('time').classList.toggle('urgent', world.time < 11);
  const ready = Math.round((1 - world.cooldown / COOLDOWN) * 100);
  $('recharge').style.transform = `scaleX(${ready / 100})`;
  $('recharge').parentElement!.setAttribute('aria-valuenow', String(ready));
  if (ready === 100) $('recharge').parentElement!.classList.remove('blocked');
  txt('ready-label', ready === 100 ? 'SCISSORS READY' : 'RECHARGING'); txt('message', world.message);
  $<HTMLButtonElement>('pause').disabled = world.phase !== 'playing';
  Object.assign(canvas.dataset, { phase: world.phase, paused: String(paused), score: String(world.score), stars: String(stars), passed: String(world.passed), missed: String(world.missed), multiplier: String(world.multiplier), cuts: String(world.cuts), swipes: String(world.swipes), time: world.time.toFixed(2), cooldown: world.cooldown.toFixed(2), reach: '150' });
}
function frame(now: number) {
  const dt = Math.max(0, (now - last) / 1000); last = now;
  if (world.phase === 'playing' && !paused) {
    if (dt > .75) pause('A browser interruption paused the game. Continue when ready.');
    else { advance(world, dt); if (world.time === 0) { clearGesture(); settling = .7; } }
  } else if (world.phase === 'ended' && settling > 0) {
    const tail = Math.min(.05, dt); settle(world, tail); settling -= tail;
    if (settling <= 0) finish();
  }
  for (const event of world.sounds.splice(0)) {
    if (event.kind === 'cut') sound.cut(); else if (event.kind === 'laugh') sound.laugh();
    else if (event.kind === 'combo') sound.combo(event.amount); else sound.pass(event.amount);
  }
  updateUi();
  const { dpr, scale, ox, oy, width, height } = metrics;
  context.setTransform(dpr, 0, 0, dpr, 0, 0); context.fillStyle = '#13363f'; context.fillRect(0, 0, width, height);
  context.translate(ox, oy); context.scale(scale, scale); render(context, world, world.elapsed, gesture?.path ?? null);
  requestAnimationFrame(frame);
}
const analyticsToggle = $<HTMLInputElement>('analytics-enabled');
analyticsToggle.checked = analyticsEnabled();
analyticsToggle.disabled = !analyticsConfigured;
analyticsToggle.onchange = () => { setAnalyticsEnabled(analyticsToggle.checked); analyticsToggle.checked = analyticsEnabled(); };
resize(); requestAnimationFrame(frame); trackLoaded();
