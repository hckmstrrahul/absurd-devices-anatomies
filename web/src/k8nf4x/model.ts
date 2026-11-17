// K8NF4X motion model: a power-on and load sequence for a Socket 939 board, in seconds, volts, watts and degrees Celsius.
// No three.js. The socket lever, every readout and the Play state all come from the pose this file computes.
//
// The board only powers up with the socket lever down (a processor that is not clamped cannot be run). Load drives the
// processor's draw; the VRM loses (1 − η) of it as heat in its MOSFETs and chokes, and the chipset — photographed without the heat
// sink its two mounting holes are for — warms with I/O traffic. Heat is sped up so it can be watched.
import {clamp} from '../kit/util';
import type {Assembly,Values} from '../kit/types';
import {BOARD} from './layout';

export type AssemblyId='socket'|'chipset'|'memory'|'slots'|'connectors'|'io'|'power'|'parts'|'board';
export const SIZE={x:BOARD.w,z:BOARD.d,y:35};
// Stood upright for the Layers view, the board's centre is held this high: half its 293 mm depth plus a margin.
export const UPRIGHT=162;

// `move` is the explosion path in mm, in assembly order: frame and lever off first, then the chipset, sockets, slots, connectors,
// the rear I/O (drawn back out of the shield), the power stage, small components, and the bare board stays.
// `layer` is the Layers view, where the board stands upright facing the viewer: x sideways, y toward the viewer, z down the face.
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'socket',name:'Socket & frame',note:'Socket 939 ZIF, lever, retention frame.',move:[0,70,0],order:0,layer:[16,62,-10]},
 {id:'chipset',name:'Chipset',note:'nForce4 4X: bare die, green BGA.',move:[0,58,0],order:1,layer:[26,52,6]},
 {id:'memory',name:'Memory sockets',note:'Four DDR sockets, latches open.',move:[0,50,0],order:2,layer:[-14,46,-14]},
 {id:'slots',name:'Expansion slots',note:'PCIe x16, three PCIe, two PCI.',move:[0,42,0],order:3,layer:[-10,38,10]},
 {id:'connectors',name:'Power & storage',note:'ATX power, IDE, floppy, SATA, headers.',move:[0,34,0],order:4,layer:[14,30,4]},
 {id:'io',name:'Rear I/O',note:'Legacy ports, USB, LAN and audio.',move:[-46,20,0],order:5,layer:[-24,22,0]},
 {id:'power',name:'Power stage',note:'Toroid chokes, capacitors and MOSFETs.',move:[0,28,0],order:6,layer:[-6,15,0]},
 {id:'parts',name:'Small components',note:'Chips, passives, crystals, battery, BIOS.',move:[0,16,0],order:7,layer:[4,7,0]},
 {id:'board',name:'Board',note:'Blue four-layer ATX, 293 × 198 mm.',move:[0,0,0],order:8},
];

export const LOAD={min:0,max:100,start:55};      // slider, percent
export const CPU={idle:12,span:77,vid:1.4,droop:.0038}; // W = idle + span × load (an 89 W Athlon 64); V = VID − droop × A
export const VRM={eff:.84,rth:2.3};               // efficiency, K/W from MOSFET loss to the air
export const NB={idle:4.2,span:3.4,rth:8.4};       // chipset W and K/W, bare
export const AMBIENT=25;                           // °C
export const TAU={on:.4,load:.6,vrm:6,nb:9,lever:.35}; // s
export const LEVER={open:90,closed:0};             // degrees

export type State={t:number;on:number;load:number;vrm:number;nb:number;lever:number};
export const start:State={t:0,on:0,load:0,vrm:AMBIENT,nb:AMBIENT,lever:0};

export const cpuWatts=(load:number,on:number)=>on*(CPU.idle+CPU.span*clamp(load));
export const vrmLoss=(watts:number)=>watts*(1-VRM.eff)/VRM.eff;
export const nbWatts=(load:number,on:number)=>on*(NB.idle+NB.span*clamp(load));
// Where the temperatures settle at a steady load: the hand-checkable numbers.
export const steadyVrm=(load:number)=>AMBIENT+vrmLoss(cpuWatts(load,1))*VRM.rth;
export const steadyNb=(load:number)=>AMBIENT+nbWatts(load,1)*NB.rth;
export const vcore=(watts:number,on:number)=>on<.02?0:CPU.vid-CPU.droop*watts/CPU.vid;
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const wantOpen=values.lever==='open'?1:0;
 const lever=lag(s.lever,wantOpen,h,TAU.lever);
 // Power comes up only while playing with the lever fully down.
 const locked=lever<.02&&!wantOpen;
 const t=playing?s.t+h:s.t;
 const on=lag(s.on,playing&&locked?1:0,h,TAU.on);
 const set=clamp(Number(values.load)/100);
 const load=lag(s.load,on>.5?set:0,h,TAU.load);
 const vrm=lag(s.vrm,AMBIENT+vrmLoss(cpuWatts(load,on))*VRM.rth,h,TAU.vrm);
 const nb=lag(s.nb,AMBIENT+nbWatts(load,on)*NB.rth,h,TAU.nb);
 return {t,on,load,vrm,nb,lever};
}

export type Pose={on:number;load:number;watts:number;vcore:number;vrm:number;nb:number;lever:number;leverDeg:number;locked:boolean;t:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 const watts=cpuWatts(s.load,s.on),e=s.lever*s.lever*(3-2*s.lever);
 return {on:s.on,load:s.load,watts,vcore:vcore(watts,s.on),vrm:s.vrm,nb:s.nb,lever:s.lever,leverDeg:LEVER.closed+(LEVER.open-LEVER.closed)*e,locked:s.lever<.02,t:s.t};
}
