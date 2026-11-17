// Verdant's board print as vectors: lands, plated holes, silkscreen outlines and lettering. No three.js, no canvas.
// Everything is in reference pixels (0.1 mm). Lands sit exactly where the modelled parts put their terminals and leads,
// so a footprint and its part agree. Copper routing between the lands is in routed.ts (made by scripts/devices/trace-verdant.mjs
// from this same list). Lettering is a single stroke typeface defined here, drawn as round-ended lines like real silkscreen.
import {IMG,CHIPS,ROUNDS,BLOCKS,COVER,SOCKET2,SOCKET3,SLOTS,SLOT_CAP,LED_AT,ICS,HOSES,PLATE,PX,spots,footprints,leadsOf,landOf,even,type Box} from './layout';

// A land. `hole` makes it a plated through-hole (a ring). `grp` names a row the router picks whole buses from, in order of `k`.
// `route` is false for lands that take no surface trace (inner array lands, mounting rings).
export type Pad={x:number;y:number;w:number;h:number;r:number;gold?:boolean;hole?:number;fp:number;grp?:string;k?:number;route:boolean};
export type Line={p:number[];w:number};                       // silk polyline, flat [x, y, x, y, …]
export type Circle={x:number;y:number;r:number;w:number};     // silk circle; w = 0 is a filled dot
export type Print={pads:Pad[];silk:Line[];circles:Circle[];fills:Box[];names:{t:string;x:number;y:number;b:Box}[];missed:string[];count:Record<string,number>};

// ── Stroke typeface: capitals, digits and a little punctuation on a 4 × 6 grid. Each stroke is a run of xy digit pairs. ──
const GLYPHS:Record<string,string>={
 A:'0004264440 0242',B:'000636454433033342413000',C:'4536160501103041',D:'00062645412000',E:'40000646 0333',F:'000646 0333',G:'45361605011030414323',H:'0006 4046 0343',
 I:'1030 2026 1636',J:'0110304146',K:'0006 460340',L:'060040',M:'0006234640',N:'00064046',O:'103041453616050110',P:'00063645443303',Q:'103041453616050110 2240',R:'00063645443303 2340',
 S:'453616050413334241301001',T:'0646 2026',U:'060110304146',V:'062046',W:'0610233046',X:'0046 0640',Y:'062346 2320',Z:'06460040',
 0:'103041453616050110 0145',1:'152620 1030',2:'05163645440040',3:'0516364544334241301001 2333',4:'30360242',5:'460603334241301001',6:'36160501103041423303',7:'064620',
 8:'163645443313040516 1302011030414233',9:'10304145361605041343',_:'0040','-':'1333','.':'2020','/':'0046','+':'0343 2125',':':'2121 2424','=':'0242 0444','(':'36252130',')':'16252110','>':'054301','<':'450341','#':'1016 3036 0242 0444',' ':'',
};
const strokes=new Map<string,number[][]>(Object.entries(GLYPHS).map(([ch,code])=>[ch,code.split(' ').filter(Boolean).map(run=>Array.from({length:run.length/2},(_,i)=>[+run[i*2],+run[i*2+1]]).flat())]));
const ADVANCE=5.6;
// Width of a line of text whose capitals are `s` tall.
export const textWidth=(t:string,s:number)=>Math.max(0,t.length*ADVANCE-1.6)*s/6;
// Strokes for text centred on (cx, cy). `turn` reads bottom to top.
export function textStrokes(t:string,cx:number,cy:number,s:number,turn=false):number[][]{
 const u=s/6,x0=-textWidth(t,s)/2,out:number[][]=[];
 [...t.toUpperCase()].forEach((ch,i)=>{
  for(const run of strokes.get(ch)??[]){
   const p:number[]=[];
   for(let k=0;k<run.length;k+=2){const lx=x0+(i*ADVANCE+run[k])*u,ly=s/2-run[k+1]*u;if(turn)p.push(cx+ly,cy-lx);else p.push(cx+lx,cy+ly)}
   out.push(p);
  }
 });
 return out;
}

const BODY=0x7ffffff0,TEXT=0x7ffffff1;
let cached:Print|null=null;
export function buildPrint():Print{
 if(cached)return cached;
 const pads:Pad[]=[],silk:Line[]=[],circles:Circle[]=[],fills:Box[]=[],names:Print['names']=[],missed:string[]=[],count:Record<string,number>={};
 // Who holds each 0.2 mm cell: a footprint number, a body, lettering, or nothing. Silk and lettering only go where nothing else is.
 const GW=Math.ceil(IMG.w/2)+1,GH=Math.ceil(IMG.h/2)+1,held=new Int32Array(GW*GH);
 const cells=(x0:number,y0:number,x1:number,y1:number)=>[Math.max(0,Math.floor(x0/2)),Math.max(0,Math.floor(y0/2)),Math.min(GW-1,Math.ceil(x1/2)),Math.min(GH-1,Math.ceil(y1/2))];
 const mark=(x0:number,y0:number,x1:number,y1:number,id:number)=>{const [a,b,c,d]=cells(x0,y0,x1,y1);for(let j=b;j<=d;j++)for(let i=a;i<=c;i++)held[j*GW+i]=id};
 const free=(x0:number,y0:number,x1:number,y1:number,id=0)=>{
  if(x0<10||y0<10||x1>IMG.w-10||y1>IMG.h-10)return false;
  const [a,b,c,d]=cells(x0,y0,x1,y1);for(let j=b;j<=d;j++)for(let i=a;i<=c;i++){const v=held[j*GW+i];if(v&&v!==id)return false}return true;
 };
 let fp=0;
 const pad=(x:number,y:number,w:number,h:number,o:Partial<Pad>={})=>{pads.push({x,y,w,h,r:Math.min(w,h)*.18,fp,route:true,...o});mark(x-w/2-.8,y-h/2-.8,x+w/2+.8,y+h/2+.8,fp)};
 const line=(p:number[],w=.9)=>{silk.push({p,w})};
 const frame=(x0:number,y0:number,x1:number,y1:number,w=.9)=>line([x0,y0,x1,y0,x1,y1,x0,y1,x0,y0],w);
 const corners=(x0:number,y0:number,x1:number,y1:number,arm:number,w=.9)=>{for(const [x,y,sx,sy] of [[x0,y0,1,1],[x1,y0,-1,1],[x1,y1,-1,-1],[x0,y1,1,-1]])line([x+sx*arm,y,x,y,x,y+sy*arm],w)};
 const dot=(x:number,y:number,r:number)=>{circles.push({x,y,r,w:0})};
 const ring=(x:number,y:number,r:number,w=.9)=>{circles.push({x,y,r,w})};
 const text=(t:string,cx:number,cy:number,s:number,turn=false,weight=.15)=>{
  for(const p of textStrokes(t,cx,cy,s,turn))line(p,s*weight);
  const w=textWidth(t,s)/2+1,h=s/2+1,b:Box=turn?[cx-h,cy-w,cx+h,cy+w]:[cx-w,cy-h,cx+w,cy+h];mark(b[0],b[1],b[2],b[3],TEXT);names.push({t,x:cx,y:cy,b});
 };
 // Try a label beside a box: right, left, above, below, then the same turned on its side. Returns whether it found room.
 const label=(t:string,b:Box,s:number,gap=2.2,id=0)=>{
  const w=textWidth(t,s),mx=(b[0]+b[2])/2,my=(b[1]+b[3])/2;
  for(const turn of [false,true]){
   const hw=(turn?s:w)/2,hh=(turn?w:s)/2;
   for(const [cx,cy] of [[b[2]+gap+hw,my],[b[0]-gap-hw,my],[mx,b[1]-gap-hh],[mx,b[3]+gap+hh]]){
    if(free(cx-hw-.6,cy-hh-.6,cx+hw+.6,cy+hh+.6,id)){text(t,cx,cy,s,turn);return true}
   }
  }
  return false;
 };
 const next=(prefix:string)=>{count[prefix]=(count[prefix]??0)+1;return prefix+count[prefix]};
 const wanted:{prefix:string;b:Box;s:number;id:number}[]=[];
 const want=(prefix:string,b:Box,s:number)=>{wanted.push({prefix,b,s,id:fp})};

 // Bodies of everything modelled by hand, and the runs of hose and bracket above the board, keep lettering out from under them.
 for(const f of footprints)if(!f.on)mark(f.b[0],f.b[1],f.b[2],f.b[3],BODY);
 for(const h of HOSES)for(let i=0;i<h.pts.length-1;i++){const [x0,y0]=h.pts[i],[x1,y1]=h.pts[i+1],n=Math.ceil(Math.hypot(x1-x0,y1-y0)/6),r=h.r/PX+3;for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,y=y0+(y1-y0)*k/n;mark(x-r,y-r,x+r,y+r,BODY)}}
 for(const [x0,y0,x1,y1,w] of PLATE){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/8),r=w/2+2;for(let k=0;k<=n;k++){const x=x0+(x1-x0)*k/n,y=y0+(y1-y0)*k/n;mark(x-r,y-r,x+r,y+r,BODY)}}

 // ── Memory slots: a comb of gold lands under each contact row. ──
 for(const s of SLOTS){
  fp++;const [x0,y0,x1,y1]=s.b,across=s.vertical?x1-x0:y1-y0,lane=across/s.lanes,a0=s.vertical?x0:y0,from=even((s.vertical?y0:x0)+14),to=(s.vertical?y1:x1)-14;
  for(let i=0;i<=s.lanes;i++){
   const at=even(i<s.lanes?a0+i*lane+lane*.08:a0+across-lane*.08);let k=0;
   for(let t=from;t<=to;t+=8){if(s.vertical)pad(at,t,7,3.4,{gold:true,grp:`${s.id}:${i}`,k:k++});else pad(t,at,3.4,7,{gold:true,grp:`${s.id}:${i}`,k:k++})}
  }
  frame(x0-2.5,y0-2.5,x1+2.5,y1+2.5,1);
 }
 fp++;{const [x0,y0,x1,y1]=SLOT_CAP,my=even((y0+y1)/2);pad(even(x0+8),my,10,20);pad(even(x1-8),my,10,20);frame(x0-2,y0-2,x1+2,y1+2)}

 // ── Processor socket: a land grid at 1.2 mm pitch, open in the middle. Only the outermost ring is routed on this layer. ──
 let lga=0;
 {
  fp++;const [x0,y0,x1,y1]=COVER.b,win=COVER.win,ax=even(x0+16),ay=even(y0+16),nx=Math.floor((x1-16-ax)/12),ny=Math.floor((y1-16-ay)/12);
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
   const x=ax+i*12,y=ay+j*12;if(x>win[0]-10&&x<win[2]+10&&y>win[1]-10&&y<win[3]+10)continue;
   // The lid's corner radius: no lands in the rounded corners.
   const dx=Math.max(x0+COVER.r-x,0,x-(x1-COVER.r)),dy=Math.max(y0+COVER.r-y,0,y-(y1-COVER.r));if(Math.hypot(dx,dy)>COVER.r-12)continue;
   const edge=i===0?'l':i===nx?'r':j===0?'t':j===ny?'b':'';
   pads.push({x,y,w:5.6,h:5.6,r:2.8,gold:true,fp,route:!!edge,grp:edge?'cpu:'+edge:undefined,k:edge==='l'||edge==='r'?j:i});lga++;
  }
  mark(x0,y0,x1,y1,BODY);
  corners(win[0]-6,win[1]-6,win[2]+6,win[3]+6,14,1);
  text('LGA'+lga,(win[0]+win[2])/2,(win[1]+win[3])/2-12,13);text('CPU1',(win[0]+win[2])/2,(win[1]+win[3])/2+12,13);
  frame(x0-3,y0-3,x1+3,y1+3,1.1);line([x0-9,y0-3,x0-3,y0-9],1.1);
 }

 // ── Lower socket: contact rows along the top and bottom of its carrier, columns under the ribbed strips, a grid in the middle. ──
 {
  fp++;const c=SOCKET2.chip,inner=SOCKET2.inner;let k=0;
  for(let x=even(c[0]+40);x<=c[2]-40;x+=6){pad(x,even(c[1]-2),3,9,{grp:'sock2:t',k});pad(x,even(c[3]+2),3,9,{gold:true,grp:'sock2:b',k:k++})}
  for(const strip of [SOCKET2.stripL,SOCKET2.stripR]){const x=even((strip[0]+strip[2])/2);for(let y=even(strip[1]+12);y<=strip[3]-12;y+=8)pad(x,y,16,3.6,{route:false})}
  for(let y=even(inner[1]+12);y<=inner[3]-12;y+=12)for(let x=even(inner[0]+12);x<=inner[2]-12;x+=12)pads.push({x,y,w:5.2,h:5.2,r:2.6,fp,route:false});
  frame(SOCKET2.frame[0]-2.5,SOCKET2.frame[1]-2.5,SOCKET2.frame[2]+2.5,SOCKET2.frame[3]+2.5,1);
 }
 // ── Lower-left socket: a ball grid under its carrier. ──
 {
  fp++;const c=SOCKET3.chip,f=SOCKET3.frame;
  for(let y=even(c[1]+10);y<=c[3]-10;y+=10)for(let x=even(c[0]+10);x<=c[2]-10;x+=10)pads.push({x,y,w:4.4,h:4.4,r:2.2,fp,route:false});
  frame(f[0]-2.5,SOCKET3.lime[1]-2.5,f[2]+2.5,f[3]+2.5,1);
 }

 // ── Hand-laid packages. Lands follow parts.ts lead for lead. ──
 for(const chip of CHIPS){
  if(chip.on)continue;
  fp++;const [x0,y0,x1,y1]=chip.b,pins=leadsOf(chip),w=x1-x0,h=y1-y0;
  if(pins){
   const long=chip.long??1,reach=7*long,mid=6*long;
   for(const side of pins.sides){
    const along=side==='l'||side==='r'?h:w,n=Math.max(2,Math.round(along/5.2)),pitch=(along-6)/n,pw=pitch*.56+.9;
    for(let i=0;i<n;i++){
     const a=3+pitch*(i+.5),o={gold:pins.metal==='gold'};
     if(side==='l')pad(x0-mid,y0+a,reach,pw,o);else if(side==='r')pad(x1+mid,y0+a,reach,pw,o);else if(side==='t')pad(x0+a,y0-mid,pw,reach,o);else pad(x0+a,y1+mid,pw,reach,o);
    }
   }
   dot(x0-(pins.sides.includes('l')?2:4),y0-(pins.sides.includes('t')?2:4),1.3);
  }else{
   // Leadless: a row of fine lands under each edge and an exposed centre land.
   const row=(n:number,place:(t:number)=>void,len:number)=>{const span=(n-1)*4;for(let i=0;i<n;i++)place(even(len/2-span/2)+i*4)};
   const nx=Math.max(2,Math.floor((w-10)/4)),ny=Math.max(2,Math.floor((h-10)/4));
   row(nx,t=>{pad(x0+t,y0+1,2.2,5);pad(x0+t,y1-1,2.2,5)},w);row(ny,t=>{pad(x0+1,y0+t,5,2.2);pad(x1-1,y0+t,5,2.2)},h);
   if(Math.min(w,h)>=30)pads.push({x:(x0+x1)/2,y:(y0+y1)/2,w:w-18,h:h-18,r:2,fp,route:false});
   dot(x0-3.4,y0-3.4,1.3);
  }
  corners(x0-2.2,y0-2.2,x1+2.2,y1+2.2,Math.min(5,w*.2));
  want(chip.id.startsWith('q')?'Q':'U',[x0-(pins?.sides.includes('l')?10:3),y0-(pins?.sides.includes('t')?10:3),x1+(pins?.sides.includes('r')?10:3),y1+(pins?.sides.includes('b')?10:3)],Math.min(w,h)>=40?8:6.5);
 }
 // ── Traced packages. ──
 for(const ic of ICS){
  fp++;const [x0,y0,x1,y1]=ic.b,w=x1-x0,h=y1-y0,has=(s:string)=>ic.pins.some(p=>p[0]===s);
  for(const [side,n] of ic.pins){
   const along=side==='l'||side==='r'?h:w,pw=Math.min(along/n*.5,3.4)+.9;
   for(let i=0;i<n;i++){const a=along*(i+.5)/n;if(side==='l')pad(x0-6,y0+a,7,pw);else if(side==='r')pad(x1+6,y0+a,7,pw);else if(side==='t')pad(x0+a,y0-6,pw,7);else pad(x0+a,y1+6,pw,7)}
  }
  if(!ic.pins.length){const n=Math.max(2,Math.floor((w-8)/4)),m=Math.max(2,Math.floor((h-8)/4));for(let i=0;i<n;i++){const t=even(w/2-(n-1)*2)+i*4;pad(x0+t,y0+1,2.2,5);pad(x0+t,y1-1,2.2,5)}for(let i=0;i<m;i++){const t=even(h/2-(m-1)*2)+i*4;pad(x0+1,y0+t,5,2.2);pad(x1-1,y0+t,5,2.2)}}
  mark(x0,y0,x1,y1,BODY);
  if(!ic.small){corners(x0-2,y0-2,x1+2,y1+2,3);dot(x0-(has('l')?2:3.2),y0-(has('t')?2:3.2),1.1)}
  want(ic.small?'Q':'U',[x0-(has('l')?10:2),y0-(has('t')?10:2),x1+(has('r')?10:2),y1+(has('b')?10:2)],6);
 }

 // ── Blocks: inductors, ferrites, cans and headers get a land at each end; connectors get rows of plated holes. ──
 const holes=(b:Box,inset:number,pitch:number,route:boolean)=>{
  const [x0,y0,x1,y1]=b,w=x1-x0,h=y1-y0,tall=h>w,long=tall?h:w,n=Math.max(2,Math.floor((long-inset*2)/pitch)+1),start=((tall?y0:x0)+long/2)-(n-1)*pitch/2;
  const rows=Math.min(w,h)>=56?[.3,.7]:[.5];
  for(const f of rows)for(let i=0;i<n;i++){const t=even(start+i*pitch),a=even((tall?x0:y0)+Math.min(w,h)*f);pad(tall?a:t,tall?t:a,8,8,{hole:2,r:4,route});}
 };
 const PREFIX:[RegExp,string][]=[[/^f\d/,'FB'],[/^l[0-9a-c]/,'L'],[/^t\d/,'J'],[/^g\d/,'L'],[/^hs/,'HS'],[/^cap/,'C'],[/^sq/,'C'],[/^x-s\d/,'Y'],[/^x-osc/,'Y'],[/^x-or/,'C'],[/^x-w/,'U'],[/^x-gp/,'C'],[/^x-diode/,'D'],[/^x-ind/,'L'],[/^x-fin/,'HS'],[/^x-fp/,'R'],[/^x-/,'J'],[/^e|^h-/,'J'],[/^cpu/,'J']];
 for(const k of BLOCKS){
  if(k.on||k.label==='custom')continue;
  const [x0,y0,x1,y1]=k.b,w=x1-x0,h=y1-y0,long=Math.max(w,h),short=Math.min(w,h),tall=h>w,mx=(x0+x1)/2,my=(y0+y1)/2;
  if(k.asm==='cooling'){
   // Only the big seats print anything: an outline and a plated fixing at each corner.
   if(short<180)continue;
   fp++;frame(x0+3,y0+3,x1-3,y1-3,1);for(const [x,y] of [[x0+20,y0+20],[x1-20,y0+20],[x1-20,y1-20],[x0+20,y1-20]])if(y>12)pads.push({x,y,w:16,h:16,r:8,hole:4.6,fp,route:false});
   continue;
  }
  fp++;
  if(k.id==='x-header'){for(let x=x0+2,i=0;x<x1-3;x+=6.4,i++)pad(x+1.8,y1+1,3.6,9,{grp:'hdr',k:i});frame(x0-2,y0-2,x1+2,y1-4);continue}
  if(k.asm==='ports'||k.label==='slots'||k.id==='x-conn'){
   if(short>=30)holes(k.b,10,14,x0>40&&x1<IMG.w-2||short>=90);else if(long>=24){pad(tall?mx:x0+5,tall?y0+5:my,tall?short-1:8,tall?8:short-1,{route:false});pad(tall?mx:x1-5,tall?y1-5:my,tall?short-1:8,tall?8:short-1,{route:false})}
   frame(x0-2,y0-2,Math.min(x1+2,IMG.w-3),y1+2);if(short>=30)want('J',[x0-3,y0-3,x1+3,y1+3],8);continue;
  }
  if(k.id==='x-goldframe'){for(const [x,y] of [[x0+6,y0+6],[x1-6,y0+6],[x1-6,y1-6],[x0+6,y1-6]])pad(x,y,8,8,{gold:true,route:false});frame(x0-2,y0-2,x1+2,y1+2);continue}
  const pa=Math.max(3,Math.min(9,long*.24)),pc=long/2-pa/2+1.2,pw=short+1.4;
  if(tall){pad(mx,my-pc,pw,pa);pad(mx,my+pc,pw,pa)}else{pad(mx-pc,my,pa,pw);pad(mx+pc,my,pa,pw)}
  if(long>=30)frame(x0-2,y0-2,x1+2,y1+2);
  want(PREFIX.find(([re])=>re.test(k.id))?.[1]??'J',[x0-3,y0-3,x1+3,y1+3],long>=40?7.5:6);
 }

 // ── Round parts: cans on two lands with a polarity mark, posts and bosses on plated holes, coin lands as test points. ──
 for(const p of ROUNDS){
  if(p.on)continue;
  fp++;const [x,y]=p.c,r=p.r,b:Box=[x-r-3,y-r-3,x+r+3,y+r+3];
  if(p.style==='silverCan'||p.style==='blackCan'||p.style==='goldCan'){
   pad(even(x-r*.8),even(y),r*.62,r*.44);pad(even(x+r*.8),even(y),r*.62,r*.44);
   const q=r+2.5,c=r*.42;line([x-q+c,y-q,x+q,y-q,x+q,y+q,x-q+c,y+q,x-q,y+q-c,x-q,y-q+c,x-q+c,y-q],1);
   line([x-q-5,y-q+2,x-q-1,y-q+2],1);line([x-q-3,y-q,x-q-3,y-q+4],1);want('C',b,8);
  }else if(p.style==='goldPad'||p.style==='pad'){
   pads.push({x,y,w:r*2,h:r*2,r,gold:p.style==='goldPad',fp,route:false});ring(x,y,r+3,.9);want('TP',b,6.5);
  }else{
   const n=r>=50?4:r>=40?3:2;for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/4;pads.push({x:even(x+Math.cos(a)*r*.52),y:even(y+Math.sin(a)*r*.52),w:12,h:12,r:6,hole:3.2,fp,route:false})}
   ring(x,y,r+2.5,1);if(p.style!=='boss')want('J',b,8);
  }
 }
 // ── Status LEDs. ──
 for(const led of LED_AT){fp++;const [x,y]=led.p;pad(x-3.8,y,3.2,6.4);pad(x+3.8,y,3.2,6.4);mark(x-5,y-3.5,x+5,y+3.5,fp);line([x-7.4,y-4.6,x-7.4,y+4.6],.9);want('D',[x-8,y-5,x+8,y+5],6)}

 // ── Small parts: two lands each, exactly under the terminals. ──
 const firstSpot=fp+1;
 for(const s of spots){
  fp++;const {pc,pa,pw}=landOf(s);
  if(s.turn){pad(s.x,s.y-pc,pw,pa);pad(s.x,s.y+pc,pw,pa)}else{pad(s.x-pc,s.y,pa,pw);pad(s.x+pc,s.y,pa,pw)}
  mark(s.x-s.w/2,s.y-s.d/2,s.x+s.w/2,s.y+s.d/2,fp);
 }
 // Outlines round the small parts go on afterwards, and only where they foul nobody else's lands.
 spots.forEach((s,i)=>{
  if(s.cls===0)return;
  const id=firstSpot+i,{pc,pa,pw}=landOf(s),ha=pc+pa/2+1.4,hx=Math.max(pw,Math.min(s.w,s.d))/2+1.4,b:Box=s.turn?[s.x-hx,s.y-ha,s.x+hx,s.y+ha]:[s.x-ha,s.y-hx,s.x+ha,s.y+hx];
  if(!free(b[0]-.3,b[1]-.3,b[2]+.3,b[3]+.3,id))return;
  // Two side rails for chips; a full box for larger bodies.
  if(s.cls<0)frame(...b,.8);else if(s.turn){line([b[0],s.y-pc+pa/2+.6,b[0],s.y+pc-pa/2-.6],.7);line([b[2],s.y-pc+pa/2+.6,b[2],s.y+pc-pa/2-.6],.7)}else{line([s.x-pc+pa/2+.6,b[1],s.x+pc-pa/2-.6,b[1]],.7);line([s.x-pc+pa/2+.6,b[3],s.x+pc-pa/2-.6,b[3]],.7)}
 });

 // ── Lettering that is placed by hand: net names, the slot names, the board's own block. Authored first so designators give way. ──
 const big=(t:string,x:number,y:number,s:number,turn=false)=>{const w=textWidth(t,s)/2,h=s/2;if(turn?free(x-h-1,y-w-1,x+h+1,y+w+1):free(x-w-1,y-h-1,x+w+1,y+h+1)){text(t,x,y,s,turn,.14);return true}return false};
 // A name beside something: slide along the given span until there is room.
 // Board identity, in the clear strip down the left edge and the block at the lower left.
 const must=(t:string,x:number,y:number,sz:number,turn=false)=>{if(!big(t,x,y,sz,turn))missed.push(t)};
 must('VERDANT MB-160',34,1600,13,true);must('REV 1.07',54,1600,8,true);
 must('94V-0  2614  E120417',150,2449,6);must('VERDANT MB-160',150,2466,11);must('PN 60-0417-02  REV 1.07',150,2482,7);
 fills.push([24,2530,84,2548]);mark(22,2528,86,2550,TEXT);must('S/N',104,2539,6);
 must('MADE FOR ABSURD DEVICES',548,2572,6);
 // Slot names: on the board beside each slot where there is room, and repeated under the slot for the exploded view.
 const [dl,dr,db]=SLOTS;
 // Search a band beside something for room, nearest first.
 const beside=(t:string,s:number,turn:boolean,x0:number,y0:number,x1:number,y1:number,step=4)=>{for(let x=x0;x1>x0?x<=x1:x>=x1;x+=x1>x0?step:-step)for(let y=y0;y1>y0?y<=y1:y>=y1;y+=y1>y0?step:-step)if(big(t,x,y,s,turn))return true;missed.push(t);return false};
 beside('DIMM_A1',7,true,dl.b[2]+8,dl.b[1]+50,dl.b[2]+60,dl.b[1]+420);beside('DIMM_A2',7,true,dl.b[2]+8,dl.b[3]-50,dl.b[2]+60,dl.b[3]-420);
 beside('DIMM_B1',7,true,dr.b[0]-8,dr.b[1]+50,dr.b[0]-60,dr.b[1]+420);beside('DIMM_B2',7,true,dr.b[0]-8,dr.b[3]-50,dr.b[0]-60,dr.b[3]-420);
 beside('DIMM_C1-C4',7,false,db.b[0]+60,db.b[1]-8,db.b[2]-60,db.b[1]-40,6);
 for(const s of SLOTS)for(let i=0;i<s.lanes;i++){
  const lane=(s.vertical?s.b[2]-s.b[0]:s.b[3]-s.b[1])/s.lanes,name=`DIMM_${s.id==='dimm-left'?'A':s.id==='dimm-right'?'B':'C'}${i+1}`;
  if(s.vertical)text(name,s.b[0]+(i+.5)*lane,(s.b[1]+s.b[3])/2,11,true);else text(name,(s.b[0]+s.b[2])/2,s.b[1]+(i+.5)*lane,11);
 }
 // Net and function names near what they belong to.
 const NAMES:[string,number,number,number,boolean?][]=[
  ['CPU_VRM',70,620,9],['VCORE 1V05',70,636,6],['ATX_12V',34,1474,7,true],['JTAG',494,896,7],['PUMP_HDR',1250,300,7],['SYS_FAN1',680,2351,7],
  ['SPI_FLASH',1146,1920,6],['PWR_SW',1420,2330,6],['USB3_1',1440,640,6],['LAN1',1440,1480,6],['AUDIO',1440,1840,6],['SATA_1-4',1330,2410,6],
  ['GND',40,152,7],['+12V',228,182,7],['+3V3',1218,372,6],['BMC_SKT',70,2420,7],['TPM',1040,1700,6],['DEBUG',356,2394,6],
 ];
 for(const [t,x,y,s,turn] of NAMES)if(!big(t,x,y,s,!!turn)){let done=false;for(let r=8;r<=56&&!done;r+=8)for(let a=0;a<8&&!done;a++)done=big(t,x+Math.round(Math.cos(a*Math.PI/4)*r),y+Math.round(Math.sin(a*Math.PI/4)*r),s,!!turn);if(!done)missed.push(t)}

 // ── Reference designators: beside each part where there is clear board, numbered in reading order. ──
 for(const w of wanted){const name=next(w.prefix);if(!label(name,w.b,w.s,2.2,w.id))count[w.prefix]--}
 spots.forEach((s,i)=>{
  const prefix=s.cls<0?(s.type==='res'?'R':'L'):s.type==='res'?'R':s.type==='metal'&&s.cls>=2?'L':'C',{pc,pa,pw}=landOf(s),ha=pc+pa/2+1.6,hx=Math.max(pw,Math.min(s.w,s.d))/2+1.6;
  const b:Box=s.turn?[s.x-hx,s.y-ha,s.x+hx,s.y+ha]:[s.x-ha,s.y-hx,s.x+ha,s.y+hx],name=next(prefix);
  if(s.cls===0||!label(name,b,s.cls===1?5:6,2,firstSpot+i))count[prefix]--;
 });
 // Fiducials and a row of test points where the board is clear.
 for(const [x,y] of [[40,232],[1470,2570],[330,2570]] as [number,number][])if(free(x-9,y-9,x+9,y+9)){fp++;pads.push({x,y,w:5,h:5,r:2.5,fp,route:false});ring(x,y,7.5,.6);mark(x-9,y-9,x+9,y+9,TEXT)}
 return cached={pads,silk,circles,fills,names,missed,count};
}
