// Ember's board as vectors: components, pads, holes and static silk-screen, all in reference pixels (0.1 mm).
// Nothing here is a picture. The traced blobs (layout.ts `spots`) only say where the reference has something small
// and bright; each is turned into a real part with a real footprint: a chip resistor or capacitor on two pads, a small
// chip on two rows of pads, a lamp, a crystal can, or a bare land. Lettering in the reference is unreadable, so runs of
// letter-shaped blobs are dropped and become label positions instead. Modelled parts (layout.ts `parts`) get the
// footprint they would be soldered to: land grids under the sockets, pin rows under slots and chips, plated holes
// under connectors and fittings. Routing, vias and label placement need a search and are done offline (route.ts).
import {spots,parts,blocked,SCREWS,BODY,CHIP,PX,type Part} from './layout';

export type Box=[number,number,number,number];
export type CompKind='res'|'cap'|'capw'|'tant'|'led'|'ic'|'can'|'land';
// A pad is a rounded rectangle about (x, y); `hole` makes it a plated hole. `out` (a unit direction away from its part)
// marks a pad that takes a trace; `grp` ties the pads of one part together; `fan` is the stub length for a chip pin.
export type Pad={x:number;y:number;w:number;h:number;r:number;hole?:number;bare?:boolean;out?:[number,number];grp?:number;fan?:number};
export type Comp={kind:CompKind;box:Box;axis:0|1;h:number;ref:string;code:string;tone:number;seed:number;term:number;pins:number};
export type Want={text:string;x:number;y:number;size:number;rot?:0|1;reach?:number};

const hash=(n:number)=>{let t=Math.imul(n|0,0x9e3779b1)>>>0;t^=t>>>15;t=Math.imul(t,0x85ebca6b)>>>0;t^=t>>>13;t=Math.imul(t,0xc2b2ae35)>>>0;t^=t>>>16;return (t>>>0)/4294967296};
const RES=['000','100','101','102','103','104','220','221','222','330','331','472','473','470','680','101','4R7','10R','22R','1001','4701','2202','R010','R022','49R9','1002'];
const TANT=['107A','226C','476E','336D','227A','106C','157E'],CAN=['25.000','32.768','12.000','27.120','24.576'],IC=['A7W','1AM','K4N','T4G','M6H','W2F','Z5C','P9D'];

type S={b:Box;type:number;used:boolean};
const wd=(s:S)=>s.b[2]-s.b[0],ht=(s:S)=>s.b[3]-s.b[1];
function build(){
 const raw:S[]=spots.map(s=>({b:[...s.box] as Box,type:s.type,used:false}));
 const comps:Comp[]=[],zones:Box[]=[];
 const add=(kind:CompKind,b:Box,axis:0|1,tone=0)=>{
  const w=b[2]-b[0],h=b[3]-b[1],L=Math.max(w,h),m=Math.min(w,h)*PX,seed=Math.round(b[0]*31+b[1]*17+w*7+h);
  const high=kind==='res'?(m<.7?.32:.48):kind==='ic'?.9:kind==='can'?.75:kind==='led'?.55:kind==='tant'?Math.min(1.5,.5+m*.35):kind==='land'?0:m<.7?.3:m<1.6?.6:1;
  comps.push({kind,box:b,axis,h:high,ref:'',code:'',tone,seed,term:Math.max(1.5,Math.min(5,Math.round(L*.24*2)/2)),pins:0});
 };
 // Lettering: a line of pale, letter-high blobs of uneven width (pads in a row are all alike).
 {const pale=raw.filter(s=>s.type===0&&ht(s)>=6&&ht(s)<=30).sort((a,b)=>a.b[0]-b.b[0]);
  for(const a of pale){
   if(a.used)continue;const run=[a];let last=a;
   for(;;){const n=pale.find(q=>!q.used&&!run.includes(q)&&q.b[0]>last.b[0]&&Math.abs(q.b[1]-a.b[1])<=2&&Math.abs(q.b[3]-a.b[3])<=3&&q.b[0]-last.b[2]<=6&&q.b[0]-last.b[2]>=-14);if(!n)break;run.push(n);last=n}
   if(run.length<3)continue;
   const ws=run.map(wd),mx=Math.max(...ws),mn=Math.min(...ws),over=run.some((s,i)=>i>0&&s.b[0]<run[i-1].b[2]);
   if(!(over||(mx-mn>=4&&mx/mn>=1.5)))continue;
   for(const s of run)s.used=true;
   zones.push([run[0].b[0],Math.min(...run.map(s=>s.b[1])),Math.max(...run.map(s=>s.b[2])),Math.max(...run.map(s=>s.b[3]))]);
  }}
 const share=(a:S,b:S,k:number)=>(Math.min(a.b[2+k],b.b[2+k])-Math.max(a.b[k],b.b[k]))/Math.min(a.b[2+k]-a.b[k],b.b[2+k]-b.b[k]);
 const union=(a:Box,b:Box):Box=>[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.max(a[2],b[2]),Math.max(a[3],b[3])];
 // A dark body traced between two bright ends is one chip resistor: body and both terminals.
 for(const s of raw.filter(s=>s.type===BODY)){
  s.used=true;let done=false;
  for(const ax of (wd(s)>=ht(s)?[0,1]:[1,0]) as (0|1)[]){
   const lo=raw.find(e=>!e.used&&e.type<3&&Math.abs(e.b[2+ax]-(s.b[ax]+1))<=3&&share(e,s,1-ax)>.6),hi=raw.find(e=>!e.used&&e.type<3&&e!==lo&&Math.abs(e.b[ax]-(s.b[2+ax]-1))<=3&&share(e,s,1-ax)>.6);
   if(lo&&hi){lo.used=hi.used=true;add('res',union(lo.b,hi.b),ax);done=true;break}
  }
  if(!done)add('res',s.b,wd(s)>=ht(s)?0:1);
 }
 // A dark package traced between two lead rows is a small chip; whatever was traced where its leads are goes.
 for(const s of raw.filter(s=>s.type===CHIP)){
  s.used=true;const near=(k:number)=>raw.filter(e=>!e.used&&e.type<4&&share(e,s,1-k)>.3&&(Math.abs(e.b[2+k]-s.b[k])<=12||Math.abs(e.b[k]-s.b[2+k])<=12));
  const nx=near(0),ny=near(1),ax:0|1=nx.length===ny.length?(wd(s)>=ht(s)?1:0):nx.length>ny.length?0:1;
  for(const e of ax?ny:nx)e.used=true;add('ic',s.b,ax);
 }
 // Two alike blobs facing each other across a short gap, with no third in line, are the two ends of one part.
 for(const ax of [0,1] as const){
  const cr=1-ax,cand=raw.filter(s=>!s.used&&s.type<3&&Math.max(wd(s),ht(s))<=24);
  const mate=(a:S,dir:number)=>cand.filter(b=>b!==a&&!b.used&&Math.abs(a.b[cr]+a.b[2+cr]-b.b[cr]-b.b[2+cr])<=5&&Math.abs((a.b[2+cr]-a.b[cr])-(b.b[2+cr]-b.b[cr]))<=4&&Math.abs((a.b[2+ax]-a.b[ax])-(b.b[2+ax]-b.b[ax]))<=5).filter(b=>{const gap=dir>0?b.b[ax]-a.b[2+ax]:a.b[ax]-b.b[2+ax];return gap>=2&&gap<=Math.max(9,2.4*Math.max(wd(a),ht(a)))});
  for(const a of cand){
   if(a.used)continue;const next=mate(a,1);if(next.length!==1||mate(a,-1).length)continue;
   const b=next[0];if(mate(b,1).length||mate(b,-1).length!==1)continue;
   a.used=b.used=true;add('res',union(a.b,b.b),ax);
  }
 }
 for(const s of raw){
  if(s.used)continue;const w=wd(s),h=ht(s),L=Math.max(w,h),m=Math.min(w,h),ax:0|1=w>=h?0:1;
  if(s.type===3)add('led',s.b,ax);
  else if(L/m>=3.4&&L>=18)add('land',s.b,ax);
  else if(s.type===2)add(m>=10?'tant':'cap',s.b,ax,1);
  else if(s.type===1)add(m>=16?'tant':'cap',s.b,ax,0);
  else add(m>=11&&L/m<1.5?'can':'capw',s.b,ax);
 }
 // Tidy rows and columns: parts whose centres are within a tenth of a millimetre share one line.
 for(const k of [0,1] as const){
  const order=comps.map((_,i)=>i).sort((a,b)=>comps[a].box[k]+comps[a].box[2+k]-comps[b].box[k]-comps[b].box[2+k]),c=(i:number)=>(comps[i].box[k]+comps[i].box[2+k])/2;
  for(let i=0;i<order.length;){
   let j=i+1;while(j<order.length&&c(order[j])-c(order[j-1])<=1&&c(order[j])-c(order[i])<=2)j++;
   if(j-i>1){const mean=order.slice(i,j).reduce((n,q)=>n+c(q),0)/(j-i),to=Math.round(mean*2)/2;for(const q of order.slice(i,j)){const d=to-c(q);comps[q].box[k]+=d;comps[q].box[2+k]+=d}}
   i=j;
  }
 }
 // Nothing may touch: of two parts closer than a tenth of a millimetre the smaller goes.
 const area=(q:Comp)=>(q.box[2]-q.box[0])*(q.box[3]-q.box[1]);
 const kept:Comp[]=[];
 for(const q of [...comps].sort((a,b)=>area(b)-area(a)))if(!kept.some(o=>q.box[0]<o.box[2]+1&&o.box[0]<q.box[2]+1&&q.box[1]<o.box[3]+1&&o.box[1]<q.box[3]+1))kept.push(q);
 // Reference designators in reading order.
 kept.sort((a,b)=>Math.floor((a.box[1]+a.box[3])/120)-Math.floor((b.box[1]+b.box[3])/120)||a.box[0]-b.box[0]);
 const count:Record<string,number>={R:0,C:0,D:0,U:24,Y:0,TP:0};
 for(const q of kept){
  const letter=q.kind==='res'?'R':q.kind==='led'?'D':q.kind==='ic'?'U':q.kind==='can'?'Y':q.kind==='land'?'TP':'C';q.ref=letter+(++count[letter]);
  const pick=(list:string[])=>list[Math.floor(hash(q.seed)*list.length)];
  q.code=q.kind==='res'?pick(RES):q.kind==='tant'?pick(TANT):q.kind==='can'?pick(CAN):q.kind==='ic'?pick(IC):'';
 }
 return {comps:kept,zones};
}
const built=build();
export const comps=built.comps;
export const zones=built.zones;

// ── Footprints ──────────────────────────────────────────────────────────────
export const pads:Pad[]=[];
export const drills:[number,number,number][]=[];                 // bare holes: x, y, radius
export const silkRects:[number,number,number,number,number][]=[]; // outline: x0, y0, x1, y1, corner radius
export const silkRings:[number,number,number,number][]=[];        // x, y, radius, 1 = with a filled half (polarity)
export const silkDots:[number,number,number][]=[];
const P=(x:number,y:number,w:number,h:number,r:number,extra:Partial<Pad>={})=>{pads.push({x,y,w,h,r:Math.min(r,w/2,h/2),...extra})};
const ring=(x:number,y:number,ro:number,hole:number)=>P(x,y,ro*2,ro*2,ro,{hole});
// Chip parts: a pad under each terminal, a little longer and wider than the terminal itself.
comps.forEach((q,i)=>{
 const [x0,y0,x1,y1]=q.box,a=q.axis,lo=q.box[a],hi=q.box[2+a],c0=q.box[1-a],c1=q.box[3-a],mid=(c0+c1)/2;
 const at=(u:number,v:number,lu:number,lv:number,r:number,extra:Partial<Pad>)=>a?P(v,u,lv,lu,r,extra):P(u,v,lu,lv,r,extra);
 if(q.kind==='land'){P((x0+x1)/2,(y0+y1)/2,x1-x0,y1-y0,Math.min(x1-x0,y1-y0)/2,{grp:i,out:a?[0,hash(q.seed)<.5?-1:1]:[hash(q.seed)<.5?-1:1,0]});return}
 if(q.kind==='ic'){
  // Leads leave the two sides across `axis`; the pins run along the other.
  const n=q.pins=Math.max(3,Math.round((c1-c0-3)/5)),pitch=(c1-c0)/n;
  for(let k=0;k<n;k++)for(const e of [-1,1]){const u=e<0?lo-3.5:hi+3.5,v=c0+(k+.5)*pitch;at(u,v,9,Math.min(2.8,pitch*.56),.5,{grp:i,out:a?[0,e]:[e,0],fan:k%2?13:8})}
  return;
 }
 const t=q.term;
 for(const e of [-1,1]){const u0=e<0?lo-.8:hi-t-.3,u1=e<0?lo+t+.3:hi+.8;at((u0+u1)/2,mid,u1-u0,c1-c0+.8,.6,{grp:i,out:a?[0,e]:[e,0]})}
});
// Modelled parts.
const GRP=100000;
parts.forEach((p,index)=>{
 if(p.on)return;
 const [x0,y0,x1,y1]=p.box,cx=(x0+x1)/2,cy=(y0+y1)/2,w=x1-x0,h=y1-y0,R=p.r!==undefined?p.r/PX:0,grp=GRP+index;
 const outline=(grow:number,r=2)=>silkRects.push([x0-grow,y0-grow,x1+grow,y1+grow,r]);
 const twoPads=(vertical:boolean)=>{const L=vertical?h:w,t=Math.max(3,Math.min(12,L*.24));for(const e of [-1,1]){const c=(vertical?cy:cx)+e*(L/2-t/2+.4);if(vertical)P(cx,c,w+1,t+1.4,.8,{grp,out:[0,e]});else P(c,cy,t+1.4,h+1,.8,{grp,out:[e,0]})}};
 const holes=(pitch:number,ro:number,hole:number)=>{
  const along=w>=h,L=along?w:h,S=along?h:w,rows=S>=34?[-1,1]:[0],n=Math.max(2,Math.floor((L-14)/pitch)+1),start=-(n-1)*pitch/2;
  for(const row of rows)for(let k=0;k<n;k++){const u=start+k*pitch,v=row*(S/2-11);ring(along?cx+u:cx+v,along?cy+v:cy+u,ro,hole)}
 };
 switch(p.kind){
  case 'chip':
   if(p.pins){
    const sides=p.lead==='quad'?[0,1,2,3]:p.lead==='dual-x'?[2,3]:[0,1];
    for(const side of sides){
     const across=side<2,pitch=(across?w:h)/(p.pins+1);
     for(let i=1;i<=p.pins;i++){const e=side%2?1:-1;
      if(across)P(x0+i*pitch,e<0?y0-4:y1+4,Math.max(1.6,pitch*.5),10,.5,{grp,out:[0,e],fan:i%2?8:14});
      else P(e<0?x0-4:x1+4,y0+i*pitch,10,Math.max(1.6,pitch*.5),.5,{grp,out:[e,0],fan:i%2?8:14});
     }
    }
    silkDots.push([x0-12,y0-12,1.6]);
   }else{
    // Ball grid.
    const pitch=Math.min(w,h)>=60?8:5,nx=Math.floor((w-8)/pitch),ny=Math.floor((h-8)/pitch);
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)P(cx+(i-nx/2)*pitch,cy+(j-ny/2)*pitch,pitch*.5,pitch*.5,pitch);
    outline(2.5,1);silkDots.push([x0-5,y0-5,1.6]);
   }
   break;
  case 'socket':{
   // Land grid with an open middle that holds a few decoupling capacitors.
   const pitch=10,nx=Math.floor((w-36)/pitch),ny=Math.floor((h-36)/pitch),ox=w*.17,oy=h*.17;
   for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const x=cx+(i-nx/2)*pitch,y=cy+(j-ny/2)*pitch;if(Math.abs(x-cx)<ox&&Math.abs(y-cy)<oy)continue;P(x,y,5.4,5.4,3)}
   for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){if((i+j)%2)continue;const x=cx+i*ox*.36,y=cy+j*oy*.36;P(x-3.6,y,4,6,.6);P(x+3.6,y,4,6,.6)}
   outline(3,6);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])drills.push([cx+sx*(w/2-9),cy+sy*(h/2-9),4.5]);
   break;}
  case 'slot':{
   const thin=Math.min(w,h)<30,pr=thin?2.5:5,L=p.vertical?h:w,n=Math.floor((L-24)/8.5),start=-(n-1)*8.5/2;
   for(let k=0;k<n;k++)for(const e of [-1,1]){const u=start+k*8.5,v=e*((p.vertical?w:h)/2-6+pr);if(p.vertical)P(cx+v,cy+u,12,4,.8);else P(cx+u,cy+v,4,12,.8)}
   for(const e of [-1,1]){const u=e*(L/2-7);drills.push(p.vertical?[cx,cy+u,thin?3.5:5]:[cx+u,cy,5])}
   break;}
  case 'block':case 'jack':case 'steelsocket':case 'edge':
   if(Math.min(w,h)>=30){holes(20,5.5,2.8);outline(-2,3)}else if(Math.max(w,h)>=30)holes(14,4.4,2.2);else twoPads(h>w);
   break;
  case 'module':
   if(p.id==='module'){for(let i=0;i<10;i++)P(x0-3.5,y0+6+i*(h-12)/9,9,3,.6,{grp,out:[-1,0],fan:i%2?8:14});outline(1.5,2)}
   break;
  case 'cap':ring(cx-R*.42,cy,5,2.4);ring(cx+R*.42,cy,5,2.4);silkRings.push([cx,cy,R+2.5,1]);break;
  case 'button':for(const sx of [-1,1])for(const sy of [-1,1])P(cx+sx*(w/2-1),cy+sy*(h/2-3.5),6,5,.8);break;
  case 'fitting':case 'washer':case 'standoff':case 'pipeend':case 'fan':{
   const ro=Math.min(R*.62,36),hole=ro*.5;ring(cx,cy,ro,hole);
   for(let k=0;k<8;k++){const a=k/8*Math.PI*2+.39;drills.push([cx+Math.cos(a)*(ro+hole)/2,cy+Math.sin(a)*(ro+hole)/2,1.3])}
   silkRings.push([cx,cy,R+2,0]);
   break;}
  case 'dot':P(cx-5.5,cy,7,13,1.2);P(cx+5.5,cy,7,13,1.2);silkRings.push([cx,cy,R+2,0]);break;
  case 'stud':ring(cx,cy,R*.8,R*.42);break;
  case 'clamp':case 'clampblock':ring(cx,cy,13,7);break;
  case 'strap':for(const e of [-1,1])ring(cx+e*(w/2-9),cy,7,3.5);break;
  case 'manifold':for(const x of [1208,1272])ring(x,1390,9,5);break;
  case 'tancap':case 'led':twoPads(h>=w);break;
  case 'choke':twoPads(true);break;
  case 'ribs':for(const e of [-1,1])ring(cx,cy+e*(h/2-12),9,4.5);outline(2,2);break;
  case 'pad':
   // Exposed copper under the thermal pad, stitched with a grid of vias.
   P(cx,cy,w-4,h-4,3,{bare:true});for(let j=0;j<6;j++)for(let i=0;i<6;i++)drills.push([x0+13+i*(w-26)/5,y0+13+j*(h-26)/5,1.6]);
   break;
  default:
 }
});
// The bracket's four posts go through the board.
for(const [x,y] of SCREWS)ring(x,y,28,18);

// ── Labels the board should carry ───────────────────────────────────────────
// Each is tried at its position and nudged to the nearest clear spot by the router; anything that finds no room is dropped.
const SLOT_NAMES:Record<string,string>={'slot-s0':'DIMM_A1','slot-s1':'DIMM_A2','slot-s2':'DIMM_B1','slot-s3':'DIMM_B2','slot-l0':'DIMM_C1','slot-l1':'DIMM_D1','slot-h0':'DIMM_E1','slot-h1':'DIMM_F1'};
export const wants:Want[]=[
 {text:'EMBER',x:556,y:233,size:24,reach:30},{text:'X9-M2  REV 2.04',x:556,y:256,size:8,reach:40},
 {text:'ABSURD DEVICES',x:52,y:760,size:11,rot:1,reach:90},{text:'PN 60-EM1740-A04',x:36,y:760,size:7,rot:1,reach:90},{text:'94V-0  WK2514  E318771',x:66,y:760,size:6,rot:1,reach:90},
 {text:'CORE',x:596,y:2330,size:13,reach:60},{text:'VCORE 1.24V',x:1090,y:1900,size:8,rot:1,reach:80},
 {text:'VRM',x:556,y:1470,size:11,reach:50},{text:'VRM_B',x:1326,y:675,size:8,reach:60},{text:'L1  L2  L3',x:556,y:1350,size:7,reach:40},
 {text:'DDR',x:1535,y:560,size:13,rot:1,reach:80},{text:'CPU_FAN',x:1684,y:240,size:8,reach:50},{text:'SYS_FAN1',x:1680,y:2380,size:8,reach:60},
 {text:'PWR',x:505,y:108,size:6,reach:25},{text:'RST',x:505,y:137,size:6,reach:25},{text:'CLR',x:505,y:169,size:6,reach:25},
 {text:'CPU',x:585,y:1262,size:10,reach:70},{text:'SOCKET X9',x:160,y:1150,size:8,reach:80},{text:'JTAG',x:1215,y:245,size:7,reach:50},
 {text:'BOOT_SEL',x:1220,y:190,size:6,reach:40},{text:'12V_IN',x:240,y:250,size:8,reach:60},{text:'USB3_12',x:1360,y:200,size:7,reach:50},{text:'LAN1',x:1535,y:200,size:7,reach:50},
 {text:'PUMP+',x:220,y:1470,size:7,reach:50},{text:'PUMP-',x:962,y:1690,size:7,reach:50},{text:'FLOW_IN',x:222,y:2350,size:7,reach:50},{text:'FLOW_OUT',x:985,y:2350,size:7,reach:50},
 {text:'ST1  ST2  ST3  ST4  ST5  ST6',x:600,y:2350,size:6,reach:40},{text:'HOT SURFACE',x:596,y:1478,size:7,reach:60},
 {text:'TPM',x:1420,y:1930,size:7,reach:50},{text:'WLAN',x:1620,y:2050,size:7,reach:50},{text:'DBG',x:1560,y:2240,size:7,reach:50},{text:'SPI_FLASH',x:1230,y:2060,size:6,reach:50},{text:'EC',x:1230,y:2275,size:7,reach:40},
 {text:'GND',x:1130,y:1250,size:6,reach:60},{text:'5VSB',x:1130,y:2480,size:6,reach:60},{text:'3V3',x:1300,y:2520,size:6,reach:60},{text:'+12V',x:120,y:2330,size:6,reach:60},
];
{let u=1;
 for(const p of parts){
  if(p.on)continue;const [x0,y0,x1,y1]=p.box;
  if(p.kind==='chip')wants.push({text:'U'+(u++),x:x1+12,y:y0-8,size:6.5,reach:28});
  if(p.kind==='slot')wants.push(p.vertical?{text:SLOT_NAMES[p.id],x:x0<1500?(x0+x1)/2:x0-10,y:x0<1500?y1+60:y0+150,size:x0<1500?5.5:8,rot:1,reach:60}:{text:SLOT_NAMES[p.id],x:x0+70,y:y0-9,size:7,reach:60});
  if(p.kind==='cap')wants.push({text:'EC'+p.id.slice(4),x:(x0+x1)/2,y:y1+8,size:5.5,reach:24});
  if(p.kind==='choke')wants.push({text:'L'+(+p.id.slice(6)+1),x:(x0+x1)/2,y:y1+8,size:6,reach:20});
 }
 const pool=['GND','VCC','3V3','SDA','SCL','TXD','RXD','RST','CLK','JTAG','BOOT','SPI','PWR','FAN','LED','USB','CMOS','BIOS','COM1','AUX','SMB','PWM','TACH','VBAT','NTC','EN','PG','ISP','UART','I2C'];
 zones.forEach((z,i)=>{const size=Math.max(5.5,Math.min(13,(z[3]-z[1])*.8)),fit=Math.max(2,Math.floor((z[2]-z[0])/(size*.66))),list=pool.filter(t=>t.length<=fit+1);if(list.length)wants.push({text:list[Math.floor(hash(i*97+z[0])*list.length)],x:(z[0]+z[2])/2,y:(z[1]+z[3])/2,size,reach:20})});
}
// Where silk may not go: under a modelled part.
export const hidden=(x:number,y:number)=>blocked(x,y,0);
// A fingerprint of everything the router reads, so a stale routed.ts is caught by the tests.
export const fingerprint=Math.round(pads.reduce((n,p,i)=>n+(p.x*3+p.y*7+p.w)*(1+i%13),comps.length*7919+wants.length*31))%2147483647;
export type {Part};
