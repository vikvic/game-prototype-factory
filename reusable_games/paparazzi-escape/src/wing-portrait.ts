import { drawStar } from './wing-art';
import { crew, gates, props, wingFootprint, type WingWorld } from './wing-world';

export function portraitMessage(message:string){
  const directions:Record<string,string>={'DOWN ↓':'RIGHT →','UP ↑':'LEFT ←','LEFT ←':'DOWN ↓','RIGHT →':'UP ↑'};
  return message.replace(/DOWN ↓|UP ↑|LEFT ←|RIGHT →/g,word=>directions[word]);
}

/** The same x-progress/z-lateral world, viewed looking up the corridor. */
export function drawWingPortrait(c:CanvasRenderingContext2D,w:WingWorld,pixelsW:number,pixelsH:number){
  const scale=Math.min(pixelsW/360,pixelsH/480),width=pixelsW/scale,height=pixelsH/scale;
  c.setTransform(scale,0,0,scale,0,0);
  const anchor=height*.74;
  const p=(x:number,z:number)=>({x:width/2+z-160,y:anchor-(x-w.x)});
  const line=(points:number[],color:string,size=2)=>{
    c.beginPath();c.moveTo(points[0],points[1]);
    for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
    c.strokeStyle=color;c.lineWidth=size;c.lineCap='round';c.stroke();
  };
  const box=(x:number,y:number,wide:number,tall:number,color:string,radius=5)=>{
    c.fillStyle=color;c.beginPath();c.roundRect(x,y,wide,tall,radius);c.fill();
  };
  const floor=(x:number,z:number,length:number,depth:number,color:string,stroke='')=>{
    const a=p(x+length,z);box(a.x,a.y,depth,length,color,3);
    if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.strokeRect(a.x,a.y,depth,length);}
  };
  const label=(text:string,x:number,y:number,color='#fff1dd',size=11)=>{
    c.fillStyle=color;c.font=`800 ${size}px system-ui`;c.textAlign='center';c.fillText(text,x,y);
  };
  const bg=c.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#241c2d');bg.addColorStop(1,'#46303e');
  c.fillStyle=bg;c.fillRect(0,0,width,height);
  box(width/2-165,0,330,height,'#5b4655',0);
  for(let x=Math.floor((w.x-height)/80)*80;x<w.x+height;x+=80){
    const a=p(x,0),b=p(x,320);line([a.x,a.y,b.x,b.y],'#ffffff0c',1);
  }
  for(const z of [0,80,160,240,320])line([p(w.x,z).x,0,p(w.x,z).x,height],'#ffffff0b',1);
  line([width/2-165,0,width/2-165,height],'#bd8b9e',5);
  line([width/2+165,0,width/2+165,height],'#bd8b9e',5);

  floor(0,40,430,240,'#b87593');
  for(let x=30;x<430;x+=55){
    for(const z of [15,305]){
      const a=p(x,z);box(a.x-9,a.y-9,18,22,'#302332',7);
      c.fillStyle='#1d1926';c.beginPath();c.arc(a.x,a.y-10,7,0,Math.PI*2);c.fill();
    }
  }
  const section=w.x<530?'RUNWAY':w.x<1400?'BACKSTAGE':w.x<2200?'MEDIA CORRIDOR':'CAR PICKUP';
  label(section,width/2,23,'#eac0d0',11);

  for(const gate of gates){
    // The solid footprint is also the visible wall: no foreground curtain hides the gap.
    floor(gate.x-16,0,32,gate.lo,'#734357','#ad708a');
    floor(gate.x-16,gate.hi,32,320-gate.hi,'#734357','#ad708a');
    floor(gate.x-22,gate.lo,44,gate.hi-gate.lo,'#a9efd627','#b4efd2');
    const a=p(gate.x+40,(gate.lo+gate.hi)/2),cleared=w.x>gate.x+55;
    label(cleared?'✓ CLEAR':'TUCK ↑',a.x,a.y,cleared?'#b4efd2':'#ffdf9c',12);
    const b=p(gate.x-35,160);label(gate.label,b.x,b.y,'#f1c9d6',10);
    const postA=p(gate.x,gate.lo),postB=p(gate.x,gate.hi);
    line([postA.x,postA.y-20,postA.x,postA.y+20],'#ffe0a6',4);
    line([postB.x,postB.y-20,postB.x,postB.y+20],'#ffe0a6',4);
  }
  for(const r of props){
    const a=p(r.x+r.w,r.z);
    floor(r.x-5,r.z+4,r.w+7,r.d,'#19151c66');
    floor(r.x,r.z,r.w,r.d,r.kind==='clothing rack'?'#6c5268':r.kind==='makeup station'?'#976877':'#333443','#aa91a7');
    if(r.kind==='clothing rack'){
      line([a.x+10,a.y+10,a.x+10,a.y+r.w-10],'#ced3dd',4);
      for(let i=0;i<5;i++){
        const y=a.y+12+i*24;line([a.x+10,y+6,a.x+r.d-12,y+6],'#c9b8c5',1);
        box(a.x+22,y,r.d-36,18,['#eed9e5','#9676a4','#e7c7bb'][i%3],3);
      }
    }else if(r.kind==='makeup station'){
      box(a.x+12,a.y+8,r.d-24,25,'#94b1b7',3);
      for(let i=0;i<4;i++){c.fillStyle='#ffe9a8';c.beginPath();c.arc(a.x+16+i*21,a.y+8,3,0,Math.PI*2);c.fill();}
      box(a.x+r.d/2-10,a.y+50,20,22,'#cba6a8',5);
    }else{
      line([a.x+8,a.y+10,a.x+r.d-8,a.y+10],'#c2bdca',2);
      box(a.x+r.d/2-10,a.y+r.w/2-4,20,8,'#16171f',2);
    }
  }
  for(const person of crew(w)){
    const a=p(person.x,person.z),coat=person.kind==='phone'?'#bd947d':person.kind==='tv'?'#7a94ab':'#3b3649';
    box(a.x-17,a.y-13,34,32,coat,9);
    c.fillStyle='#e0b59a';c.beginPath();c.arc(a.x,a.y-17,10,0,Math.PI*2);c.fill();
    if(person.kind==='phone'){box(a.x+13,a.y-30,10,19,'#1d1c29',2);box(a.x+15,a.y-27,6,12,'#a8d4dc',1);}
    else{
      box(a.x-20,a.y-16,27,14,'#151723',3);
      if(person.kind==='tv')line([a.x,a.y,a.x+45,a.y-45],'#b7bbc4',3);
      else box(a.x-32,a.y-11,15,8,'#9db3c3',2);
    }
    if(person.warning){c.strokeStyle='#ffd27e';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y,27,0,Math.PI*2);c.stroke();label('FLASH',a.x,a.y-38,'#ffe1aa',10);}
    if(person.flash){c.fillStyle='#fff2bb';c.beginPath();c.arc(a.x-25,a.y-12,14,0,Math.PI*2);c.fill();}
  }

  const car=p(2600,160);box(car.x-62,car.y-58,124,112,'#222832',19);
  box(car.x-47,car.y-31,94,42,'#8baeb9',9);box(car.x-52,car.y+25,104,20,'#343946',6);
  for(const side of [-1,1]){box(car.x+side*50-6,car.y-52,12,13,'#ffe7a6',3);box(car.x+side*63-4,car.y-24,8,29,'#14151d',3);}
  label('YOUR CAR',car.x,car.y-76,'#cef1b8',14);

  const nearDoor=gates.some(g=>Math.abs(g.x-w.x)<240);
  const nearProp=props.some(r=>Math.abs(r.x+r.w/2-w.x)<160&&Math.abs(r.z+r.d/2-w.z)<150);
  const {rx,rz}=wingFootprint(w.open),block=w.phase==='playing'?w.blocked:null;
  if(w.phase==='playing'&&(nearDoor||nearProp||block)){
    floor(w.x-rx,w.z-rz,rx*2,rz*2,'#95e8ff19','#95e8ff');
    const a=p(w.x,w.z);line([a.x-rz,a.y+rx+4,a.x+rz,a.y+rx+4],'#95e8ff',3);
  }
  if(w.phase!=='intro'){
    const a=p(w.x,w.z);c.save();c.translate(a.x,a.y);drawStar(c,w.open,w.elapsed,w.moving,w.recoil,w.facing);c.restore();
  }
  // Clearance is an overlay: keep its leading edge and the gap readable over the costume.
  if(w.phase==='playing'&&(nearDoor||nearProp||block)){
    const a=p(w.x+rx,w.z-rz);c.strokeStyle='#95e8ff';c.lineWidth=2;c.strokeRect(a.x,a.y,rz*2,rx*2);
    for(const gate of gates){if(Math.abs(gate.x-w.x)<240){const gap=p(gate.x+22,gate.lo);c.strokeStyle='#b4efd2';c.strokeRect(gap.x,gap.y,gate.hi-gate.lo,44);}}
  }
  if(block){
    const r=block.obstacle;floor(r.x,r.z,r.w,r.d,'#ff876f36','#ff9c7c');
    const a=p(block.contact.x,block.contact.z);
    line([a.x-5,a.y-5,a.x+5,a.y+5],'#ffcfb9',3);line([a.x+5,a.y-5,a.x-5,a.y+5],'#ffcfb9',3);
    const text=block.cause==='wings'?'WINGS TOO WIDE':'SOLID OBSTACLE',x=width/2,y=49;
    box(x-73,y-14,146,23,'#261821',5);label(text,x,y+2,'#ffd0b8',11);
    if(block.steer){
      const start=p(w.x,w.z),target=p(block.steer.x,block.steer.z),angle=Math.atan2(target.y-start.y,target.x-start.x);
      const end={x:start.x+Math.cos(angle)*45,y:start.y+Math.sin(angle)*45};
      line([start.x,start.y,end.x,end.y],'#172729',7);line([start.x,start.y,end.x,end.y],'#b6f5de',3);
      line([end.x-11*Math.cos(angle-.55),end.y-11*Math.sin(angle-.55),end.x,end.y,end.x-11*Math.cos(angle+.55),end.y-11*Math.sin(angle+.55)],'#b6f5de',3);
    }
  }
  for(const feather of w.particles){const a=p(feather.x,feather.z);c.save();c.translate(a.x,a.y-55);c.rotate(w.elapsed*3);c.fillStyle=`rgba(255,249,244,${Math.min(1,feather.life)})`;c.beginPath();c.ellipse(0,0,3,9,0,0,Math.PI*2);c.fill();c.restore();}
  if(w.flash>0){c.fillStyle=`rgba(255,255,255,${w.flash*2})`;c.fillRect(0,0,width,height);}
  if(w.phase==='intro'){
    c.save();c.translate(width/2,Math.max(120,Math.min(250,height-225)));
    const size=Math.max(.85,Math.min(1.15,(height-225)/150));c.scale(size,size);drawStar(c,1,performance.now()/1000,0);c.restore();
  }
}
