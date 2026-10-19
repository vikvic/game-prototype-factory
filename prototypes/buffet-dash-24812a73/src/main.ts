import './style.css';
import { mountShell } from './shell';
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
const table:Point={x:390,y:405};
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!;
const keys=new Set<string>(),moves=['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'];
let player={...table},target:Point|null=null,state:'ready'|'playing'|'ended'='ready';
let remaining=100,score=0,last=performance.now(),plate:Portion[]=[];
let selected:Food|null=null,rotated=false,hover=-1,eating=false;
let serving:{portion:Portion;elapsed:number}|null=null;
let message='Start when ready. Collect → fit → return home → eat to score.';
const paused=mountShell(900/520,()=>{keys.clear();target=null;last=performance.now();});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=()=>foods.find(f=>dist(player,f)<102);
const home=()=>dist(player,table)<78;
const value=()=>plate.reduce((n,p)=>n+p.food.value,0);
const medal=()=>score>=450?'GOLD':score>=320?'SILVER':score>=200?'BRONZE':'NO MEDAL';
const dimensions=()=>selected?{w:rotated?selected.h:selected.w,h:rotated?selected.w:selected.h}:{w:1,h:1};
function fits(x:number,y:number,w:number,h:number){return x>=0&&y>=0&&x+w<=4&&y+h<=3&&!plate.some(p=>x<p.x+p.w&&x+w>p.x&&y<p.y+p.h&&y+h>p.y);}
function suggestion(){const {w,h}=dimensions();for(let i=0;i<12;i++)if(fits(i%4,Math.floor(i/4),w,h))return i;return -1;}
function reset(start=false){state=start?'playing':'ready';remaining=100;score=0;player={...table};target=null;plate=[];selected=null;serving=null;eating=false;rotated=false;hover=-1;keys.clear();last=performance.now();message=start?'Walk to a station, then choose Serve.':'Start when ready. Collect → fit → return home → eat to score.';ui();}
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
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(paused())return;if(moves.includes(k)){e.preventDefault();if(state==='playing'){keys.add(k);target=null;}}if(e.repeat)return;if(k==='e')eat();if(k==='escape')cancel();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();target=null;});document.addEventListener('visibilitychange',()=>{keys.clear();target=null;});
function ui(){
 $('time').textContent=`${Math.ceil(remaining)}s`;$('score').textContent=`${score}`;$('value').textContent=`${value()} pts`;
 $('space').textContent=`${12-plate.reduce((n,p)=>n+p.w*p.h,0)}/12 free`;
 if($('status').textContent!==message)$('status').textContent=message;
 canvas.dataset.phase=state;
 const f=near();$('prompt').textContent=state==='ready'?'Your table is home. Ready for a quick feast?':state==='ended'?`${medal()} · ${score} banked · ${value()} uneaten`:selected?`Placing ${selected.name} · ${dimensions().w}×${dimensions().h}`:f?`${f.name} · ${f.value} pts · ${f.w}×${f.h}`:home()?'Home table · eat here to bank points':'Walk to a station or return to your table';
 $<HTMLButtonElement>('start').hidden=state!=='ready';
 $<HTMLButtonElement>('serve').disabled=state!=='playing'||!f||!!serving;
 $<HTMLButtonElement>('rotate').disabled=!selected||selected.w===selected.h;
 $<HTMLButtonElement>('auto').disabled=!selected;
 $<HTMLButtonElement>('cancel').disabled=!selected&&!serving&&!eating;
 $<HTMLButtonElement>('eat').disabled=state!=='playing'||!home()||!plate.length||!!serving||eating;
 const progress=serving?serving.elapsed/serving.portion.food.serve:eating&&plate[0]?plate[0].eaten/plate[0].food.eat:0;
 $<HTMLProgressElement>('progress').value=progress;
 $('activity').textContent=serving?`Serving ${serving.portion.food.name} · ${Math.max(0,serving.portion.food.serve-serving.elapsed).toFixed(1)}s`:eating&&plate[0]?`Eating ${plate[0].food.name} · ${Math.round(progress*100)}%`:f?`${f.serve}s serve · ${f.eat}s eat`:'Ready · partial bites resume';
 const anchor=hover>=0?hover:suggestion(),{w,h}=dimensions();
 Array.from($('plate').children).forEach((child,i)=>{
  const b=child as HTMLButtonElement,x=i%4,y=Math.floor(i/4),p=plate.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h),q=serving?.portion;
  const reserved=q&&x>=q.x&&x<q.x+q.w&&y>=q.y&&y<q.y+q.h;
  const preview=selected&&anchor>=0&&x>=anchor%4&&x<anchor%4+w&&y>=Math.floor(anchor/4)&&y<Math.floor(anchor/4)+h;
  b.style.background=p?p.food.color:reserved?'#c5bba4':'';b.className=`cell${preview?fits(anchor%4,Math.floor(anchor/4),w,h)?' fit':' bad':''}`;
  b.setAttribute('aria-label',`Plate row ${y+1}, column ${x+1}${p?`, ${p.food.name}, ${p.food.value} points`:reserved?', serving':', empty'}`);
  b.textContent=p?(x===p.x&&y===p.y?`${p.food.value}`:'●'):reserved?'…':'·';b.title=p?`${p.food.name}: ${p.food.value} pts, ${p.food.eat}s eating`:'Place top-left corner here';
 });
}
function label(text:string,x:number,y:number,size=16,color='#263c39'){ctx.fillStyle=color;ctx.font=`600 ${size}px system-ui`;ctx.textAlign='center';ctx.fillText(text,x,y);}
function draw(){
 const scale=canvas.clientWidth/900,compact=canvas.clientWidth<600;
 const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==900*dpr||canvas.height!==520*dpr){canvas.width=900*dpr;canvas.height=520*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#f3eddd';ctx.fillRect(0,0,900,520);ctx.strokeStyle='#e4ddcc';ctx.lineWidth=1;
 for(let x=0;x<900;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,520);ctx.stroke();}for(let y=0;y<520;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
 if(!compact)label('THE BUFFET',450,28,13,'#8c9382');
 for(const f of foods){
  ctx.beginPath();ctx.arc(f.x,f.y,100,0,Math.PI*2);ctx.fillStyle=dist(player,f)<102?'#ffffffa0':'#ffffff30';ctx.fill();
  ctx.fillStyle='#d9d0bc';ctx.fillRect(f.x-94,f.y-39,188,100);ctx.fillStyle=f.color;ctx.fillRect(f.x-94,f.y-45,188,94);
  ctx.fillStyle='#ffffffcc';ctx.fillRect(f.x-24,f.y-35,48,24);for(let i=0;i<f.w;i++)for(let j=0;j<f.h;j++){ctx.fillStyle=f.color;ctx.fillRect(f.x-17+i*14,f.y-31+j*6,11,5);}
  label(f.name,f.x,f.y+7,compact?10/scale:17);
  if(!compact){label(`${f.value} pts · ${f.w}×${f.h} · serve ${f.serve}s`,f.x,f.y+29,12);label(`eat ${f.eat}s · ${f.role}`,f.x,f.y+76,12);}
 }
 ctx.beginPath();ctx.arc(table.x,table.y,76,0,Math.PI*2);ctx.fillStyle='#c7dcd0';ctx.fill();ctx.fillStyle='#284d44';ctx.fillRect(table.x-65,table.y-35,130,70);label(compact?'HOME':'HOME TABLE',table.x,table.y-10,compact?10/scale:15,'#fff');if(!compact)label('E / Eat to score',table.x,table.y+17,13,'#d3f1dc');
 if(target){ctx.strokeStyle='#426d66';ctx.lineWidth=2;ctx.beginPath();ctx.arc(target.x,target.y,9,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle='#00000025';ctx.beginPath();ctx.ellipse(player.x,player.y+17,17,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f7fbef';ctx.strokeStyle='#264f48';ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x,player.y,15,0,Math.PI*2);ctx.fill();ctx.stroke();if(!compact)label('YOU',player.x,player.y-24,11);
 if(state!=='playing'){ctx.fillStyle='#143c35ed';ctx.fillRect(0,195,900,135);label(state==='ready'?'100 seconds. One hungry diner.':`${medal()} · ${score} points banked`,450,245,28,'#fff7df');label(state==='ready'?'Press Start. The clock waits for you.':`${value()} points left uneaten · Restart for another route`,450,286,18,'#e4ecda');}
}
function frame(now:number){
 const elapsed=Math.max(0,(now-last)/1000);last=now;
 if(state==='playing'&&!paused()){
  const dt=Math.min(elapsed,remaining),moveDt=Math.min(dt,0.05);remaining=Math.max(0,remaining-dt);
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  if(!dx&&!dy&&target){dx=target.x-player.x;dy=target.y-player.y;if(Math.hypot(dx,dy)<2){target=null;dx=0;dy=0;}}
  const length=Math.hypot(dx,dy);
  if(length>0){
   if(serving){serving=null;message='Serve canceled by movement. No portion added.';}if(eating){eating=false;message='Eating stopped. Return home and press Eat to resume your partial bite.';}
   const step=target?Math.min(length,190*moveDt):190*moveDt;player.x=Math.max(22,Math.min(878,player.x+dx/length*step));player.y=Math.max(22,Math.min(498,player.y+dy/length*step));
   if(selected&&dist(player,selected)>=102){selected=null;message='Placement canceled: you left the station.';}
  }else if(serving){serving.elapsed+=dt;if(serving.elapsed>=serving.portion.food.serve){plate.push(serving.portion);message=`${serving.portion.food.name} packed. Add more or return home.`;serving=null;}}
  else if(eating&&home()){
   let budget=dt;while(budget>0&&plate.length){const p=plate[0],bite=Math.min(budget,p.food.eat-p.eaten);p.eaten+=bite;budget-=bite;if(p.eaten>=p.food.eat){score+=p.food.value;plate.shift();message=`+${p.food.value} banked! ${plate.length?'Next portion…':'Plate clear. Go again!'}`;}else break;}if(!plate.length)eating=false;
  }
  if(remaining<=0){state='ended';keys.clear();target=null;selected=null;serving=null;eating=false;message=`Time! ${score} points scored. ${value()} points uneaten. Only fully eaten portions count.`;}
 }
 ui();draw();requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
