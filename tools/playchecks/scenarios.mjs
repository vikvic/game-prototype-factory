import {invariant,number,text,value,wait,tapMap,action,geometry,pauseAndRotate} from './common.mjs';

async function buffet(page,{touch,rotate,record}) {
  const click=s=>action(page,s,touch), map=(x,y)=>tapMap(page,x,y,900,520,touch);
  if(await page.locator('#start').isVisible())await click('#start');
  invariant(await page.locator('#game').getAttribute('data-phase')==='playing','Buffet did not start');
  if(!touch){await page.locator('#game').focus();await page.keyboard.down('ArrowLeft');await page.keyboard.down('ArrowUp');try{await wait(page,()=>!document.querySelector('#serve').disabled,undefined,6000);}finally{await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowUp');}}
  await map(165,120);await wait(page,()=>!document.querySelector('#serve').disabled);
  await click('#serve');await click('#cancel');
  invariant(await page.locator('#auto').isDisabled(),'Cancel left a food placement selected');
  await click('#serve');const shape=await text(page,'#prompt');await click('#rotate');
  invariant((await text(page,'#prompt'))!==shape,'Food rotation did not change its dimensions');
  await click('#plate button:first-child');await wait(page,()=>parseFloat(document.querySelector('#value').textContent)>0);
  const carried=await value(page,'#value');invariant(carried>0,'Manual packing produced no carried value');
  await geometry(page);await record('food-rotated-manually-packed',{carried});
  // Auto-place is another reachable real packing route; preserve already packed food on cancel.
  await click('#serve');await click('#auto');await wait(page,n=>parseFloat(document.querySelector('#value').textContent)>n,carried);
  const total=await value(page,'#value');
  if(rotate)await pauseAndRotate(page,'buffet',touch,record);
  await map(390,405);await wait(page,()=>!document.querySelector('#eat').disabled);
  const before=await value(page,'#score');await click('#eat');await wait(page,n=>Number(document.querySelector('#score').textContent)>n,before);
  const banked=await value(page,'#score');invariant(banked>before,'Eating did not bank positive score');
  await record('home-eat-banked',{banked,carried:total});
  await click('#restart');invariant(await value(page,'#score')===0&&await value(page,'#value')===0,'Buffet restart failed to clear score/inventory');
  invariant(await page.locator('#game').getAttribute('data-phase')==='playing','Buffet restart did not start fresh round');
  await record('restart',{score:await text(page,'#score')});
}

async function tunnel(page,{touch,rotate,record}) {
  const click=s=>action(page,s,touch), tile=(x,y)=>tapMap(page,x+.5,y+.5,19,13,touch);
  await click('#dig');const initial=await value(page,'#credits');
  await tile(5,2);
  if(touch){invariant(await value(page,'#credits')===initial,'Touch selection acted before confirmation');invariant((await text(page,'#hover')).includes('6'),'Touch tile inspection missing');await click('#confirm');}
  invariant(await value(page,'#credits')>initial,'Mining ore did not increase credits');
  const first=await value(page,'#credits');
  if(touch){await click('#tile-right');await click('#confirm');}
  else {await page.locator('#game').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');}
  invariant(await value(page,'#credits')>first,'Cursor adjustment / confirmation did not mine adjacent ore');
  const nests=await value(page,'#nests');
  for(const [x,y]of [[8,5],[9,5],[9,4],[10,4],[10,3],[11,3],[11,2],[12,2]]){await tile(x,y);if(touch)await click('#confirm');}
  invariant(await value(page,'#nests')>nests,'Connected digging did not activate another nest');
  await click('#turret');
  for(const [x,y]of [[4,3],[5,4],[9,5]]){const before=await value(page,'#credits');await tile(x,y);if(touch)await click('#confirm');invariant(await value(page,'#credits')<before,'Turret placement did not spend resources');}
  await geometry(page);await record('ore-nest-turrets',{credits:await text(page,'#credits'),nests:await text(page,'#nests')});
  if(rotate){await pauseAndRotate(page,'tunnel-plan',touch,record);await tile(4,3);invariant((await text(page,'#hover')).startsWith('Tile 5, 4'),'Post-rotation touch coordinates selected wrong tile');}
  const stage=await text(page,'#stage');await click('#start');
  invariant(await page.locator('#game').getAttribute('data-phase')==='wave','Start did not enter combat');
  if(rotate){const incoming=await value(page,'#count');await wait(page,n=>parseFloat(document.querySelector('#count').textContent)<n,incoming,10000);invariant(await page.locator('#game').getAttribute('data-phase')==='wave','Combat ended before pause coverage');await pauseAndRotate(page,'tunnel-combat',touch,record);}
  await wait(page,()=>document.querySelector('#game').dataset.phase==='plan'||['lost','won'].includes(document.querySelector('#game').dataset.phase),undefined,40000);
  invariant(await page.locator('#game').getAttribute('data-phase')==='plan'&&(await text(page,'#stage'))!==stage,'Combat did not progress to another planning wave');
  invariant(await value(page,'#health')>0,'Core failed during combat');
  await record('combat-wave-progression',{stage:await text(page,'#stage'),health:await text(page,'#health')});
  await click('#restart');invariant(await value(page,'#credits')===initial&&await value(page,'#nests')===nests,'Tunnel restart failed to reset economy/nests');
  await record('restart',{stage:await text(page,'#stage')});
}

// Trusted projection of the starter's documented camera, calculated independently
// outside the page. No renderer/player/game internals are read or mutated.
function threePoint(x,z){const len=Math.hypot(19,15),fy=19/len,fz=15/len,depth=fy*19+fz*(15-z),vertical=-fz*(-19)+fy*(z-15),t=Math.tan(48*Math.PI/360);return [(1+x/(depth*t*1.5))/2,(1-vertical/(depth*t))/2];}
async function starter(page,{touch,rotate,record},three) {
  const click=s=>action(page,s,touch);
  const initial=await value(page,'#score');invariant(initial===0,'Starter initial score is not clear');
  let px,py;
  if(three)[px,py]=threePoint(-2.5,0);else [px,py]=[325/900,300/600];
  if(touch)await tapMap(page,px,py,1,1,true);
  else {
    await page.locator('#game').focus();await page.keyboard.down('ArrowLeft');
    try{await wait(page,()=>parseFloat(document.querySelector('#score').textContent)>0,undefined,5000);}finally{await page.keyboard.up('ArrowLeft');}
    await click('#restart');
    const b=await page.locator('#game').boundingBox();await page.mouse.move(b.x+px*b.width,b.y+py*b.height);await page.mouse.down();
  }
  try{await wait(page,()=>parseFloat(document.querySelector('#score').textContent)>0,undefined,8000);}finally{if(!touch)await page.mouse.up();}
  invariant(!/lost|ended/i.test(await text(page,'#status')),'Starter ended before collection');
  await geometry(page);await record('movement-collection',{score:await text(page,'#score'),input:touch?'native-touch-tap':'keyboard-and-held-mouse'});
  if(rotate){
    await pauseAndRotate(page,three?'three':'canvas',touch,record);
    let nextX,nextY;if(three)[nextX,nextY]=threePoint(-7.5,0);else[nextX,nextY]=[90/900,300/600];
    const previous=await value(page,'#score');await tapMap(page,nextX,nextY,1,1,touch);
    await wait(page,n=>parseFloat(document.querySelector('#score').textContent)>n,previous,8000);
    await record('post-resize-input-collection',{score:await text(page,'#score')});
  }
  await click('#restart');await wait(page,()=>parseFloat(document.querySelector('#score').textContent)===0);
  invariant(!/lost|ended/i.test(await text(page,'#status')),'Starter restart left ended state');
  await record('restart',{score:await text(page,'#score')});
}
export const scenarios={
  'buffet-dash-24812a73':{name:'buffet-touch-pack-bank-restart-v1',run:buffet},
  'tunnel-frontier-e2df699d':{name:'tunnel-mine-nest-combat-restart-v1',run:tunnel},
  'canvas-starter':{name:'canvas-movement-collection-restart-v1',run:(p,c)=>starter(p,c,false)},
  'three-starter':{name:'three-movement-collection-restart-v1',run:(p,c)=>starter(p,c,true)},
};
