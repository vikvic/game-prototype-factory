#!/usr/bin/env node
// This entry point and scenario registry are trusted factory files, never imports from a candidate.
import { chromium, webkit } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { serve } from './playchecks/server.mjs';
import { geometry, invariant } from './playchecks/common.mjs';
import { scenarios } from './playchecks/scenarios.mjs';

const args={};
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i];if(!['--project','--site','--url','--game','--output','--timeout'].includes(key)||!process.argv[i+1])throw Error(`Invalid argument ${key}`);args[key.slice(2)]=process.argv[i+1];}
const output=resolve(args.output||'.factory/playcheck');await mkdir(output,{recursive:true});
const started=Date.now();
const result={started_at:new Date().toISOString(),passed:false,emulated:true,physical_devices:false,game:args.game||null,scenario:null,matrix:[],screenshots:[],phases:[],diagnostics:[],limitations:['Chromium/WebKit desktop emulation; no physical-device coverage.','Tunnel scenario demonstrates one combat wave, not full campaign completion.','Numeric invariants allow tuning; scenario map routes require deliberate trusted updates if world geometry changes.']};
const browsers=new Set();let server,currentPage,currentCase,deadline;
const save=()=>{result.elapsed_seconds=(Date.now()-started)/1000;return writeFile(join(output,'result.json'),JSON.stringify(result,null,2));};
async function shot(page,label){const name=`${result.game}-${currentCase}-${label}.png`.replace(/[^a-zA-Z0-9_.-]/g,'_');await page.screenshot({path:join(output,name),timeout:6000});result.screenshots.push(name);return name;}
async function checkGame(game,url){
 result.game=game;const scenario=scenarios[game];
 if(!scenario){result.missing_coverage=true;throw Error(`Missing trusted gameplay coverage for ${game}`);}
 result.scenario=scenario.name;
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({timeout:25000});browsers.add(browser);
  try{
   const sizes=[[568,320],[667,375],[844,390],[667,280],...(engine==='chromium'?[[1280,720]]:[])];
   for(const [index,[width,height]]of sizes.entries()){
    const touch=width!==1280;currentCase=`${engine}-${width}x${height}`;
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?2:1,serviceWorkers:'block'});
    const page=await context.newPage();currentPage=page;page.setDefaultTimeout(9000);page.setDefaultNavigationTimeout(18000);
    const diagnostics=[],failures=[];let phase='navigation';
    const log=(kind,detail,fatal=false)=>{const d={case:currentCase,game,kind,detail,phase};diagnostics.push(d);if(fatal)failures.push(d);};
    page.on('pageerror',e=>log('pageerror',e.stack||e.message,true));
    page.on('console',m=>log(`console:${m.type()}`,{text:m.text(),location:m.location()},m.type()==='error'));
    page.on('requestfailed',r=>log('requestfailed',{url:r.url(),type:r.resourceType(),error:r.failure()},true));
    page.on('response',r=>{if(r.status()>=400)log('http',{url:r.url(),status:r.status()},true);});
    const entry={game,engine,width,height,touch,emulated:true,passed:false,scenario:scenario.name};result.matrix.push(entry);
    const record=async(name,details={})=>{phase=name;invariant(!failures.length,`Browser errors: ${JSON.stringify(failures)}`);result.phases.push({game,case:currentCase,phase:name,...details,screenshot:await shot(page,name)});await save();};
    try{
      const response=await page.goto(url,{waitUntil:'networkidle'});invariant(response?.ok(),'Game document failed to load');await page.locator('canvas#game').waitFor({state:'visible'});
      await page.waitForTimeout(120);entry.layout=await geometry(page);await record('initial');
      phase='core-loop';await scenario.run(page,{touch,rotate:touch&&index===0,record});
      await page.waitForLoadState('networkidle');entry.finalLayout=await geometry(page);invariant(!failures.length,`Browser errors: ${JSON.stringify(failures)}`);entry.passed=true;
    }catch(e){entry.failure=String(e.stack||e);try{await shot(page,'failure');}catch{}throw Error(`${game} ${currentCase} ${phase}: ${e.message}`,{cause:e});}
    finally{result.diagnostics.push(...diagnostics);await context.close();currentPage=null;await save();}
   }
  }finally{await browser.close();browsers.delete(browser);}
 }
}
try{
 const modes=['project','site','url'].filter(key=>args[key]);invariant(modes.length===1,'Specify exactly one of --project, --site or --url');
 const limit=Number(args.timeout||(args.site?1200:285));invariant(Number.isFinite(limit)&&limit>0,'Invalid timeout');
 deadline=setTimeout(async()=>{const forceExit=setTimeout(()=>process.exit(1),8000);forceExit.unref();result.failure=`Browser verification exceeded ${limit}s`;try{await save();}finally{for(const b of browsers)await b.close().catch(()=>{});if(server)await server.close().catch(()=>{});process.exit(1);}},limit*1000);
 if(args.url){invariant(args.game,'--url requires --game');const u=new URL(args.url);invariant(['http:','https:'].includes(u.protocol),'Only HTTP(S) game URLs supported');await checkGame(args.game,u.href);}
 else if(args.project){invariant(args.game&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(args.game),'--project requires a valid --game');server=await serve([{root:resolve(args.project,'dist'),prefix:`/game-prototype-factory/games/${args.game}/`}]);await checkGame(args.game,`${server.base}/game-prototype-factory/games/${args.game}/`);}
 else{
   const root=resolve(args.site),manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));invariant(Array.isArray(manifest),'Site manifest must be an array');
   const games=manifest.filter(g=>g.demo===false);invariant(games.length>0,'Site has no non-demo games to verify');
   invariant(manifest.every(g=>typeof g.demo==='boolean'&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(g.id)),'Invalid site game metadata');
   server=await serve([{root,prefix:'/game-prototype-factory/'}]);result.skipped_demo_games=manifest.filter(g=>g.demo).map(g=>g.id);
   for(const g of games)await checkGame(g.id,`${server.base}/game-prototype-factory/games/${g.id}/`);
   result.games=games.map(g=>g.id);result.game='site';result.scenario='all-non-demo-trusted-scenarios';
 }
 result.passed=true;
}catch(e){result.failure=String(e.stack||e);process.exitCode=1;}
finally{clearTimeout(deadline);for(const browser of browsers)await browser.close().catch(()=>{});if(server)await server.close();await save();}
console.log(JSON.stringify({passed:result.passed,game:result.game,cases:result.matrix.length,failure:result.failure,output}));
