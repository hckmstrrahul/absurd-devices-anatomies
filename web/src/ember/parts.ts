import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {at,of,mm,parts,B,CARD,PX,IMG,BRACKET,SCREWS,PIPE,BAR,MANIFOLD,CLIPS,LEDS,DOTS,type Part,type Finish,type P2} from './layout';
import {comps} from './pcb';
import {boardMaps,codeAtlas} from './print';
import {spillTexture,bracketTexture,spunMap,brushedMaps,pittedMaps,tubeMap,grainMap,weaveTexture,chipTop,spreaderTexture,coreTexture,dieTexture,shroudMaps,SHROUD_BOX,manifoldTexture,fluteMap,type ShroudRegion,lensTexture,ringText,makeChase,pulseTexture,slotTexture,fanTexture} from './textures';
import {lathe,type Builder} from '../kit/builder';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';

// Rounded rectangle in plan, centred on (cx, cz). A shape's y is −z so extrusions land the right way up.
function rr<T extends THREE.Path>(path:T,cx:number,cz:number,w:number,d:number,radius:number){
 const x=w/2,y=d/2,cy=-cz,r=Math.max(.02,Math.min(radius,x-.01,y-.01));
 path.moveTo(cx-x+r,cy-y);path.lineTo(cx+x-r,cy-y);path.absarc(cx+x-r,cy-y+r,r,-Math.PI/2,0,false);path.lineTo(cx+x,cy+y-r);path.absarc(cx+x-r,cy+y-r,r,0,Math.PI/2,false);
 path.lineTo(cx-x+r,cy+y);path.absarc(cx-x+r,cy+y-r,r,Math.PI/2,Math.PI,false);path.lineTo(cx-x,cy-y+r);path.absarc(cx-x+r,cy-y+r,r,Math.PI,Math.PI*1.5,false);path.closePath();return path;
}
const pxRect=([x0,y0,x1,y1]:readonly [number,number,number,number])=>{const [x,z]=mm((x0+x1)/2,(y0+y1)/2);return {x,z,w:(x1-x0)*PX,d:(y1-y0)*PX}};
const polygon=(pts:P2[])=>{const s=new THREE.Shape();pts.forEach(([px,py],i)=>{const [x,z]=mm(px,py);if(i)s.lineTo(x,-z);else s.moveTo(x,-z)});s.closePath();return s};
// Extrude a plan shape between two heights with a bevel of `b` on its top and bottom edges.
function solid(shape:THREE.Shape,y0:number,y1:number,b=.3,segments=8,round=2){
 const bevel=Math.max(0,Math.min(b,(y1-y0)/2-.02));
 const g=new THREE.ExtrudeGeometry(shape,{depth:y1-y0-bevel*2,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelOffset:-bevel,bevelSegments:round,curveSegments:segments});
 g.rotateX(-Math.PI/2);g.translate(0,y0+bevel,0);return g;
}
// A traced outline (reference pixels) with its corners rounded by `r` mm.
function roundPoly<T extends THREE.Path>(path:T,pts:readonly (readonly number[])[],r:number){
 const v=pts.map(([px,py])=>{const [x,z]=mm(px,py);return new THREE.Vector2(x,-z)}),n=v.length;
 v.forEach((p,i)=>{
  const a=v[(i-1+n)%n].clone().sub(p),b=v[(i+1)%n].clone().sub(p),d=Math.min(r,a.length()/2.2,b.length()/2.2),s=p.clone().addScaledVector(a.normalize(),d),e=p.clone().addScaledVector(b.normalize(),d);
  if(i)path.lineTo(s.x,s.y);else path.moveTo(s.x,s.y);path.quadraticCurveTo(p.x,p.y,e.x,e.y);
 });
 path.closePath();return path;
}
// Lay a painted face on a geometry from straight above: u, v follow the reference-pixel box the face was painted over.
function planar<T extends THREE.BufferGeometry>(g:T,box:readonly [number,number,number,number],dx=0,dz=0){
 const [ax,az]=mm(box[0],box[1]),[bx,bz]=mm(box[2],box[3]),pos=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+dx-ax)/(bx-ax),1-(pos.getZ(i)+dz-az)/(bz-az));
 return g;
}
// A tube's painted shading runs across it as seen from above: v follows how far the surface leans toward the upper left.
function across<T extends THREE.BufferGeometry>(g:T,turns=1){
 const n=g.attributes.normal,uv=g.attributes.uv;
 for(let i=0;i<n.count;i++)uv.setXY(i,uv.getX(i)*turns,Math.min(.98,Math.max(.02,.5+.95*(n.getX(i)+n.getZ(i))*.7071)));
 return g;
}
// Ring or dish revolved about Y: a bevelled washer between two radii.
const ringProfile=(rIn:number,rOut:number,y0:number,y1:number,b=.3):[number,number][]=>[[rIn,y0],[rOut,y0],[rOut,y1-b],[rOut-b,y1],[rIn+b,y1],[rIn,y1-b],[rIn,y0]];
// Draw calls are what cost frames here, so once a layer is built its plain meshes are merged per material.
function compact(layer:THREE.Object3D){
 const groups=new Map<string,THREE.Mesh[]>();
 for(const o of [...layer.children]){
  const mesh=o as THREE.Mesh;if(!mesh.isMesh||(mesh as unknown as THREE.InstancedMesh).isInstancedMesh||Array.isArray(mesh.material)||!mesh.geometry.attributes.uv||!mesh.geometry.attributes.normal)continue;
  const key=mesh.material.uuid+(mesh.castShadow?'s':'n');groups.set(key,[...(groups.get(key)??[]),mesh]);
 }
 for(const meshes of groups.values()){
  if(meshes.length<2)continue;
  const list=meshes.map(mesh=>{
   mesh.updateMatrix();const src=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone(),g=new THREE.BufferGeometry();
   for(const name of ['position','normal','uv'])g.setAttribute(name,src.attributes[name]);
   g.applyMatrix4(mesh.matrix);src.dispose();return g;
  });
  const merged=mergeGeometries(list,false);if(!merged)continue;
  const first=meshes[0],mesh=new THREE.Mesh(merged,first.material);mesh.castShadow=first.castShadow;mesh.receiveShadow=true;mesh.userData.asm=first.userData.asm;layer.add(mesh);
  for(const old of meshes){layer.remove(old);old.geometry.dispose()}
  for(const g of list)g.dispose();
 }
}

// Environment strength for matte finishes; metals set their own, lower.
const ROOM=.1;
// Soft fill: every finish takes this much more of the room, and the key light is lowered to match (device.ts).
// The light then wraps around parts instead of landing as hard hot spots, at the same overall brightness.
const FILL=1.9;
// Small parts are painted in the colours the reference shows; this lifts them to read the same under this light.
const SMD_GAIN=1.75;
export function buildEmber(b:Builder){
 const {m,put}=b;
 const layer=(asm:AssemblyId,lift?:V3)=>b.layer(asm,lift);
 // Since three r163 `envMapIntensity` only applies to a material's own `envMap`, and the scene environment has one
 // global strength. Every material here is given the scene environment as its own map on the first frame
 // (`setEnvironment`), so each finish keeps its own strength: flat steel faces the overhead softbox squarely
 // from the top camera and would otherwise burn out and bloom.
 const lit:THREE.MeshStandardMaterial[]=[];
 const std=(asm:AssemblyId,p:THREE.MeshStandardMaterialParameters)=>{const mat=m.own(asm,new THREE.MeshStandardMaterial({envMapIntensity:ROOM,...p}));mat.envMapIntensity*=FILL;lit.push(mat);return mat};
 const phys=(asm:AssemblyId,p:THREE.MeshPhysicalMaterialParameters)=>{const mat=m.own(asm,new THREE.MeshPhysicalMaterial({envMapIntensity:ROOM,...p}));mat.envMapIntensity*=FILL;lit.push(mat);return mat};
 const setEnvironment=(map:THREE.Texture|null)=>{for(const mat of lit){mat.envMap=map;mat.needsUpdate=true}};
 const quiet=<T extends THREE.Object3D>(o:T)=>{o.castShadow=false;return o};

 // ── Finishes ────────────────────────────────────────────────────────────
 const brushed=brushedMaps(),pitted=pittedMaps(),grain=grainMap();
 [brushed.rough,brushed.bump,pitted.map,pitted.rough,pitted.bump,grain].forEach(t=>m.texture(t));
 const cache=new Map<string,THREE.Material>();
 const recipes:Record<Finish,(asm:AssemblyId)=>THREE.Material>={
  black:a=>phys(a,{color:a==='memory'||a==='pipes'?0x090808:0x131211,roughness:a==='memory'||a==='pipes'?.75:.6,specularIntensity:a==='memory'||a==='pipes'?.2:.5,bumpMap:grain,bumpScale:.05}),
  matte:a=>std(a,{color:0x1e1b1a,roughness:.85}),
  grey:a=>std(a,{color:0x7a7370,roughness:.7,bumpMap:grain,bumpScale:.08}),
  dark:a=>std(a,{color:0x4a4543,roughness:.42,metalness:1,envMapIntensity:.26}),
  steel:a=>std(a,{color:0xefe4de,roughness:.55,metalness:1,envMapIntensity:.16}),
  white:a=>std(a,{color:0xfaf0ea,roughness:.5,metalness:.1,envMapIntensity:.16}),
  brushed:a=>phys(a,{color:0xeee4de,roughness:.64,metalness:1,roughnessMap:brushed.rough,bumpMap:brushed.bump,bumpScale:.02,anisotropy:.6,envMapIntensity:.18}),
  pitted:a=>std(a,{color:0xc8beb5,map:pitted.map,roughness:1,roughnessMap:pitted.rough,bumpMap:pitted.bump,bumpScale:.34,metalness:.55,envMapIntensity:.4}),
  darkpitted:a=>std(a,{color:0x8e8780,map:pitted.map,roughness:1,roughnessMap:pitted.rough,bumpMap:pitted.bump,bumpScale:.28,metalness:.55,envMapIntensity:.38}),
  brass:a=>std(a,{color:0xe0a94a,roughness:.3,metalness:1,envMapIntensity:.2}),
  gold:a=>std(a,{color:0xe6bd72,roughness:.34,metalness:1,envMapIntensity:.2}),
  tan:a=>std(a,{color:0xe0bd96,roughness:.5,metalness:.35,envMapIntensity:.12}),
  orange:a=>std(a,{color:0xd56a22,roughness:.5}),
  bluegrey:a=>std(a,{color:0x4b4c55,roughness:.5,metalness:.3}),
  glow:a=>std(a,{color:0x1a0c04,roughness:.6}),
 };
 const fin=(asm:AssemblyId,finish:Finish)=>{const key=asm+':'+finish;let mat=cache.get(key);if(!mat){mat=recipes[finish](asm);cache.set(key,mat)}return mat};
 type Mat=Finish|THREE.Material;
 const use=(asm:AssemblyId,mat:Mat)=>typeof mat==='string'?fin(asm,mat):mat;

 // ── Primitive helpers ───────────────────────────────────────────────────
 const block=(parent:THREE.Object3D,p:Part,mat:Mat=p.finish,r=.5,bevel=.3)=>put(parent,p.asm,solid(rr(new THREE.Shape(),p.x,p.z,p.w,p.d,Math.max(r,bevel+.05)),p.y0,p.y1,bevel),use(p.asm,mat));
 const slabAt=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,box:readonly [number,number,number,number],y0:number,y1:number,r=.4,bevel=.25)=>{const q=pxRect(box);return put(parent,asm,solid(rr(new THREE.Shape(),q.x,q.z,q.w,q.d,Math.max(r,bevel+.05)),y0,y1,bevel),use(asm,mat))};
 // Turned metals carry a sheen that sweeps round the axis (textures.ts `spunMap`); anything lathed in these finishes gets it.
 const sheen=m.texture(spunMap());
 const SPUN:Partial<Record<Finish,THREE.MeshStandardMaterialParameters>>={
  steel:{color:0xe6ddd7,roughness:.5,metalness:.9,envMapIntensity:.2},dark:{color:0x6a6460,roughness:.48,metalness:.9,envMapIntensity:.26},
  brass:{color:0xf0b24c,roughness:.42,metalness:.9,envMapIntensity:.24},gold:{color:0xf2c878,roughness:.42,metalness:.9,envMapIntensity:.24},
 };
 const spun=(asm:AssemblyId,mat:Mat)=>{
  if(typeof mat!=='string'||!SPUN[mat])return use(asm,mat);
  const key=asm+':spun:'+mat;let made=cache.get(key);if(!made){made=std(asm,{...SPUN[mat],map:sheen});cache.set(key,made)}return made;
 };
 const cyl=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,r:number,y0:number,y1:number,seg=40)=>{
  const turnedMetal=typeof mat==='string'&&!!SPUN[mat]&&seg>8,b=Math.min(.12,r*.2,(y1-y0)*.4);
  const mesh=put(parent,asm,turnedMetal?lathe([[0,y0],[r,y0],[r,y1-b],[r-b,y1],[0,y1]],seg):new THREE.CylinderGeometry(r,r,y1-y0,seg),spun(asm,mat));mesh.position.set(x,turnedMetal?0:(y0+y1)/2,z);return mesh;
 };
 const turned=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,profile:[number,number][],seg=56)=>{const mesh=put(parent,asm,lathe(profile,seg),spun(asm,mat));mesh.position.set(x,0,z);return mesh};
 const ring=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,rIn:number,rOut:number,y0:number,y1:number,bevel=.3)=>turned(parent,asm,mat,x,z,ringProfile(rIn,rOut,y0,y1,bevel));
 // A flat printed face laid on top of a part.
 const face=(parent:THREE.Object3D,asm:AssemblyId,x:number,z:number,w:number,d:number,y:number,material:THREE.Material,turn=0)=>{
  const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const mesh=quiet(put(parent,asm,g,material,false));mesh.position.set(x,y,z);mesh.rotation.y=turn;return mesh;
 };
 const print=(asm:AssemblyId,map:THREE.Texture,roughness=.6,extra:THREE.MeshStandardMaterialParameters={})=>std(asm,{map:m.texture(map),roughness,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,...extra});
 const top=(parent:THREE.Object3D,p:Part,map:THREE.Texture,inset=.32,roughness=.6)=>face(parent,p.asm,p.x,p.z,p.w-inset*2,p.d-inset*2,p.y1+.012,print(p.asm,map,roughness,{bumpMap:grain,bumpScale:.04,envMapIntensity:p.kind==='chip'||p.finish!=='black'?ROOM:.03}));
 const zcyl=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,y:number,z0:number,z1:number,r:number,seg=32)=>{const g=new THREE.CylinderGeometry(r,r,Math.abs(z1-z0),seg);g.rotateX(Math.PI/2);const mesh=put(parent,asm,g,use(asm,mat));mesh.position.set(x,y,(z0+z1)/2);return mesh};
 const xcyl=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x0:number,x1:number,y:number,z:number,r:number,seg=32)=>{const g=new THREE.CylinderGeometry(r,r,Math.abs(x1-x0),seg);g.rotateZ(Math.PI/2);const mesh=put(parent,asm,g,use(asm,mat));mesh.position.set((x0+x1)/2,y,z);return mesh};
 type Item={x:number;y:number;z:number;ry?:number;sx?:number;sy?:number;sz?:number};
 const dummy=new THREE.Object3D(),unit=new THREE.BoxGeometry(1,1,1);
 const many=(parent:THREE.Object3D,asm:AssemblyId,geometry:THREE.BufferGeometry,mat:Mat,items:Item[],shadow=false)=>{
  if(!items.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,use(asm,mat),items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(0,it.ry??0,0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
  b.adopt(parent,asm,mesh,items.length);mesh.castShadow=shadow;return mesh;
 };
 // Emitters: a lamp material whose strength is set from the pose.
 const lamp=(asm:AssemblyId,color:number,emissive:number)=>std(asm,{color,emissive,emissiveIntensity:.4,roughness:.35});
 const light=(parent:THREE.Object3D,x:number,y:number,z:number,color=0xff7e22)=>{const l=new THREE.PointLight(color,0,0,2);l.position.set(x,y,z);parent.add(l);return l};
 const slot=(parent:THREE.Object3D,asm:AssemblyId,x:number,z:number,y:number,length:number,turn:number,width=.34)=>{const s=quiet(put(parent,asm,new THREE.BoxGeometry(length,.12,width),fin(asm,'matte'),false));s.position.set(x,y,z);s.rotation.y=turn;return s};

 // ── Board ───────────────────────────────────────────────────────────────
 // Only the laminate and its print stay here: copper, mask, silk and holes. Every part, however small, is in the
 // Components assembly above it and lifts away in the exploded view.
 const board=layer('board'),small=layer('components');
 const boardMats:THREE.MeshPhysicalMaterial[]=[];let lampLens!:THREE.MeshStandardMaterial;
 const ledMats=[0,1,2,3].map(()=>({amber:lamp('components',0xd9701f,0xff7a1c),red:lamp('components',0x7a1e10,0xd02a10)}));
 // The three red lamps on the port block and the amber one on the grey connector belong to Ports.
 const portLamps=[0,1,2,3].map(i=>lamp('ports',i<3?0x7a1e10:0xd9701f,i<3?0xd02a10:0xff7a1c));
 {
  const plan=rr(new THREE.Shape(),0,0,CARD.w,CARD.d,CARD.r);
  put(board,'board',solid(plan,CARD.y0,B,.2,16),std('board',{color:0x0c0b0b,roughness:.75}));
  // The print is drawn from vectors at 25 px/mm (print.ts) and laid on as six tiles. Each tile's own map uses the
  // first UV set; roughness, occlusion and the core's spill cover the whole board through the second.
  const maps=boardMaps(),spill=m.texture(spillTexture());m.texture(maps.rough);m.texture(maps.occlusion);
  const hw=CARD.w/2,hd=CARD.d/2;
  for(const tile of maps.tiles){
   const [px0,py0,px1,py1]=tile.box,[ax,az]=mm(px0,py0),[bx,bz]=mm(px1,py1),shape=new THREE.Shape();
   // Anticlockwise in plan (x, −z); a corner that is also the card's corner is rounded.
   ([[ax,-bz,0,-1,1,0,Math.PI],[bx,-bz,1,0,0,1,Math.PI*1.5],[bx,-az,0,1,-1,0,0],[ax,-az,-1,0,0,-1,Math.PI/2]] as const).forEach(([x,y,ix,iy,ox,oy,from],i)=>{
    const round=Math.abs(Math.abs(x)-hw)<1e-6&&Math.abs(Math.abs(y)-hd)<1e-6,r=round?CARD.r:0,sx=x-ix*r,sy=y-iy*r;
    if(i)shape.lineTo(sx,sy);else shape.moveTo(sx,sy);
    if(round)shape.absarc(sx+ox*r,sy+oy*r,r,from,from+Math.PI/2,false);
   });
   shape.closePath();
   const sheet=new THREE.ShapeGeometry(shape,12),pos=sheet.attributes.position,uv=sheet.attributes.uv,uv1=new Float32Array(pos.count*2),g=tile.gutter,tw=px1-px0+g*2,th=py1-py0+g*2;
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i);uv.setXY(i,(x/PX+IMG.w/2-px0+g)/tw,1-(-y/PX+IMG.h/2-py0+g)/th);uv1[i*2]=x/CARD.w+.5;uv1[i*2+1]=y/CARD.d+.5;
   }
   sheet.setAttribute('uv1',new THREE.BufferAttribute(uv1,2));sheet.rotateX(-Math.PI/2);
   const mat=phys('board',{color:new THREE.Color(1.9,1.9,1.9),map:m.texture(tile.map),roughness:1,roughnessMap:maps.rough,specularIntensity:.6,emissive:0xffffff,emissiveMap:spill,emissiveIntensity:.3,aoMap:maps.occlusion,aoMapIntensity:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
   boardMats.push(mat);put(board,'board',sheet,mat,false).position.y=B+.01;
  }

  // ── Components ────────────────────────────────────────────────────────
  // Every small part from pcb.ts as real geometry on its own pads: a body between two metal terminals, a banded
  // capacitor, a lamp with a lit lens, a small chip with its leads, a crystal can. A thousand parts would be a
  // thousand draw calls, so they are merged into one vertex-coloured mesh (plus one for the lit lenses and one for
  // the printed codes).
  const tint=(hex:number,k=1)=>new THREE.Color(hex).multiplyScalar(SMD_GAIN*k);
  const solids:THREE.BufferGeometry[]=[],lenses:THREE.BufferGeometry[]=[];
  const brick=(x0:number,y0:number,x1:number,y1:number,ya:number,yb:number,colour:THREE.Color,bevel=.08,into=solids)=>{
   const [ax,az]=mm(x0,y0),[bx,bz]=mm(x1,y1),w=bx-ax,d=bz-az,g=new THREE.BoxGeometry(w,yb-ya,d).toNonIndexed(),pos=g.attributes.position,bv=Math.min(bevel,Math.min(w,d)*.2);
   for(let i=0;i<pos.count;i++)if(pos.getY(i)>0)pos.setXYZ(i,pos.getX(i)-Math.sign(pos.getX(i))*bv,pos.getY(i),pos.getZ(i)-Math.sign(pos.getZ(i))*bv);
   g.computeVertexNormals();g.translate((ax+bx)/2,(ya+yb)/2,(az+bz)/2);
   const c=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){c[i*3]=colour.r;c[i*3+1]=colour.g;c[i*3+2]=colour.b}
   g.setAttribute('color',new THREE.BufferAttribute(c,3));g.deleteAttribute('uv');into.push(g);
  };
  const tin=tint(0xcfc8be,.95),codes:{text:string;dark:boolean}[]=[],codeIndex=new Map<string,number>(),decals:number[]=[],decalUv:number[]=[],decalAt:[number,number,number,number,number,number,0|1][]=[];
  const vary=(seed:number)=>.92+.16*((Math.sin(seed*12.9898)*43758.5453)%1+1)%1;
  for(const q of comps){
   if(q.kind==='land')continue;
   const [x0,y0,x1,y1]=q.box,a=q.axis,t=q.term,top=B+q.h,k=vary(q.seed);
   // A box given along/across the part's own axis.
   const along=(u0:number,u1:number,v0:number,v1:number,ya:number,yb:number,colour:THREE.Color,bevel?:number,into?:THREE.BufferGeometry[])=>a?brick(v0,u0,v1,u1,ya,yb,colour,bevel,into):brick(u0,v0,u1,v1,ya,yb,colour,bevel,into);
   const lo=q.box[a],hi=q.box[2+a],c0=q.box[1-a],c1=q.box[3-a];
   let dark=false,room=hi-lo-t*2;
   if(q.kind==='ic'){
    along(lo,hi,c0,c1,B+.12,top,tint(0x262322,k),.1);
    const pitch=(c1-c0)/q.pins;for(let i=0;i<q.pins;i++)for(const e of [-1,1]){const v=c0+(i+.5)*pitch;along(e<0?lo-6.5:hi-.5,e<0?lo+.5:hi+6.5,v-1,v+1,B,B+.3,tin,.03)}
    room=hi-lo-2;
   }else if(q.kind==='tant'){
    along(lo+.6,hi-.6,c0,c1,B+.06,top,tint(q.tone?0xcfa058:0xc4a684,k),.12);
    along(lo+.6,lo+.6+(hi-lo)*.2,c0+.4,c1-.4,top,top+.03,tint(0x6e4c26,k),.01);
    for(const e of [-1,1])along(e<0?lo:hi-t,e<0?lo+t:hi,c0+.6,c1-.6,B,B+q.h*.55,tin,.04);
    dark=true;room=(hi-lo)*.7;
   }else if(q.kind==='can'){
    along(lo,hi,c0,c1,B,top,tint(0xc9c4be,k),.22);dark=true;room=hi-lo-2;
   }else if(q.kind==='led'){
    along(lo,hi,c0,c1,B,top-.12,tint(0xe6dfd3,.8),.05);
    for(const e of [-1,1])along(e<0?lo:hi-t*.7,e<0?lo+t*.7:hi,c0,c1,B,top-.2,tin,.03);
    along(lo+t*.6,hi-t*.6,c0+.4,c1-.4,top-.14,top,new THREE.Color(1,1,1),.1,lenses);
   }else{
    const body=q.kind==='res'?tint(0x1e1c1b,k):q.kind==='capw'?tint(0xb4aea7,k):tint(q.tone?0xc49b58:0xb89878,k);
    along(lo+t-.3,hi-t+.3,c0+.25,c1-.25,B+.02,top-.02,body,.05);
    for(const e of [-1,1])along(e<0?lo:hi-t,e<0?lo+t:hi,c0,c1,B,top,tin,.07);
   }
   // Printed code: laid along the body where it is big enough to read.
   if(q.code){
    const wide=Math.min(room*.92,(c1-c0)*.82*2.5),high=wide/2.5;
    if(high>=2.4){const key=q.code+(dark?'d':'l');let i=codeIndex.get(key);if(i===undefined){i=codes.length;codes.push({text:q.code,dark});codeIndex.set(key,i)}
     const [cx,cz]=mm((x0+x1)/2+(q.kind==='tant'?(a?0:(hi-lo)*.08):0),(y0+y1)/2+(q.kind==='tant'?(a?(hi-lo)*.08:0):0));decalAt.push([cx,cz,wide*PX/2,high*PX/2,top+(q.kind==='tant'?.035:.006),i,a])}
   }
  }
  const smallMat=std('components',{color:0xffffff,vertexColors:true,roughness:.5,metalness:.12});
  if(solids.length){const mesh=new THREE.Mesh(mergeGeometries(solids,false),smallMat);b.adopt(small,'components',mesh,comps.length);mesh.castShadow=false;for(const g of solids)g.dispose()}
  const lensMat=std('components',{color:0xd9701f,emissive:0xff7a1c,emissiveIntensity:.6,roughness:.4});
  if(lenses.length){const mesh=new THREE.Mesh(mergeGeometries(lenses,false),lensMat);b.adopt(small,'components',mesh,0);mesh.castShadow=false}
  if(decalAt.length){
   const atlas=codeAtlas(codes);
   for(const [cx,cz,hw2,hh,y,i,a] of decalAt){
    const [u0,v0,u1,v1]=atlas.uv(i);
    // Corners: text runs along x for a part lying across, and up the part (reading from the right) for one standing.
    const c:[number,number][]=a?[[cx+hh,cz+hw2],[cx+hh,cz-hw2],[cx-hh,cz-hw2],[cx-hh,cz+hw2]]:[[cx-hw2,cz+hh],[cx+hw2,cz+hh],[cx+hw2,cz-hh],[cx-hw2,cz-hh]],uvs=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(const j of [0,1,2,0,2,3]){decals.push(c[j][0],y,c[j][1]);decalUv.push(uvs[j][0],uvs[j][1])}
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(decals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(decalUv,2));g.computeVertexNormals();
   const mesh=new THREE.Mesh(g,std('components',{map:m.texture(atlas.texture),transparent:true,depthWrite:false,roughness:.7,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));b.adopt(small,'components',mesh,0);mesh.castShadow=false;
  }
  for(const p of of('tancap')){block(small,p,p.finish,.25,.2);if(p.d>3.5)face(small,'components',p.x,p.z-p.d*.2,p.w*.7,.25,p.y1+.01,fin('components','matte'))}
  for(const p of of('choke')){zcyl(small,'components','brass',p.x,B+p.w/2,p.z-p.d/2+.3,p.z+p.d/2-.3,p.w/2,28);for(const e of [-1,1])zcyl(small,'components','matte',p.x,B+p.w/2,p.z+e*(p.d/2-.3),p.z+e*p.d/2,p.w/2*.9,24)}
  const ribs=at('ribs');put(small,'components',new THREE.BoxGeometry(ribs.w,1,ribs.d),fin('components','black')).position.set(ribs.x,B+.5,ribs.z);
  many(small,'components',unit,'black',Array.from({length:36},(_,i)=>({x:ribs.x,y:B+2,z:ribs.z-ribs.d/2+.6+i*(ribs.d-1.2)/35,sx:ribs.w,sy:2,sz:.45})),true);
  LEDS.forEach((l,i)=>{if(i<3)return;const p=at(`led-${i}`);quiet(block(small,p,ledMats[l.group][l.red?'red':'amber'],.15,.15))});
  lampLens=lensMat;
 }

 // ── Processor and bracket ───────────────────────────────────────────────
 {
  const base=layer('cpu'),clamp=layer('cpu',[0,36,0]);
  block(base,at('socket'),'black',1.5,.3);
  const pkg=at('package');
  put(base,'cpu',solid((()=>{const c=4,x=pkg.w/2,z=pkg.d/2,s=new THREE.Shape();s.moveTo(pkg.x-x+c,-pkg.z-z);s.lineTo(pkg.x+x-c,-pkg.z-z);s.lineTo(pkg.x+x,-pkg.z-z+c);s.lineTo(pkg.x+x,-pkg.z+z-c);s.lineTo(pkg.x+x-c,-pkg.z+z);s.lineTo(pkg.x-x+c,-pkg.z+z);s.lineTo(pkg.x-x,-pkg.z+z-c);s.lineTo(pkg.x-x,-pkg.z-z+c);s.closePath();return s})(),pkg.y0,pkg.y1,.2),std('cpu',{color:0x4a4541,roughness:.85}));
  const weave=m.texture(weaveTexture());weave.repeat.set(pkg.w/1.1,pkg.d/1.1);
  face(base,'cpu',pkg.x,pkg.z,pkg.w-3,pkg.d-3,pkg.y1+.012,print('cpu',weave,.8,{color:new THREE.Color(2.1,2.1,2.1),envMapIntensity:.05}));
  const ihs=at('ihs');block(base,ihs,std('cpu',{color:0x8a837f,roughness:.6,metalness:.2,envMapIntensity:.12}),3.2,.6);
  face(base,'cpu',ihs.x,ihs.z,ihs.w-1.8,ihs.d-1.8,ihs.y1+.012,print('cpu',spreaderTexture(ihs),.55,{metalness:.25,envMapIntensity:.12}));
  // Load plate: a steel frame gripping the package, with hinge tabs and four corner rivets.
  const lp=at('loadplate'),lo=pxRect(lp.open!),frame=rr(new THREE.Shape(),lp.x,lp.z,lp.w,lp.d,3.4);frame.holes.push(rr(new THREE.Path(),lo.x,lo.z,lo.w,lo.d,2.6));
  const plateSteel=std('cpu',{color:0x403b38,roughness:.4,metalness:.85,envMapIntensity:.42});
  // A deep bevel all round, so the frame's chamfers read as soft bright edges under diffuse light.
  put(base,'cpu',solid(frame,lp.y0,lp.y1,.7),plateSteel);
  // The two release levers at the frame's upper corners, and the small tab above the package.
  for(const [px,py,turn] of [[330,642,-.95],[842,640,.95]]){const [x,z]=mm(px,py),lever=put(base,'cpu',solid(rr(new THREE.Shape(),0,0,6.4,1.8,.6),lp.y1-.5,lp.y1+.5,.3),fin('cpu','dark'));lever.position.set(x,0,z);lever.rotation.y=turn}
  slabAt(base,'cpu',plateSteel,[388,527,414,545],lp.y1-.1,lp.y1+.5,.7,.25);
  slabAt(base,'cpu',plateSteel,[350,560,372,640],lp.y0,lp.y1+.35,.3,.15);slabAt(base,'cpu',plateSteel,[800,600,824,680],lp.y0,lp.y1+.35,.3,.15);
  for(const [x,y] of [[357,512],[815,512],[357,1052],[815,1052]]){const [sx,sz]=mm(x,y);cyl(base,'cpu','dark',sx,sz,.7,lp.y1,lp.y1+.25,16)}

  // Bracket: one pressed plate with its two ears and a chamfered opening. Its shading, pressed steps and wear are
  // painted (textures.ts `bracketTexture`) and laid on from above; the finish is satin, so nothing mirrors back.
  const studs=of('stud').filter(p=>p.asm==='cpu');
  const paint=m.texture(bracketTexture(BRACKET.paint,BRACKET.plate,BRACKET.hole,SCREWS,studs.map(p=>[(p.box[0]+p.box[2])/2,(p.box[1]+p.box[3])/2])));
  const plateMat=phys('cpu',{color:0xdcdcdc,map:paint,roughness:.62,metalness:.35,roughnessMap:brushed.rough,bumpMap:brushed.bump,bumpScale:.012,envMapIntensity:.2});
  const recess=std('cpu',{color:0x3a3532,roughness:.5,metalness:.7,envMapIntensity:.2});
  const plate=roundPoly(new THREE.Shape(),BRACKET.plate,3);plate.holes.push(roundPoly(new THREE.Path(),BRACKET.hole,1.6));
  put(clamp,'cpu',planar(solid(plate,BRACKET.y0,BRACKET.y1,.7,10),BRACKET.paint),plateMat);
  // The turned-down lip round the opening: a darker step inside the bright edge.
  const grown=(by:number)=>{const cx=BRACKET.hole.reduce((n,q)=>n+q[0],0)/8,cy=BRACKET.hole.reduce((n,q)=>n+q[1],0)/8;return BRACKET.hole.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy);return [x+(x-cx)/d*by,y+(y-cy)/d*by] as P2})};
  const lip=roundPoly(new THREE.Shape(),grown(2),1.8);lip.holes.push(roundPoly(new THREE.Path(),grown(-16),1.2));
  put(clamp,'cpu',solid(lip,BRACKET.y0-1.2,BRACKET.y0+.6,.35,10),recess);
  const y1=BRACKET.y1;
  // Four different fasteners, as in the reference: a slotted steel head in a yellow collar, a wing nut on an orange
  // collar, a square nut in a brass cup, and a socket screw in a brass cup.
  const collar=(x:number,z:number,color:number)=>{cyl(clamp,'cpu','white',x,z,4.5,y1-.1,y1+.25,36);turned(clamp,'cpu',std('cpu',{color,roughness:.45,metalness:.5,envMapIntensity:.2,map:sheen}),x,z,ringProfile(2.9,4.05,y1,y1+.95,.3))};
  const cup=(x:number,z:number)=>turned(clamp,'cpu','brass',x,z,[[0,y1-.1],[4.5,y1-.1],[4.5,y1+.7],[4.1,y1+1],[3.5,y1+1],[3.1,y1+.45],[0,y1+.45]]);
  SCREWS.forEach(([sx,sy],i)=>{
   const [x,z]=mm(sx,sy);
   cyl(clamp,'cpu','brass',x,z,2.6,B,BRACKET.y0,20);
   if(i===0){collar(x,z,0xf0b020);turned(clamp,'cpu','steel',x,z,[[0,y1],[2.9,y1],[2.9,y1+1.5],[2.5,y1+1.9],[0,y1+1.9]],40);slot(clamp,'cpu',x,z,y1+1.9,3,.12,.62)}
   else if(i===1){collar(x,z,0xe88a24);turned(clamp,'cpu','steel',x,z,[[0,y1],[2.7,y1],[2.7,y1+1],[2.3,y1+1.3],[1.5,y1+1.3],[1.3,y1+2.4],[0,y1+2.5]],40);
    for(const a of [.1,.1+Math.PI/2]){const wing=put(clamp,'cpu',new THREE.BoxGeometry(6.6,1.3,.8),fin('cpu','steel'));wing.position.set(x,y1+1.7,z);wing.rotation.y=a}
    cyl(clamp,'cpu','matte',x,z,.55,y1+2.4,y1+2.56,14)}
   else if(i===2){cup(x,z);const nut=put(clamp,'cpu',solid(rr(new THREE.Shape(),0,0,3.5,3.5,.5),y1+.4,y1+1.5,.2),fin('cpu','steel'));nut.position.set(x,0,z);nut.rotation.y=.55;slot(clamp,'cpu',x,z,y1+1.5,2.4,.55,.5)}
   else{cup(x,z);turned(clamp,'cpu','steel',x,z,[[.95,y1+.4],[2.3,y1+.4],[2.3,y1+1.2],[2,y1+1.5],[1.2,y1+1.5],[.95,y1+1.2]],36);cyl(clamp,'cpu','matte',x,z,.95,y1+.4,y1+.9,6);cyl(clamp,'cpu','matte',x+2.6,z+2.3,.4,y1+.95,y1+1.04,10)}
  });
  studs.forEach((p,i)=>{ring(clamp,'cpu',i===3?'brass':'dark',p.x,p.z,.6,p.r!,p.y0-.05,p.y0+.5,.2);cyl(clamp,'cpu','matte',p.x,p.z,.6,p.y0,p.y0+.35,16)});
 }

 // ── Core ────────────────────────────────────────────────────────────────
 const chase=makeChase();m.texture(chase.texture);
 const win=at('window'),die=at('die');
 const windowMat=std('core',{color:0x0c0603,roughness:.7,emissive:0xffffff,emissiveMap:m.texture(coreTexture()),emissiveIntensity:1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const chaseMat=m.own('core',new THREE.MeshBasicMaterial({map:chase.texture,color:new THREE.Color(2.6,2.2,1.6),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));
 const dieMat=std('core',{color:0x000000,emissive:0xffffff,emissiveMap:m.texture(dieTexture()),emissiveIntensity:1.4,roughness:1});
 let coreLight:THREE.PointLight,shroudMat!:THREE.MeshStandardMaterial;
 {
  const base=layer('core'),shroud=layer('core',[0,38,0]);
  block(base,at('core-socket'),'black',1.6,.2);
  face(base,'core',win.x,win.z,win.w,win.d,win.y1,windowMat);face(base,'core',win.x,win.z,win.w,win.d,win.y1+.04,chaseMat);
  block(base,die,std('core',{color:0x000000,emissive:0xffb040,emissiveIntensity:1.2,roughness:1}),.4,.25);
  face(base,'core',die.x,die.z,die.w-.3,die.d-.3,die.y1+.012,dieMat);
  // The spill comes from a real light just above the die, so it lands on the rim and the shoulders, not on the air.
  coreLight=light(base,die.x,B+24,die.z,0xff7a1c);

  // The casting's forms, traced from the reference: the top plate with its swept left shoulder and its right arm,
  // a rounded cap and a flat plate on each wing, and the bottom plate.
  const R4=(x0:number,y0:number,x1:number,y1:number)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const ARM=[[404,1506],[436,1506],[436,1594],[414,1594],[374,1630],[366,1652],[326,1652],[326,1622],[338,1578]],ARM_R=[[768,1452],[838,1452],[846,1468],[846,1646],[812,1646],[800,1630],[768,1630]];
  const CAP_L=[[214,1708],[340,1708],[340,1779],[204,1779],[204,1722]],CAP_R=[[856,1709],[980,1709],[990,1722],[990,1773],[856,1773]];
  const PL_TOP=R4(406,1504,770,1636),PL_L=R4(188,1781,344,2108),PL_R=R4(866,1778,984,2046),PL_BOT=R4(418,2190,779,2304);
  // One painted finish for every cast piece (textures.ts `shroudMaps`), with the die's spill as its emissive map.
  // Flake patches and stains sit where the reference has them.
  const pale='rgba(172,163,153,.6)',stain='rgba(48,44,41,.62)',haze='rgba(186,176,166,.26)';
  const regions:ShroudRegion[]=[
   {pts:ARM,tone:'#3e3a37',flakes:[[380,1600,30,10,5,pale]]},
   {pts:PL_TOP,tone:'#847b74',scuffs:1.6,clouds:[[520,1556,90,1.7,-.1,haze,120]],flakes:[[520,1556,120,150,13,pale],[452,1532,46,40,9,pale],[676,1584,90,170,12,stain],[600,1614,70,70,9,stain],[738,1528,40,34,8,stain],[640,1540,60,30,7,pale]]},
   {pts:CAP_L,tone:'#48433f',flakes:[[270,1748,40,14,6,pale]]},{pts:CAP_R,tone:'#47423e',flakes:[[930,1746,40,14,6,pale]]},
   {pts:PL_L,tone:'#786e66',scuffs:1.5,clouds:[[262,1850,50,1.4,1.2,haze,70]],flakes:[[262,1850,70,70,10,pale],[300,2040,50,44,8,pale],[236,1980,60,70,10,stain],[306,1900,30,24,7,stain]]},
   {pts:PL_R,tone:'#70675f',scuffs:1.2,flakes:[[938,1822,58,170,11,pale],[948,1906,58,190,11,pale],[906,1966,48,120,9,pale],[932,2020,40,50,8,pale],[892,1864,40,50,9,stain],[960,1960,30,30,7,stain]]},
   {pts:PL_BOT,tone:'#151312',pale:.3,scuffs:.5},
  ];
  const sm=shroudMaps(regions,at('rim').open!);
  const scale=pittedMaps(17);m.texture(scale.map);m.texture(scale.rough);m.texture(scale.bump);
  const sw=(SHROUD_BOX[2]-SHROUD_BOX[0])*PX,sd=(SHROUD_BOX[3]-SHROUD_BOX[1])*PX;scale.bump.repeat.set(sw/40,sd/40);scale.rough.repeat.set(sw/40,sd/40);
  shroudMat=std('core',{color:0x969696,map:m.texture(sm.map),roughness:1,roughnessMap:scale.rough,metalness:.3,bumpMap:scale.bump,bumpScale:.3,envMapIntensity:.3,emissive:0xffffff,emissiveMap:m.texture(sm.glow),emissiveIntensity:.6});
  const cast=shroudMat,dark=shroudMat,blk=fin('core','black');
  const bolt=(px:number,py:number,y:number,r=.75)=>{const [x,z]=mm(px,py);ring(shroud,'core','dark',x,z,r*.45,r,y-.05,y+.28,.1);cyl(shroud,'core','matte',x,z,r*.45,y,y+.12,12)};
  // Rim: a low dark frame carrying a tubular bead all the way round the opening.
  const rim=at('rim'),ro=pxRect(rim.open!),rimShape=rr(new THREE.Shape(),rim.x,rim.z,rim.w,rim.d,4.6);rimShape.holes.push(rr(new THREE.Path(),ro.x,ro.z,ro.w,ro.d,3));
  const rimMat=shroudMat;
  put(shroud,'core',solid(rimShape,rim.y0,B+4.4,.6,12),dark);
  const bead:THREE.Vector3[]=[],bw=ro.w/2+1.75,bd=ro.d/2+1.2,br=4;
  ([[1,-1,-90],[1,1,0],[-1,1,90],[-1,-1,180]] as const).forEach(([sx,sz,from])=>{for(let i=0;i<=6;i++){const a=(from+i/6*90)*Math.PI/180;bead.push(new THREE.Vector3(ro.x+sx*(bw-br)+Math.cos(a)*br,B+4.6,ro.z+sz*(bd-br)+Math.sin(a)*br))}});
  put(shroud,'core',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bead,true,'centripetal'),260,1.7,16,true),rimMat);
  // One low body ties the bar, the rim and both wings into a single casting, so no board shows between them.
  {const body=roundPoly(new THREE.Shape(),[[398,1540],[430,1506],[770,1506],[770,1624],[860,1640],[860,1712],[988,1712],[988,2052],[860,2062],[860,2198],[778,2202],[778,2305],[417,2305],[417,2202],[332,2198],[332,2090],[200,2090],[200,1712],[332,1712],[332,1640],[352,1598]],1.6),w=pxRect(at('rim').open!);
   body.holes.push(rr(new THREE.Path(),w.x,w.z,w.w,w.d,3));put(shroud,'core',solid(body,B,B+4,.7),dark)}
  const piece=(pts:number[][],y0:number,y1:number,r=1.6,bevel=1)=>put(shroud,'core',solid(roundPoly(new THREE.Shape(),pts,r),y0,y1,bevel,10,5),shroudMat);
  // Top plate, with the shoulder that sweeps down from its left end into the rim and the arm at its right.
  const bar=at('top-bar');
  piece(ARM,B,B+6.4,2.6,2);put(shroud,'core',solid(roundPoly(new THREE.Shape(),ARM_R,1.8),B,B+6.2,1.1),blk);piece(PL_TOP,B+3.6,bar.y1+1,2.6,2.2);
  for(const [x,y] of [[432,1528],[744,1528],[432,1612],[744,1612]])bolt(x,y,bar.y1+1,.7);
  bolt(352,1634,B+6.4,.8);for(const [x,y] of [[806,1480],[806,1540],[828,1616]])bolt(x,y,B+6.2,.7);
  // Wings: a rounded cap at the shoulder, a flat pitted plate below it, and a ridge where the wing meets the rim.
  const wl=at('wing-l'),wr=at('wing-r');
  piece(CAP_L,B+3,wl.y1+1.2,3.4,2.6);piece(CAP_R,B+3,wr.y1+1.2,3.4,2.6);piece(PL_L,B+3,wl.y1,2,1.8);piece(PL_R,B+3,wr.y1,2,1.8);
  piece(R4(338,1790,356,2082),B+3,wl.y1+.3,.8,.6);piece(R4(850,1786,866,2040),B+3,wr.y1+.3,.8,.6);
  bolt(232,1826,wl.y1,.9);bolt(244,2052,wl.y1,1);bolt(924,1996,wr.y1,1);bolt(920,1740,wr.y1+1.2,.8);bolt(300,1742,wl.y1+1.2,.8);
  // The angled black bracket under the right wing, its raised face, and the arm that runs down to the corner clamp.
  put(shroud,'core',solid(roundPoly(new THREE.Shape(),[[848,2052],[990,2052],[990,2098],[962,2148],[902,2148],[872,2114],[848,2114]],1.2),B,B+5.8,.9),blk);
  put(shroud,'core',solid(roundPoly(new THREE.Shape(),[[874,2064],[976,2064],[976,2092],[954,2132],[912,2132],[890,2104],[874,2104]],1),B+5.6,B+6.4,.35),blk);
  put(shroud,'core',solid(roundPoly(new THREE.Shape(),[[836,2112],[872,2116],[880,2152],[850,2206],[836,2206]],1),B,B+4.6,.7),blk);
  slot(shroud,'core',mm(900,2098)[0],mm(900,2098)[1],B+6.4,3.6,-.9,.5);
  // Side clips: a black comb along each wing's outer edge carrying a row of separate pale pins, each with a rounded tip.
  for(const p of of('fins')){
   const left=p.id==='fins-l',n=17,pitch=(p.d-1)/(n-1);
   put(shroud,'core',new THREE.BoxGeometry(p.w+.8,2.2,p.d+.6),blk).position.set(p.x+(left?.5:-.5),B+1.1,p.z);
   many(shroud,'core',unit,std('core',{color:0xb4aaa0,roughness:.5,metalness:.6,envMapIntensity:.2}),Array.from({length:n},(_,i)=>({x:p.x+(left?-.1:.1),y:B+2.4,z:p.z-p.d/2+.5+i*pitch,sx:p.w+.2,sy:.6,sz:pitch*.42})),true);
  }
  // Bottom plate: its socket and fixing holes are painted; the right two thirds stand a step higher. A black clamp at each end.
  const low=at('bottom-bar');piece(PL_BOT,B,low.y1,2.4,1.4);
  piece([[592,2196],[775,2196],[775,2300],[570,2300],[570,2224]],low.y1-.8,low.y1+.45,1.4,.5);
  for(const p of of('clamp').filter(p=>p.id!=='clamp-tr')){block(shroud,p,blk,1.2,.6);const z=p.z+.6;ring(shroud,'core','steel',p.x,z,.8,2.1,p.y1,p.y1+.6,.25);ring(shroud,'core','dark',p.x,z,.4,.9,p.y1,p.y1+.45,.1);cyl(shroud,'core','matte',p.x,z,.4,p.y1,p.y1+.2,16)}
  // Lay the painted finish on every cast piece from above.
  for(const o of shroud.children){const mesh=o as THREE.Mesh;if(mesh.isMesh&&mesh.material===shroudMat)planar(mesh.geometry,SHROUD_BOX,mesh.position.x,mesh.position.z)}
  // The black lead that loops out from under the left wing.
  b.wire(shroud,'core',blk,([[196,2046,.6],[240,2062,.7],[300,2052,.9],[336,2030,1.4]] as const).map(([px,py,h])=>[mm(px,py)[0],B+h,mm(px,py)[1]] as V3),.45);
 }

 // ── Heat pipes ──────────────────────────────────────────────────────────
 const pulse=m.texture(pulseTexture());pulse.repeat.set(2/3,1);
 // Satin nickel: the long soft highlight and darker flanks are painted (textures.ts `tubeMap`), so nothing mirrors back.
 const nickel=m.texture(tubeMap());
 const tube={color:0xffffff,map:nickel,roughness:.6,metalness:.4,envMapIntensity:.2};
 const pipeMat=std('pipes',{...tube,emissive:0xffa040,emissiveMap:pulse,emissiveIntensity:0}),barMat=std('pipes',tube);
 {
  const pipes=layer('pipes');
  for(const path of [PIPE.left,PIPE.right]){
   const curve=new THREE.CatmullRomCurve3(path.map(([px,py])=>{const [x,z]=mm(px,py);return new THREE.Vector3(x,PIPE.y,z)}),false,'centripetal');
   put(pipes,'pipes',across(new THREE.TubeGeometry(curve,220,PIPE.r,28,false),3),pipeMat);
   // Flattened neck where the tube is pressed into its banjo end.
   const [nx,nz]=mm(path[0][0],path[0][1]+40),neck=zcyl(pipes,'pipes',barMat,nx,PIPE.y-.3,nz-4.6,nz+4.6,PIPE.r,28);across(neck.geometry);neck.scale.set(1.22,.72,1);
  }
  // The right pipe is pressed flat and crimped where it enters the black block.
  {const [cx,z0]=mm(1220,1262),z1=mm(1220,1320)[1],flat=zcyl(pipes,'pipes',barMat,cx,PIPE.y-.5,z0,z1,PIPE.r,28);across(flat.geometry);flat.scale.set(1.32,.6,1);
   for(const py of [1272,1288,1304]){const z=mm(1220,py)[1],rib=zcyl(pipes,'pipes','dark',cx,PIPE.y-.5,z-.22,z+.22,PIPE.r+.12,24);rib.scale.set(1.32,.6,1)}}
  PIPE.collars.forEach(([px,py])=>{const [x,z]=mm(px,py);across(zcyl(pipes,'pipes',barMat,x,PIPE.y,z-1.3,z+1.3,PIPE.r+.35).geometry);for(const e of [-1,1])zcyl(pipes,'pipes','dark',x,PIPE.y,z+e*1.3-.12,z+e*1.3+.12,PIPE.r+.12)});
  // Banjo ends: a broad ring with a dark well and a coloured cap.
  const l=at('pipe-end-l'),r=at('pipe-end-r');
  turned(pipes,'pipes','white',l.x,l.z,[[0,B],[l.r!,B],[l.r!,l.y1-.8],[l.r!-.8,l.y1],[3.1,l.y1],[3.1,l.y1-1.2],[0,l.y1-1.2]]);
  cyl(pipes,'pipes','black',l.x,l.z,3.05,l.y1-1.3,l.y1-1.1,36);cyl(pipes,'pipes',std('pipes',{color:0xe2ae2c,roughness:.4,metalness:.3}),l.x,l.z,1.9,l.y1-1.2,l.y1-.7,32);
  turned(pipes,'pipes','steel',r.x,r.z,[[0,B],[r.r!,B],[r.r!,r.y1-.9],[r.r!-.9,r.y1],[3.1,r.y1],[3.1,r.y1-1.2],[0,r.y1-1.2]]);
  cyl(pipes,'pipes','black',r.x,r.z,3.05,r.y1-1.3,r.y1-1.1,36);ring(pipes,'pipes','dark',r.x,r.z,4.2,4.35,r.y1-.02,r.y1+.03,.01);ring(pipes,'pipes','dark',l.x,l.z,4.1,4.25,l.y1-.02,l.y1+.03,.01);
  const tabPad=put(pipes,'pipes',new THREE.BoxGeometry(2.4,.5,1.8),std('pipes',{color:0xe08a2a,roughness:.45}));tabPad.position.set(r.x-.2,r.y1-.9,r.z+.1);tabPad.rotation.y=.5;
  // Saddle straps hold each pipe to the board.
  for(const p of of('strap')){
   put(pipes,'pipes',solid(rr(new THREE.Shape(),p.x,p.z,p.w,p.d,.8),B,B+1,.25),fin('pipes','steel'));
   const arch=put(pipes,'pipes',new THREE.CylinderGeometry(PIPE.r+.55,PIPE.r+.55,p.d,28,1,false,-Math.PI/2,Math.PI),fin('pipes','steel'));arch.rotation.x=Math.PI/2;arch.position.set(p.x,PIPE.y,p.z);
   for(const e of [-1,1]){cyl(pipes,'pipes','dark',p.x+e*(p.w/2-.9),p.z,.6,B+1,B+1.4,14)}
  }
  // Hinge bar under the bracket: one turned rod. A thin neck with a black O-ring at the left, a shoulder, the long
  // body between two waists, and a thinner end at the right; clamped in a block at each end.
  {const z=mm(0,BAR.y)[1],X=(px:number)=>mm(px,0)[0],x0=X(BAR.x0);
   const prof:[number,number][]=([[307,0],[307,2],[392,2],[404,3],[452,3.1],[458,2.75],[468,2.75],[476,3.3],[756,3.3],[764,2.7],[774,2.7],[782,3.15],[818,3.15],[826,2.2],[865,2.2],[865,0]] as const).map(([px,r])=>[r,X(px)-x0]);
   const g=lathe(prof,36);g.rotateZ(-Math.PI/2);g.computeVertexNormals();across(g);
   put(pipes,'pipes',g,barMat).position.set(x0,BAR.h,z);
   const ringAt=(px:number,r:number,len:number)=>xcyl(pipes,'pipes','black',X(px)-len/2,X(px)+len/2,BAR.h,z,r,24);
   ringAt(346,2.3,.5);ringAt(832,2.4,.3);}
  // End blocks: a rounded steel block with a broad round boss and a dark bore.
  for(const p of of('clampblock')){block(pipes,p,'steel',1.8,.9);ring(pipes,'pipes','steel',p.x,p.z,1.1,3.1,p.y1-.1,p.y1+.9,.4);ring(pipes,'pipes','dark',p.x,p.z,.9,1.4,p.y1-.1,p.y1+.5,.15);cyl(pipes,'pipes','matte',p.x,p.z,.9,p.y1,p.y1+.2,20)}
  // Manifold: the black block the right pipe runs into. A cap band across the top, straight shoulders, then both
  // sides cut in to a narrow tip. Its facets, mark and boss are painted (textures.ts `manifoldTexture`).
  const man=at('manifold'),manMat=std('pipes',{color:0xffffff,map:m.texture(manifoldTexture(man.box,MANIFOLD)),roughness:.8,envMapIntensity:.03});
  const grown=(by:number)=>{const cx=MANIFOLD.reduce((n,q)=>n+q[0],0)/MANIFOLD.length,cy=MANIFOLD.reduce((n,q)=>n+q[1],0)/MANIFOLD.length;return MANIFOLD.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy);return [x+(x-cx)/d*by,y+(y-cy)/d*by] as P2})};
  put(pipes,'pipes',planar(solid(roundPoly(new THREE.Shape(),MANIFOLD,1),man.y0,man.y1,.9),man.box),manMat);
  planar(slabAt(pipes,'pipes',manMat,[1157,1316,1338,1348],man.y0,man.y1+.7,.6,.4).geometry,man.box);
  put(pipes,'pipes',planar(solid(roundPoly(new THREE.Shape(),grown(-13),.8),man.y1-.3,man.y1+.5,.45),man.box),manMat);
  for(const [x,y] of [[1208,1390],[1272,1390]]){const [sx,sz]=mm(x,y);ring(pipes,'pipes','dark',sx,sz,.35,.8,man.y1+.5,man.y1+.72,.1)}
  // The orange plate that shows under the block's right-hand cut.
  put(pipes,'pipes',solid(polygon([[1337,1436],[1337,1540],[1286,1540],[1282,1532]]),B,B+2.6,.2),std('pipes',{color:0xb8581a,roughness:.5}));
 }

 // ── Fittings ────────────────────────────────────────────────────────────
 // Lit fittings carry a broad painted amber lens; nothing here is a lamp, so nothing can flare on a passing part.
 const lensMaps=[lensTexture(0,3),null,lensTexture(2,5),lensTexture(1,9)];
 const fitMats=[0,1,2,3].map(i=>i===1?lamp('fittings',0x2a1404,0xffa436):std('fittings',{color:0x000000,emissive:0xffffff,emissiveMap:m.texture(lensMaps[i]!),emissiveIntensity:1,roughness:.5}));
 const dotMats=DOTS.map(()=>lamp('fittings',0x9a5210,0xffa030));
 const fanMat=lamp('fittings',0xfff0dc,0xffd9a8);
 const hot=lamp('fittings',0x000000,0xffe2b0);
 {
  const fit=layer('fittings');
  const hex=(x:number,z:number,r:number,y1:number)=>{const mesh=cyl(fit,'fittings','black',x,z,r,B,y1,6);mesh.rotation.y=.3;return mesh};
  const tooth=new THREE.BoxGeometry(.5,1,.34);
  // Knurling: a ring of small teeth round a housing.
  const knurl=(x:number,z:number,r:number,y0:number,y1:number,n:number,mat:Mat='black')=>many(fit,'fittings',tooth,mat,Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return {x:x+Math.cos(a)*r,y:(y0+y1)/2,z:z+Math.sin(a)*r,ry:-a,sy:y1-y0}}),true);
  // A fine engraved line on a flat face.
  const groove=(x:number,z:number,r:number,y:number,w=.12)=>quiet(ring(fit,'fittings','matte',x,z,r,r+w,y-.02,y+.02,.005));
  // A lit fitting, built in depth: two stepped steel bezel rings, a dished reflector that falls in machined steps to
  // the middle (it carries the painted glow as its emissive map), and a domed amber lens over it. The lens is an
  // ordinary transparent material, so the reflector shows through it; nothing here is a lamp.
  const amber=phys('fittings',{color:0xff9c30,roughness:.32,transparent:true,opacity:.1,depthWrite:false,envMapIntensity:.1,specularIntensity:.4,emissive:0xff7a14,emissiveIntensity:.2});
  const lens=(p:Part,k:number,rim:number,top:number)=>{
   ring(fit,'fittings','steel',p.x,p.z,rim+.7,rim+1.8,B+2,top-1,.35);ring(fit,'fittings','steel',p.x,p.z,rim-.1,rim+.8,B+2,top,.3);
   const f=top-2.5,dish=lathe([[rim,top-.3],[rim-.3,top-.9],[rim*.74,top-1.1],[rim*.72,top-1.45],[rim*.5,top-1.65],[rim*.48,top-2],[rim*.26,top-2.15],[rim*.24,f],[0,f]],56),pos=dish.attributes.position,uv=dish.attributes.uv;
   for(let i=0;i<pos.count;i++)uv.setXY(i,.5+pos.getX(i)/(2*rim),.5-pos.getZ(i)/(2*rim));
   quiet(put(fit,'fittings',dish,fitMats[k],false)).position.set(p.x,0,p.z);
   const dome=lathe(Array.from({length:10},(_,i)=>{const a=i/9*Math.PI/2;return [(rim-.15)*Math.cos(a),top-.5+1.3*Math.sin(a)] as [number,number]}),48);
   quiet(put(fit,'fittings',dome,amber,false)).position.set(p.x,0,p.z);
  };
  // The bezel is cut into segments, as in the reference.
  const gaps=(x:number,z:number,r:number,y:number,n:number,turn:number)=>many(fit,'fittings',unit,'matte',Array.from({length:n},(_,i)=>{const a=turn+i/n*Math.PI*2;return {x:x+Math.cos(a)*r,y,z:z+Math.sin(a)*r,ry:-a,sx:1.7,sy:.08,sz:.28}}));
  // Top left.
  let p=at('fit-tl');
  cyl(fit,'fittings','black',p.x,p.z,p.r!-.3,B,B+3.4,48);knurl(p.x,p.z,p.r!-.2,B+.4,B+3.2,44);
  lens(p,0,5.9,B+6.9);gaps(p.x,p.z,7.15,B+5.92,5,.4);
  // Top right: a spun gold dome in a knurled black bezel ringed with screws.
  p=at('fit-tr');
  cyl(fit,'fittings','black',p.x,p.z,p.r!-.3,B,B+4.6,48);knurl(p.x,p.z,p.r!-.2,B+.4,B+4.4,48);
  ring(fit,'fittings','steel',p.x,p.z,6,7.5,B+3,p.y1-1,.5);groove(p.x,p.z,6.8,p.y1-1);ring(fit,'fittings','dark',p.x,p.z,5.5,6.1,B+3,p.y1-.4,.2);
  // The brass cone is fluted all the way round.
  turned(fit,'fittings',std('fittings',{color:0xf2c878,roughness:.42,metalness:.9,envMapIntensity:.24,map:m.texture(fluteMap())}),p.x,p.z,[[0,B+3],[5.5,B+3],[5.5,B+6.4],[5,B+6.6],[4.9,B+6.9],[4,B+7.2],[3.9,B+7.5],[2.6,B+7.8],[2.5,B+8.05],[1.2,B+8.3],[0,B+8.4]]);
  quiet(ring(fit,'fittings',fitMats[1],p.x,p.z,4.95,5.2,B+6.5,B+6.62,.02));cyl(fit,'fittings','steel',p.x,p.z,.9,B+8.3,B+9,20);
  // The ring of small screws sits on the steel bezel.
  many(fit,'fittings',new THREE.CylinderGeometry(.36,.36,.3,12),'dark',Array.from({length:8},(_,i)=>({x:p.x+Math.cos(i/8*Math.PI*2+.3)*6.75,y:p.y1-.9,z:p.z+Math.sin(i/8*Math.PI*2+.3)*6.75})));
  // Bottom right: a knurled base, two stepped steel rings and a wide spun-steel dish that falls to an orange eye set
  // low on its right-hand side, as in the reference.
  p=at('fit-br');
  cyl(fit,'fittings','black',p.x,p.z,p.r!-.2,B,B+3,48);knurl(p.x,p.z,p.r!-.1,B+.4,B+2.8,46);
  ring(fit,'fittings','steel',p.x,p.z,6.6,p.r!-.5,B+2,p.y1-.8,.4);ring(fit,'fittings','steel',p.x,p.z,5.9,6.9,B+2,p.y1,.35);groove(p.x,p.z,7.3,p.y1-.8);
  turned(fit,'fittings','steel',p.x,p.z,[[0,B+2],[6,B+2],[6,p.y1-.4],[5.2,p.y1-1.1],[5.1,p.y1-1.5],[4,p.y1-2],[3.9,p.y1-2.4],[2.6,p.y1-2.9],[0,p.y1-3]]);
  {const ex=p.x+1.2,ez=p.z+.9;ring(fit,'fittings','dark',ex,ez,3.2,3.6,p.y1-3,p.y1-2.2,.12);const eye=quiet(put(fit,'fittings',new THREE.CircleGeometry(3.2,44),fitMats[2],false));eye.rotation.x=-Math.PI/2;eye.position.set(ex,p.y1-2.35,ez)}
  cyl(fit,'fittings','steel',p.x+7.4,p.z+.6,.5,p.y1-.8,p.y1-.3,16);
  // Bottom left: on a black hexagonal base.
  p=at('fit-bl');
  hex(p.x,p.z,p.r!,B+4.2);knurl(p.x,p.z,8.1,B+3.2,B+5,40);lens(p,3,5.9,B+7.4);gaps(p.x,p.z,7.15,B+6.42,4,1.1);

  // Washers: pale brass rings with an engraved line and four pins, each with a different centre.
  const pale=std('fittings',{color:0xf0d2a4,roughness:.5,metalness:.6,envMapIntensity:.2,map:sheen});
  const letters=['M4X0.7','1.2 N.M'].map(t=>print('fittings',ringText(t),.5,{transparent:true,depthWrite:false}));
  of('washer').forEach((w,i)=>{
   turned(fit,'fittings',pale,w.x,w.z,[[2.9,B],[w.r!,B],[w.r!,w.y1-.9],[w.r!-.5,w.y1-.5],[w.r!-.9,w.y1-.5],[w.r!-1.1,w.y1],[3.3,w.y1],[2.9,w.y1-.4],[2.9,B]]);
   // A raised lip round the black well makes the second step.
   ring(fit,'fittings',pale,w.x,w.z,2.9,3.55,B,w.y1+.3,.15);groove(w.x,w.z,4.4,w.y1);cyl(fit,'fittings','black',w.x,w.z,2.95,B,w.y1-.6,36);
   if(i===0){const pad=put(fit,'fittings',solid(rr(new THREE.Shape(),0,0,2.9,2.9,.8),B,w.y1+.1,.25),fin('fittings','tan'));pad.position.set(w.x,0,w.z);pad.rotation.y=.2}
   else if(i===1){turned(fit,'fittings','gold',w.x,w.z,[[0,B],[2.1,B],[2.1,w.y1-.3],[1.4,w.y1+.3],[0,w.y1+.4]]);slot(fit,'fittings',w.x,w.z,w.y1+.36,3.4,.8);slot(fit,'fittings',w.x,w.z,w.y1+.36,3.4,.8+Math.PI/2)}
   else if(i===2){ring(fit,'fittings','gold',w.x,w.z,.55,1.7,B,w.y1+.1,.25);cyl(fit,'fittings','matte',w.x,w.z,.55,B,w.y1-.2,16)}
   else{ring(fit,'fittings','steel',w.x,w.z,.7,1.9,B,w.y1+.4,.3);cyl(fit,'fittings','matte',w.x,w.z,.7,B,w.y1,16);slot(fit,'fittings',w.x,w.z,w.y1-.54,5.6,.7,.3)}
   if(i>=2){const mark=quiet(put(fit,'fittings',new THREE.CircleGeometry(w.r!-.5,40),letters[i-2],false));mark.rotation.x=-Math.PI/2;mark.position.set(w.x,w.y1+.02,w.z)}
   many(fit,'fittings',new THREE.CylinderGeometry(.28,.28,.2,10),'dark',[0,1,2,3].map(k=>({x:w.x+Math.cos(k*Math.PI/2+.6+i)*(w.r!-.45),y:w.y1-.42,z:w.z+Math.sin(k*Math.PI/2+.6+i)*(w.r!-.45)})));
  });
  // Fan discs: gold spokes round a pale hub. The lower one is lit.
  for(const f of of('fan')){
   cyl(fit,'fittings','gold',f.x,f.z,f.r!,B,f.y1-.3,64);
   const disc=quiet(put(fit,'fittings',new THREE.CircleGeometry(f.r!-.05,64),print('fittings',fanTexture(!!f.lit),.34,{metalness:.85,envMapIntensity:.2}),false));disc.rotation.x=-Math.PI/2;disc.position.set(f.x,f.y1-.28,f.z);
   ring(fit,'fittings','gold',f.x,f.z,2.2,3.5,B,f.y1+.5,.3);
   cyl(fit,'fittings',f.lit?fanMat:fin('fittings','white'),f.x,f.z,2.2,B,f.y1+.3,40);
  }
  DOTS.forEach((_,i)=>{const d=at(`dot-${i}`);ring(fit,'fittings','gold',d.x,d.z,1.5,d.r!,B,d.y1,.2);quiet(cyl(fit,'fittings',dotMats[i],d.x,d.z,1.5,B,d.y1-.15,28))});
  const s=at('standoff');hex(s.x,s.z,s.r!,B+1.4);cyl(fit,'fittings','steel',s.x,s.z,2.3,B+1.4,s.y1-1.5,32);cyl(fit,'fittings','steel',s.x-.6,s.z-.4,1.5,s.y1-1.5,s.y1,28);cyl(fit,'fittings','steel',s.x-1.6,s.z+1.8,.6,B+1.4,B+3.6,14);
  for(const q of of('stud').filter(q=>q.asm==='fittings')){cyl(fit,'fittings','steel',q.x,q.z,q.r!,B,q.y1,24);if(q.id==='standoff-screw')slot(fit,'fittings',q.x,q.z,q.y1,1.8,.9,.25)}
 }

 // ── Memory ──────────────────────────────────────────────────────────────
 const memGlow=lamp('memory',0xc85a18,0xff7a1c);
 {
  const mem=layer('memory'),band=m.texture(slotTexture()),bandMats=new Map<number,THREE.Material>();
  // One contact-band material per slot length, so the rows keep their half-millimetre pitch.
  const bandMat=(long:number)=>{const key=Math.round(long);let mat=bandMats.get(key);if(!mat){const map=m.texture(band.clone());map.repeat.set(1,long/8);map.needsUpdate=true;mat=print('memory',map,.8,{envMapIntensity:.02});bandMats.set(key,mat)}return mat};
  // Lengthwise helpers: a slot runs along z when upright and along x when it lies across the board.
  const along=(p:Part,u:number,v:number,w:number,l:number,y0:number,y1:number,mat:Mat,shadow=true)=>{const mesh=put(mem,'memory',new THREE.BoxGeometry(p.vertical?w:l,y1-y0,p.vertical?l:w),use('memory',mat),shadow);mesh.position.set(p.x+(p.vertical?u:v),(y0+y1)/2,p.z+(p.vertical?v:u));return mesh};
  for(const p of of('slot')){
   const long=p.vertical?p.d:p.w,wide=p.vertical?p.w:p.d,thin=wide<3,channel=thin?.45:.9,land=(wide-.5-channel)/2,off=(channel+land)/2,floor=p.y1-.9;
   // Body: a low black block, two raised lands either side of the central channel, and a rim wall at each long edge.
   block(mem,{...p,y1:floor},'black',.3,.2);
   for(const e of [-1,1]){
    along(p,e*off,0,land,long-.6,floor,p.y1-.15,'black');
    const face=quiet(put(mem,'memory',(()=>{const g=new THREE.PlaneGeometry(land-.1,long-1);g.rotateX(-Math.PI/2);return g})(),bandMat(long),false));face.position.set(p.x+(p.vertical?e*off:0),p.y1-.13,p.z+(p.vertical?0:e*off));if(!p.vertical)face.rotation.y=Math.PI/2;
    along(p,e*(wide/2-.14),0,.28,long,floor,p.y1,'black');
   }
   // Key: a bar across the channel, off-centre.
   along(p,0,long*(p.vertical?.14:-.1),channel+.1,1.2,floor,p.y1-.1,'black',false);
   if(p.vertical)slabAt(mem,'memory',memGlow,[p.box[0]+3,p.box[3]+2,p.box[2]-3,p.box[3]+16],B,B+1,.2,.15).castShadow=false;
  }
  // Latches: a block at the slot's end with a finger recess and catch on top, and a steel hinge pin where it meets the slot.
  for(const p of of('latch')){
   block(mem,p,'black',.6,.4);
   const upright=/-(s|l)\d/.test(p.id),[x0,y0,x1,y1]=p.box;
   if(upright){
    slabAt(mem,'memory','matte',[x0+4,y0+8,x1-4,y0+24],p.y1-.1,p.y1+.05,.2,.02);cyl(mem,'memory','matte',p.x,p.z+p.d*.2,.3,p.y1,p.y1+.06,12);
    xcyl(mem,'memory','dark',p.x-p.w/2-.1,p.x+p.w/2+.1,p.y1-1.2,p.z+p.d/2-.5,.38,12);
    slabAt(mem,'memory','black',[x0+2,y1-20,x1-2,y1-10],p.y1-.2,p.y1+.5,.2,.15);
   }else{
    slabAt(mem,'memory','matte',[x0+(x1-x0)*.3,(y0+y1)/2-6,x1-(x1-x0)*.3,(y0+y1)/2+6],p.y1-.1,p.y1+.05,.4,.02);
    const inner=p.x<0?p.x+p.w/2-.5:p.x-p.w/2+.5;zcyl(mem,'memory','dark',inner,p.y1-1.2,p.z-p.d/2-.1,p.z+p.d/2+.1,.38,12);
    slabAt(mem,'memory','black',p.x<0?[x1-22,y0+3,x1-12,y1-3]:[x0+12,y0+3,x0+22,y1-3],p.y1-.2,p.y1+.5,.2,.15);
   }
  }
  for(const [id,x0,y0,x1,y1] of CLIPS){const s=at(id);slabAt(mem,'memory','black',[x0,y0,x1,y1],s.y1-.2,s.y1+1.1,.5,.3);const [cx,cz]=mm((x0+x1)/2,(y0+y1)/2);cyl(mem,'memory','matte',cx,cz,.45,s.y1+1.1,s.y1+1.16,12)}
  for(const id of ['slot-h0','slot-h1'])for(const px of [520,1000]){const s=at(id),[cx]=mm(px,0);put(mem,'memory',new THREE.BoxGeometry(1.2,1.2,s.d+.8),fin('memory','black')).position.set(cx,s.y1+.2,s.z)}
 }

 // ── Controllers ─────────────────────────────────────────────────────────
 {
  const chips=layer('chips'),steelLeads:Item[]=[],goldLeads:Item[]=[];
  for(const p of of('chip')){
   block(chips,p,p.finish==='grey'?std('chips',{color:0x4f4a48,roughness:.6}):'black',p.id==='ctl-d'?1.2:.35,.28);
   top(chips,p,chipTop(p,p.id==='ctl-label'),.3,p.finish==='grey'?.5:.62);
   if(p.id==='ctl-label')put(chips,'chips',solid((()=>{const s=rr(new THREE.Shape(),p.x,p.z,p.w+.5,p.d+.5,.7);s.holes.push(rr(new THREE.Path(),p.x,p.z,p.w-.1,p.d-.1,.5));return s})(),B,p.y1+.1,.08),fin('chips','steel'));
   if(p.id==='ctl-q3')slabAt(chips,'chips','steel',[p.box[0]+14,p.box[1]+14,p.box[2],p.box[3]-14],p.y1,p.y1+.5,.2,.15);
   if(p.id==='ctl-a')for(const [u,v] of [[.2,.42],[.36,.52]])cyl(chips,'chips','steel',p.x-p.w/2+p.w*u,p.z-p.d/2+p.d*v,.35,p.y1,p.y1+.15,14);
   if(!p.pins)continue;
   const list=p.gold?goldLeads:steelLeads,sides=p.lead==='quad'?[0,1,2,3]:p.lead==='dual-x'?[2,3]:[0,1];
   for(const side of sides){
    const across=side<2,along=across?p.w:p.d,pitch=along/(p.pins+1);
    for(let i=1;i<=p.pins;i++){
     const t=-along/2+i*pitch;
     list.push(across?{x:p.x+t,y:B+.2,z:p.z+(side?1:-1)*(p.d/2+.3),sx:pitch*.42,sy:.36,sz:.7}:{x:p.x+(side===3?1:-1)*(p.w/2+.3),y:B+.2,z:p.z+t,sx:.7,sy:.36,sz:pitch*.42});
    }
   }
  }
  many(chips,'chips',unit,std('chips',{color:0xd6cec6,roughness:.3,metalness:1,envMapIntensity:.22}),steelLeads);
  many(chips,'chips',unit,'gold',goldLeads);
  // Thermal pad: a shallow four-sided pyramid, which is what gives the reference its diagonal facets.
  const pad=at('pad'),padMat=std('chips',{color:0x9a4a18,roughness:.5,flatShading:true});
  block(chips,pad,padMat,.2,.1).scale.y=.7;
  const peak=put(chips,'chips',new THREE.ConeGeometry(pad.w/Math.SQRT2-.1,.9,4,1),padMat);peak.rotation.y=Math.PI/4;peak.position.set(pad.x,B+(pad.y1-B)*.7+.45,pad.z);
  for(const id of ['module','module-cap']){const p=at(id);block(chips,p,p.finish,.6,.35);top(chips,p,chipTop(p),.35,.5)}
  const mod=at('module');many(chips,'chips',unit,'gold',Array.from({length:10},(_,i)=>({x:mod.x-mod.w/2-.35,y:B+.3,z:mod.z-mod.d/2+.6+i*(mod.d-1.2)/9,sx:.7,sy:.6,sz:.45})));
 }

 // ── Ports ───────────────────────────────────────────────────────────────
 {
  const ports=layer('ports');
  LEDS.forEach((_,i)=>{if(i<3)quiet(block(ports,at(`led-${i}`),portLamps[i],.15,.15))});
  // The corner block follows the card's rounded corner.
  const corner=at('corner-block'),arc:P2[]=Array.from({length:13},(_,i)=>{const a=Math.PI+i/12*Math.PI/2,r=CARD.r/PX-4;return [CARD.r/PX+Math.cos(a)*r,CARD.r/PX+Math.sin(a)*r] as P2});
  put(ports,'ports',solid(polygon([...arc,[140,4],[140,115],[4,115]]),corner.y0,corner.y1,.6),fin('ports','white'));
  for(const p of of('block').filter(p=>p.asm==='ports'&&p.id!=='corner-block')){
   block(ports,p,p.finish,p.id.startsWith('tower')?1.2:p.id==='dome'?5:.7,p.id.startsWith('tower')?.6:.4);
   if(p.mark)top(ports,p,chipTop(p,p.id==='block-a'||p.id==='block-c'),.45,.6);
  }
  // Shield cans: a darker skirt at the board and a seam line round the top of each grey housing.
  for(const id of ['block-a','block-b','block-c','tower-0','tower-1']){
   const q=at(id),[x0,y0,x1,y1]=q.box;slabAt(ports,'ports','black',[x0-3,Math.max(0,y0-3),x1+3,y1+3],B,B+1.2,.6,.2);
   const seam=rr(new THREE.Shape(),q.x,q.z,q.w-1.2,q.d-1.2,.6);seam.holes.push(rr(new THREE.Path(),q.x,q.z,q.w-1.5,q.d-1.5,.5));
   quiet(put(ports,'ports',solid(seam,q.y1-.02,q.y1+.03,0),fin('ports','matte'),false));
  }
  // The slotted housing: three openings with depth, each with a row of gold contacts at the bottom.
  const bb=at('block-b');
  for(const v of [.1,.36,.8]){
   const y=bb.box[1]+175*v;slabAt(ports,'ports','matte',[bb.box[0]+16,y+4,bb.box[2]-16,y+16],bb.y1-.5,bb.y1+.03,.3,.01);
   many(ports,'ports',unit,'dark',[0,1,2,3].map(i=>({x:bb.x-1.05+i*.7,y:bb.y1-.2,z:mm(0,y+10)[1],sx:.3,sy:.05,sz:.7})));
  }
  // The white corner block: a stepped top with a shallow recess.
  slabAt(ports,'ports','white',[22,22,128,104],corner.y1-.1,corner.y1+.8,2.4,.5);
  const jack=at('jack');block(ports,jack,'black',.8,.4);xcyl(ports,'ports',std('ports',{color:0x1b1918,roughness:.3,metalness:.4}),jack.x-jack.w/2+.2,jack.x+jack.w/2-.2,jack.y1-.4,jack.z+3.6,1.5);
  for(const dx of [-3.4,-1.2,1,3.2])xcyl(ports,'ports','black',jack.x+dx-.25,jack.x+dx+.25,jack.y1-.4,jack.z+3.6,1.75);
  zcyl(ports,'ports','black',jack.x+.4,jack.y1+.3,jack.z-jack.d/2,jack.z+8,.3,10);
  const foot=at('jack-foot');for(const dx of [-2,0,2.2])zcyl(ports,'ports','dark',foot.x+dx,foot.y1+.1,foot.z-4,foot.z-.5,.3,10);
  for(const p of of('button').filter(p=>p.asm==='ports')){
   if(p.id==='dome-cap')block(ports,p,'steel',2.2,.9);
   else if(p.id==='dip'){block(ports,p,'white',.3,.2);many(ports,'ports',unit,'matte',[0,1,2,3,4].map(i=>({x:p.x-p.w/2+.9+i*1.2,y:p.y1+.03,z:p.z,sx:.25,sy:.06,sz:p.d-.8})))}
   else{block(ports,p,'dark',.3,.2);cyl(ports,'ports','steel',p.x,p.z,.55,p.y1,p.y1+.25,16)}
  }
  const sock=at('steel-socket');block(ports,sock,'brushed',.5,.4);
  cyl(ports,'ports','matte',sock.x,sock.z-1.8,1.2,sock.y1-.4,sock.y1+.03,24);slabAt(ports,'ports','matte',[sock.box[0]+34,sock.box[1]+58,sock.box[2]-34,sock.box[1]+110],sock.y1-.4,sock.y1+.04,.3,.01);
  slabAt(ports,'ports','matte',[sock.box[0]+18,sock.box[1]+130,sock.box[0]+30,sock.box[1]+136],sock.y1-.2,sock.y1+.03,.2,.01);
  for(const c of of('cap')){
   cyl(ports,'ports','black',c.x,c.z,c.r!,B,c.y1-1.2,40);
   turned(ports,'ports','white',c.x,c.z,[[0,c.y1-1.2],[c.r!-.05,c.y1-1.2],[c.r!-.05,c.y1-.3],[c.r!-.4,c.y1],[0,c.y1]]);
   // The reference's capacitor tops are plain, with a sleeve line near the edge; one carries a polarity dash.
   if(c.id==='cap-3')slabAt(ports,'ports','matte',[c.box[0]+10,c.box[3]-14,c.box[2]-10,c.box[3]-9],c.y1-.02,c.y1+.03,.2,.01);
   quiet(ring(ports,'ports','grey',c.x,c.z,c.r!*.8,c.r!*.8+.1,c.y1-.02,c.y1+.02,.005));cyl(ports,'ports','black',c.x,c.z,c.r!+.2,B,B+.25,32);
  }
  for(const e of of('edge')){
   block(ports,e,'black',.6,.35);
   if(e.id==='edge-1'){slabAt(ports,'ports','gold',[e.box[0],e.box[1]-3,e.box[2]+3,e.box[3]+3],B,B+.5,.3,.1);many(ports,'ports',unit,'dark',Array.from({length:24},(_,i)=>({x:e.x,y:e.y1+.02,z:e.z-e.d/2+.7+i*(e.d-1.4)/23,sx:e.w-.9,sy:.06,sz:.3})))}
   if(e.id==='edge-3'){slabAt(ports,'ports','steel',[e.box[0]-8,e.box[1]+6,e.box[0]+6,e.box[3]-6],B,e.y1+.3,.3,.2);cyl(ports,'ports','steel',e.x+1.4,e.z,.45,e.y1,e.y1+.1,12)}
   if(e.id==='edge-0')slabAt(ports,'ports','matte',[e.box[0]+8,e.box[1]+16,e.box[2]-10,e.box[3]-16],e.y1-.1,e.y1+.04,.3,.01);
   if(e.id==='edge-2')slabAt(ports,'ports','tan',[20,2452,34,2484],e.y1-.1,e.y1+.2,.2,.08);
  }
  const grey=at('edge-5');for(const [u,v,r] of [[.5,.3,.85],[.82,.2,.6],[.32,.72,.6],[.74,.66,.5]])cyl(ports,'ports','matte',grey.x-grey.w/2+grey.w*u,grey.z-grey.d/2+grey.d*v,r,grey.y1-.2,grey.y1+.05,18);
  quiet(cyl(ports,'ports',portLamps[3],grey.x+grey.w*.24,grey.z+grey.d*.16,.5,grey.y1,grey.y1+.2,14));
  const tab=at('edge-tab');cyl(ports,'ports','steel',tab.x,tab.z-2,.5,tab.y1,tab.y1+.12,12);cyl(ports,'ports','steel',tab.x,tab.z+2.4,.5,tab.y1,tab.y1+.12,12);
 }

 // Merge what never moves on its own, layer by layer.
 for(const group of Object.values(b.groups))for(const node of group.children)compact(node);

 const anchor=(id:string):V3=>{const p=at(id);return [p.x,p.y1+1,p.z]};
 const anchors:Record<AssemblyId,V3>={board:[mm(1100,2400)[0],B+1,mm(1100,2400)[1]],components:anchor('gold-1'),cpu:anchor('ihs'),core:anchor('die'),pipes:[mm(1035,700)[0],PIPE.y+PIPE.r,mm(1035,700)[1]],memory:anchor('slot-l0'),chips:anchor('ctl-label'),fittings:anchor('fit-bl'),ports:anchor('tower-0')};
 return {
  anchors,count:parts.length+comps.length,
  setEnvironment,boardMats,portLamps,lampLens,shroudMat,hot,windowMat,chaseMat,dieMat,chase,coreLight,pulse,pipeMat,fitMats,dotMats,fanMat,memGlow,ledMats,
 };
}
export const EXTENT={x:IMG.w*PX,z:IMG.h*PX};
