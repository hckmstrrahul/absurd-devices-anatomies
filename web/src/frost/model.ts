// Frost motion model: a representational workload on a small single-board computer.
// Seconds, watts, degrees Celsius, gigahertz, packets per second. No three.js in here: every lamp, the display
// and every readout on the page is a function of the state this file advances.
import {clamp,frac} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='heatsink'|'flex'|'ports'|'header'|'chips'|'parts'|'board';
export const SIZE={x:92,y:25.2,z:100.5};

// `move` is the explosion path in mm: each tier lifts clear of the one below, and the ribbon draws forward off its connector.
// `layer` is where the tier hangs in the Layers view, where the board stands upright facing the viewer: x is sideways, y is
// toward the viewer, z is down the face. Each plane comes off the face to its own depth (ribbon 2, connectors 8, small parts 12,
// header 20, packages 26, heat sink 42 mm) and slides mostly sideways. The ribbon wraps the lower edge, so it only eases 2 mm off.
// `UPRIGHT` is how high the stage holds the card's centre: enough that the display stays above the floor even fully exploded.
export const UPRIGHT=115;
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'heatsink',name:'Heat sink',note:'Folded black fin, sprung on with a wire.',move:[0,74,0],order:0,layer:[18,42,-16]},
 {id:'flex',name:'Ribbon & display',note:'Polyimide ribbon out to a small display.',move:[0,14,40],order:1,layer:[0,2,0]},
 {id:'header',name:'Header',note:'Forty gold pins on a 2.54 mm pitch.',move:[0,40,-14],order:2,layer:[6,20,-10]},
 {id:'ports',name:'Ports',note:'Stamped steel shells and a power jack.',move:[0,30,0],order:3,layer:[0,8,0]},
 {id:'chips',name:'Processor & memory',note:'Processor, memory, storage and controllers.',move:[0,50,0],order:4,layer:[24,26,-10]},
 {id:'parts',name:'Small components',note:'Passives, buttons, lamps and the cell.',move:[0,20,0],order:5,layer:[2,12,-9]},
 {id:'board',name:'Board',note:'White mask, pale copper, gold lands.',move:[0,0,0],order:6},
];

// ── Workload and heat ──────────────────────────────────────────────────────
export const LOAD={min:5,max:100,start:60};        // slider, percent
export const POWER={idle:1.1,span:5.4};            // W = idle + span × load × (1 − throttle cut)
export const AMBIENT=24;                            // °C
export const R_TH=9.5;                              // K/W, die to air through the folded fin
export const LIMIT={soft:72,hard:80,cut:.38};       // °C: the governor trims power between these
export const CLOCK=[.6,1,1.4,1.8];                  // GHz steps the governor picks from
export const TAU={load:.5,heat:5,on:.3,throttle:1.2}; // s: first-order lags (heat is sped up to be watchable)
export const BURST={period:3.4,depth:.25};          // the workload breathes around its set point
export const NET={idle:30,span:870};                // packets per second
export const LEDS=8;

export type State={t:number;on:number;load:number;temp:number;throttle:number;packets:number};
export const start:State={t:0,on:0,load:0,temp:AMBIENT,throttle:0,packets:0};

export const powerOf=(load:number,on:number,throttle=0)=>on*(POWER.idle+POWER.span*load*(1-LIMIT.cut*throttle));
// Where the die settles with no throttling: the hand-checkable number.
export const steadyTemp=(load:number)=>AMBIENT+powerOf(load,1)*R_TH;
export const clockOf=(load:number,throttle:number)=>CLOCK[Math.min(CLOCK.length-1,Math.floor(clamp(load*(1-.5*throttle))*CLOCK.length))];
export const packetRate=(load:number)=>NET.idle+NET.span*load;
// The set point with its slow breathing, 0..1.
export function demand(t:number,percent:number){
 const set=clamp(percent,LOAD.min,LOAD.max)/100;
 return clamp(set*(1-BURST.depth*(.5-.5*Math.cos(t/BURST.period*Math.PI*2))));
}
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const t=playing?s.t+h:s.t;
 const on=lag(s.on,playing?1:0,h,TAU.on);
 const load=lag(s.load,playing?demand(t,Number(values.load)):0,h,TAU.load);
 const throttle=lag(s.throttle,clamp((s.temp-LIMIT.soft)/(LIMIT.hard-LIMIT.soft)),h,TAU.throttle);
 const temp=lag(s.temp,AMBIENT+powerOf(load,on,throttle)*R_TH,h,TAU.heat);
 const packets=s.packets+h*on*packetRate(load);
 return {t,on,load,temp,throttle,packets};
}

export type Pose={on:number;load:number;temp:number;warm:number;clock:number;watts:number;throttle:number;rate:number;leds:number[];link:number;act:number;t:number};
// A repeatable flicker in 0..1 for slot `n` of a stream: storage writes come in bursts.
const hash=(n:number)=>frac(Math.sin(n*127.1)*43758.5453);
export function pose(s:State,_values?:Values):Pose{
 void _values;
 const warm=clamp((s.temp-AMBIENT)/(LIMIT.hard-AMBIENT)),live=s.on>.5?1:0;
 // The activity lamp on the jack blinks once per 120 packets, so it quickens with the load.
 const act=s.on*(frac(s.packets/120)<.5?1:0);
 // 1 power · 2 heartbeat (two beats, then rest) · 3–6 load as a bar · 7 storage · 8 network.
 const beat=frac(s.t/1.2),heart=beat<.09||(beat>.2&&beat<.29)?1:.04;
 const leds=Array.from({length:LEDS},(_,i)=>{
  if(i===0)return s.on;
  if(i===1)return s.on*heart;
  if(i<=5)return s.on*clamp((s.load-(i-2)*.25)/.25);
  if(i===6)return live*(hash(Math.floor(s.t*14))<.18+.5*s.load?1:0);
  return act;
 });
 return {on:s.on,load:s.load,temp:s.temp,warm,clock:s.on>.02?clockOf(s.load,s.throttle):0,watts:powerOf(s.load,s.on,s.throttle),throttle:s.throttle,rate:s.on*packetRate(s.load),leds,link:s.on,act,t:s.t};
}
