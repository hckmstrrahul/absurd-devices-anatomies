// Orbit Deck motion model. Millimetres, seconds, revolutions. No three.js in here:
// every pose and readout on the page is a function of platter revolutions.
import {clamp,frac,spread as stagger} from '../kit/util';

export type AssemblyId='case'|'platter'|'coil'|'rotor'|'controls'|'memory'|'board';
export type SpeedId='33'|'45';

export const SIZE={x:260,y:46,z:242};
export const SPEEDS:{id:SpeedId;rpm:number;label:string}[]=[{id:'33',rpm:100/3,label:'33⅓'},{id:'45',rpm:45,label:'45'}];
export const PULLEY={platter:84,rotor:14};
export const BELT_RATIO=PULLEY.platter/PULLEY.rotor;
export const BEATS_PER_REV=4;
export const STEPS_PER_REV=16;
export const SPIN_TAU=.6;
export const PITCH_LIMIT=8;

// `move` is the explosion path in mm; `order` staggers the lift, top layers first.
export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number}[]=[
 {id:'case',name:'Case',note:'Clear acrylic shell, clipped shut.',move:[0,0,0],order:0},
 {id:'platter',name:'Platter',note:'Belt-driven disc, read by light.',move:[0,95,0],order:1},
 {id:'controls',name:'Controls',note:'Pitch, level and five tone knobs.',move:[0,80,0],order:2},
 {id:'coil',name:'Induction coil',note:'Senses the signal as it plays.',move:[0,70,0],order:3},
 {id:'rotor',name:'Rotor',note:'Flywheel, six turns per platter turn.',move:[0,55,0],order:4},
 {id:'memory',name:'Memory',note:'Stores loops on a cartridge.',move:[0,45,30],order:5},
 {id:'board',name:'Logic board',note:'Sequences sixteen steps per turn.',move:[0,22,0],order:6},
];

export type Spin={revs:number;rpm:number};
export function targetRpm(playing:boolean,speed:SpeedId,pitch:number){
 if(!playing)return 0;
 const base=SPEEDS.find(s=>s.id===speed)?.rpm??SPEEDS[0].rpm;
 return base*(1+clamp(pitch,-PITCH_LIMIT,PITCH_LIMIT)/100);
}
// The platter has inertia: it approaches its target speed with time constant SPIN_TAU.
export function advance(spin:Spin,dt:number,target:number):Spin{
 const step=clamp(dt,0,.1);
 const rpm=Math.max(0,spin.rpm+(target-spin.rpm)*(1-Math.exp(-step/SPIN_TAU)));
 return {revs:spin.revs+rpm/60*step,rpm};
}
export function poseAt(revs:number,rpm:number){
 const beat=frac(revs*BEATS_PER_REV);
 return {
  revs,rpm,
  platter:revs*Math.PI*2,
  rotor:revs*Math.PI*2*BELT_RATIO,
  rotorRpm:rpm*BELT_RATIO,
  bpm:rpm*BEATS_PER_REV,
  beat,
  step:Math.floor(frac(revs)*STEPS_PER_REV)%STEPS_PER_REV,
  level:clamp(rpm/30)*(.25+.75*Math.exp(-4*beat)),
  // Five tone knobs sweep slowly, each at its own whole-number rate so the loop closes.
  knobs:[1,2,3,5,8].map((rate,i)=>Math.sin(revs*Math.PI*2*rate/16+i*1.3)*2.1),
 };
}
export type Pose=ReturnType<typeof poseAt>;

const LAST=Math.max(...assemblies.map(a=>a.order));
export const spread=(separation:number,order:number)=>stagger(separation,order,LAST);
