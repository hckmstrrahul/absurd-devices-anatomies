// GA-P35-S3G motion model: power-on and a processor load on a Core 2 class LGA775 chip under the Intel boxed cooler.
// Seconds, watts, °C, rpm, radians. No three.js: the fan's turn and every readout come from the pose made here.
import {clamp} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='cooler'|'socket'|'heatsinks'|'memory'|'slots'|'power'|'io'|'vrm'|'chips'|'board';
export const SIZE={x:305,z:200,y:62};
// The board stands on its lower edge in the Layers view; its centre sits this high (half the depth plus a margin).
export const UPRIGHT=128;

// Explosion follows the real order of taking the board apart: the cooler unclips first, then the processor and its
// socket, the chipset heat sinks, memory sockets, slots, the power/storage connectors, the rear I/O (which also draws
// back out of its shield, toward −z), the VRM parts and finally the small parts sheet above the bare board.
// `layer` (Layers view, board upright): x sideways, y toward the viewer, z down the face.
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'cooler',name:'Intel boxed cooler',note:'Radial aluminium fins, four push pins.',move:[0,150,0],order:0,layer:[-36,118,8]},
 {id:'socket',name:'LGA775 socket & CPU',note:'Load plate, lever and processor.',move:[0,92,0],order:1,layer:[-24,84,6]},
 {id:'heatsinks',name:'Chipset heat sinks',note:'Gold-anodised fins over P35 and ICH9.',move:[0,74,0],order:2,layer:[-14,68,4]},
 {id:'memory',name:'Memory sockets',note:'Four DDR2 sockets, two channels.',move:[0,58,0],order:3,layer:[-8,54,4]},
 {id:'slots',name:'Expansion slots',note:'PCIe x16, PCIe x1 and five PCI.',move:[0,48,0],order:4,layer:[-16,44,0]},
 {id:'power',name:'Power & storage',note:'ATX, IDE, floppy, SATA and headers.',move:[0,38,0],order:5,layer:[-8,34,0]},
 {id:'io',name:'Rear I/O',note:'Legacy ports, USB, LAN and audio.',move:[0,30,-34],order:6,layer:[0,26,-6]},
 {id:'vrm',name:'Capacitors & chokes',note:'Electrolytics, chokes and MOSFETs.',move:[0,22,0],order:7,layer:[6,17,0]},
 {id:'chips',name:'Small parts',note:'Super I/O, codec, LAN, BIOS, passives.',move:[0,12,0],order:8,layer:[3,8,0]},
 {id:'board',name:'Board',note:'Blue soldermask over four copper layers.',move:[0,0,0],order:9},
];

// ── Power and heat ───────────────────────────────────────────────────────
export const LOAD={min:0,max:100,start:55};          // slider, percent
export const AMBIENT=25;                              // °C
export const CPU_W={idle:22,span:73};                 // W: a 95 W TDP quad core
export const FAN={min:1050,max:2950,quiet:38,full:62}; // rpm, and the die temperatures between which the PWM ramps
// Cooler resistance falls with airflow: θ = a + b / rpm (K/W). At 2950 rpm θ = 0.27; at 1050 rpm θ = 0.43.
export const THETA={a:.18,b:263};
export const VRM={eff:.84,rth:3.4};                   // regulator efficiency; K/W from its losses to the air
export const NBW={idle:13,span:5,rth:2.1};            // northbridge watts and its sink's K/W
export const TAU={on:.35,load:.6,heat:4.5,fan:1.4};    // s, first-order lags (heat sped up to be watchable)
export const SPIN=.07;                                // shown turns per real turn, so seven blades do not strobe at 60 fps

export type State={t:number;on:number;load:number;cpu:number;vrm:number;nb:number;rpm:number;turn:number};
export const start:State={t:0,on:0,load:0,cpu:AMBIENT,vrm:AMBIENT,nb:AMBIENT,rpm:0,turn:0};

export const cpuPower=(load:number,on:number)=>on*(CPU_W.idle+CPU_W.span*load);
export const theta=(rpm:number)=>THETA.a+THETA.b/Math.max(rpm,300);
export const fanTarget=(cpu:number,on:number)=>on*(FAN.min+(FAN.max-FAN.min)*clamp((cpu-FAN.quiet)/(FAN.full-FAN.quiet)));
export const vrmLoss=(watts:number)=>watts*(1/VRM.eff-1);
// The hand check: at full load with the fan flat out the die settles at 25 + 95 × 0.269 = 50.6 °C.
export const steadyCpu=(load:number,rpm:number)=>AMBIENT+cpuPower(load,1)*theta(rpm);
const lag=(from:number,to:number,dt:number,tau:number)=>to+(from-to)*Math.exp(-dt/tau);

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 const h=clamp(dt,0,.1);if(h===0)return s;
 const t=playing?s.t+h:s.t;
 const on=lag(s.on,playing?1:0,h,TAU.on);
 const load=lag(s.load,playing?clamp(Number(values.load??LOAD.start)/100):0,h,TAU.load);
 const rpm=lag(s.rpm,fanTarget(s.cpu,on),h,TAU.fan);
 const watts=cpuPower(load,on);
 const cpu=lag(s.cpu,AMBIENT+watts*theta(rpm),h,TAU.heat);
 const vrm=lag(s.vrm,AMBIENT+vrmLoss(watts)*VRM.rth,h,TAU.heat*1.4);
 const nb=lag(s.nb,AMBIENT+on*(NBW.idle+NBW.span*load)*NBW.rth,h,TAU.heat*2);
 const turn=(s.turn+rpm/60*h*SPIN*Math.PI*2)%(Math.PI*2);
 return {t,on,load,cpu,vrm,nb,rpm,turn};
}

export type Pose={on:number;load:number;cpu:number;vrm:number;nb:number;rpm:number;watts:number;turn:number;warm:number};
export function pose(s:State,_values?:Values):Pose{
 void _values;
 return {on:s.on,load:s.load,cpu:s.cpu,vrm:s.vrm,nb:s.nb,rpm:s.rpm,watts:cpuPower(s.load,s.on),turn:s.turn,warm:clamp((s.cpu-AMBIENT)/(FAN.full+8-AMBIENT))};
}
