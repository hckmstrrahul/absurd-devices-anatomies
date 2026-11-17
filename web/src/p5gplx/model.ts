// P5GPL-X SE motion model: power-on and a processor load, in seconds, watts, volts and degrees Celsius.
// The board has one emitter, the green standby lamp (SB_PWR), and no fan of its own. Pressing Play plugs the supply in:
// standby comes up first and lights the lamp, then the supply turns on and the slider loads the processor.
// Every readout and the lamp come from the pose this file computes. No three.js in here.
import {clamp} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='heatsink'|'socket'|'memory'|'slots'|'power'|'io'|'power-parts'|'chips'|'parts'|'board';
export const SIZE={x:183,y:34,z:305};

// Every lift also drifts away from the rear panel (+x), so the stack opens on screen from the 3D view, which looks along +x.
// Explosion order follows a teardown: cooler, socket lid and frame, sockets and slots, connectors, rear panel,
// capacitors and chokes, packages, small parts, bare board. `layer` is the plane in the Layers view (board upright, facing +z):
// x sideways, y toward the viewer, z down the face.
export const UPRIGHT=172;
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'heatsink',name:'Heat sink',note:'Bare aluminium fins on the north bridge.',move:[70,130,0],order:0,layer:[46,92,-30]},
 {id:'socket',name:'CPU socket',note:'LGA775 load plate, frame and lever.',move:[46,104,0],order:1,layer:[-40,80,-40]},
 {id:'memory',name:'Memory sockets',note:'Two DDR2 sockets with sprung latches.',move:[60,84,0],order:2,layer:[44,66,4]},
 {id:'slots',name:'Expansion slots',note:'PCIe x16, three PCI, one PCIe x1.',move:[36,70,0],order:3,layer:[-20,58,30]},
 {id:'power',name:'Power & storage',note:'ATX power, IDE, floppy, SATA, headers.',move:[46,58,0],order:4,layer:[30,46,18]},
 {id:'io',name:'Rear I/O',note:'PS/2, parallel, serial, USB, LAN, audio.',move:[-60,30,0],order:5,layer:[-60,38,0]},
 {id:'power-parts',name:'Capacitors & chokes',note:'Electrolytics and copper-wound toroids.',move:[24,44,0],order:6,layer:[-18,28,-12]},
 {id:'chips',name:'Chips',note:'South bridge, Super I/O, LAN, BIOS, MOSFETs.',move:[14,30,0],order:7,layer:[16,18,8]},
 {id:'parts',name:'Small components',note:'Passives, crystals, jumpers, lamp, cell.',move:[6,18,0],order:8,layer:[-6,9,4]},
 {id:'board',name:'Board',note:'Amber mask over copper pours.',move:[0,0,0],order:9},
];

// ── Power and heat ────────────────────────────────────────────────────────
export const LOAD={min:0,max:100,start:55};          // slider, percent
export const CPU={idle:22,span:62};                   // W drawn by the processor: idle + span × load
export const VRM_EFF={light:.78,full:.86};            // regulator efficiency rises with load
export const NB_POWER={idle:9,span:6};                // W in the north bridge (memory traffic follows load)
export const AMBIENT=25;                              // °C
export const R={vrm:4.2,nb:2.6};                      // K/W: VRM to air (bare board), north bridge through its heat sink
export const VCORE={idle:1.325,droop:.045};           // V at idle and the load-line droop at full load
export const TAU={standby:.35,on:.6,load:.8,vrm:6,nb:9}; // s
export const STANDBY_DELAY=.4,ON_DELAY=1.2;           // s after Play: standby rail, then PS_ON

export type State={t:number;standby:number;on:number;load:number;vrm:number;nb:number};
export const start:State={t:0,standby:0,on:0,load:0,vrm:AMBIENT,nb:AMBIENT};

export const cpuWatts=(load:number,on:number)=>on*(CPU.idle+CPU.span*clamp(load));
export const efficiency=(load:number)=>VRM_EFF.light+(VRM_EFF.full-VRM_EFF.light)*clamp(load);
// Heat lost in the regulator: input minus output.
export const vrmLoss=(load:number,on:number)=>cpuWatts(load,on)*(1/efficiency(load)-1);
export const nbWatts=(load:number,on:number)=>on*(NB_POWER.idle+NB_POWER.span*clamp(load));
// Where each part settles: the hand-checkable numbers.
export const steadyVrm=(load:number)=>AMBIENT+vrmLoss(load,1)*R.vrm;
export const steadyNb=(load:number)=>AMBIENT+nbWatts(load,1)*R.nb;
export const vcore=(load:number,on:number)=>on>.02?VCORE.idle-VCORE.droop*clamp(load):0;
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const t=playing?s.t+h:0;
 const standby=lag(s.standby,playing&&t>STANDBY_DELAY?1:0,h,TAU.standby);
 const on=lag(s.on,playing&&t>ON_DELAY?1:0,h,TAU.on);
 const load=lag(s.load,playing?clamp(Number(values.load)/100):0,h,TAU.load);
 const vrm=lag(s.vrm,AMBIENT+vrmLoss(load,on)*R.vrm,h,TAU.vrm);
 const nb=lag(s.nb,AMBIENT+nbWatts(load,on)*R.nb,h,TAU.nb);
 return {t,standby,on,load,vrm,nb};
}

export type Pose={standby:number;on:number;load:number;vrm:number;nb:number;watts:number;vcore:number;lamp:number;warm:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 return {standby:s.standby,on:s.on,load:s.load*s.on,vrm:s.vrm,nb:s.nb,watts:cpuWatts(s.load,s.on),vcore:vcore(s.load,s.on),lamp:s.standby,warm:clamp((s.vrm-AMBIENT)/45)};
}
