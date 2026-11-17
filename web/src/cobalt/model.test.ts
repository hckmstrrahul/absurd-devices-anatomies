import {describe,it,expect} from 'vitest';
import {start,step,pose,framesPerSecond,powerOf,steadyTemp,assemblies,AMBIENT,RATE,FRAME,BURST,type State} from './model';
import {BOARD,GRID,HOLES,HOLE,U1,FLEX,COVER,LEAD,PLINTH,TOP,coverBase,flexPath,layout,keepout,overlap,onBoard} from './layout';
import {routed} from './router';
import {silk,labelBox} from './print';

const run=(s:State,seconds:number,playing=true,rate=40)=>{for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{rate});return s};

describe('Cobalt model',()=>{
 it('matches the hand check at 40 kS/s',()=>{
  // 40 000 samples a second in frames of 16 384 is 2.441 frames a second; 180 + 9.2 × 40 = 548 mW; 25 + 548 × 0.038 = 45.8 °C.
  expect(FRAME).toBe(16384);expect(framesPerSecond(40)).toBeCloseTo(2.4414,3);expect(powerOf(40,1)).toBeCloseTo(548);expect(steadyTemp(40)).toBeCloseTo(45.824,2);
  const p=pose(run(start,60));
  expect(p.fps).toBeCloseTo(2.4414,2);expect(p.watts).toBeCloseTo(548,0);expect(p.temp).toBeCloseTo(45.82,1);expect(p.on).toBeCloseTo(1,3);
 });
 it('is deterministic and rests when paused',()=>{
  expect(run(start,7)).toEqual(run(start,7));
  const rest=pose(run(start,5,false));expect(rest.on).toBe(0);expect(rest.scan).toBe(-1);expect(rest.led).toBe(0);expect(rest.temp).toBe(AMBIENT);
  const cooled=pose(run(run(start,30),60,false));expect(cooled.temp).toBeCloseTo(AMBIENT,1);expect(cooled.watts).toBeCloseTo(0,3);
 });
 it('sends one burst down the flex per frame, then flashes the LED',()=>{
  let s=run(start,3),bursts=0,flashes=0,was=-1,lit=false;const frames0=pose(s).frames;
  for(let i=0;i<600;i++){
   s=step(s,1/60,true,{rate:40});const p=pose(s);
   expect(p.scan===-1||(p.scan>=0&&p.scan<=1)).toBe(true);
   // The LED is bright only after the burst has arrived.
   if(p.led>.5)expect(p.scan).toBe(-1);
   if(p.scan>=0&&was<0)bursts++;if(p.led>.5&&!lit)flashes++;was=p.scan;lit=p.led>.5;
  }
  const frames=pose(s).frames-frames0;
  expect(frames).toBeGreaterThanOrEqual(23);expect(Math.abs(bursts-frames)).toBeLessThanOrEqual(1);expect(Math.abs(flashes-frames)).toBeLessThanOrEqual(1);
  expect(BURST.travel+BURST.flash).toBeLessThan(1);
 });
 it('runs hotter and faster with the slider, inside its limits',()=>{
  const slow=pose(run(start,60,true,RATE.min)),fast=pose(run(start,60,true,RATE.max)),over=pose(run(start,60,true,500));
  expect(fast.temp).toBeGreaterThan(slow.temp+30);expect(fast.fps).toBeGreaterThan(slow.fps*50);
  expect(fast.warm).toBeCloseTo(1,2);expect(over.temp).toBeCloseTo(fast.temp,3);expect(fast.temp).toBeLessThan(75);
  expect(slow.warm).toBeGreaterThan(0);
 });
 it('lights the cover plate harder with load and keeps its pulses in step with the frames',()=>{
  const rest=pose(run(start,5,false)),slow=pose(run(start,30,true,RATE.min)),fast=pose(run(start,30,true,RATE.max));
  expect(rest.glow).toBe(0);expect(slow.glow).toBeGreaterThan(.4);expect(fast.glow).toBeCloseTo(1,2);expect(fast.glow).toBeGreaterThan(slow.glow);
  let s=run(start,3);const f0=pose(s).flow;s=step(s,.1,true,{rate:40});
  expect(pose(s).flow).toBeCloseTo((f0+.1*framesPerSecond(40))%1,2);
 });
 it('names every assembly once and leaves the plinth where it is',()=>{
  expect(new Set(assemblies.map(a=>a.id)).size).toBe(assemblies.length);
  for(const a of assemblies){expect(a.note.split(' ').length).toBeLessThanOrEqual(8);expect(a.move[0]).toBe(0);expect(a.move[2]).toBe(0)}
  expect(assemblies.find(a=>a.id==='plinth')!.move).toEqual([0,0,0]);expect(assemblies.find(a=>a.id==='standoffs')!.move).toEqual([0,0,0]);
  const lifts=assemblies.map(a=>a.move[1]);expect([...lifts].sort((a,b)=>b-a)).toEqual(lifts);
 });
});

describe('Cobalt layout',()=>{
 const l=layout();
 it('is a 46 × 40 mm module with every lead of its packages',()=>{
  expect(BOARD.w).toBe(46);expect(BOARD.d).toBe(40);
  expect(l.leads.filter(x=>x.part==='U1').length).toBe(80);expect(l.leads.filter(x=>x.part==='U2').length).toBe(8);
  expect(l.parts.length).toBeGreaterThan(60);expect(new Set(l.parts.map(p=>p.ref)).size).toBe(l.parts.length);
  // Hand check: U1's first front lead is 9.5 pitches left of centre, on the body's front edge.
  const first=l.leads.find(x=>x.part==='U1')!;expect(first.x).toBeCloseTo(U1.x-9.5*U1.pitch);expect(first.z).toBeCloseTo(U1.z+U1.body/2);
 });
 it('puts a land under every lead foot and every chip terminal',()=>{
  for(const lead of l.leads){
   const d=LEAD[lead.fam],fx=lead.x+lead.dx*(d.span-.15),fz=lead.z+lead.dz*(d.span-.15);
   expect(l.pads.some(p=>p.part===lead.part&&Math.abs(p.x-fx)<=p.w/2&&Math.abs(p.z-fz)<=p.d/2),`${lead.part} lead at ${lead.x},${lead.z}`).toBe(true);
  }
  for(const p of l.parts)if(/^[cr]0/.test(p.kind))expect(l.pads.filter(q=>q.part===p.ref).length,p.ref).toBe(2);
 });
 it('keeps parts clear of each other, of the mounting rings and of the edge',()=>{
  const boxes=l.parts.map(p=>keepout(p,l)),clashes:string[]=[];
  for(let i=0;i<boxes.length;i++){
   for(let j=i+1;j<boxes.length;j++)if(overlap(boxes[i],boxes[j],.1))clashes.push(`${l.parts[i].ref}×${l.parts[j].ref}`);
   const k=boxes[i];for(const [x,z] of [[k[0],k[1]],[k[2],k[1]],[k[0],k[3]],[k[2],k[3]]])if(!onBoard(x,z,.5))clashes.push(`${l.parts[i].ref} off the board`);
   for(const h of HOLES){const dx=Math.max(k[0]-h[0],0,h[0]-k[2]),dz=Math.max(k[1]-h[1],0,h[1]-k[3]);if(Math.hypot(dx,dz)<HOLE.ring+.2)clashes.push(`${l.parts[i].ref} on a ring`)}
  }
  expect(clashes).toEqual([]);
 });
 it('carries the flex over the chip and the cover plate on the flex',()=>{
  const path=flexPath();
  for(const [z,y] of path){
   // Over U1's body the ribbon clears the package top.
   if(z>U1.z-U1.body/2&&z<U1.z+U1.body/2)expect(y-FLEX.t/2).toBeGreaterThan(U1.h+.5);
   expect(y-FLEX.t/2).toBeGreaterThan(.5);expect(Math.abs(z)).toBeLessThan(BOARD.d/2);
  }
  for(let i=1;i<path.length-1;i++)expect(Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1])).toBeCloseTo(.25,3);
  const top=Math.max(...path.map(p=>p[1]));expect(coverBase()).toBeCloseTo(top+FLEX.t/2);
  expect(COVER.x-COVER.w/2).toBeLessThan(FLEX.x-FLEX.w/2);expect(COVER.x+COVER.w/2).toBeGreaterThan(FLEX.x+FLEX.w/2);
  // The module sits wholly on the steel, clear of the cut for the brass block.
  expect(PLINTH.notch.x).toBeGreaterThan(BOARD.w/2);expect(PLINTH.notch.z).toBeGreaterThan(BOARD.d/2);expect(TOP).toBeCloseTo(6.6);
 });
});

describe('Cobalt copper and silk',()=>{
 const r=routed(),l=layout();
 it('routes every bus and runs every trace at 0°, 45° or 90° on the lattice',()=>{
  expect(r.stats['u1:b']).toBe(14);expect(r.stats['u1:f']).toBeGreaterThanOrEqual(12);expect(r.stats.failed).toBeLessThanOrEqual(4);
  expect(r.traces.length).toBeGreaterThan(110);expect(r.inner.length).toBeGreaterThan(8);expect(r.stitch.length/2).toBeGreaterThan(150);
  for(const t of [...r.traces,...r.inner])for(let i=2;i<t.p.length;i+=2){
   const dx=Math.abs(t.p[i]-t.p[i-2]),dz=Math.abs(t.p[i+1]-t.p[i-1]);
   expect(dx<1e-9||dz<1e-9||Math.abs(dx-dz)<1e-9).toBe(true);expect(dx+dz).toBeGreaterThan(0);
   expect(Math.abs(t.p[i]/GRID-Math.round(t.p[i]/GRID))).toBeLessThan(1e-6);expect(onBoard(t.p[i],t.p[i+1],.6)).toBe(true);
  }
 });
 it('starts and ends each trace on a land or a via, and keeps vias off lands',()=>{
  const onLand=(x:number,z:number)=>l.pads.some(p=>Math.abs(p.x-x)<=p.w/2+.26&&Math.abs(p.z-z)<=p.d/2+.26),onVia=(x:number,z:number)=>{for(let i=0;i<r.vias.length;i+=2)if(Math.abs(r.vias[i]-x)<1e-6&&Math.abs(r.vias[i+1]-z)<1e-6)return true;return false};
  for(const t of r.traces){const n=t.p.length;expect(onLand(t.p[0],t.p[1])).toBe(true);expect(onLand(t.p[n-2],t.p[n-1])||onVia(t.p[n-2],t.p[n-1])).toBe(true)}
  for(const at of [r.vias,r.stitch])for(let i=0;i<at.length;i+=2)expect(l.pads.some(p=>Math.abs(p.x-at[i])<p.w/2+.25&&Math.abs(p.z-at[i+1])<p.d/2+.25),`via at ${at[i]},${at[i+1]}`).toBe(false);
 });
 it('is the same copper every time',()=>{expect(routed()).toBe(r)});
 it('letters every package clear of lands and of other lettering',()=>{
  const s=silk();expect(s.missed).toEqual([]);
  const names=s.labels.map(x=>x.t);for(const t of ['COBALT M1','U1','U2','U3','J1','J3','L1','Y1'])expect(names,t).toContain(t);
  const boxes=s.labels.map(labelBox);
  for(let i=0;i<boxes.length;i++){
   for(let j=i+1;j<boxes.length;j++)expect(overlap(boxes[i],boxes[j]),`${names[i]}×${names[j]}`).toBe(false);
   for(const p of l.pads)expect(overlap(boxes[i],[p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2]),`${names[i]} on a land of ${p.part}`).toBe(false);
  }
 });
});

// The Layers view only moves the module's own assemblies. Every solid is boxed (each body at its height; leads and fillets are not boxed) and the
// whole move is swept, so the test fails if any part would pass through a part of another assembly on the way.
describe('Cobalt layers arrangement',()=>{
 type Solid={asm:string;ref:string;b:[number,number,number,number,number,number]};          // x0, y0, z0, x1, y1, z1 above the board top
 const l=layout(),solids:Solid[]=[];
 for(const p of l.parts)if(p.kind!=='tp')solids.push({asm:p.asm,ref:p.ref,b:[p.x-p.w/2,.02,p.z-p.d/2,p.x+p.w/2,p.h,p.z+p.d/2]});
 for(const [x,z] of HOLES){solids.push({asm:'screws',ref:'shank',b:[x-.95,-TOP+.3,z-.95,x+.95,0,z+.95]});solids.push({asm:'screws',ref:'head',b:[x-1.9,0,z-1.9,x+1.9,3.9,z+1.9]})}
 for(const [z,y] of flexPath(.5))solids.push({asm:'flex',ref:'flex',b:[FLEX.x-FLEX.w/2,y-FLEX.t/2,z-.25,FLEX.x+FLEX.w/2,y+FLEX.t/2,z+.25]});
 solids.push({asm:'cover',ref:'cover',b:[COVER.x-COVER.w/2,coverBase()+.01,COVER.z-COVER.d/2,COVER.x+COVER.w/2,coverBase()+COVER.t,COVER.z+COVER.d/2]});
 const at=(id:string)=>assemblies.find(a=>a.id===id)!;
 // The stage's own easing: a plane rises first, then slides.
 const ease=(x:number)=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t)};
 const path=(l:number[],t:number)=>{const rise=ease(t*1.7),slide=ease((t-.35)/.65);return [l[0]*slide,l[1]*rise,l[2]*slide]};
 const clashes=(offset:(id:string,t:number)=>number[])=>{
  const found=new Set<string>();
  for(let step=0;step<=40;step++){
   const t=step/40;
   for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++){
    const a=solids[i],c=solids[j];if(a.asm===c.asm)continue;
    // The ribbon's tail is latched inside J2 when assembled; the socket lets go of it as it leaves.
    if((a.ref==='J2'&&c.ref==='flex')||(a.ref==='flex'&&c.ref==='J2'))continue;
    const p=offset(a.asm,t),q=offset(c.asm,t);
    if(a.b[0]+p[0]<c.b[3]+q[0]&&a.b[3]+p[0]>c.b[0]+q[0]&&a.b[1]+p[1]<c.b[4]+q[1]&&a.b[4]+p[1]>c.b[1]+q[1]&&a.b[2]+p[2]<c.b[5]+q[2]&&a.b[5]+p[2]>c.b[2]+q[2])found.add(`${a.ref}×${c.ref}`);
   }
  }
  return [...found];
 };
 it('is clear when assembled, and stays clear all the way into the Layers view',()=>{
  expect(clashes(()=>[0,0,0])).toEqual([]);
  expect(clashes((id,t)=>path(at(id).layer??[0,0,0],t))).toEqual([]);
 });
 it('stays clear when Layers is combined with the explosion',()=>{
  expect(clashes((id,t)=>(at(id).layer??[0,0,0]).map((v,k)=>v+at(id).move[k]*t))).toEqual([]);
 });
 it('rises modestly, in assembly order, with every plane sliding its own way',()=>{
  const moving=assemblies.filter(a=>a.layer&&a.layer.some(v=>v!==0));
  expect(moving.map(a=>a.id)).toEqual(['cover','flex','screws','chips','connectors','passives']);
  for(const a of moving){expect(a.layer![1]).toBeGreaterThan(0);expect(a.layer![1]).toBeLessThan(a.move[1]*.6)}
  const rises=moving.map(a=>a.layer![1]);expect([...rises].sort((p,q)=>q-p)).toEqual(rises);
  // Screws have their shanks in the board, so they only rise, far enough to hang clear above it.
  expect(at('screws').layer).toEqual([0,11,0]);expect(11-(TOP-.3)).toBeGreaterThan(0);
  const slides=moving.filter(a=>a.id!=='screws').map(a=>Math.atan2(a.layer![2],a.layer![0]));
  for(let i=0;i<slides.length;i++)for(let j=i+1;j<slides.length;j++){const d=Math.abs(slides[i]-slides[j]);expect(Math.min(d,Math.PI*2-d)).toBeGreaterThan(.5)}
  for(const id of ['board','standoffs','plinth'])expect(at(id).layer??[0,0,0]).toEqual([0,0,0]);
 });
});
