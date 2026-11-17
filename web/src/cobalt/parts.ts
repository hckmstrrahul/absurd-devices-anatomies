// Cobalt's geometry. Everything on the board comes from layout.ts; nothing here invents a position.
// Heights inside the board layers are measured from the board's top face.
import * as THREE from 'three';
import type {Builder} from '../kit/builder';
import {roundPlate,roundFrame,slab,lathe} from '../kit/builder';
import {rng} from '../kit/util';
import {BOARD,HOLES,HOLE,PLINTH,STAND,TOP,U1,FLEX,COVER,LEAD,CHIP,coverBase,flexPath,layout,type Asm,type Part} from './layout';
import {boardTextures,brushed,grain,marking,dimples,flexTextures,coverTextures,chipMark,planUV} from './textures';
import {buildPlinth} from './plinth';

type V3=[number,number,number];
const Y0=PLINTH.h,DECK=Y0+TOP;

// Top faces carry plan millimetres as UVs; side walls sample far outside, which a clamped texture answers with its corner texel.
const planUVs={
 generateTopUV(_g:THREE.ExtrudeGeometry,v:number[],a:number,b:number,c:number){return [a,b,c].map(i=>new THREE.Vector2(v[i*3],v[i*3+1]))},
 generateSideWallUV(){return [0,1,2,3].map(()=>new THREE.Vector2(-1e3,-1e3))},
};
// A plan shape raised to height h with every edge bevelled, standing on y = 0.
function raised(shape:THREE.Shape,h:number,bevel:number,segments=2,curve=8){
 const g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,h-bevel*2),bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:segments,curveSegments:curve,UVGenerator:planUVs});
 g.rotateX(-Math.PI/2);g.translate(0,bevel,0);return g;
}
// A bevelled block w × h × d with rounded plan corners, standing on y = 0. The bevel is inside the stated size.
const rbox=(w:number,h:number,d:number,r:number,bevel:number,segments=2)=>raised(roundPlate(w-bevel*2,d-bevel*2,Math.max(.005,r-bevel)),h,bevel,segments,6);
const at=(g:THREE.BufferGeometry,x:number,y:number,z:number)=>g.translate(x,y,z);
const M=(x:number,y:number,z:number,yaw=0,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw),new THREE.Vector3(sx,sy,sz));
// A gull-wing lead: local +x points away from the body, the foot rests on y = 0.
function gull(span:number,rise:number,w:number,t:number){
 const a=span*.26,bz=span*.6,low=t/2+.01,c=(bz-a)*.62,line:[number,number][]=[[-.28,rise]];
 for(let i=0;i<=10;i++){const s=i/10,u=1-s;line.push([u*u*u*a+3*u*u*s*(a+c)+3*u*s*s*(bz-c)+s*s*s*bz,u*u*u*rise+3*u*u*s*rise+3*u*s*s*low+s*s*s*low])}
 line.push([span,low]);
 const up:[number,number][]=[],down:[number,number][]=[];
 line.forEach((p,i)=>{const q=line[Math.min(line.length-1,i+1)],o=line[Math.max(0,i-1)],dx=q[0]-o[0],dy=q[1]-o[1],l=Math.hypot(dx,dy);up.push([p[0]-dy/l*t/2,p[1]+dx/l*t/2]);down.push([p[0]+dy/l*t/2,p[1]-dx/l*t/2])});
 const s=new THREE.Shape();up.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));down.reverse().forEach(([x,y])=>s.lineTo(x,y));s.closePath();
 const e=.025,g=new THREE.ExtrudeGeometry(s,{depth:w-e*2,bevelEnabled:true,bevelThickness:e,bevelSize:e,bevelSegments:1,curveSegments:2});
 g.translate(0,0,-w/2+e);return g;
}
// A strip of given thickness along a path in (z, y), spanning x0..x1. u runs across, v along from the first point.
function ribbon(path:[number,number][],x0:number,x1:number,t:number){
 const n=path.length,pos:number[]=[],uv:number[]=[],idx:number[]=[],len=[0];
 for(let i=1;i<n;i++)len.push(len[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
 const normal=(i:number)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(n-1,i+1)],dz=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dz,dy);return [-dy/l,dz/l]};
 // Four rows of vertices per station: upper face, lower face, and the two edges (duplicated so each has its own normal).
 const face=(side:number,flip:boolean)=>{
  const base=pos.length/3;
  for(let i=0;i<n;i++){const [nz,ny]=normal(i),z=path[i][0]+nz*side*t/2,y=path[i][1]+ny*side*t/2,v=len[i]/len[n-1];pos.push(x0,y,z,x1,y,z);uv.push(0,v,1,v)}
  for(let i=0;i<n-1;i++){const a=base+i*2,b=a+1,c=a+2,d=a+3;if(flip)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d)}
 };
 face(1,false);face(-1,true);
 for(const [x,flip] of [[x0,true],[x1,false]] as [number,boolean][]){
  const base=pos.length/3;
  for(let i=0;i<n;i++){const [nz,ny]=normal(i),v=len[i]/len[n-1],u=x===x0?0:1;pos.push(x,path[i][1]+ny*t/2,path[i][0]+nz*t/2,x,path[i][1]-ny*t/2,path[i][0]-nz*t/2);uv.push(u,v,u,v)}
  for(let i=0;i<n-1;i++){const a=base+i*2,b=a+1,c=a+2,d=a+3;if(flip)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function buildCobalt(b:Builder){
 const {parts,leads}=layout(),random=rng(81);
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t);
 const std=(asm:Asm,p:THREE.MeshStandardMaterialParameters)=>b.m.own(asm,new THREE.MeshStandardMaterial(p));
 const phys=(asm:Asm,p:THREE.MeshPhysicalMaterialParameters)=>b.m.own(asm,new THREE.MeshPhysicalMaterial(p));
 const L={
  plinth:b.layer('plinth',[0,0,0],[0,Y0,0]),standoffs:b.layer('standoffs',[0,0,0],[0,Y0,0]),board:b.layer('board',[0,0,0],[0,DECK,0]),
  passives:b.layer('passives',[0,0,0],[0,DECK,0]),connectors:b.layer('connectors',[0,0,0],[0,DECK,0]),chips:b.layer('chips',[0,0,0],[0,DECK,0]),
  screws:b.layer('screws',[0,0,0],[0,DECK,0]),flex:b.layer('flex',[0,0,0],[0,DECK,0]),cover:b.layer('cover',[0,0,0],[0,DECK,0]),
 };
 const inst=(parent:THREE.Object3D,asm:Asm,g:THREE.BufferGeometry,m:THREE.Material,list:THREE.Matrix4[],shadow=true)=>{
  if(!list.length)return null;const mesh=new THREE.InstancedMesh(g,m,list.length);list.forEach((x,i)=>mesh.setMatrixAt(i,x));mesh.instanceMatrix.needsUpdate=true;
  b.adopt(parent,asm,mesh,list.length);mesh.castShadow=shadow;return mesh;
 };
 // Shared surface detail.
 const fine=tex(grain(3,.56,.34)),matte=tex(grain(7,.8,.2)),wear=tex(brushed(41,512));
 const speckle=(mm:number)=>{const t=fine.clone();t.repeat.set(1/mm,1/mm);return tex(t)};
 // Per-assembly finishes, made on first use so every material has exactly one owner.
 const cache=new Map<string,THREE.Material>();
 const finish=(asm:Asm,kind:'tin'|'solder'|'gold'|'epoxy'|'nylon'|'cream'|'dark'|'ceramic'|'oxide'|'nickel'|'posts')=>{
  const key=asm+kind;let m=cache.get(key);if(m)return m;
  switch(kind){
   case 'tin':m=std(asm,{color:0xf3f5f7,metalness:.72,roughness:.3,roughnessMap:wear});break;
   case 'solder':m=std(asm,{color:0xdfe3e6,metalness:.7,roughness:.32});break;
   case 'gold':m=std(asm,{color:0xe0b45a,metalness:1,roughness:.24});break;
   case 'epoxy':m=phys(asm,{color:0x18191c,roughness:1,roughnessMap:speckle(2),bumpMap:speckle(2),bumpScale:.006,clearcoat:.12,clearcoatRoughness:.5});break;
   case 'nylon':m=phys(asm,{color:0xf0efe9,roughness:.9,roughnessMap:speckle(3),clearcoat:.35,clearcoatRoughness:.35,sheen:.4,sheenColor:new THREE.Color(0xffffff),sheenRoughness:.5});break;
   case 'cream':m=phys(asm,{color:0xe4dcc8,roughness:.95,roughnessMap:speckle(3),clearcoat:.2,clearcoatRoughness:.4});break;
   case 'dark':m=phys(asm,{color:0x2a221c,roughness:.9,roughnessMap:speckle(3),clearcoat:.25,clearcoatRoughness:.4});break;
   case 'ceramic':m=std(asm,{color:0x2b2724,roughness:.62,roughnessMap:matte});break;
   case 'oxide':m=std(asm,{color:0x17181b,metalness:.75,roughness:.36,roughnessMap:wear});break;
   case 'nickel':m=std(asm,{color:0xcfccc2,metalness:1,roughness:.44,roughnessMap:wear});break;
   case 'posts':m=std(asm,{color:0xc5cad2,metalness:1,roughness:.5,roughnessMap:wear});break;
  }
  cache.set(key,m);return m;
 };
 const put=(parent:THREE.Object3D,asm:Asm,g:THREE.BufferGeometry,m:THREE.Material,shadow=true)=>b.put(parent,asm,g,m,shadow);

 // ── Plinth and standoffs ─────────────────────────────────────────────────
 const plinth=buildPlinth(b,L.plinth);
 {
  const g=lathe([[0,0],[1.85,0],[2.1,.25],[2.1,STAND-.25],[1.85,STAND],[0,STAND]],6).toNonIndexed();g.computeVertexNormals();
  inst(L.standoffs,'standoffs',g,finish('standoffs','oxide'),HOLES.map(([x,z])=>M(x,0,z,Math.PI/6)));
  inst(L.standoffs,'standoffs',lathe([[0,0],[2.9,0],[2.9,.18],[2.7,.3],[0,.3]],40),finish('standoffs','oxide'),HOLES.map(([x,z])=>M(x,0,z)));
 }

 // ── Board: mask, copper and laminate in visible layers at the edge, the print on top. ──
 const print=boardTextures();Object.values(print).forEach(tex);
 const plan=roundPlate(BOARD.w,BOARD.d,BOARD.r);
 for(const [x,z] of HOLES){const h=new THREE.Path();h.absarc(x,-z,HOLE.drill,0,Math.PI*2,true);plan.holes.push(h)}
 const boardTop=phys('board',{map:print.colour,roughness:1,roughnessMap:print.relief,metalness:1,metalnessMap:print.relief,bumpMap:print.relief,bumpScale:.3,clearcoat:1,clearcoatRoughness:.16});
 {
  const mask=phys('board',{color:0x0b2569,roughness:.3,clearcoat:1,clearcoatRoughness:.1}),core=std('board',{color:0x26365c,roughness:.7,roughnessMap:matte}),foil=std('board',{color:0xb9813e,metalness:1,roughness:.4});
  const t=BOARD.t,stack:[number,number,THREE.Material][]=[[-t,-t+.06,mask],[-t+.06,-t+.1,foil],[-t+.1,-t*.5-.03,core],[-t*.5-.03,-t*.5+.03,foil],[-t*.5+.03,-.1,core],[-.1,-.06,foil],[-.06,0,mask]];
  for(const [y0,y1,m] of stack)put(L.board,'board',slab(plan,y0,y1,10),m);
  const face=new THREE.ShapeGeometry(plan,10);face.rotateX(-Math.PI/2);face.translate(0,.004,0);put(L.board,'board',face,boardTop,false);
  const under=new THREE.ShapeGeometry(plan,10);under.rotateX(Math.PI/2);under.translate(0,-t-.004,0);print.bottom.repeat.y*=-1;
  put(L.board,'board',under,phys('board',{map:print.bottom,roughness:.4,clearcoat:.6,clearcoatRoughness:.2}),false);
 }

 // ── Screws: black shoulder screws with a slotted head, standing proud of the white rings. ──
 {
  const oxide=finish('screws','oxide');
  const body=lathe([[0,-TOP+.3],[.95,-TOP+.3],[.95,0],[1.55,0],[1.72,.14],[1.72,1],[1.56,1.16],[1.05,1.22],[1.02,2],[1.72,2.08],[1.9,2.26],[1.9,3.12],[1.8,3.3],[0,3.3]],40);
  const r=1.66,a0=Math.asin(.27/r),half=new THREE.Shape();half.absarc(0,0,r,a0,Math.PI-a0,false);half.closePath();
  const moon=new THREE.ExtrudeGeometry(half,{depth:.36,bevelEnabled:true,bevelThickness:.1,bevelSize:.1,bevelSegments:2,curveSegments:20});moon.rotateX(-Math.PI/2);moon.translate(0,3.36,0);
  inst(L.screws,'screws',body,oxide,HOLES.map(([x,z])=>M(x,0,z)));
  const turns=HOLES.map(()=>random()*Math.PI);
  inst(L.screws,'screws',moon,oxide,HOLES.flatMap(([x,z],i)=>[M(x,0,z,turns[i]),M(x,0,z,turns[i]+Math.PI)]));
 }

 // ── Leads, with a solder fillet at every foot. ──
 for(const fam of ['qfp','soic','sot'] as const){
  const d=LEAD[fam],mine=leads.filter(l=>l.fam===fam);
  inst(L.chips,'chips',gull(d.span,d.rise,d.w,d.t),finish('chips','tin'),mine.map(l=>M(l.x,0,l.z,Math.atan2(-l.dz,l.dx))));
  inst(L.chips,'chips',new THREE.SphereGeometry(1,10,6),finish('chips','solder'),mine.map(l=>M(l.x+l.dx*(d.span-.2),.01,l.z+l.dz*(d.span-.2),Math.atan2(-l.dz,l.dx),.42,d.t*.75,d.w*.82)),false);
 }
 // ── Packages. ──
 const marked=(asm:Asm,map:THREE.Texture,o:THREE.MeshPhysicalMaterialParameters={})=>phys(asm,{map:tex(map),roughness:1,roughnessMap:speckle(2),bumpMap:speckle(2),bumpScale:.006,clearcoat:.14,clearcoatRoughness:.45,...o});
 const body=(parent:THREE.Object3D,asm:Asm,p:Part,m:THREE.Material,y0:number,r:number,bevel:number)=>put(parent,asm,at(rbox(p.w,p.h-y0,p.d,r,bevel),p.x,y0,p.z),m);
 for(const p of parts)switch(p.kind){
  case 'qfp':body(L.chips,'chips',p,marked('chips',marking(p.w,p.d,['ORYN','Q80-A1','2644 K7C'],{dot:true})),.1,.3,.17);break;
  case 'soic':body(L.chips,'chips',p,marked('chips',marking(p.w,p.d,['L4718','26W4'],{dot:true})),.12,.15,.12);break;
  case 'sot5':case 'sot3':body(L.chips,'chips',p,marked('chips',marking(p.w,p.d,[p.value],{size:p.d*.5})),.1,.1,.1);break;
  case 'shield':{
   // A drawn nickel-silver can: pressed dimples, a stamped number, and the flange it is soldered down by.
   const relief=tex(dimples(p.w,p.d));
   put(L.chips,'chips',at(rbox(p.w,p.h-.12,p.d,.75,.26,3),p.x,.12,p.z),std('chips',{color:0xd3d0c6,metalness:1,roughness:.38,roughnessMap:wear,bumpMap:relief,bumpScale:.22}));
   put(L.chips,'chips',at(rbox(p.w+.5,.14,p.d+.5,.9,.04,1),p.x,0,p.z),finish('chips','nickel'));break;
  }
  case 'xtal':put(L.chips,'chips',at(rbox(p.w,.34,p.d,.12,.04,1),p.x,0,p.z),finish('chips','ceramic'));put(L.chips,'chips',at(rbox(p.w-.3,p.h-.3,p.d-.3,.3,.1),p.x,.3,p.z),std('chips',{color:0xd9cfae,metalness:1,roughness:.3,roughnessMap:wear}));break;
  case 'ind':{
   body(L.chips,'chips',p,phys('chips',{map:tex(marking(p.w,p.d,['4R7'],{body:'#2d2f33',size:1.25})),roughness:1,roughnessMap:tex(grain(19,.82,.22)),bumpMap:speckle(1.5),bumpScale:.02}),.05,.6,.24);
   for(const s of [-1,1])put(L.chips,'chips',at(rbox(.6,.8,p.d-.7,.08,.06,1),p.x+s*(p.w/2-.22),0,p.z),finish('chips','tin'));
   break;
  }
  case 'tant':{
   body(L.passives,'passives',p,marked('passives',marking(p.w,p.d,['107A','16K'],{body:'#1c1b19',stripe:true,size:.5})),.05,.14,.1);
   for(const s of [-1,1])put(L.passives,'passives',at(rbox(.42,.95,p.d-.3,.06,.05,1),p.x+s*(p.w/2-.14),0,p.z),finish('passives','tin'));break;
  }
  default:
 }
 // ── Two-terminal chips, instanced by size. Body, two plated end caps, a fillet at each end. ──
 const caps:THREE.Matrix4[]=[],blobs:THREE.Matrix4[]=[];
 for(const kind of ['c0402','r0402','c0603','r0603'] as const){
  const [l,a,h]=CHIP[kind],mine=parts.filter(p=>p.kind===kind),end=l*.2,resistor=kind[0]==='r';
  const m=resistor?(kind==='r0603'?phys('passives',{map:tex(chipMark('472',l-end*2,a)),roughness:.5,clearcoat:.5,clearcoatRoughness:.3}):phys('passives',{color:0x141517,roughness:.5,clearcoat:.5,clearcoatRoughness:.3})):finish('passives','ceramic');
  inst(L.passives,'passives',at(rbox(l-end*2+.04,h-.03,a-.04,.03,.03,1),0,.015,0),m,mine.map(p=>M(p.x,0,p.z,p.rot?Math.PI/2:0)));
  for(const p of mine)for(const s of [-1,1]){
   const o=s*(l/2-end/2),ox=p.rot?0:o,oz=p.rot?o:0,yaw=p.rot?Math.PI/2:0;
   caps.push(M(p.x+ox,0,p.z+oz,yaw,end,h,a));
   blobs.push(M(p.x+(p.rot?0:s*(l/2+.06)),.01,p.z+(p.rot?s*(l/2+.06):0),yaw,.16,h*.5,a*.52));
  }
 }
 // The end cap is a unit block scaled per size; its bevel scales with it, which suits parts this small.
 inst(L.passives,'passives',at(rbox(1,1,1,.08,.08,1),0,0,0),finish('passives','tin'),caps);
 inst(L.passives,'passives',new THREE.SphereGeometry(1,10,6),finish('passives','solder'),blobs,false);
 // ── Indicators: a white ceramic base, gold ends and a moulded lens that is the only thing here that glows. ──
 const lens=(colour:number)=>phys('passives',{color:0xeef2f6,roughness:.25,transparent:true,opacity:.92,clearcoat:1,emissive:colour,emissiveIntensity:0});
 const led={act:lens(0x2fe6ff),pwr:lens(0xff3ddc)};
 for(const p of parts)if(p.kind==='led'){
  put(L.passives,'passives',at(rbox(p.w,.26,p.d,.05,.04,1),p.x,0,p.z),std('passives',{color:0xf1f0ec,roughness:.6}));
  for(const s of [-1,1])put(L.passives,'passives',at(rbox(p.w+.02,.3,.3,.04,.04,1),p.x,0,p.z+s*(p.d/2-.14)),finish('passives','gold'));
  put(L.passives,'passives',at(rbox(p.w-.1,.36,p.d-.56,.16,.12,3),p.x,.24,p.z),p.value==='ACT'?led.act:led.pwr,false);
 }

 // ── Connectors. ──
 for(const p of parts)switch(p.kind){
  case 'w2b':{
   // White shrouded header: floor, three walls, and a front wall split by two keying slots; four posts inside.
   const nylon=finish('connectors','nylon'),w=p.w,d=p.d,h=p.h,wall=.72,floor=1.3,g=new THREE.Group();g.position.set(p.x,0,p.z);L.connectors.add(g);
   put(g,'connectors',rbox(w,floor,d,.45,.1),nylon);
   const up=(x:number,z:number,sx:number,sz:number)=>put(g,'connectors',at(rbox(sx,h-floor+.2,sz,.16,.1),x,floor-.2,z),nylon);
   up(-w/2+wall/2,0,wall,d);up(0,-d/2+wall/2,w,wall);up(0,d/2-wall/2,w,wall);
   for(const [z0,z1] of [[-d/2,-2.75],[-1.75,1.75],[2.75,d/2]])up(w/2-wall/2,(z0+z1)/2,wall,z1-z0);
   // Latch ramps on the back wall.
   for(const z of [-2.2,2.2])put(g,'connectors',at(rbox(.5,1.2,1.5,.1,.12),-w/2-.12,h-2.4,z),nylon);
   const post=rbox(.64,3.5,.64,.06,.14,1);inst(g,'connectors',post,finish('connectors','gold'),[0,1,2,3].map(i=>M(.1,floor,(i-1.5)*2)));
   break;
  }
  case 'fpc':{
   // Flex socket: a cream housing, a dark flip-lock over the mouth, and a comb of tails along the back.
   const cream=finish('connectors','cream'),g=new THREE.Group();g.position.set(p.x,0,p.z);L.connectors.add(g);
   put(g,'connectors',at(rbox(p.w,p.h,1.9,.12,.08),0,0,-.85),cream);put(g,'connectors',at(rbox(p.w,.6,1.75,.1,.06),0,0,.9),cream);
   put(g,'connectors',at(rbox(p.w-.6,.44,1.7,.1,.07),0,.86,.92),finish('connectors','dark'));
   for(const s of [-1,1])put(g,'connectors',at(rbox(.62,.5,1.5,.08,.05,1),s*5.6,0,.6),finish('connectors','tin'));
   inst(g,'connectors',at(rbox(.2,.12,.95,.03,.03,1),0,0,0),finish('connectors','tin'),Array.from({length:14},(_,i)=>M((i-6.5)*.5,0,-2.3)));
   break;
  }
  case 'b2b':{
   // Mezzanine socket: a walled housing with a centre island, and two rows of thirty gold contacts.
   const cream=finish('connectors','cream'),g=new THREE.Group();g.position.set(p.x,0,p.z);L.connectors.add(g);
   put(g,'connectors',raised(roundFrame(p.w-.16,p.d-.16,.3,.46),p.h,.08,2,6),cream);put(g,'connectors',at(rbox(p.w-.6,.3,p.d-.6,.1,.03,1),0,0,0),cream);
   put(g,'connectors',at(rbox(p.w-2.6,1.02,.6,.14,.08),0,.2,0),cream);
   for(const s of [-1,1])put(g,'connectors',at(rbox(.9,.95,1.5,.1,.06,1),s*10.2,0,0),finish('connectors','tin'));
   const blades:THREE.Matrix4[]=[];
   for(let i=0;i<30;i++)for(const s of [-1,1]){const x=(i-14.5)*.5;blades.push(M(x,.3,s*.37,0,1,.78,.14),M(x,.3,s*.86,0,1,.7,.12),M(x,0,s*1.7,0,1,.09,.9))}
   inst(g,'connectors',at(new THREE.BoxGeometry(.2,1,1),0,.5,0),finish('connectors','gold'),blades,false);
   break;
  }
  default:
 }

 // ── Flex ribbon and the cover plate it carries. ──
 const fx=flexTextures();Object.values(fx).forEach(tex);
 const flex=phys('flex',{map:fx.colour,roughness:1,roughnessMap:fx.relief,metalness:1,metalnessMap:fx.relief,bumpMap:fx.relief,bumpScale:.035,clearcoat:.55,clearcoatRoughness:.22,side:THREE.DoubleSide});
 put(L.flex,'flex',ribbon(flexPath(.2),FLEX.x-FLEX.w/2,FLEX.x+FLEX.w/2,FLEX.t),flex);
 // The burst that travels the flex: a row of thin unlit strips lying on both faces of the ribbon, lit by position.
 // (They are emitters, so they may glow; the ribbon itself only reflects.)
 const run=flexPath(.4),lit=b.m.own('flex',new THREE.MeshBasicMaterial({color:0xffffff,map:fx.pulse,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
 const strips:THREE.Matrix4[]=[],along:number[]=[];
 run.forEach((p,i)=>{
  const a=run[Math.max(0,i-1)],c=run[Math.min(run.length-1,i+1)],dz=c[0]-a[0],dy=c[1]-a[1],l=Math.hypot(dz,dy),tangent=new THREE.Vector3(0,dy/l,dz/l),normal=new THREE.Vector3(0,dz/l,-dy/l);
  for(const side of [1,-1]){strips.push(new THREE.Matrix4().makeBasis(new THREE.Vector3(1,0,0),tangent,normal).setPosition(FLEX.x,p[1]+normal.y*side*(FLEX.t/2+.015),p[0]+normal.z*side*(FLEX.t/2+.015)));along.push(i/(run.length-1))}
 });
 const burst=new THREE.InstancedMesh(new THREE.PlaneGeometry(FLEX.w,.42),lit,strips.length);strips.forEach((m,i)=>{burst.setMatrixAt(i,m);burst.setColorAt(i,new THREE.Color(0,0,0))});
 burst.userData.asm='flex';burst.renderOrder=6;L.flex.add(burst);
 const glow=new THREE.Color();
 // `at` is the burst's place along the ribbon, 0 at the board connector and 1 under the cover plate; `level` its brightness.
 const setBurst=(at:number,level:number)=>{
  for(let i=0;i<along.length;i++){
   let k=0;if(level>0)for(const [o,w,g] of [[0,.022,1],[.06,.018,.8],[.11,.012,.55]]){const d=(along[i]-at-o)/w;k+=g*Math.exp(-d*d)}
   burst.setColorAt(i,glow.setRGB(.5*k*level,2*k*level,2.6*k*level));
  }
  burst.instanceColor!.needsUpdate=true;
 };
 // Cover plate: dark glass with a luminous circuit in it and a thin-film sheen on its surface. The circuit always glows a
 // little; the model sets how brightly, and sends pulses along the traces (their place comes from the phase sheet).
 const cv=coverTextures();Object.values(cv).forEach(tex);
 const holo=phys('cover',{color:0x7c8494,map:cv.colour,emissive:0xffffff,emissiveMap:cv.colour,emissiveIntensity:1,roughness:.12,ior:1.9,iridescence:.85,iridescenceIOR:1.6,iridescenceThicknessRange:[240,520],iridescenceThicknessMap:cv.film,transparent:true,opacity:.93});
 const flow={uPhase:{value:cv.phase},uFlow:{value:0},uPulse:{value:0}};
 holo.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,flow);
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <emissivemap_pars_fragment>','#include <emissivemap_pars_fragment>\nuniform sampler2D uPhase;uniform float uFlow;uniform float uPulse;')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{vec3 ph=texture2D(uPhase,vEmissiveMapUv).rgb;float along=fract(atan(ph.b-.5,ph.r-.5)/6.2831853+uFlow);float pulse=smoothstep(0.,.03,along)*(1.-smoothstep(.03,.3,along))*ph.g;totalEmissiveRadiance*=1.+uPulse*pulse;}');
 };
 holo.customProgramCacheKey=()=>'cobalt-holo';
 put(L.cover,'cover',at(rbox(COVER.w,COVER.t,COVER.d,COVER.r,.3,3),COVER.x,coverBase(),COVER.z),holo);
 // `glow` 0..1 is how hard the module works; `phase` is the frame phase, so the pulses keep step with the frames.
 const setHolo=(glow:number,phase:number)=>{holo.emissiveIntensity=1+1.1*glow;flow.uFlow.value=phase;flow.uPulse.value=.8*glow};

 return {plinth,led,setBurst,setHolo,boardTop};
}
// Label anchors, in world millimetres.
export const ANCHORS:Record<Asm,V3>={
 cover:[COVER.x+COVER.w/2,DECK+coverBase()+COVER.t,COVER.z],flex:[FLEX.x,DECK+FLEX.over+FLEX.loop.r,FLEX.loop.z+FLEX.loop.r],screws:[HOLES[3][0],DECK+3.6,HOLES[3][1]],
 chips:[U1.x+5,DECK+1.6,U1.z+5],connectors:[18.4,DECK+5.8,-3.5],passives:[-15.5,DECK+1,3],board:[-20,DECK,12],standoffs:[HOLES[2][0],Y0+2.5,HOLES[2][1]],plinth:[-40,Y0,40],
};
