// Sound: one recorded "munch" for every successful Feast bite.
// Clip: crunch.4.ogg from "7 Eating Crunches" by StarNinjas, CC0 — https://opengameart.org/node/123490
// (trimmed to 0.33 s, mono, normalised, saved as WAV for browser compatibility).
// Audio starts on the first key/tap (browser autoplay rules).
import munchUrl from './sfx/munch.wav';
type AC = AudioContext;
let ac:AC|null=null,master:GainNode|null=null,munchBuf:AudioBuffer|null=null;
const KEY='buffet-dash-muted';
let muted=(()=>{try{return localStorage.getItem(KEY)==='1';}catch{return false;}})();
export const isMuted=()=>muted;
export function setMuted(m:boolean){muted=m;try{localStorage.setItem(KEY,m?'1':'0');}catch{/* storage optional */}if(master)master.gain.value=m?0:0.8;}
// Call from a user-gesture handler (keydown / pointerdown) so mobile browsers allow audio. Loads the clip once.
export function unlock(){
 if(!ac){const C=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!C)return;
  ac=new C();master=ac.createGain();master.gain.value=muted?0:0.8;master.connect(ac.destination);
  const c=ac;fetch(munchUrl).then(r=>r.arrayBuffer()).then(b=>c.decodeAudioData(b)).then(buf=>{munchBuf=buf;}).catch(()=>{/* sound optional */});}
 if(ac.state==='suspended')void ac.resume();
}
function play(name:string,buf:AudioBuffer|null,gain=1,rate=1){
 if(!ac||!master||!buf||ac.state!=='running'||muted)return;
 (window as unknown as {__sfxLog?:string[]}).__sfxLog?.push(name); // test hook (only set by tests)
 const s=ac.createBufferSource(),g=ac.createGain();s.buffer=buf;s.playbackRate.value=rate;g.gain.value=gain;s.connect(g).connect(master);s.start();
}
export const sfx={
 munch:()=>play('munch',munchBuf,0.9,0.92+Math.random()*0.16), // successful Feast bite; slight pitch variation so repeats differ
};
