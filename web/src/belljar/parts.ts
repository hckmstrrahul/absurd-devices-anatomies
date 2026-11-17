import * as THREE from 'three';
import {slab,roundPlate,roundFrame,annulus,arc,lathe,type Builder} from '../kit/builder';
import {wheelGeometry,discShape,escapeWheelShape,ratchetShape,extrudeFlat,spiral} from '../kit/horology';
import type {Kind} from '../kit/materials';
import type {V3} from '../kit/types';
import {BASE,CLOCHE,CLOCK,Z,BELL,HANDLE,CROWN,HAMMER,LEG,LIFT,ARBOR,RODS,PILLARS,BALANCE,BARREL,ALARM_BARREL,STRIKE,CLICK,ESCAPE,BRIDGE,STEM,TEETH,DEG,glassY,bellPoint,portT,polar,wheel,pitch,type P2,type ArborId} from './layout';
import {dialTexture,subdialTexture} from './textures';
import type {AssemblyId} from './model';

type Finish=Kind|THREE.Material;
type Node=THREE.Object3D;

// Glass cloche as one closed solid: an outer and an inner skin joined round the foot.
// Each station along the depth carries one front profile: wall, half ellipse, wall.
function clocheSolid(){
 const N=80,K=32,cols=K+3,pos:number[]=[],index:number[]=[],e=2/CLOCHE.power;
 const skin=(inset:number)=>{
  const A=CLOCHE.a-inset,B=CLOCHE.b-inset,C=CLOCHE.rise-inset;
  for(let i=0;i<=N;i++){
   const w=-Math.PI/2+Math.PI*i/N,z=B*Math.sign(Math.sin(w))*Math.abs(Math.sin(w))**e,r=Math.abs(Math.cos(w))**e;
   pos.push(-A*r,BASE.top,z);
   for(let k=0;k<=K;k++){const f=Math.PI*(1-k/K);pos.push(A*r*Math.cos(f),CLOCHE.spring+C*r*Math.sin(f),z)}
   pos.push(A*r,BASE.top,z);
  }
 };
 skin(0);skin(CLOCHE.wall);
 const inner=(N+1)*cols;
 for(let i=0;i<N;i++){
  for(let j=0;j<cols-1;j++){const a=i*cols+j,b=a+1,c=a+cols,d=c+1;index.push(a,c,b,b,c,d,inner+a,inner+b,inner+c,inner+b,inner+d,inner+c)}
  // Foot: join the two skins along both floor edges.
  for(const j of [0,cols-1]){const a=i*cols+j,c=a+cols,flip=j===0;index.push(...(flip?[a,inner+a,c,c,inner+a,inner+c]:[a,c,inner+a,c,inner+c,inner+a]))}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(index);g.computeVertexNormals();return g;
}
function clocheOutline<T extends THREE.Path>(inset:number,path:T){
 const A=CLOCHE.a-inset,B=CLOCHE.b-inset,e=2/CLOCHE.power;
 for(let i=0;i<=120;i++){const u=i/120*Math.PI*2,x=A*Math.sign(Math.cos(u))*Math.abs(Math.cos(u))**e,y=B*Math.sign(Math.sin(u))*Math.abs(Math.sin(u))**e;if(i)path.lineTo(x,y);else path.moveTo(x,y)}
 return path;
}
export function buildBelljar(b:Builder){
 const {m,put,cyl,box,ball,torus,wire}=b;
 const centre:V3=[0,CLOCK.y,0];
 // Clock parts are built in a frame that faces the viewer: `flat` keeps world axes about the clock centre,
 // `face` turns them so heights run along the clock axis. Face helpers take (x, y) on the dial and a z range.
 const stack=(asm:AssemblyId,dz=0)=>{const flat=b.layer(asm,[0,0,dz],centre),face=b.pivot(flat);face.rotation.x=Math.PI/2;return {flat,face}};
 const disc=(g:Node,asm:AssemblyId,kind:Finish,[x,y]:P2,r:number,z0:number,z1:number,segments=32)=>cyl(g,asm,kind,x,-y,r,z0,z1,segments);
 const bar=(g:Node,asm:AssemblyId,kind:Finish,[x,y]:P2,w:number,h:number,z0:number,z1:number,turn=0)=>{const mesh=box(g,asm,kind,x,-y,w,h,z0,z1);mesh.rotation.y=turn;return mesh};
 const cut=(g:Node,asm:AssemblyId,kind:Finish,shape:THREE.Shape,z0:number,z1:number,[x,y]:P2=[0,0],segments=16)=>{const mesh=put(g,asm,slab(shape,z0,z1,segments),kind);mesh.position.set(x,0,-y);return mesh};
 const turned=(g:Node,asm:AssemblyId,kind:Finish,profile:P2[],[x,y]:P2=[0,0],segments=64)=>{const mesh=put(g,asm,lathe(profile,segments),kind);mesh.position.set(x,0,-y);return mesh};
 const spinner=(g:Node,[x,y]:P2)=>b.pivot(g,[x,0,-y]);
 // A pivot whose +Y points along (dx, dy) in the front plane.
 const aim=(parent:Node,at:V3,dx:number,dy:number)=>{const p=b.pivot(parent,at);p.rotation.z=Math.atan2(-dx,dy);return p};

 // ── Base ────────────────────────────────────────────────────────────────
 const base=b.layer('base'),feet=b.layer('base',[0,-16,0]);
 {
  const bevel=3,body=new THREE.ExtrudeGeometry(roundPlate(BASE.w-bevel*2,BASE.d-bevel*2,BASE.r-bevel),{depth:BASE.top-BASE.seam-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:6,curveSegments:24});
  body.rotateX(-Math.PI/2);body.translate(0,BASE.seam+bevel,0);put(base,'base',body,'chrome');
  put(base,'base',slab(roundPlate(BASE.w-5,BASE.d-5,BASE.r-2.5),BASE.foot,BASE.seam),'steel');
  put(base,'base',slab(roundFrame(136,66,13,.9),BASE.top,BASE.top+.12),'darksteel',false);
  put(base,'base',slab(roundFrame(118,50,9,.6),BASE.top,BASE.top+.12),'darksteel',false);
  put(base,'base',slab(roundPlate(40,14,3),BASE.top,BASE.top+.5),'steel').position.z=-14;
  for(const sx of [-1,1])for(const sz of [-1,1]){
   put(feet,'base',lathe([[0,0],[6.2,0],[BASE.footR,1.1],[BASE.footR,BASE.foot],[0,BASE.foot]],40),'chrome').position.set(sx*BASE.footX,0,sz*BASE.footZ);
   cyl(feet,'base','rubber',sx*BASE.footX,sz*BASE.footZ,5.4,-.01,.35,32);
  }
 }

 // ── Cloche ──────────────────────────────────────────────────────────────
 const cloche=b.layer('cloche');
 {
  // A small optical thickness: the shoulders and edges still bend what is behind them, and the dial stays sharp through the flat front.
  const glass=m.own('cloche',(m.mat('cloche','crystal') as THREE.MeshPhysicalMaterial).clone());glass.thickness=1.5;
  put(cloche,'cloche',clocheSolid(),glass,false);
  // The foot of the glass picks up a cool tint where it meets the base.
  const tint=m.own('cloche',new THREE.MeshPhysicalMaterial({color:0xb9dcea,roughness:.05,transparent:true,opacity:.42,envMapIntensity:1.6,clearcoat:1,depthWrite:false}));
  const lip=clocheOutline(0,new THREE.Shape());lip.holes.push(clocheOutline(CLOCHE.wall,new THREE.Path()));
  put(cloche,'cloche',slab(lip,BASE.top+.02,BASE.top+1.6,4),tint,false);
  // Ports: one for each bell post, one for the crown stem, and a slot the hammer swings in.
  for(const side of [-1,1]){
   const [x,y]=bellPoint(side,portT()),port=aim(cloche,[x,y,0],side*Math.sin(BELL.tilt),Math.cos(BELL.tilt));
   torus(port,'cloche','chrome',[0,.5,0],3,.8,32).castShadow=false;torus(port,'cloche','rubber',[0,-.2,0],2.6,.6,24).castShadow=false;
  }
  torus(cloche,'cloche','chrome',[0,glassY(0,0)+.4,0],2.6,.7,32).castShadow=false;
  const reach=HAMMER.length*Math.sin(HAMMER.amp)+HAMMER.head+1.2,slot:V3[]=[];
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2,x=Math.cos(a)*reach,z=HAMMER.z+Math.sin(a)*3.6;slot.push([x,glassY(x,z)+.3,z])}
  wire(cloche,'cloche','chrome',slot,.6,true).castShadow=false;
 }

 // ── Bells, handle and crown ─────────────────────────────────────────────
 let crown!:THREE.Group,alarmKnob!:THREE.Object3D;
 const bells=[-1,1].map(side=>{
  const [x,y]=bellPoint(side,BELL.rimT),node=b.layer('bells',[side*14,0,0],[x,y,0]),H=BELL.height,through=portT(CLOCHE.wall)-1-BELL.rimT;
  node.rotation.z=-side*BELL.tilt;
  const k=BELL.radius/21.5,wide=(profile:P2[]):P2[]=>profile.map(([r,h])=>[r*k,h]);
  put(node,'bells',lathe(wide([[20.4,0],[21.5,0],[21.7,.9],[21.2,2.2],[20.2,4.4],[18.2,7.6],[15,10.6],[10.5,13.1],[5.5,14.5],[0,H]]),72),'chrome');
  put(node,'bells',lathe(wide([[0,H-1.1],[5.3,H-1.6],[10,H-3],[14.2,H-5.4],[17.2,H-8.2],[19.2,H-11.2],[20.4,0]]),72),'steel');
  cyl(node,'bells','chrome',0,0,1.5,through,H,20);
  cyl(node,'bells','steel',0,0,3.2,H-4,H-1.1,24);
  cyl(node,'bells','steel',0,0,5,H-.2,H+.4,32);
  cyl(node,'bells','chrome',0,0,4.2,H+.4,H+3.4,6);
  put(node,'bells',lathe([[0,H+3.4],[2.7,H+3.4],[2.7,H+5.2],[1.9,H+6],[0,H+6]],24),'chrome');
  return node;
 });
 {
  const handle=b.layer('bells',[0,34,0]);crown=b.layer('bells',[0,-20,0]);
  const path:V3[]=[...HANDLE.map(([x,y]):V3=>[-x,y,0]),...HANDLE.slice(0,-1).reverse().map(([x,y]):V3=>[x,y,0])];
  wire(handle,'bells','chrome',path,1.8);
  for(const side of [-1,1])ball(handle,'bells','chrome',[side*HANDLE[0][0],HANDLE[0][1],0],2.5,20);
  const {r,y0,y1}=CROWN;
  put(crown,'bells',lathe([[0,y0],[r-.5,y0],[r,y0+.7],[r,y1-.8],[r-.6,y1],[0,y1]],40),'black');
  const ridges=new THREE.InstancedMesh(new THREE.BoxGeometry(.55,y1-y0-2,.5),m.mat('bells','gloss'),30),dummy=new THREE.Object3D();
  for(let i=0;i<30;i++){const a=i/30*Math.PI*2;dummy.position.set(Math.cos(a)*(r+.08),(y0+y1)/2,Math.sin(a)*(r+.08));dummy.rotation.y=-a+Math.PI/2;dummy.updateMatrix();ridges.setMatrixAt(i,dummy.matrix)}
  b.adopt(crown,'bells',ridges,30);
  cyl(crown,'bells','white',r-1.6,0,.6,y1,y1+.08,12);
  cyl(crown,'bells','chrome',0,0,2.5,y0-1.6,y0,24);
  cyl(crown,'bells','chrome',0,0,1.1,glassY(0,0,CLOCHE.wall)-1,y0-1.6,16);
 }

 // ── Case ────────────────────────────────────────────────────────────────
 {
  const rose=m.own('case',new THREE.MeshStandardMaterial({color:0xc8845a,roughness:.3,metalness:1})),polished=m.own('case',new THREE.MeshStandardMaterial({color:0xc9cdd3,roughness:.17,metalness:1}));
  const drum=stack('case',LIFT.drum),bezel=stack('case',LIFT.bezel),crystal=stack('case',LIFT.crystal),back=stack('case',LIFT.back);
  turned(drum.face,'case','chrome',[[CLOCK.drumInner,Z.drum0],[CLOCK.drum,Z.drum0],[CLOCK.drum,Z.drum1],[CLOCK.drumInner,Z.drum1],[CLOCK.drumInner,Z.drum0]],[0,0],96);
  turned(drum.face,'case',rose,[[CLOCK.drum,8],[CLOCK.flange-.8,8],[CLOCK.flange,8.9],[CLOCK.flange,10.1],[CLOCK.flange-.8,Z.drum1],[CLOCK.drum,Z.drum1]],[0,0],96);
  turned(drum.face,'case','steel',[[CLOCK.plate+.4,-17],[CLOCK.drumInner,-17],[CLOCK.drumInner,-15.5],[CLOCK.plate+.4,-15.5],[CLOCK.plate+.4,-17]],[0,0],72);
  for(const side of [-1,1]){
   const leg=aim(drum.flat,[0,0,0],side*Math.sin(LEG.angle),-Math.cos(LEG.angle)),L=LEG.length;
   cyl(leg,'case',rose,0,0,2.3,CLOCK.drum-1.5,67,20);cyl(leg,'case',rose,0,0,3.3,CLOCK.drum-.6,CLOCK.drum+1.6,24);
   cyl(leg,'case','chrome',0,0,3.2,65.6,68,24);
   put(leg,'case',lathe([[0,68],[3.4,68],[LEG.foot,69.4],[LEG.foot,L-.8],[LEG.foot-.8,L],[0,L]],32),'chrome');
   const stub=aim(drum.flat,[side*BELL.foot[0],BELL.foot[1]-CLOCK.y,0],side*Math.sin(BELL.tilt),Math.cos(BELL.tilt));
   cyl(stub,'case','chrome',0,0,1.9,-6,portT(CLOCHE.wall)-1,20);cyl(stub,'case','chrome',0,0,3.1,-5.6,-3.4,24);
  }
  cyl(drum.flat,'case','chrome',0,0,1.1,CLOCK.drum-1,glassY(0,0,CLOCHE.wall)-1-CLOCK.y,16);cyl(drum.flat,'case','chrome',0,0,2.6,CLOCK.drum-.6,CLOCK.drum+1.4,24);
  box(drum.flat,'case','darksteel',0,HAMMER.z,HAMMER.length*Math.sin(HAMMER.amp)*1.36,3.2,CLOCK.drum-.4,CLOCK.drum+.5);
  cyl(drum.flat,'case','chrome',0,-14,2.2,BASE.top+1.4-CLOCK.y,-CLOCK.drum+1.5,20);cyl(drum.flat,'case','chrome',0,-14,3.8,BASE.top-CLOCK.y,BASE.top+1.4-CLOCK.y,24);

  turned(bezel.face,'case','darksteel',[[CLOCK.sight-.8,Z.drum1],[CLOCK.sight,Z.drum1],[CLOCK.sight,15.4],[CLOCK.sight-.8,15.4],[CLOCK.sight-.8,Z.drum1]],[0,0],96);
  turned(bezel.face,'case',polished,[[CLOCK.sight,Z.drum1],[CLOCK.bezel,Z.drum1],[CLOCK.bezel+.2,14],[59,18],[56.6,20.5],[54.2,Z.bezel],[52.8,19.6],[CLOCK.sight,17],[CLOCK.sight,Z.drum1]],[0,0],128);
  turned(bezel.face,'case',rose,[[CLOCK.sight-.9,15.4],[CLOCK.sight+.2,15.4],[CLOCK.sight+.2,16.8],[CLOCK.sight-.9,16.8],[CLOCK.sight-.9,15.4]],[0,0],96);
  const lens=m.own('case',new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.02,transparent:true,opacity:.07,envMapIntensity:2.2,clearcoat:1,depthWrite:false}));
  const dome=turned(crystal.face,'case',lens,[[53,17.4],[53,18.6],[48,20.6],[38,22.6],[24,23.9],[10,24.4],[0,Z.crystal]],[0,0],96);dome.castShadow=false;
  // Clicks go through the crystal to the dial and hands.
  delete dome.userData.asm;

  turned(back.face,'case','chrome',[[0,Z.back],[40,Z.back+.4],[55,Z.back+2],[57.5,Z.drum0-.5],[57.5,Z.drum0],[0,Z.drum0]],[0,0],96);
  for(const at of [ARBOR.barrel,ARBOR.alarmBarrel]){disc(back.face,'case','chrome',at,1.6,-29,Z.back,16);bar(back.face,'case','chrome',at,13,1.7,Z.keys,-28.6);disc(back.face,'case','steel',at,3.4,Z.back-.5,Z.back+.3,24)}
  turned(back.face,'case','black',[[0,-30.5],[3.6,-30.5],[4.2,-29.8],[4.2,Z.back],[0,Z.back]],[0,0],28);
  alarmKnob=b.pivot(back.face,[ARBOR.alarmKnob[0],0,-ARBOR.alarmKnob[1]]);
  put(alarmKnob,'case',lathe([[0,-29.5],[3,-29.5],[3.5,-28.9],[3.5,Z.back+.2],[0,Z.back+.2]],28),'brass');bar(alarmKnob,'case','darksteel',[0,0],.5,6.4,-29.62,-29.4);
  for(let i=0;i<6;i++)disc(back.face,'case','steel',polar(51,30+i*60),1.6,-24,-23.1,12);
  for(let i=0;i<5;i++)bar(back.face,'case','black',[-12+i*6,36],1.6,9,Z.back-.05,Z.back+.5);
 }

 // ── Dial ────────────────────────────────────────────────────────────────
 {
  const dial=stack('dial').face,N=CLOCK.notch,R=CLOCK.dial,rise=Math.sqrt(CLOCK.open**2-N.half**2);
  // The opening is a circle with a square window above it for the alarm marks.
  const opening=()=>{const p=new THREE.Path(),a=Math.atan2(rise,N.half);p.moveTo(N.half,rise);p.lineTo(N.half,N.top);p.lineTo(-N.half,N.top);p.lineTo(-N.half,rise);p.absarc(0,0,CLOCK.open,Math.PI-a,Math.PI*2+a,false);p.closePath();return p};
  const plate=new THREE.Shape();plate.absarc(0,0,R,0,Math.PI*2,false);plate.holes.push(opening());
  cut(dial,'dial','white',plate,Z.dial[0],Z.dial[1],[0,0],48);
  const print=new THREE.ShapeGeometry(plate,64),uv=print.getAttribute('uv'),xy=print.getAttribute('position');
  for(let i=0;i<uv.count;i++)uv.setXY(i,xy.getX(i)/(R*2)+.5,xy.getY(i)/(R*2)+.5);
  print.rotateX(-Math.PI/2);
  put(dial,'dial',print,m.own('dial',new THREE.MeshStandardMaterial({map:m.texture(dialTexture()),color:0xd6d6d6,roughness:.55,envMapIntensity:.8,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false).position.y=Z.dial[1]+.02;
  for(const a of [60,180,300])disc(dial,'dial','steel',polar(44,a),.8,Z.plateFront[1],Z.dial[0],10);
 }

 // ── Hands ───────────────────────────────────────────────────────────────
 const sword=(length:number,width:number,tail:number)=>{const s=new THREE.Shape();s.moveTo(-width*.45,-tail);s.lineTo(width*.45,-tail);s.lineTo(width,length*.56);s.lineTo(0,length);s.lineTo(-width,length*.56);s.closePath();return s};
 const hour=spinner(stack('hands').face,[0,0]),minute=spinner(stack('hands',9).face,[0,0]),cap=stack('hands',17).face,second=spinner(stack('hands',-8).face,ARBOR.fourth);
 cut(hour,'hands','darksteel',sword(29.6,2.05,5.9),12.15,12.4);cut(hour,'hands','white',sword(29,1.75,5.5),12.2,12.7);disc(hour,'hands','chrome',[0,0],2.4,11.2,12.9,24);
 cut(minute,'hands','darksteel',sword(37.6,1.8,6.4),13.65,13.9);cut(minute,'hands','white',sword(37,1.5,6),13.7,14.2);disc(minute,'hands','chrome',[0,0],1.9,12.9,14.3,24);
 turned(cap,'hands','chrome',[[0,14.3],[5.8,14.3],[5.8,14.8],[4.9,15.3],[3.4,15.5],[3.2,15.9],[1.6,16.2],[0,16.3]],[0,0],48);disc(cap,'hands','black',[0,0],.9,16.25,16.4,16);
 cut(second,'hands','black',sword(2.5,.22,.9),9.75,9.9);disc(second,'hands','chrome',[0,0],.45,9.55,10.1,12);

 // ── Movement ────────────────────────────────────────────────────────────
 // Built in flat frames: x and y on the dial, z along the clock axis, so the kit's gear shapes drop straight in
 // and every arbor turns about z.
 const A='movement' as const,[F0,F1]=Z.plateFront,[B0,B1]=Z.plateBack;
 const L=(lift:number)=>stack(A,lift).flat;
 const frame=L(LIFT.frame),power=L(LIFT.power),winding=L(LIFT.winding),train=L(LIFT.train),bridge=L(LIFT.bridge),escapement=L(LIFT.escapement),front=L(LIFT.front),works=L(LIFT.works),alarmSet=L(LIFT.alarmSet);
 const rod=(g:Node,kind:Finish,[x,y]:P2,r:number,z0:number,z1:number,segments=20)=>{const mesh=put(g,A,new THREE.CylinderGeometry(r,r,z1-z0,segments),kind);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,(z0+z1)/2);return mesh};
 const flat=(g:Node,kind:Finish,shape:THREE.Shape,z0:number,z1:number,[x,y]:P2=[0,0],chamfer?:number)=>{const mesh=put(g,A,extrudeFlat(shape,z1-z0,chamfer),kind);mesh.position.set(x,y,(z0+z1)/2);return mesh};
 const beam=(g:Node,kind:Finish,[x,y]:P2,w:number,h:number,z0:number,z1:number,turn=0)=>{const mesh=put(g,A,new THREE.BoxGeometry(w,h,z1-z0),kind);mesh.position.set(x,y,(z0+z1)/2);mesh.rotation.z=turn;return mesh};
 // A straight bridge arm between two points.
 const arm=(g:Node,kind:Finish,a:P2,c:P2,w:number,z0:number,z1:number)=>beam(g,kind,[(a[0]+c[0])/2,(a[1]+c[1])/2],Math.hypot(c[0]-a[0],c[1]-a[1]),w,z0,z1,Math.atan2(c[1]-a[1],c[0]-a[0]));
 const spinAt=(g:Node,id:ArborId)=>b.pivot(g,[ARBOR[id][0],ARBOR[id][1],0]);
 const O:P2=[0,0];
 // An involute wheel from the layout table, with a raised hub when it has crossings.
 const cog=(g:Node,kind:Finish,id:string,crossings=0,bore=.5)=>{
  const w=wheel(id),hub=Math.max(bore*2.4,pitch(w.module,w.teeth)*.2),mesh=put(g,A,wheelGeometry({module:w.module,teeth:w.teeth,bore,crossings:crossings||undefined,hub},w.z1-w.z0),kind);
  mesh.position.z=(w.z0+w.z1)/2;if(crossings)rod(g,kind,O,hub*.8,w.z0-.2,w.z1+.2,24);return mesh;
 };
 // The arbor for one entry of the layout's rod table, with a pivot turned on each end.
 const shaft=(g:Node,id:ArborId,kind:Finish='steel',here:P2=O)=>{const r=RODS.find(r=>r.arbor===id)!;rod(g,kind,here,r.r,r.z0+.5,r.z1-.5,14);return rod(g,kind,here,r.r*.55,r.z0,r.z1,10)};
 const ruby=m.own(A,new THREE.MeshPhysicalMaterial({color:0xb3123f,roughness:.15,clearcoat:1}));
 const plate=m.own(A,new THREE.MeshStandardMaterial({color:0x8e949c,roughness:.42,metalness:.55})),backPlate=m.own(A,new THREE.MeshStandardMaterial({color:0x4d525a,roughness:.5,metalness:.5}));
 const cyan=m.own(A,new THREE.MeshStandardMaterial({color:0x1fc8dc,roughness:.4,emissive:0x19d3ea,emissiveIntensity:.35}));
 const jewel=(g:Node,at:P2,z:number,r=.72)=>{rod(g,'gold',at,r*1.75,z,z+.12,16);rod(g,ruby,at,r,z,z+.24,14)};
 const headScrew=(g:Node,[x,y]:P2,z:number,r=1.1)=>{rod(g,'chrome',[x,y],r,z,z+.5,16);beam(g,'darksteel',[x,y],r*1.5,.22,z+.42,z+.56,(x*7+y*3)%3)};
 // A line that is redrawn as a spring winds.
 const spring=(g:Node,colour:number,points:V3[])=>{
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),m.own(A,new THREE.LineBasicMaterial({color:colour})));
  b.adopt(g,A,line).castShadow=false;
  return (next:V3[])=>{const p=line.geometry.getAttribute('position');next.forEach(([x,y,z],i)=>p.setXYZ(i,x,y,z));p.needsUpdate=true};
 };

 // Back plate, pillars and bushings.
 rod(frame,backPlate,O,CLOCK.plate,B0,B1,96);
 PILLARS.forEach((p,i)=>{shaft(frame,`pillar${i}` as ArborId,'steel',p);rod(frame,'brass',p,2.8,B1,B1+1,20)});
 for(const id of ['centre','third','barrel','crownWheel','transA','transB','alarmBarrel','strike','stop'] as const)rod(frame,'brass',ARBOR[id],1.7,B1,B1+.3,16);
 for(let i=0;i<5;i++)headScrew(frame,polar(38,18+i*72),B1,1.2);

 // Mainspring barrel: an open drum, a crossed lid that shows the spring, and the driving teeth at the back.
 const barrel=spinAt(power,'barrel');
 rod(barrel,'darksteel',O,BARREL.r,BARREL.z0,BARREL.z0+.5,64);flat(barrel,'darksteel',annulus(BARREL.r-1,BARREL.r),BARREL.z0,BARREL.z1,O,.1);
 flat(barrel,'steel',discShape(BARREL.r,{bore:1.9,crossings:4,hub:4,rim:2.4,spoke:2.4}),BARREL.z1-.5,BARREL.z1);cog(barrel,'brass','barrelGear',0,1.9);
 const mainTurns=9,mainspring=spring(barrel,0x566170,spiral(mainTurns,2.2,BARREL.r-1.4,-9,0));
 // Alarm barrel, strike wheel, hammer with its verge, and the stop lever that holds the hammer between alarms.
 const alarmBarrel=spinAt(power,'alarmBarrel'),strike=spinAt(power,'strike'),stop=spinAt(power,'stop');
 rod(alarmBarrel,'darksteel',O,ALARM_BARREL.r,ALARM_BARREL.z0,ALARM_BARREL.z1,40);cog(alarmBarrel,'brass','alarmGear',4,1.2);shaft(alarmBarrel,'alarmBarrel');
 flat(strike,'brass',ratchetShape(TEETH.strike,STRIKE.r,.6),STRIKE.z0,STRIKE.z1);cog(strike,'darksteel','strikePinion',0,.6);shaft(strike,'strike');
 {
  const tip:P2=[1.1,29-ARBOR.stop[1]+0],reach=Math.hypot(tip[0]-ARBOR.stop[0],tip[1]),turn=Math.atan2(tip[1],tip[0]-ARBOR.stop[0]),lever=b.pivot(stop);lever.rotation.z=turn;
  beam(lever,'steel',[reach/2,0],reach,1.1,-9.4,-8.6);beam(lever,'steel',[reach-.3,.9],.9,2.6,-9.4,-8.6);rod(stop,'steel',O,1.5,-9.6,-8.4,16);shaft(stop,'stop');
  beam(lever,'steel',[-3,0],6,1.1,-9.4,-8.6);
 }
 const hammer=b.layer(A,[0,0,LIFT.power],[HAMMER.pivot[0],HAMMER.pivot[1],HAMMER.z]);
 {
  const r=RODS.find(r=>r.arbor==='hammer')!,hub=put(hammer,A,new THREE.CylinderGeometry(r.r,r.r,r.z1-r.z0,20),'steel');hub.rotation.x=Math.PI/2;hub.position.z=(r.z0+r.z1)/2-HAMMER.z;
  cyl(hammer,A,'steel',0,0,.8,0,HAMMER.length-1.5,12);ball(hammer,A,'chrome',[0,HAMMER.length,0],HAMMER.head,28);cyl(hammer,A,'steel',0,0,1.9,-.9,.9,20).rotation.x=Math.PI/2;
  // The verge sits on the same arbor, level with the strike wheel.
  const verge=b.pivot(hammer,[0,0,(STRIKE.z0+STRIKE.z1)/2-HAMMER.z]);verge.rotation.z=Math.atan2(ARBOR.strike[1]-ARBOR.hammer[1],ARBOR.strike[0]-ARBOR.hammer[0]);
  const span=Math.hypot(ARBOR.strike[0]-ARBOR.hammer[0],ARBOR.strike[1]-ARBOR.hammer[1])-STRIKE.r+.5;
  put(verge,A,new THREE.BoxGeometry(span,1.3,.7),'darksteel').position.x=span/2;for(const y of [-2.1,2.1])put(verge,A,new THREE.BoxGeometry(1.1,2.4,.7),'darksteel').position.set(span-.2,y/2,0);
 }

 // Keyless works. Winding: stem pinion → crown wheel → two transmission wheels → ratchet wheel on the barrel arbor.
 const crownWheel=spinAt(winding,'crownWheel'),transA=spinAt(winding,'transA'),transB=spinAt(winding,'transB'),ratchet=spinAt(winding,'barrel'),click=spinAt(winding,'click'),clutchWheel=spinAt(winding,'setArbor');
 cog(crownWheel,'steel','crownWheel',4,.8);cog(transA,'brass','transA',5,.8);cog(transB,'brass','transB',5,.8);
 for(const [spin,id] of [[crownWheel,'crownWheel'],[transA,'transA'],[transB,'transB']] as const){shaft(spin,id);rod(spin,'steel',O,1.3,-4.6,-4.1,6)}
 cog(ratchet,'steel','ratchetGear',6,1.6);shaft(ratchet,'barrel');rod(ratchet,'steel',O,2.2,CLICK.z1,CLICK.z1+.5,4);
 // The click wheel is mirrored so that it runs free in the winding direction.
 flat(ratchet,'darksteel',ratchetShape(TEETH.click,CLICK.r,1.6),CLICK.z0,CLICK.z1).scale.x=-1;
 {
  const toBarrel=Math.atan2(ARBOR.barrel[1]-ARBOR.click[1],ARBOR.barrel[0]-ARBOR.click[0]),reach=Math.hypot(ARBOR.barrel[0]-ARBOR.click[0],ARBOR.barrel[1]-ARBOR.click[1])-CLICK.r+.35,pawl=b.pivot(click);pawl.rotation.z=toBarrel;
  beam(pawl,'steel',[reach/2,0],reach,1.2,CLICK.z0,CLICK.z1);rod(click,'steel',O,1.3,CLICK.z0-.1,CLICK.z1+.1,14);
  rod(winding,'steel',ARBOR.click,.7,CLICK.z1,BRIDGE.z0,10);
  wire(winding,A,'steel',[[ARBOR.click[0]+1,ARBOR.click[1]+.8,-4],[ARBOR.click[0]-.5,ARBOR.click[1]+5,-4],[ARBOR.click[0]+3,ARBOR.click[1]+9,-4],[ARBOR.click[0]+6,ARBOR.click[1]+9.5,-4]],.22).castShadow=false;
 }
 // Stem: the winding pinion's face teeth meet the crown wheel; the clutch below it sits clear of the setting wheel until the crown is pulled.
 const stem=b.pivot(winding);
 {
  const ring=(r:number,y0:number,y1:number,inner:number)=>put(stem,A,lathe([[inner,y0],[r,y0],[r,y1],[inner,y1],[inner,y0]],40),'steel');
  const teeth=(count:number,r:number,y0:number,y1:number,from:number)=>{for(let i=0;i<count;i++){const a=from+(i+.5)*Math.PI*2/count,tooth=put(stem,A,new THREE.BoxGeometry(Math.PI*r/count*.9,y1-y0,.9),'steel');tooth.position.set(r*Math.sin(a),(y0+y1)/2,-r*Math.cos(a));tooth.rotation.y=-a}};
  ring(STEM.windR+.4,STEM.windY+1,STEM.windY+2.6,1);teeth(TEETH.windPinion,STEM.windR,STEM.windY-.15,STEM.windY+1,0);
  ring(STEM.clutchR+.45,STEM.clutchY+1.8,STEM.clutchY+3.6,.9);teeth(TEETH.clutch,STEM.clutchR,STEM.clutchY+.9,STEM.clutchY+1.8,Math.PI);
  cyl(stem,A,'steel',0,0,1,STEM.clutchY+1.2,CLOCK.drum-1,14);
 }
 cog(clutchWheel,'steel','clutchWheel',4,.6);shaft(clutchWheel,'setArbor');
 beam(winding,'steel',[6.2,STEM.clutchY+2.7],9,1,-.4,.4,.12);rod(winding,'steel',[10.4,STEM.clutchY+3.2],1,-.6,.6,12);

 // Going train. A wheel and its pinion share one spinner per arbor.
 const centreArbor=spinAt(train,'centre'),third=spinAt(train,'third');
 shaft(centreArbor,'centre');cog(centreArbor,'darksteel','centrePinion',0,1.1);cog(centreArbor,'brass','centreWheel',5,1.1);
 shaft(third,'third');cog(third,'darksteel','thirdPinion',0,.6);cog(third,'brass','thirdWheel',5,.6);

 // Escapement bridge: the centre wheel and the barrel turn behind these four arbors, so they pivot in a bridge of their own.
 {
  const [z0,z1]=[BRIDGE.z0,BRIDGE.z1],P=BRIDGE.posts,path:P2[][]=[[P[0],ARBOR.fourth],[ARBOR.fourth,ARBOR.escape],[ARBOR.escape,ARBOR.fork],[ARBOR.fork,ARBOR.balance],[ARBOR.balance,P[2]],[ARBOR.escape,P[1]]];
  for(const [a,c] of path)arm(bridge,plate,a,c,3,z0,z1);
  for(const id of ['fourth','escape','fork','balance'] as const){rod(bridge,plate,ARBOR[id],2.3,z0,z1,24);jewel(bridge,ARBOR[id],z1,.6)}
  P.forEach((p,i)=>{rod(bridge,plate,p,2.3,z0,z1,24);shaft(bridge,`post${i}` as ArborId,'steel',p);headScrew(bridge,p,z0-.5,1)});
 }
 const fourth=spinAt(escapement,'fourth'),escape=spinAt(escapement,'escape'),fork=spinAt(escapement,'fork'),balance=spinAt(escapement,'balance');
 shaft(fourth,'fourth');cog(fourth,'darksteel','fourthPinion',0,.5);cog(fourth,'brass','fourthWheel',4,.5);
 shaft(escape,'escape');cog(escape,'darksteel','escapePinion',0,.4);flat(escape,'steel',escapeWheelShape(TEETH.escape,ESCAPE.r,{bore:.4,crossings:4,hub:.9}),ESCAPE.z0,ESCAPE.z1,O,.08);
 const hairTurns=5,hairAt=(windBy:number)=>spiral(hairTurns,.9,4.9,4.2,windBy,40).map(([x,y,z]):V3=>[x+ARBOR.balance[0],y+ARBOR.balance[1],z]);
 const hairspring=spring(escapement,0x3a63c8,hairAt(0));
 {
  const along=Math.atan2(ARBOR.balance[1]-ARBOR.escape[1],ARBOR.balance[0]-ARBOR.escape[0]),reach=Math.hypot(ARBOR.balance[0]-ARBOR.fork[0],ARBOR.balance[1]-ARBOR.fork[1])-1.9,lever=b.pivot(fork);lever.rotation.z=along;
  shaft(fork,'fork');
  beam(lever,'steel',[reach/2,0],reach,.9,ESCAPE.z0,ESCAPE.z1);beam(lever,'steel',[-1.6,0],1.1,6.6,ESCAPE.z0,ESCAPE.z1);
  for(const side of [-1,1]){beam(lever,ruby,[-2.5,side*2.9],1.8,.7,ESCAPE.z0,ESCAPE.z1);beam(lever,'steel',[reach-.4,side*.75],1.4,.4,ESCAPE.z0,ESCAPE.z1)}
  // Banking pins limit the fork.
  for(const side of [-1,1])rod(escapement,'brass',[ARBOR.fork[0]+Math.cos(along)*reach*.55-Math.sin(along)*side*1.5,ARBOR.fork[1]+Math.sin(along)*reach*.55+Math.cos(along)*side*1.5],.3,BRIDGE.z1,ESCAPE.z1,8);
  // Balance: crossed rim, timing screws, roller with its impulse jewel, and the hairspring stud.
  shaft(balance,'balance');
  flat(balance,'brass',discShape(BALANCE.rim,{bore:.5,crossings:3,hub:1.3,rim:1.1,spoke:1}),BALANCE.z0,BALANCE.z1,O,.12);
  for(let i=0;i<12;i++){const a=(i+.5)*30*DEG,screwed=put(balance,A,new THREE.CylinderGeometry(.34,.34,.9,8),'gold');screwed.position.set(Math.cos(a)*(BALANCE.rim+.3),Math.sin(a)*(BALANCE.rim+.3),(BALANCE.z0+BALANCE.z1)/2);screwed.rotation.z=a-Math.PI/2}
  rod(balance,'steel',O,1.4,1.9,2.5,20);rod(balance,ruby,[1,0],.28,1.2,1.9,8);rod(balance,'brass',O,1,3.9,4.5,14);
  rod(escapement,'steel',[ARBOR.balance[0]+4.9,ARBOR.balance[1]],.4,3.9,F0,8);
 }

 // Front plate, cut away so the train shows through the dial.
 flat(front,plate,annulus(24.5,CLOCK.plate),F0,F1);flat(front,plate,annulus(1.6,4.4),F0,F1);
 for(const a of [90,20,150,270,325])beam(front,plate,polar(14.5,a),20.6,2.4,F0,F1,a*DEG);
 for(const [from,to] of [[20,165],[270,380]])flat(front,plate,arc(12,15,from*DEG,to*DEG),F0,F1);
 arm(front,plate,polar(4,35),ARBOR.minuteWheel,2.2,F0,F1);rod(front,plate,ARBOR.minuteWheel,1.6,F0,F1,20);rod(front,plate,ARBOR.setD,2,F0,F1,20);
 // Polished rings on the plate, as in the reference.
 flat(front,'darksteel',annulus(24.5,27),F1,F1+.3);flat(front,'chrome',annulus(21.6,22.6),F1,F1+.25);
 for(const [from,to] of [[24,161],[274,376]])flat(front,'chrome',arc(13,14,from*DEG,to*DEG),F1,F1+.2);
 for(let i=0;i<12;i++)if(i!==3)beam(front,'orange',polar(25.6,i*30),1.5,.5,F1+.3,F1+.42,i*30*DEG);
 {
  // Balance cock with its regulator index.
  const angle=Math.atan2(ARBOR.balance[1],ARBOR.balance[0]),r=Math.hypot(...ARBOR.balance);
  arm(front,'steel',ARBOR.balance,[Math.cos(angle)*24.8,Math.sin(angle)*24.8],4,F0,F1);rod(front,'steel',ARBOR.balance,2.7,F0,F1,24);
  beam(front,'darksteel',[ARBOR.balance[0]+2.6,ARBOR.balance[1]+2.2],6.4,.6,F1,F1+.25,.7);
  for(let i=-2;i<=2;i++)beam(front,'white',[Math.cos(angle+i*.07)*(r+5.6),Math.sin(angle+i*.07)*(r+5.6)],.9,.18,F1,F1+.06,angle+i*.07);
  headScrew(front,[Math.cos(angle)*(r+4),Math.sin(angle)*(r+4)],F1,.9);
 }
 for(const id of ['third','escape','fork','balance'] as const)jewel(front,ARBOR[id],F1);
 for(const p of PILLARS)headScrew(front,p,F1,1.6);
 for(const p of BRIDGE.posts)headScrew(front,p,F1,1);
 // Alarm window: two marks that light while the bells ring.
 beam(front,'slate',[0,25.4],CLOCK.notch.half*2+1.5,12.6,F1,F1+.4);
 for(const x of [-7.5,7.5])beam(front,cyan,[x,24.6],.75,8.6,F1+.4,F1+.5);
 for(const x of [-2.4,0,2.4])beam(front,'darksteel',[x,27.2],.45,5,F1+.4,F1+.48);
 // Seconds sub-dial on the fourth arbor.
 rod(front,'steel',ARBOR.fourth,1,F1,9,14);rod(front,'chrome',ARBOR.fourth,3.1,9,9.5,32);
 {
  const g=new THREE.CircleGeometry(2.8,32);
  put(front,A,g,m.own(A,new THREE.MeshStandardMaterial({map:m.texture(subdialTexture()),roughness:.5,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false).position.set(ARBOR.fourth[0],ARBOR.fourth[1],9.52);
 }

 // Motion works: twelve turns of the minute hand to one of the hour hand. The setting wheels idle with them.
 const cannon=spinAt(works,'centre'),minuteWheel=spinAt(works,'minuteWheel'),hourWheel=spinAt(works,'centre'),setPinion=spinAt(works,'setArbor');
 cog(cannon,'brass','cannon',0,1.1);
 cog(minuteWheel,'brass','minuteWheel',4,.5);cog(minuteWheel,'brass','minutePinion',0,.5);shaft(works,'minuteWheel','steel',ARBOR.minuteWheel);
 cog(hourWheel,'brass','hourWheel',4,1.5);rod(hourWheel,'brass',O,1.7,9.3,11.2,20);
 cog(setPinion,'steel','setPinion',0,.6);
 const setters=(['setA','setB','setC','setD'] as const).map(id=>{const spin=spinAt(works,id);cog(spin,'steel',id,id==='setA'?5:4,.5);shaft(works,id,'steel',ARBOR[id]);rod(works,'chrome',ARBOR[id],.9,wheel(id).z1,wheel(id).z1+.3,12);return spin});
 // Orange trip links from the alarm cam, traced from the reference.
 const links:P2[][]=[[[-9.2,-10],[-15,-12.5],[-16.3,-18.4],[-14.6,-25],[-13.4,-30]],[[-7.5,-10],[-10.9,-15.9],[-8.8,-22.6],[-7.5,-30]],[[4.2,-7],[10.9,-10.9],[12.5,-16.7],[8.4,-23.4],[9.2,-30]],[[5.9,-7],[15,-10],[20.9,-15],[30.1,-20.9]]];
 for(const link of links){
  wire(works,A,'wireOrange',link.map(([x,y],i):V3=>[x,y,i===0||i===link.length-1?8:8.5]),.42).castShadow=false;
  for(const end of [link[0],link[link.length-1]]){rod(works,'brass',end,.7,F1,8,10);ball(works,A,'chrome',[end[0],end[1],8.1],.75,12)}
 }
 // Alarm setting: the knob on the back turns the alarm wheel round the hour pipe; its cam is notched for the hour wheel's pin.
 const alarmWheel=spinAt(alarmSet,'centre'),alarmIdlerA=spinAt(alarmSet,'alarmIdlerA'),alarmIdlerB=spinAt(alarmSet,'alarmIdlerB'),alarmPinion=spinAt(alarmSet,'alarmKnob');
 cog(alarmWheel,'brass','alarmWheel',6,2);flat(alarmWheel,'steel',arc(2.1,3.3,.35,Math.PI*2-.35),wheel('alarmWheel').z1,wheel('alarmWheel').z1+.08,O,0);
 rod(alarmWheel,'orange',[0,5.6],.5,wheel('alarmWheel').z1,wheel('alarmWheel').z1+.08,12);
 cog(alarmIdlerA,'brass','alarmIdlerA',5,.5);shaft(alarmSet,'alarmIdlerA','steel',ARBOR.alarmIdlerA);cog(alarmIdlerB,'brass','alarmIdlerB',5,.5);shaft(alarmSet,'alarmIdlerB','steel',ARBOR.alarmIdlerB);
 cog(alarmPinion,'steel','alarmPinion',0,.7);shaft(alarmPinion,'alarmKnob');

 return {
  spin:{hour,minute,second,centre:centreArbor,cannon,barrel,third,fourth,escape,minuteWheel,hourWheel,balance,fork,
   crownWheel,transA,transB,ratchet,click,clutchWheel,setPinion,setA:setters[0],setB:setters[1],setC:setters[2],setD:setters[3],
   alarmWheel,alarmIdlerA,alarmIdlerB,alarmPinion,alarmKnob,alarmBarrel,strike,stop,stem,crown},
  hammer,bells,cyan,
  mainspring:(windBy:number)=>mainspring(spiral(mainTurns,2.2,BARREL.r-1.4,-9,windBy)),
  hairspring:(windBy:number)=>hairspring(hairAt(windBy)),
 };
}
