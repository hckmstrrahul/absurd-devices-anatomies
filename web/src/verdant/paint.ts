// Paints Verdant's board print from vectors onto a canvas, for any window of the board at any scale. No three.js here, so the
// trace script can use the same painter for previews. Lands, silk and lettering come from print.ts; copper from routed.ts.
// Colours are drawn, not sampled: bare mask from the reference crop's median (4,69,34) upper / (4,49,23) lower; copper under mask
// is a screen of (116,140,90) over it, which is what the traced print used.
import {rng} from '../kit/util';
import {IMG,LIME_ZONE,DARK_ZONES,type Box} from './layout';
import {buildPrint,type Line} from './print';
import {TRACES,VIAS} from './routed';

type G=CanvasRenderingContext2D;
export const MASK='#063a1b';
// The relief sheet packs two things the board material reads from one texture: red is height (bump) and green is roughness.
export const RELIEF={mask:[70,226],copper:[178,150],pad:[214,120],silk:[112,246]} as const;
const reliefStyle=(k:keyof typeof RELIEF)=>`rgb(${RELIEF[k][0]},${RELIEF[k][1]},0)`;
const make=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};

// Things every window shares, made once: soft tone that has no edges (drawn small and stretched), bounding boxes, dust.
type Shared={mottle:HTMLCanvasElement;dark:HTMLCanvasElement;boxes:Float32Array;silk:Map<number,Line[]>;specks:Float32Array;lint:Float32Array};
let shared:Shared|null=null;
function prepare():Shared{
 if(shared)return shared;
 const random=rng(7),print=buildPrint();
 // Mask grain: a faint mottle so large fields are not perfectly flat.
 const f=8,[mottle,q]=make(IMG.w/f,IMG.h/f);q.scale(1/f,1/f);
 for(let i=0;i<60;i++){
  const x=random()*IMG.w,y=random()*IMG.h,r=40+random()*120,light=random()<.5,a=light?.03+random()*.05:.04+random()*.06,squash=.4+random()*.6,turn=random()*3;
  q.save();q.translate(x,y);q.rotate(turn);q.scale(1,squash);const fill=q.createRadialGradient(0,0,0,0,0,r),c=light?'30,110,54':'2,18,8';fill.addColorStop(0,`rgba(${c},${a})`);fill.addColorStop(.6,`rgba(${c},${a*.6})`);fill.addColorStop(1,`rgba(${c},0)`);q.fillStyle=fill;q.beginPath();q.arc(0,0,r,0,Math.PI*2);q.fill();q.restore();
 }
 // Dark fields: the black mask under the machinery up top, the shade under the lower socket, the unlit corner.
 const d=16,[dark,dq]=make(IMG.w/d,IMG.h/d);dq.scale(1/d,1/d);
 for(const z of DARK_ZONES){dq.fillStyle=`rgba(3,8,5,${z.a})`;dq.beginPath();dq.roundRect(z.b[0],z.b[1],z.b[2]-z.b[0],z.b[3]-z.b[1],30);dq.fill()}
 const boxes=new Float32Array(TRACES.length*4);
 TRACES.forEach((t,i)=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=1;k<t.length;k+=2){x0=Math.min(x0,t[k]);x1=Math.max(x1,t[k]);y0=Math.min(y0,t[k+1]);y1=Math.max(y1,t[k+1])}boxes.set([x0-3,y0-3,x1+3,y1+3],i*4)});
 const silk=new Map<number,Line[]>();for(const l of print.silk){const key=Math.round(l.w*20)/20;(silk.get(key)??(silk.set(key,[]),silk.get(key)!)).push(l)}
 // Dust and lint: specks as [x, y, size, alpha], lint as [x, y, angle, length, alpha, bend, bend].
 const specks=new Float32Array(2400*4);for(let i=0;i<2400;i++)specks.set([random()*IMG.w,random()*IMG.h,.5+random()*.9,.06+random()*.24],i*4);
 const lint=new Float32Array(60*7);for(let i=0;i<60;i++)lint.set([random()*IMG.w,random()*IMG.h,random()*6.28,4+random()*14,.08+random()*.18,random()*4,random()*4],i*7);
 return shared={mottle,dark,boxes,silk,specks,lint};
}
const within=(view:Box,x0:number,y0:number,x1:number,y1:number)=>x1>=view[0]&&x0<=view[2]&&y1>=view[1]&&y0<=view[3];
const poly=(g:G,p:number[],from=0)=>{g.moveTo(p[from],p[from+1]);for(let k=from+2;k<p.length;k+=2)g.lineTo(p[k],p[k+1])};
// Copper, on whatever is underneath: traces by width, then via lands.
function copper(g:G,view:Box,s:Shared){
 g.lineCap='round';g.lineJoin='round';
 const widths=new Map<number,number[]>();TRACES.forEach((t,i)=>{if(within(view,s.boxes[i*4],s.boxes[i*4+1],s.boxes[i*4+2],s.boxes[i*4+3]))(widths.get(t[0])??(widths.set(t[0],[]),widths.get(t[0])!)).push(i)});
 for(const [w,list] of widths){g.lineWidth=w/10;g.beginPath();for(const i of list)poly(g,TRACES[i],1);g.stroke()}
 g.beginPath();for(let i=0;i<VIAS.length;i+=2)if(within(view,VIAS[i]-3,VIAS[i+1]-3,VIAS[i]+3,VIAS[i+1]+3)){g.moveTo(VIAS[i]+2.3,VIAS[i+1]);g.arc(VIAS[i],VIAS[i+1],2.3,0,Math.PI*2)}g.fill();
}
function silk(g:G,view:Box,s:Shared){
 const print=buildPrint();g.lineCap='round';g.lineJoin='round';
 for(const [w,list] of s.silk){g.lineWidth=w;g.beginPath();for(const l of list){const p=l.p;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let k=0;k<p.length;k+=2){if(p[k]<x0)x0=p[k];if(p[k]>x1)x1=p[k];if(p[k+1]<y0)y0=p[k+1];if(p[k+1]>y1)y1=p[k+1]}if(!within(view,x0-1,y0-1,x1+1,y1+1))continue;if(p.length===2){g.moveTo(p[0],p[1]);g.lineTo(p[0]+.01,p[1])}else poly(g,p)}g.stroke()}
 for(const c of print.circles){if(!within(view,c.x-c.r-1,c.y-c.r-1,c.x+c.r+1,c.y+c.r+1))continue;g.beginPath();g.arc(c.x,c.y,c.r,0,Math.PI*2);if(c.w){g.lineWidth=c.w;g.stroke()}else g.fill()}
 for(const [x0,y0,x1,y1] of print.fills)if(within(view,x0,y0,x1,y1))g.fillRect(x0,y0,x1-x0,y1-y0);
}
// Lands. `grow` draws them a little larger (the mask opening).
function lands(g:G,view:Box,grow:number,pick:(gold:boolean)=>boolean){
 g.beginPath();
 for(const p of buildPrint().pads){
  if(!pick(!!p.gold)||!within(view,p.x-p.w/2-1,p.y-p.h/2-1,p.x+p.w/2+1,p.y+p.h/2+1))continue;
  const w=p.w+grow*2,h=p.h+grow*2;
  if(p.r*2>=Math.min(p.w,p.h)-.01&&p.w===p.h){g.moveTo(p.x+w/2,p.y);g.arc(p.x,p.y,w/2,0,Math.PI*2)}else g.roundRect(p.x-w/2,p.y-h/2,w,h,p.r+grow*.5);
 }
 g.fill();
}
const drills=(g:G,view:Box)=>{g.beginPath();for(const p of buildPrint().pads)if(p.hole&&within(view,p.x-p.hole,p.y-p.hole,p.x+p.hole,p.y+p.hole)){g.moveTo(p.x+p.hole,p.y);g.arc(p.x,p.y,p.hole,0,Math.PI*2)}g.fill()};

// The colour sheet for the window `view` (reference pixels), at kx × ky canvas pixels per reference pixel.
// `scratch` is a spare canvas at least as large as the target; copper is drawn there and screened on in one go, so overlaps do not brighten.
export function paintColour(g:G,scratch:HTMLCanvasElement,view:Box,kx:number,ky:number){
 const s=prepare(),W=g.canvas.width,H=g.canvas.height,place=(q:G)=>q.setTransform(kx,0,0,ky,-view[0]*kx,-view[1]*ky);
 const dot=(x:number,y:number,r:number)=>{g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill()};
 place(g);g.globalCompositeOperation='source-over';g.globalAlpha=1;
 // Solder mask: deep forest green; the brighter lime field across the upper middle; a faint mottle.
 g.fillStyle=MASK;g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 g.fillStyle='rgb(84,172,70)';g.beginPath();LIME_ZONE.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(s.mottle,0,0,IMG.w,IMG.h);
 // Copper under the mask.
 const q=scratch.getContext('2d')!;q.setTransform(1,0,0,1,0,0);q.clearRect(0,0,W,H);place(q);q.strokeStyle=q.fillStyle='rgb(116,140,90)';copper(q,view,s);
 g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='screen';g.drawImage(scratch,0,0,W,H,0,0,W,H);g.globalCompositeOperation='source-over';place(g);
 // Via drill dimples.
 g.fillStyle='rgba(3,20,9,.92)';g.beginPath();for(let i=0;i<VIAS.length;i+=2)if(within(view,VIAS[i]-1,VIAS[i+1]-1,VIAS[i]+1,VIAS[i+1]+1)){g.moveTo(VIAS[i]+.95,VIAS[i+1]);g.arc(VIAS[i],VIAS[i+1],.95,0,Math.PI*2)}g.fill();
 g.drawImage(s.dark,0,0,IMG.w,IMG.h);
 // Tinned lands and pale discs in the field the machinery covers, and the yellow keying stripe behind the edge connectors.
 for(const [x,y,r] of [[980,216,30],[978,265,32],[932,287,32],[978,316,26]]){g.fillStyle='rgb(74,80,78)';dot(x,y,r)}
 for(const [x,y] of [[1032,246],[1038,284],[1125,268]]){g.fillStyle='rgb(190,186,176)';dot(x,y,11);g.fillStyle='rgb(120,112,96)';dot(x,y,4.5)}
 g.fillStyle='#c79a2c';g.fillRect(1494,24,8,84);g.fillRect(1494,246,8,214);g.fillRect(1494,600,8,150);g.fillRect(1494,1594,7,220);
 // Silkscreen, then the lands over it (a fabricator clips silk off the lands): mask opening, metal, drill.
 g.strokeStyle=g.fillStyle='rgb(224,230,216)';silk(g,view,s);
 g.fillStyle='rgb(3,30,13)';lands(g,view,.55,()=>true);
 g.fillStyle='rgb(208,202,180)';lands(g,view,0,gold=>!gold);g.fillStyle='rgb(212,174,92)';lands(g,view,0,gold=>gold);
 g.fillStyle='rgb(7,10,8)';drills(g,view);
 // Mounting hole with its plated ring.
 g.fillStyle='#b98d3c';dot(30,193,18);g.fillStyle='#2a2414';dot(30,193,13.3);g.fillStyle='#cfc8bb';dot(30,193,9);
 // Dust and lint.
 for(let i=0;i<s.specks.length;i+=4){const x=s.specks[i],y=s.specks[i+1];if(!within(view,x,y,x+2,y+2))continue;g.fillStyle=`rgba(214,222,206,${s.specks[i+3].toFixed(3)})`;g.fillRect(x,y,s.specks[i+2],s.specks[i+2])}
 g.lineWidth=.5;g.lineCap='round';
 for(let i=0;i<s.lint.length;i+=7){const x=s.lint[i],y=s.lint[i+1],a=s.lint[i+2],l=s.lint[i+3];if(!within(view,x-20,y-20,x+20,y+20))continue;g.strokeStyle=`rgba(210,216,204,${s.lint[i+4].toFixed(3)})`;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*l*.5+s.lint[i+5],y+Math.sin(a)*l*.5+s.lint[i+6],x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
}
// The relief sheet for the same window: copper stands a little proud of the mask, lands prouder, silk is matte.
export function paintRelief(g:G,view:Box,kx:number,ky:number){
 const s=prepare();g.setTransform(kx,0,0,ky,-view[0]*kx,-view[1]*ky);
 g.fillStyle=reliefStyle('mask');g.fillRect(view[0],view[1],view[2]-view[0],view[3]-view[1]);
 g.strokeStyle=g.fillStyle=reliefStyle('copper');copper(g,view,s);
 g.strokeStyle=g.fillStyle=reliefStyle('silk');silk(g,view,s);
 g.fillStyle=reliefStyle('pad');lands(g,view,0,()=>true);
 g.fillStyle=reliefStyle('mask');drills(g,view);
}
