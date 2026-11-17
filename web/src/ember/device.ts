import type * as THREE from 'three';
import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,POWER,type Pose,type State} from './model';
import {buildEmber} from './parts';

// Low-key and warm: a key from the upper left, a dim room, and the core as the second light.
const BACKDROP={top:0x1b1512,mid:0x15100e,bottom:0x0b0908,horizon:.6,vignette:.45};

// Layers: the board's own assemblies floated apart as flat parallel planes (offsets in model.ts), seen through a long,
// near-isometric lens on a white studio set. Nothing is added in this view; it only rearranges what is there.
const LAYERS:DeviceDef<State,Pose>['views'][number]={id:'layers',label:'Layers',dir:[-.6,.26,.76],lens:5,zoom:1.09,upright:175,layers:true,
 backdrop:{top:0xf4f5f6,mid:0xfdfdfd,bottom:0xeceef0,horizon:.6,vignette:.05},light:{environment:1.4,key:1.1}};

export const ember:DeviceDef<State,Pose>={
 slug:'ember',title:'Ember',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/board-2-reference.png',
 assemblies,
 views:[{id:'top',label:'Top',dir:[0,1,.0015]},{id:'close',label:'Close',dir:[0,1,.0015],zoom:.5},{id:'hero',label:'3D',dir:[-.46,.62,.64]},{id:'side',label:'Side',dir:[1,.34,.3]},LAYERS],
 frame:{radius:140,target:[0,4,0],explodeScale:.62,explodeLift:84,shadow:[196,280],environment:'studio',shadowStrength:.3,
  // Even, diffuse light: most of it comes from the room, with a low parallel key from the upper left for gentle modelling.
  key:{dir:[-.34,.9,-.42],intensity:.85,environment:1.1,shadowSize:1024},
  // A negative radius drops the widest glow level, so the bloom hugs the die and lines instead of fogging the board.
  bloom:{strength:.24,radius:-.25,threshold:1.5},ao:{radius:4.5,intensity:.8,views:['layers']},exposure:1.08},
 backdrop:{light:BACKDROP,dark:BACKDROP},
 inputs:[{kind:'slider',id:'power',label:'Power',min:POWER.min,max:POWER.max,step:5,format:v=>`${v}%`}],
 defaults:{power:POWER.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Core',value:`${p.temperature.toFixed(0)} °C`},{label:'Flow',value:`${p.litres.toFixed(1)} L/min`},{label:'Load',meter:p.load}],
 build(b){
  const d=buildEmber(b);let room:THREE.Texture|null=null;
  return {
   anchors:d.anchors,
   update(p,view){
    // Spill, the core lamp and contact shadows belong to parts sitting on the board: they fade as parts lift, in Exploded or Layers.
    const near=(1-Math.max(view.separation,view.layers))**2;
    // Each finish mirrors the room at its own strength (see parts.ts), so it needs the room as its own map.
    const scene=b.root.parent as THREE.Scene|null;
    if(scene&&scene.environment!==room){room=scene.environment;d.setEnvironment(room)}
    // Core: the window and die follow the glow level; the bright run chases along the circuit lines.
    d.windowMat.emissiveIntensity=.8+p.core*.75;d.dieMat.emissiveIntensity=.9+p.core*1.1;
    // The spill is painted into the surfaces round the core (emissive maps), so it fades as those surfaces lift away.
    // One soft lamp well above the die adds a little real light; it is off by the time anything rises through it.
    const spill=(.4+p.core*.8)*(.25+.75*near);
    for(const mat of d.boardMats){mat.emissiveIntensity=spill*.9;mat.aoMapIntensity=near}d.shroudMat.emissiveIntensity=spill*1.1;d.coreLight.intensity=170*(.35+p.core)*near;
    d.chase.draw(p.chase,p.chaseOn);
    // Fittings pulse in turn; the light inside each dish shows its machined steps.
    d.fitMats.forEach((mat,i)=>{mat.emissiveIntensity=i===1?.5+p.fittings[i]*1.9:.95+p.fittings[i]*1});
    d.hot.emissiveIntensity=.5+Math.max(p.fittings[0],p.fittings[3])*1.9;
    d.dotMats.forEach((mat,i)=>{mat.emissiveIntensity=.3+p.dots[i]*1.9});
    d.fanMat.emissiveIntensity=.7+p.core*.9;
    // Heat runs along the pipes as a warm band.
    d.pulse.offset.x=-p.flow;d.pipeMat.emissiveIntensity=p.pipes*.8;
    d.ledMats.forEach((g,i)=>{g.amber.emissiveIntensity=.2+p.leds[i]*1.6;g.red.emissiveIntensity=.2+p.leds[(i+1)%4]*1.8});
    d.lampLens.emissiveIntensity=.45+p.leds[2]*1.1;
    d.portLamps.forEach((mat,i)=>{mat.emissiveIntensity=i<3?.2+p.leds[(i+1)%4]*1.8:.2+p.leds[1]*1.6});
    d.memGlow.emissiveIntensity=.35+p.leds[0]*.5+p.core*.5;
   },
  };
 },
};
