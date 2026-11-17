// The GA-P35-S3G's printed face as vectors, in board millimetres (origin at the centre, x right, z down the photo):
// copper planes and routed trace bundles reading through the blue solder mask, tented vias, tinned lands under every part,
// plated holes, silkscreen outlines, and the board's own lettering, traced from the photo. No three.js here; textures.ts
// paints this onto canvases (in tiles) at whatever scale it is asked for.
import {rng} from '../kit/util';
import {BOARD,HOLES,SLOTS,DIMMS,DIMM,CPU,NB,SB,ATX24,ATX4,IDE,FDD,SATA,SATA_EMPTY,HEADERS,FANS,IO,CHIPS,PAKS,CHOKES,CAPS,COIN,XTALS,LABELS,ASSEM_LABEL,POLYFUSE,
 headerPins,headerRect,smds,smdRect,mm,rect,R,C,W,D,type Rect,type P2,type Chip} from './layout';

export type Line={p:number[];w:number};
export type Pad={x:number;z:number;w:number;d:number;r:number;hole?:number};
export type Ring={x:number;z:number;r:number;w:number;fill?:boolean;half?:number};
export type Text={t:string;x:number;z:number;s:number;rot:number;style:'plain'|'bold'|'italic'|'logo'|'ref'};
export type Print={traces:Line[];planes:number[][];vias:number[];pads:Pad[];silk:Line[];rings:Ring[];texts:Text[];fills:Rect[]};

// ── Trace bundles: n parallel tracks routed from A to B with one 45° jog, the way an autorouter's buses read through mask. ──
function offsetPolyline(p:P2[],o:number):number[]{
 const out:number[]=[];
 for(let i=0;i<p.length;i++){
  const a=p[Math.max(0,i-1)],b=p[i],c=p[Math.min(p.length-1,i+1)];
  const n1=i>0?norm(b[0]-a[0],b[1]-a[1]):null,n2=i<p.length-1?norm(c[0]-b[0],c[1]-b[1]):null;
  const na=n1??n2!,nb=n2??n1!;let nx=-(na[1]+nb[1]),nz=na[0]+nb[0];const l=Math.hypot(nx,nz)||1;nx/=l;nz/=l;
  const cos=Math.max(.5,nx*-na[1]+nz*na[0]);out.push(b[0]+nx*o/cos,b[1]+nz*o/cos);
 }
 return out;
}
const norm=(x:number,z:number):P2=>{const l=Math.hypot(x,z)||1;return [x/l,z/l]};
function route(a:P2,b:P2,horizontalFirst:boolean):P2[]{
 const dx=b[0]-a[0],dz=b[1]-a[1],j=Math.min(Math.abs(dx),Math.abs(dz))*.9,sx=Math.sign(dx),sz=Math.sign(dz);
 if(horizontalFirst){const run=(Math.abs(dx)-j)/2;return [a,[a[0]+sx*run,a[1]],[a[0]+sx*(run+j),a[1]+sz*j],[b[0],a[1]+sz*j],b]}
 const run=(Math.abs(dz)-j)/2;return [a,[a[0],a[1]+sz*run],[a[0]+sx*j,a[1]+sz*(run+j)],[a[0]+sx*j,b[1]],b];
}
const dedupe=(p:P2[])=>p.filter((q,i)=>i===0||Math.hypot(q[0]-p[i-1][0],q[1]-p[i-1][1])>.05);

let cached:Print|null=null;
export function buildPrint():Print{
 if(cached)return cached;
 const random=rng(902),traces:Line[]=[],planes:number[][]=[],vias:number[]=[],pads:Pad[]=[],silk:Line[]=[],rings:Ring[]=[],texts:Text[]=[],fills:Rect[]=[];
 const P=(x:number,y:number)=>mm(x,y);
 const bus=(ax:number,ay:number,bx:number,by:number,n:number,h=true,pitch=.42,w=.18,viasAtEnd=true)=>{
  const path=dedupe(route(P(ax,ay),P(bx,by),h));
  for(let i=0;i<n;i++){const o=(i-(n-1)/2)*pitch,line=offsetPolyline(path,o);traces.push({p:line,w});if(viasAtEnd&&random()<.35)vias.push(line[line.length-2],line[line.length-1])}
 };
 // Buses between the parts that talk to each other on this board (photo px end points).
 bus(996,700,1068,640,44,true,.4);                     // NB → CPU (front-side bus)
 bus(905,806,1000,884,40,false,.36);                   // NB → DIMM channel A
 bus(950,806,1040,984,36,false,.36);                   // NB → DIMM channel B
 bus(796,690,694,640,32,true,.4);                      // NB → PCIe x16
 bus(820,806,617,990,22,false,.42);                    // NB → ICH9 (DMI)
 bus(530,908,520,842,18,false,.45);                    // ICH9 → PCI
 bus(500,908,320,842,24,false,.4);
 bus(470,1000,250,842,20,false,.4);
 bus(530,1066,400,1110,14,false,.45);                  // ICH9 → SATA
 bus(470,1066,340,1110,10,false,.45);
 bus(455,940,180,880,16,true,.42);                     // ICH9 → front USB headers
 bus(455,980,170,1090,12,true,.42);                    // ICH9 → front panel
 bus(617,1040,829,1110,22,true,.4);                    // ICH9 → IDE
 bus(470,908,600,431,16,false,.42);                    // LPC: ICH9 → Super I/O
 bus(602,394,194,500,18,true,.42);                     // Super I/O → floppy
 bus(662,372,1110,395,22,true,.38);                    // Super I/O → parallel / serial / PS/2
 bus(727,372,830,400,10,true,.4);                      // codec → audio jacks
 bus(806,1120,940,395,8,false,.5);                     // LAN → RJ45
 bus(760,975,1460,985,30,true,.34,.16,false);          // memory: the band between the two channels
 bus(760,1072,1460,1074,22,true,.34,.16,false);
 bus(1180,840,1460,850,18,true,.36,.16,false);
 bus(1090,1140,1380,1140,10,true,.5,.3);               // VRM phases
 bus(1360,1140,1420,800,8,false,.6,.35);
 bus(1240,1200,1240,840,6,false,.7,.45);
 bus(200,460,160,330,8,false,.45);
 // Short local routes everywhere: a lead out, a jog, a via. Dense near parts, as the photo reads.
 for(let i=0;i<2600;i++){
  const x=-BOARD.w/2+4+random()*(BOARD.w-8),z=-BOARD.d/2+4+random()*(BOARD.d-8),dir=Math.floor(random()*4)*Math.PI/2+(random()<.2?Math.PI/4:0);
  const l1=1.5+random()*9,l2=random()<.6?1+random()*6:0,turn=(random()<.5?1:-1)*Math.PI/4;
  const p:number[]=[x,z,x+Math.cos(dir)*l1,z+Math.sin(dir)*l1];
  if(l2)p.push(p[2]+Math.cos(dir+turn)*l2,p[3]+Math.sin(dir+turn)*l2);
  traces.push({p,w:random()<.12?.4:random()<.4?.24:.16});if(random()<.55)vias.push(p[p.length-2],p[p.length-1]);
 }
 // Copper pours that read as paler blue through the mask (traced from the photo's lighter regions).
 const poly=(pts:number[][])=>planes.push(pts.flatMap(([x,y])=>P(x,y)));
 poly([[150,318],[450,318],[450,400],[300,420],[150,420]]);
 poly([[130,700],[150,700],[150,1200],[130,1200]]);
 poly([[1000,820],[1440,820],[1460,880],[1180,880],[1100,860],[1000,860]]);
 poly([[1440,380],[1458,380],[1484,1200],[1460,1200]]);
 poly([[860,1196],[1100,1196],[1100,1210],[860,1210]]);
 poly([[600,560],[640,560],[640,850],[600,850]]);
 poly([[1080,560],[1100,520],[1400,520],[1420,560],[1420,780],[1400,800],[1100,800],[1080,780]]);
 poly([[300,1180],[760,1180],[760,1205],[300,1205]]);
 for(let i=0;i<1800;i++)vias.push(-BOARD.w/2+3+random()*(BOARD.w-6),-BOARD.d/2+3+random()*(BOARD.d-6));

 // ── Lands and holes ──
 const pad=(x:number,z:number,w:number,d:number,r=Math.min(w,d)*.2,hole?:number)=>pads.push({x,z,w,d,r,hole});
 const th=(x:number,z:number,r=.85,hole=.5)=>pad(x,z,r*2,r*2,r,hole);
 const box=(b:Rect,m=.4,w=.15)=>silk.push({p:[b[0]-m,b[1]-m,b[2]+m,b[1]-m,b[2]+m,b[3]+m,b[0]-m,b[3]+m,b[0]-m,b[1]-m],w});
 const corners=(b:Rect,arm:number,m=.5,w=.15)=>{for(const [x,z,sx,sz] of [[b[0]-m,b[1]-m,1,1],[b[2]+m,b[1]-m,-1,1],[b[2]+m,b[3]+m,-1,-1],[b[0]-m,b[3]+m,1,-1]])silk.push({p:[x+sx*arm,z,x,z,x,z+sz*arm],w})};
 const ref=(t:string,x:number,z:number,s=1.15,rot=0)=>texts.push({t,x,z,s,rot,style:'ref'});
 for(const h of HOLES){
  pad(h.x,h.z,h.ring*2,h.ring*2,h.ring,h.r);rings.push({x:h.x,z:h.z,r:h.ring+(h.big?1.4:.6),w:h.big?.3:.18});if(h.big)rings.push({x:h.x,z:h.z,r:h.ring+2.1,w:.22});
 }
 // Headers and connectors: plated holes on their real pitch.
 for(const hh of HEADERS){headerPins(hh).forEach(([x,z])=>th(x,z,.8,.5));box(headerRect(hh),.5)}
 const grid=(b:Rect,cols:number,rows:number,r=.95,hole=.6)=>{const [cx,cz]=C(b),pw=W(b)/cols,pd=D(b)/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)th(cx+(i-(cols-1)/2)*pw*.86,cz+(j-(rows-1)/2)*pd*.6,r,hole)};
 grid(ATX24.b,12,2,1.1,.75);box(ATX24.b,.6);grid(ATX4.b,2,2,1.1,.75);box(ATX4.b,.6);
 grid(IDE.b,20,2);box(IDE.b,.4);grid(FDD.b,2,17);box(FDD.b,.4);
 for(const s of SATA){box(s.b,.5);for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])th(C(s.b)[0]+dx*(W(s.b)/2+.6),C(s.b)[1]+dz*(D(s.b)/2-2),1.1,.8)}
 {const b=SATA_EMPTY,[cx,cz]=C(b);box(b,.5);for(let i=0;i<7;i++)pad(cx,cz-4.5+i*1.27,1.8,.6);for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])th(cx+dx*(W(b)/2-.4),cz+dz*(D(b)/2-2),1.1,.8)}
 for(const f of FANS){box(f.b,.35);const [cx,cz]=C(f.b);for(let i=0;i<f.pins;i++){const o=(i-(f.pins-1)/2)*2.54;th(f.turn?cx:cx+o,f.turn?cz+o:cz,.8,.5)}}
 for(const s of SLOTS){const b:Rect=[s.x-s.w/2,s.z0,s.x+s.w/2,s.z0+s.len];box(b,.6,.18);for(const z of [s.z0+3,s.z0+s.len-3])th(s.x,z,1.3,.9)}
 for(const d of DIMMS){const b=rect(d.x,d.z,DIMM.len+DIMM.latch*2,DIMM.w);box(b,.6,.18);for(const x of [d.x-DIMM.len/2+2,d.x+DIMM.len/2-2])th(x,d.z,1.2,.85)}
 {const b=rect(CPU.x,CPU.z,CPU.plate+2,CPU.plate+2);box(b,1.2,.2);corners(rect(CPU.x,CPU.z,CPU.plate+10,CPU.plate+10),5,0,.22);
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=CPU.x+dx*36,z=CPU.z+dz*36;pad(x,z,7,7,3.5,2.1);rings.push({x,z,r:4.6,w:.22})}
  // The cooler's foot ring and its four arms, as Gigabyte prints a keep-out round the socket.
  rings.push({x:CPU.x,z:CPU.z,r:47.5,w:.22});
 }
 // Chipsets: the BGA lands are under the heat sinks; print their outlines and the clip anchors.
 for(const [b,pins] of [[NB.b,NB.pins],[SB.b,SB.pins]] as const){corners(b,4,1.2,.2);for(const [x,z] of pins){pad(x,z,4,4,2,1.6);rings.push({x,z,r:2.8,w:.2})}}
 for(const t of SB.tabs)box(t,.3,.15);
 // Rear I/O: shell tabs and signal rows.
 for(const o of Object.values(IO)){const b=o.b;box([b[0],Math.max(b[1],-BOARD.d/2+.6),b[2],b[3]],.35,.18);for(const x of [b[0]+1.5,b[2]-1.5])th(x,b[3]-3,1.3,1);for(let i=0;i<6;i++)th(b[0]+3+i*(W(b)-6)/5,b[3]-1.2,.7,.45)}
 // Packages: one land per lead.
 const leads=(c:Chip)=>{
  const [cx,cz]=C(c.b),w=W(c.b),d=D(c.b),n=c.pins,len=c.reach+.6;
  const row=(along:'x'|'z',fixed:number,count:number,span:number)=>{for(let i=0;i<count;i++){const t=(i-(count-1)/2)*c.pitch;if(Math.abs(t)>span/2)continue;along==='x'?pad(cx+t,fixed,c.pitch*.55,len,.08):pad(fixed,cz+t,len,c.pitch*.55,.08)}};
  if(c.sides==='all'){row('x',c.b[1]-c.reach/2,Math.round((w-1.5)/c.pitch),w-1.2);row('x',c.b[3]+c.reach/2,Math.round((w-1.5)/c.pitch),w-1.2);row('z',c.b[0]-c.reach/2,Math.round((d-1.5)/c.pitch),d-1.2);row('z',c.b[2]+c.reach/2,Math.round((d-1.5)/c.pitch),d-1.2)}
  else if(c.sides==='tb'){row('x',c.b[1]-c.reach/2,n,w);row('x',c.b[3]+c.reach/2,n,w)}
  else{row('z',c.b[0]-c.reach/2,n,d);row('z',c.b[2]+c.reach/2,n,d)}
  const m=c.sides==='all'?c.reach+.6:.6;box(grow2(c.b,c.sides==='tb'?.3:m,c.sides==='tb'?c.reach+.5:m),0,.15);
  const dot=c.sides==='all'?[c.b[0]-m-.8,c.b[1]-m-.8]:[c.b[0]-.9,c.b[3]+c.reach+.9];rings.push({x:dot[0],z:dot[1],r:.35,w:0,fill:true});
 };
 CHIPS.forEach(leads);
 for(const p of PAKS){const [cx,cz]=C(p.b),w=W(p.b),d=D(p.b);const tab=p.tab,horiz=tab==='n'||tab==='s',s=tab==='n'||tab==='w'?-1:1;
  if(horiz){pad(cx,cz+s*d*.18,w*.9,d*.62,.3);for(const o of [-1,1])pad(cx+o*w*.28,cz-s*d*.42,w*.18,d*.22,.1)}else{pad(cx+s*w*.18,cz,w*.62,d*.9,.3);for(const o of [-1,1])pad(cx-s*w*.42,cz+o*d*.28,w*.22,d*.18,.1)}
  box(p.b,.4,.15)}
 for(const c of CHOKES){const [cx,cz]=C(c.b);const w=W(c.b),d=D(c.b);if(c.turn){pad(cx,cz-d*.36,w*.7,d*.22,.3);pad(cx,cz+d*.36,w*.7,d*.22,.3)}else{pad(cx-w*.36,cz,w*.22,d*.7,.3);pad(cx+w*.36,cz,w*.22,d*.7,.3)}box(c.b,.5,.2)}
 CAPS.forEach((c,i)=>{rings.push({x:c.x,z:c.z,r:c.r+.45,w:.18,half:i%2?Math.PI/2:-Math.PI/2});th(c.x-c.r*.5,c.z,.75,.45);th(c.x+c.r*.5,c.z,.75,.45);ref('EC'+(i+1),c.x,c.z+c.r+1.4,1)});
 {rings.push({x:COIN.x,z:COIN.z,r:COIN.r+.6,w:.22});pad(COIN.x,COIN.z,9,9,4.5);pad(COIN.x+COIN.r+1.6,COIN.z,2.6,3.2,.3);pad(COIN.x-COIN.r-1.6,COIN.z,2.6,3.2,.3)}
 for(const x of XTALS){const [cx,cz]=C(x.b);th(cx,cz-D(x.b)*.25,.7,.4);th(cx,cz+D(x.b)*.25,.7,.4);box(x.b,.4,.15)}
 {const b=POLYFUSE,[cx,cz]=C(b);pad(cx,b[1]+.8,W(b)*.9,1.4,.2);pad(cx,b[3]-.8,W(b)*.9,1.4,.2)}
 // Small parts: two lands each, under the terminals.
 for(const s of smds()){const o=s.l*.42,l=s.l*.32,w=s.w*1.05;if(s.turn){pad(s.x,s.z-o,w,l,.08);pad(s.x,s.z+o,w,l,.08)}else{pad(s.x-o,s.z,l,w,.08);pad(s.x+o,s.z,l,w,.08)}if(s.kind==='d'){const f=smdRect(s);s.turn?silk.push({p:[f[0]-.3,f[1]-.4,f[2]+.3,f[1]-.4],w:.22}):silk.push({p:[f[0]-.4,f[1]-.3,f[0]-.4,f[3]+.3],w:.22})}}

 // ── Lettering and marks ──
 for(const l of LABELS)texts.push({t:l.t,x:l.x,z:l.z,s:l.s,rot:l.rot,style:l.style??'plain'});
 fills.push(ASSEM_LABEL);
 // Silk tables beside CLR_CMOS and the BIOS (photo: small ruled boxes with tiny lettering).
 {const b=R([226,896,300,920]);box(b,0,.18);silk.push({p:[b[0],(b[1]+b[3])/2,b[2],(b[1]+b[3])/2],w:.15},{p:[(b[0]+b[2])/2-4,b[1],(b[0]+b[2])/2-4,b[3]],w:.15});ref('1-2',b[0]+3,b[1]+1.4,.9);ref('OPEN',b[0]+3,b[3]-1.4,.9);ref('CLEAR',b[2]-5,b[3]-1.4,.9)}
 {const b=R([300,928,372,986]);dash(silk,b,.18);const c=R([262,928,300,986]);dash(silk,c,.18)}
 ref('IT8718F',C(CHIPS[0].b)[0],CHIPS[0].b[3]+2.6,1.1);ref('U12',CHIPS[1].b[2]+2.4,C(CHIPS[1].b)[1],1,90);
 return cached={traces,planes,vias,pads,silk,rings,texts,fills};
}
const grow2=(b:Rect,mx:number,mz:number):Rect=>[b[0]-mx,b[1]-mz,b[2]+mx,b[3]+mz];
function dash(silk:Line[],b:Rect,w:number){
 const seg=(x0:number,z0:number,x1:number,z1:number)=>{const l=Math.hypot(x1-x0,z1-z0),n=Math.floor(l/1.1);for(let i=0;i<n;i+=2){const a=i/n,c=Math.min(1,(i+1)/n);silk.push({p:[x0+(x1-x0)*a,z0+(z1-z0)*a,x0+(x1-x0)*c,z0+(z1-z0)*c],w})}};
 seg(b[0],b[1],b[2],b[1]);seg(b[2],b[1],b[2],b[3]);seg(b[2],b[3],b[0],b[3]);seg(b[0],b[3],b[0],b[1]);
}
