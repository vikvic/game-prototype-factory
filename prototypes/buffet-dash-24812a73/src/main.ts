import './style.css';
import { mountShell } from './shell';
import { drawRoom, drawWall, drawRange, drawStation, drawTable, drawPlayer, drawKeyPrompt, drawDialog, drawMinimap, minimapRect, plateLayout, drawPlatePopup, drawPlateHud, drawRing, eatButton, drawEatButton, text, type Facing } from './art';
import { WORLD, VIEW, walls, signs, counterRect, tableRects, setObstacles, move } from './world'; // world.ts also exports findPath (A*), kept for future use
type Point = {x:number;y:number};
type Food = Point & {name:string;color:string;w:number;h:number;value:number;serve:number;eat:number;role:string};
type Portion = {food:Food;x:number;y:number;w:number;h:number;eaten:number};
// World positions in a 1440x880 hall (see world.ts for walls and doorways).
// Timing tune (2026-10-22): serve = half the original, eat = original / 3.
const foods:Food[] = [
 {name:'Berry bites',color:'#ef8293',x:260,y:690,w:1,h:1,value:7,serve:0.35,eat:1/3,role:'Nearby · gap filler'},
 {name:'Golden rolls',color:'#eec46b',x:240,y:190,w:2,h:1,value:19,serve:0.7,eat:2/3,role:'Quick staple'},
 {name:'Green skewers',color:'#a1c777',x:720,y:180,w:1,h:3,value:30,serve:0.9,eat:2.8/3,role:'Long & lean'},
 {name:'Sushi pair',color:'#7acac4',x:1200,y:150,w:2,h:1,value:28,serve:0.85,eat:2.3/3,role:'Far · efficient'},
 {name:'Royal roast',color:'#c89bda',x:1220,y:720,w:2,h:2,value:48,serve:1.75,eat:5.2/3,role:'Premium · bulky'}
];
const table:Point={x:720,y:650},spawn:Point={x:table.x,y:table.y-58}; // spawn just behind the table, inside home range
setObstacles([...foods.map(counterRect),...tableRects(table)]);
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!;
const keys=new Set<string>(),moves=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
const steps:Record<string,[number,number]>={w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
let player={...spawn},state:'ready'|'playing'|'ended'='ready';
let remaining=100,score=0,last=performance.now(),plate:Portion[]=[];
let selected:Food|null=null,rotated=false,cursor=0,eating=false;
// Stand still next to a station for DWELL seconds to open the plate popup. Locked after cancel/serve until the player moves.
const DWELL=1;let dwell=0,dwellLock=false;
let drag:{dx:number;dy:number;moved:boolean;onFood:boolean}|null=null;
let serving:{portion:Portion;elapsed:number}|null=null;
let facing:Facing='down',walk=0,moving=false;
let message='Press Enter to start. Collect → fit → return home → eat to score.';
const paused=mountShell(VIEW.w/VIEW.h,()=>{keys.clear();last=performance.now();});
const secs=(n:number)=>`${+n.toFixed(2)}s`; // eat times are thirds, show 2 decimals
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=()=>foods.find(f=>dist(player,f)<102);
const home=()=>dist(player,table)<78;
const value=()=>plate.reduce((n,p)=>n+p.food.value,0);
const medal=()=>score>=450?'GOLD':score>=320?'SILVER':score>=200?'BRONZE':'NO MEDAL';
const txt=(id:string,v:string)=>{const e=$(id);if(e.textContent!==v)e.textContent=v;};
const view=()=>({scale:canvas.clientWidth/VIEW.w,compact:canvas.clientWidth<600});
// Camera keeps the player centred in the area left of the minimap/plate column, so the HUD never covers them.
const camera=()=>{const {compact,scale}=view(),avail=VIEW.w-minimapRect(compact,scale,WORLD).w-20;
 return {x:Math.max(0,Math.min(WORLD.w-avail,player.x-avail/2)),y:Math.max(0,Math.min(WORLD.h-VIEW.h,player.y-VIEW.h/2)),w:VIEW.w,h:VIEW.h};};
const dimensions=()=>selected?{w:rotated?selected.h:selected.w,h:rotated?selected.w:selected.h}:{w:1,h:1};
function fits(x:number,y:number,w:number,h:number){return x>=0&&y>=0&&x+w<=4&&y+h<=3&&!plate.some(p=>x<p.x+p.w&&x+w>p.x&&y<p.y+p.h&&y+h>p.y);}
function suggestion(){const {w,h}=dimensions();for(let i=0;i<12;i++)if(fits(i%4,Math.floor(i/4),w,h))return i;return -1;}
// Keep the cursor's footprint inside the 4x3 plate.
function clampCursor(i:number){const {w,h}=dimensions();return Math.min(Math.floor(i/4),3-h)*4+Math.min(i%4,4-w);}
function reset(start=false){state=start?'playing':'ready';remaining=100;score=0;player={...spawn};plate=[];selected=null;serving=null;eating=false;rotated=false;cursor=0;dwell=0;dwellLock=false;drag=null;keys.clear();facing='down';walk=0;moving=false;last=performance.now();message=start?'Walk to a station with WASD / arrows, then stand still or press E to serve.':'Press Enter to start. Collect → fit → return home → eat to score.';ui();}
function cancel(){if(selected||serving){dwellLock=true;dwell=0;}selected=null;serving=null;eating=false;drag=null;message='Canceled. Food already on your plate is kept.';ui();}
// Opening the placement popup locks movement until the food is placed or canceled.
function choose(){const food=near();if(state!=='playing'||!food||serving)return;selected=food;rotated=false;eating=false;keys.clear();moving=false;dwell=0;let s=suggestion();if(s<0&&food.w!==food.h){rotated=true;s=suggestion();if(s<0)rotated=false;}cursor=clampCursor(s<0?0:s);message=`Place ${food.name}: drag the food or use WASD / arrows; tap it or press E to place. R rotates, F auto-places, Esc cancels.`;ui();}
function rotate(){if(!selected||selected.w===selected.h)return;rotated=!rotated;cursor=clampCursor(cursor);ui();}
function moveCursor(dx:number,dy:number){if(!selected)return;const {w,h}=dimensions();const x=Math.max(0,Math.min(4-w,cursor%4+dx)),y=Math.max(0,Math.min(3-h,Math.floor(cursor/4)+dy));cursor=y*4+x;ui();}
function place(i:number){
 if(state!=='playing'||!selected||serving)return;
 if(dist(player,selected)>=102){message='Return to this station to serve.';ui();return;}
 const {w,h}=dimensions(),x=i%4,y=Math.floor(i/4);
 if(i<0||!fits(x,y,w,h)){message='Does not fit. Move the cursor, R to rotate, F to auto-place, or Esc. Nothing lost.';ui();return;}
 serving={portion:{food:selected,x,y,w,h,eaten:0},elapsed:0};selected=null;drag=null;message='Serving… hold on, the plate closes when it is ready. Esc cancels.';ui();
}
function eat(){if(state!=='playing'||!home()||!plate.length||serving)return;selected=null;eating=true;message='Eating in pickup order. Each finished portion banks points.';ui();}
// E / the Eat button doubles as Place while the popup is open.
// E at a counter starts the same 1s ring (even right after a cancel/serve); the popup opens when it fills.
function startRing(){if(state!=='playing'||selected||serving||!near())return;dwellLock=false;if(dwell<=0)dwell=0.001;}
const act=()=>selected?place(cursor):near()&&!serving?startRing():eat();
// Touch / mouse inside the plate popup only: drag the food (or tap a cell) to move it, tap the food to place it.
const canEat=()=>state==='playing'&&home()&&plate.length>0&&!serving&&!eating&&!selected;
function screenPt(e:PointerEvent){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*VIEW.w,y:(e.clientY-r.top)/r.height*VIEW.h};}
function eatBtn(){const {compact,scale}=view();return eatButton(compact,scale,minimapRect(compact,scale,WORLD));}
function cellAt(e:PointerEvent){
 const {x:sx,y:sy}=screenPt(e),{scale,compact}=view(),L=plateLayout(compact,scale);
 const x=Math.floor((sx-L.gx)/L.cell),y=Math.floor((sy-L.gy)/L.cell);return x>=0&&x<4&&y>=0&&y<3?{x,y}:null;
}
canvas.onpointerdown=e=>{
 if(paused()||serving)return;
 // On-screen EAT button (touch / mouse) when the popup is closed.
 if(!selected){const p=screenPt(e),b=eatBtn();if(state==='playing'&&Math.hypot(p.x-b.cx,p.y-b.cy)<=b.r*1.15){e.preventDefault();eat();}return;}
 const c=cellAt(e);if(!c)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
 const {w,h}=dimensions(),cx=cursor%4,cy=Math.floor(cursor/4),onFood=c.x>=cx&&c.x<cx+w&&c.y>=cy&&c.y<cy+h;
 if(onFood)drag={dx:c.x-cx,dy:c.y-cy,moved:false,onFood:true};else{drag={dx:0,dy:0,moved:true,onFood:false};cursor=clampCursor(c.y*4+c.x);ui();}
};
canvas.onpointermove=e=>{if(!drag||!selected)return;const c=cellAt(e);if(!c)return;const n=clampCursor(Math.max(0,c.y-drag.dy)*4+Math.max(0,c.x-drag.dx));if(n!==cursor){cursor=n;drag.moved=true;ui();}};
canvas.onpointerup=()=>{if(drag&&selected&&drag.onFood&&!drag.moved)place(cursor);drag=null;};
canvas.onpointercancel=()=>{drag=null;};
// Keyboard. Enter start · Backspace restart · H help (shell.ts) · WASD/arrows move · E serve (starts ring) / eat / place
// · R rotate · F auto-place · Esc cancel. (Pointer only in the popup and on the EAT button.)
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();if(paused())return;
 if(k==='backspace'){e.preventDefault();reset(true);return;}
 if(state!=='playing'){if(k==='enter'&&!e.repeat){e.preventDefault();reset(true);}return;}
 if(serving){if(steps[k])e.preventDefault();if(k==='escape')cancel();return;} // serving: popup stays up, only Esc
 if(selected){ // placement popup owns the controls
  if(steps[k]){e.preventDefault();moveCursor(...steps[k]);return;}
  if(e.repeat)return;if(k==='e')act();if(k==='r')rotate();if(k==='f')place(suggestion());if(k==='escape')cancel();return;
 }
 if(moves.includes(k)){e.preventDefault();keys.add(k);return;}
 if(e.repeat)return;
 if(k==='e')act();if(k==='escape')cancel();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
function ui(){
 txt('time',`${Math.ceil(remaining)}s`);txt('score',`${score}`);
 txt('status',message);
 if(canvas.dataset.phase!==state)canvas.dataset.phase=state;
 const f=near(),{w,h}=dimensions();
 txt('prompt',state==='ready'?'Your table is home. Press Enter to start.':state==='ended'?`${medal()} · ${score} banked · ${value()} uneaten · Enter to play again`:selected?`Placing ${selected.name} · ${w}×${h}`:f?`${f.name} · ${f.value} pts · ${f.w}×${f.h} · E to serve`:home()?'Home table · E to eat':'Walk with WASD / arrows to a station or back to your table');
}
// Which key to press right now, shown above the player.
function keyHint():[string,string][]|null{
 if(state!=='playing'||selected||serving)return null;
 if(near())return [['E','Serve']];
 if(home()&&plate.length&&!eating)return [['E','Eat']];
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
  if(!compact){text(ctx,`${f.value} pts · ${f.w}×${f.h} · serve ${secs(f.serve)}`,f.x,f.y+56,12,'#4b5a52',600);text(ctx,`eat ${secs(f.eat)} · ${f.role}`,f.x,f.y+72,12,'#4b5a52',600);}
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
 if(state==='playing'&&!selected&&!serving){const pr=eating&&plate[0]?plate[0].eaten/plate[0].food.eat:0;drawEatButton(ctx,eatBtn(),canEat()?'ready':eating?'eating':'off',pr,now,compact?10/scale:13);}
 drawMinimap(ctx,m,WORLD,walls,foods.map(f=>({...counterRect(f),color:f.color})),tableRects(table)[0],player,cam);
 // Plate HUD sits directly under the minimap.
 const q=serving?.portion,progress=serving?serving.elapsed/serving.portion.food.serve:eating&&plate[0]?plate[0].eaten/plate[0].food.eat:0;
 drawPlateHud(ctx,{x:m.x,y:m.y+m.h+8,w:m.w},compact?10/scale:12,`${compact?'':'Plate '}${value()} pts · ${12-plate.reduce((n,p)=>n+p.w*p.h,0)}/12${compact?'':' free'}`,
  plate.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,color:p.food.color,label:`${p.food.value}`})),q?{x:q.x,y:q.y,w:q.w,h:q.h}:null,
  serving?`Serving · ${Math.max(0,serving.portion.food.serve-serving.elapsed).toFixed(1)}s`:eating&&plate[0]?`Eating · ${Math.round(progress*100)}%`:plate.length?(home()?'Tap EAT or press E':'Go home to eat'):'Empty plate',progress);
 const blocks=plate.map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,color:p.food.color,label:`${p.food.value}`}));
 if(selected&&state==='playing'){
  const {w,h}=dimensions(),x=cursor%4,y=Math.floor(cursor/4);
  drawPlatePopup(ctx,plateLayout(compact,scale),`Place ${selected.name} · ${w}×${h} · ${selected.value} pts`,'Drag the food to move it · tap it to place',blocks,
   {x,y,w,h,color:selected.color,label:`${selected.value}`,ok:fits(x,y,w,h)},
   [['WASD','Move'],['E','Place'],['R','Rotate'],['F','Auto'],['Esc','Cancel']],null,now);
 }else if(serving&&state==='playing'){ // popup stays up while serving, with the progress bar on it
  const q=serving.portion,left=Math.max(0,q.food.serve-serving.elapsed);
  drawPlatePopup(ctx,plateLayout(compact,scale),`Serving ${q.food.name} · ${left.toFixed(1)}s`,'Hold on, plating up…',blocks,
   {x:q.x,y:q.y,w:q.w,h:q.h,color:q.food.color,label:`${q.food.value}`,ok:true},[['Esc','Cancel']],serving.elapsed/q.food.serve,now);
 }
 if(state!=='playing')drawDialog(ctx,state==='ready'?'100 seconds. One hungry diner.':`${medal()} · ${score} points banked`,state==='ready'?'Collect → fit → return home → eat to score.':`${value()} points left uneaten. Try another route.`,state==='ready'?[['Enter','Start'],['H','Help']]:[['Enter','Play again'],['H','Help']],now);
}
function frame(now:number){
 const elapsed=Math.max(0,(now-last)/1000);last=now;
 if(state==='playing'&&!paused()){
  const dt=Math.min(elapsed,remaining),moveDt=Math.min(dt,0.05);remaining=Math.max(0,remaining-dt);
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(selected||serving){dx=0;dy=0;} // plate popup open (placing or serving): no walking
  const length=Math.hypot(dx,dy);moving=length>0;
  if(length>0){
   facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');walk+=moveDt*14;dwell=0;dwellLock=false;
   if(serving){serving=null;message='Serve canceled by movement. No portion added.';}if(eating){eating=false;message='Eating stopped. Return home and press E to resume your partial bite.';}
   const step=190*moveDt;
   move(player,dx/length*step,dy/length*step);
  }else if(serving){serving.elapsed+=dt;if(serving.elapsed>=serving.portion.food.serve){plate.push(serving.portion);message=`${serving.portion.food.name} packed. Add more or return home.`;serving=null;dwellLock=true;}}
  else if(eating&&home()){
   dwell=0;let budget=dt;while(budget>0&&plate.length){const p=plate[0],bite=Math.min(budget,p.food.eat-p.eaten);p.eaten+=bite;budget-=bite;if(p.eaten>=p.food.eat){score+=p.food.value;plate.shift();message=`+${p.food.value} banked! ${plate.length?'Next portion…':'Plate clear. Go again!'}`;}else break;}if(!plate.length)eating=false;
  }else{const f=near();if(f&&!selected&&!dwellLock){dwell+=dt;if(dwell>=DWELL)choose();}else dwell=0;}
  if(remaining<=0){state='ended';moving=false;keys.clear();selected=null;serving=null;eating=false;message=`Time! ${score} points scored. ${value()} points uneaten. Only fully eaten portions count.`;}
 }else moving=false;
 ui();draw(now);requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
