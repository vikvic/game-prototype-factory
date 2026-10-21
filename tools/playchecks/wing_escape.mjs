// Factory-owned acceptance for the authored wing mechanic; ordinary inputs only.
const state=page=>page.locator('#game').evaluate(c=>({...c.dataset}));
const require=(ok,message)=>{if(!ok)throw Error(message);};
async function move(page,x,z,ending=false){
  for(let i=0;i<180;i++){
    const s=await state(page);if(ending&&s.phase==='won')return;require(s.phase==='playing','Wing run ended during navigation: '+JSON.stringify(s));
    const dx=x-Number(s.x),dz=z-Number(s.z);if(Math.hypot(dx,dz)<9)return;
    const horizontal=Math.abs(dx)>Math.abs(dz),portrait=s.layout==='portrait',key=horizontal?(dx>0?(portrait?'ArrowUp':'ArrowRight'):(portrait?'ArrowDown':'ArrowLeft')):(dz>0?(portrait?'ArrowRight':'ArrowDown'):(portrait?'ArrowLeft':'ArrowUp'));
    await page.keyboard.down(key);await page.waitForTimeout(Math.min(180,Math.max(25,(horizontal?Math.abs(dx):Math.abs(dz))/106*900)));await page.keyboard.up(key);
  }throw Error('Wing route obstructed: '+JSON.stringify(await state(page)));
}
export async function wingInput(page,name,touch){
  const pad=await page.locator('#move-pad').boundingBox(),tuck=await page.locator('#dash').boundingBox(),before=Number((await state(page)).x);
  const portrait=(await state(page)).layout==='portrait',fingerX=pad.x+pad.width*(portrait?.5:.86),fingerY=pad.y+pad.height*(portrait?.14:.5);
  if(name==='chromium'&&touch){
    const session=await page.context().newCDPSession(page),finger={x:fingerX,y:fingerY,id:1};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,{x:tuck.x+tuck.width/2,y:tuck.y+tuck.height/2,id:2}]});
    await page.waitForTimeout(300);require(Number((await state(page)).open)<.2,'Touch tuck did not fold wings');
    await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await session.detach();
  }else{
    await page.keyboard.down(' ');await page.mouse.move(fingerX,fingerY);await page.mouse.down();await page.waitForTimeout(300);require(Number((await state(page)).open)<.2,'Held tuck failed');await page.mouse.up();await page.keyboard.up(' ');
    if(touch){await page.locator('#dash').tap();}
  }
  require(Number((await state(page)).x)>before+10,'Wing movement pad failed');
  await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.open)>.9);
  const x=Number((await state(page)).x);await page.waitForTimeout(160);require(Math.abs(Number((await state(page)).x)-x)<1,'Canceled touch kept moving');
}
export async function wingWin(page,proveSnag=false,doorScreenshot=null){
  if(proveSnag){
    await move(page,520,105);const forward=(await state(page)).layout==='portrait'?'ArrowUp':'ArrowRight';await page.keyboard.down(forward);await page.waitForTimeout(750);await page.keyboard.up(forward);
    const s=await state(page);require(Number(s.snags)>0&&Number(s.x)<584&&s.doors==='0','Open wings passed a narrow door or failed to snag');
    if(doorScreenshot)await page.screenshot({path:doorScreenshot});
  }
  await page.keyboard.down(' ');await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.open)<.15);
  for(const [x,z]of [[700,105],[1115,105],[1115,220],[1390,220],[1510,145],[1745,145],[2170,145],[2520,145]])await move(page,x,z,x===2520);
  await page.keyboard.up(' ');await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='won');
  require((await state(page)).doors==='3','Wing exit skipped door progression');
}
export async function wingLoss(page){
  // Navigate with ordinary key pulses before holding: retry changes Canvas size and clears input.
  await move(page,520,105);
  const forward=(await state(page)).layout==='portrait'?'ArrowUp':'ArrowRight';await page.keyboard.down(forward);
  await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='lost',null,{timeout:16000});await page.keyboard.up(forward);
  const s=await state(page);require(s.snags==='5'&&Number(s.x)<584,'Snag loss did not block at first doorway');
}
