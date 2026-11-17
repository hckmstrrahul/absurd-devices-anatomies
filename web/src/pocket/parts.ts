import * as THREE from 'three';
import {at,footprints,outline,spots,SHELL,PCB,SCREEN,DPAD,BTN,MENU,BAY,POSTS,BATTERY,SCREWS,LEDS,SMD,type Footprint,type P2} from './layout';
import {boardTexture,makeLcd,tintTexture,haloTexture,cellLabel} from './textures';
import {slab,lathe,type Builder} from '../kit/builder';
import type {Kind} from '../kit/materials';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';

// Plan helpers. Everything is drawn as (x, z) points; a shape's y is −z so `slab` puts it the right way up.
const shape=(pts:P2[])=>{const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s};
const hole=(pts:P2[])=>{const s=new THREE.Path();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s};
const holed=(outer:P2[],...inner:P2[][])=>{const s=shape(outer);for(const h of inner)s.holes.push(hole(h));return s};
const circle=(cx:number,cz:number,r:number,n=48):P2[]=>Array.from({length:n},(_,i)=>[cx+Math.cos(i/n*Math.PI*2)*r,cz+Math.sin(i/n*Math.PI*2)*r]);
function rect(cx:number,cz:number,w:number,d:number,r=0,n=6):P2[]{
 if(r<=0)return [[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]];
 const pts:P2[]=[];
 [[1,-1,-90],[1,1,0],[-1,1,90],[-1,-1,180]].forEach(([sx,sz,from])=>{for(let i=0;i<=n;i++){const a=(from+i/n*90)*Math.PI/180;pts.push([cx+sx*(w/2-r)+Math.cos(a)*r,cz+sz*(d/2-r)+Math.sin(a)*r])}});
 return pts;
}
// Outline of two overlapping discs, grown by `grow`: the lilac pill.
function pill(grow:number,n=40):P2[]{
 const {a,b}=BTN,mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,pts:P2[]=[];
 for(const [c,o] of [[a,b],[b,a]] as const)for(const [x,z] of circle(c.x,c.z,c.r+grow,n))if(Math.hypot(x-o.x,z-o.z)>=o.r+grow)pts.push([x,z]);
 return pts.sort((p,q)=>Math.atan2(p[1]-mz,p[0]-mx)-Math.atan2(q[1]-mz,q[0]-mx));
}
// B is a crescent: its own disc, cut back from A by the gap.
function crescent(n=36):P2[]{
 const {a,b,gap}=BTN,ra=a.r+gap,rb=b.r,d=Math.hypot(a.x-b.x,a.z-b.z),phi=Math.atan2(a.z-b.z,a.x-b.x),psi=phi+Math.PI;
 const beta=Math.acos((d*d+rb*rb-ra*ra)/(2*d*rb)),alpha=Math.acos((d*d+ra*ra-rb*rb)/(2*d*ra)),pts:P2[]=[];
 for(let i=0;i<=n;i++){const t=phi+beta+i/n*(Math.PI*2-beta*2);pts.push([b.x+Math.cos(t)*rb,b.z+Math.sin(t)*rb])}
 for(let i=1;i<12;i++){const t=psi+alpha-i/12*alpha*2;pts.push([a.x+Math.cos(t)*ra,a.z+Math.sin(t)*ra])}
 return pts;
}
// Flat sheet in plan with a texture stretched over the given box.
function sheet(pts:P2[],y:number,x0:number,z0:number,w:number,d:number){
 const g=new THREE.ShapeGeometry(shape(pts),8),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-x0)/w,1-(-p.getY(i)-z0)/d);
 g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;
}
// A key cap: extruded with rounded top and bottom edges, standing from y0 to y1.
function cap(pts:P2[],y0:number,y1:number,round:number){
 const g=new THREE.ExtrudeGeometry(shape(pts),{depth:y1-y0-round*2,bevelEnabled:true,bevelThickness:round,bevelSize:round,bevelOffset:-round,bevelSegments:4,curveSegments:24});
 g.rotateX(-Math.PI/2);g.translate(0,y0+round,0);return g;
}

export function buildPocket(b:Builder){
 const {m,put,box,cyl}=b;
 const layer=(asm:AssemblyId,lift?:V3,base?:V3)=>b.layer(asm,lift,base);
 type Mat=Kind|THREE.Material;
 const own=<T extends THREE.Material>(asm:AssemblyId,material:T)=>m.own(asm,material);
 const std=(asm:AssemblyId,p:THREE.MeshStandardMaterialParameters)=>own(asm,new THREE.MeshStandardMaterial(p));
 const phys=(asm:AssemblyId,p:THREE.MeshPhysicalMaterialParameters)=>own(asm,new THREE.MeshPhysicalMaterial(p));
 const clear=<T extends THREE.Object3D>(o:T)=>{o.castShadow=false;return o};
 // Thin clear covers: almost invisible face-on, so what lies under them keeps its colour.
 const sheer=(asm:AssemblyId)=>phys(asm,{color:0xffffff,transparent:true,opacity:.07,roughness:.04,clearcoat:1,envMapIntensity:1.2,depthWrite:false});
 const satin=(asm:AssemblyId)=>std(asm,{color:0xb4b9c0,roughness:.5,metalness:1});
 // Cylinders lying along Z or X.
 const zcyl=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x:number,y:number,z0:number,z1:number,r:number,seg=32)=>{const g=new THREE.CylinderGeometry(r,r,Math.abs(z1-z0),seg);g.rotateX(Math.PI/2);const mesh=put(parent,asm,g,kind);mesh.position.set(x,y,(z0+z1)/2);return mesh};
 const xcyl=(parent:THREE.Object3D,asm:AssemblyId,kind:Mat,x0:number,x1:number,y:number,z:number,r:number,seg=32)=>{const g=new THREE.CylinderGeometry(r,r,Math.abs(x1-x0),seg);g.rotateZ(Math.PI/2);const mesh=put(parent,asm,g,kind);mesh.position.set((x0+x1)/2,y,z);return mesh};
 type Item={x:number;y:number;z:number;ry?:number;rz?:number;sx?:number;sy?:number;sz?:number};
 const dummy=new THREE.Object3D();
 const many=(parent:THREE.Object3D,asm:AssemblyId,geometry:THREE.BufferGeometry,kind:Mat,items:Item[])=>{
  const mesh=new THREE.InstancedMesh(geometry,typeof kind==='string'?m.mat(asm,kind):kind,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});
  return b.adopt(parent,asm,mesh,items.length);
 };
 const S=SHELL,Bd=PCB.y1;

 // ── Shells ──────────────────────────────────────────────────────────────
 // Clear walls show as a pale band from above; faces are pass-through acrylic with bright edge lines.
 const shellParts=(asm:'front'|'back')=>{
  const wall=phys(asm,{color:0xf2f8ff,transparent:true,opacity:.24,roughness:.05,clearcoat:1,envMapIntensity:1.6,depthWrite:false});
  const rib=phys(asm,{color:0xffffff,transparent:true,opacity:.13,roughness:.05,clearcoat:1,envMapIntensity:1.4,depthWrite:false});
  const line=own(asm,new THREE.LineBasicMaterial({color:0xf2f9ff,transparent:true,opacity:.6}));
  const tint=own(asm,new THREE.MeshBasicMaterial({map:m.texture(tintTexture(asm==='front'?1:.7)),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  const edged=(parent:THREE.Object3D,geometry:THREE.BufferGeometry,kind:Mat)=>{
   const mesh=clear(put(parent,asm,geometry,kind,false));
   mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,40),line));return mesh;
  };
  return {wall,rib,line,tint,edged};
 };
 const outer=outline(0),inner=outline(S.wall);
 {
  const back=layer('back'),{wall,rib,tint,edged}=shellParts('back');
  edged(back,slab(shape(outer),0,S.floor),'acrylic');
  edged(back,slab(holed(outer,inner),S.floor,S.split),wall);
  clear(put(back,'back',sheet(outer,S.floor+.03,-S.w/2,-S.h/2,S.w,S.h),tint,false));
  // Cradle for the cell, saddles for the cartridge bay, bosses for the screws and the board.
  const c=BATTERY;
  for(const sx of [-1,1])clear(box(back,'back',rib,c.x+sx*(c.w/2+.9),c.z,1,c.d-8,S.floor,5.5));
  for(const sz of [-1,1])clear(box(back,'back',rib,c.x,c.z+sz*(c.d/2+.9),c.w-8,1,S.floor,5.5));
  for(const x of [-24,26])clear(box(back,'back',rib,x,BAY.z,2,BAY.d-2,S.floor,BAY.y0));
  SCREWS.forEach(([x,z],i)=>{clear(cyl(back,'back',rib,x,z,1.9,S.floor,i<2?S.split:PCB.y0,24));cyl(back,'back','brass',x,z,1,S.floor,S.floor+3,16)});
  for(const [x,z] of [[-34,-50],[34,-50],[-34,2],[30,10],[0,58]])clear(cyl(back,'back',rib,x,z,1.3,S.floor,PCB.y0,16));
  for(let i=0;i<7;i++)clear(box(back,'back',rib,-27+i*1.6,-18,.6,14,S.floor,S.floor+.5));
 }
 {
  const front=layer('front'),{wall,rib,tint,edged}=shellParts('front');
  const holes=[circle(DPAD.x,DPAD.z,9.6),pill(.5),circle(BTN.start.x,BTN.start.z,BTN.start.r+.4,32),circle(BTN.select.x,BTN.select.z,BTN.select.r+.4,32),rect(MENU.x,MENU.z,MENU.w+.8,MENU.d+.8,1.9)];
  edged(front,slab(holed(outer,...holes),S.plate,S.top),'acrylic');
  edged(front,slab(holed(outer,inner),S.split,S.plate),wall);
  // Chamfer highlights round the face: the bright rim a thick clear moulding shows from above.
  clear(put(front,'front',slab(holed(outer,outline(1.5)),S.top,S.top+.05),wall,false));
  clear(put(front,'front',slab(holed(outline(3.2),outline(3.7)),S.plate-.3,S.plate),rib,false));
  clear(put(front,'front',sheet(outer,S.top+.03,-S.w/2,-S.h/2,S.w,S.h),tint,false));
  // Lip round the screen window, a collar round each key, a rib across under the screen.
  const sc=SCREEN;
  edged(front,slab(holed(rect(sc.x,sc.z,sc.w+3,sc.d+3,sc.r+1.5),rect(sc.x,sc.z,sc.w+1,sc.d+1,sc.r+.5)),sc.y1+.2,S.plate),rib);
  // The step across the face under the screen, which reads as a bright line in the reference.
  clear(box(front,'front',phys('front',{color:0xffffff,transparent:true,opacity:.55,roughness:.1,depthWrite:false}),0,-9.7,84.6,.3,S.plate-.5,S.plate));
  clear(put(front,'front',slab(holed(circle(DPAD.x,DPAD.z,10.8),circle(DPAD.x,DPAD.z,9.6)),21.7,S.plate),rib,false));
  edged(front,slab(holed(pill(1.1),pill(.5)),16,S.plate),rib);
  edged(front,slab(holed(rect(MENU.x,MENU.z,MENU.w+2.4,MENU.d+2.4,2.7),rect(MENU.x,MENU.z,MENU.w+.8,MENU.d+.8,1.9)),15,S.plate),rib);
  for(const sx of [-1,1]){
   clear(box(front,'front',rib,sx*42.05,-34,.9,38,S.split+.5,S.plate));
   clear(box(front,'front',rib,sx*42.05,32,.9,22,S.split+.5,S.plate));
   for(const z of [-50,-20,24,40])clear(box(front,'front',rib,sx*41.9,z,1.2,3,S.split,S.split+3));
  }
  SCREWS.forEach(([x,z])=>{
   clear(cyl(front,'front',rib,x,z,1.9,S.split,S.plate,24));
   cyl(front,'front','brass',x,z,2.2,S.top,S.top+.25,28);cyl(front,'front','brass',x,z,1.6,S.top+.25,S.top+.8,24);
   const slot=box(front,'front','darksteel',x,z,2.2,.4,S.top+.7,S.top+.85);slot.rotation.y=.6;clear(slot);
   const cross=box(front,'front','darksteel',x,z,.4,2.2,S.top+.7,S.top+.85);cross.rotation.y=.6;clear(cross);
  });
 }

 // ── Logic board ─────────────────────────────────────────────────────────
 const board=layer('board');
 const cpuGlow=std('board',{color:0x4a1410,roughness:.4,emissive:0xff3418,emissiveIntensity:.3});
 {
  const bw=PCB.x1-PCB.x0,bd=PCB.z1-PCB.z0,bx=(PCB.x0+PCB.x1)/2,bz=(PCB.z0+PCB.z1)/2,plan=rect(bx,bz,bw,bd,PCB.r);
  put(board,'board',slab(shape(plan),PCB.y0,PCB.y1),std('board',{color:0x0f3f7c,roughness:.55}));
  clear(put(board,'board',sheet(plan,PCB.y1+.02,PCB.x0,PCB.z0,bw,bd),std('board',{map:m.texture(boardTexture()),roughness:.5,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),false));
  const champagne=std('board',{color:0xcbb07c,roughness:.38,metalness:1}),matte=std('board',{color:0x24211f,roughness:.62});
  const cyan=std('board',{color:0x25c7dc,roughness:.35}),blue=std('board',{color:0x2b74d8,roughness:.3});
  const steelPins:Item[]=[],goldPins:Item[]=[],marks:Item[]=[];
  // Gull-wing leads: `sides` 4 for a quad pack, 2 for a small-outline pack with leads on its Z sides.
  const leads=(f:Footprint,sides:number,list:Item[],reach=.55)=>{
   for(let side=0;side<sides;side++){
    const along=side<2?f.w!:f.d!,pitch=along/(f.pins!+1),w=pitch*.5;
    for(let i=1;i<=f.pins!;i++){
     const o=-along/2+i*pitch,q=(side%2?1:-1)*((side<2?f.d!:f.w!)/2+reach/2);
     list.push(side<2?{x:f.x+o,y:Bd+.2,z:f.z+q,sx:w,sz:reach+.3}:{x:f.x+q,y:Bd+.2,z:f.z+o,sx:reach+.3,sz:w});
    }
   }
  };
  for(const f of footprints.filter(f=>f.asm==='board')){
   const w=f.w??0,d=f.d??0;
   if(f.kind==='cpu'){
    put(board,'board',slab(holed(rect(f.x,f.z,w+4,d+4,1.2),rect(f.x,f.z,w+2.6,d+2.6,.3)),Bd,Bd+.5),cyan);
    put(board,'board',cap(rect(f.x,f.z,w,d,.9),Bd+.25,f.y1,.25),'chip');
    leads(f,4,steelPins,.9);
    cyl(board,'board','slate',f.x-w/2+1.6,f.z+d/2-1.6,.5,f.y1,f.y1+.04,12);
    box(board,'board',cpuGlow,f.x,f.z+d/2+2.3,w-1,.5,Bd,Bd+.45);
   }else if(f.kind==='shield'){
    box(board,'board','darksteel',f.x,f.z,w+.8,d+.8,Bd,Bd+.5);
    put(board,'board',cap(rect(f.x,f.z,w,d,1),Bd+.5,f.y1,.3),champagne);
    for(const dx of [-3.3,3.3])box(board,'board','darksteel',f.x+dx,f.z,.25,d-1.6,f.y1-.05,f.y1+.04);
    for(const dx of [-6.6,0,6.6])box(board,'board',champagne,f.x+dx,f.z,5.6,d-3,f.y1,f.y1+.18);
    for(const [dx,dz,tw,td] of [[-w/2-.15,-3,.3,3],[-w/2-.15,4,.3,3],[w/2+.15,-3,.3,3],[w/2+.15,4,.3,3],[-5,d/2+.15,3,.3],[5,d/2+.15,3,.3]])box(board,'board',champagne,f.x+dx,f.z+dz,tw,td,Bd,Bd+1.6);
    cyl(board,'board','darksteel',f.x-w/2+1.6,f.z-d/2+1.6,.45,f.y1,f.y1+.05,12);
   }else if(f.kind==='window'){
    put(board,'board',cap(rect(f.x,f.z,w,d,1),Bd,f.y1,.3),matte);
    for(const sx of [-1,1])for(const sz of [-1,1])box(board,'board','gold',f.x+sx*(w/2+.25),f.z+sz*(d/2-1.4),.5,1.8,Bd,f.y1-.5);
    put(board,'board',slab(shape(rect(f.x+.6,f.z+.4,4.6,2.2,.8)),f.y1,f.y1+.06),'gloss');
    put(board,'board',slab(holed(rect(f.x+.6,f.z+.4,5.4,3,1.1),rect(f.x+.6,f.z+.4,4.6,2.2,.8)),f.y1,f.y1+.2),'black');
   }else if(f.kind==='soic'){
    put(board,'board',cap(rect(f.x,f.z,w,d,.5),Bd+.15,f.y1,.15),'chip');leads(f,2,goldPins,.9);
    marks.push({x:f.x,y:f.y1+.03,z:f.z,ry:Math.PI/4,sx:w*.42,sz:w*.42});
   }else if(f.kind==='qfp'){
    put(board,'board',cap(rect(f.x,f.z,w,d,.6),Bd+.15,f.y1,.15),'chip');leads(f,4,steelPins);
    cyl(board,'board','slate',f.x-w/2+.9,f.z+d/2-.9,.3,f.y1,f.y1+.04,10);
   }else if(f.kind==='plain'){
    box(board,'board','chip',f.x,f.z,w,d,Bd+.4,f.y1);box(board,'board','steel',f.x,f.z,w+.8,d*.5,Bd,Bd+.4);
   }else if(f.kind==='osc'){
    box(board,'board','steel',f.x,f.z,w,d,Bd,f.y1);box(board,'board','slate',f.x,f.z,w*.45,d*.45,f.y1,f.y1+.05);
   }else if(f.kind==='header'){
    box(board,'board','black',f.x,f.z-.7,w,d-1.4,Bd,f.y1);
    for(let i=0;i<f.pins!;i++)goldPins.push({x:f.x-w/2+.6+i*(w-1.2)/(f.pins!-1),y:Bd+.35,z:f.z+d/2-.6,sx:.5,sy:2.4,sz:1.2});
   }else if(f.kind==='choke'){
    box(board,'board','gloss',f.x,f.z,w,d-2.4,Bd,f.y1);box(board,'board','black',f.x,f.z,w-1,d-3.4,f.y1,f.y1+.3);
    for(let i=0;i<5;i++)for(const sz of [-1,1])goldPins.push({x:f.x-w/2+.8+i*(w-1.6)/4,y:Bd+.6,z:f.z+sz*(d/2-.6),sx:.45,sy:4,sz:1.2});
   }else if(f.kind==='conn'){
    box(board,'board',f.id==='jst'?'slate':'black',f.x,f.z,w,d,Bd,f.y1);box(board,'board','gold',f.x,f.z,w-1.4,d*.3,f.y1-.15,f.y1+.03);
   }else if(f.kind==='jack'){
    put(board,'board',lathe([[0,Bd],[f.r!,Bd],[f.r!,f.y1-.3],[f.r!-.35,f.y1],[.95,f.y1],[.95,Bd+.8],[0,Bd+.8]],28),'brass').position.set(f.x,0,f.z);
    cyl(board,'board','black',f.x,f.z,.9,Bd+.8,Bd+.86,16);
   }else if(f.kind==='xtal'){
    cyl(board,'board','steel',f.x,f.z,f.r!,Bd,f.y1,24);box(board,'board','darksteel',f.x,f.z,1.7,.25,f.y1,f.y1+.05);
   }else if(f.kind==='trim'){
    box(board,'board',blue,f.x,f.z,w,d,Bd,f.y1);cyl(board,'board','brass',f.x,f.z,.8,f.y1,f.y1+.1,16);
   }
  }
  const pin=new THREE.BoxGeometry(1,.3,1);
  many(board,'board',pin,'steel',steelPins);many(board,'board',pin,'gold',goldPins);
  clear(many(board,'board',new THREE.BoxGeometry(1,.04,1),'black',marks));
  // Scattered surface-mount parts: black chips, tan and orange capacitors, grey resistors, gold test pads.
  const finishes:Mat[]=['chip',std('board',{color:0xcaa276,roughness:.5}),std('board',{color:0xdc7a2c,roughness:.45}),'slate','gold'];
  SMD.forEach((t,k)=>{
   const mine=spots.filter(s=>s.type===k);
   many(board,'board',t.name==='pad'?new THREE.CylinderGeometry(t.w/2,t.w/2,t.h,14):new THREE.BoxGeometry(t.w,t.h,t.d),finishes[k],mine.map(s=>({x:s.x,y:Bd+t.h/2,z:s.z,ry:s.turn?Math.PI/2:0})));
   // Tinned end caps on the capacitors.
   if(t.name==='tan'||t.name==='orange')many(board,'board',new THREE.BoxGeometry(.28,t.h+.04,t.d+.04),'steel',mine.flatMap(s=>[-1,1].map(e=>({x:s.x+(s.turn?0:e*(t.w/2-.1)),y:Bd+t.h/2,z:s.z+(s.turn?e*(t.w/2-.1):0),ry:s.turn?Math.PI/2:0}))));
  });
  for(const [x,z] of [[PCB.x0+2.2,PCB.z0+2.2],[PCB.x1-2.2,PCB.z0+2.2],[0,PCB.z1-1.6]])cyl(board,'board','gold',x,z,1.1,Bd,Bd+.08,20);
 }

 // ── Screen module ───────────────────────────────────────────────────────
 const lcd=makeLcd();m.texture(lcd.texture);
 {
  const sc=SCREEN,bz=sc.bezel,frame=layer('screen'),light=layer('screen',[0,-14,0]),panel=layer('screen',[0,-6,0]),lens=layer('screen',[0,14,0]);
  const shellCyan=phys('screen',{color:0x2b9ccd,transparent:true,opacity:.84,roughness:.26,clearcoat:.7,clearcoatRoughness:.2,envMapIntensity:1});
  const rim=std('screen',{color:0x74dcf2,roughness:.3,transparent:true,opacity:.9}),cover=sheer('screen');
  const teal=std('screen',{color:0x0e6f6c,roughness:.3}),dark=std('screen',{color:0x08161d,roughness:.55,envMapIntensity:.35});
  const key=std('screen',{color:0x1c5d78,roughness:.4}),red=std('screen',{color:0xd0362a,roughness:.4,emissive:0xff2a12,emissiveIntensity:.35});
  const plan=rect(sc.x,sc.z,sc.w,sc.d,sc.r);
  put(frame,'screen',slab(shape(plan),sc.y0,sc.y0+1),shellCyan);
  put(frame,'screen',slab(holed(plan,rect(bz.x,bz.z,bz.w,bz.d,1.6)),sc.y0+1,sc.y1),shellCyan);
  clear(put(frame,'screen',slab(holed(plan,rect(sc.x,sc.z,sc.w-1.4,sc.d-1.4,sc.r-.7)),sc.y1,sc.y1+.12),rim,false));
  for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])cyl(frame,'screen','steel',sc.x+sx*(sc.w/2-3),sc.z+sz*(sc.d/2-3),1,Bd,sc.y0,14);
  // Backlight: reflector can, light guide and a strip of side-firing LEDs.
  box(light,'screen','steel',bz.x,bz.z,bz.w-.6,bz.d-.6,15,15.6);
  box(light,'screen','frost',bz.x,bz.z,bz.w-2,bz.d-2,15.8,17.4);
  for(let i=0;i<8;i++)box(light,'screen','white',bz.x-21+i*6,bz.z+bz.d/2-1.6,1.6,.8,15.8,16.9);
  // LCD glass, the lit active area, and the dark mask round it.
  box(panel,'screen',teal,bz.x,bz.z,bz.w-.6,bz.d-.6,17.6,19.6);
  const face=put(panel,'screen',new THREE.PlaneGeometry(sc.lcd.w,sc.lcd.d),std('screen',{color:0x000000,roughness:.3,emissive:0xffffff,emissiveMap:lcd.texture,emissiveIntensity:.92,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),false);
  face.rotation.x=-Math.PI/2;face.position.set(sc.lcd.x,19.63,sc.lcd.z);
  put(panel,'screen',slab(holed(rect(bz.x,bz.z,bz.w-.4,bz.d-.4,1.4),rect(sc.lcd.x,sc.lcd.z,sc.window.w,sc.window.d,.6)),19.6,20.1),dark);
  box(panel,'screen','wireOrange',0,-13.5,14,5,13.65,13.85);
  clear(put(lens,'screen',slab(shape(rect(bz.x,bz.z,bz.w-.4,bz.d-.4,1.4)),20.3,21),cover,false));
  // Details on the frame face, traced from the reference.
  const y=sc.y1;
  put(frame,'screen',slab(shape(rect(-32.2,-52.7,3.6,3.6,1)),y,y+.5),shellCyan);
  b.torus(frame,'screen',std('screen',{color:0x1bbfd6,roughness:.3}),[32.1,y+.25,-52.9],1.7,.42,32);
  for(const dx of [-.5,.5])box(frame,'screen',key,32.1+dx,-52.9,.3,1.5,y,y+.3);box(frame,'screen',key,32.1,-52.9,1,.3,y,y+.3);
  for(const dx of [-.9,.9]){cyl(frame,'screen',key,-32.2+dx,-14.7,.55,y,y+.3,14);cyl(frame,'screen',red,32.1+dx,-14.7,.55,y,y+.3,14)}
  b.screw(frame,'screen',-31.5,-9.7,y,1.3);
  put(frame,'screen',slab(shape(rect(-19.4,-9.5,16.3,2.5,1.25)),y,y+.35),'slate');
  clear(many(frame,'screen',new THREE.BoxGeometry(.32,.12,1.7),'black',Array.from({length:22},(_,i)=>({x:-26.2+i*.65,y:y+.4,z:-9.5}))));
  for(const x of [-7.9,-4.4])put(frame,'screen',cap(rect(x,-9.7,2.6,2.6,.6),y,y+.6,.15),key);
  for(const x of [15.3,19.6,31.9]){put(frame,'screen',cap(rect(x,-9.7,3,3,.7),y,y+.6,.15),key);put(frame,'screen',slab(shape(rect(x,-9.7,1.5,1.5,.3)),y+.6,y+.68),dark)}
  const port:P2[]=[...Array.from({length:25},(_,i):P2=>[5.6-Math.cos(i/24*Math.PI)*5.5,-5.8-Math.sin(i/24*Math.PI)*4.6])];
  put(frame,'screen',slab(shape(port),y,y+.3),dark);
 }

 // ── Controls ────────────────────────────────────────────────────────────
 const keys={} as Record<'cross'|'a'|'b'|'start'|'select',THREE.Object3D>;
 {
  const membranes=layer('controls',[0,-16,0]),wells=layer('controls',[0,-6,0]),caps=layer('controls',[0,10,0]);
  const silicone=phys('controls',{color:0xe6ecf2,transparent:true,opacity:.7,roughness:.7});
  const ring=std('controls',{color:0x14d2e8,roughness:.28}),dish=std('controls',{color:0x3aa9c4,roughness:.42});
  const lilac=phys('controls',{color:0xc9c8ff,roughness:.3,clearcoat:.6,emissive:0x8f8cff,emissiveIntensity:.18});
  const yellow=phys('controls',{color:0xffc61c,roughness:.3,clearcoat:.5,emissive:0xffa000,emissiveIntensity:.12});
  const amber=phys('controls',{color:0xf5861c,roughness:.34,clearcoat:.4,emissive:0xff6a00,emissiveIntensity:.1});
  const mem=(id:string)=>at(id);
  // Membranes: silicone sheets with a dome and a carbon pill under each key.
  cyl(membranes,'controls',silicone,DPAD.x,DPAD.z,mem('mem-dpad').r!,mem('mem-dpad').y0,12.7,48);
  put(membranes,'controls',slab(shape(pill(.2)),mem('mem-ab').y0,12.7),silicone);
  {const f=mem('mem-ss');put(membranes,'controls',slab(shape(rect(f.x,f.z,f.w!,f.d!,4)),f.y0,12.7),silicone)}
  const domes:P2[]=[[DPAD.x,DPAD.z-6],[DPAD.x+6,DPAD.z],[DPAD.x,DPAD.z+6],[DPAD.x-6,DPAD.z],[BTN.a.x,BTN.a.z],[BTN.b.x+1,BTN.b.z],[BTN.start.x,BTN.start.z],[BTN.select.x,BTN.select.z]];
  for(const [x,z] of domes){put(membranes,'controls',lathe([[0,12.7],[2.6,12.7],[2.2,13.4],[1.4,13.6],[0,13.6]],24),silicone).position.set(x,0,z);clear(cyl(membranes,'controls','rubber',x,z,1.1,13.6,13.64,16))}
  // D-pad: a cyan well, and a black cross that rocks on a steel ball.
  const r=DPAD.r;
  put(wells,'controls',lathe([[0,14],[r,14],[r,21.1],[r-.4,21.5],[r-1.2,21.5],[r-1.6,21.1],[r-2.2,19.75],[0,19.6]],72),ring).position.set(DPAD.x,0,DPAD.z);
  cyl(wells,'controls',dish,DPAD.x,DPAD.z,r-2.3,19.6,19.78,64);
  cyl(wells,'controls','steel',DPAD.x,DPAD.z,1.5,19.78,19.8,20);
  const crossAt=b.pivot(caps,[DPAD.x,DPAD.pivot,DPAD.z]);keys.cross=crossAt;
  const a=DPAD.arm/2,s=DPAD.span/2,plus:P2[]=[[-a,-s],[a,-s],[a,-a],[s,-a],[s,a],[a,a],[a,s],[-a,s],[-a,a],[-s,a],[-s,-a],[-a,-a]];
  put(crossAt,'controls',cap(plus,0,DPAD.top-DPAD.pivot,.7),'gloss');
  b.ball(crossAt,'controls','steel',[0,-.3,0],.5,16);
  // Face buttons. Each rides on its own pivot so it can sink by its travel.
  const button=(id:'a'|'b'|'start'|'select',pts:P2[],material:THREE.Material,round:number,y1=BTN.y1)=>{const node=b.pivot(caps);keys[id]=node;put(node,'controls',cap(pts,BTN.y0,y1,round),material);return node};
  button('a',circle(BTN.a.x,BTN.a.z,BTN.a.r,56),lilac,1.1);
  button('b',crescent(),lilac,1.1);
  button('start',circle(BTN.start.x,BTN.start.z,BTN.start.r,40),yellow,.8,BTN.y1-.2);
  button('select',circle(BTN.select.x,BTN.select.z,BTN.select.r,48),amber,.9);
  const st=BTN.start;
  put(wells,'controls',lathe([[st.r+.3,19],[st.ring,19],[st.ring,21.7],[st.ring-.6,22.3],[st.r+.9,22.3],[st.r+.3,21.6],[st.r+.3,19]],56),'gloss').position.set(st.x,0,st.z);
  // Menu key on its own small board in the left grip.
  box(wells,'controls','navy',MENU.x,65.4,12,4.2,PCB.y0,PCB.y1);box(wells,'controls','black',MENU.x,MENU.z,6,2.8,PCB.y1,14.4);
  for(const dx of [-3.4,3.4])box(wells,'controls','steel',MENU.x+dx,MENU.z,.8,2,PCB.y1,PCB.y1+.5);
  put(caps,'controls',cap(rect(MENU.x,MENU.z,MENU.w,MENU.d,1.5),14.7,25,.6),amber);
 }

 // ── Cartridge bay ───────────────────────────────────────────────────────
 {
  const tube=layer('bay'),dock=layer('bay',[0,8,0]),capsule=layer('bay',[0,22,0]),cover=sheer('bay');
  const Y=BAY.axis.y,Z=BAY.axis.z;
  const line=own('bay',new THREE.LineBasicMaterial({color:0xf2f9ff,transparent:true,opacity:.55}));
  const body=slab(holed(rect(BAY.x,BAY.z,BAY.w,BAY.d,BAY.r),rect(BAY.x,BAY.z,BAY.w-BAY.wall*2,BAY.d-BAY.wall*2,BAY.r-BAY.wall)),BAY.y0+1,BAY.y1);
  clear(put(tube,'bay',slab(shape(rect(BAY.x,BAY.z,BAY.w,BAY.d,BAY.r)),BAY.y0,BAY.y0+1),'lens',false));
  clear(put(tube,'bay',body,'lens',false)).add(new THREE.LineSegments(new THREE.EdgesGeometry(body,40),line));
  clear(put(tube,'bay',slab(shape(rect(22.2,-68.6,14.5,2.3,1.15)),BAY.y1-2,BAY.y1),'lens',false));
  for(const x of [-12,12])clear(box(tube,'bay','lens',x,BAY.z,1,BAY.d-BAY.wall*2,BAY.y0+1,BAY.y0+2.5));
  // Gold contact comb: a base plate and five blades.
  box(dock,'bay','gold',-33.9,-64.6,4.9,10.4,BAY.y0+1,5.9);box(dock,'bay','gold',-33.9,-69.2,4.9,1.2,5.9,14);
  for(let i=0;i<5;i++)box(dock,'bay','gold',-35.8+i*.95,-64,.5,6.4,5.9,13);
  xcyl(dock,'bay','gold',-31.75,-24.6,Y,Z,.42,10);
  // Slot the capsule's contacts reach, and the feed rod to the right-hand post.
  put(dock,'bay',slab(shape(rect(10.2,Z,11.5,5,1.2)),BAY.y0+2.5,17),std('bay',{color:0x121416,roughness:.6,envMapIntensity:.4}));
  box(dock,'bay','navy',10.2,Z,8.6,1.7,17,17.06);
  many(dock,'bay',new THREE.BoxGeometry(.5,.08,1.3),'gold',Array.from({length:6},(_,i)=>({x:6.9+i*1.32,y:17.1,z:Z})));
  xcyl(dock,'bay','gold',16,33.4,Y,Z,.42,10);box(dock,'bay','gold',34.6,Z,2.4,3,Y-1.5,Y+1.5);
  // Game capsule: a gold plug and a ribbed black grip under a clear cover.
  xcyl(capsule,'bay','gold',-24,-13.5,Y,Z,2.4,32);xcyl(capsule,'bay','brass',-24.6,-24,Y,Z,1.6,20);
  box(capsule,'bay','darksteel',-17.4,Z,3.2,.9,Y+2.2,Y+2.45);
  xcyl(capsule,'bay','gloss',-13.3,-5.2,Y,Z,3,32);
  for(let i=0;i<8;i++)xcyl(capsule,'bay','rubber',-12.9+i*1,-12.4+i*1,Y,Z,3.4,32);
  b.ball(capsule,'bay','gloss',[-5.2,Y,Z],3,24);
  // The cover is a thin open sleeve with a domed end, not a solid.
  {const sleeve=new THREE.CylinderGeometry(4,4,10,32,1,true);sleeve.rotateZ(Math.PI/2);clear(put(capsule,'bay',sleeve,cover,false)).position.set(-9.6,Y,Z);
   const dome=new THREE.SphereGeometry(4,32,12,0,Math.PI*2,0,Math.PI/2);dome.rotateZ(-Math.PI/2);clear(put(capsule,'bay',dome,cover,false)).position.set(-4.6,Y,Z)}
 }

 // ── Power ───────────────────────────────────────────────────────────────
 const leds:{dome:THREE.MeshStandardMaterial;halo:THREE.MeshBasicMaterial}[]=[];
 {
  // Charge posts: knurled thumbscrews through the top edge, one per terminal.
  const metal=satin('power');
  for(const x of POSTS){
   const post=layer('power',[0,0,-24],[x,S.split,-S.h/2]);
   zcyl(post,'power',metal,0,0,-1.7,0,4.4);zcyl(post,'power','darksteel',0,0,-2.7,-1.7,2.4);zcyl(post,'power',metal,0,0,-6.5,-2.7,3.55);
   zcyl(post,'power','steel',0,0,-6.56,-6.5,2.6);zcyl(post,'power','steel',0,0,0,3.3,1.2,16);
   const ring=b.torus(post,'power','rubber',[0,0,-2.2],2.5,.45,28);ring.rotation.x=0;
   many(post,'power',new THREE.BoxGeometry(.34,.3,3.4),'steel',Array.from({length:30},(_,i)=>{const t=i/30*Math.PI*2;return {x:Math.cos(t)*3.6,y:Math.sin(t)*3.6,z:-4.6,rz:t+Math.PI/2}}));
  }
  // Lithium cell under the board, with its leads to the board connector.
  const cell=layer('power'),c=BATTERY;
  put(cell,'power',cap(rect(c.x,c.z,c.w,c.d,1.2),c.y0,c.y1,.5),'aluminium');
  clear(put(cell,'power',sheet(rect(c.x,c.z,c.w-1.2,c.d-1.2,.8),c.y1+.02,c.x-c.w/2,c.z-c.d/2,c.w,c.d),std('power',{map:m.texture(cellLabel(at('cell'))),roughness:.5,metalness:.3,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),false));
  box(cell,'power','wireOrange',c.x,c.z-c.d/2+2,c.w-6,3,c.y1+.03,c.y1+.12);
  const red=std('power',{color:0xd43a2c,roughness:.5});
  [[red,0],['wireGrey',1.1]].forEach(([kind,o])=>b.wire(cell,'power',kind as Mat,[[c.w/2+.45,6,-14.5+(o as number)],[30,4.6,-19+(o as number)],[40.4,5.4,-24+(o as number)],[40.4,11,-27.4+(o as number)],[39.6,13.3,-29.4+(o as number)],[36.6,13.3,-29.5+(o as number)]],.42));
  // Bus bar along the board's left edge, and the two indicator LEDs.
  const onBoard=layer('power',[0,40,0]),rail=at('rail');
  box(onBoard,'power','gold',rail.x,rail.z,rail.w!,rail.d!,rail.y0,rail.y1);
  for(const z of [-52,-30,-9])box(onBoard,'power','gold',rail.x,z,1.4,1.4,rail.y0,rail.y0+.3);
  const halo=m.texture(haloTexture());
  for(const [x,z] of LEDS){
   const dome=std('power',{color:0x7a2418,roughness:.3,emissive:0xff4a1c,emissiveIntensity:1});
   const glow=own('power',new THREE.MeshBasicMaterial({map:halo,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
   box(onBoard,'power','white',x,z,2.6,1.8,Bd,Bd+.5);
   put(onBoard,'power',lathe([[0,Bd+.5],[1.3,Bd+.5],[1.3,Bd+1],[.9,Bd+1.45],[0,Bd+1.6]],24),dome).position.set(x,0,z);
   const disc=put(onBoard,'power',new THREE.PlaneGeometry(17,17),glow,false);disc.rotation.x=-Math.PI/2;disc.position.set(x,Bd+1.7,z);
   leds.push({dome,halo:glow});
  }
  // Power slide on the right edge, with the strap bar below it.
  const side=layer('power',[22,0,0]);
  box(side,'power','slate',45.45,-29,1.9,7,9.5,15.5);box(side,'power','aluminium',46.7,-28,.6,3,10.5,14.5);
  box(side,'power','slate',45.45,4.8,1.9,6,9.5,15.5);
  zcyl(side,'power','brass',45.5,12.5,-25.5,1.8,.5,12);
 }

 return {keys,leds,cpuGlow,lcd};
}
