// Canvas textures for Verdant. Everything here is drawn; the reference image is never used as a texture.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {paintColour,paintRelief} from './paint';
import {IMG,COVER,HOSES,spots,ICS,footprints,PX,PLATE,type Box,type Chip,type P2,type Slot} from './layout';

const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};
const finish=(c:HTMLCanvasElement,colour=true)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;return t};
type G=CanvasRenderingContext2D;
const rr=(g:G,x0:number,y0:number,x1:number,y1:number,r=0)=>{g.beginPath();g.roundRect(x0,y0,x1-x0,y1-y0,Math.max(0,Math.min(r,(x1-x0)/2,(y1-y0)/2)))};
// Package markings the way makers print them: a part number, then a date code (year and week) with a lot code.
const pick=(random:()=>number,from:string)=>from[Math.floor(random()*from.length)];
const digits=(random:()=>number,n:number)=>Array.from({length:n},()=>pick(random,'0123456789')).join('');
const partNo=(random:()=>number,short=false)=>pick(random,'VTMLAXS')+pick(random,'DPCXRSN')+digits(random,short?3:4)+(short?'':pick(random,'ABCQT'));
const dateLot=(random:()=>number)=>`2${pick(random,'456')}${pick(random,'01234')}${pick(random,'123456789')} ${pick(random,'AKMT')}${digits(random,2)}`;
const FONT='"Helvetica Neue",Arial,sans-serif';

const trace=(g:G,path:P2[])=>{g.beginPath();path.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()};

// ── The board print ──────────────────────────────────────────────────────
// The print is vectors (lands, silk and lettering in print.ts, copper in routed.ts), painted by paint.ts onto a grid of tiles so it
// holds about 25 px per mm: one canvas that size would be 4,100 × 6,600 px. Each tile carries its own colour sheet and a half-size
// relief sheet (red is height, green is roughness). Mipmaps and anisotropy keep the fine lines steady from far away.
export const TILES={cols:2,rows:4};
export function boardTexture(){
 // Phones get half the resolution: the same tiles at a quarter of the memory.
 const phone=typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches,k=phone?1.275:2.55,tw=IMG.w/TILES.cols,th=IMG.h/TILES.rows;
 const [scratch]=canvas(tw*k,th*k),tiles:{box:Box;map:THREE.CanvasTexture;relief:THREE.CanvasTexture}[]=[];
 for(let row=0;row<TILES.rows;row++)for(let col=0;col<TILES.cols;col++){
  const box:Box=[col*tw,row*th,(col+1)*tw,(row+1)*th],[c,g]=canvas(tw*k,th*k),[r,h]=canvas(tw*k/2,th*k/2);
  paintColour(g,scratch,box,c.width/tw,c.height/th);paintRelief(h,box,r.width/tw,r.height/th);
  tiles.push({box,map:finish(c),relief:finish(r,false)});
 }
 scratch.width=scratch.height=2;
 const scale=4096/IMG.h,[shadeCanvas,shadeG]=canvas(IMG.w*scale/2,2048);shadeG.scale(scale/2,scale/2);
 // Soft shapes are painted small on a scratch canvas and stretched back, which blurs them by about `blur` pixels.
 const soft=(colour:string,blur:number,draw:(q:G)=>void,g:G)=>{
  const f=Math.max(2,blur*.8),[small,q]=canvas(IMG.w/f+2,IMG.h/f+2);
  q.scale(1/f,1/f);q.fillStyle=colour;q.strokeStyle=colour;draw(q);
  g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(small,0,0,small.width*f,small.height*f);g.restore();
 };
 // Contact shade under everything that stands up, on its own sheet. Two layers: a tight dark seat all round each part,
 // and a wide soft skirt, slightly lower than the part. Light is even, so this carries most of the depth.
 {
  const seat:((q:G)=>void)[]=[],skirt:((q:G)=>void)[][]=[[],[],[]];
  const outline=(q:G,f:{b:Box;round?:boolean},grow:number)=>{const [x0,y0,x1,y1]=f.b;if(f.round){q.beginPath();q.arc((x0+x1)/2,(y0+y1)/2,(x1-x0)/2+grow,0,Math.PI*2)}else rr(q,x0-grow,y0-grow,x1+grow,y1+grow,6+grow);q.fill()};
  for(const f of [...footprints,...ICS.filter(ic=>!ic.small).map(ic=>({b:ic.b,ht:1.2,on:undefined,round:false}))]){
   if(f.on)continue;
   const lift=Math.min(f.ht,12);
   seat.push(q=>outline(q,f,1+Math.min(lift,4)*.6));
   if(f.ht>1.3)skirt[f.ht>6?2:f.ht>3?1:0].push(q=>{q.save();q.translate(lift*.5,lift*1.5);outline(q,f,lift*1.1);q.restore()});
  }
  const hoseShade=(q:G,grow:number,dx:number,dy:number)=>{for(const hose of HOSES){q.save();q.translate(dx,dy);q.lineWidth=hose.r*2/PX+grow;q.lineCap='round';q.lineJoin='round';trace(q,hose.pts.map(([x,y])=>[x,y]));q.restore()}};
  const plateShade=(q:G,grow:number)=>{q.lineCap='round';for(const [x1,y1,x2,y2,w] of PLATE){q.lineWidth=w+grow;trace(q,[[x1,y1],[x2,y2]])}};
  seat.push(q=>{hoseShade(q,4,1,3);plateShade(q,4)});skirt[1].push(q=>{hoseShade(q,18,3,10);q.save();q.translate(2,6);plateShade(q,12);q.restore()});
  soft('rgba(0,3,1,.8)',4,q=>seat.forEach(draw=>draw(q)),shadeG);
  skirt.forEach((list,i)=>soft(`rgba(0,3,1,${[.5,.62,.72][i]})`,[9,18,34][i],q=>list.forEach(draw=>draw(q)),shadeG));
  // Small parts seat in a faint shade of their own, a touch to the lower right.
  shadeG.fillStyle='rgba(0,6,2,.4)';for(const s of spots)shadeG.fillRect(s.x-s.w/2+.6,s.y-s.d/2+1,s.w+.6,s.d+.8);
 }
 return {tiles,shade:finish(shadeCanvas)};
}

// ── Clouds: a few octaves of random cells stretched smooth and stacked. Returns values 0..1 on an N × N grid. ──
function cloud(N:number,random:()=>number,cells=[5,10,20,40,80,160]){
 const [c,g]=canvas(N,N);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 // Finest first: each coarser layer is laid over at half strength, so the broadest cloud carries the most weight.
 [...cells].reverse().forEach((n,i)=>{
  const [s,q]=canvas(n,n),d=q.createImageData(n,n);for(let k=0;k<n*n;k++){const v=random()*255;d.data[k*4]=d.data[k*4+1]=d.data[k*4+2]=v;d.data[k*4+3]=255}
  q.putImageData(d,0,0);g.globalAlpha=i?.5:1;g.drawImage(s,-N/n/2,-N/n/2,N+N/n,N+N/n);
 });
 const d=g.getImageData(0,0,N,N).data,out=new Float32Array(N*N);let lo=255,hi=0;
 for(let i=0;i<N*N;i++){const v=d[i*4];out[i]=v;if(v<lo)lo=v;if(v>hi)hi=v}
 for(let i=0;i<N*N;i++)out[i]=(out[i]-lo)/Math.max(1,hi-lo);
 return out;
}
const rgb=(hex:string)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
const step=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
// ── Weathered steel: blotched, oxidised colour, plus one grey map used for both roughness and bump. ──
// `patina` is how much of the face the dark oxide covers (0..1).
export function weathered(seed:number,light:string,mid:string,dark:string,pits=150,patina=.45){
 const N=1024,[c,g]=canvas(N,N),[d,h]=canvas(N,N),random=rng(seed);
 const big=cloud(N,random,[5,10,20,40,80]),fine=cloud(N,random,[8,16,32,64,128,256]),L=rgb(light),M=rgb(mid),D=rgb(dark);
 const colour=g.createImageData(N,N),relief=h.createImageData(N,N);
 for(let i=0;i<N*N;i++){
  // Oxide blooms where the broad cloud is low, with a ragged edge from the fine one; pale bloom rides the fine cloud's peaks.
  // A per-pixel jitter makes the edge of each bloom granular, the way oxide creeps across plate, instead of a smooth camouflage outline.
  const n=big[i]+(fine[i]-.5)*.3+(random()-.5)*.2,ox=1-step(patina-.05,patina+.05,n),pale=step(.6,.74,fine[i]+(big[i]-.5)*.3)*(1-ox*.7),shade=.9+fine[i]*.2;
  for(let k=0;k<3;k++){let v=M[k]+(D[k]-M[k])*ox;v+=(L[k]-v)*pale*.75;colour.data[i*4+k]=Math.max(0,Math.min(255,v*shade))}
  colour.data[i*4+3]=255;
  const r=178+ox*52-pale*36+(fine[i]-.5)*40;relief.data[i*4]=relief.data[i*4+1]=relief.data[i*4+2]=Math.max(0,Math.min(255,r));relief.data[i*4+3]=255;
 }
 g.putImageData(colour,0,0);h.putImageData(relief,0,0);
 // Grain.
 for(let i=0;i<42000;i++){const x=random()*N,y=random()*N,v=random();g.fillStyle=v<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)';g.fillRect(x,y,1.6,1.6);h.fillStyle=v<.5?'rgba(255,255,255,.08)':'rgba(0,0,0,.1)';h.fillRect(x,y,2,2)}
 // Scratches: fine pale hairlines, mostly one way, a few across.
 for(let i=0;i<150;i++){
  const x=random()*N,y=random()*N,a=(random()<.75?.5:2)+(random()-.5)*.6,l=20+random()*random()*240;
  g.strokeStyle=`rgba(232,236,238,${.08+random()*.2})`;g.lineWidth=.6+random()*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();
  h.strokeStyle='rgba(120,120,120,.5)';h.lineWidth=1.2;h.beginPath();h.moveTo(x,y);h.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);h.stroke();
 }
 // Pits: dark pinholes, a few of them larger with a pale rim.
 for(let i=0;i<pits;i++){
  const x=random()*N,y=random()*N,r=1+random()*random()*5;
  g.fillStyle='rgba(18,22,26,.8)';g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  if(r>3){g.strokeStyle='rgba(226,232,236,.45)';g.lineWidth=1;g.beginPath();g.arc(x+.6,y+.8,r+.8,0,Math.PI*2);g.stroke()}
  h.fillStyle='#202020';h.beginPath();h.arc(x,y,r+.6,0,Math.PI*2);h.fill();
 }
 const map=finish(c),detail=finish(d,false);
 for(const t of [map,detail]){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping}
 return {map,detail};
}
// ── Handling wear for smooth finishes: one grey roughness map of smudges, fingerprints of dust and hairline scratches. ──
export function wearTexture(seed=5){
 const N=512,[c,g]=canvas(N,N),random=rng(seed),n=cloud(N,random,[4,8,16,32,64]),d=g.createImageData(N,N);
 for(let i=0;i<N*N;i++){const v=150+n[i]*105;d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=v;d.data[i*4+3]=255}
 g.putImageData(d,0,0);
 for(let i=0;i<260;i++){const x=random()*N,y=random()*N,a=random()*6.28,l=6+random()*random()*90;g.strokeStyle=random()<.6?`rgba(255,255,255,${.2+random()*.4})`:`rgba(60,60,60,${.2+random()*.3})`;g.lineWidth=.5+random();g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 for(let i=0;i<2200;i++){g.fillStyle=`rgba(255,255,255,${.25+random()*.6})`;g.fillRect(random()*N,random()*N,1+random()*1.4,1+random()*1.4)}
 const t=finish(c,false);t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping;return t;
}
// Ribs for threads: a bump map of bands along the cylinder. Knurling: fine bands round it.
export function ribBump(){
 const [c,g]=canvas(8,64);for(let y=0;y<64;y++){const v=Math.round(128+110*Math.sin(y/64*Math.PI*2));g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(0,y,8,1)}
 const t=finish(c,false);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
export function knurlBump(){
 const [c,g]=canvas(64,8);for(let x=0;x<64;x++){const v=Math.round(128+110*Math.sin(x/64*Math.PI*2));g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x,0,1,8)}
 const t=finish(c,false);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Tone round the girth of a lying turned part: u runs round the cylinder, with the top at u = 0.75. Bright along the top,
// darker down the flanks, with turning marks and a few specks.
export function girthTexture(){
 const [c,g]=canvas(256,256),random=rng(71);
 for(let x=0;x<256;x++){const a=(x/256-.75)*Math.PI*2,k=Math.pow(Math.max(0,Math.cos(a)),1.6),v=Math.round(52+k*112);g.fillStyle=`rgb(${v},${v+2},${v+4})`;g.fillRect(x,0,1,256)}
 for(let i=0;i<70;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.07)';g.fillRect(0,random()*256,256,1)}
 for(let i=0;i<500;i++){g.fillStyle=random()<.6?'rgba(20,22,24,.3)':'rgba(240,242,244,.3)';g.fillRect(random()*256,random()*256,1+random(),1+random())}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ── Chip tops: laser etch, pin-1 dot, emblem. Transparent, laid over the bevelled body. ──
export function chipTop(chip:Chip,index:number){
 const [x0,y0,x1,y1]=chip.b,w=x1-x0,h=y1-y0,k=Math.max(6,Math.min(14,640/Math.max(w,h))),[c,g]=canvas(w*k,h*k),random=rng(900+index*17);
 g.scale(k,k);const pale=chip.tone==='pale',ink=pale?'rgba(244,246,242,.96)':'rgba(206,212,220,.92)',faint=pale?'rgba(60,64,62,.6)':'rgba(170,178,188,.55)';
 // A hairline inside the edge reads as the mould parting line.
 g.strokeStyle=pale?'rgba(255,255,255,.35)':'rgba(255,255,255,.12)';g.lineWidth=.6;rr(g,2.2,2.2,w-2.2,h-2.2,(chip.r??3)*.7);g.stroke();
 const m=Math.min(w,h);
 if(m>=22){
  // Pin-1 dimple.
  const r=Math.max(1.4,m*.05),dx=m>40?m*.14:4.6;g.fillStyle=pale?'rgba(70,74,72,.6)':'rgba(2,3,4,.9)';g.beginPath();g.arc(dx,h-dx,r,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(210,216,224,.5)';g.lineWidth=.45;g.beginPath();g.arc(dx,h-dx,r,.3,Math.PI+.3);g.stroke();
 }
 g.textAlign='center';g.textBaseline='middle';const cx=w/2,cy=h/2;
 g.strokeStyle=ink;g.fillStyle=ink;
 if(chip.emblem==='dial'){
  g.lineWidth=.9;g.beginPath();g.arc(cx,cy,m*.3,0,Math.PI*2);g.stroke();
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=m*.3;g.beginPath();g.moveTo(cx+Math.cos(a)*r*.82,cy+Math.sin(a)*r*.82);g.lineTo(cx+Math.cos(a)*r*.96,cy+Math.sin(a)*r*.96);g.stroke()}
  g.lineWidth=1.3;g.beginPath();g.moveTo(cx,cy);g.lineTo(cx-m*.02,cy-m*.2);g.stroke();g.strokeStyle='rgba(206,74,56,.95)';g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+m*.14,cy+m*.02);g.stroke();
  g.fillStyle='rgba(8,9,11,.9)';for(const dy of [-1,1]){g.beginPath();g.arc(cx,cy+dy*m*.44,m*.035,0,Math.PI*2);g.fill()}
 }else if(chip.emblem==='square'){
  g.lineWidth=1.1;rr(g,cx-m*.17,cy-m*.17,cx+m*.17,cy+m*.17,m*.04);g.stroke();g.font=`700 ${m*.2}px ${FONT}`;g.fillText('H',cx,cy+m*.01);
 }else if(chip.emblem==='cross'){
  g.lineWidth=1;g.beginPath();g.moveTo(w*.14,h*.14);g.lineTo(w*.86,h*.86);g.moveTo(w*.86,h*.14);g.lineTo(w*.14,h*.86);g.stroke();
  g.fillStyle='rgba(168,170,166,1)';g.fillRect(cx-m*.17,cy-m*.2,m*.34,m*.4);g.fillStyle=ink;g.font=`700 ${m*.26}px ${FONT}`;g.fillText('BK',cx,cy);
  g.lineWidth=.8;rr(g,w*.76,h*.78,w*.9,h*.88,2);g.stroke();
 }else if(chip.emblem==='ring'&&m>=22){
  g.lineWidth=.8;g.strokeStyle=faint;g.beginPath();g.arc(cx,cy-(chip.mark?m*.12:0),m*.12,0,Math.PI*2);g.stroke();
 }else if(chip.emblem==='bars'){
  g.fillStyle=faint;for(let i=0;i<3;i++)g.fillRect(w*.2,h*(.2+i*.07),w*.6,h*.025);
 }
 g.fillStyle=ink;
 if(chip.mark&&m>=24){
  const turn=h>w*1.25;g.save();g.translate(cx,cy+(chip.emblem==='ring'?m*.14:0));if(turn)g.rotate(-Math.PI/2);
  const s=Math.min(m*.24,13);g.font=`700 ${s}px ${FONT}`;g.fillText(chip.mark,0,0);
  if(m>=44){g.fillStyle=faint;g.font=`500 ${s*.5}px ${FONT}`;g.fillText(partNo(random),0,s*.95);g.fillText(dateLot(random),0,s*1.6)}
  g.restore();
 }else if(m>=17&&!chip.emblem){
  g.fillStyle=ink;const s=Math.min(m*.2,8);g.font=`600 ${s}px ${FONT}`;g.fillText(partNo(random,true),cx,cy-s*.6);g.fillText(dateLot(random).slice(0,4),cx,cy+s*.7);
 }
 // Dust and a smear, so no package looks freshly moulded.
 for(let i=0;i<w*h/26;i++){g.fillStyle=`rgba(214,218,222,${.05+random()*.16})`;g.fillRect(random()*w,random()*h,.25+random()*.35,.25+random()*.35)}
 {const f=g.createLinearGradient(0,0,w,h);f.addColorStop(0,'rgba(255,255,255,.05)');f.addColorStop(.5,'rgba(255,255,255,0)');f.addColorStop(1,'rgba(0,0,0,.12)');g.fillStyle=f;rr(g,1,1,w-1,h-1,chip.r??3);g.fill()}
 return finish(c);
}

// A shared laser-etched top for the small traced packages: hairline, pin-1 dimple, two lines of code.
export function etchedTop(){
 const [c,g]=canvas(256,256),random=rng(431);
 g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=3;rr(g,10,10,246,246,14);g.stroke();
 g.fillStyle='rgba(2,3,4,.85)';g.beginPath();g.arc(40,216,13,0,Math.PI*2);g.fill();g.strokeStyle='rgba(200,206,214,.4)';g.lineWidth=2;g.beginPath();g.arc(40,216,13,.3,Math.PI+.3);g.stroke();
 g.fillStyle='rgba(196,202,210,.7)';g.textAlign='center';g.textBaseline='middle';g.font=`700 44px ${FONT}`;g.fillText(partNo(random,true),128,104);g.font=`500 30px ${FONT}`;g.fillStyle='rgba(170,178,188,.5)';g.fillText(dateLot(random).slice(0,4),128,150);
 for(let i=0;i<160;i++){g.fillStyle=`rgba(220,224,228,${.04+random()*.1})`;g.fillRect(random()*256,random()*256,1.5,1.5)}
 return finish(c);
}

// ── Round tops ────────────────────────────────────────────────────────────
export function roundTop(style:string,text:string|undefined,seed:number){
 const N=384,[c,g]=canvas(N,N),random=rng(seed),o=N/2;
 g.translate(o,o);g.textAlign='center';g.textBaseline='middle';
 const arcText=(t:string,r:number,from:number,size:number,colour:string,step=.19)=>{g.fillStyle=colour;g.font=`700 ${size}px ${FONT}`;[...t].forEach((ch,i)=>{g.save();g.rotate(from+i*step);g.translate(0,-r);g.fillText(ch,0,0);g.restore()})};
 if(style==='silverCan'){
  // Brushed disc with two black vent notches and stamped ratings.
  {const f=g.createLinearGradient(-o,-o,o,o);f.addColorStop(0,'rgba(255,255,255,.2)');f.addColorStop(.55,'rgba(0,0,0,0)');f.addColorStop(1,'rgba(20,22,26,.42)');g.fillStyle=f;g.beginPath();g.arc(0,0,o,0,Math.PI*2);g.fill();g.strokeStyle='rgba(30,32,36,.55)';g.lineWidth=o*.07;g.beginPath();g.arc(0,0,o*.96,0,Math.PI*2);g.stroke()}
  for(let i=0;i<260;i++){g.strokeStyle=random()<.5?'rgba(255,255,255,.1)':'rgba(40,40,44,.07)';g.lineWidth=1;const r=random()*o*.92,a=random()*6.28;g.beginPath();g.arc(0,0,r,a,a+.5+random());g.stroke()}
  g.strokeStyle='rgba(60,62,66,.5)';g.lineWidth=2.5;g.beginPath();g.arc(0,0,o*.9,0,Math.PI*2);g.stroke();
  // Vent scores pressed into the lid.
  for(const a of [.5,2.6,4.7]){g.save();g.rotate(a);g.strokeStyle='rgba(40,42,46,.55)';g.lineWidth=2.4;g.beginPath();g.moveTo(0,o*.1);g.lineTo(0,o*.8);g.stroke();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=1.2;g.beginPath();g.moveTo(2.4,o*.1);g.lineTo(2.4,o*.8);g.stroke();g.restore()}
  g.fillStyle='#17181a';
  for(const a of text==='2'?[-.62,.62]:[-2.3,-.62]){g.save();g.rotate(a);g.translate(0,-o*.68);g.rotate(text==='2'?0:.5);rr(g,-o*.16,-o*.07,o*.16,o*.07,o*.05);g.fill();g.restore()}
  if(text==='2'){
   g.fillStyle='rgba(120,120,122,.34)';g.beginPath();g.arc(0,0,o*.34,0,Math.PI*2);g.fill();g.strokeStyle='rgba(70,70,74,.7)';g.lineWidth=2;g.stroke();
   for(let i=0;i<40;i++){g.save();g.rotate(i/40*6.283);g.fillStyle='rgba(60,60,64,.6)';g.fillRect(-1,-o*.32,2,o*.05);g.restore()}
   g.fillStyle='rgba(50,50,54,.8)';g.font=`700 ${o*.3}px ${FONT}`;g.fillText('2',0,0);
   g.fillStyle='#222';g.beginPath();g.arc(o*.1,-o*.74,o*.035,0,Math.PI*2);g.fill();
  }else if(text==='4'){
   g.fillStyle='rgba(70,72,76,.75)';g.beginPath();g.moveTo(-o*.2,o*.06);g.lineTo(o*.16,-o*.18);g.lineTo(o*.2,-o*.02);g.lineTo(-o*.02,o*.2);g.closePath();g.fill();
   for(let i=0;i<90;i++){g.save();g.rotate(i/90*6.283);g.fillStyle='rgba(40,40,44,.55)';g.fillRect(-1.2,-o*.99,2.4,o*.07);g.restore()}
  }else if(text===''){
   g.strokeStyle='rgba(90,92,96,.45)';g.lineWidth=1.5;for(let i=0;i<5;i++){g.save();g.rotate(i/5*6.283+.3);g.beginPath();g.moveTo(0,0);g.lineTo(0,-o*.8);g.stroke();g.restore()}
   g.fillStyle='#1a1b1d';g.save();g.rotate(-.9);g.beginPath();g.moveTo(-o*.12,-o*.8);g.lineTo(o*.14,-o*.82);g.lineTo(o*.06,-o*.56);g.closePath();g.fill();g.restore();
   g.save();g.rotate(1.75);g.fillRect(-o*.05,-o*.86,o*.1,o*.22);g.restore();
  }else{
   g.save();g.rotate(2.9);g.fillStyle='rgba(44,46,50,.82)';g.font=`700 ${o*.3}px ${FONT}`;g.fillText('16',-o*.08,-o*.08);g.font=`700 ${o*.16}px ${FONT}`;g.fillText('470',o*.28,-o*.34);g.fillText('105C',-o*.2,o*.24);g.fillRect(o*.08,-o*.2,o*.3,o*.03);g.restore();
  }
 }else if(style==='blackCan'){
  const [a,b]=(text??'').split('|');g.rotate(-.12);
  g.fillStyle='rgba(238,240,242,.95)';g.font=`italic 800 ${o*.26}px ${FONT}`;g.fillText(a,o*.08,-o*.42);g.font=`800 ${o*.36}px ${FONT}`;g.fillText(b??'',0,o*.05);
  g.fillStyle='rgba(200,204,208,.5)';g.font=`600 ${o*.09}px ${FONT}`;g.fillText('680 UF  2.5 V  105 C',0,o*.36);
  g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=2;g.beginPath();g.arc(0,0,o*.9,0,Math.PI*2);g.stroke();
 }else if(style==='navyPost'){
  g.strokeStyle='rgba(196,206,222,.5)';g.lineWidth=1.6;for(const r of [.93,.52])
  {g.beginPath();g.arc(0,0,o*r,0,Math.PI*2);g.stroke()}
  arcText(text??'',o*.74,-1.6,o*.17,'rgba(214,222,236,.9)',.26);
  for(let i=0;i<110;i++){g.save();g.rotate(i/110*6.283);g.fillStyle='rgba(8,10,16,.5)';g.fillRect(-1.4,-o,2.8,o*.06);g.restore()}
 }else if(style==='blackPost'){
  g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=2;for(const r of [.9,.6,.3]){g.beginPath();g.arc(0,0,o*r,0,Math.PI*2);g.stroke()}
  arcText(text??'',o*.74,-.38,o*.13,'rgba(150,154,160,.7)',.19);
 }else if(style==='bigPost'){
  g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=2;for(const r of [.92,.7,.4]){g.beginPath();g.arc(0,0,o*r,0,Math.PI*2);g.stroke()}
  arcText('M6 STANDOFF  ·  2.0 N·M  ·',o*.8,-1.2,o*.1,'rgba(120,124,130,.5)',.17);
 }else if(style==='boss'){
  g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=2;g.beginPath();g.arc(0,0,o*.72,0,Math.PI*2);g.stroke();
  g.fillStyle='rgba(170,174,180,.6)';g.font=`700 ${o*.34}px ${FONT}`;g.rotate(seed%3-.8);g.fillText(['M4','A7','·','M4'][seed%4],0,0);
 }else if(style==='knob'){
  g.fillStyle='rgba(236,238,240,.92)';g.save();g.rotate(.7);g.beginPath();g.moveTo(-o*.16,-o*.5);g.lineTo(o*.3,-o*.5);g.lineTo(o*.3,-o*.2);g.closePath();g.fill();g.restore();
  for(let i=0;i<60;i++){g.save();g.rotate(i/60*6.283);g.fillStyle='rgba(255,255,255,.12)';g.fillRect(-1.5,-o,3,o*.08);g.restore()}
 }
 return finish(c);
}

// ── Memory slots: black bodies with combs of contacts along each lane. ────────
export function slotTexture(slot:Slot){
 const [x0,y0,x1,y1]=slot.b,w=x1-x0,h=y1-y0,long=slot.vertical?h:w,across=slot.vertical?w:h,k=Math.min(4,4096/long);
 const [c,g]=canvas(w*k,h*k),random=rng(slot.lanes*31+x0);
 // Draw as if the slot ran down the canvas, then turn for the horizontal one.
 if(slot.vertical)g.scale(k,k);else{g.scale(k,k);g.translate(0,h);g.rotate(-Math.PI/2)}
 g.fillStyle='#0a0b0c';g.fillRect(0,0,across,long);
 const lane=across/slot.lanes;
 for(let i=0;i<slot.lanes;i++){
  const a=i*lane;
  // Rails either side of the card groove.
  g.fillStyle='#16181b';g.fillRect(a+lane*.16,0,lane*.2,long);g.fillRect(a+lane*.66,0,lane*.2,long);
  g.fillStyle='#030303';g.fillRect(a+lane*.4,6,lane*.22,long-12);
  // The comb: bright contacts, a few of them dull.
  for(let y=5;y<long-5;y+=3.4){
   const gold=slot.tabs==='gold'&&slot.vertical&&y>long*.82;
   g.fillStyle=gold?'#b89850':random()<.1?'#6a6d6e':'#d6d6d0';g.fillRect(a+lane*.03,y,lane*.1,1.5);
   if(i===slot.lanes-1){g.fillStyle=gold?'#b89850':'#d6d6d0';g.fillRect(across-lane*.13,y,lane*.1,1.5)}
   if(y%13<3.4){g.fillStyle='rgba(120,130,150,.5)';g.fillRect(a+lane*.5,y,1.4,1.4)}
  }
 }
 // Part number printed down one rail.
 g.save();g.translate(lane*(slot.lanes>2?1.5:.97),long*.5);g.rotate(-Math.PI/2);g.fillStyle='rgba(226,228,224,.82)';g.font=`700 ${lane*.15}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
 g.restore();
 return finish(c);
}

// ── Lime cover: anodised lime with a soft radial sheen that swirls round the window, and a little handling wear. ──
export function coverTexture(){
 const [x0,y0,x1,y1]=COVER.b,w=x1-x0,h=y1-y0,[c,g]=canvas(w*2,h*2),random=rng(11);g.scale(2,2);
 g.fillStyle='#74b236';g.fillRect(0,0,w,h);
 // Sheen: wedges of lighter and darker lime fanned from the window, painted small and stretched so they melt together.
 const f=44,[small,q]=canvas(w/f,h/f);q.scale(1/f,1/f);
 const cx=((COVER.win[0]+COVER.win[2])/2-x0),cy=((COVER.win[1]+COVER.win[3])/2-y0),reach=Math.hypot(w,h);
 const wedges:[number,number,string][]=[[-2.5,.5,'rgba(150,214,74,0.25)'],[-1.9,.34,'rgba(64,142,46,0.17)'],[-1.2,.5,'rgba(132,202,64,0.20)'],[-.55,.4,'rgba(60,140,44,0.20)'],[.15,.42,'rgba(120,192,58,0.15)'],[.8,.5,'rgba(66,146,46,0.18)'],[1.5,.4,'rgba(128,198,62,0.17)'],[2.2,.5,'rgba(62,142,46,0.20)'],[2.85,.36,'rgba(138,206,68,0.18)']];
 for(const [a,spread,colour] of wedges){q.fillStyle=colour;q.beginPath();q.moveTo(cx,cy);q.arc(cx,cy,reach,a-spread,a+spread);q.closePath();q.fill()}
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(small,0,0,w,h);
 // A darker ring close round the window and a lift toward the rim.
 const ring=g.createRadialGradient(cx,cy,w*.2,cx,cy,w*.72);ring.addColorStop(0,'rgba(40,116,36,.3)');ring.addColorStop(.45,'rgba(60,140,44,.08)');ring.addColorStop(1,'rgba(160,216,80,.2)');g.fillStyle=ring;g.fillRect(0,0,w,h);
 // Faint circular polishing marks, dust and two short scuffs.
 g.lineWidth=.5;for(let i=0;i<70;i++){const r=w*(.2+random()*.6),a=random()*6.28;g.strokeStyle=random()<.5?'rgba(210,240,150,.05)':'rgba(30,90,30,.05)';g.beginPath();g.arc(cx,cy,r,a,a+.3+random()*1.2);g.stroke()}
 for(let i=0;i<2600;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.035)':'rgba(0,40,0,.04)';g.fillRect(random()*w,random()*h,1,1)}
 for(let i=0;i<7;i++){const x=random()*w,y=random()*h,a=random()*6.28,l=6+random()*22;g.strokeStyle='rgba(226,246,190,.14)';g.lineWidth=.5;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
 return finish(c);
}

// ── Hose print: white type repeated along the rubber. ────────────────────────
export function hoseTexture(){
 const [c,g]=canvas(2048,256);g.fillStyle='#121315';g.fillRect(0,0,2048,256);
 g.fillStyle='rgba(236,238,240,.92)';g.font=`800 58px ${FONT}`;g.textBaseline='middle';
 for(const y of [64,192]){g.fillText('COOLANT HOSE EPDM 3/8 ID   WP 1.0 MPA   ||||||||||   VERDANT LOOP',20,y,2000)}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ── Labels, fins, pins and other small surface detail. Transparent unless stated. ──
export function labelTexture(kind:string,w:number,h:number,seed=1){
 const k=kind.startsWith('rail:')?Math.min(8,4096/Math.max(w,h)):Math.min(6,768/Math.max(w,h)),[c,g]=canvas(w*k,h*k),random=rng(seed);g.scale(k,k);g.textAlign='center';g.textBaseline='middle';
 if(kind==='fins-v'||kind==='fins-h'){
  const v=kind==='fins-v',n=v?h:w;for(let a=1;a<n;a+=4.2){g.fillStyle='rgba(0,0,0,.72)';if(v)g.fillRect(1.5,a,w-3,2.1);else g.fillRect(a,1.5,2.1,h-3);g.fillStyle='rgba(255,255,255,.1)';if(v)g.fillRect(1.5,a+2.1,w-3,.7);else g.fillRect(a+2.1,1.5,.7,h-3)}
 }else if(kind==='pins'){
  g.fillStyle='rgba(20,22,24,.9)';g.fillRect(0,h*.62,w,h*.38);for(let x=2;x<w;x+=6.4){g.fillStyle='rgba(30,32,34,.85)';g.fillRect(x+3.8,0,2.6,h*.62);g.fillStyle='rgba(236,236,232,.95)';g.fillRect(x,h*.5,3.6,h*.5)}
 }else if(kind==='slots'){
  g.fillStyle='rgba(90,74,50,.9)';for(const y of [.08,.38,.66,.9]){g.beginPath();g.arc(w*.42+random()*w*.2,h*y,2.6,0,Math.PI*2);g.fill()}
  g.fillStyle='rgba(60,50,36,.9)';g.beginPath();g.arc(w*.5,h*.26,1.6,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;rr(g,3,3,w-3,h-3,6);g.stroke();
 }else if(kind==='coil'){
  g.fillStyle='rgba(16,16,18,.94)';const v=h>w;for(const f of [.4,.52,.64]){if(v)g.fillRect(0,h*f,w,h*.07);else g.fillRect(w*f,0,w*.07,h)}
 }else if(kind==='window'){
  g.fillStyle='#17181b';rr(g,w*.2,h*.26,w*.8,h*.74,h*.2);g.fill();
 }else if(kind==='segments'){
  // A sprung clip in five leaves: a dark seam between each, a soft highlight down one side.
  for(let i=1;i<5;i++){g.fillStyle='rgba(70,60,30,.6)';g.fillRect(0,h*i/5-.6,w,1.2);g.fillStyle='rgba(255,250,220,.3)';g.fillRect(0,h*i/5+.6,w,.8)}
  g.fillStyle='rgba(255,250,224,.22)';g.fillRect(w*.12,0,w*.2,h);g.fillStyle='rgba(60,50,24,.25)';g.fillRect(w*.56,0,w*.1,h);
 }else if(kind==='icon'){
  g.strokeStyle='rgba(60,64,68,.6)';g.lineWidth=1.4;g.beginPath();g.arc(w/2,h/2,w*.34,0,Math.PI*2);g.stroke();g.fillStyle='rgba(60,64,68,.65)';g.font=`700 ${w*.4}px ${FONT}`;g.fillText('ABCDE'[seed%5],w/2,h/2+1);
 }else if(kind==='can'){
  // A drawn-steel can: a soft bright rim, a brushed face and one or two dark slots.
  const f=g.createLinearGradient(0,0,w,h);f.addColorStop(0,'rgba(255,255,255,.28)');f.addColorStop(.5,'rgba(255,255,255,.04)');f.addColorStop(1,'rgba(0,0,0,.22)');g.fillStyle=f;rr(g,0,0,w,h,Math.min(w,h)*.18);g.fill();
  g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.8;rr(g,1.2,1.2,w-1.2,h-1.2,Math.min(w,h)*.16);g.stroke();
  for(let i=0;i<40;i++){g.strokeStyle=random()<.5?'rgba(255,255,255,.08)':'rgba(30,30,34,.08)';g.lineWidth=.4;const y=random()*h;g.beginPath();g.moveTo(random()*w*.4,y);g.lineTo(w*(.6+random()*.4),y);g.stroke()}
  g.fillStyle='rgba(22,22,24,.92)';const m=Math.min(w,h);
  if(m>=26){rr(g,w*.42,h*.3,w*.74,h*.38,m*.04);g.fill();rr(g,w*.5,h*.62,w*.82,h*.7,m*.04);g.fill()}else if(m>=14){rr(g,w*.44,h*.34,w*.56,h*.66,m*.05);g.fill()}
 }else if(kind==='screw'){
  g.fillStyle='rgba(236,236,232,.9)';g.beginPath();g.arc(w/2,h/2,w*.34,0,Math.PI*2);g.fill();g.strokeStyle='rgba(80,82,86,.9)';g.lineWidth=1.2;g.stroke();g.save();g.translate(w/2,h/2);g.rotate(random()*3);g.fillStyle='rgba(60,62,66,.9)';g.fillRect(-w*.3,-1.2,w*.6,2.4);g.restore();
 }else if(kind==='brushed'){
  for(let i=0;i<70;i++){g.strokeStyle=random()<.5?'rgba(255,255,255,.2)':'rgba(40,40,44,.14)';g.lineWidth=.7;const y=random()*h,x=random()*w;g.beginPath();g.moveTo(x,y);g.lineTo(x+10+random()*30,y-4-random()*8);g.stroke()}
 }else if(kind==='ic'){
  g.strokeStyle='rgba(60,64,60,.8)';g.lineWidth=1;rr(g,w*.16,h*.16,w*.84,h*.84,1);g.stroke();g.fillStyle='rgba(60,64,60,.8)';for(let i=0;i<3;i++)g.fillRect(w*.26,h*(.3+i*.17),w*(.2+random()*.3),h*.08);
 }else if(kind==='tags'){
  for(let i=0;i<5;i++){const x=w*(.08+random()*.5),y=h*(.08+i*.18),tw=w*(.2+random()*.2),th=h*.11;g.fillStyle='rgba(206,208,210,.92)';rr(g,x,y,x+tw,y+th,2);g.fill();g.fillStyle='rgba(22,22,24,.9)';g.font=`800 ${th*.8}px ${FONT}`;g.fillText('ULFJEC'[Math.floor(random()*6)],x+tw/2,y+th/2)}
 }else if(kind==='RA'){
  g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=2;rr(g,w*.12,h*.2,w*1.2,h*.8,6);g.stroke();g.fillStyle='rgba(86,88,92,.55)';g.font=`800 ${h*.3}px ${FONT}`;g.fillText('RA',w*.72,h*.52);
 }else if(kind==='3D9D'){
  g.strokeStyle='rgba(255,255,255,.13)';g.lineWidth=1.4;g.beginPath();g.moveTo(w*.62,h*.06);g.lineTo(w*.62,h*.86);g.quadraticCurveTo(w*.62,h*.94,w*.3,h*.94);g.stroke();
  for(let y=4;y<h*.5;y+=3){g.fillStyle='rgba(255,255,255,.035)';g.fillRect(w*.1,y,w*.4,1)}
  g.save();g.translate(w*.62,h*.44);g.fillStyle='rgba(226,228,230,.88)';g.font=`700 ${w*.17}px ${FONT}`;g.fillText('USB3',0,0);g.restore();
 }else if(kind.startsWith('rail:')){
  // Printed down a memory slot's rail: its name, the module it takes, the supply.
  g.save();g.translate(w/2,h/2);g.rotate(-Math.PI/2);g.fillStyle='rgba(232,234,230,.9)';g.font=`700 ${w*.8}px ${FONT}`;g.fillText(kind.slice(5),0,0);g.restore();
 }else if(kind==='engrave'){
  g.save();g.translate(w/2,h/2);g.rotate(-Math.PI/2);g.fillStyle='rgba(40,44,48,.75)';g.font=`700 ${w*.4}px ${FONT}`;g.fillText('M8 · 91',0,0);g.restore();g.strokeStyle='rgba(40,44,48,.5)';g.lineWidth=1;g.beginPath();g.moveTo(w*.82,h*.1);g.lineTo(w*.82,h*.9);g.stroke();
 }else if(kind==='etch'){
  g.save();g.translate(w*.5,h*.5);g.rotate(-Math.PI/2);g.fillStyle='rgba(196,200,204,.8)';g.font=`700 ${w*.3}px ${FONT}`;g.fillText('VERDANT',0,-w*.08);g.font=`500 ${w*.13}px ${FONT}`;g.fillText('MODEL 3 · IO-2',0,w*.3);g.restore();
 }else if(kind==='knurl'){
  for(let y=0;y<h;y+=2.6){g.fillStyle='rgba(0,0,0,.5)';g.fillRect(w*.3,y,w*.5,1.2)}
 }else if(kind==='screwhead'){
  g.fillStyle='rgba(190,194,198,.9)';g.beginPath();g.arc(w*.42,h*.6,w*.13,0,Math.PI*2);g.fill();g.fillStyle='rgba(40,42,46,.9)';g.fillRect(w*.3,h*.59,w*.24,h*.03);
  for(const [x,y] of [[.14,.2],[.3,.3],[.8,.25],[.16,.82],[.86,.84]]){g.fillStyle='rgba(8,8,10,.85)';g.beginPath();g.arc(w*x,h*y,w*.035,0,Math.PI*2);g.fill()}
 }else{
  // Free text, e.g. the rating printed on the oblong capacitor.
  g.save();g.translate(w/2,h/2);if(h>w)g.rotate(Math.PI/2);g.fillStyle='rgba(236,238,240,.92)';g.font=`800 ${Math.min(w,h)*.3}px ${FONT}`;g.fillText(kind,0,0);g.restore();
 }
 return finish(c);
}

// ── Socket tops ───────────────────────────────────────────────────────────
// The lower socket's chip: fine diagonal hatching around a plain raised square.
export function hatchTexture(w:number,h:number){
 const k=3,[c,g]=canvas(w*k,h*k);g.scale(k,k);g.fillStyle='#17181a';g.fillRect(0,0,w,h);
 g.strokeStyle='rgba(255,255,255,.075)';g.lineWidth=.9;for(let a=-h;a<w;a+=3.6){g.beginPath();g.moveTo(a,h);g.lineTo(a+h,0);g.stroke()}
 // Contact comb along the top and bottom edges.
 for(let x=40;x<w-40;x+=4.6){g.fillStyle='rgba(206,206,200,.8)';g.fillRect(x,7,2.2,7);g.fillStyle='rgba(196,170,96,.75)';g.fillRect(x,h-15,2.2,6)}
 g.fillStyle='rgba(206,206,200,.6)';g.save();g.translate(w-8,h*.5);g.rotate(-Math.PI/2);g.font=`600 6px ${FONT}`;g.textAlign='center';g.fillText('SKT 0417  REV B',0,0);g.restore();
 return finish(c);
}
export function ribTexture(w:number,h:number){
 const k=4,[c,g]=canvas(w*k,h*k);g.scale(k,k);g.fillStyle='#8a8781';g.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=2.4){g.fillStyle='rgba(40,40,40,.4)';g.fillRect(0,y,w,1)}
 return finish(c);
}
// Glow sprite for LEDs and travelling pulses.
export function glowTexture(){
 const [c,g]=canvas(128,128),f=g.createRadialGradient(64,64,0,64,64,64);f.addColorStop(0,'rgba(255,255,255,1)');f.addColorStop(.25,'rgba(255,255,255,.55)');f.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=f;g.fillRect(0,0,128,128);
 return finish(c);
}
// Bands that drift along the brass pipe while coolant moves.
export function flowTexture(){
 const [c,g]=canvas(256,8);g.fillStyle='#000';g.fillRect(0,0,256,8);
 for(let i=0;i<4;i++){const f=g.createLinearGradient(i*64,0,i*64+64,0);f.addColorStop(0,'#000');f.addColorStop(.5,'#fff');f.addColorStop(1,'#000');g.fillStyle=f;g.fillRect(i*64,0,64,8)}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// A soft studio reflection for the die behind the cover's window: one broad diagonal band, a faint second one, hairline scratches and dust.
export function sheenTexture(){
 const [c,g]=canvas(512,640),random=rng(3);g.translate(256,320);g.rotate(-.75);
 const f=g.createLinearGradient(0,-220,0,220);f.addColorStop(0,'rgba(255,255,255,0)');f.addColorStop(.36,'rgba(196,210,218,.04)');f.addColorStop(.5,'rgba(196,210,218,.012)');f.addColorStop(.68,'rgba(196,210,218,.025)');f.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=f;g.fillRect(-520,-220,1040,440);
 g.fillStyle='rgba(220,230,236,.1)';g.fillRect(-120,-70,180,1.2);g.fillRect(-20,84,120,1.2);g.fillRect(-160,10,60,1);
 g.setTransform(1,0,0,1,0,0);for(let i=0;i<220;i++){g.fillStyle=`rgba(226,232,236,${.06+random()*.22})`;g.fillRect(random()*512,random()*640,1+random()*1.6,1+random()*1.6)}
 return finish(c);
}
