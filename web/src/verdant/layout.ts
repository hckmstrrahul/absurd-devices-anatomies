// Verdant layout, traced from assets/board-1-reference.png (1605 × 2589 px).
// The image is a rounded card that the board fills edge to edge, so the card IS the board.
// Scale: 0.1 mm per pixel, giving a 160.5 × 258.9 mm board. Pixel (802.5, 1294.5) is the origin;
// image x → world +X, image y → world +Z. Every box below is [x0, y0, x1, y1] in reference pixels,
// read from a 3 × 5 grid of 2× crops (shots/verdant/ref/t<row><col>.png). Heights are estimates in mm.
import {rng} from '../kit/util';
import {TRACED,TRACED_ICS} from './traced';
import type {AssemblyId} from './model';

export const PX=.1;
export const IMG={w:1605,h:2589};
export const CARD={w:IMG.w*PX,d:IMG.h*PX,r:6.5,t:1.6};
export const TOP=CARD.t;                                   // board top surface, mm
export const X=(px:number)=>(px-IMG.w/2)*PX;
export const Z=(py:number)=>(py-IMG.h/2)*PX;
export type Box=[number,number,number,number];
export type P2=[number,number];
export const centre=(b:Box):P2=>[(b[0]+b[2])/2,(b[1]+b[3])/2];
export const size=(b:Box):P2=>[b[2]-b[0],b[3]-b[1]];
export const hit=(a:Box,b:Box,gap=0)=>a[0]<b[2]+gap&&b[0]<a[2]+gap&&a[1]<b[3]+gap&&b[1]<a[3]+gap;

// ── Finishes a part can ask for (materials are made in parts.ts) ────────────
export type Mat='steelA'|'steelB'|'pitted'|'silver'|'chrome'|'darksteel'|'black'|'gloss'|'matte'|'iron'|'tan'|'gold'|'brass'|'lime'|'pale'|'white'|'orange'|'navy'|'grey'|'yellow';

// ── Chips ─────────────────────────────────────────────────────────────────
export type Chip={id:string;asm:AssemblyId;b:Box;ht:number;tone:'black'|'navy'|'pale';leads?:'gold'|'silver';sides?:string;mark?:string;emblem?:'dial'|'square'|'cross'|'ring'|'dot'|'bars';r?:number;frame?:'gold';on?:string;bare?:boolean;long?:number};
// Every package shows its leads unless it is a leadless (bare) one: silver along the two long sides by default.
export const leadsOf=(c:Chip)=>c.bare||c.on?null:{metal:c.leads??'silver' as const,sides:c.sides??((c.b[2]-c.b[0])>(c.b[3]-c.b[1])?'tb':'lr')};
const chip=(id:string,b:Box,o:Partial<Chip>={}):Chip=>({id,asm:'logic',b,ht:1.6,tone:'black',...o});
export const CHIPS:Chip[]=[
 // Upper left cluster.
 chip('u1',[196,262,250,338],{leads:'gold',sides:'lr',mark:'VR3990',emblem:'bars'}),
 chip('u2',[43,382,111,452],{leads:'gold',sides:'l',emblem:'ring',mark:'A3'}),
 chip('u3',[228,440,292,505],{mark:'AVR',emblem:'ring'}),
 chip('u4',[78,472,175,595],{ht:1.8,leads:'gold',sides:'lrtb',emblem:'ring',long:2.1}),
 chip('u5',[295,12,330,57],{r:7,bare:true}),chip('u6',[263,78,290,107]),chip('u7',[297,75,317,103]),chip('u8',[295,128,317,155]),
 chip('u9',[172,183,197,208]),chip('u10',[175,36,196,60]),chip('u11',[100,335,142,356],{ht:1}),chip('u12',[228,372,250,405]),chip('u13',[150,277,168,300],{ht:1}),
 // Left of the processor.
 chip('u14',[353,1083,393,1145],{r:6,emblem:'dot',bare:true}),chip('u15',[390,1375,457,1445],{tone:'navy',emblem:'dot',r:6,bare:true}),chip('u16',[373,1515,425,1582],{tone:'navy',emblem:'ring',r:5,bare:true}),
 chip('u17',[322,1245,340,1263],{ht:1}),chip('u18',[362,1245,380,1263],{ht:1}),chip('u19',[397,1297,416,1315],{ht:1}),
 chip('u20',[105,1640,152,1705],{r:5,bare:true}),chip('u21',[78,1733,135,1800],{leads:'silver',sides:'lrt',mark:'MCU32'}),chip('u22',[445,1918,485,1970]),
 chip('u23',[122,1092,164,1126],{leads:'silver',sides:'b',ht:1.2}),chip('u24',[98,1508,150,1560],{ht:1.4,leads:'silver',sides:'lr'}),
 // Right of the processor.
 chip('u25',[1370,733,1473,850],{ht:2,r:9,mark:'NOVA',emblem:'dot',bare:true}),chip('u26',[1250,872,1328,950],{ht:1.8,r:8,mark:'30N',bare:true}),
 chip('u27',[1362,947,1437,1034],{ht:1.8,r:7,emblem:'dial',bare:true}),chip('u28',[1238,787,1257,806],{ht:1}),chip('u29',[1266,785,1286,806],{ht:1}),
 chip('u30',[1048,1385,1075,1410],{ht:1}),chip('u31',[1042,1435,1062,1458],{ht:1}),chip('u32',[1268,1290,1288,1320],{ht:1.1,leads:'silver',sides:'lr'}),
 chip('u33',[1232,1554,1303,1655],{ht:1.8,r:5,bare:true}),
 // Lower right field.
 chip('u34',[1080,1848,1125,1898],{emblem:'ring',r:4,bare:true}),chip('u35',[1208,1868,1252,1925],{emblem:'ring',frame:'gold',r:4,on:'x-goldframe'}),
 chip('u36',[1097,1942,1172,2018],{tone:'pale',emblem:'cross',leads:'silver',sides:'l',r:6}),
 chip('u37',[1335,1900,1375,1950],{emblem:'ring',r:4,bare:true}),chip('u38',[1315,1985,1365,2022],{mark:'CLK',r:4,bare:true}),chip('u39',[1392,1992,1412,2012],{ht:1}),
 chip('u40',[1172,2125,1255,2202],{ht:1.8,leads:'gold',sides:'tr',emblem:'square',r:5}),
 chip('u41',[1398,2285,1432,2316]),chip('u42',[1170,2340,1208,2390],{r:5,bare:true}),chip('u43',[1168,2425,1200,2470],{r:5,bare:true}),
 chip('u44',[1305,2432,1355,2478],{leads:'silver',sides:'lr',r:4}),chip('u45',[1405,2427,1455,2478],{leads:'silver',sides:'lrtb',r:4}),
 chip('u46',[1305,2505,1355,2550],{leads:'silver',sides:'lrt',r:4}),chip('u47',[1405,2510,1455,2555],{leads:'silver',sides:'lrt',r:4}),
 // Around the lower sockets and the middle.
 chip('u48',[135,2500,210,2560],{ht:1.4,bare:true}),chip('u49',[995,1583,1016,1601],{ht:1}),chip('u50',[888,1630,912,1648],{ht:1}),chip('u51',[440,1608,462,1626],{ht:1}),
 chip('u52',[590,1612,612,1630],{ht:1}),chip('u53',[566,1618,582,1640],{ht:1}),
 // Regulators above the processor.
 chip('q1',[689,866,711,885],{asm:'power',ht:1.1}),chip('q2',[746,866,768,885],{asm:'power',ht:1.1}),chip('q3',[800,866,822,885],{asm:'power',ht:1.1}),
 chip('q4',[645,860,662,874],{asm:'power',ht:1}),
];

// ── Round parts ───────────────────────────────────────────────────────────
export type Round={id:string;asm:AssemblyId;c:P2;r:number;ht:number;style:'silverCan'|'blackCan'|'navyPost'|'blackPost'|'bigPost'|'boss'|'goldCan'|'goldPad'|'jack'|'darkJack'|'knob'|'button'|'pad';text?:string;on?:string};
const round=(id:string,asm:AssemblyId,x:number,y:number,r:number,ht:number,style:Round['style'],text?:string,on?:string):Round=>({id,asm,c:[x,y],r,ht,style,text,on});
export const ROUNDS:Round[]=[
 round('c1','power',397,840,60,8,'silverCan','16 V'),round('c2','power',985,840,62,8,'silverCan','2'),
 round('c3','power',97,2042,58,8,'silverCan','4'),round('c4','power',443,2285,58,8,'silverCan',''),
 round('c5','power',1160,660,65,9,'blackCan','POLY|680'),
 round('c6','power',1200,490,28,3.2,'goldCan'),round('c7','power',1218,574,24,3.2,'goldCan'),round('c8','power',1117,557,18,.9,'goldPad'),
 round('c9','power',1105,440,20,.8,'pad'),round('c10','power',1100,596,12,.8,'pad'),round('c11','power',1262,546,12,.8,'pad'),
 round('p1','logic',447,1791,55,6.5,'navyPost','FLEX A 10P 50V'),round('p2','logic',995,1805,57,6.5,'blackPost','FLEX B'),
 round('p3','logic',105,78,72,10,'bigPost'),
 round('b1','ports',123,835,38,7,'boss'),round('b2','ports',120,960,52,8,'boss'),round('b3','ports',123,1228,50,8,'boss'),round('b4','ports',123,1392,52,8,'boss'),
 round('j1','ports',1560,170,44,7.5,'jack',undefined,'e2'),round('j2','ports',1560,520,44,7.5,'knob',undefined,'e4'),
 round('j3','ports',1554,799,50,8.5,'jack',undefined,'e6'),round('j4','ports',1554,1372,50,8,'darkJack',undefined,'e10'),
 round('j5','ports',1560,1642,44,8.5,'darkJack',undefined,'e12'),round('j6','ports',1560,1757,44,8.5,'darkJack',undefined,'e12'),
 round('j7','ports',1558,2215,46,8.5,'jack',undefined,'e15'),round('j8','ports',1530,2553,28,3,'jack'),
 round('k1','cooling',650,548,15,3.6,'button',undefined,'k0'),
 round('i1','ports',1464,1205,10,9.25,'pad',undefined,'h-a'),round('i2','ports',1466,1262,10,9.25,'pad',undefined,'h-a'),round('i3','ports',1437,1062,9,8.7,'pad',undefined,'h-a-neck'),
];

// ── Blocks: rounded or square prisms. `y0` is where the underside sits above the board. ──
export type Block={id:string;asm:AssemblyId;b:Box;ht:number;mat:Mat;r?:number;y0?:number;on?:string;bevel?:number;label?:string};
const block=(id:string,asm:AssemblyId,b:Box,ht:number,mat:Mat,o:Partial<Block>={}):Block=>({id,asm,b,ht,mat,...o});
export const BLOCKS:Block[]=[
 // Cooling.
 block('k-plate','cooling',[482,0,888,392],4.2,'darksteel',{r:10}),
 block('k-block1','cooling',[520,0,885,325],13,'steelA',{r:9,on:'k-plate',bevel:.7,label:'custom'}),
 block('k-block2','cooling',[695,397,970,622],10.5,'steelB',{r:13,bevel:.9}),
 block('k0','cooling',[600,420,694,612],2.6,'matte',{r:3}),
 block('k-tab','cooling',[783,624,835,742],1.1,'silver',{r:5}),
 block('k-lever','cooling',[292,245,318,560],1.6,'silver',{r:8}),
 block('k-leaf','cooling',[906,322,1062,388],2.6,'chrome',{label:'custom'}),block('k-knuckle','cooling',[1064,320,1087,382],5,'gloss',{r:8,bevel:.6}),
 block('k-head','cooling',[1085,0,1335,150],12.5,'pitted',{r:34,bevel:1.6}),block('k-headtop','cooling',[1102,0,1296,84],12.9,'pitted',{r:16,on:'k-head',bevel:.3}),
 block('k-machine','cooling',[890,0,1083,146],14,'darksteel',{label:'custom'}),
 block('k-end1','cooling',[1088,300,1150,362],4.6,'silver',{r:9,bevel:.5}),block('k-end2','cooling',[1284,292,1344,356],4.6,'silver',{r:9,bevel:.5}),
 // Processor latches (the cover itself is COVER below).
 block('cpu-latchL','cpu',[481,1108,497,1247],3.4,'gold',{r:2}),block('cpu-latchR','cpu',[943,1104,957,1152],3.2,'silver',{r:2}),
 // Power: inductors, terminal blocks and the comb of ferrites.
 ...Array.from({length:13},(_,i)=>block(`f${i}`,'power',[17+i*27,677,35+i*27,720],2.6,'pale',{r:1.5})),
 ...[0,1,2,3].map(i=>block(`l1${i}`,'power',[985+i*13,1620,996+i*13,1646],1.8,'silver',{r:1})),
 block('l20','power',[428,1085,444,1112],2,'pale',{r:1}),block('l21','power',[448,1085,464,1112],2,'pale',{r:1}),
 ...[0,1,2].map(i=>block(`l3${i}`,'power',[420+i*17,1128,434+i*17,1157],2,'pale',{r:1})),
 ...[0,1,2].map(i=>block(`l4${i}`,'power',[316+i*9,1165,324+i*9,1206],2,'pale',{r:1})),
 block('l50','power',[354,1175,384,1188],1.8,'pale',{r:1}),block('l51','power',[354,1192,384,1205],1.8,'pale',{r:1}),
 block('l60','power',[317,2072,360,2128],5,'silver',{r:5,bevel:.5,label:'can'}),block('l61','power',[366,2072,410,2128],5,'silver',{r:5,bevel:.5,label:'can'}),
 ...[0,1,2].map(i=>block(`l7${i}`,'power',[556+i*26,914,574+i*26,940],1.6,'tan',{r:1})),
 ...[0,1,2,3].map(i=>block(`l8${i}`,'power',[20+i*17,288,33+i*17,312],1.8,'tan',{r:1})),...[0,1,2,3,4].map(i=>block(`l9${i}`,'power',[19+i*15,326,31+i*15,346],1.8,'tan',{r:1})),
 ...[0,1,2,3,4].map(i=>block(`la${i}`,'power',[148+i*15,405,160+i*15,426],1.8,'pale',{r:1})),
 ...[0,1,2,3].map(i=>block(`lb${i}`,'power',[114+(i%2)*17,240+(i>>1)*16,128+(i%2)*17,253+(i>>1)*16],1.6,'grey',{r:1})),
 ...Array.from({length:15},(_,i)=>block(`lc${i}`,'power',[12+(i%3)*10,1115+Math.floor(i/3)*32,20+(i%3)*10,1138+Math.floor(i/3)*32],1.4,'pale',{r:1})),
 block('t1','power',[15,1732,52,1768],3.4,'silver',{r:2,label:'screw'}),block('t2','power',[15,1776,52,1812],3.4,'silver',{r:2,label:'screw'}),
 block('g1','power',[967,1945,1002,1975],3,'tan',{r:2,label:'coil'}),block('g2','power',[950,2008,995,2040],3,'tan',{r:2,label:'coil'}),
 block('g3','power',[950,2098,1000,2126],3,'tan',{r:2,label:'coil'}),block('g4','power',[962,2182,1003,2212],3,'tan',{r:2,label:'coil'}),
 block('hs1','power',[580,785,620,865],3.4,'matte',{r:3,label:'fins-h'}),
 block('cap-oblong','power',[1287,480,1357,632],7,'gloss',{r:22,bevel:1.2,label:'470UF 16V'}),
 block('sq1','power',[1262,658,1284,680],1.8,'grey',{r:1}),block('sq2','power',[1288,646,1310,668],1.8,'grey',{r:1}),
 block('sq3','power',[322,192,345,222],2,'silver',{r:1}),block('sq4','power',[348,192,368,220],2,'silver',{r:1}),
 block('sq5','power',[222,108,238,130],1.8,'silver',{r:1}),block('sq6','power',[268,125,284,150],1.8,'silver',{r:1}),
 // Controllers: connectors, headers, fins, shields.
 block('x-tan','logic',[350,0,410,168],5.2,'tan',{r:8,bevel:.6,label:'slots'}),
 block('x-tanfoot','logic',[354,168,406,182],3,'gold',{r:2}),
 block('x-header','logic',[642,893,870,921],2.6,'silver',{label:'pins'}),
 block('x-fin1','logic',[1302,1142,1325,1325],2.8,'matte',{label:'fins-v'}),block('x-fin1cap','logic',[1300,1110,1327,1140],3,'gold',{r:3}),
 block('x-fin2','logic',[1437,2080,1485,2280],2.4,'matte',{label:'fins-v'}),
 ...Array.from({length:10},(_,i)=>block(`x-fp${i}`,'logic',[1410,2083+i*20,1432,2096+i*20],1,'pale',{r:1})),
 block('x-label','logic',[292,1793,346,1830],.9,'silver',{label:'brushed'}),
 block('x-osc1','logic',[1307,2055,1382,2092],2,'gold',{r:4,label:'window'}),block('x-osc2','logic',[1310,2203,1382,2242],2,'gold',{r:4,label:'window'}),
 block('x-goldframe','logic',[1190,1855,1270,1937],.9,'gold',{r:5}),
 block('x-s1','logic',[968,1255,982,1277],1.8,'silver',{label:'can',r:1}),block('x-s2','logic',[1023,1255,1037,1277],1.8,'silver',{label:'can',r:1}),
 block('x-s3','logic',[967,1313,998,1352],2.4,'silver',{label:'can',r:2}),block('x-s4','logic',[1040,1322,1058,1345],1.8,'silver',{label:'can',r:1}),block('x-s5','logic',[968,1440,985,1475],2,'silver',{label:'can',r:1}),
 block('x-s6','logic',[1330,2370,1352,2396],1.8,'silver',{label:'can',r:1}),block('x-s7','logic',[1405,2372,1426,2396],1.8,'silver',{label:'can',r:1}),block('x-s8','logic',[1440,2350,1466,2372],1.8,'silver',{label:'can',r:1}),
 block('x-conn','logic',[955,2252,1010,2302],3.6,'grey',{r:3}),
 ...[0,1,2,3].map(i=>block(`x-w${i}`,'logic',[1247,2425+i*44,1280,2455+i*44],1.2,'white',{r:2,label:'ic'})),
 block('x-ind','logic',[1390,876,1412,900],2,'tan',{r:2}),block('x-gp1','logic',[1322,963,1345,983],1.2,'gold',{r:1}),block('x-gp2','logic',[1326,989,1346,1010],1.6,'silver',{r:1}),block('x-gp3','logic',[1235,1004,1266,1022],1.2,'gold',{r:1}),
 block('x-or1','logic',[694,1004,706,1026],1.4,'orange',{r:2}),block('x-or2','logic',[1014,978,1026,1000],1.4,'orange',{r:2}),
 block('x-diode','logic',[26,2508,70,2522],1.4,'pale',{r:5}),
 // Ports, left edge.
 block('e-lbracket','ports',[0,770,50,832],2.4,'silver',{r:6}),
 block('e-lblock','ports',[8,1338,46,1366],3,'grey',{r:2}),
 block('e-lconn','ports',[0,1825,46,1962],7,'black',{r:6,bevel:.6}),
 block('e-ltab','ports',[47,1840,58,1990],.8,'silver',{r:3}),
 // Ports, right edge, top to bottom.
 block('e1','ports',[1506,0,1605,108],3,'matte',{r:3,label:'tags'}),
 block('e2','ports',[1500,118,1605,250],2.6,'silver',{r:8,bevel:.4,label:'flange'}),
 block('e3','ports',[1503,272,1582,462],3,'iron',{r:4}),block('e3b','ports',[1586,290,1605,440],6,'pitted',{r:4}),
 block('e4','ports',[1500,468,1605,592],2.6,'silver',{r:8,bevel:.4,label:'flange'}),
 block('e5','ports',[1506,602,1602,740],6,'matte',{r:6,label:'tags'}),
 block('e6','ports',[1503,748,1605,852],2.6,'silver',{r:10,bevel:.4,label:'flange'}),
 block('e7','ports',[1500,880,1605,1012],6.5,'black',{r:8,bevel:.6}),block('e7b','ports',[1508,928,1546,1004],7.6,'black',{r:5,on:'e7',bevel:.4}),
 block('e8','ports',[1503,1048,1605,1168],2.2,'darksteel',{r:3}),block('e9','ports',[1508,1118,1605,1228],5,'pitted',{r:6,on:'e8',bevel:.4,label:'screwhead'}),
 block('e9b','ports',[1503,1232,1605,1306],2.6,'darksteel',{r:3}),
 block('e10','ports',[1506,1322,1605,1424],2.6,'silver',{r:8,bevel:.4,label:'flange'}),
 block('e11','ports',[1506,1444,1605,1572],2.4,'iron',{r:3}),
 block('e12','ports',[1500,1592,1605,1814],3,'tan',{r:8,bevel:.4,label:'flange'}),
 block('e13','ports',[1506,1850,1605,1962],7,'black',{r:8,bevel:.8,label:'RA'}),block('e13b','ports',[1512,1966,1605,2000],4,'matte',{r:4}),
 block('e14','ports',[1506,2012,1605,2140],2.4,'silver',{r:5}),block('e14b','ports',[1564,2090,1602,2156],7,'chrome',{r:14,on:'e14',bevel:.6}),
 block('e15','ports',[1508,2158,1605,2266],2.6,'silver',{r:8,bevel:.4,label:'flange'}),
 block('e16','ports',[1512,2292,1605,2372],6,'black',{r:6,bevel:.5}),
 // Housings and their brackets.
 block('h-a','ports',[1355,1112,1495,1380],9,'black',{r:22,bevel:1.1}),block('h-a-neck','ports',[1395,1040,1480,1112],8.4,'black',{r:8,bevel:.8}),
 block('h-a-panel','ports',[1372,1150,1432,1340],10,'black',{r:10,on:'h-a',bevel:.5,label:'3D9D'}),
 block('h-a-tabT','ports',[1338,1160,1354,1210],2,'silver',{r:3}),block('h-a-tabB','ports',[1338,1290,1354,1330],2,'silver',{r:3}),
 block('h-b','ports',[1366,1554,1486,1820],9,'black',{r:22,bevel:1.1}),block('h-b-top','ports',[1372,1498,1480,1554],6,'black',{r:5,bevel:.5}),
 block('h-b-bracket','ports',[1328,1568,1366,1704],3.2,'silver',{r:5}),
 block('h-b-panel','ports',[1370,1602,1426,1772],10,'black',{r:9,on:'h-b',bevel:.5,label:'etch'}),
 block('h-b-oval','ports',[1440,1672,1470,1722],9.3,'silver',{r:14,on:'h-b'}),
];

// ── Lying cylinders: barrels on the right edge and the machined assembly up top. ──
export type Barrel={id:string;asm:AssemblyId;b:Box;axis:'x'|'z';mat:Mat;neck?:number;lift?:number;on?:string};
export const BARRELS:Barrel[]=[
 ...[18,98,190,275,355].map((y,i)=>({id:`r${i}`,asm:'ports' as const,b:[1360,Math.max(0,y-31),1482,y+31] as Box,axis:'x' as const,mat:'silver' as const,neck:45})),
 {id:'r5',asm:'ports',b:[1392,416,1484,512],axis:'x',mat:'silver',neck:0},
 {id:'r6',asm:'ports',b:[1404,518,1432,548],axis:'z',mat:'chrome'},
 {id:'e7roll',asm:'ports',b:[1524,886,1605,924],axis:'x',mat:'silver',lift:5.6,on:'e7'},
 {id:'e7screw',asm:'ports',b:[1550,938,1592,976],axis:'x',mat:'chrome',lift:4,on:'e7'},
 {id:'e14knob',asm:'ports',b:[1516,2100,1552,2134],axis:'x',mat:'black',lift:2.4,on:'e14'},
 {id:'k-pin',asm:'cooling',b:[758,44,774,126],axis:'x',mat:'brass',lift:5.4,on:'k-plate'},
 {id:'lj',asm:'ports',b:[0,1282,46,1320],axis:'x',mat:'chrome'},
 {id:'rc',asm:'ports',b:[1562,2440,1602,2520],axis:'z',mat:'chrome'},
];

// ── Processor ─────────────────────────────────────────────────────────────
export const COVER={b:[498,1059,942,1585] as Box,r:36,win:[628,1218,811,1438] as Box,winR:15,y0:1.4,y1:4.6,
 holes:[[576,1072],[718,1072],[866,1072],[575,1571],[718,1571],[866,1571],[510,1200],[510,1430],[929,1200],[929,1432]] as P2[],holeR:8};

// ── Sockets ───────────────────────────────────────────────────────────────
export const SOCKET2={frame:[497,1883,937,2260] as Box,chip:[553,1900,893,2250] as Box,inner:[600,1950,835,2195] as Box,pad:[680,2040,765,2096] as Box,
 stripL:[497,1912,550,2228] as Box,stripR:[896,1912,937,2226] as Box,limeTop:[497,1883,937,1912] as Box};
export const SOCKET3={frame:[45,2200,310,2425] as Box,lime:[45,2177,310,2238] as Box,chip:[88,2215,265,2392] as Box,ring:[133,2265,220,2337] as Box,label:[142,2276,210,2326] as Box,
 screws:[[152,2192],[290,2250],[290,2384],[190,2408],[70,2206],[60,2400]] as P2[]};

// ── Memory ────────────────────────────────────────────────────────────────
export type Slot={id:string;b:Box;vertical:boolean;lanes:number;tabs:'white'|'gold'};
export const SLOTS:Slot[]=[
 {id:'dimm-left',b:[186,808,302,1692],vertical:true,lanes:2,tabs:'white'},
 {id:'dimm-right',b:[1098,810,1215,1692],vertical:true,lanes:2,tabs:'gold'},
 {id:'dimm-bottom',b:[380,2366,1110,2563],vertical:false,lanes:4,tabs:'gold'},
];
export const SLOT_H=4.6;
export const SLOT_CAP:Box=[190,768,264,806];

// ── Hoses, pipe and cables: centre lines as [x px, y px, height mm]. ────────
export type Hose={id:string;asm:AssemblyId;pts:[number,number,number][];r:number;mat:'hose'|'brass'|'cable'|'ribbon';ferrules?:{t:number;len:number;mat:Mat;grow?:number}[]};
export const HOSES:Hose[]=[
 {id:'h1',asm:'cooling',r:1.45,mat:'hose',pts:[[320,236,5],[321,330,4.4],[322,470,3.6],[330,560,3.4],[362,628,3.4],[430,664,3.4],[540,672,3.4],[700,668,3.4],[860,668,3.4],[960,682,3.4],[1010,720,3.2],[1032,762,3]],
  ferrules:[{t:.004,len:3,mat:'brass',grow:.2},{t:.018,len:7,mat:'silver',grow:.6},{t:.03,len:1.4,mat:'chrome',grow:1},{t:.985,len:5,mat:'matte',grow:.5}]},
 {id:'h2',asm:'cooling',r:1.45,mat:'hose',pts:[[353,240,5.4],[354,330,5],[356,470,4.2],[366,548,3.6],[400,612,3.4],[462,646,3.4],[560,652,3.4],[700,650,3.4],[900,650,3.4],[1040,654,3.6],[1100,660,4]],
  ferrules:[{t:.006,len:5,mat:'brass',grow:.35},{t:.02,len:1.4,mat:'chrome',grow:.9},{t:.085,len:8,mat:'matte',grow:.9},{t:.2,len:6,mat:'silver',grow:.55},{t:.21,len:1.2,mat:'chrome',grow:.9}]},
 {id:'h3',asm:'cooling',r:1.45,mat:'hose',pts:[[386,244,5.8],[388,330,5.2],[390,450,4.4],[402,530,3.8],[440,594,3.4],[500,626,3.4],[600,634,3.4],[698,632,3.4]],
  ferrules:[{t:.006,len:3,mat:'brass',grow:.5},{t:.03,len:9,mat:'silver',grow:.8},{t:.055,len:1.6,mat:'chrome',grow:1.15}]},
 {id:'h4',asm:'cooling',r:1.5,mat:'hose',pts:[[563,396,4.4],[563,470,4],[566,560,3.6],[584,612,3.4],[630,640,3.3],[698,646,3.3]],
  ferrules:[{t:.52,len:7.5,mat:'silver',grow:.55},{t:.5,len:1.4,mat:'chrome',grow:.95}]},
 {id:'h5',asm:'cooling',r:1.45,mat:'hose',pts:[[612,396,3.2],[616,470,3.1],[630,548,3],[662,596,3],[698,612,3]]},
 {id:'h6',asm:'cooling',r:2.5,mat:'hose',pts:[[462,0,7],[464,120,6.6],[462,240,6],[457,330,5.4],[450,420,4.6]],
  ferrules:[{t:.74,len:7,mat:'silver',grow:.6},{t:.7,len:1.6,mat:'chrome',grow:1},{t:.86,len:5,mat:'brass',grow:-.6},{t:.96,len:4,mat:'matte',grow:.1}]},
 {id:'h8',asm:'cooling',r:1.3,mat:'hose',pts:[[420,262,4.8],[422,360,4.4],[426,470,3.8],[444,548,3.2],[488,598,3],[560,614,3],[640,618,3],[698,622,3]],
  ferrules:[{t:.01,len:5,mat:'silver',grow:.5},{t:.035,len:1.2,mat:'chrome',grow:.85}]},
 {id:'h9',asm:'cooling',r:1.3,mat:'hose',pts:[[744,624,3],[752,664,3],[800,688,3],[880,694,3],[950,680,3],[992,644,3.2],[1000,600,3.6],[990,560,4]],
  ferrules:[{t:.97,len:5,mat:'silver',grow:.5}]},
 {id:'pipe',asm:'cooling',r:1.25,mat:'brass',pts:[[304,520,2.6],[306,590,2.6],[330,660,2.6],[392,698,2.6],[470,706,2.6],[620,706,2.6],[848,706,2.6]],
  ferrules:[{t:.55,len:6.5,mat:'white',grow:.7}]},
 {id:'pipe2',asm:'cooling',r:1.1,mat:'brass',pts:[[325,560,2.4],[330,610,2.4],[352,658,2.4],[404,684,2.4],[470,690,2.4],[540,690,2.4]]},
 {id:'h7',asm:'cooling',r:1.2,mat:'hose',pts:[[848,706,2.6],[930,708,2.6],[990,726,2.6],[1028,758,2.6]]},
 {id:'loop1',asm:'power',r:1.35,mat:'cable',pts:[[1215,690,4],[1262,700,3.2],[1310,684,3],[1340,650,3],[1345,612,3.4]]},
 {id:'loop2',asm:'cooling',r:1.7,mat:'cable',pts:[[1076,350,3.6],[1122,338,4.2],[1170,362,3.6],[1225,370,3.4],[1280,352,3.6],[1312,326,4.2]]},
 {id:'ribbon',asm:'logic',r:.5,mat:'ribbon',pts:[[498,1792,5],[545,1768,3.4],[640,1744,2.8],[760,1730,2.8],[860,1730,3],[925,1756,3.8],[960,1790,5]]},
];
// The left bracket: a pressed black plate, as runs of [x1, y1, x2, y2, width] in pixels.
export const PLATE:[number,number,number,number,number][]=[[40,836,104,836,46],[36,836,32,1040,42],[34,960,100,960,50],[32,1040,108,1172,40],[108,1172,122,1226,50],[106,1244,72,1292,34],[72,1292,72,1340,34],[72,1340,108,1384,36]];
// Bores and fixing screws that give the edge hardware its machined look: [x, y, radius px, height mm].
export const HOLES:[number,number,number,number][]=[[1548,1098,14,2.2],[1512,1066,4,2.2],[1590,1066,4,2.2],[1528,1252,4,2.6],[1546,1270,4,2.6],[1564,1286,4,2.6],[1530,2030,6,2.4],[1528,2076,5,2.4],[1562,1502,11,2.4],[1524,1462,4,2.4],[1590,1554,4,2.4],[1535,418,3.4,3.8],[1535,434,3.4,3.8],[1432,1545,3,6],[1436,1578,3,9],[1525,2030,5,2.4],[1590,2028,5,2.4],[1590,2085,4,2.4]];
export const SCREWS:{asm:AssemblyId;at:[number,number,number][]}[]=[
 {asm:'ports',at:[[1546,1190,5],[1348,1586,3.2],[1348,1690,3.2],[1346,1186,2],[1346,1312,2],[22,800,2.4],[1386,1524,6],[1466,1524,6],[1524,1150,5],[1588,1150,5],[1520,300,3],[1562,300,3],[1524,2330,6],[1588,2330,6],[1400,1806,9],[1432,1814,9],[1460,1804,9],[1396,1362,9],[1470,1140,9]]},
 {asm:'cooling',at:[[822,33,13.6],[808,715,1.1],[546,150,13],[540,300,13],[866,300,13]]},
];
// Boxes for the keep-out map only: hose runs, the bracket, cable loops, dark fields.
export const KEEPOUT:Box[]=[[280,220,500,725],[500,390,700,725],[700,622,1100,790],[0,742,186,1450],[490,1715,1000,1830],[1090,596,1365,705],[1085,290,1345,385],[940,150,1345,300],[886,0,1090,160],[975,540,1022,640],[1495,0,1605,2589],[300,2260,380,2589],[0,2430,380,2589]];
// Blocks of printed lettering: kept as silkscreen, but nothing found inside them is treated as a part.
export const TEXT_ZONES:Box[]=[[0,1440,64,1725],[296,2372,386,2589],[1496,2380,1562,2589],[380,2556,720,2589],[0,2440,300,2589],[10,600,130,640],[1200,280,1300,320],[640,2340,720,2362],[470,880,520,912]];
// Whole regions the tracing script skips because machinery or connectors hide the board there.
export const TRACE_SKIP:Box[]=[[940,150,1345,300],[886,0,1090,160],[1495,0,1605,2385],[1085,290,1345,385]];

// ── Board print zones ─────────────────────────────────────────────────────
export const LIME_ZONE:P2[]=[[58,768],[80,744],[498,744],[498,880],[484,896],[304,896],[304,812],[186,812],[186,960],[150,1010],[58,1010]];
export const DARK_ZONES:{b:Box;a:number}[]=[{b:[940,150,1350,430],a:.86},{b:[380,2262,950,2366],a:.45},{b:[0,2425,372,2589],a:.4},{b:[1495,0,1605,2589],a:.6},{b:[480,1590,950,1700],a:.3}];
export const SILK:{t:string;x:number;y:number;s:number;turn?:boolean;a?:number}[]=[
 {t:'TOND',x:40,y:152,s:17},{t:'TIUX',x:222,y:182,s:20},{t:'AADD',x:1250,y:290,s:17},{t:'10 69',x:1240,y:308,s:13},{t:'OU SNIB',x:28,y:622,s:14},
 {t:'ORY',x:680,y:2351,s:16},{t:'LOIH.BB 1 TT',x:16,y:1625,s:17,turn:true},{t:'ARDON HMP',x:22,y:1500,s:19,turn:true},{t:'2N2',x:356,y:2394,s:14},
 {t:'SED',x:344,y:2426,s:26},{t:'A B 88',x:320,y:2520,s:15,turn:true},{t:'L J UNIV',x:340,y:2528,s:15,turn:true},{t:'OOD B8D',x:368,y:2488,s:13,turn:true},{t:'9P TBONITE',x:412,y:2572,s:11,a:.55},
 {t:'AORARD AOONAP',x:1532,y:2432,s:16,turn:true},{t:'HIBN LY',x:1525,y:2520,s:9},{t:'OD I2N',x:155,y:2580,s:11,a:.6},{t:'R- 10',x:90,y:2576,s:13,a:.7},{t:'G',x:92,y:2512,s:17,a:.6},
 {t:'769',x:612,y:508,s:10},{t:'3S5',x:1218,y:372,s:10},{t:'CHI',x:1340,y:152,s:8},{t:'OUT',x:1562,y:1048,s:9},{t:'b',x:498,y:898,s:12},
];

// ── Pulse routes (mm on the board) from the processor to what it talks to, and status LEDs. ──
const route=(pts:P2[]):P2[]=>pts.map(([x,y])=>[X(x),Z(y)]);
export const ROUTES:P2[][]=[
 route([[498,1300],[440,1300],[400,1340],[330,1340],[304,1314]]),                       // left memory
 route([[942,1300],[1000,1300],[1040,1260],[1076,1260],[1098,1238]]),                   // right memory
 route([[720,1584],[720,1700],[700,1720],[700,1840],[716,1856],[716,1884]]),            // lower socket
 route([[530,1076],[440,986],[330,986],[250,906],[250,640],[196,586]]),                 // upper-left controller
 route([[900,1584],[900,1700],[1060,1860],[1060,2080],[1140,2160],[1172,2160]]),        // lower-right controller
 route([[620,1584],[620,1690],[470,1840],[470,2180],[560,2270],[560,2366]]),            // bottom memory
];
export const LED_AT:{p:P2;colour:'green'|'amber'|'red'}[]=[
 {p:[56,1218],colour:'green'},{p:[312,1300],colour:'green'},{p:[1088,1228],colour:'green'},{p:[742,1872],colour:'amber'},
 {p:[186,612],colour:'amber'},{p:[1162,2112],colour:'green'},{p:[548,2352],colour:'amber'},{p:[56,1232],colour:'red'},
];

// ── Footprints: one list for the tests and for keeping passives clear. ──────
export type Footprint={id:string;asm:AssemblyId;b:Box;ht:number;on?:string;round?:boolean};
const roundBox=(r:Round):Box=>[r.c[0]-r.r,r.c[1]-r.r,r.c[0]+r.r,r.c[1]+r.r];
export const footprints:Footprint[]=[
 ...CHIPS.map(c=>({id:c.id,asm:c.asm,b:c.b,ht:c.ht,on:c.on})),
 ...ROUNDS.map(r=>({id:r.id,asm:r.asm,b:roundBox(r),ht:r.ht,on:r.on,round:true})),
 ...BLOCKS.map(k=>({id:k.id,asm:k.asm,b:k.b,ht:k.ht,on:k.on})),
 ...BARRELS.map(k=>({id:k.id,asm:k.asm,b:k.b,ht:(k.lift??0)+(k.axis==='x'?k.b[3]-k.b[1]:k.b[2]-k.b[0])*PX,on:k.on})),
 {id:'cover',asm:'cpu',b:COVER.b,ht:COVER.y1},
 {id:'socket2',asm:'logic',b:SOCKET2.frame,ht:4},
 {id:'socket3',asm:'logic',b:[SOCKET3.frame[0],SOCKET3.lime[1],SOCKET3.frame[2],SOCKET3.frame[3]],ht:4},
 ...SLOTS.map(s=>({id:s.id,asm:'memory' as const,b:s.b,ht:SLOT_H})),
 {id:'slot-cap',asm:'memory',b:SLOT_CAP,ht:3},
];
// Do two footprints collide in plan? Round ones are tested as circles.
export function collide(a:Footprint,b:Footprint){
 if(!hit(a.b,b.b))return false;
 if(a.round&&b.round){const [ax,ay]=centre(a.b),[bx,by]=centre(b.b);return Math.hypot(ax-bx,ay-by)<(a.b[2]-a.b[0]+b.b[2]-b.b[0])/2}
 if(a.round||b.round){
  const [c,q]=a.round?[a,b]:[b,a],[cx,cy]=centre(c.b),r=(c.b[2]-c.b[0])/2;
  const dx=Math.max(q.b[0]-cx,0,cx-q.b[2]),dy=Math.max(q.b[1]-cy,0,cy-q.b[3]);return Math.hypot(dx,dy)<r;
 }
 return true;
}

// ── Small parts: positions, kinds and colours measured from the reference by scripts/devices/trace-verdant.mjs. ──
// The tracing gives ragged boxes, so each small part is fitted to the nearest standard chip size and its centre is put on a
// 0.2 mm placement grid (the same grid the board's routing runs on). A part that would then foul a neighbour is nudged one or two
// grid steps, and dropped if it still does not fit. `turn` means the long axis runs down the image.
export type SpotType='cap'|'res'|'metal'|'gold';
export type Spot={x:number;y:number;w:number;d:number;h:number;type:SpotType;turn:boolean;ends:boolean;colour:number;cls:number};
const KIND:(SpotType|null)[]=['metal','cap','gold','res',null];
export const even=(v:number)=>Math.round(v/2)*2;
// Chip sizes in pixels (0.1 mm): body length and width, land centre from the part centre, land length and width, body height in mm.
// These are 0201, 0402, 0603, 0805 and 1206.
export const CLASSES=[{L:6,S:3,pc:2,pa:2.2,pw:3.4,h:.3},{L:10,S:5,pc:4,pa:3.2,pw:5.6,h:.5},{L:16,S:8,pc:6,pa:5,pw:8.8,h:.8},{L:20,S:12,pc:8,pa:6,pw:13,h:1.1},{L:32,S:16,pc:14,pa:7,pw:17,h:1.5}];
// Lands of a small part: centre offset along its axis, length along it, width across it. Larger bodies (`cls` −1) get a land at each end.
export function landOf(s:{cls:number;w:number;d:number}){
 if(s.cls>=0){const c=CLASSES[s.cls];return {pc:c.pc,pa:c.pa,pw:c.pw}}
 const long=Math.max(s.w,s.d),short=Math.min(s.w,s.d),pa=Math.max(4,Math.min(8,long*.24));return {pc:even(long/2-pa/2+1),pa,pw:short+1.2};
}
// Around a leaded package the tracing sees the leads themselves as pale marks; nothing traced is placed within their reach.
const LEAD_ZONES:Box[]=CHIPS.filter(c=>leadsOf(c)).map(c=>{const k=10*(c.long??1)+2;return [c.b[0]-k,c.b[1]-k,c.b[2]+k,c.b[3]+k] as Box});
const LED_ZONES:Box[]=LED_AT.map(l=>[l.p[0]-9,l.p[1]-6,l.p[0]+9,l.p[1]+6] as Box);
// Lands that reach past a hand-laid part's outline: the header's pin row, the cans' two lands, leadless packages and two-land blocks.
const LAND_ZONES:Box[]=[[640,919,872,934],...ROUNDS.filter(r=>!r.on&&r.style.endsWith('Can')).map(r=>[r.c[0]-r.r*1.16,r.c[1]-r.r*.26,r.c[0]+r.r*1.16,r.c[1]+r.r*.26] as Box),
 ...CHIPS.filter(c=>!c.on&&!leadsOf(c)).map(c=>[c.b[0]-3,c.b[1]-3,c.b[2]+3,c.b[3]+3] as Box),...BLOCKS.filter(k=>!k.on&&(k.asm==='power'||k.asm==='logic')).map(k=>[k.b[0]-2.5,k.b[1]-2.5,k.b[2]+2.5,k.b[3]+2.5] as Box)];
const clear=(b:Box)=>b[0]>6&&b[1]>6&&b[2]<IMG.w-6&&b[3]<IMG.h-6&&!footprints.some(f=>hit(f.b,b))&&!LEAD_ZONES.some(z=>hit(z,b))&&!LED_ZONES.some(z=>hit(z,b))&&!LAND_ZONES.some(z=>hit(z,b));
// Small dark packages found by the same tracing, boxes put on the placement grid. `pins` lists [edge (l, r, t, b), lead count].
// Under 1.7 mm long is a transistor outline: five leads (three and two) when both long edges show metal, otherwise three (two and one).
// Larger ones take leads on the edges where the tracing found metal; when it found none, on both long edges, unless the body is a large square (leadless).
export type Pack={b:Box;colour:number;pins:[string,number][];small:boolean};
export const ICS:Pack[]=TRACED_ICS.map(([x0,y0,x1,y1,colour,sides])=>{
 const b:Box=[even(x0),even(y0),Math.max(even(x1),even(x0)+6),Math.max(even(y1),even(y0)+6)];
 const w=b[2]-b[0],d=b[3]-b[1],tall=d>w,long=Math.max(w,d),short=Math.min(w,d),A=tall?'l':'t',B=tall?'r':'b',has=(k:string)=>sides.includes(k),count=(k:string)=>Math.max(2,Math.round((k==='l'||k==='r'?d:w)/5.2));
 let pins:[string,number][];
 if(long<17)pins=has(A)&&has(B)?[[A,3],[B,2]]:has(B)?[[B,2],[A,1]]:[[A,2],[B,1]];
 else{const found=[...sides].map(k=>[k,count(k)] as [string,number]);pins=found.length?found:long/short<1.25&&short>=20?[]:[[A,count(A)],[B,count(B)]]}
 return {b,colour,pins,small:long<17};
}).filter(ic=>clear(ic.b));
const IC_ZONES:Box[]=ICS.map(ic=>{const k=(s:string)=>ic.pins.some(p=>p[0]===s)?12:2;return [ic.b[0]-k('l'),ic.b[1]-k('t'),ic.b[2]+k('r'),ic.b[3]+k('b')] as Box});
const NUDGE:P2[]=[[0,0],[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2],[4,0],[-4,0],[0,4],[0,-4]];
export function sow():Spot[]{
 const spots:Spot[]=[],placed:Box[]=[];
 for(const [x0,y0,x1,y1,kind,colour,form] of TRACED){
  const type=KIND[kind];if(!type)continue;
  const w0=x1-x0,d0=y1-y0,long=Math.max(w0,d0),short=Math.min(w0,d0);if(short<2)continue;
  const turn=form===1||(form>=2&&d0>w0);
  let cls=-1,L=Math.max(18,even(long)),S=Math.max(6,even(short));
  if(long<18){let best=1e9;CLASSES.forEach((c,i)=>{const e=Math.abs(c.L-long)+Math.abs(c.S-short);if(e<best){best=e;cls=i}});L=CLASSES[cls].L;S=CLASSES[cls].S}
  const w=turn?S:L,d=turn?L:S,{pc,pa,pw}=landOf({cls,w,d}),ha=pc+pa/2+.9,hx=Math.max(pw,S)/2+.7,cx=even((x0+x1)/2),cy=even((y0+y1)/2);
  for(const [ox,oy] of NUDGE){
   const x=cx+ox,y=cy+oy,court:Box=turn?[x-hx,y-ha,x+hx,y+ha]:[x-ha,y-hx,x+ha,y+hx];
   if(!clear(court)||IC_ZONES.some(z=>hit(z,court))||placed.some(p=>hit(p,court)))continue;
   const h=cls>=0?CLASSES[cls].h*(type==='cap'||type==='gold'?1.4:1):S<12?.8:S<20?1.3:1.9;
   placed.push(court);spots.push({x,y,w,d,h,type,turn,ends:cls>=0,colour,cls});break;
  }
 }
 return spots;
}
export const spots=sow();
