import {describe,it,expect} from 'vitest';
import {wheelOutline,wheelShape,escapeWheelShape,meshed,centreDistance,trainRatio,pitchRadius,tipRadius,rootRadius,spiral} from './horology';

const wrap=(a:number,period:number)=>((a%period)+period)%period;
describe('kit horology',()=>{
 it('draws involute teeth between the root and tip circles',()=>{
  for(const [m,z] of [[.5,80],[.4,12],[.6,8],[1,30]]){
   const o=wheelOutline({module:m,teeth:z});
   expect(o.pitch).toBeCloseTo(pitchRadius(m,z));expect(o.tip).toBeLessThanOrEqual(tipRadius(m,z)+1e-9);
   const radii=o.points.map(([x,y])=>Math.hypot(x,y));
   expect(Math.min(...radii)).toBeGreaterThanOrEqual(o.root-1e-9);expect(Math.max(...radii)).toBeLessThanOrEqual(o.tip+1e-9);
   // One run of tip points per tooth.
   let tips=0;radii.forEach((r,i)=>{if(r>o.tip-1e-9&&radii[(i+radii.length-1)%radii.length]<=o.tip-1e-9)tips++});
   expect(tips).toBe(z);
   // Anticlockwise outline.
   let area=0;o.points.forEach(([x,y],i)=>{const [u,v]=o.points[(i+1)%o.points.length];area+=x*v-u*y});expect(area).toBeGreaterThan(0);
  }
  expect(rootRadius(.5,80)).toBeCloseTo(19.375);
 });
 it('gives a tooth a quarter pitch of half-width at the pitch circle',()=>{
  const m=.5,z=40,o=wheelOutline({module:m,teeth:z},40),pitch=Math.PI*2/z;
  // First tooth is centred on angle 0: find its flank point nearest the pitch radius.
  const flank=o.points.slice(0,45).reduce((best,p)=>Math.abs(Math.hypot(...p)-o.pitch)<Math.abs(Math.hypot(...best)-o.pitch)?p:best);
  expect(Math.abs(Math.atan2(flank[1],flank[0]))).toBeCloseTo(pitch/4,2);
 });
 it('cuts crossings and a bore as holes',()=>{
  expect(wheelShape({module:.5,teeth:60,bore:.6,crossings:5,hub:2.5}).holes).toHaveLength(6);
  expect(escapeWheelShape(15,6,{bore:.4,crossings:4}).holes).toHaveLength(5);
 });
 it('phases a driven gear so a tooth meets a gap, at the right speed and sense',()=>{
  for(const [z1,z2,phi] of [[80,10,.3],[12,36,2.1],[15,15,-1]]){
   // Driver has a tooth pointing at the driven gear when theta1 = phi; the driven gear must show a gap pointing back.
   const t2=meshed(phi,z1,z2,phi),p2=Math.PI*2/z2;
   expect(wrap(phi+Math.PI-t2,p2)).toBeCloseTo(p2/2);
   // Advance the driver by one tooth: the driven gear goes back by one of its own.
   expect(meshed(phi+Math.PI*2/z1,z1,z2,phi)-t2).toBeCloseTo(-p2);
  }
 });
 it('computes centre distances and train ratios',()=>{
  expect(centreDistance(.5,80,10)).toBeCloseTo(22.5);
  expect(trainRatio([[80,10],[75,10]])).toBeCloseTo(60);
 });
 it('winds a spiral from the outer end to the inner',()=>{
  const p=spiral(6,1,5);expect(Math.hypot(p[0][0],p[0][1])).toBeCloseTo(5);expect(Math.hypot(p.at(-1)![0],p.at(-1)![1])).toBeCloseTo(1);
 });
});
