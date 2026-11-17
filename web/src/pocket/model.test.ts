import {describe,it,expect} from 'vitest';
import {start,step,pose,control,advance,newGame,placeFood,plan,tickRate,assemblies,GRID,CELL,SEED,RESTART_TICKS,TRAVEL,DPAD_TILT,DPAD_REACH,MANUAL_HOLD,BUTTONS,type State,type Game} from './model';
import {footprints,half,outline,inside,spots,at,PCB,SHELL,SCREEN,DPAD,BTN,BAY,MENU,SCREWS,SMD,px} from './layout';
import {spread} from '../kit/util';

const values={speed:8,palette:'cyan'};
const run=(s:State,seconds:number,v=values)=>{for(let i=0;i<Math.round(seconds*64);i++)s=step(s,1/64,true,v);return s};
const xy=(cell:number)=>[cell%GRID.w,Math.floor(cell/GRID.w)];

describe('Pocket game',()=>{
 it('starts with a three-cell snake heading right from the centre',()=>{
  const g=newGame(SEED);
  expect(g.snake.map(xy)).toEqual([[10,6],[9,6],[8,6]]);expect(g.dir).toBe(1);expect(g.snake).not.toContain(g.food);
 });
 it('moves one cell per tick: 8 ticks in one second at 8 Hz, then hits the wall on the tenth',()=>{
  // Keyboard steering with no key pressed: the snake runs straight from x = 10.
  let s=run({...start,manual:Infinity},1);
  expect(s.game.ticks).toBe(8);expect(xy(s.game.snake[0])).toEqual([18,6]);expect(s.game.dead).toBe(0);
  s=run(s,.25);
  expect(s.game.ticks).toBe(10);expect(xy(s.game.snake[0])).toEqual([19,6]);expect(s.game.dead).toBe(RESTART_TICKS);
  // The game-over screen lasts RESTART_TICKS ticks, then a new game begins.
  s=run(s,RESTART_TICKS/8);
  expect(s.game.dead).toBe(0);expect(s.game.ticks).toBe(0);expect(s.games).toBe(1);
 });
 it('derives rate and speed from the slider and the A and B buttons',()=>{
  expect(tickRate(8,false,false)).toBe(8);expect(tickRate(8,true,false)).toBe(16);expect(tickRate(8,false,true)).toBe(4);
  expect(tickRate(99,false,false)).toBe(16);expect(tickRate(0,false,false)).toBe(4);
  const p=pose(run(start,.5),values);
  expect(p.speed).toBeCloseTo(p.rate*CELL);expect(8*CELL).toBeCloseTo(20.48);
  expect(pose(start,values).rate).toBe(0);
 });
 it('grows by one and scores one when it eats',()=>{
  const g:Game={...newGame(SEED),food:6*GRID.w+11};
  const {game,ate}=advance(g,1);
  expect(ate).toBe(true);expect(game.score).toBe(1);expect(game.snake.length).toBe(4);expect(game.snake).not.toContain(game.food);
  expect(advance(g,3).game.dir).toBe(1);  // a reversal is ignored
 });
 it('ends the game on the body',()=>{
  const g:Game={...newGame(SEED),snake:[5,6,26,25,24,4],dir:3,food:200};
  expect(advance(g,2).game.dead).toBe(RESTART_TICKS);  // down into cell 25
  expect(advance(g,3).game.dead).toBe(0);              // left into cell 4, which the tail is leaving
 });
 it('places food deterministically on a free cell',()=>{
  const snake=[0,1,2,3];
  expect(placeFood(snake,7)).toEqual(placeFood(snake,7));
  for(let seed=1;seed<200;seed++){const f=placeFood(snake,seed).food;expect(f).toBeGreaterThan(3);expect(f).toBeLessThan(GRID.w*GRID.h)}
  expect(placeFood(Array.from({length:GRID.w*GRID.h},(_,i)=>i),1).food).toBe(-1);
 });
 it('plays itself: the built-in player never picks a blocked cell while a free one exists and keeps scoring',()=>{
  let s=start,best=0,deaths=0;
  for(let i=0;i<64*120;i++){
   const before=s.game;s=step(s,1/64,true,values);
   if(s.game.dead===RESTART_TICKS&&before.dead===0)deaths++;
   best=Math.max(best,s.game.score);
   for(const b of BUTTONS){expect(s.level[b]).toBeGreaterThanOrEqual(0);expect(s.level[b]).toBeLessThanOrEqual(1)}
  }
  expect(best).toBeGreaterThan(25);expect(deaths).toBeLessThan(6);expect(s.best).toBe(best);
  const safe=plan(newGame(SEED));expect(safe.room).toBeGreaterThan(200);
 });
 it('is deterministic',()=>{
  const a=run(start,20),b=run(start,20);
  expect(a).toEqual(b);expect(pose(a,values)).toEqual(pose(b,values));
  expect(start.t).toBe(0);expect(start.game.ticks).toBe(0);  // the start state is never mutated
 });
});

describe('Pocket inputs',()=>{
 it('presses the matching key by its stated travel',()=>{
  let s=run(start,.1);
  s=control(s,'arrowup',true);s=run(s,.25);
  const p=pose(s,values);
  expect(p.dpad.up).toBeCloseTo(TRAVEL.dpad,3);expect(p.tiltX).toBeCloseTo(-DPAD_TILT,3);expect(p.tiltZ).toBeCloseTo(0,3);
  expect(p.input).toContain('Up');expect(p.led).toBeGreaterThan(.4);
  // 0.8 mm at the arm tip, 8.5 mm from the pivot, is a tilt of 5.38°.
  expect(DPAD_TILT*180/Math.PI).toBeCloseTo(5.377,2);expect(Math.tan(DPAD_TILT)*DPAD_REACH).toBeCloseTo(.8);
  s=control(s,'arrowup',false);s=run(s,.25);
  expect(pose(s,values).dpad.up).toBeCloseTo(0,3);
 });
 it('steers from the keyboard, then hands back to the built-in player',()=>{
  let s=run(start,.1);
  s=control(s,'arrowdown',true);
  expect(s.manual).toBeCloseTo(s.t+MANUAL_HOLD);
  s=run(s,.125);expect(s.game.dir).toBe(2);
  s=control(s,'arrowdown',false);
  expect(control(s,'q',true)).toBe(s);                 // unmapped keys do nothing
  expect(control(start,'arrowup',true)).toBe(start);   // nor does anything while stopped
 });
 it('doubles the rate while A is held and restarts on Start',()=>{
  let s=run(start,.5);
  s=control(s,'a',true);expect(pose(s,values).rate).toBe(16);
  s=run(s,.25);expect(pose(s,values).press.a).toBeCloseTo(TRAVEL.button,3);
  s=control(s,'a',false);
  const games=s.games;s=control(s,'s',true);
  expect(s.games).toBe(games+1);expect(s.game.ticks).toBe(0);expect(s.game.score).toBe(0);
  const grid=s.grid;expect(control(s,'g',true).grid).toBe(!grid);
 });
 it('releases everything when stopped',()=>{
  let s=control(run(start,.3),'b',true);s=run(s,.2);
  const stopped=step(s,1/64,false,values),p=pose(stopped,values);
  expect(p.press).toEqual({a:0,b:0,start:0,select:0});expect(p.tiltX).toBeCloseTo(0);expect(p.rate).toBe(0);expect(p.input).toBe('—');
  expect(step(stopped,1,false,values)).toBe(stopped);
  expect(step(s,5,true,values).t).toBeCloseTo(s.t+.1);  // long frame gaps are clamped
 });
});

describe('Pocket layout',()=>{
 const inner=outline(SHELL.wall,24);
 it('maps the reference at 0.1 mm per pixel',()=>{
  expect(px(745,1032)).toEqual([0,0]);expect(px(300,297)).toEqual([-44.5,-73.5]);expect(px(1190,1767)).toEqual([44.5,73.5]);
 });
 it('keeps the board and every placed part inside the shell wall',()=>{
  for(const [x,z] of [[PCB.x0+.6,PCB.z0],[PCB.x1-.6,PCB.z0],[PCB.x0+.6,PCB.z1-.6],[PCB.x1-.6,PCB.z1-.6],[0,PCB.z1]])expect(inside(x,z,inner),`board ${x},${z}`).toBe(true);
  for(const f of footprints){
   // Discs are tested at 45°, rounded boxes at the 45° point of their corner radius.
   const [hx,hz]=half(f),k=f.r!==undefined?Math.SQRT1_2:1,cut=(f.kind==='tube'?BAY.r:f.kind==='frame'?SCREEN.r:0)*(1-Math.SQRT1_2);
   for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])expect(inside(f.x+sx*(hx*k-cut),f.z+sz*(hz*k-cut),inner),f.id).toBe(true);
   expect(f.y0,f.id).toBeGreaterThanOrEqual(SHELL.floor);expect(f.y1,f.id).toBeGreaterThan(f.y0);
   // Only the keys come through the 24 mm front face.
   if(f.kind!=='well'&&f.kind!=='key')expect(f.y1,f.id).toBeLessThanOrEqual(SHELL.plate);
  }
  for(const [x,z] of SCREWS)expect(inside(x,z,outline(SHELL.wall+1.9,24)),`screw ${x},${z}`).toBe(true);
 });
 it('keeps board parts on the board',()=>{
  for(const f of footprints.filter(f=>f.asm==='board')){
   const [hx,hz]=half(f),lead=f.pins?.7:0;
   expect(f.x-hx-lead,f.id).toBeGreaterThanOrEqual(PCB.x0);expect(f.x+hx+lead,f.id).toBeLessThanOrEqual(PCB.x1);
   expect(f.z-hz-lead,f.id).toBeGreaterThanOrEqual(PCB.z0);expect(f.z+hz+lead,f.id).toBeLessThanOrEqual(PCB.z1);
   expect(f.y0,f.id).toBe(PCB.y1);
  }
 });
 it('lets no two placed parts share space',()=>{
  const gap=(a:typeof footprints[number],b:typeof footprints[number])=>{
   const [ax,az]=half(a),[bx,bz]=half(b),dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z);
   if(a.r!==undefined&&b.r!==undefined)return Math.hypot(dx,dz)-a.r-b.r;
   if(a.r!==undefined||b.r!==undefined){const r=(a.r??b.r)!,[hx,hz]=a.r!==undefined?[bx,bz]:[ax,az];return Math.hypot(Math.max(dx-hx,0),Math.max(dz-hz,0))-r}
   return Math.max(dx-ax-bx,dz-az-bz);
  };
  for(let i=0;i<footprints.length;i++)for(let j=i+1;j<footprints.length;j++){
   const a=footprints[i],b=footprints[j];
   if(a.y1<=b.y0||b.y1<=a.y0)continue;
   expect(gap(a,b),`${a.id} / ${b.id}`).toBeGreaterThan(0);
  }
 });
 it('seats the B crescent beside A and clear of its neighbours',()=>{
  const d=Math.hypot(BTN.a.x-BTN.b.x,BTN.a.z-BTN.b.z);
  expect(d).toBeLessThan(BTN.a.r+BTN.b.r);            // they overlap in plan, as in the reference
  expect(BTN.gap).toBeGreaterThan(0);                 // B is cut back from A by this much
  expect(Math.hypot(BTN.b.x-BTN.select.x,BTN.b.z-BTN.select.z)).toBeGreaterThan(BTN.b.r+BTN.select.r);
  expect(Math.hypot(BTN.start.x-BTN.select.x,BTN.start.z-BTN.select.z)).toBeGreaterThan(BTN.start.ring+BTN.select.r);
  expect(inside(BTN.b.x+BTN.b.r+1.1,BTN.b.z,inner)).toBe(true);
 });
 it('fits the stack: board under screen, screen and bay under the face, cross above it',()=>{
  expect(at('cell').y1).toBeLessThan(PCB.y0);
  for(const f of footprints.filter(f=>f.asm==='board'&&Math.abs(f.x-SCREEN.x)<SCREEN.w/2&&Math.abs(f.z-SCREEN.z)<SCREEN.d/2))expect(f.y1,f.id).toBeLessThanOrEqual(SCREEN.y0);
  expect(SCREEN.z-SCREEN.d/2).toBeGreaterThan(BAY.z+BAY.d/2);
  expect(PCB.z0).toBeGreaterThan(BAY.z+BAY.d/2);
  expect(DPAD.top).toBeGreaterThan(SHELL.top);expect(BTN.y1).toBeGreaterThan(SHELL.top);
  // Fully pressed, a button still clears its membrane and the cross clears its dish (19.8 mm at the arm tip).
  expect(BTN.y0-TRAVEL.button).toBeGreaterThanOrEqual(at('mem-ab').y1);
  expect(DPAD.pivot-TRAVEL.dpad).toBeGreaterThanOrEqual(19.8);
  expect(MENU.z-MENU.d/2).toBeGreaterThan(PCB.z1);
 });
 it('scatters small parts clear of everything placed',()=>{
  expect(spots.length).toBe(SMD.reduce((n,s)=>n+s.count,0));
  for(const s of spots)for(const f of footprints.filter(f=>f.asm==='board'||f.kind==='membrane'||f.kind==='led')){
   const [hx,hz]=half(f);
   expect(Math.abs(s.x-f.x)>hx+.6||Math.abs(s.z-f.z)>hz+.6||(f.r!==undefined&&Math.hypot(s.x-f.x,s.z-f.z)>f.r+.6),`${f.id} at ${s.x},${s.z}`).toBe(true);
  }
 });
 it('staggers the explosion as a vertical stack, front shell highest',()=>{
  const last=Math.max(...assemblies.map(a=>a.order));
  const order=['front','controls','screen','board','bay','power','back'];
  expect(assemblies.map(a=>a.id)).toEqual(order);
  for(let i=1;i<assemblies.length;i++)expect(assemblies[i].move[1]).toBeLessThan(assemblies[i-1].move[1]);
  for(const a of assemblies){expect(spread(0,a.order,last)).toBe(0);expect(spread(1,a.order,last)).toBe(1);expect(a.note.split(/\s+/).length).toBeLessThanOrEqual(8)}
 });
});
