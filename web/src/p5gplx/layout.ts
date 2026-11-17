// P5GPL-X SE layout, traced from assets/p5gplx-reference.png (top) and checked against assets/p5gplx-reference-angle.png.
//
// Scale. The board is the ASUS narrow ATX outline, 12 × 7.2 in (305 × 183 mm; ASUS P5GPL-X specification summary).
// The top photograph is not orthographic: it is taken from beyond the lower edge, tilted about 18°, and turned 3.3°. It was
// rectified with a homography from the four board corners, photo pixels TL (364,175), TR (1192,132), BR (1372,1480),
// BL (392,1540) → plan (0,0), (183,0), (183,305), (0,305) mm (scripts/devices/rectify-p5gplx.mjs), then traced at 8 px/mm.
// Hand checks on the rectified plan: PCI slot body 86.9 mm (standard 85 + end walls), PCIe x16 89.5 mm (89), PCIe x1 25 mm (25),
// slot pitch 20.4 mm (20.32), LGA775 cooler holes 72.5 × 73.2 mm (72 × 72), 24-pin rows 4.4 mm (4.2), header caps 2.54 mm.
// Tall parts lean toward the top of the photo by about a third of their height (tan 18°), so their bases are taken from the
// lower (nearer) edge of what shows, not from the top face.
//
// Plan coordinates: u to the right and v down the photo, in mm from the board's top-left corner. World: x = u − 91.5,
// z = v − 152.5, y up, heights from the board's top face. The rear I/O edge is u = 0.
// No three.js in here: the print, the geometry and the tests all read these numbers.
import {rng} from '../kit/util';

export type Rect=[number,number,number,number];                  // u0, v0, u1, v1
export const rect=(cu:number,cv:number,w:number,d:number):Rect=>[cu-w/2,cv-d/2,cu+w/2,cv+d/2];
export const grow=(b:Rect,m:number):Rect=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m];
export const overlap=(a:Rect,b:Rect)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];

export const BOARD={w:183,d:305,t:1.6,r:1.2,lift:1.8};
export const TOP=BOARD.lift+BOARD.t;                             // world height of the top face
export const X=(u:number)=>u-BOARD.w/2,Z=(v:number)=>v-BOARD.d/2;

// ── Holes ─────────────────────────────────────────────────────────────────
// Plated mounting holes (ring with eight vias), plain holes, and the four LGA775 cooler holes.
export const MOUNTS:[number,number][]=[[32.3,8.3],[166.6,5.7],[9.9,166.6],[165,164.5],[9.9,212.4],[9.9,288.1],[165,289.2]];
export const PLAIN:[number,number,number][]=[[130.1,216.3,1.9],[4.7,300.6,1.6]];
export const COOLER:[number,number][]=[[46.6,32],[119,31.6],[46.5,105.2],[118.6,104]];
export const MOUNT={drill:2,ring:4.6};

// ── CPU socket (LGA775) ─────────────────────────────────────────────────────
// Load plate 52 × 50 mm, contact field 37.5 mm square round a 15.5 mm window, lever along the lower side, cam up the right side.
export const SOCKET={u:83,v:65.6,plate:[52,50] as [number,number],field:37.5,window:15.5,base:4.3,top:6.6,lever:{v:91.2,u0:63.5,u1:111.8,hook:97.5}};

// ── Northbridge and its heat sink ─────────────────────────────────────────
// Eight fins across u, each cut into four along v (4 × 8 blocks in the angled photo), on a 3 mm base. Push pins at two corners.
export const NB={u:93.5,v:144,w:43,d:42,base:3,h:27,fins:8,cuts:4,fin:1.3,die:[12,12] as [number,number],pkg:34};
export const PINS:[number,number][]=[[70.6,161],[115.6,130]];
// ICH7 southbridge: 31 mm plastic BGA, laser-marked.
export const ICH={u:145.5,v:237.5,s:31,h:2.1,lid:27.6};

// ── Memory ──────────────────────────────────────────────────────────────
// Two DDR2 sockets, black, white latches standing open. Body 145 mm, 7.4 mm wide, 10.5 mm high; pitch 10 mm.
export const DIMM={v:88.4,len:145,w:7.4,h:10.5,latch:{len:12,w:5.4,h:14.5,tilt:.32}};
export const DIMMS=[{id:'DIMM_A1',u:146.8},{id:'DIMM_B1',u:156.8}];

// ── Expansion slots, centres along v on the 20.32 mm pitch, measured from the lower (nearer) body edges. ──
export const PITCH=20.32;
export type Slot={id:string;kind:'x16'|'pci'|'x1';u0:number;v:number;len:number;colour:'black'|'cream'};
export const SLOTS:Slot[]=[
 {id:'PCIEX16',kind:'x16',u0:41.6,v:204.8,len:89.4,colour:'black'},
 {id:'PCI1',kind:'pci',u0:36,v:204.8+PITCH,len:86.9,colour:'cream'},
 {id:'PCI2',kind:'pci',u0:36,v:204.8+PITCH*2,len:86.9,colour:'cream'},
 {id:'PCI3',kind:'pci',u0:36,v:204.8+PITCH*3,len:86.9,colour:'cream'},
 {id:'PCIEX1_1',kind:'x1',u0:42,v:204.8+PITCH*4,len:25,colour:'cream'},
];
export const SLOT={pci:{w:7.4,h:11.4,key:63.4},x16:{w:7.6,h:11.2,key:11.65},x1:{w:7.6,h:11.2,key:11.65}};
// The x16 slot's retention arm and the black insulated wire that runs from its end.
export const X16_ARM={u0:131,u1:144.5,v:204.6,w:2.4,h:4};
export const WIRE:[number,number][]=[[131.6,200.2],[137.5,199.8],[143.4,199.8],[150.5,201],[154.4,204.8],[156.3,209.9],[156.8,212]];

// ── Power and storage ───────────────────────────────────────────────────
export const ATX24={u:169,v:111,cols:2,rows:12,pitch:4.2,w:10.4,d:52.6,h:12.8};
export const ATX12V={u:25.4,v:20.6,cols:2,rows:2,pitch:4.2,w:10.4,d:10.4,h:12.8};
// Shrouded box headers: centre, pin columns × rows, long axis along u (`along`) or v.
export type Box={id:string;u:number;v:number;n:number;along:'u'|'v';h:number};
export const FLOPPY:Box={id:'FLOPPY1',u:94,v:276.6,n:17,along:'u',h:9};
export const IDE:Box={id:'PRI_IDE',u:178.6,v:198.3,n:20,along:'v',h:9};
// SATA: vertical headers; black pair stood along v, red pair along u.
export const SATA=[{id:'SATA1',u:174.2,v:242.6,along:'v' as const,colour:'black'},{id:'SATA2',u:174.2,v:259.6,along:'v' as const,colour:'black'},{id:'SATA3',u:170.2,v:272.4,along:'u' as const,colour:'red'},{id:'SATA4',u:170.2,v:280.6,along:'u' as const,colour:'red'}];
export const SATA_BODY={len:15.4,w:6.6,h:9};
export const FAN={id:'CHA_FAN1',u:21.4,v:273.2,n:3,h:8.6};

// ── Pin headers along the lower edge, with the caps as photographed. `cap` is a jumper cap colour per pair (along v) or per pin. ──
export type Header={id:string;label:string;u0:number;v:number;cols:number;rows:number;caps:string[];single?:boolean;bare?:boolean};
export const HEADERS:Header[]=[
 {id:'AAFP',label:'AAFP',u0:25.6,v:298.4,cols:5,rows:2,caps:Array(5).fill('#9fbe9c')},
 {id:'SPDIF',label:'',u0:39.6,v:298.4,cols:1,rows:2,caps:['#2f8a52']},
 {id:'F_PANEL',label:'_PANEL',u0:45.7,v:298.4,cols:8,rows:2,caps:Array(8).fill('#e3962c')},
 {id:'USB56',label:'USB56',u0:79.3,v:298.4,cols:5,rows:2,caps:Array(5).fill('#2e74c9')},
 {id:'USB78',label:'USB78',u0:106.2,v:298.4,cols:5,rows:2,caps:Array(5).fill('#2e74c9')},
 {id:'COM2',label:'',u0:127.6,v:298.4,cols:5,rows:2,caps:[],bare:true},
 // System panel: one coloured head on every pin, as ASUS shipped it. Top row then bottom row, left to right.
 {id:'PANEL1',label:'PANEL',u0:146.2,v:298.4,cols:10,rows:2,single:true,caps:[
  '#ece6d6','#e9e4d8','#d9d6cc','#3c3a38','#7c2a30','#ece4c6','#d9443a','#d9443a','#d9443a','#d9443a',
  '#d9443a','#d9443a','#efece2','#2f73c4','#2f86b6','#d8d24a','#e6cb3c','#ece8dc','#2f73c4','#2f73c4']},
];
export const HEADER={pitch:2.54,base:2.5,pin:8.4,cap:6.2};
// Two-pin jumpers standing on three-pin headers: blue, green.
export const JUMPERS=[{u:25,v:6.3,turn:false,colour:'#2e6fd0'},{u:28.6,v:128.8,turn:false,colour:'#2e6fd0'},{u:100.9,v:285,turn:true,colour:'#2e6fd0'},
 {u:91.1,v:289.2,turn:true,colour:'#2e6fd0'},{u:149.9,v:290.2,turn:true,colour:'#2e6fd0'},{u:78.6,v:289.2,turn:true,colour:'#2f9a5c'}];
// Standby lamp: a 3 mm green dome.
export const LED={u:111.4,v:285.2,r:2.4,h:5.2};

// ── Rear I/O, front faces 3 mm past the board edge. z spans from the top photo bases; heights from the angled photo. ──
export const IO_FACE=-3;
export const IO={
 ps2:{v0:1,v1:16.4,depth:17.5,h:25.5},
 lpt:{v0:23.6,v1:77,depth:21,h:26,top:13.6},       // DB25 on the upper deck; `top` is the deck height
 coax:{v:35.6,r:4.2,y:6.6},
 com:{v0:58.6,v1:89.6},
 usb:{v0:92,v1:107,depth:15,h:15.6},
 lan:{v0:108.2,v1:126.4,depth:20,h:31},
 audio:{v0:133.6,v1:148.6,depth:16.5,h:30},
};

// ── Packages ────────────────────────────────────────────────────────────
// QFP: centre, body w × d, lead span margin, pins per side (u, v), marking.
export type Qfp={id:string;u:number;v:number;w:number;d:number;nu:number;nv:number;pitch:number;h:number;lines:string[];logo?:string};
export const QFPS:Qfp[]=[
 {id:'U_SIO',u:19.8,v:239.6,w:14,d:18,nu:26,nv:38,pitch:.5,h:1.6,lines:['IT8712F-S','0614-GXS','L36191.1'],logo:'ite'},
 {id:'U_LAN',u:15.6,v:187.2,w:12,d:16,nu:24,nv:32,pitch:.5,h:1.5,lines:['L2','Attansic','0628 TW'],logo:'attansic'},
 {id:'U_AUDIO',u:25.5,v:284.3,w:7,d:7,nu:12,nv:12,pitch:.5,h:1.4,lines:['AD1986A','0631'],logo:'adi'},
];
// SSOP clock generator beside the north bridge, and smaller gull-wing parts. `turn` lays the leads along v instead of u.
export type Soic={id:string;u:number;v:number;w:number;d:number;n:number;pitch:number;h:number;turn?:boolean;lines:string[]};
export const SOICS:Soic[]=[
 {id:'U_CLK',u:60,v:180.2,w:18.4,d:7.5,n:28,pitch:.635,h:1.8,lines:['ICS954119CF','0627L']},
 {id:'U_DDR',u:134.8,v:23.6,w:9.7,d:4.4,n:12,pitch:.65,h:1.1,lines:['RT9173']},
 {id:'U1',u:43.8,v:17.4,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['9435']},
 {id:'U2',u:30.7,v:69.4,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['4410']},
 {id:'U3',u:22.9,v:69.9,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['4410']},
 {id:'U4',u:22.5,v:83,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['LM358']},
 {id:'U5',u:169.7,v:48,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['8205']},
 {id:'U6',u:151.5,v:195.8,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['2010']},
 {id:'U7',u:17.2,v:202.6,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['CM8562']},
 {id:'U8',u:8.3,v:202.6,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['24C02']},
 {id:'U9',u:160,v:281.6,w:4.9,d:3.9,n:4,pitch:1.27,h:1.5,lines:['F75375']},
];
// DPAK (TO-252) power transistors. `legs` is the side the three legs leave from: 0 +u, 1 +v, 2 −u, 3 −v.
export const DPAKS:{u:number;v:number;legs:number}[]=[
 {u:60.9,v:10.6,legs:1},{u:78.1,v:22.2,legs:3},{u:87.6,v:22.2,legs:3},{u:105.1,v:9.9,legs:1},{u:116.6,v:10.4,legs:3},{u:127,v:10.4,legs:3},
 {u:45.8,v:53.2,legs:1},{u:43.8,v:64.8,legs:2},{u:43.8,v:74.2,legs:2},{u:172.8,v:14,legs:2},{u:173.4,v:26.8,legs:1},
 {u:47.4,v:139.8,legs:3},{u:134.8,v:177.6,legs:3},{u:146.3,v:178.2,legs:2},{u:38.5,v:290.4,legs:1},
];
export const DPAK={w:6.6,d:6.1,h:2.3};
// BIOS in a PLCC32 socket, with its white label.
export const BIOS={u:151.5,v:275.6,socket:[15.6,18.2] as [number,number],chip:[11.5,14] as [number,number],h:3.2,chipH:3.6};
// Coin cell holder.
export const BATTERY={u:131.1,v:282.4,r:11,cell:9.8,h:5.6};
// Crystals: low HC-49/US cans lying on the board, long axis along v.
export const CRYSTALS=[{u:30.2,v:177.4,len:11,w:4.7},{u:46.9,v:178.2,len:10,w:4}];
// Axial glass part by the BIOS, long axis along u.
export const AXIAL={u:145.2,v:263,len:7.6,r:1.3};

// ── Electrolytic capacitors: 18 counted in the top photo. Centres are bases (lower edge of the sleeve minus the radius). ──
export type Cap={u:number;v:number;d:number;h:number};
export const CAPS:Cap[]=[
 {u:37,v:37.6,d:8,h:11.5},{u:76,v:32.2,d:8,h:11.5},{u:88.6,v:32.2,d:8,h:11.5},{u:166.6,v:77,d:6.3,h:11},
 {u:19.6,v:104,d:8,h:11.5},{u:25.6,v:115.2,d:8,h:11.5},{u:54.2,v:128.6,d:8,h:11.5},{u:58,v:145.2,d:8,h:11.5},
 {u:139.2,v:94.6,d:8,h:11.5},{u:66.1,v:214,d:6.3,h:11},{u:108.8,v:180.6,d:8,h:11.5},{u:40.1,v:235.6,d:6.3,h:11},
 {u:12,v:299.4,d:6.3,h:11},{u:19.3,v:292.3,d:6.3,h:11},{u:17.8,v:300.6,d:5,h:9},{u:25.6,v:292.3,d:6.3,h:11},
 {u:71.7,v:298.6,d:8,h:11.5},{u:98.3,v:299,d:8,h:11.5},
];
// Toroidal chokes lying flat, copper wound; one stood on edge (axis along u) by the x16 slot; one wound drum; one rod choke.
export const TOROIDS=[{u:64,v:26,r:7.4,h:6.6,turns:15},{u:101,v:24.6,r:7.4,h:6.6,turns:15},{u:41,v:85.6,r:7,h:6.4,turns:14}];
export const EDGE_TOROID={u:126.6,v:180.6,r:6.4,t:6.4,turns:12};
export const DRUM={u:161,v:177.6,r:3.8,h:9.5};
export const ROD={u:26.8,v:31.4,r:3.9,h:16};
// Small green film capacitors by the audio jacks.
export const FILMS=[{u:33.1,v:130,turn:false},{u:37,v:135.2,turn:false}];

// Unpopulated electrolytic footprints: a silk circle, half filled to mark the negative side, and two plated holes.
// `side`: which half is filled (L left, T top). r is the circle radius.
export const EMPTY:{u:number;v:number;r:number;side:'L'|'T'}[]=[
 {u:41.1,v:9.4,r:3.4,side:'L'},{u:50.2,v:9.6,r:4,side:'L'},{u:83,v:9.1,r:4.4,side:'L'},{u:136.7,v:7.8,r:4,side:'L'},{u:35.9,v:16.1,r:4,side:'T'},
 {u:51.8,v:22.2,r:3.6,side:'L'},{u:113.1,v:21.4,r:3.6,side:'L'},{u:29.4,v:48.6,r:4,side:'T'},{u:29.7,v:57.3,r:4,side:'T'},{u:44.3,v:44.8,r:3.8,side:'T'},
 {u:28.9,v:92.4,r:4,side:'T'},{u:30.7,v:100.9,r:4,side:'T'},{u:53.9,v:112.7,r:4,side:'T'},{u:24.5,v:153.4,r:4,side:'T'},{u:37,v:153.2,r:3.6,side:'T'},
 {u:135.8,v:83,r:4.4,side:'L'},{u:31.3,v:191.6,r:3.4,side:'T'},{u:17.9,v:212.6,r:3,side:'L'},{u:57.8,v:212.9,r:3.4,side:'T'},{u:94.2,v:177.5,r:3,side:'L'},
 {u:116.6,v:180.1,r:3.4,side:'T'},{u:143.1,v:187.9,r:4,side:'L'},{u:152,v:188.4,r:4,side:'L'},{u:148.3,v:212.9,r:4,side:'T'},{u:137.4,v:215.5,r:2.5,side:'L'},
 {u:112.4,v:212.4,r:2.5,side:'L'},{u:33.1,v:290.2,r:2.2,side:'T'},{u:173,v:155.4,r:4,side:'L'},
];

// ── Silkscreen lettering that is legible in the photo. ──
export const MODEL_NAME={u0:72,v:192.6,u1:122,h:5.2,text:'P5GPL-X SE'};
export const LOGO={u0:86,v:214.4,u1:116,h:6.4};
export const MARKS={fcc:[102,254.4] as [number,number],ce:[112.6,254.4] as [number,number],ul:[74,176] as [number,number],recycle:[101.2,233] as [number,number]};
// A light-green barcode sticker on the right edge beside the 24-pin socket.
export const STICKER={u:181,v:112,w:4,d:42};

// ── Everything that stands on the board, used to keep small parts clear and by the tests. ──
export type Body={id:string;b:Rect;h:number;asm:string;over?:boolean};
const slotRect=(s:Slot):Rect=>[s.u0,s.v-SLOT[s.kind].w/2,s.u0+s.len,s.v+SLOT[s.kind].w/2];
export const boxRect=(h:Box):Rect=>{const L=h.n*2.54+6.4,W=9.2;return h.along==='u'?rect(h.u,h.v,L,W):rect(h.u,h.v,W,L)};
export const headerRect=(h:Header):Rect=>[h.u0-1.27,h.v-h.rows*1.27,h.u0+(h.cols-1)*2.54+1.27,h.v+h.rows*1.27];
export const sataRect=(s:typeof SATA[number]):Rect=>s.along==='v'?rect(s.u,s.v,SATA_BODY.w,SATA_BODY.len):rect(s.u,s.v,SATA_BODY.len,SATA_BODY.w);
export function bodies():Body[]{
 return [
  {id:'SOCKET',b:rect(SOCKET.u,SOCKET.v,SOCKET.plate[0],SOCKET.plate[1]),h:SOCKET.top,asm:'socket'},
  {id:'NB',b:rect(NB.u,NB.v,NB.w,NB.d),h:NB.h,asm:'heatsink'},
  {id:'ICH',b:rect(ICH.u,ICH.v,ICH.s,ICH.s),h:ICH.h,asm:'chips'},
  ...DIMMS.map(d=>({id:d.id,b:rect(d.u,DIMM.v,DIMM.w,DIMM.len),h:DIMM.h,asm:'memory'})),
  ...SLOTS.map(s=>({id:s.id,b:slotRect(s),h:SLOT[s.kind].h,asm:'slots'})),
  {id:'ATX24',b:rect(ATX24.u,ATX24.v,ATX24.w,ATX24.d),h:ATX24.h,asm:'power'},
  {id:'ATX12V',b:rect(ATX12V.u,ATX12V.v,ATX12V.w,ATX12V.d),h:ATX12V.h,asm:'power'},
  {id:FLOPPY.id,b:boxRect(FLOPPY),h:FLOPPY.h,asm:'power'},{id:IDE.id,b:boxRect(IDE),h:IDE.h,asm:'power'},
  ...SATA.map(s=>({id:s.id,b:sataRect(s),h:SATA_BODY.h,asm:'power'})),
  {id:FAN.id,b:rect(FAN.u,FAN.v,FAN.n*2.54+2.6,5.8),h:FAN.h,asm:'power'},
  ...HEADERS.map(h=>({id:h.id,b:headerRect(h),h:HEADER.pin,asm:'power'})),
  {id:'BIOS',b:rect(BIOS.u,BIOS.v,BIOS.socket[0],BIOS.socket[1]),h:BIOS.chipH+BIOS.h,asm:'chips'},
  {id:'BAT',b:rect(BATTERY.u,BATTERY.v,BATTERY.r*2,BATTERY.r*2+2),h:BATTERY.h,asm:'parts'},
  ...QFPS.map(q=>({id:q.id,b:rect(q.u,q.v,q.w+3,q.d+3),h:q.h,asm:'chips'})),
  ...SOICS.map(s=>({id:s.id,b:s.turn?rect(s.u,s.v,s.d+2.4,s.w):rect(s.u,s.v,s.w,s.d+2.6),h:s.h,asm:'chips'})),
  ...DPAKS.map((p,i)=>({id:'Q'+(i+1),b:rect(p.u,p.v,DPAK.w+(p.legs%2?0:3),DPAK.d+(p.legs%2?3:0)),h:DPAK.h,asm:'chips'})),
  ...CAPS.map((c,i)=>({id:'EC'+(i+1),b:rect(c.u,c.v,c.d,c.d),h:c.h,asm:'power-parts'})),
  ...TOROIDS.map((t,i)=>({id:'L'+(i+1),b:rect(t.u,t.v,t.r*2+1.4,t.r*2+1.4),h:t.h+1.2,asm:'power-parts'})),
  {id:'L4',b:rect(EDGE_TOROID.u,EDGE_TOROID.v,EDGE_TOROID.t+1.6,EDGE_TOROID.r*2),h:EDGE_TOROID.r*2,asm:'power-parts'},
  {id:'L5',b:rect(DRUM.u,DRUM.v,DRUM.r*2,DRUM.r*2),h:DRUM.h,asm:'power-parts'},
  {id:'L6',b:rect(ROD.u,ROD.v,ROD.r*2,ROD.r*2),h:ROD.h,asm:'power-parts'},
  ...CRYSTALS.map((c,i)=>({id:'X'+(i+1),b:rect(c.u,c.v,c.w,c.len),h:3.6,asm:'parts'})),
  {id:'LED1',b:rect(LED.u,LED.v,LED.r*2,LED.r*2),h:LED.h,asm:'parts'},
  ...JUMPERS.map((j,i)=>({id:'JP'+(i+1),b:j.turn?rect(j.u,j.v,7.6,2.6):rect(j.u,j.v,2.6,7.6),h:HEADER.pin,asm:'parts'})),
  {id:'IO_PS2',b:[IO_FACE,IO.ps2.v0,IO_FACE+IO.ps2.depth,IO.ps2.v1],h:IO.ps2.h,asm:'io',over:true},
  {id:'IO_LPT',b:[IO_FACE,IO.lpt.v0,IO_FACE+IO.lpt.depth,IO.com.v1],h:IO.lpt.h,asm:'io',over:true},
  {id:'IO_USB',b:[IO_FACE,IO.usb.v0,IO_FACE+IO.usb.depth,IO.usb.v1],h:IO.usb.h,asm:'io',over:true},
  {id:'IO_LAN',b:[IO_FACE,IO.lan.v0,IO_FACE+IO.lan.depth,IO.lan.v1],h:IO.lan.h,asm:'io',over:true},
  {id:'IO_AUDIO',b:[IO_FACE,IO.audio.v0,IO_FACE+IO.audio.depth,IO.audio.v1],h:IO.audio.h,asm:'io',over:true},
 ];
}

// Lettering and marks that small components must leave alone.
export const KEEP:Rect[]=[
 [MODEL_NAME.u0-1,MODEL_NAME.v-3.4,MODEL_NAME.u1+1,MODEL_NAME.v+3.4],[LOGO.u0,LOGO.v-4,LOGO.u1,LOGO.v+4],
 rect(MARKS.fcc[0],MARKS.fcc[1],7,5),rect(MARKS.ce[0],MARKS.ce[1],7,5),[70,173,92,181],rect(STICKER.u,STICKER.v,STICKER.w+1,STICKER.d+1),
 // Socket keep-out and the cooler holes' rings.
 rect(SOCKET.u,SOCKET.v,SOCKET.plate[0]+3,SOCKET.plate[1]+3),...COOLER.map(([u,v])=>rect(u,v,8,8)),
];

// ── Small two-terminal parts, placed by rule in the open board: rows of 0603 and 0805 parts, as the photo shows them. ──
export type Chip2={u:number;v:number;kind:keyof typeof SIZES;turn:boolean};
// [length, width, height, pad offset, pad length, pad width]
export const SIZES={c06:[1.6,.8,.8,.8,.8,.95],r06:[1.6,.8,.45,.8,.8,.95],c08:[2,1.25,.95,1,1,1.4],r08:[2,1.25,.5,1,1,1.4],sot:[2.9,1.6,1.1,1.1,.9,1]} as const;
export const footOf=(c:Chip2):Rect=>{const s=SIZES[c.kind],l=(s[3]+s[4]/2)*2,w=Math.max(s[1],s[5])+(c.kind==='sot'?1.8:0);return c.turn?rect(c.u,c.v,w,l):rect(c.u,c.v,l,w)};
export const emptyRect=(e:typeof EMPTY[number]):Rect=>rect(e.u,e.v,e.r*2+.6,e.r*2+.6);
let made:Chip2[]|null=null;
export function passives():Chip2[]{
 if(made)return made;
 const random=rng(5577),out:Chip2[]=[],taken:Rect[]=[...bodies().map(b=>grow(b.b,.6)),...KEEP,...MOUNTS.map(([u,v])=>rect(u,v,MOUNT.ring*2+1.4,MOUNT.ring*2+1.4)),
  ...PLAIN.map(([u,v,r])=>rect(u,v,r*2+3,r*2+3)),...EMPTY.map(e=>grow(emptyRect(e),.4)),[0,0,BOARD.w,1.6],[0,BOARD.d-1.6,BOARD.w,BOARD.d],[BOARD.w-1.6,0,BOARD.w,BOARD.d],
  [0,0,IO.ps2.depth+IO_FACE+.8,IO.audio.v1+1]];
 const tryPut=(c:Chip2)=>{const f=grow(footOf(c),.3);if(f[0]<1.6||f[2]>BOARD.w-1.6||f[1]<1.6||f[3]>BOARD.d-1.6)return false;for(const t of taken)if(overlap(f,t))return false;taken.push(f);out.push(c);return true};
 // Decoupling round the big packages first.
 const ring=(b:Rect,gap:number,fill:number,kind:'c06'|'r06'='c06')=>{
  const [u0,v0,u1,v1]=b;
  for(let u=u0+1;u<=u1-1;u+=1.9){if(random()<fill)tryPut({u,v:v0-gap,kind,turn:true});if(random()<fill)tryPut({u,v:v1+gap,kind,turn:true})}
  for(let v=v0+1;v<=v1-1;v+=1.9){if(random()<fill)tryPut({u:u0-gap,v,kind,turn:false});if(random()<fill)tryPut({u:u1+gap,v,kind,turn:false})}
 };
 for(const q of QFPS)ring(rect(q.u,q.v,q.w+3,q.d+3),1.8,.55);
 ring(rect(ICH.u,ICH.v,ICH.s,ICH.s),1.8,.5);ring(rect(SOICS[0].u,SOICS[0].v,SOICS[0].w,SOICS[0].d+2.6),1.6,.6);
 // Rows: two to seven of a kind on a common pitch, densest round the chipset and the VRM, sparse in the slot field.
 const kinds:(keyof typeof SIZES)[]=['c06','c06','r06','r06','r06','r06','c08','r08','sot','sot'];
 const dense=(u:number,v:number)=>v<170?1:v>290?.9:(u<40||u>124)?.9:.25;
 for(let tries=0;tries<26000&&out.length<1150;tries++){
  const kind=kinds[Math.floor(random()*kinds.length)],s=SIZES[kind],turn=random()<.5,n=kind==='sot'?1:2+Math.floor(random()*6);
  const step=Math.max(s[1],s[5])+(kind==='sot'?2.6:.6),u=Math.round((2+random()*(BOARD.w-4))*4)/4,v=Math.round((2+random()*(BOARD.d-4))*4)/4;
  if(random()>dense(u,v))continue;
  let run=0;for(let i=0;i<n;i++){const ok=tryPut({u:turn?u+i*step:u,v:turn?v:v+i*step,kind,turn});if(ok)run++;else if(run)break}
 }
 return made=out;
}
