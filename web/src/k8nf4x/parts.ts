// K8NF4X geometry. Every layer's origin sits at the board's back-left corner on its top face, so the numbers from layout.ts
// (X right, Z down the photo, heights up from the mask) are local coordinates here. Moulded parts are rounded so their edges
// catch the light, slots and sockets have real grooves with gold contacts in them, the rear I/O is cut from sheet with real
// openings, and repeated parts (pins, leads, contacts, passives) are instanced.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Builder} from '../kit/builder';
import {roundPlate,slab,lathe} from '../kit/builder';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';
import {BOARD,TOP,HOLES,HOLE,SINK_HOLES,SINK_HOLE,DIMM,SLOTS,SOCKET,FRAME,CHIPSET,ATX24,ATX12V,IDE,SATA,HEADERS,WAFERS,CHIPS,CHOKES,CAPS,CRYSTALS,XTAL,BATTERY,PLCC,IO,OVERHANG,
 SIZES,passives,type Chip,type Header} from './layout';
import {boardTextures,grain,brushed,winding,packageTop,comb,flank,socketTop,dieTop,substrate,cellTop,label,biosLabel,TILES} from './textures';

type Mat=THREE.Material;
type Item={x:number;y:number;z:number;rx?:number;ry?:number;rz?:number;sx?:number;sy?:number;sz?:number};
export const COLOURS={lime:0x8cc63f,purple:0x6b2c8c,red:0xc42a2a,blue:0x2350d2,white:0xf0ece2,black:0x18191b,yellow:0xf0c419,magenta:0xc8357c,teal:0x1f8a8a,orange:0xf07c3c,green:0x3fae52,pink:0xf08cac,lavender:0x8a78d8};

// The board's edge, looking in from the side: blue mask on both faces over the laminate, with the thin pale glass core at mid-depth.
// v runs through the 1.6 mm thickness (the extrusion's side UVs are in millimetres).
function edgeTexture(){
 const c=document.createElement('canvas');c.width=64;c.height=128;const g=c.getContext('2d')!;
 g.fillStyle='#14306f';g.fillRect(0,0,64,128);g.fillStyle='#1d3c86';g.fillRect(0,0,64,14);g.fillRect(0,114,64,14);
 g.fillStyle='#b9bfae';g.fillRect(0,58,64,12);g.fillStyle='rgba(185,191,174,.35)';g.fillRect(0,54,64,4);g.fillRect(0,70,64,4);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/4,1/BOARD.t);return t;
}

export function buildBoard(b:Builder){
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t) as T;
 const own=<T extends Mat>(asm:AssemblyId,m:T)=>b.m.own(asm,m);
 const base:V3=[-BOARD.w/2,TOP,-BOARD.d/2];
 const L={board:b.layer('board',[0,0,0],base),parts:b.layer('parts',[0,0,0],base),power:b.layer('power',[0,0,0],base),connectors:b.layer('connectors',[0,0,0],base),
  io:b.layer('io',[0,0,0],base),slots:b.layer('slots',[0,0,0],base),memory:b.layer('memory',[0,0,0],base),chipset:b.layer('chipset',[0,0,0],base),socket:b.layer('socket',[0,0,0],base),
  frame:b.layer('socket',[0,16,0],base)};

 // ── Finishes, one per assembly so selection ghosts the rest ──
 const grainT=tex(grain(9)),fineT=tex(grain(4,150,30));grainT.repeat.set(.25,.25);fineT.repeat.set(.6,.6);
 const steelT=brushed(3);const steelMap=tex(steelT.map),steelRel=tex(steelT.relief);steelMap.repeat.set(1/30,1/30);steelRel.repeat.set(1/30,1/30);
 const cache=new Map<string,Mat>();
 const once=<T extends Mat>(key:string,asm:AssemblyId,make:()=>T)=>{let m=cache.get(asm+':'+key);if(!m){m=own(asm,make());cache.set(asm+':'+key,m)}return m as T};
 const plastic=(asm:AssemblyId,colour:number,rough=.55,key='')=>once('p'+colour+key,asm,()=>new THREE.MeshPhysicalMaterial({color:colour,roughness:1,roughnessMap:grainT,bumpMap:grainT,bumpScale:.02,clearcoat:rough<.5?.18:.05,clearcoatRoughness:.62,sheen:.25,sheenRoughness:.7,sheenColor:new THREE.Color(colour).lerp(new THREE.Color(0xffffff),.5)}));
 const nylon=(asm:AssemblyId)=>once('nylon',asm,()=>new THREE.MeshPhysicalMaterial({color:0xe9e5da,roughness:1,roughnessMap:grainT,bumpMap:grainT,bumpScale:.015,clearcoat:.06,clearcoatRoughness:.6,sheen:.3,sheenColor:new THREE.Color(0xffffff),sheenRoughness:.7}));
 const steel=(asm:AssemblyId)=>once('steel',asm,()=>new THREE.MeshStandardMaterial({color:0xffffff,map:steelMap,metalness:1,roughness:1,roughnessMap:steelRel,bumpMap:steelRel,bumpScale:.01}));
 const tin=(asm:AssemblyId)=>once('tin',asm,()=>new THREE.MeshStandardMaterial({color:0xbcc0c3,metalness:1,roughness:.48}));
 const gold=(asm:AssemblyId)=>once('gold',asm,()=>new THREE.MeshStandardMaterial({color:0xd8b060,metalness:1,roughness:.42}));
 const mould=(asm:AssemblyId)=>once('mould',asm,()=>new THREE.MeshStandardMaterial({color:0x202124,roughness:1,roughnessMap:fineT,bumpMap:fineT,bumpScale:.015}));
 const dark=(asm:AssemblyId)=>once('dark',asm,()=>new THREE.MeshStandardMaterial({color:0x0c0c0d,roughness:.9}));

 // ── Helpers ──
 const rb=(w:number,h:number,d:number,r=.2,seg=2)=>new RoundedBoxGeometry(w,h,d,seg,Math.max(.01,Math.min(r,w/2-.005,h/2-.005,d/2-.005)));
 const rbox=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y0:number,y1:number,r=.2)=>{const m=b.put(parent,asm,rb(w,y1-y0,d,r),mat);m.position.set(x,(y0+y1)/2,z);return m};
 const at=(parent:THREE.Object3D,x:number,z:number,turn=0,y=0)=>{const n=b.pivot(parent,[x,y,z]);n.rotation.y=turn;return n};
 // A plan shape from board points (X, Z): `slab` maps shape y to −Z.
 const planShape=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,z])=>new THREE.Vector2(x,-z)));
 const planRect=(x0:number,z0:number,x1:number,z1:number)=>planShape([[x0,z0],[x1,z0],[x1,z1],[x0,z1]]);
 const holeRect=(x0:number,z0:number,x1:number,z1:number)=>new THREE.Path([[x0,z0],[x0,z1],[x1,z1],[x1,z0]].map(([x,z])=>new THREE.Vector2(x,-z)));
 const holeCircle=(x:number,z:number,r:number)=>{const p=new THREE.Path();p.absarc(x,-z,r,0,Math.PI*2,true);return p};
 const shapeOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 // A side profile in (x, y) extruded `w` across, centred on z = 0.
 const profile=(pts:[number,number][],w:number,bevel=.08)=>{const g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:w-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelOffset:-bevel,bevelSegments:1,curveSegments:6});g.translate(0,0,-w/2+bevel);return g};
 const dummy=new THREE.Object3D();
 const inst=(parent:THREE.Object3D,asm:AssemblyId,g:THREE.BufferGeometry,mat:Mat,items:Item[],shadow=true)=>{
  if(!items.length)return null;const m=new THREE.InstancedMesh(g,mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(it.rx??0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});
  m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();b.adopt(parent,asm,m,items.length);m.castShadow=shadow;return m;
 };
 const decal=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y:number,turn=0)=>{const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const m=b.put(parent,asm,g,mat,false);m.position.set(x,y+.004,z);m.rotation.y=turn;return m};
 const decalMat=(asm:AssemblyId,t:{map:THREE.Texture;relief?:THREE.Texture},o:{color?:number;metal?:number;rough?:number}={})=>own(asm,new THREE.MeshStandardMaterial({map:tex(t.map),color:o.color??0xffffff,roughness:o.rough??1,roughnessMap:t.relief?tex(t.relief):null,bumpMap:t.relief?t.relief:null,bumpScale:.03,metalness:o.metal??0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 const faceted=(g:THREE.BufferGeometry)=>{const q=g.toNonIndexed();q.computeVertexNormals();return q};
 // Square pin with a pyramid point, from just under the board to `top`.
 const pinGeo=(top:number,s=.64)=>{const q=s/Math.SQRT2,g=lathe([[0,-BOARD.t-1.2],[q,-BOARD.t-1.2],[q,top-.5],[q*.4,top],[0,top]],4);g.rotateY(Math.PI/4);return faceted(g)};
 // A gull-wing lead: out of the body at `h1`, down, and along the land. Origin at the body edge, +x outward.
 const gull=(reach:number,h1:number,w:number,t=.13,foot=.5)=>{const a=reach-foot-.22,g=new THREE.ExtrudeGeometry(shapeOf([[0,h1+t],[a,h1+t],[a+.22,t],[reach,t],[reach,0],[a+.22-t*.55,0],[a-t*.55,h1],[0,h1]]),{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);return g};

 // ══ Board ══
 const anchors:Record<string,V3>={};
 {
  const tx=boardTextures(),plan=roundPlate(BOARD.w,BOARD.d,BOARD.r);
  for(const [x,z] of HOLES)plan.holes.push(holeCircle(x-BOARD.w/2,z-BOARD.d/2,HOLE.drill));
  for(const [x,z] of SINK_HOLES)plan.holes.push(holeCircle(x-BOARD.w/2,z-BOARD.d/2,SINK_HOLE.drill));
  const core=own('board',new THREE.MeshStandardMaterial({color:0x1a3388,roughness:.5})),edge=own('board',new THREE.MeshStandardMaterial({map:tex(edgeTexture()),roughness:.55}));
  const slabG=slab(plan,-BOARD.t,0,24);const body=new THREE.Mesh(slabG,[core,edge]);body.position.set(BOARD.w/2,0,BOARD.d/2);b.adopt(L.board,'board',body);
  const relief=tx.relief;tex(relief);
  const tw=BOARD.w/TILES.cols,td=BOARD.d/TILES.rows;
  for(const t of tx.tiles){
   const [x0,z0,x1,z1]=t.view,r=tex(relief.clone());r.repeat.set(tw/BOARD.w,td/BOARD.d);r.offset.set(x0/BOARD.w,1-z1/BOARD.d);
   const m=own('board',new THREE.MeshPhysicalMaterial({map:tex(t.map),alphaTest:.5,roughness:1,roughnessMap:r,metalness:1,metalnessMap:r,bumpMap:r,bumpScale:1.6,clearcoat:.15,clearcoatRoughness:.55,specularIntensity:.4,sheen:.15,sheenRoughness:.8,sheenColor:new THREE.Color(0x6a86d0),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
   const g=new THREE.PlaneGeometry(x1-x0,z1-z0);g.rotateX(-Math.PI/2);const face=b.put(L.board,'board',g,m,false);face.position.set((x0+x1)/2,.004,(z0+z1)/2);
  }
  const under=new THREE.PlaneGeometry(BOARD.w,BOARD.d);under.rotateX(Math.PI/2);const u=b.put(L.board,'board',under,own('board',new THREE.MeshStandardMaterial({map:tex(tx.bottom),roughness:.5,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),false);u.position.set(BOARD.w/2,-BOARD.t-.004,BOARD.d/2);
  const plating=own('board',new THREE.MeshStandardMaterial({color:0xc9cdd0,metalness:1,roughness:.3,side:THREE.BackSide}));
  for(const [hs,list] of [[HOLE,HOLES],[SINK_HOLE,SINK_HOLES]] as const)for(const [x,z] of list){const barrel=b.put(L.board,'board',new THREE.CylinderGeometry(hs.drill-.01,hs.drill-.01,BOARD.t,28,1,true),plating,false);barrel.position.set(x,-BOARD.t/2,z)}
  anchors.board=[-60,4,100];
 }

 // ══ Memory: four DDR sockets ══
 const contacts=(asm:AssemblyId)=>({items:[] as Item[],asm});
 const groove=1.85;
 // A long socket or slot: two walls with combs on top, a floor, end blocks, and gold contacts along both inner walls.
 function channel(parent:THREE.Object3D,asm:AssemblyId,mat:THREE.Material,x0:number,len:number,z:number,w:number,h:number,pitch:number,keys:number[],ends:[number,number],gc:{items:Item[]},flankT:THREE.Texture){
  const wall=(w-groove)/2,floor=h-6.6;
  for(const s of [-1,1]){
   const zc=z+s*(groove/2+wall/2);rbox(parent,asm,mat,x0+len/2,zc,len,wall,0,h,.25);
   const top=comb(len,wall,pitch,0);const tm=decalMat(asm,{map:top.map},{color:(mat as THREE.MeshStandardMaterial).color.getHex(),rough:.6});decal(parent,asm,tm,x0+len/2,zc,len-.5,wall-.3,h,s>0?0:Math.PI);
   const side=new THREE.PlaneGeometry(len-1,h*.8),fm=own(asm,new THREE.MeshStandardMaterial({map:tex(flankT),color:(mat as THREE.MeshStandardMaterial).color,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
   const f=b.put(parent,asm,side,fm,false);f.position.set(x0+len/2,h*.45,z+s*(w/2+.005));if(s<0)f.rotation.y=Math.PI;
  }
  rbox(parent,asm,mat,x0+len/2,z,len,groove+.1,0,floor,.1);
  rbox(parent,asm,mat,x0+ends[0]/2,z,ends[0],w,0,h+.4,.35);rbox(parent,asm,mat,x0+len-ends[1]/2,z,ends[1],w,0,h+.4,.35);
  for(const k of keys)rbox(parent,asm,mat,x0+k,z,1.4,groove+.2,0,h-.8,.1);
  const n=Math.floor((len-ends[0]-ends[1]-1)/pitch);
  for(let i=0;i<n;i++){const x=x0+ends[0]+.5+(i+.5)*pitch;if(keys.some(k=>Math.abs(x0+k-x)<1.1))continue;for(const s of [-1,1])gc.items.push({x,y:floor+2.2,z:z+s*(groove/2-.18),rx:s*.22})}
 }
 {
  const P=L.memory,gc=contacts('memory'),fl=tex(flank(DIMM.x1-DIMM.x0-1,DIMM.h*.8,1.27));
  DIMM.z.forEach((z,i)=>{
   const mat=plastic('memory',COLOURS[DIMM.colour[i]],.45);
   channel(P,'memory',mat,DIMM.x0,DIMM.x1-DIMM.x0,z,DIMM.w,DIMM.h,1.27,[DIMM.key-DIMM.x0],[5.4,5.4],gc,fl);
   // Latches stand open, tipped out about 16°: a lever with a thumb tab and the hook that catches the module's notch.
   const lever=profile([[-1.1,0],[1.1,0],[1.5,9],[1.1,13.4],[2.6,15.2],[2.4,16.6],[-.4,16.6],[-1.4,15.4],[-.5,14.2],[-1.6,9.4]],5.4,.25);
   for(const s of [-1,1]){const n=at(P,s<0?DIMM.x0-.4:DIMM.x1+.4,z,s<0?0:Math.PI,1.2);n.rotation.z=s<0?.28:.28;b.put(n,'memory',lever,nylon('memory'))}
  });
  inst(P,'memory',rb(.42,3.2,.22,.08,1),gold('memory'),gc.items);
  anchors.memory=[DIMM.x1-BOARD.w/2-40,14,38-BOARD.d/2];
 }

 // ══ Expansion slots ══
 {
  const P=L.slots,gc=contacts('slots');
  for(const s of SLOTS){
   const mat=s.colour==='white'?nylon('slots'):plastic('slots',COLOURS[s.colour],.45);
   const pitch=s.kind==='pci'?1.27:1,fl=tex(flank(s.len-1,s.h*.8,pitch));
   channel(P,'slots',mat,s.x0,s.len,s.z,s.w,s.h,pitch,[s.key],[2.6,2.6],gc,fl);
   if(s.kind==='pcie16'){
    // The retention latch at the far end: a white hook that pivots down to free the card.
    const x=s.x0+s.len,hook=profile([[0,0],[7.6,0],[7.6,4.4],[9,6.4],[9,13.2],[6.2,13.2],[6.2,11],[5.2,11],[5.2,13.2],[2.6,13.2],[2.6,8.2],[0,7.2]],s.w+1.6,.3);
    const n=at(P,x,s.z,0,0);b.put(n,'slots',hook,nylon('slots'));
   }
  }
  inst(P,'slots',rb(.42,3.2,.22,.08,1),gold('slots'),gc.items);
  anchors.slots=[-10,14,225-BOARD.d/2];
 }

 // ══ Socket 939, lever and retention frame ══
 let leverNode!:THREE.Object3D;
 {
  const P=L.socket,F=L.frame,white=plastic('socket',0xefeae0,.5,'zif'),cam=SOCKET.cam;
  const sw=SOCKET.x1-SOCKET.x0,cx=(SOCKET.x0+SOCKET.x1)/2;
  rbox(P,'socket',white,cx,(cam.z1+SOCKET.z1)/2,sw,SOCKET.z1-cam.z1,0,SOCKET.h,.5);
  const top=socketTop();decal(P,'socket',decalMat('socket',top,{rough:.7}),cx,(cam.z1+SOCKET.z1)/2,sw-.6,SOCKET.z1-cam.z1-.6,SOCKET.h);
  // The cam box at the lever end, with its two windows and the slot the cam turns in.
  rbox(P,'socket',white,cx,(SOCKET.z0+cam.z1)/2,sw,cam.z1-SOCKET.z0,0,cam.h,.6);
  for(const x of [cx-sw*.33,cx+sw*.33])rbox(P,'socket',dark('socket'),x,SOCKET.z0+3.4,2.4,1.6,cam.h-.05,cam.h+.02,.05);
  for(const x of [cx-4,cx-2.6,cx+2.6,cx+4])rbox(P,'socket',dark('socket'),x,cam.z1-1.6,.5,2.6,cam.h-.05,cam.h+.02,.05);
  // Lever: a steel rod down the right side, pivoted at the cam end, cranked out at the handle; a latch hook holds it down.
  const lv=SOCKET.lever,pivot=at(P,lv.x,lv.z0,0,lv.y);leverNode=pivot;
  const rod=b.put(pivot,'socket',new THREE.CylinderGeometry(lv.r,lv.r,lv.z1-lv.z0,20).rotateX(Math.PI/2),tin('socket'));rod.position.set(0,0,(lv.z1-lv.z0)/2);
  b.wire(pivot,'socket',tin('socket'),[[0,0,lv.z1-lv.z0-.5],[.3,0,lv.z1-lv.z0+.8],[1.8,0,lv.z1-lv.z0+1.4],[4.2,0,lv.z1-lv.z0+1.4]],lv.r);
  const grip=b.put(pivot,'socket',new THREE.CylinderGeometry(1.25,1.25,4.4,20).rotateZ(Math.PI/2),plastic('socket',0xe8e2d4,.5,'grip'));grip.position.set(5.4,0,lv.z1-lv.z0+1.4);
  b.put(pivot,'socket',new THREE.CylinderGeometry(1.6,1.6,3,24).rotateZ(Math.PI/2),white).position.set(-.6,0,0);
  rbox(P,'socket',white,lv.x+1.4,lv.z1-3,2.4,3,0,4.8,.3);
  // Retention frame: a black moulded ring, raised rails at the sides with windows, clip lugs at the middle of the top and bottom bars.
  const blk=plastic('socket',0x111112,.6,'frame');
  // A thin-walled box round the socket (the board shows inside it), on a low flange, with stiffening ribs outside.
  const band=(o:number,i:number,oz:number,iz:number,y0:number,y1:number)=>{const r=planRect(FRAME.x0+o,FRAME.z0+oz,FRAME.x1-o,FRAME.z1-oz);r.holes.push(holeRect(FRAME.x0+i,FRAME.z0+iz,FRAME.x1-i,FRAME.z1-iz));b.put(F,'socket',slab(r,y0,y1),blk)};
  band(0,6,0,4.6,0,1.6);
  // Walls: thin along the top and bottom, thick rails at the sides (the lever and clip bays), with windows in the rails' tops.
  {const r=planRect(FRAME.x0+2.4,FRAME.z0+1.4,FRAME.x1-2.4,FRAME.z1-1.4);r.holes.push(holeRect(FRAME.ix0+1.5,FRAME.iz0-4.5,FRAME.ix1,FRAME.iz1+2.5));
   for(const [x0,x1] of [[FRAME.x0+7,FRAME.ix0-2],[FRAME.ix1+3,FRAME.x1-7]])for(const [z0,z1] of [[FRAME.z0+9,FRAME.z0+24],[FRAME.z1-24,FRAME.z1-9]])r.holes.push(holeRect(x0,z0,x1,z1));
   b.put(F,'socket',slab(r,1.6,FRAME.h),blk);
   for(const [x0,x1] of [[FRAME.x0+7,FRAME.ix0-2],[FRAME.ix1+3,FRAME.x1-7]])for(const [z0,z1] of [[FRAME.z0+9,FRAME.z0+24],[FRAME.z1-24,FRAME.z1-9]])rbox(F,'socket',blk,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,1.6,3.6,.2);}
  for(let x=FRAME.x0+14;x<FRAME.x1-10;x+=13)for(const z of [FRAME.z0+.9,FRAME.z1-.9])rbox(F,'socket',blk,x,z,2,1.8,1.6,FRAME.h-1.4,.3);
  for(let z=FRAME.z0+12;z<FRAME.z1-8;z+=16)for(const x of [FRAME.x0+1.4,FRAME.x1-1.4])if(Math.abs(z-FRAME.screws[0][1])>8)rbox(F,'socket',blk,x,z,1.8,2,1.6,FRAME.h-1.4,.3);
  for(const z of [FRAME.z0+3.5,FRAME.z1-3.5]){rbox(F,'socket',blk,(FRAME.x0+FRAME.x1)/2,z,14,5,3,FRAME.lug,.6);rbox(F,'socket',blk,(FRAME.x0+FRAME.x1)/2,z+(z<100?-2.6:2.6),9,1.2,FRAME.lug-3.2,FRAME.lug,.3)}
  for(const [x,z] of FRAME.screws){
   const head=b.put(F,'socket',lathe([[0,0],[2.9,0],[2.9,.9],[2.4,1.7],[0,1.9]],32),tin('socket'));head.position.set(x,FRAME.h-2.4,z);
   rbox(F,'socket',dark('socket'),x,z,3.2,.55,FRAME.h-.6,FRAME.h-.45,.05);rbox(F,'socket',dark('socket'),x,z,.55,3.2,FRAME.h-.6,FRAME.h-.45,.05);
   b.put(F,'socket',new THREE.CylinderGeometry(3.6,3.9,FRAME.h-2.4,28),blk).position.set(x,(FRAME.h-2.4)/2,z);rbox(F,'socket',blk,x+(x<100?-3:3),z,5,7.6,0,FRAME.h-2.4,.6);
  }
  anchors.socket=[cx-BOARD.w/2,10,100-BOARD.d/2];
 }

 // ══ Chipset ══
 {
  const P=L.chipset,c=CHIPSET,n=at(P,c.x,c.z,c.turn);
  rbox(n,'chipset',own('chipset',new THREE.MeshStandardMaterial({color:0x6a6e70,metalness:.7,roughness:.4})),0,0,c.s-.6,c.s-.6,0,.36,.1);
  const sub=rbox(n,'chipset',own('chipset',new THREE.MeshPhysicalMaterial({color:0x2c4632,roughness:.5,clearcoat:.6,clearcoatRoughness:.3})),0,0,c.s,c.s,.36,c.h,.12);void sub;
  decal(n,'chipset',own('chipset',new THREE.MeshPhysicalMaterial({map:tex(substrate(c.s-.4)),roughness:.45,clearcoat:.6,clearcoatRoughness:.3,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),0,0,c.s-.4,c.s-.4,c.h);
  rbox(n,'chipset',own('chipset',new THREE.MeshStandardMaterial({color:0x1d2a24,roughness:.6})),0,0,c.die+.8,c.die+.8,c.h,c.h+.12,.05);
  rbox(n,'chipset',own('chipset',new THREE.MeshStandardMaterial({color:0xffffff,map:tex(dieTop(c.die)),metalness:.75,roughness:.28})),0,0,c.die,c.die,c.h+.1,c.h+.1+c.dieH,.06);
  const caps:Item[]=[];for(let i=0;i<10;i++)for(const s of [-1,1]){caps.push({x:(i-4.5)*1.3,y:c.h+.25,z:s*(c.die/2+2.4)},{x:s*(c.die/2+2.4),y:c.h+.25,z:(i-4.5)*1.3,ry:Math.PI/2})}
  inst(n,'chipset',rb(1,.5,.5,.06,1),own('chipset',new THREE.MeshStandardMaterial({color:0xb4a283,roughness:.6})),caps);
  anchors.chipset=[c.x-BOARD.w/2,4,c.z-BOARD.d/2];
 }

 // ══ Power and storage connectors, headers ══
 {
  const P=L.connectors,pins:Item[]=[],tall:Item[]=[];
  // ATX power: a white nylon block of square and rounded cavities, contacts inside, latch ramp on one side.
  const power=(c:typeof ATX24,latch:1|-1)=>{
   const x0=c.x-c.w/2,z0=c.z-c.len/2,shape=planRect(x0,z0,x0+c.w,z0+c.len);
   for(let j=0;j<c.n;j++)for(let i=0;i<c.rows;i++){const x=c.x+(i-.5)*c.pitch,z=c.z+(j-(c.n-1)/2)*c.pitch,s=1.75;
    if((i+j)%2===0)shape.holes.push(holeRect(x-s,z-s,x+s,z+s));else{const p=new THREE.Path();p.moveTo(x-s,-(z-s));p.lineTo(x-s,-(z+s));p.lineTo(x+s,-(z+s));p.lineTo(x+s,-(z-s*.2));p.lineTo(x+s*.2,-(z-s));p.closePath();shape.holes.push(p)}
    pins.push({x,y:0,z,sx:1.6,sz:1.6,sy:.6});}
   b.put(P,'connectors',slab(shape,1.8,c.h,8),nylon('connectors'));rbox(P,'connectors',nylon('connectors'),c.x,c.z,c.w,c.len,0,1.9,.1);
   const lx=c.x+latch*(c.w/2+.9);rbox(P,'connectors',nylon('connectors'),lx,c.z,1.8,6.6,1.5,c.h-1.2,.3);rbox(P,'connectors',nylon('connectors'),lx+latch*.6,c.z,1.4,4.4,c.h-4.4,c.h-2.4,.2);
  };
  power(ATX24,1);power(ATX12V,-1);
  // Shrouded box headers: walls with the polarising notch, floor, 2.54 mm gold pins.
  for(const h of IDE){
   const mat=h.colour==='white'?nylon('connectors'):plastic('connectors',COLOURS[h.colour as 'red'|'black'],.5),az=h.along==='z',L2=h.len/2,W2=h.w/2,t=1.1,cols=h.pins/2;
   const put=(a0:number,a1:number,c0:number,c1:number,y0:number,y1:number)=>{const x0=az?h.x+c0:h.x+a0,x1=az?h.x+c1:h.x+a1,z0=az?h.z+a0:h.z+c0,z1=az?h.z+a1:h.z+c1;rbox(P,'connectors',mat,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,y0,y1,.2)};
   put(-L2,L2,-W2,W2,0,1.6);put(-L2,-L2+t,-W2,W2,0,h.h);put(L2-t,L2,-W2,W2,0,h.h);
   put(-L2,L2,-h.key*W2-t/2,-h.key*W2+t/2,0,h.h);
   put(-L2,-2.3,h.key*W2-t/2,h.key*W2+t/2,0,h.h);put(2.3,L2,h.key*W2-t/2,h.key*W2+t/2,0,h.h);put(-2.3,2.3,h.key*W2-t/2,h.key*W2+t/2,0,2.6);
   for(let i=0;i<cols;i++)for(const r of [-1,1]){const a=(i-(cols-1)/2)*2.54,c=r*1.27;tall.push({x:az?h.x+c:h.x+a,y:0,z:az?h.z+a:h.z+c})}
  }
  // SATA: an L-shaped mouth round a tongue that carries seven contacts.
  SATA.z.forEach((z,i)=>{
   const mat=plastic('connectors',COLOURS[SATA.colour[i]],.45),x0=SATA.x-SATA.len/2,z0=z-SATA.w/2;
   const shape=planRect(x0,z0,x0+SATA.len,z0+SATA.w);const p=new THREE.Path([[x0+1,z0+1.1],[x0+1,z0+SATA.w-1],[x0+SATA.len-1,z0+SATA.w-1],[x0+SATA.len-1,z0+2.6],[x0+3.4,z0+2.6],[x0+3.4,z0+1.1]].map(([x,zz])=>new THREE.Vector2(x,-zz)));
   shape.holes.push(p);b.put(P,'connectors',slab(shape,0,SATA.h,4),mat);rbox(P,'connectors',mat,SATA.x,z,SATA.len,SATA.w,0,1.4,.2);
   rbox(P,'connectors',mat,SATA.x+1.2,z0+3.4,SATA.len-4.6,1,1.4,SATA.h-.6,.15);
   for(let k=0;k<7;k++)pins.push({x:x0+4+k*(SATA.len-6)/6.5,y:SATA.h-4.4,z:z0+3.95,sx:.6,sy:6,sz:.2});
  });
  // Pin headers with coloured bases and jumper caps.
  const capColour=(c:string)=>c==='white'?nylon('connectors'):plastic('connectors',COLOURS[c as keyof typeof COLOURS],.45);
  const header=(h:Header)=>{
   const ax=h.along==='x';
   for(let i=0;i<h.cols;i++)for(let j=0;j<h.rows;j++){
    const k=j*h.cols+i;if(h.skip?.includes(k))continue;
    const a=(i-(h.cols-1)/2)*2.54,c=(j-(h.rows-1)/2)*2.54,x=h.x+(ax?a:c),z=h.z+(ax?c:a);
    if(h.id!=='SPK'){tall.push({x,y:0,z});rbox(P,'connectors',h.base==='yellow'?plastic('connectors',COLOURS.yellow,.45):plastic('connectors',COLOURS.black,.6),x,z,2.48,2.48,0,h.h,.25)}
    const cap=h.caps?.[k];if(cap)rbox(P,'connectors',capColour(cap),x,z,2.36,2.36,h.h+.3,h.h+6.2,.5);
   }
   if(h.id==='SPK'){const a=h.cols*2.54,box=ax?[a,2.6]:[2.6,a];rbox(P,'connectors',plastic('connectors',COLOURS.lavender,.45),h.x,h.z,box[0],box[1],0,h.h,.3);for(let i=0;i<h.cols;i++){const q=(i-(h.cols-1)/2)*2.54;rbox(P,'connectors',dark('connectors'),h.x+(ax?q:0),h.z+(ax?0:q),1,1,h.h-.02,h.h+.01,.05)}}
  };
  HEADERS.forEach(header);
  // Fan and wafer connectors: base, back wall with a friction ramp, tin pins.
  for(const w of WAFERS){
   const ax=w.along==='x',len=w.n*2.54+2.4,base=ax?[len,5.8]:[5.8,len],n=nylon('connectors');
   rbox(P,'connectors',n,w.x,w.z,base[0],base[1],0,1.6,.2);
   const off=w.wall*2.3,wx=ax?w.x:w.x+off,wz=ax?w.z+off:w.z;rbox(P,'connectors',n,wx,wz,ax?len:1.1,ax?1.1:len,0,6.4,.25);
   rbox(P,'connectors',n,ax?wx:wx-w.wall*.8,ax?wz-w.wall*.8:wz,ax?2.6:.7,ax?.7:2.6,3,5.4,.15);
   for(const s of [-1,1])rbox(P,'connectors',n,ax?w.x+s*(len/2-.5):w.x,ax?w.z:w.z+s*(len/2-.5),ax?1:5.8,ax?5.8:1,0,3.4,.2);
   for(let i=0;i<w.n;i++){const q=(i-(w.n-1)/2)*2.54;pins.push({x:ax?w.x+q:w.x,y:0,z:ax?w.z:w.z+q,sy:1.05})}
  }
  inst(P,'connectors',pinGeo(7.2),tin('connectors'),pins.filter(p=>!p.sx));
  inst(P,'connectors',rb(1,1,1,.1,1),gold('connectors'),pins.filter(p=>p.sx).map(p=>({...p,y:p.y+(p.sy??1)/2})));
  inst(P,'connectors',pinGeo(8.4),gold('connectors'),tall);
  anchors.connectors=[ATX24.x-BOARD.w/2-4,12,ATX24.z-BOARD.d/2];
 }

 // ══ Rear I/O ══
 {
  const P=L.io,S=steel('io'),x0=-OVERHANG;
  // An upright plate in the ZY plane at x = xf, thickness toward −x, with openings.
  const face=(xf:number,z0:number,z1:number,y0:number,y1:number,holes:THREE.Path[],mat:Mat,t=.35)=>{
   const s=shapeOf([[z0,y0],[z1,y0],[z1,y1],[z0,y1]]);s.holes.push(...holes);const g=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:24});g.rotateY(-Math.PI/2);const m=b.put(P,'io',g,mat);m.position.x=xf;return m;
  };
  const circ=(z:number,y:number,r:number)=>{const p=new THREE.Path();p.absarc(z,y,r,0,Math.PI*2,true);return p};
  const rr=(z0:number,y0:number,z1:number,y1:number,r=.6)=>{const p=new THREE.Path();p.moveTo(z0+r,y0);p.lineTo(z1-r,y0);p.quadraticCurveTo(z1,y0,z1,y0+r);p.lineTo(z1,y1-r);p.quadraticCurveTo(z1,y1,z1-r,y1);p.lineTo(z0+r,y1);p.quadraticCurveTo(z0,y1,z0,y1-r);p.lineTo(z0,y0+r);p.quadraticCurveTo(z0,y0,z0+r,y0);return p};
  // A sheet-steel box: top, sides, back; the front is cut separately.
  const shell=(z0:number,z1:number,x1:number,h:number,y0=0)=>{
   rbox(P,'io',S,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,h-.4,h,.15);
   for(const z of [z0+.18,z1-.18])rbox(P,'io',S,(x0+x1)/2,z,x1-x0,.36,y0,h,.1);
   rbox(P,'io',S,x1-.18,(z0+z1)/2,.36,z1-z0,y0,h,.1);
   // Grounding fingers along the front edge of the top, sprung up, as stamped shells have.
   for(let z=z0+2.5;z<z1-2;z+=4.2)rbox(P,'io',S,x0+1.6,z,2.6,1.4,h,h+.35,.1);
  };
  // PS/2 pair: mouse (green) over keyboard (purple), round mini-DIN mouths with six pin holes and a key.
  {
   const c=IO.ps2,zc=(c.z0+c.z1)/2,ys=[c.h*.72,c.h*.3];shell(c.z0,c.z1,c.x1,c.h);
   face(x0+.35,c.z0,c.z1,0,c.h,ys.map(y=>circ(zc,y,4.9)),S);
   ys.forEach((y,i)=>{
    const ins=plastic('io',i?COLOURS.purple:COLOURS.green,.45,'ps2'),n=b.pivot(P,[x0+5.2,y,zc]);n.rotation.z=Math.PI/2;
    b.put(n,'io',lathe([[0,0],[4.8,0],[4.8,3.6],[0,3.6]],40),ins).position.y=-.4;
    b.put(n,'io',new THREE.CylinderGeometry(4.95,4.95,1.2,40,1,true),dark('io')).position.y=-1;
    for(let k=0;k<6;k++){const a=Math.PI*(.15+k*.28),h=b.put(n,'io',new THREE.CylinderGeometry(.45,.45,.3,10),dark('io'));h.position.set(Math.cos(a)*2.6,-.42,Math.sin(a)*2.6)}
    const key=b.put(n,'io',new THREE.BoxGeometry(1.2,.4,2),dark('io'));key.position.set(0,-.42,-3.4);
   });
   decal(P,'io',own('io',new THREE.MeshStandardMaterial({map:tex(label('vrtu',c.x1-x0-2,c.z1-c.z0-1.4)),roughness:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),(x0+c.x1)/2,zc,c.x1-x0-2,c.z1-c.z0-1.4,c.h+.02);
   anchors.io=[x0-BOARD.w/2,18,zc-BOARD.d/2];
  }
  // Parallel over serial and coax: a magenta housing, D-sub shells with flanges, hex standoffs.
  {
   const c=IO.lpt,mag=plastic('io',COLOURS.magenta,.45,'lpt'),teal=plastic('io',COLOURS.teal,.45,'com');
   rbox(P,'io',mag,(x0+1.2+c.x1)/2,(c.z0+c.z1)/2,c.x1-x0-1.2,c.z1-c.z0,0,c.h,.5);
   decal(P,'io',own('io',new THREE.MeshStandardMaterial({map:tex(label('lpt',c.z1-c.z0-6,c.x1-x0-3)),roughness:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),(x0+c.x1)/2+.4,(c.z0+c.z1)/2,c.z1-c.z0-6,c.x1-x0-3,c.h,-Math.PI/2);
   // D-sub: a trapezoid with rounded corners, shell drawn forward of a flange plate.
   const dsub=(zc:number,yc:number,a:number,bot:number,hgt:number,flW:number,flH:number,insert:Mat,pinsTop:number,pinsBot:number,male:boolean)=>{
    const trap=(grow:number)=>{const s=new THREE.Shape(),t=a/2+grow,u=bot/2+grow,h=hgt/2+grow;s.moveTo(zc-t+1,yc+h);s.lineTo(zc+t-1,yc+h);s.quadraticCurveTo(zc+t,yc+h,zc+t-.2,yc+h-1);s.lineTo(zc+u,yc-h+1);s.quadraticCurveTo(zc+u-.2,yc-h,zc+u-1.2,yc-h);s.lineTo(zc-u+1.2,yc-h);s.quadraticCurveTo(zc-u+.2,yc-h,zc-u,yc-h+1);s.lineTo(zc-t+.2,yc+h-1);s.quadraticCurveTo(zc-t,yc+h,zc-t+1,yc+h);return s};
    const fl=shapeOf([[zc-flW/2,yc-flH/2],[zc+flW/2,yc-flH/2],[zc+flW/2,yc+flH/2],[zc-flW/2,yc+flH/2]]);const hole=trap(0);fl.holes.push(new THREE.Path(hole.getPoints(6).reverse()));
    for(const s of [-1,1])fl.holes.push(circ(zc+s*(flW/2-3.2),yc,1.6));
    const g=new THREE.ExtrudeGeometry(fl,{depth:.4,bevelEnabled:false});g.rotateY(-Math.PI/2);b.put(P,'io',g,S).position.x=x0+.6;
    const ring=trap(.35);ring.holes.push(new THREE.Path(trap(0).getPoints(6).reverse()));const rg=new THREE.ExtrudeGeometry(ring,{depth:5.6,bevelEnabled:true,bevelThickness:.15,bevelSize:.12,bevelSegments:1});rg.rotateY(-Math.PI/2);b.put(P,'io',rg,S).position.x=x0+.6;
    const ig=new THREE.ExtrudeGeometry(trap(male?-.2:-.05),{depth:male?1.6:5,bevelEnabled:false});ig.rotateY(-Math.PI/2);b.put(P,'io',ig,insert).position.x=x0+.6-(male?.2:.4);
    const holes:Item[]=[],pinsI:Item[]=[];
    for(const [n,row] of [[pinsTop,1],[pinsBot,-1]] as const)for(let i=0;i<n;i++){const z=zc+(i-(n-1)/2)*2.77,y=yc+row*1.42;(male?pinsI:holes).push({x:x0+.6-(male?3.2:5.42),y,z})}
    inst(P,'io',new THREE.CylinderGeometry(.5,.5,.1,10).rotateZ(Math.PI/2),dark('io'),holes,false);
    inst(P,'io',new THREE.CylinderGeometry(.5,.5,3,10).rotateZ(Math.PI/2),gold('io'),pinsI);
    for(const s of [-1,1]){const hex=b.put(P,'io',new THREE.CylinderGeometry(2.4,2.4,5.2,6).rotateZ(Math.PI/2),tin('io'));hex.position.set(x0+.6-2.6,yc,zc+s*(flW/2-3.2));
     const bore=b.put(P,'io',new THREE.CylinderGeometry(1.25,1.25,.1,16).rotateZ(Math.PI/2),dark('io'));bore.position.set(x0+.6-5.25,yc,zc+s*(flW/2-3.2))}
   };
   const lz=(c.z0+c.z1)/2;
   face(x0+.35,c.z0,c.z1,0,c.h,[],S,.3);
   dsub(lz,c.h-8.6,38.4,35.4,7.9,53,12.6,mag,13,12,false);
   dsub(c.z1-14.6,7.6,16.4,13.6,8.2,30.8,12.4,teal,5,4,true);
   // Coaxial S/PDIF: a steel barrel round a yellow insulator and a centre socket.
   const n=b.pivot(P,[x0+.2,7.6,c.z0+8.6]);n.rotation.z=Math.PI/2;
   b.put(n,'io',lathe([[2.4,0],[4.1,0],[4.1,6],[3.6,6.4],[3.2,6.2],[3.2,.6],[2.4,.6]],40),tin('io'));
   b.put(n,'io',lathe([[.9,.4],[3.25,.4],[3.25,5.4],[.9,5.4]],32),plastic('io',COLOURS.yellow,.45,'coax'));
   b.put(n,'io',new THREE.CylinderGeometry(.9,.9,.2,16),dark('io')).position.y=5.3;
  }
  // USB pair, and the RJ45 over two more USB ports.
  const usbPort=(zc:number,yc:number,x:number)=>[rr(zc-6.25,yc-2.55,zc+6.25,yc+2.55,.5)] as THREE.Path[];
  const usbInner=(zc:number,yc:number)=>{
   rbox(P,'io',plastic('io',0xf2f2ee,.5,'usbtongue'),x0+4.6,zc,8,10.6,yc+.1,yc+1.9,.2);
   inst(P,'io',rb(6,.08,1,.02,1),gold('io'),[0,1,2,3].map(i=>({x:x0+3.4,y:yc+.06,z:zc+(i-1.5)*2.5})),false);
   rbox(P,'io',dark('io'),x0+9,zc,1,12.3,yc-2.5,yc+2.5,.1);
  };
  {
   const c=IO.usb,zc=(c.z0+c.z1)/2,ys=[4.2,11.6];shell(c.z0,c.z1,c.x1,c.h);face(x0+.35,c.z0,c.z1,0,c.h,ys.flatMap(y=>usbPort(zc,y,x0)),S);ys.forEach(y=>usbInner(zc,y));
  }
  {
   const c=IO.lan,zc=(c.z0+c.z1)/2,ys=[3.9,11.3],rj=22.6;shell(c.z0,c.z1,c.x1,c.h);
   const mouth=new THREE.Path([[zc-6,rj-5.6],[zc+6,rj-5.6],[zc+6,rj+3.8],[zc+2.4,rj+3.8],[zc+2.4,rj+5.4],[zc-2.4,rj+5.4],[zc-2.4,rj+3.8],[zc-6,rj+3.8]].reverse().map(([z,y])=>new THREE.Vector2(z,y)));
   face(x0+.35,c.z0,c.z1,0,c.h,[...ys.flatMap(y=>usbPort(zc,y,x0)),mouth,rr(zc-9.6,rj+5.6,zc-7.2,rj+7.4,.3),rr(zc+7.2,rj+5.6,zc+9.6,rj+7.4,.3)],S);ys.forEach(y=>usbInner(zc,y));
   rbox(P,'io',plastic('io',0x1a1b1d,.6,'rj'),x0+8,zc,12,13,rj-6,rj+6,.3);
   inst(P,'io',rb(4,.12,.35,.03,1),gold('io'),Array.from({length:8},(_,i)=>({x:x0+5,y:rj+2.6,z:zc+(i-3.5)*1.02,rz:-.4})),false);
   for(const [s,col] of [[-1,0x86b84a],[1,0xd8a23a]] as const)rbox(P,'io',own('io',new THREE.MeshPhysicalMaterial({color:col,roughness:.25,transmission:0,clearcoat:1})),x0+.6,zc+s*8.4,1,2.2,rj+5.7,rj+7.3,.2);
  }
  // Audio: line in (blue), line out (green), microphone (pink), each a jack nose in a black body under a steel shield.
  {
   const c=IO.audio,zc=(c.z0+c.z1)/2,blk=plastic('io',0x1d1e20,.55,'audio');
   rbox(P,'io',blk,(x0+.4+c.x1)/2,zc,c.x1-x0-.4,c.z1-c.z0,0,c.h-10,.5);
   shell(c.z0,c.z1,c.x1,c.h,c.h-10.4);face(x0+.35,c.z0,c.z1,c.h-10.4,c.h,[rr(zc-3,c.h-6.4,zc+3,c.h-3.6,.4)],S);
   rbox(P,'io',own('io',new THREE.MeshPhysicalMaterial({color:0x9ad0e6,roughness:.2,clearcoat:1})),x0+.2,zc,.3,5.4,c.h-6.2,c.h-3.8,.1);
   [[COLOURS.blue,c.h-15],[COLOURS.green,c.h-22.4],[COLOURS.pink,c.h-29.6]].forEach(([col,y],i)=>{
    const n=b.pivot(P,[x0+.4,y,zc]);n.rotation.z=Math.PI/2;
    b.put(n,'io',lathe([[1.8,0],[3.4,0],[3.4,3.4],[3.1,3.9],[2.4,3.9],[1.8,3.6]],36),plastic('io',col,.4,'jack'+i));
    b.put(n,'io',new THREE.CylinderGeometry(1.8,1.8,.2,20),dark('io')).position.y=2;
   });
  }
 }

 // ══ Power stage: chokes, capacitors, MOSFETs, square inductors ══
 {
  const P=L.power,core=own('power',new THREE.MeshPhysicalMaterial({color:0xc4d8c9,roughness:.62,clearcoat:.15,clearcoatRoughness:.6})),copperT=winding(14,5),copper=own('power',new THREE.MeshStandardMaterial({color:0xc27b4c,map:tex(copperT.map),metalness:1,roughness:1,roughnessMap:tex(copperT.relief)}));
  for(const k of CHOKES){
   const R=(k.od+k.id_)/4,tube=(k.od-k.id_)/4,n=at(P,k.x,k.z,k.axis==='x'?Math.PI/2:0,k.od/2+.4),wr=.52;
   const torus=b.put(n,'power',new THREE.TorusGeometry(R,tube,18,48),core);torus.scale.set(1,1,k.t/(tube*2));
   // Winding: a helix round the ring over its upper 290°, enamelled wire just clear of the coating.
   const pts:THREE.Vector3[]=[],a0=-Math.PI*.5+.5,a1=Math.PI*1.5-.5,steps=k.turns*28;
   for(let i=0;i<=steps;i++){const f=i/steps,phi=a0+(a1-a0)*f,psi=f*k.turns*Math.PI*2,ra=tube+wr*1.05,rz=k.t/2+wr*1.05,r=R+ra*Math.cos(psi);pts.push(new THREE.Vector3(Math.cos(phi)*r,Math.sin(phi)*r,Math.sin(psi)*rz))}
   const start=pts[0],end=pts[pts.length-1];
   b.put(n,'power',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),steps*2,wr,6,false),copper).geometry.attributes.uv.array.forEach((v,i,a)=>{if(i%2===0)(a as Float32Array)[i]=v*k.turns/14+(k.x%1)});
   for(const p of [start,end])b.put(n,'power',new THREE.TubeGeometry(new THREE.LineCurve3(p,new THREE.Vector3(p.x*.6,-k.od/2-.6,p.z)),2,wr,6,false),copper);
  }
  // Electrolytics: black sleeve with a grey polarity stripe, curled over a silver top with a cross vent.
  const sleeveT=(()=>{const [c,g]=[document.createElement('canvas'),null as unknown as CanvasRenderingContext2D];c.width=512;c.height=128;const q=c.getContext('2d')!;void g;
   q.fillStyle='#17181a';q.fillRect(0,0,512,128);q.fillStyle='#7e8389';q.fillRect(0,0,82,128);q.fillStyle='#17181a';for(let i=0;i<5;i++)q.fillRect(30,12+i*24,22,6);
   q.fillStyle='#c9ccd0';q.font='600 18px "Arial Narrow", Arial, sans-serif';q.save();q.translate(300,64);q.rotate(-Math.PI/2);q.textAlign='center';q.fillText('1000µF 16V',0,0);q.restore();
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return tex(t)})();
  const ventT=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d')!;q.fillStyle='#d9dcdf';q.fillRect(0,0,256,256);
   for(let i=0;i<90;i++){q.strokeStyle=`rgba(${i%2?255:60},${i%2?255:66},${i%2?255:76},.05)`;q.beginPath();q.arc(128,128,i*1.4,0,Math.PI*2);q.stroke()}
   q.strokeStyle='#8f9499';q.lineWidth=9;q.beginPath();q.moveTo(56,128);q.lineTo(200,128);q.moveTo(128,56);q.lineTo(128,200);q.stroke();q.strokeStyle='rgba(255,255,255,.6)';q.lineWidth=2.4;q.beginPath();q.moveTo(56,123);q.lineTo(200,123);q.moveTo(123,56);q.lineTo(123,200);q.stroke();
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return tex(t)})();
  const sleeve=own('power',new THREE.MeshPhysicalMaterial({map:sleeveT,roughness:.5,clearcoat:.3,clearcoatRoughness:.55})),vent=own('power',new THREE.MeshStandardMaterial({map:ventT,color:0xd0d2d4,metalness:.9,roughness:.5})),bung=own('power',new THREE.MeshStandardMaterial({color:0x2b2c2e,roughness:.85})),alu=own('power',new THREE.MeshStandardMaterial({color:0xaeb2b5,metalness:1,roughness:.55}));
  for(const c of CAPS){
   const n=at(P,c.x,c.z,(c.x*13)%6.28);
   if(c.solid){b.put(n,'power',lathe([[0,0],[c.r,0],[c.r,c.h-.3],[c.r-.3,c.h],[0,c.h]],40),alu);b.put(n,'power',new THREE.CylinderGeometry(c.r-.2,c.r-.2,.5,32),own('power',new THREE.MeshStandardMaterial({color:0x5b2b86,roughness:.4}))).position.y=.25;continue}
   b.put(n,'power',new THREE.CylinderGeometry(c.r-.25,c.r-.25,.5,32),bung).position.y=.25;
   b.put(n,'power',lathe([[c.r-.1,.4],[c.r,.6],[c.r,c.h-.9],[c.r-.18,c.h-.75],[c.r,c.h-.5],[c.r,c.h-.15],[c.r-.35,c.h]],48),sleeve);
   const top=b.put(n,'power',new THREE.CircleGeometry(c.r-.35,40).rotateX(-Math.PI/2),vent);top.position.y=c.h-.1;
  }
  // DPAK MOSFETs and regulators: moulded body, the tab behind, two legs in front.
  for(const c of CHIPS.filter(c=>c.kind==='dpak')){
   const n=at(P,c.x,c.z);rbox(n,'power',tin('power'),0,-c.d/2+.6,c.w-.4,2.4,0,.5,.1);rbox(n,'power',tin('power'),0,-c.d/2-.3,c.w*.7,1.4,0,.55,.1);
   rbox(n,'power',mould('power'),0,0,c.w,c.d,0,c.h,.18);decal(n,'power',decalMat('power',packageTop({w:c.w-.8,d:c.d-1.4,lines:c.mark,pin:[.12,.85]},c.x|0)),0,.2,c.w-.8,c.d-1.4,c.h);
   inst(n,'power',gull(2.6,.9,.8,.5,1.2),tin('power'),[-2.28,2.28].map(x=>({x,y:0,z:c.d/2,ry:-Math.PI/2})));
  }
  for(const c of CHIPS.filter(c=>c.kind==='sq')){
   const n=at(P,c.x,c.z);rbox(n,'power',own('power',new THREE.MeshStandardMaterial({color:0x2e3034,roughness:.8})),0,0,c.w,c.d,0,c.h*.5,.3);
   rbox(n,'power',once('sqtop',('power'),()=>new THREE.MeshStandardMaterial({color:0xb9bcbf,metalness:.85,roughness:.42,map:steelMap})),0,0,c.w-.2,c.d-.2,c.h*.5,c.h,.4);
   for(const s of [-1,1])rbox(n,'power',tin('power'),s*(c.w/2+.1),0,.5,c.d*.6,0,1,.1);
  }
  anchors.power=[45-BOARD.w/2,12,120-BOARD.d/2];
 }

 // ══ Small components: chips, passives, crystals, battery, BIOS ══
 {
  const P=L.parts;
  // Passives: one instanced body and pair of end caps per kind.
  {
   const ceramic=own('parts',new THREE.MeshStandardMaterial({color:0x7d6e5a,roughness:.6})),film=own('parts',new THREE.MeshStandardMaterial({color:0x161719,roughness:.45})),alumina=own('parts',new THREE.MeshStandardMaterial({color:0xe0e1dd,roughness:.7}));
   for(const kind of Object.keys(SIZES) as (keyof typeof SIZES)[]){
    const [l,w,h]=SIZES[kind],list=passives().filter(p=>p.kind===kind),cap=l*.22,bodies:Item[]=[],caps:Item[]=[];
    for(const p of list){const ry=p.turn?Math.PI/2:0,dx=p.turn?0:1,dz=p.turn?1:0;bodies.push({x:p.x,y:h/2+.03,z:p.z,ry});for(const s of [-1,1])caps.push({x:p.x+dx*s*(l/2-cap/2),y:h/2+.03,z:p.z+dz*s*(l/2-cap/2),ry})}
    if(kind==='q23'){
     // SOT-23: a black moulded body, two gull legs on one side and one on the other.
     inst(P,'parts',rb(l,h,w,.08,1),mould('parts'),bodies,false);
     const legs:Item[]=[];for(const p of list){const t=p.turn;for(const [a,c] of [[-.95,1],[.95,1],[0,-1]] as const)legs.push(t?{x:p.x+c*(w/2+.35),y:.18,z:p.z+a,ry:Math.PI/2}:{x:p.x+a,y:.18,z:p.z+c*(w/2+.35)})}
     inst(P,'parts',rb(.42,.3,.75,.05,1),tin('parts'),legs,false);continue;
    }
    const res=kind[0]==='r';
    inst(P,'parts',rb(l-cap*2+.04,h,w,.05,1),res?alumina:ceramic,bodies,false);inst(P,'parts',rb(cap,h+.03,w+.03,.06,1),tin('parts'),caps,false);
    if(res)inst(P,'parts',rb(l-cap*2-.04,.03,w-.06,.01,1),film,bodies.map(c=>({...c,y:h+.04})),false);
   }
  }
  // Leaded chips.
  const leads:Record<string,Item[]>={};const addLead=(key:string,it:Item)=>(leads[key]??=[]).push(it);
  const chip=(c:Chip)=>{
   const n=at(P,c.x,c.z),logo=c.mark[0]==='ITE'?'ite' as const:undefined,lines=logo?c.mark.slice(1):c.mark;
   rbox(n,'parts',mould('parts'),0,0,c.w,c.d,.1,c.h,c.kind==='qfn'?.05:.14);
   decal(n,'parts',decalMat('parts',packageTop({w:c.w-.4,d:c.d-.4,lines,logo,turn:c.d>c.w*1.6&&c.kind!=='qfp',pin:[.1,.1]},c.id.length*7+c.x)),0,0,c.w-.4,c.d-.4,c.h);
   const [nx,nz]=c.pins??[0,0],p=c.pitch??1.27,reach=c.kind==='qfp'?(c.w>10?1.6:1):1.05,key=`${reach}:${p}`;
   for(let i=0;i<nx;i++)for(const s of [-1,1])addLead(key,{x:c.x+(i-(nx-1)/2)*p,y:0,z:c.z+s*c.d/2,ry:s>0?-Math.PI/2:Math.PI/2});
   for(let i=0;i<nz;i++)for(const s of [-1,1])addLead(key,{x:c.x+s*c.w/2,y:0,z:c.z+(i-(nz-1)/2)*p,ry:s>0?0:Math.PI});
  };
  CHIPS.filter(c=>c.kind==='qfp'||c.kind==='soic'||c.kind==='ssop'||c.kind==='qfn').forEach(chip);
  for(const [key,items] of Object.entries(leads)){const [reach,p]=key.split(':').map(Number);inst(P,'parts',gull(reach,p>1?.75:.6,p*.45,.13,reach*.42),tin('parts'),items,false)}
  // Crystals: HC-49/S steel cans on an insulating pad.
  for(const c of CRYSTALS){
   const s=new THREE.Shape(),r=XTAL.w/2,l=XTAL.l/2-r;s.moveTo(-l,-r);s.lineTo(l,-r);s.absarc(l,0,r,-Math.PI/2,Math.PI/2,false);s.lineTo(-l,r);s.absarc(-l,0,r,Math.PI/2,Math.PI*1.5,false);
   const g=new THREE.ExtrudeGeometry(s,{depth:XTAL.h-.6,bevelEnabled:true,bevelThickness:.3,bevelSize:.3,bevelSegments:3,curveSegments:24});g.rotateX(-Math.PI/2);g.rotateY(Math.PI/2);
   const n=at(P,c.x,c.z);b.put(n,'parts',g,once('xtal','parts',()=>new THREE.MeshStandardMaterial({color:0xe2e5e8,metalness:1,roughness:.22}))).position.y=.6;
   rbox(n,'parts',own('parts',new THREE.MeshStandardMaterial({color:0x2a2b2d,roughness:.8})),0,0,XTAL.w+.4,XTAL.l+.4,0,.5,.3);
  }
  // CR2032 in its black holder, under a sprung steel strap.
  {
   const c=BATTERY,n=at(P,c.x,c.z),blk=plastic('parts',0x1c1c1d,.6,'bat');
   const wall=new THREE.Shape();wall.absarc(0,0,c.r,.5,Math.PI*2-.5,false);wall.absarc(0,0,c.r-1.3,Math.PI*2-.5,.5,true);wall.closePath();
   const wg=new THREE.ExtrudeGeometry(wall,{depth:4.4,bevelEnabled:true,bevelThickness:.2,bevelSize:.2,bevelSegments:2,curveSegments:48});wg.rotateX(-Math.PI/2);b.put(n,'parts',wg,blk);
   b.put(n,'parts',new THREE.CylinderGeometry(c.r-.6,c.r-.6,1,48),blk).position.y=.5;
   // The holder stands empty, as photographed: its floor shows, with the sprung negative contact in the middle.
   void cellTop;rbox(n,'parts',alu(),-1.6,0,7.4,1.2,1,1.25,.05);rbox(n,'parts',alu(),-1.6,1.6,7.4,1.2,1,1.25,.05);
   // Strap from the open side, pressed onto the cell.
   const strap=profile([[c.r+1.8,0],[c.r+2.6,0],[c.r+2.6,.25],[c.r+1.4,.25],[c.r+.6,4.8],[2,4.55],[1.4,4.3],[1.6,4.05],[2.2,4.3],[c.r+.3,4.55],[c.r+1.2,0]],3.2,.04);
   b.put(n,'parts',strap,once('strap','parts',()=>new THREE.MeshStandardMaterial({color:0xd8dbdf,metalness:1,roughness:.25})));
   function alu(){return once('cell','parts',()=>new THREE.MeshStandardMaterial({color:0xcfd2d5,metalness:1,roughness:.3}))}
  }
  // BIOS: PLCC32 socket with the flash part sitting in it.
  {
   const c=PLCC,blk=plastic('parts',0x1b1b1c,.6,'plcc'),x0=c.x-c.w/2,z0=c.z-c.d/2,frame=planRect(x0,z0,x0+c.w,z0+c.d);frame.holes.push(holeRect(x0+1.6,z0+1.6,x0+c.w-1.6,z0+c.d-1.6));
   b.put(P,'parts',slab(frame,0,c.h,4),blk);rbox(P,'parts',blk,c.x,c.z,c.w-1,c.d-1,0,.8,.2);
   const leadsJ:Item[]=[];for(let i=0;i<7;i++)for(const s of [-1,1])leadsJ.push({x:c.x+s*(c.chip.w/2+.35),y:1.6,z:c.z+(i-3)*1.27},{x:c.x+(i-3)*1.27,y:1.6,z:c.z+s*(c.chip.d/2+.35)});
   inst(P,'parts',rb(.7,1.6,.45,.1,1),tin('parts'),leadsJ,false);
   rbox(P,'parts',mould('parts'),c.x,c.z,c.chip.w,c.chip.d,.8,c.chip.h+.8,.3);
   void biosLabel;decal(P,'parts',decalMat('parts',packageTop({w:c.chip.w-.6,d:c.chip.d-.6,lines:['PMC','Pm49FL004T-33JC','0526  K8NF4X R1.01'],turn:true,pin:[.5,.08]},61)),c.x,c.z,c.chip.w-.6,c.chip.d-.6,c.chip.h+.8);
  }
  anchors.parts=[PLCC.x-BOARD.w/2,6,PLCC.z-BOARD.d/2];
 }

 return {anchors,lever:leverNode};
}

