import {describe,expect,it} from 'vitest';
import {start,step,pose,steadyCpu,cpuPower,theta,fanTarget,vrmLoss,assemblies,AMBIENT,FAN,CPU_W,type State} from './model';
import {BOARD,uv,mm,px,QUAD,SLOTS,DIMMS,DIMM,ATX24,IDE,COIN,CAPS,CHOKES,HOLES,bodies,smds,smdRect,overlap,grow,W,D,R,type Rect} from './layout';
import {buildPrint} from './print';

const run=(seconds:number,load:number,playing=true,from:State=start)=>{let s=from;for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{load});return s};

describe('gap35 model',()=>{
 it('matches the hand-checked thermal arithmetic',()=>{
  expect(cpuPower(1,1)).toBeCloseTo(95,6);expect(cpuPower(0,1)).toBeCloseTo(CPU_W.idle,6);
  expect(theta(2950)).toBeCloseTo(.18+263/2950,6);
  // 25 + 95 × (0.18 + 263/2950) = 50.57 °C
  expect(steadyCpu(1,FAN.max)).toBeCloseTo(50.57,1);
  expect(vrmLoss(95)).toBeCloseTo(95*(1/.84-1),6);
 });
 it('ramps the fan between its limits with temperature',()=>{
  expect(fanTarget(20,1)).toBe(FAN.min);expect(fanTarget(90,1)).toBe(FAN.max);expect(fanTarget(50,0)).toBe(0);
  expect(fanTarget(50,1)).toBeGreaterThan(FAN.min);expect(fanTarget(50,1)).toBeLessThan(FAN.max);
 });
 it('powers on, spins the fan and settles near the steady die temperature',()=>{
  const p=pose(run(60,100));
  expect(p.on).toBeGreaterThan(.99);expect(p.rpm).toBeGreaterThan(FAN.min);
  expect(p.cpu).toBeGreaterThan(AMBIENT+15);expect(p.cpu).toBeLessThan(steadyCpu(1,FAN.min)+.5);
  expect(p.vrm).toBeGreaterThan(AMBIENT+20);
 });
 it('is deterministic, ignores a zero step, and cools down when stopped',()=>{
  expect(run(5,60)).toEqual(run(5,60));expect(step(start,0,true,{load:50})).toBe(start);
  const p=pose(run(80,60,false,run(20,90)));expect(p.on).toBeLessThan(1e-6);expect(p.rpm).toBeLessThan(1);expect(p.cpu).toBeLessThan(AMBIENT+.2);
 });
 it('turns the rotor from the pose only, faster at higher load',()=>{
  const a=run(30,0),b=run(30,100);expect(a.rpm).toBeLessThan(b.rpm+1);
  const s1=step(b,.05,true,{load:100});const d=((s1.turn-b.turn)+Math.PI*2)%(Math.PI*2);expect(d).toBeGreaterThan(0);
 });
 it('explodes the cooler first and leaves the board in place',()=>{
  expect(assemblies[0].id).toBe('cooler');expect(assemblies.at(-1)!.move).toEqual([0,0,0]);
  for(const a of assemblies)if(a.id!=='board'){expect(a.layer).toBeDefined();expect(Math.hypot(...a.layer!)).toBeLessThan(Math.hypot(...a.move)+60)}
 });
});

describe('gap35 layout',()=>{
 it('maps the photo quad corners onto the board corners and back',()=>{
  expect(mm(...QUAD.tl)[0]).toBeCloseTo(-BOARD.w/2,3);expect(mm(...QUAD.br)[1]).toBeCloseTo(BOARD.d/2,3);
  const [u,v]=uv(800,700);expect(u).toBeGreaterThan(0);expect(v).toBeLessThan(1);
  const [x,y]=px(...mm(900,800));expect(x).toBeCloseTo(900,3);expect(y).toBeCloseTo(800,3);
 });
 it('reads standard parts at their standard sizes',()=>{
  // Hand checks: ATX 24-pin ≈ 52 mm, IDE shroud ≈ 57–59 mm, PCI slot pitch 20.32 mm, coin holder Ø 25 mm.
  expect(W(ATX24.b)).toBeGreaterThan(50);expect(W(ATX24.b)).toBeLessThan(55);
  expect(W(IDE.b)).toBeGreaterThan(55);expect(W(IDE.b)).toBeLessThan(61);
  expect(SLOTS[1].x-SLOTS[0].x).toBeCloseTo(20.32,6);expect(COIN.r*2).toBeCloseTo(24.8,0);
  const pci=W(R([588,451,588,838]));void pci;expect(DIMM.len+DIMM.latch*2).toBeCloseTo(151,0);
 });
 it('keeps every part on the board, except the rear I/O overhang',()=>{
  for(const b of bodies()){if(b.asm==='io')continue;const [x0,z0,x1,z1]=b.b;expect(x0,b.id).toBeGreaterThan(-BOARD.w/2-.5);expect(x1,b.id).toBeLessThan(BOARD.w/2+.5);expect(z0,b.id).toBeGreaterThan(-BOARD.d/2-.5);expect(z1,b.id).toBeLessThan(BOARD.d/2+.5)}
 });
 it('has no collisions between the large parts',()=>{
  const big=bodies().filter(b=>['slots','memory','heatsinks','power','io'].includes(b.asm)&&b.h>5);
  for(let i=0;i<big.length;i++)for(let j=i+1;j<big.length;j++){if(big[i].asm==='io'&&big[j].asm==='io')continue;expect(overlap(grow(big[i].b,-.2),grow(big[j].b,-.2)),`${big[i].id} × ${big[j].id}`).toBe(false)}
 });
 it('places small parts clear of everything and of each other',()=>{
  const list=smds(),solid=bodies().map(b=>b.b);expect(list.length).toBeGreaterThan(600);
  for(const s of list.slice(0,400)){const f=smdRect(s);for(const b of solid)expect(overlap(f,b)).toBe(false)}
  const rects:Rect[]=list.map(smdRect);for(let i=0;i<200;i++)for(let j=i+1;j<rects.length;j++)expect(overlap(rects[i],rects[j])).toBe(false);
 });
 it('counts the parts the photo shows',()=>{
  expect(SLOTS.filter(s=>s.kind==='pci')).toHaveLength(5);expect(DIMMS).toHaveLength(4);expect(CHOKES.map(c=>c.value).sort()).toEqual(['1R2','2R0','2R2','2R2']);
  expect(CAPS.length).toBe(35);expect(HOLES.filter(h=>h.big)).toHaveLength(3);
 });
 it('prints the board’s own lettering',()=>{
  const t=buildPrint().texts.map(x=>x.t);
  for(const s of ['GIGABYTE','GA-P35-S3G','REV:1.0','PCB MADE IN CHINA','FSB1333','DDRII800/1066','Gigabit LAN','45nm CPU Support','Dual Channel DDRII 800/1066','SATAII PCI Express','SATAII0','SATAII5','SYS_FAN1','PWR_FAN','ATX','CLR_CMOS','MBIOS','BATTERY','F_PANEL','F_USB1','F_USB3','CD_IN','SPDIF_O','F_AUDIO'])expect(t).toContain(s);
 });
});
