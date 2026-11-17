import type * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,UPRIGHT,type Pose,type State} from './model';
import {buildBoard} from './parts';
import {X,Z,SOCKET,NB,ICH,LED,IO,DIMMS,DIMM} from './layout';

// The photos' set: a light neutral grey sweep, soft even light. Dark theme: a deep neutral set.
const GREY={top:0xdedfde,mid:0xd9dad9,bottom:0xcfd0cf,horizon:.62,vignette:.05},DEEP={top:0x0e0f11,mid:0x121315,bottom:0x08090a,horizon:.6,vignette:.4};
const WHITE={top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04};
const STEEL=.72;
export const p5gplx:DeviceDef<State,Pose>={
 slug:'p5gplx',title:'P5GPL-X SE',size:`${SIZE.z} × ${SIZE.x} × ${SIZE.y} mm`,reference:'/assets/p5gplx-reference.png',
 assemblies,
 views:[
  // 3D matches the angled photo: from beyond the rear I/O edge, about 50° up, rear panel nearest.
  {id:'hero',label:'3D',dir:[-.5,.86,.02],zoom:.7,lens:13},
  {id:'top',label:'Top',dir:[0,1,.0015],zoom:.86},
  {id:'side',label:'Side',dir:[.18,.22,1],zoom:.62},
  {id:'close',label:'Close',dir:[-.55,.62,.56],zoom:.42},
  {id:'layers',label:'Layers',dir:[-.5,.28,.82],lens:5,zoom:1.16,upright:UPRIGHT,layers:true,backdrop:WHITE,light:{environment:1,key:1.1}},
 ],
 frame:{radius:178,target:[0,10,0],explodeScale:.85,explodeLift:70,shadow:[205,325],shadowStrength:.22,exposure:.95,environment:'studio',envRotation:[.5,0,.2],
  ao:{radius:4,intensity:.8,views:['close','layers','hero','side']},key:{dir:[-.45,2.6,.9],intensity:.5,environment:.63,shadowSize:1024},bloom:{strength:.35,radius:.45,threshold:1.3}},
 backdrop:{light:GREY,dark:DEEP},
 inputs:[{kind:'slider',id:'load',label:'CPU load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`}],
 defaults:{load:LOAD.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'VRM',value:`${p.vrm.toFixed(1)} °C`},{label:'North bridge',value:`${p.nb.toFixed(1)} °C`},{label:'Vcore',value:p.vcore>0?`${p.vcore.toFixed(3)} V`:'off'}],
 build(b){
  const d=buildBoard(b);
  return {
   anchors:{heatsink:[X(NB.u),40,Z(NB.v)],socket:[X(SOCKET.u),14,Z(SOCKET.v)],memory:[X(DIMMS[0].u),18,Z(DIMM.v)],slots:[X(80),16,Z(245)],power:[X(169),18,Z(111)],
    io:[X(4),30,Z(IO.lan.v0)],'power-parts':[X(64),14,Z(26)],chips:[X(ICH.u),8,Z(ICH.v)],parts:[X(LED.u),10,Z(LED.v)],board:[X(150),5,Z(150)]},
   update(p,view){
    // Tin-plated steel mirrors the studio more than the scene's even level allows: it takes the room as its own map.
    const scene=b.root.parent as THREE.Scene|null;
    if(scene?.environment)for(const m of d.mirrors){if(m.envMap!==scene.environment){m.envMap=scene.environment;m.envMapRotation.copy(scene.environmentRotation);m.needsUpdate=true}m.envMapIntensity=(view.dark?.62:1)*STEEL}
    d.led.emissiveIntensity=p.lamp*2.2;
   },
  };
 },
};
