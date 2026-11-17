import * as THREE from 'three';
import {at,footprints,TRAY,PCB,PLATTER,COIL,ROTOR,KNOB_X,KNOB_Z,px,type Footprint} from './layout';
import {boardTexture,labelTexture} from './textures';
import {rng} from '../kit/util';
import {slab,plate,frame,arc,gear,annulus,lathe,type Builder} from '../kit/builder';
import type {Kind} from '../kit/materials';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';

export function buildOrbit(b:Builder){
 const {m,put,box,cyl,wire,screw}=b;
 const layer=(asm:AssemblyId,lift?:V3,base?:V3)=>b.layer(asm,lift,base);
 const fromPrint=(parent:THREE.Object3D,f:Footprint,kind:Kind|THREE.Material)=>f.r!==undefined?cyl(parent,f.asm,kind,f.x,f.z,f.r,f.y0,f.y1):box(parent,f.asm,kind,f.x,f.z,f.w!,f.d!,f.y0,f.y1);

 // ── Case ────────────────────────────────────────────────────────────────
 const T=TRAY;
 const tray=layer('case');const lid=layer('case',[0,230,0]);
 const edgeMaterial=m.own('case',new THREE.LineBasicMaterial({color:0x7f93a6,transparent:true,opacity:.42}));
 // Case pieces get a small bevel so their edges catch the light.
 const bevelled=(shape:THREE.Shape,y0:number,y1:number)=>{
  const g=new THREE.ExtrudeGeometry(shape,{depth:y1-y0-1.2,bevelEnabled:true,bevelThickness:.6,bevelSize:.6,bevelSegments:3,curveSegments:24});
  g.rotateX(-Math.PI/2);g.translate(0,y0+.6,0);return g;
 };
 const outlined=(parent:THREE.Object3D,geometry:THREE.BufferGeometry)=>{
  const mesh=put(parent,'case',geometry,'crystal',false);
  const lines=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,30),edgeMaterial);lines.userData.edge=true;mesh.add(lines);return mesh;
 };
 outlined(tray,bevelled(plate(T.x,T.z,T.chamfer),T.feet,T.floorTop));
 outlined(tray,bevelled(frame(T.x,T.z,T.chamfer,T.wall),T.floorTop,T.rim));
 put(tray,'case',slab(frame(T.x-14,T.z-14,T.chamfer-3,2),T.floorTop,T.floorTop+4),'crystal',false);
 outlined(lid,bevelled(frame(T.x,T.z,T.chamfer,T.wall),T.rim,T.lidInner));
 outlined(lid,bevelled(plate(T.x,T.z,T.chamfer),T.lidInner,T.top));
 put(lid,'case',slab(frame(T.x-26,T.z-26,T.chamfer-4,1.6),T.lidInner-2,T.lidInner),'crystal',false);
 for(const sz of [-1,1])box(lid,'case','crystal',0,sz*(T.z/2-10),190,9,T.lidInner-4,T.lidInner).castShadow=false;
 for(const x of [-78,-26,26,78])for(const sz of [-1,1])box(lid,'case','crystal',x,sz*(T.z/2-T.wall-2.5),11,5,T.rim-5,T.rim+5).castShadow=false;
 for(const z of [-42,42])for(const sx of [-1,1])box(lid,'case','crystal',sx*(T.x/2-T.wall-2.5),z,5,11,T.rim-5,T.rim+5).castShadow=false;
 for(const f of footprints.filter(f=>f.asm==='case')){fromPrint(tray,f,'crystal').castShadow=false;screw(lid,'case',f.x,f.z,T.top-.85,2,false)}
 for(const sx of [-1,1])for(const sz of [-1,1])cyl(tray,'case','rubber',sx*92,sz*84,7,0,T.feet);

 // ── Logic board ─────────────────────────────────────────────────────────
 const board=layer('board');
 const bw=PCB.x1-PCB.x0,bd=PCB.z1-PCB.z0,bx=(PCB.x0+PCB.x1)/2,bz=(PCB.z0+PCB.z1)/2;
 box(board,'board','white',bx,bz,bw,bd,PCB.y0,PCB.y1);
 const silk=put(board,'board',new THREE.PlaneGeometry(bw,bd),m.own('board',new THREE.MeshStandardMaterial({map:m.texture(boardTexture()),roughness:.62,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);
 silk.rotation.x=-Math.PI/2;silk.position.set(bx,PCB.y1+.02,bz);
 for(const [x,z] of [[PCB.x0+5,PCB.z0+5],[PCB.x1-5,PCB.z0+5],[PCB.x0+5,PCB.z1-5],[PCB.x1-5,PCB.z1-5],[bx,PCB.z0+5],[bx+40,PCB.z1-5]]){
  cyl(board,'board','steel',x,z,2.4,T.floorTop,PCB.y0,6);screw(board,'board',x,z,PCB.y1,1.7);
 }
 const leds:THREE.MeshStandardMaterial[]=[];
 for(const f of footprints.filter(f=>f.asm==='board')){
  const kind=f.id.split('-')[0];
  if(kind==='cap'){
   const silver=f.id==='cap-4';fromPrint(board,f,silver?'aluminium':'slate');
   cyl(board,'board',silver?'steel':'darksteel',f.x,f.z,f.r!*.72,f.y1,f.y1+.25);
   for(const a of [0,2.1,4.2])cyl(board,'board','black',f.x+Math.cos(a)*f.r!*.4,f.z+Math.sin(a)*f.r!*.4,.5,f.y1+.2,f.y1+.35,10);
  }else if(kind==='chip'||kind==='sensor'){
   box(board,'board','steel',f.x,f.z,f.w!+1.8,f.d!-1.6,f.y0,f.y0+.5);fromPrint(board,f,'chip');
   if(kind==='sensor')cyl(board,'board','chrome',f.x,f.z,2,f.y1,f.y1+1.2,24);
   else cyl(board,'board','slate',f.x-f.w!/2+1.3,f.z+f.d!/2-1.3,.45,f.y1,f.y1+.06,10);
  }else if(kind==='conn'){
   fromPrint(board,f,'black');cyl(board,'board','darksteel',f.x,f.z,2.2,f.y1,f.y1+1.6,20);cyl(board,'board','chrome',f.x,f.z,1,f.y1+1.6,f.y1+2.4,14);
  }else if(kind==='slot'){
   fromPrint(board,f,'black');box(board,'board','gold',f.x,f.z,f.w!-5,.7,f.y1-.3,f.y1+.05);
  }else if(kind==='leds'){
   for(let i=0;i<16;i++){
    const led=m.own('board',new THREE.MeshStandardMaterial({color:0x3a2a20,roughness:.4,emissive:0xff7a1c,emissiveIntensity:.05}));leds.push(led);
    box(board,'board',led,f.x-f.w!/2+2+i*(f.w!-4)/15,f.z,2.2,1.4,f.y0,f.y1);
   }
  }else if(kind==='grommet'){
   const ring=put(board,'board',new THREE.TorusGeometry(f.r!-.9,.9,10,28),'navy');ring.rotation.x=Math.PI/2;ring.position.set(f.x,f.y0+.9,f.z);cyl(board,'board','chrome',f.x,f.z,1.3,f.y0,f.y0+1.2,16);
  }else if(f.id==='pad-ring'){
   const ring=put(board,'board',new THREE.TorusGeometry(f.r!-1,1,10,32),'white');ring.rotation.x=Math.PI/2;ring.position.set(f.x,f.y0+1,f.z);cyl(board,'board','black',f.x,f.z,1.6,f.y0,f.y0+.6,16);
  }else if(f.id==='buzzer'){
   fromPrint(board,f,'slate');cyl(board,'board','black',f.x,f.z,1.2,f.y1,f.y1+.05,14);
  }else if(f.id==='test-jack'){
   fromPrint(board,f,'gold');cyl(board,'board','black',f.x,f.z,1.1,f.y1,f.y1+.05,14);
  }else if(f.id==='relay'){
   fromPrint(board,f,'black');box(board,'board','gold',f.x,f.z,f.w!+.4,3,f.y0+2,f.y1+.2);
  }else if(f.id==='regulator'){
   fromPrint(board,f,'frost');box(board,'board','chip',f.x+2,f.z,6,4,f.y0,f.y0+2.2);
  }else if(f.id==='header'){
   fromPrint(board,f,'black');for(let i=0;i<4;i++)for(const dz of [-1.6,1.6])cyl(board,'board','gold',f.x-3+i*2,f.z+dz,.35,f.y1,f.y1+2.2,8);
  }
 }
 for(const [x,z] of [px(600,845),px(628,845)])cyl(board,'board',m.own('board',new THREE.MeshStandardMaterial({color:0xd8402a,emissive:0xff2a12,emissiveIntensity:.5})),x,z,1.1,PCB.y1,PCB.y1+2.2,14);
 // Small surface-mount parts, kept off every placed footprint.
 {
  const random=rng(7),spots:{x:number;z:number;turn:boolean}[]=[];
  const blocked=(x:number,z:number)=>Math.hypot(x-PLATTER.x,z-PLATTER.z)<PLATTER.bezel+3||Math.hypot(x-COIL.x,z-COIL.z)<COIL.bracket+3||Math.hypot(x-ROTOR.x,z-ROTOR.z)<ROTOR.mount+3
   ||footprints.some(f=>f.r!==undefined?Math.hypot(x-f.x,z-f.z)<f.r+2.2:Math.abs(x-f.x)<f.w!/2+2.2&&Math.abs(z-f.z)<f.d!/2+2.2);
  for(let tries=0;spots.length<190&&tries<4000;tries++){const x=PCB.x0+4+random()*(bw-8),z=PCB.z0+4+random()*(bd-8);if(!blocked(x,z))spots.push({x,z,turn:random()<.5})}
  const dummy=new THREE.Object3D();
  [['chip',1.9,.7,1],['slate',1.5,.6,.9],['aluminium',1.2,.9,1.2]].forEach(([kind,w,h,d],k)=>{
   const mine=spots.filter((_,i)=>i%3===k);
   const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(w as number,h as number,d as number),m.mat('board',kind as Kind),mine.length);
   mine.forEach((s,i)=>{dummy.position.set(s.x,PCB.y1+(h as number)/2,s.z);dummy.rotation.y=s.turn?Math.PI/2:0;dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix)});
   b.adopt(board,'board',inst,mine.length);
  });
 }
 // Wiring looms, traced from the reference.
 {
  const top=PCB.y1+6.5,c=(i:number)=>at(`conn-${i}`);
  const hop=(a:Footprint,b:Footprint,kind:Kind,rise:number,sag=0)=>wire(board,'board',kind,[[a.x,top,a.z],[a.x+(b.x-a.x)*.25,top+rise,a.z+sag],[a.x+(b.x-a.x)*.75,top+rise,b.z+sag],[b.x,top,b.z]]);
  hop(c(0),c(1),'wireOrange',5,3);hop(c(1),c(2),'wireOrange',7,2);hop(c(1),c(2),'wireOrange',4,6);
  hop(c(2),c(3),'wireOrange',9,4);hop(c(2),c(3),'wireOrange',6,8);hop(c(2),c(3),'wireOrange',3,-1);
  hop(c(3),c(4),'wireBlue',5,2);hop(c(4),c(5),'wireOrange',4,5);
  wire(board,'board','wireOrange',[[c(0).x,top,c(0).z],[-92,top+3,-90],[-104,PCB.y1+3,-84],[-107,PCB.y1+1.6,-93.2]]);
  wire(board,'board','wireOrange',[[c(5).x,top,c(5).z],[96,top+3,-90],[105,PCB.y1+3,-86],[107.2,PCB.y1+1.6,-93.2]]);
  wire(board,'board','wireBlue',[[c(1).x,top,c(1).z],[-40,top+2,-84],[-36,PCB.y1+8,-72],[-34,PCB.y1+10.5,-64]]);
  wire(board,'board','wireOrange',[[c(4).x,top,c(4).z],[52,top+2,-80],[56,PCB.y1+6,-62],[50,PCB.y1+4,-44],[40,PCB.y1+1,-30]]);
  wire(board,'board','wireBlue',[[c(4).x+1,top,c(4).z],[49,top+1,-74],[45,PCB.y1+5,-60],[36,PCB.y1+2.5,-42],[30,PCB.y1+1,-36]]);
  const y=PCB.y1+1.3;
  [['wireBlue',0],['wireGrey',1.4],['wireBlue',2.8],['wireOrange',4.2]].forEach(([kind,o])=>wire(board,'board',kind as Kind,[[-108,y,-2+(o as number)],[-88,y+1.6,1+(o as number)],[-70,y+.6,10+(o as number)*.6],[-58,y+1.4,28],[-50,y,44+(o as number)],[-46,y,56]]));
  wire(board,'board','wireBlue',[[-98,y,32],[-109,y+2.2,44],[-110,y+1.2,60],[-104,y,78]]);
  wire(board,'board','wireBlue',[[-52,y,101],[-30,y+1.5,104],[-6,y+1,101],[10,y,103]]);
  wire(board,'board','wireBlue',[[-48,y,103.5],[-28,y+2.4,106],[-2,y+1.2,104],[14,y,105]]);
  wire(board,'board','wireOrange',[[52,y,98],[58,y+3,101],[63,y,97]],.7);
  wire(board,'board','wireOrange',[[-104,y,92],[-92,y+2,96],[-80,y,93]]);
  wire(board,'board','wireOrange',[[102,y,-52],[106,y+3,-34],[104,y,-14]]);
 }

 // ── Platter ─────────────────────────────────────────────────────────────
 const P=PLATTER,centre:V3=[P.x,0,P.z];
 const bearing=layer('platter',[0,-52,0],centre);
 const pulley=layer('platter',[0,-30,0],centre);
 const beltLayer=layer('platter',[0,-40,0]);
 const bezel=layer('platter',[0,-15,0],centre);
 const disc=layer('platter',[0,4,0],centre);
 const label=layer('platter',[0,18,0],centre);
 const hub=layer('platter',[0,32,0],centre);
 const spindle=layer('platter',[0,48,0],centre);
 const head=layer('platter',[-26,-15,0]);
 const B=PCB.y1;
 put(bearing,'platter',lathe([[0,B],[9,B],[9,B+1.5],[6.5,B+3],[0,B+3]],40),'steel');
 put(pulley,'platter',lathe([[0,15],[P.pulley,15],[P.pulley,16],[P.pulley-1,16.4],[P.pulley-1,17.6],[P.pulley,18],[P.pulley,19],[0,19]],96),'darksteel');
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;cyl(pulley,'platter','black',Math.cos(a)*26,Math.sin(a)*26,7,18.6,19.05,28)}
 cyl(pulley,'platter','steel',0,0,3,19,24,24);
 // Belt: an open loop round both pulleys. Wrap angles follow from the two radii and their spacing.
 {
  const R=P.pulley-.4,r=ROTOR.pulley-.4,dx=ROTOR.x-P.x,dz=ROTOR.z-P.z,D=Math.hypot(dx,dz),phi=Math.atan2(dz,dx),alpha=Math.acos((R-r)/D),y=17;
  const points:THREE.Vector3[]=[];
  for(let a=phi+alpha;a<=phi+Math.PI*2-alpha+1e-6;a+=.05)points.push(new THREE.Vector3(P.x+Math.cos(a)*R,y,P.z+Math.sin(a)*R));
  for(let a=phi-alpha;a<=phi+alpha+1e-6;a+=.1)points.push(new THREE.Vector3(ROTOR.x+Math.cos(a)*r,y,ROTOR.z+Math.sin(a)*r));
  put(beltLayer,'platter',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'catmullrom',.02),420,.6,6,true),'belt');
 }
 put(bezel,'platter',slab(annulus(P.disc+.8,50),20,22.5,96),'black');
 const ring:Kind[]=['steel','aluminium','darksteel','aluminium','white','aluminium','darksteel','darksteel','aluminium','white','aluminium','steel'];
 ring.forEach((kind,i)=>{const a=i*Math.PI/6+.02;put(bezel,'platter',slab(arc(50.3,P.bezel,a,a+Math.PI/6-.04),20,27,16),kind)});
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;cyl(bezel,'platter','steel',Math.cos(a)*53,Math.sin(a)*53,2,B,20,16)}
 put(disc,'platter',lathe([[0,24],[P.disc-1,24],[P.disc,24.6],[P.disc,27.3],[P.disc-.9,28],[0,28]],128),'white');
 {
  const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(1.7,.06,.45),m.mat('platter','tick'),72),dummy=new THREE.Object3D();
  for(let i=0;i<72;i++){const a=i*Math.PI/36;dummy.position.set(Math.cos(a)*(P.disc-3),28.03,Math.sin(a)*(P.disc-3));dummy.rotation.y=-a;dummy.scale.x=i%6?1:1.8;dummy.updateMatrix();ticks.setMatrixAt(i,dummy.matrix)}
  b.adopt(disc,'platter',ticks,72).castShadow=false;
 }
 cyl(label,'platter','orange',0,0,P.label,28,28.5,96);
 const face=put(label,'platter',new THREE.CircleGeometry(P.label,96),m.own('platter',new THREE.MeshStandardMaterial({map:m.texture(labelTexture()),roughness:.3,metalness:.45,envMapIntensity:.9})),false);
 face.rotation.x=-Math.PI/2;face.position.y=28.53;
 put(hub,'platter',lathe([[0,28.5],[P.hub,28.5],[P.hub,29.4],[11.4,31.2],[8.6,32.6],[5,33],[0,33]],64),'gloss');
 put(spindle,'platter',lathe([[0,33],[P.spindle,33],[P.spindle,35],[3.7,36.2],[2.1,36.85],[0,37]],48),'chrome');
 {
  const f=at('head');cyl(head,'platter','steel',-62,-6,2.2,B,f.y0,16);
  box(head,'platter','black',f.x,f.z,f.w!,f.d!,f.y0,f.y1);box(head,'platter','black',-62,-2,5,10,f.y0,f.y0+3);
  box(head,'platter','darksteel',f.x+f.w!/2+1.8,f.z,3.6,3,f.y1-1.2,f.y1+.6);cyl(head,'platter','chrome',f.x-2,f.z,1.4,f.y1,f.y1+.5,16);
 }

 // ── Induction coil ──────────────────────────────────────────────────────
 const C=COIL,coilAt:V3=[C.x,0,C.z];
 const bracket=layer('coil',[0,0,0],coilAt),winding=layer('coil',[0,14,0],coilAt),lens=layer('coil',[0,32,0],coilAt);
 cyl(bracket,'coil','frost',0,0,C.bracket,15,17,72);
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.5;cyl(bracket,'coil','steel',Math.cos(a)*26.5,Math.sin(a)*26.5,1.8,B,15,12)}
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;screw(bracket,'coil',Math.cos(a)*27,Math.sin(a)*27,17,1.5)}
 const copper=m.mat('coil','copper') as THREE.MeshStandardMaterial;
 {
  const turns=9,points:THREE.Vector3[]=[];
  for(let i=0;i<=turns*48;i++){const t=i/(turns*48),a=t*turns*Math.PI*2,r=C.inner+1+t*(C.outer-C.inner-1.6);points.push(new THREE.Vector3(Math.cos(a)*r,17.75,Math.sin(a)*r))}
  put(winding,'coil',new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),turns*96,.46,6),copper);
  put(winding,'coil',slab(annulus(C.inner+.4,C.outer+.4),17,17.3,72),'white');
 }
 put(lens,'coil',lathe([[C.inner,17],[C.inner,22],[12,24.1],[8.5,24.9],[0,25]],64),'lens',false);
 put(lens,'coil',lathe([[0,17],[8.5,17],[8.5,19.5],[7,20.6],[0,20.6]],48),'white');
 const collar=put(lens,'coil',new THREE.TorusGeometry(C.inner,.7,10,64),'frost');collar.rotation.x=Math.PI/2;collar.position.y=17.7;

 // ── Rotor ───────────────────────────────────────────────────────────────
 const R=ROTOR,rotorAt:V3=[R.x,0,R.z];
 const mount=layer('rotor',[0,0,0],rotorAt),rotorPulley=layer('rotor',[0,10,0],rotorAt),rotorDisc=layer('rotor',[0,26,0],rotorAt);
 put(mount,'rotor',slab(gear(18.5,R.mount,10),B,14.5,8),'frost');cyl(mount,'rotor','steel',0,0,1.5,B,23.9,16);
 put(rotorPulley,'rotor',lathe([[1.5,15],[R.pulley,15],[R.pulley,16],[R.pulley-1,16.4],[R.pulley-1,17.6],[R.pulley,18],[R.pulley,19],[1.5,19]],40),'darksteel');
 put(rotorDisc,'rotor',lathe([[0,20],[R.disc,20],[R.disc,21],[16,21.7],[6,22.7],[3,23.5],[0,23.5]],72),'blue');
 for(const r of [6.5,10.5,14]){const groove=put(rotorDisc,'rotor',new THREE.TorusGeometry(r,.28,8,56),'navy',false);groove.rotation.x=Math.PI/2;groove.position.y=20.9+(R.disc-r)*.09}
 for(let i=0;i<12;i++){const vane=box(rotorDisc,'rotor','white',0,0,9,.6,19.2,20);vane.position.set(Math.cos(i*Math.PI/6)*10.5,19.6,Math.sin(i*Math.PI/6)*10.5);vane.rotation.y=-i*Math.PI/6}
 cyl(rotorDisc,'rotor','white',12.5,0,1.1,22.05,22.2,14);

 // ── Controls ────────────────────────────────────────────────────────────
 const controls=layer('controls');const knobs:THREE.Object3D[]=[];
 const cap=(r:number,y0:number,y1:number):[number,number][]=>[[0,y0],[r,y0],[r,y1-1],[r-.8,y1],[0,y1]];
 KNOB_Z.forEach((z,i)=>{
  const f=at(`knob-${i}`);cyl(controls,'controls','black',f.x,z,5,B,17,8);cyl(controls,'controls','steel',f.x,z,1.5,17,19,12);
  const node=layer('controls',[0,16,0],[KNOB_X,0,z]);knobs.push(node);
  put(node,'controls',lathe(cap(f.r!,18.6,f.y1),40),'black');box(node,'controls','white',0,-f.r!*.55,.7,f.r!*.8,f.y1-.05,f.y1+.08);
 });
 {
  const e=at('encoder');cyl(controls,'controls','darksteel',e.x,e.z,7.3,B,14,32);put(controls,'controls',lathe(cap(e.r!,14,e.y1),28),'chrome').position.set(e.x,0,e.z);
  cyl(controls,'controls','black',e.x,e.z,3.2,e.y1,e.y1+.12,24);
  const l=at('level');cyl(controls,'controls','chrome',l.x,l.z,6.8,B,14.5,36);put(controls,'controls',lathe(cap(l.r!,14.5,l.y1),48),'black').position.set(l.x,0,l.z);
  box(controls,'controls','white',l.x,l.z-3.4,.8,4.4,l.y1-.05,l.y1+.08);
  const j=at('jack');cyl(controls,'controls','chrome',j.x,j.z,j.r!,B,j.y1,32);cyl(controls,'controls','steel',j.x,j.z,j.r!+1.3,B,B+2,6);cyl(controls,'controls','black',j.x,j.z,2.1,j.y1,j.y1+.06,20);
  const h=at('heatsink');box(controls,'controls','aluminium',h.x,h.z,h.w!,h.d!,B,B+2.2);
  for(let i=0;i<7;i++)box(controls,'controls','aluminium',h.x-h.w!/2+.6+i*(h.w!-1.2)/6,h.z,.9,h.d!,B+2.2,h.y1);
  const b=at('button'),buttonLayer=layer('controls',[0,12,0]);box(controls,'controls','slate',b.x,b.z,b.w!,b.d!,B,18);
  box(buttonLayer,'controls','orange',b.x,b.z,b.w!-1.4,b.d!-1.4,18,b.y1);
  const d=at('button-driver');fromPrint(controls,d,'aluminium');box(controls,'controls','chip',d.x,d.z,d.w!-2.4,d.d!-2.4,d.y1,d.y1+.1);
  const t=at('toggle');box(controls,'controls','black',t.x,t.z,t.w!,t.d!,B,17);const lever=cyl(controls,'controls','chrome',t.x,t.z-1.2,.9,17,t.y1,12);lever.rotation.x=-.35;
  const s=at('slot-switch');fromPrint(controls,s,'black');box(controls,'controls','steel',s.x,s.z-2,2.2,3,s.y1,s.y1+1.6);
 }

 // ── Memory ──────────────────────────────────────────────────────────────
 const cartridge=layer('memory');const shield=layer('memory',[0,0,-30]);
 const memoryLed=m.own('memory',new THREE.MeshStandardMaterial({color:0x24301c,emissive:0x9dff5a,emissiveIntensity:.05}));
 {
  const f=at('cartridge');fromPrint(cartridge,f,'chip');
  for(const sx of [-1,1])box(cartridge,'memory','steel',f.x+sx*(f.w!/2-1.6),f.z,3.2,f.d!+.4,f.y0-.2,f.y1+.3);
  box(cartridge,'memory','black',f.x,f.z,f.w!-6,f.d!-5,f.y1,f.y1+.25);
  for(let i=0;i<12;i++){box(cartridge,'memory','slate',f.x-f.w!/2+7.5+i*(f.w!-15)/11,f.z+.5,3.4,11,f.y1+.25,f.y1+1.1);box(cartridge,'memory','aluminium',f.x-f.w!/2+7.5+i*(f.w!-15)/11,f.z-6.4,3.4,1,f.y1+.25,f.y1+.5)}
  box(cartridge,'memory','gold',f.x,f.z-f.d!/2-.4,f.w!-8,1.2,f.y0+1.5,f.y0+2.3);box(cartridge,'memory',memoryLed,f.x+f.w!/2-5,f.z+f.d!/2-2,2,1.2,f.y1+.25,f.y1+.9);
  const s=at('shield');box(shield,'memory','black',s.x,s.z,s.w!+1.6,s.d!+1.6,B,B+3);box(shield,'memory','darksteel',s.x,s.z,s.w!,s.d!,B+3,s.y1-.8);
  for(let i=0;i<6;i++)box(shield,'memory','steel',s.x,s.z-s.d!/2+3.5+i*(s.d!-7)/5,s.w!-3,1.6,s.y1-.8,s.y1);
 }

 return {
  spin:{platter:[pulley,disc,label,hub,spindle] as THREE.Object3D[],rotor:[rotorPulley,rotorDisc] as THREE.Object3D[],knobs},
  glow:{coil:copper,leds,button:m.mat('controls','orange') as THREE.MeshStandardMaterial,memory:memoryLed},
 };
}
