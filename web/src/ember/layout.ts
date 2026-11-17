// Ember layout, traced from assets/board-2-reference.png (1740 × 2589 px).
// The image is a rounded card that the board fills edge to edge, so the card is the board.
// Scale: 1 px = 0.1 mm, giving a 174 × 258.9 mm board. Origin at the image centre, pixel (870, 1294.5).
// X right, Z toward the image bottom, Y up. Every box below is written in reference pixels [x0, y0, x1, y1]
// and converted once; heights are estimates in mm above the board face (there is no side view to trace).
import {TRACED,TRACED_CLASSES} from './traced';
import type {AssemblyId} from './model';

export type P2=[number,number];
export const IMG={w:1740,h:2589};
export const PX=.1;                                   // mm per reference pixel
export const CARD={w:IMG.w*PX,d:IMG.h*PX,r:10,y0:0,y1:1.6};
export const B=CARD.y1;                                // board face height
export const mm=(px:number,py:number):P2=>[(px-IMG.w/2)*PX,(py-IMG.h/2)*PX];

// Finishes name a material in parts.ts.
export type Finish='black'|'matte'|'grey'|'steel'|'white'|'brushed'|'pitted'|'darkpitted'|'brass'|'gold'|'tan'|'orange'|'glow'|'bluegrey'|'dark';
export type Kind=
 |'socket'|'package'|'ihs'|'loadplate'|'bracket'|'tab'|'screw'|'stud'      // processor
 |'window'|'die'|'rim'|'bar'|'wing'|'clamp'|'fins'                           // core
 |'washer'|'fitting'|'fan'|'dot'|'standoff'                                   // fittings
 |'slot'|'latch'                                                              // memory
 |'chip'|'pad'|'module'                                                       // controllers
 |'block'|'cap'|'jack'|'button'|'steelsocket'|'edge'                          // ports
 |'pipeend'|'clampblock'|'manifold'|'strap'                                           // heat pipes
 |'tancap'|'choke'|'ribs'|'led';                                              // board
export type Part={
 id:string;asm:AssemblyId;kind:Kind;finish:Finish;
 box:[number,number,number,number];   // reference pixels
 x:number;z:number;w:number;d:number;r?:number;  // mm, plan
 y0:number;y1:number;                 // mm above the table
 on?:string;                          // sits on (and inside the outline of) this part
 open?:[number,number,number,number]; // a frame: the opening, in pixels
 pins?:number;lead?:'quad'|'dual-x'|'dual-z';gold?:boolean;mark?:string[];vertical?:boolean;lit?:boolean;clip?:boolean;
};
type Extra=Partial<Pick<Part,'on'|'open'|'pins'|'lead'|'gold'|'mark'|'vertical'|'lit'|'clip'>>&{base?:number};
const list:Part[]=[];
// A box part from a pixel rectangle. `h` is its top above the board face; `base` lifts its underside.
function box(id:string,asm:AssemblyId,kind:Kind,finish:Finish,x0:number,y0:number,x1:number,y1:number,h:number,extra:Extra={}){
 const [x,z]=mm((x0+x1)/2,(y0+y1)/2),{base=0,...rest}=extra;
 const part:Part={id,asm,kind,finish,box:[x0,y0,x1,y1],x,z,w:(x1-x0)*PX,d:(y1-y0)*PX,y0:B+base,y1:B+h,...rest};list.push(part);return part;
}
function disc(id:string,asm:AssemblyId,kind:Kind,finish:Finish,cx:number,cy:number,rpx:number,h:number,extra:Extra={}){
 const part=box(id,asm,kind,finish,cx-rpx,cy-rpx,cx+rpx,cy+rpx,h,extra);part.r=rpx*PX;return part;
}

// ── Processor and bracket (upper centre-left) ───────────────────────────────
export const BRACKET={outer:[225,345,945,1236] as const,open:[306,484,858,1097] as const,r:25,openR:38,y0:B+5,y1:B+7.4,
 // The pressed plate with its two ears, and the chamfered opening, as traced outlines.
 plate:[[225,300],[416,300],[462,343],[722,343],[770,300],[945,300],[945,1236],[225,1236]] as P2[],
 hole:[[367,484],[812,484],[866,549],[866,1056],[823,1102],[358,1102],[308,1048],[308,552]] as P2[],
 paint:[215,290,955,1246] as const};
box('socket','cpu','socket','black',318,496,846,1085,3.4);
box('package','cpu','package','matte',372,510,800,1040,4.5,{on:'socket',base:3.4});
box('ihs','cpu','ihs','grey',430,653,740,970,6.4,{on:'package',base:4.5,mark:['EMBER X9-7950K','ABSURD DEVICES','3.80GHZ  SR4KL','L514C877']});
box('loadplate','cpu','loadplate','dark',345,497,827,1066,4.9,{on:'socket',base:3.4,open:[368,506,804,1044]});
box('bracket','cpu','bracket','brushed',225,345,945,1236,7.4,{base:5,open:[306,484,858,1097]});
box('tab-l','cpu','tab','brushed',232,300,450,345,7.4,{base:5});
box('tab-r','cpu','tab','brushed',730,300,938,345,7.4,{base:5});
export const SCREWS:[number,number][]=[[327,415],[848,410],[328,1168],[845,1168]];
SCREWS.forEach(([x,y],i)=>disc(`screw-${i}`,'cpu','screw','brass',x,y,40,9.2,{on:'bracket',base:5}));
([[273,377],[903,382],[270,1207],[903,1210]] as const).forEach(([x,y],i)=>disc(`stud-${i}`,'cpu','stud','steel',x,y,15,8,{on:'bracket',base:7.4}));

// ── Core: the glowing socket and its weathered shroud (lower centre-left) ───
export const WINDOW=[368,1642,825,2180] as const;
export const DIE=[495,1800,700,1972] as const;
box('core-socket','core','socket','black',366,1640,828,2182,1.2);
box('window','core','window','glow',368,1642,825,2180,1.5,{on:'core-socket',base:1.2});
box('die','core','die','glow',495,1800,700,1972,3,{on:'window',base:1.5});
box('rim','core','rim','darkpitted',332,1622,860,2198,6.6,{open:[366,1640,828,2182]});
box('top-bar','core','bar','pitted',398,1506,770,1620,8.6);
box('wing-l','core','wing','pitted',200,1712,330,2090,7.2);
box('wing-r','core','wing','pitted',862,1712,988,2052,7.2);
box('bottom-bar','core','bar','darkpitted',417,2200,778,2305,7.6);
box('clamp-tr','core','clamp','black',772,1451,846,1620,5.4);
box('clamp-bl','core','clamp','black',348,2212,415,2300,5.6);
box('clamp-br','core','clamp','black',780,2205,850,2300,5.6);
box('fins-l','core','fins','steel',182,1800,199,2040,3);
box('fins-r','core','fins','steel',989,1785,1002,2040,3);

// ── Heat pipes ──────────────────────────────────────────────────────────────
// Centre lines in pixels; the tube radius is 3.5 mm (70 px wide in the image).
export const PIPE={r:3.5,y:B+4.3,
 left:[[135,392],[135,520],[135,650],[135,780],[135,900],[130,975],[108,1050],[66,1118],[4,1183]] as P2[],
 right:[[1035,392],[1035,520],[1035,650],[1035,780],[1035,935],[1044,1005],[1076,1066],[1130,1116],[1186,1166],[1214,1226],[1220,1300]] as P2[],
 collars:[[135,908],[1035,943],[1220,1256]] as P2[],
};
export const BAR={y:1297,x0:307,x1:865,thick:[392,800] as const,r:3.1,thin:2,h:B+4};
disc('pipe-end-l','pipes','pipeend','white',133,380,52,9);
disc('pipe-end-r','pipes','pipeend','steel',1037,378,55,9);
box('bar-clamp-l','pipes','clampblock','steel',233,1262,307,1332,6.5);
box('bar-clamp-r','pipes','clampblock','steel',865,1262,943,1330,6.5);
box('strap-l','pipes','strap','steel',89,505,181,535,8.4);
box('strap-r','pipes','strap','steel',989,455,1081,485,8.4);
export const MANIFOLD:P2[]=[[1160,1318],[1335,1318],[1335,1426],[1278,1548],[1228,1548],[1160,1434]];
box('manifold','pipes','manifold','black',1160,1318,1335,1560,8.5,{mark:['<>']});

// ── Fittings ────────────────────────────────────────────────────────────────
disc('fit-tl','fittings','fitting','orange',220,1582,88,8,{lit:true});
disc('fit-tr','fittings','fitting','gold',962,1574,94,8.5);
disc('fit-bl','fittings','fitting','orange',222,2235,92,8,{lit:true});
disc('fit-br','fittings','fitting','steel',985,2235,85,7.5,{lit:true});
disc('washer-0','fittings','washer','brass',130,1257,52,3);
disc('washer-1','fittings','washer','brass',130,1440,52,3.4);
disc('washer-2','fittings','washer','brass',1035,1260,52,3);
disc('washer-3','fittings','washer','brass',1030,1440,55,3.6);
disc('fan-top','fittings','fan','gold',1684,160,56,2.2);
disc('fan-low','fittings','fan','gold',1684,2298,56,2.2,{lit:true});
disc('standoff','fittings','standoff','steel',95,262,34,6);
disc('standoff-screw','fittings','stud','steel',173,310,13,1.2);
export const DOTS:[number,number][]=[[377,2380],[443,2380],[668,2380],[718,2380],[767,2380],[828,2380]];
DOTS.forEach(([x,y],i)=>disc(`dot-${i}`,'fittings','dot','orange',x,y,20,1,{lit:true}));
disc('post-0','fittings','stud','steel',960,1125,11,3.5);
disc('post-1','fittings','stud','steel',960,1155,11,3.5);

// ── Memory ──────────────────────────────────────────────────────────────────
// Four upright slots (two short double rows, two long) and two long slots across the bottom.
export const THIN:[number,number][]=[[1402,1425],[1432,1453],[1459,1479],[1486,1507]];
THIN.forEach(([x0,x1],i)=>box(`slot-s${i}`,'memory','slot','black',x0,738,x1,1620,5.2,{vertical:true}));
box('slot-l0','memory','slot','black',1562,400,1617,1620,5.2,{vertical:true});
box('slot-l1','memory','slot','black',1668,400,1722,1620,5.2,{vertical:true});
THIN.forEach(([x0,x1],i)=>box(`latch-s${i}`,'memory','latch','black',x0-1,680,x1+1,738,7));
box('latch-l0','memory','latch','black',1560,338,1619,400,7);
box('latch-l1','memory','latch','black',1666,340,1724,400,7);
box('slot-h0','memory','slot','black',170,2415,1090,2475,5.2);
box('slot-h1','memory','slot','black',170,2520,1090,2575,5.2);
box('latch-h0','memory','latch','black',85,2410,170,2478,7);
box('latch-h1','memory','latch','black',85,2512,170,2578,7);
box('latch-h2','memory','latch','black',1090,2418,1225,2475,7);
box('latch-h3','memory','latch','black',1090,2522,1225,2565,7);
// Mid-span retention clips ride on the slots.
export const CLIPS:[string,number,number,number,number][]=[['slot-s1',1430,1098,1455,1138],['slot-s3',1484,1098,1509,1138],['slot-l0',1562,1098,1617,1138],['slot-l1',1666,1098,1720,1138]];

// ── Controllers ─────────────────────────────────────────────────────────────
box('ctl-a','chips','chip','black',1372,322,1492,470,2.4,{mark:['VANTA','VT8237S','A2514CD','K7Q42.1']});
box('ctl-b','chips','chip','black',1385,490,1467,592,2.2,{pins:9,lead:'dual-x',mark:['ORLA','OR5P21A','2511 H4']});
box('ctl-c','chips','chip','black',1295,680,1383,815,2.4,{mark:['I  I']});
box('ctl-d','chips','chip','black',1255,850,1373,983,3,{mark:['o']});
box('ctl-soic','chips','chip','black',1262,280,1338,330,2,{pins:8,lead:'dual-x',mark:['KESTREL','KS24C64','2509']});
box('ctl-label','chips','chip','grey',1181,1713,1293,1856,2.2,{mark:['NUMA','NM6-240','12V 6A  2514']});
box('ctl-q1','chips','chip','black',1285,1592,1350,1640,1.8,{pins:10,lead:'quad',gold:true,mark:['TESSEL','TS8111H','2512']});
box('ctl-q2','chips','chip','black',1578,1742,1645,1812,1.8,{pins:11,lead:'quad',gold:true,mark:['HALCYON','HC32F407','2514 B3']});
box('ctl-q3','chips','chip','black',1682,1748,1736,1818,1.8,{pins:10,lead:'quad',gold:true,mark:['ORLA','OR211','2510']});
box('ctl-q4','chips','chip','black',1692,1856,1736,1906,1.8,{pins:8,lead:'quad',gold:true,mark:['KS','8851','514']});
box('ctl-q5','chips','chip','black',1188,2090,1266,2140,1.6,{pins:9,lead:'quad',mark:['VANTA','VT6105','2510']});
box('ctl-q6','chips','chip','black',1188,2210,1266,2254,1.6,{pins:9,lead:'quad',mark:['TESSEL','TS2545','2513']});
box('ctl-reg','chips','chip','black',1605,1690,1660,1720,3.2,{pins:5,lead:'dual-z',mark:['OR1117','3V3 514']});
box('ctl-sq','chips','chip','black',1288,2172,1315,2195,1.6,{mark:['A7W']});
box('ctl-ic','chips','chip','grey',1527,2315,1552,2365,1.6,{pins:5,lead:'dual-x',mark:['K4N','514']});
box('ctl-vr','chips','chip','black',600,1452,650,1500,2.2,{pins:5,lead:'quad',mark:['NUMA','NM3842','2508']});
box('ctl-t0','chips','chip','black',1299,991,1330,1010,1.2,{pins:3,lead:'dual-z',mark:['T4G']});
box('pad','chips','pad','orange',1398,1668,1500,1770,2.6);
box('module-cap','chips','module','black',1655,1945,1736,2000,7.5,{mark:['HALCYON','HC-WL2','2514']});
box('module','chips','module','bluegrey',1652,2004,1736,2092,6.5,{mark:['EMBER LINK','WL-2 MODULE','FW 1.04','SN 2514-0087']});

// ── Ports and tall parts along the edges ────────────────────────────────────
box('corner-block','ports','block','white',0,0,140,115,13,{clip:true});
box('jack','ports','jack','black',170,8,330,105,11);
box('jack-foot','ports','block','black',178,120,256,228,4);
box('dome','ports','block','black',340,15,452,188,8);
box('dome-cap','ports','button','steel',346,52,447,168,12,{on:'dome',base:8});
([[462,98,484,117],[464,125,486,148],[462,160,484,178]] as const).forEach(([a,b,c,d],i)=>box(`tact-${i}`,'ports','button','dark',a,b,c,d,2.2));
box('block-a','ports','block','grey',492,0,605,150,9,{mark:['NUMA','NM-8P 12V','16A  2514']});
box('block-b','ports','block','grey',628,0,692,175,12);
box('block-c','ports','block','grey',713,3,832,170,12,{mark:['KESTREL','KS-4421','2512']});
box('block-c-foot','ports','block','black',716,174,830,232,5);
box('steel-socket','ports','steelsocket','white',845,0,932,152,13);
box('steel-socket-foot','ports','block','black',847,155,930,185,7);
box('white-block','ports','block','white',936,85,985,152,10);
([[1017,37,30],[1015,130,29],[1128,35,29],[1127,128,26],[1195,37,30],[1192,127,28]] as const).forEach(([x,y,r],i)=>disc(`cap-${i}`,'ports','cap','white',x,y,r,11.5));
box('cap-block','ports','block','white',1062,80,1094,120,7);
box('tower-0','ports','block','grey',1282,0,1440,178,16);
box('tower-1','ports','block','grey',1460,0,1610,178,16);
box('dip','ports','button','white',1187,202,1252,230,2.6);
box('edge-0','ports','edge','black',0,1320,40,1470,6);
box('edge-1','ports','edge','black',0,1905,27,2105,4.5);
box('edge-2','ports','edge','black',10,2432,65,2504,6);
box('edge-3','ports','edge','black',1655,2130,1736,2185,7);
box('edge-4','ports','block','black',1626,2385,1736,2480,9,{mark:['ORLA','OR-T110','2511']});
box('edge-5','ports','block','grey',1645,2484,1712,2552,7);
box('edge-tab','ports','block','black',1608,2396,1626,2470,5);

// ── Larger passives on the board ────────────────────────────────────────────
([[1282,535,1310,592],[1320,543,1340,592],[1347,538,1373,592],[1320,608,1343,625],[1320,633,1343,655],[1272,405,1332,425],[1520,255,1560,275],
  [52,1622,80,1668],[93,1622,122,1668],[728,1432,748,1468],[1510,975,1528,1036]] as const).forEach(([a,b,c,d],i)=>box(`tan-${i}`,'components','tancap','tan',a,b,c,d,i<3?3:2));
([[1288,1257,1310,1312],[1322,1257,1343,1312]] as const).forEach(([a,b,c,d],i)=>box(`gold-${i}`,'components','tancap','gold',a,b,c,d,4));
[528,563,600,636,672].forEach((y,i)=>box(`sq-${i}`,'components','tancap','tan',1627,y-8,1644,y+9,1.6));
[1640,1665,1690].forEach((x,i)=>box(`pad3-${i}`,'components','tancap','tan',x-8,294,x+8,311,1.4));
([[505,533],[542,572],[582,612]] as const).forEach(([x0,x1],i)=>box(`choke-${i}`,'components','choke','brass',x0,1361,x1,1441,2.9));
box('ribs','components','ribs','black',175,595,222,960,3);
// Small indicator lamps: three red ones under block C, the rest amber.
export const LEDS:{x:number;y:number;red?:boolean;group:number}[]=[
 {x:745,y:207,red:true,group:0},{x:767,y:207,red:true,group:1},{x:789,y:207,red:true,group:2},{x:410,y:1392,red:true,group:3},
 {x:1410,y:1890,group:0},{x:1410,y:1928,group:1},{x:1608,y:1848,group:2},{x:1537,y:2158,group:3},{x:1537,y:2205,group:0},
 {x:1421,y:2228,group:1},{x:1422,y:2270,group:2},{x:1344,y:2303,group:3},{x:1345,y:2341,group:0},{x:1440,y:2331,group:1},{x:1503,y:2320,group:2},{x:1571,y:2415,group:3},
];
LEDS.forEach((l,i)=>box(`led-${i}`,i<3?'ports':'components','led','orange',l.x-8,l.y-11,l.x+8,l.y+11,i<3?5.5:1.1,i<3?{lit:true,on:'block-c-foot',base:5}:{lit:true}));

export const parts=list;
export const at=(id:string)=>{const p=list.find(p=>p.id===id);if(!p)throw new Error(`Unknown part ${id}`);return p};
export const of=(kind:Kind)=>list.filter(p=>p.kind===kind);

// ── Geometry tests share these ──────────────────────────────────────────────
export type Rect=[number,number,number,number];
// The plan rectangles a part really covers, in pixels: a frame is four bands round its opening.
export function solids(p:Part):Rect[]{
 const [x0,y0,x1,y1]=p.box;if(!p.open)return [p.box];
 const [a,b,c,d]=p.open;return [[x0,y0,x1,b],[x0,d,x1,y1],[x0,b,a,d],[c,b,x1,d]];
}
export function overlap(p:Part,q:Part,gap=0){
 if(p.r!==undefined&&q.r!==undefined){const dx=(p.box[0]+p.box[2]-q.box[0]-q.box[2])/2,dy=(p.box[1]+p.box[3]-q.box[1]-q.box[3])/2;return Math.hypot(dx,dy)<(p.r+q.r)/PX-gap}
 const round=p.r!==undefined?p:q.r!==undefined?q:null;
 if(round){
  const other=round===p?q:p,cx=(round.box[0]+round.box[2])/2,cy=(round.box[1]+round.box[3])/2,r=round.r!/PX-gap;
  return solids(other).some(([x0,y0,x1,y1])=>Math.hypot(cx-Math.max(x0,Math.min(cx,x1)),cy-Math.max(y0,Math.min(cy,y1)))<r);
 }
 return solids(p).some(([a0,b0,a1,b1])=>solids(q).some(([c0,d0,c1,d1])=>a0<c1-gap&&c0<a1-gap&&b0<d1-gap&&d0<b1-gap));
}
// Inside the rounded card, in pixels.
export function inCard(x:number,y:number,inset=0){
 const r=CARD.r/PX,x0=inset,y0=inset,x1=IMG.w-inset,y1=IMG.h-inset;
 if(x<x0||x>x1||y<y0||y>y1)return false;
 const cx=x<r?r:x>IMG.w-r?IMG.w-r:x,cy=y<r?r:y>IMG.h-r?IMG.h-r:y;
 return Math.hypot(x-cx,y-cy)<=r-inset+1e-9;
}
const segment=(px:number,py:number,[ax,ay]:P2,[bx,by]:P2)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return Math.hypot(px-ax-dx*t,py-ay-dy*t)};
export const pipeDistance=(x:number,y:number)=>Math.min(...[PIPE.left,PIPE.right].flatMap(path=>path.slice(1).map((p,i)=>segment(x,y,path[i],p))),segment(x,y,[BAR.x0,BAR.y],[BAR.x1,BAR.y]));

// ── Small surface-mount parts ───────────────────────────────────────────────
// Traced, not placed by hand: traced.ts lists every compact bright blob the tracing script found in the reference.
// Each becomes one small part at that position, with the blob's own size and mean colour. Anything that lands on a
// modelled part is dropped.
export const SMD_CLASSES=TRACED_CLASSES;
export const smdHeight=(w:number,d:number)=>{const m=Math.min(w,d);return m<.7?.3:m<1.6?.6:1.1};
export const BODY=4;   // class of a dark body traced between two bright ends
export const CHIP=5;   // class of a dark package traced between two facing lead rows
export type Spot={x:number;z:number;w:number;d:number;h:number;colour:number;type:number;box:[number,number,number,number]};
const placed=list.filter(p=>!p.on);
export function blocked(px:number,py:number,margin:number){
 if(!inCard(px,py,margin+6))return true;
 if(pipeDistance(px,py)<PIPE.r/PX+margin)return true;
 if(px>MANIFOLD[0][0]-margin&&px<MANIFOLD[1][0]+margin&&py>MANIFOLD[0][1]-margin&&py<MANIFOLD[3][1]+margin)return true;
 return placed.some(p=>{
  const [x0,y0,x1,y1]=p.box,pad=margin+(p.pins?9:0);
  if(p.r!==undefined)return Math.hypot(px-(x0+x1)/2,py-(y0+y1)/2)<p.r/PX+pad;
  return px>x0-pad&&px<x1+pad&&py>y0-pad&&py<y1+pad;
 });
}
export const spots:Spot[]=TRACED.flatMap(([x0,y0,w,h,colour,type])=>{
 const cx=x0+w/2,cy=y0+h/2;if(blocked(cx,cy,Math.max(w,h)/2+2))return [];
 const [x,z]=mm(cx,cy);return [{x,z,w:w*PX,d:h*PX,h:type===CHIP?.9:type===BODY?Math.min(.7,smdHeight(w*PX,h*PX)+.1):smdHeight(w*PX,h*PX),colour,type,box:[x0,y0,x0+w,y0+h] as [number,number,number,number]}];
});
