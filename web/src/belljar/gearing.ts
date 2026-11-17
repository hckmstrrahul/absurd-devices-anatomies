// Turns the model's pose into an angle for every arbor, anticlockwise positive seen from the front.
// Each driven arbor is phased from its driver with the kit's `meshed`, so teeth interlock and the ratios
// are nothing more than the tooth counts.
import {meshed} from '../kit/horology';
import {TEETH as T,toward,type ArborId} from './layout';
import type {Pose} from './model';

const TURN=Math.PI*2;
const drive=(theta:number,driver:number,driven:number,from:ArborId,to:ArborId)=>meshed(theta,driver,driven,toward(from,to));
// Going train from the centre arbor's angle.
export function going(centre:number){
 const third=drive(centre,T.centre,T.thirdPinion,'centre','third'),fourth=drive(third,T.third,T.fourthPinion,'third','fourth');
 return {centre,third,fourth,escape:drive(fourth,T.fourth,T.escapePinion,'fourth','escape'),barrel:drive(centre,T.centrePinion,T.barrel,'centre','barrel')};
}
export const CLICK_AMP=.16;
export function gearing(p:Pose){
 const train=going(-p.minute);
 // Motion works and the setting wheels that idle with them.
 const minuteWheel=drive(train.centre,T.cannon,T.minuteWheel,'centre','minuteWheel'),hourWheel=drive(minuteWheel,T.minutePinion,T.hourWheel,'minuteWheel','centre');
 const setD=drive(minuteWheel,T.minuteWheel,T.setIdler,'minuteWheel','setD'),setC=drive(setD,T.setIdler,T.setIdler,'setD','setC'),setB=drive(setC,T.setIdler,T.setIdler,'setC','setB');
 const setA=drive(setB,T.setIdler,T.setIdlerA,'setB','setA'),setArbor=drive(setA,T.setIdlerA,T.setPinion,'setA','setArbor');
 // Winding: the stem pinion's face teeth push the top of the crown wheel sideways.
 const crownWheel=Math.PI/2-p.crown*T.windPinion/T.crownWheel,transA=drive(crownWheel,T.crownWheel,T.transA,'crownWheel','transA'),transB=drive(transA,T.transA,T.transB,'transA','transB');
 const ratchet=drive(transB,T.transB,T.ratchet,'transB','barrel'),tooth=ratchet/(TURN/T.click);
 // Alarm setting, worked back from where the alarm wheel has to point.
 const alarmWheel=-p.alarmAngle,alarmIdlerA=drive(alarmWheel,T.alarmWheel,T.alarmIdler,'centre','alarmIdlerA'),alarmIdlerB=drive(alarmIdlerA,T.alarmIdler,T.alarmIdler,'alarmIdlerA','alarmIdlerB');
 const strike=-p.strikeTurns*TURN;
 return {
  ...train,
  // Shown at the real-time beat (see model.ts); equal to the clock-time train at 1×.
  escape:going(-p.beatMinute).escape,
  cannon:train.centre,minuteWheel,hourWheel,setD,setC,setB,setA,setArbor,
  crownWheel,transA,transB,ratchet,
  // The click rides up each ratchet tooth and drops.
  click:CLICK_AMP*(tooth-Math.floor(tooth)),
  // Spring tension is the barrel arbor's lead over the barrel: winding adds to it, running takes it away.
  mainspring:ratchet-train.barrel,
  alarmWheel,alarmIdlerA,alarmIdlerB,alarmKnob:drive(alarmIdlerB,T.alarmIdler,T.alarmPinion,'alarmIdlerB','alarmKnob'),
  strike,alarmBarrel:drive(strike,T.strikePinion,T.alarmBarrel,'strike','alarmBarrel'),
 };
}
export type Gearing=ReturnType<typeof gearing>;
