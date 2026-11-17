import * as THREE from 'three';
import {PLINTH,ARCH,MASTER,PEDESTAL,LCD,POST,SYNC,ORBS,DIALS,orb as orbAt,archOutline,type Orb,type V} from './layout';
import {MASTER_TRAIN,TEETH,MODULE,ORB_WORKS,orbTrain,direction,type Train,type Gear,type P2} from './works';
import {masterDial,orbDial,deckTexture,lcdScreen} from './textures';
import {slab,roundPlate,roundFrame,annulus,arc,lathe,type Builder} from '../kit/builder';
import {wheelGeometry,discShape,escapeWheelShape,ratchetShape,extrudeFlat,meshed,spiral,pitchRadius,rootRadius} from '../kit/horology';
import type {Kind} from '../kit/materials';
import type {AssemblyId} from './model';

type Mat=Kind|THREE.Material;
type Hands={hour:THREE.Object3D;minute:THREE.Object3D;second?:THREE.Object3D};
type Glow={dial:THREE.MeshStandardMaterial;shell:THREE.MeshPhysicalMaterial};
const TURN=Math.PI*2;

// Chunky Art Deco numerals as strokes on a 0.62 × 1 cell: bars [x0,y0,x1,y1] and arcs [cx,cy,r,from°,to°].
type Stroke=[number,number,number,number]|[number,number,number,number,number];
const GLYPHS:Record<string,Stroke[]>={
 '0':[[.31,.69,.215,0,180],[.31,.31,.215,180,360],[.095,.31,.095,.69],[.525,.31,.525,.69]],
 '1':[[.36,0,.36,1],[.37,.94,.1,.7]],
 '2':[[.31,.69,.215,-35,180],[.5,.59,.1,.15],[0,.095,.62,.095]],
 '3':[[.31,.725,.18,-90,150],[.31,.3,.205,-150,90]],
 '4':[[.45,0,.45,1],[.46,.97,.05,.34],[0,.34,.62,.34]],
 '5':[[.1,.905,.58,.905],[.15,.95,.15,.5],[.3,.31,.215,-150,125]],
 '6':[[.31,.31,.215,0,360],[.12,.4,.44,1]],
 '7':[[0,.905,.62,.905],[.57,.95,.22,0]],
 '8':[[.31,.735,.17,0,360],[.31,.3,.205,0,360]],
 '9':[[.31,.69,.215,0,360],[.5,.6,.18,0]],
};
const STROKE=.19;
function glyphShapes(ch:string,x0:number,sx:number,size:number){
 const X=(x:number)=>(x0+x*sx)*size,Y=(y:number)=>(y-.5)*size,t=STROKE*size/2;
 return GLYPHS[ch].map(s=>{
  const shape=new THREE.Shape();
  if(s.length===4){
   const ax=X(s[0]),ay=Y(s[1]),bx=X(s[2]),by=Y(s[3]),len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/len*t,ny=(bx-ax)/len*t;
   shape.moveTo(ax+nx,ay+ny);shape.lineTo(ax-nx,ay-ny);shape.lineTo(bx-nx,by-ny);shape.lineTo(bx+nx,by+ny);shape.closePath();
  }else{
   // Arcs keep a round bowl even when the cell is narrowed, so they are drawn as point lists.
   const [cx,cy,r,a0,a1]=s,n=Math.max(8,Math.round(Math.abs(a1-a0)/8)),pts:[number,number][]=[];
   for(const rr of [r*size+t,r*size-t])for(let i=0;i<=n;i++){const k=rr>r*size?i:n-i,a=(a0+(a1-a0)*k/n)*Math.PI/180;pts.push([X(cx)+Math.cos(a)*rr*sx,Y(cy)+Math.sin(a)*rr])}
   pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  }
  return shape;
 });
}

export function buildChorus(b:Builder){
 const {m,put,box,cyl,ball,wire}=b;
 const layer=(asm:AssemblyId,lift?:V,base?:V)=>b.layer(asm,lift,base);
 // Helpers for parts whose axis runs front to back (Z), which the kit's upright helpers do not cover.
 const zcyl=(parent:THREE.Object3D,asm:string,kind:Mat,x:number,y:number,r:number,z0:number,z1:number,segments=32)=>{
  const mesh=put(parent,asm,new THREE.CylinderGeometry(r,r,z1-z0,segments),kind);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,(z0+z1)/2);return mesh;
 };
 const zbox=(parent:THREE.Object3D,asm:string,kind:Mat,x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const mesh=put(parent,asm,new THREE.BoxGeometry(w,h,d),kind);mesh.position.set(x,y,z);return mesh;
 };
 // A flat bar between two points in the XY plane.
 const zbar=(parent:THREE.Object3D,asm:string,kind:Mat,a:P2,c:P2,z:number,w:number,d:number)=>{
  const mesh=zbox(parent,asm,kind,(a[0]+c[0])/2,(a[1]+c[1])/2,z,Math.hypot(c[0]-a[0],c[1]-a[1]),w,d);mesh.rotation.z=Math.atan2(c[1]-a[1],c[0]-a[0]);return mesh;
 };
 const ring=(parent:THREE.Object3D,asm:string,kind:Mat,x:number,y:number,z:number,r:number,tube:number,segments=64)=>{
  const mesh=put(parent,asm,new THREE.TorusGeometry(r,tube,12,segments),kind);mesh.position.set(x,y,z);return mesh;
 };
 const flatRing=(parent:THREE.Object3D,asm:string,kind:Mat,x:number,y:number,z:number,r:number,tube:number)=>{const mesh=ring(parent,asm,kind,x,y,z,r,tube,40);mesh.rotation.x=Math.PI/2;return mesh};
 const zslab=(shape:THREE.Shape|THREE.Shape[],z0:number,z1:number,segments=24)=>{const g=new THREE.ExtrudeGeometry(shape,{depth:z1-z0,bevelEnabled:false,curveSegments:segments});g.translate(0,0,z0);return g};
 // Extrusion along Z with rounded edges; the outline keeps its size.
 const zround=(shape:THREE.Shape|THREE.Shape[],z0:number,z1:number,bevel:number,segments=24)=>{
  const g=new THREE.ExtrudeGeometry(shape,{depth:z1-z0-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelOffset:-bevel,bevelSegments:4,curveSegments:segments});g.translate(0,0,z0+bevel);return g;
 };
 const zlathe=(profile:[number,number][],segments=96)=>{const g=lathe(profile,segments);g.rotateX(Math.PI/2);return g};
 const zscrew=(parent:THREE.Object3D,asm:string,x:number,y:number,z:number,r=1.8,turn=.4)=>{
  zcyl(parent,asm,'chrome',x,y,r,z,z+r*.5,18);const slot=zbox(parent,asm,'darksteel',x,y,z+r*.48,r*1.5,r*.2,r*.14);slot.rotation.z=turn;
 };
 const disc=(parent:THREE.Object3D,asm:string,material:THREE.Material,x:number,y:number,z:number,r:number)=>{
  const mesh=put(parent,asm,new THREE.CircleGeometry(r,96),material,false);mesh.position.set(x,y,z);return mesh;
 };
 const leaf=(len:number,tail:number,w:number)=>{
  const s=new THREE.Shape();s.moveTo(0,-tail);s.quadraticCurveTo(w*.9,-tail*.6,w*.22,-1.2);s.lineTo(w*.22,1.2);s.bezierCurveTo(w*1.25,len*.28,w*.35,len*.7,0,len);
  s.bezierCurveTo(-w*.35,len*.7,-w*1.25,len*.28,-w*.22,1.2);s.lineTo(-w*.22,-1.2);s.quadraticCurveTo(-w*.9,-tail*.6,0,-tail);return s;
 };
 const bullnose=(w:number,d:number,r:number,y0:number,y1:number,bevel:number)=>{
  const g=new THREE.ExtrudeGeometry(roundPlate(w-bevel*2,d-bevel*2,Math.max(1,r-bevel)),{depth:y1-y0-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:8,curveSegments:24});
  g.rotateX(-Math.PI/2);g.translate(0,y0+bevel,0);return g;
 };
 const ink=(asm:string)=>m.own(asm,new THREE.MeshStandardMaterial({color:0x08090a,roughness:.55,envMapIntensity:.25}));
 const clear=(asm:string,opacity:number,color=0xffffff)=>m.own(asm,new THREE.MeshPhysicalMaterial({color,transparent:true,opacity,roughness:.03,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.8,depthWrite:false,side:THREE.DoubleSide}));
 // Thick-glass look for parts that sit inside the refracting enclosure and so cannot refract themselves:
 // the surface turns denser and brighter toward grazing angles, like the rim of a solid glass ball.
 const rimmed=<T extends THREE.Material>(material:T,strength=2.6,light=.5)=>{
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',
   `float rimF=pow(1.-abs(dot(normalize(vViewPosition),normal)),2.2);outgoingLight+=rimF*vec3(${light.toFixed(2)});diffuseColor.a=min(1.,diffuseColor.a*(1.+rimF*${strength.toFixed(2)}));\n#include <opaque_fragment>`)};
  return material;
 };
 const ruby=(asm:string)=>m.own(asm,new THREE.MeshPhysicalMaterial({color:0xc2103a,roughness:.12,clearcoat:1,emissive:0x50000c,emissiveIntensity:.5}));
 const blued=(asm:string)=>m.own(asm,new THREE.MeshStandardMaterial({color:0x2b4fa8,roughness:.25,metalness:1}));

 // ── Clockwork ───────────────────────────────────────────────────────────
 // Builds a train from works.ts: one pivot per arbor, involute wheels and pinions on it, a jewel at its front end,
 // then the lever escapement. `solve` phases every mesh with `meshed`, so teeth interlock at any angle.
 function buildTrain(asm:string,t:Train,parentOf:(arbor:string)=>THREE.Object3D,o:{arbor:number;jewels:string[];stones:THREE.Material;spring:THREE.Material}){
  const nodes:Record<string,THREE.Object3D>={},byId=Object.fromEntries(t.gears.map(g=>[g.id,g])) as Record<string,Gear>;
  const pipe:Record<string,number>={cannon:1.7,hour:2.5};
  for(const id in t.arbors){
   const [x,y]=t.arbors[id],parent=parentOf(id),node=b.pivot(parent,[x,y,0]),[a0,a1]=t.span[id],r=o.arbor*(pipe[id]??1);nodes[id]=node;
   zcyl(node,asm,'steel',0,0,r,a0,a1,14);
   if(o.jewels.includes(id)){
    // Jewel in a gold chaton at each end of the arbor.
    for(const z of [a1,a0]){zcyl(parent,asm,o.stones,x,y,o.arbor*1.5,z-.15*o.arbor,z+.5*o.arbor,14);ring(parent,asm,'gold',x,y,z+.3*o.arbor*(z===a1?1:-1),o.arbor*2,o.arbor*.5,20)}
   }
  }
  for(const g of t.gears){
   const node=nodes[g.arbor],shaft=o.arbor*(pipe[g.arbor]??1),wheel=g.teeth>=20;
   const spec=wheel&&rootRadius(g.module,g.teeth)>shaft*5?{module:g.module,teeth:g.teeth,crossings:g.teeth>=60?5:4,hub:Math.max(shaft*2.4,pitchRadius(g.module,g.teeth)*.2),rim:g.module*1.8,spoke:Math.max(g.module*2,pitchRadius(g.module,g.teeth)*.11)}:{module:g.module,teeth:g.teeth};
   put(node,asm,wheelGeometry(spec,g.thick),g.metal).position.z=g.z;
   // Collet seating the wheel on its arbor.
   if(wheel)zcyl(node,asm,'brass',0,0,shaft*1.9,g.z-g.thick/2-o.arbor*.5,g.z+g.thick/2+o.arbor*.5,16);
  }
  // Lever escapement.
  const E=t.escape,ea=t.arbors[E.arbor],u=E.radius/6.5,[px,py]=t.pallet,[bx,by]=t.balance.at,host=parentOf(E.arbor);
  put(nodes[E.arbor],asm,extrudeFlat(escapeWheelShape(E.teeth,E.radius,{crossings:4,hub:E.radius*.26}),.7*u),'steel').position.z=E.z;
  const toBalance=Math.atan2(by-py,bx-px),D=Math.hypot(bx-px,by-py);
  const fork=b.pivot(host,[px,py,E.z]);fork.rotation.z=toBalance;
  {
   // In the fork's frame +X points at the balance. The pallet stones sit on the escape wheel's rim, either side of the line of centres.
   const c=Math.cos(-toBalance),s=Math.sin(-toBalance),ex=(ea[0]-px)*c-(ea[1]-py)*s,ey=(ea[0]-px)*s+(ea[1]-py)*c,back=Math.atan2(-ey,-ex);
   for(const side of [-1,1]){
    const a=back+side*.66,stone:P2=[ex+Math.cos(a)*E.radius*.98,ey+Math.sin(a)*E.radius*.98];
    zbar(fork,asm,'brass',[0,0],stone,0,.9*u,.5*u);zbox(fork,asm,o.stones,stone[0],stone[1],0,1.5*u,.7*u,.8*u).rotation.z=a+side*.5;
   }
   zbar(fork,asm,'brass',[0,0],[D-2.1*u,0],0,.8*u,.5*u);
   for(const side of [-1,1])zbox(fork,asm,'brass',D-1.7*u,side*.55*u,0,1.3*u,.35*u,.5*u);
   zcyl(fork,asm,'steel',0,0,.45*u,-2.5*u,2.5*u,10);zcyl(fork,asm,o.stones,0,0,.7*u,2.5*u,2.9*u,12);
  }
  const R=t.balance.radius,bz=t.balance.z,wheelNode=b.pivot(host,[bx,by,bz]);
  put(wheelNode,asm,extrudeFlat(discShape(R,{crossings:3,hub:R*.2,rim:R*.17,spoke:R*.16}),.9*u),'gold');
  for(let i=0;i<8;i++){const a=i*Math.PI/4+.2;const w=cyl(wheelNode,asm,i%4?'gold':'steel',0,0,.38*u,0,1.1*u,8);w.rotation.z=a-Math.PI/2;w.position.set(Math.cos(a)*(R+.4*u),Math.sin(a)*(R+.4*u),0)}
  zcyl(wheelNode,asm,'steel',0,0,.5*u,-3*u,3.4*u,10);zcyl(wheelNode,asm,'steel',0,0,1.9*u,-1.6*u,-1.1*u,16);
  zcyl(wheelNode,asm,o.stones,-1.5*u,0,.32*u,-1.9*u,-.9*u,8);
  zcyl(host,asm,o.stones,bx,by,.9*u,bz+3.4*u,bz+3.9*u,12);ring(host,asm,'gold',bx,by,bz+3.6*u,1.3*u,.3*u,16);
  // Hairspring: the outer end is pinned to a stud, the inner end turns with the balance, so the coil breathes.
  const springAt=b.pivot(host,[bx,by,bz+1.5*u]),springGeometry=(wind:number)=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral(5,1*u,R*.62,0,wind,14).map(p=>new THREE.Vector3(...p))),140,.13*u,4);
  const hair=put(springAt,asm,springGeometry(0),o.spring,false);zbox(springAt,asm,'steel',R*.62+.5*u,0,0,1.2*u,.9*u,1.2*u);
  let wound=0;
  return {
   nodes,
   // `root` is the fourth arbor's rotation. The escape pinion follows `beatRoot` (the same arbor at escapement time) plus its `lead`.
   solve(root:number,beatRoot:number,lead:number){
    const rot:Record<string,number>={fourth:root};
    for(const mesh of t.meshes){
     const a=byId[mesh.driver],c=byId[mesh.driven];
     if(mesh.slip)rot[c.arbor]=meshed(beatRoot,a.teeth,c.teeth,direction(t,a.arbor,c.arbor))+TURN/E.teeth*lead;
     else if(rot[a.arbor]!==undefined)rot[c.arbor]=meshed(rot[a.arbor],a.teeth,c.teeth,direction(t,a.arbor,c.arbor));
     else rot[a.arbor]=meshed(rot[c.arbor],c.teeth,a.teeth,direction(t,c.arbor,a.arbor));
    }
    for(const id in nodes)nodes[id].rotation.z=rot[id]??0;
   },
   beat(forkAngle:number,balance:number){
    fork.rotation.z=toBalance+forkAngle;wheelNode.rotation.z=balance;
    if(Math.abs(balance-wound)>.01){wound=balance;hair.geometry.dispose();hair.geometry=springGeometry(balance)}
   },
  };
 }

 // ── Plinth ──────────────────────────────────────────────────────────────
 const P=PLINTH,plinth=layer('plinth');
 const mirror=m.own('plinth',new THREE.MeshStandardMaterial({color:0xf2f4f6,roughness:.1,metalness:1}));
 put(plinth,'plinth',bullnose(P.w,P.d,P.r,P.foot,P.step,5),mirror);
 put(plinth,'plinth',bullnose(P.deckW+8,P.deckD+8,18,P.step-1,P.top-2.5,2),mirror);
 put(plinth,'plinth',bullnose(P.deckW,P.deckD,16,P.top-4,P.top,1.2),mirror);
 const deckMap=m.texture(deckTexture());deckMap.repeat.set(4,3.4);
 const deck=put(plinth,'plinth',new THREE.PlaneGeometry(P.deckW-8,P.deckD-8),m.own('plinth',new THREE.MeshStandardMaterial({map:deckMap,roughness:.3,metalness:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);
 deck.rotation.x=-Math.PI/2;deck.position.y=P.top+.03;
 put(plinth,'plinth',slab(roundFrame(ARCH.w+1,ARCH.d+1,2,5),P.top,P.top+.6),'rubber',false);
 put(plinth,'plinth',slab(roundPlate(P.w-30,P.d-30,14),P.foot-2.5,P.foot),'darksteel');
 for(const sx of [-1,1])for(const sz of [-1,1]){
  cyl(plinth,'plinth','black',sx*165,sz*62,15,1.2,P.foot+1,48);cyl(plinth,'plinth','rubber',sx*165,sz*62,13.5,0,1.2,40);
  flatRing(plinth,'plinth','chrome',sx*165,P.foot-.5,sz*62,15.2,.8);
  cyl(plinth,'plinth','chrome',sx*(ARCH.w/2-16),sz*(ARCH.d/2-14),1.6,P.top,P.top+3.5,16);
 }
 for(const x of [-120,-40,40,120])for(const sz of [-1,1])b.screw(plinth,'plinth',x,sz*(P.deckD/2-6),P.top,1.5);
 box(plinth,'plinth','black',0,P.d/2-5.2,46,.5,14.5,20.5);box(plinth,'plinth','gold',0,P.d/2-5,40,.5,15.5,19.5);

 // ── Enclosure ───────────────────────────────────────────────────────────
 // Solid 4 mm glass with rounded edges. The back pane and the bent wrap refract; the front pane is clear and
 // unrefracting, because refracting glass would hide the refracting bezel ring and the tinted orbs behind it.
 const A=ARCH,cover=layer('enclosure');
 const outer=archOutline(A.w,A.h,A.r),inner=archOutline(A.w-A.wall*2,A.h-A.wall,A.r-A.wall);
 const shapeOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const pane=m.own('enclosure',rimmed(new THREE.MeshPhysicalMaterial({color:0xf4fbff,transparent:true,opacity:.07,roughness:.02,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.5,depthWrite:false}),5,.35));
 put(cover,'enclosure',zround(shapeOf(inner),A.d/2-A.wall,A.d/2,1),pane,false).position.y=A.y0;
 put(cover,'enclosure',zround(shapeOf(inner),-A.d/2,-A.d/2+A.wall,1),'crystal',false).position.y=A.y0;
 put(cover,'enclosure',zround(shapeOf([...outer,...[...inner].reverse()]),-A.d/2,A.d/2,1),'crystal',false).position.y=A.y0;
 const tubeMaterial=m.own('enclosure',new THREE.MeshStandardMaterial({color:0xf2f4f6,roughness:.1,metalness:1}));
 for(const z of [A.d/2,-A.d/2]){
  const curve=new THREE.CatmullRomCurve3(outer.map(([x,y])=>new THREE.Vector3(x,A.y0+y,z)));
  put(cover,'enclosure',new THREE.TubeGeometry(curve,320,A.tube,16),tubeMaterial);
  for(const sx of [-1,1]){cyl(cover,'enclosure','chrome',sx*A.w/2,z,A.tube+1.6,A.y0,A.y0+7,24);cyl(cover,'enclosure','steel',sx*A.w/2,z,A.tube+.7,A.y0+7,A.y0+8.2,24)}
  box(cover,'enclosure','chrome',0,z,A.w-12,2.2,A.y0+.6,A.y0+3.4);
 }
 for(const sx of [-1,1]){
  box(cover,'enclosure','chrome',sx*A.w/2,0,2.2,A.d-12,A.y0+.6,A.y0+3.4);
  box(cover,'enclosure','steel',sx*(A.w/2+1.4),0,2,16,A.y0+3,A.y0+15);const pin=cyl(cover,'enclosure','chrome',0,0,2.2,0,5,20);pin.rotation.z=Math.PI/2;pin.position.set(sx*(A.w/2+3.6),A.y0+10,0);
 }
 cyl(cover,'enclosure','chrome',0,0,4.2,A.y0+A.h-.4,A.y0+A.h+2.2,28);cyl(cover,'enclosure','steel',0,0,2.6,A.y0+A.h-A.wall-2.2,A.y0+A.h-A.wall,6);
 for(const x of [-70,70])for(const z of [A.d/2,-A.d/2]){const tie=ring(cover,'enclosure','steel',x,A.y0+A.h,z,A.tube+.5,.7,24);tie.rotation.y=Math.PI/2}

 // ── Pedestal and display ────────────────────────────────────────────────
 const D=PEDESTAL,M=MASTER,body=layer('pedestal'),polished=m.own('pedestal',new THREE.MeshStandardMaterial({color:0xf2f4f6,roughness:.1,metalness:1}));
 {
  // Sculpted block: upright sides sweeping into broad elliptical shoulders.
  const bv=3,w=D.w/2-bv,h=D.h-bv*2,rx=38,sy=14,s=new THREE.Shape();
  s.moveTo(-w,0);s.lineTo(w,0);s.lineTo(w,sy);s.absellipse(w-rx,sy,rx,h-sy,0,Math.PI/2,false,0);s.lineTo(-w+rx,h);s.absellipse(-w+rx,sy,rx,h-sy,Math.PI/2,Math.PI,false,0);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:D.d-bv*2,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:8,curveSegments:32});g.translate(0,D.y0+bv,-D.d/2+bv);
  put(body,'pedestal',g,polished);
 }
 put(body,'pedestal',bullnose(D.w+12,D.d+8,8,D.y0,D.y0+4,1.5),polished);
 // Saddle that follows the hood, with a bead along each edge.
 const hoodY=M.y+M.hoodRise;
 put(body,'pedestal',zround(arc(M.hood+1,M.hood+10.5,-Math.PI*.71,-Math.PI*.29),-40,9,1.5,48),polished).position.y=hoodY;
 for(const z of [-40,9]){const bead=put(body,'pedestal',new THREE.TorusGeometry(M.hood+10.5,1.3,10,48,Math.PI*.42),'chrome');bead.position.set(0,hoodY,z);bead.rotation.z=-Math.PI*.71}
 const front=D.d/2;
 for(const sx of [-1,1]){
  zscrew(body,'pedestal',sx*80,63,front,1.9,sx*.5);zscrew(body,'pedestal',sx*90,38,front,1.9,.9);
  zbox(body,'pedestal','gold',sx*(LCD.w/2+4.2),LCD.y,front+.4,2,LCD.h-4,.8);
  for(const [x,y] of [[86,52],[82,45]]){zcyl(body,'pedestal','brass',sx*x,y,1.7,front,front+4,16);zcyl(body,'pedestal','black',sx*x,y,2.5,front,front+1.2,16)}
  // Fluting on each shoulder.
  for(let i=0;i<3;i++)zbox(body,'pedestal','chrome',sx*(72+i*6.5),D.y0+7.5,front+.3,1.6,7,.9);
 }
 // Back: speaker grille, battery door, jack, and the sync motor that turns the line shaft.
 zcyl(body,'pedestal','darksteel',-52,54,12,-front-.8,-front,40);for(let i=0;i<5;i++)zbox(body,'pedestal','black',-52,45+i*4.5,-front-1,17-Math.abs(i-2)*4,1.4,.5);
 zbox(body,'pedestal','steel',48,52,-front-.5,46,24,1);zbox(body,'pedestal','black',66,52,-front-1.1,5,10,.5);zcyl(body,'pedestal','gold',-80,40,2.6,-front-2.4,-front,20);
 const motorY=SYNC.y+MODULE.sync*(TEETH.motor+TEETH.line)/2;
 zbox(body,'pedestal','darksteel',-9.5,motorY+1,(-front+SYNC.z-6)/2,13,14,-SYNC.z+6-front);zbox(body,'pedestal','steel',-9.5,motorY+1,SYNC.z-6.4,9,10,.8);
 for(const y of [motorY-4,motorY+6])zscrew(body,'pedestal',-9.5,y,SYNC.z-6.9,1,.3);
 const pcb=layer('pedestal',[0,0,38]),screen=layer('pedestal',[0,0,68]),bezelFrame=layer('pedestal',[0,0,100]);
 zbox(pcb,'pedestal','navy',0,LCD.y,front+.6,LCD.w-5,LCD.h-4,1.2);
 for(let i=0;i<6;i++)zbox(pcb,'pedestal','chip',-50+i*20,LCD.y+(i%2?4:-4),front+1.5,7,5,.9);
 for(let i=0;i<12;i++)zbox(pcb,'pedestal','gold',-55+i*10,LCD.y-9.5,front+1.3,1.4,2.4,.4);
 const lcd=lcdScreen();m.texture(lcd.texture);
 const lcdMaterial=m.own('pedestal',new THREE.MeshStandardMaterial({map:lcd.texture,roughness:.32,emissive:0xffffff,emissiveMap:lcd.texture,emissiveIntensity:.16}));
 zbox(screen,'pedestal','frost',0,LCD.y,front+1.7,LCD.screenW+2,LCD.screenH+2,1);
 put(screen,'pedestal',new THREE.PlaneGeometry(LCD.screenW,LCD.screenH),lcdMaterial,false).position.set(0,LCD.y,front+2.25);
 put(bezelFrame,'pedestal',zround(roundFrame(LCD.w,LCD.h,6,3.6),front,front+4.2,.8),'chrome').position.set(0,LCD.y,0);
 put(bezelFrame,'pedestal',zslab(roundFrame(LCD.w-6.4,LCD.h-6.4,3,.9),front+1.6,front+2.6),'black').position.set(0,LCD.y,0);
 zbox(bezelFrame,'pedestal',clear('pedestal',.1),0,LCD.y,front+3,LCD.w-7,LCD.h-7,.6).castShadow=false;

 // ── Master clock ────────────────────────────────────────────────────────
 const centre:V=[M.x,M.y,0];
 const hood=layer('master',[0,0,-165],centre),movement=layer('master',[0,0,-85],centre),motion=layer('master',[0,0,-30],centre),dial=layer('master',[0,0,12],centre);
 const handLayer=layer('master',[0,0,80],centre),bezel=layer('master',[0,0,150],centre),finial=layer('master',[0,45,-165],centre);
 const drum=b.pivot(hood,[0,M.hoodRise,0]),H=M.hood,z0=M.hoodZ0,z1=M.hoodZ1;
 const hoodMaterial=m.own('master',new THREE.MeshStandardMaterial({color:0xf2f4f6,roughness:.1,metalness:1}));
 // Deep drum with a domed back and a rolled front lip.
 put(drum,'master',zlathe([[0,z0-3],[H-34,z0-2.2],[H-16,z0],[H-5,z0+4],[H,z0+12],[H,z1-4],[H-1,z1-1.2],[H-3,z1],[H-11,z1],[H-11,z1-1.5],[H-2.8,z1-2.8],[H-2.8,z0+12],[H-7,z0+5],[H-17,z0+2.6],[0,z0+2]],128),hoodMaterial);
 ring(drum,'master','chrome',0,0,z1-1,H-.2,1.5,128);ring(drum,'master','steel',0,0,z0+12,H+.1,.8,128);ring(drum,'master','steel',0,0,(z0+z1)/2,H+.1,.6,128);
 zcyl(drum,'master','darksteel',0,-M.hoodRise,52,z0-3.4,z0-2.4,72);
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;zscrew(drum,'master',Math.cos(a)*46,Math.sin(a)*46-M.hoodRise,z0-3.4,1.8,a)}
 for(const [x,y] of [[-22,-8],[22,-8]]){zcyl(drum,'master','brass',x,y-M.hoodRise,2,z0-11,z0-3.4,16);zbox(drum,'master','brass',x,y-M.hoodRise,z0-12.5,13,7,1.6)}
 zcyl(drum,'master','gold',0,-34-M.hoodRise,5,z0-7.4,z0-3.4,24);zcyl(drum,'master','black',0,24-M.hoodRise,7,z0-4,z0-3.4,28);
 {const knob=cyl(drum,'master','chrome',0,0,5,0,7,28);knob.rotation.z=Math.PI/2;knob.position.set(-H-3.5,5,-14);const stem=cyl(drum,'master','steel',0,0,2,0,3,16);stem.rotation.z=Math.PI/2;stem.position.set(-H+.2,5,-14)}
 // Movement: back plate, skeleton front plate with a bar to every outlying arbor, four pillars.
 const MT=MASTER_TRAIN,stones=ruby('master'),at=(id:string)=>MT.arbors[id],angleOf=(p:P2)=>Math.atan2(p[1],p[0]);
 zcyl(movement,'master','steel',0,0,54,-18,-16.5,72);ring(movement,'master','brass',0,0,-16.6,53.4,.6,96);
 put(movement,'master',zslab(annulus(47,58),3.5,5,72),'brass');zcyl(movement,'master','brass',0,0,17,3.5,5,48);
 for(const a of [angleOf(at('centre')),angleOf(at('barrel')),angleOf(MT.balance.at),-Math.PI/2,1.95]){zbar(movement,'master','brass',[Math.cos(a)*15,Math.sin(a)*15],[Math.cos(a)*49,Math.sin(a)*49],4.25,6,1.5);zscrew(movement,'master',Math.cos(a)*44,Math.sin(a)*44,5,1.3,a)}
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;zcyl(movement,'master','steel',Math.cos(a)*52,Math.sin(a)*52,2.2,-16.5,3.5,16);zscrew(movement,'master',Math.cos(a)*52,Math.sin(a)*52,5,2.2,a)}
 for(let i=0;i<3;i++){const a=Math.PI/2+i*Math.PI*2/3;zcyl(movement,'master','steel',Math.cos(a)*53,Math.sin(a)*53,1.5,5,M.dialZ,12)}
 const works=buildTrain('master',MT,id=>['idler','cannon','minute','hour','dayIdler','day'].includes(id)?motion:movement,{arbor:.9,jewels:['third','escape','centre','barrel'],stones,spring:blued('master')});
 {
  // Going barrel: open drum, mainspring, skeleton cover; ratchet and click on the front of the barrel bar.
  const node=works.nodes.barrel,[bx,by]=at('barrel');
  put(node,'master',zlathe([[0,-12.4],[15,-12.4],[15,-4.6],[14.2,-4.6],[14.2,-11.6],[0,-11.6]],48),'brass');
  put(node,'master',extrudeFlat(discShape(15,{crossings:4,hub:4,rim:1.6,spoke:2.6}),.6),'brass').position.z=-4.4;
  wire(node,'master',blued('master'),spiral(5.5,2.6,13.6,-6),.4);
  put(movement,'master',extrudeFlat(ratchetShape(24,6.5),.8),'steel').position.set(bx,by,6.2);zscrew(movement,'master',bx,by,6.6,1.6,.2);
  const pawl:P2=[bx+9.6*Math.cos(1.2),by+9.6*Math.sin(1.2)],tip:P2=[bx+6.3*Math.cos(.55),by+6.3*Math.sin(.55)];
  zbar(movement,'master','steel',pawl,tip,6.2,1.5,.8);zscrew(movement,'master',pawl[0],pawl[1],6.6,1,.9);
  wire(movement,'master','steel',[[pawl[0]+2.4,pawl[1]+3.2,6.2],[pawl[0]+3.4,pawl[1]-1,6.2],[tip[0]+2.2,tip[1]-.6,6.2],[tip[0]+.8,tip[1]+.3,6.2]],.25);
 }
 zcyl(movement,'master','steel',0,0,.6,5,M.dialZ+5.4,10);
 // Dial: printed track and sub-dial, raised gold numerals.
 const masterInk=ink('master');
 const dz=M.dialZ;
 zcyl(dial,'master','white',0,0,M.dial,dz,dz+1.5,128);
 // No polygon offset on the printed face: its slope-scaled pull grows with camera distance and swallowed the raised numerals when exploded.
 disc(dial,'master',m.own('master',new THREE.MeshStandardMaterial({map:m.texture(masterDial()),roughness:.42,envMapIntensity:.7})),0,0,dz+1.6,M.dial-.3);
 ring(dial,'master','gold',0,0,dz+1.7,M.dial*.93,.45,128);ring(dial,'master','chrome',0,0,dz+1.2,M.dial,1.1,128);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;zcyl(dial,'master','gold',Math.sin(a)*M.dial*.947,Math.cos(a)*M.dial*.947,.9,dz+1.5,dz+2.3,12)}
 const numeralGold=m.own('master',new THREE.MeshStandardMaterial({color:0xe2a02c,roughness:.32,metalness:.65}));
 for(let n=1;n<=12;n++){
  const text=String(n),size=16.5,sx=text.length>1?.8:1,width=text.length*.62*sx+(text.length-1)*.1,a=n*Math.PI/6;
  const shapes=[...text].flatMap((ch,i)=>glyphShapes(ch,-width/2+i*(.62*sx+.1),sx,size));
  const g=new THREE.ExtrudeGeometry(shapes,{depth:.55,bevelEnabled:true,bevelThickness:.25,bevelSize:.22,bevelOffset:-.22,bevelSegments:2,curveSegments:8});
  put(dial,'master',g,numeralGold).position.set(Math.sin(a)*M.dial*.785,Math.cos(a)*M.dial*.785,dz+1.9);
 }
 ring(dial,'master','steel',0,M.sub.y,dz+1.8,M.sub.r,.5,48);
 const dayHand=b.pivot(dial,[0,M.sub.y,dz+2.2]);zbox(dayHand,'master',masterInk,0,M.sub.r*.36,0,.9,M.sub.r*.9,.3);zcyl(dayHand,'master','gold',0,0,1.1,-.2,.4,14);
 // Hands, each on its own pivot at the centre.
 const hz=dz+2.9,hand=(z:number)=>b.pivot(handLayer,[0,0,z]);
 const alarm=hand(hz),hour=hand(hz+.8),minute=hand(hz+1.6),second=hand(hz+2.4);
 zbox(alarm,'master',masterInk,0,24,0,.7,58,.3);zbox(alarm,'master','gold',0,56,0,1.3,7,.35);
 put(hour,'master',zslab(leaf(44,17,7.4),0,.6),masterInk);put(minute,'master',zslab(leaf(58,19,6),0,.6),masterInk);
 zbox(second,'master',masterInk,0,23,0,.55,78,.3);zcyl(second,'master',masterInk,0,-13,1.8,-.15,.15,16);
 zcyl(handLayer,'master','gold',0,0,2.6,hz-.4,hz+3,24);zcyl(handLayer,'master','brass',0,0,1.1,hz+3,hz+3.8,16);
 // Bezel: a solid glass ring that refracts the hood behind it, between two thin chrome rings, under a domed crystal.
 const bz=dz+9.5;
 const ringGlass=m.own('master',(m.mat('master','crystal') as THREE.MeshPhysicalMaterial).clone());ringGlass.thickness=14;ringGlass.dispersion=.5;ringGlass.envMapIntensity=1.5;
 put(bezel,'master',new THREE.TorusGeometry(M.bezel,M.bezelTube,24,160),ringGlass,false).position.z=bz;
 ring(bezel,'master','chrome',0,0,bz-4,M.bezel-M.bezelTube+.6,.9,128);ring(bezel,'master','chrome',0,0,bz,M.bezel+M.bezelTube-.2,.7,128);
 {
  const chord=M.bezel-M.bezelTube+.5,sag=5,R=(chord*chord+sag*sag)/(2*sag);
  const g=new THREE.SphereGeometry(R,64,12,0,Math.PI*2,0,Math.asin(chord/R));g.rotateX(Math.PI/2);
  const crystal=put(bezel,'master',g,m.own('master',rimmed(new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.03,roughness:.03,clearcoat:1,envMapIntensity:1,depthWrite:false}),6,.3)),false);crystal.position.z=bz+1-(R-sag);
 }
 for(let i=0;i<3;i++){const a=-Math.PI/2+(i-1)*2.2;zbox(bezel,'master','chrome',Math.cos(a)*(M.bezel+M.bezelTube-1.5),Math.sin(a)*(M.bezel+M.bezelTube-1.5),bz-4.5,4,4,5).rotation.z=a}
 // Finial on the crown of the hood.
 const crown=M.hoodRise+H,fy=M.finial-M.y,fzAt=(z0+z1)/2;
 put(finial,'master',lathe([[0,crown-1],[6,crown-1],[6,crown+1],[3.4,crown+2.4],[2,crown+4],[2,fy-9],[4.2,fy-8],[4.2,fy-6.6],[2.2,fy-6],[0,fy-6]],32),'chrome').position.z=fzAt;
 ball(finial,'master','chrome',[0,fy,fzAt],M.finialR,48);cyl(finial,'master','steel',0,fzAt,1.2,fy+M.finialR-.5,fy+M.finialR+4,12);
 ring(finial,'master','chrome',0,fy+M.finialR+5.6,fzAt,2,.55,24);
 wire(finial,'master','steel',[[0,crown+1,fzAt+4],[0,crown+.6,z1-4],[0,crown-3,z1+2],[0,crown-12,z1+3.4]],.5);

 // ── Orbs ────────────────────────────────────────────────────────────────
 const hands:Record<string,Hands>={},glow:Record<string,Glow>={},swing:Record<string,THREE.Object3D[]>={};
 const orbWorks:Record<string,ReturnType<typeof buildTrain>>={};
 const inks={left:ink('left'),right:ink('right')},rubies={left:ruby('left'),right:ruby('right')},springs={left:blued('left'),right:blued('right')};
 for(const o of ORBS){
  const asm=o.asm,R=o.r,hang=o.pivotY!==undefined,base:V=[o.x,hang?o.pivotY!:o.y,0],drop=hang?o.y-o.pivotY!:0;
  const shellLayer=layer(asm,o.lift,base),faceLayer=layer(asm,[o.lift[0],o.lift[1],o.lift[2]+R+38],base);
  const core=b.pivot(shellLayer,[0,drop,0]),faceCore=b.pivot(faceLayer,[0,drop,0]);
  if(hang)swing[o.id]=[shellLayer,faceLayer];
  const warm=o.style==='frame'||o.style==='scroll';
  // Thick glass ball: an outer skin that brightens at the rim, and an inner wall that catches a second set of reflections.
  const shell=m.own(asm,rimmed(new THREE.MeshPhysicalMaterial({color:o.tint,transparent:true,opacity:o.opacity,roughness:o.style==='solid'?.06:.02,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:1.9,depthWrite:false,side:THREE.DoubleSide,emissive:warm?0xffd9a0:o.tint,emissiveIntensity:0}),warm?4.5:1.6,warm?.55:.4));
  ball(core,asm,shell,[0,0,0],R,72).castShadow=false;
  if(o.style!=='solid')ball(core,asm,m.own(asm,rimmed(new THREE.MeshPhysicalMaterial({color:o.tint,transparent:true,opacity:warm?.03:.1,roughness:.02,clearcoat:1,envMapIntensity:1.4,depthWrite:false,side:THREE.BackSide}),5,.3)),[0,0,0],R-2.2,56).castShadow=false;
  if(hang){
   const L=-drop;
   cyl(core,asm,'chrome',0,0,R*.13,R-.8,R+2.6,20);cyl(core,asm,'steel',0,0,R*.07,R+2.6,R+4.2,16);cyl(core,asm,'chrome',0,0,.9,R+4.2,L-2.2,10);
   ring(core,asm,'chrome',0,L,0,2.2,.5,24);
  }
  if(o.style==='solid'){
   // Power cell: a solid amber ball with a clip and two terminals.
   ball(core,asm,m.own(asm,new THREE.MeshStandardMaterial({color:0xd99a00,roughness:.3,metalness:.3})),[0,0,0],R*.55,32);
   zbox(core,asm,'black',-1,R*.42,R*.86,7,4,3);zbox(core,asm,'steel',-1,R*.42,R*.86+1.6,5,1.2,.6);
   for(const sx of [-1,1]){zcyl(core,asm,'gold',sx*5+3,-R*.28,1.1,R*.9,R*.9+2.6,12);ball(core,asm,'gold',[sx*5+3,-R*.28,R*.9+2.8],1.4,12)}
   cyl(core,asm,'chrome',0,0,3.2,R-.6,R+1.6,20);
   continue;
  }
  const mech=ORB_WORKS[o.id],rd=R*o.dial,zf=R*.34,metal:Kind=warm?'gold':'chrome';
  const cx=mech?mech.at[0]*R:0,cy=mech?mech.at[1]*R:0,mechAt=b.pivot(core,[cx,cy,0]),face=b.pivot(faceCore,[cx,cy,0]);
  if(mech){
   // Its own movement: barrel, going train, lever escapement and balance on a skeleton back plate.
   const s=R/36,t=orbTrain(s,mech.turn);
   put(mechAt,asm,extrudeFlat(discShape(21*s,{crossings:5,hub:5*s,rim:2.4*s,spoke:2.6*s}),1*s),'steel').position.z=-11.5*s;
   const w=buildTrain(asm,t,()=>mechAt,{arbor:.45*s,jewels:['third','fourth','escape','centre'],stones:rubies[asm],spring:springs[asm]});orbWorks[o.id]=w;
   const node=w.nodes.barrel;
   put(node,asm,zlathe([[0,-9.5*s],[8*s,-9.5*s],[8*s,-3.8*s],[7.4*s,-3.8*s],[7.4*s,-9*s],[0,-9*s]],40),'brass');
   put(node,asm,extrudeFlat(discShape(8*s,{crossings:4,hub:2.2*s,rim:1*s,spoke:1.5*s}),.4*s),'brass').position.z=-3.9*s;
   wire(node,asm,springs[asm],spiral(4.5,1.6*s,7*s,-4.8*s),.25*s);
   // Bridge over the escapement and three pillars up to the dial.
   const [ex,ey]=t.arbors.escape,[qx,qy]=t.balance.at;zbar(mechAt,asm,'steel',[ex,ey],[qx,qy],3.8*s,2.4*s,.6*s);
   for(const [x,y] of [t.arbors.third,t.arbors.fourth])zbar(mechAt,asm,'brass',[x,y],[x*.45,y*.45],3.8*s,2.2*s,.6*s);
   for(let i=0;i<3;i++){const a=mech.turn*Math.PI/180+1.6+i*TURN/3;zcyl(mechAt,asm,'steel',Math.cos(a)*19*s,Math.sin(a)*19*s,.7*s,-11*s,-4*s,10)}
  }else{
   // Slave dial: a sealed drum stepped by the sync drive.
   zcyl(core,asm,'darksteel',0,0,R*.56,-R*.3,zf-1.4,40);zcyl(core,asm,'brass',0,0,R*.45,-R*.38,-R*.3,32);
   zcyl(core,asm,'gold',0,-R*.22,1.6,-R*.38-2.4,-R*.38,12);ring(core,asm,'steel',0,0,zf-2,rd+1.2,1,64);ring(core,asm,'chrome',0,0,-R*.3,R*.56,.8,48);
   const crownKnob=cyl(core,asm,'chrome',0,0,R*.09,0,R*.14,16);crownKnob.rotation.z=-Math.PI/4;crownKnob.position.set(Math.sin(Math.PI/4)*R*.93,Math.cos(Math.PI/4)*R*.93,0);
  }
  if(o.style==='gears'){
   ring(core,asm,'steel',0,0,-R*.32,R*.8,.9,64);
   for(let i=0;i<5;i++){const a=i*TURN/5+.5;zcyl(core,asm,'gold',Math.cos(a)*R*.8,Math.sin(a)*R*.8,1.3,-R*.36,-R*.28,10)}
  }
  if(o.style==='frame'){
   // Gold-and-steel skeleton frame with three feet.
   ring(core,asm,'steel',0,0,zf-1,R*.6,R*.035,64);ring(core,asm,'gold',0,0,R*.1,R*.76,R*.025,64);
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4+Math.PI/8;const spoke=zbox(core,asm,'gold',Math.cos(a)*R*.68,Math.sin(a)*R*.68,R*.2,R*.16,1.5,1.2);spoke.rotation.z=a;
    ball(core,asm,'gold',[Math.cos(a)*R*.78,Math.sin(a)*R*.78,R*.12],R*.05,14);
   }
   for(const a of [-Math.PI/2-.5,-Math.PI/2,-Math.PI/2+.5]){
    const foot=put(core,asm,new THREE.CylinderGeometry(R*.035,R*.075,R*.17,16),'gold');foot.position.set(Math.cos(a)*R*.84,Math.sin(a)*R*.84,R*.1);foot.rotation.z=a+Math.PI/2;
   }
   for(const s of [-1,1])wire(core,asm,'black',[[s*R*.3,R*.2,-R*.4],[s*R*.66,R*.5,-R*.2],[s*R*.8,R*.1,R*.2],[s*R*.62,-R*.42,R*.1],[s*R*.3,-R*.3,-R*.4]],.4);
  }
  if(o.style==='scroll'){
   // Gold wire scrollwork round the movement.
   ring(core,asm,'steel',0,0,zf-.6,rd+R*.09,R*.055,64);
   const band=put(core,asm,new THREE.TorusGeometry(R*.72,R*.03,10,48,Math.PI*1.25),'steel');band.position.z=R*.16;band.rotation.z=Math.PI*.9;
   for(const [x,y,r,a,span] of [[-.5,.56,.2,.3,4.6],[.56,.48,.18,2.2,4.4],[.66,-.2,.16,3.4,4.8],[-.62,-.3,.18,5.2,4.4],[0,-.72,.15,1.1,4.9],[.18,.74,.13,4,4.2]]){
    const scroll=put(core,asm,new THREE.TorusGeometry(R*r,.55,8,36,span),'gold');scroll.position.set(R*x,R*y,R*.2);scroll.rotation.z=a;
   }
  }
  // Dial and hands.
  const faceMaterial=m.own(asm,new THREE.MeshStandardMaterial({map:m.texture(orbDial(o)),roughness:.4,envMapIntensity:.7,emissive:0xffffff,emissiveIntensity:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  faceMaterial.emissiveMap=faceMaterial.map;
  zcyl(face,asm,warm?'white':'darksteel',0,0,rd,zf-1.4,zf,64);disc(face,asm,faceMaterial,0,0,zf+.03,rd-.15);
  ring(face,asm,metal,0,0,zf,rd,Math.max(.7,R*.035),64);
  const pivotAt=(z:number)=>b.pivot(face,[0,0,z]);
  const h=pivotAt(zf+.5),mi=pivotAt(zf+.85);
  put(h,asm,zslab(leaf(rd*.5,rd*.14,rd*.13),0,.3),inks[asm]);put(mi,asm,zslab(leaf(rd*.8,rd*.16,rd*.1),0,.3),inks[asm]);
  hands[o.id]={hour:h,minute:mi};
  if(o.style==='plain'){const s=pivotAt(zf+1.2);zbox(s,asm,inks[asm],0,rd*.3,0,.3,rd*1.1,.2);hands[o.id].second=s}
  zcyl(face,asm,'gold',0,0,Math.max(.8,rd*.07),zf+.3,zf+1.7,14);
  glow[o.id]={dial:faceMaterial,shell};
 }

 // ── Linkage ─────────────────────────────────────────────────────────────
 const link=layer('linkage');
 const amber=m.own('linkage',new THREE.MeshPhysicalMaterial({color:0xf2c200,roughness:.15,clearcoat:1,transparent:true,opacity:.92}));
 for(const sx of [-1,1]){
  const x=sx*POST.x;
  cyl(link,'linkage','chrome',x,POST.z,POST.r,PLINTH.top,POST.top,20);cyl(link,'linkage','chrome',x,POST.z,6,PLINTH.top,PLINTH.top+2.2,28);cyl(link,'linkage','steel',x,POST.z,3.2,PLINTH.top+2.2,PLINTH.top+6,20);
  ball(link,'linkage',amber,[x,57,POST.z],4.6,24);ball(link,'linkage','chrome',[x,POST.top,POST.z],POST.r,16);
  for(const y of [110,190])flatRing(link,'linkage','steel',x,y,POST.z,POST.r+.5,.6);
 }
 // Synchronising drive. The pedestal's motor pinion turns a line shaft behind the pedestal once a master minute;
 // a crown pair at each end turns an upright shaft that runs up beside the post to the satellites.
 const S=SYNC,sm=MODULE.sync,syncMetal=m.own('linkage',new THREE.MeshStandardMaterial({color:0xd8dce0,roughness:.2,metalness:1}));
 const sideways=(g:THREE.BufferGeometry)=>{g.rotateY(Math.PI/2);return g},upright=(g:THREE.BufferGeometry)=>{g.rotateX(-Math.PI/2);return g};
 const line=b.pivot(link,[0,S.y,S.z]),lineX=S.x-pitchRadius(sm,TEETH.crown);
 {const rod=cyl(line,'linkage',syncMetal,0,0,S.r,-lineX-1.5,lineX+1.5,12);rod.rotation.z=Math.PI/2;rod.position.set(0,0,0)}
 put(line,'linkage',sideways(wheelGeometry({module:sm,teeth:TEETH.line,crossings:4,hub:2.4,rim:1,spoke:1.3},.9)),'brass');
 for(const x of [-lineX,lineX])put(line,'linkage',sideways(wheelGeometry({module:sm,teeth:TEETH.crown},.9)),'brass').position.x=x;
 // Cross pins make the turning visible.
 for(const x of [-128,-100,-40,40,100,128]){const pin=cyl(line,'linkage','gold',0,0,.5,-3,3,8);pin.position.x=x;pin.rotation.x=x*.7}
 const motorPinion=b.pivot(link,[0,motorY,S.z]);
 put(motorPinion,'linkage',sideways(wheelGeometry({module:sm,teeth:TEETH.motor},1.6)),'steel');{const stub=cyl(motorPinion,'linkage','steel',0,0,.8,-4,1.5,10);stub.rotation.z=Math.PI/2;stub.position.set(-1.25,0,0)}
 for(const x of [-70,70,-138,138]){box(link,'linkage','steel',x,S.z,4,7,PLINTH.top,S.y+2.6);box(link,'linkage','darksteel',x,S.z,5.5,9,PLINTH.top,PLINTH.top+1.2)}
 const uprights=[-1,1].map(sx=>{
  const node=b.pivot(link,[sx*S.x,0,S.z]);
  cyl(node,'linkage',syncMetal,0,0,S.r,PLINTH.top+.6,S.top,12);put(node,'linkage',upright(wheelGeometry({module:sm,teeth:TEETH.crown},.9)),'brass').position.y=S.crownY;
  for(let y=58;y<S.top;y+=32){const pin=cyl(node,'linkage','gold',0,0,.5,-3,3,8);pin.rotation.z=Math.PI/2;pin.rotation.y=y*.5;pin.position.y=y}
  // Bearings tying the shaft to the post.
  for(const y of [PLINTH.top+10,150,S.top-3])wire(link,'linkage','steel',[[sx*S.x,y,S.z],[sx*(S.x+4),y+.8,S.z+2],[sx*POST.x,y,POST.z]],.8);
  cyl(link,'linkage','steel',sx*S.x,S.z,2,PLINTH.top,PLINTH.top+1.2,14);
  return {node,sign:sx};
 });
 // Goosenecks from each post to a hanging orb's pivot, ending in a ring linked through the orb's eye.
 const hookAt=(o:Orb,from:V[])=>{
  const top=o.pivotY!+5.2;wire(link,'linkage','chrome',[...from,[o.x,top+.2,0]],1.5);
  const eye=ring(link,'linkage','chrome',o.x,o.pivotY!+3,0,2.2,.5,24);eye.rotation.y=Math.PI/2;ball(link,'linkage','chrome',[o.x,top+.3,0],1.9,14);
 };
 const tokyo=orbAt('tokyo'),delhi=orbAt('delhi'),kathmandu=orbAt('kathmandu'),cell=orbAt('cell');
 hookAt(tokyo,[[-POST.x,POST.top,POST.z],[-153,270,-30],[-138,286,-11]]);
 hookAt(kathmandu,[[POST.x,POST.top,POST.z],[154,268,-30],[140,283,-11]]);
 hookAt(delhi,[[-POST.x,172,POST.z],[-152,172,-26],[-136,168.5,-8]]);
 ball(link,'linkage','chrome',[-POST.x,172,POST.z],3,16);
 for(const [x,z] of [[-147,-19],[-141,-12.5]])wire(link,'linkage','steel',[[x,172.5,z],[x+1.6,170,z],[x,166.5,z],[x-1.8,162,z],[x,158.5,z],[x+1.6,160,z]],.45);
 // Brackets holding the stacked slave dials: each takes its step from the upright shaft through a flexible drive.
 const stack=['stjohns','newyork','chatham'].map(orbAt);
 for(const o of stack.slice(0,2)){
  const dx=POST.x-o.x,dz=POST.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,pad:V=[o.x+ux*(o.r+.8),o.y,uz*(o.r+.8)];
  wire(link,'linkage','chrome',[pad,[o.x+ux*(o.r+6),o.y,uz*(o.r+6)],[POST.x,o.y,POST.z]],1.3);
  const cup=cyl(link,'linkage','steel',0,0,5,0,1.4,24);cup.position.set(...pad);cup.lookAt(o.x,o.y,0);cup.rotateX(Math.PI/2);
  flatRing(link,'linkage','chrome',POST.x,o.y,POST.z,POST.r+1,1);
  wire(link,'linkage','black',[[S.x,o.y+6,S.z],[S.x-8,o.y+9,S.z+8],[o.x+ux*(o.r+5),o.y+5,uz*(o.r+5)],[o.x+ux*o.r*.96,o.y+3,uz*o.r*.96]],.55);
  flatRing(link,'linkage','brass',S.x,o.y+6,S.z,S.r+.7,.7);
 }
 for(let i=0;i<2;i++){const a=stack[i],c=stack[i+1],y=(a.y-a.r+c.y+c.r)/2;flatRing(link,'linkage','chrome',(a.x+c.x)/2,y,0,10.5,1.1)}
 for(const o of [cell,stack[2]]){flatRing(link,'linkage','chrome',o.x,PLINTH.top+1,0,8,1);cyl(link,'linkage','steel',o.x,0,9.5,PLINTH.top,PLINTH.top+.5,28)}
 // Wiring: cell and Chatham to the pedestal terminals, and the pickup leads from the master movement down to the pedestal.
 const fz=PEDESTAL.d/2+4;
 const lead=(o:Orb,sx:number,kind:Kind,tx:number,ty:number,dy:number)=>{
  const from:V=[o.x-sx*o.r*.84,o.y+dy,o.r*.52];
  wire(link,'linkage',kind,[from,[o.x-sx*(o.r+4),o.y+dy+3,o.r*.9],[sx*(tx+7),ty+3,fz+3],[sx*tx,ty,fz]],.5);ball(link,'linkage','gold',from,1.1,10);
 };
 lead(cell,-1,'black',86,52,-3);lead(cell,-1,'gold',82,45,-9);lead(stack[2],1,'black',86,52,-3);lead(stack[2],1,'gold',82,45,-9);
 for(const sx of [-1,1])wire(link,'linkage','black',[[sx*30,PEDESTAL.top-10,-PEDESTAL.d/2-1],[sx*34,92,M.hoodZ0-9],[sx*26,124,M.hoodZ0-10],[sx*14,M.y-22,M.hoodZ0-4]],.6);

 return {hands,glow,swing,works,orbWorks,sync:{line,motorPinion,uprights},lcd,lcdMaterial,master:{hour,minute,second,alarm,day:dayHand},dialIds:DIALS.map(o=>o.id)};
}
