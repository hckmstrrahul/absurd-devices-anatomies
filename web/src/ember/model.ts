// Ember motion model. Seconds, 0..1 levels, degrees Celsius. No three.js in here.
// It is representational: one first-order thermal state (`heat`) follows the power setting, and every
// glow, pulse and readout on the page is a function of that state and two phases it drives.
import {clamp,frac} from '../kit/util';

export type AssemblyId='board'|'components'|'cpu'|'core'|'pipes'|'memory'|'chips'|'fittings'|'ports';
export const SIZE={x:174,y:18,z:259};
export const POWER={min:20,max:100,start:70};   // percent
export const IDLE=.45;                           // the core stays softly lit when stopped
export const TAU=1.8;                           // seconds for heat to follow power
export const AMBIENT=31,SPAN=64;                // °C at heat 0, and the rise to heat 1
export const FLOW_MAX=4.2;                      // L/min at full heat
export const FITTINGS=4,DOTS=6,LED_GROUPS=4;

// `move` is the explosion path in mm; `order` staggers the lift, top layers first.
// `layer` is where the assembly floats in the Layers view (mm from its assembled place). That view stands the board upright
// and looks from the front left, so y is toward the viewer and z is down the screen. On screen a sideways slide is
// foreshortened to 0.785 of itself, and a plane that comes forward by r is seen 0.62 r further right and 0.26 r lower
// (`SEEN`). Each assembly is a plane 14 to 16 mm in front of the last. Left alone the planes would run off to the right
// in order of depth, so the nearer ones are slid back left by different amounts: every plane then lands in its own place,
// still over the board, and each is lifted a little so none ends below the board's lower edge. Everything, the board
// included, is shifted 26 mm left so the fanned stack sits in the middle of the frame.
export const SEEN={slide:.785,forward:.62,drop:.26};
export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number;layer:[number,number,number]}[]=[
 {id:'pipes',name:'Heat pipes',note:'Polished steel, carries heat off both sockets.',move:[0,178,0],order:0,layer:[-62,116,-22]},
 {id:'fittings',name:'Fittings',note:'Brass and steel coolant couplings.',move:[0,156,0],order:1,layer:[-39,100,-26]},
 {id:'cpu',name:'Processor',note:'Black package under a brushed bracket.',move:[0,104,0],order:2,layer:[-49,84,-10]},
 {id:'core',name:'Core',note:'White-hot die in a weathered shroud.',move:[0,92,0],order:3,layer:[-51,70,-16]},
 {id:'ports',name:'Ports',note:'Housings, capacitors and edge connectors.',move:[0,78,0],order:4,layer:[-50,56,-18]},
 {id:'memory',name:'Memory',note:'Four upright slots, two across.',move:[0,64,0],order:5,layer:[-8,42,-16]},
 {id:'chips',name:'Controllers',note:'Laser-marked chips and a thermal pad.',move:[0,50,0],order:6,layer:[-27,28,-2]},
 {id:'components',name:'Components',note:'Resistors, capacitors, lamps and small chips.',move:[0,34,0],order:7,layer:[-27,14,-4]},
 {id:'board',name:'Board',note:'Matte black, pale gold pads.',move:[0,0,0],order:8,layer:[-26,0,0]},
];

export type State={t:number;heat:number;chase:number;flow:number;on:boolean};
export const start:State={t:0,heat:IDLE,chase:0,flow:0,on:false};
export const target=(playing:boolean,power:number)=>playing?clamp(power,POWER.min,POWER.max)/100:IDLE;

export function step(s:State,dt:number,playing:boolean,values:{power?:number|string}):State{
 const h=clamp(dt,0,.1),goal=target(playing,Number(values.power??POWER.start));
 const heat=s.heat+(goal-s.heat)*(1-Math.exp(-h/TAU));
 if(!playing)return {...s,heat,on:false};
 // The circuit chase and the pipe flow both run faster as the core heats.
 return {on:true,t:s.t+h,heat,chase:s.chase+h*(.12+.5*heat),flow:s.flow+h*(.1+.45*heat)};
}

// A cheap repeatable hash for lamp flicker.
const hash=(n:number)=>frac(Math.sin(n*127.1+311.7)*43758.5453);
export function pose(s:State){
 const running=s.on,breath=.5+.5*Math.sin(s.t*Math.PI*2*.42);
 // Core glow: the idle level is steady; in Play it breathes about the heat level.
 const core=clamp(s.heat*(running?.86+.14*breath:1));
 const beat=frac(s.chase*1.5);
 return {
  heat:s.heat,core,breath,
  chase:frac(s.chase),                       // 0..1 position of the bright run along every circuit line
  chaseOn:running?clamp(s.heat*1.2):0,
  flow:frac(s.flow),                         // 0..1 position of the warm band along the pipes
  pipes:running?s.heat:0,
  // The four lit fittings pulse one after another; the six dots run as a faster chain.
  fittings:Array.from({length:FITTINGS},(_,i)=>clamp(s.heat*(.55+(running?.45*Math.exp(-5*frac(beat-i/FITTINGS)):.12)))),
  dots:Array.from({length:DOTS},(_,i)=>clamp(s.heat*(.5+(running?.5*Math.exp(-6*frac(s.chase*2.5-i/DOTS)):.1)))),
  leds:Array.from({length:LED_GROUPS},(_,i)=>running?(hash(Math.floor(s.t*(5+i*2.3))+i*17)<.35+.5*s.heat?1:.12):.3),
  temperature:AMBIENT+SPAN*s.heat,
  load:running?s.heat:0,
  litres:running?FLOW_MAX*s.heat:0,
 };
}
export type Pose=ReturnType<typeof pose>;
