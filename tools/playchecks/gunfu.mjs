import {action, geometry, invariant, wait} from './common.mjs';

const snapshot = page => page.locator('#game').evaluate(canvas => ({...canvas.dataset}));
async function fight(page, touch, seconds=45) {
  const until=Date.now()+seconds*1000;
  let lastReload=0;
  while(Date.now()<until) {
    const state=await snapshot(page);
    if(state.phase!=='playing') {
      invariant(state.phase!=='lost','Player lost during the core-loop route');
      return state;
    }
    const ammo=Number.parseInt(await page.locator('#ammo').textContent());
    if(ammo===0 && Date.now()-lastReload>1400) {
      await action(page,'#reload',touch);lastReload=Date.now();
    } else if(ammo>0) await action(page,'#shoot',touch);
    await page.waitForTimeout(180);
  }
  throw Error('Combat did not reach a finite round ending');
}
async function pauses(page,touch,record) {
  await action(page,'#help',touch);
  await page.locator('#help-dialog').waitFor({state:'visible'});
  const close=await page.locator('#help-close').boundingBox();
  invariant(close && close.width>=44 && close.height>=44,'Help Close touch target too small');
  const before=await snapshot(page);await page.waitForTimeout(1100);
  invariant(JSON.stringify(await snapshot(page))===JSON.stringify(before),'Help did not preserve combat state');
  await action(page,'#help-close',touch);
  const original=page.viewportSize();
  await page.setViewportSize({width:320,height:568});
  await page.waitForTimeout(150);
  invariant(await page.locator('.rotate-notice').isVisible(),'Portrait rotation guidance missing');
  const portrait=await snapshot(page);await page.waitForTimeout(1100);
  invariant(JSON.stringify(await snapshot(page))===JSON.stringify(portrait),'Portrait did not pause combat');
  await page.setViewportSize({width:667,height:280});await page.waitForTimeout(150);await geometry(page);
  await page.setViewportSize(original);await page.waitForTimeout(150);await geometry(page);
  await record('help-portrait-resume-preserves-run');
}
export async function gunfu(page,{touch,rotate,record}) {
  const click=s=>action(page,s,touch);
  invariant((await snapshot(page)).phase==='ready','Expected ready screen');
  await click('#start');
  const initial=await snapshot(page);await click('#shoot');await page.waitForTimeout(50);
  const stationary=await snapshot(page);
  invariant(Number(stationary.shots)>Number(initial.shots) && initial.playerX===stationary.playerX && initial.playerY===stationary.playerY,'Base shot should fire without moving the player');
  if(!touch){
    await page.locator('#game').focus();await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
    invariant(Number((await snapshot(page)).playerX)>Number(stationary.playerX),'Keyboard movement did not move player');
  }
  if(rotate) await pauses(page,touch,record);
  const first=await fight(page,touch);
  invariant(first.phase==='upgrade' && Number(first.kills)>0 && Number(first.shots)>0,'First wave did not offer a real upgrade after combat');
  await geometry(page);await record('first-round-cleared-upgrade-offers',{state:first});
  invariant(await page.locator('button.upgrade').count()===3,'Expected three distinct upgrade choices');
  await click('button.upgrade[data-modifier="backdash"]');
  const selected=await snapshot(page);
  invariant(selected.modifiers.includes('backdash'),'Backdash not retained in fighting style');
  const dashes=Number(selected.dashes);
  await click('#shoot');
  await wait(page,n=>Number(document.querySelector('#game').dataset.dashes)>n,dashes,3000);
  await record('shoot-actually-executes-appended-backdash',{state:await snapshot(page)});
  if(!touch) {
    for(let intermission=0;intermission<2;intermission++) {
      const next=await fight(page,false);
      invariant(next.phase==='upgrade','Later round did not reach upgrade');
      await geometry(page);await record('later-upgrade-'+intermission,{state:next});
      const preferred=page.locator('button.upgrade[data-slot="shoot"]').first();
      const choice=await preferred.count()?preferred:page.locator('button.upgrade').first();
      const modifier=await choice.getAttribute('data-modifier');
      await choice.click();
      invariant((await snapshot(page)).modifiers.includes('backdash') && (await snapshot(page)).modifiers.includes(modifier),'Appending a modifier replaced an earlier ability');
    }
    const done=await fight(page,false,60);
    invariant(done.phase==='won' && Number(done.round)===4,'Four-round campaign did not reach victory');
    invariant(done.modifiers.split(',').filter(Boolean).length===3,'Three rewards did not persist');
    await record('four-round-victory-with-composed-moves',{state:done});
  }
  await click('#restart');
  const reset=await snapshot(page);
  invariant((reset.phase==='ready'||reset.phase==='playing') && Number(reset.round)===1 && !reset.modifiers,'Restart failed to reset run/upgrades');
  await record('restart-clears-style',{state:reset});
}
