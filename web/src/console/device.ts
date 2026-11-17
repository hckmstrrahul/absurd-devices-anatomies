import * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,TEMPO,STEPS,type Pose,type State} from './model';
import {buildConsole} from './parts';

// Lamp colours for the unlit-material ring lights (values above 1 feed the bloom pass).
const hex=(c:number,k=1)=>new THREE.Color(c).multiplyScalar(k);
const SEG={on:hex(0xee6a22,1),off:hex(0x2b1509)};
const PILL={rest:hex(0xe2561a,.95),on:hex(0xff7a2a,1.7),idle:hex(0xa83c12,.6)};
const TICK={rest:hex(0x77777a),on:hex(0xffffff,1.4),idle:hex(0x505053)};

export const consoleDeck:DeviceDef<State,Pose>={
 slug:'console',title:'Console',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/board-3-reference.png',
 assemblies,
 views:[{id:'top',label:'Top',dir:[0,1,.0015]},{id:'close',label:'Close',dir:[0,1,.0015],zoom:.5},{id:'hero',label:'3D',dir:[-.46,.62,.66]},{id:'side',label:'Side',dir:[-1,.2,.12]},
  // Presentation set: near-isometric lens on a white studio sweep, on which the console's own assemblies float apart as planes (offsets in model.ts).
  {id:'layers',label:'Layers',dir:[-.7,.22,.68],lens:5,zoom:1.14,upright:165,layers:true,backdrop:{top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04},light:{environment:1.4}}],
 frame:{radius:140,target:[0,6,0],explodeScale:.5,explodeLift:72,shadow:[206,276],shadowStrength:.3,bloom:{strength:.18,radius:.45,threshold:1.2},ao:{radius:4,intensity:.9,views:['layers']},exposure:1,environment:'studio',envRotation:[-Math.PI/2,0,0],key:{dir:[.5,1.7,-.45],intensity:1.1,environment:1.15,shadowSize:1024}},
 backdrop:{light:{top:0x070708,mid:0x0b0b0d,bottom:0x131316,horizon:.62,vignette:.3},dark:{top:0x040405,mid:0x070709,bottom:0x0e0e11,horizon:.62,vignette:.35}},
 inputs:[{kind:'slider',id:'tempo',label:'Tempo',min:TEMPO.min,max:TEMPO.max,step:1,format:v=>`${v} bpm`}],
 defaults:{tempo:TEMPO.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Tempo',value:`${p.bpm} bpm`},{label:'Step',value:`${p.step+1} / ${STEPS}`},{label:'Flow',meter:p.flow}],
 build(b){
  const d=buildConsole(b);let shadowSet=1;
  return {
   anchors:{knobs:[58.5,24,-111.5],displays:[50,10,16],buttons:[2.7,13,-89],pipework:[-11,16,95],wiring:[15,10,-65],rail:[89,15,0],panel:[-60,7,60]},
   update(p,view){
    // The printed contact shadows fade as the parts lift off the deck, in Exploded or in Layers. (0.1× is the kit's ghost level for an unselected assembly: leave that alone.)
    {const mat=d.shadowMat,ghost=Math.abs(mat.opacity-.1)<1e-6&&shadowSet!==.1;if(!ghost){shadowSet=Math.max(0,1-Math.max(view.separation,view.layers)*3);if(Math.abs(shadowSet-.1)<.004)shadowSet=.104;mat.opacity=shadowSet}}
    // Once anything has lifted, the bare deck takes no cast shadows: the parts hanging over it would print dark blobs on it.
    {const on=view.separation<.02&&view.layers<.02;for(const mesh of d.deck)if(mesh.receiveShadow!==on)mesh.receiveShadow=on}
    // Positive angles turn clockwise seen from above.
    d.spin.forEach((node,i)=>{node.rotation.y=-p.knobs[i]});
    d.cupSpin.forEach((node,i)=>{if(node)node.rotation.y=-p.cups[i]});
    d.valves.forEach((node,i)=>{node.rotation.y=-p.valves[i]});
    d.needles.forEach(node=>{node.rotation.y=-p.gauge});
    d.segD.forEach((mat,i)=>mat.color.copy(p.segments[i]?SEG.on:SEG.off));
    d.pillJ.forEach((mat,i)=>mat.color.copy(!p.on?PILL.rest:i===p.pill?PILL.on:PILL.idle));
    d.tickH.forEach((mat,i)=>mat.color.copy(!p.on?TICK.rest:i===p.tick?TICK.on:TICK.idle));
    d.buttonMats.forEach((mat,i)=>{mat.emissiveIntensity=.3+p.levels[i]*2});
    d.lines.forEach((mat,i)=>{mat.emissiveIntensity=p.lines[i]*1.3});
    d.lcd.draw(p);d.tall.draw(p);d.touch.draw(p);
   },
  };
 },
};
