import {describe,it,expect} from 'vitest';
import {sampleAt,tourAt,timeline,geometry,SCAN_SECONDS} from './model';

describe('Flora shared simulation',()=>{
 it('keeps the scan and readings deterministic at arbitrary frame times',()=>{
  const a=sampleAt(12.8,70);sampleAt(24.3,93);expect(sampleAt(12.8,70)).toEqual(a);
  expect(a.phase).toBeCloseTo((12.8%SCAN_SECONDS)/SCAN_SECONDS);
  expect(a.scanY).toBeCloseTo(16+a.phase*78);
  expect(sampleAt(12.8,-10).energy).toBe(0);expect(sampleAt(12.8,150).energy).toBeLessThanOrEqual(1);
 });
 it('makes stronger fields increase the shared power and response, while reducing vitality',()=>{
  const low=sampleAt(2,10),high=sampleAt(2,100);
  expect(high.power).toBeGreaterThan(low.power);expect(high.absorption).toBeGreaterThan(low.absorption);expect(high.vitality).toBeLessThan(low.vitality);expect(high.stress).toBe(1);expect(low.status).toBe('LOW SIGNAL');
 });
 it('preserves all 53 original solids, six modules, and their exact envelope',()=>{
  expect(geometry.parts).toHaveLength(53);expect(geometry.assemblies).toHaveLength(6);
  for(let axis=0;axis<3;axis++){
   const min=Math.min(...geometry.parts.map(p=>p.shape._b.min[axis]));const max=Math.max(...geometry.parts.map(p=>p.shape._b.max[axis]));expect(max-min).toBeCloseTo(120,7);
  }
 });
 it('visits every assembly, loops, and preserves continuous separation at each transition',()=>{
  expect(new Set(timeline.beats.map(b=>b.part).filter(Boolean)).size).toBe(6);
  expect(tourAt(0).controls).toEqual(tourAt(timeline.duration).controls);
  for(const beat of timeline.beats){const before=tourAt(beat.at-.0001).controls,after=tourAt(beat.at+.0001).controls;expect(Math.abs(before.separation-after.separation)).toBeLessThan(.00001);expect(Math.abs(before.intensity-after.intensity)).toBeLessThan(.0001)}
  for(let t=0;t<timeline.duration;t+=.2){const state=tourAt(t);expect(state.controls.separation).toBeGreaterThanOrEqual(0);expect(state.controls.separation).toBeLessThanOrEqual(1);expect(Number.isFinite(sampleAt(t,state.controls.intensity).power)).toBe(true)}
 });
});
