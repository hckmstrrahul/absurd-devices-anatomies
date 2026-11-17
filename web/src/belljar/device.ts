import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,poseAt,rateOf,alarmOf,windOf,timeText,alarmText,SIZE,RATES,ALARM_DEFAULT,WIND_DEFAULT,WIND_MAX,BEAT_HZ,type Pose,type State} from './model';
import {BELL,CLOCK} from './layout';
import {gearing} from './gearing';
import {buildBelljar} from './parts';

export const belljar:DeviceDef<State,Pose>={
 slug:'belljar',title:'Belljar',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/belljar-reference.png',
 assemblies,shell:'cloche',
 views:[{id:'hero',label:'3D',dir:[.52,.3,.8]},{id:'front',label:'Front',dir:[0,.12,1]},{id:'side',label:'Side',dir:[1,.1,.02]}],
 frame:{radius:124,target:[0,101,0],explodeScale:1.3,explodeLift:95,shadow:[230,150],environment:'studio',shadowStrength:.06,reflection:.42},
 // Sampled from the reference: mid grey wall, pale floor.
 backdrop:{light:{top:0xadaead,mid:0xc2c2c2,bottom:0xdedede,horizon:.7,vignette:.08},dark:{top:0x0f1113,mid:0x181b1e,bottom:0x25292d,horizon:.7,vignette:.35}},
 inputs:[
  {kind:'segment',id:'rate',label:'Rate',options:RATES.map(r=>({id:r.id,label:r.label}))},
  {kind:'slider',id:'alarm',label:'Alarm',min:0,max:719,step:1,format:alarmText},
  {kind:'slider',id:'wind',label:'Wind',min:0,max:WIND_MAX,step:.25,format:v=>`${v.toFixed(2)} turns`},
 ],
 defaults:{rate:'60',alarm:ALARM_DEFAULT,wind:WIND_DEFAULT},
 sim:{
  start,
  step:(state,dt,playing,values)=>step(state,dt,playing,rateOf(values.rate),alarmOf(values.alarm)),
  pose:(state,values)=>poseAt(state,rateOf(values.rate),alarmOf(values.alarm),windOf(values.wind)),
 },
 readouts:pose=>[
  {label:'Time',value:timeText(pose)},
  {label:'Alarm',value:alarmText(pose.alarm)},
  {label:'Rate',value:`${pose.rate}× · ${BEAT_HZ} Hz`},
  {label:'Bells',meter:pose.level},
 ],
 build(b){
  const device=buildBelljar(b),{spin}=device;
  // Arbors that turn about the clock axis, by the name gearing.ts gives their angle.
  const geared=['centre','cannon','barrel','third','fourth','escape','minuteWheel','hourWheel','setA','setB','setC','setD','crownWheel','transA','transB','ratchet','click','alarmWheel','alarmIdlerA','alarmIdlerB','alarmBarrel','strike'] as const;
  return {
   anchors:{cloche:[66,150,34],bells:[-39,172,0],case:[52,CLOCK.y-34,18],hands:[14,CLOCK.y+19,16],dial:[-34,CLOCK.y+20,11],movement:[-8,CLOCK.y-8,8],base:[70,20,46]},
   update(pose){
    const g=gearing(pose);
    // Hands turn clockwise.
    spin.hour.rotation.y=-pose.hour;spin.minute.rotation.y=-pose.minute;spin.second.rotation.y=-pose.second;
    for(const id of geared)spin[id].rotation.z=g[id];
    spin.clutchWheel.rotation.z=spin.setPinion.rotation.z=g.setArbor;
    spin.alarmPinion.rotation.z=g.alarmKnob;spin.alarmKnob.rotation.y=g.alarmKnob;
    spin.balance.rotation.z=pose.balance;spin.fork.rotation.z=pose.fork;spin.stop.rotation.z=pose.stop;
    device.hairspring(pose.balance);device.mainspring(g.mainspring);
    // The crown and its stem turn about the vertical; winding goes anticlockwise seen from above.
    spin.stem.rotation.y=spin.crown.rotation.y=-pose.crown;
    device.hammer.rotation.z=-pose.hammer;
    device.bells[0].rotation.z=BELL.tilt+pose.bellLeft;device.bells[1].rotation.z=-BELL.tilt-pose.bellRight;
    device.cyan.emissiveIntensity=.35+pose.level*1.9;
   },
  };
 },
};
