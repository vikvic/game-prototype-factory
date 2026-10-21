import './style.css';
import { adBreak, tracker } from './services';

export type Edition = { id:string; title:string; subject:string; subtitle:string; description:string; accent:string; background:string; outfit:string; setting:string; result_win:string; result_loss:string; preview:boolean; difficulty:'easy'|'normal'|'hard'; theme?:'classic'|'runway'; mechanic?:'camera-escape'|'wing-escape'; notice?:string; brand:string; release:string; analytics_domain:string; ad_mode:string };
type Vec = { x:number;y:number };
type Photographer = Vec & { angle:number; base:number; phase:number };
const el = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('game'), ctx=canvas.getContext('2d')!;
let edition:Edition;
try { const response=await fetch('./edition.json'); if(!response.ok)throw Error('Edition unavailable');edition=await response.json(); }
catch { el('status').textContent='This edition could not load. Please reload the page.';throw Error('Edition load failed'); }
if(edition.mechanic==='wing-escape'){
  const {bootWings}=await import('./wing-game');bootWings(edition);
}else{
document.title=`${edition.title} · ${edition.brand}`;
for(const id of ['title','subject','subtitle','brand'] as const)el(id).textContent=edition[id];
const notice=edition.notice||(edition.preview?'Fictional preview · original characters':'An independent topical game · original illustrations');
el('preview-label').textContent=notice;
el('help-notice').textContent=notice;
document.body.dataset.theme=edition.theme||'classic';
const runway=edition.theme==='runway';
el('runway-portrait').toggleAttribute('hidden',!runway);
document.querySelector('meta[name="description"]')?.setAttribute('content',edition.description);
const track=tracker(edition.analytics_domain);
let W=960,H=540,phase:'intro'|'playing'|'won'|'lost'='intro',time=90,photos=0,passes=0,exposure=0,cooldown=0,dashing=0,invulnerable=0,elapsed=0,last=0,flash=0,paused=false,adOpportunityUsed=false;
let player:Vec={x:80,y:450}; let tokens:(Vec&{taken:boolean})[]=[]; let cameras:Photographer[]=[];
const keys=new Set<string>();let stick:Vec={x:0,y:0},pointer:number|null=null;
const cover=()=>[{x:300,y:H*.32,w:110,h:H*.15},{x:590,y:H*.56,w:110,h:H*.15}];
function clearInput(){keys.clear();stick={x:0,y:0};pointer=null;el('move-pad').querySelector('i')!.style.display='none';}
function resize(){const b=canvas.getBoundingClientRect();const old=H;H=b.height>b.width?1280:540;player.y*=H/old;for(const item of [...tokens,...cameras])item.y*=H/old;const dpr=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);}
new ResizeObserver(resize).observe(canvas);
function reset(){clearInput();phase='intro';time=90;photos=passes=exposure=cooldown=dashing=invulnerable=elapsed=flash=0;player={x:70,y:H*.84};tokens=[{x:200,y:H*.24,taken:false},{x:480,y:H*.84,taken:false},{x:790,y:H*.30,taken:false}];cameras=[{x:420,y:H*.20,angle:0,base:0,phase:0},{x:760,y:H*.80,angle:Math.PI,base:Math.PI,phase:2},{x:170,y:H*.59,angle:0,base:0,phase:4}];el('intro').hidden=false;el('result').hidden=true;el('share-status').textContent='';el('status').textContent='Collect the passes. Keep your good side off camera.';sync();}
function start(){phase='playing';el('intro').hidden=true;track('Game start');sync();}
function sync(){el('time').textContent=`${Math.ceil(time)}s`;el('passes').textContent=`${passes}/3 passes`;el('photos').textContent=`${photos}/3 photos`;el('exposure').style.width=`${exposure*100}%`;el('cooldown').textContent=cooldown>0?`${cooldown.toFixed(1)}s`:'ready';Object.assign(canvas.dataset,{phase,passes:String(passes),photos:String(photos),paused:String(paused),x:player.x.toFixed(1),y:player.y.toFixed(1),worldHeight:String(H),cooldown:cooldown.toFixed(2),release:edition.release,adMode:edition.ad_mode,exposure:exposure.toFixed(3)});}
function finish(won:boolean){phase=won?'won':'lost';clearInput();el('headline').textContent=won?edition.result_win:edition.result_loss;el('result-detail').textContent=`${edition.subject} · ${Math.round(elapsed)} seconds · ${photos} photos · ${passes}/3 passes`;el('result').hidden=false;track(won?'Round complete':'Round lost');track(elapsed<30?'Play under 30s':elapsed<120?'Play 30-120s':'Play over 120s');sync();}
function dash(){if(phase==='playing'&&!paused&&cooldown<=0){dashing=.23;cooldown=3;track('Dash');}}
function inside(p:Vec,r:{x:number;y:number;w:number;h:number},margin=0){return p.x>r.x-margin&&p.x<r.x+r.w+margin&&p.y>r.y-margin&&p.y<r.y+r.h+margin;}
function blocked(a:Vec,b:Vec){for(let t=.05;t<1;t+=.05)if(cover().some(r=>inside({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},r)))return true;return false;}
function update(dt:number){if(phase!=='playing'||paused)return;time=Math.max(0,time-dt);elapsed+=dt;cooldown=Math.max(0,cooldown-dt);dashing=Math.max(0,dashing-dt);invulnerable=Math.max(0,invulnerable-dt);flash=Math.max(0,flash-dt);let x=stick.x+(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),y=stick.y+(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}const speed=(dashing>0?650:230);const next={x:Math.max(18,Math.min(W-18,player.x+x*speed*dt)),y:Math.max(18,Math.min(H-18,player.y+y*speed*dt))};if(!cover().some(r=>inside({x:next.x,y:player.y},r,14)))player.x=next.x;if(!cover().some(r=>inside({x:player.x,y:next.y},r,14)))player.y=next.y;
let seen=false;const difficulty=edition.difficulty==='hard'?1.2:edition.difficulty==='easy'?.7:1;
for(const c of cameras){c.angle=c.base+Math.sin(elapsed*.6+c.phase)*1.35;const angle=Math.atan2(player.y-c.y,player.x-c.x),difference=Math.atan2(Math.sin(angle-c.angle),Math.cos(angle-c.angle));if(Math.hypot(player.x-c.x,player.y-c.y)<250&&Math.abs(difference)<.43&&!blocked(c,player))seen=true;}
exposure=Math.max(0,Math.min(1,exposure+dt*(seen&&invulnerable<=0?difficulty*.8:-.65)));
if(exposure>=1){photos++;exposure=0;invulnerable=2;flash=.18;el('status').textContent=['','That one is definitely going online.','One more photo and your cover is blown.','Front page. Unfortunate angle.'][photos];}
for(const t of tokens)if(!t.taken&&Math.hypot(player.x-t.x,player.y-t.y)<35){t.taken=true;passes++;el('status').textContent=passes===3?'All passes collected! Head to the green EXIT.':`${passes} pass${passes===1?'':'es'} secured. Keep moving.`;}
if(photos>=3||time<=0)finish(false);else if(passes===3&&player.x>850&&player.y<H*.16)finish(true);sync();}
function roundRect(x:number,y:number,w:number,h:number,r:number,fill:string){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function person(x:number,y:number,angle:number,color:string,star=false){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,14,20,9,0,0,Math.PI*2);ctx.fill();roundRect(-14,-8,28,30,9,color);ctx.fillStyle='#f6cda3';ctx.beginPath();ctx.arc(0,-12,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-11,-17,22,7);if(star){ctx.fillStyle='#111';ctx.fillRect(-10,-11,20,4);ctx.fillStyle='#ffe0a3';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('★',0,-32);}else{roundRect(8,0,18,13,3,'#0a111d');ctx.fillStyle='#dfe8f9';ctx.fillRect(21,3,4,7);}ctx.restore();}
function runwayStar(x:number,y:number){
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,19,24,9,0,0,Math.PI*2);ctx.fill();
  roundRect(-14,10,10,16,3,'#272334');roundRect(4,10,10,16,3,'#272334');
  roundRect(-17,-4,34,24,7,edition.outfit);
  ctx.fillStyle='#fff1cd';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('✦',0,12);
  ctx.fillStyle='#201b25';ctx.beginPath();ctx.ellipse(0,-17,17,23,0,0,Math.PI*2);ctx.fill();
  roundRect(8,-15,12,32,6,'#201b25');
  ctx.fillStyle='#f6cda3';ctx.beginPath();ctx.ellipse(0,-12,10,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#201b25';ctx.beginPath();ctx.ellipse(-5,-24,12,8,-.25,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222033';ctx.fillRect(-8,-15,16,4);ctx.fillStyle='#ed6aa4';ctx.fillRect(-3,-5,6,2);
  ctx.fillStyle='#fff3bd';ctx.font='bold 14px system-ui';ctx.fillText('✦',22,-25);
  ctx.restore();
}
function runwayDecor(){
  ctx.strokeStyle='#ffffff0b';ctx.lineWidth=2;
  for(let y=36;y<H;y+=42){ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(W-40,y);ctx.stroke();}
  ctx.strokeStyle='#ed7ebb';ctx.lineWidth=3;ctx.strokeRect(42,42,W-84,H-84);
  for(let x=60;x<W-60;x+=42){ctx.fillStyle=x%84<42?'#ffcf83':'#ff9aca';ctx.beginPath();ctx.arc(x,30,3,0,Math.PI*2);ctx.fill();}
}
function draw(){const b=canvas.getBoundingClientRect();ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.fillStyle=edition.background;ctx.fillRect(0,0,W,H);ctx.strokeStyle='#ffffff06';ctx.lineWidth=1;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}roundRect(40,40,W-80,H-80,18,'#ffffff04');ctx.fillStyle='#ffffff22';ctx.font='800 30px system-ui';ctx.textAlign='left';ctx.fillText(edition.setting.toUpperCase(),60,H*.12);roundRect(850,8,100,H*.15,12,passes===3?'#5dddac':'#345d52');ctx.fillStyle='#0d2920';ctx.font='bold 21px system-ui';ctx.textAlign='center';ctx.fillText('EXIT ↗',900,48);
if(runway)runwayDecor();
for(const c of cameras){ctx.fillStyle='#ffd47a22';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.arc(c.x,c.y,250,c.angle-.43,c.angle+.43);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffd47a44';ctx.lineWidth=2;ctx.stroke();}
for(const r of cover()){roundRect(r.x,r.y+8,r.w,r.h,12,'#0005');roundRect(r.x,r.y,r.w,r.h,12,'#354b42');for(let i=0;i<4;i++){ctx.fillStyle=['#63876b','#507b5f'][i%2];ctx.beginPath();ctx.arc(r.x+20+(i%2)*60,r.y+r.h*(.3+Math.floor(i/2)*.4),23,0,Math.PI*2);ctx.fill();}}
for(const t of tokens)if(!t.taken){ctx.save();ctx.translate(t.x,t.y);ctx.rotate(Math.sin(elapsed*2)*.12);roundRect(-17,-23,34,46,6,'#ffc873');ctx.fillStyle='#33291b';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText('★',0,3);ctx.restore();}for(const c of cameras)person(c.x,c.y,c.angle,'#8493ad');if(invulnerable<=0||Math.floor(elapsed*12)%2===0){if(runway)runwayStar(player.x,player.y);else person(player.x,player.y,0,edition.outfit,true);}if(dashing>0){ctx.strokeStyle=edition.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(player.x,player.y,28,0,Math.PI*2);ctx.stroke();}if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash*3})`;ctx.fillRect(0,0,W,H);}if(paused&&phase==='playing'){ctx.fillStyle='#10141b99';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 28px system-ui';ctx.fillText('Paused',W/2,H/2);}void b;}
function frame(stamp:number){const dt=Math.min((stamp-last)/1000,.035);last=stamp;update(dt);draw();requestAnimationFrame(frame);}
el('start').onclick=start;el('reset').onclick=()=>{reset();start();};el('restart').onclick=async()=>{try{if(!adOpportunityUsed&&edition.ad_mode!=='disabled'){adOpportunityUsed=true;const outcome=await adBreak(edition.ad_mode,()=>{paused=true;clearInput();},()=>{paused=false;});canvas.dataset.adOutcome=outcome;}}catch{canvas.dataset.adOutcome='unavailable';}finally{paused=false;reset();start();track('Restart');}};
el('dash').addEventListener('pointerdown',event=>{event.preventDefault();dash();});
document.addEventListener('keydown',event=>{const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key)&&!el<HTMLDialogElement>('help-dialog').open){event.preventDefault();keys.add(key);if(key===' ')dash();}});document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
const pad=el('move-pad');function move(event:PointerEvent){if(pointer!==event.pointerId)return;const b=pad.getBoundingClientRect();stick={x:Math.max(-1,Math.min(1,(event.clientX-b.x-b.width/2)/(b.width*.35))),y:Math.max(-1,Math.min(1,(event.clientY-b.y-b.height/2)/(b.height*.35)))};const dot=pad.querySelector('i')!;dot.style.display='block';dot.style.transform=`translate(${stick.x*25}px,${stick.y*20}px)`;}
pad.onpointerdown=event=>{event.preventDefault();if(pointer!==null)return;pointer=event.pointerId;pad.setPointerCapture(event.pointerId);move(event);};pad.onpointermove=move;for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,()=>clearInput());
function pause(){paused=true;clearInput();sync();}function resume(){paused=document.hidden||el<HTMLDialogElement>('help-dialog').open;clearInput();sync();}window.addEventListener('blur',pause);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
el('help').onclick=()=>{pause();el<HTMLDialogElement>('help-dialog').showModal();};el('help-close').onclick=()=>el<HTMLDialogElement>('help-dialog').close();el('help-dialog').addEventListener('close',resume);
function summary(){return `${el('headline').textContent}\n${el('result-detail').textContent}`;}
el('share').onclick=async()=>{track('Share initiated');const status=el('share-status');try{if(navigator.share){await navigator.share({title:edition.title,text:summary(),url:location.href.split('?')[0]});status.textContent='Share dialog closed. Play again whenever you like.';}else{await navigator.clipboard.writeText(`${summary()}\n${location.href.split('?')[0]}`);status.textContent='Result copied. Send it wherever you like.';}}catch(error){status.textContent=error instanceof DOMException&&error.name==='AbortError'?'Sharing canceled. Your result is still here.':'Sharing unavailable. Use Save image or copy the page address.';}};
el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.href.split('?')[0]);el('share-status').textContent='Link copied.';}catch{el('share-status').textContent='Copy the page address from your browser.';}};
el('save').onclick=()=>{const card=document.createElement('canvas');card.width=1000;card.height=600;const c=card.getContext('2d')!;c.fillStyle=edition.background;c.fillRect(0,0,1000,600);c.fillStyle=edition.accent;c.font='bold 24px system-ui';c.fillText(edition.brand.toUpperCase(),60,80);c.fillStyle='#fff6e8';c.font='bold 46px system-ui';const words=(el('headline').textContent||'').split(' ');let line='',y=190;for(const word of words){if(c.measureText(line+word).width>860){c.fillText(line,60,y);line='';y+=58;}line+=word+' ';}c.fillText(line,60,y);c.font='24px system-ui';c.fillText(el('result-detail').textContent||'',60,450);c.fillText(edition.title,60,520);const a=document.createElement('a');a.download=`${edition.id}-result.png`;a.href=card.toDataURL('image/png');a.click();el('share-status').textContent='Result image prepared.';};
resize();reset();requestAnimationFrame(frame);

}
