// GA-P35-S3G layout, traced from assets/gap35-reference.png (1588 × 1588 px, board lying flat, rear I/O at the top).
// No three.js in here: the print, the geometry and the tests all read these numbers.
//
// Mapping. The photo is near-orthographic but the camera leans a little toward the I/O edge, so the board is a slight
// keystone: corners TL (145, 313), TR (1455, 313), BR (1491, 1206), BL (126, 1218) px. A pixel is turned into board
// millimetres by inverting the bilinear map of that quad onto a 305 × 200 mm rectangle (see `mm`). Origin at the
// board centre, X to the right, Z toward the bottom of the photo (away from the I/O edge), Y up from the board's top face.
//
// Scale, checked against standards seen on the board (local scale ≈ 4.30 px/mm at the top edge, 4.47 at the bottom):
//   ATX 24-pin housing 856→1090 px = 234 px → 52.4 mm (standard ≈ 52)        IDE shroud 829→1092 px → 58.9 mm (≈ 57 with ears)
//   PCI slot 451→838 px = 387 px → 86.0 mm (standard 84.8 + end walls ≈ 86)  PCIe x16 478→872 px → 87.6 mm (≈ 89)
//   PCIe x1 480→600 px → 26.7 mm (≈ 25)   slot pitch 91–92 px → 20.6 mm (standard 20.32; snapped below)
//   DIMM socket incl. latches 722→1398 px → 151 mm (DDR2 socket ≈ 150)       coin holder Ø 112 px → 25 mm (CR2032 holder ≈ 25)
// The real GA-P35-S3G is 305 mm across; the photo then gives 200 mm deep (the PCI slot length agrees to 1 %).
import {rng} from '../kit/util';

export type P2=[number,number];
export type Rect=[number,number,number,number];                       // x0, z0, x1, z1 in mm
export const BOARD={w:305,d:200,t:1.6,r:3.2};
export const LIFT=2.2;                                                  // board underside above the floor (it rests on its pin tails)
export const TOP=LIFT+BOARD.t;                                          // world height of the top face
export const QUAD={tl:[145,313],tr:[1455,313],br:[1491,1206],bl:[126,1218]} as const;
export const KPX=4.42;                                                  // mean px per mm, for small radii and widths

// Inverse bilinear map: photo pixel → (u, v) in the unit square → board mm.
export function uv(px:number,py:number):P2{
 const {tl,tr,br,bl}=QUAD;let u=.5,v=.5;
 for(let i=0;i<10;i++){
  const x=(1-u)*(1-v)*tl[0]+u*(1-v)*tr[0]+u*v*br[0]+(1-u)*v*bl[0]-px;
  const y=(1-u)*(1-v)*tl[1]+u*(1-v)*tr[1]+u*v*br[1]+(1-u)*v*bl[1]-py;
  const xu=(1-v)*(tr[0]-tl[0])+v*(br[0]-bl[0]),xv=(1-u)*(bl[0]-tl[0])+u*(br[0]-tr[0]);
  const yu=(1-v)*(tr[1]-tl[1])+v*(br[1]-bl[1]),yv=(1-u)*(bl[1]-tl[1])+u*(br[1]-tr[1]);
  const det=xu*yv-xv*yu;u-=(x*yv-y*xv)/det;v-=(y*xu-x*yu)/det;
 }
 return [u,v];
}
export const mm=(px:number,py:number):P2=>{const [u,v]=uv(px,py);return [(u-.5)*BOARD.w,(v-.5)*BOARD.d]};
// Forward map, for the tests and for comparing captures: board mm → photo px.
export function px(x:number,z:number):P2{
 const u=x/BOARD.w+.5,v=z/BOARD.d+.5,{tl,tr,br,bl}=QUAD;
 return [(1-u)*(1-v)*tl[0]+u*(1-v)*tr[0]+u*v*br[0]+(1-u)*v*bl[0],(1-u)*(1-v)*tl[1]+u*(1-v)*tr[1]+u*v*br[1]+(1-u)*v*bl[1]];
}
// A photo box [x0, y0, x1, y1] in px → a board rectangle in mm.
export const R=(b:readonly number[]):Rect=>{const a=mm(b[0],b[1]),c=mm(b[2],b[3]),d=mm(b[0],b[3]),e=mm(b[2],b[1]);return [(a[0]+d[0])/2,(a[1]+e[1])/2,(c[0]+e[0])/2,(c[1]+d[1])/2]};
export const C=(r:Rect):P2=>[(r[0]+r[2])/2,(r[1]+r[3])/2];
export const W=(r:Rect)=>r[2]-r[0],D=(r:Rect)=>r[3]-r[1];
export const rect=(cx:number,cz:number,w:number,d:number):Rect=>[cx-w/2,cz-d/2,cx+w/2,cz+d/2];
export const grow=(b:Rect,m:number):Rect=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m];
export const overlap=(a:Rect,b:Rect)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const at=(x:number,y:number)=>mm(x,y);

// ── Mounting holes: three large plated rings with six stitching vias (as photographed), and the small plain ones. ──
export const HOLES:{x:number;z:number;r:number;ring:number;big:boolean}[]=[
 ...([[212,352],[756,352],[200,1026]] as const).map(([x,y])=>({x:at(x,y)[0],z:at(x,y)[1],r:2,ring:4.6,big:true})),
 ...([[1085,328],[142,1192],[1471,1184],[163,333]] as const).map(([x,y])=>({x:at(x,y)[0],z:at(x,y)[1],r:1.6,ring:2.6,big:false})),
];

// ── Expansion slots. The photo's slot centres are snapped to the standard 20.32 mm pitch from the PCIe x16 centre. ──
export type SlotKind='pci'|'pcie16'|'pcie1';
export type Slot={id:string;kind:SlotKind;x:number;z0:number;len:number;w:number;h:number;colour:'white'|'blue'|'black';key:number};
const X16=at(670,700)[0],PITCH=20.32,SLOTZ=at(588,451)[1];
export const SLOTS:Slot[]=[
 ...[5,4,3,2,1].map((n,i)=>({id:'PCI'+n,kind:'pci' as const,x:X16-PITCH*(5-i),z0:SLOTZ,len:85.6,w:9.6,h:9.8,colour:'white' as const,key:.765})),
 {id:'PCIE_16',kind:'pcie16',x:X16,z0:at(670,478)[1],len:89,w:8.8,h:11.2,colour:'blue',key:.125},
 {id:'PCIE_1',kind:'pcie1',x:X16+PITCH,z0:at(764,480)[1],len:25,w:8.8,h:11.2,colour:'black',key:.46},
];
// The x16 retention latch: a hook that swings out past the far end, curling toward −x (traced from 655,872 to 628,958 px).
export const LATCH16={x:X16,z:at(670,872)[1],reach:18.5,curl:-7};

// ── Memory: four DDR2 sockets, two channels of yellow + red. Traced centres; standard length with latches. ──
export type Dimm={id:string;x:number;z:number;colour:'yellow'|'red'};
export const DIMM={len:136,latch:7.5,w:7.4,h:8.6,latchH:14,pins:120,pitch:1,key:.53};
export const DIMMS:Dimm[]=([['DDRII1',1060,909,'yellow'],['DDRII2',1068,948,'red'],['DDRII3',1102,1010,'yellow'],['DDRII4',1110,1050,'red']] as const)
 .map(([id,x,y,colour])=>({id,x:at(x,y)[0],z:at(x,y)[1],colour}));

// ── Processor: LGA775 socket under the stock cooler. Hole square 72 mm, centred on the cooler. ──
export const CPU={x:at(1236,611)[0],z:at(1236,611)[1],socket:37.5,plate:44,ihs:28.5,sub:37.5,h:3.6};
export const COOLER={...CPU,fin:44,finH:[4,40] as [number,number],core:15,shroud:[40.5,58] as [number,number],ring:45.6,holes:36,fan:41,hub:16,fins:62,blades:7};
// The fan label: a half-white, half-black disc on the frame's centre, white half toward +x (as photographed).
export const LABEL={x:at(1252,600)[0]-CPU.x,z:at(1252,600)[1]-CPU.z,r:15.6};

// ── Chipset heat sinks, gold anodised. Fins run along x. ──
export const NB={b:R([796,588,996,806]),h:22,band:R([796,650,996,722]),split:at(978,0)[0],pins:[at(842,817),at(990,584)]};
export const SB={b:R([455,908,617,1065]),h:10.5,tabs:[R([455,876,492,910]),R([576,1063,613,1100])],pins:[at(473,891),at(595,1083)]};

// ── Power and storage connectors (boxes in mm, heights in mm). ──
export const ATX24={b:R([856,1140,1090,1196]),h:13};
export const ATX4={b:R([1369,399,1413,439]),h:13};
export const IDE={b:R([829,1084,1092,1133]),h:9,pins:20};
export const FDD={b:R([150,474,194,692]),h:9,pins:17};
export const SATA:{id:string;b:Rect}[]=([['SATAII5',[320,1108,356,1182]],['SATAII4',[375,1108,411,1182]],['SATAII0',[470,1108,506,1182]]] as const).map(([id,b])=>({id,b:R(b)}));
export const SATA_EMPTY=R([428,1110,470,1182]);                         // SATAII1: a footprint left unpopulated
export const SATA_H=10.2;

// ── Pin headers. `pins` columns × rows, `pitch` mm; `turn` lays the long axis along z. Colours name the plastic. ──
export type Header={id:string;x:number;z:number;cols:number;rows:number;pitch:number;turn:boolean;base:'black'|'yellow'|'white'|'mint'|'panel';h:number;shroud?:boolean;missing?:number[]};
const hd=(id:string,b:readonly number[],cols:number,rows:number,turn:boolean,base:Header['base'],pitch=2.54,h=2.5,extra:Partial<Header>={}):Header=>{const r=R(b);return {id,x:C(r)[0],z:C(r)[1],cols,rows,pitch,turn,base,h,...extra}};
export const HEADERS:Header[]=[
 hd('F_USB3',[152,740,177,797],5,2,true,'yellow',2.54,2.5,{missing:[9]}),
 hd('F_USB2',[152,808,177,865],5,2,true,'yellow',2.54,2.5,{missing:[9]}),
 hd('F_USB1',[151,874,176,930],5,2,true,'yellow',2.54,2.5,{missing:[9]}),
 hd('F_PANEL',[141,1052,166,1162],10,2,true,'panel'),
 hd('F_AUDIO',[785,332,811,380],5,2,true,'mint',2.54,2.5,{missing:[7]}),
 hd('J_FP2',[154,701,181,727],3,2,false,'black'),
 hd('J_TPM',[1300,847,1335,888],4,2,true,'black'),
 hd('CLR_CMOS',[142,982,160,1008],1,2,true,'mint',2.54,2.2),
 hd('CI',[163,982,181,1008],1,2,true,'mint',2.54,2.2),
];
// Small shrouded and fan headers: white KK-style fan headers (with a ramp), black audio headers.
export type Fan={id:string;b:Rect;pins:number;colour:'white'|'black';turn:boolean;h:number};
export const FANS:Fan[]=[
 {id:'SYS_FAN1',b:R([712,600,746,630]),pins:3,colour:'white',turn:false,h:6},
 {id:'SYS_FAN2',b:R([229,1160,275,1192]),pins:3,colour:'white',turn:false,h:6},
 {id:'PWR_FAN',b:R([794,1150,829,1185]),pins:3,colour:'white',turn:false,h:6},
 {id:'CPU_FAN',b:R([1436,940,1461,986]),pins:4,colour:'white',turn:true,h:6},
 {id:'CD_IN',b:R([428,368,480,412]),pins:4,colour:'black',turn:false,h:7},
 {id:'SPDIF_O',b:R([432,424,466,450]),pins:3,colour:'black',turn:false,h:6},
];

// ── Rear I/O, along the top edge (−z). `b` is the footprint on the board including the 3 mm overhang. ──
export type Io={id:string;b:Rect;h:number};
const edge=-BOARD.d/2,io=(id:string,x0:number,x1:number,depth:number,h:number):Io=>({id,b:[mm(x0,330)[0],edge-3,mm(x1,330)[0],edge-3+depth],h});
export const IO={
 audio:io('AUDIO',822,890,21,30.5),
 usbLan:io('USB_LAN',903,991,21,30.5),
 usb:io('USB',1008,1078,17.5,15.8),
 parallel:io('LPT',1108,1362,14.5,26),
 serial:io('COM',1236,1372,12.5,12.5),
 ps2:io('PS2',1396,1466,15.5,26),
};
export const POLYFUSE=R([874,318,891,346]);

// ── Packages. `lead` sides: 'all' QFP, 'tb' leads on the top/bottom (±z) edges, 'lr' on the ±x edges. ──
export type Chip={id:string;b:Rect;h:number;pins:number;sides:'all'|'tb'|'lr';pitch:number;lines:string[];logo?:'ite'|'realtek'|'ics'|'mx';reach:number};
const ch=(id:string,b:readonly number[],h:number,pins:number,sides:Chip['sides'],pitch:number,lines:string[],logo?:Chip['logo'],reach=1):Chip=>({id,b:R(b),h,pins,sides,pitch,lines,logo,reach});
export const CHIPS:Chip[]=[
 ch('U_SIO',[602,357,662,431],2.6,32,'all',.5,['IT8718F-S','0721-GXS','J1L8C'],'ite',1.3),
 ch('U_CODEC',[692,355,727,389],1.4,12,'all',.5,['ALC889A','71B14M1','G715A'],'realtek',.9),
 ch('U_CLK',[808,509,874,538],1.1,28,'tb',.5,['ICS9LPRS','918AKLF','0730G'],'ics',1),
 ch('U_LAN',[762,1095,806,1146],1.4,16,'all',.5,['RTL8111B','6C1621','GROUP'],'realtek',.9),
 ch('U_BIOS',[321,947,348,970],1.6,4,'tb',1.27,['MX25L8005','M2C-15G'],'mx',1),
 ch('U_BUF',[291,852,340,880],1.6,8,'tb',1.27,['74LVC245','G7202']),
 ch('U_PWM',[1366,1122,1434,1158],1.5,10,'tb',1.27,['ISL6322','CRZ 0727']),
 ch('U_SW',[541,1112,577,1134],1.5,4,'tb',1.27,['APM2054','N7A21']),
 ch('U_AUD2',[743,393,778,424],1.5,4,'tb',1.27,['G1421','B726']),
 ch('U_LDO',[1300,1135,1330,1160],1.5,4,'tb',1.27,['RT9214','DG=7']),
];
// D-PAK and D2-PAK power transistors and regulators: body, metal tab toward `tab`, two leads opposite.
export type Pak={b:Rect;tab:'n'|'s'|'e'|'w';big?:boolean};
export const PAKS:Pak[]=([
 [[683,951,725,982],'w'],[[683,1063,725,1096],'w'],[[937,505,987,548],'n'],[[483,345,525,398],'n'],[[225,1100,268,1132],'n'],
 [[279,1140,320,1188],'n',true],[[1203,1100,1235,1128],'e'],[[1207,1139,1239,1171],'e'],[[620,1045,648,1072],'w'],[[1180,1170,1212,1195],'n'],
] as const).map(([b,tab,big])=>({b:R(b),tab,big}));

// ── Power parts. Square shielded chokes with yellow printed values (as photographed: 2R0, 1R2, 2R2, 2R2). ──
export type Choke={id:string;b:Rect;h:number;value:string;turn:boolean};
export const CHOKES:Choke[]=[
 {id:'L1',b:R([1125,1100,1189,1162]),h:6.5,value:'2R0',turn:false},
 {id:'L2',b:R([1275,1082,1318,1125]),h:5.5,value:'1R2',turn:false},
 {id:'L3',b:R([690,997,730,1060]),h:6,value:'2R2',turn:true},
 {id:'L4',b:R([598,1128,652,1185]),h:6,value:'2R2',turn:true},
];
// Electrolytic capacitors: photo centre and radius in px; height mm; sleeve.
export type Cap={x:number;z:number;r:number;h:number;sleeve:'black'|'green'|'red'|'brown'};
const cap=(x:number,y:number,rp:number,sleeve:Cap['sleeve']='black'):Cap=>{const [cx,cz]=at(x,y),r=Math.round(rp/KPX*20)/20;return {x:cx,z:cz,r,h:r<2.6?7:r<3.2?11.5:12.5,sleeve}};
export const CAPS:Cap[]=[
 cap(265,492,14),cap(360,605,14),cap(540,532,14),cap(527,415,11),cap(554,415,11),cap(794,397,10),cap(794,424,10),cap(883,409,11),cap(1002,411,12),cap(1015,528,12),
 cap(717,497,13,'green'),cap(717,532,13),cap(760,770,13),cap(971,861,12),cap(158,951,14),cap(258,1070,10),cap(258,1138,9),cap(654,990,13),cap(654,1034,13),cap(700,920,13),
 cap(608,1107,14),cap(650,1107,13),cap(733,1121,9),cap(1144,1080,13),cap(1075,974,7,'brown'),cap(1179,974,7,'brown'),cap(1462,915,12),cap(1260,1080,13),cap(1262,1117,13),cap(1262,1157,13),
 cap(1337,1157,14),cap(1373,1095,10),cap(1402,1090,10),
 // Two large VRM capacitors in maroon sleeves at the right edge (Ø 8 mm in the angled photo).
 {x:at(1442,560)[0],z:at(1442,560)[1],r:4,h:13,sleeve:'red'},{x:at(1428,746)[0],z:at(1428,746)[1],r:4,h:13,sleeve:'red'},
];
export const COIN={x:at(331,1043)[0],z:at(331,1043)[1],r:12.4,h:5.2};
export const XTALS:{b:Rect;turn:boolean;round?:boolean}[]=[{b:R([878,501,900,548]),turn:true},{b:R([538,849,553,898]),turn:true,round:true}];

// ── Fan cable: four wires (yellow, green, blue, black) from the frame's centre, out along a strut, round a loose
// knot over the DIMMs and off the bottom edge to a white plug lying on the bench. [px, py, height above board mm]. ──
export const CABLE:[number,number,number][]=[
 [1166,610,59.4],[1132,622,59.6],[1098,641,59.2],[1070,668,57.5],[1056,712,57],[1064,758,57.5],[1096,797,53],[1138,826,30],[1176,846,13],
 [1212,856,12],[1252,862,12],[1278,890,11.5],[1272,930,11],[1238,952,11],[1198,944,11.5],[1180,908,12],[1196,878,12.5],[1228,884,12.5],
 [1246,918,11.5],[1248,968,11],[1243,1030,10.5],[1232,1090,9],[1214,1146,7],[1192,1194,3.5],[1172,1218,0],[1160,1232,-1.2],
];
export const PLUG={at:at(1146,1252),turn:.62,w:10.5,d:7,h:6};

// ── Everything standing on the board, for the tests and the small-parts placer. ──
export type Body={id:string;b:Rect;h:number;asm:string};
export function bodies():Body[]{
 const list:Body[]=[
  ...SLOTS.map(s=>({id:s.id,b:[s.x-s.w/2,s.z0,s.x+s.w/2,s.z0+s.len] as Rect,h:s.h,asm:'slots'})),
  ...DIMMS.map(d=>({id:d.id,b:rect(d.x,d.z,DIMM.len+DIMM.latch*2,DIMM.w) as Rect,h:DIMM.h,asm:'memory'})),
  {id:'CPU',b:rect(CPU.x,CPU.z,CPU.plate+6,CPU.plate+14),h:CPU.h+3,asm:'socket'},
  {id:'NB',b:NB.b,h:NB.h,asm:'heatsinks'},{id:'SB',b:SB.b,h:SB.h,asm:'heatsinks'},
  {id:'ATX',b:ATX24.b,h:ATX24.h,asm:'power'},{id:'ATX12V',b:ATX4.b,h:ATX4.h,asm:'power'},{id:'IDE1',b:IDE.b,h:IDE.h,asm:'power'},{id:'FDD',b:FDD.b,h:FDD.h,asm:'power'},
  ...SATA.map(s=>({id:s.id,b:s.b,h:SATA_H,asm:'power'})),
  ...HEADERS.map(hh=>({id:hh.id,b:headerRect(hh),h:8,asm:'power'})),
  ...FANS.map(f=>({id:f.id,b:f.b,h:f.h,asm:'power'})),
  ...Object.values(IO).map(o=>({id:o.id,b:o.b,h:o.h,asm:'io'})),
  ...CHIPS.map(c=>({id:c.id,b:grow(c.b,c.sides==='all'?c.reach:0),h:c.h,asm:'chips'})),
  ...PAKS.map((p,i)=>({id:'Q'+(i+1),b:p.b,h:2.3,asm:'power'})),
  ...CHOKES.map(c=>({id:c.id,b:c.b,h:c.h,asm:'power'})),
  ...CAPS.map((c,i)=>({id:'EC'+(i+1),b:rect(c.x,c.z,c.r*2,c.r*2),h:c.h,asm:'power'})),
  {id:'BAT',b:rect(COIN.x,COIN.z,COIN.r*2+5,COIN.r*2),h:COIN.h,asm:'chips'},
  ...XTALS.map((x,i)=>({id:'Y'+(i+1),b:x.b,h:3.6,asm:'chips'})),
 ];
 return list;
}
export function headerRect(hh:Header):Rect{const a=hh.cols*hh.pitch,b=hh.rows*hh.pitch;return hh.turn?rect(hh.x,hh.z,b,a):rect(hh.x,hh.z,a,b)}
export function headerPins(hh:Header):P2[]{
 const out:P2[]=[];
 for(let i=0;i<hh.cols;i++)for(let j=0;j<hh.rows;j++){
  if(hh.missing?.includes(i*hh.rows+j))continue;
  const a=(i-(hh.cols-1)/2)*hh.pitch,b=(j-(hh.rows-1)/2)*hh.pitch;out.push(hh.turn?[hh.x+b,hh.z+a]:[hh.x+a,hh.z+b]);
 }
 return out;
}

// ── Silkscreen lettering traced from the photo: [text, px, py, cap height mm, rotation (0 | 90 = reads bottom to top), style]. ──
export type Label={t:string;x:number;z:number;s:number;rot:0|90|-90;style?:'bold'|'italic'|'logo'|'plain'};
const lb=(t:string,x:number,y:number,s:number,rot:Label['rot']=0,style:Label['style']='plain'):Label=>({t,x:at(x,y)[0],z:at(x,y)[1],s,rot,style});
export const LABELS:Label[]=[
 lb('REV:1.0',275,339,2.2),lb('PCB MADE IN CHINA',378,339,2.2),lb('ASSEM:',292,384,2.2),
 lb('CD_IN',404,402,2.2),lb('SPDIF_O',395,434,2.2),lb('F_AUDIO',741,323,2),lb('AUDIO',790,323,2),lb('USB_LAN',931,450,2.4),
 lb('PCI1',620,520,2,90),lb('PCIE_16',643,511,2,90),lb('PCIE_1',790,520,2,90),lb('PCI2',532,500,1.6,90),lb('PCI3',440,492,1.6,90),lb('PCI4',350,492,1.6,90),lb('PCI5',262,480,1.4,90),
 lb('SYS_FAN1',735,648,2.2),lb('D33C98',720,724,2.6),
 lb('FSB1333',797,845,2.6,0,'italic'),lb('DDRII800/1066',906,845,2.6,0,'italic'),
 lb('GIGABYTE',866,872,4.6,0,'logo'),lb('GA-P35-S3G',864,893,3.6,0,'bold'),
 lb('Gigabit LAN',265,776,4.2,90,'italic'),lb('45nm CPU Support',358,734,4.2,90,'italic'),lb('Dual Channel DDRII 800/1066',453,688,4.2,90,'italic'),lb('SATAII PCI Express',548,730,4.2,90,'italic'),
 lb('FDD',143,490,2,90),lb('F_USB3',143,770,2,90),lb('F_USB2',143,836,2,90),lb('F_USB1',143,905,2,90),lb('F_PANEL',131,1028,2,90),
 lb('CLR_CMOS',257,887,2.4),lb('MBIOS',330,917,2.4),lb('CLR_CMOS',236,980,2.4),lb('BATTERY',378,1092,2.4),lb('CPU_LDO',233,1030,1.6,90),
 lb('SYS_FAN2',245,1201,2.4),lb('SATAII5',338,1201,2.4),lb('SATAII4',393,1201,2.4),lb('SATAII1',449,1201,2.4),lb('SATAII0',509,1201,2.4),lb('PWR_FAN',808,1196,2.4),lb('ATX',1097,1201,2.6),
 lb('DDRII1',851,972,2),lb('DDRII2',851,985,2),lb('DDRII3',912,976,2),lb('DDRII4',912,989,2),
 lb('CPU_FAN',1472,968,2,-90),lb('ATX_12V',1447,420,2,-90),lb('SB',441,962,2,90),lb('IDE1',836,1074,1.8),lb('NB',985,820,1.6),
];
// Regulatory marks on the board between PCI1 and the x16 slot (photo centres) and the FCC mark beside the logo.
export const MARKS={eco:at(630,645),weee:at(630,692),pb:at(630,760),ce:at(632,805),gear:at(720,700),fcc:at(778,875)};
export const ASSEM_LABEL=R([313,371,360,397]);
// Areas small parts keep out of: the slogans, the logo block and the regulatory marks.
export const KEEP:Rect[]=[R([253,700,280,840]),R([345,630,372,840]),R([440,540,468,840]),R([535,625,562,840]),R([612,615,652,830]),R([755,835,975,905]),R([690,680,760,740]),R([240,325,445,400])];

// ── Small parts: resistors, capacitors and diodes, scattered by rule where the photo shows them (dense round the chips,
// the I/O and the VRM, sparse in the open). Deterministic. ──
export type Smd={x:number;z:number;kind:'r'|'c'|'cb'|'d';turn:boolean;l:number;w:number;h:number};
export const SMD_SIZES={r:[1.6,.8,.45],c:[1.6,.8,.8],cb:[2,1.25,1],d:[2.6,1.4,1.1]} as const;
const ZONES:{b:Rect;n:number}[]=[
 {b:R([480,330,800,460]),n:150},{b:R([680,385,1000,600]),n:140},{b:R([560,860,760,1200]),n:120},{b:R([740,1080,860,1200]),n:60},
 {b:R([1290,1060,1480,1200]),n:110},{b:R([1180,850,1480,1080]),n:70},{b:R([170,840,300,1200]),n:110},
 {b:R([990,400,1460,520]),n:60},{b:R([1000,520,1080,850]),n:40},{b:R([1400,520,1470,860]),n:50},{b:R([600,450,800,880]),n:70},
 {b:R([200,450,620,860]),n:70},{b:R([800,1180,1150,1205]),n:20},{b:R([360,870,460,1100]),n:60},{b:R([990,840,1300,880]),n:30},
];
let made:Smd[]|null=null;
export function smds():Smd[]{
 if(made)return made;
 const random=rng(3517),out:Smd[]=[],taken:Rect[]=[...bodies().map(b=>grow(b.b,.8)),...KEEP,...HOLES.map(h=>rect(h.x,h.z,h.ring*2+2,h.ring*2+2))];
 const hx=BOARD.w/2-2.5,hz=BOARD.d/2-2.5;
 for(const zone of ZONES){
  let placed=0;
  for(let tries=0;tries<zone.n*30&&placed<zone.n;tries++){
   const kinds:Smd['kind'][]=['r','r','c','c','c','cb','d'],kind=kinds[Math.floor(random()*kinds.length)],[l,w,h]=SMD_SIZES[kind],turn=random()<.5;
   const n=kind==='d'?1:1+Math.floor(random()*4),step=w+.7;
   const x=zone.b[0]+random()*(zone.b[2]-zone.b[0]),z=zone.b[1]+random()*(zone.b[3]-zone.b[1]);
   for(let i=0;i<n;i++){
    const c:Smd={x:Math.round((turn?x+i*step:x)*20)/20,z:Math.round((turn?z:z+i*step)*20)/20,kind,turn,l,w,h};
    const f=grow(smdRect(c),.35);
    if(f[0]<-hx||f[2]>hx||f[1]<-hz||f[3]>hz||taken.some(t=>overlap(f,t)))break;
    taken.push(f);out.push(c);placed++;
   }
  }
 }
 return made=out;
}
export const smdRect=(c:Smd):Rect=>c.turn?rect(c.x,c.z,c.w,c.l):rect(c.x,c.z,c.l,c.w);
