// P5G-MX layout, traced from assets/p5gmx-reference.png (the top photograph, 1588 px square). No three.js in here.
//
// Board: ASUS P5G-MX, micro-ATX, 244 × 183 mm (9.6 × 7.2 in, from the ASUS manual), 1.6 mm FR4.
// World frame: millimetres, origin at the board centre, x to the right, z toward the front edge (down the photograph), y up.
// The rear I/O edge is the photograph's top edge, so it lies along −z.
//
// Pixel → millimetre mapping. The photograph is close to a top view but not orthographic: the board is a trapezoid, 1325 px wide
// along the rear edge and 1393 px along the front edge, so the camera was tilted a little toward the front. A four-corner
// homography takes photograph pixels to board millimetres:
//   rear-left (135, 300) → (0, 0)        rear-right (1460, 300) → (244, 0)
//   front-right (1503, 1323) → (244, 183) front-left (110, 1342) → (0, 183)
// which gives 5.43 px/mm along the rear edge and 5.71 px/mm along the front edge (5.6 px/mm on average).
// Hand checks against standards visible on the board (see docs/p5gmx/evidence.md):
//   24-pin ATX header, 11 pitches of 4.20 mm between the outer pin centres: 266 px → 46.2 mm (5.76 px/mm at the front edge, the
//     homography gives 5.69 there: 1 % apart).
//   CPU cooler holes, a 72 mm square: 382–392 px across, 398–401 px down → 70.3 × 71.0 mm through the homography.
//   CR2032 holder: 129 px → 23.3 mm.  PCIe ×1: 137 px → 24.7 mm (25 mm).  Northbridge FCBGA: 188 × 191 px → 34.2 × 34.6 mm (34 mm).
// Tall parts lean away from the camera's axis in the photograph, so their tops are displaced. `base()` undoes that with a pinhole
// estimate: the camera axis meets the board near photo pixel (780, 900) and the lens is about 450 mm above it (from the lean of
// the PS/2 stack and of the capacitor tops). Positions of tall parts are traced from their tops and corrected; low parts are
// traced directly.

import {BUSY,BUSY_CELL} from './traced';
import {rng} from '../kit/util';

export type Rect=[number,number,number,number];                 // x0, z0, x1, z1
export const rect=(cx:number,cz:number,w:number,d:number):Rect=>[cx-w/2,cz-d/2,cx+w/2,cz+d/2];
export const grow=(b:Rect,m:number):Rect=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m];
export const overlap=(a:Rect,b:Rect)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];

export const BOARD={w:244,d:183,t:1.6,lift:2.6,r:1.2};
export const TOP=BOARD.lift+BOARD.t;                            // world height of the board's top face

// ── Photograph ↔ board ──────────────────────────────────────────────────
export const CORNERS:[number,number][]=[[135,300],[1460,300],[1503,1323],[110,1342]];
function solve(A:number[][],b:number[]){
 const n=b.length;
 for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  for(let j=i+1;j<n;j++){const f=A[j][i]/A[i][i];for(let c=i;c<n;c++)A[j][c]-=f*A[i][c];b[j]-=f*b[i]}}
 const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x;
}
function homography(from:[number,number][],to:[number,number][]){
 const A:number[][]=[],b:number[]=[];
 from.forEach(([u,v],i)=>{const [x,y]=to[i];A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y)});
 const h=solve(A,b);return (u:number,v:number):[number,number]=>{const w=h[6]*u+h[7]*v+1;return [(h[0]*u+h[1]*v+h[2])/w,(h[3]*u+h[4]*v+h[5])/w]};
}
const MM:[number,number][]=[[0,0],[BOARD.w,0],[BOARD.w,BOARD.d],[0,BOARD.d]];
// Board millimetres (from the rear-left corner) → photograph pixels, and back.
export const toPx=homography(MM,CORNERS);
export const fromPx=homography(CORNERS,MM);
// Photograph pixel → world [x, z].
export const P=(x:number,y:number):[number,number]=>{const [u,v]=fromPx(x,y);return [u-BOARD.w/2,v-BOARD.d/2]};
// World [x, z] → photograph pixel (for comparisons and the tests).
export const toPhoto=(x:number,z:number)=>toPx(x+BOARD.w/2,z+BOARD.d/2);
export const PX_PER_MM=5.6;
export const px=(n:number)=>n/PX_PER_MM;                         // a traced pixel length in millimetres
export const LENS={x:780,y:900,h:450};
// Where a part of height `h` (mm) stands, given where its top appears in the photograph.
export function base(x:number,y:number,h:number):[number,number]{const f=(LENS.h-h)/LENS.h;return P(LENS.x+(x-LENS.x)*f,LENS.y+(y-LENS.y)*f)}
const Q=(n:number)=>Math.round(n*100)/100;
const at=(x:number,y:number)=>{const [a,b]=P(x,y);return {x:Q(a),z:Q(b)}};

// ── Holes ────────────────────────────────────────────────────────────────
// Six plated mounting holes (ring with eight stitching vias) and the four bare 72 mm cooler holes round the socket.
export const HOLE={drill:1.98,ring:3.4,keep:5};
export const HOLES:[number,number][]=([[336,354],[588,356],[1438,477],[198,1239],[595,1231],[1470,1217]] as [number,number][]).map(([x,y])=>P(x,y));
// The cooler holes are drilled on a 72 mm square: centred on the mean of the four traced holes.
export const COOLER=(()=>{const t=([[995,566],[1377,564],[1005,964],[1397,962]] as [number,number][]).map(([x,y])=>P(x,y));
 const cx=t.reduce((s,p)=>s+p[0],0)/4,cz=t.reduce((s,p)=>s+p[1],0)/4;return {traced:t,x:Q(cx),z:Q(cz),pitch:72,drill:1.8}})();
export const coolerHoles=():[number,number][]=>[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>[COOLER.x+a*COOLER.pitch/2,COOLER.z+b*COOLER.pitch/2]);

// ── The rear edge: I/O ports. Faces point toward −z and stand 2.5 mm proud of the board edge. ──
export const EDGE_Z=-BOARD.d/2;
export const IO_PROUD=2.6;
export type IOKind='audio'|'lan'|'vga'|'serial'|'ps2';
// x centre (traced), width, depth from the face, height.
export const IO:{kind:IOKind;x:number;w:number;d:number;h:number}[]=[
 {kind:'audio',x:Q(P(688,330)[0]),w:14.2,d:21.5,h:27},
 {kind:'lan',x:Q(P(881,330)[0]),w:21.4,d:25.2,h:31.5},
 {kind:'vga',x:Q(P(1067,330)[0]),w:30.8,d:12.6,h:12.6},
 {kind:'serial',x:Q(P(1255,330)[0]),w:30.8,d:12.6,h:12.6},
 {kind:'ps2',x:Q(P(1406,330)[0]),w:14.6,d:18,h:26},
];

// ── CPU socket: LGA775 with its independent loading mechanism, lever down along the left side. ──
export const SOCKET=(()=>{const c=at(1201,751);return {...c,field:35.6,cavity:[16.4,16] as [number,number],body:[44,48] as [number,number],plate:[47.6,57.6] as [number,number],plateZ:Q(P(1202,766)[1]-c.z),h:4.6,plateH:6.1,leverX:Q(P(1063,751)[0]-c.x)}})();

// ── Chipset ──
// Northbridge: 34 mm FC-BGA, green substrate, bare die (its heat sink is not fitted: the silk still reads HEATSINK1).
export const NB={...at(798,826),s:34,die:[13.2,12.6] as [number,number],dieOff:[1.6,-1.2] as [number,number],h:2.1};
// Southbridge under a ribbed aluminium heat sink held by two push pins on a diagonal.
export const SB={...at(341,1135),s:31,h:2};
export const SINK={...at(341,1135),w:Q(px(214)),d:Q(px(210)),base:2.2,h:10.4,fins:14,pins:[at(258,1007),at(421,1260)]};

// ── Slots. Long axis along z; `a` is the rear end (toward the I/O edge). ──
export type Slot={id:string;name:string;x:number;z0:number;z1:number;w:number;h:number;colour:'white'|'black'|'yellow';key:number[]};
const slot=(id:string,name:string,xp:number,y0:number,y1:number,w:number,h:number,colour:Slot['colour'],key:number[]):Slot=>({id,name,x:Q(P(xp,(y0+y1)/2)[0]),z0:Q(P(xp,y0)[1]),z1:Q(P(xp,y1)[1]),w,h,colour,key});
// Keys are distances from the rear end, in mm, of the moulded bridges between contact sections.
export const PCI=slot('PCI1','PCI',252,472,980,8.6,9.6,'white',[73.2]);
export const PCIE16=slot('PCIEX16','PCIe ×16',486,507,1015,8.2,11.2,'black',[11.65]);
export const PCIE1=slot('PCIEX1_1','PCIe ×1',602,508,645,8.2,11.2,'white',[11.65]);
export const SLOTS=[PCI,PCIE16,PCIE1];
// The ×16 slot's retention latch arm, out past its front end.
export const LATCH16={...at(482,1080),len:Q(px(130))};

// ── DIMM sockets: two DDR2 240-pin, yellow, long axis along x, white latches standing open at both ends. ──
export const DIMM={x0:Q(P(561,1096)[0]),x1:Q(P(1358,1096)[0]),w:7.6,h:8.6,key:Q(P(983,1096)[0]),pins:120,tower:7.4};
export const DIMMS=[{id:'DIMM_A1',z:Q(P(960,1096)[1])},{id:'DIMM_B1',z:Q(P(960,1175)[1])}];

// ── Power, storage and pin headers ──
export const ATX24={...at(936,1296),w:Q(px(305)),d:10.3,h:12.8,cols:12,rows:2,pitch:4.2};
export const ATX4={...at(1390,467),w:10.3,d:13.6,h:12.8,cols:2,rows:2,pitch:4.2};
// Right-angle IDE header: the shroud lies on the front edge with its mouth facing out; 40 pins bent down into the board behind it.
export const IDE=(()=>{const c=at(518,1310);return {x:c.x,z:c.z,w:58.4,d:9.2,h:9,pinZ:Q(P(518,1306)[1]),shroudZ:Q(P(518,1330)[1]),pitch:2.54}})();
// Vertical SATA headers on the left edge: L-shaped shroud, seven contacts, long axis along z.
export const SATA=[{id:'SATA1',...(()=>{const [x,z]=base(145,1135,8.8);return {x:Q(x),z:Q(z)}})()},{id:'SATA2',...(()=>{const [x,z]=base(145,1240,8.8);return {x:Q(x),z:Q(z)}})()}];
export const SATA_SIZE={w:6.4,d:15.4,h:8.8};
// Three-pin fan headers (white, friction-lock wall), pins along x.
export const FANS=[{id:'CPU_FAN',...at(1450,1121)},{id:'CHA_FAN1',...at(1458,1163)}];
export const FAN_SIZE={w:8.2,d:5.9,h:7.4};
// Pin headers: centre, columns × rows (columns along x unless `turn`), base colour, optional jumper caps and shroud.
export type Header={id:string;x:number;z:number;cols:number;rows:number;turn?:boolean;colour:number;shroud?:boolean;jumper?:{at:number;colour:number};label?:string};
const hdr=(id:string,xp:number,yp:number,cols:number,rows:number,colour:number,o:Partial<Header>={}):Header=>({id,...at(xp,yp),cols,rows,colour,...o});
export const HEADERS:Header[]=[
 hdr('AAFP',164,437,5,2,0x2b8f74,{turn:true,label:'AAFP'}),
 hdr('SPDIF',161,522,5,2,0x1b1c1e,{turn:true,label:'SPDIF_OUT'}),
 hdr('CD',315,405,4,1,0x1b1c1e,{turn:true,shroud:true,label:'CD'}),
 hdr('USB34',158,808,5,2,0x1f6fc4,{turn:true,label:'USB34'}),
 hdr('USB56',154,1020,5,2,0x1f6fc4,{turn:true,label:'USB56'}),
 hdr('USBPW',190,976,3,1,0x1b1c1e,{turn:true,jumper:{at:0,colour:0x1f6fc4}}),
 hdr('CLRTC',150,1314,3,1,0x1b1c1e,{jumper:{at:0,colour:0x1f6fc4},label:'CLRTC'}),
 hdr('CHASSIS',273,1270,4,2,0x1b1c1e,{label:'CHASSIS'}),
 hdr('SPK',262,1302,2,2,0x2b8f74,{shroud:true}),
 hdr('PANEL',730,1307,5,2,0x1b1c1e,{label:'F_PANEL'}),
 hdr('COM2',788,1232,3,2,0x1b1c1e),
];

// ── Capacitors and inductors ──
// Aluminium electrolytics: photo position of the vent top, diameter, height, sleeve.
export type Ecap={x:number;z:number;d:number;h:number;sleeve:'black'|'purple'};
const ecap=(xp:number,yp:number,d:number,h:number,sleeve:Ecap['sleeve']='black'):Ecap=>{const [x,z]=base(xp,yp,h);return {x:Q(x),z:Q(z),d,h,sleeve}};
export const ECAPS:Ecap[]=[
 ecap(150,328,5,11),ecap(150,362,6.3,11),ecap(233,397,5,11),ecap(262,365,5,11),ecap(270,404,6.3,11),
 ecap(310,577,8,11.5),ecap(415,625,8,11.5,'purple'),ecap(405,677,8,11.5),ecap(408,748,8,11.5),ecap(416,870,8,11.5),
 ecap(140,890,8,11.5),ecap(142,944,8,11.5),ecap(552,855,6.3,11),ecap(604,866,8,11.5),
 ecap(958,345,6.3,11,'purple'),ecap(958,585,8,11.5),ecap(494,1234,8,11.5),ecap(588,1043,6.3,11),ecap(653,1232,8,11.5),
 ecap(818,1040,6.3,11),ecap(982,1226,8,11.5),ecap(1123,1225,8,11.5),ecap(1318,1228,8,15.5,'purple'),ecap(1318,1287,8,15.5),
];
// Solid polymer capacitors round the socket: aluminium can, white sleeve with a red band.
export const SOLIDS:Ecap[]=([[1075,558],[1215,560],[1315,558],[1270,465],[1436,590],[1370,665],[1378,720]] as [number,number][]).map(([x,y])=>ecap(x,y,8,11.5));
// Toroidal chokes: two flat on the board, one standing on edge (ring in the x-y plane).
export const TOROIDS=[{...at(1142,527),od:14.2,id:6.6,t:6.6,turns:10,upright:false},{...at(1402,803),od:14.2,id:6.6,t:6.6,turns:10,upright:false},{...at(1130,1290),od:11.6,id:5.4,t:5.6,turns:9,upright:true}];
// A drum choke standing on the 12 V input and a small green radial inductor.
export const ROD={...(()=>{const [x,z]=base(1328,456,12.5);return {x:Q(x),z:Q(z)}})(),d:7.6,h:12.5};
export const GREEN={...(()=>{const [x,z]=base(1362,1282,7);return {x:Q(x),z:Q(z)}})(),d:4.8,h:7};
// D-PAK MOSFETs and regulators. `out` is where the leads point: 0 +x, 1 +z, 2 −x, 3 −z.
export const DPAKS=([[882,612,1],[421,812,1],[1242,524,1],[1325,521,1],[1422,652,1],[1424,720,2],[1245,1220,2],[1245,1280,2],[1450,1271,2]] as [number,number,number][]).map(([x,y,out])=>({...at(x,y),out}));
export const DPAK={w:6.6,d:6.1,h:2.3,tab:5.4};

// ── Chips ──
export type ChipKind='qfp'|'ssop'|'soic';
export type Chip={id:string;kind:ChipKind;x:number;z:number;w:number;d:number;h:number;n:number;pitch:number;turn:boolean;lines:string[];logo?:'ite'|'realtek'|'ics';size?:number};
// `turn` sets the long axis along z. For SSOP and SOIC the leads leave the long sides. QFPs have `n` leads per long side.
export const CHIPS:Chip[]=[
 {id:'SIO',kind:'qfp',...at(423,406),w:20,d:14,h:2.7,n:38,pitch:.5,turn:true,lines:['IT8716F-S','0636-CXS','L54D51'],logo:'ite'},
 {id:'CODEC',kind:'qfp',...at(567,437),w:7,d:7,h:1.4,n:12,pitch:.5,turn:false,lines:['ALC660-VC','62B8V M1','G617A'],logo:'realtek'},
 {id:'CLOCK',kind:'ssop',...at(754,560),w:15.9,d:7.5,h:2.1,n:24,pitch:.635,turn:true,lines:['ICS','954119CF','0639H'],logo:'ics'},
 {id:'LAN',kind:'soic',...at(758,367),w:12.8,d:7.5,h:2.4,n:10,pitch:1.27,turn:true,lines:['L2','0638 AS']},
 {id:'RS232',kind:'ssop',...at(1250,396),w:10.2,d:5.3,h:1.9,n:14,pitch:.65,turn:false,lines:['ST3243EC','B627']},
 {id:'LOGIC',kind:'soic',...at(570,964),w:8.7,d:3.9,h:1.6,n:7,pitch:1.27,turn:false,lines:['74LVC14A']},
 {id:'EEPROM',kind:'soic',...at(862,1234),w:4.9,d:3.9,h:1.5,n:4,pitch:1.27,turn:false,lines:['W83','1A']},
];
export const leadReach=(c:Chip)=>c.kind==='qfp'?1:c.kind==='ssop'?1.1:1.2;
// HC-49/S crystals in steel cans, lying along x.
export const CRYSTALS=[{id:'X1',...at(669,431),f:'24.576'},{id:'X2',...at(737,492),f:'14.318'}];
export const CRYSTAL={w:11.4,d:4.7,h:3.6};
// CR2032 holder, empty: open ring, sprung contact tongue in the middle. The ring opens toward the front.
export const BATTERY={...at(605,733),r:11.7,h:4.3,open:58};
// The standby lamp: a 3 mm green LED on the left edge, lit whenever the supply provides 5 V standby.
export const LED={...at(162,740),r:1.5,h:5};

// Labels stuck on the board: two barcode stickers along the right edge, a yellow one on the PS/2 stack.
export const STICKERS=([{...at(1467,770),w:6.8,d:39.4,seed:5,lines:['P5G-MX','02G0A0012-00B','MAC 0018F3']},{...at(1473,986),w:6.6,d:35.6,seed:9,lines:['C9-3F2','BD2S1209']}]).map(s=>({...s,x:Math.min(s.x,Q(BOARD.w/2-s.w/2-.5))}));

// Empty footprints for capacitors that were not fitted: a silk circle, one half filled, with a square and a round land.
export const EMPTY:{x:number;z:number;r:number}[]=([[239,447,3.6],[547,545,3.6],[547,604,3.6],[311,820,4.2],[418,921,4.2],[696,680,3.2],[656,810,4.2],[568,903,3.2],[480,1170,3.6],[865,1047,4.2],[1020,1048,3.6],[1400,1268,4.2]] as [number,number,number][]).map(([x,y,r])=>({...at(x,y),r}));
// The buzzer footprint left unpopulated: a large silk circle.
export const BUZZER={...at(735,1240),r:6.4};

// ── Everything that stands on the board, for keep-outs, the board print and the tests. ──
export type Body={id:string;name:string;b:Rect;h:number;asm:string;over?:boolean};
export function bodies():Body[]{
 const list:Body[]=[];
 const add=(id:string,name:string,b:Rect,h:number,asm:string,over=false)=>list.push({id,name,b,h,asm,over});
 for(const io of IO)add(io.kind,io.kind,[io.x-io.w/2,EDGE_Z-IO_PROUD,io.x+io.w/2,EDGE_Z-IO_PROUD+io.d],io.h,'io',true);
 add('U1','cpu socket',rect(SOCKET.x,SOCKET.z+SOCKET.plateZ,SOCKET.plate[0]+.8,SOCKET.plate[1]+.8),SOCKET.plateH,'socket');
 add('LEVER','socket lever',[SOCKET.x+SOCKET.leverX-1.6,SOCKET.z-19,SOCKET.x+SOCKET.leverX+1.6,SOCKET.z+29],7,'socket');
 add('NB','northbridge',rect(NB.x,NB.z,NB.s,NB.s),NB.h,'chips');
 add('SB','southbridge heat sink',rect(SINK.x,SINK.z,SINK.w,SINK.d),SINK.base+SINK.h,'heatsink');
 for(const s of SLOTS)add(s.id,s.name,[s.x-s.w/2,s.z0,s.x+s.w/2,s.z1],s.h,'slots');
 for(const d of DIMMS)add(d.id,'dimm',[DIMM.x0,d.z-DIMM.w/2,DIMM.x1,d.z+DIMM.w/2],DIMM.h,'memory');
 add('ATX24','atx 24-pin',rect(ATX24.x,ATX24.z,ATX24.w,ATX24.d),ATX24.h,'connectors');
 add('ATX4','atx12v',rect(ATX4.x,ATX4.z,ATX4.w,ATX4.d),ATX4.h,'connectors');
 add('IDE','ide',[IDE.x-IDE.w/2,IDE.pinZ-2.2,IDE.x+IDE.w/2,IDE.shroudZ+IDE.d-1],IDE.h,'connectors',true);
 for(const s of SATA)add(s.id,'sata',rect(s.x,s.z,SATA_SIZE.w,SATA_SIZE.d),SATA_SIZE.h,'connectors');
 for(const f of FANS)add(f.id,'fan header',rect(f.x,f.z,FAN_SIZE.w,FAN_SIZE.d),FAN_SIZE.h,'connectors');
 for(const h of HEADERS){const w=h.cols*2.54,d=h.rows*2.54;add(h.id,'header',h.turn?rect(h.x,h.z,d,w):rect(h.x,h.z,w,d),8.5,'connectors')}
 ECAPS.forEach((c,i)=>add('CE'+(i+1),'electrolytic',rect(c.x,c.z,c.d,c.d),c.h,'power'));
 SOLIDS.forEach((c,i)=>add('CS'+(i+1),'solid capacitor',rect(c.x,c.z,c.d,c.d),c.h,'power'));
 TOROIDS.forEach((t,i)=>add('L'+(i+1),'toroid',t.upright?rect(t.x,t.z,t.od,t.t+1):rect(t.x,t.z,t.od,t.od),t.upright?t.od+.6:t.t,'power'));
 add('L4','drum choke',rect(ROD.x,ROD.z,ROD.d,ROD.d),ROD.h,'power');add('L5','inductor',rect(GREEN.x,GREEN.z,GREEN.d,GREEN.d),GREEN.h,'power');
 DPAKS.forEach((q,i)=>add('Q'+(i+1),'d-pak',q.out&1?rect(q.x,q.z,DPAK.w,DPAK.d+3):rect(q.x,q.z,DPAK.d+3,DPAK.w),DPAK.h,'power'));
 for(const c of CHIPS){const r=leadReach(c),w=c.w+(c.kind==='qfp'?2*r:0),d=c.d+2*r;add(c.id,c.kind,c.turn?rect(c.x,c.z,d,w):rect(c.x,c.z,w,d),c.h,'chips')}
 for(const c of CRYSTALS)add(c.id,'crystal',rect(c.x,c.z,CRYSTAL.w,CRYSTAL.d),CRYSTAL.h,'chips');
 add('BT1','battery holder',rect(BATTERY.x,BATTERY.z,BATTERY.r*2+3,BATTERY.r*2),BATTERY.h,'chips');
 add('LED1','standby lamp',rect(LED.x,LED.z,3.4,3.4),LED.h,'parts');
 for(const s of STICKERS)add('LBL','sticker',rect(s.x,s.z,s.w,s.d),.1,'board');
 return list;
}

// ── Small two-terminal parts, placed by rule where the photograph is busy with them (traced.ts). ──
export type Chip2={x:number;z:number;kind:keyof typeof SIZES;turn:boolean};
// [length, width, height, land offset, land length, land width]
export const SIZES={c04:[1,.5,.5,.5,.55,.6],r04:[1,.5,.35,.5,.55,.6],c06:[1.6,.8,.8,.8,.8,.95],r06:[1.6,.8,.45,.8,.8,.95],c08:[2,1.25,.95,1,1,1.4],r08:[2,1.25,.5,1,1,1.4],sot:[2.9,1.3,1.1,1,.9,.8]} as const;
export const footOf=(c:Chip2):Rect=>{const s=SIZES[c.kind],l=(s[3]+s[4]/2)*2,w=Math.max(s[1],s[5])+(c.kind==='sot'?1.6:0);return c.turn?rect(c.x,c.z,w,l):rect(c.x,c.z,l,w)};
export const busyAt=(x:number,z:number)=>{const i=Math.floor((x+BOARD.w/2)/BUSY_CELL),j=Math.floor((z+BOARD.d/2)/BUSY_CELL);return Number(BUSY[j]?.[i]??0)};
// Lettering the small parts leave clear.
const box=(x0:number,y0:number,x1:number,y1:number):Rect=>{const [a,b]=P(x0,y0),[c,d]=P(x1,y1);return [a,b,c,d]};
export const KEEP:Rect[]=[box(345,302,545,323),box(595,306,630,320),box(690,968,878,1005),box(866,1001,946,1017),box(612,1030,768,1073),box(835,439,916,456),box(845,691,916,709),box(910,648,937,726),
 box(178,588,216,637),box(358,870,402,907),box(353,758,394,799),box(338,540,377,577),box(384,768,406,832),box(358,648,387,717)];
let made:Chip2[]|null=null;
export function passives():Chip2[]{
 if(made)return made;
 const random=rng(775),out:Chip2[]=[],taken:Rect[]=[...bodies().map(b=>grow(b.b,.5)),...KEEP,...HOLES.map(([x,z])=>rect(x,z,HOLE.keep*2,HOLE.keep*2)),...coolerHoles().map(([x,z])=>rect(x,z,5,5)),
  ...EMPTY.map(e=>rect(e.x,e.z,e.r*2+1,e.r*2+1)),rect(BUZZER.x,BUZZER.z,BUZZER.r*2,BUZZER.r*2),rect(SOCKET.x,SOCKET.z+3,52,64)];
 const hx=BOARD.w/2-2,hz=BOARD.d/2-2;
 const tryPut=(c:Chip2)=>{const f=grow(footOf(c),.3);if(f[0]<-hx||f[2]>hx||f[1]<-hz||f[3]>hz)return false;for(const t of taken)if(overlap(f,t))return false;taken.push(f);out.push(c);return true};
 // Decoupling: shoulder to shoulder along the sides of the controllers.
 for(const c of CHIPS){
  const r=leadReach(c),w=(c.turn?c.d:c.w)+2*r+1.4,d=(c.turn?c.w:c.d)+2*r+1.4,x0=c.x-w/2,x1=c.x+w/2,z0=c.z-d/2,z1=c.z+d/2;
  for(let x=x0+1;x<=x1-1;x+=1.4){if(random()<.55)tryPut({x,z:z0-.6,kind:random()<.7?'c04':'r04',turn:true});if(random()<.55)tryPut({x,z:z1+.6,kind:random()<.7?'c04':'r04',turn:true})}
  for(let z=z0+1;z<=z1-1;z+=1.4){if(random()<.55)tryPut({x:x0-.6,z,kind:random()<.7?'c04':'r04',turn:false});if(random()<.55)tryPut({x:x1+.6,z,kind:random()<.7?'c04':'r04',turn:false})}
 }
 // Rows of a kind where the photograph shows small parts.
 const kinds:(keyof typeof SIZES)[]=['c04','r04','c06','c06','r06','r06','c08','r08','sot'];
 for(let tries=0;tries<26000&&out.length<1100;tries++){
  const x=Math.round((-hx+random()*hx*2)*4)/4,z=Math.round((-hz+random()*hz*2)*4)/4,busy=busyAt(x,z);
  if(random()*9>busy-1.5)continue;
  const kind=kinds[Math.floor(random()*kinds.length)],s=SIZES[kind],turn=random()<.5,n=kind==='sot'||kind==='c08'?1+Math.floor(random()*2):1+Math.floor(random()*4);
  const step=Math.max(s[1],s[5])+(kind==='sot'?2:.6);
  let run=0;for(let i=0;i<n;i++){const ok=tryPut({x:turn?x+i*step:x,z:turn?z:z+i*step,kind,turn});if(ok)run++;else if(run)break}
 }
 return made=out;
}
