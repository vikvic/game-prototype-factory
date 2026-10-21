import { crew, gates, props, wingFootprint, type WingWorld } from './wing-world';

function box(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,angle=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();}
function line(c:CanvasRenderingContext2D,points:number[],color:string,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.stroke();}
function sparkle(c:CanvasRenderingContext2D,x:number,y:number,r:number){c.fillStyle='#fff7cc';c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.28,y-r*.25);c.lineTo(x+r,y);c.lineTo(x+r*.28,y+r*.25);c.lineTo(x,y+r);c.lineTo(x-r*.28,y+r*.25);c.lineTo(x-r,y);c.lineTo(x-r*.28,y-r*.25);c.fill();}

export function drawStar(c:CanvasRenderingContext2D,open:number,t:number,walk:number,recoil=0,facing=1){
  c.save();c.translate(recoil>0?Math.sin(t*48)*5:0,Math.sin(t*9)*Math.min(walk/170,1)*2);
  oval(c,0,5,39,10,'#0006');
  // Feathers fold toward the body. Their delay and overshoot are deliberate comedy.
  for(const side of [-1,1]){
    c.save();c.translate(side*7,-65);c.rotate(side*(.13+Math.sin(t*5)*.035)*open);
    const spread=23+open*66;
    for(let i=0;i<10;i++){
      const angle=side*(-.5+i*.105),x=side*(9+i*spread/13),y=-18-i*3.7+Math.sin(t*4-i*.3)*open*2;
      oval(c,x,y,7+(1-open)*2,25+i*2,['#e2e3f4','#faf8ff','#f1edf8'][i%3],angle);
      line(c,[x,y-12,x+side*2,y+15],'#c1c2d5',.65);
    }
    c.restore();
  }
  const stride=Math.sin(t*11)*Math.min(walk/160,1)*10;
  for(const side of [-1,1]){
    line(c,[side*7,-31,side*8+stride*side,-13,side*10+stride*side*.5,2],'#e7b59c',7);
    line(c,[side*10+stride*side*.5,2,side*10+stride*side*.5+7*facing,3],'#e0e9f3',4);
  }
  // The outfit references the white skirt and jeweled runway look, not a pink jacket.
  c.fillStyle='#f0eefb';c.beginPath();c.moveTo(-13,-51);c.lineTo(13,-51);c.lineTo(18,-25);c.quadraticCurveTo(0,-17,-18,-25);c.closePath();c.fill();
  line(c,[-15,-41,14,-37],'#c8c8df',1.2);
  oval(c,0,-64,16,22,'#e5b59e');
  c.fillStyle='#e2e4ee';c.beginPath();c.moveTo(-15,-75);c.quadraticCurveTo(-2,-82,0,-69);c.quadraticCurveTo(2,-82,15,-75);c.lineTo(12,-60);c.quadraticCurveTo(0,-52,-12,-60);c.closePath();c.fill();
  for(let i=-10;i<=10;i+=5)for(let j=0;j<3;j++)oval(c,i,-74+j*5,1.4,1.5,'#fff');
  sparkle(c,0,-62,5);oval(c,0,-62,2.5,3.5,'#f2c44f');
  for(const side of [-1,1])line(c,[side*14,-73,side*23,-54,side*(open>.6?36:17),-60],'#edc2a7',6);
  // A large face remains readable while moving; no sunglasses conceal the likeness cues.
  oval(c,0,-106,22,28,'#211b23');
  c.fillStyle='#211b23';c.beginPath();c.moveTo(-20,-109);c.bezierCurveTo(-28,-85,-12,-79,-25,-57);c.lineTo(-12,-58);c.lineTo(-11,-107);c.closePath();c.fill();
  c.beginPath();c.moveTo(14,-112);c.bezierCurveTo(28,-91,12,-80,24,-60);c.lineTo(12,-62);c.lineTo(9,-110);c.closePath();c.fill();
  oval(c,1,-106,16,23,'#eac0a7');
  c.fillStyle='#211b23';c.beginPath();c.moveTo(-17,-110);c.bezierCurveTo(-18,-140,30,-136,18,-105);c.bezierCurveTo(13,-116,-2,-121,-17,-110);c.fill();
  line(c,[-11,-111,-5,-113,-1,-111],'#3a2525',2.5);line(c,[5,-111,10,-113,14,-110],'#3a2525',2.5);
  const blink=Math.sin(t*.8)>.995;
  if(!blink){oval(c,-5,-104,5,2.5,'#fff2e6');oval(c,10,-104,5,2.5,'#fff2e6');}
  line(c,[-10,-105,-5,-104,-1,-105],'#2f202a',blink?1.5:2);line(c,[5,-105,10,-104,14,-105],'#2f202a',blink?1.5:2);
  if(!blink){oval(c,-5,-104,1.3,1.9,'#3b2420');oval(c,10,-104,1.3,1.9,'#3b2420');}
  line(c,[3,-103,5,-97,1,-96],'#bd8c7c',1);
  c.fillStyle=recoil>0?'#8e364e':'#ab5b64';c.beginPath();c.moveTo(-4,-90);c.quadraticCurveTo(1,-95,4,-91);c.quadraticCurveTo(9,-94,11,-90);c.quadraticCurveTo(3,-84,-4,-90);c.fill();
  oval(c,-14,-96,2,2,'#f1d894');oval(c,17,-96,2,2,'#f1d894');
  if(open>.7){sparkle(c,-10+Math.sin(t*2)*8,-71,3+Math.sin(t*6));sparkle(c,48,-83+Math.sin(t)*10,4);}
  c.restore();
}

export function drawWingScene(c:CanvasRenderingContext2D,w:WingWorld,pixelsW:number,pixelsH:number){
  const aspect=pixelsW/pixelsH,viewW=Math.max(720,Math.min(1150,960*Math.pow(aspect/2.25,.35))),h=viewW/aspect;
  c.setTransform(pixelsW/viewW,0,0,pixelsW/viewW,0,0);
  const camera=Math.max(0,Math.min(2800-viewW,w.x-viewW*.32)),base=(h-160)/2+65;
  const p=(x:number,z:number)=>({x:x-camera+z*.16,y:base+z*.48});
  const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#201722');bg.addColorStop(1,'#4e3b45');c.fillStyle=bg;c.fillRect(0,0,viewW,h);
  const floor=p(0,0);c.fillStyle='#7d6570';c.fillRect(0,floor.y,viewW,190);
  for(let x=Math.floor(camera/90)*90;x<camera+viewW;x+=90){const a=p(x,0),b=p(x,320);line(c,[a.x,a.y,b.x,b.y],'#ffffff0c');}
  for(const z of [0,80,160,240,320]){const a=p(camera,z);line(c,[0,a.y,viewW,a.y],'#ffffff0d');}
  // Runway at the start, then a genuinely cramped backstage route.
  const runway=p(0,40);box(c,runway.x,runway.y,430,100,2,'#c57896');
  for(let x=40;x<430;x+=55){const a=p(x,25);sparkle(c,a.x,a.y,3);}
  for(let x=35;x<430;x+=62){const a=p(x,315);oval(c,a.x,a.y-15,13,14,'#261e2a');box(c,a.x-16,a.y-6,32,20,6,'#3e3240');}
  for(const [x,label] of [[40,'RUNWAY / LA'],[740,'BACKSTAGE'],[1460,'MEDIA CORRIDOR'],[2240,'CAR PICKUP']] as const){
    const a=p(x,0);box(c,a.x,a.y-118,220,32,3,'#291f2b');c.fillStyle='#f6c7d9';c.font='800 15px system-ui';c.textAlign='left';c.fillText(label,a.x+12,a.y-97);
  }
  for(let x=500;x<2500;x+=150){const a=p(x,0);line(c,[a.x,a.y-70,a.x+30,a.y-70],'#b99270',3);oval(c,a.x+15,a.y-70,4,4,'#ffe9b9');}
  const obstacles=[...props.map(r=>({z:r.z+r.d,draw:()=>{
    const a=p(r.x,r.z),b=p(r.x,r.z+r.d);box(c,a.x+4,a.y+8,r.w,r.d*.48,3,'#0004');
    if(r.kind==='clothing rack'){
      line(c,[a.x,a.y,a.x,a.y-65,a.x+r.w,a.y-65,a.x+r.w,a.y],'#aab4c3',5);
      for(let i=0;i<6;i++){const x=a.x+10+i*21;line(c,[x,a.y-65,x+6,a.y-58],'#d9dbe9');box(c,x,a.y-56,19,54,3,['#dab9cb','#9b809c','#ece0d6'][i%3]);}
      oval(c,a.x,a.y+4,5,5,'#20202a');oval(c,a.x+r.w,a.y+4,5,5,'#20202a');
    }else if(r.kind==='makeup station'){
      box(c,a.x,a.y-60,r.w,65,5,'#b4838e');box(c,a.x+12,a.y-100,r.w-24,50,3,'#88949e');
      for(let i=0;i<5;i++)oval(c,a.x+15+i*17,a.y-100,3,3,'#fff4c9');
    }else{box(c,a.x,a.y-34,r.w,b.y-a.y+34,5,'#34313f');line(c,[a.x+8,a.y-20,a.x+r.w-8,a.y-20],'#a6a0b4',2);box(c,a.x+27,a.y-14,20,6,2,'#17141d');}
  }})),...gates.flatMap((g,index)=>{
    const wall=(lo:number,hi:number,height:number)=>{const a=p(g.x-16,lo),b=p(g.x+16,hi);box(c,a.x,a.y-height,b.x-a.x,b.y-a.y+height,2,'#60394d');for(let x=a.x+4;x<b.x;x+=7)line(c,[x,a.y-height+3,x,b.y],'#8a526a',3);};
    // Separate depth layers and cut away the foreground wall so the real gap stays visible.
    return [{z:g.lo/2,draw:()=>wall(0,g.lo,145)},{z:(g.hi+320)/2,draw:()=>wall(g.hi,320,12)},{z:(g.lo+g.hi)/2,draw:()=>{
    const a=p(g.x,g.lo),b=p(g.x,g.hi);c.fillStyle='#ffe6a333';c.beginPath();c.moveTo(a.x-20,a.y);c.lineTo(a.x+20,a.y);c.lineTo(b.x+20,b.y);c.lineTo(b.x-20,b.y);c.closePath();c.fill();
    line(c,[a.x,a.y,a.x,a.y-145,b.x,b.y-145,b.x,b.y],'#efd7ae',5);
    c.save();c.translate((a.x+b.x)/2-4,(a.y+b.y)/2-150);c.fillStyle='#f7e1ba';c.textAlign='center';c.font='800 10px system-ui';c.fillText(g.label,0,0);c.restore();
    const mid=p(g.x-52,(g.lo+g.hi)/2);c.fillStyle=index<w.doors?'#9ee9bc':'#ffe3a4';c.font='800 12px system-ui';c.textAlign='center';c.fillText(index<w.doors?'✓ CLEAR':'TUCK →',mid.x-8,mid.y+15);
  }}];}),...crew(w).map(person=>({z:person.z,draw:()=>{
    const a=p(person.x,person.z);oval(c,a.x,a.y+3,21,7,'#0005');line(c,[a.x-7,a.y,a.x-5,a.y-23,a.x+6,a.y-23,a.x+9,a.y],'#282331',7);box(c,a.x-13,a.y-49,27,31,5,person.kind==='phone'?'#b7886d':person.kind==='tv'?'#637082':'#342f3c');oval(c,a.x,a.y-60,11,13,'#d8ae91');
    if(person.kind==='press'){box(c,a.x-12,a.y-57,28,14,3,'#17151e');box(c,a.x-34,a.y-55,24,10,3,'#343542');oval(c,a.x-33,a.y-50,5,6,'#a9c6d6');}
    if(person.kind==='phone'){box(c,a.x-21,a.y-69,12,22,2,'#17151e');box(c,a.x-19,a.y-66,8,14,1,'#b1dce3');}
    if(person.kind==='tv'){box(c,a.x-27,a.y-65,32,20,3,'#24232f');line(c,[a.x-12,a.y-57,a.x-65,a.y-99],'#211e2a',4);oval(c,a.x-67,a.y-101,13,5,'#22212a',.3);}
    if(person.warning){c.strokeStyle='#ffc577';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y-58,22,0,Math.PI*2);c.stroke();c.fillStyle='#ffe3ab';c.font='900 13px system-ui';c.fillText('!',a.x+27,a.y-55);}
    if(person.flash){sparkle(c,a.x-25,a.y-54,24);}
  }})),{z:w.z,draw:()=>{const a=p(w.x,w.z);c.save();c.translate(a.x,a.y);c.rotate(w.lean*.008);drawStar(c,w.open,w.elapsed,w.moving,w.recoil,w.facing);c.restore();}}];
  obstacles.sort((a,b)=>a.z-b.z).forEach(o=>o.draw());
  // The oversized pickup is a readable destination, not a generic EXIT rectangle.
  const car=p(2570,110);box(c,car.x-8,car.y-65,160,67,18,'#1d202b');box(c,car.x+13,car.y-85,107,40,15,'#282e3b');box(c,car.x+23,car.y-78,83,25,6,'#8aadb9');oval(c,car.x+22,car.y+2,15,15,'#10121a');oval(c,car.x+125,car.y+2,15,15,'#10121a');box(c,car.x-9,car.y-40,9,15,3,'#fff0b7');
  c.fillStyle='#e4ffca';c.font='800 15px system-ui';c.textAlign='center';c.fillText('YOUR CAR ↓',car.x+70,car.y-104);
  for(const f of w.particles){const a=p(f.x,f.z);c.save();c.translate(a.x,a.y-65);c.rotate(w.elapsed*3);oval(c,0,0,3,10,`rgba(255,250,245,${Math.min(1,f.life)})`);c.restore();}
  const block=w.phase==='playing'?w.blocked:null;
  if(block){
    // Ground outlines expose the actual depth/width collision, even behind the tall artwork.
    const footprint=(x:number,z:number,width:number,depth:number,color:string)=>{
      const points=[p(x,z),p(x+width,z),p(x+width,z+depth),p(x,z+depth)];
      c.beginPath();points.forEach((a,i)=>i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y));c.closePath();
      c.fillStyle=color+'30';c.fill();c.strokeStyle=color;c.lineWidth=2.5;c.stroke();
    };
    const r=block.obstacle,{rx,rz}=wingFootprint(w.open);
    footprint(r.x,r.z,r.w,r.d,'#ff866f');
    footprint(w.x-rx,w.z-rz,rx*2,rz*2,'#95e8ff');
    const contact=p(block.contact.x,block.contact.z);
    oval(c,contact.x,contact.y,7,7,'#24151e');
    line(c,[contact.x-4,contact.y-4,contact.x+4,contact.y+4],'#ffb09b',2.5);
    line(c,[contact.x+4,contact.y-4,contact.x-4,contact.y+4],'#ffb09b',2.5);
    const label=block.cause==='wings'?'WINGS TOO WIDE':'SOLID OBSTACLE',labelWidth=block.cause==='wings'?128:136;
    const lx=Math.max(labelWidth/2+8,Math.min(viewW-labelWidth/2-8,contact.x)),ly=Math.max(18,Math.min(h-54,contact.y-25));
    box(c,lx-labelWidth/2,ly-13,labelWidth,23,5,'#291923');c.fillStyle='#ffceb9';c.font='800 11px system-ui';c.textAlign='center';c.fillText(label,lx,ly+2);
    if(block.steer){
      const a=p(w.x,w.z),target=p(block.steer.x,block.steer.z),angle=Math.atan2(target.y-a.y,target.x-a.x);
      const start={x:a.x+Math.cos(angle)*16,y:a.y+Math.sin(angle)*16},end={x:a.x+Math.cos(angle)*47,y:a.y+Math.sin(angle)*47};
      line(c,[start.x,start.y,end.x,end.y],'#15252b',7);line(c,[start.x,start.y,end.x,end.y],'#b0f3df',3);
      line(c,[end.x-11*Math.cos(angle-.55),end.y-11*Math.sin(angle-.55),end.x,end.y,end.x-11*Math.cos(angle+.55),end.y-11*Math.sin(angle+.55)],'#b0f3df',3);
    }
  }
  if(w.flash>0){c.fillStyle=`rgba(255,255,255,${w.flash*2})`;c.fillRect(0,0,viewW,h);}
  if(w.phase==='intro'){const x=viewW*.76,y=Math.min(h-18,h*.65+90);c.save();c.translate(x,y);c.scale(1.5,1.5);drawStar(c,1,performance.now()/1000,0);c.restore();}
}
