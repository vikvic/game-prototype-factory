function box(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,color:string){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,angle=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);c.fill();}
function line(c:CanvasRenderingContext2D,points:number[],color:string,width=2){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);c.stroke();}
function sparkle(c:CanvasRenderingContext2D,x:number,y:number,r:number){c.fillStyle='#fff7cc';c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.28,y-r*.25);c.lineTo(x+r,y);c.lineTo(x+r*.28,y+r*.25);c.lineTo(x,y+r);c.lineTo(x-r*.28,y+r*.25);c.lineTo(x-r,y);c.lineTo(x-r*.28,y-r*.25);c.fill();}

export type StarMood='neutral'|'happy'|'sad';

export function drawStar(c:CanvasRenderingContext2D,open:number,t:number,walk:number,recoil=0,facing=1,mood:StarMood='neutral'){
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
  if(mood==='sad'){
    line(c,[-11,-114,-5,-117,-1,-119],'#3a2525',2.5);line(c,[5,-119,10,-117,15,-114],'#3a2525',2.5);
  }else{line(c,[-11,-111,-5,-113,-1,-111],'#3a2525',2.5);line(c,[5,-111,10,-113,14,-110],'#3a2525',2.5);}
  const blink=mood==='neutral'&&Math.sin(t*.8)>.995;
  if(mood==='happy'){
    line(c,[-10,-104,-5,-108,-1,-104],'#2f202a',2);line(c,[5,-104,10,-108,15,-104],'#2f202a',2);
    oval(c,-9,-98,4,2,'#df869566');oval(c,13,-98,4,2,'#df869566');
  }else{
    if(!blink){oval(c,-5,-104,5,2.5,'#fff2e6');oval(c,10,-104,5,2.5,'#fff2e6');}
    line(c,[-10,-105,-5,-104,-1,-105],'#2f202a',blink?1.5:2);line(c,[5,-105,10,-104,14,-105],'#2f202a',blink?1.5:2);
    if(!blink){oval(c,-5,-104,1.3,1.9,'#3b2420');oval(c,10,-104,1.3,1.9,'#3b2420');}
  }
  line(c,[3,-103,5,-97,1,-96],'#bd8c7c',1);
  if(mood==='happy'){
    c.fillStyle='#813d50';c.beginPath();c.moveTo(-6,-94);c.quadraticCurveTo(3,-90,13,-94);c.quadraticCurveTo(4,-78,-6,-94);c.fill();line(c,[-3,-92,4,-91,10,-92],'#fff6ee',2);
  }else if(mood==='sad'){
    c.strokeStyle='#9e5067';c.lineWidth=2.5;c.beginPath();c.moveTo(-4,-88);c.quadraticCurveTo(4,-98,12,-88);c.stroke();
    for(const x of [-9,14]){c.fillStyle='#94dcff';c.beginPath();c.moveTo(x,-101);c.quadraticCurveTo(x-5,-94,x,-92);c.quadraticCurveTo(x+5,-94,x,-101);c.fill();}
  }else{c.fillStyle=recoil>0?'#8e364e':'#ab5b64';c.beginPath();c.moveTo(-4,-90);c.quadraticCurveTo(1,-95,4,-91);c.quadraticCurveTo(9,-94,11,-90);c.quadraticCurveTo(3,-84,-4,-90);c.fill();}
  oval(c,-14,-96,2,2,'#f1d894');oval(c,17,-96,2,2,'#f1d894');
  if(open>.7){sparkle(c,-10+Math.sin(t*2)*8,-71,3+Math.sin(t*6));sparkle(c,48,-83+Math.sin(t)*10,4);}
  c.restore();
}
