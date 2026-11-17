// K8NF4X board print as vectors, painted onto a canvas for any window of the board at any scale: blue mask over copper pours and
// trace fields, tinned lands and plated holes, the white legend, and the markings as printed on this board (Albatron logo, the
// K8NF4X badge, FCC and CE marks, slot and header names). No three.js. Positions come from layout.ts, so every land, outline
// and designator sits under the part it belongs to. Text is drawn with the canvas's own vector fonts.
import {rng} from '../kit/util';
import {BOARD,HOLES,HOLE,SINK_HOLES,SINK_HOLE,DIMM,SLOTS,SOCKET,FRAME,CHIPSET,ATX24,ATX12V,IDE,SATA,HEADERS,OPEN_HEADERS,WAFERS,CHIPS,OPEN_QFP,OPEN_SOIC,
 CHOKES,CAPS,OPEN_CAPS,CRYSTALS,XTAL,BATTERY,PLCC,IO,LOGO,BADGE,FCC,CE,STICKER,SIZES,passives,slotRect,type Rect} from './layout';

type G=CanvasRenderingContext2D;
export type View=[number,number,number,number];   // x0, z0, x1, z1 in board mm
const SANS='"Helvetica Neue", Helvetica, Arial, sans-serif',NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// Colours sampled from the photograph and balanced under the studio light (see docs/k8nf4x/evidence.md).
export const INK={
 laminate:'#0e2259',  // mask over bare glass-epoxy
 pour:'#11286a',      // mask over a copper plane
 trace:'#1c3c88',     // mask over a trace: the copper lifts it
 moat:'#0c1f55',
 via:'#2148a4',
 silk:'#e9edf2',
 tin:'#c9ccce',
 tinDark:'#8d9195',
 drill:'rgba(0,0,0,0)',
 badge:'#b49a63',
};
// Relief channels: red height, green roughness, blue metalness.
const RELIEF={mask:'rgb(104,150,0)',pour:'rgb(118,132,0)',trace:'rgb(136,122,0)',silk:'rgb(150,190,0)',tin:'rgb(150,70,255)',hole:'rgb(0,255,0)'};

// ── Geometry helpers ──
type Pt=[number,number];
// Offset a polyline into `n` parallel copies `pitch` apart, with mitred corners.
function offsets(pts:Pt[],n:number,pitch:number):Pt[][]{
 const out:Pt[][]=[];
 for(let k=0;k<n;k++){
  const d=(k-(n-1)/2)*pitch,line:Pt[]=[];
  for(let i=0;i<pts.length;i++){
   const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[Math.min(pts.length-1,i+1)];
   let n1x=-(b[1]-a[1]),n1z=b[0]-a[0],n2x=-(c[1]-b[1]),n2z=c[0]-b[0];
   const l1=Math.hypot(n1x,n1z)||1,l2=Math.hypot(n2x,n2z)||1;n1x/=l1;n1z/=l1;n2x/=l2;n2z/=l2;
   if(i===0){n1x=n2x;n1z=n2z}if(i===pts.length-1){n2x=n1x;n2z=n1z}
   let mx=n1x+n2x,mz=n1z+n2z;const ml=Math.hypot(mx,mz)||1;mx/=ml;mz/=ml;const cos=mx*n1x+mz*n1z;
   line.push([b[0]+mx*d/Math.max(.5,cos),b[1]+mz*d/Math.max(.5,cos)]);
  }
  out.push(line);
 }
 return out;
}
type Trace={p:Pt[];w:number};
type Land={x:number;z:number;w:number;d:number;round?:boolean;hole?:number};
type Silk={p:Pt[];w:number;close?:boolean};
type Text={t:string;x:number;z:number;s:number;turn?:number;align?:CanvasTextAlign;weight?:number;font?:string};
export type Print={traces:Trace[];pours:Pt[][];voids:Pt[][];vias:Pt[];lands:Land[];silk:Silk[];fills:Pt[][];texts:Text[];dots:{x:number;z:number;r:number}[]};

const box=(r:Rect):Pt[]=>[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]];
const rc=(cx:number,cz:number,w:number,d:number):Rect=>[cx-w/2,cz-d/2,cx+w/2,cz+d/2];
const rot=(cx:number,cz:number,a:number,pts:Pt[]):Pt[]=>pts.map(([x,z])=>{const dx=x-cx,dz=z-cz;return [cx+dx*Math.cos(a)-dz*Math.sin(a),cz+dx*Math.sin(a)+dz*Math.cos(a)]});

let cached:Print|null=null;
export function buildPrint():Print{
 if(cached)return cached;
 const random=rng(4),traces:Trace[]=[],pours:Pt[][]=[],voids:Pt[][]=[],vias:Pt[]=[],lands:Land[]=[],silk:Silk[]=[],fills:Pt[][]=[],texts:Text[]=[],dots:Print['dots']=[];
 const line=(p:Pt[],w=.16,close=false)=>silk.push({p,w,close});
 const outline=(r:Rect,w=.16)=>line(box(r),w,true);
 const text=(t:string,x:number,z:number,s=1.2,o:Partial<Text>={})=>texts.push({t,x,z,s,...o});
 const bus=(pts:Pt[],n:number,pitch=.55,w=.2)=>{for(const p of offsets(pts,n,pitch))traces.push({p,w})};

 // ── Copper planes showing through the mask: the VRM's input and output planes, ground along the edges, the chipset's core plane. ──
 pours.push(
  [[14,56],[68,56],[68,72],[60,74],[60,178],[16,178],[14,170]],
  [[0,0],[198,0],[198,3],[0,3]],[[0,290],[198,290],[198,293],[0,293]],
  [[104,148],[152,148],[156,152],[156,196],[100,196],[100,152]],
  [[2,150],[30,150],[30,212],[2,212]],
  [[150,8],[188,8],[188,20],[150,20]],
  [[170,58],[184,58],[184,110],[170,110]],
  [[124,238],[160,238],[164,242],[164,252],[124,252]],
  [[2,236],[34,236],[34,292],[2,292]],
  [[70,210],[124,210],[124,217],[70,217]],
  [[150,196],[172,196],[172,248],[150,248]],
 );
 // Unpoured islands inside the planes: the split lines between supply nets read as darker channels.
 voids.push([[30,90],[31,90],[31,170],[30,170]],[[14,118],[60,118],[60,119],[14,119]],[[124,170],[156,170],[156,171],[124,171]]);
 // Plane outlines in the photo: thin lighter lines that box the chipset and the lower right.
 traces.push({p:[[107.5,153],[150,153],[150,192],[107.5,192],[107.5,153]],w:.3},{p:[[126,236],[160,236],[160,242],[165,242],[165,251]],w:.3},{p:[[150,198],[172,198],[172,236]],w:.3});

 // ── Buses ──
 // Memory: DIMMs to the socket. Short drops below the lower socket, and the termination field above the upper one.
 for(let x=58;x<185;x+=.62)traces.push({p:[[x,55.6],[x,61.5+((x*7)%3)],[x+(x>118?1.2:-1.2),63.5+((x*7)%3)]],w:.2});
 for(let x=57;x<186;x+=.6){if(x>110&&x<163)continue;const m=(Math.floor(x/.6)%7)*.25;traces.push({p:[[x,12],[x,14.5+m],[x+.3,15+m],[x+.3,17],[x,17.5],[x,20.2]],w:.2})}
 for(let i=0;i<34;i++){const x=113+i*1.45;traces.push({p:[[x,11.4],[x,16],[x+.8,18.6],[x+.8,20.2]],w:.24})}
 // Rows of termination resistor packs above the sockets: light bars in the photo.
 for(let x=58;x<186;x+=3.4){if(x>110&&x<163)continue;lands.push({x,z:13.2,w:.55,d:1},{x,z:18.6,w:.55,d:1});dots.push({x,z:16,r:0})}
 bus([[50,22],[52,24],[52,56],[56,60]],6,.6);
 // Socket to chipset: HyperTransport, down and across at 45°.
 bus([[118,140],[118,146],[112,152],[112,158]],18,.5,.18);
 bus([[132,141],[132,147],[138,153],[146,156]],12,.5,.18);
 // Chipset to the x16 slot.
 bus([[114,189],[114,196.4]],22,.5,.18);bus([[106,180],[100,186],[100,196]],10,.5,.18);
 // Chipset to IDE and SATA, and up to the right-hand edge.
 bus([[150,176],[160,176],[166,182],[166,198],[172,204],[176,204]],16,.5,.18);
 bus([[146,163],[156,163],[162,157],[171,157]],14,.5,.18);
 bus([[140,192],[146,198],[158,198],[162,202],[162,212]],10,.5,.18);
 // South-bound to the PCIe x1 slots and the PCI pair, under the slots' ends.
 bus([[106,194],[96,204],[76,204],[72,208],[72,212]],10,.5,.18);
 bus([[136,198],[136,214],[130,220],[78,220],[74,224],[74,232]],12,.5,.18);
 bus([[126,232],[126,256],[122,260]],14,.5,.18);
 bus([[70,236],[132,236]],10,.5,.18);
 // Rear I/O fan-out from the Super I/O, the LAN and the codec.
 bus([[28,36],[22,36],[18,40],[18,72],[14,76]],12,.55);
 bus([[44,40],[48,44],[48,52]],8,.55);
 bus([[10,226],[6,222],[6,170],[10,166]],8,.55);
 bus([[24,278],[30,272],[30,262]],6,.55);
 bus([[160,128],[162,124],[170,124]],6,.55);
 // Local wiring between small parts: short L-shaped traces with a via at the far end.
 const parts=passives();
 for(let i=0;i<parts.length;i++){
  const a=parts[i],b=parts[(i*7+3)%parts.length];if(Math.hypot(a.x-b.x,a.z-b.z)>9||random()<.25)continue;
  const elbow:Pt=random()<.5?[b.x,a.z]:[a.x,b.z];traces.push({p:[[a.x,a.z],elbow,[b.x,b.z]],w:random()<.2?.35:.2});
 }
 // Stitching vias across the planes and at the ends of local traces.
 for(let i=0;i<2600;i++){const p=pours[Math.floor(random()*pours.length)],xs=p.map(q=>q[0]),zs=p.map(q=>q[1]),x=Math.min(...xs)+random()*(Math.max(...xs)-Math.min(...xs)),z=Math.min(...zs)+random()*(Math.max(...zs)-Math.min(...zs));vias.push([x,z])}
 for(let i=0;i<1400;i++)vias.push([2+random()*194,2+random()*289]);

 // ── Lands for small parts, chip leads and headers; silk round each. ──
 for(const p of parts){
  if(p.kind==='q23'){for(const [a,c] of [[-.95,1],[.95,1],[0,-1]] as const)lands.push(p.turn?{x:p.x+c*1.1,z:p.z+a,w:1,d:.8}:{x:p.x+a,z:p.z+c*1.1,w:.8,d:1});continue}
  const [l,w]=SIZES[p.kind],off=l/2-l*.14,pl=l*.36,pw=w*1.05;
  for(const s of [-1,1])lands.push(p.turn?{x:p.x,z:p.z+s*off,w:pw,d:pl}:{x:p.x+s*off,z:p.z,w:pl,d:pw});
 }
 for(const c of CHIPS){
  const pitch=c.pitch??1.27;
  if(c.kind==='qfp'||c.kind==='soic'||c.kind==='ssop'){
   const [nx,nz]=c.pins??[0,0],ex=c.kind==='qfp'?1:1.3;
   for(let i=0;i<nx;i++)for(const s of [-1,1])lands.push({x:c.x+(i-(nx-1)/2)*pitch,z:c.z+s*(c.d/2+ex*.7),w:pitch*.55,d:ex*1.3});
   for(let i=0;i<nz;i++)for(const s of [-1,1])lands.push({x:c.x+s*(c.w/2+ex*.7),z:c.z+(i-(nz-1)/2)*pitch,w:ex*1.3,d:pitch*.55});
   outline(rc(c.x,c.z,c.w+(nz?ex*2.8:.6),c.d+(nx?ex*2.8:.6)));dots.push({x:c.x-c.w/2-ex*1.6,z:c.z-c.d/2-ex*1.6,r:.35});
  }else if(c.kind==='dpak'){lands.push({x:c.x,z:c.z-.6,w:5.8,d:5.2},{x:c.x-2.28,z:c.z+4.2,w:1.2,d:2},{x:c.x+2.28,z:c.z+4.2,w:1.2,d:2});outline(rc(c.x,c.z+.9,c.w+1.4,c.d+4))}
  else outline(rc(c.x,c.z,c.w+1.2,c.d+1.2));
  text(c.id,c.x,c.z-c.d/2-(c.kind==='qfp'?2.8:2.2),1);
 }
 // The empty QFP and SOIC sites: bare tinned lands in their outlines.
 {const q=OPEN_QFP,[nx,nz]=q.pins;
  for(let i=0;i<nx;i++)for(const s of [-1,1])lands.push({x:q.x+(i-(nx-1)/2)*q.pitch,z:q.z+s*(q.d/2+1.2),w:.28,d:1.6});
  for(let i=0;i<nz;i++)for(const s of [-1,1])lands.push({x:q.x+s*(q.w/2+1.2),z:q.z+(i-(nz-1)/2)*q.pitch,w:1.6,d:.28});
  outline(rc(q.x,q.z,q.w+4.6,q.d+4.6));line([[q.x-q.w/2-2.3,q.z-q.d/2+1],[q.x-q.w/2+1,q.z-q.d/2-2.3]]);fills.push(box(rc(q.x-q.w/2-1.2,q.z-q.d/2-1.2,.9,.9)));text('U11',q.x-q.w/2-3.6,q.z,1.1,{turn:-Math.PI/2})}
 {const q=OPEN_SOIC;for(let i=0;i<q.pins;i++)for(const s of [-1,1])lands.push({x:q.x+(i-(q.pins-1)/2)*q.pitch,z:q.z+s*(q.d/2-.3),w:.62,d:1.9});outline(rc(q.x,q.z,q.w+1.6,q.d+.8));line([[q.x-q.w/2,q.z-1],[q.x-q.w/2+1.4,q.z],[q.x-q.w/2,q.z+1]]);text('U10',q.x-q.w/2-2,q.z,1.1,{turn:-Math.PI/2});text('CTL1',q.x+4,q.z-5.6,1)}
 // Plated holes under every through-hole part (mostly hidden by the bodies; their rings show at the edges).
 const grid=(cx:number,cz:number,cols:number,rows:number,pitch:number,alongX:boolean,r=.85)=>{for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=(i-(cols-1)/2)*pitch,c=(j-(rows-1)/2)*pitch;lands.push({x:cx+(alongX?a:c),z:cz+(alongX?c:a),w:r*2,d:r*2,round:true,hole:r*.55})}};
 for(const h of OPEN_HEADERS){grid(h.x,h.z,h.cols,h.rows,2.54,true,.8);outline(rc(h.x,h.z,h.cols*2.54+.8,h.rows*2.54+.8))}
 for(const h of HEADERS){grid(h.x,h.z,h.cols,h.rows,2.54,h.along==='x',.8);const a=h.cols*2.54+1,c=h.rows*2.54+1;outline(h.along==='x'?rc(h.x,h.z,a,c):rc(h.x,h.z,c,a))}
 for(const w of WAFERS){grid(w.x,w.z,w.n,1,2.54,w.along==='x',.85);const a=w.n*2.54+2.6,c=6;outline(w.along==='x'?rc(w.x,w.z,a,c):rc(w.x,w.z,c,a))}
 // Open capacitor sites.
 for(const [x,z,r] of OPEN_CAPS){
  silk.push({p:Array.from({length:49},(_,i)=>[x+Math.cos(i/48*Math.PI*2)*r,z+Math.sin(i/48*Math.PI*2)*r] as Pt),w:.2});
  fills.push([...Array.from({length:25},(_,i)=>[x+Math.cos(Math.PI+i/24*Math.PI)*(r-.1),z+Math.sin(Math.PI+i/24*Math.PI)*(r-.1)] as Pt)]);
  for(const s of [-1,1])lands.push({x,z:z+s*r*.5,w:1.7,d:1.7,round:true,hole:.5});
 }
 // Footprints of the big parts: outlines a little outside each body, and designators.
 DIMM.z.forEach((z,i)=>{outline([DIMM.x0-1,z-DIMM.w/2-.5,DIMM.x1+1,z+DIMM.w/2+.5]);text(`DDR${i+1}`,DIMM.x0-4.6,z,1.1,{turn:-Math.PI/2})});
 for(const s of SLOTS){const r=slotRect(s);outline([r[0]-.8,r[1]-.6,r[2]+.8,r[3]+.6]);text(s.label,s.kind==='pci'?s.x0+4.6:s.x0+44,s.z+s.w/2+(s.kind==='pci'?3.8:2.8),1.5,{align:'left'})}
 outline([FRAME.x0-.5,FRAME.z0-.5,FRAME.x1+.5,FRAME.z1+.5],.22);outline([SOCKET.x0-1.2,SOCKET.z0-1.2,SOCKET.x1+1.2,SOCKET.z1+1.2],.22);
 line([[SOCKET.x0-1.2,SOCKET.z1-2],[SOCKET.x0+1,SOCKET.z1+1.2]],.22);text('CPU1',FRAME.ix0+3,FRAME.iz1-3,1.3,{align:'left'});
 for(const [x,z] of FRAME.screws)silk.push({p:Array.from({length:33},(_,i)=>[x+Math.cos(i/32*Math.PI*2)*4.4,z+Math.sin(i/32*Math.PI*2)*4.4] as Pt),w:.2});
 {const h=CHIPSET.s/2+1.2,c=CHIPSET;silk.push({p:rot(c.x,c.z,c.turn,box(rc(c.x,c.z,h*2,h*2))),w:.2,close:true});text('U1',c.x+20,c.z+16,1.3);text('nForce4',c.x-21,c.z-14,1.2)}
 outline(rc(ATX24.x,ATX24.z,ATX24.w+1.6,ATX24.len+1.2));text('ATX PWR',ATX24.x-7.4,ATX24.z,1.3,{turn:-Math.PI/2});grid(ATX24.x,ATX24.z,12,2,4.2,false,1.1);
 outline(rc(ATX12V.x,ATX12V.z,ATX12V.w+1.6,ATX12V.len+1.6));text('ATX12V',ATX12V.x+7.2,ATX12V.z,1.1,{turn:-Math.PI/2});
 for(const i of IDE){const r=i.along==='z'?rc(i.x,i.z,i.w+1,i.len+1):rc(i.x,i.z,i.len+1,i.w+1);outline(r);
  if(i.along==='z')text(i.id,i.x,r[3]+2,1.2);else text(i.id,r[0]-4.6,i.z,1.2,{turn:-Math.PI/2})}
 SATA.z.forEach((z,k)=>{outline(rc(SATA.x,z,SATA.len+1,SATA.w+.8));text(`SATA${k+1}`,SATA.x-9.4,z,.95)});text('SATA',SATA.x-2,SATA.z[3]+5,1.2);
 for(const h of HEADERS)if(h.label){h.along==='z'?text(h.label,h.x-4.8,h.z,1.1,{turn:-Math.PI/2}):text(h.label,h.x,h.z+4,1.1)}
 text('F_AUDIO',9,252,1);text('CD_IN',23.6,249.6,1);text('JP1',167,266.4,1);text('CLR_CMOS',167,272.2,.9);
 for(const w of WAFERS)w.along==='x'?text(w.label,w.x,w.z+(w.id==='SYSFAN'?5.6:4.6),1.25):text(w.label,w.x+4.6,w.z,1.1,{turn:-Math.PI/2});
 text('SPEAKER',145.6,292.5-1.6,1.3);text('PW-SW  RST-SW  PWR.LED',184,292.5-1.6,.95);text('FP1',176.4,283.2,1);
 for(const k of CHOKES){const a=k.axis==='x';outline(a?rc(k.x,k.z,k.t+2.2,k.od+.6):rc(k.x,k.z,k.od+.6,k.t+2.2));text(k.id,k.x+(a?k.t/2+2.4:0),k.z+(a?0:k.t/2+2.4),1.2)}
 for(const c of CAPS){silk.push({p:Array.from({length:41},(_,i)=>[c.x+Math.cos(i/40*Math.PI*2)*(c.r+.4),c.z+Math.sin(i/40*Math.PI*2)*(c.r+.4)] as Pt),w:.18});text(c.id,c.x+c.r+2.2,c.z,1)}
 CRYSTALS.forEach((c,i)=>{outline(rc(c.x,c.z,XTAL.w+1,XTAL.l+1));text(`Y${i+1}`,c.x+4,c.z,1.1,{turn:-Math.PI/2})});
 silk.push({p:Array.from({length:65},(_,i)=>[BATTERY.x+Math.cos(i/64*Math.PI*2)*(BATTERY.r+.6),BATTERY.z+Math.sin(i/64*Math.PI*2)*(BATTERY.r+.6)] as Pt),w:.2});text('BAT1',BATTERY.x-14.6,BATTERY.z-9,1.1);text('+',BATTERY.x+14,BATTERY.z-2,2);
 outline(rc(PLCC.x,PLCC.z,PLCC.w+1,PLCC.d+1));text('BIOS',PLCC.x,PLCC.z-PLCC.d/2-2,1.2);text('U16',PLCC.x-PLCC.w/2-2.6,PLCC.z,1.1,{turn:-Math.PI/2});
 for(const v of Object.values(IO))line([[v.x1+.6,v.z0],[v.x1+.6,v.z1]],.18);
 text('LAN1',IO.lan.x1+3,IO.lan.z0+10,1.1,{turn:-Math.PI/2});
 text('KB/MS',IO.ps2.x1+3,IO.ps2.z0+7,1.1,{turn:-Math.PI/2});text('LPT1',IO.lpt.x1+3,IO.lpt.z0+14,1.1,{turn:-Math.PI/2});text('USB1',IO.usb.x1+3,IO.usb.z0+7,1.1,{turn:-Math.PI/2});text('AUDIO1',IO.audio.x1+3,IO.audio.z0+9,1.1,{turn:-Math.PI/2});
 // ── Markings as printed on this board ──
 text('ASSEM.',STICKER.x,292.5-1.6,1.55,{weight:500});
 text('K8NF4X  REV:1.0',151,286.6,1.2,{align:'left'});
 text('Tested To Comply With FCC Standards',FCC.x+5.6,FCC.z-1.4,.82,{align:'left'});text('FOR HOME OR OFFICE USE',FCC.x+5.6,FCC.z+.2,.82,{align:'left'});
 text('94V-0',150,47.6+12.6,1.1);text('E214785',150,62,1);
 // Designators scattered by their small parts, as a CAD legend places them.
 parts.forEach((p,i)=>{if(i%3)return;const [l]=SIZES[p.kind],name=(p.kind[0]==='r'?'R':p.kind==='q23'?'Q':'C')+(100+((i*37)%700));p.turn?text(name,p.x+1.8,p.z,.75,{turn:-Math.PI/2}):text(name,p.x,p.z-l*.5-.9,.75)});
 // Pin-one triangles and a few test points.
 for(let i=0;i<60;i++)dots.push({x:4+random()*190,z:4+random()*285,r:.45});
 cached={traces,pours,voids,vias,lands,silk,fills,texts,dots};return cached;
}

// ── Painting ──
const place=(g:G,view:View,k:number)=>g.setTransform(k,0,0,k,-view[0]*k,-view[1]*k);
const path=(g:G,p:Pt[],close=false)=>{g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);if(close)g.closePath()};
const visible=(view:View,x:number,z:number,m=8)=>x>view[0]-m&&x<view[2]+m&&z>view[1]-m&&z<view[3]+m;
function strokeTraces(g:G,list:Trace[],extra=0){
 g.lineCap='round';g.lineJoin='round';const by=new Map<number,Trace[]>();for(const t of list)(by.get(t.w)??(by.set(t.w,[]),by.get(t.w)!)).push(t);
 for(const [w,ts] of by){g.lineWidth=w+extra;g.beginPath();for(const t of ts)path(g,t.p);g.stroke()}
}
function landPaths(g:G,list:Land[],view:View,more=0){
 g.beginPath();for(const l of list){if(!visible(view,l.x,l.z))continue;if(l.round){g.moveTo(l.x+l.w/2+more,l.z);g.arc(l.x,l.z,l.w/2+more,0,Math.PI*2)}else g.rect(l.x-l.w/2-more,l.z-l.d/2-more,l.w+more*2,l.d+more*2)}g.fill();
}
function holes(g:G){
 g.beginPath();
 for(const [x,z] of HOLES){g.moveTo(x+HOLE.drill,z);g.arc(x,z,HOLE.drill,0,Math.PI*2)}
 for(const [x,z] of SINK_HOLES){g.moveTo(x+SINK_HOLE.drill,z);g.arc(x,z,SINK_HOLE.drill,0,Math.PI*2)}
 g.fill();
}
function drawText(g:G,t:Text){
 g.save();g.translate(t.x,t.z);if(t.turn)g.rotate(t.turn);g.font=`${t.weight??600} ${t.s}px ${t.font??NARROW}`;g.textAlign=t.align??'center';g.textBaseline='middle';g.fillText(t.t,0,0);g.restore();
}
// The Albatron mark: a white tile with a sail swept out of it, then the name in a heavy oblique sans.
function logo(g:G,fill:string,hole:string){
 const {x,z,s,textX,cap}=LOGO;g.save();g.fillStyle=fill;
 g.beginPath();g.roundRect(x-s/2,z-s/2,s,s,s*.08);g.fill();
 g.fillStyle=hole;g.beginPath();g.moveTo(x-s*.36,z+s*.38);g.bezierCurveTo(x-s*.1,z+s*.02,x+s*.12,z-s*.22,x+s*.42,z-s*.36);g.lineTo(x+s*.42,z-s*.18);g.bezierCurveTo(x+s*.16,z-s*.06,x-s*.06,z+s*.16,x-s*.2,z+s*.38);g.closePath();g.fill();
 g.fillRect(x-s/2,z+s*.3,s,s*.06);
 g.fillStyle=fill;g.font=`italic 800 ${cap*1.32}px ${SANS}`;g.textBaseline='alphabetic';g.textAlign='left';
 g.translate(textX,z+cap*.48);g.transform(1,0,-.08,1,0,0);
 try{(g as unknown as {letterSpacing:string}).letterSpacing=`${-cap*.03}px`}catch{/* older canvas */}
 const w=g.measureText('Albatron').width;g.scale(LOGO.textW/w,1);g.fillText('Albatron',0,0);
 g.restore();
}
function badge(g:G,fill:string,ink:string){
 const b=BADGE;g.save();g.fillStyle=fill;g.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d);g.strokeStyle=ink;g.lineWidth=.16;g.strokeRect(b.x-b.w/2+.3,b.z-b.d/2+.3,b.w-.6,b.d-.6);
 g.fillStyle=ink;g.font=`500 ${b.d*.8}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';
 try{(g as unknown as {letterSpacing:string}).letterSpacing=`${b.d*.06}px`}catch{/* older canvas */}
 g.fillText('K8NF4X',b.x,b.z+.15);g.restore();
}
function fcc(g:G){
 const {x,z,s}=FCC;g.save();g.lineWidth=s*.16;g.lineCap='butt';
 // F, then the two nested Cs of the FCC mark.
 g.beginPath();g.moveTo(x-s*.55,z+s*.5);g.lineTo(x-s*.55,z-s*.5);g.lineTo(x+.05*s,z-s*.5);g.moveTo(x-s*.55,z-s*.02);g.lineTo(x-s*.05,z-s*.02);g.stroke();
 for(const r of [s*.5,s*.26]){g.beginPath();g.arc(x+s*.45,z,r,Math.PI*.28,Math.PI*1.72,false);g.stroke()}
 g.restore();
}
function ce(g:G){
 const {x,z,s}=CE;g.save();g.lineWidth=s*.16;
 g.beginPath();g.arc(x-s*.42,z,s*.42,Math.PI*.35,Math.PI*1.65);g.stroke();
 g.beginPath();g.arc(x+s*.52,z,s*.42,Math.PI*.35,Math.PI*1.65);g.stroke();g.beginPath();g.moveTo(x+s*.18,z);g.lineTo(x+s*.66,z);g.stroke();
 // The round mark beside it: a ring crossed by a bar.
 g.beginPath();g.arc(x-s*2.2,z,s*.5,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x-s*2.8,z);g.lineTo(x-s*1.6,z);g.stroke();
 g.restore();
}

// The board face, any window of it, `k` pixels per mm. Holes are cleared to transparent so the material can cut them out.
export function paintColour(g:G,view:View,k:number){
 const p=buildPrint();place(g,view,k);
 g.fillStyle=INK.laminate;g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 g.fillStyle=INK.pour;g.beginPath();for(const q of p.pours)path(g,q,true);g.fill();
 g.fillStyle=INK.moat;g.beginPath();for(const q of p.voids)path(g,q,true);g.fill();
 // A faint mottle in the mask, thicker in some places than others, so the blue is a surface.
 const random=rng(77);for(let i=0;i<120;i++){const x=random()*BOARD.w,z=random()*BOARD.d;if(!visible(view,x,z,40))continue;const r=12+random()*36,f=g.createRadialGradient(x,z,0,x,z,r),c=random()<.5?'60,100,200':'8,24,90',a=.05+random()*.06;f.addColorStop(0,`rgba(${c},${a})`);f.addColorStop(1,`rgba(${c},0)`);g.fillStyle=f;g.fillRect(x-r,z-r,r*2,r*2)}
 g.strokeStyle=INK.moat;strokeTraces(g,p.traces,.3);
 g.strokeStyle=INK.trace;strokeTraces(g,p.traces);
 g.fillStyle=INK.via;g.beginPath();for(const [x,z] of p.vias){if(!visible(view,x,z))continue;g.moveTo(x+.36,z);g.arc(x,z,.36,0,Math.PI*2)}g.fill();
 g.fillStyle='#10296f';g.beginPath();for(const [x,z] of p.vias){if(!visible(view,x,z))continue;g.moveTo(x+.15,z);g.arc(x,z,.15,0,Math.PI*2)}g.fill();
 // Legend.
 g.strokeStyle=g.fillStyle=INK.silk;g.lineCap='round';g.lineJoin='round';
 const by=new Map<number,Silk[]>();for(const s of p.silk)(by.get(s.w)??(by.set(s.w,[]),by.get(s.w)!)).push(s);
 for(const [w,list] of by){g.lineWidth=w;g.beginPath();for(const s of list)path(g,s.p,s.close);g.stroke()}
 g.beginPath();for(const f of p.fills)path(g,f,true);g.fill();
 for(const d of p.dots)if(d.r>0){g.beginPath();g.arc(d.x,d.z,d.r,0,Math.PI*2);g.fill()}
 for(const t of p.texts)if(visible(view,t.x,t.z,20))drawText(g,t);
 logo(g,INK.silk,INK.pour);badge(g,INK.badge,'#2b2418');g.fillStyle=g.strokeStyle=INK.silk;fcc(g);ce(g);
 // Assembly sticker: a small grey paper square, printed with a lot code.
 g.fillStyle='#c9ccd0';g.fillRect(STICKER.x-STICKER.w/2,STICKER.z-STICKER.d/2,STICKER.w,STICKER.d);g.fillStyle='#55595f';g.font=`600 1px ${NARROW}`;g.textAlign='center';g.fillText('QC PASS',STICKER.x,STICKER.z-2);g.fillText('0527',STICKER.x,STICKER.z+.5);g.fillRect(STICKER.x-2.5,STICKER.z+2,5,1.6);
 // Lands: mask opening, tin, and the drill of a plated hole.
 g.fillStyle=INK.tinDark;landPaths(g,p.lands,view,.12);g.fillStyle=INK.tin;landPaths(g,p.lands,view);
 g.fillStyle='#24272b';g.beginPath();for(const l of p.lands)if(l.hole&&visible(view,l.x,l.z)){g.moveTo(l.x+l.hole,l.z);g.arc(l.x,l.z,l.hole,0,Math.PI*2)}g.fill();
 // Mounting rings: wide tinned annulus with eight stitching vias, as photographed.
 for(const [hs,list] of [[HOLE,HOLES],[SINK_HOLE,SINK_HOLES]] as const)for(const [x,z] of list){
  const f=g.createRadialGradient(x-hs.ring*.3,z-hs.ring*.3,hs.ring*.2,x,z,hs.ring*1.1);f.addColorStop(0,'#e3e5e6');f.addColorStop(1,'#a9adb1');
  g.fillStyle=INK.tinDark;g.beginPath();g.arc(x,z,hs.ring+.2,0,Math.PI*2);g.fill();g.fillStyle=f;g.beginPath();g.arc(x,z,hs.ring,0,Math.PI*2);g.fill();
  g.fillStyle='#6f7377';for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=(hs.ring+hs.drill)/2;g.beginPath();g.arc(x+Math.cos(a)*r,z+Math.sin(a)*r,.32,0,Math.PI*2);g.fill()}
 }
 g.globalCompositeOperation='destination-out';g.fillStyle='#000';holes(g);g.globalCompositeOperation='source-over';
}
// Relief: height in red, roughness in green, metalness in blue, at a lower scale.
export function paintRelief(g:G,view:View,k:number){
 const p=buildPrint();place(g,view,k);
 g.fillStyle=RELIEF.mask;g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 g.fillStyle=RELIEF.pour;g.beginPath();for(const q of p.pours)path(g,q,true);g.fill();
 // Very fine orange-peel in the mask: height and roughness speckle.
 {const random=rng(91);g.save();g.setTransform(1,0,0,1,0,0);const W=g.canvas.width,H=g.canvas.height;for(let i=0;i<W*H/6;i++){const v=random();g.fillStyle=v<.5?'rgba(150,175,0,.12)':'rgba(80,120,0,.12)';g.fillRect(random()*W,random()*H,1.5,1.5)}g.restore()}
 g.strokeStyle=RELIEF.trace;strokeTraces(g,p.traces);
 g.strokeStyle=g.fillStyle=RELIEF.silk;g.lineCap='round';
 for(const s of p.silk){g.lineWidth=s.w;g.beginPath();path(g,s.p,s.close);g.stroke()}
 g.beginPath();for(const f of p.fills)path(g,f,true);g.fill();
 for(const t of p.texts)drawText(g,t);logo(g,RELIEF.silk,RELIEF.mask);fcc(g);ce(g);badge(g,RELIEF.silk,RELIEF.silk);
 g.fillStyle=RELIEF.tin;landPaths(g,p.lands,view);
 for(const [hs,list] of [[HOLE,HOLES],[SINK_HOLE,SINK_HOLES]] as const)for(const [x,z] of list){g.beginPath();g.arc(x,z,hs.ring,0,Math.PI*2);g.fill()}
 g.fillStyle=RELIEF.hole;holes(g);
}
