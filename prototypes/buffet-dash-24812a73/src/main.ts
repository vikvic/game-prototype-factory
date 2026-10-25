import './style.css';
import { mountShell } from './shell';
import { drawRoom, drawWall, drawRange, drawStation, drawTable, drawPlayer, drawKeyPrompt, drawDialog, drawMinimap, minimapRect, plateLayout, drawPlatePopup, drawPlateHud, drawRing, eatButton, drawEatButton, drawJoystick, feastLayout, drawFeast, text, type Facing } from './art';
import { sfx, unlock, isMuted, setMuted } from './sound';
import { BEAT, startFeast, press, release, update as feastUpdate, stop as feastStop, done as feastDone, progress as feastProgress, type Feast } from './feast';
import { WORLD, VIEW, walls, signs, counterRect, tableRects, setObstacles, move } from './world'; // world.ts also exports findPath (A*), kept for future use
type Point = {x:number;y:number};
type Cells = [number,number][];
// cells (optional): footprint cells inside the w×h box for non-rectangular food; omitted = full rectangle.
type Food = Point & {name:string;color:string;w:number;h:number;cells?:Cells;value:number;serve:number;bites:string;role:string}; // bites: Feast pattern, one per cell ('T' tap, 'H' hold)
type Portion = {food:Food;x:number;y:number;w:number;h:number;cells:Cells;grades:number[];bites:string;bonus:boolean};
type Shape = {w:number;h:number;cells:Cells};
const rectCells=(w:number,h:number):Cells=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)] as [number,number]);
const turn=(s:Shape):Shape=>({w:s.h,h:s.w,cells:s.cells.map(([x,y])=>[s.h-1-y,x] as [number,number])}); // 90° clockwise
const key=(s:Shape)=>s.cells.map(c=>c.join(',')).sort().join(' ');
// Distinct orientations of a food: 1 (square), 2 (rectangle), 4 (L).
function orientations(f:Food):Shape[]{const out:Shape[]=[];let s:Shape={w:f.w,h:f.h,cells:f.cells??rectCells(f.w,f.h)};for(let i=0;i<4;i++){if(!out.some(o=>key(o)===key(s)))out.push(s);s=turn(s);}return out;}
const sizeLabel=(f:Food)=>f.cells?`${f.cells.length}-cell L`:`${f.w}×${f.h}`;
// Full-plate bonus: when all 12 cells are filled, every portion on the plate scores ×FULL_BONUS (rounded per portion).
// 1.25 ≈ break-even+: an average full plate is ~123 pts (84–168 over all packings); topping up the last cell with a
// berry detour costs ~7 s ≈ 31 pts at Gold pace (4.5 pts/s) minus the berry's 7 → ~25 net, and 0.25×123 ≈ +31.
const FULL_BONUS=1.25;
// World positions in a 1440x880 hall (see world.ts for walls and doorways).
// Timing tune (2026-10-22): serve = half the original. Eating is the Feast rhythm game: one 0.4 s beat per cell.
const foods:Food[] = [
 {name:'Berry bites',color:'#ef8293',x:260,y:690,w:1,h:1,value:7,serve:0.35,bites:'T',role:'Nearby · gap filler'},
 {name:'Golden rolls',color:'#eec46b',x:240,y:190,w:2,h:1,value:19,serve:0.7,bites:'TT',role:'Quick staple'},
 {name:'Green skewers',color:'#a1c777',x:720,y:180,w:1,h:3,value:30,serve:0.9,bites:'TTT',role:'Long & lean'},
 // Chicken leg (thigh + drumstick) replaces Sushi pair: a 3-cell L in a 2×2 box at sushi's 14 pts/cell = 42;
 // serve/eat scaled per cell from sushi (×3/2).
 {name:'Chicken leg',color:'#e58a5a',x:1220,y:720,w:2,h:2,cells:[[0,0],[0,1],[1,1]],value:42,serve:0.85*3/2,bites:'TTH',role:'Thigh & drumstick L'},
 {name:'Royal roast',color:'#c89bda',x:1200,y:150,w:2,h:2,value:48,serve:1.75,bites:'HHTT',role:'Far · premium · bulky'}
];
const table:Point={x:720,y:650},spawn:Point={x:table.x,y:table.y-58}; // spawn just behind the table, inside home range
setObstacles([...foods.map(counterRect),...tableRects(table)]);
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!;
const keys=new Set<string>(),moves=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
const steps:Record<string,[number,number]>={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
let player={...spawn},state:'ready'|'playing'|'ended'='ready';
let remaining=100,score=0,last=performance.now(),plate:Portion[]=[];
let selected:Food|null=null,rot=0,cursor=0,feast:Feast|null=null;
// Stand still next to a station for DWELL seconds to open the plate popup. Locked after cancel/serve until the player moves.
const DWELL=1;let dwell=0,dwellLock=false;
let drag:{dx:number;dy:number;moved:boolean;onFood:boolean}|null=null;
// Touch mode: on for coarse pointers or after any touch; a keyboard key switches back. Desktop stays keyboard-only.
let touchMode=false,joy:{id:number;ox:number;oy:number;x:number;y:number;sx:number;sy:number;on:boolean}|null=null;
// Joystick: start moving above JOY_ON of the radius, stop only below JOY_OFF (hysteresis), input lightly smoothed.
const JOY_ON=0.25,JOY_OFF=0.12,JOY_SMOOTH=0.04;
function setTouch(on:boolean){if(touchMode===on)return;touchMode=on;document.documentElement.classList.toggle('touch',on);joy=null;}
setTouch(matchMedia('(pointer: coarse)').matches);
document.addEventListener('pointerdown',e=>{unlock();if(e.pointerType==='touch'||e.pointerType==='pen')setTouch(true);},{capture:true});
window.addEventListener('keydown',()=>unlock(),{capture:true});
let serving:{portion:Portion;elapsed:number}|null=null;
let facing:Facing='down',walk=0,moving=false;
let message='Press any key or tap to start. Collect → fit → return home → eat to score.';
// Start / play again on any input, but only once START_DELAY has passed on the ready/end screen (no accidental restarts).
const START_DELAY=1000;let screenSince=performance.now();
const canStart=()=>state!=='playing'&&performance.now()-screenSince>=START_DELAY;
const paused=mountShell(VIEW.w/VIEW.h,()=>{keys.clear();joy=null;last=performance.now();},()=>draw(performance.now()));
const secs=(n:number)=>`${+n.toFixed(2)}s`; // eat times are thirds, show 2 decimals
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=()=>foods.find(f=>dist(player,f)<102);
const home=()=>dist(player,table)<78;
const pts=(p:Portion)=>p.bonus?Math.round(p.food.value*FULL_BONUS):p.food.value;
const value=()=>plate.reduce((n,p)=>n+pts(p),0);
const medal=()=>score>=450?'GOLD':score>=320?'SILVER':score>=200?'BRONZE':'NO MEDAL';
const txt=(id:string,v:string)=>{const e=$(id);if(e.textContent!==v)e.textContent=v;};
const view=()=>({scale:canvas.clientWidth/VIEW.w,compact:canvas.clientWidth<600});
// Camera keeps the player centred in the area left of the minimap/plate column, so the HUD never covers them.
// Usable width left of the HUD column. It depends on canvas scale, so a resize (mobile browser bar) changes it;
// easing it avoids a one-frame camera jump. Player movement is still followed directly.
let availS=-1;
const availTarget=()=>{const {compact,scale}=view();return VIEW.w-minimapRect(compact,scale,WORLD).w-20;};
function easeAvail(dt:number){const t=availTarget();availS=availS<0?t:availS+(t-availS)*Math.min(1,dt*10);}
const camera=()=>{if(availS<0)easeAvail(0);const avail=availS;
 return {x:Math.max(0,Math.min(WORLD.w-avail,player.x-avail/2)),y:Math.max(0,Math.min(WORLD.h-VIEW.h,player.y-VIEW.h/2)),w:VIEW.w,h:VIEW.h};};
const dimensions=():Shape=>selected?orientations(selected)[rot%orientations(selected).length]:{w:1,h:1,cells:[[0,0]]};
const used=()=>plate.reduce((n,p)=>n+p.cells.length,0);
// A shape fits when every one of its cells is on the 4×3 plate and not already occupied.
function fits(x:number,y:number,sh:Shape){const occ=new Set(plate.flatMap(p=>p.cells.map(([a,b])=>(p.y+b)*4+p.x+a)));
 return sh.cells.every(([a,b])=>x+a>=0&&y+b>=0&&x+a<4&&y+b<3&&!occ.has((y+b)*4+x+a));}
function suggestion(){const sh=dimensions();for(let i=0;i<12;i++)if(fits(i%4,Math.floor(i/4),sh))return i;return -1;}
// Keep the cursor's footprint inside the 4x3 plate.
function clampCursor(i:number){const {w,h}=dimensions();return Math.min(Math.floor(i/4),3-h)*4+Math.min(i%4,4-w);}
function reset(start=false){state=start?'playing':'ready';remaining=100;score=0;player={...spawn};plate=[];selected=null;serving=null;feast=null;rot=0;cursor=0;dwell=0;dwellLock=false;drag=null;keys.clear();facing='down';walk=0;moving=false;last=performance.now();message=start?'Walk to a station with WASD / arrows, then stand still or press E to serve.':'Press any key or tap to start. Collect → fit → return home → eat to score.';if(!start)screenSince=performance.now();ui();}
function cancel(){if(feast){stopFeast();return;}if(selected||serving){dwellLock=true;dwell=0;}selected=null;serving=null;drag=null;message='Canceled. Food already on your plate is kept.';ui();}
// Opening the placement popup locks movement until the food is placed or canceled.
function choose(){const food=near();if(state!=='playing'||!food||serving)return;selected=food;rot=0;keys.clear();moving=false;dwell=0;let s=suggestion();for(let r=1;s<0&&r<orientations(food).length;r++){rot=r;s=suggestion();}if(s<0)rot=0;cursor=clampCursor(s<0?0:s);message=`Place ${food.name}: drag the food or use WASD / arrows; tap it or press E to place. R rotates, F auto-places, Esc cancels.`;ui();}
function rotate(){if(!selected||orientations(selected).length<2)return;rot=(rot+1)%orientations(selected).length;cursor=clampCursor(cursor);ui();}
function moveCursor(dx:number,dy:number){if(!selected)return;const {w,h}=dimensions();const x=Math.max(0,Math.min(4-w,cursor%4+dx)),y=Math.max(0,Math.min(3-h,Math.floor(cursor/4)+dy));cursor=y*4+x;ui();}
function place(i:number){
 if(state!=='playing'||!selected||serving)return;
 if(dist(player,selected)>=102){message='Return to this station to serve.';ui();return;}
 const sh=dimensions(),{w,h}=sh,x=i%4,y=Math.floor(i/4);
 if(i<0||!fits(x,y,sh)){message='Does not fit. Move the cursor, R to rotate, F to auto-place, or Esc. Nothing lost.';ui();return;}
 serving={portion:{food:selected,x,y,w,h,cells:sh.cells,grades:[],bites:selected.bites,bonus:false},elapsed:0};selected=null;drag=null;message='Serving… hold on, the plate closes when it is ready. Esc cancels.';ui();
}
// Eating = Feast: bite on the beat (E / touch), hold for long notes. Grades multiply each portion's points.
function eat(){if(state!=='playing'||!home()||!plate.length||serving||feast)return;selected=null;keys.clear();moving=false;feast=startFeast(plate);message='Feast! Bite on the beat: E or tap, hold for long notes. Esc stops.';ui();}
// Play queued Feast sound cues (called right after input and every frame).
function feastSounds(){if(!feast)return;for(const {e} of feast.events.splice(0))if(e==='hit-perfect'||e==='hit-good')sfx.munch();}
function stopFeast(){if(!feast)return;feastStop(feast);bankEaten();feast=null;message='Feast stopped. Partly eaten food stays on your plate; press E at home to resume.';ui();}
// Bank every fully eaten portion at the front of the plate: value × average bite grade (× full-plate bonus).
function bankEaten(){
 while(plate[0]&&plate[0].grades.length===plate[0].bites.length&&plate[0].grades.every(g=>g!=null)){
  const p=plate[0],avg=p.grades.reduce((a,b)=>a+b,0)/p.grades.length,got=Math.round(p.food.value*avg*(p.bonus?FULL_BONUS:1));
  score+=got;plate.shift();message=`+${got} banked (bites ×${avg.toFixed(2)}${p.bonus?`, full plate ×${FULL_BONUS}`:''})! ${plate.length?'Keep biting…':'Plate clear. Go again!'}`;
 }
}
// E / the Eat button doubles as Place while the popup is open.
// E at a counter starts the same 1s ring (even right after a cancel/serve); the popup opens when it fills.
function startRing(){if(state!=='playing'||selected||serving||!near())return;dwellLock=false;if(dwell<=0)dwell=0.001;}
const act=()=>selected?place(cursor):near()&&!serving?startRing():eat();
// Touch / mouse inside the plate popup only: drag the food (or tap a cell) to move it, tap the food to place it.
const canEat=()=>state==='playing'&&home()&&plate.length>0&&!serving&&!feast&&!selected;
function screenPt(e:PointerEvent){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*VIEW.w,y:(e.clientY-r.top)/r.height*VIEW.h};}
function eatBtn(){const {compact,scale}=view();return eatButton(compact,scale,minimapRect(compact,scale,WORLD));}
function cellAt(e:PointerEvent){
 const {x:sx,y:sy}=screenPt(e),{scale,compact}=view(),L=plateLayout(compact,scale);
 const x=Math.floor((sx-L.gx)/L.cell),y=Math.floor((sy-L.gy)/L.cell);return x>=0&&x<4&&y>=0&&y<3?{x,y}:null;
}
const joyR=()=>{const {compact,scale}=view();return compact?48/scale:64;};
const playRight=()=>{const {compact,scale}=view();return minimapRect(compact,scale,WORLD).x-10;}; // left of the HUD column
canvas.onpointerdown=e=>{
 if(paused())return;const p=screenPt(e),isTouch=e.pointerType!=='mouse';
 if(state!=='playing'){if(canStart()){e.preventDefault();reset(true);}return;} // any tap or click starts / plays again
 if(feast){e.preventDefault();canvas.setPointerCapture(e.pointerId);press(feast);feastSounds();return;} // Feast: tap anywhere to bite (hold for long notes)
 if(serving)return;
 if(selected){ // popup: drag the food (or tap a cell) to move it, tap the food to place it
  const c=cellAt(e);if(!c)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const cx=cursor%4,cy=Math.floor(cursor/4),onFood=dimensions().cells.some(([a,b])=>c.x===cx+a&&c.y===cy+b);
  if(onFood)drag={dx:c.x-cx,dy:c.y-cy,moved:false,onFood:true};else{drag={dx:0,dy:0,moved:true,onFood:false};cursor=clampCursor(c.y*4+c.x);ui();}
  return;
 }
 // Canvas action button (desktop / keyboard mode; touch mode uses the #t-action button on the right).
 const b=eatBtn();if(!touchMode&&Math.hypot(p.x-b.cx,p.y-b.cy)<=b.r*1.15){e.preventDefault();near()?startRing():eat();return;}
 // Floating joystick: touch anywhere on the map left of the HUD column.
 if(isTouch&&!joy&&p.x<playRight()){e.preventDefault();canvas.setPointerCapture(e.pointerId);joy={id:e.pointerId,ox:p.x,oy:p.y,x:p.x,y:p.y,sx:0,sy:0,on:false};}
};
canvas.onpointermove=e=>{
 if(joy&&e.pointerId===joy.id){const p=screenPt(e);joy.x=p.x;joy.y=p.y;return;}
 if(!drag||!selected)return;const c=cellAt(e);if(!c)return;const n=clampCursor(Math.max(0,c.y-drag.dy)*4+Math.max(0,c.x-drag.dx));if(n!==cursor){cursor=n;drag.moved=true;ui();}
};
canvas.onpointerup=e=>{if(feast){release(feast);feastSounds();return;}if(joy&&e.pointerId===joy.id){joy=null;return;}if(drag&&selected&&drag.onFood&&!drag.moved)place(cursor);drag=null;};
canvas.onpointercancel=e=>{if(feast)release(feast);if(joy&&e.pointerId===joy.id)joy=null;drag=null;};
// Touch buttons (only visible in touch mode): header Help / Restart / Full screen, Start, popup Place / Rotate / Auto / Cancel.
const helpDialog=document.querySelector<HTMLDialogElement>('#help-dialog')!;
$('t-help').onclick=()=>{keys.clear();joy=null;helpDialog.showModal();};
$('t-help-close').onclick=()=>helpDialog.close();
$('t-restart').onclick=()=>reset(true);
function toggleSound(){setMuted(!isMuted());txt('t-sound',isMuted()?'Sound off':'Sound on');message=isMuted()?'Sound off (M to turn on).':'Sound on (M to mute).';ui();}
$('t-sound').onclick=toggleSound;txt('t-sound',isMuted()?'Sound off':'Sound on');
$('t-start').onclick=()=>{if(canStart())reset(true);};
$('t-action').onclick=()=>{near()?startRing():eat();};
$('t-place').onclick=()=>place(cursor);$('t-rotate').onclick=rotate;$('t-auto').onclick=()=>place(suggestion());$('t-cancel').onclick=cancel;
// Full screen (+ landscape lock where supported). iPhone Safari has no element fullscreen, so the button hides there.
const docEl=document.documentElement as HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>};
const fsDoc=document as Document&{webkitFullscreenEnabled?:boolean;webkitFullscreenElement?:Element;webkitExitFullscreen?:()=>Promise<void>};
const fsOK=!!(document.fullscreenEnabled||fsDoc.webkitFullscreenEnabled);
$<HTMLButtonElement>('t-full').hidden=!fsOK;
$('t-full').onclick=async()=>{
 try{
  if(document.fullscreenElement||fsDoc.webkitFullscreenElement){await (document.exitFullscreen?.()??fsDoc.webkitExitFullscreen?.());return;}
  await (docEl.requestFullscreen?.()??docEl.webkitRequestFullscreen?.());
  await (screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>}).lock?.('landscape');
 }catch{/* orientation lock is optional */}
};
document.addEventListener('fullscreenchange',()=>txt('t-full',document.fullscreenElement?'Exit full screen':'Full screen'));
// Keyboard. Any key start (after 1 s) · Backspace restart · H help (shell.ts) · WASD/arrows move · E serve (starts ring) / eat / place
// · R rotate · F auto-place · Esc cancel. (Pointer only in the popup and on the EAT button.)
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(k!=='h')setTouch(false);if(paused())return;
 if(k==='m'&&!e.repeat){toggleSound();return;} // M: mute / unmute
 if(k==='backspace'){e.preventDefault();reset(true);return;}
 if(state!=='playing'){if(canStart()&&!e.repeat&&!['h','shift','control','alt','meta','capslock','tab'].includes(k)){e.preventDefault();reset(true);}return;} // any key (not H/modifiers)
 if(feast){if(steps[k]||k==='e')e.preventDefault();if(k==='e'&&!e.repeat){press(feast);feastSounds();}if(k==='escape')stopFeast();return;} // Feast owns the controls
 if(serving){if(steps[k])e.preventDefault();if(k==='escape')cancel();return;} // serving: popup stays up, only Esc
 if(selected){ // placement popup owns the controls
  if(steps[k]){e.preventDefault();moveCursor(...steps[k]);return;}
  if(e.repeat)return;if(k==='e')act();if(k==='r')rotate();if(k==='f')place(suggestion());if(k==='escape')cancel();return;
 }
 if(moves.includes(k)){e.preventDefault();keys.add(k);return;}
 if(e.repeat)return;
 if(k==='e')act();if(k==='escape')cancel();
});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(feast&&k==='e'){release(feast);feastSounds();}});
window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
function ui(){
 txt('time',`${Math.ceil(remaining)}s`);txt('score',`${score}`);
 txt('status',message);
 if(canvas.dataset.phase!==state)canvas.dataset.phase=state;
 const f=near(),sh=dimensions(),{w,h}=sh;
 const tb=(id:string,show:boolean,dis=false)=>{const b=$<HTMLButtonElement>(id);if(b.hidden===show)b.hidden=!show;if(b.disabled!==dis)b.disabled=dis;};
 tb('t-start',state!=='playing',!canStart());txt('t-start',state==='ended'?'Play again':'Start');
 {const nf=near(),show=state==='playing'&&!selected&&!serving&&!feast;tb('t-action',show,!(nf||canEat()));
  txt('t-action',nf?'Serve':'Eat');}
 tb('t-place',!!selected,!(!!selected&&fits(cursor%4,Math.floor(cursor/4),sh)));tb('t-rotate',!!selected,!selected||orientations(selected).length<2);tb('t-auto',!!selected);tb('t-cancel',!!selected||!!serving||!!feast);txt('t-cancel',feast?'Stop':'Cancel');
 txt('prompt',state==='ready'?'Your table is home. Press any key or tap to start.':state==='ended'?`${medal()} · ${score} banked · ${value()} uneaten · any key to play again`:selected?`Placing ${selected.name} · ${selected.cells?sizeLabel(selected):`${w}×${h}`}`:f?`${f.name} · ${f.value} pts · ${sizeLabel(f)} · E to serve`:home()?'Home table · E to eat':touchMode?'Drag on the map to walk to a counter or back to your table':'Walk with WASD / arrows to a station or back to your table');
}
// Which key to press right now, shown above the player.
function keyHint():[string,string][]|null{
 if(state!=='playing'||selected||serving)return null;
 if(near())return touchMode?[['','Hold still or tap Serve →']]:[['E','Serve']];
 if(feast)return null;
 if(home()&&plate.length)return touchMode?[['','Tap Eat →']]:[['E','Eat']];
 return null;
}
function draw(now:number){
 const {scale,compact}=view(),cam=camera();
 const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==VIEW.w*dpr||canvas.height!==VIEW.h*dpr){canvas.width=VIEW.w*dpr;canvas.height=VIEW.h*dpr;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#10252a';ctx.fillRect(0,0,VIEW.w,VIEW.h); // outside the hall
 ctx.setTransform(dpr,0,0,dpr,-cam.x*dpr,-cam.y*dpr); // world space, camera follows the player
 drawRoom(ctx,table,{x:cam.x,y:cam.y,w:Math.min(cam.w,WORLD.w-cam.x),h:Math.min(cam.h,WORLD.h-cam.y)});
 for(const f of foods)drawRange(ctx,f,dist(player,f)<102);
 // Depth sort: things lower on screen draw in front (player can stand behind a counter or wall).
 const items:{y:number;draw:()=>void}[]=walls.map(w=>({y:w.y+w.h,draw:()=>drawWall(ctx,w,compact,signs)}));
 for(const f of foods)items.push({y:f.y-10,draw:()=>{
  drawStation(ctx,f,compact,scale);
  if(!compact){text(ctx,`${f.value} pts · ${sizeLabel(f)} · serve ${secs(f.serve)}`,f.x,f.y+56,12,'#4b5a52',600);text(ctx,`${f.bites.length} bite${f.bites.length>1?'s':''} · ${f.role}`,f.x,f.y+72,12,'#4b5a52',600);}
 }});
 items.push({y:table.y-10,draw:()=>{drawTable(ctx,table,compact,scale);if(!compact)text(ctx,'E / Eat to score',table.x,table.y+56,12,'#2f5d50',700);}});
 items.push({y:player.y+18,draw:()=>{
  drawPlayer(ctx,player.x,player.y,facing,walk,moving);
  if(!compact&&!keyHint())text(ctx,'YOU',player.x,player.y-36,11,'#263c39',800);
 }});
 items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
 const nf=near();if(dwell>0&&nf)drawRing(ctx,player.x,player.y-8,30,dwell/DWELL,nf.color); // dwell-to-serve ring, on top
 const hint=keyHint();if(hint)drawKeyPrompt(ctx,player.x,player.y-52,hint,compact?10/scale:13);
 ctx.setTransform(dpr,0,0,dpr,0,0); // screen space overlays
 const m=minimapRect(compact,scale,WORLD);
 if(state==='playing'&&!selected&&!serving&&!feast&&!touchMode){drawEatButton(ctx,eatBtn(),near()?'serve':canEat()?'ready':'off',0,now,touchMode?0:compact?10/scale:13);}
 if(state==='playing'&&touchMode&&!selected&&!serving&&!feast)drawJoystick(ctx,joy,{x:joyR()+24,y:VIEW.h-joyR()-24},joyR(),compact?10/scale:13);
 drawMinimap(ctx,m,WORLD,walls,foods.map(f=>({...counterRect(f),color:f.color})),tableRects(table)[0],player,cam);
 // Plate HUD sits directly under the minimap.
 const q=serving?.portion,progress=serving?serving.elapsed/serving.portion.food.serve:feast?feastProgress(feast):0;
 drawPlateHud(ctx,{x:m.x,y:m.y+m.h+8,w:m.w},compact?10/scale:12,`${compact?'':'Plate '}${value()} pts · ${plate.some(p=>p.bonus)?`★×${FULL_BONUS}`:`${12-used()}/12${compact?'':' free'}`}`,
  plate.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,cells:p.cells,color:p.food.color,label:`${pts(p)}`,name:p.food.name})),q?{x:q.x,y:q.y,w:q.w,h:q.h,cells:q.cells}:null,
  serving?`Serving · ${Math.max(0,serving.portion.food.serve-serving.elapsed).toFixed(1)}s`:feast?`Feast · ${Math.round(progress*100)}%`:plate.length?(home()?(touchMode?'Tap EAT':'Tap EAT or press E'):'Go home to eat'):'Empty plate',progress);
 const blocks=plate.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,cells:p.cells,color:p.food.color,label:`${pts(p)}`,name:p.food.name}));
 if(selected&&state==='playing'){
  const sh=dimensions(),{w,h}=sh,x=cursor%4,y=Math.floor(cursor/4);
  drawPlatePopup(ctx,plateLayout(compact,scale),`Place ${selected.name} · ${selected.cells?sizeLabel(selected):`${w}×${h}`} · ${selected.value} pts`,'Drag the food to move it · tap it to place',blocks,
   {x,y,w,h,cells:sh.cells,color:selected.color,label:`${selected.value}`,name:selected.name,ok:fits(x,y,sh)},
   touchMode?[['','Buttons on the right: Place · Rotate · Auto · Cancel']]:[['WASD','Move'],['E','Place'],['R','Rotate'],['F','Auto'],['Esc','Cancel']],null,now);
 }else if(serving&&state==='playing'){ // popup stays up while serving, with the progress bar on it
  const q=serving.portion,left=Math.max(0,q.food.serve-serving.elapsed);
  drawPlatePopup(ctx,plateLayout(compact,scale),`Serving ${q.food.name} · ${left.toFixed(1)}s`,'Hold on, plating up…',blocks,
   {x:q.x,y:q.y,w:q.w,h:q.h,cells:q.cells,color:q.food.color,label:`${q.food.value}`,name:q.food.name,ok:true},touchMode?[['','Cancel button on the right']]:[['Esc','Cancel']],serving.elapsed/q.food.serve,now);
 }
 if(feast&&state==='playing'){ // Feast panel: plate on top (current portion outlined), note lane below
  const F=feast,cur=plate[0];
  drawFeast(ctx,feastLayout(compact,scale),{title:`Feast! ${cur?`· ${cur.food.name}`:''}`,sub:`Perfect ${F.counts.perfect} · Good ${F.counts.good} · Miss ${F.counts.miss}`,
   blocks:plate.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,cells:p.cells,color:p.food.color,label:`${pts(p)}`,name:p.food.name})),current:cur?0:-1,
   notes:F.notes.map(n=>({dt:n.t-F.t,dur:n.dur,hold:n.hold,color:(n.p as Portion).food.color,name:(n.p as Portion).food.name,grade:n.grade,state:n.state})),
   pressing:F.pressing,fx:F.fx.map(x=>({text:x.text,age:F.t-x.at,kind:x.kind})),beat:BEAT,
   keys:touchMode?[['','Tap anywhere to bite · hold for long notes']]:[['E','Bite (hold for long notes)'],['Esc','Stop']],now});
 }
 if(state!=='playing')drawDialog(ctx,state==='ready'?'100 seconds. One hungry diner.':`${medal()} · ${score} points banked`,state==='ready'?'Collect → fit → return home → eat to score.':`${value()} points left uneaten. Try another route.`,!canStart()?[['','Get ready…']]:touchMode?[['',state==='ready'?'Tap to start':'Tap to play again']]:[['',state==='ready'?'Press any key to start':'Press any key to play again'],['H','Help']],now);
}
function frame(now:number){
 const elapsed=Math.max(0,(now-last)/1000);last=now;easeAvail(elapsed);
 if(state==='playing'&&!paused()){
  const dt=Math.min(elapsed,remaining),moveDt=Math.min(dt,0.05);remaining=Math.max(0,remaining-dt);
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(joy){ // smooth the raw finger offset, then apply on/off hysteresis so a resting thumb can't toggle movement
   const R=joyR(),k=1-Math.exp(-elapsed/JOY_SMOOTH);joy.sx+=(joy.x-joy.ox-joy.sx)*k;joy.sy+=(joy.y-joy.oy-joy.sy)*k;
   const l=Math.hypot(joy.sx,joy.sy);joy.on=joy.on?l>R*JOY_OFF:l>R*JOY_ON;
   if(!dx&&!dy&&joy.on&&l>0){const m=Math.min(1,l/R);dx=joy.sx/l*m;dy=joy.sy/l*m;}
  }
  if(selected||serving||feast){dx=0;dy=0;} // plate popup or Feast open: no walking
  const length=Math.hypot(dx,dy);moving=length>0;
  if(length>0){
   { // facing hysteresis: switch axis only when one clearly dominates (20%); near diagonals keep a matching facing
    const hz:Facing=dx>0?'right':'left',vt:Facing=dy>0?'down':'up',ax=Math.abs(dx),ay=Math.abs(dy);
    facing=ax>ay*1.2?hz:ay>ax*1.2?vt:facing===hz||facing===vt?facing:ax>ay?hz:vt;
   }walk+=moveDt*14;dwell=0;dwellLock=false;
   if(serving){serving=null;message='Serve canceled by movement. No portion added.';}
   const step=190*moveDt*Math.min(1,length); // joystick is analog; keys are full speed
   move(player,dx/length*step,dy/length*step);
  }else if(serving){serving.elapsed+=dt;if(serving.elapsed>=serving.portion.food.serve){plate.push(serving.portion);message=`${serving.portion.food.name} packed. Add more or return home.`;
   if(used()===12&&plate.some(p=>!p.bonus)){for(const p of plate)p.bonus=true;message=`Full plate! Everything on it scores ×${FULL_BONUS}. Head home to eat.`;}serving=null;dwellLock=true;}}
  else if(feast){dwell=0;feastUpdate(feast,dt);feastSounds();bankEaten();if(feastDone(feast)){const c=feast.counts;feast=null;message=`Feast done: Perfect ${c.perfect} · Good ${c.good} · Miss ${c.miss}. ${plate.length?'':'Plate clear. Go again!'}`;}
  }else{const f=near();if(f&&!selected&&!dwellLock){dwell+=dt;if(dwell>=DWELL)choose();}else dwell=0;}
  if(remaining<=0){state='ended';screenSince=performance.now();moving=false;keys.clear();selected=null;serving=null;feast=null;message=`Time! ${score} points scored. ${value()} points uneaten. Only fully eaten portions count.`;}
 }else moving=false;
 ui();draw(now);requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
