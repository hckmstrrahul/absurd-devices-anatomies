// Lumen motion model. Seconds, degrees, 0..1 levels. No three.js in here.
// Two clocks, as in a real watch being set. `run` is how long the going train has been running: it paces the
// escapement, every wheel, the seconds hand and the glow pulses. `clock` is the time the hour and minute hands show;
// the Rate input sets them forward faster through the friction fit of the cannon pinion, without disturbing the train.
import {clamp,frac,smooth,spread as stagger} from '../kit/util';

export type AssemblyId='frame'|'glass'|'ring'|'dial'|'left'|'right'|'board';
export type RateId='1'|'60'|'600';
export type PaletteId='prism'|'ember'|'tide';

export const SIZE={x:240,y:214,z:68};
export const DAY=86400;
export const START_CLOCK=10*3600+10*60+2;   // 10:10:02, the time shown in the reference image
export const RATES:{id:RateId;mult:number;label:string}[]=[{id:'1',mult:1,label:'1×'},{id:'60',mult:60,label:'60×'},{id:'600',mult:600,label:'600×'}];
export const RING_PERIOD=3600;              // the colour pattern laps the ring once per clock hour
export const LEDS=120;
export const BEAT_HZ=4;                     // 14,400 beats per hour
export const ESCAPE_TEETH=15;               // one tooth passes every two beats
export const BEATS_PER_REV=ESCAPE_TEETH*2;
export const BALANCE_SWING=200;             // degrees either side
export const LEVER_SWING=9;
export const PUMP_HZ=1;                     // the bellows crank turns once a second
export const POWER_TAU=.35;                 // seconds for the lamps to come up or settle
export const REST=.5;                       // share of the set brightness the ring keeps when stopped
export const PULSE_DECAY=3;                 // the once-a-second pulse falls as exp(-3·fraction)
export const FLASK_PERIOD=4;
export const GAUGE_SWEEP=240;

// `move` is the explosion path in mm; `order` staggers it, front layers first.
export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number}[]=[
 {id:'frame',name:'Frame and handle',note:'Chrome band, carry handle, brightness knob.',move:[0,45,-100],order:6},
 {id:'glass',name:'Glass',note:'Front pane, gasket and chrome trim.',move:[0,45,160],order:0},
 {id:'ring',name:'Light ring',note:'120 emitters under a diffuser tube.',move:[0,45,112],order:1},
 {id:'dial',name:'Dial and hands',note:'Hands on geared motion works, set by friction.',move:[0,45,58],order:2},
 {id:'left',name:'Left movement',note:'Going train, lever escapement, day gauge.',move:[-34,45,22],order:3},
 {id:'right',name:'Right tubes',note:'Bellows-fed glow tube, level gauge, flask.',move:[34,45,22],order:4},
 {id:'board',name:'Board and feet',note:'Driver board, bus strip, four feet.',move:[0,45,-22],order:5},
];

// ── Palettes: colour stops round the ring, as a fraction of the perimeter clockwise from top centre,
// written for the moment shown in the reference (START_CLOCK). ──
type Stop=[number,string];
const STOPS:Record<PaletteId,Stop[]>={
 prism:[[.015,'#a8f050'],[.07,'#5cf07c'],[.115,'#2ee6d8'],[.2,'#22dcf2'],[.265,'#30e8bc'],[.31,'#58f070'],[.35,'#b8f040'],[.4,'#f6e21e'],[.455,'#ffae10'],[.5,'#ff8410'],[.555,'#ffb414'],[.62,'#ffe21e'],[.7,'#ffd618'],[.76,'#ff9c10'],[.815,'#ff7418'],[.848,'#ff5c9c'],[.875,'#f04ee0'],[.93,'#ff4ad2'],[.985,'#ff58c8']],
 ember:[[0,'#ff3b6b'],[.18,'#ff7a1a'],[.38,'#ffc21a'],[.58,'#ff5a1f'],[.8,'#c93bff']],
 tide:[[0,'#25e0f0'],[.24,'#3b7bff'],[.5,'#7b5bff'],[.7,'#30e8c0'],[.86,'#b8f6ff']],
};
export const PALETTES:{id:PaletteId;label:string}[]=[{id:'prism',label:'Prism'},{id:'ember',label:'Ember'},{id:'tide',label:'Tide'}];
const rgb=(hex:string):[number,number,number]=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255) as [number,number,number];
const PARSED=Object.fromEntries(Object.entries(STOPS).map(([id,stops])=>[id,stops.map(([u,hex])=>({u,c:rgb(hex)}))])) as Record<PaletteId,{u:number;c:[number,number,number]}[]>;
// sRGB colour at pattern position p (0..1, wraps).
export function paletteAt(id:PaletteId,p:number):[number,number,number]{
 const stops=PARSED[id]??PARSED.prism,x=frac(p);
 let k=stops.findIndex(s=>s.u>x);if(k<0)k=stops.length;
 const a=stops[(k-1+stops.length)%stops.length],b=stops[k%stops.length];
 const span=frac(b.u-a.u)||1,t=frac(x-a.u)/span;
 return [0,1,2].map(i=>a.c[i]+(b.c[i]-a.c[i])*t) as [number,number,number];
}

export const ringPhase=(clock:number)=>frac(clock/RING_PERIOD)*360;
export const REF_PHASE=ringPhase(START_CLOCK);
// Colour of the ring at perimeter fraction u once the pattern has been carried round by `shift` laps.
export const ringColour=(palette:PaletteId,shift:number,u:number)=>paletteAt(palette,u-shift);

export type Clock={clock:number;run:number;power:number};
export const START:Clock={clock:START_CLOCK,run:0,power:0};
export const rateOf=(id:unknown)=>RATES.find(r=>r.id===String(id))?.mult??1;
export function advance(s:Clock,dt:number,playing:boolean,rate:number):Clock{
 const step=clamp(dt,0,.1);
 const power=clamp(s.power+((playing?1:0)-s.power)*(1-Math.exp(-step/POWER_TAU)));
 if(!playing)return {clock:s.clock,run:s.run,power};
 return {clock:(s.clock+step*Math.max(0,rate))%DAY,run:s.run+step,power};
}
// A counter that rests on each whole number and spends the last `share` of the unit moving to the next.
export const tick=(x:number,share:number)=>Math.floor(x)+smooth((frac(x)-(1-share))/share);

export function poseAt(s:Clock,brightness:number,palette:PaletteId){
 const {clock,run,power}=s,set=clamp(brightness,0,1);
 const pulse=Math.exp(-PULSE_DECAY*frac(run));
 const level=set*(REST+(1-REST)*power*(.7+.3*pulse));
 const phase=ringPhase(clock);
 // The train started at START_CLOCK and has run ever since; one escape tooth passes every two beats.
 const beats=(START_CLOCK+run)*BEAT_HZ,beat=tick(beats,.3);
 const side=Math.floor(beats)%2?-1:1;
 const crank=Math.PI*2*PUMP_HZ*run;
 return {
  clock,run,power,set,palette,
  hour:frac(clock/43200)*360,
  minute:frac(clock/3600)*360,
  second:(beat*6/BEAT_HZ)%360,
  seconds:Math.floor(beats/BEAT_HZ+1e-9)%60,
  phase,shift:(phase-REF_PHASE)/360,
  level,pulse,
  beat,escapeTurns:beat/BEATS_PER_REV,
  // The balance passes through centre on every beat; the fork is thrown across as it does.
  balance:BALANCE_SWING*Math.sin(Math.PI*beats),
  lever:LEVER_SWING*side*(1-2*smooth((frac(beats)-.7)/.3)),
  beatLamp:.3+power*1.5*Math.exp(-5*frac(beats)),
  crank,puff:.5+.5*Math.cos(crank),
  tube:.75+power*(.45+1.1*pulse),
  flask:.7+power*1.1*(.5+.5*Math.sin(Math.PI*2*run/FLASK_PERIOD)),
  gauge:-GAUGE_SWEEP/2+GAUGE_SWEEP*level,
  day:clock/DAY*360,
  knob:-135+270*set,
 };
}
export type Pose=ReturnType<typeof poseAt>;
// Hours and minutes as the hands show them, seconds as the seconds hand shows them.
export const timeText=(clock:number,seconds=Math.floor(frac(clock/60)*60+1e-6))=>{const t=Math.floor(frac(clock/DAY)*DAY+1e-6);return [Math.floor(t/3600),Math.floor(t/60)%60,seconds].map(n=>String(n).padStart(2,'0')).join(':')};

const LAST=Math.max(...assemblies.map(a=>a.order));
export const spread=(separation:number,order:number)=>stagger(separation,order,LAST);
