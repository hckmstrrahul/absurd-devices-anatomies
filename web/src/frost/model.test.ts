import {describe,expect,it} from 'vitest';
import {start,step,pose,steadyTemp,powerOf,clockOf,packetRate,demand,assemblies,UPRIGHT,AMBIENT,LIMIT,LOAD,LEDS,POWER,R_TH,SIZE,type State} from './model';
import {BOARD,TOP,HOLES,HOLE,bodies,passives,footOf,overlap,grow,ribbonPath,headerPins,HEADER,MODULE,FFC,SINK,SOC,ETH,rect,type Rect} from './layout';
import {buildPrint,IMG,U,V} from './print';
import {TRACES,BOTTOM,VIAS} from './routed';

const run=(seconds:number,load:number,playing=true,from:State=start)=>{let s=from;for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{load});return s};

describe('frost model',()=>{
 it('settles where the thermal arithmetic says',()=>{
  // Hand check: idle draws 1.1 W, full load 1.1 + 5.4 = 6.5 W; 9.5 K/W above 24 °C ambient.
  expect(powerOf(0,1)).toBeCloseTo(1.1,6);expect(powerOf(1,1)).toBeCloseTo(6.5,6);
  expect(steadyTemp(0)).toBeCloseTo(34.45,6);expect(steadyTemp(1)).toBeCloseTo(85.75,6);
  expect(steadyTemp(.5)).toBeCloseTo(AMBIENT+(POWER.idle+POWER.span*.5)*R_TH,6);
 });
 it('warms toward the steady temperature for its load and never past it',()=>{
  const s=run(60,40),p=pose(s);
  // The workload breathes between 75 % and 100 % of the set point.
  expect(p.temp).toBeGreaterThan(steadyTemp(.3)-.5);expect(p.temp).toBeLessThan(steadyTemp(.4)+.1);expect(p.throttle).toBeLessThan(.01);
 });
 it('throttles at full load and holds the die under the hard limit',()=>{
  let s=start,peak=0,throttled=0;for(let i=0;i<60*90;i++){s=step(s,1/60,true,{load:100});peak=Math.max(peak,s.temp);throttled=Math.max(throttled,s.throttle)}
  expect(throttled).toBeGreaterThan(.1);expect(peak).toBeLessThan(LIMIT.hard+.5);expect(peak).toBeGreaterThan(LIMIT.soft-4);
 });
 it('is deterministic and does not advance on a zero step',()=>{
  expect(run(7,60)).toEqual(run(7,60));expect(step(start,0,true,{load:60})).toBe(start);
 });
 it('cools and goes dark when stopped',()=>{
  const p=pose(run(60,60,false,run(20,90)));
  expect(p.on).toBeLessThan(1e-6);expect(p.temp).toBeLessThan(AMBIENT+.1);expect(Math.max(...p.leds)).toBeLessThan(1e-6);expect(p.clock).toBe(0);expect(p.link).toBeLessThan(1e-6);
 });
 it('drives every lamp from the same pose',()=>{
  const p=pose(run(12,100));
  expect(p.leds).toHaveLength(LEDS);for(const v of p.leds){expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1)}
  expect(p.leds[0]).toBeGreaterThan(.99);expect(p.link).toBeGreaterThan(.99);expect(p.rate).toBeGreaterThan(packetRate(.7));
  // The load bar fills from the left.
  for(let i=2;i<5;i++)expect(p.leds[i]).toBeGreaterThanOrEqual(p.leds[i+1]);
 });
 it('picks clock steps and clamps the slider',()=>{
  expect(clockOf(0,0)).toBe(.6);expect(clockOf(.5,0)).toBe(1.4);expect(clockOf(1,0)).toBe(1.8);expect(clockOf(1,1)).toBe(1.4);
  expect(demand(0,500)).toBeCloseTo(LOAD.max/100,6);expect(demand(0,-5)).toBeCloseTo(LOAD.min/100,6);
 });
 it('blinks the activity lamp faster under load',()=>{
  const flips=(load:number)=>{let s=run(5,load),n=0,last=pose(s).act>.5;for(let i=0;i<600;i++){s=step(s,1/120,true,{load});const a=pose(s).act>.5;if(a!==last)n++;last=a}return n};
  expect(flips(100)).toBeGreaterThan(flips(10)*2);
 });
});

describe('frost layout',()=>{
 const hx=BOARD.w/2,hz=BOARD.d/2,list=bodies();
 it('hangs its layers as planes that rise less than they explode and do not share height where they share ground',()=>{
  for(const a of assemblies){const l=a.layer??[0,0,0];if(a.id==='board'){expect(l).toEqual([0,0,0]);continue}expect(l[1]).toBeGreaterThan(0);expect(l[1]).toBeLessThan(Math.hypot(...a.move)*.65)}
  const rise=(id:string)=>assemblies.find(a=>a.id===id)!.layer![1];
  // The tallest small part is a button cap (5.1 mm); packages hang above it, the heat sink above them, and small parts above the ribbon's fold (6.4 mm).
  expect(rise('chips')).toBeGreaterThan(rise('parts')+5.1);expect(rise('heatsink')).toBeGreaterThan(rise('chips')+2);expect(rise('parts')).toBeGreaterThan(rise('flex')+6.4);
  // The ribbon's run under the card sits 2.25 mm below the underside: it may ease off by less than that and no more.
  expect(rise('flex')).toBeLessThan(2.2);
  // Stood upright, the lowest thing is the display's far edge, even with the ribbon fully drawn out by the explosion.
  const flex=assemblies.find(a=>a.id==='flex')!;expect(UPRIGHT-(MODULE.z0+MODULE.d+flex.layer![2]+flex.move[2])).toBeGreaterThan(5);
 });
 it('has seven assemblies and a caption that matches the envelope',()=>{
  expect(assemblies).toHaveLength(7);expect(new Set(list.map(b=>b.asm)).size).toBeGreaterThanOrEqual(5);
  expect(SIZE.x).toBeGreaterThanOrEqual(BOARD.w);expect(SIZE.z).toBeCloseTo(MODULE.z0+MODULE.d+BOARD.d/2,1);expect(SIZE.y).toBeCloseTo(TOP+ETH.h+2.1,0);
 });
 it('keeps every part on the card, edge connectors overhanging by no more than 3 mm',()=>{
  for(const b of list){const m=b.over?3.01:0;expect(b.b[0],b.id).toBeGreaterThanOrEqual(-hx-m);expect(b.b[2],b.id).toBeLessThanOrEqual(hx+m);expect(b.b[1],b.id).toBeGreaterThanOrEqual(-hz-m);expect(b.b[3],b.id).toBeLessThanOrEqual(hz+m)}
 });
 it('lets no two parts share board',()=>{
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)expect(overlap(grow(list[i].b,-.01),list[j].b),`${list[i].id} × ${list[j].id}`).toBe(false);
 });
 it('keeps parts off the mounting rings',()=>{
  for(const [x,z] of HOLES){const ring=rect(x,z,HOLE.ring*2,HOLE.ring*2);for(const b of list)expect(overlap(ring,b.b),b.id).toBe(false)}
 });
 it('places small components clear of parts and of each other',()=>{
  const chips=passives(),feet=chips.map(footOf);expect(chips.length).toBeGreaterThan(150);
  feet.forEach((f,i)=>{
   expect(f[0]).toBeGreaterThan(-hx+1);expect(f[2]).toBeLessThan(hx-1);expect(f[1]).toBeGreaterThan(-hz+1);expect(f[3]).toBeLessThan(hz-1);
   for(const b of list)expect(overlap(f,b.b),`chip ${i} × ${b.id}`).toBe(false);
   for(let j=i+1;j<feet.length;j++)expect(overlap(f,feet[j]),`chip ${i} × chip ${j}`).toBe(false);
  });
 });
 it('puts forty header pins on a 2.54 mm grid',()=>{
  const p=headerPins();expect(p).toHaveLength(40);expect(p[2][0]-p[0][0]).toBeCloseTo(HEADER.pitch,6);expect(p[1][1]-p[0][1]).toBeCloseTo(2.54,6);
 });
 it('threads the ribbon from its connector, round the edge, to the display without cutting the board',()=>{
  const p=ribbonPath(),first=p[0],last=p[p.length-1];
  expect(first[0]).toBeGreaterThan(FFC.z-FFC.d/2);expect(first[0]).toBeLessThan(FFC.z+FFC.d/2);expect(first[1]).toBeGreaterThan(0);expect(first[1]).toBeLessThan(FFC.h);
  expect(last[0]).toBeGreaterThan(MODULE.z0);expect(last[1]).toBeCloseTo(-TOP+MODULE.t,0);
  // Inside the card's outline the ribbon is either above the top face or below the underside.
  for(const [z,y] of p)if(z<hz)expect(y>0||y<-BOARD.t,`z ${z} y ${y}`).toBe(true);
  expect(Math.max(...p.map(q=>q[0]))).toBeGreaterThan(hz+2);
  // It folds over higher than the connector but lower than the heat sink.
  const top=Math.max(...p.map(q=>q[1]));expect(top).toBeGreaterThan(FFC.h+2);expect(top).toBeLessThan(SINK.h+SINK.base+SOC.h);
 });
});

describe('frost print',()=>{
 const print=buildPrint();
 it('has a land under every lead and ball',()=>{
  expect(print.pads.length).toBeGreaterThan(1200);expect(print.pads.filter(p=>p.hole).length).toBeGreaterThanOrEqual(40+2+14+12);
  for(const p of print.pads){expect(p.x).toBeGreaterThan(0);expect(p.x).toBeLessThan(IMG.w);expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(IMG.h)}
  // The processor's lands sit on its 0.8 mm grid.
  const corner=print.pads.find(p=>p.grp==='soc:l'&&p.k===0)!;expect(corner.x).toBeCloseTo(U(SOC.x-8*SOC.pitch),6);expect(corner.y).toBeCloseTo(V(SOC.z-8*SOC.pitch),6);
 });
 it('places its lettering',()=>{
  expect(print.names.map(n=>n.t)).toEqual(expect.arrayContaining(['FROST','GPIO','STATUS','RST','BOOT','1','8']));expect(print.missed.length).toBeLessThan(16);
 });
 it('routes copper only at 0°, 45° and 90°',()=>{
  expect(TRACES.length).toBeGreaterThan(350);expect(BOTTOM.length).toBeGreaterThan(50);expect(VIAS.length/2).toBeGreaterThan(150);
  const lands:Rect[]=print.pads.map(p=>[p.x-p.w/2-.01,p.y-p.h/2-.01,p.x+p.w/2+.01,p.y+p.h/2+.01]);
  for(const t of [...TRACES,...BOTTOM]){
   expect(t.length).toBeGreaterThanOrEqual(5);
   for(let i=1;i+3<t.length;i+=2){
    const dx=Math.abs(t[i+2]-t[i]),dy=Math.abs(t[i+3]-t[i+1]),straight=dx===0||dy===0||Math.abs(dx-dy)<1e-9;
    if(straight)continue;
    // The only other segment allowed is the short jog from a land's true centre to the lattice, hidden under that land.
    expect(Math.hypot(dx,dy)).toBeLessThan(2.3);
    const ends=[[t[i],t[i+1]],[t[i+2],t[i+3]]];expect(lands.some(l=>ends.every(([x,y])=>x>=l[0]-1.5&&x<=l[2]+1.5&&y>=l[1]-1.5&&y<=l[3]+1.5))).toBe(true);
   }
   for(let i=1;i<t.length;i+=2){expect(t[i]).toBeGreaterThan(5);expect(t[i]).toBeLessThan(IMG.w-5);expect(t[i+1]).toBeGreaterThan(5);expect(t[i+1]).toBeLessThan(IMG.h-5)}
  }
 });
});
