import {describe,it,expect} from 'vitest';
import {start,step,poseAt,period,clock,hands,chime,assemblies,PERIODS,START,SWING,CHIME_MIN,type State} from './model';
import {ORBS,DIALS,HANGING,MASTER,PEDESTAL,PLINTH,POST,ARCH,rodLength,orbCentre,archInset,orb} from './layout';

const deg=(r:number)=>r*180/Math.PI;
describe('Chorus motion model',()=>{
 it('reads 08:10:16 at rest, as in the reference',()=>{
  const p=poseAt(start,60);
  expect(p.text).toBe('08:10:16');
  expect(deg(p.master.minute)).toBeCloseTo(61.6,5);       // 616 s of 3600
  expect(deg(p.master.hour)).toBeCloseTo(245.133,2);      // 29416 s of 43200
  expect(deg(p.master.second)).toBeCloseTo(96,5);
  expect(deg(p.alarm)).toBeCloseTo(164,5);
 });
 it('offsets every satellite from the master by its fixed hours',()=>{
  const p=poseAt(start,1),at=(id:string)=>clock(START+orb(id).offset!*3600);
  expect(at('tokyo')).toBe('17:10:16');expect(at('delhi')).toBe('13:40:16');expect(at('kathmandu')).toBe('13:55:16');
  expect(at('stjohns')).toBe('04:40:16');expect(at('newyork')).toBe('03:10:16');expect(at('chatham')).toBe('20:55:16');
  for(const d of p.dials)expect(d.minute).toBeCloseTo(hands(START+orb(d.id).offset!*3600).minute);
  expect(p.dials.length).toBe(6);
 });
 it('computes pendulum periods from rod lengths',()=>{
  expect(rodLength(orb('tokyo'))).toBe(73);expect(rodLength(orb('kathmandu'))).toBe(72);expect(rodLength(orb('delhi'))).toBe(46);
  expect(period(73)).toBeCloseTo(.5421,3);expect(period(72)).toBeCloseTo(.5384,3);expect(period(46)).toBeCloseTo(.4303,3);
  expect(PERIODS.tokyo).toBeCloseTo(.5421,3);
 });
 it('chimes each dial on its own hour',()=>{
  expect(poseAt(start,1).chiming).toEqual([]);expect(poseAt(start,1).next).toBe(284);   // Kathmandu and Chatham reach the hour at 08:15:00
  const quarter=poseAt({...start,t:START+284},1);
  expect(quarter.chiming).toEqual(['Kathmandu','Chatham']);expect(quarter.dials.find(d=>d.id==='kathmandu')!.glow).toBe(1);
  expect(poseAt({...start,t:8.5*3600+60},1).chiming).toEqual(['Delhi',"St John's"]);
  expect(poseAt({...start,t:9*3600},1).chiming).toEqual(['Master','Tokyo','New York']);
  expect(chime(CHIME_MIN*60)).toBe(0);expect(chime(150)).toBeCloseTo(.5);
 });
 it('advances master time at the chosen rate only while playing',()=>{
  let s:State=start;for(let i=0;i<10;i++)s=step(s,.1,true,60);
  expect(s.t).toBeCloseTo(START+60);expect(poseAt(s,60).text).toBe('08:11:16');
  expect(step(s,.1,false,600).t).toBe(s.t);expect(step(s,5,true,1).t).toBeCloseTo(s.t+.1);expect(step(s,-1,true,1).t).toBe(s.t);
 });
 it('swings within its amplitude, builds up and dies away',()=>{
  let s:State=start;expect(poseAt(s,1).sway.tokyo).toBe(0);
  for(let i=0;i<600;i++){s=step(s,1/60,true,1);for(const o of HANGING)expect(Math.abs(poseAt(s,1).sway[o.id])).toBeLessThanOrEqual(SWING)}
  expect(s.swing).toBeGreaterThan(.99);
  for(let i=0;i<900;i++)s=step(s,1/60,false,1);
  expect(s.swing).toBe(0);expect(Math.abs(poseAt(s,1).sway.delhi)).toBe(0);
 });
 it('is deterministic',()=>{const s={t:123456.7,wall:9.1,swing:.7,beat:3.3};expect(poseAt(s,600)).toEqual(poseAt(s,600))});
 it('has seven assemblies with distinct orders',()=>{expect(assemblies.length).toBe(7);expect(new Set(assemblies.map(a=>a.order)).size).toBe(7)});
});

describe('Chorus layout',()=>{
 const angles=[-SWING,0,SWING];
 it('keeps every orb inside the glass, at both ends of its swing',()=>{
  for(const o of ORBS)for(const a of angles){const [x,y]=orbCentre(o,a);expect(archInset(x,y)-o.r,o.id).toBeGreaterThan(0)}
  for(const o of ORBS)expect(o.r,o.id).toBeLessThan(ARCH.d/2-ARCH.wall);
 });
 it('keeps orbs clear of each other',()=>{
  for(let i=0;i<ORBS.length;i++)for(let j=i+1;j<ORBS.length;j++)for(const a of angles)for(const c of angles){
   const p=orbCentre(ORBS[i],a),q=orbCentre(ORBS[j],c);
   expect(Math.hypot(p[0]-q[0],p[1]-q[1])-ORBS[i].r-ORBS[j].r,`${ORBS[i].id}/${ORBS[j].id}`).toBeGreaterThan(.3);
  }
 });
 it('keeps orbs clear of the master clock, pedestal and posts',()=>{
  for(const o of ORBS)for(const a of angles){
   const [x,y]=orbCentre(o,a);
   expect(Math.hypot(x-MASTER.x,y-MASTER.y)-o.r-(MASTER.bezel+MASTER.bezelTube),o.id).toBeGreaterThan(1);
   expect(Math.hypot(x-MASTER.x,y-MASTER.y-MASTER.hoodRise)-o.r-MASTER.hood,o.id).toBeGreaterThan(1);
   const dx=Math.max(Math.abs(x)-PEDESTAL.w/2,0),dy=Math.max(y-PEDESTAL.top,0);
   expect(Math.hypot(dx,dy)-o.r,o.id).toBeGreaterThan(1);
   expect(Math.hypot(Math.abs(x)-POST.x,POST.z)-o.r-POST.r,o.id).toBeGreaterThan(5);
  }
 });
 it('stands resting orbs on the plinth and hangs the rest below their pivots',()=>{
  expect(orb('cell').y-orb('cell').r).toBeCloseTo(PLINTH.top+.5);expect(orb('chatham').y-orb('chatham').r).toBeCloseTo(PLINTH.top+.5);
  for(const o of HANGING){expect(rodLength(o)).toBeGreaterThan(o.r+5);expect(archInset(o.x,o.pivotY!+6)).toBeGreaterThan(0)}
 });
 it('fits the master clock and posts inside the enclosure',()=>{
  expect(archInset(0,MASTER.finial+MASTER.finialR+8)).toBeGreaterThan(0);
  expect(archInset(POST.x+POST.r,POST.top)).toBeGreaterThan(0);
  expect(MASTER.y-MASTER.bezel-MASTER.bezelTube).toBeGreaterThanOrEqual(PEDESTAL.top);
  expect(MASTER.y+MASTER.hoodRise-MASTER.hood).toBeGreaterThan(PEDESTAL.top+8.2);
  expect(DIALS.length).toBe(6);
 });
});
