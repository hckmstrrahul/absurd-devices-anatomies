import {describe,it,expect} from 'vitest';
import {centreDistance,pitchRadius,tipRadius,trainRatio} from '../kit/horology';
import {poseAt,step,spread,stepped,assemblies,timeText,alarmText,rateOf,alarmOf,windOf,start,START,HALF_DAY,RATIO,BEATS_PER_HOUR,BEATS_PER_S,BEAT_HZ,RING_S,STRIKE_HZ,BALANCE_AMP,FORK_AMP,BELL_SHAKE,STOP_AMP,ALARM_DEFAULT,WIND_DEFAULT,type State} from './model';
import {gearing,going,CLICK_AMP} from './gearing';
import {BASE,CLOCHE,CLOCK,Z,BELL,CROWN,HAMMER,LEG,LIFT,ARBOR,WHEELS,DISCS,RODS,PILLARS,BALANCE,BARREL,BRIDGE,STRIKE,STEM,TEETH as T,MODULE as M,glassY,rimPoint,bellPoint,portT,wheel,pitch,tip,tipOf,at,px,type P2} from './layout';

const TURN=Math.PI*2,deg=(r:number)=>r*180/Math.PI;
const state=(t:number,ring=0,run=t-START):State=>({t,ring,run});
const pose=(t:number,ring=0)=>poseAt(state(t,ring));
const gap=(a:P2,b:P2)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

describe('Belljar motion model',()=>{
 it('gets a four-hertz beat from the tooth counts',()=>{
  // 80/10 × 75/10 × 96/8 = 8 × 7.5 × 12 = 720 escape-wheel turns an hour; × 2 × 20 teeth = 28,800 beats.
  expect(RATIO.third).toBe(8);expect(RATIO.fourth).toBe(60);expect(RATIO.escape).toBe(720);
  expect(trainRatio([[T.centre,T.thirdPinion],[T.third,T.fourthPinion],[T.fourth,T.escapePinion]])).toBe(720);
  expect(BEATS_PER_HOUR).toBe(28800);expect(BEATS_PER_S).toBe(8);expect(BEAT_HZ).toBe(4);
  // Motion works 12/36 × 10/40 = 1/12; barrel 12/84 = 1/7 turn an hour.
  expect(RATIO.hour).toBeCloseTo(1/12);expect(RATIO.barrel).toBeCloseTo(1/7);
  // Winding 20/56 of a barrel-arbor turn per crown turn; setting arbor 12/14 of a turn an hour; alarm knob 4 turns per turn of the alarm wheel.
  expect(RATIO.ratchetPerCrown).toBeCloseTo(5/14);expect(RATIO.setArbor).toBeCloseTo(6/7);expect(RATIO.alarmKnob).toBe(4);expect(RATIO.alarmBarrel).toBe(.25);
 });
 it('shows the reference time at the start',()=>{
  const p=pose(START);
  expect(timeText(p)).toBe('10:09:00');expect(deg(p.hour)%360).toBeCloseTo(304.5);expect(deg(p.minute)%360).toBeCloseTo(54);expect(deg(p.second)%360).toBeCloseTo(0,4);
  expect(alarmText(ALARM_DEFAULT)).toBe('10:12');expect(alarmText(5)).toBe('12:05');expect(timeText(pose(0))).toBe('12:00:00');
 });
 it('moves the train one beat at a time',()=>{
  // Whole beats land on true time; between them the train waits after a quick step.
  expect(stepped(START)).toBe(START);expect(stepped(START+1/8)).toBeCloseTo(START+1/8);expect(stepped(START+.11)).toBeCloseTo(START+1/8);
  expect(stepped(START+.01)).toBeGreaterThan(START);expect(stepped(START+.01)).toBeLessThan(START+1/8);
  let last=0;for(let i=0;i<=400;i++){const s=stepped(START+i*.003);expect(s).toBeGreaterThanOrEqual(last);last=s}
 });
 it('turns every arbor by its ratio, through the meshes',()=>{
  const a=gearing(pose(START)),b=gearing(pose(START+10)),c=gearing(pose(START+3600));
  // Ten seconds: centre 1° clockwise, third 8° the other way, fourth 60° clockwise, escape wheel two whole turns.
  expect(deg(b.centre-a.centre)).toBeCloseTo(-1);expect(deg(b.third-a.third)).toBeCloseTo(8);expect(deg(b.fourth-a.fourth)).toBeCloseTo(-60);expect(deg(b.escape-a.escape)).toBeCloseTo(720);
  expect(deg(pose(START+10).second-pose(START).second)).toBeCloseTo(60);
  // Half an escape tooth, 9°, per beat.
  expect(deg(gearing(pose(START+1/8)).escape-a.escape)).toBeCloseTo(9);
  // One hour: barrel 1/7 turn, minute wheel 120°, hour wheel 30° clockwise, setting arbor 6/7 turn; idlers turn by tooth count alone.
  expect(deg(c.barrel-a.barrel)).toBeCloseTo(360/7);expect(deg(c.minuteWheel-a.minuteWheel)).toBeCloseTo(120);expect(deg(c.hourWheel-a.hourWheel)).toBeCloseTo(-30);
  expect(deg(pose(START+3600).hour-pose(START).hour)).toBeCloseTo(30);
  expect(deg(c.setD-a.setD)).toBeCloseTo(-108);expect(deg(c.setC-a.setC)).toBeCloseTo(108);expect(deg(c.setB-a.setB)).toBeCloseTo(-108);expect(deg(c.setA-a.setA)).toBeCloseTo(72);expect(Math.abs(deg(c.setArbor-a.setArbor))).toBeCloseTo(360*6/7);
  // Nothing in the keyless or alarm works moves while the clock just runs.
  for(const id of ['crownWheel','transA','transB','ratchet','alarmWheel','alarmIdlerA','alarmIdlerB','alarmKnob','strike','alarmBarrel'] as const)expect(c[id]).toBeCloseTo(a[id]);
 });
 it('phases each mesh so a tooth meets a gap on the line of centres',()=>{
  // Angle of a gear's nearest tooth to the direction of its partner, as a fraction of its pitch: the driver shows a tooth (0), the driven a gap (½).
  const phase=(theta:number,teeth:number,dir:number)=>{const f=(dir-theta)/(TURN/teeth);return f-Math.floor(f)};
  const check=(driver:number,z1:number,driven:number,z2:number,from:keyof typeof ARBOR,to:keyof typeof ARBOR)=>{
   const dir=Math.atan2(ARBOR[to][1]-ARBOR[from][1],ARBOR[to][0]-ARBOR[from][0]),sum=phase(driver,z1,dir)+phase(driven,z2,dir+Math.PI);
   expect(Math.abs(sum-Math.round(sum)),`${from} ${to}`).toBeCloseTo(.5,6);
  };
  for(const t of [START,START+7.3,START+1234.56]){
   const g=gearing(pose(t));
   check(g.centre,T.centre,g.third,T.thirdPinion,'centre','third');check(g.third,T.third,g.fourth,T.fourthPinion,'third','fourth');check(g.fourth,T.fourth,g.escape,T.escapePinion,'fourth','escape');
   check(g.centre,T.centrePinion,g.barrel,T.barrel,'centre','barrel');check(g.cannon,T.cannon,g.minuteWheel,T.minuteWheel,'centre','minuteWheel');check(g.minuteWheel,T.minutePinion,g.hourWheel,T.hourWheel,'minuteWheel','centre');
   check(g.minuteWheel,T.minuteWheel,g.setD,T.setIdler,'minuteWheel','setD');check(g.setB,T.setIdler,g.setA,T.setIdlerA,'setB','setA');check(g.setA,T.setIdlerA,g.setArbor,T.setPinion,'setA','setArbor');
   check(g.crownWheel,T.crownWheel,g.transA,T.transA,'crownWheel','transA');check(g.transB,T.transB,g.ratchet,T.ratchet,'transB','barrel');
   check(g.alarmIdlerB,T.alarmIdler,g.alarmKnob,T.alarmPinion,'alarmIdlerB','alarmKnob');check(g.strike,T.strikePinion,g.alarmBarrel,T.alarmBarrel,'strike','alarmBarrel');
  }
 });
 it('winds, sets the alarm and tensions the mainspring by the tooth counts',()=>{
  const at=(wind:number,alarm=ALARM_DEFAULT,t=START)=>gearing(poseAt(state(t),1,alarm,wind));
  // One crown turn: crown wheel 20/28, ratchet 20/56 of a turn, in the sense the barrel runs.
  const a=at(3),b=at(4);
  expect(Math.abs(b.crownWheel-a.crownWheel)/TURN).toBeCloseTo(20/28);expect((b.ratchet-a.ratchet)/TURN).toBeCloseTo(20/56);expect((b.mainspring-a.mainspring)/TURN).toBeCloseTo(20/56);
  expect(Math.sign(b.ratchet-a.ratchet)).toBe(Math.sign(at(3,ALARM_DEFAULT,START+3600).barrel-a.barrel));
  // Running an hour lets 1/7 turn of tension go.
  expect((at(3,ALARM_DEFAULT,START+3600).mainspring-a.mainspring)/TURN).toBeCloseTo(-1/7);
  for(let w=0;w<=6;w+=.05){const g=at(w);expect(g.click).toBeGreaterThanOrEqual(0);expect(g.click).toBeLessThan(CLICK_AMP)}
  // Moving the alarm an hour turns the alarm wheel 30° and the knob four times as far.
  const c=at(3,600),d=at(3,660);
  expect(deg(d.alarmWheel-c.alarmWheel)).toBeCloseTo(-30);expect(Math.abs(deg(d.alarmKnob-c.alarmKnob))).toBeCloseTo(120);expect(deg(d.alarmIdlerA-c.alarmIdlerA)).toBeCloseTo(30);
  expect(windOf('x')).toBe(WIND_DEFAULT);expect(windOf(999)).toBe(28);expect(windOf(-1)).toBe(0);
 });
 it('beats four times a second in real time at any rate',()=>{
  expect(pose(START+1/16).balance).toBeCloseTo(BALANCE_AMP);expect(pose(START+3/16).balance).toBeCloseTo(-BALANCE_AMP);expect(pose(START+1/4).balance).toBeCloseTo(0,6);
  for(const rate of [1,60,360]){
   let s:State=start,crossings=0,previous=poseAt(s).balance;const wheel0=gearing(poseAt(s)).escape,hand0=poseAt(s).minute;
   for(let i=0;i<600;i++){
    s=step(s,1/600,true,rate,ALARM_DEFAULT);const p=poseAt(s,rate);
    if(Math.sign(p.balance)!==Math.sign(previous)&&p.balance!==0)crossings++;previous=p.balance||previous;
    expect(Math.abs(p.balance)).toBeLessThanOrEqual(BALANCE_AMP+1e-9);expect(Math.abs(p.fork)).toBeLessThanOrEqual(FORK_AMP+1e-9);
   }
   // One real second: eight beats, 72° of escape wheel, whatever the time-lapse; the hands move `rate` seconds.
   expect(crossings).toBeGreaterThanOrEqual(7);expect(crossings).toBeLessThanOrEqual(8);
   expect(deg(gearing(poseAt(s,rate)).escape-wheel0)).toBeCloseTo(72,3);expect(deg(poseAt(s,rate).minute-hand0)).toBeCloseTo(rate*.1,3);
  }
  // The fork rests on the side the balance last swung to.
  expect(Math.sign(pose(START+.1).fork)).toBe(Math.sign(pose(START+.1).balance));expect(Math.sign(pose(START+.2).fork)).toBe(Math.sign(pose(START+.2).balance));
 });
 it('keeps the escape wheel in mesh with the fourth wheel at 1×',()=>{
  let s:State=start;for(let i=0;i<500;i++)s=step(s,1/60,true,1,ALARM_DEFAULT);
  const p=poseAt(s);expect(p.beatMinute).toBeCloseTo(p.minute,12);expect(gearing(p).escape).toBeCloseTo(going(-p.minute).escape,9);
 });
 it('advances only while playing and ignores long frame gaps',()=>{
  expect(step(start,1/60,false,60,ALARM_DEFAULT)).toBe(start);expect(step(start,-1,true,60,ALARM_DEFAULT)).toBe(start);
  let s:State=start;for(let i=0;i<60;i++)s=step(s,1/60,true,60,ALARM_DEFAULT);
  expect(s.t).toBeCloseTo(START+60);expect(s.run).toBeCloseTo(1);expect(step(start,5,true,1,ALARM_DEFAULT).t).toBeCloseTo(START+.1);
  expect(rateOf('360')).toBe(360);expect(rateOf('nope')).toBe(1);expect(alarmOf(9999)).toBe(719);expect(alarmOf('x')).toBe(ALARM_DEFAULT);
 });
 it('rings for six seconds when the clock reaches the alarm',()=>{
  let s:State=start,frames=0,rang=0;
  // 10:09 to 10:12 at 60× is three seconds.
  while(s.ring===0&&frames<1000){s=step(s,1/60,true,60,ALARM_DEFAULT);frames++}
  expect(frames).toBeGreaterThanOrEqual(180);expect(frames).toBeLessThanOrEqual(182);expect(s.ring).toBe(RING_S);
  let peak=0,shake=0,lifted=0;
  while(s.ring>0&&rang<1000){const p=poseAt(s);expect(p.ringing).toBe(true);peak=Math.max(peak,Math.abs(p.hammer));shake=Math.max(shake,Math.abs(p.bellLeft),Math.abs(p.bellRight));lifted=Math.max(lifted,p.stop);expect(p.level).toBeGreaterThan(0);expect(p.level).toBeLessThanOrEqual(1);s=step(s,1/60,true,60,ALARM_DEFAULT);rang++}
  expect(rang).toBeGreaterThanOrEqual(360);expect(rang).toBeLessThanOrEqual(362);
  expect(peak).toBeGreaterThan(HAMMER.amp*.95);expect(peak).toBeLessThanOrEqual(HAMMER.amp+1e-9);expect(shake).toBeGreaterThan(0);expect(shake).toBeLessThanOrEqual(BELL_SHAKE);expect(lifted).toBeCloseTo(STOP_AMP);
  const idle=poseAt(s);expect(idle.ringing).toBe(false);expect(idle.hammer).toBeCloseTo(0);expect(idle.strikes).toBe(0);expect(idle.bellLeft).toBe(0);expect(idle.stop).toBe(0);
  // Sixteen strikes a second: the right bell first, a quarter cycle in.
  expect(pose(START,RING_S-1).strikes).toBe(2*STRIKE_HZ);expect(pose(START,.0001).strikes).toBe(2*STRIKE_HZ*RING_S);
  expect(pose(START,RING_S-.25/STRIKE_HZ).hammer).toBeCloseTo(HAMMER.amp);expect(pose(START,RING_S-.75/STRIKE_HZ).hammer).toBeCloseTo(-HAMMER.amp);
  // One strike-wheel tooth per hammer cycle; the alarm barrel gives up a quarter turn per turn of the strike wheel.
  const g0=gearing(pose(START,RING_S)),g1=gearing(pose(START,RING_S-12/STRIKE_HZ));
  expect((g1.strike-g0.strike)/TURN).toBeCloseTo(-1);expect((g1.alarmBarrel-g0.alarmBarrel)/TURN).toBeCloseTo(.25);
  // The strike wheel finishes on a whole turn, so nothing jumps when the run ends.
  expect(STRIKE_HZ*RING_S/T.strike%1).toBe(0);
  // The lever is clear of the hammer rod before the first strike lands.
  expect(pose(START,RING_S-.25/STRIKE_HZ).stop).toBeGreaterThan(STOP_AMP*.2);
 });
 it('trips once per twelve hours, even at 360×',()=>{
  let s:State=state(START+200),trips=0;
  for(let i=0;i<HALF_DAY/6+50;i++){const n=step(s,1/60,true,360,ALARM_DEFAULT);if(n.ring>s.ring)trips++;s=n}
  expect(trips).toBe(1);
 });
 it('is deterministic',()=>{for(let i=0;i<100;i++){const s=state(START+i*37.31,i%7,i*.731);expect(poseAt(s,60,5,3)).toEqual(poseAt(s,60,5,3));expect(gearing(poseAt(s,60,5,3))).toEqual(gearing(poseAt(s,60,5,3)))}});
 it('lifts the cloche clear before the clock opens',()=>{
  const cloche=assemblies.find(a=>a.id==='cloche')!,casing=assemblies.find(a=>a.id==='case')!;
  for(let s=0;s<=1.0001;s+=.01){
   const lift=spread(s,cloche.order)*cloche.move[1],forward=spread(s,casing.order)*LIFT.bezel;
   // The bezel has 14 mm to the front glass; before it uses them the cloche must be above the case.
   if(forward>14)expect(lift,`separation ${s}`).toBeGreaterThan(CLOCK.y+CLOCK.flange-BASE.top);
  }
  // Exploded, the layers keep their front-to-back order.
  const dialMove=assemblies.find(a=>a.id==='dial')!.move[2],handsMove=assemblies.find(a=>a.id==='hands')!.move[2];
  const order=[LIFT.back,LIFT.drum,LIFT.frame,LIFT.power,LIFT.winding,LIFT.train,LIFT.bridge,LIFT.escapement,LIFT.front,LIFT.works,LIFT.alarmSet,dialMove,handsMove,LIFT.bezel,LIFT.crystal];
  for(let i=1;i<order.length;i++)expect(order[i]).toBeGreaterThan(order[i-1]+10);
  expect(LIFT.frame+Z.plateBack[0]).toBeGreaterThan(LIFT.drum+Z.drum1);
  for(const a of assemblies){expect(spread(0,a.order)).toBe(0);expect(spread(1,a.order)).toBe(1);expect(a.note.split(' ').length).toBeLessThanOrEqual(8)}
 });
});

describe('Belljar layout',()=>{
 const xy=(id:keyof typeof ARBOR)=>ARBOR[id];
 it('maps the reference image to millimetres',()=>{
  const [x0]=px(753,755),[x1,y]=px(1327,755);
  expect(x1-x0).toBeCloseTo(120);expect(y).toBeCloseTo(CLOCK.y,0);expect(px(1040,1090)).toEqual([0,BASE.top]);
  expect(px(650,1090)[0]).toBeCloseTo(-CLOCHE.a,0);expect(Math.abs(px(1040,430)[1]-(CLOCHE.spring+CLOCHE.rise))).toBeLessThan(1.5);
 });
 it('sizes teeth as the kit does',()=>{
  for(const w of WHEELS){expect(pitch(w.module,w.teeth)).toBeCloseTo(pitchRadius(w.module,w.teeth));expect(tip(w)).toBeCloseTo(tipRadius(w.module,w.teeth));expect(tipOf(w.module,w.teeth)).toBe(tip(w))}
 });
 it('puts every mesh at exactly its centre distance, on one module and one level',()=>{
  const meshes=WHEELS.filter(w=>w.mesh);expect(meshes).toHaveLength(18);
  for(const w of meshes){
   const other=wheel(w.mesh!);
   expect(w.module,w.id).toBe(other.module);
   expect(gap(xy(w.arbor),xy(other.arbor)),w.id).toBeCloseTo(centreDistance(w.module,w.teeth,other.teeth),9);
   expect(Math.min(w.z1,other.z1)-Math.max(w.z0,other.z0),w.id).toBeGreaterThan(.45);
  }
  // The stem's two face-toothed pinions share a module with the wheels they meet, at the wheel's level.
  expect(STEM.windR).toBeCloseTo(pitchRadius(M.winding,T.windPinion));expect(-STEM.windR).toBeCloseTo((wheel('crownWheel').z0+wheel('crownWheel').z1)/2);
  expect(STEM.windY).toBeCloseTo(ARBOR.crownWheel[1]+pitchRadius(M.winding,T.crownWheel));
  expect(STEM.clutchR).toBeCloseTo((wheel('clutchWheel').z0+wheel('clutchWheel').z1)/2);expect(ARBOR.setArbor[0]).toBe(0);expect(ARBOR.crownWheel[0]).toBe(0);
  expect(STEM.clutchY).toBeCloseTo(ARBOR.setArbor[1]+pitchRadius(M.setting,T.clutchWheel));
 });
 it('lets nothing turn through anything else',()=>{
  const solids=[...WHEELS.map(w=>({id:w.id,arbor:w.arbor,r:tip(w),z0:w.z0,z1:w.z1,mesh:w.mesh})),...DISCS.map(d=>({...d,mesh:undefined as string|undefined}))];
  const levels=(a:{z0:number;z1:number},b:{z0:number;z1:number})=>a.z1>b.z0+1e-9&&b.z1>a.z0+1e-9;
  // Wheels and discs on one level stay apart unless they are a meshing pair.
  for(const a of solids)for(const b of solids){
   if(a.id>=b.id||a.arbor===b.arbor||a.mesh===b.id||b.mesh===a.id||!levels(a,b))continue;
   expect(gap(xy(a.arbor),xy(b.arbor))-a.r-b.r,`${a.id} ${b.id}`).toBeGreaterThan(.25);
  }
  // Every arbor, post and pillar misses every wheel and disc it passes.
  for(const rod of RODS)for(const s of solids){
   if(rod.arbor===s.arbor||!levels(rod,s))continue;
   expect(gap(at(rod.arbor),xy(s.arbor))-rod.r-s.r,`${rod.arbor} ${s.id}`).toBeGreaterThan(.15);
  }
  // And every other rod.
  for(const a of RODS)for(const b of RODS){if(a.arbor>=b.arbor||!levels(a,b))continue;expect(gap(at(a.arbor),at(b.arbor))-a.r-b.r,`${a.arbor} ${b.arbor}`).toBeGreaterThan(.3)}
  // The bridge (3 mm arms at its own level) clears the wheels beside it.
  for(const s of solids)if(levels({z0:BRIDGE.z0,z1:BRIDGE.z1},s))throw new Error(`${s.id} is on the bridge level`);
  // The stem pinions stay behind the front plate and in front of the hammer.
  expect(STEM.windR+.4).toBeLessThan(Z.plateFront[0]);expect(-STEM.windR-.5).toBeGreaterThan(HAMMER.z+1.5);
  expect(STEM.clutchY+.9).toBeGreaterThan(ARBOR.setArbor[1]+tip(wheel('clutchWheel')));
  // The hammer rod swings between the stop lever's pivot and the strike wheel without touching either.
  expect(ARBOR.stop[0]-1.5).toBeGreaterThan((ARBOR.stop[1]-ARBOR.hammer[1])*Math.tan(HAMMER.amp)+1);
  expect(gap(ARBOR.hammer,ARBOR.strike)-STRIKE.r).toBeGreaterThan(1.5);
 });
 it('keeps the movement inside the plates and the drum',()=>{
  for(const w of WHEELS){expect(Math.hypot(...xy(w.arbor))+tip(w),w.id).toBeLessThan(CLOCK.plate+1);expect(w.z0,w.id).toBeGreaterThanOrEqual(Z.plateBack[1]);expect(w.z1,w.id).toBeLessThan(Z.dial[0])}
  for(const d of DISCS){expect(Math.hypot(...xy(d.arbor))+d.r,d.id).toBeLessThan(CLOCK.plate-4);expect(d.z0,d.id).toBeGreaterThanOrEqual(Z.plateBack[1]);expect(d.z1,d.id).toBeLessThan(Z.plateFront[0])}
  // Wheels between the plates stay clear of the pillars; wheels in front of the plate stay under the dial.
  for(const w of WHEELS)for(const p of PILLARS)if(w.z0<Z.plateFront[0])expect(gap(xy(w.arbor),p)-tip(w),w.id).toBeGreaterThan(2.3);
  for(const w of WHEELS)if(w.z0>=Z.plateFront[1])expect(Math.hypot(...xy(w.arbor))+tip(w),w.id).toBeLessThan(CLOCK.dial);
  expect(Math.hypot(...xy('balance'))+BALANCE.rim).toBeLessThan(CLOCK.open);expect(BARREL.r).toBeLessThan(tip(wheel('barrelGear')));
  for(const p of [...PILLARS,...BRIDGE.posts])expect(Math.hypot(...p)).toBeLessThan(CLOCK.plate-2);
  for(const p of BRIDGE.posts)expect(Math.hypot(...p)).toBeGreaterThan(24.5+1.2);
  expect(CLOCK.plate).toBeLessThan(CLOCK.drumInner);expect(CLOCK.dial).toBeLessThan(CLOCK.drumInner);expect(CLOCK.sight).toBeLessThan(CLOCK.dial);
  // Setting wheels stay out of the alarm window.
  for(const id of ['setA','setB','setC','setD'] as const){const [x,y]=xy(id),r=tip(wheel(id));expect(x-r>CLOCK.notch.half||y-r>CLOCK.notch.top||y+r<20,id).toBe(true)}
 });
 it('fits the clock under the glass',()=>{
  const inner=(x:number,y:number,z:number)=>glassY(x,z,CLOCHE.wall)-(CLOCK.y+y);
  for(let i=0;i<=180;i++){
   const a=i/180*Math.PI,c=Math.cos(a),s=Math.sin(a);
   expect(inner(CLOCK.bezel*c,CLOCK.bezel*s,Z.bezel),`bezel ${i}`).toBeGreaterThan(2);
   expect(inner(CLOCK.flange*c,CLOCK.flange*s,Z.drum1),`flange ${i}`).toBeGreaterThan(1);
   expect(inner(CLOCK.drum*c,CLOCK.drum*s,Z.back),`back ${i}`).toBeGreaterThan(1.5);
  }
  expect(inner(0,0,Z.crystal)).toBeGreaterThan(20);expect(inner(20,25,Z.keys)).toBeGreaterThan(10);
  expect(CLOCHE.a).toBeLessThan(BASE.w/2);expect(CLOCHE.b).toBeLessThan(BASE.d/2);expect(CLOCHE.wall).toBeGreaterThanOrEqual(4);
 });
 it('rests the bells on the glass',()=>{
  let least=Infinity;
  for(const side of [-1,1])for(let i=0;i<72;i++){const [x,y,z]=rimPoint(side,i/72*TURN);least=Math.min(least,y-glassY(x,z))}
  // Close enough to read as touching, as in the reference, without passing through.
  expect(least).toBeGreaterThan(.15);expect(least).toBeLessThan(1);
  // Traced rim centre (847, 457) and nut top (800, 355): within 4 mm.
  const [rx,ry]=bellPoint(-1,BELL.rimT),[tx,ty]=px(847,457);expect(Math.hypot(rx-tx,ry-ty)).toBeLessThan(4);
  const [nx,ny]=bellPoint(-1,BELL.topT),[ux,uy]=px(800,355);expect(Math.hypot(nx-ux,ny-uy)).toBeLessThan(4);
  expect(portT()).toBeLessThan(BELL.rimT-.5);expect(portT(CLOCHE.wall)).toBeLessThan(portT());
 });
 it('lets the hammer reach each bell and nothing else',()=>{
  const head=(angle:number):[number,number,number]=>[HAMMER.pivot[0]+HAMMER.length*Math.sin(angle),HAMMER.pivot[1]+HAMMER.length*Math.cos(angle),HAMMER.z];
  for(const side of [-1,1]){
   const h=head(side*HAMMER.amp);let nearest=Infinity;
   for(let i=0;i<720;i++){const r=rimPoint(side,i/720*TURN);nearest=Math.min(nearest,Math.hypot(h[0]-r[0],h[1]-r[1],h[2]-r[2]))}
   expect(Math.abs(nearest-HAMMER.head)).toBeLessThan(.3);
  }
  for(let i=-20;i<=20;i++){const h=head(i/20*HAMMER.amp);expect(h[1]-HAMMER.head-glassY(h[0],h[2])).toBeGreaterThan(.3)}
  expect(deg(HAMMER.amp)).toBeGreaterThan(15);expect(deg(HAMMER.amp)).toBeLessThan(25);
  // At rest the head hides behind the crown without touching it.
  const rest=head(0);expect(rest[1]).toBeGreaterThan(CROWN.y0);expect(rest[1]).toBeLessThan(CROWN.y1);expect(-HAMMER.z-HAMMER.head-CROWN.r).toBeGreaterThan(1);
 });
 it('stands the legs on the base',()=>{
  const low=CLOCK.y-LEG.length*Math.cos(LEG.angle)-LEG.foot*Math.sin(LEG.angle);
  expect(low).toBeCloseTo(BASE.top);expect(LEG.length*Math.sin(LEG.angle)+LEG.foot).toBeLessThan(CLOCHE.a-CLOCHE.wall);
  expect(Math.abs(LEG.length*Math.sin(LEG.angle)-Math.abs(px(785,1070)[0]))).toBeLessThan(6);
 });
});
