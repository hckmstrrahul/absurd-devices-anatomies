// Lumen's wheel work: tooth counts, where every arbor sits, and the rotation of every wheel.
// Positions follow from the tooth counts (each pair sits exactly `centreDistance` apart), and every rotation is
// chained through `meshed`, so the teeth interlock by construction. Millimetres and radians, front view (X right, Y up).
import {centreDistance,meshed,tipRadius} from '../kit/horology';
import {ARBOR} from './layout';

// Going train. 4 beats a second: 72/12 × 64/8 × 60/8 × 64/8 escape turns per barrel turn.
export const TRAIN={module:.32,barrel:72,centrePinion:12,centre:64,thirdPinion:8,third:60,fourthPinion:8,fourth:64,escapePinion:8,escapeTeeth:15,escapeRadius:5.2};
// Motion works under the dial: 30/10 × 32/8 = 12 turns of the cannon pinion per turn of the hour wheel.
export const MOTION={module:.6,cannon:10,minuteWheel:30,minutePinion:8,hourWheel:32};
// Two 1:1 transfers carry the centre arbor and the fourth arbor across to the hands, each through one idler.
export const TRANSFER={module:.5,wheel:48,idler:120};
// Level gauge: the needle's pinion on a toothed sector, 6:1.
export const SECTOR={module:.25,pinion:10,wheel:60};
// Keyless ratchet on the barrel arbor.
export const RATCHET={teeth:24,radius:5.4};

export type Point={x:number;y:number};
const polar=(from:Point,distance:number,degrees:number):Point=>({x:from.x+Math.cos(degrees*Math.PI/180)*distance,y:from.y+Math.sin(degrees*Math.PI/180)*distance});
// The point at distance d from both a and b, on the chosen side of the line a→b.
const apex=(a:Point,b:Point,d:number,side:1|-1):Point=>{
 const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,half=Math.hypot(b.x-a.x,b.y-a.y)/2,rise=Math.sqrt(d*d-half*half);
 return {x:mx-(b.y-a.y)/(half*2)*rise*side,y:my+(b.x-a.x)/(half*2)*rise*side};
};
export const bearing=(a:Point,b:Point)=>Math.atan2(b.y-a.y,b.x-a.x);

const T=TRAIN,cd=(a:number,b:number)=>centreDistance(T.module,a,b);
const barrel:Point={x:-90,y:97};
const centre=polar(barrel,cd(T.barrel,T.centrePinion),42);
const third=polar(centre,cd(T.centre,T.thirdPinion),135);
const fourth=polar(third,cd(T.third,T.fourthPinion),40);
const escape=polar(fourth,cd(T.fourth,T.escapePinion),130);
const pallet=polar(escape,T.escapeRadius*1.22,58);
const balance=polar(pallet,8.6,52);
const hands:Point={x:ARBOR.x,y:ARBOR.y};
const reach=centreDistance(TRANSFER.module,TRANSFER.wheel,TRANSFER.idler);
export const ARBORS={
 barrel,centre,third,fourth,escape,pallet,balance,hands,
 minuteIdler:apex(centre,hands,reach,-1),
 secondsIdler:apex(fourth,hands,reach,1),
 minuteWheel:polar(hands,centreDistance(MOTION.module,MOTION.cannon,MOTION.minuteWheel),-62),
};
// Every pair of teeth that engages: [driver arbor, driver teeth, driven arbor, driven teeth, module].
export const MESHES:[keyof typeof ARBORS,number,keyof typeof ARBORS,number,number][]=[
 ['barrel',T.barrel,'centre',T.centrePinion,T.module],['centre',T.centre,'third',T.thirdPinion,T.module],
 ['third',T.third,'fourth',T.fourthPinion,T.module],['fourth',T.fourth,'escape',T.escapePinion,T.module],
 ['centre',TRANSFER.wheel,'minuteIdler',TRANSFER.idler,TRANSFER.module],['minuteIdler',TRANSFER.idler,'hands',TRANSFER.wheel,TRANSFER.module],
 ['fourth',TRANSFER.wheel,'secondsIdler',TRANSFER.idler,TRANSFER.module],['secondsIdler',TRANSFER.idler,'hands',TRANSFER.wheel,TRANSFER.module],
 ['hands',MOTION.cannon,'minuteWheel',MOTION.minuteWheel,MOTION.module],['minuteWheel',MOTION.minutePinion,'hands',MOTION.hourWheel,MOTION.module],
];
// Largest wheel on each going-train arbor, for clearance checks: [arbor, tip radius].
export const SWEEPS:[keyof typeof ARBORS,number][]=[
 ['barrel',tipRadius(T.module,T.barrel)],['centre',tipRadius(T.module,T.centre)],['third',tipRadius(T.module,T.third)],
 ['fourth',tipRadius(T.module,T.fourth)],['escape',T.escapeRadius],
];

// Pillars that tie the bridges to the plate; each must stand clear of every wheel.
export const PILLARS:Record<string,Point>={barrelA:{x:-101.5,y:88},barrelB:{x:-68,y:100},trainA:{x:-100,y:119},trainB:{x:-97,y:132},pallet:{x:-92,y:141},balance:{x:ARBORS.balance.x,y:ARBORS.balance.y+11}};
// Sector of the level gauge, relative to the needle's arbor.
export const SECTOR_BEARING=40*Math.PI/180;
export const sectorOffset=():Point=>polar({x:0,y:0},centreDistance(SECTOR.module,SECTOR.pinion,SECTOR.wheel),40);
// The sector carries a pin 4 mm out, level with its arbor and on the left when the needle reads mid-scale.
// A 6 mm link joins the pin to a plunger that slides vertically 4 mm left of the arbor.
export const LINK={pin:4,rod:6};
const PIN_ANGLE=Math.PI-meshed(0,SECTOR.pinion,SECTOR.wheel,SECTOR_BEARING);
export const sectorPin:Point={x:Math.cos(PIN_ANGLE)*LINK.pin,y:Math.sin(PIN_ANGLE)*LINK.pin};
// Sector rotation, pin position and plunger height (relative to the sector's arbor) for a needle rotation in radians.
export function sectorPose(needle:number){
 const turn=meshed(needle,SECTOR.pinion,SECTOR.wheel,SECTOR_BEARING),a=turn+PIN_ANGLE,pin={x:Math.cos(a)*LINK.pin,y:Math.sin(a)*LINK.pin};
 return {turn,pin,plunger:pin.y+Math.sqrt(LINK.rod**2-(pin.x+LINK.pin)**2)};
}

// Rotation (radians, anticlockwise positive) of everything on an arbor.
// `escapeTurns` is how far the escape wheel has turned; `minute` is the angle shown by the minute hand in degrees.
// The cannon pinion is a friction fit on its drive wheel, so the hands can be set without the train following.
export function wheelAngles(escapeTurns:number,minute:number){
 const A=ARBORS,escape=escapeTurns*Math.PI*2;
 const fourth=meshed(escape,T.escapePinion,T.fourth,bearing(A.escape,A.fourth));
 const third=meshed(fourth,T.fourthPinion,T.third,bearing(A.fourth,A.third));
 const centre=meshed(third,T.thirdPinion,T.centre,bearing(A.third,A.centre));
 const barrel=meshed(centre,T.centrePinion,T.barrel,bearing(A.centre,A.barrel));
 const minuteIdler=meshed(centre,TRANSFER.wheel,TRANSFER.idler,bearing(A.centre,A.minuteIdler));
 const minuteDrive=meshed(minuteIdler,TRANSFER.idler,TRANSFER.wheel,bearing(A.minuteIdler,A.hands));
 const secondsIdler=meshed(fourth,TRANSFER.wheel,TRANSFER.idler,bearing(A.fourth,A.secondsIdler));
 const seconds=meshed(secondsIdler,TRANSFER.idler,TRANSFER.wheel,bearing(A.secondsIdler,A.hands));
 const cannon=-minute*Math.PI/180;
 const minuteWheel=meshed(cannon,MOTION.cannon,MOTION.minuteWheel,bearing(A.hands,A.minuteWheel));
 const hourWheel=meshed(minuteWheel,MOTION.minutePinion,MOTION.hourWheel,bearing(A.minuteWheel,A.hands));
 return {escape,fourth,third,centre,barrel,minuteIdler,minuteDrive,secondsIdler,seconds,cannon,minuteWheel,hourWheel};
}
// Where each wheel sits when everything reads zero. A hand is pressed onto its wheel pointing at 12 in this position.
export const ZERO=wheelAngles(0,0);

// Slider-crank: height of the piston pin above the crank centre, for crank radius e and rod length L.
export const pistonHeight=(theta:number,e:number,L:number)=>e*Math.cos(theta)+Math.sqrt(L*L-e*e*Math.sin(theta)**2);
