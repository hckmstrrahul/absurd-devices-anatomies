// Console geometry. Everything is placed from the traced inventory in `layout.ts`; heights are mm above the panel face.
import * as THREE from 'three';
import {X,Z,L,CARD,KNOBS,CUPS,LCD,TALL,TOUCH,BUTTONS,BUTTON,PILLS,PILL,SMALLS,CONICS,CONIC,MODULES,DISC,DISC_PARTS,DISC_PORT,CANISTER,RAIL,STUDS,LEFT_STRIP,RUNS,FLOW,LOOM,PROBES,PROBE_V,SCREWS,PX,SEGMENTS_D,ICON_D,PILLS_J,TICKS_H,touchOutline,loom,type P2,type Small,type Module} from './layout';
import {deckTiles,knobRing,capTexture,cupRing,conicTexture,gaugeFace,makeLcd,makeTall,makeTouch,braidTexture,glassTexture,shadowTexture,discTexture,metalTexture,ribTexture,domeTexture,blockTexture} from './textures';
import {routes,sleeves} from './wiring';
import {slab,lathe,arc,type Builder} from '../kit/builder';
import type {Kind} from '../kit/materials';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';

const P=CARD.top;
// Plan helpers in mm. A shape's y is −z, so `slab` and the extrusions below land the right way up.
const shape=(pts:P2[])=>{const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s};
function rect(cx:number,cz:number,w:number,d:number,r=0,n=6):P2[]{
 r=Math.min(r,w/2-.01,d/2-.01);
 if(r<=0)return [[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]];
 const pts:P2[]=[];
 [[1,-1,-90],[1,1,0],[-1,1,90],[-1,-1,180]].forEach(([sx,sz,from])=>{for(let i=0;i<=n;i++){const a=(from+i/n*90)*Math.PI/180;pts.push([cx+sx*(w/2-r)+Math.cos(a)*r,cz+sz*(d/2-r)+Math.sin(a)*r])}});
 return pts;
}
// Round every corner of a polygon.
function roundPoly(pts:P2[],r:number,n=6):P2[]{
 const out:P2[]=[];
 pts.forEach((p,i)=>{
  const a=pts[(i+pts.length-1)%pts.length],c=pts[(i+1)%pts.length],la=Math.hypot(a[0]-p[0],a[1]-p[1]),lc=Math.hypot(c[0]-p[0],c[1]-p[1]);
  const A:P2=[p[0]+(a[0]-p[0])/la*r,p[1]+(a[1]-p[1])/la*r],C:P2=[p[0]+(c[0]-p[0])/lc*r,p[1]+(c[1]-p[1])/lc*r];
  for(let k=0;k<=n;k++){const t=k/n,u=1-t;out.push([u*u*A[0]+2*u*t*p[0]+t*t*C[0],u*u*A[1]+2*u*t*p[1]+t*t*C[1]])}
 });
 return out;
}
// Flat sheet in plan with a texture stretched over the given box.
function sheet(pts:P2[],y:number,x0:number,z0:number,w:number,d:number){
 const g=new THREE.ShapeGeometry(shape(pts),8),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-x0)/w,1-(-p.getY(i)-z0)/d);
 g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;
}
// Extrusion with rounded top and bottom edges, standing from y0 to y1.
function cap(pts:P2[],y0:number,y1:number,round:number){
 round=Math.min(round,(y1-y0)/2-.01);
 const g=new THREE.ExtrudeGeometry(shape(pts),{depth:y1-y0-round*2,bevelEnabled:true,bevelThickness:round,bevelSize:round,bevelOffset:-round,bevelSegments:3,curveSegments:16});
 g.rotateX(-Math.PI/2);g.translate(0,y0+round,0);return g;
}
// Flat ring whose height varies with radius (a cone), with plan UVs spanning ±span.
function coneRing(rIn:number,rOut:number,yIn:number,yOut:number,span:number){
 const g=new THREE.RingGeometry(rIn,rOut,96,3);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const rad=Math.hypot(p.getX(i),p.getZ(i));p.setY(i,yIn+(rad-rIn)/(rOut-rIn)*(yOut-yIn));uv.setXY(i,(p.getX(i)/span+1)/2,(-p.getZ(i)/span+1)/2)}
 g.computeVertexNormals();return g;
}
// Profile of a concave bowl from its rim down to the centre, for a glossy cup interior.
const bowl=(r:number,rim:number,floor:number,n=14):[number,number][]=>Array.from({length:n+1},(_,i)=>{const t=i/n*Math.PI/2;return [r*Math.cos(t),rim-(rim-floor)*Math.sin(t)] as [number,number]});
// Disc with a raised centre: the top of a turned cone, with plan UVs.
function coneTop(r:number,yEdge:number,yApex:number){const g=new THREE.CircleGeometry(r,64);g.rotateX(-Math.PI/2);g.translate(0,yEdge,0);g.attributes.position.setY(0,yApex);g.computeVertexNormals();return g}

// Shallow dished disc with plan UVs: the top of a satin cap.
function dish(r:number,y:number,depth:number){
 const g=new THREE.RingGeometry(.001,r,72,6);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){const rad=Math.hypot(p.getX(i),p.getZ(i))/r;p.setY(i,y-depth*(1-rad*rad));uv.setXY(i,(p.getX(i)/r+1)/2,(-p.getZ(i)/r+1)/2)}
 g.computeVertexNormals();return g;
}
export function buildConsole(b:Builder){
 const {m,put,cyl}=b;
 type Mat=Kind|THREE.Material;
 const std=(asm:AssemblyId,p:THREE.MeshStandardMaterialParameters)=>m.own(asm,new THREE.MeshStandardMaterial(p));
 const phys=(asm:AssemblyId,p:THREE.MeshPhysicalMaterialParameters)=>m.own(asm,new THREE.MeshPhysicalMaterial(p));
 const clear=<T extends THREE.Object3D>(o:T)=>{o.castShadow=false;return o};
 const decal={polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2};
 // Finishes sampled from the reference. One instance per assembly, so selection ghosting stays correct.
 const recipe:Record<string,()=>THREE.Material>={
  body:()=>new THREE.MeshStandardMaterial({color:0x171719,roughness:.5,metalness:.1}),
  skirt:()=>new THREE.MeshStandardMaterial({color:0x222224,roughness:.7,metalness:.1}),

  lampWhite:()=>new THREE.MeshStandardMaterial({color:0xffffff,roughness:.3,emissive:0xfff3e2,emissiveIntensity:1.12}),
  collar:()=>new THREE.MeshStandardMaterial({color:0x0c0c0d,roughness:.6}),
  cap:()=>new THREE.MeshStandardMaterial({color:0x5e5e60,roughness:.7,metalness:.1}),
  matte:()=>new THREE.MeshStandardMaterial({color:0x0b0b0c,roughness:.82}),
  glossK:()=>new THREE.MeshPhysicalMaterial({color:0x070708,roughness:.6,clearcoat:.12,clearcoatRoughness:.5}),
  well:()=>new THREE.MeshStandardMaterial({color:0x020202,roughness:.95,envMapIntensity:.2}),
  silver:()=>new THREE.MeshStandardMaterial({color:0x777573,roughness:.62,metalness:.55}),
  bracket:()=>new THREE.MeshStandardMaterial({color:0x4c4c50,roughness:.55,metalness:.7}),
  satin:()=>new THREE.MeshStandardMaterial({color:0x4a4846,roughness:.55,metalness:.5,envMapIntensity:.6}),
  // Polished steel. Under even light a bare metal reads flat grey, so its soft banding is painted: `chrome` for turned parts and
  // cylinders (bands round u), `steelTube` for tubes (bands round v), `chromeFlat` for flat-sided parts.
  chrome:()=>new THREE.MeshStandardMaterial({map:steelRound,roughness:.42,metalness:.55}),
  steelTube:()=>new THREE.MeshStandardMaterial({map:steelAlong,roughness:.42,metalness:.55}),
  chromeFlat:()=>new THREE.MeshStandardMaterial({color:0x6c6c70,roughness:.45,metalness:.9}),
  red:()=>new THREE.MeshStandardMaterial({color:0xc23426,roughness:.42}),
  orange:()=>new THREE.MeshStandardMaterial({color:0xee6c22,roughness:.45,emissive:0xff5a10,emissiveIntensity:.18}),
  wirered:()=>new THREE.MeshStandardMaterial({color:0xc63c28,roughness:.5}),
  wireorange:()=>new THREE.MeshStandardMaterial({color:0xdf6a34,roughness:.55}),
  wireblack:()=>new THREE.MeshStandardMaterial({color:0x141416,roughness:.62}),
  plug:()=>new THREE.MeshStandardMaterial({color:0x0d0d0e,roughness:.5}),
  charcoal:()=>new THREE.MeshStandardMaterial({color:0x545456,roughness:.62,metalness:.15}),
  disc:()=>new THREE.MeshStandardMaterial({color:0x414143,roughness:.7,metalness:.1}),
  white:()=>new THREE.MeshStandardMaterial({color:0xe2e2e0,roughness:.4}),
  blue:()=>new THREE.MeshStandardMaterial({color:0x0b2a66,roughness:.3,emissive:0x2a8cff,emissiveIntensity:1.5}),
  greyKey:()=>new THREE.MeshStandardMaterial({color:0xb6b2ac,roughness:.42,metalness:.35}),
  darkKey:()=>new THREE.MeshStandardMaterial({color:0x3a3938,roughness:.55}),
  brass:()=>new THREE.MeshStandardMaterial({color:0xb89a62,roughness:.35,metalness:1}),
  bezel:()=>new THREE.MeshStandardMaterial({color:0x0b0b0c,roughness:.3,envMapIntensity:.3}),
  braid:()=>{const t=m.texture(braidTexture('#d2622a','#8a3414'));t.repeat.set(46,3);return new THREE.MeshStandardMaterial({map:t,roughness:.7})},
  braidK:()=>{const t=m.texture(braidTexture('#1c1c1e','#060607'));t.repeat.set(46,3);return new THREE.MeshStandardMaterial({map:t,roughness:.7})},
  knurl:()=>new THREE.MeshStandardMaterial({color:0x2a2a2c,roughness:.5,metalness:.4,envMapIntensity:1}),
  bowl:()=>new THREE.MeshPhysicalMaterial({color:0x040405,roughness:.5,clearcoat:.25,clearcoatRoughness:.5,side:THREE.DoubleSide}),
 };
 const cache=new Map<string,THREE.Material>();
 const steelTones:[string,string,string]=['#2e2f32','#77787d','#c6c7cb'],copperTones:[string,string,string]=['#6e3512','#c2702c','#f0b274'];
 const steelRound=m.texture(metalTexture(steelTones,false,5)),steelAlong=m.texture(metalTexture(steelTones,true,6)),copperAlong=m.texture(metalTexture(copperTones,true,7));
 const M=(asm:AssemblyId,name:string)=>{const key=asm+':'+name;let x=cache.get(key);if(!x){x=m.own(asm,recipe[name]());cache.set(key,x)}return x};
 const conic=m.texture(conicTexture());
 const turned=(asm:AssemblyId)=>{const key=asm+':turned';let x=cache.get(key);if(!x){x=m.own(asm,new THREE.MeshStandardMaterial({map:conic,color:0xd0d0d0,roughness:.36,metalness:.6,envMapIntensity:1.1}));cache.set(key,x)}return x};
 const lamp=(asm:AssemblyId)=>m.own(asm,new THREE.MeshBasicMaterial({color:0x000000}));

 // One base layer per assembly; parts that come apart further get their own layer.
 const base={} as Record<AssemblyId,THREE.Group>;
 for(const id of ['panel','rail','displays','buttons','pipework','wiring','knobs'] as AssemblyId[])base[id]=b.layer(id);
 // Only the printed plate stays put. Everything fixed to the deck (strip, sub-panel disc, wells, slot bezels, screws) lifts a
 // little as `fixings`; the loose leads rise with the probes and connectors they plug into, in the band above that.
 const fixings=b.layer('panel',[0,26,0]),loose=base.wiring;
 const home=(asm:AssemblyId)=>asm==='panel'?fixings:base[asm];
 const pt=(x:number,y:number,h:number):V3=>[X(x),P+h,Z(y)];
 const at=(asm:AssemblyId,x:number,y:number,h=0,parent:THREE.Object3D=home(asm))=>b.pivot(parent,pt(x,y,h));
 const rbox=(node:THREE.Object3D,asm:AssemblyId,mat:Mat,cx:number,cz:number,w:number,d:number,y0:number,y1:number,r:number,round=.35)=>put(node,asm,cap(rect(cx,cz,w,d,r),y0,y1,round),mat);
 // Cylinder lying along local X or Z.
 const lcyl=(node:THREE.Object3D,asm:AssemblyId,mat:Mat,axis:'x'|'z',len:number,r:number,cx:number,cy:number,cz:number,seg=24)=>{const g=new THREE.CylinderGeometry(r,r,len,seg);axis==='x'?g.rotateZ(Math.PI/2):g.rotateX(Math.PI/2);const mesh=put(node,asm,g,mat);mesh.position.set(cx,cy,cz);return mesh};
 // Cylinder lying between two traced points.
 const hcyl=(asm:AssemblyId,mat:Mat,a:P2,c:P2,h:number,r:number,parent:THREE.Object3D=base[asm],seg=20)=>{
  const ax=X(a[0]),az=Z(a[1]),bx=X(c[0]),bz=Z(c[1]),g=new THREE.CylinderGeometry(r,r,Math.hypot(bx-ax,bz-az),seg);g.rotateZ(Math.PI/2);
  const mesh=put(parent,asm,g,mat);mesh.position.set((ax+bx)/2,P+h,(az+bz)/2);mesh.rotation.y=-Math.atan2(bz-az,bx-ax);return mesh;
 };
 type Item={x:number;y:number;z:number;ry?:number;q?:THREE.Quaternion;sx?:number;sy?:number;sz?:number};
 const dummy=new THREE.Object3D();
 const many=(parent:THREE.Object3D,asm:AssemblyId,geometry:THREE.BufferGeometry,mat:Mat,items:Item[])=>{
  const mesh=new THREE.InstancedMesh(geometry,typeof mat==='string'?m.mat(asm,mat):mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);if(it.q)dummy.quaternion.copy(it.q);else dummy.rotation.set(0,it.ry??0,0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
  return b.adopt(parent,asm,mesh,items.length);
 };
 const knurl=(node:THREE.Object3D,asm:AssemblyId,mat:Mat,r:number,y0:number,y1:number,pitch=1)=>{const n=Math.max(12,Math.round(Math.PI*2*r/pitch));return many(node,asm,new THREE.BoxGeometry(.5,y1-y0,pitch*.5),mat,Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return {x:Math.cos(a)*r,y:(y0+y1)/2,z:Math.sin(a)*r,ry:-a}}))};
 const flat=(node:THREE.Object3D,asm:AssemblyId,geometry:THREE.BufferGeometry,mat:THREE.Material,y:number)=>{const mesh=clear(put(node,asm,geometry,mat,false));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;return mesh};

 // ── Panel ───────────────────────────────────────────────────────────────
 let shadowMat!:THREE.MeshBasicMaterial;const deck:THREE.Mesh[]=[];
 {
  const plan=rect(0,0,CARD.w,CARD.d,CARD.r,12);
  put(base.panel,'panel',cap(plan,0,P,.7),std('panel',{color:0x1a1a1c,roughness:.6,metalness:.2}));
  // The print: six tiles at 25 px/mm, each a flat sheet cut to its part of the rounded card.
  const ex=CARD.w/2-.7,ez=CARD.d/2-.7,cr=CARD.r-.7;
  for(const t of deckTiles()){
   const x0=Math.max(X(t.x0),-ex),x1=Math.min(X(t.x1),ex),z0=Math.max(Z(t.y0),-ez),z1=Math.min(Z(t.y1),ez),top=t.y0===0,bottom=t.y1===PX.h,left=t.x0===0,right=t.x1===PX.w;
   const pts:P2[]=[];
   ([[x1,z0,top&&right,-90],[x1,z1,bottom&&right,0],[x0,z1,bottom&&left,90],[x0,z0,top&&left,180]] as [number,number,boolean,number][]).forEach(([x,z,round,from])=>{
    if(!round){pts.push([x,z]);return}
    const cx=x+(x>0?-cr:cr),cz=z+(z>0?-cr:cr);for(let i=0;i<=12;i++){const a=(from+i/12*90)*Math.PI/180;pts.push([cx+Math.cos(a)*cr,cz+Math.sin(a)*cr])}
   });
   deck.push(put(base.panel,'panel',sheet(pts,P+.015,X(t.x0),Z(t.y0),L(t.x1-t.x0),L(t.y1-t.y0)),std('panel',{map:m.texture(t.texture),roughness:.85,metalness:.02,envMapIntensity:.3,...decal}),false));
  }
  // Printed contact shadows on a clear sheet just above the print; `update` fades it as the parts lift.
  shadowMat=m.own('panel',new THREE.MeshBasicMaterial({map:m.texture(shadowTexture()),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));
  clear(put(base.panel,'panel',sheet(rect(0,0,CARD.w-1.4,CARD.d-1.4,CARD.r-.7,12),P+.03,-CARD.w/2,-CARD.d/2,CARD.w,CARD.d),shadowMat,false));
  // Steel strip down the left edge with its wire loops, and the raised sub-panel disc.
  const s=LEFT_STRIP;rbox(fixings,'panel',M('panel','skirt'),X((s.x0+s.x1)/2),Z((s.y0+s.y1)/2),L(s.x1-s.x0),L(s.y1-s.y0),P,P+s.h,.6,.2);
  for(const y of [790,853,1619,1749])b.torus(fixings,'panel',M('panel','chrome'),pt(32,y,.9),1,.2,20);
  const d=at('panel',DISC.x,DISC.y);
  put(d,'panel',lathe([[0,0],[L(DISC.r),0],[L(DISC.r),DISC.y1-.3],[L(DISC.r)-.3,DISC.y1],[0,DISC.y1]],96),M('panel','disc'));
  clear(b.torus(d,'panel',M('panel','body'),[0,DISC.y1,0],L(DISC.r)-1.6,.14,96));
  flat(d,'panel',new THREE.CircleGeometry(L(DISC.r)-.35,96),std('panel',{map:m.texture(discTexture()),roughness:.8,metalness:.05,...decal}),DISC.y1+.02);
 }

 // ── Knobs ───────────────────────────────────────────────────────────────
 const spin:THREE.Object3D[]=[],segD:THREE.MeshBasicMaterial[]=[],pillJ:THREE.MeshBasicMaterial[]=[],tickH:THREE.MeshBasicMaterial[]=[];
 KNOBS.forEach(k=>{
  const x=X(k.x),z=Z(k.y),R=L(k.r),sk=L(k.skirt),cp=L(k.cap),mech=k.ring==='mech';
  const bezel=b.layer('knobs',[0,0,0],[x,P,z]),top=b.layer('knobs',[0,30,0],[x,P,z]);spin.push(top);
  put(bezel,'knobs',lathe([[0,0],[R,0],[R,1.1],[R-.5,1.6],[0,1.6]],96),M('knobs',mech?'charcoal':'body'));
  flat(bezel,'knobs',new THREE.RingGeometry(sk*.5,R-.4,96,1),std('knobs',{map:m.texture(knobRing(k)),roughness:mech?.7:.6,metalness:.1,...decal}),1.62);
  cyl(bezel,'knobs','steel',0,0,1.4,1.6,k.h-2,20);
  if(k.ring==='segments'){
   const step=Math.PI*2/SEGMENTS_D,gap=.04;
   // Plain blocks round the lower half; smaller icon segments, each carrying a dark glyph, over the top.
   for(let i=0;i<SEGMENTS_D;i++){
    const mat=lamp('knobs'),icon=ICON_D[i]===1,a0=Math.PI/2-(i+1)*step,a1=Math.PI/2-i*step,mid=(a0+a1)/2,g=icon?.085:gap;segD.push(mat);
    clear(put(bezel,'knobs',slab(arc(L(icon?113:108),L(icon?138:142),a0+g,a1-g),1.64,1.95,8),mat,false));
    if(icon){
     const ink=M('knobs','well'),kind=i%4;
     if(kind===0)for(const d of [-.045,.045])clear(put(bezel,'knobs',slab(arc(L(119),L(132),mid+d-.016,mid+d+.016),1.95,1.99,2),ink,false));
     else if(kind===1)clear(put(bezel,'knobs',slab(arc(L(121),L(130),mid-.05,mid+.05),1.95,1.99,4),ink,false));
     else if(kind===2){const tri=clear(put(bezel,'knobs',new THREE.CylinderGeometry(.62,.62,.04,3),ink,false));tri.position.set(Math.cos(mid)*L(125.5),1.97,-Math.sin(mid)*L(125.5));tri.rotation.y=mid}
     else{const ring=clear(b.torus(bezel,'knobs',ink,[Math.cos(mid)*L(125.5),1.97,-Math.sin(mid)*L(125.5)],.55,.13,16));ring.scale.z=.3}
    }
   }
  }
  if(k.ring==='pills'){
   const outline=shape(rect(0,0,2.7,1.6,.78));outline.holes.push(new THREE.Path(rect(0,0,1.7,.62,.3).map(([x,z])=>new THREE.Vector2(x,-z))));const g=slab(outline,0,.34,6);
   for(let i=0;i<PILLS_J;i++){const a=(i+.5)/PILLS_J*Math.PI*2-Math.PI/2,mat=lamp('knobs');pillJ.push(mat);const mesh=clear(put(bezel,'knobs',g,mat,false));mesh.position.set(Math.cos(a)*12.8,1.64,Math.sin(a)*12.8);mesh.rotation.y=-(a+Math.PI/2)}
  }
  if(k.ring==='ticks'){
   const g=new THREE.BoxGeometry(3,.3,.95);
   for(let i=0;i<TICKS_H;i++){const a=(i+.5)/TICKS_H*Math.PI*2-Math.PI/2,mat=lamp('knobs');tickH.push(mat);const mesh=clear(put(bezel,'knobs',g,mat,false));mesh.position.set(Math.cos(a)*12.7,1.78,Math.sin(a)*12.7);mesh.rotation.y=-a}
  }
  if(mech){
   // Spoked carrier: six arms on a black ring, with screws round the rim.
   put(bezel,'knobs',slab(arc(7.6,9,0,Math.PI*2-.001),1.6,3,48),M('knobs','body'));
   many(bezel,'knobs',new THREE.BoxGeometry(4.6,1.1,1.5),M('knobs','body'),Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2+.3;return {x:Math.cos(a)*10.6,y:2.2,z:Math.sin(a)*10.6,ry:-a}}));
   many(bezel,'knobs',new THREE.CylinderGeometry(.55,.55,.5,12),M('knobs','chrome'),Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2+.3;return {x:Math.cos(a)*12.2,y:2.95,z:Math.sin(a)*12.2}}));
  }
  // The turning part. A ribbed flange, a ribbed cone rising to the neck (its ribs read from above as fine radial lines),
  // then a satin cap with a bevelled rim and a slightly dished top whose mark shows the rotation.
  const s2=cp+.9,y2=Math.max(4.6,k.h-5.5),nr=Math.round(sk*Math.PI*2/1.3);
  // The ribs are a mipmapped colour-and-height texture wrapped `nr` times round the skirt, so they stay crisp close up and
  // blend to an even tone from far away.
  const ribMap=m.texture(ribTexture());ribMap.repeat.set(nr,1);
  put(top,'knobs',lathe([[0,1.7],[sk,1.7],[sk,3.1],[sk-.35,3.5],[s2+.5,y2-.25],[s2,y2],[0,y2]],96),std('knobs',{map:ribMap,bumpMap:ribMap,bumpScale:.9,color:0x5a5a5c,roughness:.66,metalness:.15}));
  put(top,'knobs',lathe([[0,y2],[s2-.25,y2],[s2-.25,y2+.45],[cp+.1,y2+.75],[cp,y2+1.1],[cp,k.h-.9],[cp-.35,k.h-.3],[cp-.9,k.h],[cp-1.5,k.h],[cp-1.7,k.h-.12],[0,k.h-.12]],96),M('knobs',mech?'skirt':'cap'));
  clear(b.torus(top,'knobs',M('knobs','collar'),[0,y2+.6,0],cp+.12,.12,96));
  const face=capTexture(k.label,mech?0x40:0x68);m.texture(face.bump);
  clear(put(top,'knobs',dish(cp-1.7,k.h-.08,.32),std('knobs',{map:m.texture(face.map),bumpMap:face.bump,bumpScale:1.4,roughness:.72,metalness:.12,...decal}),false));
 });

 // ── Cup dials ───────────────────────────────────────────────────────────
 const cupSpin:(THREE.Object3D|null)[]=[];
 CUPS.forEach(c=>{
  const node=b.layer('knobs',[0,0,0],[X(c.x),P,Z(c.y)]),R=L(c.r),co=L(c.collar),ho=L(c.hole);
  const ringMat=()=>phys('knobs',{map:m.texture(cupRing(c)),roughness:.4,clearcoat:.4,clearcoatRoughness:.3,envMapIntensity:.32});
  if(c.style==='dish'){
   put(node,'knobs',lathe([[0,0],[R,0],[R,5.6],[R-.5,6.2],[R-2.2,6.2],[R-2.6,5.6],[R-2.6,0]],96),M('knobs','glossK'));
   put(node,'knobs',coneRing(ho,R-2.6,2.4,5.6,R),ringMat());
   cyl(node,'knobs',M('knobs','glossK'),0,0,ho,0,2.4,72);
   for(const dx of [-.55,.55])clear(b.box(node,'knobs',M('knobs','greyKey'),dx,0,.9,.42,2.4,2.46));
   // Ribbed grip at the foot of the dial.
   many(node,'knobs',new THREE.BoxGeometry(.5,2.4,2.6),M('knobs','body'),Array.from({length:12},(_,i)=>({x:-1.6+i*.72,y:1.2,z:R+.1})));
   cupSpin.push(null);
  }else if(c.style==='matte'){
   put(node,'knobs',lathe([[0,0],[R,0],[R,1.8],[R-.6,2.4],[co+1.4,2.4],[co,5.6],[co-.5,6.2],[ho+.3,6.2],[ho+.3,0]],96),M('knobs','matte'));
   put(node,'knobs',lathe(bowl(ho+.3,6.2,1),72),M('knobs','bowl'));
   // Position mark on the flange.
   clear(cyl(node,'knobs',M('knobs','white'),(R-1.5)*.5,(R-1.5)*.866,.32,2.4,2.44,12));cupSpin.push(null);
  }else{
   const rot=b.pivot(node);cupSpin.push(rot);
   put(node,'knobs',lathe([[0,0],[R,0],[R,.6],[0,.6]],96),M('knobs','body'));
   put(rot,'knobs',coneRing(co+.3,R,5.2,.62,R),ringMat());
   put(node,'knobs',lathe([[0,0],[co+.4,0],[co+.4,5.2],[co,7],[co-.5,7.5],[ho+.3,7.5],[ho+.3,0]],96),M('knobs','glossK'));
   put(node,'knobs',lathe(bowl(ho+.3,7.5,1.4),72),M('knobs','bowl'));
  }
 });

 // ── Displays ────────────────────────────────────────────────────────────
 const lcd=makeLcd(),tall=makeTall(),touch=makeTouch();
 {
  const glassOf:THREE.Group[]=[];
  // Each display is a dark rounded frame, a raised face set in from it (the step is the frame's inner lip), the lit face
  // itself, and a low lip round the glass. `inset` is how far the face sits in from the frame, px.
  const display=(box:readonly number[],h:number,r:number,tex:THREE.Texture,screen:readonly number[]|null,inset:number,outline?:P2[])=>{
   const [x0,y0,x1,y1]=box,plan=outline?roundPoly(outline.map(([x,y])=>[X(x),Z(y)] as P2),L(r)):rect(X((x0+x1)/2),Z((y0+y1)/2),L(x1-x0),L(y1-y0),L(r),8);
   const face=outline?plan:rect(X((x0+x1)/2),Z((y0+y1)/2),L(x1-x0-inset*2),L(y1-y0-inset*2),L(r-inset*.6),8);
   const glass=b.layer('displays',[0,16,0]);m.texture(tex);glassOf.push(glass);
   put(base.displays,'displays',cap(plan,P,P+h-.8,.45),M('displays','bezel'));
   put(glass,'displays',cap(face,P+h-.8,P+h,.3),M('displays','bezel'));
   const lit=phys('displays',{color:0x000000,roughness:.35,specularIntensity:.12,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:1.1,...decal});
   clear(put(glass,'displays',sheet(face,P+h+.012,X(x0),Z(y0),L(x1-x0),L(y1-y0)),lit,false));
   if(screen){const [sx0,sy0,sx1,sy1]=screen,cx=X((sx0+sx1)/2),cz=Z((sy0+sy1)/2),w=L(sx1-sx0),d=L(sy1-sy0),ring=shape(rect(cx,cz,w+1.5,d+1.5,1.4));ring.holes.push(new THREE.Path(rect(cx,cz,w+.1,d+.1,.9).map(([x,z])=>new THREE.Vector2(x,-z))));
    clear(put(glass,'displays',slab(ring,P+h,P+h+.32,8),M('displays','bezel'),false))}
  };
  display(LCD.box,LCD.h,LCD.r,lcd.texture,LCD.screen,8);display(TALL.box,TALL.h,TALL.r,tall.texture,TALL.screen,6);display(TOUCH.box,TOUCH.h,TOUCH.r,touch.texture,null,0,touchOutline());
  // Moulded tabs on the frame sides, as on the image's bezels.
  for(const [x,y,wd,ht] of [[LCD.box[0]-5,470,14,60],[LCD.box[0]-5,690,14,60],[LCD.box[2]+5,520,14,70],[LCD.box[2]+5,700,14,50],[TALL.box[0]-5,1900,12,70],[TALL.box[0]-5,2380,12,70],[TALL.box[2]+5,2140,12,90],[TALL.box[2]+5,2440,12,60]])rbox(base.displays,'displays',M('displays','bezel'),X(x),Z(y),L(wd),L(ht),P,P+1.8,.5,.3);
  // A very faint sheen on the LCD and the touch glass (an unlit decal, so it never flares). None on the tall display: on its black field it read as smudges.
  const sheen=(box:readonly number[],h:number,seed:number)=>{const [x0,y0,x1,y1]=box,t=m.texture(glassTexture(seed,256,Math.round(256*(y1-y0)/(x1-x0))));
   clear(put(glassOf[seed],'displays',sheet(rect(X((x0+x1)/2),Z((y0+y1)/2),L(x1-x0),L(y1-y0),1),P+h+.03,X(x0),Z(y0),L(x1-x0),L(y1-y0)),m.own('displays',new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})),false))};
  sheen(LCD.screen,LCD.h,0);sheen([TOUCH.box[0]+24,TOUCH.notch[1]+20,TOUCH.box[2]-22,TOUCH.box[3]-24],TOUCH.h,2);
  // The touch panel's border glows: thin emissive strips over the printed border, bright enough for the glow pass.
  {const [x0,y0,x1,y1]=TOUCH.box,ny=TOUCH.notch[1],r=TOUCH.r,y=P+TOUCH.h+.02,strip=(cx:number,cz:number,wd:number,ht:number,colour:number)=>clear(b.box(glassOf[2],'displays',std('displays',{color:0x000000,emissive:colour,emissiveIntensity:1.45,roughness:.6,...decal}),X(cx),Z(cz),L(wd),L(ht),y,y+.05));
   strip(x0+7,(ny+y1)/2,9,y1-ny-r*2,0xf1753f);strip((x0+x1)/2,y1-6,x1-x0-r*2,8,0xffa25c);strip(x1-6,(y0+y1)/2,8,y1-y0-r*2,0xff6a4c)}
 }

 // ── Buttons and keys ────────────────────────────────────────────────────
 const buttonMats:THREE.MeshPhysicalMaterial[]=[],domeMap=m.texture(domeTexture());
 BUTTONS.forEach(([x,y],i)=>{
  const amber=i===6,r=L(BUTTON.r),c=L(BUTTON.collar),h=BUTTON.h;
  const mat=phys('buttons',{map:domeMap,color:amber?0xff8c0a:0xffc400,roughness:.6,emissive:amber?0xff7a00:0xffb000,emissiveIntensity:.3});buttonMats.push(mat);
  put(at('buttons',x,y),'buttons',lathe([[0,0],[c+.5,0],[c+.5,.7],[c+.2,1.3],[c-.2,1.9],[r+.35,1.9],[r+.2,1.1],[0,1.1]],48),M('buttons','collar'));
  put(b.layer('buttons',[0,9,0],pt(x,y,0)),'buttons',lathe([[0,1],[r,1],[r,h-1.7],[r-.1,h-1.25],[r-.32,h-.85],[r-.7,h-.5],[r-1.2,h-.25],[r-1.9,h-.08],[0,h]],48),mat);
 });
 {
  const g=cap(rect(0,0,L(PILL.w),L(PILL.h),L(PILL.w)/2),0,PILL.y1,.5);
  for(const light of [true,false])many(base.buttons,'buttons',g,M('buttons',light?'greyKey':'darkKey'),PILLS.filter(p=>p.light===light).map(p=>({x:X(p.x),y:P,z:Z(p.y)})));
 }

 // ── Small round parts ───────────────────────────────────────────────────
 const needles:THREE.Object3D[]=[];
 const hostTop:Record<string,number>={'knob-b':1.6,'knob-g':3,'cup-i':2.4,'touch-main':TOUCH.h,rail:RAIL.h,'pill-6':PILL.y1};
 const small=(s:Small)=>{
  const a=s.asm,r=L(s.r),h=s.h,n=at(a,s.x,s.y,s.on?hostTop[s.on]??0:0);
  const knob=(mat:Mat,rr=r,hh=h)=>put(n,a,lathe([[0,0],[rr,0],[rr,hh-.5],[rr-.5,hh],[0,hh]],40),mat);
  const turnedTop=(rr:number,y:number,rise=.9)=>put(n,a,coneTop(rr,y,y+rise),turned(a));
  switch(s.look){
   case 'well':put(n,a,lathe([[0,0],[r+.5,0],[r+.5,h-.4],[r+.1,h],[r,h],[r,.3],[0,.3]],48),M(a,'glossK'));clear(cyl(n,a,M(a,'well'),0,0,r,.3,.34,40));break;
   case 'jack':cyl(n,a,M(a,'chrome'),0,0,r,0,1.6,6);knob(M(a,'chrome'),r*.72,h>4?5:h);if(h>4){cyl(n,a,M(a,'chrome'),0,0,r*.45,5,h,20);clear(cyl(n,a,M(a,'well'),0,0,r*.25,h,h+.03,16))}else clear(cyl(n,a,M(a,'well'),0,0,r*.4,h,h+.03,16));break;
   case 'toggleRed':knob(M(a,'red'),r,2.6);cyl(n,a,M(a,'chrome'),0,0,.7,2.6,3.6,16);{const lever=put(n,a,new THREE.CylinderGeometry(.42,.34,4.4,12),M(a,'chrome'));lever.position.set(-.2,5,-1.4);lever.rotation.set(-.55,0,.1);b.ball(n,a,M(a,'chrome'),[-.3,6.9,-2.5],.6,14)}break;
   case 'dot':knob(M(a,'body'));knurl(n,a,M(a,'body'),r,.6,h-1.6,.8);clear(cyl(n,a,M(a,'orange'),0,0,.45,h,h+.05,16));clear(b.torus(n,a,M(a,'red'),[0,h+.02,0],.75,.09,24));clear(cyl(n,a,M(a,'white'),.9,-1.5,.2,h,h+.04,10));break;
   case 'tee':knob(M(a,'body'));clear(b.box(n,a,M(a,'white'),0,-.55,1.9,.24,h,h+.04));clear(b.box(n,a,M(a,'white'),0,.2,.24,1.5,h,h+.04));break;
   case 'trim':put(n,a,lathe([[0,0],[r,0],[r,h*.45],[r*.86,h*.55],[0,h*.55]],36),M(a,'body'));knurl(n,a,M(a,'satin'),r*.74,h*.55,h-.6,.7);cyl(n,a,M(a,'chrome'),0,0,r*.7,h*.55,h-.6,32);turnedTop(r*.7,h-.6,.5);break;
   case 'gauge':{knob(M(a,'body'),r,h);flat(n,a,new THREE.CircleGeometry(r-.25,48),std(a,{map:m.texture(gaugeFace()),roughness:.4,...decal}),h+.02);const needle=b.pivot(n,[0,h+.1,0]);needles.push(needle);clear(b.box(needle,a,M(a,'orange'),0,-r*.36,.28,r*.75,0,.16));clear(cyl(needle,a,M(a,'body'),0,0,.42,0,.3,16))}break;
   case 'black':knob(M(a,'body'));clear(b.torus(n,a,M(a,'skirt'),[0,h,0],r*.62,.12,32));break;
   case 'orangeRing':put(n,a,lathe([[0,0],[r,0],[r,.9],[0,.9]],40),M(a,'orange'));knob(M(a,'skirt'),r*.74,h);turnedTop(r*.6,h+.01,.3);break;
   case 'block':rbox(n,a,M(a,'body'),0,0,r*1.6,r*1.6,0,h,.6,.4).rotation.y=.5;break;
   case 'hex':knob(M(a,'skirt'),r,2.2);cyl(n,a,M(a,'chrome'),0,0,r*.46,2.2,h,6);break;
   case 'slot':put(n,a,lathe([[0,0],[r+.9,0],[r+.9,3],[r,5.5],[r,h-.5],[r-.5,h],[0,h]],48),M(a,'body'));put(n,a,lathe([[0,h],[r*.78,h],[r*.78,h+.5],[r*.7,h+.7],[0,h+.7]],48),M(a,'cap'));clear(b.box(n,a,M(a,'well'),0,0,.42,r*.62,h+.7,h+.74));break;
   case 'valve':{ // black handwheel on a chrome bracket, with its lever out to the right
    rbox(n,a,M(a,'chromeFlat'),-2.4,-6,5.4,9,0,2.2,1.6,.5);cyl(n,a,M(a,'chrome'),-2.4,-7,2.6,2.2,6.5,28);cyl(n,a,M(a,'chrome'),0,0,2.2,0,h-4,28);
    put(n,a,lathe([[0,h-4],[r,h-4],[r,h-.6],[r-.6,h],[0,h]],48),M(a,'body'));clear(cyl(n,a,M(a,'skirt'),0,0,r*.8,h,h+.03,40));lcyl(n,a,M(a,'body'),'x',6.4,.75,3.2,5,-8.4,16)}break;
   case 'ring':clear(b.torus(n,a,M(a,'chrome'),[0,h-.6,0],r*.72,.55,36));put(n,a,lathe([[0,0],[r,0],[r,h-1.4],[0,h-1.4]],32),M(a,'skirt'));break;
   case 'conic':cyl(n,a,M(a,'chrome'),0,0,r,0,h-2.2,48);put(n,a,coneTop(r,h-2.2,h),turned(a));knurl(n,a,M(a,'body'),r+.05,.2,2.2,.9);break;
   case 'port':knob(M(a,'skirt'),r,2.4);clear(b.torus(n,a,M(a,'chrome'),[0,2.6,0],r*.5,.4,28));cyl(n,a,M(a,'chrome'),0,0,.5,2.4,h,12);break;
   case 'portSlot':knob(M(a,'skirt'),r,2.2);knob(M(a,'body'),r*.76,h);clear(b.box(n,a,M(a,'greyKey'),0,0,.28,r*.9,h,h+.04));break;
   case 'hexBoss':put(n,a,lathe([[0,0],[r+.7,0],[r+.7,.8],[r,1.1],[r,2.6],[r-.9,3.6],[r*.62,3.6],[r*.62,4.1],[0,4.1]],48),M(a,'chrome'));cyl(n,a,M(a,'chromeFlat'),0,0,r*.5,4.1,h,6).rotation.y=.4;break;
   case 'slotBoss':put(n,a,lathe([[0,0],[r+.7,0],[r+.7,.8],[r,1.1],[r,2.6],[r-.9,3.6],[r*.62,3.6],[r*.62,4.1],[0,4.1]],48),M(a,'chrome'));cyl(n,a,M(a,'chrome'),0,0,r*.5,4.1,h,28);{const slot=clear(b.box(n,a,M(a,'well'),0,0,r*.9,.4,h,h+.04));slot.rotation.y=.7}break;
   case 'lever':cyl(n,a,M(a,'chrome'),0,0,r,0,3.4,40);knurl(n,a,M(a,'chromeFlat'),r,.4,3,.8);turnedTop(r-.3,3.4,.4);{const bar=rbox(n,a,M(a,'chromeFlat'),0,0,1.5,3.4,3.6,h,.7,.4);bar.rotation.y=.6}break;
   case 'white':knob(M(a,'white'));break;
   case 'studBlack':put(n,a,lathe([[0,0],[r+1.1,0],[r+1.1,1.2],[r+.7,2],[r,2.6],[r*.7,2.6],[r*.7,2.2],[0,2.2]],48),M(a,'body'));put(n,a,lathe([[0,2.2],[r*.62,2.2],[r*.62,h-.3],[r*.5,h],[0,h]],40),M(a,'chrome'));break;
   case 'stud':put(n,a,lathe([[0,0],[r,0],[r,h*.6],[r*.6,h*.92],[0,h]],24),M(a,'chrome'));break;
   case 'studFlat':put(n,a,lathe([[0,0],[r+.9,0],[r+.9,1.4],[r+.4,2.2],[r*.72,2.4],[r*.72,2],[0,2]],40),M(a,'chrome'));knob(M(a,'satin'),r*.64,h);clear(b.box(n,a,M(a,'well'),0,0,r*.9,.22,h,h+.03)).rotation.y=.5;break;
   case 'ledBlue':knob(M(a,'body'),r+.5,1.2);b.ball(n,a,M(a,'blue'),[0,1.3,0],r*.62,20);break;
   case 'mini':rbox(n,a,M(a,'body'),0,0,r*2,r*2.6,0,1.6,.4,.3);cyl(n,a,M(a,'chrome'),0,-.2,.62,1.6,2,14);{const lever=put(n,a,new THREE.CylinderGeometry(.42,.36,h-1,12),M(a,'body'));lever.position.set(0,1.6+(h-1)/2-.2,-.5);lever.rotation.x=-.4}break;
   case 'red':knob(M(a,'chrome'),r+.7,1.2);knob(M(a,'red'),r,h);break;
   default:knob(M(a,'body'));
  }
 };
 SMALLS.forEach(small);
 // Conical valve knobs: each lifts off its seat and turns in Play; the turned cone makes the motion visible.
 const valves=CONICS.map(([x,y])=>{
  const r=L(CONIC.r),h=CONIC.h,seat=at('pipework',x,y),node=b.layer('pipework',[0,12,0],pt(x,y,0));
  cyl(seat,'pipework',M('pipework','body'),0,0,r+.25,0,1.4,48);
  cyl(node,'pipework',M('pipework','chrome'),0,0,r-.2,1.4,h-2.6,48);knurl(node,'pipework',M('pipework','body'),r,1.4,3.6,.85);
  put(node,'pipework',coneTop(r-.2,h-2.6,h),turned('pipework'));return node;
 });

 // ── Modules ─────────────────────────────────────────────────────────────
 const module=(mod:Module,y0=0)=>{
  const a=mod.asm,w=L(mod.w),d=L(mod.h),h=mod.y1-y0,r=L(mod.r),n=at(a,mod.x,mod.y,y0);
  const body=(mat:Mat,hh=h,round=.35)=>rbox(n,a,mat,0,0,w,d,0,hh,r,round);
  switch(mod.look){
   case 'satin':body(M(a,'satin'),h,.9);break;
   case 'rocker':body(M(a,'body'),1.2);for(const dz of [-1,1])rbox(n,a,M(a,'darkKey'),0,dz*d*.23,w*.72,d*.4,1.2,h+(dz<0?.4:0),1.1,.4);clear(b.box(n,a,M(a,'blue'),-.2,-d/2-.5,.3,1.3,.2,.5));break;
   case 'slotChrome':put(n,a,slab((()=>{const s=shape(rect(0,0,w,d,r));s.holes.push(new THREE.Path(rect(0,0,w-1.3,d-1.3,r-.65).map(([x,z])=>new THREE.Vector2(x,-z))));return s})(),0,h),M(a,'chromeFlat'));clear(rbox(n,a,M(a,'satin'),0,0,w-1.3,d-1.3,0,.5,r-.65,.1));cyl(n,a,M(a,'chrome'),-1.6,2.6,.8,0,1.2,14);break;
   case 'slotBlack':put(n,a,slab((()=>{const s=shape(rect(0,0,w+1.2,d+1.2,r+.6));s.holes.push(new THREE.Path(rect(0,0,w,d,r).map(([x,z])=>new THREE.Vector2(x,-z))));return s})(),0,h),M(a,'body'));clear(rbox(n,a,M(a,'well'),0,0,w,d,0,.12,r,.04));break;
   case 'barrel':lcyl(n,a,M(a,'body'),'x',w,d/2,0,d/2,0);lcyl(n,a,M(a,'chrome'),'x',w*.14,d/2+.12,-w*.28,d/2,0);lcyl(n,a,M(a,'skirt'),'x',w*.2,d/2+.25,w*.3,d/2,0);break;
   case 'barrelBig':lcyl(n,a,M(a,'body'),'x',w*.7,d*.42,-w*.12,d*.42,0,32);lcyl(n,a,M(a,'skirt'),'x',w*.26,d*.5,w*.3,d*.5,0,32);lcyl(n,a,M(a,'chrome'),'x',w*.06,d*.44,-w*.4,d*.42,0,32);break;
   case 'trio':body(M(a,'skirt'));clear(b.torus(n,a,M(a,'orange'),[-w*.28,h+.1,0],1.05,.28,24));cyl(n,a,M(a,'white'),0,0,1.05,h,h+.6,24);rbox(n,a,M(a,'darkKey'),w*.3,0,1.9,2.2,h,h+.5,.4,.15);break;
   case 'red':body(M(a,'red'));break;
   case 'grommet':body(M(a,'body'),h,1);rbox(n,a,M(a,'skirt'),0,0,w*.5,d*.34,h,h+.35,d*.17,.12);clear(rbox(n,a,M(a,'well'),0,0,w*.3,d*.16,h+.35,h+.39,d*.08,.01));break;
   case 'silver':{ // darker steel bracket with two screws, under a bevelled bead-blasted block with its seam, an inset pill key and a blue marker
    put(n,a,cap(roundPoly([[-w/2+2,-d/2-6],[w/2+7,-d/2-6],[w/2+15,-d/2+6],[w/2+15,d/2-2],[w/2-2,d/2-2],[-w/2+2,-d/2+2]].map(([x,z])=>[x,z] as P2),2.4),0,1.6,.4),M(a,'bracket'));
    for(const [sx,sz] of [[-w/2+4,-d/2-3.6],[w/2+12.4,d/2-4.4]]){cyl(n,a,M(a,'chrome'),sx,sz,.8,1.6,2,16);clear(b.box(n,a,M(a,'well'),sx,sz,1.1,.2,2,2.03)).rotation.y=.6}
    body(M(a,'silver'),h-1.2,.5);rbox(n,a,M(a,'silver'),0,0,w-.5,d-.5,h-1.3,h,r-.25,.75);
    clear(put(n,a,sheet(rect(0,0,w-2,d-2,r-1),h+.02,-w/2,-d/2,w,d),std(a,{map:m.texture(blockTexture()),roughness:.62,metalness:.4,...decal}),false));
    clear(b.box(n,a,M(a,'blue'),-w/2-.05,d*.18,.25,d*.5,1,3))}break;
   case 'square':body(M(a,'body'),h-.9,.8);rbox(n,a,M(a,'charcoal'),0,0,w-2.6,d-2.6,h-.9,h,r-1.3,.35);rbox(n,a,M(a,'body'),0,0,w+1.2,d+1.2,0,1.1,r+.6,.3);for(const dz of [-1,1])cyl(n,a,M(a,'red'),-w/2+1.5,dz*(d/2-2),.55,h-.9,h-.5,14);clear(b.ball(n,a,M(a,'blue'),[w/2-.6,h-1.6,d/2-2.6],.5,12));break;
   case 'gaugeMod':{body(M(a,'body'));put(n,a,lathe([[0,h],[3.4,h],[3.4,h+.5],[0,h+.5]],40),M(a,'skirt'));flat(n,a,new THREE.CircleGeometry(3.2,48),std(a,{map:m.texture(gaugeFace()),roughness:.4,...decal}),h+.52);
    const needle=b.pivot(n,[0,h+.6,0]);needles.push(needle);clear(b.box(needle,a,M(a,'orange'),0,-1.2,.3,2.6,0,.16));cyl(needle,a,M(a,'chrome'),0,0,.6,0,.4,16)}break;
   case 'orange':body(M(a,'orange'));rbox(n,a,M(a,'satin'),w*.62,0,w*.5,d*.8,0,h*.9,.5,.3);break;
   case 'orangeCyl':lcyl(n,a,M(a,'orange'),'x',w,d/2,0,d/2,0);clear(b.box(n,a,M(a,'well'),0,0,w*.36,.5,d-.04,d+.02));lcyl(n,a,M(a,'brass'),'x',1.6,.8,-w/2-.8,d/2,0,12);break;
   case 'pair':body(M(a,'body'));for(const dz of [-1,1]){put(n,a,lathe([[0,h],[1.5,h],[1.5,h+2.4],[1.1,h+2.9],[0,h+2.9]],24),M(a,'skirt')).position.set(.6,0,dz*d*.26);clear(b.torus(n,a,M(a,'chrome'),[.6,h+.1,dz*d*.26],1.7,.12,24))}break;
   case 'clip':body(M(a,'satin'));rbox(n,a,M(a,'body'),.3,.4,w*.5,d*.5,h,h+1.2,.4,.2);break;
   case 'squareKnob':body(M(a,'body'));put(n,a,lathe([[0,h],[1.7,h],[1.7,h+2.6],[1.3,h+3],[0,h+3]],28),M(a,'skirt')).position.set(.6,0,.6);clear(cyl(n,a,M(a,'white'),1.5,1.5,.22,h+3,h+3.04,10));break;
   case 'pins':body(M(a,'body'));many(n,a,new THREE.CylinderGeometry(.34,.34,.3,12),M(a,'brass'),[-1.6,0,1.6].map(x=>({x:x-1,y:h+.1,z:0})));rbox(n,a,M(a,'white'),w/2-1.6,.3,1.6,1.2,h,h+.2,.2,.05);break;
   case 'greySwitch':body(M(a,'satin'),h,1);put(n,a,slab((()=>{const s=shape(rect(0,-1.8,4.6,2.2,1.1));s.holes.push(new THREE.Path(rect(0,-1.8,3.6,1.3,.65).map(([x,z])=>new THREE.Vector2(x,-z))));return s})(),h,h+.4),M(a,'chromeFlat'));
    {const lever=put(n,a,new THREE.CapsuleGeometry(.75,3,6,14),M(a,'chrome'));lever.position.set(.2,h+1.3,2.6);lever.rotation.set(Math.PI/2-.35,0,-.9)}break;
   case 'clamp':body(M(a,'body'),h,.8);break;
   case 'tie':body(M(a,'satin'),h,.4);many(n,a,new THREE.BoxGeometry(.22,.12,d),M(a,'body'),Array.from({length:11},(_,i)=>({x:-w/2+.5+i*(w-1)/10,y:h+.02,z:0})));break;
   case 'redCyl':lcyl(n,a,M(a,'red'),'x',w,d/2,0,d/2,0);lcyl(n,a,M(a,'chrome'),'x',3.4,d/2-.35,-w/2-1.7,d/2,0);break;
   case 'chipBlue':body(M(a,'body'),h,.2);clear(b.box(n,a,M(a,'blue'),0,-d*.12,w*.6,d*.42,h,h+.05));break;
   case 'chip':body(M(a,'body'),h,.2);break;
   case 'keyOrange':body(M(a,'darkKey'),h,.4);clear(b.box(n,a,M(a,'orange'),0,-d*.12,w*.5,d*.22,h,h+.05));break;
   case 'subMod':body(M(a,'body'),h,.6);cyl(n,a,M(a,'chrome'),-4,.6,1.5,h,h+.9,24);{const slot=clear(b.box(n,a,M(a,'well'),-4,.6,2.2,.34,h+.9,h+.94));slot.rotation.y=.8}
    put(n,a,lathe([[0,h],[1.9,h],[1.9,h+1.4],[0,h+1.4]],24),M(a,'skirt')).position.set(4.4,0,-.4);lcyl(n,a,M(a,'body'),'x',4.4,1,6.4,h+1.6,.6,16).rotation.y=-.35;break;
   default:body(M(a,'body'));
  }
 };
 MODULES.forEach(mod=>module(mod));DISC_PARTS.forEach(mod=>module(mod,DISC.y1));

 // ── Pipework ────────────────────────────────────────────────────────────
 const lines:THREE.MeshStandardMaterial[]=[];
 {
  const pipe=base.pipework,c=CANISTER;
  // Canister: a lathe along its own axis, laid down the image.
  const lie=(profile:[number,number][],mat:Mat)=>{const g=lathe(profile,48);g.rotateX(Math.PI/2);const mesh=put(pipe,'pipework',g,mat);mesh.position.set(X(c.x),P+c.axis,Z(c.y0));return mesh};
  const R=L(c.r),st=L(c.stem),len=L(c.y1-c.y0);
  // Stepped cap, a shouldered body with raised bands, a tapered nose and a stem with a knurled collar and a turned tip.
  lie([[0,0],[R*.5,0],[R*.5,.9],[R*.68,.9],[R*.68,1.8],[0,1.8]],M('pipework','body'));
  lie([[0,1.8],[R*.78,1.8],[R*.78,2.6],[R*.86,2.6],[R*.86,3.5],[R*.94,4.2],[R,5.4],[R,20.4],[R+.25,20.6],[R+.25,22.2],[R,22.4],[R*.92,23.6],[R*.62,24.8],[st+.5,25.6],[st+.5,26.4],[st,26.6],[st,len-1],[st*.7,len],[0,len]],M('pipework','chrome'));
  for(const t of [5.9,13.2])lie([[R,t],[R+.2,t],[R+.2,t+.5],[R,t+.5]],M('pipework','satin'));
  lie([[st,len-9],[st+.45,len-9],[st+.45,len-5.5],[st,len-5.5]],M('pipework','satin'));
  // Two slots in the lower band.
  for(const dx of [-2.4,2.6])clear(b.box(pipe,'pipework',M('pipework','well'),X(c.x)+dx,Z(c.y0)+21.4,1.5,.34,P+c.axis+R+.2,P+c.axis+R+.27));
  cyl(at('pipework',DISC_PORT[0],DISC_PORT[1],DISC.y1),'pipework',M('pipework','body'),0,0,1.8,0,3.8,24);clear(cyl(at('pipework',DISC_PORT[0],DISC_PORT[1],5),'pipework',M('pipework','well'),0,0,1.2,0,.03,20));
  const copperGlow=()=>std('pipework',{map:copperAlong,roughness:.4,metalness:.55,emissive:0xff7a1a,emissiveIntensity:0});
  const ribs:Item[]=[],zAxis=new THREE.Vector3(0,0,1);
  for(const run of RUNS){
   const pts=run.pts.map(([x,y])=>pt(x,y,run.y)),r=L(run.r);
   let mat:THREE.Material;
   if(run.kind==='copper'){const glow=copperGlow();if(FLOW.includes(run.id))lines.push(glow);mat=glow}else mat=M('pipework',run.kind==='hose'?'wireblack':'steelTube');
   b.wire(pipe,'pipework',mat,pts,r);
   if(run.kind==='hose'){
    const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n=Math.round(curve.getLength()/.75);
    for(let i=1;i<n;i++){const p=curve.getPointAt(i/n),t=curve.getTangentAt(i/n);ribs.push({x:p.x,y:p.y,z:p.z,q:new THREE.Quaternion().setFromUnitVectors(zAxis,t)})}
   }else if(run.kind!=='chromeFat'){
    // Unions at both ends.
    for(const [a,c2] of [[run.pts[0],run.pts[1]],[run.pts[run.pts.length-1],run.pts[run.pts.length-2]]] as [P2,P2][]){
     const k=1/Math.hypot(c2[0]-a[0],c2[1]-a[1]),along=(d:number):P2=>[a[0]+(c2[0]-a[0])*k*d,a[1]+(c2[1]-a[1])*k*d];
     // A flange, a hex union nut and a ferrule.
     hcyl('pipework',M('pipework','chrome'),along(0),along(3),run.y,r+.62);hcyl('pipework',M('pipework','chromeFlat'),along(3),along(13),run.y,r+.42,undefined,6);hcyl('pipework',M('pipework',run.kind==='copper'?'brass':'satin'),along(13),along(19),run.y,r+.16);
    }
    // A collar either side of every elbow, so each bend reads as a fitting.
    for(let i=1;i<run.pts.length-1;i++){
     const [p0,p1,p2]=[run.pts[i-1],run.pts[i],run.pts[i+1]],a0=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]),a1=Math.atan2(p2[1]-p1[1],p2[0]-p1[0]);
     let turn=Math.abs(a1-a0);if(turn>Math.PI)turn=Math.PI*2-turn;
     if(turn<.5||Math.hypot(p1[0]-p0[0],p1[1]-p0[1])<30||Math.hypot(p2[0]-p1[0],p2[1]-p1[1])<30)continue;
     hcyl('pipework',M('pipework','chrome'),[p1[0]-Math.cos(a0)*22,p1[1]-Math.sin(a0)*22],[p1[0]-Math.cos(a0)*13,p1[1]-Math.sin(a0)*13],run.y,r+.3);
     hcyl('pipework',M('pipework','chrome'),[p1[0]+Math.cos(a1)*13,p1[1]+Math.sin(a1)*13],[p1[0]+Math.cos(a1)*22,p1[1]+Math.sin(a1)*22],run.y,r+.3);
    }
   }
  }
  many(pipe,'pipework',new THREE.TorusGeometry(1.05,.2,6,14),M('pipework','wireblack'),ribs);
 }

 // ── Wiring ──────────────────────────────────────────────────────────────
 {
  const w=base.wiring;
  // Loose leads, from the authored list in `wiring.ts`: each is one tube of one thickness from socket to socket. Where a lead
  // plugs into a part it carries on 1.2 mm into the body and wears a boot with a bright ferrule seated on the part's face;
  // where it dives into the deck it ends inside a rubber grommet. Black leads carry two short red heat-shrink collars.
  const boots:Item[]=[],ferrules:Item[]=[],grommets:Item[]=[],xAxis=new THREE.Vector3(1,0,0);
  for(const route of routes()){
   const {lead}=route,r=L(lead.r),n=route.pts.length,v=route.pts.map(([x,y],i)=>new THREE.Vector3(X(x),P+route.h[i],Z(y)));
   const finish=(end:typeof lead.a,tip:THREE.Vector3,before:THREE.Vector3)=>{
    const d=tip.clone().sub(before).setY(0).normalize(),q=new THREE.Quaternion().setFromUnitVectors(xAxis,d);
    if('grommet' in end){grommets.push({x:tip.x,y:P,z:tip.z,sx:Math.max(1,r*2.5),sy:r*2+.55,sz:Math.max(1,r*2.5)});return null}
    boots.push({x:tip.x-d.x*1.5,y:tip.y,z:tip.z-d.z*1.5,q,sx:2.6,sy:r+.2,sz:r+.2});ferrules.push({x:tip.x-d.x*.3,y:tip.y,z:tip.z-d.z*.3,q,sx:.6,sy:r+.36,sz:r+.36});
    return tip.clone().addScaledVector(d,1.2);
   };
   const head=finish(lead.a,v[0],v[2]),tail=finish(lead.b,v[n-1],v[n-3]),curve=new THREE.CatmullRomCurve3([...(head?[head]:[]),...v,...(tail?[tail]:[])],false,'centripetal');
   curve.arcLengthDivisions=n*4;put(loose,'wiring',new THREE.TubeGeometry(curve,n*2,r,10,false),M('wiring','wire'+lead.c));
   for(const [s0,s1] of sleeves(route)){
    const part=v.filter((_,i)=>route.along[i]>=s0&&route.along[i]<=s1);if(part.length<3)continue;
    put(loose,'wiring',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(part,false,'centripetal'),part.length*2,r+.13,12,false),M('wiring','wirered'));
   }
  }
  many(loose,'wiring',new THREE.CylinderGeometry(1,1,1,16).rotateZ(Math.PI/2),M('wiring','plug'),boots);
  many(loose,'wiring',new THREE.CylinderGeometry(1,1,1,16).rotateZ(Math.PI/2),M('wiring','chrome'),ferrules);
  many(loose,'wiring',lathe([[0,0],[1,0],[1,.3],[.9,.62],[.66,.9],[.3,1],[0,1]],24),M('wiring','plug'),grommets);
  const {trunk,fan}=loom();
  // The loom: every cable is its own tube, the upper six bedded in the grooves of the lower eight.
  const lr=L(LOOM.r);
  trunk.forEach(t=>b.wire(w,'wiring',M('wiring',t.tone==='orange'?'braid':'braidK'),t.pts.map(([x,y],k)=>pt(x,y,lr+.05+t.h+(t.lead&&k<2?1.4:0))),lr));
  // Inline connectors where the loom changes colour at the split.
  many(w,'wiring',new THREE.CylinderGeometry(lr+.16,lr+.16,2.2,12).rotateX(Math.PI/2),M('wiring','body'),[...LOOM.lower.map(x=>({x:X(x),y:P+lr+.05,z:Z(LOOM.split)})),...LOOM.upper.map(x=>({x:X(x),y:P+lr+.05+LOOM.rise,z:Z(LOOM.split)}))]);
  fan.forEach((pts,i)=>{
   const y=pts[pts.length-1][1];b.wire(w,'wiring',M('wiring','wireblack'),pts.map(([x,yy],k)=>pt(x,yy,k<2?2.4+i*.12:.8)),.58);
   // Ribbed grey plug with a pale label band, and the orange marker on its lead.
   hcyl('wiring',M('wiring','charcoal'),[1196,y],[LOOM.fanX+2,y],.8,.84);hcyl('wiring',M('wiring','white'),[1236,y],[1240,y],.8,.86);hcyl('wiring',M('wiring','orange'),[1180,y],[1190,y],.8,.7);
  });
  many(w,'wiring',new THREE.TorusGeometry(.9,.1,6,14),M('wiring','skirt'),fan.flatMap(pts=>Array.from({length:8},(_,k)=>({x:X(1200+k*4.4),y:P+.8,z:Z(pts[pts.length-1][1]),ry:Math.PI/2}))));
  for(const p of PROBES){
   const r=L(p.r),len=p.x1-p.x0,seg=(f0:number,f1:number,mat:Mat,grow=0)=>hcyl('wiring',mat,[p.x0+len*f0,p.y],[p.x0+len*f1,p.y],r,r+grow);
   if(p.look==='tip'){seg(0,.07,M('wiring','body'),-.4);seg(.07,.16,M('wiring','red'),-.15);seg(.16,.5,M('wiring','body'));seg(.5,.62,M('wiring','body'),.3);seg(.62,.9,M('wiring','brass'));seg(.9,1,M('wiring','body'),.1)}
   else{seg(0,.22,M('wiring','body'),.2);seg(.22,.3,M('wiring','brass'),-.1);seg(.3,1,M('wiring','chrome'))}
  }
  const v=PROBE_V;hcyl('wiring',M('wiring','body'),[v.x,v.y0],[v.x,v.y1],L(v.r),L(v.r));hcyl('wiring',M('wiring','chrome'),[v.x,v.y0+52],[v.x,v.y0+60],L(v.r),L(v.r)+.12);
 }

 // ── Fixing screws ───────────────────────────────────────────────────────
 {
  many(fixings,'panel',lathe([[0,0],[1,0],[1,.3],[.82,.56],[.45,.7],[0,.7]],20),M('panel','chromeFlat'),SCREWS.map(([x,y])=>({x:X(x),y:P,z:Z(y)})));
  clear(many(fixings,'panel',new THREE.BoxGeometry(1.3,.06,.22),M('panel','well'),SCREWS.map(([x,y],i)=>({x:X(x),y:P+.71,z:Z(y),ry:.5+i*.9}))));
 }

 // ── Edge rail ───────────────────────────────────────────────────────────
 {
  // A thick clear acrylic moulding: the kit's refracting crystal on closed, generously bevelled solids, nearly polished.
  // The lamps and the dark channel sit under it and are seen through it; pale lines along its bevels stand in for the
  // edge glints a clear bar shows (unlit, so they cannot flare).
  const rail=base.rail,r=RAIL,cx=X((r.x0+r.x1)/2),w=L(r.x1-r.x0),zc=Z((r.y0+r.y1)/2),len=L(r.y1-r.y0);
  const crystal=m.own('rail',Object.assign((m.mat('rail','crystal') as THREE.MeshPhysicalMaterial).clone(),{roughness:.05,thickness:5,specularIntensity:.6}));
  const glint=m.own('rail',new THREE.MeshBasicMaterial({color:0xe6eef4,transparent:true,opacity:.42,depthWrite:false}));
  clear(put(rail,'rail',cap(rect(cx,zc,w,len,2.4),P+.02,P+r.h,2),crystal,false));
  // Dark channel with a serrated steel strip, under the right half of the bar.
  rbox(rail,'rail',M('rail','skirt'),X(1854),zc,L(48),len-6,P+.02,P+.7,.4,.2);
  hcyl('rail',M('rail','chrome'),[1833,r.y0+40],[1833,r.y1-40],.75,.22);
  many(rail,'rail',new THREE.BoxGeometry(.5,.12,.18),M('rail','chromeFlat'),Array.from({length:Math.floor((len-10)/.55)},(_,i)=>({x:X(1836),y:P+.78,z:Z(r.y0+50)+i*.55})));
  // End and middle clips: taller clear blocks, each with a dark fixing screw.
  for(const [y,d,h] of [[694,62,9.4],[1736,108,9.6],[2452,56,9]]){
   clear(put(rail,'rail',cap(rect(cx,Z(y),w+.6,L(d),2),P+.02,P+h,1.8),crystal,false));
   cyl(rail,'rail',M('rail','body'),X(1850),Z(y),1.1,P+.02,P+2.2,20);clear(b.box(rail,'rail',M('rail','chromeFlat'),X(1850),Z(y),1.5,.22,P+2.2,P+2.24));
   for(const dz of [-L(d)/2+.5,L(d)/2-.5])clear(b.box(rail,'rail',glint,cx,Z(y)+dz,w-3,.14,P+h-.12,P+h-.1));
  }
  for(const x of [r.x0+10,1828,r.x1-10])clear(b.box(rail,'rail',glint,X(x),zc,.14,len-5,P+r.h+.005,P+r.h+.02));
  const [sx0,sy0,sx1,sy1]=r.strip;
  clear(put(rail,'rail',cap(rect(X((sx0+sx1)/2),Z((sy0+sy1)/2),L(sx1-sx0),L(sy1-sy0),1.2),P,P+1.2,.4),phys('rail',{color:0xe8eef4,transparent:true,opacity:.07,roughness:.12,clearcoat:1,depthWrite:false}),false));
  // Small white lamps: a dark seat on the deck seen through the bar, and the lit dome standing proud of a clear boss on its top.
  many(rail,'rail',lathe([[0,0],[1.35,0],[1.35,.5],[1.05,.8],[0,.8]],24),M('rail','collar'),STUDS.map(([x,y])=>({x:X(x),y:P+.03,z:Z(y)})));
  many(rail,'rail',lathe([[0,0],[.85,0],[.85,.5],[.7,1.1],[.4,1.5],[0,1.6]],24),M('rail','lampWhite'),STUDS.map(([x,y])=>({x:X(x),y:P+r.h-.55,z:Z(y)})));
  clear(many(rail,'rail',new THREE.TorusGeometry(1.7,.42,10,28).rotateX(Math.PI/2),crystal,STUDS.map(([x,y])=>({x:X(x),y:P+r.h,z:Z(y)}))));
 }

 return {spin,cupSpin,valves,needles,segD,pillJ,tickH,buttonMats,lines,lcd,tall,touch,shadowMat,deck};
}
