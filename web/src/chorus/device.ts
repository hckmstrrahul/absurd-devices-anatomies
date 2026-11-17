import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,poseAt,rateOf,RATES,SIZE,FORK_SWING,type Pose,type State} from './model';
import {TEETH} from './works';
import {meshed} from '../kit/horology';
import {buildChorus} from './parts';

const mmss=(s:number)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

export const chorus:DeviceDef<State,Pose>={
 slug:'chorus',title:'Chorus',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/chorus-reference.png',
 assemblies,shell:'enclosure',
 views:[{id:'hero',label:'3D',dir:[-.5,.26,.83]},{id:'front',label:'Front',dir:[0,.07,1]},{id:'side',label:'Side',dir:[1,.1,.02]}],
 frame:{radius:215,target:[0,150,0],explodeScale:.85,explodeLift:120,shadow:[440,230],environment:'studio',shadowStrength:.06,reflection:.42},
 // Sweep sampled from the reference: #c0c0c0 wall, lighter floor toward the front.
 backdrop:{light:{top:0xc0c0c0,mid:0xcbcbcb,bottom:0xe4e4e4,horizon:.7,vignette:.12},dark:{top:0x0e0f11,mid:0x17191c,bottom:0x25282c,horizon:.7,vignette:.35}},
 inputs:[{kind:'segment',id:'rate',label:'Rate',options:RATES.map(r=>({id:r.id,label:r.label}))}],
 defaults:{rate:'60'},
 sim:{start,step:(state,dt,playing,values)=>step(state,dt,playing,rateOf(values.rate).rate),pose:(state,values)=>poseAt(state,rateOf(values.rate).rate)},
 readouts:pose=>[
  {label:'Master time',value:pose.text},
  {label:'Rate',value:`${pose.rate}×`},
  {label:'Chime',value:pose.chiming.length?pose.chiming.join(', '):`in ${mmss(pose.next)}`},
 ],
 build(b){
  const d=buildChorus(b);
  return {
   anchors:{enclosure:[150,292,66],master:[0,250,20],left:[-121,215,36],right:[124,153,26],linkage:[160,200,-40],pedestal:[0,51,40],plinth:[150,26,80]},
   update(pose){
    d.master.hour.rotation.z=-pose.master.hour;d.master.minute.rotation.z=-pose.master.minute;d.master.second.rotation.z=-pose.master.second;
    d.master.alarm.rotation.z=-pose.alarm;d.master.day.rotation.z=-pose.day;
    // Every wheel is phased from the fourth arbor, which turns once a master minute; the escapements keep real time.
    const turn=Math.PI*2,fourth=(seconds:number)=>-turn*seconds/60;
    d.works.solve(fourth(pose.t),fourth(pose.e),pose.escape.lead);d.works.beat(pose.escape.fork*FORK_SWING,pose.escape.balance);
    for(const dial of pose.dials){
     const w=d.orbWorks[dial.id];if(!w)continue;
     w.solve(fourth(dial.local),fourth(pose.e+dial.offset),pose.orbEscape.lead);w.beat(pose.orbEscape.fork*FORK_SWING,pose.orbEscape.balance);
    }
    // Sync drive: line shaft once a master minute, motor pinion meshed above it, upright shafts through 1:1 crown pairs.
    const line=fourth(pose.t);d.sync.line.rotation.x=line;d.sync.motorPinion.rotation.x=meshed(line,TEETH.line,TEETH.motor,Math.PI/2);
    for(const u of d.sync.uprights)u.node.rotation.y=u.sign*line;
    for(const dial of pose.dials){
     const h=d.hands[dial.id];h.hour.rotation.z=-dial.hour;h.minute.rotation.z=-dial.minute;if(h.second)h.second.rotation.z=-dial.second;
     // The accent: a dial lights as it strikes its own hour.
     d.glow[dial.id].dial.emissiveIntensity=dial.glow*1.3;d.glow[dial.id].shell.emissiveIntensity=dial.glow*.9;
    }
    for(const id in d.swing)for(const node of d.swing[id])node.rotation.z=pose.sway[id];
    d.lcd.draw(pose.text,pose.dials.map(dial=>dial.glow>0));d.lcdMaterial.emissiveIntensity=.16+pose.glow*.6;
   },
  };
 },
};
