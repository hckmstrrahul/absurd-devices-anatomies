// Pocket motion model: a deterministic game of Snake on the handheld's LCD.
// Millimetres, seconds, ticks. No three.js in here: every moving part and every
// readout on the page is a function of the state this file advances.
import {clamp} from '../kit/util';
import type {Assembly,Values} from '../kit/types';

export type AssemblyId='front'|'controls'|'screen'|'board'|'bay'|'power'|'back';
export const SIZE={x:89,y:25.6,z:147};

// `move` is the explosion path in mm: a vertical stack, front shell highest.
export const assemblies:(Assembly&{id:AssemblyId})[]=[
 {id:'front',name:'Front shell',note:'Clear polycarbonate, violet toward the grips.',move:[0,150,0],order:0},
 {id:'controls',name:'Controls',note:'D-pad, four buttons, silicone membranes.',move:[0,98,0],order:1},
 {id:'screen',name:'Screen module',note:'Backlit LCD, 20 × 12 cells.',move:[0,84,0],order:2},
 {id:'board',name:'Logic board',note:'Runs the game, one tick at a time.',move:[0,52,0],order:3},
 {id:'bay',name:'Cartridge bay',note:'Game capsule docks on a gold comb.',move:[0,34,0],order:4},
 {id:'power',name:'Power',note:'Cell, charge posts and two LEDs.',move:[0,16,0],order:5},
 {id:'back',name:'Back shell',note:'Tray that carries everything.',move:[0,0,0],order:6},
];

// ── Game ──────────────────────────────────────────────────────────────────
export const GRID={w:20,h:12};
export const CELL=2.56;                    // mm per LCD cell: a 51.2 × 30.72 mm active area
export const SPEED={min:4,max:16,start:8}; // ticks per second
export const RESTART_TICKS=10;             // ticks the game-over screen stays up
export const SEED=20261112;
export type Dir=0|1|2|3;                   // up, right, down, left (up is the top of the screen)
const DX=[0,1,0,-1],DY=[-1,0,1,0];

export type Game={snake:number[];dir:Dir;food:number;seed:number;score:number;dead:number;ticks:number};

// Food goes on the k-th free cell, k drawn from a linear congruential generator, so every run is the same.
export function placeFood(snake:number[],seed:number){
 const next=(Math.imul(seed,1664525)+1013904223)>>>0,total=GRID.w*GRID.h,free=total-snake.length;
 if(free<=0)return {food:-1,seed:next};
 let k=next%free;
 for(let cell=0;cell<total;cell++){if(snake.includes(cell))continue;if(k--===0)return {food:cell,seed:next}}
 return {food:-1,seed:next};
}
export function newGame(seed:number):Game{
 const row=(GRID.h/2)*GRID.w,snake=[row+10,row+9,row+8],placed=placeFood(snake,seed);
 return {snake,dir:1,food:placed.food,seed:placed.seed,score:0,dead:0,ticks:0};
}
// One tick: the head moves one cell. A reversal is ignored; a wall or the body ends the game.
export function advance(g:Game,want:Dir):{game:Game;ate:boolean}{
 const dir=((want+2)%4===g.dir?g.dir:want) as Dir,{w,h}=GRID,head=g.snake[0];
 const x=head%w+DX[dir],y=Math.floor(head/w)+DY[dir],ticks=g.ticks+1;
 const over={game:{...g,dir,dead:RESTART_TICKS,ticks},ate:false};
 if(x<0||y<0||x>=w||y>=h)return over;
 const cell=y*w+x,ate=cell===g.food,body=ate?g.snake:g.snake.slice(0,-1);
 if(body.includes(cell))return over;
 const snake=[cell,...body];
 if(!ate)return {game:{...g,snake,dir,ticks},ate};
 const placed=placeFood(snake,g.seed);
 return {game:{...g,snake,dir,ticks,score:g.score+1,food:placed.food,seed:placed.seed,dead:placed.food<0?RESTART_TICKS:0},ate};
}

// ── Built-in player ───────────────────────────────────────────────────────
function reach(from:number,body:Uint8Array){
 const {w,h}=GRID,seen=new Uint8Array(w*h),queue=[from];seen[from]=1;let n=0;
 while(queue.length){
  const c=queue.pop()!;n++;const x=c%w,y=Math.floor(c/w);
  for(let d=0;d<4;d++){const nx=x+DX[d],ny=y+DY[d];if(nx<0||ny<0||nx>=w||ny>=h)continue;const k=ny*w+nx;if(!seen[k]&&!body[k]){seen[k]=1;queue.push(k)}}
 }
 return n;
}
// Greedy toward the food, but only into a pocket of free cells large enough to hold the snake.
export function plan(g:Game):{dir:Dir;room:number}{
 const {w,h}=GRID,body=new Uint8Array(w*h);
 for(let i=0;i<g.snake.length-1;i++)body[g.snake[i]]=1;
 const hx=g.snake[0]%w,hy=Math.floor(g.snake[0]/w),fx=g.food%w,fy=Math.floor(g.food/w);
 let best:Dir=g.dir,bestScore=-Infinity,bestRoom=0;
 for(const d of [g.dir,(g.dir+1)%4,(g.dir+3)%4] as Dir[]){
  const x=hx+DX[d],y=hy+DY[d];if(x<0||y<0||x>=w||y>=h||body[y*w+x])continue;
  const room=reach(y*w+x,body),dist=Math.abs(x-fx)+Math.abs(y-fy);
  const score=room>g.snake.length?1000-dist:room-500;
  if(score>bestScore){bestScore=score;best=d;bestRoom=room}
 }
 return {dir:best,room:bestRoom};
}
// Cells of clear, straight run from the head to the food; 0 if the food is not dead ahead.
export function clearRun(g:Game){
 const {w,h}=GRID;let x=g.snake[0]%w,y=Math.floor(g.snake[0]/w);
 for(let n=1;;n++){
  x+=DX[g.dir];y+=DY[g.dir];if(x<0||y<0||x>=w||y>=h)return 0;
  const cell=y*w+x;if(cell===g.food)return n;if(g.snake.includes(cell))return 0;
 }
}

// ── Inputs ────────────────────────────────────────────────────────────────
export const BUTTONS=['up','right','down','left','a','b','start','select'] as const;
export type Button=typeof BUTTONS[number];
export const LABELS:Record<Button,string>={up:'Up',right:'Right',down:'Down',left:'Left',a:'A',b:'B',start:'Start',select:'Select'};
export const KEYS:Record<string,Button>={arrowup:'up',arrowright:'right',arrowdown:'down',arrowleft:'left',a:'a',b:'b',s:'start',g:'select'};
export const TRAVEL={dpad:.8,button:1};    // mm of travel at full press
export const DPAD_REACH=8.5;               // mm from the pivot to an arm tip
export const DPAD_TILT=Math.atan(TRAVEL.dpad/DPAD_REACH);
export const PRESS_TAU=.03;                // s, how fast a key goes down and comes back
export const HOLD=.14;                     // s the built-in player holds a press
export const MANUAL_HOLD=5;                // s the built-in player waits after a keyboard move
export const TURBO_RUN=5;                  // cells of clear run before it holds A
export const BLINK_HZ=6;

const each=<T>(value:(b:Button)=>T)=>Object.fromEntries(BUTTONS.map(b=>[b,value(b)])) as Record<Button,T>;
const UP=each(()=>false),ZERO=each(()=>0);

export type State={
 on:boolean;t:number;acc:number;game:Game;best:number;games:number;
 keys:Record<Button,boolean>;     // held on the keyboard
 demo:Record<Button,number>;      // time until which the built-in player holds each one
 level:Record<Button,number>;     // 0..1 travel of each key, eased
 manual:number;                   // the keyboard steers until this time
 queued:Dir|null;grid:boolean;eatT:number;
};
export const start:State={on:false,t:0,acc:0,game:newGame(SEED),best:0,games:0,keys:UP,demo:ZERO,level:ZERO,manual:0,queued:null,grid:false,eatT:-10};

export const active=(s:State,b:Button)=>s.keys[b]||s.demo[b]>s.t;
// A doubles the tick rate, B halves it.
export const tickRate=(speed:number,a:boolean,b:boolean)=>clamp(speed,SPEED.min,SPEED.max)*(a?2:1)*(b?.5:1);

function tick(s:State,period:number):State{
 const g=s.game,hold=s.t+Math.max(HOLD,period*1.2);
 if(g.dead>1)return {...s,game:{...g,dead:g.dead-1}};
 if(g.dead===1)return {...s,game:newGame(g.seed),games:s.games+1,queued:null,demo:{...s.demo,start:s.t+HOLD}};
 const manual=s.manual>s.t,choice=manual?{dir:s.queued??g.dir,room:Infinity}:plan(g);
 const moved=advance(g,choice.dir),demo={...s.demo};let grid=s.grid;
 if(!manual){
  if(moved.game.dir!==g.dir)demo[BUTTONS[moved.game.dir]]=s.t+HOLD;
  if(!moved.game.dead&&clearRun(moved.game)>=TURBO_RUN)demo.a=hold;
  if(choice.room<g.snake.length*2)demo.b=hold;
  if(moved.ate&&moved.game.score%5===0){demo.select=s.t+HOLD;grid=!grid}
 }
 return {...s,game:moved.game,demo,grid,queued:null,best:Math.max(s.best,moved.game.score),eatT:moved.ate?s.t:s.eatT};
}

export function step(s:State,dt:number,playing:boolean,values:Values):State{
 if(!playing)return s.on?{...s,on:false,keys:UP,demo:ZERO,level:ZERO,queued:null,manual:0}:s;
 const d=clamp(dt,0,.1),rate=tickRate(Number(values.speed),active(s,'a'),active(s,'b'));
 let next:State={...s,on:true,t:s.t+d},acc=s.acc+d*rate;
 while(acc>=1){acc-=1;next=tick(next,1/rate)}
 const k=1-Math.exp(-d/PRESS_TAU);
 return {...next,acc,level:each(b=>next.level[b]+((active(next,b)?1:0)-next.level[b])*k)};
}

// Arrow keys steer; A, B, S (Start) and G (Select) press the buttons.
export function control(s:State,key:string,down:boolean):State{
 const b=KEYS[key];if(!b||!s.on||s.keys[b]===down)return s;
 let next:State={...s,keys:{...s.keys,[b]:down}};
 if(!down)return next;
 const dir=BUTTONS.indexOf(b);
 if(dir<4)next={...next,queued:dir as Dir,manual:s.t+MANUAL_HOLD};
 if(b==='start')next={...next,game:newGame(s.game.seed),games:s.games+1,queued:null};
 if(b==='select')next={...next,grid:!s.grid};
 return next;
}

export function pose(s:State,values:Values){
 const l=s.level,pressed=BUTTONS.filter(b=>l[b]>.5),peak=Math.max(...BUTTONS.map(b=>l[b]));
 const rate=s.on?tickRate(Number(values.speed),active(s,'a'),active(s,'b')):0;
 const blink=Math.floor(s.t*BLINK_HZ*2)%2===0?1:.45;
 return {
  on:s.on,t:s.t,ticks:s.game.ticks,games:s.games,
  score:s.game.score,best:s.best,length:s.game.snake.length,
  rate,speed:rate*CELL,                                   // ticks/s and mm/s across the LCD
  snake:s.game.snake,food:s.game.food,dead:s.game.dead,grid:s.grid,palette:String(values.palette),
  foodOn:Math.floor(s.t*4)%2===0,
  // Travel in mm for the four face buttons, tilt in radians for the D-pad cross.
  press:{a:l.a*TRAVEL.button,b:l.b*TRAVEL.button,start:l.start*TRAVEL.button,select:l.select*TRAVEL.button},
  dpad:{up:l.up*TRAVEL.dpad,right:l.right*TRAVEL.dpad,down:l.down*TRAVEL.dpad,left:l.left*TRAVEL.dpad},
  tiltX:(l.down-l.up)*DPAD_TILT,tiltZ:(l.left-l.right)*DPAD_TILT,
  input:pressed.length?pressed.map(b=>LABELS[b]).join(' + '):'—',
  // Input LED: lit by any press, flickering while it is held. Power LED: steady, flaring when the snake eats.
  led:s.on?peak*blink:.5,
  power:s.on?.6+.4*Math.exp(-(s.t-s.eatT)/.25):.5,
  cpu:s.on?.3+.7*(1-s.acc)**2:.15,
 };
}
export type Pose=ReturnType<typeof pose>;
