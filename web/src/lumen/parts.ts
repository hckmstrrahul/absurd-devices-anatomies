import * as THREE from 'three';
import {roundFrame,roundPlate,lathe,type Builder} from '../kit/builder';
import {wheelGeometry,extrudeFlat,discShape,escapeWheelShape,ratchetShape,spiral,type WheelSpec} from '../kit/horology';
import {rng} from '../kit/util';
import type {Kind} from '../kit/materials';
import type {V3} from '../kit/types';
import {LEDS,ringColour,type AssemblyId,type PaletteId} from './model';
import {FRAME as F,GLASS,RING,ringPoint,ringLength,ledU,DIAL,RECESS,ARBOR,HANDS,SET_ANGLE,PLATE,GLOBE,BULB,GAUGE,FLASK,PUMP,WALL,BASE,STRIP,HANDLE,KNOB,FEET} from './layout';
import {TRAIN,MOTION,TRANSFER,SECTOR,RATCHET,ARBORS,PILLARS,bearing,sectorOffset,sectorPin,type Point} from './train';
import {dialTexture,gaugeTexture,boardTexture,studioTexture} from './textures';

type Mat=Kind|THREE.Material;
const rad=THREE.MathUtils.degToRad;
// Depth of each layer of the going train. A wheel shares its plane with the pinion it drives.
const Z={barrel:-2.4,centre:-1.2,third:0,fourth:1.2,escape:2.4,balance:4.4,spring:5.5,bridge:6.2,minuteDrive:-8.4,secondsDrive:-10.6,cannon:-4.6,hourWheel:-3};

// Stand a plan shape upright: shape x → X, shape y → Y, extruded from z0 to z1. `bevel` rounds the edges and
// grows the outline by the same amount, so pass a shape that much smaller.
function up(shape:THREE.Shape,z0:number,z1:number,bevel=0,segments=24){
 const g=new THREE.ExtrudeGeometry(shape,{depth:z1-z0-bevel*2,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:6,curveSegments:segments});
 g.translate(0,0,z0+bevel);return g;
}
// Profile of part of a sphere of radius r centred at height cy, from one elevation to another (degrees).
const arcProfile=(cy:number,r:number,from:number,to:number,steps=32):[number,number][]=>Array.from({length:steps+1},(_,i)=>{const a=rad(from+(to-from)*i/steps);return [Math.cos(a)*r,cy+Math.sin(a)*r] as [number,number]});

export function buildLumen(b:Builder){
 const {m,put}=b;
 const layer=(asm:AssemblyId,lift?:V3,base?:V3)=>b.layer(asm,lift,base);
 // Kit boxes and cylinders stand along Y. These face the viewer instead: centred on (x, y), spanning z0..z1.
 const zc=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x:number,y:number,r:number,z0:number,z1:number,segments=32)=>{
  const mesh=put(parent,asm,new THREE.CylinderGeometry(r,r,z1-z0,segments),kind);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,(z0+z1)/2);return mesh;
 };
 const zbox=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x:number,y:number,w:number,h:number,z0:number,z1:number)=>{
  const mesh=put(parent,asm,new THREE.BoxGeometry(w,h,z1-z0),kind);mesh.position.set(x,y,(z0+z1)/2);return mesh;
 };
 const zring=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x:number,y:number,z:number,r:number,tube:number)=>{
  const mesh=put(parent,asm,new THREE.TorusGeometry(r,tube,12,48),kind);mesh.position.set(x,y,z);return mesh;
 };
 const UP=new THREE.Vector3(0,1,0),ends=[new THREE.Vector3(),new THREE.Vector3()];
 const span=(mesh:THREE.Mesh,from:V3,to:V3)=>{
  const [a,c]=ends;a.set(...from);c.set(...to);mesh.scale.y=a.distanceTo(c);mesh.position.copy(a).add(c).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(UP,c.sub(a).normalize());return mesh;
 };
 // Straight round bar between two points.
 const rod=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,from:V3,to:V3,r:number)=>span(put(parent,asm,new THREE.CylinderGeometry(r,r,1,14),kind),from,to);
 // A bar whose ends are moved every frame: connecting rods and links.
 const link=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,r:number)=>{const mesh=put(parent,asm,new THREE.CylinderGeometry(r,r,1,12),kind);return (from:V3,to:V3)=>span(mesh,from,to)};
 // Lathed part standing on the Y axis at (x, z); profile heights are absolute.
 const turned=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x:number,z:number,profile:[number,number][],segments=48)=>{
  const mesh=put(parent,asm,lathe(profile,segments),kind);mesh.position.set(x,0,z);return mesh;
 };
 const clear=(mesh:THREE.Mesh)=>{mesh.castShadow=false;return mesh};
 // Vessel glass behind the front pane: reflections only, added over whatever lies behind. Used on double-walled
 // shells, so both faces of the wall catch the softboxes and the rims read bright.
 const clearGlass=(asm:AssemblyId,strength=.8)=>m.own(asm,new THREE.MeshPhysicalMaterial({color:0x05080a,roughness:.03,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:strength,transparent:true,depthWrite:false,
  // Added over what lies behind, leaving alpha alone so the floor mirror does not read the glass as solid.
  blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor}));
 // A faint cool body for the same vessels, so they still read against a pale backdrop.
 const glassBody=(asm:AssemblyId)=>m.own(asm,new THREE.MeshBasicMaterial({color:0x7f9aa6,transparent:true,opacity:.07,depthWrite:false,side:THREE.BackSide}));
 const lit=(asm:AssemblyId,colour:number,emissive:number,opacity=1)=>m.own(asm,new THREE.MeshStandardMaterial({color:colour,emissive,emissiveIntensity:.5,roughness:.35,transparent:opacity<1,opacity}));
 const rubyOf=new Map<AssemblyId,THREE.Material>();
 const ruby=(asm:AssemblyId)=>{if(!rubyOf.has(asm))rubyOf.set(asm,m.own(asm,new THREE.MeshPhysicalMaterial({color:0xb5103a,roughness:.12,clearcoat:1,emissive:0x4a0010,emissiveIntensity:.5})));return rubyOf.get(asm)!};
 // Clockwork furniture. A wheel hangs on a pivot placed at its arbor; z is the middle of its thickness.
 const wheel=(pivot:THREE.Object3D,asm:AssemblyId,kind:Mat,spec:WheelSpec,thickness:number,z:number)=>{const mesh=put(pivot,asm,wheelGeometry(spec,thickness),kind);mesh.position.z=z;return mesh};
 const flat=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,shape:THREE.Shape,thickness:number,z:number)=>{const mesh=put(parent,asm,extrudeFlat(shape,thickness),kind);mesh.position.z=z;return mesh};
 const jewel=(parent:THREE.Object3D,asm:AssemblyId,p:Point,z:number)=>{zc(parent,asm,'gold',p.x,p.y,1.15,z,z+.22,20);zc(parent,asm,ruby(asm),p.x,p.y,.62,z,z+.34,16)};
 const zscrew=(parent:THREE.Object3D,asm:AssemblyId,p:Point,z:number,r=.85,turn=.6)=>{zc(parent,asm,'steel',p.x,p.y,r,z,z+.4,18);zbox(parent,asm,'darksteel',p.x,p.y,r*1.5,.2,z+.32,z+.44).rotation.z=turn};
 // A flat bridge through the given points, with a boss at each.
 const strap=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,points:Point[],width:number,z0:number,z1:number)=>points.forEach((p,i)=>{
  zc(parent,asm,kind,p.x,p.y,width/2+.55,z0,z1,24);
  if(i){const q=points[i-1];zbox(parent,asm,kind,(p.x+q.x)/2,(p.y+q.y)/2,Math.hypot(p.x-q.x,p.y-q.y),width,z0,z1).rotation.z=Math.atan2(p.y-q.y,p.x-q.x)}
 });

 // ── Frame and handle ────────────────────────────────────────────────────
 const shell=layer('frame'),rear=layer('frame',[0,0,-46]),handle=layer('frame',[0,58,0]),knobLayer=layer('frame',[44,0,0],[KNOB.x0,KNOB.y,0]);
 const bezel=()=>roundFrame(F.w-7,F.h-7,F.r-3.5,F.face-7);
 const mid=F.z-F.bezel;
 put(shell,'frame',up(bezel(),mid,F.z,3.5,32),'chrome').position.y=F.cy;
 put(shell,'frame',up(roundFrame(F.w-2,F.h-2,F.r-1,F.wall),-mid,mid,0,32),'chrome').position.y=F.cy;
 put(rear,'frame',up(bezel(),-F.z,-mid,3.5,32),'chrome').position.y=F.cy;
 const backGlass=clearGlass('frame',.25);
 clear(put(rear,'frame',up(roundPlate(GLASS.w,GLASS.h,GLASS.r),-GLASS.z1,-GLASS.z0),backGlass)).position.y=F.cy;
 for(const [x,y] of [[-70,F.h/2-4],[0,F.h/2-4],[70,F.h/2-4],[-70,-F.h/2+4],[0,-F.h/2+4],[70,-F.h/2+4],[-F.w/2+4,0],[F.w/2-4,0]]){
  zc(rear,'frame','steel',x,F.cy+y,1.7,-F.z-.7,-F.z+.4,18);zbox(rear,'frame','darksteel',x,F.cy+y,2.4,.4,-F.z-.8,-F.z-.6);
 }
 // Finials: a chrome ball on a flared collar each side; the right collar is gold, as in the reference.
 for(const side of [-1,1]){
  const x=side*HANDLE.x,top=F.top,gold=side>0;
  turned(handle,'frame',gold?'brass':'chrome',x,0,[[0,top-1.2],[7.4,top-1.2],[7.4,top+1],[4,top+1.9],[2.5,top+3],[2.5,top+9],[0,top+9]]);
  turned(handle,'frame',gold?'gold':'chrome',x,0,[[0,top+8.4],[2.6,top+8.4],[8.3,top+9.8],[8.8,top+11.4],[6,top+13],[0,top+13]]);
  b.ball(handle,'frame','chrome',[x,HANDLE.ballY,0],HANDLE.ball,56);
 }
 {
  const T=HANDLE.top,pts:V3[]=[[-53,T-14,0],[-47,T-6,0],[-28,T-1.5,0],[0,T,0],[28,T-1.5,0],[47,T-6,0],[53,T-14,0],[44,T-14.5,0],[26,T-11,0],[0,T-9.8,0],[-26,T-11,0],[-44,T-14.5,0]];
  const loop=put(handle,'frame',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)),true,'catmullrom',.35),220,3.2,14,true),'chrome');
  loop.scale.z=1.7;                                         // the grip is a flattened band, deeper than it is thick
 }
 // Brightness knob on the right flank; it turns with the Brightness input.
 const knob=b.pivot(knobLayer);
 {
  const body=lathe([[0,0],[5.2,0],[5.2,1.6],[KNOB.r,1.6],[KNOB.r,8],[KNOB.r-1.1,9.5],[0,9.5]],56);body.rotateZ(-Math.PI/2);put(knob,'frame',body,'gold');
  for(let i=0;i<24;i++){const a=i*Math.PI/12,rib=put(knob,'frame',new THREE.BoxGeometry(5.6,.9,.7),'brass');rib.position.set(4.9,Math.cos(a)*(KNOB.r+.1),Math.sin(a)*(KNOB.r+.1));rib.rotation.x=a-Math.PI/2}
  const stud=lathe([[0,9.5],[2.5,9.5],[2.5,10.3],[2,10.6],[2.5,11],[2,11.4],[2.5,11.8],[2,12.2],[2.5,12.6],[2.5,14.6],[1.8,15.2],[0,15.2]],24);stud.rotateZ(-Math.PI/2);put(knob,'frame',stud,'brass');
  const mark=put(knob,'frame',new THREE.BoxGeometry(.3,8,1.3),'black');mark.position.set(9.55,7.6,0);
  const notch=put(knob,'frame',new THREE.BoxGeometry(6,1,1.4),'black');notch.position.set(5,KNOB.r+.3,0);
 }

 // ── Glass ───────────────────────────────────────────────────────────────
 // A thick pane with rounded edges; it is the outermost glass, so it can refract.
 const pane=layer('glass');
 const front=clear(put(pane,'glass',up(roundPlate(GLASS.w-2,GLASS.h-2,GLASS.r-1),GLASS.z0,GLASS.z1,1,32),'crystal'));front.position.y=F.cy;
 // The floor mirror draws the scene from below with no backdrop, and a refracting pane would show that emptiness as
 // black. Leave the pane out of that pass (its camera sits under the floor) so the mirror shows the works instead.
 {
  const kept=new THREE.Matrix4();let hidden=false;
  front.onBeforeRender=(_r,_s,camera)=>{hidden=camera.position.y<0;if(hidden){kept.copy(front.matrixWorld);front.matrixWorld.makeScale(0,0,0)}};
  front.onAfterRender=()=>{if(hidden){front.matrixWorld.copy(kept);hidden=false}};
 }
 put(pane,'glass',up(roundFrame(GLASS.w+.8,GLASS.h+.8,GLASS.r+.4,1),GLASS.z0-.7,GLASS.z0),'rubber').position.y=F.cy;

 // ── Light ring ──────────────────────────────────────────────────────────
 const ring=layer('ring'),diffuser=layer('ring',[0,0,14]);
 put(ring,'ring',up(roundFrame(RING.w+RING.width,RING.h+RING.width,RING.r+RING.width/2,RING.width),RING.z0,RING.z1,0,24),'black').position.y=F.cy;
 const leds=new THREE.InstancedMesh(new THREE.BoxGeometry(RING.led.along,RING.led.across,RING.led.deep),m.own('ring',new THREE.MeshBasicMaterial({color:0xffffff})),LEDS);
 {
  const dummy=new THREE.Object3D(),white=new THREE.Color(1,1,1);
  for(let i=0;i<LEDS;i++){
   const p=ringPoint(ledU(i,LEDS));dummy.position.set(p.x,F.cy+p.y,RING.z1+RING.led.deep/2);dummy.rotation.z=Math.atan2(p.ny,p.nx)-Math.PI/2;dummy.updateMatrix();
   leds.setMatrixAt(i,dummy.matrix);leds.setColorAt(i,white);
  }
  b.adopt(ring,'ring',leds,LEDS).castShadow=false;
 }
 // Diffuser: an opal tube over the emitters, open at the connector. Each ring of vertices takes the colour of the
 // emitters beneath it, and the glow pass spreads it onto the chrome and glass.
 const TUBE={samples:240,sides:10,r:2.3,gap:5/ringLength()};
 const tubeColours=new THREE.BufferAttribute(new Float32Array((TUBE.samples+1)*TUBE.sides*3),3);
 const tubeU=(k:number)=>TUBE.gap+k/TUBE.samples*(1-2*TUBE.gap);
 {
  const n=TUBE.samples+1,pos=new Float32Array(n*TUBE.sides*3),index:number[]=[];
  for(let k=0;k<n;k++){
   const p=ringPoint(tubeU(k));
   for(let j=0;j<TUBE.sides;j++){
    const a=j/TUBE.sides*Math.PI*2,out=Math.cos(a)*TUBE.r,rise=Math.sin(a)*TUBE.r;
    pos.set([p.x+p.nx*out,F.cy+p.y+p.ny*out,rise],(k*TUBE.sides+j)*3);
    if(k<TUBE.samples){const a0=k*TUBE.sides+j,a1=k*TUBE.sides+(j+1)%TUBE.sides,b0=a0+TUBE.sides,b1=a1+TUBE.sides;index.push(a0,a1,b0,a1,b1,b0)}
   }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));geometry.setAttribute('color',tubeColours);geometry.setIndex(index);
  const tube=put(diffuser,'ring',geometry,m.own('ring',new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})),false);tube.position.z=RING.z1+TUBE.r+.2;
  for(const k of [0,TUBE.samples]){const p=ringPoint(tubeU(k));zbox(diffuser,'ring','chrome',p.x,F.cy+p.y,1.2,TUBE.r*2+.8,RING.z1+.1,RING.z1+TUBE.r*2+.5)}
 }
 // Connector in the gap at top centre, its tail, and the clips that hang the strip from the band.
 zbox(ring,'ring','chip',0,F.cy+RING.h/2,6.4,5,RING.z1,RING.z1+2.6);
 zbox(ring,'ring',lit('ring',0x12433c,0x3df0b4),0,F.cy+RING.h/2-.3,3,1.6,RING.z1+2.6,RING.z1+3.1);
 b.wire(ring,'ring','wireGrey',[[0,F.cy+RING.h/2,RING.z0],[0,F.cy+RING.h/2+1.6,RING.z0-7],[-5,F.cy+RING.h/2+2,RING.z0-16],[-12,F.cy+RING.h/2+1.5,RING.z0-24]],.7);
 for(const x of [-64,64])for(const sy of [-1,1])zbox(ring,'ring','steel',x,F.cy+sy*(RING.h/2+RING.width/2+1.6),9,3.2,RING.z0,RING.z1);
 for(const sx of [-1,1])for(const y of [-36,36])zbox(ring,'ring','steel',sx*(RING.w/2+RING.width/2+1.6),F.cy+y,3.2,9,RING.z0,RING.z1);
 // Four lamps inside the case carry the average colour of each side onto the parts.
 const sideLights=[0,.25,.5,.75].map(u=>{const p=ringPoint(u),light=new THREE.PointLight(0xffffff,0,170,2);light.position.set(p.x-p.nx*9,F.cy+p.y-p.ny*9,23);ring.add(light);return {u,light}});

 // ── Dial and hands ──────────────────────────────────────────────────────
 const plate=layer('dial'),works=layer('dial',[0,0,-16]),idlers=layer('dial',[0,0,-30]);
 const at:V3=[ARBOR.x,ARBOR.y,0];
 const setHand=layer('dial',[0,0,8],at),hourHand=layer('dial',[0,0,16],at),minuteHand=layer('dial',[0,0,24],at),secondHand=layer('dial',[0,0,32],at),cap=layer('dial',[0,0,40],at);
 const hot=m.own('dial',new THREE.MeshStandardMaterial({color:0xd66400,emissive:0xff6a00,emissiveIntensity:.12,roughness:.6}));
 const silver=m.own('dial',new THREE.MeshStandardMaterial({color:0xbfc3c7,roughness:.4,metalness:.6}));
 {
  const shape=roundPlate(DIAL.w,DIAL.h,1.2),hole=new THREE.Path();hole.absellipse(RECESS.x-DIAL.x,RECESS.y-DIAL.y,RECESS.rx,RECESS.ry,0,Math.PI*2,true,0);shape.holes.push(hole);
  put(plate,'dial',up(shape,DIAL.z0,DIAL.z1-.1,0,64),silver).position.set(DIAL.x,DIAL.y,0);
  const face=put(plate,'dial',new THREE.PlaneGeometry(DIAL.w,DIAL.h),m.own('dial',new THREE.MeshStandardMaterial({map:m.texture(dialTexture()),color:0xb4b6b9,roughness:.58,metalness:.25,envMapIntensity:.5,alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);
  face.position.set(DIAL.x,DIAL.y,DIAL.z1-.08);
  // Recess floor, its rim, and the chrome strut that carries the arbor.
  const floor=zc(plate,'dial',m.own('dial',new THREE.MeshStandardMaterial({color:0xb4b8bc,roughness:.42,metalness:.45})),RECESS.x,RECESS.y,1,DIAL.z0-1,DIAL.z0+.4,96);floor.scale.set(RECESS.rx-.05,1,RECESS.ry-.05);
  const rim:V3[]=[];for(let i=0;i<48;i++){const a=i*Math.PI/24;rim.push([RECESS.x+Math.cos(a)*RECESS.rx,RECESS.y+Math.sin(a)*RECESS.ry,DIAL.z1+.1])}
  b.wire(plate,'dial','chrome',rim,.85,true);
  for(const turn of [19,-19]){
   const bar=zbox(plate,'dial','chrome',ARBOR.x,ARBOR.y,62,1.5,DIAL.z0+.6,DIAL.z0+1.6);bar.rotation.z=rad(turn);
   for(const end of [-1,1])zc(plate,'dial','chrome',ARBOR.x+end*31*Math.cos(rad(turn)),ARBOR.y+end*31*Math.sin(rad(turn)),1.5,DIAL.z0+.4,DIAL.z0+1.9,20);
  }
  zc(plate,'dial','chrome',ARBOR.x,ARBOR.y,3.3,DIAL.z0+.4,DIAL.z0+2.5,32);
  // Ridged bars along the top and bottom edges; plain rails down the sides.
  const ridges=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,3,.55),m.mat('dial','chrome'),118),dummy=new THREE.Object3D();
  [1,-1].forEach((sy,row)=>{
   const y=DIAL.y+sy*(DIAL.h/2-2.1);zbox(plate,'dial','steel',DIAL.x,y,DIAL.w-4,3.4,DIAL.z1-.1,DIAL.z1+.5);
   for(let i=0;i<59;i++){dummy.position.set(DIAL.x-58+i*2,y,DIAL.z1+.75);dummy.updateMatrix();ridges.setMatrixAt(row*59+i,dummy.matrix)}
  });
  b.adopt(plate,'dial',ridges,2);
  for(const sx of [-1,1])zbox(plate,'dial','chrome',DIAL.x+sx*(DIAL.w/2-.9),DIAL.y,1.2,DIAL.h-8.6,DIAL.z1-.1,DIAL.z1+.6);
  // Two legs stand the dial on the driver board.
  for(const sx of [-1,1]){zbox(plate,'dial','steel',DIAL.x+sx*48,(BASE.y1+DIAL.y-DIAL.h/2+3)/2,3,DIAL.y-DIAL.h/2+3-BASE.y1,DIAL.z0-1.4,DIAL.z0);zbox(plate,'dial','steel',DIAL.x+sx*48,BASE.y1+.5,6,1,DIAL.z0-4.5,DIAL.z0+1.5)}
 }
 // Hands point to 12 at rest and turn clockwise about the arbor.
 const skeleton=(length:number,width:number)=>{
  const s=new THREE.Shape(),L=length;
  s.moveTo(-.8,-5);s.lineTo(.8,-5);s.lineTo(.8,L*.56);s.lineTo(width,L*.76);s.lineTo(0,L);s.lineTo(-width,L*.76);s.lineTo(-.8,L*.56);s.closePath();
  const h=new THREE.Path();h.moveTo(0,L*.63);h.lineTo(width*.55,L*.76);h.lineTo(0,L*.92);h.lineTo(-width*.55,L*.76);h.closePath();s.holes.push(h);return s;
 };
 {
  const z=DIAL.z1;
  const leaf=new THREE.Shape();leaf.moveTo(-.5,-3);leaf.lineTo(.5,-3);leaf.lineTo(.7,HANDS.set*.55);leaf.lineTo(1.5,HANDS.set*.7);leaf.lineTo(0,HANDS.set);leaf.lineTo(-1.5,HANDS.set*.7);leaf.lineTo(-.7,HANDS.set*.55);leaf.closePath();
  put(setHand,'dial',up(leaf,z+1,z+1.5),'gloss');zc(setHand,'dial','gloss',0,0,2.1,z+1,z+1.6,24);
  put(hourHand,'dial',up(skeleton(HANDS.hour,3.3),z+2.3,z+2.9),hot);zc(hourHand,'dial',hot,0,0,2.6,z+2.3,z+3,24);
  put(minuteHand,'dial',up(skeleton(HANDS.minute,2.7),z+3.7,z+4.3),hot);zc(minuteHand,'dial',hot,0,0,2.2,z+3.7,z+4.4,24);
  zbox(secondHand,'dial',hot,0,HANDS.second/2-5,.6,HANDS.second+10,z+5.1,z+5.5);zc(secondHand,'dial',hot,0,-8,1.5,z+5.1,z+5.5,20);zc(secondHand,'dial',hot,0,0,1.5,z+5.1,z+5.7,20);
  const dome=lathe([[0,0],[2.5,0],[2.5,.8],[1.6,1.6],[0,1.9]],32);dome.rotateX(Math.PI/2);put(cap,'dial',dome,'chrome').position.z=z+5.7;
  zc(cap,'dial','steel',0,0,.5,-11.4,z+5.7,12);
 }
 setHand.rotation.z=-rad(SET_ANGLE);
 // Motion works behind the dial. Two idlers bring the centre arbor's and the fourth arbor's turning across from
 // the going train; the cannon pinion rides its drive wheel by friction and carries the minute hand; the minute
 // wheel and its pinion gear the hour wheel down twelve to one.
 const H=ARBORS.hands,on=(parent:THREE.Object3D,p:Point)=>b.pivot(parent,[p.x,p.y,0]);
 const dialWheels={
  seconds:on(works,H),minuteDrive:on(works,H),cannon:on(works,H),hourWheel:on(works,H),minuteWheel:on(works,ARBORS.minuteWheel),
  minuteIdler:on(idlers,ARBORS.minuteIdler),secondsIdler:on(idlers,ARBORS.secondsIdler),
 };
 {
  const T=TRANSFER,M=MOTION,drive:WheelSpec={module:T.module,teeth:T.wheel,bore:.9,crossings:4,hub:2.6,rim:1.4,spoke:1.5},idle:WheelSpec={module:T.module,teeth:T.idler,bore:.9,crossings:6,hub:4,rim:2,spoke:2.2};
  wheel(dialWheels.seconds,'dial','gold',drive,.7,Z.secondsDrive);zc(dialWheels.seconds,'dial','steel',0,0,1.5,Z.secondsDrive-.8,Z.secondsDrive+.8,16);
  wheel(dialWheels.minuteDrive,'dial','brass',drive,.7,Z.minuteDrive);zc(dialWheels.minuteDrive,'dial','brass',0,0,1.9,Z.minuteDrive-.6,Z.cannon-.8,20);
  // The friction spring: three steel fingers bearing on the cannon pinion.
  for(let i=0;i<3;i++){const finger=zbox(dialWheels.minuteDrive,'dial','steel',0,0,7,.9,Z.minuteDrive+.4,Z.minuteDrive+.65);finger.rotation.z=i*Math.PI/3}
  wheel(dialWheels.cannon,'dial','steel',{module:M.module,teeth:M.cannon,bore:1},1.3,Z.cannon);zc(dialWheels.cannon,'dial','steel',0,0,1.25,Z.cannon,DIAL.z1+3.7,16);
  wheel(dialWheels.hourWheel,'dial','brass',{module:M.module,teeth:M.hourWheel,bore:1.6,crossings:4,hub:2.6,rim:1.3,spoke:1.3},.8,Z.hourWheel);zc(dialWheels.hourWheel,'dial','brass',0,0,1.7,Z.hourWheel,DIAL.z1+2.3,20);
  wheel(dialWheels.minuteWheel,'dial','gold',{module:M.module,teeth:M.minuteWheel,bore:.7,crossings:4,hub:2,rim:1.3,spoke:1.3},.8,Z.cannon);
  wheel(dialWheels.minuteWheel,'dial','steel',{module:M.module,teeth:M.minutePinion,bore:.7},1.2,Z.hourWheel);
  zc(works,'dial','steel',ARBORS.minuteWheel.x,ARBORS.minuteWheel.y,.7,Z.cannon-.8,DIAL.z0,12);
  wheel(dialWheels.minuteIdler,'dial','brass',idle,.7,Z.minuteDrive);wheel(dialWheels.secondsIdler,'dial','gold',idle,.7,Z.secondsDrive);
  // The front idler turns on a stud from the back of the dial; the rear one hangs from a cock off the bridge.
  zc(idlers,'dial','steel',ARBORS.minuteIdler.x,ARBORS.minuteIdler.y,.9,Z.minuteDrive-.6,DIAL.z0,14);jewel(idlers,'dial',ARBORS.minuteIdler,Z.minuteDrive+.36);
  const bridge=[{x:-4,y:126},{x:16,y:116},{x:19,y:86},{x:-4,y:79}],zb=Z.secondsDrive-2;
  put(works,'dial',up(roundPlate(31,55,7),zb-.8,zb,.2),'brass').position.set(7.5,102.5,0);
  for(const p of bridge){zc(works,'dial','brass',p.x,p.y,1.2,zb,DIAL.z0,14);zscrew(works,'dial',p,zb-1.2)}
  jewel(works,'dial',H,zb-1.14);
  strap(idlers,'dial','brass',[{x:-6,y:118},{x:-22,y:124},ARBORS.secondsIdler],3,zb-.8,zb);
  zc(idlers,'dial','steel',ARBORS.secondsIdler.x,ARBORS.secondsIdler.y,.9,zb,Z.secondsDrive+.6,14);jewel(idlers,'dial',ARBORS.secondsIdler,zb-1.14);
 }

 // ── Left movement ───────────────────────────────────────────────────────
 // A going train on a brass plate: barrel, centre, third, fourth and escape wheels, each on its own plane, with a
 // Swiss lever and a screwed balance above, bridges in front, and the two transfer wheels behind the plate.
 const leftGlass=clearGlass('left'),leftBody=glassBody('left');
 const plateL=layer('left'),transfer=layer('left',[0,0,-14]),trainL=layer('left',[0,0,12]),escL=layer('left',[0,0,24]),bridges=layer('left',[0,0,38]),loops=layer('left',[-18,0,50]),globe=layer('left',[0,-14,0]);
 const A=ARBORS,T=TRAIN,P=PLATE,SP=-89.5;
 {
  // The pillar plate is openworked: straps through every arbor, tied together down the left edge.
  const L=PILLARS;
  strap(plateL,'left','brass',[L.barrelA,A.barrel,A.centre,L.barrelB],3.4,P.z0,P.z1);
  strap(plateL,'left','brass',[L.trainA,A.third,A.fourth,A.escape,L.trainB],3,P.z0,P.z1);
  strap(plateL,'left','brass',[L.pallet,A.pallet,A.balance,L.balance],2.8,P.z0,P.z1);
  strap(plateL,'left','brass',[L.barrelA,{x:SP,y:90},L.trainA,L.trainB,L.pallet,{x:SP,y:148},L.balance],2.6,P.z0,P.z1);
  strap(plateL,'left','brass',[L.barrelB,{x:-67,y:118},{x:-68.5,y:140},L.balance],2.2,P.z0,P.z1);
  for(const p of [A.barrel,A.centre,A.third,A.fourth,A.escape,A.pallet,A.balance])jewel(plateL,'left',p,P.z1);
  b.cyl(plateL,'left','brass',SP,-21,1.6,F.floor,150);b.cyl(plateL,'left','brass',SP,-21,5,F.floor,F.floor+1.6);
  for(const y of [90,148]){rod(plateL,'left','brass',[SP,y,-21],[SP,y,P.z0],1);zscrew(plateL,'left',{x:SP,y},P.z1,1.1)}
  for(const p of Object.values(PILLARS))zc(plateL,'left','brass',p.x,p.y,1,P.z1,Z.bridge,16);
  zbox(plateL,'left',lit('left',0x10362e,0x3df0b4),-72,151,6.4,2.5,P.z1,P.z1+.8);zbox(plateL,'left','black',-72,151,7.6,3.6,P.z1,P.z1+.4);
 }
 // Beat lamp on the plate behind the balance; it flashes on every beat.
 const beatLamp=lit('left',0x0e3a30,0x37f2b0);
 zc(plateL,'left',beatLamp,A.balance.x,A.balance.y,8.6,P.z0+.1,P.z1-.1,48);
 const go={barrel:on(trainL,A.barrel),centre:on(trainL,A.centre),third:on(trainL,A.third),fourth:on(trainL,A.fourth),escape:on(trainL,A.escape),
  centreDrive:on(transfer,A.centre),fourthDrive:on(transfer,A.fourth),pallet:on(escL,A.pallet),balance:on(escL,A.balance)};
 const blued=m.own('left',new THREE.MeshStandardMaterial({color:0x2a4a8c,roughness:.3,metalness:1}));
 {
  const mod=T.module,arbor=(pivot:THREE.Object3D)=>zc(pivot,'left','steel',0,0,.45,P.z1+.05,Z.bridge,12);
  const crossed=(teeth:number,spokes:number):WheelSpec=>({module:mod,teeth,bore:.45,crossings:spokes,hub:1.7,rim:.9,spoke:1});
  const pinion=(teeth:number):WheelSpec=>({module:mod,teeth,bore:.45});
  // Barrel: a drum with the first wheel cut on it, the mainspring under a spoked cover.
  wheel(go.barrel,'left','brass',{module:mod,teeth:T.barrel,bore:.8},.7,Z.barrel);zc(go.barrel,'left','brass',0,0,9.7,P.z1+.3,Z.barrel-.35,72);
  b.wire(go.barrel,'left',blued,spiral(7,1.7,8.2,Z.barrel+.42,0,16),.1).castShadow=false;
  flat(go.barrel,'left','gold',discShape(8.9,{bore:.8,crossings:5,hub:2.2,rim:1,spoke:1.2}),.25,Z.barrel+.68);zc(go.barrel,'left','steel',0,0,.8,P.z1+.05,Z.bridge+1.9,14);
  wheel(go.centre,'left','steel',pinion(T.centrePinion),1,Z.barrel);wheel(go.centre,'left','brass',crossed(T.centre,4),.6,Z.centre);arbor(go.centre);
  wheel(go.third,'left','steel',pinion(T.thirdPinion),1,Z.centre);wheel(go.third,'left','gold',crossed(T.third,5),.6,Z.third);arbor(go.third);
  wheel(go.fourth,'left','steel',pinion(T.fourthPinion),1,Z.third);wheel(go.fourth,'left','brass',crossed(T.fourth,4),.6,Z.fourth);arbor(go.fourth);
  wheel(go.escape,'left','steel',pinion(T.escapePinion),1,Z.fourth);flat(go.escape,'left','steel',escapeWheelShape(T.escapeTeeth,T.escapeRadius,{bore:.45,crossings:3,hub:1.2}),.5,Z.escape);arbor(go.escape);
  // Transfer wheels behind the plate, on the same arbors.
  const drive:WheelSpec={module:TRANSFER.module,teeth:TRANSFER.wheel,bore:.45,crossings:4,hub:2.4,rim:1.4,spoke:1.5};
  wheel(go.centreDrive,'left','brass',drive,.7,Z.minuteDrive);zc(go.centreDrive,'left','steel',0,0,.45,Z.minuteDrive-.7,P.z0,12);
  wheel(go.fourthDrive,'left','gold',drive,.7,Z.secondsDrive);zc(go.fourthDrive,'left','steel',0,0,.45,Z.secondsDrive-.7,P.z0,12);
 }
 // Lever escapement. The fork is built pointing along +X and laid on the line from its pivot to the balance.
 const forkRest=bearing(A.pallet,A.balance);
 {
  const z=Z.escape,R=T.escapeRadius,d=Math.hypot(A.pallet.x-A.escape.x,A.pallet.y-A.escape.y),toWheel=bearing(A.pallet,A.escape)-forkRest;
  zbox(go.pallet,'left','steel',2.5,0,5.6,.8,z-.25,z+.25);
  for(const s of [-1,1]){
   zbox(go.pallet,'left','steel',5.7,s*.62,1.5,.36,z-.25,z+.25);
   // Each arm ends on the wheel's rim, 40° either side of the line of centres, and carries a ruby pallet.
   const tx=Math.cos(toWheel)*d+Math.cos(toWheel+Math.PI+s*rad(40))*R,ty=Math.sin(toWheel)*d+Math.sin(toWheel+Math.PI+s*rad(40))*R,len=Math.hypot(tx,ty),turn=Math.atan2(ty,tx);
   zbox(go.pallet,'left','steel',tx/2,ty/2,len,.8,z-.25,z+.25).rotation.z=turn;
   zbox(go.pallet,'left',ruby('left'),tx*.97,ty*.97,1.1,.5,z-.32,z+.32).rotation.z=turn+s*.5;
  }
  zc(go.pallet,'left','steel',0,0,1.1,z-.3,z+.3,16);zc(go.pallet,'left','steel',0,0,.35,P.z1+.05,Z.bridge,10);
  for(const s of [-1,1]){const a=forkRest+s*.5;zc(plateL,'left','steel',A.pallet.x+Math.cos(a)*4.6,A.pallet.y+Math.sin(a)*4.6,.3,P.z1,z+.3,8)}
  // Balance: a dark screwed rim on three arms, a roller with its impulse jewel below, a white index to show the swing.
  flat(go.balance,'left','gloss',discShape(7,{bore:.4,crossings:3,hub:1.4,rim:1.4,spoke:1.1}),.9,Z.balance);
  for(let i=0;i<12;i++){const a=i*Math.PI/6+.26;const screw=put(go.balance,'left',new THREE.CylinderGeometry(.42,.42,.9,10),'gold');screw.position.set(Math.cos(a)*7.3,Math.sin(a)*7.3,Z.balance);screw.rotation.z=a-Math.PI/2}
  zbox(go.balance,'left','white',0,6.2,.7,1.5,Z.balance+.45,Z.balance+.56);
  zc(go.balance,'left','steel',0,0,1.5,z+.5,z+1.1,20);zc(go.balance,'left','steel',0,0,.4,P.z1+.05,Z.bridge,10);zc(go.balance,'left','brass',0,0,1,Z.spring-.3,Z.spring+.3,14);
  const back=bearing(A.balance,A.pallet);zc(go.balance,'left',ruby('left'),Math.cos(back)*1.2,Math.sin(back)*1.2,.3,z-.25,z+.9,10);
 }
 // Hairspring: redrawn every frame, wound and unwound by the balance. Its outer end is pinned to the cock's stud.
 const SPRING={turns:5,inner:1,outer:4.7};
 const hairspring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(spiral(SPRING.turns,SPRING.inner,SPRING.outer).map(p=>new THREE.Vector3(...p))),m.own('left',new THREE.LineBasicMaterial({color:0x35508f})));
 hairspring.position.set(A.balance.x,A.balance.y,Z.spring);b.adopt(escL,'left',hairspring,1);
 {
  const z0=Z.bridge,z1=Z.bridge+.8,L=PILLARS;
  strap(bridges,'left','brass',[L.barrelA,A.barrel,A.centre,L.barrelB],3,z0,z1);
  strap(bridges,'left','brass',[L.trainA,A.third,A.fourth,A.escape,L.trainB],2.6,z0,z1);
  strap(bridges,'left','brass',[A.pallet,L.pallet],2.2,z0,z1);
  // Balance cock in white enamel, as the pale bar in the reference, with the regulator on top.
  strap(bridges,'left','white',[{x:A.balance.x,y:A.balance.y-1.5},L.balance],2.4,z0,z1);
  zc(bridges,'left','steel',A.balance.x+SPRING.outer,A.balance.y,.45,Z.spring-.3,z0,8);
  const index=zbox(bridges,'left','steel',A.balance.x,A.balance.y+3.6,.7,9,z1,z1+.3);index.rotation.z=.16;
  for(const p of [A.centre,A.third,A.fourth,A.escape,A.pallet,A.balance])jewel(bridges,'left',p,z1);
  Object.values(L).forEach((p,i)=>zscrew(bridges,'left',p,z1,.85,i*.9));
  // Ratchet and click on the barrel arbor: the winding work.
  flat(bridges,'left','steel',ratchetShape(RATCHET.teeth,RATCHET.radius,.8),.6,z1+.3).position.set(A.barrel.x,A.barrel.y,z1+.3);
  zbox(bridges,'left','steel',A.barrel.x,A.barrel.y,1.5,1.5,z1+.6,z1+1.9);
  const click=zbox(bridges,'left','steel',A.barrel.x-5.3,A.barrel.y+4.4,4.4,1,z1,z1+.6);click.rotation.z=-.9;zscrew(bridges,'left',{x:A.barrel.x-6.6,y:A.barrel.y+6},z1+.6,.6);
  b.wire(bridges,'left',blued,[[A.barrel.x-6.6,A.barrel.y+6,z1+.3],[A.barrel.x-10,A.barrel.y+2,z1+.3],[A.barrel.x-9.4,A.barrel.y-4,z1+.3],[A.barrel.x-6.6,A.barrel.y-7,z1+.3]],.16);
 }
 // Gold wire: a keyhole outline round the movement and the globe, as in the reference, with looser strands.
 {
  const G=GLOBE,z=10.5;
  b.wire(loops,'left','gold',[[-83,104,z],[-93,112,z],[-97.5,128,z],[-94,145,z],[-82,152.5,z],[-69,146,z],[-65.5,130,z],[-68.5,114,z],[-76,104,z],[-72,95,z],[-63.5,84,z],[G.x+21,G.y,z],[G.x+15,G.y-16,z],[G.x,G.y-21.5,z],[G.x-15,G.y-16,z],[G.x-20.6,G.y,z],[-99,80,z],[-90,95,z]],.5,true);
  b.wire(loops,'left','gold',[[-100,156,z+1],[-104.5,136,z+2],[-103,112,z+1],[-99,92,z+2],[-103,76,z+1],[-104,56,z],[-96,43,z-2]],.4);
  b.wire(loops,'left','gold',[[-74,157,z+1],[-64.5,150,z+2],[-63,128,z+1],[-64.5,108,z],[-63,96,z+1],[-66,88,z]],.38);
  const small:V3[]=[];for(let i=0;i<14;i++){const a=i*Math.PI/7;small.push([-88+Math.cos(a)*9,90+Math.sin(a)*4.6+Math.cos(a)*1.6,z-1])}
  b.wire(loops,'left','gold',small,.36,true);
  rod(loops,'left','gold',[-107,92,z-2],[-93,108,z-1],.3);rod(loops,'left','gold',[-106,104,z-1],[-92,95,z-2],.3);
  for(const [x,y] of [[-97.5,128],[-65.5,130],[-82,152.5],[-72,95],[-99,80]])b.ball(loops,'left','gold',[x,y,z],.9,12);
 }
 // Day gauge in a thick glass globe on a brass stand.
 const dayNeedle=b.pivot(globe,[GLOBE.x,GLOBE.y,1.2]);
 const dayFace=m.own('left',new THREE.MeshStandardMaterial({map:m.texture(gaugeTexture(true)),roughness:.4,emissive:0x35e8ff,emissiveIntensity:.5}));dayFace.emissiveMap=dayFace.map;
 {
  const G=GLOBE,outer=arcProfile(G.y,G.r,-86,86),inner=arcProfile(G.y,G.r-WALL,86,-86);
  clear(turned(globe,'left',leftGlass,G.x,0,[...outer,...inner,outer[0]],72));clear(turned(globe,'left',leftBody,G.x,0,outer,48));
  b.cyl(globe,'left','brass',G.x,0,7,F.floor,F.floor+1.8);b.cyl(globe,'left','brass',G.x,0,1.6,F.floor+1.8,G.y-G.r+1.4);b.torus(globe,'left','brass',[G.x,G.y-G.r+2.2,0],7.4,1);
  turned(globe,'left','gold',G.x,0,[[0,G.y+G.r-1],[4.2,G.y+G.r-1],[4.2,G.y+G.r+.3],[2.2,G.y+G.r+1.8],[1.4,G.y+G.r+4.2],[0,G.y+G.r+4.2]],28);
  const stub=put(globe,'left',new THREE.CylinderGeometry(2.2,2.2,4,20),'gold');stub.rotation.z=Math.PI/2;stub.position.set(G.x-G.r-2,G.y,0);b.ball(globe,'left','gold',[G.x-G.r-4.4,G.y,0],1.6,16);
  zc(globe,'left','brass',G.x,G.y,10,-.6,.6,48);put(globe,'left',new THREE.CircleGeometry(9.4,48),dayFace,false).position.set(G.x,G.y,.64);zring(globe,'left','gold',G.x,G.y,.7,9.7,.6);
  b.cyl(globe,'left','brass',G.x,0,.9,G.y-G.r+1.4,G.y-10,12);
  zbox(dayNeedle,'left','black',0,3,.55,9,0,.3);zc(dayNeedle,'left','black',0,0,1.1,0,.5,16);
 }

 // ── Right tubes ─────────────────────────────────────────────────────────
 const tube=layer('right',[0,16,0]),fittings=layer('right'),flask=layer('right',[0,-14,0]);
 const rightGlass=clearGlass('right'),rightBody=glassBody('right');
 const tubeGlow=lit('right',0x9aeefc,0x2fe4ff,.94),flaskGlow=lit('right',0x7fe9f8,0x2fe4ff,.8);
 const tubeLight=new THREE.PointLight(0x35e4ff,0,120,2),flaskLight=new THREE.PointLight(0x35e4ff,0,110,2);
 {
  const B=BULB,top=B.y+B.r,neck=6.2,w=WALL;
  const outer:[number,number][]=[[neck,114],[neck,B.y-14.3],...arcProfile(B.y,B.r,-66.4,85),[1.3,top+.3],[.8,top+1.6],[0,top+1.9]];
  clear(turned(tube,'right',rightGlass,B.x,0,[...outer,[0,top-w],...arcProfile(B.y,B.r-w,85,-63),[neck-w,B.y-13],[neck-w,114],[neck,114]],72));clear(turned(tube,'right',rightBody,B.x,0,outer,48));
  turned(tube,'right','chrome',B.x,0,[[0,110.6],[7.2,110.6],[7.2,112],[6.6,112.4],[7.2,112.8],[7.2,114.2],[6.6,114.6],[7.2,115],[7.2,115.8],[0,115.8]],40);
  b.cyl(tube,'right','darksteel',B.x,0,4.4,115.8,121,32);
  turned(tube,'right',tubeGlow,B.x,0,[[0,121],[3.2,121],[3.2,B.y-3.3],[7.4,B.y-2.8],[7.8,B.y+.2],[6.4,B.y+3.7],[3.4,B.y+5.9],[0,B.y+6.7]],40).castShadow=false;
  for(const dx of [-2.2,2.2])b.cyl(tube,'right','steel',B.x+dx,0,.3,B.y+6,B.y+10.4,8);b.cyl(tube,'right','steel',B.x,0,3,B.y+10.4,B.y+10.8,20);
  tubeLight.position.set(B.x,B.y,4);tube.add(tubeLight);
  b.wire(tube,'right','wireGrey',[[B.x,top+1.5,0],[B.x+12,B.y+13.5,3],[B.x+18.5,B.y-2,4],[B.x+15,B.y-20,4],[GAUGE.x+3,GAUGE.y+8,3.4]],.4);
  b.wire(tube,'right','gold',[[B.x-7,113,2],[B.x-17,122,5],[B.x-18.5,B.y+3,5],[B.x-12,B.y+13,4],[B.x-2,B.y+17.5,2]],.4);
  b.wire(tube,'right','gold',[[B.x+7,112,-2],[B.x+17.5,118,-5],[B.x+19.5,B.y+4,-5],[B.x+11,B.y+16,-4],[B.x+1,B.y+18.5,-2]],.35);
  for(const dx of [-2.5,2.5])b.cyl(tube,'right','steel',B.x+dx,0,.7,103,110.6,10);
  // Heater coil wound round the two feed rods.
  const coil:V3[]=[];for(let i=0;i<=72;i++){const a=i/72*Math.PI*12;coil.push([B.x+Math.cos(a)*3.6,103.6+i/72*6.4,Math.sin(a)*1.5])}
  b.wire(tube,'right','copper',coil,.28);
 }
 const gaugeNeedle=b.pivot(fittings,[GAUGE.x,GAUGE.y,3.7]);
 const so=sectorOffset(),sectorAt:V3=[GAUGE.x+so.x,GAUGE.y+so.y,-1.2];
 const sector=b.pivot(fittings,sectorAt),plunger=b.pivot(fittings,[sectorAt[0]-4,0,sectorAt[2]+.9]);
 const crank=b.pivot(fittings,[PUMP.x,PUMP.y,0]),piston=b.pivot(fittings,[PUMP.x,0,0]),bellows=b.pivot(fittings,[PUMP.x,0,0]),valve=b.pivot(fittings,[PUMP.x+2.4,PUMP.top+1.7,1.6]);
 const conRod=link(fittings,'right','steel',.45),gaugeLink=link(fittings,'right','steel',.3);
 {
  const x=BULB.x,y=101.2,U=PUMP;
  b.cyl(fittings,'right','brass',x,-22,1.5,F.floor,118);b.cyl(fittings,'right','brass',x,-22,5,F.floor,F.floor+1.6);
  rod(fittings,'right','brass',[x,113,-22],[x,113,-6],1);rod(fittings,'right','brass',[x,y,-22],[x,y,0],1);
  const pipe=put(fittings,'right',new THREE.CylinderGeometry(2.3,2.3,19,24),'brass');pipe.rotation.z=Math.PI/2;pipe.position.set(79,y,0);
  const fine=put(fittings,'right',new THREE.CylinderGeometry(1.1,1.1,14,16),'gold');fine.rotation.z=Math.PI/2;fine.position.set(79,y+4.4,0);
  b.ball(fittings,'right','gold',[x-2.6,y,0],3.5,28);b.cyl(fittings,'right','brass',x-2.6,0,3.9,y+2.4,y+4.2,6);
  for(const dx of [-2.5,2.5])b.cyl(fittings,'right','brass',x+dx,0,1.3,y+1,104.5,6);
  for(const px of [74.5,87])zc(fittings,'right','gold',px,y,2.9,-1,1,6);
  // Bellows pump. A crank turns once a second; its rod lifts the bellows' lower board, and the puff goes up the
  // outlet, past a flap valve, into the manifold that feeds the tube.
  zc(fittings,'right','darksteel',U.x,U.y,3.2,-8,-1.6,28);zc(fittings,'right','steel',U.x,U.y,.6,-1.6,.2,10);zc(fittings,'right','copper',U.x,U.y,3.3,-6.6,-3.2,28);
  rod(fittings,'right','brass',[x,U.y,-22],[U.x,U.y,-8],.9);
  flat(crank,'right','brass',discShape(3.6,{bore:.5,crossings:3,hub:1.1,rim:.8,spoke:.9}),.7,-.5);zc(crank,'right','steel',0,U.crank,.5,-.4,1.3,10);
  b.cyl(piston,'right','brass',0,0,U.r+.3,0,.7,32);b.box(piston,'right','brass',0,.85,1.6,1.9,-1.5,0);b.box(piston,'right','brass',0,-5.2,2,1.6,0,.7);
  const pleats:[number,number][]=[];for(let i=0;i<=10;i++)pleats.push([i%2?U.r:U.r-1.6,i/10]);
  put(bellows,'right',lathe(pleats,32),m.own('right',new THREE.MeshStandardMaterial({color:0x5a2618,roughness:.75,side:THREE.DoubleSide})));
  b.cyl(fittings,'right','brass',U.x,0,U.r+.3,U.top,U.top+.8,32);b.cyl(fittings,'right','brass',U.x,0,1.1,U.top+.8,y,14);b.cyl(fittings,'right','steel',U.x,-5.6,.4,U.y+4.5,U.top+.4,8);
  b.box(fittings,'right','brass',U.x,-5.2,2,1.6,U.top,U.top+.8);
  b.cyl(fittings,'right','gold',U.x,0,1.9,U.top+1.2,U.top+2.3,6);zbox(valve,'right','gold',2.2,0,5.4,.8,-.3,.3);b.ball(valve,'right','gold',[4.9,0,0],.8,12);zc(valve,'right','steel',0,0,.5,-1.6,.5,10);
  // Level gauge: the needle's pinion is turned by a toothed sector, which a plunger from the pressure capsule pulls.
  zc(fittings,'right','brass',GAUGE.x,GAUGE.y,GAUGE.r,0,3.4,48);
  put(fittings,'right',new THREE.CircleGeometry(GAUGE.r-.8,48),m.own('right',new THREE.MeshStandardMaterial({map:m.texture(gaugeTexture(false)),color:0xc8c8c8,roughness:.6})),false).position.set(GAUGE.x,GAUGE.y,3.44);
  zring(fittings,'right','gold',GAUGE.x,GAUGE.y,3.5,GAUGE.r-.5,.8);b.cyl(fittings,'right','gold',GAUGE.x,0,1.2,GAUGE.y+GAUGE.r-.4,GAUGE.y+GAUGE.r+1.8,12);
  zbox(gaugeNeedle,'right','black',0,1.9,.5,5.4,0,.25);zc(gaugeNeedle,'right','black',0,0,.9,0,.45,14);
  wheel(gaugeNeedle,'right','steel',{module:SECTOR.module,teeth:SECTOR.pinion,bore:.25},.9,sectorAt[2]-3.7);zc(gaugeNeedle,'right','steel',0,0,.3,sectorAt[2]-4.4,0,8);
  wheel(sector,'right','gold',{module:SECTOR.module,teeth:SECTOR.wheel,bore:.5,crossings:5,hub:1.5,rim:.9,spoke:1},.6,0);zc(sector,'right','steel',sectorPin.x,sectorPin.y,.4,0,1.3,8);
  zc(fittings,'right','steel',sectorAt[0],sectorAt[1],.5,sectorAt[2]-2.6,sectorAt[2]+.8,10);rod(fittings,'right','brass',[sectorAt[0],sectorAt[1],sectorAt[2]-2.2],[GAUGE.x,GAUGE.y+2,sectorAt[2]-2.2],.7);rod(fittings,'right','brass',[GAUGE.x,GAUGE.y+2,sectorAt[2]-2.2],[GAUGE.x,GAUGE.y+2,0],.7);
  b.cyl(plunger,'right','steel',0,0,.45,0,4.6,10);b.ball(plunger,'right','steel',[0,0,0],.6,10);
  b.cyl(fittings,'right','brass',sectorAt[0]-4,sectorAt[2]+.9,2.3,sectorAt[1]+8.4,sectorAt[1]+12.4,24);b.cyl(fittings,'right','gold',sectorAt[0]-4,sectorAt[2]+.9,2.6,sectorAt[1]+12.4,sectorAt[1]+13,24);
  b.wire(fittings,'right','gold',[[sectorAt[0]-4,sectorAt[1]+13,sectorAt[2]+.9],[sectorAt[0]-1,sectorAt[1]+16,-3],[sectorAt[0]-9,sectorAt[1]+15.5,-6],[x+3,112,-5]],.35);
  rod(fittings,'right','brass',[x-.4,y-1.5,0],[FLASK.x,90,0],1.1);
  b.wire(fittings,'right','gold',[[x-9,y+1,2],[x-15.5,y+6,4],[x-17,y-6,5],[x-16,y-18,4],[FLASK.x-10.5,FLASK.y+19.5,3]],.35);
 }
 {
  const K=FLASK,neck=8.5,w=WALL,shoulder=K.y+Math.sqrt(K.r*K.r-neck*neck),elev=(r:number,n:number)=>THREE.MathUtils.radToDeg(Math.acos(n/r));
  const outer:[number,number][]=[...arcProfile(K.y,K.r,-88,elev(K.r,neck),40),[neck,shoulder+.7],[neck+.8,shoulder+1.2]];
  clear(turned(flask,'right',rightGlass,K.x,0,[...outer,[neck-w,shoulder+1.2],...arcProfile(K.y,K.r-w,elev(K.r-w,neck-w),-88,40),outer[0]],72));clear(turned(flask,'right',rightBody,K.x,0,outer,48));
  const c=shoulder+.9;
  turned(flask,'right','gold',K.x,0,[[0,c],[9.6,c],[9.9,c+1.3],[7.2,c+2.6],[5.6,c+4.5],[4.8,c+8],[3.3,c+9.8],[3,c+11.6],[2,c+12.8],[0,c+13]],48);
  b.torus(flask,'right','brass',[K.x,c+.4,0],9.4,.7);
  b.cyl(flask,'right','brass',K.x,0,8,F.floor,F.floor+1.8);b.cyl(flask,'right','brass',K.x,0,1.7,F.floor+1.8,K.y-K.r+.8);b.torus(flask,'right','brass',[K.x,K.y-K.r+1.6,0],7.6,1);
  // The glowing stack inside the flask.
  b.cyl(flask,'right',flaskGlow,K.x,0,8.6,K.y-11,K.y-10.2,40).castShadow=false;
  [[7.2,-7],[5.6,-2.5],[4,2]].forEach(([r,dy])=>{b.torus(flask,'right',flaskGlow,[K.x,K.y+dy,0],r,.65).castShadow=false});
  b.cyl(flask,'right',flaskGlow,K.x,0,.8,K.y-10.2,K.y+7,10).castShadow=false;b.ball(flask,'right',flaskGlow,[K.x,K.y+7.6,0],1.7,16).castShadow=false;
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;b.cyl(flask,'right',flaskGlow,K.x+Math.cos(a)*5.6,Math.sin(a)*5.6,.35,K.y-10.2,K.y-2.5,6).castShadow=false}
  b.cyl(flask,'right','brass',K.x,0,2.2,K.y-K.r+.8,K.y-11,16);
  flaskLight.position.set(K.x,K.y,5);flask.add(flaskLight);
 }

 // ── Board and feet ──────────────────────────────────────────────────────
 const base=layer('board'),strip=layer('board',[0,0,24]),feet=layer('board',[0,-45,-78]);
 {
  const B=BASE,top=B.y1,cx=(B.x0+B.x1)/2,cz=(B.z0+B.z1)/2,w=B.x1-B.x0,d=B.z1-B.z0;
  b.box(base,'board',m.own('board',new THREE.MeshStandardMaterial({color:0x7a5a1e,roughness:.5,metalness:.3})),cx,cz,w,d,B.y0,B.y1);
  const silk=put(base,'board',new THREE.PlaneGeometry(w,d),m.own('board',new THREE.MeshStandardMaterial({map:m.texture(boardTexture(false)),roughness:.45,metalness:.35,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);
  silk.rotation.x=-Math.PI/2;silk.position.set(cx,top+.02,cz);
  for(const sx of [-1,1])for(const z of [B.z0+3,B.z1-3]){b.cyl(base,'board','brass',sx*(w/2-3),z,1.7,F.floor,B.y0,12);b.screw(base,'board',sx*(w/2-3),z,top,1.5)}
  for(let i=0;i<5;i++){const x=-58+i*7.4;b.cyl(base,'board','aluminium',x,-14,3,top,top+8,24);b.cyl(base,'board','darksteel',x,-14,2.2,top+8,top+8.2,20)}
  b.box(base,'board','black',-18,-12,13,11,top,top+8.5);b.box(base,'board','copper',-18,-12,9,12.6,top+1.5,top+7);b.box(base,'board','steel',-18,-12,14.5,3,top+8.5,top+9.3);
  for(const [x,z,cw,cd] of [[4,-13,12,8],[21,-12,8,8],[37,-14,10,6]]){b.box(base,'board','steel',x,z,cw+1.6,cd-1.4,top,top+.5);b.box(base,'board','chip',x,z,cw,cd,top,top+2);b.cyl(base,'board','slate',x-cw/2+1.2,z+cd/2-1.2,.45,top+2,top+2.06,10)}
  b.box(base,'board','steel',50,-7,8,3.4,top,top+3.2);b.torus(base,'board','copper',[56,top+1.7,-16],3.4,1.6);b.cyl(base,'board','black',56,-16,1.7,top,top+3.4,16);
  b.box(base,'board','black',0,5.5,17,3,top,top+4);for(let i=0;i<8;i++)b.cyl(base,'board','gold',-7+i*2,5.5,.35,top+4,top+6.2,8);
  for(const x of [-30,30]){b.box(base,'board','black',x,-3,9,6,top,top+5);for(const dx of [-2.2,2.2])b.cyl(base,'board','chrome',x+dx,-3,1.2,top+5,top+5.5,12)}
  const random=rng(31),bits=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.7,1),m.mat('board','chip'),26),dummy=new THREE.Object3D();
  for(let i=0;i<26;i++){dummy.position.set(-60+random()*120,top+.35,i%2?8.2+random()*1.4:-20.5+random()*1.5);dummy.rotation.y=random()<.5?0:Math.PI/2;dummy.updateMatrix();bits.setMatrixAt(i,dummy.matrix)}
  b.adopt(base,'board',bits,26);
  // Leads to the ring, the globe stand and the flask stand.
  b.wire(base,'board','wireGrey',[[0,top+5,5.5],[0,top+6,9],[1,top+3,13.5],[0,top+3.5,RING.z0]],.7);
  b.wire(base,'board','gold',[[-62,top+.5,-10],[-70,F.floor+1.2,-7],[GLOBE.x+4,F.floor+2,-3],[GLOBE.x,F.floor+2.2,0]],.5);
  b.wire(base,'board','gold',[[62,top+.5,-10],[72,F.floor+1.2,-7],[FLASK.x-4,F.floor+2,-3],[FLASK.x,F.floor+2.2,0]],.5);
  b.wire(base,'board','wireGrey',[[62,top+.5,-18],[72,F.floor+1.4,-21],[BULB.x,F.floor+2,-22]],.5);
 }
 {
  const S=STRIP,cx=(S.x0+S.x1)/2,cy=(S.y0+S.y1)/2,w=S.x1-S.x0,h=S.y1-S.y0,z=S.z1;
  zbox(strip,'board',m.own('board',new THREE.MeshStandardMaterial({color:0xb07a22,roughness:.4,metalness:.4})),cx,cy,w,h,S.z0,S.z1);
  put(strip,'board',new THREE.PlaneGeometry(w,h),m.own('board',new THREE.MeshStandardMaterial({map:m.texture(boardTexture(true)),roughness:.34,metalness:.55,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false).position.set(cx,cy,z+.02);
  for(const sy of [-1,1])zbox(strip,'board','gold',cx,cy+sy*(h/2-.5),w,1,z,z+.9);
  for(const x of [-40,55])b.cyl(strip,'board','brass',x,(S.z0+S.z1)/2,1,BASE.y1,S.y0,10);
  for(const x of [-38,-18.5,-3.5,16.5,31.5,42]){zc(strip,'board','gold',x,cy+.4,1.7,z,z+2.4,20);zc(strip,'board','brass',x,cy+.4,.8,z+2.4,z+2.9,12)}
  for(const x of [-31,-11,9,24,49.5]){zbox(strip,'board','gold',x,cy+.4,7.8,3.2,z,z+.4);zbox(strip,'board','brass',x,cy+.4,7,4.6,z+.4,z+1.5);zbox(strip,'board','chip',x,cy+.4,3.4,2,z+1.5,z+1.7)}
  for(const x of [-23.5,1.5,36.5]){zbox(strip,'board','frost',x,cy+.4,4.2,5,z,z+2);zbox(strip,'board','gold',x,cy+.4,2,2,z+2,z+2.3)}
  for(const x of [-43.5,58.5])zbox(strip,'board','gold',x,cy+.4,5,7,z,z+2.4);
  for(let i=0;i<18;i++)zbox(strip,'board','gold',-38+i*5.3,S.y0+1.9,.9,1.6,z,z+.6);
  // A second row of pads, two wound chokes, and a glass cover held by chrome posts.
  for(let i=0;i<24;i++)zbox(strip,'board','gold',-37+i*3.9,S.y1-1.7,1.5,.9,z,z+.5);
  for(const x of [-6.5,28.5]){zring(strip,'board','copper',x,S.y1-2.4,z+.9,1.5,.7);zc(strip,'board','gold',x,S.y1-2.4,.7,z,z+1.6,10)}
  clear(put(strip,'board',up(roundPlate(w-3,h-1.2,1.4),z+3.2,z+4,.3),clearGlass('board',1.1))).position.set(cx,cy,0);
  for(const sx of [-1,1])for(const sy of [-1,1]){zc(strip,'board','chrome',cx+sx*(w/2-2.6),cy+sy*(h/2-1.8),.8,z,z+4.4,12);zc(strip,'board','chrome',cx+sx*(w/2-2.6),cy+sy*(h/2-1.8),1.2,z+4,z+4.5,12)}
 }
 for(const sx of [-1,1])for(const sz of [-1,1]){
  turned(feet,'board','chrome',sx*FEET.x,sz*FEET.z,[[0,0],[9,.2],[12.4,2.2],[FEET.r,4.6],[12,7.2],[8.5,9],[5.4,9.7],[5.4,FEET.h+1.4],[0,FEET.h+1.4]],48);
  b.torus(feet,'board','chrome',[sx*FEET.x,10.6,sz*FEET.z],6.4,1.1);
 }

 // Polished metal and glass mirror a painted studio surround that never exceeds white, so chrome keeps its dark
 // bands without setting off the glow pass. It is dimmed with the room in the dark theme.
 const mirrors:{material:THREE.MeshStandardMaterial;full:number}[]=[];
 {
  const studio=m.texture(studioTexture()),seen=new Set<THREE.Material>();
  b.root.traverse(o=>{
   const material=(o as THREE.Mesh).material as THREE.MeshPhysicalMaterial|undefined;
   if(!material||seen.has(material)||!material.isMeshStandardMaterial)return;seen.add(material);
   if(material.metalness>=.8||material.transmission>0||material.blending===THREE.CustomBlending){material.envMap=studio;mirrors.push({material,full:material.envMapIntensity})}
  });
 }
 let dim:boolean|null=null;

 // ── What moves and what glows ───────────────────────────────────────────
 const colour=new THREE.Color(),sum=new THREE.Color();let drawn='';
 const mix=(palette:PaletteId,shift:number,u:number)=>{const [r,g,bl]=ringColour(palette,shift,u);return colour.setRGB(r,g,bl,THREE.SRGBColorSpace)};
 // Repaint the ring: one colour per emitter, the diffuser above them, and the lamps that light the inside.
 function paint(palette:PaletteId,shift:number,level:number,dark:boolean){
  const key=`${palette}:${shift.toFixed(4)}:${level.toFixed(3)}:${dark}`;if(key===drawn)return;drawn=key;
  for(let i=0;i<LEDS;i++){mix(palette,shift,ledU(i,LEDS)).multiplyScalar(.3+level*.5);leds.setColorAt(i,colour)}
  leds.instanceColor!.needsUpdate=true;
  for(let k=0;k<=TUBE.samples;k++){
   mix(palette,shift,tubeU(k));
   // Every hue is driven to the same luminance, just over the glow threshold, so magenta and blue bloom as yellow
   // does. In the light theme the drive is kept low so the cores stay coloured and the glow stays near the tube.
   const luma=.299*colour.r+.587*colour.g+.114*colour.b,peak=Math.max(colour.r,colour.g,colour.b,.01);
   colour.multiplyScalar(dark?Math.min(4/peak,(1.45+.5*level)/Math.max(luma,.08)):Math.min(3.2/peak,(1.27+.3*level)/Math.max(luma,.08)));
   for(let j=0;j<TUBE.sides;j++)tubeColours.setXYZ(k*TUBE.sides+j,colour.r,colour.g,colour.b);
  }
  tubeColours.needsUpdate=true;
  for(const {u,light} of sideLights){
   sum.setRGB(0,0,0);for(let j=-4;j<=4;j++)sum.add(mix(palette,shift,u+j*.02));
   light.color.copy(sum).multiplyScalar(1/9);light.intensity=level*200;
  }
 }
 const springPoints=hairspring.geometry.getAttribute('position') as THREE.BufferAttribute;
 return {
  hands:{set:setHand,hour:hourHand,minute:minuteHand,second:secondHand},dialWheels,go,forkRest,
  beat:{lamp:beatLamp},
  // Wind the hairspring to follow the balance (radians).
  breathe(wind:number){spiral(SPRING.turns,SPRING.inner,SPRING.outer,0,wind).forEach((p,i)=>springPoints.setXYZ(i,p[0],p[1],p[2]));springPoints.needsUpdate=true},
  day:{needle:dayNeedle,face:dayFace},
  tubes:{needle:gaugeNeedle,sector,sectorAt,plunger,gaugeLink,tube:tubeGlow,tubeLight,flask:flaskGlow,flaskLight},
  pump:{crank,piston,bellows,valve,conRod},
  knob,paint,
  theme(dark:boolean){if(dark===dim)return;dim=dark;for(const {material,full} of mirrors)material.envMapIntensity=full*(dark?.6:1)},
 };
}
