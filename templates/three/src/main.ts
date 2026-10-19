import * as THREE from 'three';
import './style.css';
import { mountShell } from './shell';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const scoreText = document.querySelector<HTMLElement>('#score')!;
const timeText = document.querySelector<HTMLElement>('#time')!;
const statusText = document.querySelector<HTMLElement>('#status')!;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#101b30');
const camera = new THREE.PerspectiveCamera(48, 1.5, 0.1, 100);
camera.position.set(0, 19, 15); camera.lookAt(0, 0, 0);
let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch {
  statusText.textContent = 'WebGL is unavailable. Try a browser with hardware acceleration enabled.';
  throw new Error('WebGL renderer unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
scene.add(new THREE.AmbientLight(0xc4d8ff, 2));
const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(4, 12, 8); scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(21, 15), new THREE.MeshStandardMaterial({ color: 0x17263c, roughness: 0.8 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; scene.add(floor);
const grid = new THREE.GridHelper(20, 20, 0x39546c, 0x24384f); scene.add(grid);
const player = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x7ce3d0, emissive: 0x173f38 }));
scene.add(player);
const drone = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), new THREE.MeshStandardMaterial({ color: 0xf68780, emissive: 0x571e22 }));
scene.add(drone);
const salvage: THREE.Mesh[] = [];
const gemGeometry = new THREE.OctahedronGeometry(0.32);
const gemMaterial = new THREE.MeshStandardMaterial({ color: 0xe4c66b, emissive: 0x594a12, metalness: 0.2 });
for (let i = 0; i < 12; i++) { const gem = new THREE.Mesh(gemGeometry, gemMaterial); gem.position.set(-7.5 + (i % 4) * 5, 0.5, -5 + Math.floor(i / 4) * 5); scene.add(gem); salvage.push(gem); }
const keys = new Set<string>(), ray = new THREE.Raycaster(), point = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let pointerTarget: THREE.Vector3 | null = null;
let score = 0, remaining = 45, ended = false, elapsed = 0, last = performance.now();
const paused=mountShell(3/2,()=>{keys.clear();pointerTarget=null;last=performance.now();});
function reset() {
  player.position.set(0, 0.4, 0); drone.position.set(6, 0.65, 0);
  salvage.forEach(gem => gem.visible = true); score = 0; remaining = 45; elapsed = 0; ended = false; pointerTarget = null;
  statusText.textContent = 'Collect all salvage. Avoid the patrolling drone.'; last = performance.now();
}
function pointer(event: PointerEvent) {
  const bounds = canvas.getBoundingClientRect();
  point.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
  ray.setFromCamera(point, camera); pointerTarget = ray.ray.intersectPlane(plane, new THREE.Vector3());
}
canvas.addEventListener('pointerdown', event => { if(paused())return;canvas.focus({preventScroll:true}); canvas.setPointerCapture(event.pointerId); pointer(event); });
canvas.addEventListener('pointermove', event => { if (canvas.hasPointerCapture(event.pointerId)) pointer(event); });
canvas.addEventListener('pointerup', () => pointerTarget = null);
canvas.addEventListener('pointercancel', () => pointerTarget = null);
window.addEventListener('keydown', event => { if(paused())return;const key = event.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) { event.preventDefault(); keys.add(key); } if (key === 'r') reset(); });
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointerTarget = null; });
document.querySelector('#restart')!.addEventListener('click', reset);
const size = new THREE.Vector2();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.04); last = now;
  if (!ended && !document.hidden && !paused()) {
    remaining = Math.max(0, remaining - dt); elapsed += dt;
    let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let dz = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (!dx && !dz && pointerTarget) { dx = pointerTarget.x - player.position.x; dz = pointerTarget.z - player.position.z; if (Math.hypot(dx, dz) < 0.1) { dx = 0; dz = 0; } }
    const length = Math.hypot(dx, dz) || 1, step = pointerTarget && !keys.size ? Math.min(7 * dt, length) : 7 * dt;
    player.position.x = THREE.MathUtils.clamp(player.position.x + dx / length * step, -9.5, 9.5);
    player.position.z = THREE.MathUtils.clamp(player.position.z + dz / length * step, -6.5, 6.5);
    drone.position.set(Math.cos(elapsed * (0.65 + score * 0.025)) * 6, 0.65, Math.sin(elapsed * (0.65 + score * 0.025)) * 4.5);
    for (const gem of salvage) { gem.rotation.y += dt; if (gem.visible && Math.hypot(gem.position.x - player.position.x, gem.position.z - player.position.z) < 0.9) { gem.visible = false; score++; } }
    if (Math.hypot(player.position.x - drone.position.x, player.position.z - drone.position.z) < 1 || remaining <= 0) { ended = true; statusText.textContent = 'Run ended. Restart for another route.'; }
    else if (score === 12) { ended = true; statusText.textContent = 'Salvage secured. Restart to play again.'; }
  }
  const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
  renderer.getSize(size);
  if (size.x !== width || size.y !== height) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  scoreText.textContent = `${score} / 12`; timeText.textContent = `${Math.ceil(remaining)}s`;
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
reset(); requestAnimationFrame(frame);
