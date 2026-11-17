import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,control,SIZE,SPEED,type Pose,type State} from './model';
import {buildPocket} from './parts';

export const pocket:DeviceDef<State,Pose>={
 slug:'pocket',title:'Pocket',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/pocket-reference.png',
 assemblies,shell:'front',
 views:[{id:'hero',label:'3D',dir:[-.42,.74,.62]},{id:'top',label:'Top',dir:[0,1,.0015]},{id:'side',label:'Side',dir:[1,.22,.05]}],
 frame:{radius:90,target:[0,12,-3],explodeScale:.85,explodeLift:74,shadow:[112,176]},
 backdrop:{light:0x1767ad,dark:0x0b2748},
 inputs:[
  {kind:'slider',id:'speed',label:'Speed',min:SPEED.min,max:SPEED.max,step:1,format:v=>`${v} Hz`},
  {kind:'segment',id:'palette',label:'Palette',options:[{id:'cyan',label:'Cyan'},{id:'lime',label:'Lime'},{id:'amber',label:'Amber'}]},
 ],
 defaults:{speed:SPEED.start,palette:'cyan'},
 sim:{start,step,pose},
 control,
 readouts:p=>[{label:'Score',value:String(p.score)},{label:'Tick rate',value:`${p.rate} Hz`},{label:'Length',value:`${p.length} cells`},{label:'Input',value:p.input}],
 build(b){
  const device=buildPocket(b);
  return {
   anchors:{front:[36,24,-66],controls:[-25.5,25,8.8],screen:[0,21,-33],board:[-20,14,44.6],bay:[10,21,-64],power:[34.3,13,-78],back:[40,2,66]},
   update(p){
    // The cross rocks about its pivot toward the pressed arm; each button sinks by its travel.
    device.keys.cross.rotation.set(p.tiltX,0,p.tiltZ);
    for(const id of ['a','b','start','select'] as const)device.keys[id].position.y=-p.press[id];
    [p.led,p.power].forEach((level,i)=>{device.leds[i].dome.emissiveIntensity=.12+level*2.2;device.leds[i].halo.color.setScalar(level*.85)});
    device.cpuGlow.emissiveIntensity=.2+p.cpu*1.5;
    device.lcd.draw(p);
   },
  };
 },
};
