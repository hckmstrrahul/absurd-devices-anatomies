import {describe,it,expect} from 'vitest';
import {start,step,pose,demand,clockOf,powerOf,steadyTemp,assemblies,AMBIENT,R_TH,POWER,CLOCK,LOAD,ROUTES as ROUTE_COUNT,LEDS,type State} from './model';
import {footprints,collide,spots,sow,hit,landOf,IMG,CARD,PX,X,Z,COVER,SOCKET2,SOCKET3,SLOTS,HOSES,ROUTES,LED_AT,CHIPS,ICS,type Box} from './layout';
import {buildPrint,textStrokes,textWidth} from './print';
import {TRACES,VIAS,PULSES} from './routed';

const values={load:60};
const run=(s:State,seconds:number,playing=true,v=values)=>{for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,v);return s};

describe('Verdant layout',()=>{
 it('maps the reference at 0.1 mm per pixel onto a 160.5 × 258.9 mm card',()=>{
  expect(CARD.w).toBeCloseTo(160.5);expect(CARD.d).toBeCloseTo(258.9);
  expect(X(0)).toBeCloseTo(-80.25);expect(Z(IMG.h)).toBeCloseTo(129.45);
  // Hand check: the processor cover is 444 × 526 px, so 44.4 × 52.6 mm, centred 8.25 mm left of the board centre line.
  expect((COVER.b[2]-COVER.b[0])*PX).toBeCloseTo(44.4);expect((COVER.b[3]-COVER.b[1])*PX).toBeCloseTo(52.6);
  expect(X((COVER.b[0]+COVER.b[2])/2)).toBeCloseTo(-8.25);
 });
 it('has an inventory of more than 250 traced parts, every one inside the card',()=>{
  expect(footprints.length).toBeGreaterThan(250);
  expect(new Set(footprints.map(f=>f.id)).size).toBe(footprints.length);
  for(const f of footprints){
   expect(f.b[0],f.id).toBeGreaterThanOrEqual(0);expect(f.b[1],f.id).toBeGreaterThanOrEqual(0);
   expect(f.b[2],f.id).toBeLessThanOrEqual(IMG.w);expect(f.b[3],f.id).toBeLessThanOrEqual(IMG.h);
   expect(f.b[2],f.id).toBeGreaterThan(f.b[0]);expect(f.b[3],f.id).toBeGreaterThan(f.b[1]);expect(f.ht,f.id).toBeGreaterThan(0);
  }
 });
 it('keeps footprints clear of each other unless one is mounted on the other',()=>{
  const ids=new Set(footprints.map(f=>f.id)),clashes:string[]=[];
  for(const f of footprints)if(f.on)expect(ids.has(f.on),`${f.id} on ${f.on}`).toBe(true);
  for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++){
   const a=footprints[i],b=footprints[j];
   if(a.on===b.id||b.on===a.id||(a.on&&a.on===b.on))continue;
   if(collide(a,b))clashes.push(`${a.id}×${b.id}`);
  }
  expect(clashes).toEqual([]);
 });
 it('keeps inner features inside their carriers',()=>{
  const inside=(inner:Box,outer:Box)=>inner[0]>=outer[0]&&inner[1]>=outer[1]&&inner[2]<=outer[2]&&inner[3]<=outer[3];
  expect(inside(COVER.win,COVER.b)).toBe(true);
  for(const [x,y] of COVER.holes)expect(inside([x-COVER.holeR,y-COVER.holeR,x+COVER.holeR,y+COVER.holeR],COVER.b)).toBe(true);
  expect(inside(SOCKET2.chip,SOCKET2.frame)).toBe(true);expect(inside(SOCKET2.inner,SOCKET2.chip)).toBe(true);expect(inside(SOCKET2.pad,SOCKET2.inner)).toBe(true);
  expect(inside(SOCKET3.chip,SOCKET3.frame)).toBe(true);expect(inside(SOCKET3.label,SOCKET3.ring)).toBe(true);expect(inside(SOCKET3.ring,SOCKET3.chip)).toBe(true);
  expect(SLOTS.map(s=>s.lanes).reduce((a,b)=>a+b)).toBe(8);
 });
 it('places traced small parts deterministically, clear of every footprint and inside the card',()=>{
  expect(spots.length).toBeGreaterThan(700);
  expect(sow()).toEqual(spots);
  const bad:string[]=[];
  for(const s of [...spots,...ICS.map(ic=>({x:(ic.b[0]+ic.b[2])/2,y:(ic.b[1]+ic.b[3])/2,w:ic.b[2]-ic.b[0],d:ic.b[3]-ic.b[1],h:1}))]){
   const b:Box=[s.x-s.w/2,s.y-s.d/2,s.x+s.w/2,s.y+s.d/2];
   if(!(b[0]>0&&b[1]>0&&b[2]<IMG.w&&b[3]<IMG.h))bad.push('outside');
   if(!(s.w>0&&s.d>0&&s.h>0&&s.h<3))bad.push('size');
   for(const f of footprints)if(hit(f.b,b))bad.push(f.id);
  }
  expect(bad).toEqual([]);
 });
 it('keeps hoses above the board and pulse routes on it',()=>{
  for(const h of HOSES)for(const [x,y,z] of h.pts){expect(z-h.r,h.id).toBeGreaterThanOrEqual(0);expect(x>=0&&x<=IMG.w&&y>=0&&y<=IMG.h,h.id).toBe(true)}
  expect(ROUTES.length).toBe(ROUTE_COUNT);expect(LED_AT.length).toBe(LEDS);
  for(const r of ROUTES)for(const [x,z] of r){expect(Math.abs(x)).toBeLessThan(CARD.w/2);expect(Math.abs(z)).toBeLessThan(CARD.d/2)}
  expect(CHIPS.filter(c=>c.leads).length).toBeGreaterThanOrEqual(12);
 });
});

describe('Verdant board print',()=>{
 const print=buildPrint();
 it('puts every small part on the 0.2 mm grid with a land under each terminal',()=>{
  for(const s of spots){
   expect(s.x%2,'x').toBe(0);expect(s.y%2,'y').toBe(0);
   const {pc}=landOf(s),ends=s.turn?[[s.x,s.y-pc],[s.x,s.y+pc]]:[[s.x-pc,s.y],[s.x+pc,s.y]];
   for(const [x,y] of ends)expect(print.pads.some(p=>p.x===x&&p.y===y),`land at ${x},${y}`).toBe(true);
  }
 });
 it('keeps lands on the card and letters every authored name',()=>{
  for(const p of print.pads){expect(p.x-p.w/2).toBeGreaterThan(0);expect(p.x+p.w/2).toBeLessThan(IMG.w);expect(p.y-p.h/2).toBeGreaterThan(0);expect(p.y+p.h/2).toBeLessThan(IMG.h);expect(p.w>0&&p.h>0).toBe(true)}
  expect(print.missed).toEqual([]);
  const names=print.names.map(n=>n.t);
  for(const t of ['DIMM_A1','DIMM_B2','CPU_VRM','VERDANT MB-160','PN 60-0417-02  REV 1.07','R12','C47','U3'])expect(names,t).toContain(t);
  // Designators are a letter prefix and a number; nothing else is printed by the numbering.
  expect(names.filter(t=>/^(R|C|L|U|Q|D|J|Y|FB|HS|TP)\d+$/.test(t)).length).toBeGreaterThan(500);
 });
 it('draws lettering from one stroke face with every glyph defined',()=>{
  // Hand check: seven characters 6 px tall advance 5.6 units each less the last gap, (7 × 5.6 − 1.6) × 1 = 37.6 px.
  expect(textWidth('DIMM_A1',6)).toBeCloseTo(37.6);
  for(const n of print.names)for(const ch of n.t)if(ch!==' ')expect(textStrokes(ch,0,0,6).length,`glyph ${ch}`).toBeGreaterThan(0);
 });
 it('routes copper only at 0°, 45° and 90°, on the grid, from a land or via to a land or via',()=>{
  expect(TRACES.length).toBeGreaterThan(2000);
  const vias=new Set<string>();for(let i=0;i<VIAS.length;i+=2)vias.add(VIAS[i]+','+VIAS[i+1]);
  const onLand=(x:number,y:number)=>vias.has(x+','+y)||print.pads.some(p=>p.route&&Math.abs(p.x-x)<=p.w/2+1.01&&Math.abs(p.y-y)<=p.h/2+1.01);
  let bad=0,loose=0;
  for(const t of TRACES){
   expect(t[0]).toBeGreaterThanOrEqual(12);expect(t[0]).toBeLessThanOrEqual(24);expect(t.length).toBeGreaterThanOrEqual(5);
   for(let k=1;k<t.length;k+=2)if(t[k]%2||t[k+1]%2||t[k]<=0||t[k]>=IMG.w||t[k+1]<=0||t[k+1]>=IMG.h)bad++;
   for(let k=3;k<t.length;k+=2){const dx=Math.abs(t[k]-t[k-2]),dy=Math.abs(t[k+1]-t[k-1]);if(!(dx===0||dy===0||dx===dy)||dx+dy===0)bad++}
   if(!onLand(t[1],t[2]))loose++;if(!onLand(t[t.length-2],t[t.length-1]))loose++;
  }
  expect(bad).toBe(0);expect(loose).toBe(0);
 });
 it('gives each pulse a routed trace to run along',()=>{
  expect(PULSES.length).toBe(ROUTE_COUNT);
  for(const p of PULSES){expect(TRACES.some(t=>t.length===p.length+1&&p.every((v,i)=>t[i+1]===v))).toBe(true);expect(p.length).toBeGreaterThanOrEqual(4)}
 });
});

describe('Verdant workload',()=>{
 it('is dark and at ambient before Play',()=>{
  const p=pose(run(start,2,false));
  expect(p.on).toBe(0);expect(p.clock).toBe(0);expect(p.temp).toBe(AMBIENT);expect(p.pulses.every(x=>x===-1)).toBe(true);expect(p.leds.every(x=>x===0)).toBe(true);
 });
 it('derives clock, power and steady temperature from load',()=>{
  // Hand check at full load: 0.8 + 3.4 = 4.2 GHz; 12 + 110 = 122 W; 28 + 122 × 0.32 = 67.04 °C.
  expect(clockOf(1)).toBeCloseTo(4.2);expect(powerOf(1,1)).toBeCloseTo(122);expect(steadyTemp(1)).toBeCloseTo(67.04);
  expect(clockOf(0)).toBe(CLOCK.idle);expect(powerOf(0,1)).toBe(POWER.idle);expect(powerOf(.5,0)).toBe(0);
  expect(steadyTemp(0)).toBeCloseTo(AMBIENT+POWER.idle*R_TH);
 });
 it('breathes between 78% and 100% of the set point and clamps the slider',()=>{
  expect(demand(0,60)).toBeCloseTo(.6);expect(demand(1.6,60)).toBeCloseTo(.6*.78);expect(demand(3.2,60)).toBeCloseTo(.6);
  expect(demand(0,500)).toBe(LOAD.max/100);expect(demand(0,-5)).toBe(LOAD.min/100);
 });
 it('warms toward the steady temperature and never beyond it',()=>{
  const s=run(start,60,true,{load:100}),p=pose(s);
  expect(p.temp).toBeGreaterThan(55);expect(p.temp).toBeLessThanOrEqual(steadyTemp(1));
  expect(p.warm).toBeGreaterThan(.7);expect(p.warm).toBeLessThanOrEqual(1);
  const cooled=pose(run(s,60,false,{load:100}));
  expect(cooled.temp).toBeLessThan(AMBIENT+.1);expect(cooled.on).toBeLessThan(.001);
 });
 it('is deterministic and independent of frame rate to within a few percent',()=>{
  expect(run(start,5)).toEqual(run(start,5));
  let coarse=start;for(let i=0;i<150;i++)coarse=step(coarse,1/30,true,values);
  const fine=run(start,5);
  expect(coarse.t).toBeCloseTo(fine.t);expect(coarse.temp).toBeCloseTo(fine.temp,0);expect(coarse.load).toBeCloseTo(fine.load,1);
 });
 it('keeps every pose value in range while playing',()=>{
  let s=start;
  for(let i=0;i<1200;i++){
   s=step(s,1/60,true,{load:i%400<200?100:10});const p=pose(s);
   expect(p.pulses.length).toBe(ROUTE_COUNT);expect(p.leds.length).toBe(LEDS);
   for(const x of p.pulses)expect(x===-1||(x>=0&&x<1)).toBe(true);
   for(const x of p.leds){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(1)}
   expect(p.flow).toBeGreaterThanOrEqual(0);expect(p.flow).toBeLessThan(1);expect(p.load).toBeLessThanOrEqual(1);expect(p.die).toBeLessThanOrEqual(1);
  }
 });
 it('ignores a zero or oversized time step safely',()=>{
  expect(step(start,0,true,values)).toBe(start);
  expect(step(start,5,true,values).t).toBeCloseTo(.1);
 });
 it('lists seven assemblies with cooling lifted highest and the board at rest',()=>{
  expect(assemblies.length).toBe(7);
  const lifts=assemblies.map(a=>a.move[1]);expect([...lifts].sort((a,b)=>b-a)).toEqual(lifts);
  expect(assemblies[0].id).toBe('cooling');expect(assemblies[6].move).toEqual([0,0,0]);
  for(const a of assemblies)expect(a.note.split(/\s+/).length).toBeLessThanOrEqual(8);
 });
 it('floats the same assemblies in the Layers view: off the face in order, each clear of the one below, slid apart, none past the lower edge',()=>{
  // Tallest part of each assembly above the board, mm (cooling block 14, cover 4.6, can 9, slot 5.4, post 7, jack 10.5).
  const tall:Record<string,number>={cooling:14.4,cpu:4.6,power:9,memory:5.4,logic:7,ports:10.5,board:1.9};
  // How far each assembly's lowest part sits above the board's lower edge, mm (from the layout: slots end at 2563 px, the last can at 2343, the cover at 1585, the blocks at 742).
  const room:Record<string,number>={cooling:180,cpu:100,power:24,memory:2.6,logic:3,ports:0.8};
  const up=assemblies.filter(a=>a.id!=='board');expect(assemblies[6].layer).toBeUndefined();
  up.forEach((a,i)=>{
   const l=a.layer!;expect(l[1]).toBeGreaterThan(0);expect(l[1]).toBeLessThanOrEqual(a.move[1]*.7);expect(Math.abs(l[0])).toBeGreaterThan(Math.abs(l[2])*.7);expect(l[2],a.id).toBeLessThanOrEqual(room[a.id]);
   if(i<up.length-1){const below=up[i+1];expect(l[1],a.id).toBeGreaterThanOrEqual(below.layer![1]+tall[below.id])}
  });
  expect(up[up.length-1].layer![1]).toBeGreaterThan(tall.board);
  // No two planes slide to the same place: every pair of slides differs by at least 8 mm.
  for(let i=0;i<up.length;i++)for(let j=i+1;j<up.length;j++){const a=up[i].layer!,b=up[j].layer!;expect(Math.hypot(a[0]-b[0],a[2]-b[2]),`${up[i].id}/${up[j].id}`).toBeGreaterThanOrEqual(8)}
 });
});
