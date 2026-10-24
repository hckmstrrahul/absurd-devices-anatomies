import test from 'node:test';
import assert from 'node:assert/strict';
import { telemetry } from '../model.mjs';
test('field intensity consistently drives biological response and power draw',()=>{
  const low=telemetry(0), mid=telemetry(58), high=telemetry(100);
  assert.deepEqual([mid.vitality,mid.toxicity,mid.growth,mid.absorption,mid.power],[91,36,.61,61,3.3]);
  assert.ok(low.vitality>mid.vitality&&mid.vitality>high.vitality);
  for(const key of ['toxicity','growth','absorption','power'])assert.ok(low[key]<mid[key]&&mid[key]<high[key]);
});
test('standby removes power and all active telemetry',()=>{
  const m=telemetry(100,.4,false);
  for(const key of ['energy','vitality','toxicity','growth','absorption','frequency','power'])assert.equal(m[key],0);
  assert.equal(m.progress,40);
});
test('physical control limits clamp invalid ranges',()=>{
  assert.deepEqual(telemetry(-20,-1),telemetry(0,0));
  assert.deepEqual(telemetry(300,2),telemetry(100,1));
});
