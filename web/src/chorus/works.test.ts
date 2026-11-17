import {describe,it,expect} from 'vitest';
import {centreDistance,tipRadius,meshed} from '../kit/horology';
import {MASTER_TRAIN,RATIOS,ORB_RATIOS,TEETH,ORB_TEETH,MODULE,DAY_Y,ORB_WORKS,orbTrain,gearOf,beatsPerHour,type Train} from './works';
import {MASTER,ORBS,SYNC,PLINTH,POST,orb} from './layout';
import {escapement,poseAt,step,start,MASTER_BEATS,ORB_BEATS,START,type State} from './model';

const trains:[string,Train][]=[['master',MASTER_TRAIN],...Object.entries(ORB_WORKS).map(([id,w])=>[id,orbTrain(orb(id).r/36,w.turn)] as [string,Train])];
const gap=(t:Train,a:string,b:string)=>Math.hypot(t.arbors[a][0]-t.arbors[b][0],t.arbors[a][1]-t.arbors[b][1]);

describe('Chorus gear trains',()=>{
 it('puts every mesh at exactly the centre distance for a shared module',()=>{
  for(const [name,t] of trains)for(const mesh of t.meshes){
   const a=gearOf(t,mesh.driver),b=gearOf(t,mesh.driven);
   expect(a.module,`${name} ${a.id}/${b.id}`).toBe(b.module);expect(a.z,`${name} ${a.id}/${b.id}`).toBe(b.z);
   expect(gap(t,a.arbor,b.arbor),`${name} ${a.id}/${b.id}`).toBeCloseTo(centreDistance(a.module,a.teeth,b.teeth),9);
  }
  expect(trains.length).toBe(4);
 });
 it('keeps wheels on one level clear of each other and of foreign arbors',()=>{
  for(const [name,t] of trains){
   const paired=(a:string,b:string)=>t.meshes.some(m=>(m.driver===a&&m.driven===b)||(m.driver===b&&m.driven===a));
   for(const a of t.gears)for(const b of t.gears){
    if(a.id>=b.id||a.arbor===b.arbor||paired(a.id,b.id)||gap(t,a.arbor,b.arbor)===0)continue;
    if(Math.abs(a.z-b.z)<(a.thick+b.thick)/2+.05)expect(gap(t,a.arbor,b.arbor)-tipRadius(a.module,a.teeth)-tipRadius(b.module,b.teeth),`${name} ${a.id}/${b.id}`).toBeGreaterThan(0);
   }
   // No wheel may be pierced by another arbor that passes its level.
   for(const g of t.gears)for(const id in t.arbors){
    const d=gap(t,g.arbor,id),[z0,z1]=t.span[id];if(d===0||g.z<z0||g.z>z1)continue;
    expect(d-tipRadius(g.module,g.teeth),`${name} ${g.id} vs arbor ${id}`).toBeGreaterThan(0);
   }
  }
 });
 it('has the stated tooth counts and ratios',()=>{
  expect(RATIOS.fourthPerCentre).toBe(60);       // 64/8 × 60/8
  expect(RATIOS.escapePerFourth).toBe(10);       // 60/6
  expect(RATIOS.centrePerBarrel).toBe(6);        // 72/12
  expect(RATIOS.cannonPerCentre).toBeCloseTo(1); // 10/48 × 48/10
  expect(RATIOS.hourPerCannon).toBeCloseTo(1/12);// 12/36 × 10/40
  expect(RATIOS.dayPerHour).toBeCloseTo(1/2);    // 24/20 × 20/48
  expect(RATIOS.linePerMotor).toBeCloseTo(1/3);  // 8/24
  expect(beatsPerHour(RATIOS.escapePerFourth,TEETH.escape)).toBe(18000);expect(MASTER_BEATS*3600).toBe(18000);
  expect(ORB_RATIOS.fourthPerCentre).toBe(60);   // 80/10 × 75/10
  expect(ORB_RATIOS.escapePerFourth).toBe(12);   // 72/6
  expect(ORB_RATIOS.centrePerBarrel).toBe(6);    // 60/10
  expect(ORB_RATIOS.hourPerCannon).toBeCloseTo(1/12);
  expect(beatsPerHour(ORB_RATIOS.escapePerFourth,ORB_TEETH.escape)).toBe(21600);expect(ORB_BEATS*3600).toBe(21600);
 });
 it('turns each hand the right way at the right rate',()=>{
  // Walk the master train from the fourth arbor over one hour and compare with the hands.
  const t=MASTER_TRAIN,by=(id:string)=>gearOf(t,id),dir=(a:string,b:string)=>Math.atan2(t.arbors[b][1]-t.arbors[a][1],t.arbors[b][0]-t.arbors[a][0]);
  const solve=(seconds:number)=>{
   const rot:Record<string,number>={fourth:-Math.PI*2*seconds/60};
   for(const mesh of t.meshes){const a=by(mesh.driver),b=by(mesh.driven);
    if(rot[a.arbor]!==undefined)rot[b.arbor]=meshed(rot[a.arbor],a.teeth,b.teeth,dir(a.arbor,b.arbor));else rot[a.arbor]=meshed(rot[b.arbor],b.teeth,a.teeth,dir(b.arbor,a.arbor))}
   return rot;
  };
  const a=solve(0),b=solve(3600),turns=(id:string)=>(b[id]-a[id])/(Math.PI*2);
  expect(turns('fourth')).toBeCloseTo(-60);expect(turns('centre')).toBeCloseTo(-1);expect(turns('cannon')).toBeCloseTo(-1);
  expect(turns('hour')).toBeCloseTo(-1/12);expect(turns('day')).toBeCloseTo(-1/24);expect(turns('escape')).toBeCloseTo(600);
  expect(Math.abs(turns('barrel'))).toBeCloseTo(1/6);expect(turns('third')).toBeCloseTo(8);
 });
 it('keeps each movement inside its case',()=>{
  const reach=(t:Train)=>Math.max(...t.gears.map(g=>Math.hypot(...t.arbors[g.arbor])+tipRadius(g.module,g.teeth)),Math.hypot(...t.balance.at)+t.balance.radius);
  expect(reach(MASTER_TRAIN)).toBeLessThan(49);                 // inside the pillars at 52 mm
  expect(MASTER_TRAIN.arbors.day).toEqual([0,DAY_Y]);expect(MASTER.sub.y).toBe(DAY_Y);
  for(const [id,w] of Object.entries(ORB_WORKS)){
   const o=orb(id),s=o.r/36,t=orbTrain(s,w.turn),ox=w.at[0]*o.r,oy=w.at[1]*o.r,wall=o.r-2.2;
   // Every wheel, at its own depth, must sit inside the inner glass wall; so must the back plate.
   for(const g of t.gears){const [x,y]=t.arbors[g.arbor];expect(Math.hypot(Math.hypot(ox+x,oy+y)+tipRadius(g.module,g.teeth),g.z),`${id} ${g.id}`).toBeLessThan(wall)}
   expect(Math.hypot(Math.hypot(ox+t.balance.at[0],oy+t.balance.at[1])+t.balance.radius,t.balance.z),id).toBeLessThan(wall);
   expect(Math.hypot(Math.hypot(ox,oy)+21*s,12*s),id).toBeLessThan(wall);
  }
  expect(ORBS.filter(o=>ORB_WORKS[o.id]).map(o=>o.id)).toEqual(['tokyo','delhi','kathmandu']);
 });
 it('fits the sync drive between pedestal, plinth and posts',()=>{
  const line=tipRadius(MODULE.sync,TEETH.line),crown=tipRadius(MODULE.sync,TEETH.crown);
  expect(SYNC.y-line).toBeGreaterThan(PLINTH.top);                         // line wheel clears the deck
  expect(SYNC.y-tipRadius(MODULE.sync,TEETH.crown)).toBeCloseTo(SYNC.crownY-.5,0); // crown pair touches at the rim
  expect(Math.hypot(POST.x-SYNC.x,POST.z-SYNC.z)-crown-POST.r).toBeGreaterThan(0);
 });
});

describe('Chorus escapements',()=>{
 it('beats at the stated rate, half a tooth per beat',()=>{
  for(const beats of [MASTER_BEATS,ORB_BEATS])for(let i=0;i<400;i++){
   const e=START+i*.0137,x=escapement(e,beats);
   expect(x.lead).toBeGreaterThan(-.05);expect(x.lead).toBeLessThan(.5);expect(Math.abs(x.fork)).toBeLessThanOrEqual(1);
  }
  // At the start of a beat the wheel is on its mean position and the fork is hard over; the balance is at centre.
  const x=escapement(100,MASTER_BEATS);expect(x.lead).toBeCloseTo(0);expect(Math.abs(x.fork)).toBeCloseTo(1);expect(x.balance).toBeCloseTo(0);
  expect(escapement(100,MASTER_BEATS).fork).toBeCloseTo(-escapement(100.2,MASTER_BEATS).fork);
 });
 it('keeps real time at any rate, and matches master time at 1×',()=>{
  let a:State=start,b:State=start;
  for(let i=0;i<50;i++){a=step(a,.02,true,1);b=step(b,.02,true,600)}
  expect(poseAt(a,1).e).toBeCloseTo(poseAt(a,1).t);expect(poseAt(b,600).e).toBeCloseTo(START+1);expect(poseAt(b,600).t).toBeCloseTo(START+600);
  expect(step(a,.02,false,1).beat).toBe(a.beat);
 });
});
