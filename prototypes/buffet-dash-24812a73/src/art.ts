// Vector art for the Pokémon-style overhead (3/4 front-facing) view. Canvas paths only, no sprites.
type Ctx = CanvasRenderingContext2D;
type Point = {x:number;y:number};
export type Station = Point & {name:string;color:string;w:number;h:number};
export type Facing = 'down'|'up'|'left'|'right';

const INK='#2c2f3a';

function shade(hex:string,amt:number){
 const n=parseInt(hex.slice(1,7),16),f=(c:number)=>Math.round(amt<0?c*(1+amt):c+(255-c)*amt);
 return `rgb(${f(n>>16)},${f(n>>8&255)},${f(n&255)})`;
}
function rr(ctx:Ctx,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function ell(ctx:Ctx,x:number,y:number,rx:number,ry:number){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);}
function paint(ctx:Ctx,fill:string,lw=2,stroke=INK){ctx.fillStyle=fill;ctx.fill();if(lw){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}}
function line(ctx:Ctx,x1:number,y1:number,x2:number,y2:number,color:string,lw:number){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke();}
export function text(ctx:Ctx,t:string,x:number,y:number,size=16,color=INK,weight=700){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(t,x,y);}

// Keycap badge (keyboard hint). Draws with its left edge at x, vertically centred on cy; returns its width.
export function keyWidth(ctx:Ctx,label:string,fs:number){const k=fs*0.78;ctx.font=`800 ${k}px system-ui`;return Math.max(k*1.7,ctx.measureText(label).width+k*0.9);}
export function keycap(ctx:Ctx,x:number,cy:number,label:string,fs:number){
 const w=keyWidth(ctx,label,fs),h=fs*1.2;
 rr(ctx,x,cy-h/2+fs*0.12,w,h,fs*0.22);ctx.fillStyle='#1e2a52';ctx.fill();
 rr(ctx,x,cy-h/2,w,h-fs*0.1,fs*0.22);paint(ctx,'#3d4f8a',1.2);
 text(ctx,label,x+w/2,cy+fs*0.24,fs*0.78,'#ffffff',800);return w;
}
// A centred row of [key] label pairs.
export function keyRow(ctx:Ctx,items:[string,string][],cx:number,cy:number,fs:number,color='#4a5550'){
 const gap=fs*0.9,parts=items.map(([k,l])=>{const kw=k?keyWidth(ctx,k,fs):-fs*0.3;ctx.font=`600 ${fs}px system-ui`;return {k,l,kw,lw:ctx.measureText(l).width};});
 const total=parts.reduce((n,p)=>n+p.kw+fs*0.3+p.lw,0)+gap*(parts.length-1);let x=cx-total/2;
 for(const p of parts){if(p.k)keycap(ctx,x,cy,p.k,fs);x+=p.kw+fs*0.3;ctx.fillStyle=color;ctx.font=`600 ${fs}px system-ui`;ctx.textAlign='left';ctx.fillText(p.l,x,cy+fs*0.35);x+=p.lw+gap;}
 return total;
}
// Speech-bubble prompt above the player showing which key to press.
export function drawKeyPrompt(ctx:Ctx,x:number,y:number,items:[string,string][],fs:number){
 ctx.save();ctx.globalAlpha=0;const w=keyRow(ctx,items,x,y,fs);ctx.restore();
 rr(ctx,x-w/2-fs*0.5,y-fs*0.95,w+fs,fs*1.9,fs*0.45);paint(ctx,'#ffffff',2);
 ctx.beginPath();ctx.moveTo(x-5,y+fs*0.93);ctx.lineTo(x,y+fs*0.93+7);ctx.lineTo(x+5,y+fs*0.93);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();
 keyRow(ctx,items,x,y,fs,INK);
}

type Rect = {x:number;y:number;w:number;h:number};
type View = {x:number;y:number;w:number;h:number};

// Floor tiles (only those in view) and the round home rug (rug radius matches the 78-unit home range).
export function drawRoom(ctx:Ctx,home:Point,v:View){
 const x0=Math.floor(v.x/40)*40,y0=Math.floor(v.y/40)*40;
 for(let y=y0;y<v.y+v.h;y+=40)for(let x=x0;x<v.x+v.w;x+=40){ctx.fillStyle=(x+y)/40%2?'#efe4cc':'#f7efdc';ctx.fillRect(x,y,40,40);}
 for(let x=x0;x<=v.x+v.w;x+=40)line(ctx,x,v.y,x,v.y+v.h,'#e2d5b8',1);for(let y=y0;y<=v.y+v.h;y+=40)line(ctx,v.x,y,v.x+v.w,y,'#e2d5b8',1);
 ell(ctx,home.x,home.y,78,78);paint(ctx,'#bfd9c8',2,'#6fa58d');
 ell(ctx,home.x,home.y,66,66);ctx.setLineDash([6,5]);ctx.strokeStyle='#6fa58d';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
 ell(ctx,home.x,home.y,40,40);paint(ctx,'#d4e7da',0);
}

// Walls: the back wall gets wallpaper, windows and signs; other walls get a lit top and darker front face.
export function drawWall(ctx:Ctx,w:Rect&{back?:boolean},compact:boolean,signs:{text:string;x:number}[]){
 if(w.back){
  ctx.fillStyle='#e9d3a6';ctx.fillRect(w.x,w.y,w.w,40);
  ctx.fillStyle='#d9bf8c';for(let x=w.x;x<w.x+w.w;x+=18)ctx.fillRect(x,w.y,9,40);
  ctx.fillStyle='#8a6444';ctx.fillRect(w.x,w.y+40,w.w,8);ctx.fillStyle='#00000018';ctx.fillRect(w.x,w.y+48,w.w,5);
  for(let wx=w.x+90;wx<w.x+w.w;wx+=180){if(signs.some(s=>Math.abs(s.x-wx)<110))continue;rr(ctx,wx-30,8,60,24,3);paint(ctx,'#bfe3f2');line(ctx,wx,9,wx,31,INK,2);line(ctx,wx-29,20,wx+29,20,'#ffffffaa',2);}
  if(!compact)for(const s of signs){rr(ctx,s.x-70,8,140,26,5);paint(ctx,'#fffaf0');text(ctx,s.text,s.x,26,14,'#8a6444',800);}
  return;
 }
 const face=Math.min(14,w.h*0.4);
 ctx.fillStyle='#00000020';ctx.fillRect(w.x+3,w.y+w.h,w.w,5);
 rr(ctx,w.x,w.y,w.w,w.h,3);paint(ctx,'#9a7650');
 rr(ctx,w.x,w.y,w.w,w.h-face,3);paint(ctx,'#d2b285');
 ctx.fillStyle='#e6cfa6';ctx.fillRect(w.x+4,w.y+4,w.w-8,Math.max(0,w.h-face-8));
}

// Minimap in screen space (top-right).
export function minimapRect(compact:boolean,scale:number,world:{w:number;h:number}){
 const w=compact?Math.min(260,110/scale):170;return {x:900-w-10,y:10,w,h:w*world.h/world.w};
}
export function drawMinimap(ctx:Ctx,m:Rect,world:{w:number;h:number},walls:Rect[],stations:(Rect&{color:string})[],table:Rect,player:Point,view:View){
 const k=m.w/world.w;
 rr(ctx,m.x-3,m.y-3,m.w+6,m.h+6,6);paint(ctx,'#fffaf0e8',2);
 ctx.fillStyle='#8a6444';for(const w of walls)ctx.fillRect(m.x+w.x*k,m.y+w.y*k,Math.max(1.5,w.w*k),Math.max(1.5,w.h*k));
 for(const s of stations){ctx.fillStyle=s.color;ctx.fillRect(m.x+s.x*k,m.y+s.y*k,s.w*k,s.h*k);}
 ctx.fillStyle='#b07a43';ctx.fillRect(m.x+table.x*k,m.y+table.y*k,table.w*k,table.h*k);
 ctx.strokeStyle='#2c2f3a99';ctx.lineWidth=1.5;ctx.strokeRect(m.x+view.x*k,m.y+view.y*k,view.w*k,view.h*k);
 ell(ctx,m.x+player.x*k,m.y+player.y*k,3.5,3.5);paint(ctx,'#e0574f',1.5);
}

// Faint floor circle that matches the 102-unit serving range.
export function drawRange(ctx:Ctx,s:Point,active:boolean){
 ell(ctx,s.x,s.y,100,100);ctx.fillStyle=active?'#ffffff8c':'#ffffff26';ctx.fill();
 if(active){ctx.setLineDash([8,6]);ctx.strokeStyle='#ffffffdd';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);}
}

function berries(ctx:Ctx,x:number,y:number){
 ell(ctx,x,y-2,32,9);paint(ctx,'#d6eef5');
 for(const [dx,dy] of [[-20,-4],[-8,-6],[4,-6],[16,-4],[-14,-12],[-2,-14],[10,-12],[-4,-21],[22,-9]]){
  ell(ctx,x+dx,y+dy,6,6);paint(ctx,'#e2475f',1.5);ell(ctx,x+dx-2,y+dy-2,1.6,1.6);paint(ctx,'#fff',0);
 }
 ell(ctx,x-4,y-27,4,2.4);paint(ctx,'#5fae4a',1.5);
 ctx.beginPath();ctx.ellipse(x,y-2,32,18,0,0,Math.PI);ctx.closePath();paint(ctx,'#e8f6fa');
 line(ctx,x-22,y+5,x-14,y+10,'#ffffff',2);
}
function rolls(ctx:Ctx,x:number,y:number){
 for(const [dx,dy] of [[-18,-6],[18,-6],[0,-11]]){
  ell(ctx,x+dx,y+dy,14,10);paint(ctx,'#eab45a');
  for(const k of [-5,0,5])line(ctx,x+dx+k-2,y+dy-6,x+dx+k+2,y+dy+1,'#c4852c',1.5);
  ell(ctx,x+dx-5,y+dy-5,3,1.6);paint(ctx,'#fff3d0',0);
 }
 rr(ctx,x-36,y-2,72,18,5);paint(ctx,'#b47b45');
 for(let i=-28;i<=28;i+=10)line(ctx,x+i,y+1,x+i+5,y+13,'#8c5a2c',1.5);
 line(ctx,x-34,y+2,x+34,y+2,'#d39c62',2);
}
function skewers(ctx:Ctx,x:number,y:number){
 ell(ctx,x,y-2,42,17);paint(ctx,'#fbfaf3');ell(ctx,x,y-2,34,12);paint(ctx,'#eceee4',0);
 const chunks=['#7dbb4f','#f0cf5a','#d9534f','#7dbb4f'];
 for(const dy of [-11,-2,7]){
  line(ctx,x-38,y+dy,x+38,y+dy,'#a0743e',2);
  chunks.forEach((c,i)=>{rr(ctx,x-25+i*14,y+dy-4,10,8,2);paint(ctx,c,1.2);});
 }
}
function sushi(ctx:Ctx,x:number,y:number){
 rr(ctx,x-40,y-4,80,16,3);paint(ctx,'#c8925a');rr(ctx,x-34,y+10,8,6,1);paint(ctx,'#9c6a3a',1.5);rr(ctx,x+26,y+10,8,6,1);paint(ctx,'#9c6a3a',1.5);
 for(const dx of [-17,17]){
  rr(ctx,x+dx-13,y-14,26,13,6);paint(ctx,'#fbfaf3');
  rr(ctx,x+dx-15,y-21,30,11,5);paint(ctx,'#f28a5c');
  for(const k of [-7,0,7])line(ctx,x+dx+k-2,y-19,x+dx+k+3,y-12,'#ffd2bd',1.5);
  ctx.fillStyle='#24312b';ctx.fillRect(x+dx-3,y-21,6,20);
 }
 ell(ctx,x+32,y-1,4,3);paint(ctx,'#8cc35a',1.2);
}
function roast(ctx:Ctx,x:number,y:number){
 ell(ctx,x,y,44,15);paint(ctx,'#dfe4ea');ell(ctx,x,y-1,36,11);paint(ctx,'#f2f5f8',0);
 for(const [dx,dy] of [[-34,2],[-28,8],[30,6],[36,0]]){ell(ctx,x+dx,y+dy,5,4);paint(ctx,'#5fae4a',1.2);}
 for(const s of [-1,1]){line(ctx,x+s*18,y-12,x+s*30,y-22,'#f5efe0',4);ell(ctx,x+s*31,y-23,4,4);paint(ctx,'#f5efe0',1.5);}
 ell(ctx,x,y-7,27,15);paint(ctx,'#a65a2e');ell(ctx,x-7,y-13,11,5);paint(ctx,'#d38b52',0);
 ctx.beginPath();ctx.moveTo(x-9,y-22);ctx.lineTo(x-9,y-32);ctx.lineTo(x-4,y-27);ctx.lineTo(x,y-34);ctx.lineTo(x+4,y-27);ctx.lineTo(x+9,y-32);ctx.lineTo(x+9,y-22);ctx.closePath();paint(ctx,'#f2c94c',1.5);
}
const dishes:Record<string,(ctx:Ctx,x:number,y:number)=>void>={'Berry bites':berries,'Golden rolls':rolls,'Green skewers':skewers,'Sushi pair':sushi,'Royal roast':roast};

// Buffet counter: lit top surface + darker front face (the "front face view"), food dish on top, nameplate on the front.
export function drawStation(ctx:Ctx,s:Station,compact:boolean,scale:number,key?:string){
 const {x,y}=s;
 ell(ctx,x,y+38,92,9);paint(ctx,'#0000001f',0);
 rr(ctx,x-86,y,172,36,4);paint(ctx,shade(s.color,-0.25));
 ctx.fillStyle=shade(s.color,-0.05);ctx.fillRect(x-85,y+1,170,7);
 for(let i=-78;i<=78;i+=13){ell(ctx,x+i,y+33,5,3);paint(ctx,shade(s.color,-0.4),0);}
 rr(ctx,x-86,y-44,172,46,5);paint(ctx,shade(s.color,0.45));
 rr(ctx,x-80,y-39,160,36,4);paint(ctx,shade(s.color,0.6),0);
 (dishes[s.name]??berries)(ctx,x-14,y-16);
 if(!compact){
  const c=9,ox=x+60-s.w*c/2,oy=y-34;
  for(let i=0;i<s.w;i++)for(let j=0;j<s.h;j++){ctx.beginPath();ctx.rect(ox+i*c,oy+j*c,c-1,c-1);paint(ctx,s.color,1);}
 }
 const fs=compact?10/scale:13;ctx.font=`800 ${fs}px system-ui`;const nw=ctx.measureText(s.name).width,kw=key?keyWidth(ctx,key,fs)+fs*0.4:0,tw=nw+kw+14;
 const ny=compact?y+42+fs*0.75:y+18; // small screens: nameplate sits below the counter so the food stays visible
 rr(ctx,x-tw/2,ny-fs*0.75,tw,fs*1.5,4);paint(ctx,'#fffaf0');
 if(key)keycap(ctx,x-tw/2+6,ny,key,fs);
 text(ctx,s.name,x+kw/2,ny+fs*0.36,fs,INK,800);
}

// Home table: wooden table with a place setting and two chairs.
export function drawTable(ctx:Ctx,t:Point,compact:boolean,scale:number,key?:string){
 const {x,y}=t;
 for(const s of [-1,1]){
  rr(ctx,x+s*82-11,y-30,22,22,4);paint(ctx,'#a86e3c');
  rr(ctx,x+s*82-13,y-8,26,14,3);paint(ctx,'#c58b52');
  rr(ctx,x+s*82-11,y+6,4,12,1);paint(ctx,'#7a4a24',1.5);rr(ctx,x+s*82+7,y+6,4,12,1);paint(ctx,'#7a4a24',1.5);
 }
 ell(ctx,x,y+32,70,7);paint(ctx,'#00000022',0);
 rr(ctx,x-58,y+20,8,14,2);paint(ctx,'#6e4220',1.5);rr(ctx,x+50,y+20,8,14,2);paint(ctx,'#6e4220',1.5);
 rr(ctx,x-66,y+4,132,22,4);paint(ctx,'#8e5a30');
 rr(ctx,x-66,y-36,132,44,5);paint(ctx,'#cf965c');
 for(const k of [-40,-10,22,48])line(ctx,x+k,y-32,x+k+8,y+2,'#bd8248',1.5);
 rr(ctx,x-32,y-30,64,30,4);paint(ctx,'#f4e1c1',1.5);
 ell(ctx,x,y-15,15,10);paint(ctx,'#ffffff',1.5);ell(ctx,x,y-15,9,6);paint(ctx,'#eef2f4',0);
 line(ctx,x-24,y-24,x-24,y-6,'#9aa3ad',2.5);line(ctx,x+24,y-24,x+24,y-6,'#9aa3ad',2.5);
 const fs=compact?10/scale:13,label=compact?'HOME':'HOME TABLE';ctx.font=`800 ${fs}px system-ui`;const lw=ctx.measureText(label).width,kw=key?keyWidth(ctx,key,fs)+fs*0.4:0;
 if(key)keycap(ctx,x-(lw+kw)/2,y+15,key,fs);
 text(ctx,label,x+kw/2,y+15+fs*0.36,fs,'#fff6dd',800);
}

// Original chibi diner: mustard knit beanie, napkin bib. Front view by default; back and side views when walking.
export function drawPlayer(ctx:Ctx,x:number,y:number,facing:Facing,phase:number,moving:boolean){
 const step=moving?Math.sin(phase):0,bob=moving?-Math.abs(Math.sin(phase))*2:0;
 ell(ctx,x,y+18,14,4.5);paint(ctx,'#00000033',0);
 ctx.save();ctx.translate(x,y+bob);if(facing==='left')ctx.scale(-1,1);
 const side=facing==='left'||facing==='right';
 if(side){
  rr(ctx,-5+step*3,9,6,8,2);paint(ctx,'#3a3f55',1.5);rr(ctx,-1-step*3,9,6,8,2);paint(ctx,'#3a3f55',1.5);
 }else{
  rr(ctx,-7,9+Math.max(0,step)*-2,6,8,2);paint(ctx,'#3a3f55',1.5);rr(ctx,1,9+Math.max(0,-step)*-2,6,8,2);paint(ctx,'#3a3f55',1.5);
 }
 rr(ctx,-9,4,18,8,2);paint(ctx,'#3d4f8a',1.5);
 rr(ctx,side?-8:-10,-5,side?16:20,12,4);paint(ctx,'#e0574f',1.5);
 if(facing==='down'){ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(7,-5);ctx.lineTo(0,6);ctx.closePath();paint(ctx,'#ffffff',1.5);ell(ctx,-2,-2,1.2,1.2);paint(ctx,'#e05a5a',0);ell(ctx,2,-2,1.2,1.2);paint(ctx,'#e05a5a',0);ell(ctx,0,2,1.2,1.2);paint(ctx,'#e05a5a',0);}
 if(side){rr(ctx,-2-step*3,-3,5,10,2);paint(ctx,'#ffd9b3',1.5);}
 else{rr(ctx,-14,-4+step*1.5,5,10,2);paint(ctx,'#ffd9b3',1.5);rr(ctx,9,-4-step*1.5,5,10,2);paint(ctx,'#ffd9b3',1.5);}
 ell(ctx,0,-15,14,13);paint(ctx,'#ffd9b3');
 if(facing==='up'){
  ctx.beginPath();ctx.moveTo(-14,-15);ctx.quadraticCurveTo(-12,-5,-6,-6);ctx.quadraticCurveTo(0,-3,6,-6);ctx.quadraticCurveTo(12,-5,14,-15);ctx.lineTo(14,-22);ctx.lineTo(-14,-22);ctx.closePath();paint(ctx,'#6b3e26',0);
  line(ctx,-5,-4,-3,4,'#ffffff',1.5);line(ctx,5,-4,3,4,'#ffffff',1.5);
 }else if(facing==='down'){
  ctx.beginPath();ctx.moveTo(-13,-17);ctx.quadraticCurveTo(-6,-13,-2,-18);ctx.quadraticCurveTo(3,-13,8,-18);ctx.quadraticCurveTo(11,-14,13,-17);ctx.lineTo(13,-22);ctx.lineTo(-13,-22);ctx.closePath();paint(ctx,'#6b3e26',0);
  for(const s of [-1,1]){ell(ctx,s*5,-11,2.4,3.6);paint(ctx,'#20232e',0);ell(ctx,s*5-0.8,-12.4,0.9,0.9);paint(ctx,'#fff',0);ell(ctx,s*9.5,-6.5,2.6,1.5);paint(ctx,'#f6a5a5',0);}
  ctx.beginPath();ctx.arc(0,-6.5,2.2,0.15*Math.PI,0.85*Math.PI);ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.stroke();
 }else{
  ctx.beginPath();ctx.moveTo(-14,-14);ctx.quadraticCurveTo(-8,-6,0,-14);ctx.lineTo(4,-22);ctx.lineTo(-14,-22);ctx.closePath();paint(ctx,'#6b3e26',0);
  ell(ctx,7,-11,2.2,3.6);paint(ctx,'#20232e',0);ell(ctx,6.4,-12.4,0.8,0.8);paint(ctx,'#fff',0);ell(ctx,9,-6.5,2.4,1.4);paint(ctx,'#f6a5a5',0);
 }
 ell(ctx,0,-15,14,13);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
 const px=side?-4:0;
 ell(ctx,px,-34,4.5,4.5);paint(ctx,'#fff3d6',1.5);
 ctx.beginPath();ctx.ellipse(0,-20,15,12,0,Math.PI,0);ctx.closePath();paint(ctx,'#e8a33d');
 rr(ctx,-15.5,-23,31,7,3);paint(ctx,'#c9822a');
 for(let i=-11;i<=11;i+=4.4)line(ctx,i,-21.5,i,-17.5,'#a9681e',1.2);
 ctx.restore();
}

// Classic RPG dialogue box for ready / end-of-round messages.
export function drawDialog(ctx:Ctx,title:string,sub:string,keys:[string,string][],now:number){
 rr(ctx,130,145,640,150,14);paint(ctx,'#fbfbf5',5);
 rr(ctx,140,155,620,130,9);ctx.strokeStyle='#7fb3a6';ctx.lineWidth=3;ctx.stroke();
 text(ctx,title,450,198,28,INK,800);text(ctx,sub,450,233,18,'#4a5550',600);keyRow(ctx,keys,450,266,18);
 if(Math.floor(now/450)%2){ctx.beginPath();ctx.moveTo(732,268);ctx.lineTo(746,268);ctx.lineTo(739,277);ctx.closePath();ctx.fillStyle='#e0453b';ctx.fill();}
}

// Plate placement popup (screen space). Layout is shared with main for pointer hit-testing.
export function plateLayout(compact:boolean,scale:number){
 const cell=compact?Math.min(96,Math.max(60,26/scale)):64,fs=compact?11/scale:15,pad=fs*1.2;
 const w=Math.max(cell*4+pad*2,fs*(compact?20:32)),h=cell*3+pad*2+fs*5.8,x=(900-w)/2,y=Math.max(6,(520-h)/2);
 return {x,y,w,h,cell,fs,gx:x+(w-cell*4)/2,gy:y+pad+fs*3.1};
}
type Block = {x:number;y:number;w:number;h:number;color:string;label:string};
// progress !== null: serving in progress — the placed portion fills up and the bar below the grid shows serve time.
export function drawPlatePopup(ctx:Ctx,L:ReturnType<typeof plateLayout>,title:string,sub:string,blocks:Block[],cursor:Block&{ok:boolean},keys:[string,string][],progress:number|null,now:number){
 ctx.fillStyle='#10252a66';ctx.fillRect(0,0,900,520);
 rr(ctx,L.x,L.y,L.w,L.h,14);paint(ctx,'#fbfbf5',5);
 rr(ctx,L.x+7,L.y+7,L.w-14,L.h-14,9);ctx.strokeStyle='#7fb3a6';ctx.lineWidth=3;ctx.stroke();
 text(ctx,title,L.x+L.w/2,L.y+L.fs*2.1,L.fs*1.05,INK,800);
 text(ctx,sub,L.x+L.w/2,L.y+L.fs*3.3,L.fs*0.75,'#4a5550',600);
 const c=L.cell,g=4;
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){rr(ctx,L.gx+i*c+g/2,L.gy+j*c+g/2,c-g,c-g,6);paint(ctx,'#efe6d2',1.5,'#c9bba0');}
 for(const b of blocks){rr(ctx,L.gx+b.x*c+g,L.gy+b.y*c+g,b.w*c-g*2,b.h*c-g*2,7);paint(ctx,b.color,2);text(ctx,b.label,L.gx+(b.x+b.w/2)*c,L.gy+(b.y+b.h/2)*c+L.fs*0.35,L.fs,INK,800);}
 const bx=L.gx+cursor.x*c+g,by=L.gy+cursor.y*c+g,bw=cursor.w*c-g*2,bh=cursor.h*c-g*2,barY=L.gy+c*3+L.fs*0.55,barW=c*4-g;
 if(progress!==null){ // serving: portion fills bottom-up, bar under the grid
  rr(ctx,bx,by,bw,bh,7);paint(ctx,shade(cursor.color,0.55),2);
  ctx.save();rr(ctx,bx,by,bw,bh,7);ctx.clip();ctx.fillStyle=cursor.color;ctx.fillRect(bx,by+bh*(1-Math.min(1,progress)),bw,bh);ctx.restore();
  rr(ctx,bx,by,bw,bh,7);ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.stroke();
  text(ctx,cursor.label,bx+bw/2,by+bh/2+L.fs*0.35,L.fs,INK,800);
  rr(ctx,L.gx+g/2,barY,barW,L.fs*0.5,L.fs*0.25);paint(ctx,'#e2d8c2',0);
  rr(ctx,L.gx+g/2,barY,barW*Math.min(1,progress),L.fs*0.5,L.fs*0.25);paint(ctx,'#e8a33d',0);
  keyRow(ctx,keys,L.x+L.w/2,L.y+L.h-L.fs*1.15,L.fs*0.8);return;
 }
 const pulse=0.55+0.25*Math.sin(now/180);
 rr(ctx,bx,by,bw,bh,7);
 ctx.globalAlpha=pulse;ctx.fillStyle=cursor.ok?cursor.color:'#e0574f';ctx.fill();ctx.globalAlpha=1;
 ctx.setLineDash([8,5]);ctx.strokeStyle=cursor.ok?'#2f8f5b':'#d9453b';ctx.lineWidth=4;ctx.stroke();ctx.setLineDash([]);
 text(ctx,cursor.ok?cursor.label:'✕',L.gx+(cursor.x+cursor.w/2)*c,L.gy+(cursor.y+cursor.h/2)*c+L.fs*0.35,L.fs,cursor.ok?INK:'#ffffff',800);
 keyRow(ctx,keys,L.x+L.w/2,L.y+L.h-L.fs*1.15,L.fs*0.8);
}

// Plate HUD (screen space, under the minimap): value, free cells, 4x3 grid, current activity and progress.
export function drawPlateHud(ctx:Ctx,r:{x:number;y:number;w:number},fs:number,title:string,blocks:Block[],reserved:Rect|null,sub:string,progress:number){
 const pad=fs*0.6,cell=(r.w-pad*2)/4,top=r.y+pad+fs*1.25,h=pad*2+fs*1.25+cell*3+fs*2.1;
 rr(ctx,r.x-3,r.y,r.w+6,h,6);paint(ctx,'#fffaf0e8',2);
 text(ctx,title,r.x+r.w/2,r.y+pad+fs*0.85,fs,INK,800);
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){rr(ctx,r.x+pad+i*cell+1.5,top+j*cell+1.5,cell-3,cell-3,4);paint(ctx,'#efe6d2',1,'#c9bba0');}
 if(reserved){rr(ctx,r.x+pad+reserved.x*cell+2,top+reserved.y*cell+2,reserved.w*cell-4,reserved.h*cell-4,5);ctx.setLineDash([4,3]);paint(ctx,'#d8cdb4',2,'#8a7a5c');ctx.setLineDash([]);}
 for(const b of blocks){rr(ctx,r.x+pad+b.x*cell+2,top+b.y*cell+2,b.w*cell-4,b.h*cell-4,5);paint(ctx,b.color,1.5);text(ctx,b.label,r.x+pad+(b.x+b.w/2)*cell,top+(b.y+b.h/2)*cell+fs*0.35,fs*0.95,INK,800);}
 const by=top+cell*3+fs*0.35;
 rr(ctx,r.x+pad,by,r.w-pad*2,fs*0.5,fs*0.25);paint(ctx,'#e2d8c2',0);
 if(progress>0){rr(ctx,r.x+pad,by,(r.w-pad*2)*Math.min(1,progress),fs*0.5,fs*0.25);paint(ctx,'#e8a33d',0);}
 text(ctx,sub,r.x+r.w/2,by+fs*1.5,fs*0.85,'#4a5550',600);
 return h;
}

// Progress ring around the player while standing still at a station (opens the plate popup when full).
export function drawRing(ctx:Ctx,x:number,y:number,r:number,progress:number,color:string){
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle='#2c2f3a55';ctx.lineWidth=9;ctx.stroke();
 ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,progress));ctx.strokeStyle=INK;ctx.lineWidth=10;ctx.lineCap='round';ctx.stroke();
 ctx.strokeStyle=color;ctx.lineWidth=6;ctx.stroke();ctx.lineCap='butt';
}

// On-screen EAT button (bottom-right of the play area, left of the minimap/plate column). Radius keeps >= ~64 CSS px diameter.
export function eatButton(compact:boolean,scale:number,m:Rect){
 const r=Math.max(compact?32/scale:40,34);return {cx:m.x-16-r,cy:520-14-r,r};
}
// mode 'serve' (at a counter: starts the ring) / 'ready' (at home with food) / 'eating' / 'off'. fs=0 hides the E keycap (touch mode).
export function drawEatButton(ctx:Ctx,b:{cx:number;cy:number;r:number},mode:'serve'|'ready'|'eating'|'off',progress:number,now:number,fs:number){
 const {cx,cy,r}=b;ctx.save();if(mode==='off')ctx.globalAlpha=0.45;
 ell(ctx,cx,cy+r*0.12,r,r);paint(ctx,'#00000033',0);
 if(mode==='ready'||mode==='serve'){ell(ctx,cx,cy,r+5+3*Math.sin(now/160),r+5+3*Math.sin(now/160));paint(ctx,'#efd18466',0);}
 ell(ctx,cx,cy,r,r);paint(ctx,mode==='off'?'#9aa59e':'#ebc371',3);
 ell(ctx,cx,cy-r*0.08,r*0.82,r*0.78);paint(ctx,mode==='off'?'#b4bdb7':'#f3d58f',0);
 // fork + plate glyph
 ell(ctx,cx,cy-r*0.12,r*0.36,r*0.24);paint(ctx,'#ffffff',2);
 line(ctx,cx-r*0.52,cy-r*0.42,cx-r*0.52,cy+r*0.06,INK,2.5);for(const k of [-0.6,-0.52,-0.44])line(ctx,cx+r*k,cy-r*0.42,cx+r*k,cy-r*0.24,INK,1.5);
 line(ctx,cx+r*0.52,cy-r*0.42,cx+r*0.52,cy+r*0.06,INK,2.5);
 text(ctx,mode==='eating'?`${Math.round(progress*100)}%`:mode==='serve'?'SERVE':'EAT',cx,cy+r*0.42,r*(mode==='serve'?0.28:0.34),INK,900);
 if(mode==='eating'){ctx.beginPath();ctx.arc(cx,cy,r+6,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,progress));ctx.strokeStyle='#e8a33d';ctx.lineWidth=6;ctx.lineCap='round';ctx.stroke();ctx.lineCap='butt';}
 ctx.restore();
 if(fs)keycap(ctx,cx+r*0.55,cy-r*0.85,'E',fs);
}

// Floating joystick (touch mode): base where the finger went down, knob follows the finger; idle hint bottom-left.
export function drawJoystick(ctx:Ctx,joy:{ox:number;oy:number;x:number;y:number}|null,idle:Point,R:number,fs:number){
 if(!joy){ell(ctx,idle.x,idle.y,R,R);ctx.strokeStyle='#2c2f3a40';ctx.lineWidth=3;ctx.setLineDash([6,6]);ctx.stroke();ctx.setLineDash([]);
  text(ctx,'Drag to walk',idle.x,idle.y+fs*0.35,fs,'#2c2f3a99',700);return;}
 ell(ctx,joy.ox,joy.oy,R,R);ctx.fillStyle='#2c2f3a30';ctx.fill();ctx.strokeStyle='#ffffffb0';ctx.lineWidth=3;ctx.stroke();
 const vx=joy.x-joy.ox,vy=joy.y-joy.oy,l=Math.hypot(vx,vy),k=l>R?R/l:1;
 ell(ctx,joy.ox+vx*k,joy.oy+vy*k,R*0.42,R*0.42);paint(ctx,'#fbfbf5',3);
}
