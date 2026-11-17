// GA-P35-S3G geometry. Heights are measured from the board's top face: every part layer's origin is at [0, TOP, 0].
// Repeated parts (pins, contacts, windows, fins, capacitors, passives, leads) are instanced; moulded parts are rounded so
// their edges catch the light; slots and sockets are real frames with their contact channels open.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Builder} from '../kit/builder';
import {slab,lathe} from '../kit/builder';
import type {AssemblyId} from './model';
import {BOARD,TOP,LIFT,SLOTS,LATCH16,DIMMS,DIMM,CPU,COOLER,LABEL,NB,SB,ATX24,ATX4,IDE,FDD,SATA,SATA_H,HEADERS,FANS,IO,POLYFUSE,CHIPS,PAKS,CHOKES,CAPS,COIN,XTALS,CABLE,PLUG,
 headerPins,headerRect,smds,mm,C,W,D,type Rect,type Cap} from './layout';
import {boardMaps,undersideMap,edgeMap,capTop,capSleeve,chokeTop,chipTop,hubLabel,bandTop,anodised,brushed,lptSticker,barcode,ihsTop,moulding} from './textures';

type Mat=THREE.Material;
type Item={x:number;y:number;z:number;ry?:number;rx?:number;rz?:number;sx?:number;sy?:number;sz?:number;c?:THREE.Color};

export function buildGap35(b:Builder){
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t) as T;
 const own=<T extends Mat>(asm:AssemblyId,m:T)=>b.m.own(asm,m);
 const base:[number,number,number]=[0,TOP,0];
 const L={
  board:b.layer('board',[0,0,0],[0,0,0]),chips:b.layer('chips',[0,0,0],base),vrm:b.layer('vrm',[0,0,0],base),io:b.layer('io',[0,0,0],base),power:b.layer('power',[0,0,0],base),
  slots:b.layer('slots',[0,0,0],base),memory:b.layer('memory',[0,0,0],base),heat:b.layer('heatsinks',[0,0,0],base),sbHeat:b.layer('heatsinks',[0,-14,0],base),
  socket:b.layer('socket',[0,0,0],[CPU.x,TOP,CPU.z]),cpu:b.layer('socket',[0,26,0],[CPU.x,TOP,CPU.z]),cooler:b.layer('cooler',[0,0,0],[CPU.x,TOP,CPU.z]),
 };

 // ── Finishes, one per assembly so selection ghosts the rest ──
 const grainT=tex(moulding(9));grainT.repeat.set(3,3);
 const cache=new Map<string,Mat>();
 const once=<T extends Mat>(key:string,asm:AssemblyId,make:()=>T)=>{let m=cache.get(asm+key);if(!m){m=own(asm,make());cache.set(asm+key,m)}return m as T};
 const plastic=(asm:AssemblyId,colour:number,rough=.55,key='')=>once('p'+colour.toString(16)+key,asm,()=>new THREE.MeshStandardMaterial({color:colour,roughness:rough,roughnessMap:grainT,bumpMap:grainT,bumpScale:.02}));
 const gloss=(asm:AssemblyId,colour:number,rough=.32)=>once('g'+colour.toString(16)+rough,asm,()=>new THREE.MeshPhysicalMaterial({color:colour,roughness:rough,clearcoat:.4,clearcoatRoughness:.35}));
 const brushT=tex(brushed());brushT.repeat.set(1.5,1.5);
 const steel=(asm:AssemblyId)=>once('steel',asm,()=>new THREE.MeshStandardMaterial({color:0xb2b6ba,map:brushT,metalness:.92,roughness:.58,roughnessMap:brushT}));
 const nickel=(asm:AssemblyId)=>once('nickel',asm,()=>new THREE.MeshStandardMaterial({color:0xc9ccd0,metalness:1,roughness:.26}));
 const tin=(asm:AssemblyId)=>once('tin',asm,()=>new THREE.MeshStandardMaterial({color:0x8c8f93,metalness:.7,roughness:.5}));
 const goldPin=(asm:AssemblyId)=>once('gold',asm,()=>new THREE.MeshStandardMaterial({color:0xe2b85e,metalness:1,roughness:.28}));
 const brass=(asm:AssemblyId)=>once('brass',asm,()=>new THREE.MeshStandardMaterial({color:0xcfae6a,metalness:1,roughness:.3}));
 const dark=(asm:AssemblyId)=>once('dark',asm,()=>new THREE.MeshStandardMaterial({color:0x0c0d0f,roughness:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
 const chipBody=(asm:AssemblyId)=>once('chip',asm,()=>new THREE.MeshStandardMaterial({color:0x1a1b1e,roughness:.72}));
 const decalMat=(asm:AssemblyId,map:THREE.Texture,o:THREE.MeshStandardMaterialParameters={})=>own(asm,new THREE.MeshStandardMaterial({map:tex(map),roughness:.7,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,...o}));

 // ── Shape helpers. Plan shapes are written in world (x, z); `slab` extrudes them upward. ──
 const rb=(w:number,h:number,d:number,r=.3,seg=2)=>new RoundedBoxGeometry(w,h,d,seg,Math.max(.01,Math.min(r,w/2-.005,h/2-.005,d/2-.005)));
 const rbox=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y0:number,y1:number,r=.3)=>{const m=b.put(parent,asm,rb(w,y1-y0,d,r),mat);m.position.set(x,(y0+y1)/2,z);return m};
 const rrPath=<T extends THREE.Path>(p:T,x0:number,z0:number,x1:number,z1:number,r=0):T=>{
  const a=-z1,c=-z0;r=Math.min(r,(x1-x0)/2-.001,(c-a)/2-.001);
  if(r<=0){p.moveTo(x0,a);p.lineTo(x1,a);p.lineTo(x1,c);p.lineTo(x0,c);p.closePath();return p}
  p.moveTo(x0+r,a);p.lineTo(x1-r,a);p.absarc(x1-r,a+r,r,-Math.PI/2,0,false);p.lineTo(x1,c-r);p.absarc(x1-r,c-r,r,0,Math.PI/2,false);p.lineTo(x0+r,c);p.absarc(x0+r,c-r,r,Math.PI/2,Math.PI,false);p.lineTo(x0,a+r);p.absarc(x0+r,a+r,r,Math.PI,Math.PI*1.5,false);p.closePath();return p;
 };
 const rr=(x0:number,z0:number,x1:number,z1:number,r=0)=>rrPath(new THREE.Shape(),x0,z0,x1,z1,r);
 const hole=(x0:number,z0:number,x1:number,z1:number,r=0)=>rrPath(new THREE.Path(),x0,z0,x1,z1,r);
 const planOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,z])=>new THREE.Vector2(x,-z)));
 const dummy=new THREE.Object3D();
 const inst=(parent:THREE.Object3D,asm:AssemblyId,g:THREE.BufferGeometry,mat:Mat,items:Item[],shadow=true)=>{
  if(!items.length)return null;
  const m=new THREE.InstancedMesh(g,mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(it.rx??0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(it.c)m.setColorAt(i,it.c)});
  m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;b.adopt(parent,asm,m,items.length);m.castShadow=shadow;return m;
 };
 const unitBox=new THREE.BoxGeometry(1,1,1),unitRound=rb(1,1,1,.18,2),unitCyl=new THREE.CylinderGeometry(1,1,1,28);
 const flatDecal=(parent:THREE.Object3D,asm:AssemblyId,map:THREE.Texture,x:number,z:number,w:number,d:number,y:number,turn=0,o:THREE.MeshStandardMaterialParameters={})=>{
  const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const m=b.put(parent,asm,g,decalMat(asm,map,o),false);m.position.set(x,y,z);m.rotation.y=turn;return m;
 };

 // ═════ Board ═════
 const boardMats:THREE.MeshPhysicalMaterial[]=[];
 {
  const shape=rr(-BOARD.w/2,-BOARD.d/2,BOARD.w/2,BOARD.d/2,BOARD.r);
  const edge=tex(edgeMap());edge.repeat.set(.05,1);
  const core=b.put(L.board,'board',slab(shape,LIFT,TOP,24),own('board',new THREE.MeshStandardMaterial({color:0x8f9a90,map:edge,roughness:.7})));core.receiveShadow=true;
  const under=new THREE.ShapeGeometry(shape,12);under.rotateX(Math.PI/2);
  const uv=under.attributes.uv,pos=under.attributes.position;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getX(i)/BOARD.w+.5,1-(pos.getZ(i)/BOARD.d+.5));
  b.put(L.board,'board',under,own('board',new THREE.MeshStandardMaterial({map:tex(undersideMap()),roughness:.5,polygonOffset:true,polygonOffsetFactor:-1}))).position.y=LIFT-.01;
  const maps=boardMaps();tex(maps.relief);
  for(const tile of maps.tiles){
   const [x0,z0,x1,z1]=tile.box,g=tile.gutter,s=new THREE.Shape(),r=BOARD.r;
   // Cut each tile to its part of the rounded board: a tile corner that is also the board's corner is rounded.
   const is=(x:number,z:number)=>Math.abs(Math.abs(x)-BOARD.w/2)<1e-6&&Math.abs(Math.abs(z)-BOARD.d/2)<1e-6;
   const lo=-z1,hi=-z0,bl=is(x0,z1)?r:0,br=is(x1,z1)?r:0,tr=is(x1,z0)?r:0,tl=is(x0,z0)?r:0;
   s.moveTo(x0+bl,lo);s.lineTo(x1-br,lo);if(br)s.absarc(x1-br,lo+br,br,-Math.PI/2,0,false);s.lineTo(x1,hi-tr);if(tr)s.absarc(x1-tr,hi-tr,tr,0,Math.PI/2,false);
   s.lineTo(x0+tl,hi);if(tl)s.absarc(x0+tl,hi-tl,tl,Math.PI/2,Math.PI,false);s.lineTo(x0,lo+bl);if(bl)s.absarc(x0+bl,lo+bl,bl,Math.PI,Math.PI*1.5,false);
   s.closePath();
   const sheet=new THREE.ShapeGeometry(s,10),p=sheet.attributes.position,u0=sheet.attributes.uv,u1=new Float32Array(p.count*2),tw=x1-x0+g*2,th=z1-z0+g*2;
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i);u0.setXY(i,(x-x0+g)/tw,1-(z-z0+g)/th);u1[i*2]=x/BOARD.w+.5;u1[i*2+1]=1-(z/BOARD.d+.5)}
   sheet.setAttribute('uv1',new THREE.BufferAttribute(u1,2));sheet.rotateX(-Math.PI/2);
   const mat=own('board',new THREE.MeshPhysicalMaterial({map:tex(tile.map),roughness:1,metalness:1,roughnessMap:maps.relief,metalnessMap:maps.relief,bumpMap:maps.relief,bumpScale:1.1,specularIntensity:.35,clearcoat:.22,clearcoatRoughness:.6,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
   boardMats.push(mat);const m=b.put(L.board,'board',sheet,mat,false);m.position.y=TOP+.005;
  }
 }

 // ═════ Expansion slots and memory sockets: open frames with contacts in the channel and windows along the wall tops ═════
 const contacts:{slots:Item[];memory:Item[]}={slots:[],memory:[]},windows:{slots:Item[];memory:Item[]}={slots:[],memory:[]};
 // A connector body along z from z0, `w` wide, `len` long, `h` tall, its channel `ch` wide, broken by a key at `key` (0..1).
 function slotBody(parent:THREE.Object3D,asm:'slots'|'memory',mat:Mat,x:number,z0:number,w:number,len:number,h:number,ch:number,key:number,pitch:number,end=2.2){
  const s=rr(x-w/2,z0,x+w/2,z0+len,.5),kz=z0+len*key,kw=1.8;
  s.holes.push(hole(x-ch/2,z0+end,x+ch/2,kz-kw/2,.2),hole(x-ch/2,kz+kw/2,x+ch/2,z0+len-end,.2));
  b.put(parent,asm,slab(s,0,h,6),mat);
  rbox(parent,asm,dark(asm),x,z0+len/2,ch+.05,len-end*2,0,h*.42,.05);
  const wall=(w-ch)/2,n=Math.floor((len-end*2-1)/pitch);
  for(let i=0;i<n;i++){
   const z=z0+end+.6+i*pitch;if(Math.abs(z-kz)<kw/2+.5)continue;
   for(const sgn of [-1,1]){
    contacts[asm].push({x:x+sgn*(ch/2-.12),y:h*.42,z,sx:.22,sy:h*.42,sz:pitch*.5});
    windows[asm].push({x:x+sgn*(ch/2+wall*.42),y:h+.012,z,sx:wall*.42,sy:.02,sz:pitch*.48});
   }
  }
 }
 const slotColour={white:0xe3ded4,blue:0x5fb0d8,black:0x18191c};
 for(const s of SLOTS){
  const mat=plastic('slots',slotColour[s.colour],s.colour==='black'?.45:.5);
  slotBody(L.slots,'slots',mat,s.x,s.z0,s.w,s.len,s.h,s.kind==='pci'?2.4:2.1,s.key,s.kind==='pci'?1.27:1);
 }
 {// The x16 retention latch: an arm from the far end that curls toward −x and ends in a thumb hook.
  const {x,z,reach,curl}=LATCH16,c=(t:number):[number,number]=>[x+curl*Math.pow(t,2.2),z+reach*t],left:[number,number][]=[],right:[number,number][]=[];
  for(let i=0;i<=18;i++){const t=i/18,[px,pz]=c(t),[qx,qz]=c(Math.min(1,t+.01)),[ox,oz]=c(Math.max(0,t-.01)),tx=qx-ox,tz=qz-oz,l=Math.hypot(tx,tz),hw=1.15+(t>.82?.7:0);left.push([px-tz/l*hw,pz+tx/l*hw]);right.push([px+tz/l*hw,pz-tx/l*hw])}
  const outline=planOf([...left,...right.reverse()]);
  b.put(L.slots,'slots',slab(outline,1.2,6.2,8),plastic('slots',slotColour.blue,.5));
  rbox(L.slots,'slots',plastic('slots',slotColour.blue,.5),x,z-1,5.2,4,0,8,.5);
 }
 const dimmColour={yellow:0xe0c22a,red:0xb81e1a};
 for(const d of DIMMS){
  const mat=plastic('memory',dimmColour[d.colour],.45);
  slotBody(L.memory,'memory',mat,0,0,DIMM.w,DIMM.len,DIMM.h,2,DIMM.key,DIMM.pitch,3);
 }
 // The DIMM bodies were built along z; turn them to run along x at their places.
 {
  const built=L.memory.children.splice(0);let k=0;
  for(const d of DIMMS){
   const node=b.pivot(L.memory,[d.x,0,d.z]);node.rotation.y=Math.PI/2;
   // Two meshes per body (frame, channel floor).
   for(let i=0;i<2;i++){const m=built[k++];m.position.z-=DIMM.len/2;node.add(m)}
   // Latches: white, leaning a little outward, with a finger tab.
   for(const sgn of [-1,1]){
    const lt=b.pivot(node,[0,0,sgn*(DIMM.len/2+DIMM.latch/2)]);lt.rotation.x=sgn*.12;
    rbox(lt,'memory',plastic('memory',0xe6e2da,.6,'latch'),0,0,DIMM.w*1.18,DIMM.latch,0,DIMM.latchH,.8);
    rbox(lt,'memory',plastic('memory',0xe6e2da,.6,'latch'),0,sgn*(DIMM.latch/2+.8),DIMM.w*1.1,2.4,DIMM.latchH-4,DIMM.latchH,.6);
   }
  }
  // Contacts and windows were built along z at the origin; turn them the same way for each socket.
  const along=(list:Item[])=>{const per=list.length/DIMMS.length,out:Item[]=[];DIMMS.forEach((d,j)=>{for(let i=0;i<per;i++){const it=list[j*per+i],zz=it.z-DIMM.len/2;out.push({...it,x:d.x+zz,z:d.z-it.x,sx:it.sz,sz:it.sx})}});return out};
  contacts.memory=along(contacts.memory);windows.memory=along(windows.memory);
 }
 inst(L.slots,'slots',unitBox,goldPin('slots'),contacts.slots,false);inst(L.slots,'slots',unitBox,dark('slots'),windows.slots,false);
 inst(L.memory,'memory',unitBox,goldPin('memory'),contacts.memory,false);inst(L.memory,'memory',unitBox,dark('memory'),windows.memory,false);

 // ═════ Socket and processor ═════
 {
  const S=CPU.socket;
  rbox(L.socket,'socket',plastic('socket',0xd6ccb4,.6),0,0,S,S,0,2.6,.4);
  rbox(L.socket,'socket',once('lga',('socket'),()=>new THREE.MeshStandardMaterial({color:0x8d7a4a,metalness:.7,roughness:.45})),0,0,S-6,S-6,2.5,2.62,.1);
  // Steel retention frame with its hinge, the load plate (open frame) and the lever along the right side.
  const frameShape=rr(-CPU.plate/2,-CPU.plate/2-4,CPU.plate/2,CPU.plate/2+3,1.5);frameShape.holes.push(hole(-S/2+.5,-S/2+.5,S/2-.5,S/2-.5,.5));
  b.put(L.socket,'socket',slab(frameShape,0,1,8),steel('socket'));
  const plate=rr(-CPU.sub/2-1.2,-CPU.sub/2-1.2,CPU.sub/2+1.2,CPU.sub/2+1.2,1.2);plate.holes.push(hole(-CPU.ihs/2-1.2,-CPU.ihs/2-1.2,CPU.ihs/2+1.2,CPU.ihs/2+1.2,1));
  b.put(L.cpu,'socket',slab(plate,3.85,4.45,8),steel('socket'));
  b.wire(L.socket,'socket',steel('socket'),[[CPU.plate/2+2.2,1.4,-CPU.plate/2-2],[CPU.plate/2+2.2,1.4,CPU.plate/2+1],[CPU.plate/2+2.2,1.6,CPU.plate/2+3],[CPU.plate/2-4,1.6,CPU.plate/2+3.4]],.7);
  rbox(L.socket,'socket',plastic('socket',0x18191b,.6),CPU.plate/2-5.5,CPU.plate/2+3.4,4,2.2,.6,2.8,.6);
  // The processor: green substrate, gold lands' edge, and the nickel lid.
  rbox(L.cpu,'socket',gloss('socket',0x2e6a3c,.4),0,0,CPU.sub,CPU.sub,2.62,3.8,.3);
  rbox(L.cpu,'socket',nickel('socket'),0,0,CPU.ihs+2.4,CPU.ihs+2.4,3.8,4.4,.4);
  rbox(L.cpu,'socket',nickel('socket'),0,0,CPU.ihs,CPU.ihs,3.8,6.3,.6);
  flatDecal(L.cpu,'socket',ihsTop(),0,0,CPU.ihs-1,CPU.ihs-1,6.31,0,{metalness:.9,roughness:.3});
 }

 // ═════ Intel boxed cooler: radial aluminium fins, black shroud with four push-pin legs, seven-blade fan, cable ═════
 let rotor!:THREE.Object3D;
 {
  const y0=6.4,R0=COOLER.core,R1=COOLER.fin,[f0,f1]=COOLER.finH,blk=plastic('cooler',0x0e0f10,.5),alu=once('alu','cooler',()=>new THREE.MeshStandardMaterial({color:0x6c7279,metalness:.9,roughness:.45,side:THREE.DoubleSide}));
  b.put(L.cooler,'cooler',lathe([[0,y0],[R0+1,y0],[R0+1,y0+2],[R0,y0+3],[R0,f1-1],[0,f1-1]],48),once('core','cooler',()=>new THREE.MeshStandardMaterial({color:0xc58a5a,metalness:1,roughness:.32})));
  // One fin: a thin swept plate from the core to the rim, its lower edge chamfered up toward the rim (caps sit under it).
  const fin=(()=>{
   const n=14,t=.42,pts:number[]=[],idx:number[]=[];
   for(let i=0;i<=n;i++){
    const f=i/n,r=R0+(R1-R0)*f,a=.62*f*f,bot=y0+f0-4+4.5*f*f,top=f1-1.5*f*f;
    const cx=Math.cos(a)*r,cz=Math.sin(a)*r,nx=-Math.sin(a+.5*f),nz=Math.cos(a+.5*f);
    for(const [s,y] of [[-1,bot],[1,bot],[1,top],[-1,top]] as const)pts.push(cx+nx*s*t/2,y,cz+nz*s*t/2);
   }
   for(let i=0;i<n;i++){const a=i*4,c=(i+1)*4;for(let k=0;k<4;k++){const k1=(k+1)%4;idx.push(a+k,c+k,c+k1,a+k,c+k1,a+k1)}}
   idx.push(0,1,2,0,2,3,n*4+0,n*4+2,n*4+1,n*4+0,n*4+3,n*4+2);
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);const q=g.toNonIndexed();q.computeVertexNormals();return q;
  })();
  inst(L.cooler,'cooler',fin,alu,Array.from({length:COOLER.fins},(_,i)=>({x:0,y:0,z:0,ry:i/COOLER.fins*Math.PI*2})));
  // The shroud: a ring round the fan, four arms out to the leg housings, and the X of struts holding the centre.
  const [s0,s1]=COOLER.shroud,ring=new THREE.Shape();ring.absarc(0,0,COOLER.ring,0,Math.PI*2,false);const inner=new THREE.Path();inner.absarc(0,0,COOLER.ring-3.2,0,Math.PI*2,true);ring.holes.push(inner);
  b.put(L.cooler,'cooler',slab(ring,s0,s1,96),blk);
  const lip=new THREE.Shape();lip.absarc(0,0,COOLER.ring+.6,0,Math.PI*2,false);const lh=new THREE.Path();lh.absarc(0,0,COOLER.ring-1.4,0,Math.PI*2,true);lip.holes.push(lh);b.put(L.cooler,'cooler',slab(lip,s1-1.4,s1,96),blk);
  for(let i=0;i<4;i++){
   const a=Math.PI/4+i*Math.PI/2,lx=Math.cos(a)*COOLER.holes*Math.SQRT2,lz=Math.sin(a)*COOLER.holes*Math.SQRT2;
   // Leg housing: a rounded post down to the board, its push pin on top.
   const leg=b.pivot(L.cooler,[lx,0,lz]);leg.rotation.y=-a;
   b.put(leg,'cooler',lathe([[0,0],[4.6,0],[4.6,1.2],[3.6,2.2],[3.6,s0-2],[4.4,s0],[4.4,s1-6],[0,s1-6]],28),blk).position.set(.5,0,0);
   rbox(leg,'cooler',blk,-4.5,0,8,7,s0+4,s1-2,1.5);
   b.put(leg,'cooler',lathe([[0,s1-6],[4.2,s1-6],[4.2,s1-4.6],[3.6,s1-3.4],[0,s1-3.2]],28),plastic('cooler',0x232426,.4,'pin')).position.set(.5,0,0);
   b.put(leg,'cooler',new THREE.CylinderGeometry(1.6,1.6,1,16),dark('cooler')).position.set(.5,s1-3.1,0);
   // Strut from the centre to the ring.
   const st=b.pivot(L.cooler,[0,0,0]);st.rotation.y=-a;rbox(st,'cooler',blk,(COOLER.hub+COOLER.ring)/2-1,0,COOLER.ring-COOLER.hub,5.2,s1-3.4,s1-.6,.8);
  }
  // Static centre: the motor housing with the label on top.
  b.put(L.cooler,'cooler',lathe([[0,s1-4],[COOLER.hub+.4,s1-4],[COOLER.hub+.4,s1-.8],[COOLER.hub,s1-.2],[0,s1-.2]],64),blk);
  const label=new THREE.CircleGeometry(LABEL.r,64);label.rotateX(-Math.PI/2);
  const lm=b.put(L.cooler,'cooler',label,decalMat('cooler',hubLabel(),{roughness:.4}),false);lm.position.set(LABEL.x,s1-.15,LABEL.z);lm.rotation.y=-Math.PI/2;
  // The rotor: hub and seven swept blades, turned by the pose.
  rotor=b.pivot(L.cooler,[0,0,0]);
  b.put(rotor,'cooler',lathe([[0,s0+1],[COOLER.hub-1,s0+1],[COOLER.hub-1,s1-4.4],[0,s1-4.4]],48),blk);
  const blade=(()=>{
   const nr=10,nc=6,pts:number[]=[],idx:number[]=[];
   for(let i=0;i<=nr;i++)for(let j=0;j<=nc;j++){
    const fr=i/nr,fc=j/nc,r=COOLER.hub-1.2+(COOLER.fan-COOLER.hub+1)*fr,span=.8+.32*fr,a=-.25*fr+fc*span,y=s0+3.5+(1-fc)*8*(1-.35*fr)+fr*1.2;
    pts.push(Math.cos(a)*r,y,Math.sin(a)*r);
   }
   for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){const a=i*(nc+1)+j,c=a+nc+1;idx.push(a,c,a+1,a+1,c,c+1)}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();return g;
  })();
  const bladeMat=once('blade','cooler',()=>new THREE.MeshStandardMaterial({color:0x1c1d20,roughness:.55,side:THREE.DoubleSide}));
  for(let i=0;i<COOLER.blades;i++){const m=b.put(rotor,'cooler',blade,bladeMat);m.rotation.y=i/COOLER.blades*Math.PI*2}
  // The fan cable: four wires laid side by side along one path, off the board to the plug on the bench.
  const pts=CABLE.map(([x,y,h])=>{const [mx,mz]=mm(x,y);return new THREE.Vector3(mx-CPU.x,h,mz-CPU.z)});
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal'),N=260;
  const colours=[0xe8c21e,0x1f9a4a,0x2a62c8,0x1a1a1c];
  colours.forEach((col,k)=>{
   const off=(k-1.5)*1.25,sh:THREE.Vector3[]=[];
   for(let i=0;i<=N;i++){const t=i/N,p=curve.getPointAt(t),tg=curve.getTangentAt(t),side=new THREE.Vector3(-tg.z,0,tg.x).normalize();sh.push(p.clone().addScaledVector(side,off).add(new THREE.Vector3(0,Math.sin(t*40+k)*.08,0)))}
   const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sh),N,.62,8,false);
   b.put(L.cooler,'cooler',g,gloss('cooler',col,.38));
  });
  const [px,pz]=PLUG.at,plug=b.pivot(L.cooler,[px-CPU.x,-TOP,pz-CPU.z]);plug.rotation.y=-PLUG.turn;
  rbox(plug,'cooler',plastic('cooler',0xeceae6,.5,'plug'),0,0,PLUG.w,PLUG.d,0,PLUG.h,.6);
  rbox(plug,'cooler',plastic('cooler',0xeceae6,.5,'plug'),0,-PLUG.d/2-1,PLUG.w*.6,2,1,PLUG.h-1.5,.5);
  rbox(plug,'cooler',dark('cooler'),0,PLUG.d/2-.6,PLUG.w-2,1.4,1.2,PLUG.h-1.2,.3);
 }

 // ═════ Chipset heat sinks: gold anodised, finned along x ═════
 const goldT=tex(anodised());goldT.repeat.set(.05,.05);
 const goldMat=once('anod','heatsinks',()=>new THREE.MeshPhysicalMaterial({color:0xffffff,map:goldT,metalness:.88,roughness:.42,roughnessMap:goldT}));
 const pinMat=plastic('heatsinks',0xf2f1ee,.4,'pin');
 const sink=(parent:THREE.Object3D,b0:Rect,h:number,pitch:number,t:number,band?:Rect,split?:number)=>{
  const [cx,cz]=C(b0),w=W(b0),y0=2.6,fins:Item[]=[];
  rbox(parent,'heatsinks',goldMat,cx,cz,w,D(b0),y0,y0+2.2,.4);
  for(let z=b0[1]+t/2+.2;z<=b0[3]-t/2;z+=pitch){
   if(band&&z>band[1]-t/2&&z<band[3]+t/2)continue;
   if(split!==undefined){fins.push({x:(b0[0]+split-.8)/2,y:y0+h/2,z,sx:split-.8-b0[0],sy:h-1,sz:t},{x:(split+.8+b0[2])/2,y:y0+h/2,z,sx:b0[2]-split-.8,sy:h-1,sz:t})}
   else fins.push({x:cx,y:y0+h/2,z,sx:w,sy:h-1,sz:t});
  }
  inst(parent,'heatsinks',unitRound,goldMat,fins);
  if(band){rbox(parent,'heatsinks',goldMat,cx,(band[1]+band[3])/2,w,D(band),y0,y0+h-.2,.5);flatDecal(parent,'heatsinks',bandTop(w,D(band)),cx,(band[1]+band[3])/2,w-.6,D(band)-.6,y0+h-.18,0,{metalness:.8,roughness:.32})}
 };
 sink(L.heat,NB.b,NB.h,2.05,1.05,NB.band,NB.split);
 for(const [x,z] of NB.pins){b.put(L.heat,'heatsinks',lathe([[0,0],[2.3,0],[2.3,NB.h+1],[1.6,NB.h+3.2],[0,NB.h+3.6]],24),pinMat).position.set(x,0,z)}
 sink(L.sbHeat,SB.b,SB.h,1.75,.9);
 for(const t of SB.tabs)rbox(L.sbHeat,'heatsinks',goldMat,C(t)[0],C(t)[1],W(t),D(t),2.6,4.2,.6);
 for(const [x,z] of SB.pins){b.put(L.sbHeat,'heatsinks',lathe([[0,0],[2.3,0],[2.3,6.5],[1.6,8.4],[0,8.8]],24),pinMat).position.set(x,0,z)}
 // The chips under the sinks: P35 and ICH9 on their substrates.
 for(const [bb,s] of [[NB.b,34],[SB.b,31]] as const){const [cx,cz]=C(bb);rbox(L.chips,'chips',gloss('chips',0x2b5a36,.4),cx,cz,s,s,0,1.4,.3);rbox(L.chips,'chips',chipBody('chips'),cx,cz,s*.42,s*.42,1.4,2.2,.1)}

 // ═════ Power and storage connectors, headers ═════
 const pins:Item[]=[];
 const pinGeo=new THREE.BoxGeometry(.64,1,.64);
 {// ATX 24-pin and 4-pin: white housings with square cavities, a pin in each, and the latch ridge.
  const atx=(r:Rect,cols:number,rows:number,h:number)=>{
   const s=rr(r[0],r[1],r[2],r[3],.6),cw=(W(r)-1.2)/cols,cd=(D(r)-1.2)/rows,cav:Item[]=[];
   for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const x=r[0]+.6+cw*(i+.5),z=r[1]+.6+cd*(j+.5);s.holes.push(hole(x-cw*.4,z-cd*.4,x+cw*.4,z+cd*.4,.5));cav.push({x,y:h*.45,z});pins.push({x,y:h*.45+.5,z,sy:1.2})}
   b.put(L.power,'power',slab(s,0,h,6),plastic('power',0xece6dc,.5,'atx'));
   inst(L.power,'power',unitBox,once('cav','power',()=>new THREE.MeshStandardMaterial({color:0x4a3a28,roughness:.8})),cav.map(c=>({...c,sx:cw*.82,sy:.1,sz:cd*.82})),false);
   rbox(L.power,'power',plastic('power',0xece6dc,.5,'atx'),(r[0]+r[2])/2,r[3]+.8,5,1.8,h*.3,h-1,.4);
  };
  atx(ATX24.b,12,2,ATX24.h);atx(ATX4.b,2,2,ATX4.h);
 }
 {// Shrouded box headers: IDE (green) and floppy (black).
  const shroud=(r:Rect,colour:number,cols:number,rows:number,h:number,alongZ:boolean)=>{
   const s=rr(r[0],r[1],r[2],r[3],.5);s.holes.push(hole(r[0]+.9,r[1]+.9,r[2]-.9,r[3]-.9,.2));
   const mat=plastic('power',colour,.5);b.put(L.power,'power',slab(s,0,h,6),mat);
   rbox(L.power,'power',mat,(r[0]+r[2])/2,(r[1]+r[3])/2,W(r)-1.6,D(r)-1.6,0,1.6,.1);
   // The key notch in the middle of one long wall.
   rbox(L.power,'power',dark('power'),alongZ?r[2]-.45:(r[0]+r[2])/2,alongZ?(r[1]+r[3])/2:r[3]-.45,alongZ?.92:4.6,alongZ?4.6:.92,1.6,h+.01,.05);
   const [cx,cz]=C(r);for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=(i-(cols-1)/2)*2.54,c=(j-(rows-1)/2)*2.54;pins.push({x:alongZ?cx+c:cx+a,y:1.6+3,z:alongZ?cz+a:cz+c,sy:6})}
  };
  shroud(IDE.b,0x6bc43a,IDE.pins,2,IDE.h,false);shroud(FDD.b,0x1a1b1d,FDD.pins,2,FDD.h,true);
 }
 {// SATA, vertical: an orange housing with its L-shaped opening and the blade standing inside.
  const or=once('sata','power',()=>new THREE.MeshPhysicalMaterial({color:0xff9a00,roughness:.72,specularIntensity:.4}));
  for(const st of SATA){
   const r=st.b,[cx,cz]=C(r),s=rr(r[0],r[1],r[2],r[3],1);
   s.holes.push(planOfHole([[cx-1.2,r[1]+2],[cx+2.2,r[1]+2],[cx+2.2,r[3]-2],[cx+.6,r[3]-2],[cx+.6,r[1]+3.6],[cx-1.2,r[1]+3.6]]));
   b.put(L.power,'power',slab(s,0,SATA_H,6),or);
   b.put(L.power,'power',slab(planOf([[cx+1,r[1]+2.6],[cx+1.7,r[1]+2.6],[cx+1.7,r[3]-2.6],[cx+1,r[3]-2.6]]),0,SATA_H-1.4,4),or);
   rbox(L.power,'power',dark('power'),cx+.4,cz,3,D(r)-4,0,SATA_H*.4,.1);
  }
 }
 function planOfHole(pts:[number,number][]){return new THREE.Path(pts.map(([x,z])=>new THREE.Vector2(x,-z)))}
 {// Pin headers: a plastic strip under each row, gold pins. The front panel header has a colour per pin pair.
  const panel=[0x3aa64a,0x3aa64a,0xd2322a,0xd2322a,0xe07aa8,0xcfd1d4,0xcfd1d4,0xef8a2a,0xef8a2a,0xef8a2a];
  const baseColour={black:0x1a1b1d,yellow:0xe0b62a,white:0xeeeae4,mint:0x9fd9b0,panel:0};
  for(const hh of HEADERS){
   const r=headerRect(hh);
   if(hh.base==='panel'){for(let i=0;i<hh.cols;i++){const a=(i-(hh.cols-1)/2)*hh.pitch;rbox(L.power,'power',plastic('power',panel[i],.5,'fp'+i),hh.x,hh.z+a,hh.rows*hh.pitch-.2,hh.pitch-.2,0,hh.h,.3)}}
   else rbox(L.power,'power',plastic('power',baseColour[hh.base],.5,'hd'),C(r)[0],C(r)[1],W(r)-.2,D(r)-.2,0,hh.h,.3);
   for(const [x,z] of headerPins(hh))pins.push({x,y:hh.h+3,z,sy:6});
  }
  for(const f of FANS){
   const r=f.b,[cx,cz]=C(r),mat=plastic('power',f.colour==='white'?0xefece6:0x1a1b1d,.5,'fan'+f.colour);
   if(f.colour==='white'){
    // KK housing: a back wall and two ends; the open side carries the polarising ramp.
    const s=rr(r[0],r[1],r[2],r[3],.4);s.holes.push(f.turn?hole(r[0]+1.6,r[1]+.8,r[2]-.8,r[3]-.8,.2):hole(r[0]+.8,r[1]+1.6,r[2]-.8,r[3]-.8,.2));
    b.put(L.power,'power',slab(s,0,f.h,4),mat);rbox(L.power,'power',mat,cx,cz,W(r)-.4,D(r)-.4,0,1.4,.1);
   }else{const s=rr(r[0],r[1],r[2],r[3],.4);s.holes.push(hole(r[0]+.8,r[1]+.8,r[2]-.8,r[3]-.8,.2));b.put(L.power,'power',slab(s,0,f.h,4),mat);rbox(L.power,'power',mat,cx,cz,W(r)-.4,D(r)-.4,0,1.4,.1)}
   for(let i=0;i<f.pins;i++){const o=(i-(f.pins-1)/2)*2.54;pins.push({x:f.turn?cx:cx+o,y:1.4+2.6,z:f.turn?cz+o:cz,sy:5.2})}
  }
 }
 inst(L.power,'power',pinGeo,goldPin('power'),pins);

 // ═════ Rear I/O ═════
 {
  const st=steel('io'),front=-BOARD.d/2-3;
  const shell=(r:Rect,h:number,y0=0)=>rbox(L.io,'io',st,C(r)[0],C(r)[1],W(r),D(r),y0,h,.5);
  const faceZ=front-.05;
  const portHole=(x:number,y:number,w:number,h:number,inner=0x101113)=>{rbox(L.io,'io',once('hole'+inner,'io',()=>new THREE.MeshStandardMaterial({color:inner,roughness:.7})),x,faceZ+.4,w,1,y-h/2,y+h/2,.3)};
  const tongue=(x:number,y:number,w:number,colour=0xeeeeea)=>rbox(L.io,'io',plastic('io',colour,.5,'t'+colour),x,faceZ+.56,w,1.2,y-.9,y+.9,.2);
  const usb=(x:number,y:number,colour=0x1b1c1e)=>{portHole(x,y,13.2,5.8);tongue(x,y+.6,11,colour)};
  // PS/2: green over purple.
  {const o=IO.ps2,r=o.b;shell(r,o.h);const x=C(r)[0];
   for(const [y,c] of [[19.5,0x3fa36a],[7,0x7a62c8]] as const){const g=new THREE.CylinderGeometry(5.2,5.2,1.6,36);g.rotateX(Math.PI/2);const m=b.put(L.io,'io',g,gloss('io',c,.35));m.position.set(x,y,faceZ-.2);const k=new THREE.CylinderGeometry(3.6,3.6,1.7,32);k.rotateX(Math.PI/2);b.put(L.io,'io',k,dark('io')).position.set(x,y,faceZ-.25)}}
  // Parallel (magenta) over serial (teal): D-sub shells with standoffs, the green sticker on top.
  {const P=IO.parallel,r=P.b,cx=C(r)[0],w=W(r);
   const mag=gloss('io',0xd8509a,.38);rbox(L.io,'io',mag,cx,C(r)[1],w,D(r),13.5,P.h,.6);rbox(L.io,'io',mag,r[0]+3,C(r)[1],5,D(r),0,13.6,.5);
   rbox(L.io,'io',st,cx,front+.6,w-4,1,13.6,P.h-.4,.2);
   // A D-sub front: a trapezoid steel shell standing proud of the face, the coloured insert inside it.
   const trap=(w0:number,w1:number,h:number)=>{const q=new THREE.Shape();q.moveTo(-w1/2,-h/2);q.lineTo(w1/2,-h/2);q.lineTo(w0/2,h/2);q.lineTo(-w0/2,h/2);q.closePath();return q};
   const dsub=(x:number,y:number,w0:number,w1:number,h:number,insert:number)=>{
    const g=new THREE.ExtrudeGeometry(trap(w0,w1,h),{depth:5,bevelEnabled:true,bevelSize:.45,bevelThickness:.45,bevelSegments:2,curveSegments:4});b.put(L.io,'io',g,st).position.set(x,y,faceZ-5.4);
    const g2=new THREE.ExtrudeGeometry(trap(w0-2.2,w1-2.2,h-2),{depth:5,bevelEnabled:false});b.put(L.io,'io',g2,gloss('io',insert,.4)).position.set(x,y,faceZ-5.9);
   };
   dsub(cx,20,38.4,35.4,7.6,0xd8509a);
   const S=IO.serial,sx=C(S.b)[0];rbox(L.io,'io',gloss('io',0x1f7f86,.4),sx,C(S.b)[1],W(S.b),D(S.b),0,S.h,.5);rbox(L.io,'io',st,sx,front+.6,W(S.b)-3,1,.4,S.h-.2,.2);dsub(sx,6.3,19.4,16.6,7.6,0x1f7f86);
   for(const x of [cx-23.5,cx+23.5,sx-12.5,sx+12.5]){const y=x===sx-12.5||x===sx+12.5?6.3:20;const g=new THREE.CylinderGeometry(2.4,2.4,5.5,6);g.rotateX(Math.PI/2);b.put(L.io,'io',g,brass('io')).position.set(x,y,faceZ-2.3);const q=new THREE.CylinderGeometry(1.2,1.2,5.6,16);q.rotateX(Math.PI/2);b.put(L.io,'io',q,dark('io')).position.set(x,y,faceZ-2.35)}
   flatDecal(L.io,'io',lptSticker(),cx-2,C(r)[1]+.4,w*.72,D(r)*.62,P.h+.02,0,{roughness:.6});
  }
  // USB stack.
  {const o=IO.usb,r=o.b;shell(r,o.h);usb(C(r)[0],4.2);usb(C(r)[0],11.6)}
  // USB + LAN: RJ45 over two USB, barcode sticker on the top.
  {const o=IO.usbLan,r=o.b,x=C(r)[0];shell(r,o.h);usb(x,4.2);usb(x,11.6);portHole(x,23.5,12,9.4,0x0c0d0e);rbox(L.io,'io',plastic('io',0xd8a030,.4,'led'),x-5,faceZ+.3,2.2,1,27.4,28.6,.2);rbox(L.io,'io',plastic('io',0x7fd04a,.4,'led2'),x+5,faceZ+.3,2.2,1,27.4,28.6,.2);
   flatDecal(L.io,'io',barcode(),x,C(r)[1]+2,W(r)*.82,D(r)*.36,o.h+.02,0,{roughness:.6})}
  // Audio: three jacks (blue, green, pink) in a black body under a steel cover.
  {const o=IO.audio,r=o.b,x=C(r)[0];rbox(L.io,'io',plastic('io',0x161719,.5,'audio'),x,C(r)[1],W(r),D(r),0,o.h-1,.5);rbox(L.io,'io',st,x,C(r)[1]+1,W(r),D(r)-2,o.h-1.2,o.h,.4);
   [[24,0x7cc4e8],[14,0x8ed06a],[4.6,0xf08a92]].forEach(([y,c])=>{const g=lathe([[0,0],[4.6,0],[4.6,1],[4.0,2.6],[0,2.6]],32);g.rotateX(-Math.PI/2);b.put(L.io,'io',g,gloss('io',c,.35)).position.set(x,y,faceZ+.2);const k=new THREE.CylinderGeometry(1.9,1.9,2.8,20);k.rotateX(Math.PI/2);b.put(L.io,'io',k,dark('io')).position.set(x,y,faceZ-1.2)})}
  rbox(L.io,'io',plastic('io',0xc8a040,.5,'fuse'),C(POLYFUSE)[0],C(POLYFUSE)[1],W(POLYFUSE),D(POLYFUSE),0,2.2,.4);
 }

 // ═════ VRM: capacitors, chokes, power transistors ═════
 {
  const top=tex(capTop()),byKind=new Map<Cap['sleeve'],Cap[]>();for(const c of CAPS)(byKind.get(c.sleeve)??(byKind.set(c.sleeve,[]),byKind.get(c.sleeve)!)).push(c);
  // Unit can: radius 1, height 1, a rolled groove near the top.
  const can=lathe([[0,0],[.96,0],[1,.04],[1,.86],[.95,.885],[1,.91],[1,.985],[.95,1],[0,1]],40);
  const topDisc=new THREE.CircleGeometry(.95,40);topDisc.rotateX(-Math.PI/2);
  for(const [kind,list] of byKind){
   const sleeve=tex(capSleeve(kind));
   inst(L.vrm,'vrm',can,own('vrm',new THREE.MeshPhysicalMaterial({map:sleeve,roughness:.5,clearcoat:.15,clearcoatRoughness:.4})),list.map(c=>({x:c.x,y:0,z:c.z,sx:c.r,sy:c.h,sz:c.r,ry:(c.x*7)%6.28})));
  }
  inst(L.vrm,'vrm',topDisc,own('vrm',new THREE.MeshStandardMaterial({map:top,metalness:.8,roughness:.48})),CAPS.map(c=>({x:c.x,y:c.h+.005,z:c.z,sx:c.r,sy:1,sz:c.r,ry:(c.z*3)%6.28})),false);
  for(const ck of CHOKES){
   const [cx,cz]=C(ck.b);rbox(L.vrm,'vrm',plastic('vrm',0x1a1b1e,.7,'choke'),cx,cz,W(ck.b),D(ck.b),.2,ck.h,.8);
   flatDecal(L.vrm,'vrm',chokeTop(ck.value,ck.turn),cx,cz,W(ck.b)-1.4,D(ck.b)-1.4,ck.h+.01,0,{roughness:.7});
   for(const s of [-1,1])rbox(L.vrm,'vrm',tin('vrm'),ck.turn?cx:cx+s*(W(ck.b)/2-.3),ck.turn?cz+s*(D(ck.b)/2-.3):cz,ck.turn?W(ck.b)*.6:1,ck.turn?1:D(ck.b)*.6,0,1,.1);
  }
  const bodies:Item[]=[],tabs:Item[]=[],legs:Item[]=[];
  for(const p of PAKS){
   const [cx,cz]=C(p.b),w=W(p.b),d=D(p.b),ns=p.tab==='n'||p.tab==='s',s=p.tab==='n'||p.tab==='w'?-1:1,h=p.big?4.4:2.3;
   if(ns){bodies.push({x:cx,y:h/2,z:cz+s*d*.05,sx:w*.92,sy:h,sz:d*.62});tabs.push({x:cx,y:.25,z:cz+s*d*.38,sx:w*.7,sy:.5,sz:d*.22});for(const o of [-1,1])legs.push({x:cx+o*w*.28,y:.3,z:cz-s*d*.38,sx:w*.12,sy:.5,sz:d*.26})}
   else{bodies.push({x:cx+s*w*.05,y:h/2,z:cz,sx:w*.62,sy:h,sz:d*.92});tabs.push({x:cx+s*w*.38,y:.25,z:cz,sx:w*.22,sy:.5,sz:d*.7});for(const o of [-1,1])legs.push({x:cx-s*w*.38,y:.3,z:cz+o*d*.28,sx:w*.26,sy:.5,sz:d*.12})}
  }
  inst(L.vrm,'vrm',unitRound,chipBody('vrm'),bodies);inst(L.vrm,'vrm',unitBox,tin('vrm'),[...tabs,...legs]);
 }

 // ═════ Small parts: packages, the coin holder, crystals, passives ═════
 {
  const leads:Item[]=[];
  CHIPS.forEach((c,i)=>{
   const [cx,cz]=C(c.b),w=W(c.b),d=D(c.b);rbox(L.chips,'chips',chipBody('chips'),cx,cz,w,d,.1,c.h,.25);
   flatDecal(L.chips,'chips',chipTop(w,d,c.lines,c.logo,i+3),cx,cz,w-.3,d-.3,c.h+.004);
   const row=(along:'x'|'z',fixed:number,out:number,count:number,span:number)=>{for(let k=0;k<count;k++){const t=(k-(count-1)/2)*c.pitch;if(Math.abs(t)>span/2)continue;const L0=c.reach+.25;
    leads.push(along==='x'?{x:cx+t,y:.35,z:fixed+out*L0/2,sx:c.pitch*.45,sy:.18,sz:L0}:{x:fixed+out*L0/2,y:.35,z:cz+t,sx:L0,sy:.18,sz:c.pitch*.45})}};
   if(c.sides==='all'){const nx=Math.round((w-1.5)/c.pitch),nz=Math.round((d-1.5)/c.pitch);row('x',c.b[1],-1,nx,w-1.2);row('x',c.b[3],1,nx,w-1.2);row('z',c.b[0],-1,nz,d-1.2);row('z',c.b[2],1,nz,d-1.2)}
   else if(c.sides==='tb'){row('x',c.b[1],-1,c.pins,w);row('x',c.b[3],1,c.pins,w)}else{row('z',c.b[0],-1,c.pins,d);row('z',c.b[2],1,c.pins,d)}
  });
  inst(L.chips,'chips',unitBox,tin('chips'),leads,false);
  // CR2032 holder: a black round cradle, its spring clip across the top, the cell's edge showing.
  {const {x,z,r,h}=COIN;b.put(L.chips,'chips',lathe([[0,0],[r,0],[r,h],[r-1,h],[r-1,1.4],[0,1.4]],56),plastic('chips',0x18191b,.5,'coin')).position.set(x,0,z);
   b.put(L.chips,'chips',new THREE.CylinderGeometry(r-1.3,r-1.3,.2,48),once('cellfloor','chips',()=>new THREE.MeshStandardMaterial({color:0x111214,roughness:.6}))).position.set(x,1.5,z);
   rbox(L.chips,'chips',nickel('chips'),x-.5,z-.5,15,3.6,h-.4,h+.25,.3);rbox(L.chips,'chips',dark('chips'),x-1.5,z-.5,10,1.4,h+.25,h+.27,.05);rbox(L.chips,'chips',nickel('chips'),x+r+1.6,z,2.4,3,0,2.4,.3)}
  for(const xt of XTALS){const [cx,cz]=C(xt.b);if(xt.round){const g=new THREE.CylinderGeometry(1.5,1.5,D(xt.b)*.8,20);g.rotateX(Math.PI/2);b.put(L.chips,'chips',g,nickel('chips')).position.set(cx,1.6,cz)}else rbox(L.chips,'chips',nickel('chips'),cx,cz,W(xt.b)*.9,D(xt.b)*.95,0,3.6,1.6)}
  // Passives: one instanced body per kind, coloured per part, and tinned end caps.
  const list=smds(),body:Item[]=[],ends:Item[]=[],random=(n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;
  const colourOf=(k:string,i:number)=>new THREE.Color(k==='r'?0x151618:k==='d'?0x1c1d20:(random(i)<.5?0x6b5236:0x4f3d2a));
  list.forEach((s,i)=>{const e=s.l*.18;body.push({x:s.x,y:s.h/2,z:s.z,sx:s.turn?s.w:s.l-e*2,sy:s.h,sz:s.turn?s.l-e*2:s.w,c:colourOf(s.kind,i)});
   for(const sg of [-1,1])ends.push(s.turn?{x:s.x,y:s.h/2,z:s.z+sg*(s.l/2-e/2),sx:s.w*1.02,sy:s.h*1.02,sz:e}:{x:s.x+sg*(s.l/2-e/2),y:s.h/2,z:s.z,sx:e,sy:s.h*1.02,sz:s.w*1.02})});
  inst(L.chips,'chips',unitBox,own('chips',new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5})),body,false);
  inst(L.chips,'chips',unitBox,tin('chips'),ends,false);
 }

 return {rotor,boardMats};
}
