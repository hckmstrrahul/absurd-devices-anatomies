// Belljar layout. Millimetres; X right, Y up, Z toward the viewer. No three.js in here.
// Traced from assets/belljar-reference.png (2000 × 1402 px, front view from slightly above).
// The chrome bezel spans image x 753–1327, taken as 120 mm, so 1 px = 0.209 mm.
// Image point (1040, 1090) is the middle of the base top, which sits at Y = 25.
export type P2=[number,number];
export type P3=[number,number,number];
export const MM=120/574;
export const px=(x:number,y:number):P2=>[(x-1040)*MM,25+(1090-y)*MM];
export const DEG=Math.PI/180;
export const polar=(r:number,degrees:number,from:P2=[0,0]):P2=>[from[0]+r*Math.cos(degrees*DEG),from[1]+r*Math.sin(degrees*DEG)];
const dist=(a:P2,b:P2)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

// Base: image x 638–1440 (168 mm), front face y 1105–1195, feet to y 1228.
export const BASE={w:168,d:96,r:22,foot:6,seam:11,top:25,footR:7.3,footX:58.5,footZ:33};

// Cloche: image x 650–1430, top at y 430. Front profile: straight walls to the spring line, then half an ellipse.
// In depth it is a squircle (exponent `power`), so the front and back stay nearly flat.
export const CLOCHE={a:81.5,b:45,rise:44,spring:119,wall:4.5,power:5};
// Height of the glass surface above (x, z); `inset` steps in from the outer face. −Infinity outside the plan.
export function glassY(x:number,z:number,inset=0){
 const a=CLOCHE.a-inset,b=CLOCHE.b-inset,c=CLOCHE.rise-inset,Z=Math.abs(z)/b;
 if(Z>=1)return -Infinity;
 const r=(1-Z**CLOCHE.power)**(1/CLOCHE.power),X=Math.abs(x)/a;
 return X>r?-Infinity:CLOCHE.spring+c*Math.sqrt(r*r-X*X);
}

// Clock: centre at image (1040, 755). Radii in mm; `Z` is the stack along the clock axis, relative to the clock centre.
export const CLOCK={y:95,drum:58,drumInner:55,bezel:60,flange:62.2,dial:53.5,sight:52,open:26,notch:{half:11,top:31},plate:50};
export const Z={back:-25,drum0:-21,plateBack:[-17,-15.5] as P2,plateFront:[5.5,7] as P2,dial:[10,10.7] as P2,drum1:11,bezel:21,crystal:24.5,keys:-33.5};

// Bells: rims traced at image (750, 490)–(945, 425). Post and bell share one axis, 23° off vertical.
export const BELL={tilt:23*DEG,foot:[33.9,148.3] as P2,rimT:11.6,radius:23,height:15,topT:32.6};
// Point `t` mm along a bell post. `side` is −1 for the left bell, +1 for the right.
export const bellPoint=(side:number,t:number):P2=>[side*(BELL.foot[0]+t*Math.sin(BELL.tilt)),BELL.foot[1]+t*Math.cos(BELL.tilt)];
// Point on a bell rim; angle 0 is the edge nearest the crown.
export function rimPoint(side:number,angle:number):P3{
 const [cx,cy]=bellPoint(side,BELL.rimT),k=BELL.radius*Math.cos(angle);
 return [cx-side*k*Math.cos(BELL.tilt),cy+k*Math.sin(BELL.tilt),BELL.radius*Math.sin(angle)];
}
// Where a bell post crosses the glass.
export function portT(inset=0){
 let lo=0,hi=BELL.rimT;
 for(let i=0;i<40;i++){const t=(lo+hi)/2,[x,y]=bellPoint(1,t);if(y<glassY(x,0,inset))lo=t;else hi=t}
 return (lo+hi)/2;
}
export const HANDLE:P2[]=[[BELL.foot[0]+BELL.topT*Math.sin(BELL.tilt),BELL.foot[1]+BELL.topT*Math.cos(BELL.tilt)],[40.5,183.6],[34.6,191.4],[26,199.6],[11,202.6],[0,202.9]];
export const CROWN={r:4.7,y0:166.5,y1:178.6};

// Hammer: pivots inside the case and swings in a plane behind the crown. Its length and swing follow from the bell rim.
const hammerZ=-9,hammerHead=2.6,hammerPivot:P2=[0,CLOCK.y+25];
const edge=rimPoint(1,Math.asin(hammerZ/BELL.radius)),headAt:P2=[edge[0]-hammerHead,edge[1]];
export const HAMMER={pivot:hammerPivot,z:hammerZ,head:hammerHead,length:dist(headAt,hammerPivot),amp:Math.atan2(headAt[0],headAt[1]-hammerPivot[1])};

// Legs: 40° off straight down, long enough for the foot to stand on the base.
const legAngle=40*DEG,legFoot=4.6;
export const LEG={angle:legAngle,foot:legFoot,length:(CLOCK.y-BASE.top-legFoot*Math.sin(legAngle))/Math.cos(legAngle)};

// ── Movement ────────────────────────────────────────────────────────────
// Tooth counts are the source of every ratio. Tooth sizes follow kit/horology.ts (a test checks the two agree).
export const TEETH={
 // Going train: barrel → centre → third → fourth → escape.
 barrel:84,centrePinion:12,centre:80,thirdPinion:10,third:75,fourthPinion:10,fourth:96,escapePinion:8,escape:20,
 // Motion works.
 cannon:12,minuteWheel:36,minutePinion:10,hourWheel:40,
 // Setting: clutch on the stem → clutch wheel and setting pinion on one arbor → four idlers → minute wheel.
 clutch:16,clutchWheel:28,setPinion:14,setIdlerA:60,setIdler:40,
 // Winding: pinion on the stem → crown wheel → two transmission wheels → ratchet wheel on the barrel arbor.
 windPinion:20,crownWheel:28,transA:40,transB:44,ratchet:56,click:30,
 // Alarm setting: knob pinion → two idlers → alarm wheel round the hour pipe.
 alarmPinion:12,alarmIdler:48,alarmWheel:48,
 // Alarm train: alarm barrel → strike pinion; the strike wheel rocks the hammer verge.
 alarmBarrel:40,strikePinion:10,strike:12,
};
export const MODULE={barrel:.45,train:.3,fourth:.2,motion:.3,hour:.288,setting:.3,winding:.5,alarmSet:.3,alarm:.4};
export const pitch=(module:number,teeth:number)=>module*teeth/2;
export const tipOf=(module:number,teeth:number)=>module*(teeth/2+1);
export const pair=(module:number,a:number,b:number)=>module*(a+b)/2;
// Where two circles cross; `side` picks the solution to the left (+1) or right (−1) of the line from a to b.
export function crossing(a:P2,ra:number,b:P2,rb:number,side:number):P2{
 const d=dist(a,b),k=(ra*ra-rb*rb+d*d)/(2*d),h=Math.sqrt(Math.max(0,ra*ra-k*k)),ux=(b[0]-a[0])/d,uy=(b[1]-a[1])/d;
 return [a[0]+k*ux-side*h*uy,a[1]+k*uy+side*h*ux];
}
const T=TEETH,M=MODULE;
const centre:P2=[0,0],fourth:P2=[0,11.5];
// The third arbor sits where its two meshes agree; the escapement goes to the left, the barrel behind the balance.
const third=crossing(centre,pair(M.train,T.centre,T.thirdPinion),fourth,pair(M.train,T.third,T.fourthPinion),-1);
const escape=polar(pair(M.fourth,T.fourth,T.escapePinion),190,fourth),balance:P2=[-15,-9];
const barrel=polar(pair(M.barrel,T.barrel,T.centrePinion),226);
const minuteWheel=polar(pair(M.motion,T.cannon,T.minuteWheel),35);
// Winding wheels run down the left side to the barrel arbor.
const crownWheel:P2=[0,35],transA=polar(pair(M.winding,T.crownWheel,T.transA),200,crownWheel),transB=crossing(transA,pair(M.winding,T.transA,T.transB),barrel,pair(M.winding,T.transB,T.ratchet),-1);
// Setting wheels run down the right side, clear of the alarm window, to the minute wheel.
const setArbor:P2=[0,35-pitch(M.winding,T.crownWheel)+pitch(M.setting,T.clutchWheel)+.9];
const setA=polar(pair(M.setting,T.setPinion,T.setIdlerA),43,setArbor),setB=polar(pair(M.setting,T.setIdlerA,T.setIdler),-50,setA),setC=polar(pair(M.setting,T.setIdler,T.setIdler),-80,setB);
const setD=crossing(setC,pair(M.setting,T.setIdler,T.setIdler),minuteWheel,pair(M.setting,T.setIdler,T.minuteWheel),1);
const alarmIdlerA:P2=[0,-pair(M.alarmSet,T.alarmWheel,T.alarmIdler)],alarmIdlerB:P2=[0,alarmIdlerA[1]-pair(M.alarmSet,T.alarmIdler,T.alarmIdler)],alarmKnob:P2=[0,alarmIdlerB[1]-pair(M.alarmSet,T.alarmIdler,T.alarmPinion)];
const alarmBarrel:P2=[22,22],strike:P2=[alarmBarrel[0]-pair(M.alarm,T.alarmBarrel,T.strikePinion),alarmBarrel[1]];
export const ARBOR={
 centre,third,fourth,escape,balance,barrel,minuteWheel,
 fork:[escape[0]+6*(balance[0]-escape[0])/dist(balance,escape),escape[1]+6*(balance[1]-escape[1])/dist(balance,escape)] as P2,
 crownWheel,transA,transB,setArbor,setA,setB,setC,setD,alarmIdlerA,alarmIdlerB,alarmKnob,alarmBarrel,strike,
 hammer:[0,25] as P2,stop:[16,41] as P2,click:[-26,-12] as P2,
};
export type ArborId=keyof typeof ARBOR;
// Direction from one arbor to another, for phasing a mesh.
export const toward=(from:ArborId,to:ArborId)=>Math.atan2(ARBOR[to][1]-ARBOR[from][1],ARBOR[to][0]-ARBOR[from][0]);
export type Wheel={id:string;arbor:ArborId;teeth:number;module:number;z0:number;z1:number;mesh?:string};
// `mesh` names the wheel this one engages. Levels (z) are along the clock axis, mm from the clock centre.
const W:P2=[-5.4,-4.6],S:P2=[7.4,8],A:P2=[9.4,9.9];
export const WHEELS:Wheel[]=[
 {id:'barrelGear',arbor:'barrel',teeth:T.barrel,module:M.barrel,z0:-14,z1:-12.8,mesh:'centrePinion'},
 {id:'centrePinion',arbor:'centre',teeth:T.centrePinion,module:M.barrel,z0:-14.2,z1:-12.6},
 {id:'centreWheel',arbor:'centre',teeth:T.centre,module:M.train,z0:-2,z1:-1.2,mesh:'thirdPinion'},
 {id:'thirdPinion',arbor:'third',teeth:T.thirdPinion,module:M.train,z0:-2.7,z1:-.5},
 {id:'thirdWheel',arbor:'third',teeth:T.third,module:M.train,z0:1.2,z1:2,mesh:'fourthPinion'},
 {id:'fourthPinion',arbor:'fourth',teeth:T.fourthPinion,module:M.train,z0:.8,z1:2.4},
 {id:'fourthWheel',arbor:'fourth',teeth:T.fourth,module:M.fourth,z0:3.6,z1:4.3,mesh:'escapePinion'},
 {id:'escapePinion',arbor:'escape',teeth:T.escapePinion,module:M.fourth,z0:3.3,z1:4.6},
 {id:'cannon',arbor:'centre',teeth:T.cannon,module:M.motion,z0:7.4,z1:8.6,mesh:'minuteWheel'},
 {id:'minuteWheel',arbor:'minuteWheel',teeth:T.minuteWheel,module:M.motion,z0:S[0],z1:S[1],mesh:'setD'},
 {id:'minutePinion',arbor:'minuteWheel',teeth:T.minutePinion,module:M.hour,z0:8,z1:9.3,mesh:'hourWheel'},
 {id:'hourWheel',arbor:'centre',teeth:T.hourWheel,module:M.hour,z0:8.6,z1:9.3},
 {id:'setD',arbor:'setD',teeth:T.setIdler,module:M.setting,z0:S[0],z1:S[1],mesh:'setC'},
 {id:'setC',arbor:'setC',teeth:T.setIdler,module:M.setting,z0:S[0],z1:S[1],mesh:'setB'},
 {id:'setB',arbor:'setB',teeth:T.setIdler,module:M.setting,z0:S[0],z1:S[1],mesh:'setA'},
 {id:'setA',arbor:'setA',teeth:T.setIdlerA,module:M.setting,z0:S[0],z1:S[1],mesh:'setPinion'},
 {id:'setPinion',arbor:'setArbor',teeth:T.setPinion,module:M.setting,z0:S[0]-.1,z1:S[1]+.2},
 {id:'clutchWheel',arbor:'setArbor',teeth:T.clutchWheel,module:M.setting,z0:2,z1:2.8},
 {id:'crownWheel',arbor:'crownWheel',teeth:T.crownWheel,module:M.winding,z0:W[0],z1:W[1],mesh:'transA'},
 {id:'transA',arbor:'transA',teeth:T.transA,module:M.winding,z0:W[0],z1:W[1],mesh:'transB'},
 {id:'transB',arbor:'transB',teeth:T.transB,module:M.winding,z0:W[0],z1:W[1],mesh:'ratchetGear'},
 {id:'ratchetGear',arbor:'barrel',teeth:T.ratchet,module:M.winding,z0:W[0],z1:W[1]},
 {id:'alarmPinion',arbor:'alarmKnob',teeth:T.alarmPinion,module:M.alarmSet,z0:A[0]-.1,z1:A[1],mesh:'alarmIdlerB'},
 {id:'alarmIdlerB',arbor:'alarmIdlerB',teeth:T.alarmIdler,module:M.alarmSet,z0:A[0],z1:A[1],mesh:'alarmIdlerA'},
 {id:'alarmIdlerA',arbor:'alarmIdlerA',teeth:T.alarmIdler,module:M.alarmSet,z0:A[0],z1:A[1],mesh:'alarmWheel'},
 {id:'alarmWheel',arbor:'centre',teeth:T.alarmWheel,module:M.alarmSet,z0:A[0],z1:A[1]},
 {id:'alarmGear',arbor:'alarmBarrel',teeth:T.alarmBarrel,module:M.alarm,z0:-7,z1:-6,mesh:'strikePinion'},
 {id:'strikePinion',arbor:'strike',teeth:T.strikePinion,module:M.alarm,z0:-7.3,z1:-5.9},
];
export const wheel=(id:string)=>{const w=WHEELS.find(w=>w.id===id);if(!w)throw new Error(`Unknown wheel ${id}`);return w};
export const tip=(w:Wheel)=>tipOf(w.module,w.teeth);
// Parts that are not involute gears, as discs for the clearance tests: [arbor, radius, z0, z1].
export const ESCAPE={r:3.6,z0:1.2,z1:1.8};
export const BALANCE={rim:8.2,z0:2.6,z1:3.6};
export const BARREL={r:17,z0:-12.8,z1:-6.2};
export const ALARM_BARREL={r:7.2,z0:-14,z1:-7.2};
export const STRIKE={r:5.2,z0:W[0],z1:W[1]};
export const CLICK={r:8,z0:-4.3,z1:-3.7};
export const BRIDGE={z0:-.4,z1:.4,posts:[[2,27],[-25,6],[-26,-12]] as P2[]};
export const DISCS:{id:string;arbor:ArborId;r:number;z0:number;z1:number}[]=[
 {id:'escapeWheel',arbor:'escape',...ESCAPE},{id:'balance',arbor:'balance',r:BALANCE.rim,z0:BALANCE.z0,z1:BALANCE.z1},{id:'barrelDrum',arbor:'barrel',...BARREL},
 {id:'alarmDrum',arbor:'alarmBarrel',...ALARM_BARREL},{id:'strikeWheel',arbor:'strike',...STRIKE},{id:'clickWheel',arbor:'barrel',...CLICK},
];
// Arbors as rods [arbor, radius, z0, z1]. Short ones hang from the escapement bridge or stand on the front plate.
const B1=Z.plateBack[1],F0=Z.plateFront[0];
export const RODS:{arbor:ArborId;r:number;z0:number;z1:number}[]=[
 {arbor:'centre',r:1.1,z0:B1,z1:11.2},{arbor:'third',r:.6,z0:B1,z1:F0},{arbor:'barrel',r:1.6,z0:B1,z1:CLICK.z1},
 {arbor:'fourth',r:.5,z0:BRIDGE.z1,z1:9.5},{arbor:'escape',r:.4,z0:BRIDGE.z1,z1:F0},{arbor:'fork',r:.35,z0:BRIDGE.z1,z1:F0},{arbor:'balance',r:.5,z0:BRIDGE.z1,z1:Z.plateFront[1]},
 {arbor:'crownWheel',r:.8,z0:B1,z1:W[1]+.4},{arbor:'transA',r:.8,z0:B1,z1:W[1]+.4},{arbor:'transB',r:.8,z0:B1,z1:W[1]+.4},
 {arbor:'setArbor',r:.6,z0:1.4,z1:S[1]+.4},...(['setA','setB','setC','setD','minuteWheel'] as ArborId[]).map(arbor=>({arbor,r:.5,z0:Z.plateFront[1],z1:arbor==='minuteWheel'?9.3:S[1]+.3})),
 {arbor:'alarmIdlerA',r:.5,z0:Z.plateFront[1],z1:A[1]+.1},{arbor:'alarmIdlerB',r:.5,z0:Z.plateFront[1],z1:A[1]+.1},{arbor:'alarmKnob',r:.7,z0:Z.back,z1:A[1]+.1},
 {arbor:'alarmBarrel',r:1.2,z0:B1,z1:-5.6},{arbor:'strike',r:.6,z0:B1,z1:W[1]+.3},{arbor:'hammer',r:1.3,z0:-10.6,z1:W[1]},{arbor:'stop',r:.7,z0:B1,z1:-8.2},
 ...BRIDGE.posts.map((_,i)=>({arbor:`post${i}` as ArborId,r:1.2,z0:BRIDGE.z0,z1:F0})),
 ...[54,126,198,270,342].map((_,i)=>({arbor:`pillar${i}` as ArborId,r:2,z0:B1,z1:F0})),
];
export const PILLARS=[54,126,198,270,342].map(a=>polar(46,a));
// Rod positions that are not gear arbors.
export const at=(id:ArborId|string):P2=>id.startsWith('post')?BRIDGE.posts[Number(id.slice(4))]:id.startsWith('pillar')?PILLARS[Number(id.slice(6))]:ARBOR[id as ArborId];
// Stem: vertical, through the crown. Its winding pinion has face teeth that meet the crown wheel behind it.
export const STEM={windR:pitch(M.winding,T.windPinion),windY:crownWheel[1]+pitch(M.winding,T.crownWheel),clutchR:pitch(M.setting,T.clutch),clutchY:setArbor[1]+pitch(M.setting,T.clutchWheel)};
// Explosion travel along the clock axis, mm. Dial and hands travel by their assembly `move` in model.ts.
export const LIFT={back:-140,drum:-88,frame:-34,power:-18,winding:-4,train:10,bridge:22,escapement:34,front:50,works:64,alarmSet:76,bezel:160,crystal:184};
