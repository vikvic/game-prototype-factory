// Vector art for the Pokémon-style overhead (3/4 front-facing) view. Canvas paths only, no sprites.
type Ctx = CanvasRenderingContext2D;
type Point = {x:number;y:number};
export type Station = Point & {name:string;color:string;w:number;h:number;cells?:[number,number][]};
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
// Roasted chicken leg quarter (thigh + drumstick) drawn in its base L frame: a 2×2 box centred on the origin,
// cell size c, cells (0,0) top-left, (0,1) bottom-left, (1,1) bottom-right. Thigh lies along the bottom row,
// drumstick runs up the left column with the bone end at the top.
function legQuarter(ctx:Ctx,c:number){
 const bone='#f5efe0',meat='#c9792f',crisp='#7a3e18',lw=Math.max(1.5,c*0.035);
 // bone + knuckle
 line(ctx,-c*0.5,-c*0.42,-c*0.5,-c*0.8,bone,c*0.15);
 for(const dx of [-0.09,0.09]){ell(ctx,-c*0.5+dx*c,-c*0.84,c*0.1,c*0.1);paint(ctx,bone,lw);}
 // drumstick meat: tapers from the joint up toward the bone
 ctx.beginPath();ctx.moveTo(-c*0.62,-c*0.45);ctx.quadraticCurveTo(-c*0.88,c*0.0,-c*0.78,c*0.42);ctx.lineTo(-c*0.18,c*0.42);ctx.quadraticCurveTo(-c*0.12,c*0.0,-c*0.38,-c*0.45);ctx.closePath();paint(ctx,meat,lw);
 // thigh: wide rounded piece along the bottom row
 ctx.beginPath();ctx.moveTo(-c*0.86,c*0.3);ctx.bezierCurveTo(-c*0.55,c*0.04,c*0.45,c*0.0,c*0.84,c*0.3);ctx.bezierCurveTo(c*0.99,c*0.52,c*0.82,c*0.9,c*0.3,c*0.88);
 ctx.bezierCurveTo(-c*0.25,c*0.9,-c*0.92,c*0.8,-c*0.86,c*0.3);ctx.closePath();paint(ctx,meat,lw);
 // golden highlights + roasted seasoning flecks
 ell(ctx,-c*0.2,c*0.36,c*0.38,c*0.12);paint(ctx,'#e9a85a',0);ell(ctx,-c*0.58,-c*0.12,c*0.07,c*0.2);paint(ctx,'#e9a85a',0);
 ctx.fillStyle=crisp;for(const [x,y,r] of [[-0.5,0.55,0.05],[-0.2,0.62,0.04],[0.1,0.5,0.05],[0.35,0.62,0.045],[0.6,0.45,0.05],[0.25,0.3,0.035],[-0.65,0.15,0.04],[-0.42,-0.2,0.035],[-0.55,-0.32,0.03],[0.7,0.62,0.035],[-0.05,0.75,0.03]] as [number,number,number][]){ctx.beginPath();ctx.arc(x*c,y*c,r*c,0,Math.PI*2);ctx.fill();}
}
// Which quarter-turn of the base L these cells are (0–3); base = (0,0),(0,1),(1,1) in a 2×2 box.
function lTurns(cells:[number,number][]){
 const k=(cs:[number,number][])=>cs.map(p=>p.join()).sort().join(' ');let cur:[number,number][]=[[0,0],[0,1],[1,1]];
 for(let r=0;r<4;r++){if(k(cur)===k(cells))return r;cur=cur.map(([x,y])=>[1-y,x] as [number,number]);}return 0;
}
function chicken(ctx:Ctx,x:number,y:number){
 ell(ctx,x,y,44,15);paint(ctx,'#dfe4ea');ell(ctx,x,y-1,36,11);paint(ctx,'#f2f5f8',0);
 ctx.save();ctx.translate(x+4,y-17);legQuarter(ctx,23);ctx.restore(); // thigh on the platter, drumstick up
 for(const [dx,dy] of [[-36,4],[36,4]]){ell(ctx,x+dx,y+dy,5,4);paint(ctx,'#5fae4a',1.2);}
}
const dishes:Record<string,(ctx:Ctx,x:number,y:number)=>void>={'Berry bites':berries,'Golden rolls':rolls,'Green skewers':skewers,'Sushi pair':sushi,'Chicken leg':chicken,'Royal roast':roast};

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
  for(let i=0;i<s.w;i++)for(let j=0;j<s.h;j++){if(s.cells&&!s.cells.some(([a,b])=>a===i&&b===j))continue;ctx.beginPath();ctx.rect(ox+i*c,oy+j*c,c-1,c-1);paint(ctx,s.color,1);}
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
type Cells = [number,number][];
type Block = {x:number;y:number;w:number;h:number;cells?:Cells;color:string;label:string;name:string};
const isRect=(b:{w:number;h:number;cells?:Cells})=>!b.cells||b.cells.length===b.w*b.h;
const hasCell=(cells:Cells,a:number,b:number)=>cells.some(([x,y])=>x===a&&y===b);
// Cell rect inset by g only on sides without a neighbouring cell, so shaped pieces look like one piece.
function cellBox(cells:Cells,a:number,b:number,ox:number,oy:number,c:number,g:number){
 return {x0:ox+a*c+(hasCell(cells,a-1,b)?0:g),y0:oy+b*c+(hasCell(cells,a,b-1)?0:g),x1:ox+(a+1)*c-(hasCell(cells,a+1,b)?0:g),y1:oy+(b+1)*c-(hasCell(cells,a,b+1)?0:g)};
}
// Set the current path to the piece's footprint (rounded rect for rectangles, union of cells otherwise).
function tilePath(ctx:Ctx,b:{w:number;h:number;cells?:Cells},ox:number,oy:number,c:number,g:number,r:number){
 if(isRect(b)){rr(ctx,ox+g,oy+g,b.w*c-g*2,b.h*c-g*2,r);return;}
 ctx.beginPath();for(const [a,bb] of b.cells!){const k=cellBox(b.cells!,a,bb,ox,oy,c,g);ctx.rect(k.x0,k.y0,k.x1-k.x0,k.y1-k.y0);}
}
function tileStroke(ctx:Ctx,b:{w:number;h:number;cells?:Cells},ox:number,oy:number,c:number,g:number,r:number,color:string,lw:number){
 if(isRect(b)){rr(ctx,ox+g,oy+g,b.w*c-g*2,b.h*c-g*2,r);}
 else{ctx.beginPath();for(const [a,bb] of b.cells!){const k=cellBox(b.cells!,a,bb,ox,oy,c,g),cs=b.cells!;
  if(!hasCell(cs,a,bb-1)){ctx.moveTo(k.x0,k.y0);ctx.lineTo(k.x1,k.y0);}if(!hasCell(cs,a,bb+1)){ctx.moveTo(k.x0,k.y1);ctx.lineTo(k.x1,k.y1);}
  if(!hasCell(cs,a-1,bb)){ctx.moveTo(k.x0,k.y0);ctx.lineTo(k.x0,k.y1);}if(!hasCell(cs,a+1,bb)){ctx.moveTo(k.x1,k.y0);ctx.lineTo(k.x1,k.y1);}}}
 ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke();ctx.lineCap='butt';
}
// Food art: rectangles get the fitted dish; the L-shaped chicken leg gets one leg quarter spanning its cells.
function tileArt(ctx:Ctx,b:Block,ox:number,oy:number,c:number,g:number,alpha=1){
 if(isRect(b)){drawFoodIcon(ctx,b.name,ox+b.w*c/2,oy+b.h*c/2,b.w*c-g*2,b.h*c-g*2,alpha);return;}
 // Chicken leg: one leg quarter across the whole L, turned to match the piece's orientation.
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(ox+b.w*c/2,oy+b.h*c/2);ctx.rotate(lTurns(b.cells!)*Math.PI/2);legQuarter(ctx,c*0.94);ctx.restore();
}
// Badge position: bottom-right corner of the lowest (then right-most) cell.
function tileCorner(b:{w:number;h:number;cells?:Cells},ox:number,oy:number,c:number,g:number){
 const cells=b.cells??[[b.w-1,b.h-1]];const [a,bb]=[...cells].sort((p,q)=>q[1]-p[1]||q[0]-p[0])[0];return {x:ox+(a+1)*c-g-3,y:oy+(bb+1)*c-g-3};
}
// Approximate drawn bounds of each dish (relative to its draw point) so it can be fitted into a plate footprint.
const dishBounds:Record<string,{w:number;h:number;cy:number}>={'Berry bites':{w:70,h:46,cy:-6},'Golden rolls':{w:74,h:38,cy:-3},'Green skewers':{w:86,h:36,cy:-2},'Sushi pair':{w:82,h:38,cy:-2},'Chicken leg':{w:92,h:50,cy:-10},'Royal roast':{w:92,h:50,cy:-9}};
// Food art fitted to a w×h box (centre cx,cy). Dishes are drawn landscape; tall footprints rotate the art 90°.
export function drawFoodIcon(ctx:Ctx,name:string,cx:number,cy:number,w:number,h:number,alpha=1){
 const d=dishBounds[name]??dishBounds['Berry bites'],rot=h>w*1.05,bw=rot?h:w,bh=rot?w:h,s=Math.min(bw/d.w,bh/d.h)*0.9;
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(cx,cy);if(rot)ctx.rotate(-Math.PI/2);ctx.scale(s,s);(dishes[name]??berries)(ctx,0,-d.cy);ctx.restore();
}
// Food tile: light tint of the food colour, the food art, and a small value badge in the corner.
// (ox,oy) = top-left of the piece's bounding box on the grid, c = cell size, g = inset.
function foodTile(ctx:Ctx,b:Block,ox:number,oy:number,c:number,g:number,fs:number,r:number){
 tilePath(ctx,b,ox,oy,c,g,r);ctx.fillStyle=shade(b.color,0.55);ctx.fill();tileStroke(ctx,b,ox,oy,c,g,r,INK,2);
 tileArt(ctx,b,ox,oy,c,g);const k=tileCorner(b,ox,oy,c,g);badge(ctx,b.label,k.x,k.y,fs*0.8);
}
function badge(ctx:Ctx,label:string,right:number,bottom:number,fs:number){
 ctx.font=`800 ${fs}px system-ui`;const bw=ctx.measureText(label).width+fs*0.7,bh=fs*1.25;
 rr(ctx,right-bw,bottom-bh,bw,bh,bh/2);paint(ctx,'#fffaf0',1.2);text(ctx,label,right-bw/2,bottom-bh*0.27,fs,INK,800);
}
// progress !== null: serving in progress — the placed portion fills up and the bar below the grid shows serve time.
export function drawPlatePopup(ctx:Ctx,L:ReturnType<typeof plateLayout>,title:string,sub:string,blocks:Block[],cursor:Block&{ok:boolean},keys:[string,string][],progress:number|null,now:number){
 ctx.fillStyle='#10252a66';ctx.fillRect(0,0,900,520);
 rr(ctx,L.x,L.y,L.w,L.h,14);paint(ctx,'#fbfbf5',5);
 rr(ctx,L.x+7,L.y+7,L.w-14,L.h-14,9);ctx.strokeStyle='#7fb3a6';ctx.lineWidth=3;ctx.stroke();
 text(ctx,title,L.x+L.w/2,L.y+L.fs*2.1,L.fs*1.05,INK,800);
 text(ctx,sub,L.x+L.w/2,L.y+L.fs*3.3,L.fs*0.75,'#4a5550',600);
 const c=L.cell,g=4;
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){rr(ctx,L.gx+i*c+g/2,L.gy+j*c+g/2,c-g,c-g,6);paint(ctx,'#efe6d2',1.5,'#c9bba0');}
 for(const b of blocks)foodTile(ctx,b,L.gx+b.x*c,L.gy+b.y*c,c,g,L.fs,7);
 const ox=L.gx+cursor.x*c,oy=L.gy+cursor.y*c,bh=cursor.h*c-g*2,barY=L.gy+c*3+L.fs*0.55,barW=c*4-g,k=tileCorner(cursor,ox,oy,c,g);
 if(progress!==null){ // serving: portion fills bottom-up, bar under the grid
  tilePath(ctx,cursor,ox,oy,c,g,7);ctx.fillStyle=shade(cursor.color,0.55);ctx.fill();
  ctx.save();tilePath(ctx,cursor,ox,oy,c,g,7);ctx.clip();ctx.fillStyle=cursor.color;ctx.fillRect(ox,oy+g+bh*(1-Math.min(1,progress)),cursor.w*c,bh+g);ctx.restore();
  tileStroke(ctx,cursor,ox,oy,c,g,7,INK,2);
  tileArt(ctx,cursor,ox,oy,c,g,0.35+0.65*Math.min(1,progress));badge(ctx,cursor.label,k.x,k.y,L.fs*0.8);
  rr(ctx,L.gx+g/2,barY,barW,L.fs*0.5,L.fs*0.25);paint(ctx,'#e2d8c2',0);
  rr(ctx,L.gx+g/2,barY,barW*Math.min(1,progress),L.fs*0.5,L.fs*0.25);paint(ctx,'#e8a33d',0);
  keyRow(ctx,keys,L.x+L.w/2,L.y+L.h-L.fs*1.15,L.fs*0.8);return;
 }
 const pulse=0.55+0.25*Math.sin(now/180);
 tilePath(ctx,cursor,ox,oy,c,g,7);ctx.globalAlpha=pulse;ctx.fillStyle=cursor.ok?cursor.color:'#e0574f';ctx.fill();ctx.globalAlpha=1;
 ctx.setLineDash([8,5]);tileStroke(ctx,cursor,ox,oy,c,g,7,cursor.ok?'#2f8f5b':'#d9453b',4);ctx.setLineDash([]);
 if(cursor.ok){tileArt(ctx,cursor,ox,oy,c,g,0.9);badge(ctx,cursor.label,k.x,k.y,L.fs*0.8);}
 else{tileArt(ctx,cursor,ox,oy,c,g,0.35);text(ctx,'✕',ox+cursor.w*c/2,oy+cursor.h*c/2+L.fs*0.5,L.fs*1.4,'#ffffff',900);}
 keyRow(ctx,keys,L.x+L.w/2,L.y+L.h-L.fs*1.15,L.fs*0.8);
}

// Plate HUD (screen space, under the minimap): value, free cells, 4x3 grid, current activity and progress.
export function drawPlateHud(ctx:Ctx,r:{x:number;y:number;w:number},fs:number,title:string,blocks:Block[],reserved:(Rect&{cells?:Cells})|null,sub:string,progress:number){
 const pad=fs*0.6,cell=(r.w-pad*2)/4,top=r.y+pad+fs*1.25,h=pad*2+fs*1.25+cell*3+fs*2.1;
 rr(ctx,r.x-3,r.y,r.w+6,h,6);paint(ctx,'#fffaf0e8',2);
 text(ctx,title,r.x+r.w/2,r.y+pad+fs*0.85,fs,INK,800);
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){rr(ctx,r.x+pad+i*cell+1.5,top+j*cell+1.5,cell-3,cell-3,4);paint(ctx,'#efe6d2',1,'#c9bba0');}
 if(reserved){const ox=r.x+pad+reserved.x*cell,oy=top+reserved.y*cell;tilePath(ctx,reserved,ox,oy,cell,2,5);ctx.fillStyle='#d8cdb4';ctx.fill();ctx.setLineDash([4,3]);tileStroke(ctx,reserved,ox,oy,cell,2,5,'#8a7a5c',2);ctx.setLineDash([]);}
 for(const b of blocks)foodTile(ctx,b,r.x+pad+b.x*cell,top+b.y*cell,cell,2,fs*0.9,5);
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

// ---- Feast (rhythm eating) panel ----
export function feastLayout(compact:boolean,scale:number){
 const P=plateLayout(compact,scale),fs=P.fs,cell=P.cell*0.6,pad=fs*1.2,lh=Math.max(P.cell*0.95,compact?44/scale:58);
 const w=Math.max(P.w,cell*4+pad*2,fs*(compact?22:34)),top=fs*3.4,h=top+cell*3+fs*0.9+lh+fs*2.7,x=(900-w)/2,y=Math.max(6,(520-h)/2);
 return {x,y,w,h,fs,cell,gx:x+(w-cell*4)/2,gy:y+top,lx:x+pad,ly:y+top+cell*3+fs*0.9,lw:w-pad*2,lh};
}
type FeastNote={dt:number;dur:number;hold:boolean;color:string;name:string;grade:number|null;state:string};
export function drawFeast(ctx:Ctx,L:ReturnType<typeof feastLayout>,d:{title:string;sub:string;blocks:Block[];current:number;notes:FeastNote[];pressing:boolean;fx:{text:string;age:number;kind:string}[];beat:number;keys:[string,string][];now:number}){
 ctx.fillStyle='#10252a66';ctx.fillRect(0,0,900,520);
 rr(ctx,L.x,L.y,L.w,L.h,14);paint(ctx,'#fbfbf5',5);
 rr(ctx,L.x+7,L.y+7,L.w-14,L.h-14,9);ctx.strokeStyle='#e8a33d';ctx.lineWidth=3;ctx.stroke();
 text(ctx,d.title,L.x+L.w/2,L.y+L.fs*2.0,L.fs*1.05,INK,800);
 text(ctx,d.sub,L.x+L.w/2,L.y+L.fs*3.05,L.fs*0.75,'#4a5550',700);
 // plate: the portion being eaten is outlined in gold
 const c=L.cell;
 for(let j=0;j<3;j++)for(let i=0;i<4;i++){rr(ctx,L.gx+i*c+1.5,L.gy+j*c+1.5,c-3,c-3,4);paint(ctx,'#efe6d2',1,'#c9bba0');}
 d.blocks.forEach((b,i)=>{foodTile(ctx,b,L.gx+b.x*c,L.gy+b.y*c,c,2,L.fs*0.7,5);if(i===d.current)tileStroke(ctx,b,L.gx+b.x*c,L.gy+b.y*c,c,2,5,'#e8a33d',4);});
 // lane
 const cy=L.ly+L.lh/2,r=L.lh*0.34,hx=L.lx+L.lh*0.7,speed=(L.lx+L.lw-hx)/1.6;
 rr(ctx,L.lx,L.ly,L.lw,L.lh,L.lh*0.3);paint(ctx,'#efe6d2',2,'#c9bba0');
 ctx.save();rr(ctx,L.lx,L.ly,L.lw,L.lh,L.lh*0.3);ctx.clip();
 for(let k=-1;k<6;k++){const bx=hx+(k*d.beat-((d.notes[0]?.dt??0)%d.beat))*speed;line(ctx,bx,L.ly+4,bx,L.ly+L.lh-4,'#e2d5b8',1.5);} // beat ticks
 for(const n of d.notes){
  if(n.state==='done'&&n.grade!==null&&n.grade>0.6)continue; // eaten
  const x=hx+n.dt*speed;if(x-r>L.lx+L.lw||x+n.dur*speed*(n.hold?1:0)+r<L.lx)continue;
  const miss=n.state==='done',col=miss?'#b9b2a4':n.color;
  if(n.hold){const len=n.dur*speed;rr(ctx,x,cy-r*0.55,len,r*1.1,r*0.55);ctx.globalAlpha=0.7;paint(ctx,col,2);ctx.globalAlpha=1;}
  if(n.state==='held')continue;
  ell(ctx,x,cy,r*0.85,r*0.85);paint(ctx,col,2);if(!miss)drawFoodIcon(ctx,n.name,x,cy,r*1.3,r*1.3);
 }
 ctx.restore();
 // bite target (mouth)
 ell(ctx,hx,cy,r*1.05,r*1.05);ctx.fillStyle=d.pressing?'#ffe7a399':'#ffffff55';ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.stroke();
 ctx.beginPath();ctx.arc(hx,cy,r*0.55,0.15*Math.PI,0.85*Math.PI);ctx.strokeStyle=INK;ctx.lineWidth=2.5;ctx.stroke(); // smile
 for(const f of d.fx){const a=Math.max(0,1-f.age/0.6);ctx.globalAlpha=a;text(ctx,f.text,hx,L.ly-L.fs*0.25-f.age*L.fs*1.5,L.fs*0.95,f.kind==='perfect'?'#c9831a':f.kind==='good'?'#2f8f5b':'#d9453b',900);ctx.globalAlpha=1;}
 keyRow(ctx,d.keys,L.x+L.w/2,L.y+L.h-L.fs*1.15,L.fs*0.8);
}
