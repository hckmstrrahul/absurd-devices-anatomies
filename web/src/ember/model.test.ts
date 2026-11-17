import {describe,it,expect} from 'vitest';
import {start,step,pose,target,assemblies,SEEN,SIZE,IDLE,TAU,AMBIENT,SPAN,FLOW_MAX,POWER,type State} from './model';
import {comps,pads,fingerprint} from './pcb';
import {ember} from './device';
import {TRACES,VIAS,LABELS,SILK,FINGERPRINT} from './routed';
import {parts,spots,solids,overlap,inCard,blocked,at,mm,pipeDistance,PIPE,MANIFOLD,CARD,IMG,PX,WINDOW,DIE,BRACKET} from './layout';

const run=(s:State,seconds:number,power=70,playing=true)=>{for(let i=0;i<Math.round(seconds*60);i++)s=step(s,1/60,playing,{power});return s};

describe('Ember model',()=>{
 it('rests softly lit: idle heat, nothing moving, 59.8 °C',()=>{
  const p=pose(start);
  expect(p.core).toBeCloseTo(IDLE);expect(p.chaseOn).toBe(0);expect(p.pipes).toBe(0);expect(p.load).toBe(0);expect(p.litres).toBe(0);
  // 31 + 64 × 0.45 = 59.8
  expect(p.temperature).toBeCloseTo(AMBIENT+SPAN*IDLE);expect(p.temperature).toBeCloseTo(59.8);
  expect(run(start,5,70,false)).toEqual(start);
 });
 it('follows power with a first-order lag: 63% of the way after one time constant',()=>{
  const s=run(start,TAU,100);
  expect(s.heat).toBeCloseTo(IDLE+(1-IDLE)*(1-Math.exp(-1)),2);
  expect(run(start,30,100).heat).toBeCloseTo(1,3);
  const p=pose(run(start,30,100));
  expect(p.temperature).toBeCloseTo(95,1);expect(p.litres).toBeCloseTo(FLOW_MAX,2);expect(p.load).toBeCloseTo(1,3);
 });
 it('clamps the power setting and cools back to idle when stopped',()=>{
  expect(target(true,500)).toBe(1);expect(target(true,0)).toBe(POWER.min/100);expect(target(false,90)).toBe(IDLE);
  const hot=run(start,20,100),cooled=run(hot,30,100,false);
  expect(cooled.heat).toBeCloseTo(IDLE,3);expect(pose(cooled).chaseOn).toBe(0);
 });
 it('is deterministic and independent of frame rate',()=>{
  expect(pose(run(start,7.5))).toEqual(pose(run(start,7.5)));
  let coarse=start;for(let i=0;i<150;i++)coarse=step(coarse,1/20,true,{power:70});
  const fine=run(start,7.5);
  expect(coarse.heat).toBeCloseTo(fine.heat,6);expect(coarse.chase).toBeCloseTo(fine.chase,1);
 });
 it('keeps every level in range and pulses the fittings in sequence',()=>{
  let s=start;const peaks=[0,0,0,0];
  for(let i=0;i<60*12;i++){
   s=step(s,1/60,true,{power:100});const p=pose(s);
   for(const v of [p.core,p.chase,p.flow,p.chaseOn,...p.fittings,...p.dots,...p.leds]){expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1)}
   p.fittings.forEach((v,k)=>{if(v===Math.max(...p.fittings))peaks[k]++});
  }
  for(const n of peaks)expect(n).toBeGreaterThan(60);
 });
 it('gives each assembly its own explosion height',()=>{
  expect(assemblies).toHaveLength(9);
  expect(new Set(assemblies.map(a=>a.move[1])).size).toBe(9);expect(new Set(assemblies.map(a=>a.order)).size).toBe(9);
  // Small parts hang as a sheet between the bare board and the controllers; the board itself stays put.
  const lift=(id:string)=>assemblies.find(a=>a.id===id)!.move[1];
  expect(lift('board')).toBe(0);expect(lift('components')).toBeGreaterThanOrEqual(30);expect(lift('chips')-lift('components')).toBeGreaterThanOrEqual(12);
 });
});

describe('Ember layout',()=>{
 it('maps 0.1 mm per pixel about the image centre',()=>{
  expect(CARD.w).toBeCloseTo(174);expect(CARD.d).toBeCloseTo(258.9);
  expect(mm(870,1294.5)).toEqual([0,0]);expect(mm(0,0)[0]).toBeCloseTo(-87);expect(mm(1740,2589)[1]).toBeCloseTo(129.45);
  // The die: 205 px wide in the image, so 20.5 mm.
  expect(at('die').w).toBeCloseTo(20.5);expect(at('die').d).toBeCloseTo(17.2);
 });
 it('lists every traced part once',()=>{
  expect(parts.length).toBeGreaterThan(150);expect(new Set(parts.map(p=>p.id)).size).toBe(parts.length);
 });
 it('keeps every part inside the rounded card',()=>{
  for(const p of parts){
   const [x0,y0,x1,y1]=p.box;
   expect(x0,p.id).toBeGreaterThanOrEqual(0);expect(y0,p.id).toBeGreaterThanOrEqual(0);expect(x1,p.id).toBeLessThanOrEqual(IMG.w);expect(y1,p.id).toBeLessThanOrEqual(IMG.h);
   if(p.clip)continue;   // the corner block is cut to the card's own corner arc
   if(p.r!==undefined){const cx=(x0+x1)/2,cy=(y0+y1)/2;for(let a=0;a<16;a++)expect(inCard(cx+Math.cos(a/16*Math.PI*2)*p.r/PX,cy+Math.sin(a/16*Math.PI*2)*p.r/PX),p.id).toBe(true)}
   else for(const [x,y] of [[x0,y0],[x1,y0],[x0,y1],[x1,y1]])expect(inCard(x,y),p.id).toBe(true);
  }
  // Pipe centre lines stay on the card; the left one runs off the edge, as in the image.
  for(const [x,y] of [...PIPE.left,...PIPE.right])expect(inCard(x,y)).toBe(true);
 });
 it('has no overlapping footprints among parts that stand on the board',()=>{
  const standing=parts.filter(p=>!p.on),clashes:string[]=[];
  for(let i=0;i<standing.length;i++)for(let j=i+1;j<standing.length;j++)if(overlap(standing[i],standing[j]))clashes.push(standing[i].id+' × '+standing[j].id);
  expect(clashes).toEqual([]);
 });
 it('seats stacked parts inside what they sit on, and leaves frames open over what they hold',()=>{
  for(const p of parts.filter(p=>p.on)){
   const q=at(p.on!);expect(p.box[0],p.id).toBeGreaterThanOrEqual(q.box[0]);expect(p.box[1],p.id).toBeGreaterThanOrEqual(q.box[1]);expect(p.box[2],p.id).toBeLessThanOrEqual(q.box[2]);expect(p.box[3],p.id).toBeLessThanOrEqual(q.box[3]);
   expect(p.y0,p.id).toBeGreaterThanOrEqual(q.y0);
  }
  // The package is seen through the bracket opening and the load plate; the die through the shroud rim.
  const within=(inner:readonly number[],outer:readonly number[])=>inner[0]>=outer[0]&&inner[1]>=outer[1]&&inner[2]<=outer[2]&&inner[3]<=outer[3];
  expect(within(at('ihs').box,at('loadplate').open!)).toBe(true);expect(within(at('ihs').box,BRACKET.open)).toBe(true);
  expect(within(WINDOW,at('rim').open!)).toBe(true);expect(within(DIE,WINDOW)).toBe(true);
  expect(solids(at('bracket'))).toHaveLength(4);
  // The bracket clears the processor it clamps: its underside is above the spreader's top.
  expect(BRACKET.y0).toBeGreaterThan(at('package').y1);expect(at('rim').y1).toBeGreaterThan(at('die').y1);
 });
 it('keeps pipes clear of everything but their own fittings',()=>{
  for(const p of parts.filter(p=>!p.on&&p.asm!=='pipes'&&p.y1>CARD.y1+1.2)){
   const [x0,y0,x1,y1]=p.box;
   for(let u=0;u<=4;u++)for(let v=0;v<=4;v++){
    const x=x0+(x1-x0)*u/4,y=y0+(y1-y0)*v/4;
    if(p.r!==undefined&&Math.hypot(x-(x0+x1)/2,y-(y0+y1)/2)>p.r/PX)continue;
    if(p.open&&x>p.open[0]&&x<p.open[2]&&y>p.open[1]&&y<p.open[3])continue;
    expect(pipeDistance(x,y),p.id).toBeGreaterThan(PIPE.r/PX-2);
   }
  }
  expect(MANIFOLD.every(([x,y])=>inCard(x,y))).toBe(true);
 });
 it('places traced small parts only on clear board, at the traced size',()=>{
  expect(spots.length).toBeGreaterThan(800);
  for(const s of spots){
   const [x0,y0,x1,y1]=s.box;
   expect(blocked((x0+x1)/2,(y0+y1)/2,Math.max(x1-x0,y1-y0)/2)).toBe(false);
   expect(s.w).toBeCloseTo((x1-x0)*PX);expect(s.h).toBeLessThanOrEqual(1.1);
   expect(mm((x0+x1)/2,(y0+y1)/2)[0]).toBeCloseTo(s.x);
  }
 });
});

describe('Ember board, as vectors',()=>{
 it('leaves nothing but the laminate in the board assembly',()=>{
  expect(parts.filter(p=>p.asm==='board')).toEqual([]);
  expect(parts.filter(p=>p.asm==='components').length).toBeGreaterThan(30);
 });
 it('turns the traced blobs into parts that sit on clear board without touching',()=>{
  expect(comps.length).toBeGreaterThan(700);
  for(const q of comps){
   const [x0,y0,x1,y1]=q.box;expect(x1-x0).toBeGreaterThanOrEqual(3);expect(y1-y0).toBeGreaterThanOrEqual(3);
   expect(blocked((x0+x1)/2,(y0+y1)/2,0),q.ref).toBe(false);expect(q.ref).toMatch(/^(R|C|D|U|Y|TP)\d+$/);
  }
  const clash:string[]=[];
  for(let i=0;i<comps.length;i++)for(let j=i+1;j<comps.length;j++){const a=comps[i].box,b=comps[j].box;if(a[0]<b[2]&&b[0]<a[2]&&a[1]<b[3]&&b[1]<a[3])clash.push(comps[i].ref+' × '+comps[j].ref)}
  expect(clash).toEqual([]);
  expect(new Set(comps.map(q=>q.ref)).size).toBe(comps.length);
 });
 it('puts pads under every part: two for a chip part, a row each side for a small chip',()=>{
  const count=new Map<number,number>();for(const p of pads)if(p.grp!==undefined)count.set(p.grp,(count.get(p.grp)??0)+1);
  comps.forEach((q,i)=>{
   const n=count.get(i)??0;
   if(q.kind==='land')expect(n).toBe(1);else if(q.kind==='ic')expect(n).toBe(q.pins*2);else expect(n,q.ref).toBe(2);
   // The pads lie under the part's ends, inside its outline grown by a pad's overhang.
   if(q.kind!=='ic')for(const p of pads.filter(p=>p.grp===i)){expect(p.x).toBeGreaterThan(q.box[0]-1);expect(p.x).toBeLessThan(q.box[2]+1);expect(p.y).toBeGreaterThan(q.box[1]-1);expect(p.y).toBeLessThan(q.box[3]+1)}
  });
  for(const p of pads){expect(p.w).toBeGreaterThan(0);expect(p.h).toBeGreaterThan(0);expect(Number.isFinite(p.x+p.y)).toBe(true)}
 });
 it('is routed from the current board (run `node scripts/devices/trace-ember.mjs --route` if this fails)',()=>{
  expect(FINGERPRINT).toBe(fingerprint);
 });
 it('runs every trace at 0, 45 or 90 degrees, from a pad or via to a pad or via',()=>{
  expect(TRACES.length).toBeGreaterThan(1200);
  const B=32,cols=Math.ceil(IMG.w/B),grid=new Map<number,number[]>();
  pads.forEach((p,i)=>{for(let y=Math.floor((p.y-p.h/2-1)/B);y<=Math.floor((p.y+p.h/2+1)/B);y++)for(let x=Math.floor((p.x-p.w/2-1)/B);x<=Math.floor((p.x+p.w/2+1)/B);x++){const k=y*cols+x;grid.set(k,[...(grid.get(k)??[]),i])}});
  const onPad=(x:number,y:number)=>(grid.get(Math.floor(y/B)*cols+Math.floor(x/B))??[]).some(i=>{const p=pads[i];return Math.abs(x-p.x)<=p.w/2+.8&&Math.abs(y-p.y)<=p.h/2+.8});
  const via=new Set<string>();for(let i=0;i<VIAS.length;i+=3)via.add(VIAS[i]+','+VIAS[i+1]);
  let loose=0;
  for(const t of TRACES){
   expect(t[0]).toBeGreaterThan(.8);
   for(let i=1;i+3<t.length;i+=2){const dx=Math.abs(t[i+2]-t[i]),dy=Math.abs(t[i+3]-t[i+1]);expect(dx<.16||dy<.16||Math.abs(dx-dy)<.16,`${t[i]},${t[i+1]} → ${t[i+2]},${t[i+3]}`).toBe(true);expect(dx+dy).toBeGreaterThan(.5)}
   for(const [x,y] of [[t[1],t[2]],[t[t.length-2],t[t.length-1]]])if(!via.has(x+','+y)&&!onPad(x,y))loose++;
  }
  expect(loose).toBe(0);
 });
 it('keeps vias on the card and off the pads',()=>{
  expect(VIAS.length/3).toBeGreaterThan(800);
  for(let i=0;i<VIAS.length;i+=3){
   const x=VIAS[i],y=VIAS[i+1],r=VIAS[i+2]/2;expect(inCard(x,y,8)).toBe(true);
   // At least 0.1 mm of mask between the via's ring and any pad.
   for(const p of pads)if(Math.hypot(Math.max(0,Math.abs(x-p.x)-p.w/2),Math.max(0,Math.abs(y-p.y)-p.h/2))<r+1)throw new Error(`via at ${x},${y} touches a pad at ${p.x},${p.y}`);
  }
 },30000);
 it('letters the board with real designators and labels only',()=>{
  expect(LABELS.length).toBeGreaterThan(150);expect(SILK.length%4).toBe(0);
  for(const [x,y,size,,text] of LABELS){expect(text).toMatch(/^[A-Z0-9_+\-./ ]+$/);expect(size).toBeGreaterThanOrEqual(4.5);expect(inCard(x,y,8)).toBe(true)}
  for(const want of ['EMBER','CORE','VRM','DDR'])expect(LABELS.some(l=>l[4]===want),want).toBe(true);
 });
});

describe('Ember layers view',()=>{
 it('is one more camera button: a long lens, its own set, contact shading only there',()=>{
  const v=ember.views.find(v=>v.id==='layers')!;
  expect(v.label).toBe('Layers');expect(v.layers).toBe(true);expect(v.lens).toBeLessThanOrEqual(6);expect(v.upright).toBeGreaterThan(SIZE.z/2);expect(v.backdrop).toBeDefined();
  expect(ember.views.filter(v=>v.layers)).toHaveLength(1);expect(ember.frame.ao?.views).toEqual(['layers']);
 });
 it('only rearranges the assemblies: planes at staggered depths, each well under its explosion move',()=>{
  const byRise=[...assemblies].sort((a,b)=>a.layer[1]-b.layer[1]),board=byRise[0];
  expect(board.id).toBe('board');expect(board.layer[1]).toBe(0);expect(board.layer[2]).toBe(0);
  for(let i=1;i<byRise.length;i++){
   const a=byRise[i],gap=a.layer[1]-byRise[i-1].layer[1];
   // 16 mm is the tallest part on the board, so planes 12 mm and more apart do not share space once out.
   expect(gap,a.id).toBeGreaterThanOrEqual(12);expect(gap,a.id).toBeLessThanOrEqual(18);
   expect(a.layer[1],a.id).toBeLessThanOrEqual(a.move[1]*.85);
   // The view stands the board up, so +z is down the screen: nothing slides down.
   expect(a.layer[2],a.id).toBeLessThanOrEqual(0);
  }
  // Same stacking order as the explosion, so combining the two keeps the order.
  expect(byRise.map(a=>a.id)).toEqual([...assemblies].sort((a,b)=>a.move[1]-b.move[1]).map(a=>a.id));
  // As seen in the view (slide plus the drift of coming forward), relative to the board: every plane lands in its own
  // place, still overlapping the board (174 mm wide), and none drops by more than the 14 mm the upright board stands clear of its lower edge parts.
  const seen=assemblies.map(a=>[SEEN.slide*(a.layer[0]-board.layer[0])+SEEN.forward*a.layer[1],a.layer[2]+SEEN.drop*a.layer[1]]);
  for(let i=0;i<seen.length;i++){
   expect(seen[i][0]).toBeGreaterThanOrEqual(0);expect(seen[i][0]).toBeLessThan(70);expect(seen[i][1]).toBeLessThan(14);expect(seen[i][1]).toBeGreaterThan(-10);
   for(let j=i+1;j<seen.length;j++)expect(Math.hypot(seen[i][0]-seen[j][0],seen[i][1]-seen[j][1]),assemblies[i].id+' / '+assemblies[j].id).toBeGreaterThan(7);
  }
 });
});
