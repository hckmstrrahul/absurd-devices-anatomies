// Console motion model. Beats, seconds, radians. No three.js in here: every moving part, every lit
// segment, every figure on the three displays and every readout is a function of the state this file advances.
// The deck does nothing real; Play is a representational sequence clocked by the tempo.
import {clamp,frac} from '../kit/util';
import type {Assembly,Values} from '../kit/types';
import {KNOBS,CUPS,BUTTONS,CONICS,FLOW,SEGMENTS_D,PILLS_J,TICKS_H,REST_D,PX,MM} from './layout';

export type AssemblyId='panel'|'rail'|'displays'|'buttons'|'pipework'|'wiring'|'knobs';
export const SIZE={x:Math.round(PX.w*MM*10)/10,y:23,z:Math.round(PX.h*MM*10)/10};

// `move` is the explosion path in mm: a vertical stack, knobs highest; the rail also slides clear of the edge.
// `layer` is where the assembly floats in the Layers view, [x, rise, z] in the deck's own axes. That view stands the deck
// upright, so the rise comes off the face toward the viewer and z runs down the screen. Rises keep the stack's order, each gap
// taller than the parts on the plane beneath. Slides are mostly sideways, alternating left and right so the planes fan out
// and overlap. Every assembly has parts near the deck's lower edge and the camera looks slightly down, so a nearer plane
// would appear to sag below that edge: each slides up (negative z) by about a quarter of its rise to cancel that.
// The printed deck stays where it is. Nothing is added in that view; these are the console's own parts.
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'knobs',name:'Knobs',note:'Seven rotaries and six cup dials.',move:[0,176,0],order:0,layer:[-30,76,-18]},
 {id:'displays',name:'Displays',note:'Two orange LCDs, one touch panel.',move:[0,140,0],order:1,layer:[12,62,-11]},
 {id:'buttons',name:'Buttons and keys',note:'Lit caps, pill keys, small modules.',move:[0,112,0],order:2,layer:[-24,46,-10]},
 {id:'pipework',name:'Pipework',note:'Canister, valves, copper and steel lines.',move:[0,86,0],order:3,layer:[14,30,-7]},
 {id:'wiring',name:'Wiring',note:'Cable loom, probes and connectors.',move:[0,58,0],order:4,layer:[-18,14,-3]},
 {id:'rail',name:'Edge rail',note:'Clear rail with chrome studs.',move:[34,22,0],order:5,layer:[12,8,-2]},
 {id:'panel',name:'Panel',note:'Printed charcoal deck.',move:[0,0,0],order:6},
];

export const TEMPO={min:40,max:200,start:96};   // beats per minute
export const STEPS=16;                           // sequencer steps, four per beat
export const FLOW_BEATS=8;                       // beats for the flow value to rise and fall once
export const GAUGE_SWEEP=Math.PI*1.2;            // needle travel, rad

export type State={beats:number;seconds:number;on:boolean};
export const start:State={beats:0,seconds:0,on:false};

export const tempoOf=(values:Values)=>clamp(Number(values.tempo??TEMPO.start),TEMPO.min,TEMPO.max);
export function step(state:State,dt:number,playing:boolean,values:Values):State{
 if(!playing)return state.on?{...state,on:false}:state;
 return {beats:state.beats+dt*tempoOf(values)/60,seconds:state.seconds+dt,on:true};
}

export type Pose={
 on:boolean;bpm:number;beat:number;step:number;seconds:number;
 knobs:number[];cups:number[];valves:number[];       // rad
 segments:boolean[];pill:number;tick:number;          // ring lights: D's blocks, J's chase, H's bar
 button:number;levels:number[];                       // lit cap index and each cap's level 0..1
 flow:number;line:number;lines:number[];gauge:number; // value 0..1, active copper line, per-line glow, needle rad
 count:number;level:number;scroll:number;
};
// Cosine swell: 0 at the start of each cycle, 1 half way.
export const swell=(beats:number)=>.5-.5*Math.cos(beats/FLOW_BEATS*Math.PI*2);

export function pose(state:State,values:Values):Pose{
 const {beats,on}=state,beat=Math.floor(beats),stepIndex=Math.floor(beats*4)%STEPS;
 const flow=on?swell(beats):.35,line=Math.floor(beats)%FLOW.length,button=Math.floor(beats*2)%BUTTONS.length;
 // D fills one block per step, then clears; at rest it shows the pattern in the reference.
 const lit=Math.floor(beats*4)%(SEGMENTS_D+1);
 return {
  on,bpm:tempoOf(values),beat,step:stepIndex,seconds:state.seconds,
  knobs:KNOBS.map(k=>beats*k.rate*Math.PI*2),
  cups:CUPS.map(c=>beats*c.rate*Math.PI*2),
  valves:CONICS.map((_,i)=>beats*Math.PI*2*(i%2?-1:1)/(6+i*2)),
  segments:Array.from({length:SEGMENTS_D},(_,i)=>on?i<lit:REST_D[i]===1),
  pill:on?Math.floor(beats*4)%PILLS_J:-1,
  tick:on?Math.floor(beats*2)%TICKS_H:-1,
  button:on?button:-1,
  // The lit cap flares on its half-beat and decays; the rest hold a steady glow.
  levels:BUTTONS.map((_,i)=>on&&i===button?1-frac(beats*2)*.6:0),
  flow,line:on?line:-1,
  lines:FLOW.map((_,i)=>on&&i===line?1-frac(beats)*.7:0),
  gauge:(flow-.5)*GAUGE_SWEEP,
  count:950+beat,level:on?300+Math.round(flow*60):330,scroll:Math.floor(beats/2),
 };
}
