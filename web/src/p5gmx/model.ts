// P5G-MX motion model: the board powering up and carrying a processor load.
// Seconds, volts, watts, degrees Celsius. No three.js here: the standby lamp, the heat tint on the chokes and every readout
// are functions of the state this file advances.
//
// Power-on sequence: the supply's 5 V standby rail comes up first and lights the green SB_PWR lamp; 0.6 s later PS_ON is asserted,
// the main rails ramp, and the two-phase regulator (two toroids, D-PAK MOSFETs) brings Vcore up to its VID. The load slider sets the
// processor's draw; the regulator's loss warms its MOSFETs and chokes, the bare northbridge warms with memory traffic.
import {clamp} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='heatsink'|'socket'|'memory'|'slots'|'io'|'connectors'|'power'|'chips'|'parts'|'board';
export const SIZE={x:247,y:34,z:186};

// The Layers view stands the board upright facing the viewer: x sideways, y toward the viewer, z down the face.
export const UPRIGHT=118;
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'heatsink',name:'Southbridge heat sink',note:'Ribbed aluminium, two push pins.',move:[0,62,0],order:0,layer:[-16,58,10]},
 {id:'socket',name:'CPU socket',note:'LGA775 field, steel plate and lever.',move:[0,74,0],order:1,layer:[22,52,-8]},
 {id:'memory',name:'Memory sockets',note:'Two DDR2 sockets, latches open.',move:[0,46,14],order:2,layer:[12,38,14]},
 {id:'slots',name:'Expansion slots',note:'PCIe ×16, PCIe ×1 and PCI.',move:[-6,44,0],order:2,layer:[-18,40,-4]},
 {id:'io',name:'Rear I/O',note:'Audio, LAN and USB, VGA, serial, PS/2.',move:[0,30,-40],order:3,layer:[8,30,-10]},
 {id:'connectors',name:'Power & storage',note:'ATX, IDE, SATA, fan and pin headers.',move:[0,36,10],order:3,layer:[-6,26,12]},
 {id:'power',name:'Capacitors & chokes',note:'Polymer and wet caps, toroids, MOSFETs.',move:[0,28,0],order:4,layer:[20,20,4]},
 {id:'chips',name:'Chipset & controllers',note:'Bare-die northbridge, Super I/O, codec.',move:[0,18,0],order:5,layer:[-10,13,-4]},
 {id:'parts',name:'Small components',note:'Passives, lamp and small transistors.',move:[0,10,0],order:6,layer:[4,6,0]},
 {id:'board',name:'Board',note:'Ochre mask over copper, six layers.',move:[0,0,0],order:7},
];

// ── Power and heat ────────────────────────────────────────────────────────
export const LOAD={min:0,max:100,start:55};         // slider, percent
export const AMBIENT=24;                             // °C
export const VID=1.325;                              // V, the processor's requested core voltage
export const PS_ON_DELAY=.6;                         // s after standby before the supply is switched on
export const CPU={idle:18,span:67};                  // W at the socket = idle + span × load
export const VRM={eff:.84,rth:4.2};                  // regulator efficiency, K/W from its loss to the board around the MOSFETs
export const NBP={idle:5.4,span:3.6,rth:6.2};        // northbridge W and K/W (bare die in still air)
export const DROOP=.075;                             // V of load line droop at full load
export const TAU={standby:.12,rails:.22,vcore:.18,load:.6,heat:6};
export const BURST={period:4.2,depth:.22};

export type State={t:number;sb:number;rails:number;vcore:number;load:number;vrm:number;nb:number};
export const start:State={t:0,sb:0,rails:0,vcore:0,load:0,vrm:AMBIENT,nb:AMBIENT};

export const cpuWatts=(load:number,rails:number)=>rails*(CPU.idle+CPU.span*load);
export const vrmLoss=(watts:number)=>watts*(1/VRM.eff-1);
// Where the regulator and northbridge settle for a load: the hand-checkable numbers.
export const steadyVrm=(load:number)=>AMBIENT+vrmLoss(cpuWatts(load,1))*VRM.rth;
export const steadyNb=(load:number)=>AMBIENT+(NBP.idle+NBP.span*load)*NBP.rth;
export function demand(t:number,percent:number){
 const set=clamp(percent,LOAD.min,LOAD.max)/100;
 return clamp(set*(1-BURST.depth*(.5-.5*Math.cos(t/BURST.period*Math.PI*2))));
}
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const t=playing?s.t+h:0;
 const sb=lag(s.sb,playing?1:0,h,TAU.standby);
 const rails=lag(s.rails,playing&&t>PS_ON_DELAY?1:0,h,TAU.rails);
 const load=lag(s.load,rails>.9?demand(t,Number(values.load)):0,h,TAU.load);
 const target=rails>.85?VID-DROOP*load:0;
 const vcore=lag(s.vcore,target,h,TAU.vcore);
 const vrm=lag(s.vrm,AMBIENT+vrmLoss(cpuWatts(load,rails))*VRM.rth,h,TAU.heat);
 const nb=lag(s.nb,AMBIENT+rails*(NBP.idle+NBP.span*load)*NBP.rth,h,TAU.heat);
 return {t,sb,rails,vcore,load,vrm,nb};
}

export type Pose={standby:number;rails:number;vcore:number;load:number;watts:number;vrm:number;nb:number;warmVrm:number;warmNb:number;t:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 return {standby:s.sb,rails:s.rails,vcore:s.vcore,load:s.load,watts:cpuWatts(s.load,s.rails),vrm:s.vrm,nb:s.nb,
  warmVrm:clamp((s.vrm-AMBIENT)/(steadyVrm(1)-AMBIENT)),warmNb:clamp((s.nb-AMBIENT)/(steadyNb(1)-AMBIENT)),t:s.t};
}
