export type Phase = 'intro' | 'playing' | 'won' | 'lost';
export type Rect = { x:number; z:number; w:number; d:number; kind:string };
export type Crew = { x:number; z:number; kind:'press'|'phone'|'tv'; warning:boolean; flash:boolean };
export type WingWorld = {
  phase:Phase; x:number; z:number; open:number; time:number; elapsed:number; doors:number;
  snags:number; strut:number; distance:number; recoil:number; grace:number; flash:number;
  moving:number; facing:number; lean:number; message:string; lastObstacle:string;
  particles:{x:number;z:number;vx:number;vy:number;life:number}[];
};
export const gates = [
  {x:600,lo:65,hi:145,label:'STAGE DOOR'},
  {x:1320,lo:180,hi:260,label:'WARDROBE'},
  {x:2110,lo:105,hi:185,label:'PRESS EXIT'},
];
export const props:Rect[] = [
  {x:930,z:185,w:140,d:105,kind:'clothing rack'},
  {x:1160,z:35,w:85,d:65,kind:'road case'},
  {x:1620,z:30,w:105,d:95,kind:'TV equipment'},
  {x:1800,z:210,w:100,d:100,kind:'makeup station'},
];
const barriers:Rect[] = gates.flatMap(g=>[
  {x:g.x-16,z:0,w:32,d:g.lo,kind:g.label.toLowerCase()},
  {x:g.x-16,z:g.hi,w:32,d:320-g.hi,kind:g.label.toLowerCase()},
]);
export function newWorld():WingWorld {
  return {phase:'intro',x:150,z:105,open:1,time:60,elapsed:0,doors:0,snags:0,strut:0,distance:0,
    recoil:0,grace:0,flash:0,moving:0,facing:1,lean:0,message:'A $50m runway look. A very ordinary backstage door.',lastObstacle:'',particles:[]};
}
export function crew(w:WingWorld):Crew[] {
  return [
    {x:1510,z:230+Math.sin(w.elapsed*.8)*22,kind:'tv' as const,cycle:4.9,offset:1},
    {x:1950,z:70+Math.sin(w.elapsed*.7)*20,kind:'phone' as const,cycle:3.6,offset:0},
    {x:2310,z:225,kind:'press' as const,cycle:4.2,offset:2},
  ].map(c=>{const t=(w.elapsed+c.offset)%c.cycle;return {...c,warning:t>c.cycle-1.1,flash:t<.14};});
}
function obstruction(x:number,z:number,open:number,w:WingWorld):Rect|undefined {
  const rx=17+open*18,rz=17+open*55;
  const people=crew(w).map(c=>({x:c.x-16,z:c.z-16,w:32,d:32,kind:c.kind==='tv'?'boom crew':c.kind==='phone'?'phone filmer':'photographer'}));
  return [...barriers,...props,...people].find(r=>x+rx>r.x&&x-rx<r.x+r.w&&z+rz>r.z&&z-rz<r.z+r.d);
}
function snag(w:WingWorld,kind:string) {
  if(w.grace>0)return;
  w.snags++;w.grace=1.35;w.recoil=.55;w.lastObstacle=kind;
  w.message=kind==='flash'?'Flash! Keep the wings tucked near the press.':`Wings caught on ${kind}. Hold TUCK and try again.`;
  for(let i=0;i<7;i++)w.particles.push({x:w.x,z:w.z,vx:(Math.random()-.5)*130,vy:-70-Math.random()*70,life:1.2});
}
export function step(w:WingWorld,dt:number,input:{x:number;z:number;fold:boolean}) {
  if(w.phase!=='playing')return;
  w.time=Math.max(0,w.time-dt);w.elapsed+=dt;w.grace=Math.max(0,w.grace-dt);w.recoil=Math.max(0,w.recoil-dt);w.flash=Math.max(0,w.flash-dt);
  w.open+=(Number(!input.fold)-w.open)*Math.min(1,dt*13);
  let dx=input.x,dz=input.z;const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}
  const speed=(174-68*(1-w.open))*(w.recoil>0?.25:1),oldX=w.x,oldZ=w.z;
  const nx=Math.max(55,Math.min(2590,w.x+dx*speed*dt)),nz=Math.max(25,Math.min(295,w.z+dz*speed*dt));
  if(dx){const hit=obstruction(nx,w.z,w.open,w);if(hit)snag(w,hit.kind);else w.x=nx;}
  if(dz){const hit=obstruction(w.x,nz,w.open,w);if(hit)snag(w,hit.kind);else w.z=nz;}
  const traveled=Math.hypot(w.x-oldX,w.z-oldZ);w.distance+=traveled;w.strut+=traveled*w.open;w.moving=traveled/dt;
  if(dx)w.facing=Math.sign(dx);w.lean+=(dx*6-w.lean)*Math.min(1,dt*8);
  for(const c of crew(w))if(c.flash&&Math.abs(c.x-w.x)<145&&Math.abs(c.z-w.z)<65){w.flash=.13;if(w.open>.55)snag(w,'flash');}
  for(const p of w.particles){p.x+=p.vx*dt;p.z+=p.vy*dt;p.vy+=150*dt;p.life-=dt;}w.particles=w.particles.filter(p=>p.life>0);
  const cleared=gates.filter(g=>w.x>g.x+55).length;
  if(cleared>w.doors){w.doors=cleared;w.message=cleared===3?'All three doors clear. Your car is waiting!':`Door ${cleared} clear. Open the wings and make an entrance.`;}
  if(w.snags>=5||w.time<=0){w.phase='lost';w.message='The wings have requested a wider venue.';}
  else if(w.x>2500&&w.doors===3){w.phase='won';w.message='Car secured. Wings travelling separately next time.';}
}
