// P5GPL-X SE geometry. Every layer's origin is the board's top face at its centre: [0, TOP, 0]. Plan positions come from
// layout.ts through X(u) and Z(v). Moulded parts are rounded so their edges catch the light, stamped steel is cut from sheet
// with real openings, and repeated parts (contacts, pins, caps, passives, fins) are instanced.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Builder} from '../kit/builder';
import {roundPlate,slab,lathe} from '../kit/builder';
import type {AssemblyId} from './model';
import {BOARD,TOP,X,Z,MOUNTS,COOLER,PLAIN,MOUNT,SOCKET,NB,PINS,ICH,DIMM,DIMMS,SLOTS,SLOT,X16_ARM,WIRE,ATX24,ATX12V,FLOPPY,IDE,SATA,SATA_BODY,FAN,
 HEADERS,HEADER,JUMPERS,LED,IO,IO_FACE,QFPS,SOICS,DPAKS,DPAK,BIOS,BATTERY,CRYSTALS,AXIAL,CAPS,TOROIDS,EDGE_TOROID,DRUM,ROD,FILMS,passives,SIZES,type Box} from './layout';
import {winding,boardTiles,boardUnder,edgeTexture,grain,brushed,packageTop,ichTop,lptLabel,yellowSticker,biosLabel,contactField,sleeve,capTop,slotTop,stamp} from './textures';

type Mat=THREE.Material;
type Item={x:number;y:number;z:number;ry?:number;rx?:number;rz?:number;sx?:number;sy?:number;sz?:number;c?:string|number};

export function buildBoard(b:Builder){
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t) as T;
 const own=<T extends Mat>(asm:AssemblyId,m:T)=>b.m.own(asm,m);
 const base:[number,number,number]=[0,TOP,0];
 const ids:AssemblyId[]=['heatsink','socket','memory','slots','power','io','power-parts','chips','parts','board'];
 const L=Object.fromEntries(ids.map(id=>[id,b.layer(id,[0,0,0],base)])) as Record<AssemblyId,THREE.Group>;

 // ── Finishes, one per assembly ──
 const windingT=tex(winding());windingT.repeat.set(16,1);const grainT=tex(grain(9)),fineT=tex(grain(4,170,26));grainT.repeat.set(3,3);fineT.repeat.set(2,2);
 const steelT=brushed(3,'#d3d1cb',150),aluT=brushed(7,'#b8b9b6',125);
 for(const t of [steelT.map,steelT.relief])tex(t).repeat.set(1/20,1/20);for(const t of [aluT.map,aluT.relief])tex(t).repeat.set(1/30,1/30);
 const cache=new Map<string,Mat>();
 const once=<T extends Mat>(key:string,asm:AssemblyId,make:()=>T)=>{let m=cache.get(asm+':'+key);if(!m){m=own(asm,make());cache.set(asm+':'+key,m)}return m as T};
 const mirrors:THREE.MeshPhysicalMaterial[]=[];
 // Tin-plated steel: brushed, a little warm. UVs on extruded sheet are in millimetres, hence the small repeat.
 const steel=(asm:AssemblyId,tint=0xdad8d2)=>once('steel'+tint,asm,()=>{const m=new THREE.MeshPhysicalMaterial({color:tint,map:steelT.map,metalness:1,roughness:1,roughnessMap:steelT.relief,bumpMap:steelT.relief,bumpScale:.015});mirrors.push(m);return m});
 const tin=(asm:AssemblyId)=>once('tin',asm,()=>new THREE.MeshStandardMaterial({color:0xbfc0bd,metalness:1,roughness:.48}));
 const gold=(asm:AssemblyId)=>once('gold',asm,()=>new THREE.MeshStandardMaterial({color:0xcfae62,metalness:1,roughness:.45}));
 const plastic=(asm:AssemblyId,colour:number,key:string,rough=1)=>once('plastic'+key,asm,()=>new THREE.MeshStandardMaterial({color:colour,roughness:rough,roughnessMap:grainT,bumpMap:grainT,bumpScale:.03}));
 // Glossy moulded plastics: slots, sockets, connectors (the photo shows soft highlights on them).
 const moulded=(asm:AssemblyId,colour:number,key:string,rough=.55)=>once('moulded'+key,asm,()=>new THREE.MeshPhysicalMaterial({color:colour,roughness:rough,roughnessMap:fineT,bumpMap:fineT,bumpScale:.02,clearcoat:.08,clearcoatRoughness:.75,sheen:.25,sheenRoughness:.6,sheenColor:new THREE.Color(colour).lerp(new THREE.Color(0xffffff),.35)}));
 const mould=(asm:AssemblyId)=>once('mould',asm,()=>new THREE.MeshStandardMaterial({color:0x1c1d1f,roughness:.88,roughnessMap:fineT,bumpMap:fineT,bumpScale:.015}));
 const dark=(asm:AssemblyId)=>once('dark',asm,()=>new THREE.MeshStandardMaterial({color:0x0e0e0f,roughness:.9}));

 // ── Shape helpers ──
 const rb=(w:number,h:number,d:number,r=.15,seg=2)=>new RoundedBoxGeometry(w,h,d,seg,Math.max(.01,Math.min(r,w/2-.005,h/2-.005,d/2-.005)));
 const rbox=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y0:number,y1:number,r=.15)=>{const m=b.put(parent,asm,rb(w,y1-y0,d,r),mat);m.position.set(x,(y0+y1)/2,z);return m};
 const at=(parent:THREE.Object3D,x:number,z:number,turn=0,y=0)=>{const n=b.pivot(parent,[x,y,z]);n.rotation.y=turn;return n};
 const rectShape=(x0:number,y0:number,x1:number,y1:number,r=0)=>{const s=new THREE.Shape();if(r<=0){s.moveTo(x0,y0);s.lineTo(x1,y0);s.lineTo(x1,y1);s.lineTo(x0,y1);s.closePath();return s}
  s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.absarc(x1-r,y0+r,r,-Math.PI/2,0,false);s.lineTo(x1,y1-r);s.absarc(x1-r,y1-r,r,0,Math.PI/2,false);s.lineTo(x0+r,y1);s.absarc(x0+r,y1-r,r,Math.PI/2,Math.PI,false);s.lineTo(x0,y0+r);s.absarc(x0+r,y0+r,r,Math.PI,Math.PI*1.5,false);return s};
 const pathOf=(pts:[number,number][])=>new THREE.Path(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const shapeOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const rectHole=(x0:number,y0:number,x1:number,y1:number)=>pathOf([[x0,y0],[x0,y1],[x1,y1],[x1,y0]]);
 const roundHole=(x:number,y:number,r:number)=>{const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,true);return p};
 // Sheet: a shape cut from stock `t` thick, edges broken by a small bevel. Lies in XY, thickness along +z.
 const sheetGeo=(shape:THREE.Shape,t:number,bevel=.06)=>{const q=Math.min(bevel,t*.3),g=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.01,t-q*2),bevelEnabled:true,bevelThickness:q,bevelSize:q,bevelOffset:-q,bevelSegments:1,curveSegments:12});g.translate(0,0,q);return g};
 // flat: shape y → −z, thickness up. face: shape x → +z, thickness toward −x (out of the rear panel).
 const flat=(g:THREE.BufferGeometry)=>g.rotateX(-Math.PI/2),face=(g:THREE.BufferGeometry)=>g.rotateY(-Math.PI/2);
 const plate=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,g:THREE.BufferGeometry,x=0,y=0,z=0,shadow=true)=>{const m=b.put(parent,asm,g,mat,shadow);m.position.set(x,y,z);return m};
 const dummy=new THREE.Object3D(),colour=new THREE.Color();
 const inst=(parent:THREE.Object3D,asm:AssemblyId,g:THREE.BufferGeometry,mat:Mat,items:Item[],shadow=true)=>{
  if(!items.length)return null;
  const m=new THREE.InstancedMesh(g,mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(it.rx??0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(it.c!==undefined)m.setColorAt(i,colour.set(it.c as THREE.ColorRepresentation))});
  m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;b.adopt(parent,asm,m,items.length);m.castShadow=shadow;return m;
 };
 // A flat marking on top of a body.
 const decal=(parent:THREE.Object3D,asm:AssemblyId,map:THREE.Texture,x:number,z:number,w:number,d:number,y:number,turn=0,o:{rough?:number;metal?:number;transparent?:boolean}={})=>{
  const mat=own(asm,new THREE.MeshStandardMaterial({map:tex(map),roughness:o.rough??.7,metalness:o.metal??0,transparent:o.transparent??false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const m=b.put(parent,asm,g,mat,false);m.position.set(x,y+.006,z);m.rotation.y=turn;return m;
 };
 // A gull-wing lead: out of the body at `h1`, down, along the pad. Origin at the body edge, +x outward.
 const gull=(reach:number,h1:number,w:number,t=.15,foot=.5)=>{const a=reach-foot-.25,g=new THREE.ExtrudeGeometry(shapeOf([[0,h1+t],[a,h1+t],[a+.25,t],[reach,t],[reach,0],[a+.25-t*.55,0],[a-t*.55,h1],[0,h1]]),{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);return g};
 const RY=[0,-Math.PI/2,Math.PI,Math.PI/2];

 // ── Board ──────────────────────────────────────────────────────────────
 const boardMats:THREE.MeshPhysicalMaterial[]=[];
 {
  const plan=roundPlate(BOARD.w,BOARD.d,BOARD.r);
  for(const [u,v] of MOUNTS)plan.holes.push(roundHole(X(u),-Z(v),MOUNT.drill));
  for(const [u,v] of COOLER)plan.holes.push(roundHole(X(u),-Z(v),2.1));
  for(const [u,v,r] of PLAIN)plan.holes.push(roundHole(X(u),-Z(v),r));
  const edge=tex(edgeTexture());edge.repeat.set(1/8,1/BOARD.t);
  const core=own('board',new THREE.MeshStandardMaterial({color:0x8a6a30,roughness:.6})),side=own('board',new THREE.MeshStandardMaterial({map:edge,roughness:.6}));
  b.adopt(L.board,'board',new THREE.Mesh(slab(plan,-BOARD.t,0,24),[core,side]));
  for(const t of boardTiles()){
   const m=own('board',new THREE.MeshPhysicalMaterial({map:tex(t.map),roughness:1,roughnessMap:tex(t.relief),metalness:1,metalnessMap:t.relief,bumpMap:t.relief,bumpScale:1.6,clearcoat:.18,clearcoatRoughness:.68,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
   boardMats.push(m);
   const g=new THREE.PlaneGeometry(t.u1-t.u0,t.v1-t.v0);g.rotateX(-Math.PI/2);const top=b.put(L.board,'board',g,m,false);top.position.set(X((t.u0+t.u1)/2),.004,Z((t.v0+t.v1)/2));
  }
  const under=new THREE.PlaneGeometry(BOARD.w-.2,BOARD.d-.2);under.rotateX(Math.PI/2);
  const u=b.put(L.board,'board',under,own('board',new THREE.MeshStandardMaterial({map:tex(boardUnder()),roughness:.55,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),false);u.position.y=-BOARD.t-.004;
  // Plated barrels in the mounting holes; dark bores in the cooler holes.
  const plating=own('board',new THREE.MeshStandardMaterial({color:0xcfccc2,metalness:1,roughness:.35,side:THREE.BackSide}));
  for(const [u0,v0] of MOUNTS){const m=b.put(L.board,'board',new THREE.CylinderGeometry(MOUNT.drill,MOUNT.drill,BOARD.t,28,1,true),plating,false);m.position.set(X(u0),-BOARD.t/2,Z(v0))}
  // Lead tails and solder under the board: the board rests on them.
  inst(L.board,'board',new THREE.SphereGeometry(1,8,6),own('board',new THREE.MeshStandardMaterial({color:0xbfc1bf,metalness:1,roughness:.4})),
   [[8,8],[175,8],[8,297],[175,297],[90,150],[40,200],[140,100],[100,280]].map(([a,c])=>({x:X(a),y:-BOARD.t-.6,z:Z(c),sx:1.2,sy:.5,sz:1.2})));
 }

 // ── Electrolytic capacitors: one instanced sleeve and one top per size. ──
 {
  const P=L['power-parts'],sizes=new Map<string,typeof CAPS>();
  for(const c of CAPS){const k=c.d+'x'+c.h;if(!sizes.has(k))sizes.set(k,[]);sizes.get(k)!.push(c)}
  const sleeveM=own('power-parts',new THREE.MeshPhysicalMaterial({map:tex(sleeve(12)),roughness:.55,clearcoat:.2,clearcoatRoughness:.6}));
  const top=capTop(),topM=own('power-parts',new THREE.MeshStandardMaterial({map:tex(top.map),roughness:.9,roughnessMap:tex(top.relief),bumpMap:top.relief,bumpScale:.8,metalness:.75}));
  let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  for(const list of sizes.values()){
   const R=list[0].d/2,H=list[0].h;
   const prof:[number,number][]=[[0,0],[R*.9,0],[R,.3],[R,H-.75],[R-.35,H-.55],[R-.05,H-.3],[R-.05,H-.12],[R-.4,H-.04],[R-.42,H-.06]];
   inst(P,'power-parts',lathe(prof,40),sleeveM,list.map(c=>({x:X(c.u),y:0,z:Z(c.v),ry:rnd()*Math.PI*2})));
   const disc=new THREE.CircleGeometry(R-.4,40);disc.rotateX(-Math.PI/2);
   inst(P,'power-parts',disc,topM,list.map(c=>({x:X(c.u),y:H-.06,z:Z(c.v),ry:rnd()*Math.PI*2})),false);
   // The rubber bung shows as a dark ring at the base.
   inst(P,'power-parts',new THREE.CylinderGeometry(R*.88,R*.88,.3,32),dark('power-parts'),list.map(c=>({x:X(c.u),y:.15,z:Z(c.v)})),false);
  }
 }

 // ── Chokes: toroids with copper windings (two strands, as photographed), a toroid on edge, a drum and a rod. ──
 {
  const P=L['power-parts'],core=plastic('power-parts',0x26262a,'core',.7),copper=once('copper','power-parts',()=>new THREE.MeshPhysicalMaterial({color:0xffffff,map:windingT,metalness:1,roughness:.42,clearcoat:.25,clearcoatRoughness:.5}));
  const toroid=(R:number,tube:number,turns:number,wire:number,cover=.86)=>{
   const g=new THREE.Group(),c=new THREE.Mesh(new THREE.TorusGeometry(R,tube,16,48),core);c.rotation.x=Math.PI/2;g.add(c);
   for(const phase of [0,.22]){
    const pts:THREE.Vector3[]=[],N=turns*28,rw=tube+wire*.85;
    for(let i=0;i<=N;i++){const f=i/N,phi=(f*cover+.07)*Math.PI*2,th=f*turns*Math.PI*2+phase;pts.push(new THREE.Vector3((R+rw*Math.cos(th))*Math.cos(phi),rw*Math.sin(th),(R+rw*Math.cos(th))*Math.sin(phi)))}
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),N,wire,6,false),copper));
   }
   return g;
  };
  const tag=(o:THREE.Object3D)=>{o.traverse(n=>{if((n as THREE.Mesh).isMesh){n.castShadow=true;n.receiveShadow=true;n.userData.asm='power-parts'}});return o};
  for(const t of TOROIDS){
   const tube=t.h/2-1.1,R=t.r-tube-1.2,g=tag(toroid(R,tube,t.turns,.55));g.position.set(X(t.u),t.h/2,Z(t.v));g.rotation.y=t.u*.7;b.adopt(P,'power-parts',g,3);
   // Leads down to the board.
   for(const a of [.3,Math.PI+.3]){const x=X(t.u)+Math.cos(a)*(t.r+.6),z=Z(t.v)+Math.sin(a)*(t.r+.6);b.wire(P,'power-parts',copper,[[x,0,z],[x,.8,z],[X(t.u)+Math.cos(a)*(t.r-.4),t.h*.35,Z(t.v)+Math.sin(a)*(t.r-.4)]],.5)}
  }
  {const e=EDGE_TOROID,tube=e.t/2-.9,R=e.r-tube-1,g=tag(toroid(R,tube,e.turns,.5,.8));g.rotation.z=Math.PI/2;g.position.set(X(e.u),e.r,Z(e.v));b.adopt(P,'power-parts',g,3)}
  {const d=DRUM;rbox(P,'power-parts',core,X(d.u),Z(d.v),d.r*2,d.r*2,0,.8,.3);
   const w=b.put(P,'power-parts',lathe([[0,.8],[d.r-.3,.8],[d.r-.3,d.h-.9],[0,d.h-.9]],32),copper);w.position.set(X(d.u),0,Z(d.v));
   b.cyl(P,'power-parts',core,X(d.u),Z(d.v),d.r,d.h-.9,d.h,32)}
  {const r=ROD,pts:THREE.Vector3[]=[],N=12*24;b.cyl(P,'power-parts',core,X(r.u),Z(r.v),r.r-1,0,r.h,28);b.cyl(P,'power-parts',core,X(r.u),Z(r.v),r.r-1.6,r.h-1.2,r.h,24);
   for(let i=0;i<=N;i++){const f=i/N,a=f*12*Math.PI*2;pts.push(new THREE.Vector3(X(r.u)+Math.cos(a)*(r.r-.4),1+f*(r.h-3.4),Z(r.v)+Math.sin(a)*(r.r-.4)))}
   b.put(P,'power-parts',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),N,.55,6,false),copper);
   b.wire(P,'power-parts',copper,[[X(r.u),0,Z(r.v)+r.r+2.4],[X(r.u),.6,Z(r.v)+r.r+2],[X(r.u),1.4,Z(r.v)+r.r-.4]],.5)}
 }

 // ── North bridge heat sink: base, 8 fins cut in four, push pins at two corners; the chip under it. ──
 let sinkMat!:THREE.MeshStandardMaterial;
 {
  const S=L.heatsink,cx=X(NB.u),cz=Z(NB.v),y0=1.6+.9;
  // The chip (seen when the sink lifts): green substrate and the silicon die, on a thermal pad.
  rbox(L.chips,'chips',plastic('chips',0x1f4a3a,'substrate',.6),cx,cz,NB.pkg,NB.pkg,.2,1.4,.3);
  rbox(L.chips,'chips',once('die','chips',()=>new THREE.MeshPhysicalMaterial({color:0x2a3340,roughness:.25,metalness:.3,clearcoat:.8})),cx,cz,NB.die[0],NB.die[1],1.4,2.2,.1);
  rbox(S,'heatsink',plastic('heatsink',0x9aa2a6,'pad',.9),cx,cz,13,13,2.2,y0,.05);
  sinkMat=once('alu','heatsink',()=>new THREE.MeshStandardMaterial({color:0xffffff,map:aluT.map,metalness:.85,roughness:1,roughnessMap:aluT.relief,bumpMap:aluT.relief,bumpScale:.02}));
  rbox(S,'heatsink',sinkMat,cx,cz,NB.w-4,NB.d,y0,y0+NB.base,.3);
  // Ears at the pin corners.
  for(const [u,v] of PINS)rbox(S,'heatsink',sinkMat,X(u),Z(v),7,7,y0,y0+NB.base*.8,1.2);
  const fins:Item[]=[],pitch=(NB.w-6)/(NB.fins-1),seg=(NB.d-3*1.2)/NB.cuts,fh=NB.h-NB.base-y0;
  for(let i=0;i<NB.fins;i++)for(let j=0;j<NB.cuts;j++)fins.push({x:cx-(NB.w-6)/2+i*pitch,y:y0+NB.base+fh/2,z:cz-NB.d/2+seg/2+j*(seg+1.2)});
  inst(S,'heatsink',rb(NB.fin,fh,seg,.25,2),sinkMat,fins);
  // Push pins: white nylon head, steel spring, split shank below.
  const nylon=plastic('heatsink',0xe9e4d6,'nylon',.6),spring=tin('heatsink');
  for(const [u,v] of PINS){
   const x=X(u),z=Z(v),top=y0+NB.base*.8;
   b.put(S,'heatsink',lathe([[0,top+.6],[1.2,top+.6],[1.2,top+1.2],[2.4,top+1.2],[2.6,top+1.8],[2.6,top+4.4],[2.2,top+5],[0,top+5.2]],28),nylon).position.set(x,0,z);
   const pts:THREE.Vector3[]=[];for(let i=0;i<=96;i++){const f=i/96,a=f*5*Math.PI*2;pts.push(new THREE.Vector3(x+Math.cos(a)*1.6,top+.1+f*1.1,z+Math.sin(a)*1.6))}
   b.put(S,'heatsink',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),96,.25,5,false),spring);
  }
 }

 // ── CPU socket: contact field in a dark housing, steel retention frame, load plate with its window, lever. ──
 {
  const K=L.socket,cx=X(SOCKET.u),cz=Z(SOCKET.v),[pw,pd]=SOCKET.plate,st=steel('socket');
  const housing=moulded('socket',0x2a2622,'housing',.6),f=SOCKET.field,w=SOCKET.window;
  const hs=rectShape(-f/2-2.4,-f/2-2.4,f/2+2.4,f/2+2.4,.6);hs.holes.push(rectHole(-w/2,-w/2,w/2,w/2));
  plate(K,'socket',housing,flat(sheetGeo(hs,2.9,.1)),cx,.05,cz);
  const field=contactField(f,w);
  const fm=own('socket',new THREE.MeshStandardMaterial({map:tex(field.map),roughness:1,roughnessMap:tex(field.relief),metalness:1,metalnessMap:field.relief,alphaTest:.5,transparent:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const fg=new THREE.PlaneGeometry(f,f);fg.rotateX(-Math.PI/2);b.put(K,'socket',fg,fm,false).position.set(cx,2.97,cz);
  // Retention frame: a flat stamped base round the housing, with walls folded up along both sides.
  const frameS=rectShape(-pw/2,-pd/2,pw/2,pd/2,1.2);frameS.holes.push(rectShape(-f/2-2.6,-f/2-2.6,f/2+2.6,f/2+2.6,.8));
  plate(K,'socket',st,flat(sheetGeo(frameS,.8)),cx,.02,cz);
  for(const s of [-1,1])plate(K,'socket',st,sheetGeo(rectShape(-pd/2+3,0,pd/2-3,4.6,.5),.8),cx+s*(pw/2-.6),0,cz,true).rotation.y=Math.PI/2;
  // Hinge tabs on the left wall, a latch tongue at the lower edge.
  for(const dz of [-14,14])rbox(K,'socket',st,cx-pw/2+.8,cz+dz,1.6,4.4,4,7.2,.3);
  // Load plate: stamped with a window, a corner notch and a turned-down rim.
  const lp=rectShape(-pw/2+3,-pd/2+2,pw/2-3,pd/2-2,1.4),wx=f/2-.2;lp.holes.push(pathOf([[-wx+3,-wx],[-wx,-wx+3],[-wx,wx],[wx,wx],[wx,-wx]].reverse() as [number,number][]));
  const loadPlate=plate(K,'socket',st,flat(sheetGeo(lp,.65,.12)),cx,SOCKET.top-.65,cz);void loadPlate;
  for(const s of [-1,1])plate(K,'socket',st,sheetGeo(rectShape(-pw/2+4,SOCKET.top-2.2,pw/2-4,SOCKET.top-.3,.3),.6),cx,0,cz+s*(pd/2-2.3)-(s>0?.6:0));
  // Tongue at the right that the lever cam presses, folded up.
  rbox(K,'socket',st,cx+pw/2-3.2,cz,2.4,10,SOCKET.top-.6,SOCKET.top+1.4,.4);
  // The lever: a 2 mm steel rod. Handle along the lower edge ending in a hook, cam up the right side with its crank.
  const lv=SOCKET.lever,y=4.6,lever=steel('socket',0xe2e2e0);
  b.wire(K,'socket',lever,[[X(lv.u0)+1.6,y+1.4,Z(lv.hook)],[X(lv.u0),y+.8,Z(lv.hook-1.6)],[X(lv.u0),y,Z(lv.v)+1.4],[X(lv.u0)+2,y,Z(lv.v)],[X(lv.u1)-3,y,Z(lv.v)],[X(lv.u1),y-.6,Z(lv.v)-2],
   [X(lv.u1),y-1.4,Z(lv.v)-8],[X(lv.u1),y-1.4,cz+4],[X(lv.u1)-3.6,y-1.4,cz+1],[X(lv.u1)-3.6,y-1.4,cz-6],[X(lv.u1),y-1.4,cz-9],[X(lv.u1),y-1.4,cz-pd/2+5],[X(lv.u1)-1,y-1.6,cz-pd/2+3]],.95);
  // Lever lock: a small hook bent up from the frame by the handle.
  rbox(K,'socket',st,X(lv.u0)+4,Z(lv.v)+1.6,3,1,0,y+1.2,.3);
 }

 // ── Memory sockets ─────────────────────────────────────────────────────
 // A long body with a card channel, contact cavities along both rails, contacts inside, and a latch at each end.
 const channelBody=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,len:number,w:number,h:number,channel:number,keys:number[],contacts:number,cav:THREE.Texture,contactMat:Mat)=>{
  const rail=(w-channel)/2,floor=h-7.2;
  for(const s of [-1,1])rbox(parent,asm,mat,0,s*(channel/2+rail/2),len,rail,0,h,.35);
  rbox(parent,asm,mat,0,0,len-.2,channel+.1,0,floor,.1);
  for(const s of [-1,1])rbox(parent,asm,mat,s*(len/2-1.1),0,2.2,channel+.2,0,h,.3);
  for(const k of keys)rbox(parent,asm,mat,-len/2+k,0,1.5,channel+.2,0,h-.6,.2);
  const cm=own(asm,new THREE.MeshStandardMaterial({map:tex(cav),roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  for(const s of [-1,1]){const g=new THREE.PlaneGeometry(len-4.6,rail-.5);g.rotateX(-Math.PI/2);b.put(parent,asm,g,cm,false).position.set(0,h+.004,s*(channel/2+rail/2))}
  const items:Item[]=[],step=(len-6)/contacts;
  for(let i=0;i<contacts;i++)for(const s of [-1,1]){const x=-len/2+3+(i+.5)*step;if(keys.some(k=>Math.abs(x-(-len/2+k))<1.2))continue;items.push({x,y:floor+2.4,z:s*(channel/2-.12),rz:0})}
  inst(parent,asm,new THREE.BoxGeometry(step*.5,4.4,.22),contactMat,items,false);
 };
 {
  const M=L.memory,black=moulded('memory',0x161718,'black',.5),white=moulded('memory',0xeae6da,'latch',.55);
  const cav=slotTop(DIMM.len-4.6,DIMM.w/2,60,'#161718','#050505',null);
  for(const d of DIMMS){
   const n=at(M,X(d.u),Z(DIMM.v),Math.PI/2);
   channelBody(n,'memory',black,DIMM.len,DIMM.w,DIMM.h,1.9,[DIMM.len/2+8.6],60,cav,gold('memory'));
   // Latch towers and the latches themselves, standing open.
   for(const s of [-1,1]){
    rbox(n,'memory',black,s*(DIMM.len/2+2.6),0,5.2,DIMM.w,0,DIMM.h+.6,.4);
    const lat=b.pivot(n,[s*(DIMM.len/2+2),1.2,0]);lat.rotation.set(0,s>0?0:Math.PI,-DIMM.latch.tilt);
    const prof=shapeOf([[0,0],[2.2,0],[2.6,6],[3.6,DIMM.latch.h-2],[4.6,DIMM.latch.h-.6],[4.2,DIMM.latch.h],[.6,DIMM.latch.h],[0,DIMM.latch.h-3]]);
    const g=new THREE.ExtrudeGeometry(prof,{depth:DIMM.latch.w,bevelEnabled:true,bevelThickness:.25,bevelSize:.25,bevelSegments:2});g.translate(0,0,-DIMM.latch.w/2);
    b.put(lat,'memory',g,white);
   }
  }
 }

 // ── Expansion slots ───────────────────────────────────────────────────
 {
  const S=L.slots,black=moulded('slots',0x18191a,'black',.5),cream=moulded('slots',0xfaf4e4,'cream',.5);
  for(const s of SLOTS){
   const d=SLOT[s.kind],mat=s.colour==='black'?black:cream,n=at(S,X(s.u0+s.len/2),Z(s.v));
   const pins=s.kind==='pci'?60:s.kind==='x16'?82:18,key=s.kind==='pci'?68:d.key+.8;
   const cav=slotTop(s.len-4.6,(d.w-1.9)/2,pins,s.colour==='black'?'#18191a':'#f6f0e0',s.colour==='black'?'#040404':'#2b2620',key-2.3);
   channelBody(n,'slots',mat,s.len,d.w,d.h,1.9,[key],pins,cav,gold('slots'));
  }
  // The x16 slot's retention arm and the black wire laid from its end.
  const arm=X16_ARM;rbox(S,'slots',black,X((arm.u0+arm.u1)/2),Z(arm.v),arm.u1-arm.u0,arm.w,0,arm.h,.5);rbox(S,'slots',black,X(arm.u1)-.8,Z(arm.v),2,arm.w+1,0,arm.h+2,.4);
  b.wire(S,'slots',once('wire','slots',()=>new THREE.MeshPhysicalMaterial({color:0x101112,roughness:.35,clearcoat:.6})),WIRE.map(([u,v],i)=>[X(u),i===0?6:1.3+(i===WIRE.length-1?-.6:0),Z(v)]),1.2);
 }

 // ── Power and storage connectors ──────────────────────────────────────────
 {
  const P=L.power,nylon=moulded('power',0xe6dfcc,'nylon',.62),black=moulded('power',0x151617,'black',.55),red=moulded('power',0xc8302e,'red',.45);
  // Mini-Fit housings: cells with alternate square and chamfered corners, terminals at the bottom, latch on the outer side.
  const minifit=(c:typeof ATX24)=>{
   const n=at(P,X(c.u),Z(c.v)),s=rectShape(-c.w/2,-c.d/2,c.w/2,c.d/2,.5),q=c.pitch,cell=3.5;
   for(let j=0;j<c.rows;j++)for(let i=0;i<c.cols;i++){const x=(i-(c.cols-1)/2)*q,y=-((j-(c.rows-1)/2)*q),h=cell/2,ch=(i+j)%2?.9:0;
    s.holes.push(pathOf([[x-h+ch,y-h],[x-h,y-h+ch],[x-h,y+h],[x+h,y+h],[x+h,y-h]].reverse() as [number,number][]))}
   plate(n,'power',nylon,flat(sheetGeo(s,c.h-3.2,.25)),0,3.2,0);rbox(n,'power',nylon,0,0,c.w,c.d,0,3.3,.4);
   const items:Item[]=[];for(let j=0;j<c.rows;j++)for(let i=0;i<c.cols;i++)items.push({x:(i-(c.cols-1)/2)*q,y:3.6,z:(j-(c.rows-1)/2)*q});
   inst(n,'power',rb(1.6,.8,1.6,.2,1),tin('power'),items,false);
   rbox(n,'power',nylon,c.w/2+.9,0,1.8,4.2,4,c.h-1.5,.3);rbox(n,'power',nylon,c.w/2+1.6,0,1.4,4.4,c.h-3,c.h-.6,.3);
  };
  minifit(ATX24);minifit(ATX12V);
  // Box headers: a shroud with a key gap, a floor, square gold pins.
  const box=(h:Box)=>{
   const L2=h.n*2.54+6.4,W=9.2,n=at(P,X(h.u),Z(h.v),h.along==='u'?0:Math.PI/2),t=1.1;
   const s=rectShape(-L2/2,-W/2,L2/2,W/2,.4);s.holes.push(pathOf([[-L2/2+t,-W/2+t],[-L2/2+t,W/2-t],[-2.25,W/2-t],[-2.25,W/2+.01],[2.25,W/2+.01],[2.25,W/2-t],[L2/2-t,W/2-t],[L2/2-t,-W/2+t]].reverse() as [number,number][]));
   plate(n,'power',black,flat(sheetGeo(s,h.h,.15)),0,0,0);rbox(n,'power',black,0,0,L2-.4,W-.4,0,2.4,.2);
   const pins:Item[]=[];for(let i=0;i<h.n;i++)for(const r of [-1.27,1.27])pins.push({x:(i-(h.n-1)/2)*2.54,y:2.4,z:r});
   inst(n,'power',new THREE.BoxGeometry(.64,5.6,.64).translate(0,2.8,0),gold('power'),pins,false);
  };
  box(FLOPPY);box(IDE);
  // SATA: a shroud with the L-shaped mouth and the contact blade.
  for(const s of SATA){
   const n=at(P,X(s.u),Z(s.v),s.along==='u'?0:Math.PI/2),m=s.colour==='red'?red:black,Lb=SATA_BODY.len,W=SATA_BODY.w;
   const sh=rectShape(-Lb/2,-W/2,Lb/2,W/2,.5);sh.holes.push(pathOf([[-Lb/2+1,-W/2+1],[-Lb/2+1,W/2-1],[Lb/2-3.2,W/2-1],[Lb/2-3.2,W/2-2.6],[Lb/2-1,W/2-2.6],[Lb/2-1,-W/2+1]].reverse() as [number,number][]));
   plate(n,'power',m,flat(sheetGeo(sh,SATA_BODY.h,.18)),0,0,0);rbox(n,'power',m,0,0,Lb-.4,W-.4,0,1.6,.2);
   rbox(n,'power',m,-1.2,.2,Lb-6.2,1.2,1.6,SATA_BODY.h-1.4,.2);
   inst(n,'power',new THREE.BoxGeometry(.7,SATA_BODY.h-3.4,.08),gold('power'),Array.from({length:7},(_,i)=>({x:-1.2-(Lb-7.6)/2+(i+.5)*(Lb-7.6)/7,y:1.6+(SATA_BODY.h-3.4)/2,z:-.4})),false);
  }
  // Fan header: a three-pin friction-lock header.
  {const n=at(P,X(FAN.u),Z(FAN.v)),Lf=FAN.n*2.54+2.6,s=rectShape(-Lf/2,-2.9,Lf/2,2.9,.3);s.holes.push(rectHole(-Lf/2+.8,-2.1,Lf/2-.8,2.9-.8));
   plate(n,'power',black,flat(sheetGeo(s,FAN.h,.12)),0,0,0);rbox(n,'power',black,0,0,Lf-.3,5.5,0,2.2,.2);
   inst(n,'power',new THREE.BoxGeometry(.64,5.4,.64).translate(0,2.7,0),gold('power'),[-2.54,0,2.54].map(x=>({x,y:2.2,z:.4})),false)}
  // Pin headers along the lower edge, with their coloured caps.
  const cells:Item[]=[],pins:Item[]=[],pairs:Item[]=[],singles:Item[]=[];
  for(const h of HEADERS){
   if(h.bare)continue;
   for(let i=0;i<h.cols;i++)for(let r=0;r<h.rows;r++){const x=X(h.u0+i*HEADER.pitch),z=Z(h.v-1.27+r*HEADER.pitch);cells.push({x,y:HEADER.base/2,z});pins.push({x,y:0,z})}
   if(h.single)h.caps.forEach((c,k)=>{const i=k%h.cols,r=Math.floor(k/h.cols);singles.push({x:X(h.u0+i*HEADER.pitch),y:HEADER.base+HEADER.cap/2,z:Z(h.v-1.27+r*HEADER.pitch),c})});
   else h.caps.forEach((c,i)=>pairs.push({x:X(h.u0+i*HEADER.pitch),y:HEADER.base+HEADER.cap/2,z:Z(h.v),c}));
  }
  inst(P,'power',rb(2.5,HEADER.base,2.5,.3,2),plastic('power',0x161616,'hdr'),cells);
  inst(P,'power',new THREE.BoxGeometry(.64,HEADER.pin,.64).translate(0,HEADER.pin/2,0),gold('power'),pins,false);
  const capMat=once('caps','power',()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.45,clearcoat:.4,clearcoatRoughness:.4}));
  inst(P,'power',rb(2.4,HEADER.cap,4.9,.45,2),capMat,pairs);inst(P,'power',rb(2.3,HEADER.cap,2.3,.55,2),capMat,singles);
 }

 // ── Rear I/O ───────────────────────────────────────────────────────────
 const lamps:THREE.MeshStandardMaterial[]=[];
 {
  const I=L.io,st=steel('io'),brass=steel('io',0xd8c08a),fx=X(IO_FACE);
  // An open steel box: top, sides, back, with a front plate carrying the given openings (shape x along v, y up).
  const shell=(v0:number,v1:number,depth:number,h:number,holes:THREE.Path[],m:Mat=st)=>{
   const cz=Z((v0+v1)/2),w=v1-v0,t=.35,n=at(I,fx,cz);
   const front=rectShape(-w/2,0,w/2,h,.4);front.holes.push(...holes);plate(n,'io',m,face(sheetGeo(front,t)),0,0,0);
   plate(n,'io',m,flat(sheetGeo(rectShape(0,-w/2,depth,w/2,.4),t)),0,h-t,0);
   for(const s of [-1,1])plate(n,'io',m,sheetGeo(rectShape(0,0,depth,h,.3),t),0,0,s>0?w/2-t:-w/2);
   plate(n,'io',m,face(sheetGeo(rectShape(-w/2,0,w/2,h,.3),t)),depth,0,0);
   // Folded tabs where the top laps the sides.
   for(const s of [-1,1])for(const x of [depth*.3,depth*.72])plate(n,'io',m,sheetGeo(rectShape(x-1.3,h-2.2,x+1.3,h-.1,.3),t),0,0,s>0?w/2+.01:-w/2-t-.01);
   return n;
  };
  const inner=once('throat','io',()=>new THREE.MeshStandardMaterial({color:0x111214,roughness:.8,side:THREE.DoubleSide}));
  // PS/2: mouse (green) over keyboard (purple), each a round mouth with a keyed six-pin insert.
  {
   const p=IO.ps2,w=p.v1-p.v0,mouths=[6.8,19],n=shell(p.v0,p.v1,p.depth,p.h,mouths.map(y=>roundHole(0,y,5.1)));
   mouths.forEach((y,i)=>{
    const m=plastic('io',i?0x2a9a6c:0x6a5bc4,i?'ps2g':'ps2p',.6);
    const ins=b.put(n,'io',new THREE.CylinderGeometry(4.6,4.6,6,32).rotateZ(Math.PI/2),m);ins.position.set(3.6,y,0);
    const ring=b.put(n,'io',new THREE.CylinderGeometry(5,5,4,32,1,true).rotateZ(Math.PI/2),inner,false);ring.position.set(2.2,y,0);
    for(let k=0;k<6;k++){const a=k*Math.PI/3+.5,d=b.put(n,'io',new THREE.CylinderGeometry(.45,.45,.4,8).rotateZ(Math.PI/2),dark('io'),false);d.position.set(.55,y+Math.sin(a)*2.4,Math.cos(a)*2.4)}
    rbox(n,'io',dark('io'),.6,0,.4,2.4,y-4.4,y-3.2,.1).position.y=y-3.9;
   });
   decal(I,'io',yellowSticker(),fx+p.depth*.45,Z((p.v0+p.v1)/2),w*.66,p.depth*.6,p.h,Math.PI/2,{rough:.5});
  }
  // Parallel (DB25, magenta) on the upper deck; coaxial S/PDIF and serial (DB9, teal) below.
  {
   const p=IO.lpt,magenta=moulded('io',0xb3306f,'magenta',.5),teal=moulded('io',0x1f7f93,'teal',.5),cz=Z((p.v0+p.v1)/2),wv=p.v1-p.v0;
   rbox(I,'io',magenta,fx+1.6+(p.depth-1.6)/2,cz,p.depth-1.6,wv-4,p.top,p.h,.6);
   rbox(I,'io',magenta,fx+5+6,Z(51),12,13,0,p.top,.4);
   // Flange with the D mouth, the D shell standing out, the female insert, two hex jack posts.
   const dShape=(a:number,bw:number,hh:number)=>shapeOf([[-a/2,hh/2],[a/2,hh/2],[bw/2,-hh/2],[-bw/2,-hh/2]]);
   const dsub=(v:number,y:number,a:number,bw:number,hh:number,flangeW:number,flangeH:number,insert:Mat,rows:number[],male:boolean,flangeMat:Mat=st)=>{
    const n=at(I,fx,Z(v)),fl=rectShape(-flangeW/2,-flangeH/2,flangeW/2,flangeH/2,.6),mouth=dShape(a+.6,bw+.6,hh+.6);fl.holes.push(new THREE.Path(mouth.getPoints().reverse()));
    for(const s of [-1,1])fl.holes.push(roundHole(s*(a/2+3.9),0,1.6));
    plate(n,'io',flangeMat,face(sheetGeo(fl,male?.5:1.6,male?.06:.3)),0,y,0);
    const outer=dShape(a+.6,bw+.6,hh+.6);outer.holes.push(new THREE.Path(dShape(a,bw,hh).getPoints().reverse()));plate(n,'io',st,face(sheetGeo(outer,6,.15)),0,y,0);
    const ins=plate(n,'io',insert,face(new THREE.ExtrudeGeometry(dShape(a-.4,bw-.4,hh-.4),{depth:male?6:5.4,bevelEnabled:false})),male?-.2:.6,y,0);void ins;
    rows.forEach((count,r)=>{const yy=y+(r===0?1:-1)*hh*.22,step=2.77;for(let i=0;i<count;i++){const z=(i-(count-1)/2)*step;
     if(male){const pin=b.put(n,'io',new THREE.CylinderGeometry(.5,.5,5,10).rotateZ(Math.PI/2),tin('io'),false);pin.position.set(-3,yy,z)}
     else{const hole=b.put(n,'io',new THREE.CylinderGeometry(.55,.55,.3,10).rotateZ(Math.PI/2),dark('io'),false);hole.position.set(-4.85,yy,z)}}});
    for(const s of [-1,1]){const hx=b.put(n,'io',new THREE.CylinderGeometry(2.6,2.6,5.6,6).rotateZ(Math.PI/2),st);hx.position.set(-2.8,y,s*(a/2+3.9));const hole=b.put(n,'io',new THREE.CircleGeometry(1.4,16).rotateY(-Math.PI/2),dark('io'),false);hole.position.set(-5.62,y,s*(a/2+3.9))}
   };
   dsub(50.3,p.top+6.3,38.3,35.2,7.6,53,12.5,magenta,[13,12],false,magenta);
   rbox(I,'io',teal,fx+1+6,Z(74.1),12,24,0,12.4,.5);
   dsub(74.1,6.3,16.3,13.4,7.6,31,12.5,teal,[5,4],true);
   // Coaxial jack: a square steel body and a round mouth with a dark ring and centre pin.
   {const c=IO.coax,n=at(I,fx,Z(c.v));rbox(n,'io',st,6,0,11,9.6,0,13,.6);const mouth=b.put(n,'io',lathe([[c.r-1.4,0],[c.r,0],[c.r,5],[c.r-.5,5.4],[c.r-1.4,5.4]],28).rotateZ(Math.PI/2),st);mouth.position.set(0,c.y,0);
    const ring=b.put(n,'io',new THREE.CircleGeometry(c.r-1.4,24).rotateY(-Math.PI/2),dark('io'),false);ring.position.set(-4.6,c.y,0);
    const pin=b.put(n,'io',new THREE.CylinderGeometry(.9,.9,4,12).rotateZ(Math.PI/2),tin('io'));pin.position.set(-3,c.y,0)}
   decal(I,'io',lptLabel(),fx+p.depth*.5+.6,Z(51),40,15.6,p.h,Math.PI/2,{rough:.45});
  }
  // USB pair (brass-tinted shell, as photographed), the LAN jack over two USB, and the audio stack.
  const usbMouth=(y:number):THREE.Path=>pathOf([[-6,y],[6,y],[6,y+5.6],[-6,y+5.6]].reverse() as [number,number][]);
  const usbInside=(n:THREE.Object3D,y:number,depth:number)=>{
   const throat=b.put(n,'io',new THREE.BoxGeometry(depth-1,5.6,12),inner,false);throat.position.set(depth/2,y+2.8,0);
   rbox(n,'io',dark('io'),depth*.5,0,depth-2,10.4,y+.7,y+2.5,.15);
   for(const z of [-3.5,-1,1,3.5])rbox(n,'io',gold('io'),3.2,z,5,1,y+2.5,y+2.6,.04);
  };
  {const p=IO.usb,n=shell(p.v0,p.v1,p.depth,p.h,[usbMouth(1.6),usbMouth(9)],brass);usbInside(n,1.6,p.depth);usbInside(n,9,p.depth)}
  {
   const p=IO.lan,n=shell(p.v0,p.v1,p.depth,p.h,[usbMouth(1.4),usbMouth(8.6),pathOf([[-6.6,16.4],[6.6,16.4],[6.6,26.4],[2.2,26.4],[2.2,28],[-2.2,28],[-2.2,26.4],[-6.6,26.4]].reverse() as [number,number][])]);
   usbInside(n,1.4,p.depth);usbInside(n,8.6,p.depth);
   const t=b.put(n,'io',new THREE.BoxGeometry(p.depth-1,11.6,13.2),inner,false);t.position.set(p.depth/2,22.2,0);
   rbox(n,'io',dark('io'),12,0,14,13,15.6,16.6,.2);
   for(let i=0;i<8;i++)rbox(n,'io',gold('io'),6,(i-3.5)*1.02,6,.4,25,25.3,.05).rotation.z=-.25;
   decal(I,'io',stamp(['LAN','CE  FCC']),fx+p.depth*.5,Z((p.v0+p.v1)/2),10,12,p.h,Math.PI/2,{transparent:true,metal:.6,rough:.6});
  }
  {
   const p=IO.audio,cols=[0x3fa2d8,0x8ac44e,0xe7849a],ys=[22.8,14.6,6.4],n=shell(p.v0,p.v1,p.depth,p.h,[],st);
   ys.forEach((y,i)=>{
    const m=plastic('io',cols[i],'jack'+i,.5);
    const collar=b.put(n,'io',lathe([[2,0],[3.6,0],[3.6,3.2],[3.2,3.6],[2,3.6]],32).rotateZ(Math.PI/2),m);collar.position.set(.2,y,0);
    const hole=b.put(n,'io',new THREE.CircleGeometry(1.9,20).rotateY(-Math.PI/2),dark('io'),false);hole.position.set(-3.3,y,0);
   });
  }
  void lamps;
 }

 // ── Chips ──────────────────────────────────────────────────────────────
 {
  const C=L.chips,lead=tin('chips');
  // QFPs: moulded body, laser-marked top, gull-wing leads on all four sides.
  QFPS.forEach((q,i)=>{
   const x=X(q.u),z=Z(q.v);rbox(C,'chips',mould('chips'),x,z,q.w,q.d,.05,q.h,.15);
   decal(C,'chips',packageTop({w:q.w-.4,d:q.d-.4,lines:q.lines,logo:q.logo,pin:[.1,.08],turn:q.d>q.w*1.15},30+i),x,z,q.w-.4,q.d-.4,q.h);
   const g=gull(1.4,.75,q.pitch*.5,.13,.5),items:Item[]=[];
   for(let k=0;k<q.nu;k++){const t=(k-(q.nu-1)/2)*q.pitch;items.push({x:x+t,y:0,z:z-q.d/2,ry:-RY[1]},{x:x+t,y:0,z:z+q.d/2,ry:RY[1]})}
   for(let k=0;k<q.nv;k++){const t=(k-(q.nv-1)/2)*q.pitch;items.push({x:x+q.w/2,y:0,z:z+t,ry:0},{x:x-q.w/2,y:0,z:z+t,ry:Math.PI})}
   inst(C,'chips',g,lead,items,false);
  });
  SOICS.forEach((s,i)=>{
   const x=X(s.u),z=Z(s.v);rbox(C,'chips',mould('chips'),x,z,s.w,s.d,.1,s.h,.12);
   decal(C,'chips',packageTop({w:s.w-.3,d:s.d-.3,lines:s.lines,pin:[.06,.8]},50+i),x,z,s.w-.3,s.d-.3,s.h);
   const g=gull(1.05,.7,Math.min(.45,s.pitch*.55),.14,.5),items:Item[]=[];
   for(let k=0;k<s.n;k++){const t=(k-(s.n-1)/2)*s.pitch;items.push({x:x+t,y:0,z:z-s.d/2,ry:Math.PI/2},{x:x+t,y:0,z:z+s.d/2,ry:-Math.PI/2})}
   inst(C,'chips',g,lead,items,false);
  });
  // DPAKs: body, the drain tab soldered on the far side, two legs (the middle one is cut).
  const tabG=rb(1.4,.5,5.4,.1,1),legG=gull(2.4,.9,.8,.5,1.2);
  DPAKS.forEach((p,i)=>{
   const n=at(C,X(p.u),Z(p.v),[0,-Math.PI/2,Math.PI,Math.PI/2][p.legs]);
   rbox(n,'chips',mould('chips'),0,0,DPAK.d,DPAK.w,.15,DPAK.h,.2);b.put(n,'chips',tabG,lead).position.set(-DPAK.d/2-.4,.25,0);
   for(const t of [-2.28,2.28])b.put(n,'chips',legG,lead).position.set(DPAK.d/2,0,t);
   b.put(n,'chips',rb(1,.6,.8,.1,1),lead).position.set(DPAK.d/2+.4,.9,0);
   decal(n,'chips',packageTop({w:4.4,d:3.6,lines:[i%2?'60N03':'P45N02','LD'],turn:true},70+i),0,0,4.4,3.6,DPAK.h,0);
  });
  // ICH7: green laminate with the dark mould cap and its marking.
  {const x=X(ICH.u),z=Z(ICH.v);rbox(C,'chips',plastic('chips',0x1f3c35,'ichsub',.5),x,z,ICH.s,ICH.s,.25,1.1,.2);rbox(C,'chips',mould('chips'),x,z,ICH.lid,ICH.lid,1.1,ICH.h,.6);
   decal(C,'chips',ichTop(ICH.s,ICH.lid),x,z,ICH.s,ICH.s,1.1,0,{rough:.6}).position.y=1.115;
   decal(C,'chips',ichTop(ICH.s,ICH.lid),x,z,ICH.lid,ICH.lid,ICH.h,0,{rough:.6}).geometry=(()=>{const g=new THREE.PlaneGeometry(ICH.lid,ICH.lid);g.rotateX(-Math.PI/2);const uv=g.attributes.uv,o=(ICH.s-ICH.lid)/2/ICH.s;for(let i=0;i<uv.count;i++)uv.setXY(i,o+uv.getX(i)*(1-2*o),o+uv.getY(i)*(1-2*o));return g})();
   inst(C,'chips',new THREE.SphereGeometry(.3,6,4),tin('chips'),Array.from({length:40},(_,i)=>({x:x-ICH.s/2+.4+(i%20)*1.5*1.05,y:.2,z:z+(i<20?-1:1)*(ICH.s/2-.6)})),false);}
  // BIOS: PLCC32 in its socket, white label.
  {const x=X(BIOS.u),z=Z(BIOS.v),[sw,sd]=BIOS.socket,[cw,cd]=BIOS.chip,sock=moulded('chips',0x1c1c1d,'plcc',.6);
   const s=rectShape(-sw/2,-sd/2,sw/2,sd/2,.6);s.holes.push(pathOf([[-cw/2-.6,-cd/2-.6],[-cw/2-.6,cd/2+.6],[cw/2+.6,cd/2+.6],[cw/2+.6,-cd/2-.6]].reverse() as [number,number][]));
   plate(C,'chips',sock,flat(sheetGeo(s,BIOS.h,.2)),x,0,z);rbox(C,'chips',sock,x,z,cw+1,cd+1,0,1,.2);
   rbox(C,'chips',mould('chips'),x,z,cw,cd,1,BIOS.h+.4,.3);decal(C,'chips',biosLabel(),x,z,cw*.7,cd*.6,BIOS.h+.4,0,{rough:.55});
   const items:Item[]=[];for(let i=0;i<7;i++)items.push({x:x+(i-3)*1.27,y:BIOS.h-.4,z:z-cd/2-.25},{x:x+(i-3)*1.27,y:BIOS.h-.4,z:z+cd/2+.25});for(let i=0;i<9;i++)items.push({x:x-cw/2-.25,y:BIOS.h-.4,z:z+(i-4)*1.27},{x:x+cw/2+.25,y:BIOS.h-.4,z:z+(i-4)*1.27});
   inst(C,'chips',new THREE.BoxGeometry(.5,.8,.5),lead,items,false)}
 }

 // ── Small components: passives, crystals, the cell, jumpers, the standby lamp, film caps, the axial part. ──
 let led!:THREE.MeshStandardMaterial;
 {
  const P=L.parts,ceramic=own('parts',new THREE.MeshStandardMaterial({color:0x7d6548,roughness:.6})),resist=own('parts',new THREE.MeshStandardMaterial({color:0x141516,roughness:.5}));
  for(const kind of Object.keys(SIZES) as (keyof typeof SIZES)[]){
   const [l,w,h]=SIZES[kind],list=passives().filter(c=>c.kind===kind);if(!list.length)continue;
   const bodies:Item[]=list.map(c=>({x:X(c.u),y:h/2+.03,z:Z(c.v),ry:c.turn?Math.PI/2:0}));
   if(kind==='sot'){inst(P,'parts',rb(l,h,w,.1,1),mould('parts'),bodies);
    inst(P,'parts',new THREE.BoxGeometry(.4,.5,1.4),tin('parts'),list.flatMap(c=>[[-.95,1],[.95,1],[0,-1]].map(([a,s])=>c.turn?{x:X(c.u)+s*.9,y:.25,z:Z(c.v)+a,ry:Math.PI/2}:{x:X(c.u)+a,y:.25,z:Z(c.v)+s*.9})),false);continue}
   const cap=Math.min(.36,l*.22),res=kind[0]==='r';
   inst(P,'parts',rb(l-cap*2+.04,h,w,.05,1),res?resist:ceramic,bodies);
   inst(P,'parts',rb(cap,h+.03,w+.03,.05,1),tin('parts'),list.flatMap(c=>[-1,1].map(s=>({x:X(c.u)+(c.turn?0:s*(l/2-cap/2)),y:h/2+.03,z:Z(c.v)+(c.turn?s*(l/2-cap/2):0),ry:c.turn?Math.PI/2:0}))),false);
  }
  // Crystals: low seam-welded cans with a dark base.
  for(const c of CRYSTALS){const s=rectShape(-c.w/2,-c.len/2,c.w/2,c.len/2,c.w/2-.05);plate(P,'parts',steel('parts'),flat(sheetGeo(s,3.2,.35)),X(c.u),.4,Z(c.v));rbox(P,'parts',mould('parts'),X(c.u),Z(c.v),c.w+.4,c.len+.4,0,.45,.3)}
  // Coin cell holder: a black ring with an entry tab, the cell, the sprung clip across it.
  {const x=X(BATTERY.u),z=Z(BATTERY.v),R=BATTERY.r,holder=moulded('parts',0x141415,'holder',.5);
   b.put(P,'parts',lathe([[0,0],[R,0],[R,BATTERY.h-1.4],[R-.4,BATTERY.h-1],[R-1.4,BATTERY.h-1],[R-1.4,1],[0,1]],64),holder).position.set(x,0,z);
   rbox(P,'parts',holder,x,z-R+.6,9,4,0,BATTERY.h-1.2,.6);
   b.put(P,'parts',lathe([[0,1],[BATTERY.cell,1],[BATTERY.cell,4],[BATTERY.cell-.4,4.3],[0,4.3]],64),once('cell','parts',()=>new THREE.MeshStandardMaterial({color:0x3c3e41,metalness:.9,roughness:.3}))).position.set(x,0,z);
   const clip=steel('parts');rbox(P,'parts',clip,x,z+5.4,2.6,11.6,4.3,4.75,.6);rbox(P,'parts',clip,x,z+R+.2,4.4,2,0,4.75,.4);rbox(P,'parts',clip,x,z-.2,2.8,1.6,4.3,5,.6)}
  // Jumpers: three pins, a coloured shunt on two of them.
  {const cells:Item[]=[],pins:Item[]=[],shunts:Item[]=[];
   for(const j of JUMPERS){for(const t of [-2.54,0,2.54]){const x=X(j.u)+(j.turn?t:0),z=Z(j.v)+(j.turn?0:t);cells.push({x,y:HEADER.base/2,z});pins.push({x,y:0,z})}
    shunts.push({x:X(j.u)+(j.turn?-1.27:0),y:HEADER.base+HEADER.cap/2,z:Z(j.v)+(j.turn?0:-1.27),ry:j.turn?Math.PI/2:0,c:j.colour})}
   inst(P,'parts',rb(2.5,HEADER.base,2.5,.3,2),plastic('parts',0x161616,'hdr'),cells);inst(P,'parts',new THREE.BoxGeometry(.64,HEADER.pin,.64).translate(0,HEADER.pin/2,0),gold('parts'),pins,false);
   inst(P,'parts',rb(2.4,HEADER.cap,4.9,.45,2),once('shunt','parts',()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.45,clearcoat:.4})),shunts)}
  // Standby lamp: a green dome that lights from the standby rail.
  led=own('parts',new THREE.MeshPhysicalMaterial({color:0x3fbf6a,roughness:.25,emissive:0x2bff6a,emissiveIntensity:0,clearcoat:.8,transparent:true,opacity:.9}));
  b.put(P,'parts',lathe([[0,0],[LED.r+.3,0],[LED.r+.3,.8],[LED.r,1],[LED.r,LED.h-LED.r],[LED.r*.7,LED.h-LED.r*.3],[0,LED.h]],32),led).position.set(X(LED.u),0,Z(LED.v));
  // Green film capacitors.
  for(const f of FILMS)rbox(P,'parts',plastic('parts',0x2f7a52,'film',.45),X(f.u),Z(f.v),2.6,4.8,0,2.8,.5);
  // Axial glass part, with its leads.
  {const a=AXIAL,m=b.put(P,'parts',lathe([[0,-a.len/2],[a.r,-a.len/2+.4],[a.r,a.len/2-.4],[0,a.len/2]],20).rotateZ(Math.PI/2),once('glass','parts',()=>new THREE.MeshPhysicalMaterial({color:0x9a9ea2,roughness:.2,metalness:.3,clearcoat:1})));m.position.set(X(a.u),a.r+.3,Z(a.v));
   for(const s of [-1,1])b.wire(P,'parts',tin('parts'),[[X(a.u)+s*a.len/2,a.r+.3,Z(a.v)],[X(a.u)+s*(a.len/2+1.2),a.r+.2,Z(a.v)],[X(a.u)+s*(a.len/2+1.6),0,Z(a.v)]],.25)}
 }
 return {L,mirrors,boardMats,led,sinkMat};
}
export type BoardParts=ReturnType<typeof buildBoard>;
