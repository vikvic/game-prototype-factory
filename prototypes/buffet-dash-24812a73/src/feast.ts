// Feast: rhythm mini-game for eating. The plate becomes a note chart (pickup order, one note per cell);
// each bite is one beat. Timing grades multiply the points of the portion the note belongs to.
export const BEAT=0.4;          // seconds per note (one bite per beat)
export const LEAD=0.8;          // count-in before the first note
export const PERFECT=0.06,GOOD=0.12,HOLD_GRACE=0.06; // timing windows (s)
export const GRADE={perfect:1.2,good:1.0,miss:0.6};
const DOWN:Record<number,number>={1.2:1.0,1.0:0.6,0.6:0.6};

// A portion as the feast sees it: bite pattern ('T' tap, 'H' hold) and grades of bites already eaten (persist on stop).
export type Eater = {bites:string;grades:number[]};
export type Note = {t:number;dur:number;hold:boolean;p:Eater;i:number;grade:number|null;state:'wait'|'held'|'done';chained?:boolean};
export type Fx = {text:string;at:number;kind:'perfect'|'good'|'miss'};
// events: sound cues for main to play ('tick','tick-accent','hit-perfect','hit-good','hold','miss','drop'), with the portion
// they belong to (so main can pick that food's bite sound); ticks: beat times.
export type FeastEvent = {e:string;p?:Eater};
export type Feast = {t:number;notes:Note[];pressing:boolean;fx:Fx[];counts:{perfect:number;good:number;miss:number};events:FeastEvent[];ticks:{t:number;accent:boolean}[];nextTick:number};

export function startFeast(portions:Eater[]):Feast{
 const notes:Note[]=[];let t=LEAD;
 for(const p of portions)for(let i=p.grades.length;i<p.bites.length;i++){notes.push({t,dur:BEAT,hold:p.bites[i]==='H',p,i,grade:null,state:'wait'});t+=BEAT;}
 const ticks=[] as {t:number;accent:boolean}[];for(let c=0;c<LEAD-1e-9;c+=BEAT)ticks.push({t:c,accent:true});for(const n of notes)ticks.push({t:n.t,accent:false});
 return {t:0,notes,pressing:false,fx:[],counts:{perfect:0,good:0,miss:0},events:[],ticks,nextTick:0};
}
const kindOf=(g:number)=>g>=GRADE.perfect?'perfect':g>=GRADE.good?'good':'miss';
function finish(f:Feast,n:Note){n.state='done';n.p.grades[n.i]=n.grade!;const k=kindOf(n.grade!);f.counts[k]++;f.fx.push({text:k==='perfect'?'Perfect!':k==='good'?'Good':'Miss',at:f.t,kind:k});}

// Bite pressed (E down / touch down): grade the nearest waiting note inside the Good window; stray presses are ignored.
export function press(f:Feast){
 f.pressing=true;
 const n=f.notes.find(n=>n.state==='wait'&&Math.abs(f.t-n.t)<=GOOD);if(!n)return;
 n.grade=Math.abs(f.t-n.t)<=PERFECT?GRADE.perfect:GRADE.good;f.events.push({e:n.grade===GRADE.perfect?'hit-perfect':'hit-good',p:n.p});
 if(n.hold){n.state='held';f.events.push({e:'hold',p:n.p});}else finish(f,n);
}
// Bite released: a hold let go before its end (minus grace) drops one grade.
// A hold that was carried on from the previous hold and let go right at its start counts as a re-press: it goes back to waiting.
export function release(f:Feast){
 f.pressing=false;
 for(const n of f.notes)if(n.state==='held'){
  if(n.chained&&f.t-n.t<=GOOD){n.state='wait';n.grade=null;n.chained=false;continue;}
  if(f.t<n.t+n.dur-HOLD_GRACE){n.grade=DOWN[n.grade!];f.events.push({e:'drop',p:n.p});}finish(f,n);}
}
// Advance time: unpressed notes past the window miss; completed holds finish. Back-to-back holds (the roast's HH) draw as one
// bar, so still holding when one ends carries straight into the next hold with the same grade (no re-press needed, no extra munch).
export function update(f:Feast,dt:number){
 f.t+=dt;
 while(f.nextTick<f.ticks.length&&f.t>=f.ticks[f.nextTick].t)f.events.push({e:f.ticks[f.nextTick++].accent?'tick-accent':'tick'});
 for(let k=0;k<f.notes.length;k++){const n=f.notes[k];
  if(n.state==='held'&&f.t>=n.t+n.dur){finish(f,n);const m=f.notes[k+1];
   if(f.pressing&&m&&m.hold&&m.state==='wait'&&Math.abs(m.t-(n.t+n.dur))<1e-6){m.grade=n.grade;m.state='held';m.chained=true;}}
  else if(n.state==='wait'&&f.t>n.t+GOOD){n.grade=GRADE.miss;finish(f,n);f.events.push({e:'miss',p:n.p});}
 }
 f.fx=f.fx.filter(x=>f.t-x.at<0.6);
}
// Stop early: an in-progress hold keeps the grade it was pressed with; unplayed bites stay uneaten (resume later).
export function stop(f:Feast){for(const n of f.notes)if(n.state==='held')finish(f,n);}
export const done=(f:Feast)=>f.notes.every(n=>n.state==='done');
export const progress=(f:Feast)=>f.notes.length?f.notes.filter(n=>n.state==='done').length/f.notes.length:1;
