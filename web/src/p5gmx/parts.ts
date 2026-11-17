// P5G-MX geometry. Heights are measured from the board's top face: every layer's origin is at [0, TOP, 0].
// Moulded parts are rounded so their edges catch the light, sheet steel is cut with real openings, leads end in solder.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Builder} from '../kit/builder';
import {roundPlate,slab,lathe} from '../kit/builder';
import type {AssemblyId} from './model';
import {BOARD,TOP,HOLES,HOLE,COOLER,coolerHoles,IO,EDGE_Z,IO_PROUD,SOCKET,NB,SB,SINK,SLOTS,PCIE16,LATCH16,DIMM,DIMMS,ATX24,ATX4,IDE,SATA,SATA_SIZE,FANS,FAN_SIZE,HEADERS,ECAPS,SOLIDS,TOROIDS,ROD,GREEN,
 DPAKS,DPAK,CHIPS,leadReach,CRYSTALS,CRYSTAL,BATTERY,LED,STICKERS,passives,SIZES,type Ecap,type Slot} from './layout';
import {boardTiles,TILES,underside,brushed,grain,packageTop,slotTop,lgaField,capTop,sleeve,solidTop,solidSleeve,sticker,ps2Sticker,dsubFace,dinFace,MASK} from './textures';

type Mat=THREE.Material;
type Item={x:number;y:number;z:number;rx?:number;ry?:number;rz?:number;sx?:number;sy?:number;sz?:number};
const RY=[0,-Math.PI/2,Math.PI,Math.PI/2];

export function buildBoard(b:Builder){
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t) as T;
 const own=<T extends Mat>(asm:AssemblyId,m:T)=>b.m.own(asm,m);
 const base:[number,number,number]=[0,TOP,0];
 const L:Record<AssemblyId,THREE.Object3D>={board:b.layer('board',[0,0,0],base),parts:b.layer('parts',[0,0,0],base),chips:b.layer('chips',[0,0,0],base),power:b.layer('power',[0,0,0],base),
  connectors:b.layer('connectors',[0,0,0],base),io:b.layer('io',[0,0,0],base),slots:b.layer('slots',[0,0,0],base),memory:b.layer('memory',[0,0,0],base),socket:b.layer('socket',[0,0,0],base),heatsink:b.layer('heatsink',[0,0,0],base)};

 // ── Finishes, made once per assembly so selecting one ghosts the rest. ──
 const grainT=tex(grain(9)),fineT=tex(grain(4,170,26));grainT.repeat.set(4,4);fineT.repeat.set(2,2);
 const alu=brushed(3);for(const t of [alu.map,alu.relief]){tex(t);t.repeat.set(1/30,1/30)}
 const cache=new Map<string,Mat>();
 // Dark glossy finishes mirror the bright studio too strongly; they take the room as their own, dimmer map (KIT.md), set in `update`.
 const dimmed:[THREE.MeshStandardMaterial,number][]=[];const dim=<T extends THREE.MeshStandardMaterial>(m:T,k:number)=>{dimmed.push([m,k]);return m};
 const once=<T extends Mat>(key:string,asm:AssemblyId,make:()=>T)=>{let m=cache.get(asm+key);if(!m){m=own(asm,make());cache.set(asm+key,m)}return m as T};
 const tin=(asm:AssemblyId)=>once('tin',asm,()=>new THREE.MeshStandardMaterial({color:0xc4c6c7,metalness:1,roughness:.42}));
 const steel=(asm:AssemblyId)=>once('steel',asm,()=>dim(new THREE.MeshStandardMaterial({color:0x77726b,metalness:.85,roughness:.45,map:alu.map,roughnessMap:alu.relief}),.4));
 const solder=(asm:AssemblyId)=>once('solder',asm,()=>new THREE.MeshStandardMaterial({color:0xaeb1b3,metalness:1,roughness:.48}));
 const gold=(asm:AssemblyId)=>once('gold',asm,()=>new THREE.MeshStandardMaterial({color:0xd9b25e,metalness:1,roughness:.4}));
 const copper=(asm:AssemblyId)=>once('copper',asm,()=>new THREE.MeshStandardMaterial({color:0xc97a42,metalness:1,roughness:.38,emissive:0xff4a10,emissiveIntensity:0}));
 const plastic=(asm:AssemblyId,colour:number,rough=.62)=>once('plastic'+colour.toString(16)+rough,asm,()=>new THREE.MeshStandardMaterial({color:colour,roughness:rough,roughnessMap:grainT,bumpMap:grainT,bumpScale:.025}));
 const mould=(asm:AssemblyId)=>once('mould',asm,()=>dim(new THREE.MeshStandardMaterial({color:0x202124,roughness:.62,roughnessMap:fineT,bumpMap:fineT,bumpScale:.015}),.45));
 const dark=(asm:AssemblyId)=>once('dark',asm,()=>new THREE.MeshStandardMaterial({color:0x0c0d0f,roughness:.9}));

 // ── Shape helpers ──
 const rb=(w:number,h:number,d:number,r=.15,seg=2)=>new RoundedBoxGeometry(w,h,d,seg,Math.max(.01,Math.min(r,w/2-.005,h/2-.005,d/2-.005)));
 const rbox=(p:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y0:number,y1:number,r=.15)=>{const m=b.put(p,asm,rb(w,y1-y0,d,r),mat);m.position.set(x,(y0+y1)/2,z);return m};
 const at=(p:THREE.Object3D,x:number,z:number,turn=0,y=0)=>{const n=b.pivot(p,[x,y,z]);n.rotation.y=turn;return n};
 const rectShape=(x0:number,y0:number,x1:number,y1:number,r=0)=>{const s=new THREE.Shape();if(r<=0){s.moveTo(x0,y0);s.lineTo(x1,y0);s.lineTo(x1,y1);s.lineTo(x0,y1);s.closePath();return s}
  s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.absarc(x1-r,y0+r,r,-Math.PI/2,0,false);s.lineTo(x1,y1-r);s.absarc(x1-r,y1-r,r,0,Math.PI/2,false);s.lineTo(x0+r,y1);s.absarc(x0+r,y1-r,r,Math.PI/2,Math.PI,false);s.lineTo(x0,y0+r);s.absarc(x0+r,y0+r,r,Math.PI,Math.PI*1.5,false);return s};
 const pathOf=(pts:[number,number][])=>new THREE.Path(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const shapeOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const rectHole=(x0:number,y0:number,x1:number,y1:number)=>pathOf([[x0,y0],[x0,y1],[x1,y1],[x1,y0]]);
 const roundHole=(x:number,y:number,r:number)=>{const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,true);return p};
 // Sheet: a shape cut from stock `t` thick with broken edges, lying in XY with thickness 0..t along z.
 const sheetGeo=(shape:THREE.Shape,t:number,bevel=.05)=>{const q=Math.min(bevel,t*.3),g=new THREE.ExtrudeGeometry(shape,{depth:t-q*2,bevelEnabled:true,bevelThickness:q,bevelSize:q,bevelOffset:-q,bevelSegments:1,curveSegments:12});g.translate(0,0,q);return g};
 // Flat on the board (shape y is −z, thickness upward), standing across (facing +z), or standing along (shape x is −z, thickness along +x).
 const flat=(g:THREE.BufferGeometry)=>g.rotateX(-Math.PI/2),along=(g:THREE.BufferGeometry)=>g.rotateY(Math.PI/2);
 const plate=(p:THREE.Object3D,asm:AssemblyId,mat:Mat,g:THREE.BufferGeometry,x=0,y=0,z=0)=>{const m=b.put(p,asm,g,mat);m.position.set(x,y,z);return m};
 const faceted=(g:THREE.BufferGeometry)=>{const q=g.toNonIndexed();q.computeVertexNormals();return q};
 const dummy=new THREE.Object3D();
 const inst=(p:THREE.Object3D,asm:AssemblyId,g:THREE.BufferGeometry,mat:Mat,items:Item[],shadow=true)=>{
  if(!items.length)return null;const m=new THREE.InstancedMesh(g,mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(it.rx??0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});
  m.instanceMatrix.needsUpdate=true;b.adopt(p,asm,m,items.length);m.castShadow=shadow;return m;
 };
 // A gull-wing lead: out of the body at height h1, down, and along the land. Origin at the body edge, +x outward.
 const gull=(reach:number,h1:number,w:number,t=.13,foot=.45)=>{const a=reach-foot-.24,g=new THREE.ExtrudeGeometry(shapeOf([[0,h1+t],[a,h1+t],[a+.24,t],[reach,t],[reach,0],[a+.24-t*.55,0],[a-t*.55,h1],[0,h1]]),{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);return g};
 const pillow=rb(1,1,1,.3,2);
 const fillet=(()=>{const pts:[number,number][]=[[0,0]];for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;pts.push([1-Math.sin(a)*.94,1-Math.cos(a)*.94])}const g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:1,bevelEnabled:false,curveSegments:1});g.translate(0,0,-.5);return g})();
 // A marking printed flat on top of a body.
 const decal=(p:THREE.Object3D,asm:AssemblyId,t:{map:THREE.Texture;relief?:THREE.Texture},x:number,z:number,w:number,d:number,y:number,turn=0,o:{metal?:number;rough?:number}={})=>{
  const mat=own(asm,new THREE.MeshStandardMaterial({map:tex(t.map),roughness:t.relief?1:(o.rough??.55),roughnessMap:t.relief?tex(t.relief):null,metalness:o.metal??0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const m=b.put(p,asm,g,mat,false);m.position.set(x,y+.006,z);m.rotation.y=turn;return m;
 };
 // A face decal standing upright, facing −z (toward the rear edge) unless turned.
 const face=(p:THREE.Object3D,asm:AssemblyId,map:THREE.Texture,x:number,y:number,z:number,w:number,h:number,turn=Math.PI,o:{rough?:number;metal?:number}={})=>{
  const mat=own(asm,new THREE.MeshStandardMaterial({map:tex(map),roughness:o.rough??.5,metalness:o.metal??0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const m=b.put(p,asm,new THREE.PlaneGeometry(w,h),mat,false);m.position.set(x,y,z);m.rotation.y=turn;return m;
 };

 // ── Board ──────────────────────────────────────────────────────────────
 const boardFaces:THREE.MeshPhysicalMaterial[]=[];
 {
  const plan=roundPlate(BOARD.w,BOARD.d,BOARD.r);
  const allHoles:[number,number,number][]=[...HOLES.map(([x,z])=>[x,z,HOLE.drill] as [number,number,number]),...coolerHoles().map(([x,z])=>[x,z,COOLER.drill] as [number,number,number])];
  for(const [x,z,r] of allHoles)plan.holes.push(roundHole(x,-z,r));
  const edgeMat=own('board',new THREE.MeshStandardMaterial({color:MASK.edge,roughness:.7})),core=own('board',new THREE.MeshStandardMaterial({color:0x6a5218,roughness:.55}));
  b.adopt(L.board,'board',new THREE.Mesh(slab(plan,-BOARD.t,-.01,24),[core,edgeMat]));
  // The face in tiles. Each tile is its square of the board with the holes that fall in it cut out.
  const {tiles}=boardTiles(),n=TILES.mm;
  for(const t of tiles){
   const x0=t.u0-BOARD.w/2,z0=t.v0-BOARD.d/2,s=rectShape(x0,-(z0+n),x0+n,-z0);
   for(const [x,z,r] of allHoles)if(x-r>x0+.05&&x+r<x0+n-.05&&z-r>z0+.05&&z+r<z0+n-.05)s.holes.push(roundHole(x,-z,r));
   const g=new THREE.ShapeGeometry(s,24),p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-x0)/n,(p.getY(i)+z0+n)/n);
   flat(g);
   const relief=tex(t.relief),mat=own('board',new THREE.MeshPhysicalMaterial({map:tex(t.map),roughness:1,roughnessMap:relief,metalness:1,metalnessMap:relief,bumpMap:relief,bumpScale:1.4,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
   const m=b.put(L.board,'board',g,mat,false);m.position.y=.002;boardFaces.push(mat);
  }
  const under=new THREE.ShapeGeometry(plan,24),up=under.attributes.position,uu=under.attributes.uv;for(let i=0;i<up.count;i++)uu.setXY(i,up.getX(i)/BOARD.w+.5,up.getY(i)/BOARD.d+.5);
  under.rotateX(Math.PI/2);const um=b.put(L.board,'board',under,own('board',new THREE.MeshStandardMaterial({map:tex(underside()),roughness:.5,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),false);um.position.y=-BOARD.t-.004;
  // Plated barrels and the brass standoffs the board rests on.
  const plating=own('board',new THREE.MeshStandardMaterial({color:0xdcb15a,metalness:1,roughness:.3,side:THREE.BackSide})),brass=own('board',new THREE.MeshStandardMaterial({color:0xc9a04e,metalness:1,roughness:.32}));
  for(const [x,z] of HOLES){
   const barrel=b.put(L.board,'board',new THREE.CylinderGeometry(HOLE.drill-.01,HOLE.drill-.01,BOARD.t,28,1,true),plating,false);barrel.position.set(x,-BOARD.t/2,z);
   const hex=b.put(L.board,'board',faceted(lathe([[0,-TOP],[2.6,-TOP],[3,-TOP+.3],[3,-BOARD.t-.3],[2.6,-BOARD.t-.02],[HOLE.drill-.3,-BOARD.t-.02],[HOLE.drill-.3,-BOARD.t-.5],[0,-BOARD.t-.5]],6)),brass);hex.position.set(x,0,z);
  }
  // Barcode stickers along the right edge.
  for(const s of STICKERS){const m=decal(L.board,'board',{map:sticker(s.w,s.d,s.lines,s.seed)},s.x,s.z,s.w,s.d,.06,0,{rough:.45});m.castShadow=false}
 }

 // ── Small parts: passives, small transistors, the cavity parts under the socket, the standby lamp. ──
 let ledMat!:THREE.MeshStandardMaterial;
 {
  const P=L.parts,fillets:Item[]=[],lands:{x:number;z:number;w:number;d:number}[]=[];
  const ceramic=own('parts',new THREE.MeshStandardMaterial({color:0xb5a184,roughness:.6})),resist=own('parts',new THREE.MeshStandardMaterial({color:0x1a1b1d,roughness:.5})),alumina=own('parts',new THREE.MeshStandardMaterial({color:0xe0e0dc,roughness:.7}));
  const list=passives();
  for(const kind of Object.keys(SIZES) as (keyof typeof SIZES)[]){
   const [l,w,h,off,pl,pw]=SIZES[kind],items=list.filter(c=>c.kind===kind);if(!items.length)continue;
   if(kind==='sot'){
    inst(P,'parts',rb(l,h,w,.08,1),mould('parts'),items.map(c=>({x:c.x,y:h/2+.05,z:c.z,ry:c.turn?Math.PI/2:0})));
    const legs:Item[]=[];for(const c of items){const pts:[number,number,number][]=[[-.95,1,1],[.95,1,1],[0,-1,3]];for(const [a,s] of pts){const lx=c.turn?s*(w/2):a,lz=c.turn?a:s*(w/2);legs.push({x:c.x+lx*(c.turn?1:1),y:.02,z:c.z+lz,ry:c.turn?(s>0?0:Math.PI):(s>0?-Math.PI/2:Math.PI/2)});lands.push({x:c.x+(c.turn?s*1.1:a),z:c.z+(c.turn?a:s*1.1),w:.8,d:.8})}}
    inst(P,'parts',gull(.55,.45,.4,.11,.3),tin('parts'),legs);continue;
   }
   const cap=Math.min(.36,l*.22),bodies:Item[]=[],caps:Item[]=[];
   for(const c of items){const ry=c.turn?Math.PI/2:0,dx=c.turn?0:1,dz=c.turn?1:0;bodies.push({x:c.x,y:h/2+.03,z:c.z,ry});
    for(const s of [-1,1]){caps.push({x:c.x+dx*s*(l/2-cap/2),y:h/2+.03,z:c.z+dz*s*(l/2-cap/2),ry});fillets.push({x:c.x+dx*s*l/2,y:.02,z:c.z+dz*s*l/2,ry:c.turn?(s>0?-Math.PI/2:Math.PI/2):(s>0?0:Math.PI),sx:Math.max(.12,off+pl/2-l/2)*.9,sy:h*.7,sz:w*.9})}}
   const res=kind[0]==='r';inst(P,'parts',rb(l-cap*2+.04,h,w,.04,1),res?alumina:ceramic,bodies);inst(P,'parts',rb(cap,h+.03,w+.03,.05,1),tin('parts'),caps);
   if(res)inst(P,'parts',rb(l-cap*2-.04,.03,w-.06,.01,1),resist,bodies.map(c=>({...c,y:h+.04})));
  }
  inst(P,'parts',fillet,solder('parts'),fillets);
  // The board's own parts under the socket's open centre: a grid of 0805 capacitors on the processor's supply.
  const cav:Item[]=[];for(let i=0;i<4;i++)for(let j=0;j<5;j++)cav.push({x:SOCKET.x-4.5+i*3,y:.5,z:SOCKET.z-5.6+j*2.8,ry:Math.PI/2});
  inst(P,'parts',rb(2,.95,1.25,.05,1),ceramic,cav);inst(P,'parts',rb(.36,1,1.3,.05,1),tin('parts'),cav.flatMap(c=>[{...c,z:c.z-.82},{...c,z:c.z+.82}]));
  // Standby lamp: a 3 mm green LED, legs folded into the board, its dome lit by the 5 V standby rail.
  ledMat=own('parts',new THREE.MeshStandardMaterial({color:0x7fc79a,roughness:.18,transparent:true,opacity:.92,emissive:0x3cff6a,emissiveIntensity:0}));
  const led=b.put(P,'parts',lathe([[0,0],[LED.r+.35,0],[LED.r+.35,.9],[LED.r,1],[LED.r,LED.h-LED.r],...Array.from({length:8},(_,i)=>{const a=(i+1)/8*Math.PI/2;return [Math.cos(a)*LED.r,LED.h-LED.r+Math.sin(a)*LED.r] as [number,number]})],32),ledMat);led.position.set(LED.x,.6,LED.z);
  for(const s of [-1,1])rbox(P,'parts',tin('parts'),LED.x+s*1.27,LED.z,.5,.5,0,.7,.05);
 }

 // ── Chipset and controllers ──
 {
  const C=L.chips;
  // Northbridge: green FC-BGA substrate, glossy bare die with a smear of old thermal paste, land-side capacitors on top.
  const substrate=own('chips',dim(new THREE.MeshStandardMaterial({color:0x1d5232,roughness:.78,roughnessMap:fineT}),.04));
  const balls=(cx:number,cz:number,s:number,n:number)=>{const items:Item[]=[];const p=s/(n+1);for(const i of [0,1,2])for(let k=0;k<n;k++){const t=(k-(n-1)/2)*p;for(const [x,z] of [[t,-s/2+.8+i*p],[t,s/2-.8-i*p],[-s/2+.8+i*p,t],[s/2-.8-i*p,t]])items.push({x:cx+x,y:.18,z:cz+z,sy:.75})}return items};
  inst(C,'chips',new THREE.SphereGeometry(.3,8,6),solder('chips'),balls(NB.x,NB.z,NB.s,30));
  rbox(C,'chips',substrate,NB.x,NB.z,NB.s,NB.s,.4,1.42,.12);
  const die=own('chips',dim(new THREE.MeshPhysicalMaterial({color:0x08080a,roughness:.3,metalness:0,clearcoat:.35,clearcoatRoughness:.35}),.22));
  rbox(C,'chips',die,NB.x+NB.dieOff[0],NB.z+NB.dieOff[1],NB.die[0],NB.die[1],1.42,NB.h,.06);
  // (No paste smear: the photograph shows a clean black die.)
  const capItems:Item[]=[];for(const [dx,dz] of [[-6,-12],[-4.5,-12],[-11,-6],[-11,-4.4],[11,-8],[11,-6.5],[-9,6],[-7.5,9],[9.5,9],[8,11],[2,13],[-2,13],[-13,0],[13,2],[5,-13],[-13.4,8]])capItems.push({x:NB.x+dx,y:1.62,z:NB.z+dz,ry:Math.abs(dx)>10?Math.PI/2:0});
  inst(C,'chips',rb(1,.4,.5,.04,1),own('chips',new THREE.MeshStandardMaterial({color:0xb5a184,roughness:.6})),capItems);
  inst(C,'chips',rb(.24,.42,.52,.04,1),tin('chips'),capItems.flatMap(c=>{const dx=c.ry?0:.38,dz=c.ry?.38:0;return [{...c,x:c.x-dx,z:c.z-dz},{...c,x:c.x+dx,z:c.z+dz}]}));
  decal(C,'chips',packageTop({w:6,d:2.2,lines:['A1'],body:'#264538',ink:'#c9c09a',size:1.2},3),NB.x-13.5,NB.z+14.6,3,1.1,1.42);
  // Southbridge under its heat sink: the same construction, smaller.
  rbox(C,'chips',substrate,SB.x,SB.z,SB.s,SB.s,.4,1.4,.12);rbox(C,'chips',die,SB.x,SB.z,9,9,1.4,SB.h,.06);
  // Leaded packages.
  CHIPS.forEach((c,i)=>{
   const n=at(C,c.x,c.z,c.turn?-Math.PI/2:0),r=leadReach(c),y0=.1,y1=c.h;
   rbox(n,'chips',mould('chips'),0,0,c.w,c.d,y0,y1,c.kind==='qfp'?.12:.18);
   decal(n,'chips',packageTop({w:c.w-.4,d:c.d-.4,lines:c.lines,logo:c.logo,turn:false,pin:[.08,.82]},40+i),0,0,c.w-.4,c.d-.4,y1);
   const h1=c.h*.42,leads:Item[]=[],pads:Item[]=[];
   const row=(nn:number,side:number,alongX:boolean,half:number)=>{for(let k=0;k<nn;k++){const t=(k-(nn-1)/2)*c.pitch;const x=alongX?t:side*half,z=alongX?side*half:t;leads.push({x,y:.02,z,ry:alongX?(side>0?-Math.PI/2:Math.PI/2):(side>0?0:Math.PI)});pads.push({x:x+(alongX?0:side*(r-.25)),y:.03,z:z+(alongX?side*(r-.25):0),sx:alongX?c.pitch*.5:.6,sy:.06,sz:alongX?.6:c.pitch*.5})}};
   if(c.kind==='qfp'){const nS=c.w===c.d?c.n:Math.round(c.n*c.d/c.w);for(const s of [-1,1]){row(c.n,s,true,c.d/2);row(nS,s,false,c.w/2)}}
   else for(const s of [-1,1])row(c.n,s,true,c.d/2);
   inst(n,'chips',gull(r,h1,c.kind==='soic'?.42:.22,.13,c.kind==='qfp'?.4:.5),tin('chips'),leads);inst(n,'chips',pillow,solder('chips'),pads,false);
  });
  // HC-49/S crystals: a steel can lying on a moulded base.
  CRYSTALS.forEach((x,i)=>{rbox(C,'chips',mould('chips'),x.x,x.z,CRYSTAL.w+.6,CRYSTAL.d+.4,0,.5,.2);rbox(C,'chips',steel('chips'),x.x,x.z,CRYSTAL.w,CRYSTAL.d,.5,CRYSTAL.h,CRYSTAL.d/2-.15);
   decal(C,'chips',packageTop({w:6,d:2.4,lines:[x.f,'KDS 6H'],body:'#c4c1bb',ink:'#5a5c60',size:.8},60+i),x.x,x.z,6,2.4,CRYSTAL.h,0,{metal:.8,rough:.4})});
  // The empty CR2032 holder: an open black ring on a floor, a sprung contact tongue in the middle, the side contact at the opening.
  {
   const n=at(C,BATTERY.x,BATTERY.z),r=BATTERY.r,open=BATTERY.open*Math.PI/180,body=plastic('chips',0x18191b,.55);
   const ring=new THREE.Shape();ring.absarc(0,0,r,-Math.PI/2+open/2,Math.PI*1.5-open/2,false);ring.absarc(0,0,r-1.3,Math.PI*1.5-open/2,-Math.PI/2+open/2,true);ring.closePath();
   plate(n,'chips',body,slab(ring,0,BATTERY.h,48));
   b.put(n,'chips',slab((()=>{const s=new THREE.Shape();s.absarc(0,0,r-.6,0,Math.PI*2,false);return s})(),0,.9,48),body);
   // Ribs on the floor, radiating, as the photograph shows.
   inst(n,'chips',rb(.35,.25,7,.05,1),body,Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return {x:Math.sin(a)*5.6,y:1,z:Math.cos(a)*5.6,ry:a}}));
   const spring=tin('chips');for(const s of [-1,1]){const g=new THREE.ExtrudeGeometry(shapeOf([[0,0],[9.5,0],[11,1.1],[11,1.35],[9.4,.3],[0,.3]]),{depth:1.2,bevelEnabled:false});g.rotateY(Math.PI/2);const m=b.put(n,'chips',g,gold('chips'));m.position.set(s*1.4-.6,.95,6.8);m.rotation.y=Math.PI}
   void spring;rbox(n,'chips',tin('chips'),0,r-.4,6.4,1.4,.2,3.6,.2);
  }
 }

 // ── Southbridge heat sink: a ribbed extrusion on two diagonal push pins. ──
 {
  const H=L.heatsink,w=SINK.w,d=SINK.d,y0=SB.h+.15,fins=SINK.fins,pitch=d/fins,ft=pitch*.38;
  const anod=own('heatsink',new THREE.MeshStandardMaterial({color:0xc6c8c9,metalness:.85,roughness:.5,map:alu.map,roughnessMap:alu.relief,bumpMap:alu.relief,bumpScale:.04}));
  // Profile across the fins (z, y), extruded along x.
  const pts:[number,number][]=[[-d/2,0],[d/2,0]];
  for(let i=fins-1;i>=0;i--){const zc=-d/2+pitch*(i+.5);pts.push([zc+ft/2,SINK.base],[zc+ft/2,SINK.h-.25],[zc+ft/2-.2,SINK.h],[zc-ft/2+.2,SINK.h],[zc-ft/2,SINK.h-.25],[zc-ft/2,SINK.base])}
  pts.splice(2,0,[d/2,SINK.base]);pts.push([-d/2,SINK.base]);
  const g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:w,bevelEnabled:false});g.rotateY(Math.PI/2);g.translate(-w/2,0,0);
  // shape x → world −z after the turn, so mirror back to keep the fin order honest.
  const sink=b.put(H,'heatsink',g,anod);sink.position.set(SINK.x,y0,SINK.z);
  rbox(H,'heatsink',own('heatsink',new THREE.MeshStandardMaterial({color:0x9da7ad,roughness:.8})),SB.x,SB.z,10,10,SB.h,y0+.05,.05);
  // Ears to the two push pins, and the pins: white domed heads, split legs through the board, a spring under the head.
  const white=plastic('heatsink',0xe8e6e0,.5);
  for(const p of SINK.pins){
   const ex=p.x-SINK.x,ez=p.z-SINK.z;rbox(H,'heatsink',anod,SINK.x+ex*.82,SINK.z+ez*.82,Math.abs(ex)*.6+6,Math.abs(ez)*.6+6,y0,y0+SINK.base*.8,.6);
   b.put(H,'heatsink',lathe([[0,y0+SINK.base*.8],[3,y0+SINK.base*.8],[3.3,y0+SINK.base*.8+1.2],[2.9,y0+SINK.base*.8+2.4],[1.6,y0+SINK.base*.8+3],[0,y0+SINK.base*.8+3.1]],28),white).position.set(p.x,0,p.z);
   const coil=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:40},(_,i)=>new THREE.Vector3(Math.cos(i*.9)*1.6,-BOARD.t-.4-i*.05,Math.sin(i*.9)*1.6))),120,.18,5);const cm=b.put(H,'heatsink',coil,steel('heatsink'));cm.position.set(p.x,0,p.z);
   cyl(H,'heatsink',white,p.x,p.z,1.2,-BOARD.t-2.6,y0);
  }
 }

 function cyl(p:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,r:number,y0:number,y1:number,seg=24){const m=b.put(p,asm,new THREE.CylinderGeometry(r,r,y1-y0,seg),mat);m.position.set(x,(y0+y1)/2,z);return m}

 // ── CPU socket: LGA775 body and field, the loading mechanism's frame, load plate and lever. ──
 let leverNode!:THREE.Object3D;
 {
  const S=L.socket,n=at(S,SOCKET.x,SOCKET.z),f=SOCKET.field,[cw,cd]=SOCKET.cavity,[bw,bd]=SOCKET.body,body=plastic('socket',0x1f1d1b,.5),st=steel('socket');
  // Moulded body with the open centre, and the contact field on top.
  const outline=rectShape(-bw/2,-bd/2,bw/2,bd/2,.6);outline.holes.push(rectHole(-cw/2,-cd/2,cw/2,cd/2));plate(n,'socket',body,slab(outline,0,3.1,8));
  const fs=rectShape(-f/2,-f/2,f/2,f/2);fs.holes.push(rectHole(-cw/2,-cd/2,cw/2,cd/2));const fg=new THREE.ShapeGeometry(fs);const fp=fg.attributes.position,fu=fg.attributes.uv;for(let i=0;i<fp.count;i++)fu.setXY(i,fp.getX(i)/f+.5,fp.getY(i)/f+.5);
  flat(fg);const field=b.put(n,'socket',fg,own('socket',new THREE.MeshStandardMaterial({map:tex(lgaField(f,SOCKET.cavity)),roughness:.45,metalness:.3,polygonOffset:true,polygonOffsetFactor:-1})),false);field.position.y=3.11;
  // Stiffener frame on the board under the body, steel, with its four rivets.
  const [pw,pd]=SOCKET.plate,pz=SOCKET.plateZ;
  const frameS=rectShape(-pw/2-1.2,-pd/2-pz-1.5,pw/2+1.2,pd/2-pz+.5,.8);frameS.holes.push(rectHole(-bw/2-.2,-bd/2-.2,bw/2+.2,bd/2+.2));plate(n,'socket',st,flat(sheetGeo(frameS,.8)),0,.02,0);
  for(const [x,z] of [[-pw/2-.2,-pd/2+pz-.5],[pw/2+.2,-pd/2+pz-.5],[-pw/2-.2,pd/2+pz],[pw/2+.2,pd/2+pz]])cyl(n,'socket',st,x,z,.9,.6,1.3,16);
  // Load plate, closed: a frame round the field with folded sides, its hinge tabs at the rear and the tongue at the front.
  const lp=rectShape(-pw/2,-pd/2,pw/2,pd/2,1.4);lp.holes.push(rectHole(-f/2-.4,-f/2+pz-1.4,f/2+.4,f/2+pz+1.2));
  const ly=SOCKET.h;plate(n,'socket',st,flat(sheetGeo(lp,.55)),0,ly,pz);
  for(const s of [-1,1]){const side=rectShape(-pd/2+2,-ly+.8,pd/2-2,.2,.4);plate(n,'socket',st,along(sheetGeo(side,.5)),s*(pw/2)-(s>0?.5:0),ly,pz)}
  // Raised lips along the window, pressed into the plate.
  for(const s of [-1,1]){rbox(n,'socket',st,s*(f/2+2.6),pz-.1,1.6,f-2,ly+.4,ly+.9,.3);rbox(n,'socket',st,0,pz+s*(f/2+3.2)-.1,f-2,1.4,ly+.4,ly+.9,.3)}
  for(const s of [-1,1])rbox(n,'socket',st,s*9,-pd/2+pz-.8,6,2.6,ly-.8,ly+.5,.4);
  // The tongue at the front, bent up over the lever's cam.
  const tongue=new THREE.Shape();tongue.moveTo(-6,0);tongue.lineTo(6,0);tongue.lineTo(5,3.6);tongue.lineTo(-5,3.6);tongue.closePath();const tg=flat(sheetGeo(tongue,.55));const tm=plate(n,'socket',st,tg,0,ly,pd/2+pz-1);tm.rotation.x=-.32;
  // Lever: down along the left side, cranked into a cam across the front, the handle curled out at the rear.
  leverNode=b.pivot(n,[SOCKET.leverX,1.6,pd/2+pz+1.4]);
  const lx=0,rod=own('socket',new THREE.MeshStandardMaterial({color:0xd0d3d6,metalness:1,roughness:.24}));
  const pathPts:[number,number,number][]=[[pw+1,0,0],[pw*.6,0,0],[pw*.6-1,.6,-.4],[pw*.5,.6,-.4],[pw*.5-1,0,0],[2,0,0],[0,0,-1.5],[lx,.3,-8],[lx,1.8,-pd+6],[lx,2.2,-pd],[lx-1.4,2.6,-pd-2.6],[lx-5,3,-pd-2.4],[lx-7,3.2,-pd+1],[lx-7.4,3.4,-pd+8]];
  b.wire(leverNode,'socket',rod,pathPts,.85);
 }

 // ── Slots ──
 {
  const S=L.slots,colours={white:0xe9e3d4,black:0x18191b,yellow:0xe0b62a},windows={white:'#2a2620',black:'#050505',yellow:'#2a2010'};
  const slotMesh=(s:Slot,pitch:number,n:number)=>{
   const len=s.z1-s.z0,cz=(s.z0+s.z1)/2,colour=colours[s.colour],side=plastic('slots',colour,s.colour==='black'?.45:.55);
   const top=own('slots',new THREE.MeshStandardMaterial({map:tex(slotTop({len,w:s.w,pitch,n,keys:s.key,colour:'#'+new THREE.Color(colour).getHexString(),window:windows[s.colour],channel:'#0a0a0a'})),roughness:s.colour==='black'?.45:.55}));
   const g=new THREE.BoxGeometry(len,s.h-.6,s.w);const m=new THREE.Mesh(g,[side,side,top,side,side,side]);m.rotation.y=Math.PI/2;m.position.set(s.x,(s.h-.6)/2+.3,cz);b.adopt(S,'slots',m);
   // Raised ends with the mounting ears, and the standoff feet.
   for(const z of [s.z0+1.4,s.z1-1.4])rbox(S,'slots',side,s.x,z,s.w+.4,2.8,0,s.h,.3);
   for(const z of [s.z0+4,s.z1-4])for(const sd of [-1,1])rbox(S,'slots',side,s.x+sd*(s.w/2+.6),z,1.4,3,0,2.2,.3);
  };
  for(const s of SLOTS)slotMesh(s,s.colour==='white'&&s.id==='PCI1'?1.27:1,s.id==='PCI1'?60:s.id==='PCIEX16'?82:18);
  // The ×16 slot's latch: a black arm off the front end, hooked to catch the card.
  {const side=plastic('slots',colours.black,.45),z0=PCIE16.z1;rbox(S,'slots',side,LATCH16.x,z0+LATCH16.len/2,2,LATCH16.len,1.2,4.2,.4);rbox(S,'slots',side,LATCH16.x,z0+1.5,PCIE16.w*.6,3,0,PCIE16.h+1.2,.4);
   const hook=rbox(S,'slots',side,LATCH16.x-.6,z0+LATCH16.len-1.4,3.2,2.8,1,6.2,.6);hook.rotation.y=.2}
 }

 // ── Memory sockets ──
 const latches:THREE.Object3D[]=[];
 {
  const M=L.memory,yellow=plastic('memory',0xe2b625,.5),white=plastic('memory',0xece9e0,.5),len=DIMM.x1-DIMM.x0,cx=(DIMM.x0+DIMM.x1)/2,body=len-DIMM.tower*2;
  const top=own('memory',new THREE.MeshStandardMaterial({map:tex(slotTop({len:body,w:DIMM.w,pitch:1,n:DIMM.pins,keys:[DIMM.key-DIMM.x0-DIMM.tower],colour:'#e2b625',window:'#1d150a',channel:'#120c04',start:3},12)),roughness:.5}));
  for(const d of DIMMS){
   const g=new THREE.BoxGeometry(body,DIMM.h-.6,DIMM.w),bm=new THREE.Mesh(g,[yellow,yellow,top,yellow,yellow,yellow]);bm.position.set(cx,(DIMM.h-.6)/2+.3,d.z);b.adopt(M,'memory',bm);
   for(const s of [-1,1]){
    const tx=cx+s*(body/2+DIMM.tower/2);rbox(M,'memory',yellow,tx,d.z,DIMM.tower,DIMM.w+.6,0,DIMM.h+1.6,.5);
    rbox(M,'memory',dark('memory'),tx-s*.6,d.z,DIMM.tower-2.4,1.6,DIMM.h,DIMM.h+1.62,.1);
    // The latch, swung open outward about its foot.
    const pv=b.pivot(M,[cx+s*(len/2),.8,d.z]);pv.rotation.z=-s*.95;latches.push(pv);
    rbox(pv,'memory',white,s*.2,0,2.6,DIMM.w-.6,0,13.5,.4);rbox(pv,'memory',white,s*1.6,0,3.8,DIMM.w-.2,11.2,14.4,.6);rbox(pv,'memory',white,-s*1.1,0,1.2,3.2,8,12.5,.3);
   }
  }
 }

 // ── Power, storage and pin headers ──
 {
  const C=L.connectors,nylon=plastic('connectors',0xe4ddcc,.6),pinItems:Item[]=[];
  // Mini-Fit housings: a moulded block with square cells, a latch rib on the edge side, a tin post in each cell.
  const minifit=(x:number,z:number,cols:number,rows:number,pitch:number,h:number)=>{
   const w=cols*pitch+1.4,d=rows*pitch+1.6,s=rectShape(-w/2,-d/2,w/2,d/2,.4);
   for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const cx=(i-(cols-1)/2)*pitch,cz=(j-(rows-1)/2)*pitch;s.holes.push(rectHole(cx-1.65,-cz-1.65,cx+1.65,-cz+1.65));pinItems.push({x:x+cx,y:h-5.5,z:z+cz})}
   plate(C,'connectors',nylon,slab(s,1.6,h,6),x,0,z);rbox(C,'connectors',nylon,x,z,w,d,0,1.7,.3);rbox(C,'connectors',dark('connectors'),x,z,w-1.2,d-1.2,1.6,1.78,.05);
   rbox(C,'connectors',nylon,x,z+d/2+.6,4.6,1.4,h-5,h-.6,.3);rbox(C,'connectors',nylon,x,z+d/2+.3,6,.8,1.6,h-5,.2);
  };
  minifit(ATX24.x,ATX24.z,ATX24.cols,ATX24.rows,ATX24.pitch,ATX24.h);minifit(ATX4.x,ATX4.z,ATX4.cols,ATX4.rows,ATX4.pitch,ATX4.h);
  inst(C,'connectors',new THREE.BoxGeometry(3.2,1,3.2),plastic('connectors',0x2a2620,.8),pinItems.map(p=>({...p,y:(p.y+5.5-1.6)/2+.6,sy:p.y+5.5-3.2})));
  inst(C,'connectors',rb(.64,9,.64,.05,1),tin('connectors'),pinItems);
  // Right-angle IDE: the shroud lies along the front edge, mouth outward, the key notch cut in its top wall; forty pins bend down behind it.
  {
   const blue=plastic('connectors',0x1268b8,.5),x=IDE.x,w=IDE.w,z0=IDE.shroudZ,z1=z0+IDE.d,h=IDE.h,t=1.1;
   rbox(C,'connectors',blue,x,(z0+z1)/2,w,IDE.d,0,t,.2);rbox(C,'connectors',blue,x,z0+t/2,w,t,0,h,.2);
   for(const s of [-1,1]){rbox(C,'connectors',blue,x+s*(w/2-t/2),(z0+z1)/2,t,IDE.d,0,h,.2);rbox(C,'connectors',blue,x+s*(w/4+2.4/2),(z0+z1)/2,w/2-2.4,IDE.d,h-t,h,.2)}
   rbox(C,'connectors',dark('connectors'),x,(z0+z1)/2+.6,w-t*2,IDE.d-t-.6,t,h-t,.05);
   const pins:Item[]=[],tails:Item[]=[];
   for(let i=0;i<20;i++)for(let j=0;j<2;j++){const px=x+(i-9.5)*IDE.pitch,py=2.4+j*2.54;pins.push({x:px,y:py,z:(z0+z1)/2+1});tails.push({x:px,y:py/2,z:IDE.pinZ-j*2.54+1.27,sy:py+BOARD.t+1.4});tails.push({x:px,y:py,z:(IDE.pinZ-j*2.54+1.27+z0)/2,rx:Math.PI/2,sy:z0-(IDE.pinZ-j*2.54+1.27)+.3})}
   inst(C,'connectors',rb(.64,.64,IDE.d-1,.05,1),gold('connectors'),pins);
   inst(C,'connectors',new THREE.BoxGeometry(.64,1,.64),gold('connectors'),tails.map(t2=>({...t2,y:t2.rx?t2.y:t2.y-BOARD.t/2-.7})));
   for(const [a,c] of [[-1.6,.3],[1.6,.3]])rbox(C,'connectors',gold('connectors'),x+a,z0+IDE.d/2,.5,.5,h-t-.1,h-.2,.05).scale.set(1,1,c*10);
  }
  // Vertical SATA headers: red shroud with its L-shaped mouth, the contact tongue inside.
  {const red=plastic('connectors',0xd23b33,.5),[w,d,h]=[SATA_SIZE.w,SATA_SIZE.d,SATA_SIZE.h];
   for(const s of SATA){const sh=rectShape(-w/2,-d/2,w/2,d/2,.5);sh.holes.push(pathOf([[-w/2+.9,-d/2+.9],[-w/2+.9,d/2-.9],[w/2-.9,d/2-.9],[w/2-.9,d/2-3.2],[-.2,d/2-3.2],[-.2,-d/2+.9]]));
    plate(C,'connectors',red,slab(sh,1.2,h,6),s.x,0,s.z);rbox(C,'connectors',red,s.x,s.z,w,d,0,1.3,.4);
    rbox(C,'connectors',red,s.x+.6,s.z-.6,1.1,d-4.6,1.2,h-1.4,.2);
    inst(C,'connectors',rb(.06,h-3.4,.6,.02,1),gold('connectors'),Array.from({length:7},(_,i)=>({x:s.x+1.18,y:(h-3.4)/2+1.6,z:s.z-.6+(i-3)*1.27})))}}
  // Fan headers: three tin posts in a white base with its friction-lock wall.
  for(const f of FANS){rbox(C,'connectors',nylon,f.x,f.z,FAN_SIZE.w,FAN_SIZE.d,0,3,.4);rbox(C,'connectors',nylon,f.x,f.z+FAN_SIZE.d/2-.5,FAN_SIZE.w,1,0,FAN_SIZE.h,.3);for(const s of [-1,1])rbox(C,'connectors',nylon,f.x+s*(FAN_SIZE.w/2-.45),f.z,.9,FAN_SIZE.d,0,5.6,.2);
   inst(C,'connectors',rb(.64,8.4,.64,.05,1),tin('connectors'),[-1,0,1].map(i=>({x:f.x+i*2.54,y:4.2-1.2,z:f.z-.6})))}
  // Pin headers: a coloured cell under each pin, gold pins, shrouds and jumper caps.
  const goldPins:Item[]=[];
  for(const h of HEADERS){
   const n=at(C,h.x,h.z,h.turn?-Math.PI/2:0),cell=plastic('connectors',h.colour,.55),cells:Item[]=[];
   for(let i=0;i<h.cols;i++)for(let j=0;j<h.rows;j++){const lx=(i-(h.cols-1)/2)*2.54,lz=(j-(h.rows-1)/2)*2.54;cells.push({x:lx,y:1.27,z:lz});
    const c=Math.cos(h.turn?-Math.PI/2:0),s2=Math.sin(h.turn?-Math.PI/2:0);goldPins.push({x:h.x+lx*c+lz*s2,y:0,z:h.z-lx*s2+lz*c})}
   inst(n,'connectors',rb(2.5,2.54,2.5,.25,2),cell,cells);
   if(h.shroud){const w=h.cols*2.54+1.6,d=h.rows*2.54+1.6;for(const s of [-1,1]){rbox(n,'connectors',cell,0,s*(d/2-.4),w,.8,0,8.6,.2);rbox(n,'connectors',cell,s*(w/2-.4),0,.8,d,0,8.6,.2)}}
   if(h.jumper){const jx=(h.jumper.at-(h.cols-1)/2+.5)*2.54;rbox(n,'connectors',plastic('connectors',h.jumper.colour,.45),jx,0,5,2.5,2.6,8.4,.4)}
  }
  const q=.64/Math.SQRT2,pin=lathe([[0,-BOARD.t-1.6],[q,-BOARD.t-1.6],[q,8.6],[q*.4,9.1],[0,9.1]],4);pin.rotateY(Math.PI/4);
  inst(C,'connectors',faceted(pin),gold('connectors'),goldPins);
 }

 // ── Rear I/O ──
 {
  const IOn=L.io,st=once('shell','io',()=>dim(new THREE.MeshStandardMaterial({color:0xa9a093,metalness:.85,roughness:.42,map:alu.map,roughnessMap:alu.relief}),.5)),fz=EDGE_Z-IO_PROUD;
  for(const io of IO){
   const n=at(IOn,io.x,fz),w=io.w,d=io.d,h=io.h;
   if(io.kind==='lan'||io.kind==='ps2'||io.kind==='audio'){
    // A stamped shell: top, sides, back, and a front plate with the openings.
    const t=.32,front=rectShape(-w/2,0,w/2,h,.3);
    const holes:THREE.Path[]=[];
    if(io.kind==='lan'){holes.push(rectHole(-7.3,17.2,7.3,29.4),rectHole(-6.6,9.4,6.6,15.2),rectHole(-6.6,2.2,6.6,8)) }
    if(io.kind==='ps2'){holes.push(roundHole(0,6.6,4.9),roundHole(0,19.4,4.9))}
    if(io.kind==='audio'){holes.push(rectHole(-w/2+1.4,1,w/2-1.4,h*.62))}
    front.holes.push(...holes.map(p=>{const pts=p.getPoints(24);return pathOf(pts.reverse().map(v=>[v.x,v.y]))}));
    plate(n,'io',st,sheetGeo(front,t),0,0,0);
    // The shell's top covers the front of the jack; the moulded body shows behind it (as photographed for the audio and LAN stacks).
    const cover=io.kind==='ps2'?d:d*.58,topS=rectShape(-w/2,-cover,w/2,0,.3);plate(n,'io',st,flat(sheetGeo(topS,t)),0,h-t,0);
    for(const s of [-1,1]){const side=rectShape(0,0,io.kind==='ps2'?d:d*.58,h-.1);plate(n,'io',st,sheetGeo(side,t).rotateY(-Math.PI/2),s*(w/2)+(s<0?t:0),0,0)}
    if(io.kind==='ps2'){const back=rectShape(-w/2,h*.45,w/2,h-.1);plate(n,'io',st,sheetGeo(back,t),0,0,d-t)}
    // Ground fingers pressed out of the top.
    for(const x of [-w*.3,w*.3]){const fg=rbox(n,'io',st,x,1.6,1.4,3.2,h,h+.3,.2);fg.rotation.x=-.12}
    const inner=plastic('io',0x16171a,.6);rbox(n,'io',inner,0,d/2+.4,w-1,d-1.4,0,h-.6,.3);if(io.kind!=='ps2')rbox(n,'io',inner,0,d*.79,w-.2,d*.42,0,h-1.2,.6);
    for(const x of [-w/2+1.2,w/2-1.2])for(const z of [3,d-3])rbox(n,'io',tin('io'),x,z,1.2,.4,-BOARD.t-1.2,.5,.05);
    if(io.kind==='lan'){
     // RJ45 mouth (keyed) above the two USB mouths, each USB with its tongue and four contacts.
     rbox(n,'io',dark('io'),0,6,14,11,17.4,29.2,.2);rbox(n,'io',inner,0,4,6,1.2,17.4,19,.1);
     inst(n,'io',rb(.5,.2,6,.06,1),gold('io'),Array.from({length:8},(_,i)=>({x:(i-3.5)*1.02,y:28.3,z:5.4,rx:.25})));
     for(const y of [2.2,9.4]){rbox(n,'io',dark('io'),0,6,13,11,y+.2,y+5.6,.2);rbox(n,'io',inner,0,4.6,11,9,y+.6,y+2.4,.15);for(const x of [-3.5,-1,1,3.5])rbox(n,'io',gold('io'),x,3.6,.9,6,y+2.42,y+2.52,.03)}
    }
    if(io.kind==='ps2'){
     // Keyboard (purple) below, mouse (green) above, as photographed.
     for(const [y,col] of [[6.6,'#7a5fc9'],[19.4,'#3aa978']] as [number,string][]){
      const disc=b.put(n,'io',new THREE.CircleGeometry(4.85,40),own('io',new THREE.MeshStandardMaterial({map:tex(dinFace(col)),roughness:.5})),false);disc.position.set(0,y,1.2);disc.rotation.y=Math.PI;
      b.put(n,'io',new THREE.CylinderGeometry(4.9,4.9,1.2,40,1,true).rotateX(Math.PI/2),own('io',new THREE.MeshStandardMaterial({color:new THREE.Color(col).multiplyScalar(.6),roughness:.75,side:THREE.DoubleSide}))).position.set(0,y,.6);
     }
     decal(n,'io',{map:ps2Sticker()},0,d*.45,10.5,10,h+.02,Math.PI);
    }
    if(io.kind==='audio'){
     // Three jacks, blue (line in) on top, green (line out), pink (microphone) at the bottom, as photographed.
     for(const [y,col] of [[13.4,0x58b2e6],[8.4,0x9fd28a],[3.5,0xe88ab0]] as [number,number][]){
      const ring=b.put(n,'io',lathe([[1.8,0],[3,0],[3.1,.4],[3.1,2.4],[2.6,2.6],[1.8,2.6]],32).rotateX(-Math.PI/2),plastic('io',col,.35));ring.position.set(0,y,0);
      const hole=b.put(n,'io',new THREE.CircleGeometry(1.8,24),dark('io'),false);hole.position.set(0,y,-.9);hole.rotation.y=Math.PI;
     }
     rbox(n,'io',inner,0,2,w-2,4,0,h*.62,.3);
    }
   }else{
    // D-sub: a steel flange with the trapezoid shell, hex standoffs, the coloured insulator behind and its board brackets.
    const vga=io.kind==='vga',colour=vga?0x1650c4:0x0b7c82,body=dim(new THREE.MeshStandardMaterial({color:colour,roughness:.75,roughnessMap:grainT,bumpMap:grainT,bumpScale:.02}),.12);own('io',body);
    const nickel=once('nickel','io',()=>dim(new THREE.MeshStandardMaterial({color:0x8c8a85,metalness:1,roughness:.48,map:alu.map,roughnessMap:alu.relief}),.42));
    const fh=12.5,fy=.6,cy=fy+fh/2,mouth=vga?[16.9,8.4]:[16.3,8.4];
    const fl=rectShape(-w/2,fy,w/2,fy+fh,.8);fl.holes.push(roundHole(-12.5,cy,1.6),roundHole(12.5,cy,1.6));
    const tr=(mw:number,mh:number,o=0):[number,number][]=>[[-mw/2-o,cy+mh/2+o],[mw/2+o,cy+mh/2+o],[mw/2-1.6+o*.8,cy-mh/2-o],[-mw/2+1.6-o*.8,cy-mh/2-o]];
    fl.holes.push(pathOf(tr(mouth[0],mouth[1],.5).reverse()));
    plate(n,'io',nickel,sheetGeo(fl,.5),0,0,-.5);
    // The drawn shell round the mouth: a wall .5 thick standing 6 mm proud, with its rolled lip and two pressed dimples on top.
    const shell=shapeOf(tr(mouth[0],mouth[1],.5));shell.holes.push(pathOf(tr(mouth[0],mouth[1],0).reverse()));
    plate(n,'io',nickel,new THREE.ExtrudeGeometry(shell,{depth:6,bevelEnabled:true,bevelThickness:.15,bevelSize:.15,bevelSegments:2}),0,0,-6.3);
    for(const x of [-3,3]){const dp=b.put(n,'io',new THREE.SphereGeometry(.9,14,8,0,Math.PI*2,0,Math.PI/2),nickel);dp.position.set(x,cy+mouth[1]/2+.45,-3.4);dp.scale.set(1,.45,1.3)}
    // The insulator face: female VGA stands flush in the shell with fifteen holes; male serial is recessed, nine gold pins standing out of it.
    const insert=shapeOf(tr(mouth[0]-.1,mouth[1]-.1)),ig=new THREE.ExtrudeGeometry(insert,{depth:vga?5.4:2.6,bevelEnabled:false});plate(n,'io',body,ig,0,0,vga?-5.9:-3.1);
    face(n,'io',dsubFace(vga?[5,5,4]:[5,4],vga,vga?'#1846b8':'#0e5560'),0,cy,vga?-5.92:-3.12,mouth[0]-1.6,mouth[1]-.8,Math.PI,{rough:.4});
    if(!vga)inst(n,'io',new THREE.CylinderGeometry(.5,.5,3.6,10).rotateX(Math.PI/2),gold('io'),[...[-2,-1,0,1,2].map(i=>({x:i*2.77,y:cy+1.42,z:-4.6})),...[-1.5,-.5,.5,1.5].map(i=>({x:i*2.77,y:cy-1.42,z:-4.6}))]);
    // Turned standoffs (4-40 threads), round with a chamfered nose.
    for(const sd of [-1,1]){const post=b.put(n,'io',lathe([[1.3,0],[2.4,0],[2.4,4.6],[2.1,5.2],[1.3,5.2]],24).rotateX(-Math.PI/2),nickel);post.position.set(sd*12.5,cy,-.5);
     const bore=b.put(n,'io',new THREE.CircleGeometry(1.3,16),dark('io'),false);bore.position.set(sd*12.5,cy,-5.6);bore.rotation.y=Math.PI}
    // Moulded body behind the flange, stepped as photographed: a low full-width base and a raised centre.
    rbox(n,'io',body,0,d/2+.2,w-1.2,d-.4,0,fh*.62,.5);rbox(n,'io',body,0,d/2+.2,mouth[0]+5,d-.4,0,fh*.98,.6);
    for(const sd of [-1,1]){rbox(n,'io',nickel,sd*(w/2-1.8),5,3.6,9,0,.5,.1);rbox(n,'io',nickel,sd*(w/2-1.8),9.4,3.6,.5,0,fh*.6,.1);rbox(n,'io',tin('io'),sd*(w/2-1.8),7,1.4,.5,-BOARD.t-1.4,.4,.05)}
   }
  }
 }

 // ── Capacitors, chokes and MOSFETs ──
 let chokeCopper!:THREE.MeshStandardMaterial;
 {
  const W=L.power;chokeCopper=copper('power');
  // Enamelled windings: each turn a slightly different tone, a few dulled toward brown oxide, as on the photographed toroids.
  const winding=own('power',new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:1,roughness:.4}));
  const tone=(g:THREE.TubeGeometry,turns:number,seed:number)=>{const p=g.parameters,ring=p.radialSegments+1,n=p.tubularSegments+1,col=new Float32Array(n*ring*3),base=new THREE.Color(0xc97a42),ox=new THREE.Color(0x7a4a2a),c=new THREE.Color();
   let r=seed;const rnd=()=>{r=(r*16807)%2147483647;return r/2147483647};const per=Array.from({length:turns+1},()=>({k:.86+rnd()*.22,o:rnd()<.25?.25+rnd()*.3:rnd()*.12}));
   for(let i=0;i<n;i++){const t=per[Math.min(turns,Math.floor(i/n*turns))];c.copy(base).lerp(ox,t.o).multiplyScalar(t.k);for(let j=0;j<ring;j++)c.toArray(col,(i*ring+j)*3)}
   g.setAttribute('color',new THREE.BufferAttribute(col,3));return g};
  const capTopT=tex(capTop()),sleeves={black:tex(sleeve('#1b1c1f','#7c7f86','1000µF 6.3V')),purple:tex(sleeve('#3b2b55','#a69cc0','1500µF 6.3V'))};
  const geos=new Map<string,THREE.BufferGeometry>();
  const can=(d:number,h:number)=>{const k=d+':'+h;let g=geos.get(k);if(!g){const r=d/2;g=lathe([[0,0],[r-.3,0],[r,.4],[r,h-.7],[r-.12,h-.55],[r-.2,h-.25],[r-.02,h-.12],[r-.12,h],[0,h]],40);geos.set(k,g)}return g};
  const sleeveMats={black:own('power',new THREE.MeshPhysicalMaterial({map:sleeves.black,roughness:.35,clearcoat:.5,clearcoatRoughness:.3})),purple:own('power',new THREE.MeshPhysicalMaterial({map:sleeves.purple,roughness:.35,clearcoat:.5,clearcoatRoughness:.3}))};
  const top=own('power',dim(new THREE.MeshStandardMaterial({map:capTopT,metalness:.9,roughness:.48,roughnessMap:fineT}),.32));
  const bung=own('power',new THREE.MeshStandardMaterial({color:0x2c2d30,roughness:.9}));
  const place=(c:Ecap,mat:Mat,topMat:Mat,turn:number)=>{const m=b.put(W,'power',can(c.d,c.h),mat);m.position.set(c.x,.35,c.z);m.rotation.y=turn;
   const tg=new THREE.CircleGeometry(c.d/2-(topMat===top?.55:.25),32);tg.rotateX(-Math.PI/2);const tm=b.put(W,'power',tg,topMat,false);tm.position.set(c.x,c.h+.36,c.z);tm.rotation.y=turn;cyl(W,'power',bung,c.x,c.z,c.d/2-.2,0,.4,24)};
  ECAPS.forEach((c,i)=>place(c,sleeveMats[c.sleeve],top,(i*2.1)%6.28));
  const alum=own('power',new THREE.MeshStandardMaterial({color:0xc9cbcd,metalness:1,roughness:.3,map:alu.map})),sTop=own('power',new THREE.MeshStandardMaterial({map:tex(solidTop()),roughness:.4,metalness:.2})),band=own('power',new THREE.MeshStandardMaterial({map:tex(solidSleeve()),roughness:.4}));
  SOLIDS.forEach((c,i)=>{place(c,alum,sTop,Math.PI*.15+i*.0);const s=b.put(W,'power',new THREE.CylinderGeometry(c.d/2+.05,c.d/2+.05,c.h*.42,40,1,true),band);s.position.set(c.x,.35+c.h*.74,c.z);s.rotation.y=Math.PI*.15});
  // Toroids: a dark ferrite ring with copper wound through it, two leads into the board.
  const ferrite=own('power',new THREE.MeshStandardMaterial({color:0x2a2b2e,roughness:.55}));
  for(const t of TOROIDS){
   const n=at(W,t.x,t.z),R=(t.od+t.id)/4,tube=(t.od-t.id)/4,core=new THREE.TorusGeometry(R,tube,16,48);core.scale(1,1,t.t/2/tube);
   const pts:THREE.Vector3[]=[],span=Math.PI*1.72,turns=t.turns,steps=turns*24;
   for(let i=0;i<=steps;i++){const a=-span/2+span*i/steps+Math.PI/2,phi=i/steps*turns*Math.PI*2,rr=tube+.6,zz=t.t/2+.6;pts.push(new THREE.Vector3(Math.cos(a)*(R+Math.cos(phi)*rr),Math.sin(a)*(R+Math.cos(phi)*rr),Math.sin(phi)*zz))}
   const wire=tone(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),steps*2,.58,7),turns,Math.round(t.x*100+t.z*7)+999);
   const holder=b.pivot(n,t.upright?[0,t.od/2+.4,0]:[0,t.t/2+.5,0]);if(!t.upright)holder.rotation.x=-Math.PI/2;
   b.put(holder,'power',core,ferrite);b.put(holder,'power',wire,winding);
   const ends=[pts[0],pts[pts.length-1]];for(const e of ends){const w2=new THREE.Vector3().copy(e);holder.localToWorld(w2);n.worldToLocal(w2);b.wire(n,'power',chokeCopper,[[w2.x,w2.y,w2.z],[w2.x*1.05,w2.y*.5,w2.z],[w2.x*1.08,-BOARD.t-.8,w2.z]],.42)}
  }
  // Drum choke on a black bobbin with a red-dotted cap; a small green inductor.
  {const n=at(W,ROD.x,ROD.z),bob=plastic('power',0x18191b,.5);cyl(n,'power',bob,0,0,ROD.d/2,0,1.2,32);cyl(n,'power',bob,0,0,ROD.d/2-.6,ROD.h-1.6,ROD.h,32);cyl(n,'power',ferrite,0,0,2,1,ROD.h-1.5,24);
   const pts:THREE.Vector3[]=[];for(let i=0;i<=17*20;i++){const a=i/20*Math.PI*2,y=1.6+i/(17*20)*(ROD.h-3.6);pts.push(new THREE.Vector3(Math.cos(a)*(ROD.d/2-.55),y,Math.sin(a)*(ROD.d/2-.55)))}
   b.put(n,'power',tone(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),17*30,.46,6),17,4242),winding);
   const dot=b.put(n,'power',new THREE.CircleGeometry(.8,20).rotateX(-Math.PI/2),plastic('power',0xc8302a,.4),false);dot.position.set(-.4,ROD.h+.01,.4)}
  {const n=at(W,GREEN.x,GREEN.z);b.put(n,'power',lathe([[0,0],[GREEN.d/2,0],[GREEN.d/2,GREEN.h-1],[GREEN.d/2-.6,GREEN.h-.2],[0,GREEN.h]],28),plastic('power',0x2f8f52,.4)).position.y=.4}
  // D-PAKs: moulded body, tinned tab soldered at the back, two leads out the front.
  for(const q of DPAKS){
   const n=at(W,q.x,q.z,RY[q.out]);rbox(n,'power',mould('power'),0,0,DPAK.d,DPAK.w,.1,DPAK.h,.15);
   rbox(n,'power',tin('power'),-DPAK.d/2-.5,0,1.4,DPAK.tab,.02,.55,.08);rbox(n,'power',tin('power'),-.4,0,DPAK.d-1,DPAK.tab,.02,.12,.05);
   decal(n,'power',packageTop({w:DPAK.d-.6,d:DPAK.w-.6,lines:['P45N02','LD 616'],turn:true},80),0,0,DPAK.d-.6,DPAK.w-.6,DPAK.h);
   inst(n,'power',gull(2.4,.7,.75,.2,.9),tin('power'),[-2.28,2.28].map(z=>({x:DPAK.d/2,y:.02,z})));
  }
 }

 return {latches,lever:leverNode,ledMat,chokeCopper,boardFaces,dimmed};
}
