import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {geometry,cameras,tourAt,parts,type Controls,type Sample,type Part,type View} from './model';

// The existing millimetre model uses Z up. Rotate it into a Y-up studio.
const vector=(v:number[])=>new THREE.Vector3(-v[1],v[2],v[0]);
const point=(v:number[])=>vector(v).add(new THREE.Vector3(0,-4,0));
const colors:Record<string,number>={green:0x5c6b45,metal:0xabb0a0,battery:0x29392f,rubber:0x202b25,pcb:0x3f5842,brass:0xbaa176};
const ink=0x29362a;
function transformGeometry(geo:THREE.BufferGeometry,matrix:THREE.Matrix4){
 geo.applyMatrix4(matrix);
 // The Z-up to Y-up mapping reflects X: keep front faces and normals aligned.
 if(matrix.determinant()<0){const count=geo.index?.count??geo.attributes.position.count;const indices=geo.index?Array.from(geo.index.array):Array.from({length:count},(_,i)=>i);for(let i=0;i<count;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geo.setIndex(indices)}
}
function texture(kind:'top'|'side'|'front'|'board'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
 const ctx=canvas.getContext('2d')!;
 ctx.clearRect(0,0,1024,1024);
 ctx.strokeStyle=kind==='board'?'#c1b67c':'#b7be8b';ctx.lineWidth=2;ctx.globalAlpha=.55;
 for(let i=0;i<38;i++){
  const x=36+(i*137)%925,y=32+(i*79)%920,dx=25+(i%5)*16,dy=12+(i%3)*15;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y);ctx.lineTo(x+dx+dy,y+dy);ctx.lineTo(x+dx+dy,y+dy+24);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.stroke();
 }
 ctx.globalAlpha=1;
 for(const x of [35,989])for(const y of [35,989]){
  ctx.fillStyle='#26312a';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b3b79d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.stroke();
 }
 ctx.font='24px monospace';ctx.fillStyle='#ced1b0';
 if(kind==='top'){
  ctx.fillText('ABSURD DEVICES',550,165);ctx.font='16px monospace';ctx.fillText('XNOS / FIELD UNIT 01',550,199);
  ctx.fillStyle='#2e3c2b';for(let i=0;i<11;i++)ctx.fillRect(100+i*22,130,10,260);
  ctx.fillStyle='#a9be72';ctx.fillRect(795,340,90,13);
  ctx.strokeStyle='#bcc29e';ctx.strokeRect(490,460,330,270);ctx.font='38px monospace';ctx.fillStyle='#d3d5b9';ctx.fillText('XN—42',557,610);
 } else if(kind==='side'){
  ctx.fillText('BIOLOGICAL FIELD INTERFACE',72,115);
  ctx.fillStyle='#283727';for(let i=0;i<5;i++)ctx.fillRect(80,155+i*23,400,10);
  ctx.font='17px monospace';ctx.fillStyle='#ced1b0';ctx.fillText('ACOUSTIC OUTPUT  /  01',85,930);
 } else if(kind==='front'){
  ctx.fillStyle='#bca474';for(let i=0;i<3;i++){
   const x=340+i*170;ctx.beginPath();ctx.arc(x,908,28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e1ce9a';ctx.lineWidth=3;ctx.stroke();
  }
  ctx.fillStyle='#4d4b35';ctx.font='25px monospace';ctx.fillText('I',333,917);ctx.fillText('•',502,917);ctx.fillText('↗',669,917);
 }
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}
function drawScreen(ctx:CanvasRenderingContext2D,s:Sample){
 const w=768,h=680;ctx.fillStyle='#14271f';ctx.fillRect(0,0,w,h);
 const grad=ctx.createRadialGradient(260,250,30,350,340,500);grad.addColorStop(0,'#294333');grad.addColorStop(1,'#101e18');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#b7d49b';ctx.font='24px monospace';ctx.fillText('X—42 / FLORA',35,45);ctx.font='15px monospace';ctx.fillText('● SCANNING',590,44);
 // A botanical silhouette, reconstructed from the supplied display reference.
 ctx.strokeStyle='#96bd86';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(235,553);ctx.bezierCurveTo(195,400,255,285,225,136);ctx.stroke();
 for(let i=0;i<10;i++){
  const y=500-i*34,dir=i%2?1:-1,len=58+(i%3)*15;
  ctx.fillStyle=i%2?'#88ad79':'#5f896b';ctx.beginPath();ctx.moveTo(230,y);ctx.bezierCurveTo(230+dir*len,y+12,230+dir*(len+21),y-48,230+dir*(len-8),y-74);ctx.bezierCurveTo(230+dir*10,y-52,223,y-15,230,y);ctx.fill();
  ctx.strokeStyle='#bfd3a4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(230,y);ctx.quadraticCurveTo(230+dir*len*.65,y-34,230+dir*(len-8),y-74);ctx.stroke();
 }
 ctx.strokeStyle='#709069';ctx.lineWidth=2;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(235,545);ctx.quadraticCurveTo(230+i*13,565,235+i*21,600);ctx.stroke();}
 const stats=[['VITALITY',s.vitality+'%'],['TOXICITY',String(s.toxicity)],['GROWTH',s.growth.toFixed(2)],['ABSORPTION',s.absorption+'%']];
 stats.forEach(([name,val],i)=>{
  const y=145+i*110;ctx.font='17px monospace';ctx.fillStyle='#86aa7c';ctx.fillText(name,445,y);ctx.font='29px monospace';ctx.fillStyle='#d0dfb4';ctx.fillText(val,445,y+39);
  for(let j=0;j<15;j++){ctx.fillStyle=j<Number.parseFloat(val)/7?'#8cbb78':'#354735';ctx.fillRect(445+j*16,y+53,11,7);}
 });
 const sy=80+s.phase*500;ctx.fillStyle='rgba(185,227,155,.1)';ctx.fillRect(25,sy-15,718,30);ctx.fillStyle='#c0db99';ctx.fillRect(25,sy,718,2);
 ctx.font='16px monospace';ctx.fillStyle=s.stress>0?'#e2b078':'#a7c590';ctx.fillText('> '+s.status,35,642);
 ctx.fillStyle='rgba(0,0,0,.12)';for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);
}
export type Stage=ReturnType<typeof makeStage>;
export function makeStage(container:HTMLElement,onSelect:(id:Part)=>void,onStatus:(ready:boolean,tier:string)=>void){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f0f1ea');
 const camera=new THREE.OrthographicCamera(-200,200,150,-150,.1,2500);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:new URLSearchParams(location.search).has('capture')});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.localClippingEnabled=true;
 const small=matchMedia('(max-width: 700px)').matches;
 let tier=small?1:0;const tiers=[{dpr:1.65,shadow:1024,panels:1},{dpr:1.15,shadow:512,panels:2},{dpr:1,shadow:256,panels:3}];
 renderer.setPixelRatio(Math.min(devicePixelRatio,tiers[tier].dpr));
 container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive 3D XNOS Flora; drag to orbit, scroll to zoom. Use camera and component buttons for keyboard control.');renderer.domElement.setAttribute('role','img');
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=false;orbit.enablePan=false;orbit.minZoom=.55;orbit.maxZoom=2.6;orbit.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight(0xffffff,0x777d67,2.5));
 const key=new THREE.DirectionalLight(0xfffae9,3.6);key.position.set(-160,320,230);key.castShadow=true;key.shadow.mapSize.setScalar(tiers[tier].shadow);key.shadow.camera.left=-250;key.shadow.camera.right=250;key.shadow.camera.top=260;key.shadow.camera.bottom=-220;key.shadow.camera.near=10;key.shadow.camera.far=750;key.shadow.bias=-.0004;key.shadow.normalBias=.45;key.shadow.intensity=.35;scene.add(key);
 const rim=new THREE.DirectionalLight(0xe0eadb,1.5);rim.position.set(220,160,-200);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:0xf0f1ea,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(640,32,0xc2c9b9,0xdce0d4);grid.position.y=-.8;(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.42;scene.add(grid);
 const root=new THREE.Group();scene.add(root);
 const groups=Object.fromEntries(parts.map(p=>[p.id,new THREE.Group()])) as Record<Part,THREE.Group>;
 Object.entries(groups).forEach(([id,g])=>{g.name=id;root.add(g)});
 const meshes:THREE.Mesh[]=[];const detailMaterials:THREE.MeshBasicMaterial[]=[];const cut=new THREE.Plane(new THREE.Vector3(0,0,-1),10);
 for(const part of geometry.parts){
  const shape=part.shape;const f=shape.F;let geo:THREE.BufferGeometry;
  if(shape.kind==='body'){
   geo=new THREE.LatheGeometry(shape.poly.map(p=>new THREE.Vector2(p[1],p[0])),64);
   // Lathe's Y axis is the original body's a vector.
   const mat=new THREE.Matrix4().makeBasis(vector(f.u),vector(f.a),vector(f.v).negate());mat.setPosition(point(f.o));transformGeometry(geo,mat);
  } else {
   const path=new THREE.Shape(shape.poly.map(p=>new THREE.Vector2(p[0],p[1])));
   const s=shape as typeof shape & {s0:number;s1:number};
   geo=new THREE.ExtrudeGeometry(path,{depth:s.s1-s.s0,bevelEnabled:false,steps:1});
   const mat=new THREE.Matrix4().makeBasis(vector(f.u),vector(f.v),vector(f.a));mat.setPosition(point(f.o).addScaledVector(vector(f.a),s.s0));transformGeometry(geo,mat);
  }
  const material=new THREE.MeshStandardMaterial({color:colors[part.material]??colors.green,roughness:part.material==='rubber'?.38:.6,metalness:['brass','metal'].includes(part.material)?.55:.16,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={id:part.piece,base:material.color.clone(),name:part.name};meshes.push(mesh);groups[part.piece as Part].add(mesh);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:.25}));edges.userData.edge=true;mesh.add(edges);
 }
 function plane(id:Part,w:number,h:number,pos:number[],rotation:number[],map:THREE.Texture){
  const mat=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1});detailMaterials.push(mat);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);mesh.position.set(pos[0],pos[1],pos[2]);mesh.rotation.set(rotation[0],rotation[1],rotation[2]);mesh.userData={id,decoration:true};groups[id].add(mesh);return mesh;
 }
 plane('receiver',120,120,[0,120.03,0],[-Math.PI/2,0,0],texture('top'));
 plane('audio',115,114,[-60.03,61,1],[0,-Math.PI/2,0],texture('side'));
 plane('display',120,114,[0,61,60.03],[0,0,0],texture('front'));
 plane('processor',90,101,[6,71.3,0],[-Math.PI/2,0,Math.PI/2],texture('board'));
 const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=680;const screenCtx=screenCanvas.getContext('2d')!;
 const screenTexture=new THREE.CanvasTexture(screenCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;
 // Flush glass overlays the original display face, within the design envelope.
 const bezel=new THREE.Mesh(new THREE.PlaneGeometry(105,91),new THREE.MeshStandardMaterial({color:0x19251f,roughness:.4}));bezel.position.set(0,68,60.05);groups.display.add(bezel);
 plane('display',98,85,[0,68,60.08],[0,0,0],screenTexture);
 const grilleCanvas=document.createElement('canvas');grilleCanvas.width=512;grilleCanvas.height=512;const gc=grilleCanvas.getContext('2d')!;
 gc.fillStyle='#917044';gc.beginPath();gc.arc(256,256,248,0,Math.PI*2);gc.fill();gc.strokeStyle='#d1b884';gc.lineWidth=10;gc.stroke();gc.fillStyle='#263126';
 for(let y=-210;y<=210;y+=26)for(let x=-210;x<=210;x+=26)if(Math.hypot(x,y)<218){gc.beginPath();gc.arc(256+x,256+y,6.7,0,Math.PI*2);gc.fill()}
 const grilleTex=new THREE.CanvasTexture(grilleCanvas);grilleTex.colorSpace=THREE.SRGBColorSpace;
 plane('audio',68,68,[-60.08,52.7,6.19],[0,-Math.PI/2,0],grilleTex);
 const led=new THREE.Mesh(new THREE.BoxGeometry(12,.4,3),new THREE.MeshStandardMaterial({color:0xb7d781,emissive:0x799c42,emissiveIntensity:.4}));led.position.set(27,120.2,-31);groups.receiver.add(led);
 const targets:Record<Part,THREE.Vector3>={receiver:new THREE.Vector3(0,120,0),display:new THREE.Vector3(0,68,61),processor:new THREE.Vector3(0,72,0),audio:new THREE.Vector3(-60,53,6),power:new THREE.Vector3(2,24,-17),chassis:new THREE.Vector3(53,20,-52)};
 let width=1,height=1,view:View='hero',previousStyle='',frame=0,disposed=false,manualZoom=1;
 const resize=()=>{const nextWidth=container.clientWidth,nextHeight=container.clientHeight;if(width===nextWidth&&height===nextHeight)return;width=nextWidth;height=nextHeight;const extent=142;camera.left=-extent*width/height;camera.right=extent*width/height;camera.top=extent;camera.bottom=-extent;camera.updateProjectionMatrix();renderer.setSize(width,height,false)};
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 const setCamera=(name:View)=>{const c=cameras[name];camera.position.fromArray(c.position);orbit.target.fromArray(c.target);camera.lookAt(orbit.target);orbit.update();view=name;manualZoom=1};setCamera('hero');
 let down={x:0,y:0};const pointerdown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
 const ray=new THREE.Raycaster();const pointerup=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const box=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1),camera);const hits=ray.intersectObjects(meshes).filter(h=>h.object.parent?.visible);if(hits[0])onSelect(hits[0].object.userData.id)};
 renderer.domElement.addEventListener('pointerdown',pointerdown);renderer.domElement.addEventListener('pointerup',pointerup);
 orbit.addEventListener('change',()=>{manualZoom=camera.zoom});
 const ready=(async()=>{
  await renderer.compileAsync(scene,camera);
  const mats=[...meshes.map(m=>m.material as THREE.MeshStandardMaterial),...detailMaterials];
  const original=mats.map(m=>({transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite}));
  for(const mode of ['xray','section']){
   mats.forEach((m,i)=>{m.transparent=mode==='xray'||original[i].transparent;m.opacity=mode==='xray'?.2:original[i].opacity;m.depthWrite=mode==='xray'?false:original[i].depthWrite;m.clippingPlanes=mode==='section'?[cut]:null;m.needsUpdate=true});
   await renderer.compileAsync(scene,camera);
  }
  mats.forEach((m,i)=>{Object.assign(m,original[i]);m.clippingPlanes=null;m.needsUpdate=true});
  if(!disposed){renderer.render(scene,camera);onStatus(true,['High','Balanced','Low'][tier])}
 })();
 function draw(s:Sample,c:Controls,tourTime?:number,force=false){
  resize();frame++;
  if(tourTime!==undefined){
   const tour=tourAt(tourTime);
   const prior=timelinePrevious(tour.index);const from=cameras[prior];const to=cameras[c.view];
   camera.position.fromArray(from.position).lerp(new THREE.Vector3().fromArray(to.position),tour.blend);orbit.target.fromArray(from.target).lerp(new THREE.Vector3().fromArray(to.target),tour.blend);
   camera.zoom=1/(1+c.separation*.2);camera.updateProjectionMatrix();camera.lookAt(orbit.target);view=c.view;
  }else if(c.view!==view)setCamera(c.view);
  for(const meta of parts){const id=meta.id as Part;groups[id].position.copy(vector(meta.move)).multiplyScalar(c.separation);groups[id].visible=!c.isolated||!c.selected||c.selected===id}
  const style=c.mode+'-'+c.selected+'-'+c.isolated;
  if(style!==previousStyle){
   meshes.forEach(mesh=>{
    const mat=mesh.material as THREE.MeshStandardMaterial;const active=mesh.userData.id===c.selected;const shell=['receiver.lid','audio.side-cover','display.face','chassis.rear','chassis.far'].includes(mesh.userData.name);
    mat.color.copy(mesh.userData.base);if(active)mat.color.lerp(new THREE.Color(0x9aaf65),.22);
    mat.emissive.set(active?0x334a1b:0x000000);mat.emissiveIntensity=active?.12:0;
    mat.transparent=c.mode==='xray';mat.opacity=c.mode==='xray'?(shell?.16:.78):1;mat.depthWrite=c.mode!=='xray';mat.clippingPlanes=c.mode==='section'?[cut]:null;mat.needsUpdate=true;
    mesh.children.forEach(edge=>{const m=(edge as THREE.LineSegments).material as THREE.LineBasicMaterial;m.clippingPlanes=c.mode==='section'?[cut]:null;m.opacity=c.mode==='xray'?.3:.25});
   });
   detailMaterials.forEach(mat=>{mat.opacity=c.mode==='xray'?.18:1;mat.clippingPlanes=c.mode==='section'?[cut]:null;mat.needsUpdate=true});
   (bezel.material as THREE.MeshStandardMaterial).clippingPlanes=c.mode==='section'?[cut]:null;bezel.visible=c.mode!=='xray';previousStyle=style;
  }
  if(force||frame%tiers[tier].panels===0){drawScreen(screenCtx,s);screenTexture.needsUpdate=true}
  (led.material as THREE.MeshStandardMaterial).emissiveIntensity=.3+s.energy*.4;
  renderer.render(scene,camera);
  const selected=c.selected;let projected=null;
  if(selected){const p=targets[selected].clone().add(groups[selected].position).project(camera);projected={x:(p.x+1)*width/2,y:(1-p.y)*height/2}}
  return projected;
 }
 function qualityDown(){if(tier>=2)return;tier++;renderer.setPixelRatio(Math.min(devicePixelRatio,tiers[tier].dpr));key.shadow.mapSize.setScalar(tiers[tier].shadow);key.shadow.map?.dispose();key.shadow.map=null;onStatus(true,['High','Balanced','Low'][tier]);resize()}
 function resetCamera(){setCamera('hero');camera.zoom=1;camera.updateProjectionMatrix()}
 function dispose(){disposed=true;ro.disconnect();orbit.dispose();renderer.domElement.removeEventListener('pointerdown',pointerdown);renderer.domElement.removeEventListener('pointerup',pointerup);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach((m:THREE.Material)=>m.dispose())}});detailMaterials.forEach(m=>m.map?.dispose());renderer.dispose();renderer.domElement.remove()}
 return {ready,draw,qualityDown,resetCamera,dispose,renderer,get tier(){return tier},get manualZoom(){return manualZoom}};
}
import {timeline} from './model';
function timelinePrevious(index:number):View{return timeline.beats[(index-1+timeline.beats.length)%timeline.beats.length].camera as View}
