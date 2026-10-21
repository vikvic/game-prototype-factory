// Trusted factory acceptance. Candidate games cannot select or modify this scenario.
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { geometry } from './playchecks/common.mjs';
import { wingInput, wingWin, wingLoss } from './playchecks/wing_escape.mjs';

const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2)]=process.argv[i+1];
const root=await realpath(resolve(args.dist)),out=resolve(args.output);await mkdir(out,{recursive:true});
const edition=JSON.parse(await readFile(join(root,'edition.json'),'utf8'));
if(edition.analytics_domain||edition.ad_mode!=='disabled')throw Error('Acceptance requires disabled production services');
const result={passed:false,release:edition.release,emulated:true,physical_devices:false,cases:[],limitations:['Desktop engine emulation; no physical-device ergonomics or humor judgment.','Sharing initiation/cancellation does not establish delivery or referral reach.']};
const wings=edition.mechanic==='wing-escape',portraitCourse=edition.layout==='portrait-course';
const viewports=portraitCourse?[[320,568],[360,640],[390,844],[430,932],[667,375]]:[[568,320],[667,375],[844,390],[667,280],[390,844]];
const invariant=(v,m)=>{if(!v)throw Error(m);};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const p=await realpath(join(root,decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html'));if(p!==root&&!p.startsWith(root+sep))throw Error('outside');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extname(p)]||'application/octet-stream';res.writeHead(200,{'content-type':mime});res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
const browsers=[];
async function state(page){return page.locator('#game').evaluate(c=>({...c.dataset}));}
async function moveTo(page,x,y,mayFinish=false){
  for(let i=0;i<100;i++){
    const s=await state(page);if(mayFinish&&s.phase==='won')return;if(s.phase!=='playing')throw Error(`Run ended while navigating: ${JSON.stringify(s)}`);
    const dx=x-Number(s.x),dy=y-Number(s.y);if(Math.hypot(dx,dy)<20)return;
    const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'ArrowRight':'ArrowLeft'):(dy>0?'ArrowDown':'ArrowUp');
    await page.keyboard.down(direction);if(Number(s.cooldown)===0)await page.keyboard.press('Space');
    await page.waitForTimeout(Math.min(200,Math.max(30,(Math.abs(dx)>Math.abs(dy)?Math.abs(dx):Math.abs(dy))/230*850)));
    await page.keyboard.up(direction);
  }throw Error('Navigation failed');
}
async function winRun(page){const h=Number((await state(page)).worldHeight);for(const [x,y]of [[200,.84],[200,.24],[480,.24],[480,.84],[790,.84],[790,.30],[900,.30],[900,.09]])await moveTo(page,x,h*y,y===.09);await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='won');}
try{
  for(const [name,type]of [['chromium',chromium],['webkit',webkit]]){
    const browser=await type.launch();browsers.push(browser);
    for(const [width,height] of [...viewports,...(name==='chromium'?[[1280,720]]:[])]){
      const touch=width!==1280,primary=width===(portraitCourse?320:568);const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1,...(name==='chromium'&&width===(portraitCourse?390:844)?{recordVideo:{dir:join(out,'clips'),size:{width,height}}}:{})});const page=await context.newPage();page.setDefaultTimeout(8000);
      await context.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError');}}));
      const entry={engine:name,width,height,passed:false,diagnostics:[],storageDenied:true};result.cases.push(entry);
      page.on('pageerror',e=>entry.diagnostics.push(String(e)));page.on('requestfailed',r=>entry.diagnostics.push(r.url()));
      await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(url).origin){entry.diagnostics.push('Unexpected external request');return route.abort();}return route.continue();});
      try{
        await page.goto(url);await page.waitForFunction(()=>document.querySelector('#game')?.dataset.phase==='intro');await geometry(page);if(portraitCourse&&width<height)await page.screenshot({path:join(out,`${name}-${width}x${height}-intro.png`)});
        if(touch)await page.locator('#start').tap();else await page.locator('#start').click();
        const h=Number((await state(page)).worldHeight);
        // Chromium has native multi-touch injection; WebKit covers pointer capture + touch action taps.
        const pad=await page.locator('#move-pad').boundingBox();const before=Number((await state(page)).x);
        if(wings){await wingInput(page,name,touch);entry.nativeMultiTouch=name==='chromium'&&touch;}else if(name==='chromium'&&touch){
          const cdp=await context.newCDPSession(page);const finger={x:pad.x+pad.width*.86,y:pad.y+pad.height*.5,id:1};
          await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});await page.waitForTimeout(180);
          const dash=await page.locator('#dash').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,{x:dash.x+dash.width/2,y:dash.y+dash.height/2,id:2}]});
          await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.cooldown)>0);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await cdp.detach();entry.nativeMultiTouch=true;
        }else{await page.mouse.move(pad.x+pad.width*.86,pad.y+pad.height*.5);await page.mouse.down();await page.waitForTimeout(180);await page.mouse.up();entry.nativeMultiTouch=false;}
        invariant(Number((await state(page)).x)>before+10,'Movement pad failed');
        await page.locator('#help').click();const old=await page.locator('#time').textContent();await page.waitForTimeout(1100);invariant(await page.locator('#time').textContent()===old,'Help timer moved');await page.locator('#help-close').click();
        if(touch&&!wings){await page.locator('#dash').tap();await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.cooldown)>0);}
        const prior=await state(page);
        const continueRotation=async()=>{if(portraitCourse){await page.locator('#rotation-continue').waitFor({state:'visible'});const held=await state(page);await page.waitForTimeout(350);invariant((await state(page)).time===held.time,'Rotation timer moved before Continue');invariant((await state(page)).paused==='true','Rotation did not pause');await page.locator('#rotation-continue').click();}};
        await page.setViewportSize(width>height?{width:390,height:844}:{width:667,height:375});await page.waitForTimeout(150);await geometry(page);await continueRotation();
        await page.setViewportSize({width,height});await page.waitForTimeout(150);await continueRotation();const resized=await state(page);invariant((wings?['x','z','doors','snags']:['passes','photos']).every(k=>prior[k]===resized[k]),'Resize changed progress');entry.resizePreserved=true;entry.rotationContinue=portraitCourse;

        await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await page.locator('#time').textContent();await page.waitForTimeout(1100);invariant(await page.locator('#time').textContent()===paused,'Blur did not pause');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));entry.backgroundSignal='simulated blur/focus callbacks';
        if(wings)await wingWin(page,primary,primary?join(out,`${name}-${width}x${height}-door.png`):null);else await winRun(page);
        await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='won');invariant((await state(page))[wings?'doors':'passes']==='3','Progress missing');await geometry(page);
        const saved=await state(page);
        await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Canceled','AbortError');}}));
        await page.locator('#share').click();await page.waitForFunction(()=>document.querySelector('#share-status').textContent.includes('canceled'));
        invariant((await state(page)).phase===saved.phase&&(await state(page))[wings?'doors':'passes']===saved[wings?'doors':'passes'],'Share cancellation changed game');
        await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}});});
        await page.locator('#share').click();await page.waitForFunction(()=>document.querySelector('#share-status').textContent.includes('Result copied'));entry.unsupportedShareFallback=true;
        const download=page.waitForEvent('download');await page.locator('#save').click();const d=await download;invariant(d.suggestedFilename().endsWith('.png'),'Result image missing');
        await page.screenshot({path:join(out,`${name}-${width}x${height}-won.png`)});
        await page.locator('#restart').click();await page.waitForFunction(wings=>{const d=document.querySelector('#game').dataset;return d.phase==='playing'&&d[wings?'doors':'passes']==='0';},wings);
        if(width===1280){
          if(wings){await wingLoss(page);}else{
          await moveTo(page,480,h*.84);await moveTo(page,480,h*.2);await moveTo(page,500,h*.42);
          await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='lost',{},{timeout:95000});
          invariant(Number((await state(page)).photos)>0,'Loss route never exercised camera exposure');}
          await page.locator('#restart').click();
          await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='playing');
        }
        if(primary){
          // Controlled provider fixture: exact game bundle, only public runtime service mode differs.
          await page.route('**/edition.json',route=>route.fulfill({json:{...edition,ad_mode:'mock-no-fill'}}));await page.reload();await page.waitForFunction(()=>document.querySelector('#game')?.dataset.phase==='intro');await page.locator('#start').click();if(wings)await wingWin(page);else await winRun(page);await page.locator('#restart').click();await page.waitForFunction(()=>document.querySelector('#game').dataset.phase==='playing'&&document.querySelector('#game').dataset.adOutcome==='unavailable');entry.mockNoFillRecovered=true;
        }
        invariant(!entry.diagnostics.length,entry.diagnostics.join('; '));entry.passed=true;
      }catch(error){entry.failure=String(error.stack||error);await page.screenshot({path:join(out,`${name}-${width}x${height}-failed.png`)}).catch(()=>{});throw error;}
      finally{await context.close();await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));}
    }
  }result.passed=true;
}catch(error){result.failure=String(error.stack||error);process.exitCode=1;}
finally{for(const b of browsers)await b.close();await new Promise(r=>server.close(r));await writeFile(join(out,'result.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify({passed:result.passed,cases:result.cases.length,failure:result.failure}));
