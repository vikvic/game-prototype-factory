import { adBreak, tracker } from './services';
import { drawStar, drawWingScene } from './wing-art';
import { newWorld, step } from './wing-world';
import { drawWingPortrait, portraitMessage } from './wing-portrait';
import './wing-portrait.css';
import type { Edition } from './main';

export function bootWings(edition:Edition){
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  const canvas=el<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!,pad=el('move-pad'),help=el<HTMLDialogElement>('help-dialog');
  let world=newWorld(),paused=false,last=0,finished=false,usedAd=false,pointer:number|null=null,foldPointer:number|null=null;
  let portrait=false,rotationPaused=false;
  const portraitCourse=edition.layout==='portrait-course',arena=canvas.parentElement!,main=arena.parentElement!,footer=document.querySelector('footer')!;
  const rotation=document.createElement('div');rotation.id='rotation-pause';rotation.className='overlay';rotation.hidden=true;
  rotation.innerHTML='<article><h2>Phone turned.</h2><p>Same run. Ready?</p><button id="rotation-continue" class="primary">Continue</button></article>';arena.append(rotation);
  let stick={x:0,z:0};const keys=new Set<string>(),track=tracker(edition.analytics_domain);
  document.body.dataset.mechanic='wing-escape';document.body.dataset.theme='runway';
  document.title=`${edition.title} · ${edition.brand}`;
  for(const id of ['brand','title','subject','subtitle'] as const)el(id).textContent=edition[id];
  const notice=edition.notice||'Fictional backstage comedy inspired by the runway outfit.';
  el('preview-label').textContent=notice;el('help-notice').textContent=notice;
  el('runway-portrait').setAttribute('hidden','');
  el('intro').querySelector('.eyebrow')!.textContent='THE $50M LOOK. THE $0 DOOR BUDGET.';
  el('intro').querySelector('.steps')!.innerHTML='<span>↔ Move backstage</span><span>↘ Hold TUCK to squeeze</span><span>🚘 Reach your car</span>';
  el('start').textContent='Get these wings out →';
  el('dash').innerHTML='Tuck wings <span id="cooldown">hold</span>';
  el('dash').setAttribute('aria-label','Hold to tuck wings');
  el('reset').setAttribute('aria-label','Restart wing escape');
  el('result-kicker').textContent='BACKSTAGE REPORT';
  document.querySelector('.controls')!.innerHTML='WASD / arrows to move<br>Hold <strong>Space / Tuck</strong> through narrow gaps';
  canvas.setAttribute('aria-label','Move Kylie through three backstage doors; hold Tuck to fold the oversized wings and reach the car');
  help.querySelector('h2')!.textContent='Too much wing. Not enough door.';
  const paragraphs=help.querySelectorAll('p');
  paragraphs[0].textContent='Reach the car through three marked doors before 60 seconds run out. Open wings snag on door frames, equipment and crew. Five snags end the run.';
  paragraphs[1].textContent='Move with WASD, arrows or the movement pad. Hold Space or Tuck wings to fold them and walk slowly through the lit gap. When stuck, coral outlines mark the obstruction and blue outlines show your wing clearance. WINGS TOO WIDE means hold Tuck; SOLID OBSTACLE means follow the green arrow around it. Camera flashes can startle open wings; tuck near the press.';
  el('status').setAttribute('role','status');el('status').setAttribute('aria-live','polite');
  function clearInput(){keys.clear();stick={x:0,z:0};pointer=foldPointer=null;pad.querySelector('i')!.style.display='none';}
  function resize(){
    const next=portraitCourse&&matchMedia('(orientation: portrait)').matches,changed=next!==portrait;
    portrait=next;document.body.dataset.layout=portrait?'portrait':'landscape';
    const status=el('status');if(portrait&&status.parentElement!==main)main.insertBefore(status,footer);else if(!portrait&&status.parentElement!==arena)arena.append(status);
    el('intro').querySelector('.steps')!.innerHTML=portrait?'<span>↑ Move forward</span><span>Hold TUCK</span><span>🚘 Reach the car</span>':'<span>↔ Move backstage</span><span>↘ Hold TUCK to squeeze</span><span>🚘 Reach your car</span>';
    paragraphs[1].textContent=(portrait?'Push the pad up to advance; left and right move across the corridor. ':'Move with WASD, arrows or the movement pad. ')+'Hold Space or Tuck wings to fold them and walk slowly through the lit gap. Blue outlines show wing clearance before a doorway. Coral marks the obstruction: WINGS TOO WIDE means hold Tuck; SOLID OBSTACLE means follow the green arrow around it. Camera flashes can startle open wings; tuck near the press.';
    const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);clearInput();
    if(changed&&world.phase==='playing'){rotationPaused=true;rotation.hidden=false;pause();}
  }
  // Reparenting status changes Canvas bounds. Defer that mutation beyond observer delivery.
  let resizePending=false;
  function scheduleResize(){if(!resizePending){resizePending=true;requestAnimationFrame(()=>{resizePending=false;resize();});}}
  new ResizeObserver(scheduleResize).observe(canvas);window.addEventListener('resize',scheduleResize);
  function sync(){
    el('time').textContent=`${Math.ceil(world.time)}s`;el('passes').textContent=`${world.doors}/3 doors`;el('photos').textContent=`${world.snags}/5 snags`;
    const block=world.phase==='playing'?world.blocked:null,status=el('status'),message=portrait?portraitMessage(block?.message||world.message):block?.message||world.message;
    el('cooldown').textContent=world.open<.25?'folded':'hold';el('exposure').style.width=`${18+world.open*82}%`;
    if(status.textContent!==message)status.textContent=message;
    status.dataset.blocked=block?.cause||'';el('dash').dataset.needed=String(block?.cause==='wings');el('photos').dataset.impact=String(world.recoil>0);
    Object.assign(canvas.dataset,{phase:world.phase,paused:String(paused),layout:portrait?'portrait':'landscape',time:world.time.toFixed(3),x:world.x.toFixed(2),z:world.z.toFixed(2),doors:String(world.doors),snags:String(world.snags),open:world.open.toFixed(3),lastObstacle:world.lastObstacle,blockCause:block?.cause||'',blockHint:block?(portrait?portraitMessage(block.message):block.message):'',release:edition.release,adMode:edition.ad_mode,mechanic:'wing-escape'});
  }
  function start(){clearInput();world=newWorld();world.phase='playing';finished=false;rotationPaused=false;rotation.hidden=true;paused=false;el('intro').hidden=true;el('result').hidden=true;el('share-status').textContent='';track('Game start');sync();}
  function finish(){
    finished=true;clearInput();el('headline').textContent=world.phase==='won'?edition.result_win:edition.result_loss;
    const style=world.distance?Math.round(world.strut/world.distance*100):0;
    el('result-detail').textContent=`${Math.round(world.elapsed)}s · ${world.doors}/3 doors · ${world.snags} snags · ${style}% wings-out strut`;
    el('result').hidden=false;track(world.phase==='won'?'Round complete':'Round lost');
  }
  const fold=el('dash');fold.onpointerdown=event=>{event.preventDefault();if(world.phase!=='playing'||paused||foldPointer!==null)return;foldPointer=event.pointerId;fold.setPointerCapture(event.pointerId);};
  const releaseFold=(event:PointerEvent)=>{if(event.pointerId===foldPointer)foldPointer=null;};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])fold.addEventListener(type,event=>releaseFold(event as PointerEvent));
  function move(event:PointerEvent){if(pointer!==event.pointerId)return;const b=pad.getBoundingClientRect();stick={x:Math.max(-1,Math.min(1,(event.clientX-b.x-b.width/2)/(b.width*.35))),z:Math.max(-1,Math.min(1,(event.clientY-b.y-b.height/2)/(b.height*.35)))};const dot=pad.querySelector('i')!;dot.style.display='block';dot.style.transform=`translate(${stick.x*25}px,${stick.z*20}px)`;}
  pad.onpointerdown=event=>{event.preventDefault();if(world.phase!=='playing'||paused||pointer!==null)return;pointer=event.pointerId;pad.setPointerCapture(event.pointerId);move(event);};pad.onpointermove=move;
  for(const type of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(type,event=>{if((event as PointerEvent).pointerId===pointer){pointer=null;stick={x:0,z:0};pad.querySelector('i')!.style.display='none';}});
  document.addEventListener('keydown',event=>{const k=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)&&!help.open){event.preventDefault();keys.add(k);}});
  document.addEventListener('keyup',event=>keys.delete(event.key.toLowerCase()));
  function pause(){paused=true;clearInput();sync();}function resume(){paused=document.hidden||help.open||rotationPaused;clearInput();sync();}
  el('rotation-continue').onclick=()=>{rotationPaused=false;rotation.hidden=true;resume();};
  window.addEventListener('blur',pause);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',()=>document.hidden?pause():resume());
  el('help').onclick=()=>{pause();help.showModal();};el('help-close').onclick=()=>help.close();help.addEventListener('close',resume);
  el('start').onclick=start;el('reset').onclick=start;
  el('restart').onclick=async()=>{try{if(!usedAd&&edition.ad_mode!=='disabled'){usedAd=true;const outcome=await adBreak(edition.ad_mode,pause,resume);canvas.dataset.adOutcome=outcome;}}catch{canvas.dataset.adOutcome='unavailable';}finally{start();track('Restart');}};
  const summary=()=>`${el('headline').textContent}\n${el('result-detail').textContent}`;
  const url=()=>location.href.split('?')[0];
  el('share').onclick=async()=>{track('Share initiated');try{if(navigator.share){await navigator.share({title:edition.title,text:summary(),url:url()});el('share-status').textContent='Share dialog closed. Play again whenever you like.';}else{await navigator.clipboard.writeText(`${summary()}\n${url()}`);el('share-status').textContent='Result copied. Send it wherever you like.';}}catch(error){el('share-status').textContent=error instanceof DOMException&&error.name==='AbortError'?'Sharing canceled. Your result is still here.':'Sharing unavailable. Use Save image or copy the page address.';}};
  el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(url());el('share-status').textContent='Link copied.';}catch{el('share-status').textContent='Copy the page address from your browser.';}};
  el('save').onclick=()=>{
    const card=document.createElement('canvas');card.width=1000;card.height=600;const c=card.getContext('2d')!;
    c.fillStyle='#302336';c.fillRect(0,0,1000,600);c.fillStyle='#f4a4cf';c.font='bold 23px system-ui';c.fillText(edition.brand.toUpperCase(),55,60);
    c.fillStyle='#fff8e8';c.font='bold 44px system-ui';let line='',y=145;for(const word of (el('headline').textContent||'').split(' ')){if(c.measureText(line+word).width>650){c.fillText(line,55,y);line='';y+=54;}line+=word+' ';}c.fillText(line,55,y);
    c.font='22px system-ui';c.fillText(el('result-detail').textContent||'',55,440);c.fillText(edition.title,55,505);c.font='15px system-ui';c.fillText('Fictional backstage comedy · Unofficial',55,548);
    c.save();c.translate(830,370);c.scale(1.5,1.5);drawStar(c,1,0,0);c.restore();
    const a=document.createElement('a');a.download=`${edition.id}-result.png`;a.href=card.toDataURL('image/png');a.click();el('share-status').textContent='Result image prepared.';
  };
  function frame(stamp:number){
    const dt=Math.max(.001,Math.min((stamp-last)/1000,.035));last=stamp;
    if(!paused){
      const x=stick.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=stick.z+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
      step(world,dt,{x:portrait?-y:x,z:portrait?x:y,fold:foldPointer!==null||keys.has(' ')});if(!finished&&(world.phase==='won'||world.phase==='lost'))finish();
    }
    (portrait?drawWingPortrait:drawWingScene)(ctx,world,canvas.width,canvas.height);
    if(paused&&world.phase==='playing'){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#171321bb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font=`bold ${28*(devicePixelRatio||1)}px system-ui`;ctx.textAlign='center';ctx.fillText('Paused',canvas.width/2,canvas.height/2);}
    sync();requestAnimationFrame(frame);
  }
  resize();sync();requestAnimationFrame(frame);
}
