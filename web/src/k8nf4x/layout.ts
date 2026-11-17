// K8NF4X layout, traced from assets/k8nf4x-reference.png. Millimetres. No three.js in here.
//
// Coordinates: X runs right from the board's back-left corner (the rear I/O edge is X = 0) and Z runs down the photograph
// from the top edge, so the board spans X 0..198, Z 0..293 and every number below can be read straight off the rectified photo.
// parts.ts places every layer at (−W/2, TOP, −D/2), so these numbers are also local coordinates there. Heights (`h`) are above
// the board's top face.
//
// Scale: the photograph is not a true top view (the far edge is 22 % narrower than the near edge), so it was rectified with
// the homography through the four board corners (scripts/devices/rectify-k8nf4x.mjs):
//   photo px  back-left (364,199)  back-right (1200,187)  front-right (1355,1450)  front-left (277,1467)  →  mm (0,0) (198,0) (198,293) (0,293).
// The board size, 293 × 198 mm, is Albatron's published size for this model. Hand checks in the rectified photo (docs/k8nf4x/evidence.md):
//   PCI slot body 88.6 mm (standard 84.8), slot pitch 101.6 / 5 = 20.3 mm (standard 20.32), DIMM body 132.4 mm (standard 133.35),
//   CR2032 holder 22 mm (standard ≈ 23), chipset package 30.4 mm across flats (nForce4: 31), retention-frame screws 92 mm apart (96.5).
// Where the photo's own drawing departs from a standard (its PCIe x16 reads 116 mm, its blue slots 37 mm, its SATA housings 17 mm)
// the photo wins: the page is judged against the photographs, so those parts are built to the photo's proportions.
import {rng} from '../kit/util';

export type Rect=[number,number,number,number];                  // x0, z0, x1, z1
export const rect=(cx:number,cz:number,w:number,d:number):Rect=>[cx-w/2,cz-d/2,cx+w/2,cz+d/2];
export const grow=(b:Rect,m:number):Rect=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m];
export const overlap=(a:Rect,b:Rect)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
export const inside=(a:Rect,b:Rect)=>a[0]>=b[0]&&a[1]>=b[1]&&a[2]<=b[2]&&a[3]<=b[3];

export const BOARD={w:198,d:293,t:1.6,r:1.2};
export const TOP=BOARD.t;                                          // the board lies flat on the table, as photographed
export const PHOTO={corners:[[364,199],[1200,187],[1355,1450],[277,1467]] as [number,number][]};
// Mounting holes: plated rings with a circle of stitching vias, as photographed. Two smaller holes hold the chipset's heat sink.
export const HOLES:[number,number][]=[[31,6],[167,6],[10,165],[166.5,164],[10,289],[166,289]];
export const HOLE={drill:1.98,ring:3.9};
export const SINK_HOLES:[number,number][]=[[101.5,163],[153,183]];
export const SINK_HOLE={drill:1.4,ring:2.5};

// ── Memory: four 184-pin DDR sockets, lime pair (channel A) above the purple pair (channel B). Latches stand open. ──
export const DIMM={x0:54.4,x1:187.6,w:7.4,h:9.2,key:127.5,latch:8.6,pitch:9,z:[24.5,33.5,42.5,51.5],colour:['lime','lime','purple','purple'] as const};
// ── Expansion: bracket end aligned at X ≈ 30.6; pitch 20.32 mm. ──
export type SlotKind='pcie1'|'pcie16'|'pci';
export type Slot={id:string;kind:SlotKind;x0:number;len:number;z:number;w:number;h:number;colour:'blue'|'red'|'white';label:string;key:number};
const P0=181;
export const SLOTS:Slot[]=[
 {id:'PCIE1',kind:'pcie1',x0:30.6,len:37,z:P0,w:7.6,h:11.2,colour:'blue',label:'PCIE1',key:11.65},
 {id:'PCIE2',kind:'pcie16',x0:30.6,len:116,z:P0+20.32,w:8,h:11.2,colour:'red',label:'PCIE2',key:11.65},
 {id:'PCIE3',kind:'pcie1',x0:30.6,len:37,z:P0+20.32*2,w:7.6,h:11.2,colour:'blue',label:'PCIE3',key:11.65},
 {id:'PCIE4',kind:'pcie1',x0:30.6,len:37,z:P0+20.32*3,w:7.6,h:11.2,colour:'blue',label:'PCIE4',key:11.65},
 {id:'PCI1',kind:'pci',x0:37.9,len:84.8,z:P0+20.32*4,w:8.2,h:9.6,colour:'white',label:'PCI1',key:67.2},
 {id:'PCI2',kind:'pci',x0:37.9,len:84.8,z:P0+20.32*5,w:8.2,h:9.6,colour:'white',label:'PCI2',key:67.2},
];
export const slotRect=(s:Slot):Rect=>[s.x0,s.z-s.w/2,s.x0+s.len+(s.kind==='pcie16'?9:0),s.z+s.w/2];

// ── Processor: Socket 939 in its retention frame; lever along the right side, pivot at the cam end (top). ──
export const SOCKET={x0:97,z0:76,x1:139,z1:129,h:4.6,cam:{z1:86.5,h:7.2},lever:{x:141.2,z0:80,z1:132,y:3.4,r:.95}};
export const FRAME={x0:62,z0:64,x1:171,z1:141,ix0:86.5,iz0:74.5,ix1:148.5,iz1:133.5,h:9.4,lug:11.5,screws:[[72.5,97.5],[164.4,97.5]] as [number,number][]};
// ── nForce4 4X: one 31 mm flip-chip BGA turned 45°, bare silicon die. ──
export const CHIPSET={x:127.5,z:172.5,s:31,die:11.2,turn:Math.PI/4,h:1.25,dieH:.75};

// ── Power and storage ──
export const ATX24={x:189,z:82,len:52.4,w:10,h:12.6,rows:2,n:12,pitch:4.2};        // long axis Z, latch on the board-edge side
export const ATX12V={x:58.8,z:146.5,len:9.8,w:10,h:12.6,rows:2,n:2,pitch:4.2};     // long axis Z, latch toward the rear
export type Box={id:string;x:number;z:number;len:number;w:number;h:number;colour:string;pins:number;along:'x'|'z';key:1|-1};
export const IDE:Box[]=[
 {id:'IDE1',x:179,z:163.5,len:57.4,w:9,h:9,colour:'red',pins:40,along:'z',key:-1},
 {id:'IDE2',x:191.2,z:163.5,len:57.4,w:9,h:9,colour:'white',pins:40,along:'z',key:-1},
 {id:'FDD1',x:136.5,z:6.4,len:49.6,w:9,h:9,colour:'black',pins:34,along:'x',key:1},
];
export const SATA={x:185.5,len:17,w:6.2,h:8.6,z:[211.6,218.4,225.9,232.7],colour:['black','red','red','black'] as const};

// ── Pin headers: centre, columns × rows on 2.54 mm, which axis the columns run along, base colour, any pins left out. ──
export type Header={id:string;x:number;z:number;cols:number;rows:number;along:'x'|'z';base:string;h:number;skip?:number[];caps?:string[];label?:string};
export const HEADERS:Header[]=[
 {id:'USB3',x:168.3,z:229.5,cols:5,rows:2,along:'z',base:'yellow',h:2.5,skip:[9],label:'USB3'},
 {id:'USB4',x:168.3,z:258.8,cols:5,rows:2,along:'z',base:'yellow',h:2.5,skip:[9],label:'USB4'},
 {id:'FP',x:183.4,z:287.3,cols:5,rows:2,along:'x',base:'black',h:2.5,caps:['white','green','orange','red','white','orange','white','blue','orange','white']},
 {id:'SPK',x:145.5,z:288.6,cols:4,rows:1,along:'x',base:'purple',h:5.6,label:''},
 {id:'F_AUDIO',x:9,z:256.4,cols:5,rows:2,along:'x',base:'black',h:2.5,caps:Array(10).fill('orange')},
 {id:'CD_IN',x:23.6,z:253.6,cols:5,rows:2,along:'x',base:'black',h:2.5,caps:['red','red','red','red','red']},
 {id:'TPM',x:186.4,z:264,cols:7,rows:2,along:'x',base:'black',h:2.5},
 {id:'JP1',x:167,z:269.4,cols:3,rows:1,along:'x',base:'black',h:2.5,caps:['red','red']},
];
// Empty header footprints: plated holes in a silk box (the photo shows several).
export const OPEN_HEADERS:{x:number;z:number;cols:number;rows:number}[]=[{x:142,z:278,cols:5,rows:2},{x:155.4,z:280,cols:4,rows:2},{x:151,z:284.8,cols:5,rows:1}];
// Fan and small wire-to-board connectors (Molex KK style): white, with a back wall and ramp.
export type Wafer={id:string;x:number;z:number;n:number;along:'x'|'z';label:string;wall:1|-1};
export const WAFERS:Wafer[]=[
 {id:'CPUFAN',x:50,z:57.2,n:3,along:'z',label:'CPU FAN',wall:1},
 {id:'SYSFAN',x:133.5,z:287.2,n:3,along:'x',label:'CHASSIS FAN',wall:1},
 {id:'NBFAN',x:37.8,z:172,n:2,along:'x',label:'NB FAN',wall:-1},
];

// ── Small chips. `kind` picks the package; `w` and `d` are the body along X and Z as placed. ──
export type ChipKind='qfp'|'soic'|'ssop'|'dpak'|'sq'|'qfn';
export type Chip={id:string;kind:ChipKind;x:number;z:number;w:number;d:number;h:number;pins?:[number,number];pitch?:number;mark:string[];turn?:boolean};
export const CHIPS:Chip[]=[
 {id:'U8',kind:'qfp',x:36.3,z:38.6,w:14,d:20,h:2.7,pins:[26,38],pitch:.5,mark:['ITE','IT8712F-A','HXS 0526-A'],turn:false},
 {id:'U12',kind:'qfp',x:19.4,z:224.2,w:7,d:7,h:1.4,pins:[12,12],pitch:.5,mark:['RTL8201CL','52381K1','G508 TAIWAN']},
 {id:'U17',kind:'qfp',x:16.6,z:277.4,w:7,d:7,h:1.4,pins:[12,12],pitch:.5,mark:['ALC850','47J21M1','G518A']},
 {id:'U5',kind:'ssop',x:76.5,z:252.2,w:15.8,d:5.3,h:1.6,pins:[24,0],pitch:.635,mark:['ICS951462BGLF','0533  P9T85']},
 {id:'U3',kind:'soic',x:20.3,z:24,w:3.9,d:4.9,h:1.5,pins:[0,4],pitch:1.27,mark:['8033','A1G']},
 {id:'U21',kind:'soic',x:166,z:127.5,w:4.9,d:3.9,h:1.5,pins:[4,0],pitch:1.27,mark:['4835','QA']},
 {id:'U4',kind:'soic',x:51,z:172.2,w:4.9,d:3.9,h:1.5,pins:[4,0],pitch:1.27,mark:['RT9241','A54']},
 {id:'U9',kind:'soic',x:34.6,z:120,w:4.9,d:3.9,h:1.5,pins:[4,0],pitch:1.27,mark:['4410','AP']},
 {id:'Q1',kind:'dpak',x:34.7,z:105.6,w:6.6,d:6.1,h:2.3,mark:['P45N','02L']},
 {id:'Q2',kind:'dpak',x:34.9,z:139.4,w:6.6,d:6.1,h:2.3,mark:['P45N','02L']},
 {id:'Q3',kind:'dpak',x:25.8,z:15.4,w:6.6,d:6.1,h:2.3,mark:['1117','33']},
 {id:'Q4',kind:'dpak',x:29.5,z:263.6,w:6.6,d:6.1,h:2.3,mark:['1084','25']},
 {id:'Q5',kind:'dpak',x:162,z:140.6,w:6.6,d:6.1,h:2.3,mark:['P55N','03']},
 // Square SMD power inductors and power packages with metal tops, grey and gold in the photo.
 {id:'L7',kind:'sq',x:73,z:162.6,w:7.2,d:7,h:3.4,mark:['1R5']},
 {id:'L8',kind:'sq',x:73,z:175.4,w:7.2,d:7,h:3.4,mark:['1R5']},
 {id:'L9',kind:'sq',x:184,z:122.4,w:6.6,d:6.4,h:3,mark:['2R2']},
 {id:'L10',kind:'sq',x:184.4,z:130.2,w:6.6,d:6.4,h:3,mark:['2R2']},
 {id:'L11',kind:'sq',x:46,z:84,w:5.8,d:5.6,h:2.4,mark:['3R3']},
 {id:'L12',kind:'sq',x:41.2,z:91,w:5.8,d:5.6,h:2.4,mark:['3R3']},
 {id:'U14',kind:'qfn',x:163.5,z:145,w:5,d:5,h:.9,mark:['8163']},
];
// Unpopulated chip footprints: bare tinned lands in a silk outline.
export const OPEN_QFP={x:19.4,z:224.2,w:14,d:20,pins:[26,38] as [number,number],pitch:.5};
export const OPEN_SOIC={x:12,z:184.6,w:15.8,d:7.6,pins:13,pitch:1.27};

// ── Toroidal chokes, standing on edge: `axis` is the direction the hole looks. Pale coated cores, enamelled copper windings. ──
export type Choke={id:string;x:number;z:number;od:number;id_:number;t:number;axis:'x'|'z';turns:number};
export const CHOKES:Choke[]=[
 {id:'L1',x:43,z:66,od:15.5,id_:8,t:6.6,axis:'z',turns:14},
 {id:'L2',x:44.6,z:103,od:18,id_:9.5,t:7.6,axis:'x',turns:15},
 {id:'L3',x:44.6,z:131,od:18,id_:9.5,t:7.6,axis:'x',turns:15},
 {id:'L4',x:44.6,z:157,od:15,id_:8,t:6.6,axis:'z',turns:14},
 {id:'L5',x:59,z:163.6,od:12,id_:6.2,t:5.6,axis:'z',turns:12},
 {id:'L6',x:82.2,z:163,od:17,id_:9,t:7.2,axis:'x',turns:15},
];
// ── Electrolytic capacitors (black sleeve, silver top with a cross vent) and one solid polymer can. Radius, height in mm. ──
export type Cap={id:string;x:number;z:number;r:number;h:number;solid?:boolean};
export const CAPS:Cap[]=[
 {id:'C1',x:33.8,z:13,r:3.15,h:8.5},{id:'C2',x:178,z:57.2,r:3.15,h:10.5},{id:'C3',x:177,z:118.8,r:3.15,h:8.5},
 {id:'C4',x:86.9,z:147.4,r:4,h:12},{id:'C5',x:95.7,z:146.8,r:4,h:12},{id:'C6',x:45.6,z:232.5,r:4,h:9},
 {id:'C7',x:34.4,z:253.8,r:2.5,h:6},{id:'C8',x:3.9,z:270.6,r:2.5,h:6},{id:'C9',x:17.5,z:285.6,r:2.5,h:5.2},
 {id:'C10',x:78.8,z:272.5,r:3.5,h:8},{id:'C11',x:123.2,z:272.5,r:3.5,h:8},{id:'C12',x:131.9,z:280.2,r:2.5,h:5.2},
 {id:'C13',x:128,z:147,r:3.1,h:6.8,solid:true},
];
// Empty capacitor footprints: a silk circle, the negative half filled, two plated holes. The photo shows many.
export const OPEN_CAPS:[number,number,number][]=[
 [57,79.4,4],[57,90,4],[57,100.6,4],[57,111,4],[57,131,4],[57,141.4,4],[23,96,4],[32,96,4],[35,129,4],[33.8,155,4],[67.8,153.6,4],[76.8,153.6,4],
 [92.5,157,3.5],[33.8,58.8,3.5],[65,63,3.5],[127,16,3.5],[123.8,60.6,3.5],[176.5,110,3.5],[192.5,121,3.5],[176,129,3.5],[168.8,140,3.5],[44.6,192.5,3.5],
 [49.4,213.8,3.5],[6.3,250.6,3],[13,250.6,3],[175,7.2,2.5],
];

// ── Crystals (HC-49/S), battery, BIOS ──
export const CRYSTALS:{x:number;z:number;mhz:string}[]=[{x:6.5,z:206,mhz:'25.000'},{x:166.5,z:204,mhz:'14.318'}];
export const XTAL={l:11,w:4.65,h:3.5};
export const BATTERY={x:145,z:263,r:11.6,cell:10};
export const PLCC={x:184.7,z:249.8,w:15,d:17.6,h:3.2,chip:{w:11.45,d:13.97,h:3.1}};

// ── Rear I/O, from the back-left corner down the rear edge. Connectors overhang the edge by 3 mm as on any ATX board. ──
export const OVERHANG=3;
export const IO={
 ps2:{z0:1.6,z1:16.6,x1:13.6,h:25.8},
 lpt:{z0:18,z1:73.2,x1:13,h:31},
 usb:{z0:77,z1:92,x1:14.2,h:15.6},
 lan:{z0:95,z1:116.4,x1:21.2,h:31.4},
 audio:{z0:120.6,z1:138.8,x1:17.4,h:33.6},
};

// ── Logo and markings, as printed (centre and size). ──
export const LOGO={x:80.3,z:223.2,s:8.2,textX:87.2,textW:38.8,cap:10.2};
export const BADGE={x:103.1,z:230,w:16,d:5};
export const FCC={x:103.5,z:253.4,s:5.6};
export const CE={x:110,z:274.8,s:4.8};
export const STICKER={x:32.5,z:284.6,w:7,d:9};

// Everything with a footprint, for the layout tests and to keep small parts off it.
export function bodies():{id:string;b:Rect}[]{
 const out:{id:string;b:Rect}[]=[];
 DIMM.z.forEach((z,i)=>out.push({id:`DIMM${i+1}`,b:[DIMM.x0,z-DIMM.w/2,DIMM.x1,z+DIMM.w/2]}));
 for(const s of SLOTS)out.push({id:s.id,b:slotRect(s)});
 out.push({id:'FRAME',b:[FRAME.x0,FRAME.z0,FRAME.x1,FRAME.z1]});
 out.push({id:'CHIPSET',b:rect(CHIPSET.x,CHIPSET.z,CHIPSET.s*Math.SQRT2,CHIPSET.s*Math.SQRT2)});
 out.push({id:'ATX24',b:rect(ATX24.x+1.4,ATX24.z,ATX24.w+2.8,ATX24.len)},{id:'ATX12V',b:rect(ATX12V.x-1.4,ATX12V.z,ATX12V.w+2.8,ATX12V.len+.4)});
 for(const i of IDE)out.push({id:i.id,b:i.along==='z'?rect(i.x,i.z,i.w,i.len):rect(i.x,i.z,i.len,i.w)});
 SATA.z.forEach((z,i)=>out.push({id:`SATA${i+1}`,b:rect(SATA.x,z,SATA.len,SATA.w)}));
 for(const h of HEADERS){const a=h.cols*2.54,c=h.rows*2.54;out.push({id:h.id,b:h.along==='x'?rect(h.x,h.z,a,c):rect(h.x,h.z,c,a)})}
 for(const w of WAFERS){const a=w.n*2.54+2.4,c=5.8;out.push({id:w.id,b:w.along==='x'?rect(w.x,w.z,a,c):rect(w.x,w.z,c,a)})}
 for(const c of CHIPS){const lead=c.kind==='qfp'?1.6:c.kind==='soic'||c.kind==='ssop'?2.1:c.kind==='dpak'?2.6:0;out.push({id:c.id,b:rect(c.x,c.z+(c.kind==='dpak'?1:0),c.w+(c.kind==='dpak'?0:lead),c.d+(c.kind==='dpak'?2.6:lead))})}
 for(const k of CHOKES){const along=k.axis==='x';out.push({id:k.id,b:along?rect(k.x,k.z,k.t+2.4,k.od+1.2):rect(k.x,k.z,k.od+1.2,k.t+2.4)})}
 for(const c of CAPS)out.push({id:c.id,b:rect(c.x,c.z,c.r*2,c.r*2)});
 CRYSTALS.forEach((c,i)=>out.push({id:`Y${i+1}`,b:rect(c.x,c.z,XTAL.w,XTAL.l)}));
 out.push({id:'BAT1',b:rect(BATTERY.x,BATTERY.z,BATTERY.r*2,BATTERY.r*2)},{id:'BIOS',b:rect(PLCC.x,PLCC.z,PLCC.w,PLCC.d)});
 for(const [k,v] of Object.entries(IO))out.push({id:`IO_${k}`,b:[-OVERHANG,v.z0,v.x1,v.z1]});
 return out;
}

// ── Small two-terminal parts: scattered where the photo shows fields of them, clear of every body, label and footprint. ──
export const SIZES={r06:[1.6,.8,.45],c06:[1.6,.8,.8],r08:[2,1.25,.5],c08:[2,1.25,1],c12:[3.2,1.6,1.1],q23:[2.9,1.3,1.0]} as const;
export type Passive={x:number;z:number;turn:boolean;kind:keyof typeof SIZES};
// Fields traced from the photo: dense rows round the VRM, the Super I/O, the chipset and the right-hand edge.
export const FIELDS:[Rect,number][]=[
 [[14,4,54,32],34],[[48,0,110,11],26],[[4,52,30,94],30],[[50,58,62,150],24],[[65,138,110,152],18],[[87,74,97,128],22],[[143,74,150,132],16],
 [[150,8,186,20],22],[[171,58,184,108],28],[[150,142,172,198],46],[[96,150,152,196],40],[[66,152,96,196],34],[[4,150,30,178],22],[[4,186,30,212],26],
 [[28,212,46,248],22],[[70,210,112,216],12],[[72,228,128,246],34],[[2,236,30,250],18],[[2,262,36,292],34],[[124,240,160,252],18],[[158,268,180,292],26],
 [[170,196,196,208],18],[[160,206,176,222],14],[[194,226,198,280],6],[[170,236,178,282],14],[[125,253,134,268],12],[[150,252,162,276],10],
 [[186,98,197,132],12],[[100,58,180,63],16],
];
export const KEEP_OUT:Rect[]=[
 [LOGO.x-6,LOGO.z-7,LOGO.textX+LOGO.textW+2,BADGE.z+4],[FCC.x-6,FCC.z-4.5,FCC.x+24,FCC.z+3.5],[CE.x-16,CE.z-4,CE.x+6,CE.z+4],[STICKER.x-4,STICKER.z-5,STICKER.x+4,STICKER.z+9],
 [OPEN_QFP.x-9,OPEN_QFP.z-12,OPEN_QFP.x+9,OPEN_QFP.z+12],[OPEN_SOIC.x-9.5,OPEN_SOIC.z-5,OPEN_SOIC.x+9.5,OPEN_SOIC.z+5],[66,239,134,251],
];
let passiveCache:Passive[]|null=null;
export function passives():Passive[]{
 if(passiveCache)return passiveCache;
 const random=rng(939),out:Passive[]=[],taken:Rect[]=[...bodies().map(b=>grow(b.b,.9)),...KEEP_OUT];
 for(const [x,z,r] of OPEN_CAPS)taken.push(rect(x,z,r*2+1,r*2+1));
 for(const [x,z] of [...HOLES,...SINK_HOLES])taken.push(rect(x,z,HOLE.ring*2+2,HOLE.ring*2+2));
 for(const h of OPEN_HEADERS)taken.push(rect(h.x,h.z,h.cols*2.54+1.4,h.rows*2.54+1.4));
 const kinds:(keyof typeof SIZES)[]=['r06','r06','c06','c06','c06','r08','c08','c12','q23','q23'];
 for(const [f,n] of FIELDS){
  let placed=0;
  for(let tries=0;tries<n*40&&placed<n;tries++){
   const kind=kinds[Math.floor(random()*kinds.length)],[l,w]=SIZES[kind],turn=random()<.5,x=f[0]+random()*(f[2]-f[0]),z=f[1]+random()*(f[3]-f[1]);
   // Parts in a field line up on a 0.5 mm grid, in rows, as a pick-and-place program leaves them.
   const gx=Math.round(x*2)/2,gz=Math.round(z*2)/2,b=kind==='q23'?(turn?rect(gx,gz,3,3.6):rect(gx,gz,3.6,3)):turn?rect(gx,gz,w+.5,l+.9):rect(gx,gz,l+.9,w+.5);
   if(b[0]<1.5||b[1]<1.5||b[2]>BOARD.w-1.5||b[3]>BOARD.d-1.5)continue;
   if(taken.some(t=>overlap(t,b)))continue;
   taken.push(b);out.push({x:gx,z:gz,turn,kind});placed++;
  }
 }
 passiveCache=out;return out;
}
