import {describe,expect,it} from 'vitest';
import {start,step,pose,steadyVrm,steadyNb,cpuWatts,vrmLoss,assemblies,AMBIENT,VID,DROOP,PS_ON_DELAY,CPU,VRM,NBP,type State} from './model';
import {BOARD,P,toPhoto,fromPx,toPx,CORNERS,COOLER,coolerHoles,HOLES,bodies,passives,footOf,overlap,grow,KEEP,SOCKET,NB,PCIE1,PCI,PCIE16,ATX24,DIMM,DIMMS,BATTERY,IO,EDGE_Z,ECAPS,SOLIDS,TOROIDS,DPAKS,CHIPS,HEADERS,
 type Rect} from './layout';

const run=(seconds:number,load:number,playing=true,from:State=start)=>{let s=from;for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{load});return s};

describe('p5gmx model',()=>{
 it('settles where the thermal arithmetic says',()=>{
  // Hand check: idle 18 W, full 85 W at the socket; an 84 % regulator loses 85 × (1/0.84 − 1) = 16.19 W, × 4.2 K/W = 68 K over 24 °C.
  expect(cpuWatts(0,1)).toBeCloseTo(18,6);expect(cpuWatts(1,1)).toBeCloseTo(85,6);
  expect(vrmLoss(85)).toBeCloseTo(16.190,3);expect(steadyVrm(1)).toBeCloseTo(AMBIENT+16.190*VRM.rth,2);
  expect(steadyNb(0)).toBeCloseTo(AMBIENT+NBP.idle*NBP.rth,6);expect(steadyNb(1)).toBeCloseTo(24+9*6.2,6);
  expect(steadyVrm(.5)).toBeCloseTo(AMBIENT+vrmLoss(CPU.idle+CPU.span*.5)*VRM.rth,6);
 });
 it('powers up in order: standby lamp, then rails after PS_ON, then Vcore',()=>{
  const early=pose(run(.3,50));expect(early.standby).toBeGreaterThan(.9);expect(early.rails).toBeLessThan(1e-6);expect(early.vcore).toBeLessThan(1e-6);
  const later=pose(run(PS_ON_DELAY+2,50));expect(later.rails).toBeGreaterThan(.99);expect(later.vcore).toBeGreaterThan(VID-DROOP-.01);expect(later.vcore).toBeLessThan(VID+1e-6);
 });
 it('warms toward its steady temperatures and never past them',()=>{
  const p=pose(run(90,100));expect(p.vrm).toBeLessThan(steadyVrm(1)+.01);expect(p.vrm).toBeGreaterThan(steadyVrm(.7)-1);expect(p.nb).toBeLessThan(steadyNb(1)+.01);
  expect(p.warmVrm).toBeGreaterThan(.5);expect(p.warmVrm).toBeLessThanOrEqual(1);
 });
 it('droops Vcore with load',()=>{
  const lo=pose(run(20,0)),hi=pose(run(20,100));expect(lo.vcore).toBeGreaterThan(hi.vcore);expect(lo.vcore-hi.vcore).toBeLessThan(DROOP+1e-6);
 });
 it('is deterministic, does not advance on a zero step, and goes dark and cool when stopped',()=>{
  expect(run(7,60)).toEqual(run(7,60));expect(step(start,0,true,{load:60})).toBe(start);
  const p=pose(run(90,60,false,run(20,90)));expect(p.standby).toBeLessThan(1e-6);expect(p.vcore).toBeLessThan(1e-6);expect(p.vrm).toBeLessThan(AMBIENT+.1);expect(p.nb).toBeLessThan(AMBIENT+.1);
 });
 it('lists every assembly once, with layer offsets well under the explosion',()=>{
  const ids=assemblies.map(a=>a.id);expect(new Set(ids).size).toBe(ids.length);
  for(const a of assemblies)if(a.layer){const lift=Math.hypot(...a.layer),move=Math.hypot(...a.move);expect(lift).toBeLessThan(Math.max(move,40)*1.3)}
  for(const a of assemblies)expect(a.note.split(/\s+/).length).toBeLessThanOrEqual(8);
 });
});

describe('p5gmx layout',()=>{
 it('maps the photograph corners onto the 244 × 183 mm board and back',()=>{
  const mm:[number,number][]=[[0,0],[244,0],[244,183],[0,183]];
  CORNERS.forEach(([x,y],i)=>{const [u,v]=fromPx(x,y);expect(u).toBeCloseTo(mm[i][0],4);expect(v).toBeCloseTo(mm[i][1],4)});
  const [x,y]=toPx(100,80),[u,v]=fromPx(x,y);expect(u).toBeCloseTo(100,6);expect(v).toBeCloseTo(80,6);
  expect(P(135,300)[0]).toBeCloseTo(-BOARD.w/2,4);const [px,py]=toPhoto(0,0);expect(px).toBeGreaterThan(780);expect(px).toBeLessThan(830);expect(py).toBeGreaterThan(800);expect(py).toBeLessThan(840);
 });
 it('agrees with standard parts measured off the photograph',()=>{
  // 24-pin header: outer pin centres at photo x 797 and 1063 → 11 × 4.2 = 46.2 mm.
  const a=P(797,1283),b=P(1063,1283);expect(Math.abs(b[0]-a[0])).toBeGreaterThan(46.2*.97);expect(Math.abs(b[0]-a[0])).toBeLessThan(46.2*1.03);
  // Cooler holes: a 72 mm square, traced within 3 mm.
  for(const [i,j] of [[0,1],[2,3]] as [number,number][]){const d=Math.abs(COOLER.traced[j][0]-COOLER.traced[i][0]);expect(d).toBeGreaterThan(69);expect(d).toBeLessThan(75)}
  for(const [i,j] of [[0,2],[1,3]] as [number,number][]){const d=Math.abs(COOLER.traced[j][1]-COOLER.traced[i][1]);expect(d).toBeGreaterThan(69);expect(d).toBeLessThan(75)}
  // The socket sits in the middle of its cooler holes (within 3 mm).
  expect(Math.abs(COOLER.x-SOCKET.x)).toBeLessThan(3);expect(Math.abs(COOLER.z-SOCKET.z)).toBeLessThan(4);
  // Slots and the northbridge read at their standard sizes.
  expect(PCIE1.z1-PCIE1.z0).toBeGreaterThan(23.5);expect(PCIE1.z1-PCIE1.z0).toBeLessThan(26.5);
  expect(PCIE16.z1-PCIE16.z0).toBeGreaterThan(86);expect(PCIE16.z1-PCIE16.z0).toBeLessThan(93);
  expect(PCI.z1-PCI.z0).toBeGreaterThan(83);expect(PCI.z1-PCI.z0).toBeLessThan(93);
  // Expansion slots on the 20.32 mm pitch (PCIe ×1 is one slot from ×16; the PCI connector is offset within its slot).
  expect(PCIE1.x-PCIE16.x).toBeGreaterThan(19);expect(PCIE1.x-PCIE16.x).toBeLessThan(21.5);
  const nb=[P(704,826),P(893,826)];expect(nb[1][0]-nb[0][0]).toBeGreaterThan(32.5);expect(nb[1][0]-nb[0][0]).toBeLessThan(35.5);
  expect(BATTERY.r*2).toBeGreaterThan(22);expect(BATTERY.r*2).toBeLessThan(25);
  expect(ATX24.w).toBeGreaterThan(51);expect(ATX24.w).toBeLessThan(57);
  expect(DIMM.x1-DIMM.x0).toBeGreaterThan(136);expect(DIMM.x1-DIMM.x0).toBeLessThan(146);expect(DIMMS[1].z-DIMMS[0].z).toBeGreaterThan(10);
 });
 it('keeps holes and parts on the board',()=>{
  const inside=(x:number,z:number,m=0)=>Math.abs(x)<=BOARD.w/2-m&&Math.abs(z)<=BOARD.d/2-m;
  for(const [x,z] of [...HOLES,...coolerHoles()])expect(inside(x,z,3)).toBe(true);
  for(const b of bodies()){if(b.over)continue;expect(inside(b.b[0],b.b[1],-.5)&&inside(b.b[2],b.b[3],-.5),b.id).toBe(true)}
  for(const io of IO)expect(io.x-io.w/2>-BOARD.w/2&&io.x+io.w/2<BOARD.w/2).toBe(true);
  expect(IO.every((io,i)=>i===0||IO[i-1].x+IO[i-1].w/2<io.x-io.w/2)).toBe(true);
  expect(EDGE_Z).toBe(-BOARD.d/2);
 });
 it('counts the parts traced from the photograph',()=>{
  expect(ECAPS.length).toBe(24);expect(SOLIDS.length).toBe(7);expect(TOROIDS.length).toBe(3);expect(DPAKS.length).toBe(9);expect(CHIPS.length).toBe(7);expect(HEADERS.length).toBe(11);expect(HOLES.length).toBe(6);
 });
 it('keeps the large parts apart',()=>{
  const big=bodies().filter(b=>!['LBL'].includes(b.id)),clash:string[]=[];
  // Pairs that share space by design: the socket lever runs beside the plate, the heat sink sits on the southbridge it cools.
  const allowed=new Set(['U1|LEVER']);
  for(let i=0;i<big.length;i++)for(let j=i+1;j<big.length;j++){const a=big[i],b=big[j];if(allowed.has(a.id+'|'+b.id))continue;if(overlap(grow(a.b,-.3),grow(b.b,-.3)))clash.push(a.id+'|'+b.id)}
  expect(clash).toEqual([]);
 });
 it('places small parts clear of bodies, holes, lettering and each other',()=>{
  const list=passives();expect(list.length).toBeGreaterThan(400);
  const rects=list.map(footOf),walls:Rect[]=[...bodies().map(b=>b.b),...KEEP];
  for(const r of rects.slice(0,400))for(const w of walls)expect(overlap(r,w)).toBe(false);
  for(let i=0;i<Math.min(rects.length,500);i++)for(let j=i+1;j<Math.min(rects.length,500);j++)expect(overlap(rects[i],rects[j])).toBe(false);
  expect(NB.s).toBe(34);
 });
});
