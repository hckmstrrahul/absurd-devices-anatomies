import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,UPRIGHT,type Pose,type State} from './model';
import {CPU,TOP} from './layout';
import {buildGap35} from './parts';

const WHITE={top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04};
export const gap35:DeviceDef<State,Pose>={
 slug:'gap35',title:'GA-P35-S3G',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/gap35-reference.png',
 assemblies,
 views:[
  {id:'top',label:'Top',dir:[0,1,.0015],zoom:.8},
  {id:'hero',label:'3D',dir:[0,.8,-.6],lens:30,zoom:.74},
  {id:'side',label:'Side',dir:[-1,.22,-.12],zoom:.72},
  {id:'close',label:'Close',dir:[.32,.78,-.54],zoom:.42},
  {id:'layers',label:'Layers',dir:[-.5,.28,.82],lens:5,zoom:.9,upright:UPRIGHT,layers:true,backdrop:WHITE,light:{environment:1.35,key:1}},
 ],
 frame:{radius:170,target:[0,TOP+8,0],explodeScale:.5,explodeLift:70,shadow:[330,230],shadowStrength:.22,exposure:.92,environment:'studio',envRotation:[.4,0,.2],
  ao:{radius:4.5,intensity:.85,views:['layers','close','hero','side']},key:{dir:[-.35,2.6,-.9],intensity:2.05,environment:1.06,shadowSize:1024}},
 backdrop:{light:{top:0xdcdcdc,mid:0xd6d6d6,bottom:0xcbcbcb,horizon:.6,vignette:.05},dark:{top:0x111214,mid:0x15161a,bottom:0x0b0c0e,horizon:.6,vignette:.3}},
 inputs:[{kind:'slider',id:'load',label:'CPU load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`}],
 defaults:{load:LOAD.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'CPU',value:`${p.cpu.toFixed(1)} °C`},{label:'Fan',value:`${Math.round(p.rpm)} rpm`},{label:'VRM',value:`${p.vrm.toFixed(1)} °C`}],
 build(b){
  const d=buildGap35(b);
  return {
   anchors:{cooler:[CPU.x,TOP+60,CPU.z],socket:[CPU.x,TOP+8,CPU.z],heatsinks:[-18,TOP+26,-18],memory:[38,TOP+10,32],slots:[-90,TOP+10,-20],power:[-10,TOP+14,88],io:[30,TOP+30,-100],vrm:[95,TOP+12,90],chips:[-60,TOP+4,60],board:[-140,TOP,90]},
   update(p){d.rotor.rotation.y=-p.turn},
  };
 },
};
