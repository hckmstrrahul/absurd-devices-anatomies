// Verdant motion model: a representational workload on a green motherboard.
// Seconds, watts, degrees Celsius, gigahertz. No three.js in here: every glow, travelling
// pulse and readout on the page is a function of the state this file advances.
import {clamp,frac} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='cooling'|'cpu'|'power'|'memory'|'logic'|'ports'|'board';
export const SIZE={x:160.5,y:16.6,z:258.9};

// `move` is the explosion path in mm: vertical layers, the tall cooling parts highest.
// `layer` is where the same assembly floats in the Layers view, where the board stands upright facing the viewer: [sideways, off the face, down the board].
// Each comes off the face further than the one below it (clearing its tallest part), slides mostly sideways and a little up or down the board,
// each by a different amount, so the planes overlap the board and each other. None slides past the board's lower edge. Nothing is added in that view.
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'cooling',name:'Cooling',note:'Steel blocks, hoses and a brass pipe.',move:[0,150,0],order:0,layer:[-14,84,10]},
 {id:'cpu',name:'Processor',note:'Lime cover over the die window.',move:[0,122,0],order:1,layer:[-6,72,2]},
 {id:'power',name:'Power',note:'Capacitors, inductors and regulators.',move:[0,96,0],order:2,layer:[-24,58,4]},
 {id:'memory',name:'Memory',note:'Two slot pairs and four below.',move:[0,72,0],order:3,layer:[10,44,-10]},
 {id:'logic',name:'Controllers',note:'Sockets, chips and their leads.',move:[0,48,0],order:4,layer:[-14,30,-8]},
 {id:'ports',name:'Ports',note:'Edge connectors, jacks and brackets.',move:[0,24,0],order:5,layer:[6,14,-3]},
 {id:'board',name:'Board',note:'Green laminate, traces and passives.',move:[0,0,0],order:6},
];

// ── Workload ──────────────────────────────────────────────────────────────
export const LOAD={min:10,max:100,start:60};       // slider, percent
export const CLOCK={idle:.8,span:3.4};             // GHz = idle + span × load
export const POWER={idle:12,span:110};             // W = idle + span × load
export const AMBIENT=28;                            // °C
export const R_TH=.32;                              // K/W, die to coolant loop
export const TAU={load:.6,heat:6,on:.35};          // s: first-order lags
export const BURST={period:3.2,depth:.22};         // the workload breathes around its set point
export const ROUTES=6;                              // pulse routes leaving the processor
export const LEDS=8;
export const FLOW={idle:.12,span:.5};              // coolant loops per second

export type State={t:number;on:number;load:number;temp:number;beat:number;flow:number};
export const start:State={t:0,on:0,load:0,temp:AMBIENT,beat:0,flow:0};

export const clockOf=(load:number)=>CLOCK.idle+CLOCK.span*load;
export const powerOf=(load:number,on:number)=>on*(POWER.idle+POWER.span*load);
export const steadyTemp=(load:number)=>AMBIENT+powerOf(load,1)*R_TH;
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
 const temp=lag(s.temp,AMBIENT+powerOf(load,on)*R_TH,h,TAU.heat);
 // Pulses leave the processor once per beat; the beat rate follows the clock.
 const beat=s.beat+h*on*clockOf(load)*.55;
 const flow=s.flow+h*on*(FLOW.idle+FLOW.span*load);
 return {t,on,load,temp,beat,flow};
}

export type Pose={on:number;load:number;temp:number;clock:number;watts:number;warm:number;flow:number;pulses:number[];leds:number[];die:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 const warm=clamp((s.temp-AMBIENT)/(steadyTemp(1)-AMBIENT));
 // Each route carries one pulse, staggered so they do not leave together. −1 means dark.
 const pulses=Array.from({length:ROUTES},(_,i)=>s.on>.05?frac(s.beat*(i%2?.8:1)+i/ROUTES):-1);
 // LED 0 is power; 1..ROUTES flash as a pulse lands; the last is a heartbeat.
 const leds=Array.from({length:LEDS},(_,i)=>{
  if(i===0)return s.on;
  if(i<=ROUTES){const p=pulses[i-1];return p<0?0:s.on*clamp((p-.82)/.18)}
  return s.on*(frac(s.t*1.5)<.18?1:.08);
 });
 return {on:s.on,load:s.load,temp:s.temp,clock:s.on*clockOf(s.load),watts:powerOf(s.load,s.on),warm,flow:frac(s.flow),pulses,leds,die:s.on*(.25+.75*s.load)};
}
