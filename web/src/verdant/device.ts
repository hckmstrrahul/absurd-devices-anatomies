import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,type Pose,type State} from './model';
import {buildVerdant} from './parts';

export const verdant:DeviceDef<State,Pose>={
 slug:'verdant',title:'Verdant',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/board-1-reference.png',
 assemblies,
 views:[{id:'top',label:'Top',dir:[0,1,.0015]},{id:'close',label:'Close',dir:[0,1,.0015],zoom:.47},{id:'hero',label:'3D',dir:[-.74,.6,.44]},{id:'side',label:'Side',dir:[-1,.2,.16]},{id:'layers',label:'Layers',dir:[-.68,.16,.72],lens:5,zoom:1.06,upright:170,layers:true,backdrop:{top:0xf9f9fa,mid:0xfafafb,bottom:0xf6f7f8,horizon:.6,vignette:.02},light:{environment:1.45,key:1.1}}],
 frame:{radius:142,target:[0,4,0],explodeScale:.42,explodeLift:66,shadow:[176,274],shadowStrength:.3,exposure:.84,ao:{radius:4,views:['layers']},key:{dir:[-.8,2.6,-1],intensity:1.3,environment:1.15,shadowSize:1024},bloom:{strength:.3,radius:.5,threshold:1.25}},
 backdrop:{light:{top:0x151816,mid:0x1b1f1c,bottom:0x232824,horizon:.62,vignette:.4},dark:{top:0x090b0a,mid:0x0e110f,bottom:0x141815,horizon:.62,vignette:.45}},
 inputs:[{kind:'slider',id:'load',label:'Load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`}],
 defaults:{load:LOAD.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'Clock',value:`${p.clock.toFixed(2)} GHz`},{label:'Die',value:`${p.temp.toFixed(1)} °C`}],
 build(b){
  const device=buildVerdant(b);
  return {
   anchors:{cooling:[-10,24,-112],cpu:[-8,10,-24],power:[-40,14,-45],memory:[35,10,-5],logic:[-9,10,78],ports:[75,14,-50],board:[-60,4,120]},
   update(p,view){
    // Contact shade fades as the parts lift away (taken apart, or floated out in the Layers view), and follows the board when another assembly is in focus.
    device.shade.material.opacity=(1-Math.min(1,view.separation*3))*(1-Math.min(1,view.layers*3))*device.boardTop.opacity;
    device.die.emissiveIntensity=p.die*.1;
    device.padGlow.emissiveIntensity=p.on*(.12+p.load*.5);
    device.pipeGlow.emissiveIntensity=p.on*(.1+p.warm*.9);device.flow.offset.x=-p.flow;
    device.leds.forEach((led,i)=>{const level=p.leds[i];led.dome.emissiveIntensity=level*2.4;led.halo.color.copy(led.tint).multiplyScalar(level*.9)});
    device.pulses.forEach((pulse,i)=>{
     const t=p.pulses[i];pulse.mesh.visible=t>=0;if(t<0)return;
     // Fade in on leaving the processor and out on arrival.
     const level=p.on*Math.min(1,t*8,(1-t)*8);pulse.place(t);pulse.material.color.setRGB(.55*level,1.7*level,.45*level);
    });
   },
  };
 },
};
