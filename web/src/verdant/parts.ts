// Verdant geometry. Everything is placed from layout.ts; heights are mm above the board's top face.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {X,Z,PX,IMG,CARD,TOP,CHIPS,ROUNDS,BLOCKS,BARRELS,COVER,SOCKET2,SOCKET3,SLOTS,SLOT_H,SLOT_CAP,HOSES,PLATE,HOLES,SCREWS,LED_AT,ICS,spots,leadsOf,type Box,type Mat,type P2} from './layout';
import {PULSES} from './routed';
import {sheenTexture,etchedTop,wearTexture,girthTexture,ribBump,knurlBump,boardTexture,weathered,chipTop,roundTop,slotTexture,coverTexture,hoseTexture,labelTexture,hatchTexture,ribTexture,glowTexture,flowTexture} from './textures';
import {slab,lathe,roundPlate,type Builder} from '../kit/builder';
import type {V3} from '../kit/types';
import type {AssemblyId} from './model';

const cx=(b:Box)=>X((b[0]+b[2])/2),cz=(b:Box)=>Z((b[1]+b[3])/2),bw=(b:Box)=>(b[2]-b[0])*PX,bd=(b:Box)=>(b[3]-b[1])*PX;
const rect=(w:number,d:number)=>{const s=new THREE.Shape();s.moveTo(-w/2,-d/2);s.lineTo(w/2,-d/2);s.lineTo(w/2,d/2);s.lineTo(-w/2,d/2);s.closePath();return s};
const outline=(w:number,d:number,r:number)=>{const k=Math.min(r,w/2-.02,d/2-.02);return k>.06?roundPlate(w,d,k):rect(w,d)};
// A prism standing from y0 to y1, optionally with softened top and bottom edges.
function prism(w:number,d:number,y0:number,y1:number,r:number,bevel=0,shape?:THREE.Shape){
 const s=shape??outline(w,d,r),bv=Math.min(bevel,(y1-y0)*.45,w*.3,d*.3);
 if(bv<.05)return slab(s,y0,y1,10);
 const g=new THREE.ExtrudeGeometry(s,{depth:y1-y0-bv*2,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelOffset:-bv,bevelSegments:3,curveSegments:10});
 g.rotateX(-Math.PI/2);g.translate(0,y0+bv,0);return g;
}

export function buildVerdant(b:Builder){
 const {m,put}=b;
 const own=<T extends THREE.Material>(asm:AssemblyId,material:T)=>m.own(asm,material);
 const std=(asm:AssemblyId,p:THREE.MeshStandardMaterialParameters)=>own(asm,new THREE.MeshStandardMaterial(p));
 const phys=(asm:AssemblyId,p:THREE.MeshPhysicalMaterialParameters)=>own(asm,new THREE.MeshPhysicalMaterial(p));
 const tex=<T extends THREE.Texture>(t:T)=>m.texture(t);
 const base:V3=[0,TOP,0];
 const L={
  board:b.layer('board'),smd:b.layer('board',[0,13,0],base),
  cooling:b.layer('cooling',[0,0,0],base),blocks:b.layer('cooling',[0,26,0],base),
  cpu:b.layer('cpu',[0,0,0],base),cover:b.layer('cpu',[0,22,0],base),
  power:b.layer('power',[0,0,0],base),memory:b.layer('memory',[0,0,0],base),
  logic:b.layer('logic',[0,0,0],base),chips:b.layer('logic',[0,12,0],base),
  ports:b.layer('ports',[0,0,0],base),
 };
 const home:Record<AssemblyId,THREE.Object3D>={board:L.smd,cooling:L.cooling,cpu:L.cpu,power:L.power,memory:L.memory,logic:L.logic,ports:L.ports};

 // ── Finishes ───────────────────────────────────────────────────────────
 const steelA=weathered(3,'#8a9094','#72787c','#585e62',170,.46),steelB=weathered(8,'#66717a','#4e5961','#3d474e',110,.42),cast=weathered(21,'#989c9e','#7e8285','#606467',260,.42);
 for(const t of [steelA,steelB,cast]){tex(t.map);tex(t.detail);t.map.repeat.setScalar(1/58);t.detail.repeat.setScalar(1/58);t.map.offset.set(.5,.5);t.detail.offset.set(.5,.5)}
 // Handling wear on the smooth finishes: a shared roughness map, so highlights break up instead of flashing back clean.
 const wear=tex(wearTexture());wear.repeat.setScalar(1/26);
 const cache=new Map<string,THREE.Material>();
 const finish=(asm:AssemblyId,kind:Mat):THREE.Material=>{
  const key=asm+':'+kind;let made=cache.get(key);if(made)return made;
  const worn=(t:{map:THREE.Texture;detail:THREE.Texture},metalness:number,roughness:number)=>std(asm,{color:0xffffff,map:t.map,roughnessMap:t.detail,bumpMap:t.detail,bumpScale:1.1,roughness,metalness});
  switch(kind){
   case 'steelA':made=worn(steelA,.25,1);(made as THREE.MeshStandardMaterial).color.set(0xc2c4c6);break;
   case 'steelB':made=worn(steelB,.25,1);break;
   case 'pitted':made=worn(cast,.3,1);(made as THREE.MeshStandardMaterial).color.set(0xc4c5c6);break;
   case 'iron':made=worn(cast,.3,1);(made as THREE.MeshStandardMaterial).color.set(0xa2a4a4);break;
   case 'silver':made=std(asm,{color:asm==='ports'?0x8d9194:0x9a9ea1,roughness:.5,roughnessMap:wear,metalness:.9});break;
   case 'chrome':made=std(asm,{color:0xa2a6aa,roughness:.46,roughnessMap:wear,metalness:1});break;
   case 'darksteel':made=std(asm,{color:0x3b4147,roughness:.62,roughnessMap:wear,metalness:.8});break;
   case 'black':made=phys(asm,{color:0x1a1c1e,roughness:.74,roughnessMap:wear,bumpMap:wear,bumpScale:.5,clearcoat:.12,clearcoatRoughness:.5});break;
   case 'gloss':made=phys(asm,{color:0x0e1012,roughness:.44,roughnessMap:wear,clearcoat:.6,clearcoatRoughness:.3});break;
   case 'matte':made=std(asm,{color:0x1a1b1d,roughness:.85});break;
   case 'tan':made=std(asm,{color:0xdccdb4,roughness:.6,metalness:.1});break;
   case 'gold':made=std(asm,{color:0xbf9b50,roughness:.56,roughnessMap:wear,metalness:1});break;
   case 'brass':made=std(asm,{color:0xa8997c,roughness:.52,roughnessMap:wear,metalness:1});break;
   case 'lime':made=std(asm,{color:0x74b032,roughness:.6});break;
   case 'pale':made=std(asm,{color:0xb3aea3,roughness:.5,roughnessMap:wear,metalness:.55});break;
   case 'white':made=std(asm,{color:0xe4e4de,roughness:.65});break;
   case 'orange':made=std(asm,{color:0xd58a2a,roughness:.55});break;
   case 'navy':made=std(asm,{color:0x222a38,roughness:.5});break;
   case 'grey':made=std(asm,{color:0x7c7e7f,roughness:.58,metalness:.5});break;
   case 'yellow':made=std(asm,{color:0xc79a2c,roughness:.6});break;
  }
  cache.set(key,made!);return made!;
 };
 const dummy=new THREE.Object3D(),tone=new THREE.Color();
 // A unit block whose top is slightly smaller than its base: the eased top edge of a moulded or sintered part.
 const bevelled=(top=.86)=>{const g=new THREE.CylinderGeometry(Math.SQRT1_2*top,Math.SQRT1_2,1,4,1).toNonIndexed();g.rotateY(Math.PI/4);g.computeVertexNormals();return g};
 type Item={x:number;y:number;z:number;ry?:number;sx?:number;sy?:number;sz?:number;colour?:number};
 const many=(parent:THREE.Object3D,asm:AssemblyId,geometry:THREE.BufferGeometry,material:THREE.Material,items:Item[],shadow=true)=>{
  if(!items.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);
  items.forEach((it,i)=>{dummy.position.set(it.x,it.y,it.z);dummy.rotation.set(0,it.ry??0,0);dummy.scale.set(it.sx??1,it.sy??1,it.sz??1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(it.colour!==undefined)mesh.setColorAt(i,tone.setHex(it.colour))});
  b.adopt(parent,asm,mesh,items.length);mesh.castShadow=shadow;return mesh;
 };
 // A solid placed on a pixel box.
 const solid=(parent:THREE.Object3D,asm:AssemblyId,material:THREE.Material,box:Box,y0:number,y1:number,r=0,bevel=0)=>{
  // Low parts sit in their baked seat shade and do not need to be drawn again into the shadow map.
  const mesh=put(parent,asm,prism(bw(box),bd(box),y0,y1,r*PX,bevel),material,y1>=3);mesh.position.set(cx(box),0,cz(box));return mesh;
 };
 // A flat print on top of something. Transparent prints sit a hair above the face they mark.
 const decal=(parent:THREE.Object3D,asm:AssemblyId,texture:THREE.Texture,box:Box,y:number,o:{opaque?:boolean;roughness?:number;metalness?:number;inset?:number}={})=>{
  const material=std(asm,{map:tex(texture),transparent:!o.opaque,roughness:o.roughness??.55,metalness:o.metalness??0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:!!o.opaque});
  const g=new THREE.PlaneGeometry(bw(box)-(o.inset??0)*2,bd(box)-(o.inset??0)*2);g.rotateX(-Math.PI/2);
  const mesh=put(parent,asm,g,material,false);mesh.position.set(cx(box),y+.012,cz(box));return mesh;
 };
 const disc=(parent:THREE.Object3D,asm:AssemblyId,texture:THREE.Texture,x:number,y:number,z:number,r:number)=>{
  const material=std(asm,{map:tex(texture),transparent:true,roughness:.5,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false});
  const g=new THREE.CircleGeometry(r,48);g.rotateX(-Math.PI/2);const mesh=put(parent,asm,g,material,false);mesh.position.set(x,y+.012,z);return mesh;
 };
 const turned=(parent:THREE.Object3D,asm:AssemblyId,material:THREE.Material,x:number,z:number,profile:[number,number][],segments=56)=>{const mesh=put(parent,asm,lathe(profile,segments),material);mesh.position.set(x,0,z);return mesh};

 // A prism over a polygon given in reference pixels.
 const poly=(parent:THREE.Object3D,asm:AssemblyId,material:THREE.Material,pts:P2[],y0:number,y1:number,bevel=0)=>{
  const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(X(x),-Z(y)):s.moveTo(X(x),-Z(y)));s.closePath();return put(parent,asm,prism(99,99,y0,y1,0,bevel,s),material);
 };
 // A round-ended bar between two pixel points: the runs of a pressed plate.
 const capsule=(parent:THREE.Object3D,asm:AssemblyId,material:THREE.Material,x1:number,y1:number,x2:number,y2:number,width:number,h0:number,h1:number)=>{
  const dx=(x2-x1)*PX,dz=(y2-y1)*PX,w=width*PX,mesh=put(parent,asm,prism(Math.hypot(dx,dz)+w,w,h0,h1,w/2,.3),material);
  mesh.position.set(X((x1+x2)/2),0,Z((y1+y2)/2));mesh.rotation.y=-Math.atan2(dz,dx);return mesh;
 };
 // A turned part lying along +X from pixel x0, its axis at pixel row `row` and height `y`. Profile is [radius, distance along the axis].
 const lying=(parent:THREE.Object3D,asm:AssemblyId,material:THREE.Material,x0:number,row:number,y:number,profile:[number,number][])=>{
  const g=lathe(profile,48);g.rotateZ(-Math.PI/2);const mesh=put(parent,asm,g,material);mesh.position.set(X(x0),y,Z(row));return mesh;
 };

 // ── Board ──────────────────────────────────────────────────────────────
 let shade!:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>,boardTop!:THREE.MeshPhysicalMaterial;
 {
  const plan=roundPlate(CARD.w,CARD.d,CARD.r);
  put(L.board,'board',slab(plan,0,TOP,24),std('board',{color:0x12301c,roughness:.6}));
  const drawn=boardTexture();
  // The print is laid as a grid of tiles, each with its own sheet, so it stays sharp with the camera right in. Corner tiles keep the card's rounded corner.
  for(const tile of drawn.tiles){
   const x0=X(tile.box[0]),x1=X(tile.box[2]),y0=-Z(tile.box[3]),y1=-Z(tile.box[1]),r=CARD.r,hw=CARD.w/2,hd=CARD.d/2,s=new THREE.Shape();
   const L0=x0<-hw+.01,R0=x1>hw-.01,B0=y0<-hd+.01,T0=y1>hd-.01;
   if(L0&&B0){s.moveTo(x0+r,y0);}else s.moveTo(x0,y0);
   if(R0&&B0){s.lineTo(x1-r,y0);s.absarc(x1-r,y0+r,r,-Math.PI/2,0,false)}else s.lineTo(x1,y0);
   if(R0&&T0){s.lineTo(x1,y1-r);s.absarc(x1-r,y1-r,r,0,Math.PI/2,false)}else s.lineTo(x1,y1);
   if(L0&&T0){s.lineTo(x0+r,y1);s.absarc(x0+r,y1-r,r,Math.PI/2,Math.PI,false)}else s.lineTo(x0,y1);
   if(L0&&B0){s.lineTo(x0,y0+r);s.absarc(x0+r,y0+r,r,Math.PI,Math.PI*1.5,false)}else s.closePath();
   const tg=new THREE.ShapeGeometry(s,12),tp=tg.attributes.position,tuv=tg.attributes.uv;
   for(let i=0;i<tp.count;i++)tuv.setXY(i,(tp.getX(i)-x0)/(x1-x0),(tp.getY(i)-y0)/(y1-y0));
   tg.rotateX(-Math.PI/2);
   const map=tex(tile.map),relief=tex(tile.relief);
   const top=put(L.board,'board',tg,boardTop=phys('board',{map,roughness:1,roughnessMap:relief,bumpMap:relief,bumpScale:1.4}),false);
   top.position.y=TOP+.004;
  }
  const g=new THREE.ShapeGeometry(plan,24),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/CARD.w+.5,p.getY(i)/CARD.d+.5);
  g.rotateX(-Math.PI/2);
  // Soft contact shade under the parts: a separate sheet, so it can be put away when the board is taken apart.
  shade=put(L.board,'board',g,new THREE.MeshBasicMaterial({map:tex(drawn.shade),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),false) as typeof shade;
  shade.position.y=TOP+.008;shade.receiveShadow=false;
 }

 // ── Small parts at their traced positions, as instanced meshes ───────────────
 // Chip resistors: a pale ceramic base, a dark film on top, metal ends. Ceramic capacitors: a tan body between metal ends.
 // Moulded tan and gold blocks: a taller body with a polarity stripe. Pale metal parts: a body in its sampled tone, with ends when small.
 {
  const bodies:Item[]=[],ends:Item[]=[],films:Item[]=[],stripes:Item[]=[],tint=new THREE.Color(),hsl={h:0,s:0,l:0};
  for(const s of spots){
   const x=X(s.x),z=Z(s.y),w=s.w*PX,d=s.d*PX,along=s.turn?d:w,across=s.turn?w:d;
   // Sampled colours carry the photograph's shading; lift the darkest so bodies do not read as holes.
   tint.setHex(s.colour).getHSL(hsl);tint.setHSL(hsl.h,Math.min(hsl.s,.6),Math.max(.07,Math.min(.72,hsl.l*1.08)));
   const moulded=(s.type==='cap'||s.type==='gold')&&across>=.75;
   if(moulded){
    // The stripe sits across one end of the top.
    const k=-along*.3;stripes.push({x:x+(s.turn?0:k),y:s.h+.012,z:z+(s.turn?k:0),sx:s.turn?w*.8:along*.13,sy:.03,sz:s.turn?along*.13:d*.8});
   }
   if(!s.ends){bodies.push({x,y:s.h/2,z,sx:w,sy:s.h,sz:d,colour:tint.getHex()});continue}
   const cap=Math.max(.1,Math.min(along*.22,.3)),inner=along-cap*1.2;
   if(s.type==='res'){
    bodies.push({x,y:s.h*.4,z,sx:s.turn?w*.94:inner,sy:s.h*.8,sz:s.turn?inner:d*.94,colour:0xd4d1c6});
    films.push({x,y:s.h*.8+.02,z,sx:s.turn?w*.74:inner*.92,sy:.04,sz:s.turn?inner*.92:d*.74,colour:tint.getHex()});
   }else{
    tint.multiplyScalar(s.type==='metal'?.78:.92);
    bodies.push({x,y:s.h/2,z,sx:s.turn?w*.92:inner,sy:s.h,sz:s.turn?inner:d*.92,colour:tint.getHex()});
   }
   for(const side of [-1,1])ends.push({x:x+(s.turn?0:side*(w-cap)/2),y:s.h/2,z:z+(s.turn?side*(d-cap)/2:0),sx:s.turn?w:cap,sy:s.h*1.05,sz:s.turn?cap:d});
  }
  const unit=new THREE.BoxGeometry(1,1,1);
  many(L.smd,'board',bevelled(),std('board',{color:0xffffff,roughness:.62}),bodies,false);
  many(L.smd,'board',bevelled(.9),std('board',{color:0xc9c6ba,roughness:.5,metalness:.55}),ends,false);
  many(L.smd,'board',unit,std('board',{color:0xffffff,roughness:.5}),films,false);
  many(L.smd,'board',unit,std('board',{color:0x5a3d1c,roughness:.6}),stripes,false);
 }

 // ── Chips: bevelled bodies, etched tops, individual gull-wing leads ──────────
 {
  // One lead, reaching along +X from the body edge at x = 0; unit width along Z.
  const lead=mergeGeometries([
   new THREE.BoxGeometry(.5,.13,1).translate(.15,.72,0),
   new THREE.BoxGeometry(.13,.66,1).translate(.4,.42,0),
   new THREE.BoxGeometry(.5,.13,1).translate(.6,.065,0),
  ])!;
  const leads:Record<string,Item[]>={},moulds=new Map<AssemblyId,THREE.Material>();
  // Mould compound: matte charcoal, a touch rougher than the etched top laid over it.
  const mould=(asm:AssemblyId)=>moulds.get(asm)??(moulds.set(asm,std(asm,{color:0x1d1f22,roughness:.66,roughnessMap:wear})),moulds.get(asm)!);
  CHIPS.forEach((chip,i)=>{
   const parent=chip.asm==='logic'?L.chips:home[chip.asm],[x0,y0,x1,y1]=chip.b,r=chip.r??2.5,pins=leadsOf(chip),stand=chip.on?.9:pins?.12:0;
   const body=chip.tone==='navy'?finish(chip.asm,'navy'):chip.tone==='pale'?finish(chip.asm,'pale'):mould(chip.asm);
   solid(parent,chip.asm,body,chip.b,stand,chip.ht+stand,chip.tone==='navy'?Math.max(r,7):r,chip.tone==='navy'?.5:.2);
   decal(parent,chip.asm,chipTop(chip,i),chip.b,chip.ht+stand,{inset:.1,roughness:.45});
   if(!pins)return;
   const key=chip.asm+':'+pins.metal,list=leads[key]??(leads[key]=[]);
   for(const side of pins.sides){
    const along=side==='l'||side==='r'?y1-y0:x1-x0,count=Math.max(2,Math.round(along/5.2)),pitch=(along-6)/count;
    for(let k=0;k<count;k++){
     const a=3+pitch*(k+.5),sy=(chip.ht*.6)/.785,sz=pitch*.56*PX;
     if(side==='l')list.push({x:X(x0),y:0,z:Z(y0+a),ry:Math.PI,sx:chip.long??1,sy,sz});else if(side==='r')list.push({x:X(x1),y:0,z:Z(y0+a),sx:chip.long??1,sy,sz});
     else if(side==='t')list.push({x:X(x0+a),y:0,z:Z(y0),ry:Math.PI/2,sx:chip.long??1,sy,sz});else list.push({x:X(x0+a),y:0,z:Z(y1),ry:-Math.PI/2,sx:chip.long??1,sy,sz});
    }
   }
  });
  // Small traced packages: one instanced body in its sampled tone, leads down the long sides, a shared etched top.
  {
   const bodies:Item[]=[],tops:Item[]=[],list=leads['logic:silver']??(leads['logic:silver']=[]),tint=new THREE.Color(),hsl={h:0,s:0,l:0},ht=1.1,stand=.1;
   for(const ic of ICS){
    const [x0,y0,x1,y1]=ic.b,w=(x1-x0)*PX,d=(y1-y0)*PX,tall=d>w;
    tint.setHex(ic.colour).getHSL(hsl);tint.setHSL(hsl.h,Math.min(hsl.s,.35),Math.max(.06,Math.min(.16,hsl.l)));
    const tallness=ic.small?.75:ht;bodies.push({x:X((x0+x1)/2),y:stand+tallness/2,z:Z((y0+y1)/2),sx:w,sy:tallness,sz:d,colour:tint.getHex()});
    if(!ic.small)tops.push({x:X((x0+x1)/2),y:stand+ht+.015,z:Z((y0+y1)/2),sx:w*.94,sz:d*.94});
    void tall;
    for(const [side,count] of ic.pins){
     const along=(side==='l'||side==='r'?y1-y0:x1-x0),sy=((ic.small?.75:ht)*.6)/.785,sz=Math.min(along/count*.5,3.4)*PX;
     for(let k=0;k<count;k++){
      const a=along*(k+.5)/count;
      if(side==='l')list.push({x:X(x0),y:0,z:Z(y0+a),ry:Math.PI,sy,sz});else if(side==='r')list.push({x:X(x1),y:0,z:Z(y0+a),sy,sz});
      else if(side==='t')list.push({x:X(x0+a),y:0,z:Z(y0),ry:Math.PI/2,sy,sz});else list.push({x:X(x0+a),y:0,z:Z(y1),ry:-Math.PI/2,sy,sz});
     }
    }
   }
   many(L.chips,'logic',bevelled(),std('logic',{color:0xffffff,roughness:.62}),bodies);
   const plane=new THREE.PlaneGeometry(1,1);plane.rotateX(-Math.PI/2);
   many(L.chips,'logic',plane,std('logic',{map:tex(etchedTop()),transparent:true,roughness:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),tops,false)?.traverse(o=>{o.receiveShadow=false});
  }
  for(const [key,list] of Object.entries(leads)){
   const [asm,metal]=key.split(':') as [AssemblyId,'gold'|'silver'];
   many(asm==='logic'?L.chips:home[asm],asm,lead,metal==='gold'?m.mat(asm,'gold'):std(asm,{color:0xb4b7ba,roughness:.5,metalness:1}),list,false);
  }
 }

 // ── Blocks ─────────────────────────────────────────────────────────────
 const topOf=new Map<string,number>(BLOCKS.map(k=>[k.id,k.ht]));
 BLOCKS.forEach((k,i)=>{
  if(k.label==='custom')return;
  const parent=k.asm==='cooling'&&(k.id.startsWith('k-block')||k.id.startsWith('k-head'))?L.blocks:home[k.asm];
  const y0=k.on?topOf.get(k.on)!-.02:k.y0??0;
  solid(parent,k.asm,finish(k.asm,k.mat),k.b,y0,k.ht,k.r??0,k.bevel??(k.ht>1.5?.12:0));
  if(k.id==='cpu-latchL'){const clip=std('cpu',{color:0xcbbd8c,roughness:.55,roughnessMap:wear,metalness:.55});solid(parent,k.asm,clip,k.b,y0,k.ht,k.r??0,.12);decal(parent,k.asm,labelTexture('segments',k.b[2]-k.b[0],k.b[3]-k.b[1]),k.b,k.ht,{roughness:.5});return}
  if(k.label==='flange'){
   // A flange is two layers: the base plate, and a raised inner plate that carries the socket, held by round-head screws at its corners.
   const [x0,y0b,x1,y1]=k.b,edge=x1>=IMG.w,mid=(y0b+y1)/2;
   const plates:Box[]=k.id==='e12'?[[x0+5,y0b+5,x1,mid-4],[x0+5,mid+4,x1,y1-5]]:[[x0+7,y0b+7,edge?x1:x1-7,y1-7]];
   for(const pb of plates){
    solid(parent,k.asm,finish(k.asm,k.mat),pb,k.ht-.02,k.ht+.7,7,.25).castShadow=false;
    for(const sx of [0,1])for(const sz of [0,1]){const dome=put(parent,k.asm,new THREE.SphereGeometry(.8,14,8,0,Math.PI*2,0,Math.PI/2),finish(k.asm,'chrome'),false);dome.position.set(X(sx?pb[2]-9:pb[0]+9),k.ht+.7,Z(sz?pb[3]-9:pb[1]+9))}
   }
   return;
  }
  if(k.label)decal(parent,k.asm,labelTexture(k.label,k.b[2]-k.b[0],k.b[3]-k.b[1],i+1),k.b,k.ht,{inset:k.bevel??0,roughness:.5});
 });
 // The large block: an L of pitted steel with a smooth recessed panel, and a pocket that holds the machined clamp.
 {
  const A=finish('cooling','steelA'),dark=finish('cooling','darksteel');
  poly(L.blocks,'cooling',A,[[520,0],[772,0],[772,216],[885,216],[885,325],[520,325]],4.18,13,.6);
  solid(L.blocks,'cooling',finish('cooling','steelB'),[772,0,885,217],4.18,9.6,0);
  // Panel: sunk half a millimetre, with a chamfered lower-left corner.
  const smooth=std('cooling',{color:0x6a737a,roughness:.6,roughnessMap:wear,metalness:.7});
  poly(L.blocks,'cooling',dark,[[594,0],[772,0],[772,216],[594,216]],12.9,13.03);
  poly(L.blocks,'cooling',smooth,[[599,0],[770,0],[770,211],[632,211],[599,178]],12.95,13.07);
  // Clamp: a U of bright machined steel opening to the left, inner corners chamfered, spine stepped down.
  const bright=std('cooling',{color:0xc9cdd0,roughness:.3,metalness:1,envMapIntensity:.9});
  poly(L.blocks,'cooling',bright,[[781,8],[884,8],[884,74],[832,74],[800,64],[781,64]],9.6,14.4,.5);
  poly(L.blocks,'cooling',bright,[[781,140],[800,140],[832,130],[884,130],[884,212],[781,212]],9.6,14.4,.5);
  poly(L.blocks,'cooling',finish('cooling','silver'),[[830,70],[884,70],[884,134],[830,134]],9.6,12.6,.3);
  for(const [x,y,r] of [[853,458,5],[750,500,4],[948,470,4],[878,560,4],[870,415,3.4],[742,598,3.4]] as [number,number,number][]){
   const mesh=put(L.blocks,'cooling',new THREE.CylinderGeometry(r*PX,r*PX,.14,20),m.mat('cooling','steel'),false);mesh.position.set(X(x),10.55,Z(y));
  }
  // Leaf clip: a pointed, polished blade.
  poly(L.cooling,'cooling',bright,[[906,352],[934,324],[1050,322],[1062,340],[1062,372],[1048,388],[940,384]],0,2.6,.7);
  poly(L.cooling,'cooling',finish('cooling','darksteel'),[[948,340],[1040,336],[1046,352],[1040,366],[952,366],[934,353]],2.6,2.72);
 }
 // Machined cylinder assembly: dark body, two engraved bright bands, and a white clip with square windows.
 {
  const dark=std('cooling',{color:0x262a2f,roughness:.34,metalness:.9}),band=std('cooling',{color:0xc4c8cb,roughness:.26,metalness:1,envMapIntensity:.9}),row=72,y=7.7;
  lying(L.blocks,'cooling',dark,890,row,y,[[0,0],[5.4,0],[5.8,.4],[5.8,1.3],[6.9,1.6],[6.9,10.8],[6.2,11],[6.2,19.3],[0,19.3]]);
  lying(L.blocks,'cooling',band,1000,row,y,[[0,0],[7.2,0],[7.5,.3],[7.5,1.2],[7.2,1.4],[7.2,2.9],[7.5,3.1],[7.5,4],[7.2,4.3],[0,4.3]]);
  lying(L.blocks,'cooling',band,1050,row,y,[[0,0],[7.3,0],[7.7,.4],[7.7,2.5],[7.3,2.9],[0,2.9]]);
  const white=std('cooling',{color:0xdcdedd,roughness:.38,metalness:.5});
  solid(L.blocks,'cooling',white,[906,0,962,82],y+5.2,y+7,5,.35);
  solid(L.blocks,'cooling',white,[914,82,954,104],y+3.4,y+6.4,3,.3);
  for(const box of [[926,10,944,34],[928,50,942,64]] as Box[])solid(L.blocks,'cooling',finish('cooling','matte'),box,y+7,y+7.03,1).castShadow=false;
  decal(L.blocks,'cooling',labelTexture('engrave',40,70),[1001,2,1041,72],y+7.5,{roughness:.4});
 }
 // The left bracket: a pressed black plate with a raised rim line.
 for(const [x1,y1,x2,y2,w] of PLATE){capsule(L.ports,'ports',finish('ports','black'),x1,y1,x2,y2,w,0,2);capsule(L.ports,'ports',finish('ports','gloss'),x1,y1,x2,y2,w-12,2,2.35)}
 solid(L.ports,'ports',finish('ports','silver'),[46,1046,74,1078],2.35,2.6,3).rotation.y=-.5;
 // Bores and screws on the edge hardware.
 for(const [x,y,r,h] of HOLES){const hole=put(L.ports,'ports',new THREE.CylinderGeometry(r*PX,r*PX,.06,24),finish('ports','matte'),false);hole.position.set(X(x),h+.03,Z(y))}
 for(const set of SCREWS)for(const [x,y,h] of set.at)b.screw(set.asm==='cooling'&&h>6?L.blocks:home[set.asm],set.asm,X(x),Z(y),h,h>8?1.15:.95,false);

 const knurls=new Map<string,THREE.Material>();
 const knurl=(asm:AssemblyId,dark:boolean)=>{
  const key=asm+dark;let made=knurls.get(key);if(made)return made;
  const t=tex(knurlBump());t.repeat.set(64,1);
  made=std(asm,dark?{color:0x1b1d1f,roughness:.6,bumpMap:t,bumpScale:1.6}:{color:0x8d9194,roughness:.5,metalness:.9,bumpMap:t,bumpScale:1.6});knurls.set(key,made);return made;
 };
 const threads=new Map<string,THREE.Material>();
 const thread=(asm:AssemblyId,alongX:boolean)=>{const key=asm+alongX;let made=threads.get(key);if(!made){const t=tex(ribBump());t.repeat.set(1,12);const tone=tex(girthTexture());tone.offset.x=alongX?0:-.25;made=std(asm,{color:0xffffff,map:tone,roughness:.5,metalness:.6,bumpMap:t,bumpScale:2.4});threads.set(key,made)}return made};
 // Details on the edge hardware that the block list cannot express.
 {
  const P=L.ports,silver=finish('ports','silver'),black=finish('ports','black');
  // Third connector down: a paler inset plate, a black lower section, and a small two-hole oval link.
  solid(P,'ports',finish('ports','pitted'),[1507,297,1572,392],3,3.45,3,.15);solid(P,'ports',black,[1504,397,1562,460],3,3.2,3);solid(P,'ports',silver,[1526,408,1544,444],3.2,3.8,8,.15);
  // The machined bracket: a washer, a hex nut and its pointer.
  b.cyl(P,'ports',silver,X(1546),Z(1190),1.25,5,5.25,28).castShadow=false;
  const nut=put(P,'ports',new THREE.CylinderGeometry(.82,.82,.7,6),finish('ports','chrome'),false);nut.position.set(X(1546),5.6,Z(1190));
  const pointer=b.box(P,'ports',silver,X(1556),Z(1196),1.6,.4,5.25,5.6);pointer.rotation.y=-.5;pointer.castShadow=false;
  // The lever over the lower socket: a rounded arm with a pivot boss.
  b.cyl(P,'ports',finish('ports','chrome'),X(1583),Z(2104),1.5,6.9,7.4,28).castShadow=false;
 }
 // ── Round parts ────────────────────────────────────────────────────────
 ROUNDS.forEach((p,i)=>{
  const parent=home[p.asm],x=X(p.c[0]),z=Z(p.c[1]),r=p.r*PX,h=p.ht,y0=p.on?topOf.get(p.on)!-.02:0,asm=p.asm;
  const top=(ratio=.94,y=h)=>disc(parent,asm,roundTop(p.style,p.text,i+40),x,y,z,r*ratio);
  switch(p.style){
   case 'silverCan':
    turned(parent,asm,finish(asm,'black'),x,z,[[0,0],[r,0],[r,1.1],[0,1.1]]);
    turned(parent,asm,std(asm,{color:p.text==='4'||p.text===''?0x7c7e7d:0xb2afaa,roughness:.55,roughnessMap:wear,metalness:.85}),x,z,[[0,1.1],[r*.965,1.1],[r*.965,h-.5],[r*.9,h-.12],[r*.84,h],[0,h]]);top(1);break;
   case 'blackCan':
    turned(parent,asm,phys(asm,{color:0x23272c,roughness:.36,clearcoat:.5,clearcoatRoughness:.2}),x,z,[[0,0],[r,0],[r,h-.7],[r*.93,h-.15],[r*.86,h],[0,h]]);top(.9);break;
   case 'navyPost':
    turned(parent,asm,std(asm,{color:0x222933,roughness:.55,metalness:.25}),x,z,[[0,0],[r,0],[r,h-.5],[r*.95,h],[0,h]]);
    turned(parent,asm,m.mat(asm,'chrome'),x,z,[[0,h],[r*.3,h],[r*.3,h+.35],[r*.26,h+.5],[0,h+.5]],32);
    b.box(parent,asm,finish(asm,'matte'),x,z,r*.44,r*.1,h+.5,h+.56).rotation.y=.5;top(1);break;
   case 'blackPost':case 'bigPost':{
    const k=p.style==='bigPost'?.7:.62;
    turned(parent,asm,finish(asm,'black'),x,z,[[0,0],[r,0],[r,h*.62],[r*.96,h*.7],[r*(k+.06),h*.7],[r*k,h*.78],[r*k,h-.4],[r*(k-.05),h],[r*.3,h],[r*.3,h-.8],[0,h-.8]]);
    turned(parent,asm,m.mat(asm,'steel'),x,z,[[r*.12,h-.8],[r*.27,h-.8],[r*.27,h-.25],[r*.2,h-.1],[r*.12,h-.1],[r*.12,h-.8]],32);
    turned(parent,asm,finish(asm,'matte'),x,z,[[0,h-.8],[r*.12,h-.8],[r*.12,h-.6],[0,h-.6]],20);top(.98,h*.7);break;}
   case 'boss':
    turned(parent,asm,finish(asm,'gloss'),x,z,[[0,0],[r,0],[r,h-.9],[r*.94,h-.25],[r*.8,h],[0,h]]);top(.8);break;
   case 'goldCan':
    turned(parent,asm,finish(asm,'black'),x,z,[[0,0],[r,0],[r,h-.4],[r*.74,h-.4],[0,h-.4]],40);
    turned(parent,asm,std(asm,{color:0xc9a86a,roughness:.4,metalness:.85}),x,z,[[0,h-.4],[r*.7,h-.4],[r*.7,h-.08],[r*.62,h],[0,h]],40);break;
   case 'goldPad':turned(parent,asm,std(asm,{color:0xc9a86a,roughness:.42,metalness:.85}),x,z,[[0,0],[r,0],[r,h],[0,h]],32);break;
   case 'pad':
    turned(parent,asm,finish(asm,'silver'),x,z,[[0,y0],[r,y0],[r,y0+(h-y0)*.6],[r*.8,h],[0,h]],28);
    turned(parent,asm,finish(asm,p.on?'matte':'grey'),x,z,[[0,h],[r*.45,h],[r*.45,h+.06],[0,h+.06]],16);break;
   case 'jack':case 'darkJack':case 'knob':{
    const dark=p.style==='darkJack',knurled=dark||p.id==='j7';
    // Collar at the foot.
    turned(parent,asm,finish(asm,'darksteel'),x,z,[[r*.7,y0],[r*1.1,y0],[r*1.1,y0+.5],[r,y0+.8],[r*.7,y0+.8]]);
    if(p.style==='knob'){
     turned(parent,asm,knurl(asm,false),x,z,[[r*.7,y0+.8],[r,y0+.8],[r,h-.5],[r*.94,h-.1],[r*.72,h-.1],[r*.7,y0+.8]]);
     turned(parent,asm,finish(asm,'black'),x,z,[[0,y0],[r*.72,y0],[r*.72,h+.3],[r*.66,h+.5],[0,h+.5]]);top(.66,h+.5);
    }else{
     // Outer barrel (knurled on the dark sockets), a bright inner bevel ring standing a little proud, then the face.
     turned(parent,asm,knurled?knurl(asm,dark):finish(asm,'silver'),x,z,[[r*.78,y0+.8],[r,y0+.8],[r,h-.55],[r*.95,h-.2],[r*.8,h-.2],[r*.78,y0+.8]]);
     turned(parent,asm,finish(asm,dark?'chrome':'silver'),x,z,[[r*.6,y0],[r*.8,y0],[r*.8,h],[r*.75,h],[r*.66,h-.7],[r*.6,h-.7],[r*.6,y0]],48);
     if(p.on==='e12')turned(parent,asm,finish(asm,'matte'),x,z,[[0,y0],[r*.6,y0],[r*.6,h-3],[0,h-3]],32);
     else{
      turned(parent,asm,std(asm,{color:dark?0x2c2f32:0x3f4245,roughness:.7,roughnessMap:wear,metalness:.3}),x,z,[[0,y0],[r*.6,y0],[r*.6,h-.8],[0,h-.8]],40);
      if(p.id==='j1')turned(parent,asm,finish(asm,'matte'),x,z,[[0,h-.8],[r*.07,h-.8],[r*.07,h-.74],[0,h-.74]],12);
     }
    }
    break;}
   case 'button':
    turned(parent,asm,finish(asm,'black'),x,z,[[0,y0],[r,y0],[r,h-.2],[r*.9,h],[0,h]],32);
    b.box(parent,asm,finish(asm,'pale'),x,z,r*.7,r*.6,h,h+.1).rotation.y=-.3;break;
  }
 });

 const girths=new Map<string,THREE.Material>();
 const girth=(asm:AssemblyId,alongX:boolean)=>{
  const key=asm+(alongX?'x':'z');let made=girths.get(key);if(made)return made;
  const t=tex(girthTexture());t.offset.x=alongX?0:-.25;
  made=std(asm,{color:0xffffff,map:t,roughness:.55,roughnessMap:wear,metalness:.55});girths.set(key,made);return made;
 };
 // ── Lying cylinders ────────────────────────────────────────────────────
 for(const k of BARRELS){
  const parent=k.id==='k-pin'?L.blocks:home[k.asm],alongX=k.axis==='x',len=alongX?bw(k.b):bd(k.b),r=(alongX?bd(k.b):bw(k.b))/2,neck=(k.neck??0)*PX,e=Math.min(.5,r*.3);
  // Profile along the axis from −len/2: an optional slimmer neck with a flange, then the body, with eased ends.
  const p:[number,number][]=neck>0
   ?[[0,-len/2],[r*.66,-len/2],[r*.74,-len/2+e],[r*.74,-len/2+neck-.5],[r*.84,-len/2+neck-.5],[r*.84,-len/2+neck],[r,-len/2+neck+e],[r,len/2-e],[r-e,len/2],[0,len/2]]
   :[[0,-len/2],[r-e,-len/2],[r,-len/2+e],[r,len/2-e],[r-e,len/2],[0,len/2]];
  // The big drum has a rolled rim at its left end.
  if(k.id==='r5')p.splice(0,p.length,[0,-len/2],[r*1.0,-len/2],[r*1.05,-len/2+.3],[r*1.05,-len/2+1],[r*.93,-len/2+1.2],[r*.93,len/2-e],[r*.93-e,len/2],[0,len/2]);
  const g=lathe(p,40);if(alongX)g.rotateZ(-Math.PI/2);else g.rotateX(Math.PI/2);
  // Turned silver parts carry a drawn tone round their girth (bright along the top, falling away down the flanks), which diffuse light alone would flatten.
  const turnedMetal=k.asm==='ports'&&(k.mat==='silver'||k.mat==='chrome');
  const mesh=put(parent,k.asm,g,k.id==='e7screw'||k.id==='rc'?thread(k.asm,alongX):turnedMetal?girth(k.asm,alongX):finish(k.asm,k.mat));mesh.position.set(cx(k.b),(k.lift??0)+r+.25,cz(k.b));
  if(neck>0)decal(parent,k.asm,labelTexture('icon',30,30,k.b[1]+3),[k.b[0]+k.neck!+22,(k.b[1]+k.b[3])/2-13,k.b[0]+k.neck!+48,(k.b[1]+k.b[3])/2+13],(k.lift??0)+r*2+.25-.05,{roughness:.5});
  if(neck>0)b.box(parent,k.asm,finish(k.asm,'black'),cx(k.b)+neck/2,cz(k.b),len-neck-.6,r*1.7,0,.6);
 }

 // ── Processor: socket base, die behind the window, lime cover ───────────────
 const die=phys('cpu',{color:0x070809,roughness:.3,metalness:.2,clearcoat:.8,clearcoatRoughness:.25,emissive:0x8fe04a,emissiveIntensity:0});
 {
  const c=COVER,w=bw(c.b),d=bd(c.b),deep=c.y0+.35;
  const inset:Box=[c.b[0]+5,c.b[1]+5,c.b[2]-5,c.b[3]-5];
  solid(L.cpu,'cpu',finish('cpu','matte'),inset,0,c.y0,c.r);
  // The die sits well down in its well, so the cover's wall shades its edges.
  solid(L.cpu,'cpu',die,[c.win[0]-6,c.win[1]-6,c.win[2]+6,c.win[3]+6],c.y0-.2,deep,4);
  decal(L.cpu,'cpu',sheenTexture(),c.win,deep,{roughness:.3});
  const plan=roundPlate(w,d,c.r*PX),at=(x:number,y:number):P2=>[X(x)-cx(c.b),-(Z(y)-cz(c.b))];
  const [wx,wy]=at((c.win[0]+c.win[2])/2,(c.win[1]+c.win[3])/2),hole=new THREE.Path();
  // The window is cut clockwise so it reads as a hole.
  {const hw=bw(c.win)/2,hd=bd(c.win)/2,r=c.winR*PX;hole.moveTo(wx-hw+r,wy-hd);hole.absarc(wx-hw+r,wy-hd+r,r,Math.PI*1.5,Math.PI,true);hole.lineTo(wx-hw,wy+hd-r);hole.absarc(wx-hw+r,wy+hd-r,r,Math.PI,Math.PI/2,true);hole.lineTo(wx+hw-r,wy+hd);hole.absarc(wx+hw-r,wy+hd-r,r,Math.PI/2,0,true);hole.lineTo(wx+hw,wy-hd+r);hole.absarc(wx+hw-r,wy-hd+r,r,0,-Math.PI/2,true);hole.closePath()}
  plan.holes.push(hole);
  for(const [x,y] of c.holes){const [hx,hy]=at(x,y),h=new THREE.Path();h.absarc(hx,hy,c.holeR*PX,0,Math.PI*2,true);plan.holes.push(h)}
  const paint=tex(coverTexture());paint.repeat.set(1/w,1/d);paint.offset.set(.5,.5);
  const lid=put(L.cover,'cpu',prism(w,d,c.y0+.02,c.y1,0,.32,plan),phys('cpu',{color:0xffffff,map:paint,roughness:.62,roughnessMap:wear,clearcoat:.2,clearcoatRoughness:.5}));
  lid.position.set(cx(c.b),0,cz(c.b));
  // Each edge hole gets a dark floor just under the lid's face, so it reads as a bore from any angle (the side holes sit too close to the bevel to cut cleanly).
  for(const [x,y] of c.holes){const bore=put(L.cover,'cpu',new THREE.CylinderGeometry(c.holeR*PX*.92,c.holeR*PX*.92,.05,24),finish('cpu','matte'),false);bore.position.set(X(x),c.y1+.012,Z(y))}
 }

 // ── Lower socket ───────────────────────────────────────────────────────
 const padGlow=std('logic',{color:0x8a8782,roughness:.5,metalness:.5,emissive:0xffb347,emissiveIntensity:0});
 {
  const s=SOCKET2,lime=finish('logic','lime'),gold=m.mat('logic','gold');
  solid(L.logic,'logic',lime,s.limeTop,0,3.3,7,.3);
  solid(L.logic,'logic',lime,[497,2222,560,2260],0,3,9,.3);
  for(const strip of [s.stripL,s.stripR]){solid(L.logic,'logic',finish('logic','grey'),strip,0,2.9,2);decal(L.logic,'logic',ribTexture(strip[2]-strip[0],strip[3]-strip[1]),strip,2.9,{opaque:true,roughness:.6,metalness:.4})}
  solid(L.logic,'logic',gold,[896,2226,937,2242],0,2.6,3);solid(L.logic,'logic',gold,[497,2228,540,2240],0,2,2);
  solid(L.logic,'logic',finish('logic','matte'),[s.chip[0]+6,s.chip[1]+6,s.chip[2]-6,s.chip[3]-6],0,1,10);
  solid(L.chips,'logic',finish('logic','black'),s.chip,1,3.5,22,.3);
  decal(L.chips,'logic',hatchTexture(s.chip[2]-s.chip[0]-6,s.chip[3]-s.chip[1]-6),s.chip,3.5,{opaque:true,inset:.34,roughness:.5});
  solid(L.chips,'logic',std('logic',{color:0x131416,roughness:.42}),s.inner,3.5,4.15,24,.22);
  solid(L.chips,'logic',padGlow,s.pad,4.15,4.36,5,.06);
  // Four small fixing points on the chip: dark sockets with a thin steel lip, as in the reference.
  for(const [x,y] of [[862,1932],[858,2222],[575,2078],[862,2078]] as P2[]){const post=b.cyl(L.chips,'logic',finish('logic','darksteel'),X(x),Z(y),.8,3.5,3.58,24);post.castShadow=false;b.cyl(L.chips,'logic',finish('logic','matte'),X(x),Z(y),.5,3.58,3.62,16).castShadow=false}
  // Gold keying corners.
  for(const box of [[872,1900,898,1938],[868,2212,898,2254]] as Box[])solid(L.logic,'logic',gold,box,0,3.2,5,.2);
  // Fixings: two in the lime corners, two down the left strip.
  for(const [x,y,h] of [[516,1896,3.3],[514,2244,3],[522,1990,2.9],[522,2080,2.9]] as [number,number,number][]){b.cyl(L.logic,'logic',finish('logic','silver'),X(x),Z(y),.9,h,h+.3,20).castShadow=false;b.cyl(L.logic,'logic',finish('logic','matte'),X(x),Z(y),.4,h+.3,h+.34,12).castShadow=false}
 }
 // ── Lower-left socket ──────────────────────────────────────────────────
 {
  const s=SOCKET3;
  solid(L.logic,'logic',finish('logic','lime'),s.lime,0,2.6,6,.25);
  solid(L.logic,'logic',finish('logic','iron'),s.frame,0,3,7,.3);
  solid(L.chips,'logic',std('logic',{color:0x55585b,map:cast.map,roughness:.85,bumpMap:cast.detail,bumpScale:.8}),s.chip,3,4.5,16,.35);
  solid(L.chips,'logic',finish('logic','gloss'),s.ring,4.5,4.72,7,.08);
  solid(L.chips,'logic',finish('logic','pale'),s.label,4.72,4.95,4,.07);
  decal(L.chips,'logic',labelTexture('BMC7',s.label[2]-s.label[0],s.label[3]-s.label[1]),s.label,4.95,{inset:.1});
  for(const [x,y] of s.screws){const head=b.cyl(L.logic,'logic',finish('logic','darksteel'),X(x),Z(y),.85,0,(y<2200?2.6:3)+.35,20);head.castShadow=false;b.box(L.logic,'logic',finish('logic','matte'),X(x),Z(y),1.1,.22,(y<2200?2.6:3)+.35,(y<2200?2.6:3)+.4).castShadow=false}
 }

 // ── Memory ─────────────────────────────────────────────────────────────
 {
  const body=finish('memory','black'),white=finish('memory','white'),gold=m.mat('memory','gold');
  for(const s of SLOTS){
   // A low shelf carries the contact combs; each lane has two modelled rails with the card groove between them.
   const shelf=SLOT_H-.8,[x0,y0,x1,y1]=s.b,across=s.vertical?x1-x0:y1-y0,lane=across/s.lanes;
   solid(L.memory,'memory',body,s.b,0,shelf,3,.12);
   decal(L.memory,'memory',slotTexture(s),s.b,shelf,{opaque:true,inset:.13,roughness:.42}).receiveShadow=false;
   for(let i=0;i<s.lanes;i++)for(const [a,c] of [[.21,.4],[.62,.81]]){
    const p=(s.vertical?x0:y0)+i*lane,box:Box=s.vertical?[p+lane*a,y0+8,p+lane*c,y1-8]:[x0+8,p+lane*a,x1-8,p+lane*c];
    solid(L.memory,'memory',body,box,shelf-.02,SLOT_H,1.5,.14);
   }
   if(s.vertical)decal(L.memory,'memory',labelTexture(`rail:DIMM_${s.id==='dimm-left'?'A2':'B2'}   DDR5 288P   1.1 V   SMT`,lane*.2,(y1-y0)*.5),[x0+lane*1.18,y0+(y1-y0)*.25,x0+lane*1.4,y0+(y1-y0)*.75],SLOT_H,{roughness:.5});
   if(s.vertical){
    for(let i=0;i<=s.lanes;i++){
     const x=Math.min(x1-22,Math.max(x0,x0+i*lane-11));
     // Keyed tab at the top, and a two-step latch hook at the lower end.
     solid(L.memory,'memory',gold,[x,y0-2,x+22,y0+22],0,SLOT_H+.3,2,.1);
     solid(L.memory,'memory',finish('memory','matte'),[x+7,y0+7,x+15,y0+17],SLOT_H+.3,SLOT_H+.34,1).castShadow=false;
     const latch=s.tabs==='gold'?gold:white;
     solid(L.memory,'memory',latch,[x,y1-30,x+22,y1+4],0,SLOT_H+.25,3,.12);solid(L.memory,'memory',latch,[x+3,y1-12,x+19,y1+2],SLOT_H+.2,SLOT_H+.8,2,.12);
    }
   }else{
    for(let i=0;i<s.lanes;i++){
     solid(L.memory,'memory',white,[x0-2,y0+i*lane+8,x0+24,y0+i*lane+40],0,SLOT_H+.3,2,.1);
     solid(L.memory,'memory',finish('memory','matte'),[x0+7,y0+i*lane+17,x0+15,y0+i*lane+31],SLOT_H+.3,SLOT_H+.34,1).castShadow=false;
     solid(L.memory,'memory',gold,[x1-24,y0+i*lane+4,x1+2,y0+i*lane+lane-4],0,SLOT_H+.3,5,.2);
    }
   }
  }
  solid(L.memory,'memory',finish('memory','gloss'),SLOT_CAP,0,3.4,6,.3);
  solid(L.memory,'memory',finish('memory','grey'),[SLOT_CAP[0]+8,SLOT_CAP[1]+16,SLOT_CAP[2]-8,SLOT_CAP[3]-3],3.4,3.5,1);
 }

 // ── Hoses, pipe, cables ────────────────────────────────────────────────
 const flow=tex(flowTexture());
 const pipeGlow=std('cooling',{color:0xb0a388,roughness:.32,metalness:1,emissive:0xff8a3c,emissiveMap:flow,emissiveIntensity:0});
 {
  const print=tex(hoseTexture());
  const rubber=phys('cooling',{color:0xffffff,map:print,roughness:.46,clearcoat:.5,clearcoatRoughness:.3});
  const cable=(asm:AssemblyId)=>finish(asm,'gloss');
  const up=new THREE.Vector3(0,1,0);
  for(const h of HOSES){
   const flat=1,fat=h.mat==='hose'||h.mat==='cable'?1.04:1,R=h.r*fat;
   const pts=h.pts.map(([x,y,z])=>new THREE.Vector3(X(x),z/flat+(R-h.r),Z(y)));
   const lanes=h.mat==='ribbon'?[-1.4,-.7,0,.7,1.4]:[0];
   for(const lane of lanes){
    const curve=new THREE.CatmullRomCurve3(pts.map(p=>p.clone().add(new THREE.Vector3(lane*.25,0,lane))),false,'centripetal');
    const length=curve.getLength(),g=new THREE.TubeGeometry(curve,Math.max(24,Math.round(length/1.6)),R,14,false);
    if(h.mat==='hose'){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*length/52,uv.getY(i)+.37)}
    if(h.mat==='brass'){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*length/36)}
    const material=h.mat==='hose'?rubber:h.mat==='brass'?pipeGlow:h.mat==='ribbon'?finish(h.asm,'matte'):cable(h.asm);
    const mesh=put(home[h.asm],h.asm,g,material);mesh.scale.y=flat;
    // Capped ends.
    for(const t of [0,1]){const cap=put(home[h.asm],h.asm,new THREE.SphereGeometry(R,12,8),material,false);cap.position.copy(curve.getPointAt(t));cap.position.y*=flat;cap.scale.y=flat}
    for(const f of h.ferrules??[]){
     const at=curve.getPointAt(f.t),dir=curve.getTangentAt(f.t),r=R+(f.grow??.4);
     const sleeve=put(home[h.asm],h.asm,new THREE.CylinderGeometry(r,r,f.len,24),f.mat==='brass'?finish(h.asm,'brass'):f.mat==='white'?std(h.asm,{color:0xe8e8e4,roughness:.5,metalness:.3}):finish(h.asm,f.mat),false);
     sleeve.position.copy(at);sleeve.quaternion.setFromUnitVectors(up,dir);
    }
   }
  }
  // The slotted section of the brass pipe.
  b.box(L.cooling,'cooling',finish('cooling','matte'),X(700),Z(706),23,.9,3.7,3.9).castShadow=false;
 }

 // ── Status LEDs and the pulses that run along the printed routes ─────────────
 const glow=tex(glowTexture());
 const colours={green:0x66ff5a,amber:0xffb030,red:0xff4030};
 const leds=LED_AT.map(led=>{
  const dome=std('board',{color:0x2a2c2a,roughness:.3,emissive:colours[led.colour],emissiveIntensity:0});
  b.box(L.smd,'board',dome,X(led.p[0]),Z(led.p[1]),1,.7,0,.5).castShadow=false;
  const halo=own('board',new THREE.MeshBasicMaterial({map:glow,color:0x000000,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.PlaneGeometry(6,6);g.rotateX(-Math.PI/2);const sprite=put(L.smd,'board',g,halo,false);sprite.position.set(X(led.p[0]),.62,Z(led.p[1]));sprite.receiveShadow=false;
  return {dome,halo,tint:new THREE.Color(colours[led.colour])};
 });
 // Each pulse runs along one routed trace, so it stays on the board when the parts lift away.
 const pulses=PULSES.map(flat=>{
  const route:P2[]=[];for(let i=0;i<flat.length;i+=2)route.push([X(flat[i]),Z(flat[i+1])]);
  const lengths=route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1])),total=lengths.reduce((a,x)=>a+x,0);
  const material=own('board',new THREE.MeshBasicMaterial({map:glow,color:0x000000,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  const g=new THREE.PlaneGeometry(5.2,5.2);g.rotateX(-Math.PI/2);const mesh=put(L.board,'board',g,material,false);mesh.receiveShadow=false;mesh.position.y=TOP+.09;
  // Position at a fraction of the route's length.
  const place=(t:number)=>{let s=t*total;for(let i=0;i<lengths.length;i++){if(s<=lengths[i]||i===lengths.length-1){const k=Math.min(1,s/Math.max(lengths[i],1e-6));mesh.position.x=route[i][0]+(route[i+1][0]-route[i][0])*k;mesh.position.z=route[i][1]+(route[i+1][1]-route[i][1])*k;return}s-=lengths[i]}};
  return {material,mesh,place};
 });

 return {die,padGlow,pipeGlow,flow,leds,pulses,shade,boardTop};
}
