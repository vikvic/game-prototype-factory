// Hall layout, collision and grid A* pathfinding. All units are world (map) units.
type Point = {x:number;y:number};
export type Rect = {x:number;y:number;w:number;h:number};
export type Wall = Rect & {back?:boolean};

export const WORLD={w:1440,h:880};
export const VIEW={w:900,h:520};
export const RADIUS=12; // player collision radius

// Back wall, outer walls, and interior walls with doorways:
// bakery wing (left, open to the south), sushi bar (top right, door on its south-east side),
// carvery wing (bottom right, door at y 580-700), dining area in the middle, two pillars.
export const walls:Wall[]=[
 {x:0,y:0,w:1440,h:48,back:true},
 {x:0,y:48,w:20,h:832},{x:1420,y:48,w:20,h:832},{x:20,y:860,w:1400,h:20},
 {x:460,y:48,w:20,h:422},
 {x:960,y:48,w:20,h:532},{x:960,y:700,w:20,h:160},
 {x:980,y:280,w:280,h:20},
 {x:580,y:400,w:40,h:40},{x:820,y:400,w:40,h:40},
];
export const signs=[{text:'BAKERY',x:240},{text:'THE BUFFET',x:720},{text:'SUSHI BAR',x:1200}];

export const counterRect=(s:Point):Rect=>({x:s.x-86,y:s.y-44,w:172,h:80});
export function tableRects(t:Point):Rect[]{
 return [{x:t.x-66,y:t.y-36,w:132,h:70},{x:t.x-95,y:t.y-30,w:26,h:48},{x:t.x+69,y:t.y-30,w:26,h:48}];
}

let solids:Rect[]=[];
const CELL=20,COLS=WORLD.w/CELL,ROWS=WORLD.h/CELL;
let free:Uint8Array=new Uint8Array(COLS*ROWS);

function hit(x:number,y:number,pad:number){
 if(x<pad||y<pad||x>WORLD.w-pad||y>WORLD.h-pad)return true;
 for(const r of solids)if(x>r.x-pad&&x<r.x+r.w+pad&&y>r.y-pad&&y<r.y+r.h+pad)return true;
 return false;
}
export const blocked=(x:number,y:number)=>hit(x,y,RADIUS);

// Build once: obstacles + walkable grid (cells keep a little extra clearance).
export function setObstacles(rects:Rect[]){
 solids=[...walls,...rects];
 free=new Uint8Array(COLS*ROWS);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)free[r*COLS+c]=hit(c*CELL+CELL/2,r*CELL+CELL/2,RADIUS+4)?0:1;
}

// Axis-separated move so the player slides along walls instead of sticking.
export function move(p:Point,dx:number,dy:number){
 if(!blocked(p.x+dx,p.y))p.x+=dx;
 if(!blocked(p.x,p.y+dy))p.y+=dy;
}

const cellOf=(p:Point)=>({c:Math.min(COLS-1,Math.max(0,Math.floor(p.x/CELL))),r:Math.min(ROWS-1,Math.max(0,Math.floor(p.y/CELL)))});
const centre=(i:number)=>({x:(i%COLS)*CELL+CELL/2,y:Math.floor(i/COLS)*CELL+CELL/2});

function nearestFree(p:Point){
 const {c,r}=cellOf(p);let best=-1,bd=Infinity;
 for(let rad=0;rad<20&&best<0;rad++)for(let y=r-rad;y<=r+rad;y++)for(let x=c-rad;x<=c+rad;x++){
  if(x<0||y<0||x>=COLS||y>=ROWS||!free[y*COLS+x])continue;
  const q=centre(y*COLS+x),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<bd){bd=d;best=y*COLS+x;}
 }
 return best;
}

function clear(a:Point,b:Point){
 const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6);
 for(let i=1;i<=n;i++){const t=i/n;if(hit(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,RADIUS+1))return false;}
 return true;
}

// A* over the walkable grid (8-way, no corner cutting), then string-pulled to straight segments.
// Returns waypoints ending at the reachable point closest to `goal`, or [] if unreachable.
export function findPath(from:Point,goal:Point):Point[]{
 const s=nearestFree(from),g=nearestFree(goal);if(s<0||g<0)return [];
 const end=!hit(goal.x,goal.y,RADIUS+1)&&g===nearestFree(goal)&&Math.hypot(centre(g).x-goal.x,centre(g).y-goal.y)<CELL?{x:goal.x,y:goal.y}:centre(g);
 const gx=g%COLS,gy=Math.floor(g/COLS),h=(i:number)=>{const dx=Math.abs(i%COLS-gx),dy=Math.abs(Math.floor(i/COLS)-gy);return (dx+dy+(Math.SQRT2-2)*Math.min(dx,dy))*CELL;};
 const cost=new Float64Array(COLS*ROWS).fill(Infinity),prev=new Int32Array(COLS*ROWS).fill(-1),done=new Uint8Array(COLS*ROWS);
 const open:number[]=[s];cost[s]=0;
 while(open.length){
  let bi=0;for(let i=1;i<open.length;i++)if(cost[open[i]]+h(open[i])<cost[open[bi]]+h(open[bi]))bi=i;
  const cur=open[bi];open[bi]=open[open.length-1];open.pop();
  if(cur===g)break;if(done[cur])continue;done[cur]=1;
  const cx=cur%COLS,cy=Math.floor(cur/COLS);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;
   const n=ny*COLS+nx;if(!free[n]||done[n])continue;
   if(dx&&dy&&(!free[cy*COLS+nx]||!free[ny*COLS+cx]))continue;
   const nc=cost[cur]+(dx&&dy?Math.SQRT2:1)*CELL;
   if(nc<cost[n]){cost[n]=nc;prev[n]=cur;open.push(n);}
  }
 }
 if(s!==g&&prev[g]<0)return [];
 const cells:Point[]=[];for(let i=g;i!==s&&i>=0;i=prev[i])cells.unshift(centre(i));
 cells.push(end);
 const out:Point[]=[];let at:Point=from,i=0;
 while(i<cells.length){let j=cells.length-1;while(j>i&&!clear(at,cells[j]))j--;out.push(cells[j]);at=cells[j];i=j+1;}
 return out;
}
