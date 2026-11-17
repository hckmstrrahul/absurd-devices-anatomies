import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,UPRIGHT,type Pose,type State} from './model';
import {buildBoard} from './parts';

// A light neutral grey sweep like the photographs' table, and a deep neutral set for the dark theme.
const GREY={top:0xdcdddf,mid:0xd3d4d6,bottom:0xc7c8ca,horizon:.6,vignette:.05},DEEP={top:0x111214,mid:0x0e0f11,bottom:0x08090a,horizon:.6,vignette:.4};
const WHITE={top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04};
export const k8nf4x:DeviceDef<State,Pose>={
 slug:'k8nf4x',title:'K8NF4X',size:`${SIZE.z} × ${SIZE.x} × ${SIZE.y} mm`,reference:'/assets/k8nf4x-reference.png',
 assemblies,
 views:[
  // 3D matches the angled photograph: the rear I/O toward the camera, memory on the left.
  {id:'hero',label:'3D',dir:[-.72,.68,-.05],zoom:.72},
  {id:'top',label:'Top',dir:[0,1,.0015],zoom:.98},
  {id:'side',label:'Side',dir:[.42,.2,1],zoom:.7},
  {id:'close',label:'Close',dir:[-.36,.8,.48],zoom:.4},
  {id:'layers',label:'Layers',dir:[-.5,.28,.82],lens:5,zoom:1.08,upright:UPRIGHT,layers:true,backdrop:WHITE,light:{environment:1.3,key:1}},
 ],
 frame:{radius:162,target:[0,6,0],explodeScale:.55,explodeLift:30,shadow:[230,320],shadowStrength:.26,exposure:.82,environment:'room',ao:{radius:6,intensity:1,views:['layers','close','hero','top']},
  key:{dir:[-.3,3,.7],intensity:1.95,environment:1.25,shadowSize:1024}},
 backdrop:{light:GREY,dark:DEEP},
 inputs:[
  {kind:'slider',id:'load',label:'Load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`},
  {kind:'segment',id:'lever',label:'Lever',options:[{id:'closed',label:'Down'},{id:'open',label:'Up'}]},
 ],
 defaults:{load:LOAD.start,lever:'closed'},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'CPU',value:p.locked?`${p.watts.toFixed(0)} W`:'lever up'},{label:'VRM',value:`${p.vrm.toFixed(1)} °C`},{label:'Chipset',value:`${p.nb.toFixed(1)} °C`}],
 build(b){
  const d=buildBoard(b);
  return {
   anchors:d.anchors,
   update(p){d.lever.rotation.x=-p.leverDeg*Math.PI/180},
  };
 },
};
