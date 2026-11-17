import {describe,expect,it} from 'vitest';
import {start,step,pose,steadyVrm,steadyNb,vrmLoss,cpuWatts,AMBIENT,R,assemblies,ON_DELAY} from './model';
import {BOARD,SLOTS,PITCH,COOLER,DIMMS,DIMM,CAPS,TOROIDS,EMPTY,HEADERS,bodies,passives,footOf,overlap,grow,IO_FACE,ATX24,SOCKET} from './layout';

const run=(seconds:number,load:number,playing=true)=>{let s=start;for(let t=0;t<seconds;t+=.05)s=step(s,.05,playing,{load});return s};

describe('motion model',()=>{
 it('settles at the hand-checked temperatures',()=>{
  // Full load: 84 W out of the regulator at 86 % efficiency loses 84 × (1/0.86 − 1) = 13.67 W; × 4.2 K/W + 25 = 82.4 °C.
  expect(cpuWatts(1,1)).toBe(84);
  expect(vrmLoss(1,1)).toBeCloseTo(13.674,2);
  expect(steadyVrm(1)).toBeCloseTo(AMBIENT+13.674*R.vrm,2);
  // North bridge at half load: 9 + 3 = 12 W × 2.6 K/W + 25 = 56.2 °C.
  expect(steadyNb(.5)).toBeCloseTo(56.2,5);
  const s=run(120,100);expect(s.vrm).toBeCloseTo(steadyVrm(1),0);expect(s.nb).toBeCloseTo(steadyNb(1),0);
 });
 it('lights standby before the supply turns on',()=>{
  const early=pose(run(ON_DELAY*.9,50));expect(early.lamp).toBeGreaterThan(.3);expect(early.on).toBeLessThan(.01);expect(early.vcore).toBe(0);
  const later=pose(run(6,50));expect(later.on).toBeGreaterThan(.99);expect(later.vcore).toBeGreaterThan(1.29);expect(later.vcore).toBeLessThan(1.33);
 });
 it('is deterministic and cools when stopped',()=>{
  expect(run(10,70)).toEqual(run(10,70));
  let s=run(60,100);for(let t=0;t<60;t+=.05)s=step(s,.05,false,{load:100});expect(pose(s).lamp).toBeLessThan(.01);expect(s.vrm).toBeLessThan(steadyVrm(1)-20);
 });
 it('every assembly but the board moves, in a believable order',()=>{
  const board=assemblies.find(a=>a.id==='board')!;expect(board.move).toEqual([0,0,0]);
  for(const a of assemblies)if(a.id!=='board'){expect(Math.hypot(...a.move)).toBeGreaterThan(15);expect(a.layer).toBeDefined()}
  const order=(id:string)=>assemblies.find(a=>a.id===id)!.order;expect(order('heatsink')).toBeLessThan(order('chips'));expect(order('socket')).toBeLessThan(order('board'));
 });
});

describe('layout traced from the photograph',()=>{
 it('uses the standard slot pitch and lengths',()=>{
  for(let i=1;i<SLOTS.length;i++)expect(SLOTS[i].v-SLOTS[i-1].v).toBeCloseTo(PITCH,5);
  expect(SLOTS.filter(s=>s.kind==='pci').every(s=>Math.abs(s.len-86.9)<1)).toBe(true);
  expect(SLOTS.find(s=>s.kind==='x16')!.len).toBeGreaterThan(88);expect(SLOTS.find(s=>s.kind==='x1')!.len).toBe(25);
 });
 it('puts the cooler holes on the LGA775 72 mm square, around the socket',()=>{
  const du=COOLER[1][0]-COOLER[0][0],dv=COOLER[2][1]-COOLER[0][1];expect(Math.abs(du-72)).toBeLessThan(1.5);expect(Math.abs(dv-72)).toBeLessThan(1.5);
  const cu=COOLER.reduce((s,c)=>s+c[0],0)/4,cv=COOLER.reduce((s,c)=>s+c[1],0)/4;expect(Math.abs(cu-SOCKET.u)).toBeLessThan(1);expect(Math.abs(cv-SOCKET.v)).toBeLessThan(4);
 });
 it('counts what the photo shows',()=>{
  expect(CAPS.length).toBe(18);expect(TOROIDS.length).toBe(3);expect(DIMMS.length).toBe(2);expect(SLOTS.length).toBe(5);
  expect(EMPTY.length).toBeGreaterThan(25);expect(HEADERS.find(h=>h.id==='PANEL1')!.caps.length).toBe(20);
  expect(ATX24.rows*ATX24.cols).toBe(24);expect(DIMMS[1].u-DIMMS[0].u).toBeCloseTo(10,5);expect(DIMM.len).toBeGreaterThan(133);
 });
 it('keeps every part on the board, the rear panel just past its edge',()=>{
  for(const b of bodies()){
   const [u0,v0,u1,v1]=b.b;
   if(b.over)expect(u0).toBeGreaterThanOrEqual(IO_FACE-.01);else expect(u0).toBeGreaterThanOrEqual(-.01);
   expect(u1).toBeLessThanOrEqual(BOARD.w+.3);expect(v0).toBeGreaterThanOrEqual(-.01);expect(v1).toBeLessThanOrEqual(BOARD.d+.01);
  }
 });
 it('has no tall parts overlapping',()=>{
  const list=bodies().filter(b=>b.h>3&&b.id!=='NB'),clash:string[]=[];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(overlap(grow(list[i].b,-.2),grow(list[j].b,-.2)))clash.push(`${list[i].id}/${list[j].id}`);
  expect(clash).toEqual([]);
 });
 it('places small parts clear of everything',()=>{
  const p=passives(),b=bodies();expect(p.length).toBeGreaterThan(500);
  for(const c of p.slice(0,300))for(const x of b)expect(overlap(footOf(c),x.b)).toBe(false);
 });
});
