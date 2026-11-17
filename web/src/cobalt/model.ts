// Cobalt motion model: a sensor module that samples, packs frames and sends each one down its flex ribbon.
// Seconds, kilosamples per second, milliwatts, degrees Celsius. No three.js: the LED, the pulse on the flex
// and every readout are functions of the state this file advances.
import {clamp,frac} from '../kit/util';
import type {Assembly,Values} from '../kit/types';
import type {Asm} from './layout';

// `move` is the explosion path in mm. The plinth and the standoffs screwed into it stay put.
// `layer` is where each assembly hangs in the Layers view: a modest rise and a sideways slide, each in its own direction,
// so the module's own parts fan out as parallel planes over the bare board. That view stands the whole set on edge, so a
// rise comes toward the viewer and +z slides down the frame. Screws only rise: their shanks are in the board.
export const assemblies:(Assembly&{id:Asm})[]=[
 {id:'cover',name:'Cover plate',note:'Blue antenna plate, embossed circuit.',move:[0,44,0],order:0,layer:[-3,18,-12]},
 {id:'flex',name:'Flex ribbon',note:'Polyimide, fourteen conductors.',move:[0,34,0],order:1,layer:[3,13,9]},
 {id:'screws',name:'Screws',note:'Black slotted shoulder screws.',move:[0,28,0],order:2,layer:[0,11,0]},
 {id:'chips',name:'Chips',note:'Processor, amplifier, radio, power.',move:[0,21,0],order:3,layer:[-10,9,-5]},
 {id:'connectors',name:'Connectors',note:'Header, flex socket, mezzanine.',move:[0,15,0],order:4,layer:[12,6,7]},
 {id:'passives',name:'Passives',note:'Chip parts and indicators.',move:[0,9.5,0],order:5,layer:[-12,2,7]},
 {id:'board',name:'Board',note:'Four-layer blue laminate.',move:[0,5,0],order:6},
 {id:'standoffs',name:'Standoffs',note:'Hex posts under each corner.',move:[0,0,0],order:7},
 {id:'plinth',name:'Plinth',note:'Brushed steel with a brass block.',move:[0,0,0],order:7},
];

export const RATE={min:1,max:100,start:40};        // slider, kS/s
export const FRAME=16384;                           // samples in one frame
export const POWER={idle:180,perKs:9.2};            // mW = idle + perKs × rate
export const AMBIENT=25;                            // °C
export const R_TH=.038;                             // K/mW, die to air for the flat pack
export const TAU={rate:.5,heat:5,on:.3};            // s: first-order lags
export const BURST={travel:.55,flash:.2};           // fractions of a frame: the burst crossing the flex, then the LED flash

export type State={t:number;on:number;rate:number;temp:number;phase:number};
export const start:State={t:0,on:0,rate:0,temp:AMBIENT,phase:0};

export const framesPerSecond=(rate:number)=>rate*1000/FRAME;
export const powerOf=(rate:number,on:number)=>on*(POWER.idle+POWER.perKs*rate);
export const steadyTemp=(rate:number)=>AMBIENT+powerOf(rate,1)*R_TH;
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const on=lag(s.on,playing?1:0,h,TAU.on);
 const rate=lag(s.rate,playing?clamp(Number(values.rate),RATE.min,RATE.max):0,h,TAU.rate);
 const temp=lag(s.temp,AMBIENT+powerOf(rate,on)*R_TH,h,TAU.heat);
 return {t:playing?s.t+h:s.t,on,rate,temp,phase:s.phase+h*on*framesPerSecond(rate)};
}

// `glow` is how brightly the cover plate's circuit is lit (0 at rest, rising with the sample rate) and `flow` the frame
// phase its pulses keep step with. `scan` is where the burst is along the flex, 0 at the cover plate and 1 at the board connector; −1 between bursts.
export type Pose={on:number;rate:number;fps:number;watts:number;temp:number;warm:number;scan:number;led:number;frames:number;glow:number;flow:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 const f=frac(s.phase),live=s.on>.05;
 const scan=live&&f<BURST.travel?f/BURST.travel:-1;
 const flash=live&&f>=BURST.travel&&f<BURST.travel+BURST.flash?1:0;
 return {on:s.on,rate:s.rate,fps:s.on*framesPerSecond(s.rate),watts:powerOf(s.rate,s.on),temp:s.temp,warm:clamp((s.temp-AMBIENT)/(steadyTemp(RATE.max)-AMBIENT)),scan,led:s.on*(.05+.95*flash),frames:Math.floor(s.phase),glow:s.on*(.45+.55*clamp(s.rate/RATE.max)),flow:f};
}
