// Paints Frost's print from vectors onto a canvas, for any window of the board at any scale: the board's white face, its relief
// and its underside. No three.js here. Lands, silk and lettering come from print.ts; copper from routed.ts.
import {rng} from '../kit/util';
import {HOLES,HOLE} from './layout';
import {IMG,U,V,buildPrint,type Box,type Pad} from './print';
import {TRACES,BOTTOM,VIAS} from './routed';

type G=CanvasRenderingContext2D;
// The relief sheet packs three things the board material reads from one texture: red is height, green roughness, blue metalness.
export const RELIEF={bare:[96,150,0],copper:[150,132,0],open:[70,170,0],pad:[128,74,255],silk:[178,238,0],drill:[0,255,0]} as const;
const relief=(k:keyof typeof RELIEF)=>`rgb(${RELIEF[k].join(',')})`;
export const make=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};
const place=(g:G,view:Box,k:number)=>g.setTransform(k,0,0,k,-view[0]*k,-view[1]*k);
const poly=(g:G,p:number[],from=0)=>{g.moveTo(p[from],p[from+1]);for(let i=from+2;i<p.length;i+=2)g.lineTo(p[i],p[i+1])};
const R=30,EDGE=5;

// Traces of one list, grouped by width so each width is one stroke. `extra` widens every trace (for clearance moats).
function strokes(g:G,list:number[][],extra=0,pick?:(i:number)=>boolean){
 g.lineCap='round';g.lineJoin='round';const widths=new Map<number,number[]>();
 list.forEach((t,i)=>{if(!pick||pick(i))(widths.get(t[0])??(widths.set(t[0],[]),widths.get(t[0])!)).push(i)});
 for(const [w,ids] of widths){g.lineWidth=w/10+extra;g.beginPath();for(const i of ids)poly(g,list[i],1);g.stroke()}
}
function viaDots(g:G,r:number){g.beginPath();for(let i=0;i<VIAS.length;i+=2){g.moveTo(VIAS[i]+r,VIAS[i+1]);g.arc(VIAS[i],VIAS[i+1],r,0,Math.PI*2)}g.fill()}
// Lands. `more` draws them larger (the mask opening, or a clearance moat).
function lands(g:G,more:number,pick?:(p:Pad)=>boolean){
 g.beginPath();
 for(const p of buildPrint().pads){
  if(pick&&!pick(p))continue;const w=p.w+more*2,h=p.h+more*2;
  if(p.r*2>=Math.min(p.w,p.h)-.01&&p.w===p.h){g.moveTo(p.x+w/2,p.y);g.arc(p.x,p.y,w/2,0,Math.PI*2)}else g.roundRect(p.x-w/2,p.y-h/2,w,h,p.r+more*.5);
 }
 g.fill();
}
const drills=(g:G)=>{g.beginPath();for(const p of buildPrint().pads)if(p.hole){g.moveTo(p.x+p.hole,p.y);g.arc(p.x,p.y,p.hole,0,Math.PI*2)}g.fill()};
function silk(g:G,scale=1){
 const print=buildPrint();g.lineCap='round';g.lineJoin='round';
 const by=new Map<number,number[][]>();for(const l of print.silk){const key=Math.round(l.w*20)/20;(by.get(key)??(by.set(key,[]),by.get(key)!)).push(l.p)}
 for(const [w,list] of by){g.lineWidth=w*scale;g.beginPath();for(const p of list){if(p.length===2){g.moveTo(p[0],p[1]);g.lineTo(p[0]+.01,p[1])}else poly(g,p)}g.stroke()}
 for(const c of print.circles){g.beginPath();g.arc(c.x,c.y,c.r,0,Math.PI*2);if(c.w){g.lineWidth=c.w*scale;g.stroke()}else g.fill()}
 for(const [x0,y0,x1,y1] of print.fills)g.fillRect(x0,y0,x1-x0,y1-y0);
}
const card=(g:G)=>{g.beginPath();g.roundRect(EDGE,EDGE,IMG.w-EDGE*2,IMG.h-EDGE*2,R-EDGE)};
const rings=(g:G,r:number)=>{g.beginPath();for(const [x,z] of HOLES){g.moveTo(U(x)+r,V(z));g.arc(U(x),V(z),r,0,Math.PI*2)}g.fill()};
// A copper layer as it is etched: a poured plane with a moat round every trace and land, then the traces and lands themselves.
// The plane takes the scratch context's fill colour.
function pour(q:G,view:Box,k:number,list:number[][],withLands:boolean,moat=2.1,drawTraces=true){
 const colour=q.fillStyle;
 q.setTransform(1,0,0,1,0,0);q.globalCompositeOperation='source-over';q.clearRect(0,0,q.canvas.width,q.canvas.height);place(q,view,k);
 card(q);q.fill();
 q.globalCompositeOperation='destination-out';q.strokeStyle=q.fillStyle='#000';strokes(q,list,moat*2);viaDots(q,3.4+moat);if(withLands)lands(q,moat);rings(q,HOLE.ring*10+moat+3);
 q.globalCompositeOperation='source-over';q.strokeStyle=q.fillStyle=colour;if(drawTraces){strokes(q,list);viaDots(q,3.4)}
}

// ── The board face: white solder mask, pale copper showing through it, black legend, gold lands. ──
export function paintColour(g:G,scratch:HTMLCanvasElement,view:Box,k:number){
 const q=scratch.getContext('2d')!,random=rng(11);
 place(g,view,k);g.globalCompositeOperation='source-over';
 // Mask over bare laminate is a shade greyer than mask over copper.
 g.fillStyle='#b4b9ba';g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 q.fillStyle='#dee0df';pour(q,view,k,TRACES,true);
 g.setTransform(1,0,0,1,0,0);g.drawImage(scratch,0,0);place(g,view,k);
 // A very faint mottle so the white is a surface, not a fill.
 for(let i=0;i<70;i++){const x=random()*IMG.w,y=random()*IMG.h,r=30+random()*110,f=g.createRadialGradient(x,y,0,x,y,r),c=random()<.5?'255,255,255':'150,156,160',a=.035+random()*.04;f.addColorStop(0,`rgba(${c},${a})`);f.addColorStop(1,`rgba(${c},0)`);g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)}
 // Tented vias: a dimple where the drill is.
 g.fillStyle='#b4b8b9';viaDots(g,1.25);
 // Legend, then the lands over it (a fabricator clips legend off the lands): mask opening, metal, drill.
 g.strokeStyle=g.fillStyle='#17181a';silk(g);
 g.fillStyle='#b9b6a6';lands(g,.7);
 g.fillStyle='#d9b468';lands(g,0);
 g.fillStyle='#121315';drills(g);
 // Plated mounting rings with a circle of stitching vias.
 for(const [x,z] of HOLES){
  const cx=U(x),cy=V(z),r=HOLE.ring*10,f=g.createRadialGradient(cx-r*.3,cy-r*.3,r*.2,cx,cy,r*1.2);f.addColorStop(0,'#e7c988');f.addColorStop(1,'#cba659');
  g.fillStyle='#b9b6a6';g.beginPath();g.arc(cx,cy,r+1,0,Math.PI*2);g.fill();g.fillStyle=f;g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();
  g.fillStyle='#8a713c';for(let i=0;i<10;i++){const a=i/10*Math.PI*2;g.beginPath();g.arc(cx+Math.cos(a)*r*.76,cy+Math.sin(a)*r*.76,1.5,0,Math.PI*2);g.fill()}
 }
}
export function paintRelief(g:G,scratch:HTMLCanvasElement,view:Box,k:number){
 const q=scratch.getContext('2d')!;place(g,view,k);
 g.fillStyle=relief('bare');g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 q.fillStyle=relief('copper');pour(q,view,k,TRACES,true);
 g.setTransform(1,0,0,1,0,0);g.drawImage(scratch,0,0,scratch.width,scratch.height,0,0,scratch.width,scratch.height);place(g,view,k);
 g.fillStyle=relief('bare');viaDots(g,1.25);
 g.strokeStyle=g.fillStyle=relief('silk');silk(g);
 g.fillStyle=relief('open');lands(g,.7);g.fillStyle=relief('pad');lands(g,0);rings(g,HOLE.ring*10);
 g.fillStyle=relief('drill');drills(g);
}
// The underside: the bottom copper layer under the same mask, at low resolution (it is only seen edge-on and when exploded).
export function paintBottom(g:G,scratch:HTMLCanvasElement,k:number){
 const view:Box=[0,0,IMG.w,IMG.h],q=scratch.getContext('2d')!;place(g,view,k);
 g.fillStyle='#d3d6d5';g.fillRect(0,0,IMG.w,IMG.h);q.fillStyle='#e9eaea';pour(q,view,k,BOTTOM,false);
 g.setTransform(1,0,0,1,0,0);g.drawImage(scratch,0,0);place(g,view,k);
 g.fillStyle='#b4b8b9';viaDots(g,1.25);g.fillStyle='#d9b468';lands(g,0,p=>!!p.hole);rings(g,HOLE.ring*10);g.fillStyle='#121315';drills(g);
}
