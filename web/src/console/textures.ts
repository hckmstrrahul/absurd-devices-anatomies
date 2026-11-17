// Canvas textures for Console: the panel print, the ring and cap decals, and three live displays.
// Everything is drawn here from traced positions; no part of the reference image is used as a texture.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {footprints,PX,LCD,TALL,TOUCH,RUNS,LOOM,DISC,touchOutline,type P2,type Knob,type Cup} from './layout';
import {routes} from './wiring';
import {printMarks,type Mark,type Ink,type IconName} from './print';
import type {Pose} from './model';

type G=CanvasRenderingContext2D;
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return [c,c.getContext('2d')!] as const};
const finish=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};
const FONT='"Helvetica Neue",Helvetica,Arial,sans-serif',COND='"Avenir Next Condensed","DIN Condensed","Helvetica Neue Condensed","Arial Narrow","Roboto Condensed","Liberation Sans Narrow","Helvetica Neue",Arial,sans-serif',MONO='ui-monospace,Menlo,Consolas,monospace';
export const INK={pale:'#dcdcdf',dim:'rgba(220,220,224,.62)',grey:'#7b7b7e',orange:'#ea6a2c',amber:'#f0a030',yellow:'#e3a62c',red:'#d8402c',cyan:'#35c4e0'};
const DEG=Math.PI/180;
// Deck lettering is condensed. `face` is the stack in use and `squeeze` narrows it further when the system has no condensed face.
let face=FONT,squeeze=1,track=0;
function condensed(on:boolean){
 if(!on){face=FONT;squeeze=1;track=0;return}
 const g=document.createElement('canvas').getContext('2d')!;g.font=`700 40px ${COND}`;const a=g.measureText('HAMBURGEFONSTIV').width;g.font=`700 40px ${FONT}`;const b=g.measureText('HAMBURGEFONSTIV').width;
 face=COND;squeeze=a<b*.93?.96:.78;track=.6;
}

type TextOpts={flat?:boolean;spacing?:number;font?:string;align?:CanvasTextAlign;italic?:boolean;stroke?:boolean};
// The deck's lettering reads from the side: a quarter turn clockwise unless `flat`.
function text(g:G,s:string,x:number,y:number,size:number,fill:string,weight=600,o:TextOpts={}){
 g.save();g.translate(x,y);if(!o.flat)g.rotate(Math.PI/2);if(!o.font&&squeeze!==1)g.scale(squeeze,1);
 g.font=`${o.italic?'italic ':''}${weight} ${size}px ${o.font??face}`;g.textAlign=o.align??'center';g.textBaseline='middle';
 (g as unknown as {letterSpacing:string}).letterSpacing=`${(o.spacing??0)+(o.font?0:track*size/14)}px`;
 if(o.stroke){g.strokeStyle=fill;g.lineWidth=Math.max(1,size*.07);g.strokeText(s,0,0)}else{g.fillStyle=fill;g.fillText(s,0,0)}
 g.restore();
}
// Polyline with rounded corners.
function line(g:G,pts:P2[],colour:string,width=2.5,r=0){
 g.beginPath();g.moveTo(...pts[0]);
 for(let i=1;i<pts.length-1;i++)r>0?g.arcTo(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],r):g.lineTo(...pts[i]);
 g.lineTo(...pts[pts.length-1]);g.strokeStyle=colour;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.stroke();
}
function box(g:G,x0:number,y0:number,x1:number,y1:number,r:number,stroke:string|null,width=2,fill:string|CanvasGradient|null=null){
 g.beginPath();g.roundRect(x0,y0,x1-x0,y1-y0,r);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}
}
function ringStroke(g:G,x:number,y:number,r:number,colour:string,width=2,from=0,to=360){g.beginPath();g.arc(x,y,r,from*DEG,to*DEG);g.strokeStyle=colour;g.lineWidth=width;g.stroke()}
function disc(g:G,x:number,y:number,r:number,fill:string){g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=fill;g.fill()}
// Text set round a circle, tops outward. `at` is the clock angle of its middle, degrees clockwise from 3 o'clock.
function arcText(g:G,s:string,r:number,at:number,size:number,fill:string,weight=700,inward=false){
 g.save();g.font=`${weight} ${size}px ${face}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle=fill;
 const widths=[...s].map(ch=>g.measureText(ch).width*squeeze+size*.08),total=widths.reduce((a,b)=>a+b,0);let run=-total/2;
 [...s].forEach((ch,i)=>{const a=at*DEG+(inward?-1:1)*(run+widths[i]/2)/r;run+=widths[i];g.save();g.translate(Math.cos(a)*r,Math.sin(a)*r);g.rotate(a+(inward?-Math.PI/2:Math.PI/2));g.fillText(ch,0,0);g.restore()});
 g.restore();
}
const WORDS=['SCENE','LOADED','ALL','CHANNELS','READY','SYNC','OK','CLOCK','LOCKED','MASTER','LEVEL','SET','PRESS','TO','CONFIRM','LINE','IN','ACTIVE'];
// ── Panel print ───────────────────────────────────────────────────────────
export const PANEL_BASE='#3d3e41';
// Wear: dust specks, short micro-scratches and broad faint smudges. `k` scales the whole effect.
function wear(g:G,r:()=>number,w:number,h:number,k:number){
 for(let i=0;i<26;i++){const x=r()*w,y=r()*h,rad=(60+r()*160),f=g.createRadialGradient(x,y,0,x,y,rad);f.addColorStop(0,`rgba(190,196,206,${.05*k})`);f.addColorStop(.6,`rgba(190,196,206,${.025*k})`);f.addColorStop(1,'rgba(190,196,206,0)');g.save();g.translate(x,y);g.rotate(r()*3);g.scale(1,.35+r()*.4);g.translate(-x,-y);g.fillStyle=f;g.fillRect(x-rad,y-rad,rad*2,rad*2);g.restore()}
 for(let i=0;i<w*h/2600;i++){const a=(.1+r()*.32)*k,s=.5+r()*r()*1.9;g.fillStyle=`rgba(226,226,222,${a})`;g.beginPath();g.arc(r()*w,r()*h,s,0,Math.PI*2);g.fill()}
 for(let i=0;i<w*h/9000;i++){const x=r()*w,y=r()*h,a=r()*Math.PI,len=6+r()*r()*70,bend=(r()-.5)*.3;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a+bend)*len/2,y+Math.sin(a+bend)*len/2,x+Math.cos(a)*len,y+Math.sin(a)*len);g.strokeStyle=`rgba(232,232,236,${(.05+r()*.13)*k})`;g.lineWidth=.5+r()*.5;g.stroke()}
 for(let i=0;i<14;i++){const x=r()*w,y=r()*h;g.strokeStyle=`rgba(210,210,214,${.05*k})`;g.lineWidth=.6;for(let j=0;j<5;j++){g.beginPath();g.arc(x,y,8+j*2.2+r()*2,r()*6,r()*6+1.6);g.stroke()}}
}
// ── Deck print ────────────────────────────────────────────────────────────
// The print is the authored vector list in `print.ts`, drawn here with canvas path calls: every stroke a constant width,
// straight or a true arc, and every label set in one sans face. Nothing is sampled from the reference image.
const INKS:Record<Ink,string>={pale:'#e1e1e4',dim:'#919297',ghost:'#515257',orange:'#ee6c2a',amber:'#e6a92e',hole:'#111113',panel:'#343538'};
// Icons are drawn in a box `s` across, centred on the origin, upright; the caller turns them.
function drawIcon(g:G,name:IconName,s:number,w:number){
 const h=s/2,path=(pts:P2[],close=false)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath();g.stroke()};
 g.lineWidth=w;g.lineCap='round';g.lineJoin='round';
 switch(name){
  case 'warning':path([[0,-h*.86],[h*.95,h*.78],[-h*.95,h*.78]],true);path([[0,-h*.28],[0,h*.22]]);g.beginPath();g.arc(0,h*.5,w*.62,0,Math.PI*2);g.fill();break;
  case 'bars':for(let i=0;i<4;i++){const bw=s*.14,x=-h*.78+i*(s*.78-bw)/3,top=h*.7-(i+1)*s*.19;g.fillRect(x,top,bw,h*.7-top)}path([[-h*.9,h*.7+w],[h*.9,h*.7+w]]);break;
  case 'power':g.beginPath();g.arc(0,h*.08,h*.68,-Math.PI/2+.62,Math.PI*1.5-.62);g.stroke();path([[0,-h*.86],[0,-h*.05]]);break;
  case 'arrow':path([[-h*.8,0],[h*.8,0]]);path([[h*.3,-h*.5],[h*.8,0],[h*.3,h*.5]]);break;
  case 'speaker':path([[-h*.8,-h*.26],[-h*.42,-h*.26],[h*.02,-h*.66],[h*.02,h*.66],[-h*.42,h*.26],[-h*.8,h*.26]],true);for(const r of [h*.4,h*.74]){g.beginPath();g.arc(h*.02,0,r,-.72,.72);g.stroke()}break;
  case 'phase':g.beginPath();g.arc(0,0,h*.72,0,Math.PI*2);g.stroke();path([[-h*.5,h*.95],[h*.5,-h*.95]]);break;
  case 'sine':g.beginPath();g.moveTo(-h*.82,0);g.bezierCurveTo(-h*.5,-h*1.05,-h*.32,-h*1.05,0,0);g.bezierCurveTo(h*.32,h*1.05,h*.5,h*1.05,h*.82,0);g.stroke();break;
  case 'square':path([[-h*.82,h*.42],[-h*.5,h*.42],[-h*.5,-h*.42],[0,-h*.42],[0,h*.42],[h*.5,h*.42],[h*.5,-h*.42],[h*.82,-h*.42]]);break;
  case 'play':path([[-h*.5,-h*.7],[h*.7,0],[-h*.5,h*.7]],true);break;
  case 'drop':g.beginPath();g.moveTo(0,-h*.86);g.bezierCurveTo(h*.2,-h*.4,h*.62,-h*.05,h*.62,h*.3);g.arc(0,h*.3,h*.62,0,Math.PI);g.bezierCurveTo(-h*.62,-h*.05,-h*.2,-h*.4,0,-h*.86);g.closePath();g.stroke();break;
 }
}
export function drawMarks(g:G,marks:Mark[]){
 for(const m of marks){
  const ink=INKS[m.c];g.strokeStyle=g.fillStyle=ink;g.setLineDash([]);
  switch(m.k){
   case 'line':g.beginPath();g.moveTo(...m.pts[0]);for(let i=1;i<m.pts.length-1;i++)m.round?g.arcTo(m.pts[i][0],m.pts[i][1],m.pts[i+1][0],m.pts[i+1][1],m.round):g.lineTo(...m.pts[i]);g.lineTo(...m.pts[m.pts.length-1]);
    g.lineWidth=m.w;g.lineCap=m.butt?'butt':'round';g.lineJoin='round';g.stroke();break;
   case 'box':g.beginPath();g.roundRect(m.x0,m.y0,m.x1-m.x0,m.y1-m.y0,m.r);if(m.fill)g.fill();else{g.lineWidth=m.w;g.stroke()}break;
   case 'circle':g.beginPath();g.arc(m.x,m.y,m.r,0,Math.PI*2);if(m.fill)g.fill();else{g.lineWidth=m.w;g.stroke()}break;
   case 'arc':g.beginPath();g.arc(m.x,m.y,m.r,m.from*DEG,m.to*DEG);g.lineWidth=m.w;g.lineCap='round';g.stroke();break;
   case 'ticks':g.beginPath();for(const a of m.at){const c=Math.cos(a*DEG),s=Math.sin(a*DEG);g.moveTo(m.x+c*m.r0,m.y+s*m.r0);g.lineTo(m.x+c*m.r1,m.y+s*m.r1)}g.lineWidth=m.w;g.lineCap='butt';g.stroke();break;
   case 'text':g.save();g.translate(m.x,m.y);g.rotate(m.rot*DEG);g.font=`${m.weight} ${m.size}px ${FONT}`;g.textAlign='center';g.textBaseline='alphabetic';
    (g as unknown as {letterSpacing:string}).letterSpacing=`${(m.size*.05).toFixed(2)}px`;g.fillText(m.s,m.size*.025,m.size*.36);g.restore();break;
   case 'icon':g.save();g.translate(m.x,m.y);g.rotate(m.rot*DEG);drawIcon(g,m.name,m.size,m.w);g.restore();break;
  }
 }
}
// Matte charcoal sheet with a faint blue-grey cast, the same everywhere (the piece is lit evenly): broad mottling so it does
// not read as a flat fill, the fine grain of the moulding, and a little wear. Drawn in reference pixels.
let grain:HTMLCanvasElement|null=null;
export function sheetBase(g:G,x0:number,y0:number,w:number,h:number,tone:string,k:number){
 g.fillStyle=tone;g.fillRect(x0-40,y0-40,w+80,h+80);
 const r=rng(303);
 for(let i=0;i<60;i++){const x=x0+r()*w,y=y0+r()*h,rad=120+r()*260,f=g.createRadialGradient(x,y,0,x,y,rad),light=r()<.5;f.addColorStop(0,light?'rgba(150,160,175,.04)':'rgba(0,0,0,.05)');f.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=f;g.fillRect(x-rad,y-rad,rad*2,rad*2)}
 if(!grain){const [c,n]=canvas(256,256),q=rng(9);for(let i=0;i<9000;i++){n.fillStyle=q()<.5?'rgba(255,255,255,.03)':'rgba(0,0,0,.055)';n.fillRect(Math.floor(q()*128)*2,Math.floor(q()*128)*2,2,2)}grain=c}
 g.save();g.setTransform(1,0,0,1,0,0);g.fillStyle=g.createPattern(grain,'repeat')!;g.fillRect(0,0,g.canvas.width,g.canvas.height);g.restore();
 g.save();g.translate(x0,y0);wear(g,rng(55),w,h,k);g.restore();
}
// The deck is printed at 25 px/mm so it stays crisp with the camera right in (12.5 px/mm on a phone). One canvas cannot hold
// that, so it is cut into 2 × 3 tiles; each carries a gutter of its neighbours' print so mipmapping and anisotropic
// filtering see the same pixels on both sides of a seam.
export type DeckTile={texture:THREE.CanvasTexture;x0:number;y0:number;x1:number;y1:number};
export const DECK_SCALE=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches?1.25:2.5;
export function deckTiles():DeckTile[]{
 const S=DECK_SCALE(),cols=2,rows=3,gut=16,tiles:DeckTile[]=[],marks=printMarks().filter(m=>!m.on);
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x0=Math.round(PX.w*i/cols),x1=Math.round(PX.w*(i+1)/cols),y0=Math.round(PX.h*j/rows),y1=Math.round(PX.h*(j+1)/rows),w=Math.round((x1-x0)*S),h=Math.round((y1-y0)*S);
  const [c,g]=canvas(w+gut*2,h+gut*2);g.setTransform(S,0,0,S,gut-x0*S,gut-y0*S);
  sheetBase(g,0,0,PX.w,PX.h,PANEL_BASE,.3);drawMarks(g,marks);
  const texture=finish(c);texture.anisotropy=16;texture.repeat.set(w/(w+gut*2),h/(h+gut*2));texture.offset.set(gut/(w+gut*2),gut/(h+gut*2));
  // Once the tile is on the graphics card its canvas can go.
  texture.onUpdate=()=>{c.width=c.height=1;texture.onUpdate=null as unknown as ()=>void};
  tiles.push({texture,x0,y0,x1,y1});
 }
 return tiles;
}
// Soft contact shadows, on their own clear sheet so they can fade as the parts lift away in the exploded view: a tight line
// under each part and a broader shadow that grows with the part's height, leaning a little down and to the left as in the image.
export function shadowTexture(){
 const S=2048/PX.h,[c,g]=canvas(PX.w*S,2048);g.scale(S,S);
 const cast=(draw:()=>void,blur:number,alpha:number,dx:number,dy:number)=>{g.save();g.shadowColor=`rgba(0,0,0,${alpha})`;g.shadowBlur=blur*S;g.shadowOffsetX=(6000+dx)*S;g.shadowOffsetY=dy*S;g.translate(-6000,0);g.fillStyle=g.strokeStyle='#000';draw();g.restore()};
 for(const f of footprints.filter(f=>!f.on&&f.y0===0&&f.kind!=='rail'&&f.kind!=='strip')){
  const shape=()=>{g.beginPath();if(f.r!==undefined)g.arc(f.x,f.y,f.r,0,Math.PI*2);else g.roundRect(f.x-f.w!/2,f.y-f.h!/2,f.w!,f.h!,8);g.fill()},tall=Math.min(f.y1,14);
  cast(shape,6,.55,0,0);cast(shape,10+tall*1.6,.36+tall*.014,-3-f.y1*.5,3+f.y1*.5);
 }
 const under=(pts:P2[],w:number,a:number)=>cast(()=>line(g,pts,'#000',w),7,a,-3,3);
 for(const run of RUNS)under(run.pts,run.r*2,.5);for(const route of routes())under(route.pts,route.lead.r*2,.42);
 under([[1094,LOOM.y0],[1094,LOOM.y1]],84,.5);
 return finish(c);
}
// Top of the raised sub-panel disc: its own charcoal, with the part of the print list that belongs on it.
export function discTexture(){
 const N=1024,[c,g]=canvas(N,N),k=N/(DISC.r*2);g.setTransform(k,0,0,k,-(DISC.x-DISC.r)*k,-(DISC.y-DISC.r)*k);
 sheetBase(g,DISC.x-DISC.r,DISC.y-DISC.r,DISC.r*2,DISC.r*2,'#434447',.3);drawMarks(g,printMarks().filter(m=>m.on==='disc'));
 return finish(c);
}
// Polished metal under soft light: four broad light-and-dark bands round the section (so whichever way a tube or a turned
// part faces, a soft highlight runs along its top), with faint drawn-wire streaks. `along` puts the bands across v, for tubes.
export function metalTexture(tones:[string,string,string],along=false,seed=5){
 const W=256,H=64,[c,g]=canvas(along?H:W,along?W:H);if(along){g.translate(H,0);g.rotate(Math.PI/2)}
 const [dark,mid,light]=tones,f=g.createLinearGradient(0,0,W,0);
 for(let k=0;k<4;k++){const u=k/4;f.addColorStop(u,light);f.addColorStop(u+.035,mid);f.addColorStop(u+.115,dark);f.addColorStop(u+.15,dark);f.addColorStop(u+.215,mid)}
 f.addColorStop(1,light);g.fillStyle=f;g.fillRect(0,0,W,H);
 const r=rng(seed);for(let i=0;i<90;i++){g.fillStyle=`rgba(${r()<.5?'255,255,255':'0,0,0'},${.03+r()*.06})`;g.fillRect(r()*W,r()*H,1+r()*3,2+r()*H*.6)}
 for(let i=0;i<50;i++){g.fillStyle=`rgba(235,235,238,${.1+r()*.2})`;g.fillRect(r()*W,r()*H,.8,.8)}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Ribs for a knob's skirt: one light-and-dark rib per repeat, used as colour and as height. Mipmapped, so at a distance the
// ribs melt into an even tone instead of shimmering.
export function ribTexture(){
 const [c,g]=canvas(32,8),f=g.createLinearGradient(0,0,32,0);
 ([[0,'#3a3a3c'],[.3,'#e8e8ea'],[.5,'#ffffff'],[.62,'#8a8a8c'],[.8,'#3a3a3c'],[1,'#3a3a3c']] as [number,string][]).forEach(([t,col])=>f.addColorStop(t,col));
 g.fillStyle=f;g.fillRect(0,0,32,8);const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Shading for a domed cap, mapped up its profile: a shaded flank, then a broad soft highlight over the crown.
export function domeTexture(){
 const [c,g]=canvas(8,128),f=g.createLinearGradient(0,128,0,0);
 ([[0,'#b9a78c'],[.3,'#d8ccb8'],[.52,'#ece6da'],[.7,'#f8f5ef'],[.86,'#ffffff'],[1,'#fdfcf8']] as [number,string][]).forEach(([t,col])=>f.addColorStop(t,col));
 g.fillStyle=f;g.fillRect(0,0,8,128);return finish(c);
}
// Top of the silver block: bead-blasted metal with its seam, the inset pill key and its glyph, and light wear.
export function blockTexture(){
 const [c,g]=canvas(512,512),r=rng(17);g.fillStyle='#8e8c89';g.fillRect(0,0,512,512);
 const soft=g.createLinearGradient(0,0,0,512);soft.addColorStop(0,'rgba(255,255,255,.1)');soft.addColorStop(.42,'rgba(255,255,255,.02)');soft.addColorStop(.44,'rgba(0,0,0,.1)');soft.addColorStop(1,'rgba(0,0,0,.02)');g.fillStyle=soft;g.fillRect(0,0,512,512);
 for(let i=0;i<9000;i++){g.fillStyle=r()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';g.fillRect(r()*512,r()*512,1,1)}
 line(g,[[0,222],[512,222]],'rgba(40,40,42,.55)',2.5);line(g,[[0,226],[512,226]],'rgba(255,255,255,.22)',1.5);
 box(g,246,300,420,372,36,'rgba(40,40,42,.8)',5,'#9a9895');box(g,252,306,414,366,30,'rgba(255,255,255,.25)',2);
 line(g,[[300,348],[300,324],[322,324]],'#3a3a3c',6);line(g,[[352,324],[374,324],[374,348]],'#3a3a3c',6);
 box(g,6,6,506,506,58,'rgba(255,255,255,.2)',5);wear(g,r,512,512,1.1);
 return finish(c);
}

// ── Ring and cap decals ───────────────────────────────────────────────────
// A square canvas spanning the bezel, drawn in reference pixels about the knob centre.
function ringCanvas(R:number,size=768){const [c,g]=canvas(size,size);g.translate(size/2,size/2);g.scale(size/(2*R),size/(2*R));return [c,g] as const}
export function knobRing(k:Knob){
 const [c,g]=ringCanvas(k.r,1024);condensed(true);
 disc(g,0,0,k.r,'#17171a');
 if(k.ring==='red'){
  const red=g.createLinearGradient(-k.r,-k.r,k.r,k.r);red.addColorStop(0,'#8a1d18');red.addColorStop(.5,'#b52a22');red.addColorStop(1,'#cf4032');
  disc(g,0,0,k.r-3,'#2a2a2c');g.beginPath();g.arc(0,0,k.r-8,0,Math.PI*2);g.arc(0,0,k.skirt+2,0,Math.PI*2,true);g.fillStyle=red;g.fill('evenodd');
  // The silver sector from four to half past six, with red bars on it.
  g.beginPath();g.arc(0,0,k.r-8,22*DEG,100*DEG);g.arc(0,0,k.skirt+2,100*DEG,22*DEG,true);g.closePath();g.fillStyle='#a3a09d';g.fill();
  for(const a of [38,72,96]){g.save();g.rotate(a*DEG);g.fillStyle='#c8382a';g.fillRect(k.skirt+12,-3,26,6);g.restore()}
  // Cuts that break the ring into segments, each with a lit edge.
  for(const a of [112,141,166,197,222,251,276,305,332,357]){g.save();g.rotate(a*DEG);g.fillStyle='#1a1213';g.fillRect(k.skirt+2,-1.6,k.r-10-k.skirt,3.2);g.fillStyle='rgba(255,170,150,.35)';g.fillRect(k.skirt+2,1.6,k.r-10-k.skirt,.9);g.restore()}
  ringStroke(g,0,0,k.r-8,'rgba(255,190,170,.3)',1.2);ringStroke(g,0,0,k.skirt+2,'rgba(0,0,0,.5)',2);
  for(let i=0;i<9;i++){const a=120+i*30;g.save();g.rotate(a*DEG);g.fillStyle='rgba(235,225,222,.85)';if(i%2)g.fillRect(k.skirt+14,-1.2,16,2.4);g.restore();if(!(i%2))arcText(g,['MIN','LOW','MID','HIGH','MAX'][i/2],k.skirt+22,a,11,'rgba(235,225,222,.85)')}
 }else if(k.ring==='scale'){
  for(let a=0;a<360;a+=6){g.save();g.rotate(a*DEG);g.fillStyle=a===312?INK.red:'rgba(225,225,228,.7)';const long=a%30===0;g.fillRect(k.skirt+(long?10:16),-1,long?16:8,2);g.restore()}
  for(let a=0;a<360;a+=45)arcText(g,String(a?a:180),k.r-14,a,10,'rgba(225,225,228,.8)',600);
  ringStroke(g,0,0,k.skirt+5,INK.orange,3,10,150);g.save();g.setLineDash([1.5,2.5]);ringStroke(g,0,0,k.skirt+9,INK.orange,5,20,140);g.restore();
 }else if(k.ring==='plain'){
  disc(g,0,0,k.r,'#0e0e10');['MID BAND','LOW CUT','VOL','EQ','TRIM'].forEach((s,i)=>arcText(g,s,k.r-9,[118,62,330,292,205][i],10,'rgba(225,225,228,.8)',700,i<2));
  for(const a of [0,180,270,90])line(g,[[Math.cos(a*DEG)*(k.r-16),Math.sin(a*DEG)*(k.r-16)],[Math.cos(a*DEG)*(k.r-4),Math.sin(a*DEG)*(k.r-4)]],INK.pale,2);
 }else if(k.ring==='segments'){
  disc(g,0,0,k.r,'#141416');ringStroke(g,0,0,k.r-3,'#2c2c2f',2);arcText(g,'MASTER OUTPUT LEVEL',k.r-9,70,9,'rgba(160,160,164,.55)',600,true);
 }else if(k.ring==='ticks'){
  disc(g,0,0,k.r,'#161618');ringStroke(g,0,0,k.r-4,'#2e2e31',2.5);ringStroke(g,0,0,k.skirt+6,'#0c0c0d',6);
  g.save();g.setLineDash([2,3]);ringStroke(g,0,0,k.r-12,INK.orange,3,70,130);g.restore();
 }else if(k.ring==='pills'){
  disc(g,0,0,k.r,'#1b1b1d');ringStroke(g,0,0,k.r-2,'#3a3a3d',2);ringStroke(g,0,0,k.r-16,'#101012',2);ringStroke(g,0,0,k.skirt+2,'#4a4a4d',5);
  for(let a=10;a<360;a+=36)ringStroke(g,Math.cos(a*DEG)*(k.r-9),Math.sin(a*DEG)*(k.r-9),3,'rgba(210,210,214,.7)',1.4);
 }else{
  disc(g,0,0,k.r,'#58585a');ringStroke(g,0,0,k.r-3,'#3a3a3c',3);ringStroke(g,0,0,k.r-22,'rgba(235,235,238,.5)',1.5);ringStroke(g,0,0,k.r-40,'#2a2a2c',14);
  for(let a=15;a<360;a+=60)disc(g,Math.cos(a*DEG)*(k.r-12),Math.sin(a*DEG)*(k.r-12),3.5,'#bdbdbf');
  g.fillStyle=INK.amber;g.fillRect(-4,k.r-22,12,8);
 }
 wear(g,rng(k.x),k.r*2,k.r*2,.5);condensed(false);
 return finish(c);
}
// Satin cap top: a faint bright rim, and a side-reading logo or an index line so its turning shows.
// Returns the colour map and a height map: the lettering is sunk into the cap, so the key light picks out its edges.
export function capTexture(label:string,tone=0x58){
 const [c,g]=canvas(512,512),[bc,bg]=canvas(512,512),t=(d:number)=>`rgb(${tone+d},${tone+d},${tone+d+1})`;
 g.fillStyle=t(0);g.fillRect(0,0,512,512);g.translate(256,256);bg.fillStyle='#b0b0b0';bg.fillRect(0,0,512,512);bg.translate(256,256);
 // Soft radial sheen of a satin-turned face: two bright lobes and two dark ones, plus faint turning rings.
 const sheen=g.createConicGradient(-2.2,0,0);
 ([[0,.07],[.12,.02],[.25,-.06],[.38,.01],[.5,.05],[.62,.01],[.75,-.06],[.88,.02],[1,.07]] as [number,number][]).forEach(([p,a])=>sheen.addColorStop(p,a>0?`rgba(255,255,255,${a})`:`rgba(0,0,0,${-a})`));
 disc(g,0,0,256,sheen as unknown as string);
 {const soft=g.createRadialGradient(-60,-70,10,0,0,256);soft.addColorStop(0,'rgba(255,255,255,.1)');soft.addColorStop(.55,'rgba(255,255,255,0)');soft.addColorStop(1,'rgba(0,0,0,.16)');disc(g,0,0,256,soft as unknown as string)}
 g.save();g.translate(-256,-256);wear(g,rng(label.length*31+tone),512,512,.55);g.restore();
 for(let r=12;r<214;r+=5)ringStroke(g,0,0,r,`rgba(255,255,255,${.012+(r%3)*.008})`,1);
 ringStroke(g,0,0,249,'rgba(255,255,255,.36)',6);ringStroke(g,0,0,220,'rgba(0,0,0,.46)',4);ringStroke(g,0,0,215,'rgba(255,255,255,.14)',2.5);
 ringStroke(bg,0,0,220,'#606060',6);ringStroke(bg,0,0,250,'#ffffff',8);
 // Draw every mark on both maps: dark ink with a light lower edge on the colour, a recess on the height.
 const mark=(draw:(k:G,ink:string)=>void,ink:string)=>{g.save();g.translate(1.6,2.2);draw(g,'rgba(255,255,255,.2)');g.restore();draw(g,ink);draw(bg,'#202020')};
 if(label==='Lotner')mark((k,ink)=>{text(k,'Lotner',10,8,118,ink,800,{italic:true,spacing:-4});k.fillStyle=ink;k.fillRect(86,-94,12,80)},'#0b0b0d');
 else if(label==='Glam')mark((k,ink)=>{text(k,'Glam',26,0,130,ink,800,{italic:true,spacing:-5});text(k,'CORE',-58,18,40,ink,700,{italic:true})},'#141416');
 else if(label)mark((k,ink)=>text(k,label,26,0,46,ink,800),'rgba(16,16,18,.75)');
 else mark((k,ink)=>{k.fillStyle=ink;k.fillRect(-4,-200,8,46)},'rgba(16,16,18,.6)');
 const bump=new THREE.CanvasTexture(bc);bump.anisotropy=4;
 return {map:finish(c),bump};
}
// Cup dial skirts: white legends round a black cone, with a pointer.
export function cupRing(cup:Cup){
 const [c,g]=ringCanvas(cup.r,768);condensed(true);
 disc(g,0,0,cup.r,cup.style==='dish'?'#0b0b0c':'#101012');
 if(cup.style==='dish'){
  ringStroke(g,0,0,cup.r-5,'rgba(230,230,233,.5)',1.2);cup.words.forEach((s,i)=>arcText(g,s,cup.r-14,-60+i*38,9,'rgba(235,235,238,.9)',700,i>2));
  for(let a=0;a<360;a+=20)line(g,[[Math.cos(a*DEG)*(cup.r-24),Math.sin(a*DEG)*(cup.r-24)],[Math.cos(a*DEG)*(cup.r-19),Math.sin(a*DEG)*(cup.r-19)]],'rgba(235,235,238,.45)',1.2);
  // The bright conic streak on the cone's left flank.
  const streak=g.createConicGradient(Math.PI,0,0);streak.addColorStop(0,'rgba(255,255,255,.2)');streak.addColorStop(.04,'rgba(255,255,255,0)');streak.addColorStop(.96,'rgba(255,255,255,0)');streak.addColorStop(1,'rgba(255,255,255,.2)');
  g.beginPath();g.arc(0,0,cup.r-26,0,Math.PI*2);g.arc(0,0,cup.hole,0,Math.PI*2,true);g.fillStyle=streak;g.fill('evenodd');
 }else{
  const mid=(cup.r+cup.collar)/2+2;cup.words.forEach((s,i)=>{const a=[-62,-2,92,168][i%4];arcText(g,s,mid,a,s.length>2?20:24,'#ededf0',700,a>20&&a<160)});
  g.beginPath();g.moveTo(Math.cos(-38*DEG)*(cup.collar+6),Math.sin(-38*DEG)*(cup.collar+6));g.lineTo(Math.cos(-30*DEG)*(cup.r-8),Math.sin(-30*DEG)*(cup.r-8));g.lineTo(Math.cos(-42*DEG)*(cup.r-10),Math.sin(-42*DEG)*(cup.r-10));g.closePath();g.fillStyle='#050506';g.fill();g.strokeStyle='rgba(235,235,238,.6)';g.lineWidth=1.2;g.stroke();
  ringStroke(g,0,0,cup.r-2,'rgba(255,255,255,.14)',2);
  const sheen=g.createConicGradient(.6,0,0);sheen.addColorStop(0,'rgba(255,255,255,.1)');sheen.addColorStop(.05,'rgba(255,255,255,0)');sheen.addColorStop(.95,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(255,255,255,.1)');
  g.beginPath();g.arc(0,0,cup.r,0,Math.PI*2);g.fillStyle=sheen;g.fill();
 }
 wear(g,rng(cup.y),cup.r*2,cup.r*2,.45);condensed(false);
 return finish(c);
}
// Brushed cone: the bright and dark wedges a turned metal cone shows under a soft key.
export function conicTexture(){
 const [c,g]=canvas(256,256),k=g.createConicGradient(-.5,128,128);
 [[0,'#e2e0dc'],[.07,'#8f8c88'],[.2,'#3a3837'],[.36,'#6e6b68'],[.5,'#cfcdc9'],[.58,'#807d7a'],[.72,'#2c2b2a'],[.9,'#75726f'],[1,'#e2e0dc']].forEach(([t,col])=>k.addColorStop(t as number,col as string));
 g.fillStyle=k;g.fillRect(0,0,256,256);disc(g,128,128,3,'#55514e');return finish(c);
}
export function gaugeFace(){
 const [c,g]=canvas(256,256);g.translate(128,128);disc(g,0,0,128,'#0d0d0f');ringStroke(g,0,0,118,'#3a3a3d',4);
 for(let a=140;a<=400;a+=20)line(g,[[Math.cos(a*DEG)*84,Math.sin(a*DEG)*84],[Math.cos(a*DEG)*102,Math.sin(a*DEG)*102]],'#e6e6e9',5);
 ringStroke(g,0,0,96,INK.orange,7,300,400);return finish(c);
}

// ── Live displays. Each redraws only when what it shows changes ───────────
type Live={texture:THREE.CanvasTexture;draw(p:Pose):void};
function live(w:number,h:number,scale:number,ox:number,oy:number,key:(p:Pose)=>string,paint:(g:G,p:Pose)=>void):Live{
 const [c,g]=canvas(w*scale,h*scale),texture=finish(c);let last='';
 return {texture,draw(p){const k=key(p);if(k===last)return;last=k;g.setTransform(scale,0,0,scale,-ox*scale,-oy*scale);paint(g,p);texture.needsUpdate=true}};
}
const DARK='#3a1a08';
// Upper-left LCD. The canvas covers the whole bezel face: orange glass, tags, keys and the maker's name.
export function makeLcd(){
 const [x0,y0,x1,y1]=LCD.box,[sx0,sy0,sx1,sy1]=LCD.screen;
 return live(x1-x0,y1-y0,2.5,x0,y0,p=>[p.on,p.count,p.level,p.beat%2].join('|'),(g,p)=>{
  g.fillStyle='#0c0c0d';g.fillRect(x0,y0,x1-x0,y1-y0);box(g,x0+26,y0+38,x1-22,y1-28,22,'rgba(255,255,255,.07)',2,'#111113');
  const glass=g.createLinearGradient(sx0,sy0,sx1,sy1);glass.addColorStop(0,'#f07a28');glass.addColorStop(.55,'#ee7424');glass.addColorStop(1,'#e06a20');
  box(g,sx0,sy0,sx1,sy1,10,null,0,glass);
  {const cx=(sx0+sx1)/2,cy=(sy0+sy1)/2,glow=g.createRadialGradient(cx,cy,20,cx,cy,210);glow.addColorStop(0,'rgba(255,190,110,.28)');glow.addColorStop(.6,'rgba(255,150,60,.08)');glow.addColorStop(1,'rgba(90,30,0,.3)');box(g,sx0,sy0,sx1,sy1,10,'rgba(40,14,2,.85)',3,glow)}
  text(g,'TEMPO',620,540,45,DARK,800,{spacing:-2});text(g,String(p.count),620,665,50,DARK,800,{spacing:-1});
  text(g,'Volume',558,548,35,DARK,300);text(g,String(p.level),558,665,45,DARK,800);
  box(g,472,480,504,506,2,DARK,3);ringStroke(g,490,493,6,DARK,3);text(g,'<',490,548,38,DARK,300);ringStroke(g,493,598,14,DARK,3);text(g,'in',493,598,13,DARK,700);box(g,470,598,484,616,1,DARK,3);
  text(g,p.on&&p.beat%2?'▷':'▶',492,640,20,DARK,700);text(g,'4/4',492,680,30,DARK,300);
  // Tags down the right of the bezel.
  box(g,688,462,716,496,3,null,0,'#e9e9ea');text(g,'3D',702,479,17,'#111',800);
  ([[512,548,'SYNC'],[556,662,'QUANTIZE'],[672,746,'RECORD']] as [number,number,string][]).forEach(([a,b2,s],i)=>{box(g,690,a,716,b2,3,null,0,p.on&&p.beat%3===i?'#ffa04a':'#e8742a');text(g,s,703,(a+b2)/2,11,DARK,800)});
  text(g,'Oxane',393,593,26,'#e9e9ea',800);box(g,545,409,581,425,8,'#77777a',2,'#b9b9bb');box(g,547,744,588,764,10,'#b05a12',2,p.on&&p.beat%2?'#ffb23a':'#f39a22');box(g,560,751,576,756,2,null,0,DARK);
  line(g,[[x0+10,y1-10],[x1-60,y1-10]],'#8f8f91',7);for(const x of [498,566,690])line(g,[[x,y1-22],[x,y1-12]],'#8f8f91',3);
 });
}
// Lower-left display: an orange digit column beside a black field.
const DIGITS=['◈','3','7','2','1','A','3','M','3','M','3'],DIGIT_Y=[1778,1850,1922,1984,2086,2150,2215,2285,2352,2420,2490];
export function makeTall(){
 const [x0,y0,x1,y1]=TALL.box;
 return live(x1-x0,y1-y0,2,x0,y0,p=>[p.on,p.scroll,p.button,p.level].join('|'),(g,p)=>{
  g.fillStyle='#101011';g.fillRect(x0,y0,x1-x0,y1-y0);box(g,404,1712,726,2544,14,'rgba(255,255,255,.06)',2,'#070505');
  const orange=g.createLinearGradient(0,1716,0,2540);orange.addColorStop(0,'#fb8a22');orange.addColorStop(.6,'#fd8420');orange.addColorStop(1,'#f8742c');
  g.fillStyle=orange;g.fillRect(410,1734,90,802);
  {const glow=g.createLinearGradient(410,0,500,0);glow.addColorStop(0,'rgba(110,40,0,.28)');glow.addColorStop(.35,'rgba(255,200,120,.2)');glow.addColorStop(.75,'rgba(255,200,120,.12)');glow.addColorStop(1,'rgba(110,40,0,.22)');g.fillStyle=glow;g.fillRect(410,1734,90,802)}g.fillRect(410,2514,290,22);g.fillRect(664,1740,15,776);g.fillRect(683,1746,8,770);
  box(g,410,1720,452,1736,2,null,0,'#fb8a22');text(g,'CH',430,1728,13,'#1a0c04',800,{flat:true});box(g,476,1722,498,1736,1,null,0,'#8a2a14');text(g,'A',487,1729,10,'#f0b080',700,{flat:true});
  g.fillStyle='#7c1f16';g.fillRect(500,1722,222,15);for(let i=0;i<9;i++){g.fillStyle='rgba(255,220,200,.75)';g.fillRect(508+i*23,1726,4+(i*7)%11,7)}
  line(g,[[500,2055],[664,2055]],'#fb8a22',2.5);line(g,[[654,2036],[664,2036]],'#fb8a22',2);
  DIGITS.forEach((_,i)=>{const s=DIGITS[(i+(p.on?p.scroll:0))%DIGITS.length];text(g,s,456,DIGIT_Y[i],/[0-9]/.test(s)?40:26,'#1a0c04',800)});
  text(g,'SEQ',552,2176,30,'#fb8a22',800);text(g,'GATES',554,2246,17,'#fb8a22',800);text(g,'RUN',552,2316,30,'#fb8a22',800);
  // While playing, a level trace fills the black field; at rest it is empty, as in the image.
  if(p.on)for(let i=0;i<14;i++){const v=.5+.5*Math.sin(i*.9+p.button*.7),len=18+v*110*(.4+p.flow*.6);g.fillStyle=i===p.button?'#ffb04a':'rgba(251,138,34,.55)';g.fillRect(650-len,1764+i*20,len,11)}
  for(const [y,col] of [[1752,'#fb8a22'],[1772,'#c8c8ca'],[1790,'#c8c8ca']] as [number,string][])box(g,700,y,712,y+10,1,col,1.5,y===1752?col:null);
  text(g,'31 | 8 | 3',708,2500,13,'#fb8a22',700);line(g,[[696,1810],[696,2470]],'rgba(251,138,34,.6)',1.5);
  text(g,'STEP SEQUENCER',606,2565,13,'#c9c9cb',700,{flat:true,spacing:1});
 });
}
// Right-centre touch panel: orange outline, a dark field fading to blue-grey, a message card and a chevron tab.
export function makeTouch(){
 const [x0,y0,x1,y1]=TOUCH.box,[sx0,sy0,sx1,sy1]=TOUCH.screen,outline=touchOutline();
 return live(x1-x0,y1-y0,1.7,x0,y0,p=>[p.on,p.step,p.beat].join('|'),(g,p)=>{
  const fade=g.createLinearGradient(0,y0,0,y1);
  ([[0,'#191b22'],[.4,'#1f222a'],[.56,'#3d444f'],[.7,'#667380'],[.84,'#8d9eab'],[1,'#a9b9c4']] as [number,string][]).forEach(([t,col])=>fade.addColorStop(t,col));
  g.fillStyle=fade;g.fillRect(x0,y0,x1-x0,y1-y0);
  // Dark margin down the left, and the inset screen.
  const margin=g.createLinearGradient(0,1060,0,1700);margin.addColorStop(0,'rgba(18,18,22,1)');margin.addColorStop(.6,'rgba(18,18,22,.7)');margin.addColorStop(1,'rgba(18,18,22,0)');g.fillStyle=margin;g.fillRect(x0,1060,128,640);
  const inner=g.createLinearGradient(0,sy0,0,sy1);([[0,'#16181e'],[.42,'#1e2129'],[.6,'#424a55'],[.78,'#74838f'],[1,'#9aacb8']] as [number,string][]).forEach(([t,col])=>inner.addColorStop(t,col));
  box(g,sx0-22,sy0-26,sx1+34,sy1+16,54,null,0,'rgba(70,100,120,.2)');box(g,sx0,sy0,sx1,sy1,34,'rgba(120,150,170,.3)',2,inner);
  line(g,[[1610,1100],[1610,1790]],'rgba(255,255,255,.08)',1.5);
  // Outline: orange down the left and along the foot, red-orange up the right.
  g.save();g.beginPath();outline.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();
  const foot=g.createLinearGradient(x0,0,x1,0);foot.addColorStop(0,'#f58a48');foot.addColorStop(.35,'#ffdf9e');foot.addColorStop(.75,'#ffd690');foot.addColorStop(1,'#ff9060');
  g.fillStyle='#f1753f';g.fillRect(x0,1060,20,800);g.fillStyle=foot;g.fillRect(x0,y1-20,x1-x0,20);g.fillStyle='#ff7559';g.fillRect(x1-17,y0,17,y1-y0);g.restore();
  // Header on the tab.
  box(g,1563,860,1668,886,13,null,0,'#27344a');line(g,[[1590,866],[1643,866]],INK.cyan,3);box(g,1611,872,1631,880,1,null,0,p.on&&p.step%2?'#8feaff':INK.cyan);disc(g,1575,873,5,'#0c0c10');disc(g,1657,873,5,'#0c0c10');
  ringStroke(g,1545,873,8,INK.orange,3);line(g,[[1537,880],[1528,892],[1528,1040]],'rgba(220,220,224,.6)',2,6);
  text(g,'PULSE',1697,968,27,'#f0f0f2',800,{italic:true,spacing:-1});text(g,'STATE',1671,976,27,'#f0f0f2',800,{italic:true,spacing:-1});
  text(g,'Mains',1210,1238,27,'#f0f0f2',700);g.fillStyle='#f0f0f2';g.beginPath();g.moveTo(1216,1130);g.lineTo(1228,1150);g.lineTo(1204,1150);g.closePath();g.fill();box(g,1166,1172,1182,1190,2,'#f0f0f2',2);ringStroke(g,1192,1166,7,'#f0f0f2',2.5);
  // Screen contents.
  ringStroke(g,1648,1086,20,INK.cyan,5,40,320);ringStroke(g,1648,1086,9,INK.cyan,2.5);
  text(g,'Transport',1651,1214,27,'#e6e6ea',300);text(g,'3 in queue',1624,1156,13,'#c8c8cc',400);text(g,'⌂',1588,1125,22,'#e6e6ea',400);text(g,'Home',1588,1176,25,'#e6e6ea',300);
  const o='#f26a2e';
  ringStroke(g,1519,1107,11,o,7,-60,220);text(g,'– 3 dB LIMIT',1519,1258,27,o,700);
  ringStroke(g,1465,1107,11,o,7,120,400);
  disc(g,1417,1113,13,o);for(const d of [-5,0,5])line(g,[[1417+d,1104],[1417+d,1122]],'#1c1b20',1.6);
  text(g,p.on?`-/ 3.19-${String(17018+p.beat).padStart(5,'0')}`:'-/ 3.19-17018',1415,1246,23,o,400,{font:MONO});
  text(g,`${(p.on?30.7135+p.seconds:30.7135).toFixed(4).replace(/(\d\d)(\d\d)$/,'$1 $2')} s`,1379,1281,23,'#f08a4a',300,{font:MONO});
  // The bar grows with the flow value.
  line(g,[[1345,1086],[1345,1086+78*(p.on?.15+p.flow*.85:1)]],o,4);if(p.on)line(g,[[1345,1086],[1345,1164]],'rgba(242,106,46,.25)',4);
  text(g,'VOLUME',1441,1420,27,o,700);text(g,p.on?`−${32+p.step} dB`:'−32 dB',1441,1532,27,'#d9a27e',400);
  text(g,'Scene 31 Chorus',1589,1592,22,'#f08a3c',700);line(g,[[1640,1470],[1662,1482],[1640,1494]],'#e6e6ea',2.5);
  ringStroke(g,1314,1490,7,'#e09a5a',2);text(g,'120 bpm',1314,1570,25,'#e3a66c',300);text(g,'Master',1364,1595,24,'#f39a3a',800);
  text(g,'←',1586,1724,22,'#eef2f4',300);
  // Message card (its lines read straight, unlike the rest), and the chevron tab.
  box(g,1285,1671,1553,1746,16,null,0,'#494c51');box(g,1322,1740,1518,1774,10,null,0,'#687780');box(g,1285,1671,1553,1746,16,null,0,'#494c51');
  const rr=rng(77);for(let row=0;row<5;row++){let x=1338+(row%2)*10;while(x<1530){const w=WORDS[Math.floor(rr()*WORDS.length)];g.font=`700 10.5px ${FONT}`;const wd=g.measureText(w).width;if(x+wd>1540)break;text(g,w,x,1686+row*13,10.5,'#f2f2f4',700,{flat:true,align:'left'});x+=wd+6+rr()*8}}
  text(g,'OK',1532,1692,18,INK.amber,500);text(g,'9',1300,1700,22,INK.amber,800);line(g,[[1296,1716],[1310,1728],[1326,1708]],INK.amber,3.5);text(g,'JOIN',1400,1758,12,'#a9c3cc',700,{flat:true});
  g.beginPath();g.moveTo(1613,1500);g.lineTo(1688,1500);g.lineTo(1688,1756);g.lineTo(1652,1794);g.lineTo(1613,1756);g.closePath();g.fillStyle='#4e5257';g.fill();
  text(g,'Aux Return',1652,1626,27,'#e9e9ec',300);box(g,1702,1740,1715,1772,6,null,0,'#62737c');box(g,1702,1778,1715,1812,6,null,0,'#7d939c');
  ringStroke(g,1233,1794,9,'#eef2f4',1.8);text(g,'F',1233,1794,11,'#eef2f4',600);
 });
}

// Braid: diagonal hatch wrapped round a cable. `tone` is the cable colour.
export function braidTexture(tone:string,dark:string){
 const [c,g]=canvas(64,64);g.fillStyle=tone;g.fillRect(0,0,64,64);g.strokeStyle=dark;g.lineWidth=5;
 for(let i=-64;i<128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Glass sheen: a clear sheet with one soft, very faint diagonal reflection. No dust: on a black screen it reads as smudges.
export function glassTexture(seed:number,w=512,h=512){
 const [c,g]=canvas(w,h),at=.3+seed*.17,f=g.createLinearGradient(0,0,w,h*.8);
 f.addColorStop(Math.max(0,at-.2),'rgba(255,255,255,0)');f.addColorStop(at,'rgba(240,246,255,.045)');f.addColorStop(Math.min(1,at+.2),'rgba(255,255,255,0)');g.fillStyle=f;g.fillRect(0,0,w,h);
 return finish(c);
}
