// Console layout, traced from assets/board-3-reference.png (1887 × 2589 px).
//
// Mapping: the image is the card, edge to edge. 0.1 mm per pixel, so the card is 188.7 × 258.9 mm.
//   world x = (px − 943.5) × 0.1      world z = (py − 1294.5) × 0.1      (+Z is the bottom of the image)
// Every position below is written in reference pixels so it can be checked against the image;
// heights are millimetres above the panel face. No three.js in here.
import type {AssemblyId} from './model';

export const PX={w:1887,h:2589};
export const MM=.1;
export const CARD={w:PX.w*MM,d:PX.h*MM,r:10.5,top:6};   // corner radius measured as ≈105 px
export const X=(px:number)=>(px-PX.w/2)*MM;
export const Z=(py:number)=>(py-PX.h/2)*MM;
export const L=(px:number)=>px*MM;
export type P2=[number,number];

// ── Large rotaries: bezel radius, skirt radius, cap radius (px), cap height (mm) ──
export type Knob={id:string;x:number;y:number;r:number;skirt:number;cap:number;h:number;ring:'red'|'scale'|'plain'|'segments'|'ticks'|'pills'|'mech';label:string;rate:number};
export const KNOBS:Knob[]=[
 {id:'knob-a',x:180,y:178,r:145,skirt:100,cap:86,h:9,ring:'red',label:'',rate:1/16},
 {id:'knob-b',x:583,y:190,r:150,skirt:99,cap:80,h:10,ring:'scale',label:'DATA',rate:-1/24},
 {id:'knob-c',x:984,y:175,r:92,skirt:78,cap:66,h:9.5,ring:'plain',label:'',rate:1/12},
 {id:'knob-d',x:1530,y:180,r:155,skirt:102,cap:87,h:10.5,ring:'segments',label:'Lotner',rate:1/32},
 {id:'knob-h',x:1518,y:613,r:165,skirt:102,cap:84,h:10.5,ring:'ticks',label:'Glam',rate:-1/20},
 {id:'knob-j',x:580,y:1428,r:165,skirt:112,cap:97,h:8.5,ring:'pills',label:'',rate:1/28},
 {id:'knob-g',x:565,y:953,r:138,skirt:72,cap:57,h:8,ring:'mech',label:'',rate:-1/10},
];
export const SEGMENTS_D=16;   // orange blocks round knob D, r 108–142 px
export const REST_D=[1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,1]; // which are lit in the image, clockwise from 12 o'clock
// Which blocks are small icon segments rather than plain blocks: the top of the ring, from ten round to half past three.
export const ICON_D=[1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1];
export const PILLS_J=20;      // small orange pills round knob J, r 119–137 px
export const TICKS_H=12;      // grey bars on knob H's skirt, r 112–142 px

// ── Black cup dials down the left side ──
export type Cup={id:string;x:number;y:number;r:number;collar:number;hole:number;style:'dish'|'matte'|'legend';words:string[];rate:number};
export const CUPS:Cup[]=[
 {id:'cup-e',x:198,y:603,r:148,collar:0,hole:80,style:'dish',words:['10','20','30','40','50','60'],rate:0},
 {id:'cup-f',x:198,y:963,r:125,collar:74,hole:58,style:'matte',words:[],rate:0},
 {id:'cup-i',x:198,y:1446,r:128,collar:76,hole:59,style:'matte',words:[],rate:0},
 {id:'cup-k',x:200,y:1799,r:112,collar:68,hole:57,style:'legend',words:['SINE','SQR','SAW','TRI'],rate:1/40},
 {id:'cup-l',x:200,y:2164,r:107,collar:63,hole:55,style:'legend',words:['LOW','MID','HIGH','ALL'],rate:-1/48},
 {id:'cup-m',x:198,y:2478,r:105,collar:63,hole:55,style:'legend',words:['OFF','SOFT','HARD','MAX'],rate:1/56},
];

// ── Displays. `box` is the bezel (x0,y0,x1,y1); `screen` the lit glass ──
export const LCD={box:[375,375,757,790] as const,screen:[440,450,667,731] as const,h:3,r:30};
export const TALL={box:[386,1705,738,2586] as const,screen:[408,1716,722,2540] as const,h:3,r:26};
// The touch panel is an L: a main body with a tab at the upper right; the canister sits in the notch.
export const TOUCH={box:[1141,855,1745,1845] as const,notch:[1520,1060] as const,h:2.6,r:42,
 screen:[1270,1080,1690,1800] as const};
export const touchOutline=():P2[]=>{const [x0,y0,x1,y1]=TOUCH.box,[nx,ny]=TOUCH.notch;return [[x0,ny],[nx,ny],[nx,y0],[x1,y0],[x1,y1],[x0,y1]]};

// ── Lit round buttons (cap radius px) ──
export const YELLOW_GRID:P2[]=[[915,405],[1013,405],[916,563],[1013,561],[917,723],[1014,721]];
export const AMBER:P2=[1011,870];
export const YELLOW_COLUMN:P2[]=[1949,2049,2152,2249,2347,2447,2544].map(y=>[1654,y] as P2);
export const BUTTON={r:28,collar:36,h:5.2};
export const BUTTONS:P2[]=[...YELLOW_GRID,AMBER,...YELLOW_COLUMN];   // lighting order in Play

// ── Pill keys, 32 × 72 px ──
export const PILL={w:32,h:72,y1:2.2};
export const PILLS:{x:number;y:number;light:boolean}[]=[
 {x:1323,y:1939,light:true},{x:1323,y:2041,light:true},{x:1323,y:2149,light:true},
 {x:1430,y:1939,light:false},{x:1430,y:2041,light:false},{x:1430,y:2147,light:false},
 {x:1521,y:1939,light:false},{x:1521,y:2041,light:false},
 {x:1430,y:2542,light:false},{x:1521,y:2538,light:false},{x:971,y:2021,light:false},
];

// ── Small round parts: [id, x, y, radius px, look, height mm, host] ──
export type Small={id:string;x:number;y:number;r:number;look:string;h:number;on?:string;asm:AssemblyId};
const sm=(id:string,x:number,y:number,r:number,look:string,h:number,asm:AssemblyId,on?:string):Small=>({id,x,y,r,look,h,asm,on});
export const SMALLS:Small[]=[
 sm('hole-top',332,52,33,'well',1.2,'panel'),
 sm('jack-top',1262,45,22,'jack',9,'wiring'),
 sm('toggle-red',1308,125,25,'toggleRed',7,'buttons'),
 sm('knob-dot',1708,272,25,'dot',9,'knobs'),
 sm('knob-t',1773,337,21,'tee',9,'knobs'),
 sm('trim-1',1691,385,25,'trim',8,'knobs'),
 sm('trim-2',1688,472,25,'trim',8,'knobs'),
 sm('gauge-mini',1716,670,28,'gauge',4,'pipework'),
 sm('rail-knob',1772,713,28,'black',9,'rail','rail'),
 sm('knob-orange',1428,803,25,'orangeRing',7,'knobs'),
 sm('pointer-b',686,295,16,'block',6,'knobs','knob-b'),
 sm('hex',872,1348,38,'hex',6,'pipework'),
 sm('slot-knob',1096,1276,44,'slot',10,'knobs'),
 sm('valve-knob',1161,1721,35,'valve',13,'pipework','touch-main'),
 sm('ring-i',205,1343,20,'ring',3.6,'knobs','cup-i'),
 sm('lever-i',107,1466,16,'trim',5,'knobs','cup-i'),
 sm('conic-big-1',1221,1936,40,'conic',9,'pipework'),
 sm('conic-big-2',1219,2046,40,'conic',9,'pipework'),
 sm('valve-1',1099,2247,30,'port',5,'pipework'),
 sm('valve-2',1099,2344,30,'port',5,'pipework'),
 sm('valve-3',1104,2454,27,'portSlot',5,'pipework'),
 sm('tee-1',1226,2344,45,'hexBoss',6,'pipework'),
 sm('tee-2',1211,2459,40,'slotBoss',6,'pipework'),
 sm('lever-knob',1308,2539,35,'lever',8,'knobs'),
 sm('key-knob',1525,2154,20,'trim',7,'buttons'),
 sm('white-cap',1525,1954,17,'white',4.2,'buttons','pill-6'),
 sm('slot-screw',1528,2454,17,'trim',5,'buttons'),
 sm('foot',1768,2542,27,'black',7,'rail'),
 sm('jack-bl',336,2534,14,'jack',3,'wiring'),
 sm('led-blue',363,818,10,'ledBlue',2.2,'buttons'),
 sm('toggle-1',999,933,9,'mini',5,'buttons'),sm('toggle-2',999,962,9,'mini',5,'buttons'),sm('toggle-3',999,1018,9,'mini',5,'buttons'),
 sm('toggle-4',776,808,12,'mini',6,'buttons'),sm('toggle-5',996,1356,13,'mini',6,'buttons'),sm('toggle-6',1528,2359,10,'mini',5,'buttons'),
 sm('red-btn',462,963,15,'red',4.6,'buttons','knob-g'),
 sm('stud-a',1445,885,22,'studFlat',4,'pipework'),sm('stud-b',1488,983,27,'studBlack',4,'pipework'),
 sm('stud-low',1788,2354,8,'stud',8,'rail','rail'),
 sm('tube-cap',770,1892,13,'black',4,'pipework'),
];
// Conical chrome valve knobs in a column, and the three ports their copper lines feed.
export const CONICS:P2[]=[2034,2144,2249,2344,2444,2544].map(y=>[833,y] as P2);
export const CONIC={r:42,h:8};

// ── Rectangular modules: [id, cx, cy, w, h (px), height mm, look, corner px, asm] ──
export type Module={id:string;x:number;y:number;w:number;h:number;y1:number;look:string;r:number;asm:AssemblyId;on?:string};
const md=(id:string,x:number,y:number,w:number,h:number,y1:number,look:string,r:number,asm:AssemblyId,on?:string):Module=>({id,x,y,w,h,y1,look,r,asm,on});
export const MODULES:Module[]=[
 md('grey-block',1171,290,125,105,9,'satin',16,'buttons'),
 md('switch-mod',821,300,50,95,3,'rocker',10,'buttons'),
 md('slot-chrome',1081,52,85,30,1.6,'slotChrome',15,'panel'),
 md('slot-black',809,430,55,95,1,'slotBlack',27,'panel'),
 md('conn-a',350,240,60,36,5,'barrel',4,'wiring'),
 md('mod-a',360,335,75,40,3,'trio',10,'buttons'),
 md('red-block',1196,395,50,30,5,'red',4,'wiring'),
 md('cable-conn-1',1094,543,62,62,6,'grommet',16,'wiring'),
 md('cable-conn-2',1094,685,66,66,6,'grommet',16,'wiring'),
 md('black-conn',1318,773,90,78,10,'barrelBig',6,'pipework'),
 md('silver-block',1372,985,144,140,9.5,'silver',18,'pipework'),
 md('square-mod',897,1146,205,190,8,'square',28,'buttons'),
 md('gauge-mod',75,1156,85,85,4,'gaugeMod',9,'pipework'),
 md('orange-conn',142,1156,40,30,4,'orange',4,'wiring'),
 md('orange-cell',205,1218,54,30,4,'orangeCyl',4,'wiring'),
 md('pair-mod',112,1261,50,90,3,'pair',7,'buttons'),
 md('clip-mod',505,1246,45,50,3,'clip',7,'wiring'),
 md('knob-sq',1109,1431,56,56,3,'squareKnob',9,'buttons'),
 md('conn-mod',1054,2041,80,40,3,'pins',6,'wiring'),
 md('black-cyl',1024,2147,75,30,5,'barrel',4,'pipework'),
 md('switch-grey',1101,2533,105,98,4,'greySwitch',16,'buttons'),
 md('clamp',1365,2307,30,80,5,'clamp',5,'pipework'),
 // Cable ties and clips across the loom; each bridges both layers of cable.
 ...[455,760,900,1010,1113,1173].map((y,i)=>md(`tie-${i}`,1094,y,90,i<4?14:22,3.5,'tie',3,'wiring')),
 md('probe-red',674,1153,40,28,4,'redCyl',4,'wiring'),
 md('chip-a',991,1313,26,36,2,'chipBlue',3,'buttons'),md('chip-b',1024,1528,26,40,2,'chipBlue',3,'buttons'),
 md('key-a',916,2317,22,36,2,'keyOrange',5,'buttons'),md('key-b',914,2408,24,48,2,'chipBlue',3,'buttons'),md('key-c',914,2489,24,36,2,'keyOrange',5,'buttons'),
];
// Raised round sub-panel at lower centre, with the parts that stand on it.
export const DISC={id:'sub-disc',x:979,y:1694,r:135,y1:1.2};
export const DISC_PARTS:Module[]=[
 md('sub-mod',959,1609,150,65,4.4,'subMod',16,'buttons','sub-disc'),
 md('sub-chip-1',944,1671,30,24,3,'chipBlue',3,'buttons','sub-disc'),md('sub-chip-2',946,1706,30,24,3,'chipBlue',3,'buttons','sub-disc'),
 md('sub-chip-3',910,1748,22,26,3,'chip',3,'buttons','sub-disc'),md('sub-chip-4',948,1748,24,26,3,'chip',3,'buttons','sub-disc'),
];
export const DISC_PORT:P2=[996,1679];

// The chrome canister lies along Z in the notch of the touch panel; its stem crosses above the panel margin.
export const CANISTER={x:1200,y0:815,y1:1171,r:57,stem:17,axis:6.2};

// ── Edge rail ──
export const RAIL={x0:1775,x1:1880,y0:663,y1:2480,h:7,strip:[1805,110,1880,660] as const};
export const STUDS:P2[]=Array.from({length:12},(_,i)=>[1790,835+i*83] as P2);
export const LEFT_STRIP={x0:8,x1:30,y0:430,y1:2400,h:.8};

// Pan-head fixing screws through the deck, px. Each stands in open deck (a layout test checks it).
export const SCREWS:P2[]=[[430,60],[1345,70],[340,1694],[84,2540],[1283,2432],[1452,2442]];

// ── Tube runs (centre lines, px) ──
export type Run={id:string;kind:'copper'|'steel'|'hose'|'chromeFat';r:number;y:number;pts:P2[]};
export const RUNS:Run[]=[
 {id:'cu-0',kind:'copper',r:7,y:2.6,pts:[[775,1893],[900,1915],[1040,1941],[1085,1941],[1113,1925],[1119,1890],[1119,1862]]},
 {id:'cu-1',kind:'copper',r:7,y:3.4,pts:[[872,2034],[905,2034],[922,2048],[924,2075],[924,2094]]},
 {id:'cu-2',kind:'copper',r:7,y:3.4,pts:[[872,2249],[960,2249],[1072,2249]]},
 {id:'cu-3',kind:'copper',r:7,y:3.4,pts:[[872,2346],[960,2346],[1072,2346]]},
 {id:'cu-4',kind:'copper',r:7,y:3.4,pts:[[872,2452],[960,2452],[1078,2453]]},
 {id:'cu-5',kind:'copper',r:7,y:3.4,pts:[[872,2546],[930,2545],[972,2530],[989,2512]]},
 {id:'st-0',kind:'steel',r:7,y:3,pts:[[1061,2140],[1150,2140],[1190,2146],[1211,2168],[1213,2230],[1213,2300]]},
 {id:'st-1',kind:'steel',r:6,y:3,pts:[[1061,2158],[1140,2158],[1176,2164],[1193,2184],[1195,2240],[1196,2300]]},
 {id:'st-2',kind:'steel',r:8,y:6.4,pts:[[1322,2282],[1326,2258],[1345,2247],[1420,2246],[1492,2247],[1510,2258],[1513,2290],[1513,2326]]},
 {id:'st-3',kind:'steel',r:4,y:6.4,pts:[[1343,2229],[1436,2229],[1528,2229]]},
 {id:'st-4',kind:'chromeFat',r:12,y:6,pts:[[1262,2300],[1300,2294],[1352,2292]]},
 {id:'st-5',kind:'steel',r:7,y:6,pts:[[1368,2352],[1370,2385],[1384,2403],[1408,2407]]},
 {id:'st-6',kind:'chromeFat',r:11,y:4,pts:[[1226,2344],[1220,2400],[1211,2459]]},
 {id:'st-7',kind:'chromeFat',r:10,y:5,pts:[[1232,2338],[1250,2318],[1262,2300]]},
 {id:'hose-0',kind:'hose',r:10,y:4,pts:[[1029,1839],[1090,1848],[1150,1880],[1196,1915],[1216,1932]]},
 {id:'hose-1',kind:'hose',r:8,y:3,pts:[[989,2512],[1015,2535],[1050,2548],[1090,2552]]},
 {id:'hose-2',kind:'hose',r:10,y:3.4,pts:[[1229,2504],[1231,2540],[1229,2580]]},
];
// Order in which Play lights the copper lines.
export const FLOW=['cu-0','cu-1','cu-2','cu-3','cu-4','cu-5'];

// ── Wires. The loose leads are authored in `wiring.ts`; the loom down the centre is generated in `loom()` ──
// The loom: eight cables on the panel and six more bedded on top of them, each 1 mm thick, tied at intervals.
// `top` and `foot` give each cable's colour above and below the split (b black, o orange).
// The fan: eleven leads peel off to ribbed plugs on the right.
export const LOOM={lower:[1052,1064,1076,1088,1100,1112,1124,1136],upper:[1058,1070,1082,1106,1118,1130],r:5,rise:.95,
 top:{lower:'bbobbbob',upper:'bbobbb'},foot:{lower:'boobooob',upper:'obbobb'},split:790,y0:405,y1:1236,fanX:1252,
 // Rows of the connector fan, measured on a 2.4× crop: two close together at the top, then nine at about 35 px pitch.
 fanY:[419,437,465,498,532,568,603,638,673,708,743]};

// ── Probes lying on the panel: [x0, x1, y, look] ──
export const PROBES:{id:string;x0:number;x1:number;y:number;look:'steel'|'red'|'tip';r:number}[]=[
 {id:'probe-a',x0:396,x1:470,y:1080,look:'steel',r:9},
 {id:'probe-b',x0:496,x1:626,y:1153,look:'steel',r:10},
 {id:'probe-c',x0:390,x1:572,y:1641,look:'tip',r:11},
];
export const PROBE_V={id:'probe-v',x:814,y0:622,y1:722,r:9};

// Tops of the parts that carry other parts, mm above the panel face.
const HOST_TOP:Record<string,number>={'knob-b':1.6,'knob-g':3,'cup-i':2.4,'touch-main':2.6,rail:7,'sub-disc':1.2,'pill-6':2.2};

// ── Footprints, for the inventory count and the layout tests ──
export type Foot={id:string;asm:AssemblyId;kind:string;x:number;y:number;r?:number;w?:number;h?:number;y0:number;y1:number;on?:string};
const rectFoot=(id:string,asm:AssemblyId,kind:string,[x0,y0,x1,y1]:readonly number[],top:number,base=0):Foot=>({id,asm,kind,x:(x0+x1)/2,y:(y0+y1)/2,w:x1-x0,h:y1-y0,y0:base,y1:top});
export const footprints:Foot[]=[
 ...KNOBS.map(k=>({id:k.id,asm:'knobs' as AssemblyId,kind:'knob',x:k.x,y:k.y,r:k.r,y0:0,y1:k.h})),
 ...CUPS.map(c=>({id:c.id,asm:'knobs' as AssemblyId,kind:'cup',x:c.x,y:c.y,r:c.r,y0:0,y1:7.5})),
 rectFoot('lcd','displays','display',LCD.box,LCD.h),
 rectFoot('tall','displays','display',TALL.box,TALL.h),
 rectFoot('touch-main','displays','display',[TOUCH.box[0],TOUCH.notch[1],TOUCH.box[2],TOUCH.box[3]],TOUCH.h),
 rectFoot('touch-tab','displays','display',[TOUCH.notch[0],TOUCH.box[1],TOUCH.box[2],TOUCH.notch[1]],TOUCH.h),
 ...BUTTONS.map(([x,y],i)=>({id:`button-${i}`,asm:'buttons' as AssemblyId,kind:'button',x,y,r:BUTTON.collar,y0:0,y1:BUTTON.h})),
 ...PILLS.map((p,i)=>({id:`pill-${i}`,asm:'buttons' as AssemblyId,kind:'pill',x:p.x,y:p.y,w:PILL.w,h:PILL.h,y0:0,y1:PILL.y1})),
 ...SMALLS.map(s=>({id:s.id,asm:s.asm,kind:s.look,x:s.x,y:s.y,r:s.r,y0:s.on?HOST_TOP[s.on]??0:0,y1:(s.on?HOST_TOP[s.on]??0:0)+s.h,on:s.on})),
 ...CONICS.map(([x,y],i)=>({id:`conic-${i}`,asm:'pipework' as AssemblyId,kind:'conic',x,y,r:CONIC.r,y0:0,y1:CONIC.h})),
 ...MODULES.map(m=>({id:m.id,asm:m.asm,kind:m.look,x:m.x,y:m.y,w:m.w,h:m.h,y0:0,y1:m.y1,on:m.on})),
 {id:DISC.id,asm:'panel',kind:'disc',x:DISC.x,y:DISC.y,r:DISC.r,y0:0,y1:DISC.y1},
 ...DISC_PARTS.map(m=>({id:m.id,asm:m.asm,kind:m.look,x:m.x,y:m.y,w:m.w,h:m.h,y0:DISC.y1,y1:m.y1,on:m.on})),
 {id:'disc-port',asm:'pipework',kind:'port',x:DISC_PORT[0],y:DISC_PORT[1],r:18,y0:DISC.y1,y1:5,on:'sub-disc'},
 // The canister body rests on the panel; its stem is a 1.7 mm rod at axis height, clear of the touch glass.
 {id:'canister',asm:'pipework',kind:'canister',x:CANISTER.x,y:(CANISTER.y0+1058)/2,w:CANISTER.r*2,h:1058-CANISTER.y0,y0:0,y1:CANISTER.axis+L(CANISTER.r)},
 {id:'canister-stem',asm:'pipework',kind:'canister',x:CANISTER.x,y:(1062+CANISTER.y1)/2,w:CANISTER.stem*2,h:CANISTER.y1-1062,y0:CANISTER.axis-L(CANISTER.stem),y1:CANISTER.axis+L(CANISTER.stem)},
 rectFoot('rail','rail','rail',[RAIL.x0,RAIL.y0,RAIL.x1,RAIL.y1],RAIL.h),
 rectFoot('rail-strip','rail','rail',RAIL.strip,1.2),
 rectFoot('left-strip','panel','strip',[LEFT_STRIP.x0,LEFT_STRIP.y0,LEFT_STRIP.x1,LEFT_STRIP.y1],LEFT_STRIP.h),
 ...STUDS.map(([x,y],i)=>({id:`stud-${i}`,asm:'rail' as AssemblyId,kind:'stud',x,y,r:9,y0:RAIL.h,y1:RAIL.h+2,on:'rail'})),
 ...PROBES.map(p=>({id:p.id,asm:'wiring' as AssemblyId,kind:'probe',x:(p.x0+p.x1)/2,y:p.y,w:p.x1-p.x0,h:p.r*2,y0:0,y1:L(p.r)*2})),
 {id:PROBE_V.id,asm:'wiring',kind:'probe',x:PROBE_V.x,y:(PROBE_V.y0+PROBE_V.y1)/2,w:PROBE_V.r*2,h:PROBE_V.y1-PROBE_V.y0,y0:0,y1:L(PROBE_V.r)*2},
];

export const at=(id:string)=>{const f=footprints.find(f=>f.id===id);if(!f)throw new Error(`No footprint ${id}`);return f};
// Half-extents of a footprint in px.
export const half=(f:Foot):P2=>f.r!==undefined?[f.r,f.r]:[f.w!/2,f.h!/2];
// Is a point inside the rounded card?
export function inside(x:number,y:number){
 const r=CARD.r/MM;if(x<0||y<0||x>PX.w||y>PX.h)return false;
 const cx=Math.min(Math.max(x,r),PX.w-r),cy=Math.min(Math.max(y,r),PX.h-r);
 return Math.hypot(x-cx,y-cy)<=r+1e-6;
}
// Plan overlap of two footprints (circle–circle, rect–rect, circle–rect), in px.
export function overlap(a:Foot,b:Foot){
 if(a.r!==undefined&&b.r!==undefined)return Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r;
 if(a.r===undefined&&b.r===undefined)return Math.abs(a.x-b.x)<(a.w!+b.w!)/2&&Math.abs(a.y-b.y)<(a.h!+b.h!)/2;
 const [c,q]=a.r!==undefined?[a,b]:[b,a];
 const dx=Math.max(Math.abs(c.x-q.x)-q.w!/2,0),dy=Math.max(Math.abs(c.y-q.y)-q.h!/2,0);
 return Math.hypot(dx,dy)<c.r!;
}
// Loom paths: fourteen cables down the centre in two bedded layers, then eleven that fan out to the right.
export type Strand={tone:'black'|'orange';pts:P2[];h:number;lead:boolean};
export function loom(){
 const tone=(c:string)=>c==='o'?'orange' as const:'black' as const,trunk:Strand[]=[];
 // Above the split the loom is mostly black; below it more orange braids show.
 for(const layer of ['lower','upper'] as const)LOOM[layer].forEach((x,i)=>{
  const h=layer==='upper'?LOOM.rise:0;
  trunk.push({tone:tone(LOOM.top[layer][i]),h,lead:true,pts:[[1148+i*5,352],[x+26,388],[x,440],[x,600],[x,LOOM.split]]});
  trunk.push({tone:tone(LOOM.foot[layer][i]),h,lead:false,pts:[[x,LOOM.split],[x,900],[x,1050],[x,LOOM.y1]]});
 });
 const fan=LOOM.fanY.map((y,i)=>[[1144,430+i*10],[1152,y-34],[1174,y-6],[1200,y],[LOOM.fanX,y]] as P2[]);
 return {trunk,fan};
}
export const loomCount=LOOM.lower.length+LOOM.upper.length+LOOM.fanY.length;
export const inventorySize=(leads:number)=>footprints.length+RUNS.length+leads+loomCount;
