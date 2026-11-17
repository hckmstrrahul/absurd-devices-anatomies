// Frost geometry. Heights are measured from the board's top face: every layer's origin is at [0, TOP, 0].
// Nothing here is a plain box: moulded parts are rounded so their edges catch the light, stamped parts are cut from
// bevelled sheet with real openings, and leads end in solder.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import type {Builder} from '../kit/builder';
import {roundPlate,slab,lathe} from '../kit/builder';
import type {AssemblyId} from './model';
import {BOARD,TOP,HOLES,HOLE,HEADER,headerPins,JUMPER,ETH,USB,HDMI,BARREL,MICRO,SD,FFC,FFC_LANDS,FFC_TABS,SOC,SINK,CLIP,RAM,RAMS,EMMC,PMIC,PHY,FLASH,LEVEL,USBSW,LDO,
 phyLands,flashLands,levelLands,usbswLands,ldoLands,INDUCTORS,INDUCTOR,TANTALUMS,TANTALUM,XTAL,COIN,BUTTONS,BUTTON,buttonLands,LEDS,ledX,MODULE,RIBBON,ribbonPath,passives,SIZES,type Land} from './layout';
import {boardTextures,brushed,grain,drawn,packageTop,etched,ribbonTexture,edgeTexture,screenTexture,modulePrint,cardLabel,type Marking} from './textures';

type Mat=THREE.Material;
const RY=[0,-Math.PI/2,Math.PI,Math.PI/2];

export function buildFrost(b:Builder){
 const tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t) as T;
 const own=<T extends Mat>(asm:AssemblyId,m:T)=>b.m.own(asm,m);
 const base:[number,number,number]=[0,TOP,0];
 const L={board:b.layer('board',[0,0,0],base),parts:b.layer('parts',[0,0,0],base),chips:b.layer('chips',[0,0,0],base),header:b.layer('header',[0,0,0],base),sink:b.layer('heatsink',[0,0,0],base),flex:b.layer('flex',[0,0,0],base),
  right:b.layer('ports',[24,0,0],base),left:b.layer('ports',[-24,0,0],base)};

 // ── Finishes. Each is made once per assembly, so selecting an assembly ghosts the rest. ──
 const steelT=brushed(3),steelMM={map:tex(steelT.map),relief:tex(steelT.relief)},steelU={map:tex(steelT.map.clone()),relief:tex(steelT.relief.clone())};
 for(const t of [steelMM.map,steelMM.relief])t.repeat.set(1/22,1/22);
 const grainT=tex(grain(9)),fineT=tex(grain(4,170,26)),linesT=tex(drawn(6));grainT.repeat.set(5,5);fineT.repeat.set(3,3);linesT.repeat.set(6,1);
 const cache=new Map<string,Mat>();
 const once=<T extends Mat>(key:string,asm:AssemblyId,make:()=>T)=>{let m=cache.get(asm+key);if(!m){m=own(asm,make());cache.set(asm+key,m)}return m as T};
 // Stamped steel: brushed, softly anisotropic. `mm` is for sheet cut with ExtrudeGeometry, whose UVs are in millimetres.
 const mirrors:THREE.MeshPhysicalMaterial[]=[];
 const steel=(asm:AssemblyId,mm=true)=>once('steel'+mm,asm,()=>{const t=mm?steelMM:steelU,m=new THREE.MeshPhysicalMaterial({color:0xffffff,map:t.map,metalness:1,roughness:1,roughnessMap:t.relief,bumpMap:t.relief,bumpScale:.02,anisotropy:.4,anisotropyRotation:0});mirrors.push(m);return m});
 const tin=(asm:AssemblyId)=>once('tin',asm,()=>new THREE.MeshStandardMaterial({color:0xdfe2e5,metalness:1,roughness:.3}));
 const solder=(asm:AssemblyId)=>once('solder',asm,()=>new THREE.MeshStandardMaterial({color:0xcfd3d7,metalness:1,roughness:.22}));
 const gold=(asm:AssemblyId)=>once('gold',asm,()=>new THREE.MeshStandardMaterial({color:0xe0b45a,metalness:1,roughness:.26}));
 const plastic=(asm:AssemblyId,colour=0x1a1b1e,key='black')=>once('plastic'+key,asm,()=>new THREE.MeshStandardMaterial({color:colour,roughness:1,roughnessMap:grainT,bumpMap:grainT,bumpScale:.035}));
 const mould=(asm:AssemblyId)=>once('mould',asm,()=>new THREE.MeshStandardMaterial({color:0x1d1e21,roughness:1,roughnessMap:fineT,bumpMap:fineT,bumpScale:.02}));
 const inner=(asm:AssemblyId)=>once('inner',asm,()=>new THREE.MeshStandardMaterial({color:0x1d2024,metalness:.5,roughness:.7,side:THREE.BackSide}));

 // ── Shape helpers ──
 const rb=(w:number,h:number,d:number,r=.15,seg=3)=>new RoundedBoxGeometry(w,h,d,seg,Math.max(.01,Math.min(r,w/2-.005,h/2-.005,d/2-.005)));
 const rbox=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,x:number,z:number,w:number,d:number,y0:number,y1:number,r=.15)=>{const m=b.put(parent,asm,rb(w,y1-y0,d,r),mat);m.position.set(x,(y0+y1)/2,z);return m};
 const at=(parent:THREE.Object3D,x:number,z:number,turn=0,y=0)=>{const n=b.pivot(parent,[x,y,z]);n.rotation.y=turn;return n};
 const rectShape=(x0:number,y0:number,x1:number,y1:number,r=0)=>{const s=new THREE.Shape();if(r<=0){s.moveTo(x0,y0);s.lineTo(x1,y0);s.lineTo(x1,y1);s.lineTo(x0,y1);s.closePath();return s}
  s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.absarc(x1-r,y0+r,r,-Math.PI/2,0,false);s.lineTo(x1,y1-r);s.absarc(x1-r,y1-r,r,0,Math.PI/2,false);s.lineTo(x0+r,y1);s.absarc(x0+r,y1-r,r,Math.PI/2,Math.PI,false);s.lineTo(x0,y0+r);s.absarc(x0+r,y0+r,r,Math.PI,Math.PI*1.5,false);return s};
 const pathOf=(pts:[number,number][])=>new THREE.Path(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const shapeOf=(pts:[number,number][])=>new THREE.Shape(pts.map(([x,y])=>new THREE.Vector2(x,y)));
 const rectHole=(x0:number,y0:number,x1:number,y1:number)=>pathOf([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
 const roundHole=(x:number,y:number,r:number)=>{const p=new THREE.Path();p.absarc(x,y,r,0,Math.PI*2,true);return p};
 // A U-shaped cut that leaves a sprung tongue: the mark of a stamped shell. The tongue hangs from the open end.
 const uSlot=(cx:number,cy:number,w:number,h:number,s=.34,flip=false,side=false)=>{
  const pts:[number,number][]=[],r=w/2,y1=h/2,yc=-h/2+r;
  pts.push([-r,y1]);for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI;pts.push([Math.cos(a)*r,yc+Math.sin(a)*r])}
  pts.push([r,y1],[r-s,y1]);for(let i=0;i<=10;i++){const a=-i/10*Math.PI;pts.push([Math.cos(a)*(r-s),yc+Math.sin(a)*(r-s)])}
  pts.push([-r+s,y1]);
  return pathOf(pts.map(([x,y])=>{const yy=flip?-y:y;return side?[cx+yy,cy+x]:[cx+x,cy+yy]}));
 };
 // Sheet metal: a shape cut from stock of thickness `t`, edges broken by a small bevel. Lies in XY, thickness from z = 0 to t.
 const sheetGeo=(shape:THREE.Shape,t:number,bevel=.045)=>{const q=Math.min(bevel,t*.3),g=new THREE.ExtrudeGeometry(shape,{depth:t-q*2,bevelEnabled:true,bevelThickness:q,bevelSize:q,bevelOffset:-q,bevelSegments:1,curveSegments:10});g.translate(0,0,q);return g};
 // Flat on the board (shape y is −z, thickness upward), standing across (facing ±z), or standing along (shape x is z, thickness toward −x).
 const flat=(g:THREE.BufferGeometry)=>g.rotateX(-Math.PI/2),along=(g:THREE.BufferGeometry)=>g.rotateY(-Math.PI/2);
 const plate=(parent:THREE.Object3D,asm:AssemblyId,mat:Mat,g:THREE.BufferGeometry,x=0,y=0,z=0)=>{const m=b.put(parent,asm,g,mat);m.position.set(x,y,z);return m};
 // Flat facets for a turned shape with few sides (a square pin, a hexagonal standoff).
 const faceted=(g:THREE.BufferGeometry)=>{const q=g.toNonIndexed();q.computeVertexNormals();return q};
 const dummy=new THREE.Object3D();
 type Item={x:number;y:number;z:number;ry?:number;rz?:number;sx?:number;sy?:number;sz?:number};
 const inst=(parent:THREE.Object3D,asm:AssemblyId,g:THREE.BufferGeometry,mat:Mat,items:Item[])=>{
  if(!items.length)return null;
  const m=new THREE.InstancedMesh(g,mat,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(0,it.ry??0,it.rz??0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix)});
  m.instanceMatrix.needsUpdate=true;b.adopt(parent,asm,m,items.length);return m;
 };
 // A gull-wing lead: out of the body at height `h1`, down, and along the land. Origin at the body, +x outward.
 const gull=(reach:number,h1:number,w:number,t=.13,foot=.45)=>{const a=reach-foot-.24,g=new THREE.ExtrudeGeometry(shapeOf([[0,h1+t],[a,h1+t],[a+.24,t],[reach,t],[reach,0],[a+.24-t*.55,0],[a-t*.55,h1],[0,h1]]),{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);return g};
 const leadItems=(lands:Land[],reach:number,foot=.45):Item[]=>lands.map(l=>{const o=l.out,dx=o===0?1:o===2?-1:0,dz=o===1?1:o===3?-1:0,len=o&1?l.h:l.w;return {x:l.x-dx*(reach-foot/2-len*.08),y:.02,z:l.z-dz*(reach-foot/2-len*.08),ry:RY[o]}});
 // Solder: a low pillow on each land, and a concave fillet up each terminal's end face.
 const pillow=rb(1,1,1,.3,2);
 const pillows=(parent:THREE.Object3D,asm:AssemblyId,lands:Land[],h=.09,k=.94)=>inst(parent,asm,pillow,solder(asm),lands.map(l=>({x:l.x,y:h/2,z:l.z,sx:l.w*k,sy:h,sz:l.h*k})));
 const fillet=(()=>{const pts:[number,number][]=[[0,0]];for(let i=0;i<=8;i++){const a=i/8*Math.PI/2;pts.push([1-Math.sin(a)*.94,1-Math.cos(a)*.94])}const g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:1,bevelEnabled:false,curveSegments:1});g.translate(0,0,-.5);return g})();
 // A marking printed flat on top of a body.
 const decal=(parent:THREE.Object3D,asm:AssemblyId,t:{map:THREE.Texture;relief:THREE.Texture},x:number,z:number,w:number,d:number,y:number,turn=0,metal=0)=>{
  const mat=own(asm,new THREE.MeshStandardMaterial({map:tex(t.map),roughness:1,roughnessMap:tex(t.relief),bumpMap:t.relief,bumpScale:metal?.12:.05,metalness:metal,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);const m=b.put(parent,asm,g,mat,false);m.position.set(x,y+.004,z);m.rotation.y=turn;return m;
 };
 // A moulded package: rounded body with its laser-marked top.
 const pack=(parent:THREE.Object3D,asm:AssemblyId,x:number,z:number,w:number,d:number,y0:number,y1:number,m:Omit<Marking,'w'|'d'>,seed:number,r=.1)=>{
  rbox(parent,asm,mould(asm),x,z,w,d,y0,y1,r);decal(parent,asm,packageTop({w:w-r*2,d:d-r*2,...m},seed),x,z,w-r*2,d-r*2,y1);
 };
 const balls=(parent:THREE.Object3D,asm:AssemblyId,pts:[number,number][],r:number)=>inst(parent,asm,new THREE.SphereGeometry(r,10,8),solder(asm),pts.map(([x,z])=>({x,y:r*.8,z,sy:.8})));

 // ── Board ──────────────────────────────────────────────────────────────
 let boardTop!:THREE.MeshPhysicalMaterial;
 {
  const prints=boardTextures(),plan=roundPlate(BOARD.w,BOARD.d,BOARD.r);
  for(const [x,z] of HOLES)plan.holes.push(roundHole(x,-z,HOLE.drill));
  const edge=tex(edgeTexture());edge.repeat.set(1/5,1/BOARD.t);edge.offset.y=.375;
  const core=own('board',new THREE.MeshStandardMaterial({color:0xe4e5e3,roughness:.6})),side=own('board',new THREE.MeshStandardMaterial({map:edge,roughness:.62}));
  const body=new THREE.Mesh(slab(plan,-BOARD.t,0,40),[core,side]);b.adopt(L.board,'board',body);
  const relief=tex(prints.relief);
  boardTop=own('board',new THREE.MeshPhysicalMaterial({map:tex(prints.map),roughness:1,roughnessMap:relief,metalness:1,metalnessMap:relief,bumpMap:relief,bumpScale:2.2,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
  const face=()=>{const g=new THREE.ShapeGeometry(plan,40),p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/BOARD.w+.5,p.getY(i)/BOARD.d+.5);return g};
  const top=b.put(L.board,'board',flat(face()),boardTop,false);top.position.y=.004;
  const under=b.put(L.board,'board',face().rotateX(Math.PI/2),own('board',new THREE.MeshStandardMaterial({map:tex(prints.bottom),roughness:.56,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1})),false);under.position.y=-BOARD.t-.004;
  // Plated barrels in the mounting holes, and the brass standoffs the board stands on.
  const plating=own('board',new THREE.MeshStandardMaterial({color:0xdcb15a,metalness:1,roughness:.3,side:THREE.BackSide})),brass=own('board',new THREE.MeshStandardMaterial({color:0xcda24e,metalness:1,roughness:.3})),bore=own('board',new THREE.MeshStandardMaterial({color:0x2a2418,metalness:.6,roughness:.6}));
  for(const [x,z] of HOLES){
   const barrel=b.put(L.board,'board',new THREE.CylinderGeometry(HOLE.drill-.01,HOLE.drill-.01,BOARD.t,32,1,true),plating,false);barrel.position.set(x,-BOARD.t/2,z);
   // Hexagonal standoff with chamfered ends and a threaded bore showing through the hole.
   const hex=b.put(L.board,'board',faceted(lathe([[0,-TOP],[2.25,-TOP],[2.6,-TOP+.35],[2.6,-BOARD.t-.35],[2.25,-BOARD.t],[0,-BOARD.t]],6)),brass);hex.position.set(x,0,z);
   const hole=b.put(L.board,'board',new THREE.CircleGeometry(1.25,24).rotateX(-Math.PI/2),bore,false);hole.position.set(x,-BOARD.t+.01,z);
  }
 }

 let ethNode!:THREE.Object3D,sinkNode!:THREE.Object3D,moduleNode!:THREE.Object3D;

 // ── Small two-terminal components: one instanced body, pair of end caps and pair of fillets per kind. ──
 {
  const kinds=Object.keys(SIZES) as (keyof typeof SIZES)[],fillets:Item[]=[],lands:Land[]=[];
  const ceramic=own('parts',new THREE.MeshStandardMaterial({color:0xb9a88e,roughness:.62})),alumina=own('parts',new THREE.MeshStandardMaterial({color:0xe2e3df,roughness:.7})),film=own('parts',new THREE.MeshStandardMaterial({color:0x17181a,roughness:.5}));
  const code=packageTop({w:1,d:.62,lines:['472'],size:38,ink:'#e9eaea',body:'#17181a'},2),coded=own('parts',new THREE.MeshStandardMaterial({map:tex(code.map),roughness:.5}));
  for(const kind of kinds){
   const [l,w,h,off,pl,pw]=SIZES[kind],list=passives().filter(c=>c.kind===kind),cap=kind==='d'?.3:Math.min(.38,l*.24),bodies:Item[]=[],caps:Item[]=[];
   for(const c of list){
    const ry=c.turn?Math.PI/2:0,dx=c.turn?0:1,dz=c.turn?1:0;bodies.push({x:c.x,y:h/2+.03,z:c.z,ry});
    for(const s of [-1,1]){
     caps.push({x:c.x+dx*s*(l/2-cap/2),y:h/2+.03,z:c.z+dz*s*(l/2-cap/2),ry});
     fillets.push({x:c.x+dx*s*l/2,y:.02,z:c.z+dz*s*l/2,ry:c.turn?(s>0?-Math.PI/2:Math.PI/2):(s>0?0:Math.PI),sx:Math.max(.12,off+pl/2-l/2)*.95,sy:h*.72,sz:w*.92});
     lands.push({x:c.x+dx*s*off,z:c.z+dz*s*off,w:c.turn?pw:pl,h:c.turn?pl:pw,out:0});
    }
   }
   if(kind==='d'){
    inst(L.parts,'parts',rb(l-.5,h,w,.07,2),mould('parts'),bodies);inst(L.parts,'parts',rb(.5,.22,w*.6,.04,1),tin('parts'),caps.map(c=>({...c,y:.13})));
    inst(L.parts,'parts',rb(.28,.02,w-.1,.005,1),alumina,bodies.map(c=>({...c,y:h+.035,x:c.x-(c.ry?0:.42),z:c.z-(c.ry?-.42:0)})));
   }else{
    const res=kind[0]==='r';
    inst(L.parts,'parts',rb(l-cap*2+.04,h,w,.05,2),res?alumina:ceramic,bodies);inst(L.parts,'parts',rb(cap,h+.035,w+.035,.06,2),tin('parts'),caps);
    if(res)inst(L.parts,'parts',rb(l-cap*2-.06,.04,w-.08,.012,1),kind==='r06'?coded:film,bodies.map(c=>({...c,y:h+.045})));
   }
  }
  inst(L.parts,'parts',fillet,solder('parts'),fillets);pillows(L.parts,'parts',lands,.05,.96);
 }

 // ── Packages ─────────────────────────────────────────────────────────────
 {
  const C=L.chips,grid=(cx:number,cz:number,n:number,m:number,p:number,skip?:(i:number,j:number)=>boolean)=>{const out:[number,number][]=[];for(let j=0;j<m;j++)for(let i=0;i<n;i++)if(!skip?.(i,j))out.push([cx+(i-(n-1)/2)*p,cz+(j-(m-1)/2)*p]);return out};
  // Processor: balls, a dark substrate with decoupling round a nickel lid, laser-etched.
  balls(C,'chips',grid(SOC.x,SOC.z,SOC.n,SOC.n,SOC.pitch,(i,j)=>i>1&&i<SOC.n-2&&j>1&&j<SOC.n-2),.2);
  const substrate=own('chips',new THREE.MeshStandardMaterial({color:0x14302a,roughness:.5,roughnessMap:fineT,bumpMap:fineT,bumpScale:.015}));
  rbox(C,'chips',substrate,SOC.x,SOC.z,SOC.s,SOC.s,.3,.82,.08);
  const lid=steel('chips',false);rbox(C,'chips',lid,SOC.x,SOC.z,SOC.lid,SOC.lid,.82,SOC.h,.22);
  decal(C,'chips',etched(SOC.lid-.8,SOC.lid-.8,['GLACIER G4','GX4208-QB','2634 K7M  A2'],8,{mark:true}),SOC.x,SOC.z,SOC.lid-.8,SOC.lid-.8,SOC.h,0,1);
  {const caps:Item[]=[];for(let i=0;i<9;i++)for(const s of [-1,1]){caps.push({x:SOC.x+(i-4)*1.3,y:.94,z:SOC.z+s*6.55});caps.push({x:SOC.x+s*6.55,y:.94,z:SOC.z+(i-4)*1.3,ry:Math.PI/2})}
   inst(C,'chips',rb(.6,.24,.3,.04,1),own('chips',new THREE.MeshStandardMaterial({color:0xb9a88e,roughness:.6})),caps);
   const dot=b.put(C,'chips',new THREE.CircleGeometry(.32,20).rotateX(-Math.PI/2),gold('chips'),false);dot.position.set(SOC.x-6.7,.826,SOC.z+6.7)}
  // Memory and storage.
  RAMS.forEach((r,i)=>{balls(C,'chips',grid(r.x,r.z,RAM.cols,2,RAM.pitch).flatMap(([x,z])=>z<r.z?[[x,r.z-3.2],[x,r.z-2.4]]:[[x,r.z+3.2],[x,r.z+2.4]]) as [number,number][],.19);pack(C,'chips',r.x,r.z,RAM.w,RAM.d,.26,RAM.h,{lines:['KV4G16-093E','6PX77 D9TKB',`2631 ${i?'R':'L'}4`],mark:true,align:'left',pin:[.07,.86]},20+i)});
  balls(C,'chips',grid(EMMC.x,EMMC.z,EMMC.n,EMMC.n,EMMC.pitch,(i,j)=>i>0&&i<EMMC.n-1&&j>0&&j<EMMC.n-1),.13);
  pack(C,'chips',EMMC.x,EMMC.z,EMMC.w,EMMC.d,.2,EMMC.h,{lines:['NF32G-E51','eStore 32G','2629 TW3'],mark:true,pin:[.09,.07]},23);
  // Power manager: leadless, so only its flanks and the fillets up them show.
  pack(C,'chips',PMIC.x,PMIC.z,PMIC.s,PMIC.s,.04,PMIC.h,{lines:['PQ3310','K26 4P'],pin:[.12,.12]},24,.06);
  // Leaded parts: gull-wing leads, each on a pillow of solder.
  const leaded=(lands:Land[],reach:number,h1:number,w:number,foot=.45)=>{inst(C,'chips',gull(reach,h1,w,.13,foot),tin('chips'),leadItems(lands,reach,foot));pillows(C,'chips',lands)};
  pack(C,'chips',PHY.x,PHY.z,PHY.s,PHY.s,.1,PHY.h,{lines:['HW8211F','ETHERLINK','2630 G'],mark:true,pin:[.1,.1]},25,.16);leaded(phyLands(),1.05,.62,.22);
  pack(C,'chips',FLASH.x,FLASH.z,FLASH.w,FLASH.d,.1,FLASH.h,{lines:['NQ25128','2631'],pin:[.12,.82]},26,.14);leaded(flashLands(),1.2,.7,.42,.6);
  pack(C,'chips',LEVEL.x,LEVEL.z,LEVEL.w,LEVEL.d,.08,LEVEL.h,{lines:['LS7719','D5 26'],turn:true,pin:[.14,.1]},27,.1);leaded(levelLands(),1.05,.5,.26);
  pack(C,'chips',USBSW.x,USBSW.z,USBSW.w,USBSW.d,.08,USBSW.h,{lines:['S5K'],size:60},28,.1);leaded(usbswLands(),.95,.5,.42,.4);
  pack(C,'chips',LDO.x,LDO.z,LDO.w,LDO.d,.08,LDO.h,{lines:['HR1117-33','2628'],pin:[.08,.8]},29,.14);
  {const ls=ldoLands();inst(C,'chips',gull(1.9,.7,.72,.2,.9),tin('chips'),leadItems(ls.slice(0,3),1.9,.9));inst(C,'chips',gull(1.9,.7,3,.2,.9),tin('chips'),leadItems(ls.slice(3),1.9,.9));pillows(C,'chips',ls)}
 }

 // ── Inductors, tantalums, crystal, coin cell, buttons, lamps ──────────────────
 const buttons:THREE.Object3D[]=[];
 const leds:{lens:THREE.MeshStandardMaterial;tint:THREE.Color}[]=[];
 {
  const P=L.parts,ferrite=own('parts',new THREE.MeshStandardMaterial({color:0x3b3d42,roughness:1,roughnessMap:grainT,bumpMap:grainT,bumpScale:.05}));
  INDUCTORS.forEach(([x,z],i)=>{
   rbox(P,'parts',ferrite,x,z,INDUCTOR.s,INDUCTOR.s,.06,INDUCTOR.h,.55);decal(P,'parts',packageTop({w:3.6,d:3.6,lines:['2R2',`K${i+4}`],ink:'#d9dbdd',body:'#3b3d42'},40+i),x,z,3.6,3.6,INDUCTOR.h);
   for(const s of [-1,1]){rbox(P,'parts',tin('parts'),x+s*2.42,z,.2,3.6,.04,1.3,.05);const f=b.put(P,'parts',fillet,solder('parts'));f.position.set(x+s*2.52,.02,z);f.rotation.y=s>0?0:Math.PI;f.scale.set(.42,.9,3.4)}
  });
  const amber=own('parts',new THREE.MeshStandardMaterial({color:0xc98a22,roughness:.5,roughnessMap:fineT,bumpMap:fineT,bumpScale:.02}));
  TANTALUMS.forEach((t,i)=>{
   const n=at(P,t.x,t.z,t.turn?-Math.PI/2:0),l=TANTALUM.l,w=TANTALUM.w,h=TANTALUM.h;
   rbox(n,'parts',amber,0,0,l,w,.08,h,.28);decal(n,'parts',packageTop({w:l-.8,d:w-.6,lines:['107C','16K 6R'],ink:'#3a2206',body:'#c98a22',bar:'left'},50+i),0,0,l-.8,w-.6,h);
   for(const s of [-1,1]){rbox(n,'parts',tin('parts'),s*(l/2+.02),0,.18,2.4,.03,h*.62,.05);rbox(n,'parts',tin('parts'),s*(l/2-.5),0,1.2,2.4,.01,.12,.04);const f=b.put(n,'parts',fillet,solder('parts'));f.position.set(s*(l/2+.1),.02,0);f.rotation.y=s>0?0:Math.PI;f.scale.set(.42,1.1,2.3)}
  });
  // Crystal: a seam-welded steel lid on a ceramic base.
  rbox(P,'parts',own('parts',new THREE.MeshStandardMaterial({color:0x2a2622,roughness:.7})),XTAL.x,XTAL.z,XTAL.w,XTAL.d,.03,.4,.06);rbox(P,'parts',steel('parts',false),XTAL.x,XTAL.z,XTAL.w-.36,XTAL.d-.36,.4,XTAL.h,.12);
  decal(P,'parts',etched(2.5,1.8,['25.000','HW K6'],61,{size:44}),XTAL.x,XTAL.z,2.5,1.8,XTAL.h,0,1);
  // Coin cell under a sprung steel strap.
  {
   const n=at(P,COIN.x,COIN.z),r=COIN.r-.15,cell=steel('parts',false);
   const ring=b.put(n,'parts',lathe([[r-1.1,0],[r+.35,0],[r+.35,.9],[r+.05,1.1],[r+.05,.5],[r-1.1,.5]],64),plastic('parts'));ring.position.y=.02;
   const can=b.put(n,'parts',lathe([[0,.5],[r-.5,.5],[r-.28,.62],[r-.28,.9],[r-.05,1],[r-.05,2.25],[r-.3,2.5],[0,2.5]],72),cell);can.position.y=.02;
   decal(n,'parts',etched(r*2-.6,r*2-.6,['CR1220','LITHIUM  3V','HVIT'],62,{round:true,size:66,plus:true}),0,0,r*2-.6,r*2-.6,2.52,0,1).geometry=new THREE.CircleGeometry(r-.3,64).rotateX(-Math.PI/2);
   // The strap: up from each land, over the cell, pressed down in the middle.
   const reach=COIN.r+1.4,profile:[number,number][]=[[-reach-.9,0],[-reach+.5,0],[-reach+.9,.5],[-reach+1.3,2.75],[-2.2,2.75],[-1.4,2.56],[1.4,2.56],[2.2,2.75],[reach-1.3,2.75],[reach-.9,.5],[reach-.5,0],[reach+.9,0]];
   const pts=[...profile,...profile.slice().reverse().map(([x,y])=>[x,y+.22] as [number,number])],g=new THREE.ExtrudeGeometry(shapeOf(pts),{depth:3.6,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelOffset:-.04,bevelSegments:1});g.translate(0,.03,-1.8);
   b.put(n,'parts',g,steel('parts'));
   pillows(P,'parts',[{x:COIN.x-reach,z:COIN.z,w:1.8,h:3.2,out:0},{x:COIN.x+reach,z:COIN.z,w:1.8,h:3.2,out:0}],.12);
  }
  // Tactile buttons: moulded base, stamped cover held by four stakes, a domed plunger, four gull-wing legs.
  const plunger=lathe([[0,3.3],[1.75,3.3],[1.75,BUTTON.cap-.4],[1.62,BUTTON.cap-.14],[1.3,BUTTON.cap],[0,BUTTON.cap]],40);
  const cover=flat(sheetGeo((()=>{const s=rectShape(-3,-3,3,3,.35);s.holes.push(roundHole(0,0,1.95));return s})(),.26,.06));
  for(const s of BUTTONS){
   const n=at(P,s.x,BUTTON.z),colour=s.red?0xc9302a:0x1b1c1f,body=plastic('parts',colour,s.red?'red':'black');buttons.push(n);
   rbox(n,'parts',body,0,0,BUTTON.s-.1,BUTTON.s-.1,.25,3.32,.4);plate(n,'parts',steel('parts'),cover,0,3.3,0);
   b.put(n,'parts',plunger,s.red?plastic('parts',0xd2342c,'redcap'):plastic('parts',0x2a2b2f,'cap'));
   for(const [x,z] of [[-2.35,-2.35],[2.35,-2.35],[-2.35,2.35],[2.35,2.35]]){const stake=b.put(n,'parts',new THREE.SphereGeometry(.34,14,8,0,Math.PI*2,0,Math.PI/2),plastic('parts',colour,s.red?'red':'black'));stake.position.set(x,3.54,z);stake.scale.y=.6}
   const lands=buttonLands(s.x);inst(P,'parts',gull(1.25,1.1,.7,.16,.6),tin('parts'),leadItems(lands,1.25,.6));pillows(P,'parts',lands,.1);
  }
  // Status lamps: a ceramic base, a milky lens that lights, and the series resistor behind.
  const tints=[0x56ff8a,0xffb347,0xbfe8ff,0xbfe8ff,0xbfe8ff,0xbfe8ff,0xffb347,0x56ff8a],res:Item[]=[],caps:Item[]=[],fil:Item[]=[],lands:Land[]=[];
  for(let i=0;i<LEDS.n;i++){
   const x=ledX(i),tint=new THREE.Color(tints[i]),lens=own('parts',new THREE.MeshStandardMaterial({color:new THREE.Color(0xf4f1e6).lerp(tint,.12),roughness:.35,emissive:tint,emissiveIntensity:0,transparent:true,opacity:.93}));
   rbox(P,'parts',own('parts',new THREE.MeshStandardMaterial({color:0xe9e8e2,roughness:.7})),x,LEDS.z,.8,1.6,.03,.3,.04);rbox(P,'parts',lens,x,LEDS.z,.78,1.02,.3,.68,.12);leds.push({lens,tint});
   for(const s of [-1,1]){rbox(P,'parts',tin('parts'),x,LEDS.z+s*.68,.82,.26,.02,.34,.04);caps.push({x,y:.2,z:LEDS.rz+s*.37,ry:Math.PI/2});fil.push({x,y:.02,z:LEDS.rz+s*.5,ry:s>0?-Math.PI/2:Math.PI/2,sx:.2,sy:.25,sz:.46});lands.push({x,z:LEDS.z+s*.75,w:.8,h:.7,out:0},{x,z:LEDS.rz+s*.5,w:.6,h:.55,out:0})}
   res.push({x,y:.2,z:LEDS.rz,ry:Math.PI/2});
  }
  inst(P,'parts',rb(.56,.35,.5,.05,2),own('parts',new THREE.MeshStandardMaterial({color:0x17181a,roughness:.5})),res);inst(P,'parts',rb(.24,.38,.54,.05,2),tin('parts'),caps);inst(P,'parts',fillet,solder('parts'),fil);pillows(P,'parts',lands,.05);
 }

 // ── Header: forty gold pins in a black base moulded as a row of cells. ──
 {
  const H=L.header,pins=[...headerPins(),...JUMPER.pins],cell=rb(2.5,HEADER.body,2.5,.3,3);
  inst(H,'header',cell,plastic('header'),pins.map(([x,z])=>({x,y:HEADER.body/2+.02,z})));
  // A square pin with a pyramid point: a four-sided cone on a four-sided column.
  const q=.64/Math.SQRT2,pin=lathe([[0,-BOARD.t-2.4],[q*.5,-BOARD.t-2.4],[q,-BOARD.t-1.9],[q,HEADER.pin-.6],[q*.42,HEADER.pin],[0,HEADER.pin]],4);pin.rotateY(Math.PI/4);
  inst(H,'header',faceted(pin),gold('header'),pins.map(([x,z])=>({x,y:0,z})));
  // Standoff feet under the base let the solder wick; here they read as a shadow line.
  inst(H,'header',rb(1,1,1,.3,2),solder('header'),pins.map(([x,z])=>({x,y:-BOARD.t-.18,z,sx:1.5,sy:.5,sz:1.5})));
 }

 // ── Heat sink: a folded fin on a base plate, black anodised, sprung on with a wire clip. ──
 {
  const S=L.sink,y0=SOC.h+.14,n=SINK.legs,a=(SINK.s-1)/(n-1),r=a/2,Hh=SINK.h,t=.56,line:[number,number][]=[];
  for(let i=0;i<n;i++){
   const x=(i-(n-1)/2)*a,up=i%2===0;
   if(up){line.push([x,i?r:0],[x,Hh-r]);if(i<n-1)for(let k=1;k<10;k++){const q=Math.PI-k/10*Math.PI;line.push([x+r+Math.cos(q)*r,Hh-r+Math.sin(q)*r])}}
   else{line.push([x,Hh-r],[x,i<n-1?r:0]);if(i<n-1)for(let k=1;k<10;k++){const q=Math.PI+k/10*Math.PI;line.push([x+r+Math.cos(q)*r,r+Math.sin(q)*r])}}
  }
  const leftSide:[number,number][]=[],rightSide:[number,number][]=[];
  line.forEach((p,i)=>{const p0=line[Math.max(0,i-1)],p1=line[Math.min(line.length-1,i+1)],dx=p1[0]-p0[0],dy=p1[1]-p0[1],len=Math.hypot(dx,dy)||1;leftSide.push([p[0]-dy/len*t/2,p[1]+dx/len*t/2]);rightSide.push([p[0]+dy/len*t/2,p[1]-dx/len*t/2])});
  const fin=new THREE.ExtrudeGeometry(shapeOf([...leftSide,...rightSide.reverse()]),{depth:SINK.s-.5,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelOffset:-.07,bevelSegments:2,curveSegments:1});fin.translate(0,0,-(SINK.s-.5)/2);
  const anodised=own('heatsink',new THREE.MeshPhysicalMaterial({color:0x131417,metalness:.75,roughness:1,roughnessMap:linesT,bumpMap:linesT,bumpScale:.03,clearcoat:.25,clearcoatRoughness:.5}));
  const node=at(S,SINK.x,SINK.z,0,y0);sinkNode=node;
  rbox(node,'heatsink',anodised,0,0,SINK.s,SINK.s,0,SINK.base,.3);const f=b.put(node,'heatsink',fin,anodised);f.position.y=SINK.base-.05;
  // Thermal pad between lid and base.
  rbox(S,'heatsink',own('heatsink',new THREE.MeshStandardMaterial({color:0x9fb4c4,roughness:.85})),SINK.x,SINK.z,SOC.lid-.4,SOC.lid-.4,SOC.h+.01,y0+.02,.04);
  // Wire clip across the fin tops, hooked under an anchor at each end.
  const [[ax,az],[bx,bz]]=CLIP,top=y0+SINK.base+Hh+.28,wire=own('heatsink',new THREE.MeshStandardMaterial({color:0xaeb3b9,metalness:1,roughness:.28}));
  b.wire(S,'heatsink',wire,[[ax-.9,.75,az],[ax,.55,az],[ax+.5,.9,az+.3],[ax+.7,top-1.6,az+1.2],[ax+1.3,top-.2,az+2],[ax+3,top,az+3.6],[bx-3,top,bz-3.6],[bx-1.3,top-.2,bz-2],[bx-.7,top-1.6,bz-1.2],[bx-.5,.9,bz-.3],[bx,.55,bz],[bx+.9,.75,bz]],.32);
  for(const [x,z] of CLIP){const hoop=b.torus(S,'heatsink',tin('heatsink'),[x,.3,z],.75,.2,24);hoop.rotation.set(0,0,0);hoop.rotation.y=Math.PI/4;hoop.scale.set(1,1,1);rbox(S,'heatsink',solder('heatsink'),x,z,2.2,2.2,0,.14,.06)}
 }

 // ── Ports ────────────────────────────────────────────────────────────────
 // A stamped shell: top, two sides and a back cut from sheet, each with its own openings, plus tabs folded over the seams.
 const can=(n:THREE.Object3D,asm:AssemblyId,Ln:number,Wd:number,H:number,t:number,o:{y0?:number;top?:THREE.Path[];side?:THREE.Path[];back?:THREE.Path[]})=>{
  const m=steel(asm),y0=o.y0??.1,top=rectShape(-Ln/2,-Wd/2,Ln/2,Wd/2,.25);top.holes.push(...(o.top??[]));plate(n,asm,m,flat(sheetGeo(top,t)),0,H-t,0);
  for(const s of [-1,1]){const side=rectShape(-Ln/2,y0,Ln/2,H-t*.6);side.holes.push(...(o.side??[]));plate(n,asm,m,sheetGeo(side,t),0,0,s>0?Wd/2-t:-Wd/2)}
  const back=rectShape(-Wd/2+t,y0,Wd/2-t,H-t*.6);back.holes.push(...(o.back??[]));plate(n,asm,m,along(sheetGeo(back,t)),-Ln/2+t,0,0);
  // Folded tabs: the top laps the back and each side.
  for(const z of [-Wd*.26,Wd*.26])plate(n,asm,m,along(sheetGeo(rectShape(-1.1,H-1.9,1.1,H-.05,.2),t)),-Ln/2-.01,0,z);
  for(const s of [-1,1])for(const x of [-Ln*.3,Ln*.22])plate(n,asm,m,sheetGeo(rectShape(x-1.2,H-1.6,x+1.2,H-.05,.2),t),0,0,s>0?Wd/2+.01:-Wd/2-t-.01);
 };
 const legs=(n:THREE.Object3D,asm:AssemblyId,pts:[number,number][])=>{for(const [x,z] of pts){rbox(n,asm,tin(asm),x,z,1.5,.3,-BOARD.t-1,.8,.06);const s=b.put(n,asm,pillow,solder(asm));s.position.set(x,.06,z);s.scale.set(2.2,.16,1.3)}};
 const ethLamps:THREE.MeshStandardMaterial[]=[];
 {
  // Ethernet jack: a moulded body with a keyed mouth and eight sprung contacts, in a steel shell.
  const [x0,z0,x1,z1]=ETH.b,Ln=x1-x0,Wd=z1-z0,H=ETH.h,n=at(L.right,(x0+x1)/2,(z0+z1)/2),t=.3,body=plastic('ports');ethNode=n;
  can(n,'ports',Ln,Wd,H,t,{top:[uSlot(3,-3.6,2.7,5.2,.36,false,true),uSlot(3,3.6,2.7,5.2,.36,false,true)],side:[uSlot(-3,7.4,2.6,5.4,.36,true),uSlot(4.4,7.4,2.6,5.4,.36,true)],back:[rectHole(-4.6,2,4.6,3.2)]});
  const mouth:[number,number][]=[[-5.9,9.9],[5.9,9.9],[5.9,3],[3.1,3],[3.1,2],[1.7,2],[1.7,1.2],[-1.7,1.2],[-1.7,2],[-3.1,2],[-3.1,3],[-5.9,3]];
  const face=rectShape(-Wd/2+.35,.3,Wd/2-.35,H-.45,.3);face.holes.push(pathOf(mouth));plate(n,'ports',body,along(sheetGeo(face,1.2,.1)),Ln/2-.12,0,0);
  // Body behind the face: back block, roof, floor and cheeks, leaving the cavity open.
  rbox(n,'ports',body,-6.45,0,7.6,Wd-.75,.12,H-.4,.3);b.box(n,'ports',body,3.2,0,10.6,Wd-.8,9.9,H-.42);b.box(n,'ports',body,3.2,0,10.6,Wd-.8,.12,1.2);
  for(const s of [-1,1]){b.box(n,'ports',body,3.2,s*6.72,10.6,1.6,1.2,9.9);b.box(n,'ports',body,3.2,s*3.8,10.6,4.2,1.2,3)}
  inst(n,'ports',rb(7.4,.22,.46,.08,1),gold('ports'),Array.from({length:8},(_,i)=>({x:4.6,y:8.75,z:(i-3.5)*1.02,rz:.2})));
  // Link and activity light pipes in the top corners of the face.
  for(const [s,colour] of [[-1,0x4dff7a],[1,0xffb23e]] as [number,number][]){const lamp=own('ports',new THREE.MeshStandardMaterial({color:new THREE.Color(0xe9ece6).lerp(new THREE.Color(colour),.25),roughness:.3,emissive:colour,emissiveIntensity:0}));ethLamps.push(lamp);rbox(n,'ports',lamp,Ln/2-.4,s*5.55,1,2.3,10.75,12.25,.18)}
  // Steel frame round the face, with two ground fingers folded into the mouth.
  const rim=rectShape(-Wd/2,.1,Wd/2,H,.25);rim.holes.push(rectHole(-7.05,.75,7.05,12.75));plate(n,'ports',steel('ports'),along(sheetGeo(rim,t)),Ln/2,0,0);
  for(const z of [-3.3,3.3]){const finger=plate(n,'ports',steel('ports'),flat(sheetGeo(rectShape(-1.6,-.9,1.6,.9,.3),.2)),Ln/2-1.9,9.62,z);finger.rotation.z=.16}
  legs(n,'ports',[[1,-7.7],[1,7.7]]);
 }
 {
  // Stacked USB-A: one tall shell, two rolled mouths, a tongue with four gold contacts in each.
  const [x0,z0,x1,z1]=USB.b,Ln=x1-x0,Wd=z1-z0,H=USB.h,n=at(L.right,(x0+x1)/2,(z0+z1)/2),t=.3;
  can(n,'ports',Ln,Wd,H,t,{y0:.15,top:[uSlot(2,-3.1,2.5,5,.34,false,true),uSlot(2,3.1,2.5,5,.34,false,true)],side:[uSlot(2,4.5,2.4,4.6,.34,true,true),uSlot(2,11.5,2.4,4.6,.34,true,true),rectHole(-7,7.55,-3,8.05)]});
  const front=rectShape(-Wd/2,.15,Wd/2,H,.3),ports=[[2,7],[9,14]];
  for(const [a,c] of ports)front.holes.push(pathOf([[-5.9,a+.4],[-5.5,a],[5.5,a],[5.9,a+.4],[5.9,c-.4],[5.5,c],[-5.5,c],[-5.9,c-.4]]));
  plate(n,'ports',steel('ports'),along(sheetGeo(front,t)),Ln/2,0,0);
  plate(n,'ports',steel('ports'),flat(sheetGeo(rectShape(-Ln/2,-Wd/2+t,Ln/2,Wd/2-t),t)),0,.15,0);
  for(const [a,c] of ports){
   // Rolled lip, dark throat, tongue.
   const lip=rectShape(-6.35,a-.45,6.35,c+.45,.6);lip.holes.push(pathOf([[-5.9,a+.4],[-5.5,a],[5.5,a],[5.9,a+.4],[5.9,c-.4],[5.5,c],[-5.5,c],[-5.9,c-.4]]));plate(n,'ports',steel('ports'),along(sheetGeo(lip,.5,.16)),Ln/2+.42,0,0);
   const throat=b.put(n,'ports',new THREE.BoxGeometry(12.4,c-a,11.8),inner('ports'),false);throat.position.set(Ln/2-6.4,(a+c)/2,0);
   rbox(n,'ports',plastic('ports'),Ln/2-5.6,0,9.2,10.6,a+.7,a+2.55,.18);rbox(n,'ports',plastic('ports'),-Ln/2+2.6,0,4.4,11.7,a,c,.2);
   for(const [z,len] of [[-3.5,6.6],[-1,5.6],[1,5.6],[3.5,6.6]])rbox(n,'ports',gold('ports'),Ln/2-1.6-len/2,z,len,.95,a+2.54,a+2.64,.04);
  }
  legs(n,'ports',[[-3,-6.6],[-3,6.6],[4,-6.6],[4,6.6]]);
 }
 // A shell drawn round a D-shaped mouth: sides, chamfers and floor as one section, the top a separate sheet with its spring cuts.
 const dPort=(n:THREE.Object3D,asm:AssemblyId,Ln:number,Wd:number,H:number,y0:number,cut:[number,number],o:{top:THREE.Path[];tongue:[number,number,number];contacts:number;lip:number})=>{
  const t=.28,hw=Wd/2,[cz,cy]=cut,m=steel(asm),outline=(d:number):[number,number][]=>[[hw-d,H-d],[hw-d,y0+cy+d*.4],[hw-cz+d*.4,y0+d],[-hw+cz-d*.4,y0+d],[-hw+d,y0+cy+d*.4],[-hw+d,H-d]];
  const section=shapeOf([...outline(0),...outline(t).reverse()]);plate(n,asm,m,along(sheetGeo(section,Ln,.04)),Ln/2,0,0);
  const top=rectShape(-Ln/2,-hw,Ln/2,hw,.2);top.holes.push(...o.top);plate(n,asm,m,flat(sheetGeo(top,t)),0,H-t,0);
  // Flared lip round the mouth.
  const lip=shapeOf(outline(-o.lip));lip.holes.push(pathOf(outline(t)));plate(n,asm,m,along(sheetGeo(lip,.3,.1)),Ln/2+.2,0,0);
  // A dark liner of the same section, seen from inside, so the mouth reads as a shadowed throat.
  const throat=b.put(n,asm,along(new THREE.ExtrudeGeometry(shapeOf(outline(t+.06)),{depth:Ln-.5,bevelEnabled:false})),inner(asm),false);throat.position.set(Ln/2-.04,0,0);
  const [tl,tw,th]=o.tongue,ty=(H+y0)/2-th/2;rbox(n,asm,plastic(asm),Ln/2-.9-tl/2,0,tl,tw,ty,ty+th,.12);rbox(n,asm,plastic(asm),-Ln/2+1.2,0,1.8,Wd-t*2-.2,y0+t,H-t,.1);
  inst(n,asm,rb(tl*.72,.06,tw/o.contacts*.5,.02,1),gold(asm),Array.from({length:o.contacts},(_,i)=>({x:Ln/2-1.1-tl*.36,y:ty+th+.03,z:(i-(o.contacts-1)/2)*tw*.92/o.contacts})));
 };
 {
  const [x0,z0,x1,z1]=HDMI.b,Ln=x1-x0,Wd=z1-z0,n=at(L.right,(x0+x1)/2,(z0+z1)/2);
  dPort(n,'ports',Ln,Wd,HDMI.h,.25,[2.1,1.9],{top:[uSlot(.6,-3.4,2.2,3.8,.3,false,true),uSlot(.6,3.4,2.2,3.8,.3,false,true)],tongue:[7.4,10.6,1.25],contacts:10,lip:.38});
  legs(n,'ports',[[-3.25,-7.5],[-3.25,7.5],[2.75,-7.5],[2.75,7.5]]);
  const tails=Array.from({length:19},(_,i)=>({x:-Ln/2-.35,y:.1,z:(i-9)*.5}));inst(n,'ports',rb(1.3,.14,.24,.04,1),tin('ports'),tails);inst(n,'ports',pillow,solder('ports'),tails.map(q=>({...q,x:q.x-.15,y:.04,sx:1.5,sy:.07,sz:.27})));
 }
 {
  const [x0,z0,x1,z1]=MICRO.b,Ln=x1-x0,Wd=z1-z0,n=at(L.left,(x0+x1)/2,(z0+z1)/2,Math.PI);
  dPort(n,'ports',Ln,Wd,MICRO.h,.12,[.8,1],{top:[rectHole(-.2,-2.5,1.2,-1.3),rectHole(-.2,1.3,1.2,2.5)],tongue:[3.6,5,.62],contacts:5,lip:.3});
  const tails=Array.from({length:5},(_,i)=>({x:-Ln/2-.5,y:.09,z:(i-2)*.65}));inst(n,'ports',rb(1.3,.12,.34,.04,1),tin('ports'),tails);inst(n,'ports',pillow,solder('ports'),tails.map(q=>({...q,x:q.x-.1,y:.04,sx:1.4,sy:.07,sz:.38})));
  for(const [x,z] of [[-1.7,-3.85],[-1.7,3.85],[1.7,-3.85],[1.7,3.85]])rbox(n,'ports',tin('ports'),x,z,1.3,.5,.02,1.5,.08);
 }
 {
  // Barrel jack: a moulded block with a round snout, a steel centre pin and a side spring.
  const [x0,z0,x1,z1]=BARREL.b,Ln=x1-x0,Wd=z1-z0,H=BARREL.h,n=at(L.left,(x0+x1)/2,(z0+z1)/2,Math.PI),body=plastic('ports');
  rbox(n,'ports',body,0,0,Ln,Wd,.1,6.6,.5);rbox(n,'ports',body,-Ln/2+2.5,0,5,Wd,.1,H,.55);
  const cy=6.3,snout=lathe([[3.2,0],[4.45,0],[4.45,Ln-4.9],[4.1,Ln-4.5],[3.5,Ln-4.5],[3.2,Ln-4.9]],56);snout.rotateZ(-Math.PI/2);const sn=b.put(n,'ports',snout,body);sn.position.set(-Ln/2+4.5,cy,0);
  const throat=b.put(n,'ports',new THREE.CylinderGeometry(3.2,3.2,9.4,40,1,true).rotateZ(Math.PI/2),own('ports',new THREE.MeshStandardMaterial({color:0x0c0d0f,roughness:.7,side:THREE.BackSide})),false);throat.position.set(Ln/2-4.9,cy,0);
  const end=b.put(n,'ports',new THREE.CircleGeometry(3.2,32).rotateY(Math.PI/2),own('ports',new THREE.MeshStandardMaterial({color:0x0c0d0f,roughness:.8})),false);end.position.set(Ln/2-9.5,cy,0);
  const pin=lathe([[0,0],[1,0],[1,7.6],[.8,8.1],[.4,8.4],[0,8.45]],28);pin.rotateZ(-Math.PI/2);const pn=b.put(n,'ports',pin,tin('ports'));pn.position.set(Ln/2-9.4,cy,0);
  plate(n,'ports',steel('ports'),sheetGeo(rectShape(-3.4,1.4,2.6,5.2,.5),.3),0,0,Wd/2);rbox(n,'ports',tin('ports'),-Ln/2+.05,0,.3,3,-BOARD.t-1,4,.08);
 }
 {
  // microSD cage: a thin stamped lid with a window, spring cuts and detents; the card stands proud of the edge.
  const [x0,z0,x1,z1]=SD.b,Ln=x1-x0,Wd=z1-z0,H=SD.h,n=at(L.left,(x0+x1)/2,(z0+z1)/2,Math.PI),m=steel('ports'),t=.2;
  const lid=rectShape(-Ln/2,-Wd/2,Ln/2,Wd/2,.35);lid.holes.push(rectHole(-4.2,-3.6,-.4,.6),uSlot(2.2,-2.9,1.9,4.2,.3,false,true),uSlot(2.2,2.9,1.9,4.2,.3,false,true),rectHole(-5.6,2.6,-1.6,3.5),roundHole(5.2,0,.6),roundHole(-5.9,-4.4,.5));
  plate(n,'ports',m,flat(sheetGeo(lid,t)),0,H-t,0);
  for(const s of [-1,1])plate(n,'ports',m,sheetGeo(rectShape(-Ln/2+.3,.05,Ln/2-.6,H-t*.5),t),0,0,s>0?Wd/2-t:-Wd/2);
  plate(n,'ports',m,along(sheetGeo(rectShape(-Wd/2+.3,.05,Wd/2-.3,H-t*.5),t)),-Ln/2+t,0,0);
  rbox(n,'ports',plastic('ports'),-.2,0,Ln-.8,Wd-.6,.03,.55,.08);
  const card=shapeOf([[-5.5,-6.6],[5.5,-6.6],[5.5,-1.2],[4.7,-.4],[4.7,2.2],[5.5,3],[5.5,8.4],[-4.4,8.4],[-5.5,7.3]]),cg=flat(sheetGeo(card,.75,.12));cg.rotateY(-Math.PI/2);
  const cm=b.put(n,'ports',cg,plastic('ports',0x18191c,'card'));cm.position.set(.4,.62,0);
  rbox(n,'ports',plastic('ports',0x18191c,'card'),Ln/2+2.1,0,1,10.6,.62,1.6,.2);
  const label=b.put(n,'ports',new THREE.PlaneGeometry(2.3,3.2).rotateX(-Math.PI/2),own('ports',new THREE.MeshStandardMaterial({map:tex(cardLabel()),roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);label.position.set(-2.3,1.38,-1.5);label.rotation.y=Math.PI/2;
  for(const [x,z] of [[-Ln/2+1.5,-Wd/2-.3],[-Ln/2+1.5,Wd/2+.3],[4.25,-Wd/2-.3],[4.25,Wd/2+.3]])rbox(n,'ports',tin('ports'),x,z,1.4,.9,.02,.5,.06);
 }

 // ── Ribbon connector, ribbon and display ──────────────────────────────────
 const screen=screenTexture();
 let glow!:THREE.MeshBasicMaterial;
 {
  const F=L.flex,lcp=own('flex',new THREE.MeshStandardMaterial({color:0xe7dfcd,roughness:.55,roughnessMap:fineT,bumpMap:fineT,bumpScale:.02}));
  // Connector: pale body open toward the board centre, a dark flip-lock bar, thirty tails soldered behind.
  rbox(F,'flex',lcp,FFC.x,FFC.z+.5,FFC.w,FFC.d-1.4,.04,FFC.h,.18);rbox(F,'flex',plastic('flex',0x2b2622,'lock'),FFC.x,FFC.z-1.7,FFC.w-1.2,1.9,1.05,FFC.h+.12,.22);
  rbox(F,'flex',lcp,FFC.x,FFC.z-1.4,FFC.w,1.6,.04,.62,.1);
  const tails=FFC_LANDS();inst(F,'flex',rb(.2,.14,1.1,.04,1),tin('flex'),tails.map(l=>({x:l.x,y:.11,z:l.z-.15})));pillows(F,'flex',tails,.07);
  for(const l of FFC_TABS){rbox(F,'flex',tin('flex'),l.x,l.z,1.5,2.2,.03,.5,.08);pillows(F,'flex',[l],.1)}
  // Ribbon: a thin solid swept along the path, with u along its length so the conductors run true round every bend.
  const path=ribbonPath(),curve=new THREE.CatmullRomCurve3(path.map(([z,y])=>new THREE.Vector3(0,y,z)),false,'centripetal'),N=260,pts=curve.getSpacedPoints(N),hw=RIBBON.w/2,ht=RIBBON.t/2;
  const pos:number[]=[],nor:number[]=[],uv:number[]=[],idx:number[]=[];
  const strip=(point:(i:number)=>[THREE.Vector3,THREE.Vector3,THREE.Vector3],v0:number,v1:number)=>{
   const start=pos.length/3;
   for(let i=0;i<=N;i++){const [p,q,n]=point(i);pos.push(p.x,p.y,p.z,q.x,q.y,q.z);nor.push(n.x,n.y,n.z,n.x,n.y,n.z);uv.push(i/N,v0,i/N,v1)}
   // Wind each strip so its faces look along its normals.
   const [p0,q0,n0]=point(0),[p1]=point(1),face=new THREE.Vector3().subVectors(q0,p0).cross(new THREE.Vector3().subVectors(p1,p0)),flip=face.dot(n0)<0;
   for(let i=0;i<N;i++){const a=start+i*2,c=a+1,d=a+2,e=a+3;if(flip)idx.push(a,d,c,c,d,e);else idx.push(a,c,d,c,e,d)}
  };
  const normals=pts.map((_,i)=>{const t=new THREE.Vector3().subVectors(pts[Math.min(N,i+1)],pts[Math.max(0,i-1)]).normalize();return new THREE.Vector3(0,-t.z,t.y)});
  const P=(i:number,sx:number,sn:number)=>new THREE.Vector3(RIBBON.x+sx*hw,pts[i].y+normals[i].y*sn*ht,pts[i].z+normals[i].z*sn*ht);
  strip(i=>[P(i,-1,1),P(i,1,1),normals[i]],0,1);strip(i=>[P(i,-1,-1),P(i,1,-1),normals[i].clone().negate()],0,1);
  strip(i=>[P(i,-1,-1),P(i,-1,1),new THREE.Vector3(-1,0,0)],0,.01);strip(i=>[P(i,1,-1),P(i,1,1),new THREE.Vector3(1,0,0)],.99,1);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const film=ribbonTexture(curve.getLength(),RIBBON.w),relief=tex(film.relief);
  const polyimide=own('flex',new THREE.MeshPhysicalMaterial({map:tex(film.map),roughness:1,roughnessMap:relief,bumpMap:relief,bumpScale:.25,clearcoat:.7,clearcoatRoughness:.22,sheen:.6,sheenColor:new THREE.Color(0xffc27a),sheenRoughness:.4,transparent:true,opacity:.93}));
  b.put(F,'flex',g,polyimide);
  // Display: a white daughterboard, a black glass panel with a bevelled edge, and the lit area under the glass.
  const M=b.pivot(F);moduleNode=M;
  const floor=-TOP,cz=MODULE.z0+MODULE.d/2,pcb=own('flex',new THREE.MeshStandardMaterial({color:0xe6e7e5,roughness:.55}));
  const plan=roundPlate(MODULE.w,MODULE.d,1.6);for(const [x,z] of [[-MODULE.w/2+2,-MODULE.d/2+2.6],[MODULE.w/2-2,-MODULE.d/2+2.6],[-MODULE.w/2+2,MODULE.d/2-1.4],[MODULE.w/2-2,MODULE.d/2-1.4]])plan.holes.push(roundHole(x,-z,.62));
  const board=b.put(M,'flex',slab(plan,floor,floor+MODULE.t,16),pcb);board.position.set(MODULE.x,0,cz);
  const print=b.put(M,'flex',new THREE.PlaneGeometry(MODULE.w-.4,MODULE.d-.4).rotateX(-Math.PI/2),own('flex',new THREE.MeshStandardMaterial({map:tex(modulePrint(MODULE.w-.4,MODULE.d-.4)),roughness:.56,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})),false);print.position.set(MODULE.x,floor+MODULE.t+.004,cz);
  const glass=own('flex',new THREE.MeshPhysicalMaterial({color:0x07080b,roughness:.12,specularIntensity:.55,clearcoat:.3,clearcoatRoughness:.08}));
  rbox(M,'flex',glass,MODULE.x,MODULE.glassZ,MODULE.glass[0],MODULE.glass[1],floor+MODULE.t,floor+MODULE.t+1.45,.42);
  glow=new THREE.MeshBasicMaterial({map:tex(screen.texture),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});own('flex',glow);
  const lit=b.put(M,'flex',new THREE.PlaneGeometry(MODULE.screen[0],MODULE.screen[1]).rotateX(-Math.PI/2),glow,false);lit.position.set(MODULE.x,floor+MODULE.t+1.46,MODULE.glassZ-.6);
  // Driver chip and a few passives on the ledge beside the ribbon tail.
  rbox(M,'flex',mould('flex'),MODULE.x+9.6,MODULE.z0+4.9,3,1.2,floor+MODULE.t,floor+MODULE.t+.6,.08);
 }
 return {L,mirrors,leds,ethLamps,screen,glow};
}
export type Frost=ReturnType<typeof buildFrost>;
