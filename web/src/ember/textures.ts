import * as THREE from 'three';
import {rng} from '../kit/util';
import {IMG,PX,WINDOW,DIE,parts,type Part} from './layout';
import {FONT,lettered} from './print';
import maskUrl from './traced-mask.png';

// Everything here is drawn: no pixel of the reference image is used. Colours were sampled from it with crop.mjs.
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return [c,c.getContext('2d')!] as const};
const colour=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};
const data=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.anisotropy=8;return t};
const tile=(t:THREE.Texture,every:number)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/every,1/every);return t};
type G=CanvasRenderingContext2D;

// ── The traced mask ─────────────────────────────────────────────────────────
// Only the core's glowing circuit lines still come from it (its red channel inside the window); the board's print is
// drawn from vectors in print.ts.
// The mask is bundled with the page (a Vite asset), decoded once and shared.
let pending:Promise<ImageData>|null=null;
const traced=()=>pending??=new Promise<ImageData>((ok,no)=>{const img=new Image();img.onload=()=>{const [mc,mg]=canvas(img.width,img.height);mg.drawImage(img,0,0);ok(mg.getImageData(0,0,mc.width,mc.height))};img.onerror=no;img.src=maskUrl});
// Start decoding as soon as this module loads, well before the scene is built.
if(typeof Image!=='undefined')traced().catch(()=>{});
// Orange spill on the board round everything that glows: drawn once, used as the board's emissive map.
export function spillTexture(){
 const k=.3,[c,g]=canvas(IMG.w*k,IMG.h*k);g.scale(k,k);g.fillStyle='#000';g.fillRect(0,0,IMG.w,IMG.h);
 const glow=(x:number,y:number,r:number,a:number)=>{const f=g.createRadialGradient(x,y,0,x,y,r);f.addColorStop(0,`rgba(255,112,26,${a})`);f.addColorStop(.35,`rgba(240,90,14,${a*.42})`);f.addColorStop(1,'rgba(200,60,0,0)');g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)};
 glow((DIE[0]+DIE[2])/2,(DIE[1]+DIE[3])/2,470,.5);
 for(const p of parts)if(p.lit&&p.r!==undefined&&p.kind!=='led')glow((p.box[0]+p.box[2])/2,(p.box[1]+p.box[3])/2,p.r/PX*(p.kind==='dot'?1.5:1.9),p.kind==='dot'?.05:.5);
 const t=colour(c);t.channel=1;return t;
}

// ── Metals ──────────────────────────────────────────────────────────────────
// Brushed steel: long fine streaks in the roughness, so highlights stretch across the grain.
export function brushedMaps(seed=3){
 const [c,g]=canvas(1024,1024),random=rng(seed);g.fillStyle='rgb(150,150,150)';g.fillRect(0,0,1024,1024);
 for(let i=0;i<9000;i++){const v=70+random()*150|0,y=random()*1024,x=random()*1024,l=80+random()*600;g.strokeStyle=`rgba(${v},${v},${v},${.05+random()*.14})`;g.lineWidth=.6+random()*1.4;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y+(random()-.5)*2);g.stroke();if(x+l>1024){g.beginPath();g.moveTo(x-1024,y);g.lineTo(x+l-1024,y);g.stroke()}}
 return {rough:tile(data(c),38),bump:tile(data(c),38)};
}
// ── Painted faces ───────────────────────────────────────────────────────────
// A painted face is drawn in reference-pixel coordinates over a pixel box and laid on its part from straight above,
// so shading, wear and spill can be placed exactly where the reference has them.
export type Box=readonly [number,number,number,number];
const sheet=(box:Box,k:number)=>{const [c,g]=canvas((box[2]-box[0])*k,(box[3]-box[1])*k);g.scale(k,k);g.translate(-box[0],-box[1]);return [c,g] as const};
const outline=(g:G,pts:readonly (readonly number[])[],close=true)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));if(close)g.closePath()};
const grow=(pts:readonly (readonly number[])[],by:number)=>{const cx=pts.reduce((n,p)=>n+p[0],0)/pts.length,cy=pts.reduce((n,p)=>n+p[1],0)/pts.length;return pts.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy);return [x+(x-cx)/d*by,y+(y-cy)/d*by]})};
// Handling marks: fine scratches, soft smudges and dust. `amount` scales how many.
function wear(g:G,[x0,y0,x1,y1]:Box,random:()=>number,amount=1,dark='60,48,42',pale='255,250,246'){
 const w=x1-x0,h=y1-y0,n=w*h/700*amount;
 g.save();g.lineCap='round';
 for(let i=0;i<n/30;i++){const x=x0+random()*w,y=y0+random()*h,r=12+random()*46,f=g.createRadialGradient(x,y,0,x,y,r),c=random()<.55?dark:pale;f.addColorStop(0,`rgba(${c},${.03+random()*.05})`);f.addColorStop(1,`rgba(${c},0)`);g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<n;i++){const x=x0+random()*w,y=y0+random()*h,a=random()<.7?(random()-.5)*.5:random()*Math.PI,l=4+random()*random()*70;g.strokeStyle=`rgba(${random()<.5?dark:pale},${.05+random()*.12})`;g.lineWidth=.3+random()*.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 for(let i=0;i<n*1.2;i++){g.fillStyle=`rgba(${random()<.35?dark:pale},${.1+random()*.3})`;g.beginPath();g.arc(x0+random()*w,y0+random()*h,.3+random()*random()*1.1,0,Math.PI*2);g.fill()}
 g.restore();
}
// Turned metal: a sheen that sweeps round the axis, bright toward the upper left and its opposite, with fine machining lines.
// Lathed parts map u round the axis, so one strip serves every ring, screw and washer.
export function spunMap(){
 const [c,g]=canvas(512,8),random=rng(53);
 for(let x=0;x<512;x++){const u=x/512,v=.74+.2*Math.cos(Math.PI*4*(u-.625))+.05*Math.cos(Math.PI*2*(u-.625))+(random()-.5)*.07,l=Math.round(255*Math.min(1,v));g.fillStyle=`rgb(${l},${l},${l})`;g.fillRect(x,0,1,8)}
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// The pressed steel bracket: bright warm silver that greys toward the bottom band, soft pressed edges round the
// opening and the screw seats, a faint warm bounce from the core below, and handling wear. No pure white anywhere.
export function bracketTexture(box:Box,plate:readonly (readonly number[])[],hole:readonly (readonly number[])[],screws:readonly (readonly number[])[],studs:readonly (readonly number[])[]){
 const [c,g]=sheet(box,1.6),random=rng(13),[x0,y0,x1,y1]=box;
 const f=g.createLinearGradient(0,y0,0,y1),stop=(y:number,col:string)=>f.addColorStop((y-y0)/(y1-y0),col);
 stop(290,'#f0e6e0');stop(470,'#f1e7e1');stop(540,'#e9ddd6');stop(566,'#b9aca4');stop(586,'#a2958d');stop(606,'#bdb0a8');stop(632,'#e6dad3');stop(800,'#ebdfd8');stop(1000,'#ecdfd8');stop(1080,'#dfd0c8');stop(1120,'#d0c0b6');stop(1170,'#baa99e');stop(1215,'#a29086');stop(1246,'#8a7970');
 g.fillStyle=f;g.fillRect(x0,y0,x1-x0,y1-y0);
 const side=g.createLinearGradient(x0,0,x1,0);side.addColorStop(0,'rgba(255,250,246,.07)');side.addColorStop(.5,'rgba(255,250,246,0)');side.addColorStop(1,'rgba(70,50,40,.08)');g.fillStyle=side;g.fillRect(x0,y0,x1-x0,y1-y0);
 const warm=g.createLinearGradient(0,1100,0,y1);warm.addColorStop(0,'rgba(255,140,60,0)');warm.addColorStop(1,'rgba(255,140,60,.16)');g.fillStyle=warm;g.fillRect(x0,1100,x1-x0,y1-1100);
 // Brushing: long faint horizontal streaks.
 for(let i=0;i<2600;i++){const y=y0+random()*(y1-y0),x=x0+random()*(x1-x0),l=40+random()*300;g.strokeStyle=`rgba(${random()<.5?'255,252,248':'88,72,64'},${.025+random()*.05})`;g.lineWidth=.4+random()*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y+(random()-.5)*1.5);g.stroke()}
 // Soft lines: a blurred dark stroke with a thin light one beside it reads as a pressed step.
 const soft=(draw:()=>void,width:number,blur:number,style:string)=>{g.save();g.lineJoin='round';g.lineCap='round';g.strokeStyle=style;g.lineWidth=width;g.shadowColor=style;g.shadowBlur=blur*1.6;draw();g.stroke();g.restore()};
 const press=(draw:()=>void,depth=1)=>{soft(draw,3.5,5,`rgba(74,60,52,${.3*depth})`);g.save();g.translate(1.6,1.8);soft(draw,1.2,1,`rgba(255,252,248,${.5*depth})`);g.restore()};
 // The ears stand a step above the plate.
 press(()=>{g.beginPath();g.moveTo(228,345);g.lineTo(456,345)},.8);press(()=>{g.beginPath();g.moveTo(728,345);g.lineTo(942,345)},.8);
 // The plate's own rounded edge.
 soft(()=>outline(g,plate),7,5,'rgba(92,76,66,.4)');soft(()=>outline(g,grow(plate,-9)),1.6,2,'rgba(255,252,248,.35)');
 // The opening: its pressed lip rolls down into the dark, and a tongue of the top band steps down between the screws.
 soft(()=>outline(g,grow(hole,16)),2,2,'rgba(255,252,248,.4)');soft(()=>outline(g,grow(hole,6)),10,9,'rgba(96,80,70,.34)');soft(()=>outline(g,hole),5,3,'rgba(40,32,28,.5)');
 press(()=>{g.beginPath();g.moveTo(364,436);g.lineTo(364,470);g.quadraticCurveTo(364,480,354,490)});press(()=>{g.beginPath();g.moveTo(814,436);g.lineTo(814,470);g.quadraticCurveTo(814,480,824,490)});
 // The trough pressed under the opening.
 {const t=g.createLinearGradient(0,1106,0,1134);t.addColorStop(0,'rgba(70,56,48,.34)');t.addColorStop(.6,'rgba(70,56,48,.05)');t.addColorStop(1,'rgba(255,250,246,.3)');g.save();g.shadowColor='rgba(70,56,48,.3)';g.shadowBlur=10;g.fillStyle=t;g.beginPath();g.roundRect(420,1106,330,28,14);g.fill();g.restore()}
 // Seats: each screw and stud sits in a shallow dish, shaded on its upper-left wall and lit on its lower-right.
 const seat=(x:number,y:number,r:number)=>{const s=g.createRadialGradient(x+r*.1,y+r*.12,r*.7,x,y,r*1.25);s.addColorStop(0,'rgba(60,46,40,.5)');s.addColorStop(.7,'rgba(60,46,40,.12)');s.addColorStop(1,'rgba(60,46,40,0)');g.fillStyle=s;g.beginPath();g.arc(x,y,r*1.3,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(255,252,248,.4)';g.lineWidth=1.4;g.beginPath();g.arc(x,y,r*1.22,.2,1.9);g.stroke()};
 for(const [x,y] of screws)seat(x,y,46);for(const [x,y] of studs)seat(x,y,17);
 // Marks stamped in the ears.
 g.fillStyle='#1d1a19';outline(g,[[252,322],[292,322],[302,338],[262,338]]);g.fill();
 g.fillStyle='#8c827c';g.strokeStyle='#2a2523';g.lineWidth=2.5;g.beginPath();g.roundRect(874,320,38,17,8.5);g.fill();g.stroke();
 wear(g,box,random,1.1);
 return colour(c);
}
// Weathered steel: pale blotches where the scale has worn through, dark pits, a little rust warmth.
export function pittedMaps(seed=11){
 const S=1024,[c,g]=canvas(S,S),[rc,rg]=canvas(S,S),[bc,bg]=canvas(S,S),random=rng(seed);
 g.fillStyle='#57524e';g.fillRect(0,0,S,S);rg.fillStyle='rgb(140,140,140)';rg.fillRect(0,0,S,S);bg.fillStyle='rgb(128,128,128)';bg.fillRect(0,0,S,S);
 const each=(fn:(q:G,i:number)=>void)=>[g,rg,bg].forEach(fn);
 const wrap=(x:number,y:number,r:number,fn:(q:G,i:number,x:number,y:number)=>void)=>each((q,i)=>{for(const ox of [-S,0,S])for(const oy of [-S,0,S]){if(x+ox<-r||x+ox>S+r||y+oy<-r||y+oy>S+r)continue;fn(q,i,x+ox,y+oy)}});
 const blot=(x:number,y:number,r:number,cols:[string,string,string])=>wrap(x,y,r,(q,i,px,py)=>{q.fillStyle=cols[i];q.beginPath();q.arc(px,py,r,0,Math.PI*2);q.fill()});
 // Broad patches: pale where the scale has rubbed bright, rust-brown where it has not, each a soft-edged cloud.
 const cloud=(cols:[string,string,string],size:number,n:number,stretch:number)=>{const cx=random()*S,cy=random()*S,a=random()*Math.PI;for(let j=0;j<n;j++){const d=(random()-.5)*size*stretch,o=(random()-.5)*size*.5,r=size*(.08+random()*.16);blot(cx+Math.cos(a)*d-Math.sin(a)*o,cy+Math.sin(a)*d+Math.cos(a)*o,r,cols)}};
 for(let i=0;i<26;i++)cloud(['rgba(160,150,138,.055)','rgba(84,84,84,.12)','rgba(150,150,150,.08)'],150+random()*160,60,2.2);
 for(let i=0;i<16;i++)cloud(['rgba(118,66,34,.09)','rgba(205,205,205,.1)','rgba(118,118,118,.06)'],120+random()*120,46,1.4);
 for(let i=0;i<14;i++)cloud(['rgba(30,27,25,.1)','rgba(190,190,190,.08)','rgba(112,112,112,.06)'],140+random()*120,40,1.6);
 // Scuffs: long pale drags, in loose bundles.
 for(let i=0;i<70;i++){
  const x=random()*S,y=random()*S,a=random()*Math.PI,n=2+random()*6;
  for(let j=0;j<n;j++){const l=30+random()*150,ox=(random()-.5)*26,oy=(random()-.5)*26;each((q,k)=>{q.strokeStyle=['rgba(206,196,184,.3)','rgba(64,64,64,.45)','rgba(168,168,168,.45)'][k];q.lineWidth=.6+random()*1.6;q.beginPath();q.moveTo(x+ox,y+oy);q.lineTo(x+ox+Math.cos(a)*l,y+oy+Math.sin(a)*l);q.stroke()})}
 }
 // Sparse pits.
 for(let i=0;i<620;i++){const x=random()*S,y=random()*S,r=.6+random()*random()*3;blot(x,y,r,['rgba(20,17,15,.85)','rgba(235,235,235,.8)','rgba(14,14,14,.9)']);if(r>1.8)blot(x-r*.35,y-r*.35,r*.4,['rgba(196,186,174,.5)','rgba(110,110,110,.5)','rgba(205,205,205,.6)'])}
 return {map:tile(colour(c),40),rough:tile(data(rc),40),bump:tile(data(bc),40)};
}
// Satin nickel tube. v runs across the tube as seen from above (parts.ts sets it from the surface normal): a long soft
// highlight along the crown, warm darker flanks, lengthwise streaks, a little tarnish and specks. u runs along the tube.
export function tubeMap(){
 const [c,g]=canvas(1024,128),random=rng(31),f=g.createLinearGradient(0,0,0,128);
 for(const [t,col] of [[0,'#2e2620'],[.15,'#5c5149'],[.3,'#9c8f86'],[.4,'#e6dbd4'],[.46,'#f3e9e3'],[.56,'#c9bcb3'],[.7,'#8d7e74'],[.85,'#5a4c43'],[1,'#2e241e']] as const)f.addColorStop(t,col);
 g.fillStyle=f;g.fillRect(0,0,1024,128);
 for(let i=0;i<260;i++){const y=random()*128,x=random()*1024,l=60+random()*500;g.strokeStyle=`rgba(${random()<.5?'255,252,248':'80,62,52'},${.03+random()*.08})`;g.lineWidth=.5+random()*1.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y);g.stroke();g.beginPath();g.moveTo(x-1024,y);g.lineTo(x+l-1024,y);g.stroke()}
 for(let i=0;i<10;i++){const x=random()*1024,y=20+random()*88,r=6+random()*14,q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,`rgba(120,92,70,${.05+random()*.1})`);q.addColorStop(1,'rgba(120,92,70,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<700;i++){g.fillStyle=random()<.6?`rgba(60,46,38,${.15+random()*.4})`:`rgba(255,252,248,${.2+random()*.4})`;g.beginPath();g.arc(random()*1024,random()*128,.3+random()*random()*1.3,0,Math.PI*2);g.fill()}
 // Dents: a short dark crescent with a bright lip beside it, where the tube has been knocked.
 for(let i=0;i<5;i++){const x=random()*1024,y=40+random()*40,w=4+random()*7;g.fillStyle=`rgba(40,30,24,${.2+random()*.2})`;g.beginPath();g.ellipse(x,y,w,2+random()*2,0,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,250,244,.35)';g.beginPath();g.ellipse(x+1,y-3,w*.8,1,0,0,Math.PI*2);g.fill()}
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Fine grain for moulded black plastic and chip bodies.
export function grainMap(){
 const [c,g]=canvas(256,256),random=rng(5);g.fillStyle='rgb(128,128,128)';g.fillRect(0,0,256,256);
 for(let i=0;i<9000;i++){const v=random()<.5?60:200;g.fillStyle=`rgba(${v},${v},${v},.25)`;g.fillRect(random()*256,random()*256,1.4,1.4)}
 return tile(data(c),9);
}
// Woven substrate of the processor package.
export function weaveTexture(){
 const [c,g]=canvas(128,128);g.fillStyle='#4a4541';g.fillRect(0,0,128,128);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){g.fillStyle=(x+y)%2?'rgba(110,102,94,.4)':'rgba(8,7,7,.6)';g.beginPath();g.ellipse(x*8+4,y*8+4,2.8,1.6,(x+y)%2?.7:-.7,0,Math.PI*2);g.fill()}
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ── Chip tops ───────────────────────────────────────────────────────────────
// Laser-etched lettering, a pin-1 dot, mould grain and a faint bevel line. `turn` runs the text up the part.
export function chipTop(p:Part,turn=false){
 const s=Math.min(96,1400/Math.max(p.w,p.d)),[c,g]=canvas(p.w*s,p.d*s),W=c.width,H=c.height,texture=colour(c);
 lettered(()=>{
 const random=rng(p.id.length*31+Math.round(p.x*7+p.z*3));g.setTransform(1,0,0,1,0,0);
 const grey=p.finish==='grey',blue=p.finish==='bluegrey';
 g.fillStyle=blue?'#4b4c55':grey?(p.kind==='chip'?'#3e3938':'#746c69'):p.kind==='chip'?'#524c49':'#161413';g.fillRect(0,0,W,H);
 const sheen=g.createLinearGradient(0,0,W,H);sheen.addColorStop(0,'rgba(255,240,230,.09)');sheen.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=sheen;g.fillRect(0,0,W,H);
 for(let i=0;i<W*H/14;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.09)';g.fillRect(random()*W,random()*H,1.5,1.5)}
 // Moulded pits, a smudge or two, and a bevel that is paler along the top and left.
 for(let i=0;i<W*H/260;i++){g.fillStyle=`rgba(0,0,0,${.12+random()*.2})`;g.beginPath();g.arc(random()*W,random()*H,.6+random()*1.4,0,Math.PI*2);g.fill()}
 for(let i=0;i<5;i++){const x=random()*W,y=random()*H,r=Math.min(W,H)*(.15+random()*.3),q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,`rgba(255,246,238,${.03+random()*.04})`);q.addColorStop(1,'rgba(255,246,238,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)}
 for(let i=0;i<W*H/5000;i++){const x=random()*W,y=random()*H,a=random()*Math.PI,l=8+random()*40;g.strokeStyle=`rgba(255,250,244,${.04+random()*.07})`;g.lineWidth=.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 {const e=Math.max(2,s*.16);g.lineWidth=e;g.strokeStyle='rgba(255,248,240,.16)';g.beginPath();g.moveTo(e/2,H);g.lineTo(e/2,e/2);g.lineTo(W,e/2);g.stroke();g.strokeStyle='rgba(0,0,0,.4)';g.beginPath();g.moveTo(W-e/2,e);g.lineTo(W-e/2,H-e/2);g.lineTo(e,H-e/2);g.stroke()}
 const ink=grey?'rgba(26,23,22,.78)':blue?'rgba(238,236,232,.92)':'rgba(206,198,190,.88)',lines=(p.mark??[]).filter(Boolean);
 const special=lines[0]==='I  I'||lines[0]==='o'||lines[0]==='<>';
 if(lines[0]==='I  I'){g.fillStyle='#ece4dc';for(const u of [.3,.66])g.fillRect(W*u,H*.42,Math.max(2,s*.24),H*.2)}
 if(lines[0]==='o'){g.strokeStyle='rgba(8,7,7,.9)';g.lineWidth=s*.12;for(const [u,v,r] of [[.22,.2,.5],[.76,.26,.55],[.62,.42,.7],[.82,.66,.55],[.7,.8,.8]]){g.beginPath();g.arc(W*u,H*v,s*r,0,Math.PI*2);g.stroke();g.strokeStyle='rgba(255,250,240,.16)';g.beginPath();g.arc(W*u+1,H*v+1,s*r,0,Math.PI*2);g.stroke();g.strokeStyle='rgba(8,7,7,.9)'}
  g.fillStyle='rgba(8,7,7,.9)';g.beginPath();g.roundRect(W*.36,H*.82,s*1.6,s*.7,s*.3);g.fill()}
 if(lines[0]==='<>'){g.strokeStyle='rgba(90,84,80,.9)';g.lineWidth=s*.14;g.beginPath();g.moveTo(W*.38,H*.52);g.lineTo(W*.52,H*.38);g.lineTo(W*.66,H*.52);g.lineTo(W*.52,H*.66);g.lineTo(W*.45,H*.59);g.stroke()}
 if(lines.length&&!special){
  // Maker's mark and name, part number, date and lot code: centred, the part number largest.
  g.save();g.translate(W/2,H/2);if(turn)g.rotate(-Math.PI/2);
  const span=turn?H:W,room=turn?W:H,scale=lines.map((_,i)=>lines.length>1&&i===1?1:.8),tall=scale.reduce((n,v)=>n+v*1.22,0);
  const size=Math.min(room*.7/tall,span*.84/Math.max(...lines.map((l,i)=>(l.length+(i?0:1.6))*.66*scale[i])));
  g.textAlign='left';g.textBaseline='middle';let y=-tall*size/2;
  const etch=(draw:()=>void)=>{g.save();g.translate(1.2,1.2);g.fillStyle=g.strokeStyle=grey?'rgba(255,248,240,.14)':'rgba(0,0,0,.5)';draw();g.restore();g.fillStyle=g.strokeStyle=ink;draw()};
  lines.forEach((l,i)=>{
   const f=size*scale[i];y+=f*.61;g.font=`${i===1?600:500} ${f}px ${FONT}`;
   const tw=Math.min(g.measureText(l).width,span*.86),logo=i===0&&lines.length>1?f*1.25:0,x=-(tw+logo)/2;
   if(logo){const k=(p.id.charCodeAt(p.id.length-1)+l.length)%3,cx=x+f*.45,r=f*.42;g.lineWidth=f*.13;g.lineJoin='miter';
    etch(()=>{g.beginPath();if(k===0){g.moveTo(cx-r,y+r*.9);g.lineTo(cx,y-r*.9);g.lineTo(cx+r,y+r*.9);g.closePath();g.stroke()}else if(k===1){g.arc(cx,y,r*.9,0,Math.PI*2);g.stroke();g.beginPath();g.arc(cx,y,r*.3,0,Math.PI*2);g.fill()}else{for(const o of [-.5,.5]){g.moveTo(cx+o*r-r*.3,y+r*.9);g.lineTo(cx+o*r+r*.3,y-r*.9)}g.stroke()}})}
   etch(()=>g.fillText(l,x+logo,y,tw));y+=f*.61;
  });
  g.restore();
 }
 // Pin-1 dot.
 if(p.kind==='chip'){const r=Math.max(2.5,s*.3);g.fillStyle='rgba(0,0,0,.55)';g.beginPath();g.arc(s*.75,s*.75,r,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,250,244,.22)';g.lineWidth=1;g.beginPath();g.arc(s*.75,s*.75,r,.4,2.4);g.stroke()}
 if(blue){g.fillStyle='rgba(20,20,24,.85)';for(let i=0;i<26;i++)g.fillRect(W*.08+i*W*.012*(1+random()),H*.78,W*.006*(1+random()*2),H*.14)}
 texture.needsUpdate=true;
 });
 return texture;
}
// The heat-spreader: satin grey with engraved lettering running up the part and a blocky logo.
export function spreaderTexture(p:Part){
 const S=1024,[c,g]=canvas(S,S*p.d/p.w),H=c.height,random=rng(41);
 const base=g.createLinearGradient(0,0,S,H);base.addColorStop(0,'#77706c');base.addColorStop(.5,'#625c59');base.addColorStop(1,'#4c4745');g.fillStyle=base;g.fillRect(0,0,S,H);
 for(let i=0;i<60000;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.03)':'rgba(0,0,0,.06)';g.fillRect(random()*S,random()*H,1.6,1.6)}
 const etch=(draw:()=>void)=>{g.save();g.translate(1.6,1.6);g.strokeStyle=g.fillStyle='rgba(20,18,17,.7)';draw();g.restore();g.strokeStyle=g.fillStyle='rgba(214,204,194,.82)';draw()};
 g.lineWidth=5;g.lineJoin='miter';
 // Logo: a slashed bar over nested brackets.
 etch(()=>{g.beginPath();g.moveTo(S*.33,H*.26);g.lineTo(S*.58,H*.26);g.lineTo(S*.66,H*.2);g.moveTo(S*.36,H*.3);g.lineTo(S*.6,H*.3);g.stroke()});
 etch(()=>{g.strokeRect(S*.42,H*.38,S*.2,H*.34);g.beginPath();g.moveTo(S*.42,H*.5);g.lineTo(S*.56,H*.5);g.lineTo(S*.56,H*.72);g.moveTo(S*.36,H*.66);g.lineTo(S*.5,H*.58);g.lineTo(S*.62,H*.72);g.moveTo(S*.48,H*.38);g.lineTo(S*.48,H*.46);g.stroke()});
 const lines=p.mark??[];g.textAlign='center';g.textBaseline='middle';
 [[.22,0],[.34,1],[.74,2],[.86,3]].forEach(([u,i])=>{const l=lines[i];if(!l)return;g.save();g.translate(S*u,H*(i<2?.62:.5));g.rotate(-Math.PI/2);g.font=`500 ${S*.062}px ${FONT}`;etch(()=>g.fillText(l,0,0));g.restore()});
 g.strokeStyle='rgba(20,18,18,.8)';g.lineWidth=3;g.beginPath();g.arc(S*.25,H*.13,S*.035,0,Math.PI*2);g.stroke();
 return colour(c);
}

// ── The core ────────────────────────────────────────────────────────────────
// The circuit lines and lettering inside the glowing window are traced too: inside WINDOW the mask's red channel is
// the reference's thin bright strokes. They are tinted and laid over a painted floor that falls off from the die.
const [WX0,WY0,WX1,WY1]=WINDOW,[DX0,DY0,DX1,DY1]=DIE;
// Cut the window out of the mask as two tinted layers: a wide orange one and a narrow hot one.
const CORE_TEXT:Box[]=[[490,2024,696,2053],[490,2066,640,2081]];
const CORE_LINES:[string,number,number,number][]=[['EMBER',492,2032,9],['CORE X9',492,2045,6],['1.24V',546,2036,13],['34A / 0087',598,2037,8],['REV B',668,2037,8],['ABSURD DEVICES   HOT SURFACE',492,2074,5.5]];
const coreLines=()=>traced().then(src=>{
 const w=WX1-WX0,h=WY1-WY0,[gc,gg]=canvas(w,h),[hc,hg]=canvas(w,h),glow=gg.createImageData(w,h),hot=hg.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  // The reference's lettering here is unreadable, so those strokes are left out and real text is drawn in their place.
  const X=x+WX0,Y=y+WY0,text=CORE_TEXT.some(b=>X>=b[0]&&X<b[2]&&Y>=b[1]&&Y<b[3]),v=text?0:src.data[(Y*src.width+X)*4],o=(y*w+x)*4;
  glow.data[o]=255;glow.data[o+1]=118;glow.data[o+2]=22;glow.data[o+3]=Math.min(255,v*1.5);
  hot.data[o]=255;hot.data[o+1]=232;hot.data[o+2]=176;hot.data[o+3]=Math.max(0,Math.min(255,(v-110)*2.4));
 }
 gg.putImageData(glow,0,0);hg.putImageData(hot,0,0);return {glow:gc,hot:hc};
});
export function coreTexture(){
 const k=2.6,[c,g]=canvas((WX1-WX0)*k,(WY1-WY0)*k),W=c.width,H=c.height,texture=colour(c);
 const X=(x:number)=>(x-WX0)*k,Y=(y:number)=>(y-WY0)*k,cx=X((DX0+DX1)/2),cy=Y((DY0+DY1)/2);
 function paint(lines:{glow:HTMLCanvasElement;hot:HTMLCanvasElement}|null){
  const random=rng(19);
  // Floor: dark bronze, lit hard by the die and falling away to the corners.
  g.fillStyle='#2a1104';g.fillRect(0,0,W,H);
  const cast=g.createRadialGradient(cx,cy,60,cx,cy,W*.82);cast.addColorStop(0,'rgba(255,160,60,.95)');cast.addColorStop(.16,'rgba(236,112,22,.82)');cast.addColorStop(.42,'rgba(176,74,12,.6)');cast.addColorStop(.75,'rgba(110,42,6,.42)');cast.addColorStop(1,'rgba(70,24,4,.3)');g.fillStyle=cast;g.fillRect(0,0,W,H);
  // Lid plates: darker raised islands between the lines, each with a lit edge, as the reference has them.
  for(const [x,y,w,h,r] of [[452,1700,330,62,10],[398,1668,40,150,8],[470,1778,296,214,14],[452,2010,330,62,10],[410,2086,372,72,12],[786,1700,30,240,8]]){
   g.fillStyle='rgba(20,7,1,.42)';g.beginPath();g.roundRect(X(x),Y(y),w*k,h*k,r*k);g.fill();
   g.strokeStyle='rgba(255,150,50,.22)';g.lineWidth=2;g.beginPath();g.roundRect(X(x)+1.5,Y(y)+1.5,w*k-3,h*k-3,r*k);g.stroke();
  }
  // Scorch and grit.
  for(let i=0;i<1500;i++){g.fillStyle=random()<.35?`rgba(255,190,110,${.1+random()*.25})`:`rgba(16,5,0,${.15+random()*.4})`;const r=.4+random()*random()*3.4;g.beginPath();g.arc(random()*W,random()*H,r,0,Math.PI*2);g.fill()}
  for(let i=0;i<26;i++){const x=random()*W,y=random()*H,r=30+random()*90,f=g.createRadialGradient(x,y,0,x,y,r);f.addColorStop(0,`rgba(14,4,0,${.1+random()*.16})`);f.addColorStop(1,'rgba(14,4,0,0)');g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)}
  // The die lights the floor right round it.
  const halo=g.createRadialGradient(cx,cy,(DX1-DX0)*k*.42,cx,cy,(DX1-DX0)*k*.95);halo.addColorStop(0,'rgba(255,214,150,.95)');halo.addColorStop(.4,'rgba(255,160,60,.5)');halo.addColorStop(1,'rgba(255,120,30,0)');g.fillStyle=halo;g.fillRect(0,0,W,H);
  if(lines){
   g.save();g.imageSmoothingQuality='high';g.globalCompositeOperation='lighter';
   // A soft orange halo under each stroke (drawn again slightly larger), then the stroke, then its hot centre.
   g.globalAlpha=.35;for(const [dx,dy] of [[-3,0],[3,0],[0,-3],[0,3]])g.drawImage(lines.glow,dx,dy,W,H);
   g.globalAlpha=1;g.drawImage(lines.glow,0,0,W,H);g.globalCompositeOperation='source-over';g.drawImage(lines.hot,0,0,W,H);
   g.restore();
  }
  // Lettering on the lid, lit like the lines.
  g.save();g.setTransform(k,0,0,k,-WX0*k,-WY0*k);g.textBaseline='middle';g.textAlign='left';g.shadowColor='rgba(255,120,24,.9)';g.shadowBlur=5*k;g.fillStyle='#ffd69a';
  for(const [text,x,y,size] of CORE_LINES){g.font=`600 ${size}px ${FONT}`;g.fillText(text,x,y)}
  g.restore();
  // The window's edge sits in the shadow of the shroud rim.
  const shade=g.createLinearGradient(0,0,0,26);shade.addColorStop(0,'rgba(0,0,0,.55)');shade.addColorStop(1,'rgba(0,0,0,0)');
  for(let side=0;side<4;side++){g.save();g.translate(W/2,H/2);g.rotate(side*Math.PI/2);const w=side%2?H:W,h=side%2?W:H;g.translate(-w/2,-h/2);g.fillStyle=shade;g.fillRect(0,0,w,26);g.restore()}
  texture.needsUpdate=true;
 }
 let lines:{glow:HTMLCanvasElement;hot:HTMLCanvasElement}|null=null;
 lettered(()=>paint(lines));coreLines().then(l=>{lines=l;paint(l)}).catch(()=>{});
 return texture;
}
// The die face: white-hot across the middle, a thin warm rim.
export function dieTexture(){
 const [c,g]=canvas(256,256),f=g.createRadialGradient(128,128,60,128,128,182);
 f.addColorStop(0,'#ffffff');f.addColorStop(.72,'#fffaf0');f.addColorStop(.9,'#ffeac4');f.addColorStop(1,'#ffcf86');g.fillStyle=f;g.fillRect(0,0,256,256);
 g.strokeStyle='rgba(255,176,70,.9)';g.lineWidth=4;g.strokeRect(1,1,254,254);
 return colour(c);
}
// The lit face of a fitting, seen from above through its lens. Under even light the depth has to be painted: the
// reflector falls to the middle in machined steps (each a lighter land with a dark riser), the rim is dark, a sheen
// sweeps round the axis, and a soft highlight sits off-centre. `kind` 0 is the ringed target of the upper-left fitting,
// 1 the smoother, deeper glow of the lower-left one, 2 the flat orange eye of the steel fitting.
export function lensTexture(kind=0,seed=3){
 const S=512,[c,g]=canvas(S,S),h=S/2,random=rng(seed);
 const f=g.createRadialGradient(h,h,0,h,h,h);
 if(kind===1){f.addColorStop(0,'#ffa226');f.addColorStop(.5,'#f27c0c');f.addColorStop(.85,'#b04c02');f.addColorStop(1,'#5a2200')}
 else{f.addColorStop(0,'#ffb030');f.addColorStop(.45,'#ff8c14');f.addColorStop(.8,'#e06404');f.addColorStop(1,'#6a2800')}
 g.fillStyle=f;g.fillRect(0,0,S,S);
 // Machined steps, at the radii of the lathed reflector (parts.ts `lens`).
 if(kind<2)for(const r of [.74,.5,.26]){
  g.strokeStyle='rgba(70,20,0,.75)';g.lineWidth=kind?7:9;g.beginPath();g.arc(h,h,h*r,0,Math.PI*2);g.stroke();
  g.strokeStyle='rgba(255,224,150,.7)';g.lineWidth=3;g.beginPath();g.arc(h,h,h*r-(kind?6:8),0,Math.PI*2);g.stroke();
  const land=g.createRadialGradient(h,h,h*(r-.2),h,h,h*r);land.addColorStop(0,'rgba(60,18,0,0)');land.addColorStop(1,'rgba(60,18,0,.28)');g.fillStyle=land;g.beginPath();g.arc(h,h,h*r,0,Math.PI*2);g.fill();
 }
 // Sweep: bright toward the upper left and (less) the lower right, dark between.
 const sweep=g.createConicGradient(0,h,h);
 for(const [t,col] of [[0,'rgba(70,20,0,.5)'],[.11,'rgba(255,206,120,.15)'],[.27,'rgba(60,16,0,.55)'],[.5,'rgba(60,18,0,.25)'],[.6,'rgba(255,226,150,.6)'],[.66,'rgba(255,244,200,.9)'],[.72,'rgba(255,214,130,.4)'],[.86,'rgba(60,18,0,.4)'],[1,'rgba(70,20,0,.5)']] as const)sweep.addColorStop(t,col);
 g.globalAlpha=kind===2?.5:1;g.fillStyle=sweep;g.beginPath();g.arc(h,h,h,0,Math.PI*2);g.fill();g.globalAlpha=1;
 for(let i=0;i<260;i++){const a=random()*Math.PI*2,r0=h*(.12+random()*.6),r1=r0+h*(.08+random()*.3);g.strokeStyle=random()<.5?'rgba(255,220,140,.12)':'rgba(80,22,0,.14)';g.lineWidth=.8+random()*1.4;g.beginPath();g.moveTo(h+Math.cos(a)*r0,h+Math.sin(a)*r0);g.lineTo(h+Math.cos(a)*r1,h+Math.sin(a)*r1);g.stroke()}
 if(kind===2){
  g.shadowColor='#ffd27a';g.shadowBlur=18;g.fillStyle='#fff0c0';
  for(let i=0;i<24;i++){const a=.1+random()*1.2,r=h*(.62+random()*.3),w=6+random()*22;g.fillRect(h+Math.cos(a)*r-w/2,h+Math.sin(a)*r-4,w,5+random()*8)}
  g.shadowBlur=0;
 }else{
  // The lens: a hot crescent toward the light and a broad soft highlight above and left of centre.
  g.shadowBlur=16;g.shadowColor='#ffd890';g.strokeStyle='#fff6dc';g.lineWidth=kind?20:14;g.lineCap='round';g.beginPath();g.arc(h+6,h+4,h*(kind?.3:.4),kind?2.5:2.2,kind?4.6:4.1);g.stroke();g.shadowBlur=0;
  const hi=g.createRadialGradient(h*.72,h*.66,0,h*.72,h*.66,h*.5);hi.addColorStop(0,'rgba(255,244,214,.5)');hi.addColorStop(1,'rgba(255,244,214,0)');g.fillStyle=hi;g.fillRect(0,0,S,S);
 }
 // Dark rim, where the lens meets the bezel.
 const rim=g.createRadialGradient(h,h,h*.8,h,h,h);rim.addColorStop(0,'rgba(30,8,0,0)');rim.addColorStop(1,'rgba(30,8,0,.8)');g.fillStyle=rim;g.beginPath();g.arc(h,h,h,0,Math.PI*2);g.fill();
 return colour(c);
}
// The moving run: rings of light spreading out from the die, seen only where the traced lines are. Redrawn when the phase changes.
export function makeChase(){
 const k=1.2,[c,g]=canvas((WX1-WX0)*k,(WY1-WY0)*k),texture=colour(c),W=c.width,H=c.height,cx=((DX0+DX1)/2-WX0)*k,cy=((DY0+DY1)/2-WY0)*k,reach=Math.hypot(W,H)*.62;
 let last=-1,lines:HTMLCanvasElement|null=null;
 coreLines().then(l=>{lines=l.glow;last=-1}).catch(()=>{});
 function draw(phase:number,level:number){
  const key=Math.round(phase*600)+Math.round(level*20)*1000;if(key===last)return;last=key;
  g.globalCompositeOperation='source-over';g.clearRect(0,0,W,H);if(level<=.01||!lines){texture.needsUpdate=true;return}
  g.globalAlpha=Math.min(1,level);
  for(let n=0;n<3;n++){
   const r=((phase+n/3)%1)*reach,band=reach*.11,f=g.createRadialGradient(cx,cy,Math.max(0,r-band),cx,cy,r+band);
   f.addColorStop(0,'rgba(255,246,220,0)');f.addColorStop(.5,`rgba(255,246,220,${1-r/reach*.6})`);f.addColorStop(1,'rgba(255,246,220,0)');g.fillStyle=f;g.fillRect(0,0,W,H);
  }
  g.globalAlpha=1;g.globalCompositeOperation='destination-in';g.drawImage(lines,0,0,W,H);
  texture.needsUpdate=true;
 }
 return {texture,draw};
}
// ── The shroud ──────────────────────────────────────────────────────────────
// Cast grey metal round the core, painted over one box and laid on every shroud piece from above: a dark frame, three
// paler plates mottled with scuffs, dark stains and pits where the reference has them, and (in a second map) the
// orange light the die throws on whatever faces it.
export const SHROUD_BOX:Box=[170,1440,1020,2320];
// A flake patch: [x, y, spread, count, flake size, colour]. A cloud: [x, y, size, stretch, angle, colour, dabs].
export type ShroudRegion={pts:number[][];tone:string;flakes?:[number,number,number,number,number,string][];clouds?:[number,number,number,number,number,string,number][];scuffs?:number;pale?:number};
export function shroudMaps(regions:ShroudRegion[],rim:Box){
 const [c,g]=sheet(SHROUD_BOX,1.5),[x0,y0,x1,y1]=SHROUD_BOX,random=rng(11);
 g.fillStyle='#2f2c2a';g.fillRect(x0,y0,x1-x0,y1-y0);
 const speck=(box:Box,n:number,pale:number)=>{const [a,b,c2,d]=box;for(let i=0;i<n;i++){const r=.3+random()*random()*2.2,x=a+random()*(c2-a),y=b+random()*(d-b);g.fillStyle=random()<pale?`rgba(200,190,178,${.12+random()*.3})`:`rgba(14,12,11,${.35+random()*.5})`;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();if(r>1.5){g.fillStyle='rgba(220,210,198,.4)';g.beginPath();g.arc(x-r*.35,y-r*.35,r*.35,0,Math.PI*2);g.fill()}}};
 // A soft blotch: many small overlapping dabs along a slanted patch.
 const cloud=(cx:number,cy:number,size:number,stretch:number,angle:number,col:string,n:number)=>{for(let j=0;j<n;j++){const d=(random()+random()-1)*size*stretch,o=(random()+random()-1)*size*.5,r=size*(.03+random()*.1);g.fillStyle=col;g.beginPath();g.arc(cx+Math.cos(angle)*d-Math.sin(angle)*o,cy+Math.sin(angle)*d+Math.cos(angle)*o,r,0,Math.PI*2);g.fill()}};
 // A flake: one ragged, hard-edged chip of worn scale. A patch is many of them, thickest at its middle.
 const flake=(cx:number,cy:number,r:number,col:string)=>{const n=7+Math.floor(random()*6),turn=random()*6;g.fillStyle=col;g.beginPath();for(let i=0;i<n;i++){const a=turn+i/n*Math.PI*2+(random()-.5)*.5,q=r*(.4+random()*.8);if(i)g.lineTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q*.8);else g.moveTo(cx+Math.cos(a)*q,cy+Math.sin(a)*q*.8)}g.closePath();g.fill()};
 const flaking=(cx:number,cy:number,spread:number,n:number,size:number,col:string)=>{for(let i=0;i<n;i++){const d=random()*random()*spread,a=random()*Math.PI*2;flake(cx+Math.cos(a)*d,cy+Math.sin(a)*d*.8,size*(.2+random()*random()*1.3),col)}};
 speck(SHROUD_BOX,3600,.4);
 for(let i=0;i<40;i++)cloud(x0+random()*(x1-x0),y0+random()*(y1-y0),50+random()*70,1.6,random()*Math.PI,random()<.5?'rgba(90,84,78,.07)':'rgba(16,14,13,.08)',30);
 for(const p of regions){
  const xs=p.pts.map(q=>q[0]),ys=p.pts.map(q=>q[1]),a=Math.min(...xs),b=Math.min(...ys),c2=Math.max(...xs),d=Math.max(...ys);
  g.save();g.lineJoin='round';outline(g,p.pts);g.clip();
  g.fillStyle=p.tone;g.fillRect(a,b,c2-a,d-b);
  for(let i=0;i<(c2-a)*(d-b)/2400;i++)cloud(a+random()*(c2-a),b+random()*(d-b),26+random()*46,1.5,random()*Math.PI,random()<.5?'rgba(176,166,156,.07)':'rgba(40,36,33,.09)',26);
  for(const [cx,cy,size,stretch,angle,col,n] of p.clouds??[])cloud(cx,cy,size,stretch,angle,col,n);
  for(const [cx,cy,spread,n,size,col] of p.flakes??[])flaking(cx,cy,spread,n,size,col);
  // Scratches: single long drags and short bundles.
  for(let i=0;i<(c2-a)*(d-b)/2600*(p.scuffs??1);i++){const x=a+random()*(c2-a),y=b+random()*(d-b),ang=random()*Math.PI;for(let j=0;j<1+random()*4;j++){const l=10+random()*random()*110,ox=(random()-.5)*12,oy=(random()-.5)*12;g.strokeStyle=`rgba(${random()<.72?'216,206,194':'26,22,20'},${.12+random()*.28})`;g.lineWidth=.35+random()*.8;g.beginPath();g.moveTo(x+ox,y+oy);g.lineTo(x+ox+Math.cos(ang)*l,y+oy+Math.sin(ang)*l);g.stroke()}}
  speck([a,b,c2,d],(c2-a)*(d-b)/60,p.pale??.25);
  // A cast edge: shadow all round, a little light along the upper-left shoulder, none lower right.
  // Form: the plate is a touch lighter toward the upper left and darker lower right; its edge rolls into shadow all
  // round, with a broad light shoulder on the sides that face up-left and a deep one on those that face down-right.
  {const roll=g.createLinearGradient(a,b,c2,d);roll.addColorStop(0,'rgba(255,246,238,.12)');roll.addColorStop(.5,'rgba(255,246,238,0)');roll.addColorStop(1,'rgba(10,8,7,.26)');g.fillStyle=roll;g.fillRect(a,b,c2-a,d-b)}
  g.lineWidth=22;g.strokeStyle='rgba(18,15,13,.55)';g.shadowColor='rgba(18,15,13,.8)';g.shadowBlur=16;outline(g,p.pts);g.stroke();g.shadowBlur=0;
  g.save();g.translate(7,7);g.lineWidth=7;g.strokeStyle='rgba(236,226,214,.2)';g.shadowColor='rgba(236,226,214,.4)';g.shadowBlur=6;outline(g,p.pts);g.stroke();g.restore();
  g.save();g.translate(5,5);g.lineWidth=2;g.strokeStyle='rgba(244,236,226,.45)';outline(g,p.pts);g.stroke();g.restore();
  g.save();g.translate(-6,-6);g.lineWidth=9;g.strokeStyle='rgba(6,5,4,.5)';g.shadowColor='rgba(6,5,4,.6)';g.shadowBlur=6;outline(g,p.pts);g.stroke();g.restore();
  g.restore();
 }
 // The bottom plate's socket: a shallow square well with a pin hole, a slot and a dash; small fixing holes along the plate.
 {g.save();g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=5;g.fillStyle='#181615';g.beginPath();g.roundRect(468,2210,84,60,7);g.fill();g.restore();
  g.strokeStyle='rgba(214,204,192,.28)';g.lineWidth=1.4;g.beginPath();g.roundRect(469.5,2211.5,84,60,7);g.stroke();
  g.fillStyle='#050505';g.beginPath();g.arc(506,2233,5.5,0,Math.PI*2);g.fill();g.fillRect(534,2226,4,24);g.beginPath();g.roundRect(502,2254,13,4,2);g.fill();
  for(const [x,y] of [[436,2222],[436,2262],[510,2288],[742,2238],[760,2290],[610,2198],[676,2198],[736,2198]]){g.fillStyle='#070606';g.beginPath();g.arc(x,y,3.6,0,Math.PI*2);g.fill();g.strokeStyle='rgba(214,204,192,.22)';g.lineWidth=1;g.beginPath();g.arc(x,y,4.3,.3,2.2);g.stroke()}
  // The plate steps up to the right of the socket.
  g.strokeStyle='rgba(8,6,5,.5)';g.lineWidth=3;g.beginPath();g.moveTo(566,2302);g.lineTo(566,2226);g.lineTo(590,2202);g.stroke();g.strokeStyle='rgba(214,204,192,.2)';g.lineWidth=1.2;g.beginPath();g.moveTo(569,2302);g.lineTo(569,2228);g.lineTo(592,2205);g.stroke()}
 // The rim is a tube round the window: dark, with a dull line of light along its crown.
 {const [a,b,c2,d]=rim;g.save();g.lineJoin='round';
  for(const [w,col,blur] of [[38,'#262321',0],[13,'rgba(104,96,90,.5)',8],[3,'rgba(190,180,170,.35)',3]] as const){g.lineWidth=w;g.strokeStyle=col;g.shadowColor=col;g.shadowBlur=blur;g.beginPath();g.roundRect(a-14,b-12,c2-a+28,d-b+24,42);g.stroke()}
  g.restore();speck([a-34,b-32,c2+34,d+32],900,.35)}
 const map=colour(c);
 // Spill: strongest on the rim round the window, fading across the plates.
 const [ec,eg]=sheet(SHROUD_BOX,.6),cx=(DX0+DX1)/2,cy=(DY0+DY1)/2;eg.fillStyle='#000';eg.fillRect(x0,y0,x1-x0,y1-y0);
 const f=eg.createRadialGradient(cx,cy,150,cx,cy,520);f.addColorStop(0,'rgba(255,120,30,.36)');f.addColorStop(.45,'rgba(240,96,18,.13)');f.addColorStop(1,'rgba(220,80,10,0)');eg.fillStyle=f;eg.fillRect(x0,y0,x1-x0,y1-y0);
 eg.lineJoin='round';for(const [w,a] of [[56,.05],[28,.12],[11,.34]]){eg.strokeStyle=`rgba(255,124,32,${a})`;eg.lineWidth=w;eg.beginPath();eg.roundRect(rim[0],rim[1],rim[2]-rim[0],rim[3]-rim[1],30);eg.stroke()}
 // The bottom plate catches the glow along its upper and lower edges.
 for(const y of [2192,2303]){const q=eg.createLinearGradient(0,y-10,0,y+10);q.addColorStop(0,'rgba(255,124,32,0)');q.addColorStop(.5,'rgba(255,124,32,.3)');q.addColorStop(1,'rgba(255,124,32,0)');eg.fillStyle=q;eg.fillRect(430,y-10,340,20)}
 return {map,glow:colour(ec)};
}
// The black block the right pipe runs into: matte, with a cap band, a raised faceted face, a stamped mark and a square boss near the tip.
export function manifoldTexture(box:Box,body:number[][]){
 const [c,g]=sheet(box,3),random=rng(61),[x0,y0,x1,y1]=box;
 g.fillStyle='#2a2725';g.fillRect(x0,y0,x1-x0,y1-y0);
 for(let i=0;i<5200;i++){g.fillStyle=random()<.5?'rgba(255,246,238,.035)':'rgba(0,0,0,.18)';g.fillRect(x0+random()*(x1-x0),y0+random()*(y1-y0),.6,.6)}
 const edge=(pts:number[][],close=true)=>{g.save();g.lineJoin='round';g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=3;outline(g,pts,close);g.stroke();g.translate(1,1.2);g.strokeStyle='rgba(255,246,238,.14)';g.lineWidth=1;outline(g,pts,close);g.stroke();g.restore()};
 edge([[x0,1347],[x1,1347]],false);edge([[x0,1330],[x1,1330]],false);
 edge(grow(body,-13));
 // Facets: the face falls away toward the tip either side of a centre line.
 const fall=g.createLinearGradient(x0,0,x1,0);fall.addColorStop(0,'rgba(0,0,0,.2)');fall.addColorStop(.5,'rgba(255,246,238,.04)');fall.addColorStop(1,'rgba(0,0,0,.26)');g.fillStyle=fall;g.fillRect(x0,1350,x1-x0,y1-1350);
 g.strokeStyle='rgba(120,112,106,.75)';g.lineWidth=2.6;g.lineJoin='miter';outline(g,[[1262,1398],[1244,1416],[1270,1444]],false);g.stroke();outline(g,[[1250,1416],[1258,1408],[1264,1414],[1256,1424]],false);g.stroke();
 for(const x of [1208,1272]){g.fillStyle='#0a0909';g.beginPath();g.arc(x,1390,4.2,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,246,238,.16)';g.lineWidth=1;g.beginPath();g.arc(x,1390,5,.4,2.2);g.stroke()}
 edge([[1230,1546],[1230,1486],[1274,1486],[1274,1512]],false);
 return colour(c);
}
// Flutes for the brass cone: narrow ridges all the way round, over the same swept sheen as other turned metal.
export function fluteMap(n=40){
 const [c,g]=canvas(1024,8);
 for(let x=0;x<1024;x++){const u=x/1024,v=(.74+.2*Math.cos(Math.PI*4*(u-.625)))*(.84+.16*Math.cos(Math.PI*2*n*u)),l=Math.round(255*Math.min(1,v));g.fillStyle=`rgb(${l},${l},${l})`;g.fillRect(x,0,1,8)}
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// One warm band on black, wrapped along a pipe.
export function pulseTexture(){
 const [c,g]=canvas(256,4),f=g.createLinearGradient(0,0,256,0);
 f.addColorStop(0,'#000');f.addColorStop(.3,'#140802');f.addColorStop(.5,'#c8781e');f.addColorStop(.62,'#2a1004');f.addColorStop(1,'#000');g.fillStyle=f;g.fillRect(0,0,256,4);
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ── Other faces ─────────────────────────────────────────────────────────────
// One contact band of a memory slot: rows of four fine contacts at half-millimetre pitch. The contacts cover about a
// third of the band, so when the texture is minified it settles to an even dark bronze instead of vanishing.
export function slotTexture(){
 const [c,g]=canvas(64,256),random=rng(23);g.fillStyle='#070606';g.fillRect(0,0,64,256);
 for(let y=4;y<256;y+=16)for(let i=0;i<4;i++){if(random()>.95)continue;g.fillStyle=`rgba(${205+random()*45|0},${196+random()*40|0},${180+random()*40|0},${.5+random()*.4})`;g.fillRect(5+i*14.5,y,9,8)}
 const t=colour(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Engraved lettering round a standoff's face: dark marks on clear, laid on as a decal.
export function ringText(text:string){
 const S=512,[c,g]=canvas(S,S),h=S/2;g.fillStyle='rgba(40,28,16,.85)';g.font=`700 ${S*.085}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
 [...text].forEach((ch,i)=>{const a=-2.4+i*.3;g.save();g.translate(h+Math.cos(a)*h*.8,h+Math.sin(a)*h*.8);g.rotate(a+Math.PI/2);g.fillText(ch,0,0);g.restore()});
 for(let i=0;i<3;i++){const a=1+i*.5;g.beginPath();g.arc(h+Math.cos(a)*h*.8,h+Math.sin(a)*h*.8,S*.016,0,Math.PI*2);g.fill()}
 return colour(c);
}
// Fan disc: flat orange brass with thin pale spokes, a paler ring round the hub.
export function fanTexture(lit:boolean){
 const S=512,[c,g]=canvas(S,S),h=S/2,random=rng(lit?71:73);
 const f=g.createRadialGradient(h,h,0,h,h,h);f.addColorStop(0,lit?'#ffcf80':'#d39a48');f.addColorStop(.55,lit?'#e08a2a':'#c4832e');f.addColorStop(1,lit?'#9a5416':'#a86c22');g.fillStyle=f;g.beginPath();g.arc(h,h,h,0,Math.PI*2);g.fill();
 for(let r=h*.45;r<h;r+=2.5){g.strokeStyle=`rgba(${random()<.5?'255,230,170':'60,30,0'},.06)`;g.lineWidth=1.2;g.beginPath();g.arc(h,h,r,0,Math.PI*2);g.stroke()}
 g.strokeStyle=lit?'rgba(255,226,160,.85)':'rgba(246,206,130,.8)';g.lineWidth=7;g.lineCap='butt';
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.2;g.beginPath();g.moveTo(h+Math.cos(a)*h*.5,h+Math.sin(a)*h*.5);g.lineTo(h+Math.cos(a)*h*.96,h+Math.sin(a)*h*.96);g.stroke()}
 g.fillStyle=lit?'#ffc060':'#e2a94e';g.beginPath();g.arc(h,h,h*.5,0,Math.PI*2);g.fill();g.strokeStyle='rgba(70,36,6,.5)';g.lineWidth=3;g.beginPath();g.arc(h,h,h*.5,0,Math.PI*2);g.stroke();
 g.fillStyle='rgba(40,20,4,.8)';g.beginPath();g.arc(h+h*.02,h+h*.72,h*.035,0,Math.PI*2);g.fill();
 g.strokeStyle='rgba(40,20,4,.7)';g.lineWidth=4;g.beginPath();g.arc(h,h,h-3,0,Math.PI*2);g.stroke();
 return colour(c);
}
