import {describe,it,expect} from 'vitest';
import {start,step,pose,swell,assemblies,TEMPO,STEPS,FLOW_BEATS,GAUGE_SWEEP,type State} from './model';
import {footprints,half,inside,overlap,at,loom,inventorySize,X,Z,L,PX,MM,CARD,KNOBS,CUPS,BUTTONS,CONICS,RUNS,FLOW,STUDS,RAIL,TOUCH,LCD,TALL,SEGMENTS_D,REST_D,PILLS_J,TICKS_H,ICON_D,LOOM,loomCount,SCREWS,DISC,type Foot} from './layout';
import {spread} from '../kit/util';
import {LEADS,routes,routeClashes,routeTubes,outlineDistance,endPoint,sleeves} from './wiring';
import {printMarks,textBox,boxBlocked,blocked,MIN_TEXT} from './print';

const values={tempo:120};
const run=(s:State,seconds:number,v=values)=>{for(let i=0;i<Math.round(seconds*64);i++)s=step(s,1/64,true,v);return s};

describe('Console layout',()=>{
 it('maps the 1887 × 2589 px image to a 188.7 × 258.9 mm card at 0.1 mm per pixel',()=>{
  expect(CARD.w).toBeCloseTo(188.7,6);expect(CARD.d).toBeCloseTo(258.9,6);expect(MM).toBe(.1);
  expect(X(0)).toBeCloseTo(-94.35,6);expect(Z(PX.h)).toBeCloseTo(129.45,6);expect(L(145)).toBeCloseTo(14.5,6);
  // Knob A at (180, 178) px sits 76.35 mm left of centre and 111.65 mm above it.
  expect(X(KNOBS[0].x)).toBeCloseTo(-76.35,6);expect(Z(KNOBS[0].y)).toBeCloseTo(-111.65,6);
 });
 it('gives every footprint a unique id, a known assembly and a positive height',()=>{
  const ids=footprints.map(f=>f.id);expect(new Set(ids).size).toBe(ids.length);
  const known=new Set(assemblies.map(a=>a.id));
  for(const f of footprints){expect(known.has(f.asm),f.id).toBe(true);expect(f.y1,f.id).toBeGreaterThan(f.y0);expect(f.r!==undefined||(f.w!>0&&f.h!>0),f.id).toBe(true)}
  expect(footprints.length).toBeGreaterThan(140);expect(inventorySize(LEADS.length)).toBe(footprints.length+RUNS.length+LEADS.length+25);
 });
 it('keeps every footprint inside the rounded card',()=>{
  for(const f of footprints){
   const [hx,hy]=half(f);
   const pts=f.r!==undefined?Array.from({length:16},(_,i)=>[f.x+Math.cos(i/16*Math.PI*2)*f.r!,f.y+Math.sin(i/16*Math.PI*2)*f.r!]):[[f.x-hx,f.y-hy],[f.x+hx,f.y-hy],[f.x+hx,f.y+hy],[f.x-hx,f.y+hy]];
   for(const [x,y] of pts)expect(inside(x,y),`${f.id} at ${x.toFixed(0)},${y.toFixed(0)}`).toBe(true);
  }
  // The card's own corner is outside; a point 31 px in along the diagonal is inside (radius 105 px).
  expect(inside(2,2)).toBe(false);expect(inside(31,31)).toBe(true);
 });
 it('lets no two parts occupy the same space',()=>{
  // Two footprints clash when they overlap in plan and in height. A part may stand on its host.
  const clashes:string[]=[];
  footprints.forEach((a,i)=>footprints.slice(i+1).forEach(b=>{
   if(a.on===b.id||b.on===a.id||(a.on&&a.on===b.on&&a.kind==='stud'&&b.kind==='stud'))return;
   if(overlap(a,b)&&a.y0<b.y1-1e-6&&b.y0<a.y1-1e-6)clashes.push(`${a.id} × ${b.id}`);
  }));
  expect(clashes).toEqual([]);
 });
 it('stands hosted parts on top of their hosts, within the host outline',()=>{
  for(const f of footprints.filter(f=>f.on)){const host=at(f.on!);expect(f.y0,f.id).toBeGreaterThanOrEqual(Math.min(host.y1,f.y0));expect(overlap(f,host),f.id).toBe(true)}
  // The canister stem crosses the touch panel margin with clearance above the glass: axis 6.2 − 1.7 = 4.5 mm > 2.6 mm.
  expect(at('canister-stem').y0).toBeCloseTo(4.5,6);expect(at('canister-stem').y0).toBeGreaterThan(TOUCH.h);expect(overlap(at('canister-stem'),at('touch-main'))).toBe(true);
 });
 it('traces the counted groups: 7 knobs, 6 cups, 14 lit caps, 6 valve knobs, 12 studs, 3 displays',()=>{
  expect(KNOBS.length).toBe(7);expect(CUPS.length).toBe(6);expect(BUTTONS.length).toBe(14);expect(CONICS.length).toBe(6);expect(STUDS.length).toBe(12);
  expect(REST_D.length).toBe(SEGMENTS_D);expect(REST_D.filter(Boolean).length).toBe(14);expect(ICON_D.length).toBe(SEGMENTS_D);
  for(const [,y] of STUDS){expect(y).toBeGreaterThan(RAIL.y0);expect(y).toBeLessThan(RAIL.y1)}
  for(const d of [LCD,TALL])for(let i=0;i<2;i++){expect(d.screen[i]).toBeGreaterThan(d.box[i]);expect(d.screen[i+2]).toBeLessThan(d.box[i+2])}
  const {trunk,fan}=loom();expect(trunk.length).toBe(28);expect(fan.length).toBe(11);expect(loomCount).toBe(25);
  // Fan rows are measured, top to bottom, and never closer than a plug is thick (1.7 mm).
  for(let i=1;i<LOOM.fanY.length;i++)expect(LOOM.fanY[i]-LOOM.fanY[i-1]).toBeGreaterThanOrEqual(18);
  // The upper cables bed in the grooves of the lower ones: 0.95 mm rise on 1 mm cables at 1.2 mm pitch.
  for(const x of LOOM.upper)expect(LOOM.lower.some(l=>Math.abs(l+6-x)<1e-9)).toBe(true);expect(Math.hypot(.6,LOOM.rise)).toBeGreaterThan(1);
  for(const id of FLOW)expect(RUNS.find(r=>r.id===id)?.kind).toBe('copper');
 });
 it('keeps every tube on the card',()=>{
  for(const r of RUNS)for(const [x,y] of r.pts)expect(inside(x,y),r.id).toBe(true);
 });
});

describe('Console wiring',()=>{
 it('runs every lead in one piece from one terminal to another',()=>{
  expect(LEADS.length).toBeGreaterThanOrEqual(20);expect(new Set(LEADS.map(l=>l.id)).size).toBe(LEADS.length);
  for(const lead of LEADS){
   expect(lead.r,lead.id).toBeGreaterThanOrEqual(2.5);expect(lead.r,lead.id).toBeLessThanOrEqual(5.5);
   for(const end of [lead.a,lead.b]){
    if('grommet' in end){expect(blocked(end.grommet[0],end.grommet[1],lead.r*2.5,false),`${lead.id} grommet`).toBeNull();continue}
    // A socket sits on its part's outline (or on the face of that part's skirt or tab, `gap` px out).
    expect(Math.abs(outlineDistance(at(end.on),end.p)-(end.gap??0)),`${lead.id} at ${end.on}`).toBeLessThan(1.5);
   }
  }
 });
 it('lays every lead on the deck, clear of the parts and tubes it passes',()=>{
  for(const route of routes()){
   const {lead}=route,n=route.pts.length;
   expect(route.pts[0]).toEqual(endPoint(lead.a));expect(route.pts[n-1][0]).toBeCloseTo(endPoint(lead.b)[0],6);expect(route.pts[n-1][1]).toBeCloseTo(endPoint(lead.b)[1],6);
   expect(routeClashes(route),lead.id).toEqual([]);expect(routeTubes(route),lead.id).toEqual([]);
   route.pts.forEach(([x,y],i)=>{
    expect(inside(x,y),lead.id).toBe(true);
    // Never below the deck, never more than a few millimetres up, and no step between samples.
    expect(route.h[i]-lead.r*MM,lead.id).toBeGreaterThan(0);expect(route.h[i],lead.id).toBeLessThan(4.5);
    if(i)expect(Math.abs(route.h[i]-route.h[i-1]),lead.id).toBeLessThan(.3);
   });
  }
 });
 it('lifts a lead over one laid before it, and sleeves only the black leads',()=>{
  const all=routes(),cell=all.find(r=>r.lead.id==='cell-to-clip')!,probe=all.find(r=>r.lead.id==='probe-b-in')!;
  // These two cross: at the crossing the later lead's centre is at least both radii above the earlier one's.
  let crossed=false;
  cell.pts.forEach((p,i)=>probe.pts.forEach((q,j)=>{if(Math.hypot(p[0]-q[0],p[1]-q[1])<3){crossed=true;expect(cell.h[i]-probe.h[j]).toBeGreaterThanOrEqual((cell.lead.r+probe.lead.r)*MM-1e-6)}}));
  expect(crossed).toBe(true);
  for(const route of all){const list=sleeves(route);expect(list.length===0||route.lead.c==='black',route.lead.id).toBe(true);for(const [s0,s1] of list){expect(s0).toBeGreaterThan(0);expect(s1).toBeLessThan(route.length);expect(s1-s0).toBeLessThan(40)}}
 });
});

describe('Console deck print',()=>{
 const marks=printMarks();
 it('sets every label large enough to read, in real words',()=>{
  const labels=marks.filter(m=>m.k==='text');expect(labels.length).toBeGreaterThan(70);
  for(const m of labels)if(m.k==='text'){expect(m.size,m.s).toBeGreaterThanOrEqual(m.s.length<3?12:MIN_TEXT);expect(m.s,m.s).toMatch(/^[A-Z0-9 .−-]+$|^dB$/);expect(m.rot%90).toBe(0)}
 });
 it('keeps every label, icon and box clear of parts, tubes, leads and the card edge',()=>{
  const hits:string[]=[];
  for(const m of marks){
   const disc=m.on==='disc';
   if(m.k==='text'){const hit=boxBlocked(textBox(m),2,disc);if(hit)hits.push(`"${m.s}" at ${m.x},${m.y} × ${hit}`)}
   if(m.k==='icon'){const hit=boxBlocked({x0:m.x-m.size/2,x1:m.x+m.size/2,y0:m.y-m.size/2,y1:m.y+m.size/2},1,disc);if(hit)hits.push(`${m.name} at ${m.x},${m.y} × ${hit}`)}
  }
  expect(hits).toEqual([]);
 });
 it('keeps labels clear of each other and of every stroke',()=>{
  const boxes=marks.filter(m=>m.k==='text').map(m=>({m,b:textBox(m as never)})),hits:string[]=[];
  boxes.forEach((a,i)=>boxes.slice(i+1).forEach(c=>{if(a.b.x0<c.b.x1+2&&c.b.x0<a.b.x1+2&&a.b.y0<c.b.y1+2&&c.b.y0<a.b.y1+2)hits.push(`${(a.m as {s:string}).s} × ${(c.m as {s:string}).s}`)}));
  const within=(b:{x0:number;y0:number;x1:number;y1:number},x:number,y:number)=>x>b.x0-3&&x<b.x1+3&&y>b.y0-3&&y<b.y1+3;
  for(const {m,b} of boxes)for(const s of marks){
   if(s.k==='line'&&s.c!=='ghost')for(let i=1;i<s.pts.length;i++)for(let t=0;t<=1;t+=.02)if(within(b,s.pts[i-1][0]+(s.pts[i][0]-s.pts[i-1][0])*t,s.pts[i-1][1]+(s.pts[i][1]-s.pts[i-1][1])*t)){hits.push(`${(m as {s:string}).s} × line at ${s.pts[0]}`);break}
   if(s.k==='box'&&!s.fill&&s.c!=='ghost'){const near=(v:number,lo:number,hi:number)=>v>lo-4&&v<hi+4,cut=(near(s.x0,b.x0,b.x1)||near(s.x1,b.x0,b.x1))&&b.y0<s.y1&&b.y1>s.y0||(near(s.y0,b.y0,b.y1)||near(s.y1,b.y0,b.y1))&&b.x0<s.x1&&b.x1>s.x0;if(cut)hits.push(`${(m as {s:string}).s} × box at ${s.x0},${s.y0}`)}
   if((s.k==='circle'&&!s.fill||s.k==='arc')&&s.c!=='ghost')for(let a=0;a<360;a+=1){const on=s.k==='circle'||(a>=s.from&&a<=s.to);if(on&&within(b,s.x+Math.cos(a*Math.PI/180)*s.r,s.y+Math.sin(a*Math.PI/180)*s.r)){hits.push(`${(m as {s:string}).s} × ring at ${s.x},${s.y}`);break}}
  }
  expect(hits).toEqual([]);
 });
 it('stands every fixing screw in open deck',()=>{
  for(const [x,y] of SCREWS)expect(blocked(x,y,12,false),`${x},${y}`).toBeNull();
  expect(DISC.r).toBeGreaterThan(100);
 });
});

describe('Console layers view',()=>{
 const planes=assemblies.filter(a=>a.layer&&a.id!=='rail').sort((a,b)=>a.layer![1]-b.layer![1]);
 it('floats the real assemblies as planes in stack order, each clear of the one beneath',()=>{
  expect(assemblies.find(a=>a.id==='panel')!.layer).toBeUndefined();expect(planes.map(a=>a.id)).toEqual(['wiring','pipework','buttons','displays','knobs']);
  // The tallest part of a plane (counting a part standing on another assembly's part) must fit under the next plane.
  const tallest=(id:string)=>Math.max(...footprints.filter(f=>f.asm===id).map(f=>f.y1));
  expect(planes[0].layer![1]).toBeGreaterThan(8);
  planes.forEach((a,i)=>{
   expect(a.layer![1],a.id).toBeLessThan(a.move[1]*.5);
   if(i)expect(a.layer![1]-planes[i-1].layer![1],`${planes[i-1].id} under ${a.id}`).toBeGreaterThan(tallest(planes[i-1].id));
  });
 });
 it('slides the planes sideways, alternately left and right, and never down past the deck edge',()=>{
  // The Layers view stands the deck upright: x is across the screen, z is down it.
  planes.forEach((a,i)=>{
   const [x,,z]=a.layer!;
   expect(Math.abs(x),a.id).toBeGreaterThanOrEqual(12);expect(Math.abs(x),a.id).toBeLessThan(35);expect(Math.abs(z),a.id).toBeLessThan(Math.abs(x));expect(z,a.id).toBeLessThanOrEqual(0);
   if(i)expect(Math.sign(x)).toBe(-Math.sign(planes[i-1].layer![0]));
   // Slid, every part of the plane is still on or above the deck's lower edge and within 35 mm of its sides.
   for(const f of footprints.filter(f=>f.asm===a.id)){const [hx,hy]=half(f);expect((f.y+hy)*MM+z,f.id).toBeLessThanOrEqual(PX.h*MM);expect((f.x-hx)*MM+x,f.id).toBeGreaterThan(-35);expect((f.x+hx)*MM+x,f.id).toBeLessThan(PX.w*MM+35)}
  });
  // Explosion and layers add, so the order of heights is the same in both and combined.
  for(const k of [0,1])planes.forEach((a,i)=>{if(i)expect(a.move[1]*k+a.layer![1]).toBeGreaterThan(planes[i-1].move[1]*k+planes[i-1].layer![1])});
 });
});

describe('Console motion',()=>{
 it('is at rest until Play, showing the pattern in the image',()=>{
  const p=pose(start,values);
  expect(p.on).toBe(false);expect(p.segments).toEqual(REST_D.map(v=>v===1));expect(p.button).toBe(-1);expect(p.count).toBe(950);expect(p.level).toBe(330);
  expect(step(start,1,false,values)).toBe(start);
 });
 it('counts beats from the tempo: 120 bpm for 2 s is 4 beats',()=>{
  const s=run(start,2);expect(s.beats).toBeCloseTo(4,9);expect(s.seconds).toBeCloseTo(2,9);
  const p=pose(s,values);
  // Knob A turns 1/16 rev per beat: a quarter turn. Knob B runs the other way at 1/24.
  expect(p.knobs[0]).toBeCloseTo(Math.PI/2,9);expect(p.knobs[1]).toBeCloseTo(-Math.PI/3,9);
  expect(p.beat).toBe(4);expect(p.step).toBe(0);expect(p.count).toBe(954);expect(p.button).toBe(8);expect(p.line).toBe(4);
  // Flow swells over 8 beats, so at beat 4 it peaks and the needle is at the top of its sweep.
  expect(p.flow).toBeCloseTo(1,9);expect(p.gauge).toBeCloseTo(GAUGE_SWEEP/2,9);expect(swell(FLOW_BEATS)).toBeCloseTo(0,9);
 });
 it('lights one cap, one pill and one bar at a time, and fills knob D block by block',()=>{
  let s=start;
  for(let i=0;i<400;i++){
   s=step(s,1/50,true,values);const p=pose(s,values);
   expect(p.levels.filter(v=>v>0).length).toBe(1);expect(p.levels[p.button]).toBeGreaterThan(.39);expect(p.levels[p.button]).toBeLessThanOrEqual(1);
   expect(p.pill).toBeGreaterThanOrEqual(0);expect(p.pill).toBeLessThan(PILLS_J);expect(p.tick).toBeLessThan(TICKS_H);expect(p.step).toBeLessThan(STEPS);
   const lit=p.segments.filter(Boolean).length;expect(p.segments.slice(0,lit).every(Boolean)).toBe(true);
   expect(p.lines.filter(v=>v>0).length).toBe(1);expect(p.flow).toBeGreaterThanOrEqual(0);expect(p.flow).toBeLessThanOrEqual(1);
  }
 });
 it('is deterministic and independent of frame rate',()=>{
  const a=run(start,3.5),b=run(start,3.5);expect(pose(a,values)).toEqual(pose(b,values));
  let c=start;for(let i=0;i<350;i++)c=step(c,.01,true,values);
  expect(c.beats).toBeCloseTo(a.beats,6);
 });
 it('clamps the tempo and pauses without losing its place',()=>{
  expect(pose(start,{tempo:999}).bpm).toBe(TEMPO.max);expect(pose(start,{tempo:1}).bpm).toBe(TEMPO.min);expect(pose(start,{}).bpm).toBe(TEMPO.start);
  const s=run(start,1),paused=step(s,5,false,values);
  expect(paused.beats).toBe(s.beats);expect(paused.on).toBe(false);expect(pose(paused,values).knobs).toEqual(pose(s,values).knobs);
 });
 it('explodes as vertical layers in assembly order, knobs highest',()=>{
  const lifts=assemblies.map(a=>a.move[1]);expect([...lifts].sort((x,y)=>y-x)).toEqual(lifts);
  expect(assemblies.map(a=>a.order)).toEqual([0,1,2,3,4,5,6]);expect(spread(1,6,6)).toBeCloseTo(1,9);expect(spread(0,0,6)).toBe(0);
  for(const a of assemblies)expect(a.note.split(/\s+/).length).toBeLessThanOrEqual(8);
 });
});
export type {Foot};
