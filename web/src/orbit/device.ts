import type * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,advance,poseAt,targetRpm,SIZE,SPEEDS,PITCH_LIMIT,type Pose,type Spin,type SpeedId} from './model';
import {buildOrbit} from './parts';

export const orbit:DeviceDef<Spin,Pose>={
 slug:'orbit',title:'Orbit Deck',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/orbit-deck-reference.png',
 assemblies,shell:'case',
 views:[{id:'hero',label:'3D',dir:[-.42,.6,.68]},{id:'top',label:'Top',dir:[0,1,.0015]},{id:'side',label:'Side',dir:[0,.2,1]}],
 frame:{radius:165,target:[0,20,0],explodeScale:.72,explodeLift:105,shadow:[338,316],reflection:.5},
 backdrop:{light:{top:0xe6e9ef,mid:0xf1f3f7,bottom:0xfbfcfd,horizon:.62,vignette:.1},dark:{top:0x121416,mid:0x1b1e22,bottom:0x25292e,horizon:.62,vignette:.35}},
 inputs:[
  {kind:'segment',id:'speed',label:'Speed',options:SPEEDS.map(s=>({id:s.id,label:s.label}))},
  {kind:'slider',id:'pitch',label:'Pitch',min:-PITCH_LIMIT,max:PITCH_LIMIT,step:.5,format:v=>`${v>0?'+':''}${v.toFixed(1)}%`},
 ],
 defaults:{speed:'33',pitch:0},
 sim:{
  start:{revs:0,rpm:0},
  step:(spin,dt,playing,values)=>advance(spin,dt,targetRpm(playing,values.speed as SpeedId,Number(values.pitch))),
  pose:spin=>poseAt(spin.revs,spin.rpm),
 },
 readouts:pose=>[{label:'RPM',value:pose.rpm.toFixed(1)},{label:'BPM',value:String(Math.round(pose.bpm))},{label:'Level',meter:pose.level}],
 build(b){
  const device=buildOrbit(b);
  return {
   anchors:{case:[118,30,-108],platter:[5,37,3],coil:[-68.5,25,-53.6],rotor:[-85.3,24,53.6],controls:[71.4,25,-38.7],memory:[-21.3,21,86.8],board:[60,14,80]},
   update(pose){
    for(const node of device.spin.platter)node.rotation.y=-pose.platter;
    for(const node of device.spin.rotor)node.rotation.y=-pose.rotor;
    device.spin.knobs.forEach((node:THREE.Object3D,i:number)=>{node.rotation.y=pose.knobs[i]});
    const running=pose.rpm>1;
    device.glow.coil.emissiveIntensity=pose.level*.85;
    device.glow.leds.forEach((led,i)=>{led.emissiveIntensity=running&&i===pose.step?2.4:.05});
    device.glow.button.emissiveIntensity=running?.35+pose.level*.5:.05;
    device.glow.memory.emissiveIntensity=running&&pose.step%4<2?1.6:.05;
   },
  };
 },
};
