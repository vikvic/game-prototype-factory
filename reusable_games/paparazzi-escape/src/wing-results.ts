import { drawStar, type StarMood } from './wing-art';
import type { Edition } from './main';

export const resultMood=(won:boolean):StarMood=>won?'happy':'sad';

function decorations(c:CanvasRenderingContext2D,won:boolean,width:number,height:number){
  for(let i=0;i<20;i++){
    const x=(i*173+41)%width,y=(i*97+27)%height;
    c.save();c.translate(x,y);c.rotate(i*.8);c.fillStyle=won?['#ffe7a6','#f6add8','#a6e8d6'][i%3]:'#aaa2cc';
    if(won)c.fillRect(-3,-7,6,14);else{c.beginPath();c.ellipse(0,0,3,10,0,0,Math.PI*2);c.fill();}c.restore();
  }
}

export function paintResultPortrait(canvas:HTMLCanvasElement,won:boolean){
  canvas.width=300;canvas.height=240;const c=canvas.getContext('2d')!;
  c.fillStyle=won?'#574046':'#34374e';c.beginPath();c.roundRect(0,0,300,240,30);c.fill();
  c.fillStyle=won?'#ffd68e2b':'#96b7e92b';c.beginPath();c.ellipse(150,115,132,104,0,0,Math.PI*2);c.fill();
  decorations(c,won,300,230);c.save();c.translate(150,278);c.scale(2,2);drawStar(c,won?1:.35,0,0,0,1,resultMood(won));c.restore();
  canvas.dataset.mood=resultMood(won);canvas.setAttribute('aria-label',won?'Happy Kylie celebrating her escape':'Sad Kylie with tears after losing to the doors');
}

function wrapped(c:CanvasRenderingContext2D,text:string,y:number,width:number,lineHeight:number){
  let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>width){c.fillText(line,540,y);y+=lineHeight;line=word;}else line=next;}if(line)c.fillText(line,540,y);return y;
}

export function makeResultCard(edition:Edition,won:boolean,headline:string,detail:string,url:string){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d')!;
  const bg=c.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,won?'#59404c':'#36384f');bg.addColorStop(1,'#201b2b');c.fillStyle=bg;c.fillRect(0,0,1080,1350);
  decorations(c,won,1080,820);c.textAlign='center';c.fillStyle='#f4b5d4';c.font='800 24px system-ui';c.fillText(edition.brand.toUpperCase(),540,65);
  c.fillStyle=won?'#ffe0a0':'#b9d8ff';c.font='900 49px system-ui';c.fillText(won?'WINGS OUT. EGO INTACT.':'THE DOOR WON.',540,137);
  c.save();c.translate(540,780);c.scale(4.2,4.2);drawStar(c,won?1:.35,0,0,0,1,resultMood(won));c.restore();
  c.fillStyle='#fff6e8';c.font='800 45px system-ui';wrapped(c,headline,880,920,55);
  c.fillStyle='#e6cbd8';c.font='600 27px system-ui';wrapped(c,detail,1040,920,34);
  c.fillStyle=won?'#ffe0a0':'#b9d8ff';c.beginPath();c.roundRect(80,1130,920,100,25);c.fill();c.fillStyle='#282034';c.font='900 38px system-ui';c.fillText(won?'Can you get these wings out?':'Your turn. Beat the doorway.',540,1193);
  c.fillStyle='#fff6e8';c.font='800 28px system-ui';c.fillText(edition.title,540,1270);c.font='18px system-ui';c.fillText(url,540,1306,980);c.fillStyle='#b9adbc';c.font='16px system-ui';c.fillText('Fictional backstage comedy · Unofficial',540,1334);
  const dataUrl=canvas.toDataURL('image/png'),bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),char=>char.charCodeAt(0));
  return {dataUrl,file:new File([bytes],`${edition.id}-${won?'won':'lost'}.png`,{type:'image/png'})};
}
