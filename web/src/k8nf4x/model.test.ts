import {describe,expect,it} from 'vitest';
import {start,step,pose,steadyVrm,steadyNb,cpuWatts,vrmLoss,vcore,assemblies,AMBIENT,CPU,VRM,NB,LEVER,type State} from './model';
import {BOARD,HOLES,DIMM,SLOTS,CHIPSET,SOCKET,FRAME,IO,OVERHANG,bodies,passives,overlap,slotRect,grow,SIZES,rect} from './layout';

const run=(seconds:number,load:number,lever='closed',playing=true,from:State=start)=>{let s=from;for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{load,lever});return s};

describe('k8nf4x model',()=>{
 it('settles where the arithmetic says',()=>{
  // Hand check: full load draws 12 + 77 = 89 W; at 84 % efficiency the VRM loses 89 × 0.16 / 0.84 = 16.95 W, × 2.3 K/W = +39.0 K.
  expect(cpuWatts(1,1)).toBeCloseTo(89,6);
  expect(vrmLoss(89)).toBeCloseTo(89*.16/.84,6);
  expect(steadyVrm(1)).toBeCloseTo(AMBIENT+89*(1-VRM.eff)/VRM.eff*VRM.rth,6);
  expect(steadyVrm(1)).toBeCloseTo(63.98,1);
  // Chipset: 4.2 + 3.4 = 7.6 W × 8.4 K/W = +63.8 K, bare as photographed.
  expect(steadyNb(1)).toBeCloseTo(AMBIENT+(NB.idle+NB.span)*NB.rth,6);
  // Vcore droops under load: 1.40 − 0.0038 × 89/1.4 = 1.158 V.
  expect(vcore(89,1)).toBeCloseTo(CPU.vid-CPU.droop*89/CPU.vid,6);expect(vcore(0,0)).toBe(0);
 });
 it('warms toward its steady temperatures and not past them',()=>{
  const p=pose(run(80,60));
  expect(p.vrm).toBeGreaterThan(steadyVrm(.6)-1.5);expect(p.vrm).toBeLessThan(steadyVrm(.6)+.01);
  expect(p.nb).toBeGreaterThan(steadyNb(.6)-3);expect(p.nb).toBeLessThan(steadyNb(.6)+.01);
  expect(p.watts).toBeCloseTo(cpuWatts(.6,1),1);
 });
 it('will not power up with the lever raised, and the lever turns to 90°',()=>{
  const p=pose(run(10,80,'open'));
  expect(p.on).toBeLessThan(1e-6);expect(p.watts).toBe(0);expect(p.locked).toBe(false);expect(p.leverDeg).toBeCloseTo(LEVER.open,1);
  const q=pose(run(10,80,'closed',true,run(10,80,'open')));expect(q.leverDeg).toBeCloseTo(0,1);expect(q.on).toBeGreaterThan(.99);
 });
 it('is deterministic and does not advance on a zero step',()=>{
  expect(run(6,40)).toEqual(run(6,40));expect(step(start,0,true,{load:50,lever:'closed'})).toBe(start);
 });
 it('cools back to ambient when stopped',()=>{
  const p=pose(run(120,0,'closed',false,run(30,100)));
  expect(p.on).toBeLessThan(1e-6);expect(p.vrm).toBeLessThan(AMBIENT+.2);expect(p.nb).toBeLessThan(AMBIENT+.3);
 });
});

describe('k8nf4x layout',()=>{
 const list=bodies();
 it('keeps every part on the board (rear I/O may overhang the rear edge only)',()=>{
  for(const {id,b} of list){
   const latchOver=id.startsWith('DIMM')?0:0;
   expect(b[0],id).toBeGreaterThanOrEqual(id.startsWith('IO_')?-OVERHANG:0);
   expect(b[1],id).toBeGreaterThanOrEqual(0);expect(b[2],id).toBeLessThanOrEqual(BOARD.w+latchOver);expect(b[3],id).toBeLessThanOrEqual(BOARD.d);
  }
 });
 it('sets the slots on the 20.32 mm pitch with the photo\'s lengths, aligned at the bracket',()=>{
  for(let i=1;i<SLOTS.length;i++)expect(SLOTS[i].z-SLOTS[i-1].z).toBeCloseTo(20.32,6);
  const len={pcie1:37,pcie16:116,pci:84.8};for(const s of SLOTS)expect(s.len).toBeCloseTo(len[s.kind],6);
  expect(DIMM.x1-DIMM.x0).toBeCloseTo(133.2,1);
 });
 it('keeps big parts clear of each other',()=>{
  const big=list.filter(b=>!/^C\d|^L\d|^Q\d|^U\d|^Y\d/.test(b.id));
  for(let i=0;i<big.length;i++)for(let j=i+1;j<big.length;j++){
   const a=big[i],c=big[j];
   // The socket and chipset sit inside their own keep-outs; the frame encloses the socket.
   if(a.id==='FRAME'||c.id==='FRAME')continue;
   expect(overlap(a.b,c.b),`${a.id} × ${c.id}`).toBe(false);
  }
 });
 it('places the socket inside its frame and the chipset between socket and x16',()=>{
  expect(SOCKET.x0).toBeGreaterThan(FRAME.ix0);expect(SOCKET.x1+2).toBeLessThan(FRAME.ix1);expect(SOCKET.z1).toBeLessThan(FRAME.iz1);
  expect(CHIPSET.z-CHIPSET.s*Math.SQRT2/2).toBeGreaterThan(FRAME.z1);expect(CHIPSET.z+CHIPSET.s*Math.SQRT2/2).toBeLessThan(slotRect(SLOTS[1])[1]);
 });
 it('keeps small parts off every body and inside the board, and off the mounting rings',()=>{
  const ps=passives();expect(ps.length).toBeGreaterThan(450);
  const keep=list.map(b=>b.b);
  for(const p of ps){
   const [l,w]=SIZES[p.kind],b=p.turn?rect(p.x,p.z,w,l):rect(p.x,p.z,l,w);
   expect(b[0]).toBeGreaterThan(0);expect(b[2]).toBeLessThan(BOARD.w);
   for(const k of keep)expect(overlap(b,k)).toBe(false);
   for(const [x,z] of HOLES)expect(overlap(b,grow(rect(x,z,0,0),4))).toBe(false);
  }
 });
 it('spans the rear I/O within the 158.75 mm ATX shield opening',()=>{
  expect(IO.audio.z1-IO.ps2.z0).toBeLessThan(158.75);
 });
 it('lifts every assembly less in the Layers view than it explodes, and keeps the board still',()=>{
  for(const a of assemblies){if(a.id==='board'){expect(a.layer).toBeUndefined();continue}expect(a.layer![1]).toBeGreaterThan(0);expect(a.layer![1]).toBeLessThan(Math.hypot(...a.move))}
 });
});
