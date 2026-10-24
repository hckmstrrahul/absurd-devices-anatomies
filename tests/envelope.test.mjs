import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGeometry, ENVELOPE, P } from '../geometry.mjs';
import { boundsOf, sdf } from '../vendor/anatomy/kit/audit.mjs';
import { iso } from '../vendor/anatomy/kit/iso-kit.mjs';

test('the whole assembled device fits one 120 × 120 × 120 mm cube',()=>{
  const {R}=makeGeometry();
  const measured={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
  for(const solid of R.solids){
    const b=boundsOf(solid);
    for(let axis=0;axis<3;axis++){
      assert.ok(b.min[axis]>=ENVELOPE.min[axis]-1e-6,`${solid.name} protrudes below envelope on axis ${axis}`);
      assert.ok(b.max[axis]<=ENVELOPE.max[axis]+1e-6,`${solid.name} protrudes above envelope on axis ${axis}`);
      measured.min[axis]=Math.min(measured.min[axis],b.min[axis]);
      measured.max[axis]=Math.max(measured.max[axis],b.max[axis]);
    }
  }
  for (const edge of ["min","max"]) for(let i=0;i<3;i++) assert.ok(Math.abs(measured[edge][i]-ENVELOPE[edge][i])<1e-6);
  for(const length of measured.max.map((v,i)=>v-measured.min[i])) assert.ok(Math.abs(length-120)<1e-6);
  // Sample all six outer faces, including corners and seams: a bounded model
  // with missing corners or external recesses would not be a complete cube.
  for(let axis=0;axis<3;axis++)for(const edge of ['min','max']){
    const other=[0,1,2].filter(i=>i!==axis);
    for(let u=0;u<=16;u++)for(let v=0;v<=16;v++){
      const point=[0,0,0];point[axis]=ENVELOPE[edge][axis];
      for(const [j,t] of [[other[0],u/16],[other[1],v/16]])point[j]=ENVELOPE.min[j]+t*(ENVELOPE.max[j]-ENVELOPE.min[j]);
      assert.ok(R.solids.some(s=>sdf(s,point)<=1e-6),`Outer face has a gap at ${point}`);
    }
  }
});

test('the isometric camera gives all three cube edges equal visual length',()=>{
  const start=iso(ENVELOPE.min,P);
  const lengths=[0,1,2].map(axis=>{
    const point=[...ENVELOPE.min];point[axis]+=120;
    const end=iso(point,P);
    return Math.hypot(end[0]-start[0],end[1]-start[1]);
  });
  assert.ok(Math.max(...lengths)-Math.min(...lengths)<1e-6);
});
