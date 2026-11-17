// Belljar motion model. Seconds and radians. No three.js in here.
// One input drives the clock: elapsed clock time `t`. The centre arbor turns once an hour of it, and every
// other wheel follows from that angle through the tooth counts (gearing.ts phases each mesh).
// The balance, pallet fork and escape wheel are shown at their true beat in real seconds (`run`), so they stay
// readable in time-lapse; at 1× the two clocks agree and the whole train is exact.
// The alarm is a second spring train: when `t` passes the alarm time it runs for RING_S seconds of real time.
import {clamp,frac,smooth,spread as stagger} from '../kit/util';
import {TEETH as T,HAMMER,DEG} from './layout';

export type AssemblyId='cloche'|'bells'|'case'|'hands'|'dial'|'movement'|'base';
export const SIZE={x:168,y:203,z:96};
export const RATES=[{id:'1',label:'1×',rate:1},{id:'60',label:'60×',rate:60},{id:'360',label:'360×',rate:360}];
export const HALF_DAY=43200;
export const START=10*3600+9*60;            // 10:09:00, the time shown in the reference
export const ALARM_DEFAULT=10*60+12;        // minutes on the twelve-hour dial
export const WIND_DEFAULT=14;               // turns of the crown
export const WIND_MAX=28;
// Ratios from the tooth counts, as turns per turn of the centre arbor (one an hour) unless noted.
export const RATIO={
 third:T.centre/T.thirdPinion,
 fourth:T.centre/T.thirdPinion*T.third/T.fourthPinion,
 escape:T.centre/T.thirdPinion*T.third/T.fourthPinion*T.fourth/T.escapePinion,
 barrel:T.centrePinion/T.barrel,
 minuteWheel:T.cannon/T.minuteWheel,
 hour:T.cannon/T.minuteWheel*T.minutePinion/T.hourWheel,
 setArbor:T.cannon/T.setPinion,                       // idlers do not change a ratio
 ratchetPerCrown:T.windPinion/T.ratchet,              // barrel-arbor turns per crown turn
 alarmBarrel:T.strikePinion/T.alarmBarrel,            // per turn of the strike wheel
 alarmKnob:T.alarmWheel/T.alarmPinion,                // knob turns per turn of the alarm wheel
};
// Each escape tooth gives two beats.
export const BEATS_PER_HOUR=RATIO.escape*2*T.escape;
export const BEATS_PER_S=BEATS_PER_HOUR/3600;
export const BEAT_HZ=BEATS_PER_S/2;
export const RING_S=6;
export const STRIKE_HZ=8;                   // hammer cycles a second; each cycle hits both bells
export const BALANCE_AMP=240*DEG;
export const FORK_AMP=11*DEG;
export const BELL_SHAKE=1.6*DEG;
export const STOP_AMP=12*DEG;
const SHAKE_HZ=22,SHAKE_DECAY=30,STOP_S=.12;

// `move` is the explosion path in mm. The cloche and bells go first; the clock opens along its axis once they are clear.
export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number}[]=[
 {id:'cloche',name:'Cloche',note:'Thick glass arch with sealed ports.',move:[0,140,0],order:0},
 {id:'bells',name:'Bells',note:'Twin domes, handle and crown.',move:[0,178,0],order:0},
 {id:'case',name:'Case',note:'Chrome drum, bezel, crystal, legs.',move:[0,0,0],order:7},
 {id:'hands',name:'Hands',note:'Sword hands and a seconds pointer.',move:[0,0,120],order:7},
 {id:'dial',name:'Dial',note:'Skeleton chapter ring, open centre.',move:[0,0,94],order:7},
 {id:'movement',name:'Movement',note:'Four-hertz train, keyless works, alarm.',move:[0,0,0],order:8},
 {id:'base',name:'Base',note:'Polished plinth on four feet.',move:[0,0,0],order:8},
];

// `ring` is the alarm run left, `run` the real seconds the movement has been going.
export type State={t:number;ring:number;run:number};
export const start:State={t:START,ring:0,run:0};
export const rateOf=(id:unknown)=>RATES.find(r=>r.id===String(id))?.rate??1;
export const alarmOf=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?clamp(Math.round(n),0,719):ALARM_DEFAULT};
export const windOf=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)?clamp(n,0,WIND_MAX):WIND_DEFAULT};

export function step(state:State,dt:number,playing:boolean,rate:number,alarm:number):State{
 const d=clamp(dt,0,.1);
 if(!playing||d===0)return state;
 const t=state.t+d*rate,at=alarm*60;
 // The alarm trips when the hour wheel's pin meets the notch in the alarm cam, once every twelve hours.
 const tripped=Math.floor((t-at)/HALF_DAY)>Math.floor((state.t-at)/HALF_DAY);
 return {t,ring:tripped?RING_S:Math.max(0,state.ring-d),run:state.run+d};
}

const TURN=Math.PI*2;
// The escapement lets the train go one beat at a time: time, as the wheels see it, moves in steps.
export const stepped=(time:number)=>{const beats=time*BEATS_PER_S;return (Math.floor(beats)+smooth(frac(beats)*4))/BEATS_PER_S};
// Centre-arbor angle in radians (not wrapped, so driven wheels never jump). Positive is clockwise, as the hands turn.
export const centreAngle=(time:number)=>stepped(time)/3600*TURN;

export function poseAt(state:State,rate=1,alarm=ALARM_DEFAULT,wind=WIND_DEFAULT){
 const {t}=state,beatTime=START+state.run,beats=beatTime*BEATS_PER_S,beat=Math.floor(beats),side=beat%2?-1:1,swing=Math.sin(TURN*BEAT_HZ*beatTime);
 const ringing=state.ring>0,e=ringing?RING_S-state.ring:0,cycles=STRIKE_HZ*e;
 // A bell rings on after each hit and dies away before the next.
 const shake=(phase:number)=>{if(!ringing||cycles<phase)return 0;const since=frac(cycles-phase)/STRIKE_HZ;return BELL_SHAKE*Math.exp(-since*SHAKE_DECAY)*Math.sin(TURN*SHAKE_HZ*since)};
 const whole=Math.floor(t),minute=centreAngle(t);
 return {
  t,rate,alarm,
  clock:{h:Math.floor(whole/3600)%12||12,m:Math.floor(whole/60)%60,s:whole%60},
  // Hand angles, clockwise from twelve.
  minute,hour:minute*RATIO.hour,second:minute*RATIO.fourth,
  // The same angle on the real-time clock, for the escape wheel.
  beatMinute:centreAngle(beatTime),
  balance:BALANCE_AMP*swing,
  // The fork snaps across at each beat, the way the balance is going.
  fork:FORK_AMP*side*(2*smooth(frac(beats)*4)-1),
  crown:wind*TURN,
  alarmAngle:alarm/720*TURN,
  ringing,
  strikeTurns:cycles/T.strike,
  hammer:HAMMER.amp*Math.sin(TURN*cycles),   // positive swings toward the right bell
  strikes:ringing?Math.floor(2*cycles+.5):0,
  bellRight:shake(.25),bellLeft:shake(.75),
  // The stop lever lifts off the hammer for the run and drops back at the end.
  stop:STOP_AMP*clamp(Math.min(e,state.ring)/STOP_S),
  level:state.ring/RING_S,
 };
}
export type Pose=ReturnType<typeof poseAt>;
const two=(n:number)=>String(n).padStart(2,'0');
export const timeText=(p:Pose)=>`${p.clock.h}:${two(p.clock.m)}:${two(p.clock.s)}`;
export const alarmText=(minutes:number)=>`${Math.floor(minutes/60)%12||12}:${two(minutes%60)}`;

const LAST=Math.max(...assemblies.map(a=>a.order));
export const spread=(separation:number,order:number)=>stagger(separation,order,LAST);
