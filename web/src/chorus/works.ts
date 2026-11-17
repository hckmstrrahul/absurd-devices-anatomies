// Gear trains for the master movement and the three mechanical orbs. Pure numbers: no three.js.
// Every mesh is two gears of one module at exactly `centreDistance`; the tests assert it.
import {centreDistance,trainRatio} from '../kit/horology';

export type P2=[number,number];
export type Metal='gold'|'brass'|'steel';
export type Gear={id:string;arbor:string;teeth:number;module:number;z:number;metal:Metal;thick:number};
// `slip` marks the one mesh that is shown at the escapement's real-time beat rather than at clock rate.
export type Mesh={driver:string;driven:string;slip?:boolean};
export type Train={
 arbors:Record<string,P2>;gears:Gear[];meshes:Mesh[];
 span:Record<string,[number,number]>;   // z extent of each arbor
 escape:{arbor:string;teeth:number;radius:number;z:number};
 pallet:P2;balance:{at:P2;radius:number;z:number};
 beats:number;                          // beats per second
};
const rad=(deg:number)=>deg*Math.PI/180;
export const polar=(from:P2,dist:number,deg:number):P2=>[from[0]+dist*Math.cos(rad(deg)),from[1]+dist*Math.sin(rad(deg))];
// The point at distance ra from a and rb from b, on the left of a→b.
export function meet(a:P2,ra:number,b:P2,rb:number):P2{
 const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),k=(ra*ra-rb*rb+d*d)/(2*d),h=Math.sqrt(Math.max(0,ra*ra-k*k));
 return [a[0]+dx*k/d-dy*h/d,a[1]+dy*k/d+dx*h/d];
}
export const gearOf=(t:Train,id:string)=>{const g=t.gears.find(g=>g.id===id);if(!g)throw new Error(`Unknown gear ${id}`);return g};
export const direction=(t:Train,from:string,to:string)=>Math.atan2(t.arbors[to][1]-t.arbors[from][1],t.arbors[to][0]-t.arbors[from][0]);

// ── Master movement ─────────────────────────────────────────────────────
// Direct centre seconds: the fourth wheel sits at the centre and carries the second hand; the centre wheel
// (one turn an hour) is off to the left and drives the cannon pinion through a large idler wheel.
export const TEETH={
 barrel:72,centrePinion:12,centre:64,thirdPinion:8,third:60,fourthPinion:8,fourth:60,escapePinion:6,escape:15,
 drive:10,idler:48,cannon:10,cannonPinion:12,minute:36,minutePinion:10,hour:40,hourDay:24,dayIdler:20,day:48,
 motor:8,line:24,crown:16,
};
const T=TEETH;
export const MODULE={power:.5,centre:.5,third:.4,fourth:.35,drive:.5,cannon:.3,hour:.288,day:.4,sync:.5};
export const DAY_Y=-18;   // the 24-hour sub-dial, below the centre
function masterTrain():Train{
 const M=MODULE,fourth:P2=[0,0];
 const third=polar(fourth,centreDistance(M.third,T.third,T.fourthPinion),150);
 const centre=polar(third,centreDistance(M.centre,T.centre,T.thirdPinion),200);
 const barrel=polar(centre,centreDistance(M.power,T.barrel,T.centrePinion),290);
 const escape=polar(fourth,centreDistance(M.fourth,T.fourth,T.escapePinion),40);
 const pallet=polar(escape,9.2,60),balance=polar(pallet,11,60);
 const idler=meet([0,0],centreDistance(M.drive,T.idler,T.cannon),centre,centreDistance(M.drive,T.drive,T.idler));
 const minute=polar([0,0],centreDistance(M.cannon,T.cannonPinion,T.minute),20);
 const day:P2=[0,DAY_Y],dayIdler=meet([0,0],centreDistance(M.day,T.hourDay,T.dayIdler),day,centreDistance(M.day,T.dayIdler,T.day));
 const g=(id:string,arbor:string,teeth:number,module:number,z:number,metal:Metal,thick=.8):Gear=>({id,arbor,teeth,module,z,metal,thick});
 return {
  arbors:{fourth,third,centre,barrel,escape,idler,cannon:[0,0],minute,hour:[0,0],dayIdler,day},
  gears:[
   g('barrel','barrel',T.barrel,M.power,-13,'brass',1),g('centrePinion','centre',T.centrePinion,M.power,-13,'steel',2),
   g('centre','centre',T.centre,M.centre,-1,'gold'),g('thirdPinion','third',T.thirdPinion,M.centre,-1,'steel',2),
   g('third','third',T.third,M.third,-6,'gold'),g('fourthPinion','fourth',T.fourthPinion,M.third,-6,'steel',2),
   g('fourth','fourth',T.fourth,M.fourth,1.5,'gold'),g('escapePinion','escape',T.escapePinion,M.fourth,1.5,'steel',2),
   g('drive','centre',T.drive,M.drive,7,'steel',1.2),g('idler','idler',T.idler,M.drive,7,'brass',.7),g('cannon','cannon',T.cannon,M.drive,7,'steel',1.2),
   g('cannonPinion','cannon',T.cannonPinion,M.cannon,9,'steel',1.2),g('minute','minute',T.minute,M.cannon,9,'brass',.7),
   g('minutePinion','minute',T.minutePinion,M.hour,10.5,'steel',1.2),g('hour','hour',T.hour,M.hour,10.5,'brass',.7),
   g('hourDay','hour',T.hourDay,M.day,11.7,'steel',.6),g('dayIdler','dayIdler',T.dayIdler,M.day,11.7,'brass',.6),g('day','day',T.day,M.day,11.7,'gold',.6),
  ],
  // Listed outward from the fourth wheel, which is the arbor the model drives.
  meshes:[
   {driver:'third',driven:'fourthPinion'},{driver:'centre',driven:'thirdPinion'},{driver:'barrel',driven:'centrePinion'},
   {driver:'fourth',driven:'escapePinion',slip:true},
   {driver:'drive',driven:'idler'},{driver:'idler',driven:'cannon'},{driver:'cannonPinion',driven:'minute'},{driver:'minutePinion',driven:'hour'},
   {driver:'hourDay',driven:'dayIdler'},{driver:'dayIdler',driven:'day'},
  ],
  span:{fourth:[-16.5,5],third:[-16.5,5],centre:[-16.5,8],barrel:[-16.5,7.4],escape:[-16.5,5],idler:[5,7.8],cannon:[5,9.8],minute:[5,11.3],hour:[9.8,12.2],dayIdler:[5,12.2],day:[5,12.6]},
  escape:{arbor:'escape',teeth:T.escape,radius:6.5,z:-9.5},pallet,balance:{at:balance,radius:10,z:-10.5},beats:5,
 };
}
export const MASTER_TRAIN=masterTrain();
export const RATIOS={
 fourthPerCentre:trainRatio([[T.centre,T.thirdPinion],[T.third,T.fourthPinion]]),   // 60
 escapePerFourth:trainRatio([[T.fourth,T.escapePinion]]),                          // 10
 centrePerBarrel:trainRatio([[T.barrel,T.centrePinion]]),                          // 6
 cannonPerCentre:trainRatio([[T.drive,T.idler],[T.idler,T.cannon]]),               // 1
 hourPerCannon:trainRatio([[T.cannonPinion,T.minute],[T.minutePinion,T.hour]]),    // 1/12
 dayPerHour:trainRatio([[T.hourDay,T.dayIdler],[T.dayIdler,T.day]]),               // 1/2
 linePerMotor:trainRatio([[T.motor,T.line]]),                                      // 1/3
};
// Two beats per escape tooth.
export const beatsPerHour=(escapeRpm:number,teeth:number)=>escapeRpm*60*teeth*2;

// ── Orb movements ───────────────────────────────────────────────────────
// A faster 3 Hz train. `scale` sizes it to the orb; `turn` (degrees) swings the layout about the centre arbor.
export const ORB_TEETH={barrel:60,centrePinion:10,centre:80,thirdPinion:10,third:75,fourthPinion:10,fourth:72,escapePinion:6,escape:15,cannonPinion:12,minute:36,minutePinion:10,hour:40};
const O=ORB_TEETH;
export const ORB_MODULE={power:.3,centre:.3,third:.25,fourth:.22,cannon:.25,hour:.24};
export function orbTrain(scale:number,turn:number):Train{
 const m=Object.fromEntries(Object.entries(ORB_MODULE).map(([k,v])=>[k,v*scale])) as typeof ORB_MODULE,centre:P2=[0,0];
 const third=polar(centre,centreDistance(m.centre,O.centre,O.thirdPinion),200+turn);
 const fourth=polar(third,centreDistance(m.third,O.third,O.fourthPinion),280+turn);
 const escape=polar(fourth,centreDistance(m.fourth,O.fourth,O.escapePinion),350+turn);
 const barrel=polar(centre,centreDistance(m.power,O.barrel,O.centrePinion),60+turn);
 const pallet=polar(escape,6*scale,10+turn),balance=polar(pallet,7.5*scale,20+turn);
 const minute=polar(centre,centreDistance(m.cannon,O.cannonPinion,O.minute),120+turn);
 const s=scale,g=(id:string,arbor:string,teeth:number,module:number,z:number,metal:Metal,thick=.55):Gear=>({id,arbor,teeth,module,z:z*s,metal,thick:thick*s});
 return {
  arbors:{centre,third,fourth,escape,barrel,minute,hour:[0,0]},
  gears:[
   g('barrel','barrel',O.barrel,m.power,-3,'brass',.8),g('centrePinion','centre',O.centrePinion,m.power,-3,'steel',1.5),
   g('centre','centre',O.centre,m.centre,2,'gold'),g('thirdPinion','third',O.thirdPinion,m.centre,2,'steel',1.5),
   g('third','third',O.third,m.third,-1,'gold'),g('fourthPinion','fourth',O.fourthPinion,m.third,-1,'steel',1.5),
   g('fourth','fourth',O.fourth,m.fourth,-5,'gold'),g('escapePinion','escape',O.escapePinion,m.fourth,-5,'steel',1.5),
   g('cannonPinion','centre',O.cannonPinion,m.cannon,5.2,'steel',1),g('minute','minute',O.minute,m.cannon,5.2,'brass',.5),
   g('minutePinion','minute',O.minutePinion,m.hour,6.4,'steel',1),g('hour','hour',O.hour,m.hour,6.4,'brass',.5),
  ],
  meshes:[
   {driver:'fourth',driven:'escapePinion',slip:true},{driver:'third',driven:'fourthPinion'},{driver:'centre',driven:'thirdPinion'},{driver:'barrel',driven:'centrePinion'},
   {driver:'cannonPinion',driven:'minute'},{driver:'minutePinion',driven:'hour'},
  ],
  span:{centre:[-11*s,7*s],third:[-11*s,3.6*s],fourth:[-11*s,3.6*s],escape:[-11*s,3.6*s],barrel:[-11*s,-2.2*s],minute:[3.6*s,7.2*s],hour:[5.8*s,7.4*s]},
  escape:{arbor:'escape',teeth:O.escape,radius:4.5*s,z:-1.2*s},pallet,balance:{at:balance,radius:6.5*s,z:-1.6*s},beats:6,
 };
}
export const ORB_RATIOS={
 fourthPerCentre:trainRatio([[O.centre,O.thirdPinion],[O.third,O.fourthPinion]]),   // 60
 escapePerFourth:trainRatio([[O.fourth,O.escapePinion]]),                          // 12
 centrePerBarrel:trainRatio([[O.barrel,O.centrePinion]]),                          // 6
 hourPerCannon:trainRatio([[O.cannonPinion,O.minute],[O.minutePinion,O.hour]]),    // 1/12
};
// Where each mechanical orb's dial sits (fractions of the orb radius) and how its train is turned.
export const ORB_WORKS:Record<string,{at:P2;turn:number}>={tokyo:{at:[.2,-.15],turn:-70},delhi:{at:[0,0],turn:0},kathmandu:{at:[0,0],turn:125}};
