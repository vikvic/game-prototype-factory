import './style.css';
import { mountShell } from './shell';
import { drawRoom, drawRange, drawStation, drawTable, drawPlayer, drawBubble, drawDialog, text, type Facing } from './art';
type Point = {x:number;y:number};
type Food = Point & {name:string;color:string;w:number;h:number;value:number;serve:number;eat:number;role:string};
type Portion = {food:Food;x:number;y:number;w:number;h:number;eaten:number};
const foods:Food[] = [
 {name:'Berry bites',color:'#ef8293',x:155,y:350,w:1,h:1,value:7,serve:0.7,eat:1,role:'Nearby · gap filler'},
 {name:'Golden rolls',color:'#eec46b',x:165,y:120,w:2,h:1,value:19,serve:1.4,eat:2,role:'Quick staple'},
 {name:'Green skewers',color:'#a1c777',x:445,y:100,w:1,h:3,value:30,serve:1.8,eat:2.8,role:'Long & lean'},
 {name:'Sushi pair',color:'#7acac4',x:730,y:125,w:2,h:1,value:28,serve:1.7,eat:2.3,role:'Far · efficient'},
 {name:'Royal roast',color:'#c89bda',x:730,y:365,w:2,h:2,value:48,serve:3.5,eat:5.2,role:'Premium · bulky'}
];
const table:Point={x:390,y:405},spawn:Point={x:table.x,y:table.y-58}; // spawn just behind the table, inside home range
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!;
const keys=new Set<string>(),moves=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
let player={...spawn},target:Point|null=null,state:'ready'|'playing'|'ended'='ready';
let remaining=100,score=0,last=performance.now(),plate:Portion[]=[];
let selected:Food|null=null,rotated=false,hover=-1,eating=false;
let serving:{portion:Portion;elapsed:number}|null=null;
let facing:Facing='down',walk=0,moving=false;
let message='Start when ready. Collect → fit → return home → eat to score.';
const paused=mountShell(900/520,()=>{keys.clear();target=null;last=performance.now();});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=()=>foods.find(f=>dist(player,f)<102);
const home=()=>dist(player,table)<78;
const value=()=>plate.reduce((n,p)=>n+p.food.value,0);
const medal=()=>score>=450?'GOLD':score>=320?'SILVER':score>=200?'BRONZE':'NO MEDAL';
const txt=(id:string,v:string)=>{const e=$(id);if(e.textContent!==v)e.textContent=v;};
const dimensions=()=>selected?{w:rotated?selected.h:selected.w,h:rotated?selected.w:selected.h}:{w:1,h:1};
function fits(x:number,y:number,w:number,h:number){return x>=0&&y>=0&&x+w<=4&&y+h<=3&&!plate.some(p=>x<p.x+p.w&&x+w>p.x&&y<p.y+p.h&&y+h>p.y);}
function suggestion(){const {w,h}=dimensions();for(let i=0;i<12;i++)if(fits(i%4,Math.floor(i/4),w,h))return i;return -1;}
function reset(start=false){state=start?'playing':'ready';remaining=100;score=0;player={...spawn};target=null;plate=[];selected=null;serving=null;eating=false;rotated=false;hover=-1;keys.clear();facing='down';walk=0;moving=false;last=performance.now();message=start?'Walk to a station, then choose Serve.':'Start when ready. Collect → fit → return home → eat to score.';ui();}
function cancel(){selected=null;serving=null;eating=false;hover=-1;message='Canceled. Food already on your plate is kept.';ui();}
function choose(){const food=near();if(state!=='playing'||!food||serving)return;selected=food;rotated=false;eating=false;target=null;message=`Place ${food.name}: click its top-left cell or Auto-place. Dashed cells suggest a fit.`;ui();}
function place(i:number){
 if(state!=='playing'||!selected||serving)return;
 if(dist(player,selected)>=102){message='Return to this station to serve.';ui();return;}
 const {w,h}=dimensions(),x=i%4,y=Math.floor(i/4);
 if(i<0||!fits(x,y,w,h)){message='Does not fit. Try another cell, Rotate, or Cancel. Nothing lost.';ui();return;}
 serving={portion:{food:selected,x,y,w,h,eaten:0},elapsed:0};selected=null;target=null;message='Serving… stay still. Moving cancels this portion.';ui();
}
function eat(){if(state!=='playing'||!home()||!plate.length||serving)return;selected=null;target=null;eating=true;message='Eating in pickup order. Each finished portion banks points.';ui();}
for(let i=0;i<12;i++){const b=document.createElement('button');b.type='button';b.className='cell';b.setAttribute('aria-label',`Plate row ${Math.floor(i/4)+1}, column ${i%4+1}`);b.onclick=()=>place(i);b.onpointerenter=()=>{hover=i;ui();};b.onpointerleave=()=>{hover=-1;ui();};$('plate').append(b);}
$('start').onclick=()=>reset(true);$('restart').onclick=()=>reset(true);$('serve').onclick=choose;$('eat').onclick=eat;$('cancel').onclick=cancel;
$('rotate').onclick=()=>{rotated=!rotated;ui();};$('auto').onclick=()=>place(suggestion());
canvas.onpointerdown=e=>{if(state!=='playing'||paused())return;const r=canvas.getBoundingClientRect();target={x:Math.max(22,Math.min(878,(e.clientX-r.left)/r.width*900)),y:Math.max(22,Math.min(498,(e.clientY-r.top)/r.height*520))};canvas.focus({preventScroll:true});};
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(paused())return;if(moves.includes(k)){e.preventDefault();if(state==='playing'){keys.add(k);target=null;}}if(e.repeat)return;if(k==='e')eat();if(k==='q')choose();if(k==='escape')cancel();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();target=null;});document.addEventListener('visibilitychange',()=>{keys.clear();target=null;});
function ui(){
 txt('time',`${Math.ceil(remaining)}s`);txt('score',`${score}`);txt('value',`${value()} pts`);
 txt('space',`${12-plate.reduce((n,p)=>n+p.w*p.h,0)}/12 free`);
 txt('status',message);
 if(canvas.dataset.phase!==state)canvas.dataset.phase=state;
 const f=near();txt('prompt',state==='ready'?'Your table is home. Ready for a quick feast?':state==='ended'?`${medal()} · ${score} banked · ${value()} uneaten`:selected?`Placing ${selected.name} · ${dimensions().w}×${dimensions().h}`:f?`${f.name} · ${f.value} pts · ${f.w}×${f.h}`:home()?'Home table · eat here to bank points':'Walk to a station or return to your table');
 $<HTMLButtonElement>('start').hidden=state!=='ready';
 $<HTMLButtonElement>('serve').disabled=state!=='playing'||!f||!!serving;
 $<HTMLButtonElement>('rotate').disabled=!selected||selected.w===selected.h;
 $<HTMLButtonElement>('auto').disabled=!selected;
 $<HTMLButtonElement>('cancel').disabled=!selected&&!serving&&!eating;
 $<HTMLButtonElement>('eat').disabled=state!=='playing'||!home()||!plate.length||!!serving||eating;
 const progress=serving?serving.elapsed/serving.portion.food.serve:eating&&plate[0]?plate[0].eaten/plate[0].food.eat:0;
 $<HTMLProgressElement>('progress').value=progress;
 txt('activity',serving?`Serving ${serving.portion.food.name} · ${Math.max(0,serving.portion.food.serve-serving.elapsed).toFixed(1)}s`:eating&&plate[0]?`Eating ${plate[0].food.name} · ${Math.round(progress*100)}%`:f?`${f.serve}s serve · ${f.eat}s eat`:'Ready · partial bites resume');
 const anchor=hover>=0?hover:suggestion(),{w,h}=dimensions();
 Array.from($('plate').children).forEach((child,i)=>{
  const b=child as HTMLButtonElement,x=i%4,y=Math.floor(i/4),p=plate.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h),q=serving?.portion;
  const reserved=q&&x>=q.x&&x<q.x+q.w&&y>=q.y&&y<q.y+q.h;
  const preview=selected&&anchor>=0&&x>=anchor%4&&x<anchor%4+w&&y>=Math.floor(anchor/4)&&y<Math.floor(anchor/4)+h;
  const bg=p?p.food.color:reserved?'#c5bba4':'',cls=`cell${preview?fits(anchor%4,Math.floor(anchor/4),w,h)?' fit':' bad':''}`;
  const aria=`Plate row ${y+1}, column ${x+1}${p?`, ${p.food.name}, ${p.food.value} points`:reserved?', serving':', empty'}`;
  const label=p?(x===p.x&&y===p.y?`${p.food.value}`:'●'):reserved?'…':'·',title=p?`${p.food.name}: ${p.food.value} pts, ${p.food.eat}s eating`:'Place top-left corner here';
  const sig=[bg,cls,aria,label,title].join('|');if(b.dataset.sig===sig)return;b.dataset.sig=sig; // skip unchanged cells
  b.style.background=bg;b.className=cls;b.setAttribute('aria-label',aria);b.textContent=label;b.title=title;
 });
}
function draw(now:number){
 const scale=canvas.clientWidth/900,compact=canvas.clientWidth<600;
 const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==900*dpr||canvas.height!==520*dpr){canvas.width=900*dpr;canvas.height=520*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);
 drawRoom(ctx,compact,table);
 for(const f of foods)drawRange(ctx,f,dist(player,f)<102);
 if(target){ctx.strokeStyle='#426d66';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(target.x,target.y+16,10,5,0,0,Math.PI*2);ctx.stroke();}
 // Depth sort: things lower on screen draw in front (player can stand behind a counter).
 const items:{y:number;draw:()=>void}[]=foods.map(f=>({y:f.y-10,draw:()=>{
  drawStation(ctx,f,compact,scale);
  if(!compact){text(ctx,`${f.value} pts · ${f.w}×${f.h} · serve ${f.serve}s`,f.x,f.y+56,12,'#4b5a52',600);text(ctx,`eat ${f.eat}s · ${f.role}`,f.x,f.y+72,12,'#4b5a52',600);}
 }}));
 items.push({y:table.y-10,draw:()=>{drawTable(ctx,table,compact,scale);if(!compact)text(ctx,'E / Eat to score',table.x,table.y+56,12,'#2f5d50',700);}});
 items.push({y:player.y+18,draw:()=>{
  drawPlayer(ctx,player.x,player.y,facing,walk,moving);
  if(!compact&&!(state==='playing'&&near()&&!selected&&!serving))text(ctx,'YOU',player.x,player.y-36,11,'#263c39',800);
 }});
 items.sort((a,b)=>a.y-b.y).forEach(i=>i.draw());
 if(state==='playing'&&near()&&!selected&&!serving)drawBubble(ctx,player.x+16,player.y-42);
 if(state!=='playing')drawDialog(ctx,state==='ready'?'100 seconds. One hungry diner.':`${medal()} · ${score} points banked`,state==='ready'?'Press Start. The clock waits for you.':`${value()} points left uneaten · Restart for another route`,now);
}
function frame(now:number){
 const elapsed=Math.max(0,(now-last)/1000);last=now;
 if(state==='playing'&&!paused()){
  const dt=Math.min(elapsed,remaining),moveDt=Math.min(dt,0.05);remaining=Math.max(0,remaining-dt);
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(!dx&&!dy&&target){dx=target.x-player.x;dy=target.y-player.y;if(Math.hypot(dx,dy)<2){target=null;dx=0;dy=0;}}
  const length=Math.hypot(dx,dy);moving=length>0;
  if(length>0){
   facing=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');walk+=moveDt*14;
   if(serving){serving=null;message='Serve canceled by movement. No portion added.';}if(eating){eating=false;message='Eating stopped. Return home and press Eat to resume your partial bite.';}
   const step=target?Math.min(length,190*moveDt):190*moveDt;player.x=Math.max(22,Math.min(878,player.x+dx/length*step));player.y=Math.max(22,Math.min(498,player.y+dy/length*step));
   if(selected&&dist(player,selected)>=102){selected=null;message='Placement canceled: you left the station.';}
  }else if(serving){serving.elapsed+=dt;if(serving.elapsed>=serving.portion.food.serve){plate.push(serving.portion);message=`${serving.portion.food.name} packed. Add more or return home.`;serving=null;}}
  else if(eating&&home()){
   let budget=dt;while(budget>0&&plate.length){const p=plate[0],bite=Math.min(budget,p.food.eat-p.eaten);p.eaten+=bite;budget-=bite;if(p.eaten>=p.food.eat){score+=p.food.value;plate.shift();message=`+${p.food.value} banked! ${plate.length?'Next portion…':'Plate clear. Go again!'}`;}else break;}if(!plate.length)eating=false;
  }
  if(remaining<=0){state='ended';moving=false;keys.clear();target=null;selected=null;serving=null;eating=false;message=`Time! ${score} points scored. ${value()} points uneaten. Only fully eaten portions count.`;}
 }else moving=false;
 ui();draw(now);requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
