export function invariant(ok, message) { if (!ok) throw Error(message); }
export const number = text => Number.parseFloat(text);
export async function text(page, selector) { return (await page.locator(selector).textContent()).trim(); }
export async function value(page, selector) { return number(await text(page,selector)); }
export async function wait(page, predicate, arg, timeout=18000) {
  try { await page.waitForFunction(predicate,arg,{timeout}); }
  catch(error) { throw Error(`Expected DOM invariant within ${timeout}ms: ${predicate.toString()}; ${error.message}`,{cause:error}); }
}
export async function tapMap(page,x,y,w,h,touch=true) {
  const b=await page.locator('#game').boundingBox(); invariant(b?.width>0 && b?.height>0,'Canvas missing before input');
  const px=b.x+x/w*b.width, py=b.y+y/h*b.height;
  if (touch) await page.touchscreen.tap(px,py); else await page.mouse.click(px,py);
}
export async function action(page,selector,touch=true) {
  const target=page.locator(selector);
  if(touch) await target.tap(); else await target.click();
}
export async function geometry(page) {
  const result=await page.evaluate(expected=>{
    const width=expected.width,height=expected.height;
    const failures=[],rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0;};
    const inView=(r,label)=>{if(r.x<-.75||r.y<-.75||r.right>width+.75||r.bottom>height+.75)failures.push(`${label} clipped: ${JSON.stringify(r)}`);};
    if(innerWidth>width+1||innerHeight>height+1||document.documentElement.scrollWidth>width+1||document.documentElement.scrollHeight>height+1||document.body.scrollWidth>width+1||document.body.scrollHeight>height+1)failures.push('Body/document overflow');
    const canvas=document.querySelector('#game');
    if(!canvas||!visible(canvas))failures.push('Visible game Canvas missing');
    else {const r=rect(canvas);inView(r,'Canvas');if(r.width<80||r.height<60||!canvas.width||!canvas.height)failures.push('Canvas has unusable bounds/backing buffer');if(Math.abs((r.width/r.height)/(canvas.width/canvas.height)-1)>.025)failures.push('Canvas aspect ratio is distorted');const header=document.querySelector('header');if(header&&rect(header).bottom>r.y+1)failures.push('Canvas overlaps HUD/header');}
    const buttons=[...document.querySelectorAll('main button')].filter(visible).map(e=>({id:e.id||e.getAttribute('aria-label'),r:rect(e),cell:e.matches('#plate button'),disabled:e.disabled,e}));
    for(const b of buttons){inView(b.r,b.id);if(!b.cell&&(b.r.width<43.5||b.r.height<43.5))failures.push(`${b.id} action target below 44px`);
      const hit=document.elementFromPoint(b.r.x+b.r.width/2,b.r.y+b.r.height/2);
      if(hit!==b.e&&!b.e.contains(hit))failures.push(`${b.id} obstructed by ${hit?.tagName}#${hit?.id}`);
      for(const c of buttons){if(b===c)break;const overlap=Math.min(b.r.right,c.r.right)-Math.max(b.r.x,c.r.x),height=Math.min(b.r.bottom,c.r.bottom)-Math.max(b.r.y,c.r.y);if(overlap>1&&height>1)failures.push(`${b.id} overlaps ${c.id}`);}}
    for(const selector of ['.stats','#status','#prompt','#activity','#value','#space','#selected','#hover','#stage','#credits','#health','#nests']){const e=document.querySelector(selector);if(e){if(!visible(e))failures.push(`${selector} essential status hidden`);else{inView(rect(e),selector);if(parseFloat(getComputedStyle(e).fontSize)<9)failures.push(`${selector} unreadable font size`);}}}
    const meta=document.querySelector('meta[name=viewport]')?.content||'';
    if(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\D|$)/i.test(meta))failures.push('Viewport disables browser zoom');
    return {failures,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:canvas?rect(canvas):null,buttons:buttons.map(({e,...b})=>b)};
  },page.viewportSize());
  invariant(!result.failures.length,result.failures.join('; ')); return result;
}
export async function pauseAndRotate(page, game, touch, record) {
  const state = async()=>page.evaluate(()=>Object.fromEntries(['score','value','space','credits','nests','health','stage','selected','count'].map(id=>[id,document.getElementById(id)?.textContent??null])));
  const before=await state();
  await action(page,'#help',touch); await page.locator('#help-dialog').waitFor({state:'visible'});
  await page.waitForTimeout(120);
  const pausedTime=await page.locator('#time').count()?await text(page,'#time'):null;
  await page.waitForTimeout(1100);
  invariant(JSON.stringify(await state())===JSON.stringify(before),'Help changed score/inventory/economy/selection state');
  if(pausedTime!==null)invariant(await text(page,'#time')===pausedTime,'Help did not pause timer');
  await action(page,'#help-close',touch);await page.locator('#help-dialog').waitFor({state:'hidden'});
  const original=page.viewportSize();await page.setViewportSize({width:320,height:568});await page.waitForTimeout(120);
  invariant(await page.locator('.rotate-notice').isVisible(),'Portrait has no useful rotation guidance');
  const portraitTime=pausedTime!==null?await text(page,'#time'):null;await page.waitForTimeout(1100);
  invariant(JSON.stringify(await state())===JSON.stringify(before),'Rotation changed round state');
  if(portraitTime!==null)invariant(await text(page,'#time')===portraitTime,'Portrait did not pause timer');
  await page.setViewportSize({width:667,height:280});await page.waitForTimeout(120);await geometry(page);
  await page.setViewportSize(original);await page.waitForTimeout(120);await geometry(page);
  await record(`help-rotation-state-preserved-${game}`,{state:before,game});
}
