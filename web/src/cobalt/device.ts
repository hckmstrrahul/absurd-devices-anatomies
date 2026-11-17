import type * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,RATE,type Pose,type State} from './model';
import {BOARD,PLINTH,TOP} from './layout';
import {buildCobalt,ANCHORS} from './parts';

const Y=PLINTH.h+TOP;
const GLOSS:[number,number,number]=[-1.7,0,0];
const LIGHT={top:0xdfe2e7,mid:0xdadde3,bottom:0xd2d6dc,horizon:.6,vignette:.04},DEEP={top:0x0d0f14,mid:0x0b0d12,bottom:0x090a0e,horizon:.6,vignette:.06};
export const cobalt:DeviceDef<State,Pose>={
 slug:'cobalt',title:'Cobalt',size:`${BOARD.w} × ${BOARD.d} × 11 mm`,reference:'/assets/board-1-reference.png',
 assemblies,
 views:[
  {id:'hero',label:'3D',dir:[-.55,.6,.66]},
  {id:'top',label:'Top',dir:[0,1,.0015],zoom:.8},
  {id:'side',label:'Side',dir:[.45,.3,1],zoom:.85},
  {id:'close',label:'Close',dir:[-.42,.5,.76],zoom:.5},
  {id:'layers',label:'Layers',dir:[-.5,.28,.82],lens:5,layers:true,upright:60,zoom:.92},
 ],
 frame:{radius:35,target:[3,Y+1,2],explodeScale:.34,explodeLift:17,shadow:[120,120],shadowStrength:.2,environment:'studio',envRotation:[.75,0,0],exposure:1,ao:{radius:1.3,intensity:.9,views:['close','layers']},
  key:{dir:[-.7,2.2,1.1],intensity:2.3,environment:.55,shadowSize:2048},bloom:{strength:.5,radius:.5,threshold:1.05}},
 backdrop:{light:LIGHT,dark:DEEP},
 inputs:[{kind:'slider',id:'rate',label:'Sample rate',min:RATE.min,max:RATE.max,step:1,format:v=>`${v} kS/s`}],
 defaults:{rate:RATE.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Frames',value:`${p.fps.toFixed(2)} /s`},{label:'Power',value:`${p.watts.toFixed(0)} mW`},{label:'Die',value:`${p.temp.toFixed(1)} °C`},{label:'Heat',meter:p.warm}],
 build(b){
  const d=buildCobalt(b);
  return {
   anchors:ANCHORS,
   update(p,view){
    // The board's gloss mirrors the studio more strongly than the rest, turned so a softbox edge falls across it (see KIT.md: a material's own envMap).
    const room=(b.root.parent as THREE.Scene|null)?.environment;
    if(room&&d.boardTop.envMap!==room){d.boardTop.envMap=room;d.boardTop.envMapRotation.set(...GLOSS);d.boardTop.needsUpdate=true}

    d.boardTop.envMapIntensity=(view.dark?.62:1)*.45;
    d.led.act.emissiveIntensity=p.led*2.4;d.led.pwr.emissiveIntensity=p.on*.8;
    // The burst runs from the cover plate (v = 1) down to the board connector (v = 0).
    d.setBurst(1-Math.max(0,p.scan),p.scan>=0?p.on*Math.min(1,p.scan*8,(1-p.scan)*8):0);
    d.setHolo(p.glow,p.flow);
    d.plinth.setMirror(.5);
   },
  };
 },
};
