// Paints Cobalt's board print, top and underside, from vectors (layout.ts, router.ts, print.ts). Canvas only, no three.js. Each painter takes `k`, canvas pixels per millimetre,
// and draws the whole board: x −23..23 across, z −20..20 down.
import {rng} from '../kit/util';
import {BOARD,HOLES,HOLE,POURS,U1,layout} from './layout';
import {routed,type Trace} from './router';
import {silk,type Label} from './print';

type G=CanvasRenderingContext2D;
export const MASK='#06197a',COPPER='#1a4fe0',GOLD='#d8ae5c',TIN='#d3d7dc',SILK='#ffffff';
// The relief sheet packs three things the board material reads from one texture: red is height, green roughness, blue metalness.
export const RELIEF={mask:[92,84,0],copper:[156,74,0],silk:[126,190,0],pad:[184,86,255],via:[176,70,255],hole:[30,160,0]} as const;
const rel=(k:keyof typeof RELIEF)=>`rgb(${RELIEF[k].join(',')})`;
export const FONT='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

export const boardCanvas=(k:number)=>{const c=document.createElement('canvas');c.width=Math.round(BOARD.w*k);c.height=Math.round(BOARD.d*k);return c};
const place=(g:G,k:number)=>{g.setTransform(k,0,0,k,BOARD.w/2*k,BOARD.d/2*k);g.lineCap='round';g.lineJoin='round'};
const outline=(g:G,inset=0)=>{g.beginPath();g.roundRect(-BOARD.w/2+inset,-BOARD.d/2+inset,BOARD.w-inset*2,BOARD.d-inset*2,BOARD.r-inset)};
const poly=(g:G,p:number[])=>{g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1])};
function strokes(g:G,list:Trace[],grow=0,pick:(t:Trace)=>boolean=()=>true){
 const widths=new Map<number,Trace[]>();for(const t of list)if(pick(t))(widths.get(t.w)??(widths.set(t.w,[]),widths.get(t.w)!)).push(t);
 for(const [w,group] of widths){g.lineWidth=w+grow;g.beginPath();for(const t of group)poly(g,t.p);g.stroke()}
}
const discs=(g:G,at:number[],r:number)=>{g.beginPath();for(let i=0;i<at.length;i+=2){g.moveTo(at[i]+r,at[i+1]);g.arc(at[i],at[i+1],r,0,Math.PI*2)}g.fill()};
const GILT=/^(TP|J2|J3)/;
function lands(g:G,grow=0,pick:(hole:boolean,gilt:boolean)=>boolean=()=>true){
 g.beginPath();
 for(const p of layout().pads){if(!pick(!!p.hole,GILT.test(p.part)))continue;const w=p.w+grow*2,d=p.d+grow*2;g.roundRect(p.x-w/2,p.z-d/2,w,d,Math.min(w,d)/2*Math.min(1,(p.r+grow*.5)/(Math.min(p.w,p.d)/2)))}
 g.fill();
}
const drills=(g:G)=>{g.beginPath();for(const p of layout().pads)if(p.hole){g.moveTo(p.x+p.hole,p.z);g.arc(p.x,p.z,p.hole,0,Math.PI*2)}g.fill()};
const pours=(g:G)=>{g.beginPath();for(const p of POURS){poly(g,p);g.closePath()}g.fill()};
function lettering(g:G,labels:Label[]){
 g.textAlign='center';g.textBaseline='middle';
 for(const l of labels){g.save();g.translate(l.x,l.z);if(l.turn)g.rotate(-Math.PI/2);g.font=`700 ${l.h*1.18}px ${FONT}`;g.fillText(l.t,0,l.h*.06);g.restore()}
}
function silkscreen(g:G){
 const s=silk();
 for(const l of s.lines){g.lineWidth=l.w;g.beginPath();poly(g,l.p);g.stroke()}
 for(const [x,z,r] of s.dots){g.beginPath();g.arc(x,z,r,0,Math.PI*2);g.fill()}
 lettering(g,s.labels);
 // White rings round the mounting holes.
 for(const [x,z] of HOLES){g.beginPath();g.arc(x,z,HOLE.ring,0,Math.PI*2);g.arc(x,z,HOLE.drill+.32,0,Math.PI*2,true);g.fill()}
}

// ── The board's top face. ──
export function paintColour(g:G,k:number){
 const r=routed(),random=rng(11);
 place(g,k);g.fillStyle=MASK;g.fillRect(-BOARD.w/2,-BOARD.d/2,BOARD.w,BOARD.d);
 // A faint mottle, so large fields of mask are not perfectly flat.
 for(let i=0;i<40;i++){
  const x=(random()-.5)*BOARD.w,z=(random()-.5)*BOARD.d,rad=3+random()*9,light=random()<.5,a=.05+random()*.07,fill=g.createRadialGradient(x,z,0,x,z,rad),c=light?'30,80,220':'2,6,60';
  fill.addColorStop(0,`rgba(${c},${a})`);fill.addColorStop(1,`rgba(${c},0)`);g.fillStyle=fill;g.fillRect(x-rad,z-rad,rad*2,rad*2);
 }
 // Copper under the mask: pours with their clearances, then traces and tented vias.
 g.fillStyle=COPPER;pours(g);
 g.strokeStyle=g.fillStyle=MASK;strokes(g,r.traces,.34);discs(g,r.vias,.5);discs(g,r.stitch,.52);lands(g,.3);
 g.strokeStyle=g.fillStyle=COPPER;strokes(g,r.traces);discs(g,r.vias,.3);
 g.fillStyle='#071647';discs(g,r.vias,.1);
 // Silkscreen, then the lands over it (a fabricator clips silk off the lands).
 g.strokeStyle=g.fillStyle=SILK;silkscreen(g);
 g.fillStyle='#07153f';lands(g,.07);
 g.fillStyle=TIN;lands(g,0,(_h,gilt)=>!gilt);g.fillStyle=GOLD;lands(g,0,(_h,gilt)=>gilt);
 // Stitching vias are left open: a plated ring round each drill.
 g.fillStyle='#c9cdd2';discs(g,r.stitch,.27);g.fillStyle='#050b22';discs(g,r.stitch,.12);drills(g);
 // A little dust.
 for(let i=0;i<500;i++){g.fillStyle=`rgba(210,222,246,${(.04+random()*.14).toFixed(3)})`;const s=.02+random()*.035;g.fillRect((random()-.5)*BOARD.w,(random()-.5)*BOARD.d,s,s)}
}
export function paintRelief(g:G,k:number){
 const r=routed();place(g,k);
 g.fillStyle=rel('mask');g.fillRect(-BOARD.w/2,-BOARD.d/2,BOARD.w,BOARD.d);
 g.fillStyle=rel('copper');pours(g);
 g.strokeStyle=g.fillStyle=rel('mask');strokes(g,r.traces,.34);discs(g,r.vias,.5);discs(g,r.stitch,.52);lands(g,.3);
 g.strokeStyle=g.fillStyle=rel('copper');strokes(g,r.traces);discs(g,r.vias,.3);
 g.fillStyle=rel('mask');discs(g,r.vias,.1);
 g.strokeStyle=g.fillStyle=rel('silk');silkscreen(g);
 g.fillStyle=rel('mask');lands(g,.07);
 g.fillStyle=rel('pad');lands(g);
 g.fillStyle=rel('via');discs(g,r.stitch,.27);g.fillStyle=rel('hole');discs(g,r.stitch,.12);drills(g);
}
// ── The underside: the inner layer's routing shows faintly through the mask, with the same vias. Mirrored in x by the caller's UVs. ──
export function paintBottom(g:G,k:number){
 const r=routed();place(g,k);g.fillStyle='#0f2c78';g.fillRect(-BOARD.w/2,-BOARD.d/2,BOARD.w,BOARD.d);
 g.fillStyle='#1d4cb0';pours(g);g.beginPath();g.roundRect(U1.x-7,U1.z-7,14,14,1);g.fill();
 g.strokeStyle=g.fillStyle='#2c62d2';strokes(g,r.inner,.1);discs(g,r.vias,.3);
 g.strokeStyle=g.fillStyle=SILK;g.lineWidth=.14;for(const p of layout().parts)if(/qfp|soic|shield|b2b|w2b/.test(p.kind))g.strokeRect(p.x-p.w/2,p.z-p.d/2,p.w,p.d);
 g.fillStyle='#c9cdd2';discs(g,r.stitch,.27);g.fillStyle='#050b22';discs(g,r.stitch,.12);discs(g,r.vias,.1);drills(g);
 g.fillStyle=GOLD;lands(g,0,hole=>hole);g.fillStyle='#050b22';drills(g);
}

