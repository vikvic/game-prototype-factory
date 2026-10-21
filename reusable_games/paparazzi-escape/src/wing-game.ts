import { adBreak, tracker } from './services';
import { paintResultPortrait, makeResultCard } from './wing-results';
import { newWorld, step } from './wing-world';
import { drawWingPortrait, portraitMessage } from './wing-portrait';
import './wing-portrait.css';
import type { Edition } from './main';

export function bootWings(edition:Edition){
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  const canvas=el<HTMLCanvasElement>('game'),ctx=canvas.getContext('2d')!,pad=el('move-pad'),help=el<HTMLDialogElement>('help-dialog');
  let world=newWorld(),paused=false,last=0,finished=false,usedAd=false,pointer:number|null=null,foldPointer:number|null=null;
  let rotationPaused=false,wasWide=innerWidth>innerHeight;
  let resultCard:ReturnType<typeof makeResultCard>|null=null;
  const resultArticle=el('result').querySelector('article')!,hero=document.createElement('div'),copy=document.createElement('div'),resultPortrait=document.createElement('canvas');
  hero.className='result-hero';resultPortrait.id='result-portrait';resultPortrait.setAttribute('role','img');
  copy.append(el('result-kicker'),el('headline'));hero.append(resultPortrait,copy);resultArticle.prepend(hero);

  const arena=canvas.parentElement!,main=arena.parentElement!,footer=document.querySelector('footer')!;
  document.body.dataset.layout='portrait';main.insertBefore(el('status'),footer);
  const rotation=document.createElement('div');rotation.id='rotation-pause';rotation.className='overlay';rotation.hidden=true;
  rotation.innerHTML='<article><h2>Paused.</h2><p>Same run. Ready?</p><button id="rotation-continue" class="primary">Continue</button></article>';arena.append(rotation);
  let stick={x:0,z:0};const keys=new Set<string>(),track=tracker(edition.analytics_domain);
  document.body.dataset.mechanic='wing-escape';document.body.dataset.theme='runway';
  document.title=`${edition.title} · ${edition.brand}`;
  for(const id of ['brand','title','subject','subtitle'] as const)el(id).textContent=edition[id];
  const notice=edition.notice||'Fictional backstage comedy inspired by the runway outfit.';
  el('preview-label').textContent=notice;el('help-notice').textContent=notice;
  el('runway-portrait').setAttribute('hidden','');
  el('intro').querySelector('.eyebrow')!.textContent='THE $50M LOOK. THE $0 DOOR BUDGET.';
  el('intro').querySelector('.steps')!.innerHTML='<span>↑ Move forward</span><span>Hold TUCK</span><span>🚘 Reach the car</span>';
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
  paragraphs[1].textContent='Push the pad up to advance; left and right move across the corridor. Hold Space or Tuck wings to fit the lit gap. Blue shows wing clearance; coral marks contact. WINGS TOO WIDE means Tuck. SOLID OBSTACLE means follow the green arrow around it. Tuck near flashing cameras.';
  el('status').setAttribute('role','status');el('status').setAttribute('aria-live','polite');
  function clearInput(){keys.clear();stick={x:0,z:0};pointer=foldPointer=null;pad.querySelector('i')!.style.display='none';}
  function resize(){
    const wide=innerWidth>innerHeight,changed=wide!==wasWide;wasWide=wide;
    const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);clearInput();
    if(changed&&world.phase==='playing'){rotationPaused=true;rotation.hidden=false;pause();}
  }
  // Resize Canvas backing outside observer delivery; the course and input mapping never rotate.
  let resizePending=false;
  function scheduleResize(){if(!resizePending){resizePending=true;requestAnimationFrame(()=>{resizePending=false;resize();});}}
  new ResizeObserver(scheduleResize).observe(canvas);window.addEventListener('resize',scheduleResize);
  function sync(){
    document.body.dataset.phase=world.phase;
    el('time').textContent=`${Math.ceil(world.time)}s`;el('passes').textContent=`${world.doors}/3 doors`;el('photos').textContent=`${world.snags}/5 snags`;
    const block=world.phase==='playing'?world.blocked:null,status=el('status'),message=portraitMessage(block?.message||world.message);
    el('cooldown').textContent=world.open<.25?'folded':'hold';el('exposure').style.width=`${18+world.open*82}%`;
    if(status.textContent!==message)status.textContent=message;
    status.dataset.blocked=block?.cause||'';el('dash').dataset.needed=String(block?.cause==='wings');el('photos').dataset.impact=String(world.recoil>0);
    Object.assign(canvas.dataset,{phase:world.phase,paused:String(paused),layout:'portrait',time:world.time.toFixed(3),x:world.x.toFixed(2),z:world.z.toFixed(2),doors:String(world.doors),snags:String(world.snags),open:world.open.toFixed(3),lastObstacle:world.lastObstacle,blockCause:block?.cause||'',blockHint:block?portraitMessage(block.message):'',release:edition.release,adMode:edition.ad_mode,mechanic:'wing-escape'});
  }
  function start(){clearInput();resultCard=null;world=newWorld();world.phase='playing';finished=false;rotationPaused=false;rotation.hidden=true;paused=false;el('intro').hidden=true;el('result').hidden=true;el('share-status').textContent='';track('Game start');sync();}
  function finish(){
    finished=true;clearInput();const won=world.phase==='won';paintResultPortrait(resultPortrait,won);el('result').dataset.outcome=won?'won':'lost';el('result-kicker').textContent=won?'BACKSTAGE ICON':'DOORFRAME VICTORY';el('share').textContent=won?'Share win':'Share loss';el('headline').textContent=world.phase==='won'?edition.result_win:edition.result_loss;
    const style=world.distance?Math.round(world.strut/world.distance*100):0;
    el('result-detail').textContent=`${Math.round(world.elapsed)}s · ${world.doors}/3 doors · ${world.snags} snags · ${style}% wings-out strut`;
    resultCard=makeResultCard(edition,won,el('headline').textContent||'',el('result-detail').textContent||'',url());
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
  el('share').onclick=async()=>{track('Share initiated');try{if(navigator.share){const plain={title:edition.title,text:summary(),url:url()};let payload:ShareData=plain;try{const image={...plain,files:resultCard?[resultCard.file]:[]};if(resultCard&&navigator.canShare?.(image))payload=image;}catch{/* Use the link payload when file capability is unavailable. */}await navigator.share(payload);el('share-status').textContent='Share dialog closed. Play again whenever you like.';}else{await navigator.clipboard.writeText(`${summary()}\n${url()}`);el('share-status').textContent='Result copied. Send it wherever you like.';}}catch(error){el('share-status').textContent=error instanceof DOMException&&error.name==='AbortError'?'Sharing canceled. Your result is still here.':'Sharing unavailable. Use Save image or copy the page address.';}};
  el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(url());el('share-status').textContent='Link copied.';}catch{el('share-status').textContent='Copy the page address from your browser.';}};
  el('save').onclick=()=>{
    if(!resultCard)return;const a=document.createElement('a');a.download=resultCard.file.name;a.href=resultCard.dataUrl;a.click();el('share-status').textContent='Result image prepared.';
  };
  function frame(stamp:number){
    const dt=Math.max(.001,Math.min((stamp-last)/1000,.035));last=stamp;
    if(!paused){
      const x=stick.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=stick.z+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
      step(world,dt,{x:-y,z:x,fold:foldPointer!==null||keys.has(' ')});if(!finished&&(world.phase==='won'||world.phase==='lost'))finish();
    }
    drawWingPortrait(ctx,world,canvas.width,canvas.height);
    if(paused&&world.phase==='playing'){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#171321bb';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.font=`bold ${28*(devicePixelRatio||1)}px system-ui`;ctx.textAlign='center';ctx.fillText('Paused',canvas.width/2,canvas.height/2);}
    sync();requestAnimationFrame(frame);
  }
  resize();sync();requestAnimationFrame(frame);
}
