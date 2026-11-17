import {describe,it,expect} from 'vitest';
import {poseAt,advance,targetRpm,spread,assemblies,BELT_RATIO,STEPS_PER_REV,type Spin} from './model';
import {footprints,TRAY,PLATTER} from './layout';

describe('Orbit Deck motion model',()=>{
 it('derives every readout from platter revolutions',()=>{
  const p=poseAt(1,100/3);
  expect(p.platter).toBeCloseTo(Math.PI*2);expect(p.rotor).toBeCloseTo(Math.PI*2*BELT_RATIO);
  expect(p.bpm).toBeCloseTo(133.333,2);expect(p.rotorRpm).toBeCloseTo(200);
  expect(poseAt(1,45).bpm).toBeCloseTo(180);expect(poseAt(1,45).rotorRpm).toBeCloseTo(270);
 });
 it('is deterministic and keeps the level in range',()=>{
  for(let i=0;i<200;i++){
   const revs=i*.0371,rpm=(i%46);const a=poseAt(revs,rpm);poseAt(revs+3,rpm);
   expect(poseAt(revs,rpm)).toEqual(a);expect(a.level).toBeGreaterThanOrEqual(0);expect(a.level).toBeLessThanOrEqual(1);
  }
  expect(poseAt(2.3,0).level).toBe(0);
 });
 it('steps sixteen times per revolution',()=>{
  const seen=Array.from({length:STEPS_PER_REV},(_,i)=>poseAt((i+.5)/STEPS_PER_REV,45).step);
  expect(seen).toEqual(Array.from({length:STEPS_PER_REV},(_,i)=>i));
 });
 it('spins up, coasts down and ignores long frame gaps',()=>{
  let spin:Spin={revs:0,rpm:0};
  for(let i=0;i<180;i++)spin=advance(spin,1/60,45);
  expect(spin.rpm).toBeGreaterThan(45*.99);expect(spin.rpm).toBeLessThanOrEqual(45);
  const before=spin.revs;for(let i=0;i<180;i++){spin=advance(spin,1/60,0);expect(spin.rpm).toBeGreaterThanOrEqual(0)}
  expect(spin.rpm).toBeLessThan(.5);expect(spin.revs).toBeGreaterThan(before);
  const gap=advance({revs:0,rpm:45},5,45);expect(gap.revs).toBeCloseTo(45/60*.1);
  expect(advance({revs:1,rpm:45},-1,45).revs).toBe(1);
 });
 it('sets the target speed from play state, speed and clamped pitch',()=>{
  expect(targetRpm(false,'45',0)).toBe(0);expect(targetRpm(true,'33',8)).toBeCloseTo(36);
  expect(targetRpm(true,'45',50)).toBeCloseTo(45*1.08);expect(targetRpm(true,'45',-50)).toBeCloseTo(45*.92);
 });
 it('staggers separation without losing the end states',()=>{
  for(const a of assemblies){
   expect(spread(0,a.order)).toBe(0);expect(spread(1,a.order)).toBe(1);
   let last=0;for(let s=0;s<=1.0001;s+=.05){const v=spread(s,a.order);expect(v).toBeGreaterThanOrEqual(last);last=v}
  }
 });
});

describe('Orbit Deck layout',()=>{
 const half=(f:typeof footprints[number])=>f.r!==undefined?[f.r,f.r]:[f.w!/2,f.d!/2];
 it('keeps every part inside the tray and under the lid',()=>{
  for(const f of footprints){
   const [hx,hz]=half(f);
   expect(Math.abs(f.x)+hx,f.id).toBeLessThanOrEqual(TRAY.innerX);expect(Math.abs(f.z)+hz,f.id).toBeLessThanOrEqual(TRAY.innerZ);
   expect(f.y0,f.id).toBeGreaterThanOrEqual(TRAY.floorTop);expect(f.y1,f.id).toBeLessThanOrEqual(TRAY.lidInner);expect(f.y1,f.id).toBeGreaterThan(f.y0);
  }
 });
 it('keeps other assemblies clear of the platter',()=>{
  for(const f of footprints.filter(f=>f.asm!=='platter')){
   const [hx,hz]=half(f);
   const dx=Math.max(Math.abs(f.x-PLATTER.x)-(f.r===undefined?hx:0),0),dz=Math.max(Math.abs(f.z-PLATTER.z)-(f.r===undefined?hz:0),0);
   const gap=Math.hypot(dx,dz)-(f.r??0);
   expect(gap,f.id).toBeGreaterThanOrEqual(PLATTER.bezel);
  }
 });
 it('gives every assembly placed parts with unique ids',()=>{
  for(const a of assemblies)expect(footprints.some(f=>f.asm===a.id),a.id).toBe(true);
  expect(new Set(footprints.map(f=>f.id)).size).toBe(footprints.length);
 });
});
