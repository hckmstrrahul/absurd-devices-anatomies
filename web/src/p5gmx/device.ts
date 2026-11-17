import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,UPRIGHT,type Pose,type State} from './model';
import {TOP,SOCKET,NB,IO,EDGE_Z,ATX24,SINK,DIMM,DIMMS} from './layout';
import {buildBoard} from './parts';

// Studio sweep sampled from the photographs: #cdcccc behind the board, a touch paler toward the top.
const LIGHT={top:0xd8d7d7,mid:0xd0cfcf,bottom:0xc6c5c5,horizon:.6,vignette:.05},DEEP={top:0x111214,mid:0x0e0f11,bottom:0x0a0b0c,horizon:.6,vignette:.3};
const GLOSS=.12;
const WHITE={top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04};
export const p5gmx:DeviceDef<State,Pose>={
 slug:'p5gmx',title:'P5G-MX',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/p5gmx-reference.png',
 assemblies,
 views:[
  {id:'top',label:'Top',dir:[0,1,.0015],zoom:.86},
  {id:'hero',label:'3D',dir:[0,.8,-.6],zoom:.84,lens:30},
  {id:'side',label:'Side',dir:[-.9,.32,-.3],zoom:.9},
  {id:'close',label:'Close',dir:[.35,.62,-.7],zoom:.42},
  {id:'layers',label:'Layers',dir:[-.5,.28,.82],lens:5,zoom:1.04,upright:UPRIGHT,layers:true,backdrop:WHITE,light:{environment:1.3,key:1}},
 ],
 frame:{radius:128,target:[0,TOP+4,0],explodeScale:.5,explodeLift:30,shadow:[260,200],shadowStrength:.28,exposure:1.05,environment:'studio',envRotation:[.4,0,.1],
  ao:{radius:3.2,intensity:.85,views:['layers','close','side','hero']},key:{dir:[.3,2.6,.9],intensity:2.05,environment:1.25,shadowSize:1024},bloom:{strength:.35,radius:.4,threshold:1.3}},
 backdrop:{light:LIGHT,dark:DEEP},
 inputs:[{kind:'slider',id:'load',label:'CPU load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`}],
 defaults:{load:LOAD.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'Vcore',value:`${p.vcore.toFixed(3)} V`},{label:'VRM',value:`${p.vrm.toFixed(1)} °C`},{label:'Northbridge',value:`${p.nb.toFixed(1)} °C`}],
 build(b){
  const d=buildBoard(b);
  const io=IO.find(i=>i.kind==='lan')!;
  return {
   anchors:{heatsink:[SINK.x,TOP+12,SINK.z],socket:[SOCKET.x,TOP+7,SOCKET.z],memory:[(DIMM.x0+DIMM.x1)/2,TOP+9,DIMMS[0].z],slots:[-84,TOP+11,-18],io:[io.x,TOP+30,EDGE_Z],
    connectors:[ATX24.x,TOP+13,ATX24.z],power:[95,TOP+12,-55],chips:[NB.x,TOP+3,NB.z],parts:[-60,TOP+2,30],board:[-40,TOP,10]},
   update(p,view){
    // The mask is glossy but the studio's top softbox would wash it out from above: it takes the room as its own, dimmer map (KIT.md).
    const room=(b.root.parent as import('three').Scene|null)?.environment;
    if(room)for(const m of d.boardFaces){if(m.envMap!==room){m.envMap=room;m.needsUpdate=true}m.envMapIntensity=(view.dark?.6:1)*GLOSS}
    if(room)for(const [m,k] of d.dimmed){if(m.envMap!==room){m.envMap=room;m.needsUpdate=true}m.envMapIntensity=(view.dark?.6:1)*k}
    d.ledMat.emissiveIntensity=p.standby*2.2;
   },
  };
 },
};
