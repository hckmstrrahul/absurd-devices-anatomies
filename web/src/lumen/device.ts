import * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,advance,poseAt,rateOf,timeText,START,SIZE,RATES,PALETTES,type Clock,type Pose,type PaletteId} from './model';
import {FRAME,RING,DIAL,GLOBE,BULB,STRIP,HANDLE,PUMP} from './layout';
import {wheelAngles,sectorPose,pistonHeight,ZERO,LINK} from './train';
import {buildLumen} from './parts';

const rad=THREE.MathUtils.degToRad;

export const lumen:DeviceDef<Clock,Pose>={
 slug:'lumen',title:'Lumen',size:`${SIZE.x} × ${SIZE.y} × ${SIZE.z} mm`,reference:'/assets/lumen-reference.png',
 assemblies,shell:'glass',
 views:[{id:'hero',label:'3D',dir:[-.5,.26,.83]},{id:'front',label:'Front',dir:[0,.075,1]},{id:'side',label:'Side',dir:[1,.14,.12]}],
 frame:{radius:150,target:[0,104,0],explodeScale:.6,explodeLift:38,shadow:[300,150],envRotation:[0,0,0],shadowStrength:.06,reflection:.42,bloom:{strength:.24,radius:.22,threshold:1.2}},
 // Sweep sampled from the reference: #a9a8ac wall, #f1f0f1 floor.
 backdrop:{light:{top:0xa9a9ad,mid:0xcdcdd0,bottom:0xf0f0f1,horizon:.52,vignette:.08},dark:{top:0x0d0e10,mid:0x17191c,bottom:0x25282c,horizon:.52,vignette:.32}},
 inputs:[
  {kind:'segment',id:'rate',label:'Rate',options:RATES.map(r=>({id:r.id,label:r.label}))},
  {kind:'slider',id:'brightness',label:'Brightness',min:10,max:100,step:5,format:v=>`${v}%`},
  {kind:'segment',id:'palette',label:'Palette',options:PALETTES.map(p=>({id:p.id,label:p.label}))},
 ],
 defaults:{rate:'1',brightness:80,palette:'prism'},
 sim:{
  start:START,
  step:(state,dt,playing,values)=>advance(state,dt,playing,rateOf(values.rate)),
  pose:(state,values)=>poseAt(state,Number(values.brightness)/100,values.palette as PaletteId),
 },
 readouts:pose=>[{label:'Time',value:timeText(pose.clock,pose.seconds)},{label:'Ring phase',value:`${Math.round(pose.phase)%360}°`},{label:'Level',meter:pose.level}],
 build(b){
  const d=buildLumen(b);
  return {
   anchors:{frame:[-HANDLE.x,HANDLE.ballY+12,0],glass:[70,FRAME.cy+40,30],ring:[-RING.w/2,FRAME.cy-20,RING.z1],dial:[DIAL.x+30,DIAL.y+DIAL.h/2,6],left:[GLOBE.x,GLOBE.y+GLOBE.r,6],right:[BULB.x,BULB.y+BULB.r,6],board:[STRIP.x0+20,STRIP.y0,14]},
   update(pose){
    // Every wheel takes its rotation from the same chain of meshes. The minute hand rides the cannon pinion,
    // the hour hand the hour wheel and the seconds hand the seconds wheel.
    const w=wheelAngles(pose.escapeTurns,pose.clock/10);
    d.go.escape.rotation.z=w.escape;d.go.fourth.rotation.z=d.go.fourthDrive.rotation.z=w.fourth;d.go.third.rotation.z=w.third;
    d.go.centre.rotation.z=d.go.centreDrive.rotation.z=w.centre;d.go.barrel.rotation.z=w.barrel;
    const dial=d.dialWheels;
    dial.minuteIdler.rotation.z=w.minuteIdler;dial.minuteDrive.rotation.z=w.minuteDrive;dial.secondsIdler.rotation.z=w.secondsIdler;dial.seconds.rotation.z=w.seconds;
    dial.cannon.rotation.z=w.cannon;dial.minuteWheel.rotation.z=w.minuteWheel;dial.hourWheel.rotation.z=w.hourWheel;
    d.hands.minute.rotation.z=w.cannon;d.hands.hour.rotation.z=w.hourWheel-ZERO.hourWheel;d.hands.second.rotation.z=w.seconds-ZERO.seconds;
    d.go.balance.rotation.z=rad(pose.balance);d.breathe(rad(pose.balance));d.go.pallet.rotation.z=d.forkRest+rad(pose.lever);
    d.beat.lamp.emissiveIntensity=pose.beatLamp;
    d.day.needle.rotation.z=-rad(pose.day);d.day.face.emissiveIntensity=.3+pose.flask*.3;
    // Level gauge: needle, pinion, sector, link and plunger.
    const needle=-rad(pose.gauge),s=sectorPose(needle),[sx,sy,sz]=d.tubes.sectorAt;
    d.tubes.needle.rotation.z=needle;d.tubes.sector.rotation.z=s.turn;d.tubes.plunger.position.y=sy+s.plunger;
    d.tubes.gaugeLink([sx+s.pin.x,sy+s.pin.y,sz+.9],[sx-LINK.pin,sy+s.plunger,sz+.9]);
    // Bellows pump: crank, rod, lower board, pleats and flap valve.
    const pin=PUMP.y+pistonHeight(pose.crank,PUMP.crank,PUMP.rod),board=pin+1.45;
    d.pump.crank.rotation.z=-pose.crank;d.pump.piston.position.y=pin+.75;d.pump.bellows.position.y=board;d.pump.bellows.scale.y=PUMP.top-board;
    d.pump.conRod([PUMP.x+Math.sin(pose.crank)*PUMP.crank,PUMP.y+Math.cos(pose.crank)*PUMP.crank,.9],[PUMP.x,pin,.9]);
    d.pump.valve.rotation.z=rad(15+55*pose.puff*pose.power);
    d.tubes.tube.emissiveIntensity=pose.tube;d.tubes.tubeLight.intensity=pose.tube*500;
    d.tubes.flask.emissiveIntensity=pose.flask;d.tubes.flaskLight.intensity=pose.flask*450;
    d.knob.rotation.x=rad(pose.knob);
    // The page marks the dark theme on the root element. The kit dims its own room but not a device's reflection
    // map, and the diffuser is driven harder against a dark room than against a pale one.
    const dark=document.documentElement.classList.contains('dark-mode');
    d.theme(dark);d.paint(pose.palette,pose.shift,pose.level,dark);
   },
  };
 },
};
