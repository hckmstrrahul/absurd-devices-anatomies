// Chorus motion model. Seconds, radians, millimetres. No three.js in here.
// One input drives everything: master time in seconds, advanced at a selectable rate.
// Satellite dials are the master time plus a fixed offset; hanging orbs swing as pendulums in real time.
import {clamp,frac,smooth} from '../kit/util';
import {DIALS,HANGING,rodLength} from './layout';

export type AssemblyId='enclosure'|'master'|'left'|'right'|'linkage'|'pedestal'|'plinth';
export const SIZE={x:390,y:304,z:176};
export const RATES=[{id:'1',label:'1×',rate:1},{id:'60',label:'60×',rate:60},{id:'600',label:'600×',rate:600}];
export const START=8*3600+10*60+16;   // 08:10:16, the time shown in the reference
export const ALARM=5*3600+28*60;      // alarm hand, fixed
export const CHIME_MIN=5;             // a dial glows for this many of its own minutes after each hour
export const SWING=3*Math.PI/180;     // pendulum amplitude
export const SWING_TAU=1.2;           // seconds for the swing to build or die away
export const G=9.80665;
export const period=(mm:number)=>2*Math.PI*Math.sqrt(mm/1000/G);
export const PERIODS=Object.fromEntries(HANGING.map(o=>[o.id,period(rodLength(o))])) as Record<string,number>;

export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number}[]=[
 {id:'enclosure',name:'Enclosure',note:'Glass arch on a chrome tube frame.',move:[0,300,0],order:0},
 {id:'master',name:'Master clock',note:'Sets the time every dial follows.',move:[0,20,0],order:1},
 {id:'left',name:'Left orbs',note:'Tokyo, Delhi and the power cell.',move:[-130,0,0],order:2},
 {id:'right',name:'Right orbs',note:'Kathmandu, St John’s, New York, Chatham.',move:[130,0,0],order:3},
 {id:'linkage',name:'Linkage',note:'Sync shafts, posts, hooks, wiring.',move:[0,0,-170],order:4},
 {id:'pedestal',name:'Pedestal and display',note:'Carries the clock; shows master time.',move:[0,0,0],order:5},
 {id:'plinth',name:'Plinth',note:'Chrome base on four feet.',move:[0,-50,0],order:6},
];

// `beat` is real seconds played: the escapements tick at their true rate whatever the clock rate.
export type State={t:number;wall:number;swing:number;beat:number};
export const start:State={t:START,wall:0,swing:0,beat:0};
export const MASTER_BEATS=5;          // beats per second: 18,000 an hour
export const ORB_BEATS=6;             // 21,600 an hour
export const BALANCE_SWING=Math.PI*.9;
export const FORK_SWING=6*Math.PI/180;
const DROP=.3;                        // share of a beat the escape wheel spends moving
// State of a lever escapement at `e` seconds. `lead` is the escape wheel's offset from its mean
// position, in teeth: it jumps half a tooth each beat, then waits locked. `fork` is −1..1, `balance` in radians.
export function escapement(e:number,beats:number){
 const b=e*beats,n=Math.floor(b),k=smooth(clamp((b-n)/DROP));
 return {lead:(n+k-b)/2,fork:(n%2?-1:1)*(1-2*k),balance:BALANCE_SWING*Math.sin(Math.PI*b)};
}
export const rateOf=(id:unknown)=>RATES.find(r=>r.id===String(id))??RATES[1];

export function step(state:State,dt:number,playing:boolean,rate:number):State{
 const d=clamp(dt,0,.1);
 const swing=state.swing+((playing?1:0)-state.swing)*(1-Math.exp(-d/SWING_TAU));
 return {t:state.t+(playing?d*rate:0),beat:state.beat+(playing?d:0),wall:state.wall+(playing||swing>.002?d:0),swing:swing<.002&&!playing?0:swing};
}
const mod=(x:number,n:number)=>x-Math.floor(x/n)*n;
const two=(n:number)=>String(Math.floor(n)).padStart(2,'0');
export const clock=(seconds:number)=>{const s=mod(seconds,86400);return `${two(s/3600)}:${two(s%3600/60)}:${two(s%60)}`};
const TURN=Math.PI*2;
// Hand angles are clockwise from twelve.
export const hands=(seconds:number)=>({hour:TURN*frac(seconds/43200),minute:TURN*frac(seconds/3600),second:TURN*frac(seconds/60)});
// 1 at the stroke of the hour, fading to 0 over CHIME_MIN minutes.
export const chime=(seconds:number)=>{const past=mod(seconds,3600)/60;return past<CHIME_MIN?1-past/CHIME_MIN:0};

export function poseAt(state:State,rate:number){
 const {t}=state;
 const dials=DIALS.map(o=>{const local=t+o.offset!*3600;return {id:o.id,city:o.city,local,offset:o.offset!*3600,...hands(local),glow:chime(local),until:3600-mod(local,3600)}});
 const glow=chime(t);
 return {
  t,rate,text:clock(t),
  // Escapement time: equal to master time at 1×, and still real-time at faster rates.
  e:START+state.beat,escape:escapement(START+state.beat,MASTER_BEATS),orbEscape:escapement(START+state.beat,ORB_BEATS),
  master:hands(t),day:TURN*frac(t/86400),alarm:TURN*frac(ALARM/43200),glow,
  dials,
  chiming:[...(glow>0?['Master']:[]),...dials.filter(d=>d.glow>0).map(d=>d.city)],
  // Master seconds until the next dial strikes its hour.
  next:Math.min(3600-mod(t,3600),...dials.map(d=>d.until)),
  sway:Object.fromEntries(HANGING.map(o=>[o.id,SWING*state.swing*Math.sin(TURN*state.wall/PERIODS[o.id])])) as Record<string,number>,
 };
}
export type Pose=ReturnType<typeof poseAt>;
