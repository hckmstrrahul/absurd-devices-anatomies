import {describe,it,expect} from 'vitest';
import {centreDistance,trainRatio,tipRadius,meshed} from '../kit/horology';
import {advance,poseAt,paletteAt,ringColour,ringPhase,rateOf,timeText,tick,spread,assemblies,START,START_CLOCK,REF_PHASE,DAY,BEAT_HZ,BEATS_PER_REV,ESCAPE_TEETH,BALANCE_SWING,LEVER_SWING,REST,LEDS,PALETTES,type Clock} from './model';
import {FRAME,INSIDE,GLASS,RING,DIAL,RECESS,ARBOR,HANDS,PLATE,GLOBE,GAUGE,FLASK,PUMP,STRIP,zones,gap,half,ringPoint,ringLength,ledU,px} from './layout';
import {TRAIN,MOTION,TRANSFER,SECTOR,ARBORS,MESHES,SWEEPS,PILLARS,LINK,ZERO,wheelAngles,sectorPose,sectorOffset,pistonHeight,bearing} from './train';

const TAU=Math.PI*2;
// Smallest signed difference between two angles.
const turnBetween=(a:number,b:number)=>{const d=((a-b)%TAU+TAU*1.5)%TAU-Math.PI;return d};

const same=(a:number[],b:number[])=>a.forEach((v,i)=>expect(v).toBeCloseTo(b[i],9));
const at=(clock:number,run=0,power=0,brightness=.8)=>poseAt({clock,run,power},brightness,'prism');

describe('Lumen motion model',()=>{
 it('starts on the time in the reference image',()=>{
  const p=at(START_CLOCK);
  expect(timeText(p.clock)).toBe('10:10:02');
  expect(p.hour).toBeCloseTo(305.0167,3);      // 36602 / 43200 × 360
  expect(p.minute).toBeCloseTo(60.2,6);        // 602 / 3600 × 360
  expect(p.second).toBeCloseTo(12,6);          // 2 × 6
  expect(p.seconds).toBe(2);
  expect(p.day).toBeCloseTo(152.5083,3);       // 36602 / 86400 × 360
  expect(p.phase).toBeCloseTo(REF_PHASE,9);expect(p.shift).toBeCloseTo(0,9);
 });
 it('turns the hands at clock rates',()=>{
  expect(at(0).hour).toBe(0);expect(at(3*3600).hour).toBeCloseTo(90);expect(at(15*3600).hour).toBeCloseTo(90);
  expect(at(900).minute).toBeCloseTo(90);
  // The seconds hand belongs to the train: it steps 1.5° a beat and ignores how far the hands have been set on.
  expect(at(0,13,1).second).toBeCloseTo(90);expect(at(99999,13,1).second).toBeCloseTo(90);expect(at(0,13.5,1).second).toBeCloseTo(93);expect(at(0,13,1).seconds).toBe(15);
  expect(timeText(3600*7+60*5+59,12)).toBe('07:05:12');
  expect(timeText(0)).toBe('00:00:00');expect(timeText(DAY-1)).toBe('23:59:59');expect(timeText(DAY)).toBe('00:00:00');
 });
 it('carries the colour pattern round the ring once an hour',()=>{
  expect(ringPhase(0)).toBe(0);expect(ringPhase(900)).toBeCloseTo(90);expect(ringPhase(3600+1800)).toBeCloseTo(180);
  // A quarter of an hour later, each colour sits a quarter of the way further round.
  const later=at(START_CLOCK+900);expect(later.shift).toBeCloseTo(.25,9);
  for(const u of [.05,.3,.62,.9])same(ringColour('prism',later.shift,u+.25),ringColour('prism',0,u));
 });
 it('matches the reference colours at rest',()=>{
  const hue=([r,g,b]:number[])=>{const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min||1;const h=max===r?(g-b)/d:max===g?2+(b-r)/d:4+(r-g)/d;return (h*60+360)%360};
  expect(hue(ringColour('prism',0,.93))).toBeGreaterThan(290);                          // magenta, top left
  const cyan=hue(ringColour('prism',0,.2));expect(cyan).toBeGreaterThan(170);expect(cyan).toBeLessThan(200);   // right side, upper
  const orange=hue(ringColour('prism',0,.5));expect(orange).toBeGreaterThan(15);expect(orange).toBeLessThan(40); // bottom centre
  const yellow=hue(ringColour('prism',0,.66));expect(yellow).toBeGreaterThan(45);expect(yellow).toBeLessThan(65); // lower left
 });
 it('keeps every palette in range and continuous round the wrap',()=>{
  for(const {id} of PALETTES)for(let i=0;i<400;i++){
   const a=paletteAt(id,i/400),b=paletteAt(id,(i+1)/400);
   for(let k=0;k<3;k++){expect(a[k]).toBeGreaterThanOrEqual(0);expect(a[k]).toBeLessThanOrEqual(1);expect(Math.abs(a[k]-b[k])).toBeLessThan(.12)}
  }
  same(paletteAt('prism',1.3),paletteAt('prism',.3));same(paletteAt('prism',-.7),paletteAt('prism',.3));
 });
 it('sets the ring level from brightness, power and the seconds pulse',()=>{
  expect(at(0,0,0,.8).level).toBeCloseTo(.4);                 // stopped: 0.8 × REST
  expect(REST).toBe(.5);
  expect(at(0,3,1,.8).level).toBeCloseTo(.8);                 // on the second: 0.8 × (0.5 + 0.5 × 1.0)
  expect(at(0,3.5,1,.8).level).toBeCloseTo(.8*(.5+.5*(.7+.3*Math.exp(-1.5))),9);
  expect(at(0,3.5,1,.8).level).toBeCloseTo(.7068,3);
  expect(at(0,3,1,1).level).toBeCloseTo(1);expect(at(0,3,1,5).level).toBeCloseTo(1);expect(at(0,3,1,-1).level).toBe(0);
  // The gauge needle sweeps 240° across the level range.
  expect(at(0,0,0,0).gauge).toBeCloseTo(-120);expect(at(0,3,1,1).gauge).toBeCloseTo(120);expect(at(0,0,0,.8).gauge).toBeCloseTo(-24);
 });
 it('beats four times a second',()=>{
  expect(BEAT_HZ*3600).toBe(14400);expect(BEATS_PER_REV).toBe(30);expect(ESCAPE_TEETH).toBe(TRAIN.escapeTeeth);
  const turns=(run:number)=>at(0,run,1).escapeTurns-at(0,0,1).escapeTurns;
  expect(turns(7.5)).toBeCloseTo(1,9);                        // 30 beats at 4 Hz
  expect(turns(60)).toBeCloseTo(8,9);
  // The escape wheel rests between beats and moves one thirtieth of a turn at each.
  expect(turns(.25)).toBeCloseTo(1/30,9);expect(turns(.4)).toBeCloseTo(1/30,9);expect(turns(.47)).toBeGreaterThan(1/30);expect(turns(.47)).toBeLessThan(2/30);
  // Balance: through centre on every beat, at full swing halfway between; the fork is across by the time it gets there.
  expect(at(0,.125,1).balance).toBeCloseTo(BALANCE_SWING);expect(at(0,.375,1).balance).toBeCloseTo(-BALANCE_SWING);expect(at(0,.5,1).balance).toBeCloseTo(0);
  expect(at(0,.1,1).lever).toBeCloseTo(LEVER_SWING);expect(at(0,.3,1).lever).toBeCloseTo(-LEVER_SWING);expect(at(0,.55,1).lever).toBeCloseTo(LEVER_SWING);
  for(let i=0;i<200;i++)expect(Math.abs(at(0,i*.013,1).lever)).toBeLessThanOrEqual(LEVER_SWING+1e-9);
  // The bellows crank turns once a second and is at the top of its stroke on the second.
  expect(at(0,3,1).puff).toBeCloseTo(1);expect(at(0,3.5,1).puff).toBeCloseTo(0);expect(at(0,2.25,1).crank).toBeCloseTo(4.5*Math.PI);
 });
 it('keeps every glow under the emissive limit',()=>{
  for(let i=0;i<500;i++){
   const p=at(i*171.3,i*.0173,(i%11)/10,1);
   for(const v of [p.tube,p.flask,p.beatLamp]){expect(v).toBeGreaterThan(0);expect(v).toBeLessThanOrEqual(2.5)}
   expect(p.level).toBeGreaterThanOrEqual(0);expect(p.level).toBeLessThanOrEqual(1);expect(p.pulse).toBeLessThanOrEqual(1);
  }
 });
 it('advances both clocks only while playing',()=>{
  let s:Clock=START;
  for(let i=0;i<60;i++)s=advance(s,1/60,true,600);
  expect(s.clock).toBeCloseTo(START_CLOCK+600,6);expect(s.run).toBeCloseTo(1,9);expect(s.power).toBeGreaterThan(.9);
  const stopped=advance(s,1/60,false,600);expect(stopped.clock).toBe(s.clock);expect(stopped.run).toBe(s.run);expect(stopped.power).toBeLessThan(s.power);
  let rest=s;for(let i=0;i<300;i++)rest=advance(rest,1/60,false,1);expect(rest.power).toBeLessThan(.001);
  // Long frame gaps are clamped to 0.1 s, time never runs backward, and the day wraps.
  expect(advance(START,5,true,1).run).toBeCloseTo(.1);expect(advance(START,-1,true,1)).toEqual(START);
  expect(advance({clock:DAY-.05,run:0,power:1},.1,true,1).clock).toBeCloseTo(.05,6);
  expect(rateOf('60')).toBe(60);expect(rateOf('600')).toBe(600);expect(rateOf('nonsense')).toBe(1);expect(rateOf(undefined)).toBe(1);
 });
 it('is deterministic',()=>{
  const s={clock:4711.3,run:12.34,power:.6};expect(poseAt(s,.7,'ember')).toEqual(poseAt({...s},.7,'ember'));
  expect(tick(3,.3)).toBe(3);expect(tick(3.5,.3)).toBe(3);expect(tick(3.85,.3)).toBeCloseTo(3.5);expect(tick(3.999999,.3)).toBeCloseTo(4);
 });
 it('staggers separation without losing the end states',()=>{
  for(const a of assemblies){
   expect(spread(0,a.order)).toBe(0);expect(spread(1,a.order)).toBe(1);
   let last=0;for(let s=0;s<=1.0001;s+=.05){const v=spread(s,a.order);expect(v).toBeGreaterThanOrEqual(last);last=v}
  }
  // The stack opens front to back: glass, ring, dial ahead of the frame.
  const z=(id:string)=>assemblies.find(a=>a.id===id)!.move[2];
  expect(z('glass')).toBeGreaterThan(z('ring'));expect(z('ring')).toBeGreaterThan(z('dial'));expect(z('dial')).toBeGreaterThan(z('left'));expect(z('right')).toBeGreaterThan(z('board'));expect(z('board')).toBeGreaterThan(z('frame'));
 });
});

describe('Lumen layout',()=>{
 it('maps the reference pixels to millimetres',()=>{
  expect(px(462,343)).toEqual([-120,175.9]);expect(px(1540,1070)).toEqual([120,14.1]);   // frame corners, within a millimetre of 177 and 13
  const [x,y]=px(1003,672);expect(x).toBeCloseTo(ARBOR.x,0);expect(y).toBeCloseTo(ARBOR.y,0);
  const [gx,gy]=px(632,855);expect(gx).toBeCloseTo(GLOBE.x,0);expect(gy).toBeCloseTo(GLOBE.y,0);
 });
 it('keeps every placed group inside the frame, between the panes',()=>{
  for(const z of zones){
   const [hx,hy,hz]=half(z);
   expect(Math.abs(z.x)+hx,z.id).toBeLessThanOrEqual(INSIDE.x);
   expect(z.y-hy,z.id).toBeGreaterThanOrEqual(INSIDE.y0);expect(z.y+hy,z.id).toBeLessThanOrEqual(INSIDE.y1);
   expect(z.z-hz,z.id).toBeGreaterThanOrEqual(INSIDE.z0);expect(z.z+hz,z.id).toBeLessThanOrEqual(INSIDE.z1);
  }
  expect(INSIDE.z1).toBeLessThanOrEqual(GLASS.z0);expect(INSIDE.x).toBe(FRAME.w/2-1-FRAME.wall);
 });
 it('keeps the assemblies clear of each other',()=>{
  for(const a of zones)for(const b of zones)if(a.asm<b.asm)expect(gap(a,b),`${a.id} / ${b.id}`).toBeGreaterThanOrEqual(0);
  expect(new Set(zones.map(z=>z.id)).size).toBe(zones.length);
  for(const a of assemblies.filter(a=>!['frame','glass','ring'].includes(a.id)))expect(zones.some(z=>z.asm===a.id),a.id).toBe(true);
 });
 it('fits the ring inside the bezel opening, clear of what sits behind it',()=>{
  const opening={w:FRAME.w-FRAME.face*2,h:FRAME.h-FRAME.face*2};
  expect(GLASS.w).toBeLessThan(opening.w);expect(GLASS.h).toBeLessThan(opening.h);
  expect(RING.w+RING.led.across).toBeLessThan(opening.w);expect(RING.h+RING.led.across).toBeLessThan(opening.h);   // emitters show through the opening
  expect(RING.w+RING.width).toBeLessThan(FRAME.w-2-FRAME.wall*2);                                                // carrier fits inside the band
  expect(RING.z1+RING.led.deep).toBeLessThan(GLASS.z0-.7);                                                       // emitters sit behind the gasket
  // Anything deep enough to reach the ring's plane stays inside the ring's inner edge.
  for(const z of zones.filter(z=>z.z+half(z)[2]>RING.z0)){
   const [hx,hy]=half(z);
   expect(Math.abs(z.x)+hx,z.id).toBeLessThanOrEqual(RING.w/2-RING.width/2);expect(Math.abs(z.y-FRAME.cy)+hy,z.id).toBeLessThanOrEqual(RING.h/2-RING.width/2);
  }
 });
 it('spaces the emitters evenly round a closed path',()=>{
  expect(ringLength()).toBeCloseTo(2*(RING.w+RING.h)-8*RING.r+2*Math.PI*RING.r,9);
  const pitch=ringLength()*(ledU(1,LEDS)-ledU(0,LEDS));expect(pitch).toBeGreaterThan(RING.led.along+.8);
  for(let i=0;i<LEDS;i++){
   const u=ledU(i,LEDS),p=ringPoint(u),q=ringPoint(u+1e-4);
   expect(Math.hypot(p.nx,p.ny)).toBeCloseTo(1,9);expect(Math.abs(p.x)).toBeLessThanOrEqual(RING.w/2+1e-9);expect(Math.abs(p.y)).toBeLessThanOrEqual(RING.h/2+1e-9);
   expect(Math.hypot(q.x-p.x,q.y-p.y)).toBeCloseTo(ringLength()*1e-4,6);                 // no jumps between segments
  }
  const a=ringPoint(0),b=ringPoint(1-1e-9);expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeLessThan(1e-5);
  expect(ringPoint(.25).x).toBeCloseTo(RING.w/2);expect(ringPoint(.5).y).toBeCloseTo(-RING.h/2);expect(ringPoint(.75).x).toBeCloseTo(-RING.w/2);
  // The connector gap at top centre is wider than the connector.
  expect(ringPoint(ledU(0,LEDS)).x-RING.led.along/2).toBeGreaterThan(3.2);
 });
 it('lets the hands sweep inside the dial',()=>{
  const reach=Math.max(HANDS.hour,HANDS.minute,HANDS.second);
  expect(ARBOR.x+reach).toBeLessThanOrEqual(DIAL.x+DIAL.w/2);expect(ARBOR.x-reach).toBeGreaterThanOrEqual(DIAL.x-DIAL.w/2);
  expect(ARBOR.y+reach).toBeLessThanOrEqual(DIAL.y+DIAL.h/2);expect(ARBOR.y-reach).toBeGreaterThanOrEqual(DIAL.y-DIAL.h/2);
  expect(Math.hypot((ARBOR.x-RECESS.x)/RECESS.rx,(ARBOR.y-RECESS.y)/RECESS.ry)).toBeLessThan(1);
  expect(STRIP.y1).toBeLessThan(DIAL.y-DIAL.h/2);
 });
});

describe('Lumen wheel work',()=>{
 const T=TRAIN,dist=(a:keyof typeof ARBORS,b:keyof typeof ARBORS)=>Math.hypot(ARBORS[a].x-ARBORS[b].x,ARBORS[a].y-ARBORS[b].y);
 it('has the tooth counts for a 14,400 beat train',()=>{
  // Escape turns per barrel turn: 72/12 × 64/8 × 60/8 × 64/8 = 6 × 8 × 7.5 × 8 = 2880.
  expect(trainRatio([[T.barrel,T.centrePinion],[T.centre,T.thirdPinion],[T.third,T.fourthPinion],[T.fourth,T.escapePinion]])).toBe(2880);
  // Centre arbor once an hour: 64/8 × 60/8 × 64/8 = 480 escape turns, each 15 teeth × 2 beats.
  const perHour=trainRatio([[T.centre,T.thirdPinion],[T.third,T.fourthPinion],[T.fourth,T.escapePinion]]);
  expect(perHour).toBe(480);expect(perHour*T.escapeTeeth*2).toBe(14400);
  // Fourth arbor once a minute, barrel once in six hours.
  expect(trainRatio([[T.centre,T.thirdPinion],[T.third,T.fourthPinion]])).toBe(60);expect(T.barrel/T.centrePinion).toBe(6);
  // Motion works: 30/10 × 32/8 = 12, and both pairs share one centre distance so the hour wheel is coaxial.
  expect(MOTION.minuteWheel/MOTION.cannon*MOTION.hourWheel/MOTION.minutePinion).toBe(12);
  expect(MOTION.cannon+MOTION.minuteWheel).toBe(MOTION.minutePinion+MOTION.hourWheel);
  expect(SECTOR.wheel/SECTOR.pinion).toBe(6);
 });
 it('sets every meshing pair exactly its centre distance apart',()=>{
  for(const [a,za,b,zb,module] of MESHES)expect(dist(a,b),`${a} ${za} / ${b} ${zb}`).toBeCloseTo(centreDistance(module,za,zb),9);
  expect(MESHES).toHaveLength(10);
  expect(dist('barrel','centre')).toBeCloseTo(13.44,9);        // 0.32 × (72 + 12) / 2
  expect(dist('centre','minuteIdler')).toBeCloseTo(42,9);      // 0.5 × (48 + 120) / 2
  expect(dist('hands','minuteWheel')).toBeCloseTo(12,9);       // 0.6 × (10 + 30) / 2
  const s=sectorOffset();expect(Math.hypot(s.x,s.y)).toBeCloseTo(centreDistance(SECTOR.module,SECTOR.pinion,SECTOR.wheel),9);
  expect(ARBORS.hands).toEqual({x:ARBOR.x,y:ARBOR.y});
 });
 it('keeps every arbor and pillar clear of the wheels that pass it',()=>{
  const going=['barrel','centre','third','fourth','escape','pallet','balance'] as const;
  for(const [owner,radius] of SWEEPS){
   // A wheel may only reach the next arbor's pinion; every other arbor and every pillar stands outside its tips.
   for(const other of going)if(other!==owner)expect(dist(owner,other),`${owner} wheel / ${other} arbor`).toBeGreaterThan(owner==='escape'?radius+.4:radius-.01);
   for(const [name,p] of Object.entries(PILLARS))expect(Math.hypot(p.x-ARBORS[owner].x,p.y-ARBORS[owner].y),`${owner} wheel / ${name} pillar`).toBeGreaterThan(radius+1);
  }
  for(const [a,za,b,,module] of MESHES.slice(0,4))expect(dist(a,b)).toBeGreaterThan(tipRadius(module,za));
  // Transfer wheels behind the plate clear the neighbouring arbor that also runs back there, and the idlers clear the hand arbor.
  expect(dist('centre','fourth')).toBeGreaterThan(tipRadius(TRANSFER.module,TRANSFER.wheel));
  const idler=tipRadius(TRANSFER.module,TRANSFER.idler);
  expect(dist('minuteIdler','hands')).toBeGreaterThan(idler);expect(dist('secondsIdler','hands')).toBeGreaterThan(idler);
  expect(dist('minuteIdler','fourth')).toBeGreaterThan(idler);expect(dist('secondsIdler','centre')).toBeGreaterThan(idler);
  // Everything on the plate lies inside its outline; pillars and the balance rim stay inside too.
  for(const p of [...going.map(k=>ARBORS[k]),...Object.values(PILLARS)]){expect(p.x).toBeGreaterThan(PLATE.x0+1);expect(p.x).toBeLessThan(PLATE.x1-1);expect(p.y).toBeGreaterThan(PLATE.y0+1);expect(p.y).toBeLessThan(PLATE.y1-1)}
  for(const [owner,radius] of SWEEPS){expect(ARBORS[owner].x-radius).toBeGreaterThan(PLATE.x0);expect(ARBORS[owner].x+radius).toBeLessThan(PLATE.x1);expect(ARBORS[owner].y-radius).toBeGreaterThan(PLATE.y0)}
  expect(dist('pallet','balance')).toBeGreaterThan(7.7);       // the fork's pivot stands outside the screwed rim
  // The idlers behind the dial stay inside the case and clear the globe and the gauge globe's stand.
  for(const k of ['minuteIdler','secondsIdler'] as const){
   const p=ARBORS[k];expect(p.y-idler).toBeGreaterThan(INSIDE.y0+12);expect(p.y+idler).toBeLessThan(INSIDE.y1);expect(p.x+idler).toBeLessThan(0);
   const reach=Math.sqrt(GLOBE.r**2-8**2);expect(Math.hypot(p.x-GLOBE.x,p.y-GLOBE.y)).toBeGreaterThan(idler+reach);
  }
 });
 it('turns every wheel in its ratio and carries the hands',()=>{
  const a=wheelAngles(0,0),b=wheelAngles(1,0),step=(k:keyof typeof a)=>(b[k]-a[k])/TAU;
  // One anticlockwise turn of the escape wheel.
  expect(step('escape')).toBe(1);expect(step('fourth')).toBeCloseTo(-1/8,12);expect(step('third')).toBeCloseTo(1/60,12);
  expect(step('centre')).toBeCloseTo(-1/480,12);expect(step('barrel')).toBeCloseTo(1/2880,12);
  // Both transfers are 1:1 and keep the sense of the arbor they copy.
  expect(step('minuteDrive')).toBeCloseTo(step('centre'),12);expect(step('seconds')).toBeCloseTo(step('fourth'),12);
  expect(step('minuteIdler')).toBeCloseTo(1/480*48/120,12);
  // An hour of running: the drive wheel under the cannon pinion turns once clockwise, as the minute hand does, so nothing slips at 1×.
  const hour=at(0,3600,1).escapeTurns-at(0,0,1).escapeTurns;expect(hour).toBeCloseTo(480,9);
  expect((wheelAngles(hour,0).minuteDrive-a.minuteDrive)/TAU).toBeCloseTo(-1,9);
  // Motion works: the hour wheel turns one twelfth as far as the cannon pinion, the same way.
  const c=wheelAngles(0,360);expect((c.cannon-a.cannon)/TAU).toBe(-1);expect((c.minuteWheel-a.minuteWheel)/TAU).toBeCloseTo(1/3,12);expect((c.hourWheel-a.hourWheel)/TAU).toBeCloseTo(-1/12,12);
  // So the hands, pressed on at 12, show the model's time.
  for(const clock of [0,START_CLOCK,5*3600+1234,23*3600+59*60]){
   const p=at(clock,77.25,1),w=wheelAngles(p.escapeTurns,clock/10);
   expect(turnBetween(w.hourWheel-ZERO.hourWheel,-p.hour*Math.PI/180)).toBeCloseTo(0,6);
   expect(turnBetween(w.cannon,-p.minute*Math.PI/180)).toBeCloseTo(0,6);
   expect(turnBetween(w.seconds-ZERO.seconds,-p.second*Math.PI/180)).toBeCloseTo(0,6);
  }
 });
 it('phases each pair so a tooth sits in a gap on the line of centres',()=>{
  // On the line of centres the driver shows a tooth where the driven wheel shows a space, whatever the driver's angle.
  const check=(theta:number,z1:number,z2:number,phi:number)=>{
   const driven=meshed(theta,z1,z2,phi),toothPhase=(angle:number,z:number)=>((angle*z/TAU)%1+1)%1;
   const driver=toothPhase(phi-theta,z1),follower=toothPhase(phi+Math.PI-driven,z2);
   expect(Math.abs(((driver+follower)%1+1)%1-.5)).toBeLessThan(1e-6);
  };
  for(const theta of [0,.37,2.9,-11.2])for(const [a,za,b,zb] of MESHES)check(theta,za,zb,bearing(ARBORS[a],ARBORS[b]));
 });
 it('links the gauge and the pump without stretching a rod',()=>{
  for(let deg=-120;deg<=120;deg+=15){
   const s=sectorPose(-deg*Math.PI/180);
   expect(Math.hypot(s.pin.x,s.pin.y)).toBeCloseTo(LINK.pin,9);expect(Math.hypot(s.pin.x+LINK.pin,s.pin.y-s.plunger)).toBeCloseTo(LINK.rod,9);
   expect(Math.abs(s.turn-sectorPose(0).turn)).toBeLessThanOrEqual(20.001*Math.PI/180);          // 120° ÷ 6
  }
  expect(sectorPose(0).pin.x).toBeCloseTo(-LINK.pin,9);expect(sectorPose(0).plunger).toBeCloseTo(LINK.rod,9);
  // Plunger travel: 4 × sin 20° either side of mid-scale, 1.37 mm.
  expect(sectorPose(-120*Math.PI/180).pin.y-sectorPose(0).pin.y).toBeCloseTo(-4*Math.sin(20*Math.PI/180),6);
  // Slider-crank: 2 mm crank on an 8 mm rod, so the pin rides between 6 and 10 mm above the crank, and the rod keeps its length.
  expect(pistonHeight(0,PUMP.crank,PUMP.rod)).toBe(10);expect(pistonHeight(Math.PI,PUMP.crank,PUMP.rod)).toBe(6);
  for(let i=0;i<24;i++){const t=i*Math.PI/12,h=pistonHeight(t,PUMP.crank,PUMP.rod);expect(Math.hypot(Math.sin(t)*PUMP.crank,h-Math.cos(t)*PUMP.crank)).toBeCloseTo(PUMP.rod,9)}
  // The bellows never closes completely or opens past its pleats, and the crank clears the flask below it.
  expect(PUMP.top-(PUMP.y+10+1.45)).toBeGreaterThan(4);expect(PUMP.top-(PUMP.y+6+1.45)).toBeLessThan(10);
  expect(Math.hypot(PUMP.x-FLASK.x,PUMP.y-FLASK.y)).toBeGreaterThan(FLASK.r+3.6);
  expect(GAUGE.r).toBeLessThan(centreDistance(SECTOR.module,SECTOR.pinion,SECTOR.wheel));
 });
});
