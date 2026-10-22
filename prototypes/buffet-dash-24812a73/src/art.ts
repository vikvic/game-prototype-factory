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

// Floor tiles, back wall and the round home rug (rug radius matches the 78-unit home range).
export function drawRoom(ctx:Ctx,compact:boolean,home:Point){
 for(let y=0;y<520;y+=40)for(let x=0;x<900;x+=40){ctx.fillStyle=(x+y)/40%2?'#efe4cc':'#f7efdc';ctx.fillRect(x,y,40,40);}
 ctx.strokeStyle='#e2d5b8';ctx.lineWidth=1;
 for(let x=0;x<=900;x+=40)line(ctx,x,0,x,520,'#e2d5b8',1);for(let y=0;y<=520;y+=40)line(ctx,0,y,900,y,'#e2d5b8',1);
 ctx.fillStyle='#e9d3a6';ctx.fillRect(0,0,900,30);
 ctx.fillStyle='#d9bf8c';for(let x=0;x<900;x+=18)ctx.fillRect(x,0,9,30);
 ctx.fillStyle='#8a6444';ctx.fillRect(0,30,900,6);ctx.fillStyle='#00000018';ctx.fillRect(0,36,900,5);
 for(const wx of [80,270,630,820]){rr(ctx,wx-30,4,60,20,3);paint(ctx,'#bfe3f2');line(ctx,wx,5,wx,23,INK,2);line(ctx,wx-29,14,wx+29,14,'#ffffffaa',2);}
 if(!compact){rr(ctx,385,4,130,22,5);paint(ctx,'#fffaf0');text(ctx,'THE BUFFET',450,20,13,'#8a6444',800);}
 ell(ctx,home.x,home.y,78,78);paint(ctx,'#bfd9c8',2,'#6fa58d');
 ell(ctx,home.x,home.y,66,66);ctx.setLineDash([6,5]);ctx.strokeStyle='#6fa58d';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
 ell(ctx,home.x,home.y,40,40);paint(ctx,'#d4e7da',0);
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
export function drawStation(ctx:Ctx,s:Station,compact:boolean,scale:number){
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
 const fs=compact?10/scale:13;ctx.font=`800 ${fs}px system-ui`;const tw=ctx.measureText(s.name).width+14;
 const ny=compact?y+42+fs*0.75:y+18; // small screens: nameplate sits below the counter so the food stays visible
 rr(ctx,x-tw/2,ny-fs*0.75,tw,fs*1.5,4);paint(ctx,'#fffaf0');
 text(ctx,s.name,x,ny+fs*0.36,fs,INK,800);
}

// Home table: wooden table with a place setting and two chairs.
export function drawTable(ctx:Ctx,t:Point,compact:boolean,scale:number){
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
 const fs=compact?10/scale:13;text(ctx,compact?'HOME':'HOME TABLE',x,y+15+fs*0.36,fs,'#fff6dd',800);
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

// "!" bubble over the player's head, as when something catches a trainer's eye.
export function drawBubble(ctx:Ctx,x:number,y:number){
 rr(ctx,x-9,y-12,18,20,6);paint(ctx,'#ffffff');
 ctx.beginPath();ctx.moveTo(x-3,y+7);ctx.lineTo(x+1,y+13);ctx.lineTo(x+4,y+7);ctx.fillStyle='#fff';ctx.fill();
 text(ctx,'!',x,y+5,16,'#e0453b',900);
}

// Classic RPG dialogue box for ready / end-of-round messages.
export function drawDialog(ctx:Ctx,title:string,sub:string,now:number){
 rr(ctx,130,145,640,150,14);paint(ctx,'#fbfbf5',5);
 rr(ctx,140,155,620,130,9);ctx.strokeStyle='#7fb3a6';ctx.lineWidth=3;ctx.stroke();
 text(ctx,title,450,208,28,INK,800);text(ctx,sub,450,248,18,'#4a5550',600);
 if(Math.floor(now/450)%2){ctx.beginPath();ctx.moveTo(732,262);ctx.lineTo(746,262);ctx.lineTo(739,271);ctx.closePath();ctx.fillStyle='#e0453b';ctx.fill();}
}
