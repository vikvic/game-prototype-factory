import {action, geometry, invariant, wait} from './common.mjs';

const snapshot = page => page.locator('#game').evaluate(canvas => ({...canvas.dataset}));
async function fight(page,touch,record,seconds=55,stop=null) {
  const until=Date.now()+seconds*1000;let recorded=false;
  while(Date.now()<until) {
    const state=await snapshot(page);
    if(state.phase!=='playing') {invariant(state.phase!=='lost','Player lost during brawler route');return state;}
    if(stop?.(state))return state;
    if(!recorded && Number(state.stunned)>0) {
      recorded=true;await record('melee-impact-enemy-stagger',{state});
    }
    if(state.attack==='idle') {
      const selector=state.combo==='3'?'#kick':'#punch';
      try {
        if(touch)await page.locator(selector).tap({timeout:1000});else await page.locator(selector).click({timeout:1000});
      }catch(error){
        const after=await snapshot(page);
        if(after.phase==='upgrade'||after.phase==='won')return after;
        invariant(after.phase!=='lost','Player lost during brawler route');throw error;
      }
    }
    await page.waitForTimeout(90);
  }
  throw Error('Melee combat did not reach finite round ending');
}
async function pauses(page,touch,record) {
  await action(page,'#help',touch);await page.locator('#help-dialog').waitFor({state:'visible'});
  const close=await page.locator('#help-close').boundingBox();
  invariant(close && close.width>=44 && close.height>=44,'Help Close touch target too small');
  const before=await snapshot(page);await page.waitForTimeout(1100);
  invariant(JSON.stringify(await snapshot(page))===JSON.stringify(before),'Help changed combat state');
  await action(page,'#help-close',touch);
  const original=page.viewportSize();await page.setViewportSize({width:320,height:568});await page.waitForTimeout(150);
  invariant(await page.locator('.rotate-notice').isVisible(),'Portrait guidance missing');
  const portrait=await snapshot(page);await page.waitForTimeout(1100);
  invariant(JSON.stringify(await snapshot(page))===JSON.stringify(portrait),'Portrait did not pause combat');
  await page.setViewportSize({width:667,height:280});await page.waitForTimeout(150);await geometry(page);
  await page.setViewportSize(original);await page.waitForTimeout(150);await geometry(page);
  await record('help-portrait-resume-preserves-brawl');
}
export async function gunfu(page,{touch,rotate,record}) {
  const click=s=>action(page,s,touch);
  invariant((await snapshot(page)).phase==='ready','Expected ready screen');await click('#start');
  invariant(await page.locator('#shoot,#reload,#ammo').count()===0,'Shooter actions remain in brawler UI');
  const initial=await snapshot(page);await click('#punch');
  await wait(page,n=>Number(document.querySelector('#game').dataset.punches)>n,Number(initial.punches),2000);
  await wait(page,()=>document.querySelector('#game').dataset.attack==='idle',undefined,2000);
  invariant(Number((await snapshot(page)).hits)===0,'Punch hit across the arena instead of requiring close range');
  await click('#kick');await wait(page,n=>Number(document.querySelector('#game').dataset.kicks)>n,Number(initial.kicks),2000);
  await wait(page,()=>document.querySelector('#game').dataset.attack==='idle',undefined,2000);
  if(!touch) {
    await page.locator('#game').focus();await page.keyboard.press('j');
    await wait(page,()=>document.querySelector('#game').dataset.attack==='punch',undefined,2000);
    await page.keyboard.down('d');
    const planted=await snapshot(page);await page.waitForTimeout(130);const held=await snapshot(page);
    invariant(planted.locked==='true' && planted.playerX===held.playerX && planted.playerY===held.playerY,'Attack did not plant the player against held movement');
    await page.keyboard.up('d');await wait(page,()=>document.querySelector('#game').dataset.attack==='idle',undefined,2000);
    await page.keyboard.down('d');await page.waitForTimeout(170);await page.keyboard.up('d');
    invariant(Number((await snapshot(page)).playerX)>Number(held.playerX)+10,'Movement did not resume after recovery');
    await record('attack-commitment-and-movement-recovery',{state:held});
  }
  if(rotate)await pauses(page,touch,record);
  const first=await fight(page,touch,record);
  invariant(first.phase==='upgrade' && Number(first.hits)>0 && Number(first.staggers)>0 && Number(first.knockdowns)>0,'Wave did not demonstrate melee hits, stagger and finisher knockdowns');
  await geometry(page);await record('first-brawl-cleared',{state:first});
  invariant(await page.locator('button.upgrade').count()===3,'Expected three upgrade choices');
  await click('button.upgrade[data-modifier="lunge"]');const selected=await snapshot(page);
  invariant(selected.modifiers.includes('lunge'),'Lunge not retained');await click('#punch');
  await wait(page,n=>Number(document.querySelector('#game').dataset.dashes)>n,Number(selected.dashes),3000);
  const lunged=await snapshot(page);
  invariant(lunged.playerX!==selected.playerX||lunged.playerY!==selected.playerY,'Lunge modifier did not physically move player');
  await record('lunge-plus-punch-fusion',{state:lunged});
  if(!touch) {
    for(const id of ['echo','guard']) {
      const next=await fight(page,false,record);invariant(next.phase==='upgrade','Later round did not reach upgrade');
      await geometry(page);await click(`button.upgrade[data-modifier="${id}"]`);
      const state=await snapshot(page);invariant(state.modifiers.includes('lunge') && state.modifiers.includes(id),'New fusion replaced an earlier ability');
    }
    const done=await fight(page,false,record,70);
    invariant(done.phase==='won' && Number(done.round)===4,'Four-round brawl did not reach victory');
    invariant(done.modifiers.split(',').filter(Boolean).length===3,'Three rewards did not persist');
    await record('four-round-brawler-victory',{state:done});
  }
  await click('#restart');const reset=await snapshot(page);
  invariant(reset.phase==='playing' && Number(reset.round)===1 && !reset.modifiers && Number(reset.hits)===0,'Restart failed to reset brawler');
  await record('restart-clears-brawler-style',{state:reset});
  if(!touch) {
    const first=await fight(page,false,record);invariant(first.phase==='upgrade','Alternate style did not clear first round');
    await click('button.upgrade[data-modifier="backstep"]');
    const second=await fight(page,false,record);invariant(second.phase==='upgrade','Backstep style did not clear second round');
    await click('button.upgrade[data-modifier="echo"]');const before=await snapshot(page);
    const combined=await fight(page,false,record,55,state=>Number(state.followups)>Number(before.followups) && Number(state.dashes)>Number(before.dashes));
    invariant(combined.modifiers.includes('backstep') && combined.modifiers.includes('echo') && Number(combined.followups)>Number(before.followups) && Number(combined.dashes)>Number(before.dashes),'Double + Backstep failed to land its follow-up and disengage');
    await record('double-punch-before-backstep',{state:combined});
    await click('#restart');invariant(Number((await snapshot(page)).followups)===0,'Restart retained follow-up count');
  }
}
