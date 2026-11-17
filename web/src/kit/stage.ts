import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {studioRoom} from './studio';
import {paint} from './backdrop';
import {glossFloor} from './floor';
import {emittersOnly} from './glow';
import {makeMaterials} from './materials';
import {makeBuilder} from './builder';
import {smooth,spread} from './util';
import type {DeviceDef} from './types';

export type Frame<P>={separation:number;selected:string|null;pose:P;dark:boolean};
export type Stage=ReturnType<typeof makeStage>;

const FOV=22;
const BACKDROP:{light:number;dark:number}={light:0xf8f9f7,dark:0x181c17};

export function makeStage<S,P>(el:HTMLElement,def:DeviceDef<S,P>,onSelect:(id:string)=>void,reduced:boolean){
 const {frame}=def,R=frame.radius,home=new THREE.Vector3(...frame.target),backdrop=def.backdrop??BACKDROP;
 // With a glow or shading pass the scene is drawn into the composer's own multisampled target, so the canvas needs no multisampling
 // of its own (that would be a second, unused full-screen MSAA buffer).
 const renderer=new THREE.WebGLRenderer({antialias:!(frame.bloom||frame.ao),powerPreference:'high-performance'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=frame.exposure??1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 let tier=matchMedia('(max-width: 700px)').matches?1:0;
 renderer.setPixelRatio(Math.min(devicePixelRatio,tier?1.5:2));
 const canvas=renderer.domElement;el.appendChild(canvas);
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Interactive 3D ${def.title}. Drag to orbit, scroll to zoom, click a part to select it.`);

 const scene=new THREE.Scene();const backgrounds={light:paint(backdrop.light),dark:paint(backdrop.dark)};scene.background=backgrounds.light;
 const viewBackgrounds=Object.fromEntries(def.views.filter(v=>v.backdrop!==undefined).map(v=>[v.id,paint(v.backdrop!)]));
 // A prefiltered studio room lights every surface and gives glass and chrome something to reflect.
 const pmrem=new THREE.PMREMGenerator(renderer);const studio=frame.environment==='studio';
 const room=studio?studioRoom():(r=>({scene:r as THREE.Scene,dispose:()=>r.dispose()}))(new RoomEnvironment());
 const environment=pmrem.fromScene(room.scene,studio?.02:.035);scene.environment=environment.texture;pmrem.dispose();
 // In the default room the bright ceiling panel is tilted away, so it is not mirrored straight back at a top camera.
 scene.environmentRotation.set(...(frame.envRotation??(studio?[0,0,0]:[Math.PI/2,0,0])));

 const spot=frame.key?.spot,keyReach=R*(spot?.distance??3.05);
 const keyDir=new THREE.Vector3(...(frame.key?.dir??[-1.15,2.5,1.3])).normalize().multiplyScalar(keyReach),keyLevel=frame.key?.intensity??2.3,envLevel=frame.key?.environment??1;
 // A spot key is a lamp at a finite distance: its strength is set so the target is lit as brightly as the parallel key would light it.
 const keyStrength=spot?keyLevel*keyReach*keyReach:keyLevel;
 const key:THREE.DirectionalLight|THREE.SpotLight=spot?new THREE.SpotLight(0xfffaf2,keyStrength,0,THREE.MathUtils.degToRad(spot.angle??26),spot.penumbra??.6,2):new THREE.DirectionalLight(0xfffaf2,keyStrength);
 key.position.copy(home).add(keyDir);key.target.position.copy(home);scene.add(key.target);key.castShadow=true;
 const shadowSize=frame.key?.shadowSize??2048;key.shadow.mapSize.setScalar(tier?Math.min(1024,shadowSize):shadowSize);key.shadow.bias=-.0003;key.shadow.normalBias=R*.0035;
 const cookie=spot?.cookie?.()??null;
 if((key as THREE.SpotLight).isSpotLight){Object.assign(key.shadow.camera,{near:Math.max(R*.2,keyReach-R*3),far:keyReach+R*4});if(cookie)(key as THREE.SpotLight).map=cookie}
 else Object.assign(key.shadow.camera,{left:-R*2,right:R*2,top:R*2.6,bottom:-R*2,near:R*.2,far:R*8});
 scene.add(key);
 const keyHome=key.position.clone(),envBase=scene.environmentRotation.x;let lightTilt=0;
 const rim=new THREE.DirectionalLight(0xdfeaff,.7);rim.position.set(R*1.5,R*1.1,-R*1.6);scene.add(rim);
 const floorMaterial=new THREE.ShadowMaterial({opacity:frame.shadowStrength??.12,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(R*30,R*30),floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor);
 // A soft blob under the device stands in for the shadow that clear parts barely cast.
 const blob=document.createElement('canvas');blob.width=blob.height=256;
 {const g=blob.getContext('2d')!,fade=g.createRadialGradient(128,128,40,128,128,128);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(.6,'rgba(0,0,0,.75)');fade.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=fade;g.fillRect(0,0,256,256)}
 const blobTexture=new THREE.CanvasTexture(blob);
 const contactMaterial=new THREE.MeshBasicMaterial({map:blobTexture,color:0x1c2733,transparent:true,opacity:.09,depthWrite:false,toneMapped:false});
 const [shadowW,shadowD]=frame.shadow??[R*2.05,R*1.9];
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(shadowW,shadowD),contactMaterial);contact.rotation.x=-Math.PI/2;contact.position.set(home.x+R*.05,-.02,home.z-R*.04);scene.add(contact);

 const gloss=frame.reflection&&!tier?glossFloor(renderer,R,[home.x,home.z],[floor,contact]):null;if(gloss)scene.add(gloss.mirror);

 const materials=makeMaterials();if(tier)materials.setTransmission(false);
 const builder=makeBuilder(materials,def.assemblies);const built=def.build(builder);scene.add(builder.root);
 // With a glow pass, only emitters may cross its threshold (see glow.ts).
 if(frame.bloom)emittersOnly(builder.root,frame.bloom.threshold*.92);
 const pickable:THREE.Object3D[]=[];builder.root.traverse(o=>{if((o as THREE.Mesh).isMesh&&o.userData.asm)pickable.push(o)});
 const byId=Object.fromEntries(def.assemblies.map(a=>[a.id,a]));const lastOrder=Math.max(...def.assemblies.map(a=>a.order));

 const camera=new THREE.PerspectiveCamera(FOV,1,R*.1,R*40);
 const orbit=new OrbitControls(camera,canvas);orbit.enableDamping=!reduced;orbit.dampingFactor=.09;orbit.enablePan=false;orbit.maxPolarAngle=Math.PI*.495;orbit.target.copy(home);
 let width=0,height=0,zoomScale=1,shown=0,layered=0,stood=0,standHeight=0,view=def.views[0].id;
 const viewOf=(id:string)=>def.views.find(v=>v.id===id)??def.views[0];
 camera.fov=viewOf(view).lens??FOV;
 let fly:{from:THREE.Vector3;to:THREE.Vector3;t:number}|null=null;
 // Distance at which the assembled device fills about two thirds of the viewport.
 const half=(fov:number)=>Math.tan(THREE.MathUtils.degToRad(fov/2));
 const fit=()=>{const t=half(camera.fov);return Math.max(R/t,R*1.15/(t*camera.aspect))};
 const limits=()=>{orbit.minDistance=fit()*.2;orbit.maxDistance=fit()*4};
 const resize=()=>{
  const w=el.clientWidth,h=el.clientHeight;if(!w||!h||(w===width&&h===height))return;
  // Keep the device framed when the viewport changes shape.
  const before=width?fit():0;
  width=w;height=h;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);limits();resized?.(w,h);
  if(before){const k=fit()/before;camera.position.sub(orbit.target).multiplyScalar(k).add(orbit.target);if(fly){fly.from.multiplyScalar(k);fly.to.multiplyScalar(k)}}
 };
 let resized:((w:number,h:number)=>void)|null=null;
 const observer=new ResizeObserver(resize);observer.observe(el);resize();
 const place=(id:string)=>{const v=def.views.find(v=>v.id===id)??def.views[0];return new THREE.Vector3(...v.dir).normalize().multiplyScalar(fit()*zoomScale*(v.zoom??1))};
 camera.position.copy(orbit.target).add(place(view));camera.lookAt(orbit.target);
 function setView(id:string){
  view=id;const from=camera.position.clone().sub(orbit.target);
  if(reduced){camera.position.copy(orbit.target).add(place(id));orbit.update();return}
  fly={from,to:place(id),t:0};
 }
 orbit.addEventListener('start',()=>{fly=null});

 let down={x:0,y:0};const ray=new THREE.Raycaster();
 const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
 const pointerup=(e:PointerEvent)=>{
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;
  const box=canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera);
  const hits=ray.intersectObjects(pickable,false).filter(h=>{let o:THREE.Object3D|null=h.object;while(o){if(!o.visible)return false;o=o.parent}return true}).map(h=>h.object.userData.asm as string);
  // A clear shell covers everything, so prefer whatever lies inside it.
  const id=hits.find(h=>h!==def.shell)??hits[0];if(id)onSelect(id);
 };
 canvas.addEventListener('pointerdown',pointerdown);canvas.addEventListener('pointerup',pointerup);

 // Optional glow pass. The scene renders to a multisampled float target, blooms, then tone-maps once at the end.
 let composer:EffectComposer|null=null,bloom:UnrealBloomPass|null=null,aoPass:GTAOPass|null=null;
 if((frame.bloom||frame.ao)&&tier<2){
  const target=new THREE.WebGLRenderTarget(Math.max(1,width),Math.max(1,height),{type:THREE.HalfFloatType,samples:4});
  composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));
  if(frame.ao&&!tier){const ao=new GTAOPass(scene,camera,Math.max(1,width),Math.max(1,height));ao.blendIntensity=frame.ao.intensity??1;ao.updateGtaoMaterial({radius:frame.ao.radius,distanceExponent:1.4,thickness:1.2,scale:1.1,samples:16});composer.addPass(ao);aoPass=ao}
  if(frame.bloom){bloom=new UnrealBloomPass(new THREE.Vector2(Math.max(1,width),Math.max(1,height)),frame.bloom.strength,frame.bloom.radius,frame.bloom.threshold);composer.addPass(bloom)}
  composer.addPass(new OutputPass());composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(Math.max(1,width),Math.max(1,height));
 }
 resized=(w,h)=>{composer?.setPixelRatio(renderer.getPixelRatio());composer?.setSize(w,h)};
 let lit:string|null=null,disposed=false;let lastSig='',settle=0,skipped=0,idle=0;const alwaysDraw=location.search.includes('draw=always');let floorShade=0,contactShade=0;const projected=new THREE.Vector3();

 function draw(f:Frame<P>,dt:number){
  resize();
  // A view with its own backdrop is a lit studio set whatever the theme.
  const now=viewOf(view),own=viewBackgrounds[view],dark=f.dark&&!own,state=`${dark}|${view}`;
  if(state!==lit){
   lit=state;scene.background=own??(dark?backgrounds.dark:backgrounds.light);scene.backgroundIntensity=own?Math.min(1.1/renderer.toneMappingExposure,frame.bloom?frame.bloom.threshold*.9:9):1;if(aoPass)aoPass.enabled=!frame.ao?.views||frame.ao.views.includes(view);gloss?.setStrength((frame.reflection??0)*(dark?.7:1));
   // Floating planes throw many small shadows on the floor, so they are kept faint in a Layers view.
   floorShade=(frame.shadowStrength??.12)*(dark?3.3:1)*(now.layers?.35:1);contactShade=dark?.45:.09;scene.environmentIntensity=envLevel*(dark?.62:1)*(now.light?.environment??1);key.intensity=keyStrength*(dark?.74:1)*(now.light?.key??1);
  }
  materials.setFocus(f.selected);

  // Separation eases from wherever it is, so a change of mind mid-move never snaps.
  shown=reduced?f.separation:shown+(f.separation-shown)*(1-Math.exp(-dt/.2));
  if(Math.abs(shown-f.separation)<.0005)shown=f.separation;
  const wantLayers=now.layers?1:0;layered=reduced?wantLayers:layered+(wantLayers-layered)*(1-Math.exp(-dt/.3));if(Math.abs(layered-wantLayers)<.001)layered=wantLayers;
  // Rise first, then slide (and slide back before settling), so a plane never sweeps through its taller neighbours.
  // Standing up: the device turns about its long axis onto its lower edge and rises clear of the floor.
  const wantStand=now.upright?1:0;if(now.upright)standHeight=now.upright;
  stood=reduced?wantStand:stood+(wantStand-stood)*(1-Math.exp(-dt/.32));if(Math.abs(stood-wantStand)<.001)stood=wantStand;
  const tilt=smooth(stood)*Math.PI/2;{const down=1-smooth(stood);floorMaterial.opacity=floorShade*down;contactMaterial.opacity=contactShade*down} // a stood-up device is lit from the front, so it throws no floor shadow
  builder.root.rotation.x=tilt;builder.root.position.set(0,standHeight*smooth(stood),0);
  // The studio turns with the device, so a stood-up face is lit and shadowed exactly as it is lying flat.
  if(tilt!==lightTilt){lightTilt=tilt;const c=Math.cos(tilt),n=Math.sin(tilt),rise=standHeight*smooth(stood),turn=(v:THREE.Vector3,out:THREE.Vector3)=>out.set(v.x,v.y*c-v.z*n+rise,v.y*n+v.z*c);
   turn(keyHome,key.position);turn(home,key.target.position);scene.environmentRotation.x=envBase+tilt}
  const float=smooth(Math.min(1,layered*1.7)),slide=smooth(Math.max(0,(layered-.35)/.65));
  for(const a of def.assemblies){const s=spread(shown,a.order,lastOrder),l=a.layer??[0,0,0];builder.groups[a.id].position.set(a.move[0]*s+l[0]*slide,a.move[1]*s+l[1]*float,a.move[2]*s+l[2]*slide)}
  for(const mover of builder.movers)mover.node.position.copy(mover.base).addScaledVector(mover.lift,spread(shown,byId[mover.asm].order,lastOrder));
  built.update(f.pose,{separation:shown,dark,layers:layered,view});

  // Pull back and look higher as the stack opens.
  const s=smooth(shown),scale=1+frame.explodeScale*s,offset=camera.position.clone().sub(orbit.target);
  // The lens eases toward the view's; distance changes with it so the device keeps its size on screen.
  const lens=now.lens??FOV;
  if(camera.fov!==lens){
   const next=reduced||Math.abs(camera.fov-lens)<.02?lens:camera.fov+(lens-camera.fov)*(1-Math.exp(-dt/.22)),k=half(camera.fov)/half(next);
   camera.fov=next;offset.multiplyScalar(k);if(fly){fly.from.multiplyScalar(k);fly.to.multiplyScalar(k)}limits();camera.updateProjectionMatrix();
  }
  if(fly){
   fly.t=Math.min(1,fly.t+dt/.75);const e=smooth(fly.t);
   offset.copy(fly.from).lerp(fly.to,e).setLength(fly.from.length()+(fly.to.length()-fly.from.length())*e);
   if(fly.t>=1)fly=null;
  }else if(scale!==zoomScale)offset.multiplyScalar(scale/zoomScale);
  if(fly&&scale!==zoomScale){fly.from.multiplyScalar(scale/zoomScale);fly.to.multiplyScalar(scale/zoomScale)}
  zoomScale=scale;{const up=home.y+frame.explodeLift*s;orbit.target.set(home.x,up*Math.cos(tilt)-home.z*Math.sin(tilt)+standHeight*smooth(stood),up*Math.sin(tilt)+home.z*Math.cos(tilt))}camera.position.copy(orbit.target).add(offset);orbit.update();
  // A long lens stands far back: keep the depth range tight round the device.
  const reach=camera.position.distanceTo(orbit.target),near=Math.max(R*.1,reach-R*14),far=Math.max(R*40,reach+R*30);
  if(Math.abs(near-camera.near)>R*.01||far!==camera.far){camera.near=near;camera.far=far;camera.updateProjectionMatrix()}

  // Draw only when something on screen can have changed: the camera, an easing, the theme or selection, the size, or the pose.
  // A still scene then costs almost nothing, instead of two or three full renders (scene, mirror, glow) sixty times a second.
  const e=camera.matrixWorld.elements,poseKey=JSON.stringify(f.pose);
  const sig=`${e[0].toFixed(5)},${e[1].toFixed(5)},${e[2].toFixed(5)},${e[4].toFixed(5)},${e[5].toFixed(5)},${e[6].toFixed(5)},${e[12].toFixed(3)},${e[13].toFixed(3)},${e[14].toFixed(3)}|${camera.fov.toFixed(3)}|${shown.toFixed(4)}|${layered.toFixed(4)}|${stood.toFixed(4)}|${f.selected}|${lit}|${width}x${height}|${poseKey}`;
  // A still scene is still redrawn twice a second, so a late change outside the pose (a font arriving, a texture redrawn) always shows.
  idle+=dt;if(sig===lastSig&&settle>2&&idle<.5&&!alwaysDraw)skipped++;
  else{if(sig!==lastSig)settle=0;settle++;idle=0;lastSig=sig;if(composer)composer.render(dt);else renderer.render(scene,camera)}
  const a=f.selected?byId[f.selected]:null,p=a&&built.anchors[a.id];if(!a||!p)return null;
  const k=spread(shown,a.order,lastOrder);
  const l=a.layer??[0,0,0];projected.set(p[0]+a.move[0]*k+l[0]*slide,p[1]+a.move[1]*k+l[1]*float,p[2]+a.move[2]*k+l[2]*slide).applyMatrix4(builder.root.matrixWorld).project(camera);
  return {x:(projected.x+1)*width/2,y:(1-projected.y)*height/2};
 }
 function qualityDown(){
  if(tier>=2)return;tier++;
  renderer.setPixelRatio(Math.min(devicePixelRatio,tier===1?1.5:1));materials.setTransmission(false);
  key.shadow.mapSize.setScalar(Math.min(1024,shadowSize));key.shadow.map?.dispose();key.shadow.map=null;if(gloss)gloss.mirror.visible=false;width=0;resize();
 }
 function dispose(){
  disposed=true;observer.disconnect();orbit.dispose();
  canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointerup',pointerup);
  scene.traverse(o=>{const g=(o as THREE.Mesh).geometry;if(g)g.dispose()});
  gloss?.dispose();composer?.dispose();[...Object.values(backgrounds),...Object.values(viewBackgrounds)].forEach(b=>{if((b as THREE.Texture).isTexture)(b as THREE.Texture).dispose()});
  cookie?.dispose();materials.dispose();floorMaterial.dispose();contactMaterial.dispose();blobTexture.dispose();environment.dispose();room.dispose();renderer.dispose();canvas.remove();
 }
 const ready=renderer.compileAsync(scene,camera).then(()=>{if(disposed)throw new Error('disposed')});
 // Large canvas textures (board print tiles and the like) are drawn once. After they are on the GPU the canvas behind each one is a
 // second full copy, often in GPU memory too, so free it. A texture redrawn later is never released (small displays are below the size
 // floor), and a release that turns out wrong reports itself instead of silently showing an empty texture.
 const release=()=>{
  if(disposed)return;const seen=new Set<THREE.Texture>();let freed=0,big=0;
  scene.traverse(o=>{const mat=(o as THREE.Mesh).material;if(!mat)return;for(const m of [mat].flat())for(const v of Object.values(m))if((v as THREE.Texture)?.isTexture)seen.add(v as THREE.Texture)});
  for(const t of seen){
   const img=t.image as HTMLCanvasElement|undefined;if(!(img instanceof HTMLCanvasElement)||img.width*img.height<2e6)continue;big++;if(t.version!==settledVersion.get(t))continue;
   if(!(renderer.properties.get(t) as {__webglTexture?:unknown}).__webglTexture)continue;
   img.width=img.height=1;freed++;
   Object.defineProperty(t,'needsUpdate',{configurable:true,set(){console.error(`A released texture was redrawn (${t.name||'unnamed'}); keep its canvas.`)}});
  }
  if(import.meta.env.DEV)console.debug(`[stage] released ${freed} of ${big} large canvases`);
 };
 // A texture counts as settled when its version is unchanged across two looks a few seconds apart (fonts loaded, any late redraw done).
 const settledVersion=new Map<THREE.Texture,number>();
 const note=()=>scene.traverse(o=>{const mat=(o as THREE.Mesh).material;if(!mat)return;for(const m of [mat].flat())for(const v of Object.values(m))if((v as THREE.Texture)?.isTexture){const t=v as THREE.Texture,was=settledVersion.get(t);settledVersion.set(t,was===undefined||was===t.version?t.version:-1)}});
 ready.then(()=>document.fonts.ready).then(()=>{setTimeout(()=>{note();setTimeout(()=>{note();release()},4000)},2000)}).catch(()=>{});
 return {ready,draw,setView,qualityDown,dispose,renderer,count:builder.count,get view(){return view},get skipped(){return skipped},get separation(){return shown}};
}
