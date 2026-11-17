import type {DeviceDef} from '../kit/types';
import {assemblies,start,step,pose,SIZE,LOAD,UPRIGHT,type Pose,type State} from './model';
import {buildFrost} from './parts';

const STEEL=.9,PORTS_OUT={right:20,left:10};
const WHITE={top:0xffffff,mid:0xffffff,bottom:0xf3f4f6,horizon:.62,vignette:.02};
export const frost:DeviceDef<State,Pose>={
 slug:'frost',title:'Frost',size:`${SIZE.x} × ${SIZE.z} × ${SIZE.y} mm`,reference:'/assets/board-1-reference.png',
 assemblies,
 views:[
  {id:'hero',label:'3D',dir:[.62,.5,.7]},{id:'top',label:'Top',dir:[0,1,.0015]},{id:'side',label:'Side',dir:[1,.2,.3]},{id:'close',label:'Close',dir:[.5,.46,.74],zoom:.5},
  {id:'layers',label:'Layers',dir:[.55,.22,.8],lens:5,zoom:1.04,upright:UPRIGHT,layers:true,backdrop:WHITE,light:{environment:1.25,key:1}},
 ],
 frame:{radius:55,target:[0,12,11],explodeScale:.55,explodeLift:26,shadow:[112,124],shadowStrength:.32,exposure:1.15,environment:'studio',envRotation:[.5,0,.22],ao:{radius:2.2,intensity:1,views:['layers','close']},
  key:{dir:[.25,2.5,1.5],intensity:.72,environment:.5,shadowSize:1024},bloom:{strength:.32,radius:.5,threshold:1.4}},
 backdrop:{light:{top:0xfbfbfc,mid:0xffffff,bottom:0xeff0f2,horizon:.62,vignette:.03},dark:{top:0x080d17,mid:0x131d30,bottom:0x04060a,horizon:.6,vignette:.5}},
 inputs:[{kind:'slider',id:'load',label:'Load',min:LOAD.min,max:LOAD.max,step:5,format:v=>`${v}%`}],
 defaults:{load:LOAD.start},
 sim:{start,step,pose},
 readouts:p=>[{label:'Load',meter:p.load},{label:'Die',value:`${p.temp.toFixed(1)} °C`},{label:'Clock',value:`${p.clock.toFixed(1)} GHz`},{label:'Power',value:`${p.watts.toFixed(1)} W`}],
 build(b){
  const device=buildFrost(b);
  return {
   anchors:{heatsink:[0,22,-6],flex:[-21,6,52],header:[-4,19,-30.5],ports:[38,24,2],chips:[18,12,-15],parts:[9,14,29],board:[-38,10,28]},
   update(p,view){
    // Stamped steel mirrors the studio more strongly than the scene's even level allows: it takes the room as its own map.
    const scene=b.root.parent as import('three').Scene|null;
    if(scene?.environment)for(const m of device.mirrors){if(m.envMap!==scene.environment){m.envMap=scene.environment;m.envMapRotation.copy(scene.environmentRotation);m.needsUpdate=true}m.envMapIntensity=(view.dark?.62:1)*STEEL}
    device.leds.forEach((led,i)=>{led.lens.emissiveIntensity=p.leds[i]*2.3});
    device.ethLamps[0].emissiveIntensity=p.link*1.7;device.ethLamps[1].emissiveIntensity=p.act*2.1;
    device.screen.draw(p);device.glow.color.setScalar(p.on*1.2);
    // In the Layers view the edge connectors draw outward, left and right, clear of the card (after they have lifted, like the kit's slides).
    const q=Math.min(1,Math.max(0,(view.layers-.35)/.65)),float=q*q*(3-2*q);device.L.right.position.x+=PORTS_OUT.right*float;device.L.left.position.x-=PORTS_OUT.left*float;
   },
  };
 },
};
