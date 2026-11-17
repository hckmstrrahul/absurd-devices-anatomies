// Frost's canvas textures: the board print, the finishes (brushed steel, moulded plastic, laser-marked packages, polyimide),
// and the little display. Every name, part number and marking in here is invented.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {IMG,type Box} from './print';
import {make,paintColour,paintRelief,paintBottom} from './paint';

type G=CanvasRenderingContext2D;
const finish=(c:HTMLCanvasElement,colour=true,repeat=false)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
const phone=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
const SANS='"Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, sans-serif',NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif',SERIF='"Times New Roman", Times, Georgia, serif',MONO='ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// ── The board print: one colour sheet at 32 px per mm (2,880 × 2,240), a relief sheet at 20, the underside at 12. ──
export function boardTextures(){
 const k=(phone()?16:32)/10,view:Box=[0,0,IMG.w,IMG.h];
 const [c,g]=make(IMG.w*k,IMG.h*k),[scratch]=make(IMG.w*k,IMG.h*k);paintColour(g,scratch,view,k);
 const kr=k*.625,[r,h]=make(IMG.w*kr,IMG.h*kr);paintRelief(h,scratch,view,kr);
 const kb=1.2,[bc,bg]=make(IMG.w*kb,IMG.h*kb);paintBottom(bg,scratch,kb);
 scratch.width=scratch.height=2;
 return {map:finish(c),relief:finish(r,false),bottom:finish(bc)};
}

// ── Finishes ─────────────────────────────────────────────────────────────
// Stamped, brushed steel: fine streaks along u in colour, height and roughness, with a little straw-and-blue heat tint.
// `relief` packs height in red and roughness in green.
export function brushed(seed:number,base='#dcdfe2',tint=1){
 const N=1024,random=rng(seed),[c,g]=make(N,N),[r,h]=make(N,N);
 g.fillStyle=base;g.fillRect(0,0,N,N);h.fillStyle='rgb(128,40,0)';h.fillRect(0,0,N,N);
 for(let i=0;i<14000;i++){
  const y=Math.floor(random()*N),x=random()*N,len=30+random()*300,light=random()<.5,a=.008+random()*.022;
  g.fillStyle=light?`rgba(255,255,255,${a})`:`rgba(40,46,56,${a})`;g.fillRect(x,y,len,1);if(x+len>N)g.fillRect(x-N,y,len,1);
  h.fillStyle=`rgba(${light?160:100},${light?26:70},0,${a*7})`;h.fillRect(x,y,len,1);if(x+len>N)h.fillRect(x-N,y,len,1);
 }
 // Heat tint: broad and faint, wrapped so the sheet tiles without a seam.
 for(let i=0;i<7*tint;i++){
  const x=random()*N,y=random()*N,rad=200+random()*260,warm=random()<.7,a=(warm?.08:.05)+random()*.07,col=warm?'186,138,84':'104,122,160';
  for(const ox of [-N,0,N])for(const oy of [-N,0,N]){
   const f=g.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rad);f.addColorStop(0,`rgba(${col},${a})`);f.addColorStop(.6,`rgba(${col},${a*.45})`);f.addColorStop(1,`rgba(${col},0)`);g.fillStyle=f;g.fillRect(x+ox-rad,y+oy-rad,rad*2,rad*2);
   const q=h.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rad);q.addColorStop(0,`rgba(128,110,0,${a*1.6})`);q.addColorStop(1,'rgba(128,110,0,0)');h.fillStyle=q;h.fillRect(x+ox-rad,y+oy-rad,rad*2,rad*2);
  }
 }
 return {map:finish(c,true,true),relief:finish(r,false,true)};
}
// Moulding texture for matte plastics: a fine pebble in height and roughness.
export function grain(seed:number,rough=196,spread=34){
 const N=256,random=rng(seed),[c,g]=make(N,N),image=g.createImageData(N,N),d=image.data;
 for(let i=0;i<N*N;i++){const n=random(),m=random();d[i*4]=110+n*60;d[i*4+1]=rough-spread/2+m*spread;d[i*4+2]=0;d[i*4+3]=255}
 g.putImageData(image,0,0);
 // Soften once so it reads as moulding, not noise.
 const [s,q]=make(N,N);q.filter='blur(.6px)';q.drawImage(c,0,0);q.filter='none';
 return finish(s,false,true);
}
// Fine lines along v: the die marks of an extrusion.
export function drawn(seed:number){
 const N=256,random=rng(seed),[c,g]=make(N,N);g.fillStyle='rgb(128,120,0)';g.fillRect(0,0,N,N);
 for(let x=0;x<N;x++){const v=random();g.fillStyle=`rgba(${v<.5?70:190},${v<.5?150:100},0,${.1+random()*.3})`;g.fillRect(x,0,1,N)}
 return finish(c,false,true);
}
const speckle=(g:G,w:number,h:number,random:()=>number,n:number,light:string,dark:string,a=.5)=>{for(let i=0;i<n;i++){g.fillStyle=random()<.5?light:dark;g.globalAlpha=random()*a;g.fillRect(random()*w,random()*h,1+random()*1.4,1+random()*1.4)}g.globalAlpha=1};
// Our own mark: a six-armed frost crystal.
function crystal(g:G,x:number,y:number,r:number,w:number){
 g.lineWidth=w;g.lineCap='round';g.beginPath();
 for(let i=0;i<6;i++){const a=i*Math.PI/3,cx=Math.cos(a),cy=Math.sin(a);g.moveTo(x,y);g.lineTo(x+cx*r,y+cy*r);for(const s of [-1,1]){const b=a+s*Math.PI/3.2;g.moveTo(x+cx*r*.58,y+cy*r*.58);g.lineTo(x+cx*r*.58+Math.cos(b)*r*.3,y+cy*r*.58+Math.sin(b)*r*.3)}}
 g.stroke();
}
// A moulded package top with laser marking. Sizes in mm; the sheet is drawn at 72 px per mm.
// The marking is paler and rougher than the compound, as a laser leaves it; pin one is a glossy dimple.
export type Marking={w:number;d:number;lines:string[];size?:number;mark?:boolean;pin?:[number,number];ink?:string;body?:string;turn?:boolean;align?:'left'|'center';bar?:'left'|'top'};
export function packageTop(m:Marking,seed=1){
 const k=72,W=m.w*k,H=m.d*k,random=rng(seed),[c,g]=make(W,H),[r,h]=make(W,H),body=m.body??'#1d1e21',ink=m.ink??'#9b9da0';
 g.fillStyle=body;g.fillRect(0,0,W,H);speckle(g,W,H,random,W*H/55,'#3a3c40','#0c0d0e',.5);
 h.fillStyle='rgb(128,182,0)';h.fillRect(0,0,W,H);speckle(h,W,H,random,W*H/40,'rgb(160,205,0)','rgb(96,160,0)',.6);
 // Ejector witness: a faint shallow circle.
 const e=Math.min(W,H)*.11;g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=2;g.beginPath();g.arc(W-e*2,H-e*2,e,0,Math.PI*2);g.stroke();h.fillStyle='rgba(116,150,0,.7)';h.beginPath();h.arc(W-e*2,H-e*2,e,0,Math.PI*2);h.fill();
 const draw=(q:G,style:string)=>{
  q.save();if(m.turn){q.translate(W/2,H/2);q.rotate(-Math.PI/2);q.translate(-H/2,-W/2)}
  const w=m.turn?H:W,ht=m.turn?W:H,size=(m.size??Math.min(ht/(m.lines.length+1.2),w/7))*1,left=m.align==='left';
  q.fillStyle=q.strokeStyle=style;q.textBaseline='middle';q.textAlign=left?'left':'center';
  const x=left?w*.2+(m.mark?size*1.5:0):w/2,y0=ht/2-(m.lines.length-1)*size*.62;
  m.lines.forEach((t,i)=>{q.font=`${i===0?700:500} ${Math.round(size*(i===0?1:.82))}px ${NARROW}`;try{(q as unknown as {letterSpacing:string}).letterSpacing=`${Math.round(size*.06)}px`}catch{/* older canvas */}q.fillText(t,x,y0+i*size*1.24)});
  if(m.mark)crystal(q,left?w*.2:w*.14,left?y0:ht*.2,size*.62,size*.11);
  if(m.bar==='left')q.fillRect(w*.035,ht*.08,w*.085,ht*.84);if(m.bar==='top')q.fillRect(w*.08,ht*.04,w*.84,ht*.1);
  q.restore();
 };
 g.globalAlpha=.86;draw(g,ink);g.globalAlpha=1;draw(h,'rgb(104,236,0)');
 if(m.pin){const [px,py]=m.pin,x=px*W,y=py*H,q=Math.min(W,H)*.045;g.fillStyle='#101113';g.beginPath();g.arc(x,y,q,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1.5;g.stroke();h.fillStyle='rgb(60,90,0)';h.beginPath();h.arc(x,y,q,0,Math.PI*2);h.fill()}
 return {map:finish(c),relief:finish(r,false)};
}
// An etched metal face (a processor lid, a crystal can, a coin cell): brushed plate with darker etched lettering.
export function etched(w:number,d:number,lines:string[],seed:number,opt:{round?:boolean;size?:number;mark?:boolean;plus?:boolean}={}){
 const k=64,W=w*k,H=d*k,random=rng(seed),[c,g]=make(W,H),[r,h]=make(W,H);
 g.fillStyle='#cfd2d5';g.fillRect(0,0,W,H);h.fillStyle='rgb(128,84,0)';h.fillRect(0,0,W,H);
 if(opt.round){
  // Spun finish: fine concentric rings.
  for(let i=0;i<340;i++){const q=random()*W*.5,a=.03+random()*.06;g.strokeStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(50,56,66,${a})`;g.lineWidth=1;g.beginPath();g.arc(W/2,H/2,q,0,Math.PI*2);g.stroke();h.strokeStyle=`rgba(${random()<.5?190:70},${random()<.5?60:130},0,${a*3})`;h.beginPath();h.arc(W/2,H/2,q,0,Math.PI*2);h.stroke()}
 }else for(let i=0;i<W*H/260;i++){const y=Math.floor(random()*H),x=random()*W,len=20+random()*W*.5,a=.03+random()*.06,light=random()<.5;g.fillStyle=light?`rgba(255,255,255,${a})`:`rgba(40,46,56,${a})`;g.fillRect(x,y,len,1);h.fillStyle=`rgba(${light?200:60},${light?60:140},0,${a*3})`;h.fillRect(x,y,len,1)}
 const size=opt.size??Math.min(H/(lines.length+1.6),W/8),y0=H/2-(lines.length-1)*size*.6+(opt.mark?size*.5:0);
 for(const [q,style] of [[g,'rgba(70,74,80,.9)'],[h,'rgb(96,190,0)']] as [G,string][]){
  q.fillStyle=q.strokeStyle=style;q.textAlign='center';q.textBaseline='middle';
  lines.forEach((t,i)=>{q.font=`${i===0?700:500} ${Math.round(size*(i===0?1:.78))}px ${NARROW}`;q.fillText(t,W/2,y0+i*size*1.2)});
  if(opt.mark)crystal(q,W/2,y0-size*1.5,size*.7,size*.1);
  if(opt.plus){q.lineWidth=size*.16;q.beginPath();q.moveTo(W*.5-size*.5,H*.2);q.lineTo(W*.5+size*.5,H*.2);q.moveTo(W*.5,H*.2-size*.5);q.lineTo(W*.5,H*.2+size*.5);q.stroke()}
 }
 return {map:finish(c),relief:finish(r,false)};
}
// Polyimide ribbon. u runs along the ribbon, v across it. Copper conductors show through the amber film as darker,
// slightly raised lines with a bright shoulder; both ends carry a stiffener and gold fingers.
export function ribbonTexture(length:number,width:number){
 const W=2048,H=512,ku=W/length,kv=H/width,[c,g]=make(W,H),[r,h]=make(W,H),random=rng(31);
 const base=g.createLinearGradient(0,0,0,H);base.addColorStop(0,'#f6a03a');base.addColorStop(.5,'#f29330');base.addColorStop(1,'#f59c36');g.fillStyle=base;g.fillRect(0,0,W,H);
 h.fillStyle='rgb(110,70,0)';h.fillRect(0,0,W,H);
 const n=30,pitch=.46*kv,y0=H/2-(n-1)*pitch/2,lw=.26*kv;
 for(let i=0;i<n;i++){
  // A few positions are left empty, so the conductors fall into groups.
  if(i===7||i===8||i===19)continue;
  const y=y0+i*pitch;g.fillStyle='#cf6a14';g.fillRect(0,y-lw/2,W,lw);g.fillStyle='rgba(255,206,130,.75)';g.fillRect(0,y-lw/2,W,1.4);g.fillStyle='rgba(150,70,10,.42)';g.fillRect(0,y+lw/2-1.4,W,1.4);
  h.fillStyle='rgb(176,96,0)';h.fillRect(0,y-lw/2,W,lw);
 }
 // Film blotches, so the long run is not one flat orange.
 for(let i=0;i<40;i++){const x=random()*W,y=random()*H,q=60+random()*200,f=g.createRadialGradient(x,y,0,x,y,q),a=.04+random()*.06,col=random()<.5?'255,214,150':'196,96,20';f.addColorStop(0,`rgba(${col},${a})`);f.addColorStop(1,`rgba(${col},0)`);g.fillStyle=f;g.fillRect(x-q,y-q,q*2,q*2)}
 // Selvedge.
 g.fillStyle='rgba(255,210,140,.45)';g.fillRect(0,0,W,.22*kv);g.fillRect(0,H-.22*kv,W,.22*kv);
 // Ends: a darker stiffener, then bare gold fingers.
 for(const end of [0,1]){
  const x0=end?W-4.2*ku:0,x1=end?W:4.2*ku;g.fillStyle='rgba(120,70,30,.42)';g.fillRect(x0,0,x1-x0,H);h.fillStyle='rgba(150,120,0,.7)';h.fillRect(x0,0,x1-x0,H);
  const f0=end?W-1.9*ku:0,f1=end?W:1.9*ku;for(let i=0;i<n;i++){const y=y0+i*pitch;g.fillStyle='#e6c476';g.fillRect(f0,y-lw*.62,f1-f0,lw*1.24);h.fillStyle='rgb(190,60,0)';h.fillRect(f0,y-lw*.62,f1-f0,lw*1.24)}
 }
 // A part number, printed once along the film.
 g.fillStyle='rgba(255,240,210,.8)';g.font=`600 ${Math.round(.62*kv)}px ${MONO}`;g.textBaseline='middle';g.fillText('HW-FPC30-075  94V-0  2634',W*.36,y0+7.5*pitch);
 return {map:finish(c),relief:finish(r,false)};
}
// The board's edge: mask, copper foils and glass-epoxy plies, looking in from the side. v runs through the thickness.
export function edgeTexture(){
 const W=256,H=128,[c,g]=make(W,H),random=rng(5);
 g.fillStyle='#cfd0bb';g.fillRect(0,0,W,H);
 // Glass weave: faint verticals and specks.
 for(let x=0;x<W;x+=2){g.fillStyle=`rgba(${random()<.5?'255,255,240':'120,118,90'},${.05+random()*.12})`;g.fillRect(x,0,1+random()*2,H)}
 speckle(g,W,H,random,1400,'#f2f1e2','#9c9a7c',.4);
 // Plies.
 g.fillStyle='rgba(120,116,88,.35)';for(const y of [.2,.5,.8])g.fillRect(0,H*y-1,W,2);
 // Foils: outer pair under the mask, two inner planes.
 g.fillStyle='#c98548';for(const y of [.065,.34,.66,.935])g.fillRect(0,H*y-2.2,W,4.4);
 g.fillStyle='rgba(255,220,170,.5)';for(const y of [.065,.34,.66,.935])g.fillRect(0,H*y-2.2,W,1.2);
 g.fillStyle='#eceded';g.fillRect(0,0,W,H*.045);g.fillRect(0,H*.955,W,H*.045);
 const t=finish(c,true,true);return t;
}

// ── The display: a 128 × 64 monochrome panel, redrawn from the pose. ──
export function screenTexture(){
 const W=256,H=128,[c,g]=make(W,H),history:number[]=[];
 const texture=finish(c);texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=true;
 let last='';
 function draw(p:{on:number;load:number;temp:number;clock:number;watts:number;throttle:number;rate:number;t:number}){
  // Twelve frames a second is plenty for a panel like this.
  const tick=Math.floor(p.t*12),key=p.on<.5?'off':String(tick);if(key===last)return;last=key;
  g.fillStyle='#000';g.fillRect(0,0,W,H);
  if(p.on<.5){history.length=0;texture.needsUpdate=true;return}
  history.push(p.temp);if(history.length>120)history.shift();
  const ice='#bfeaff',dim='#3d7ea0';
  g.fillStyle=ice;g.font=`700 22px ${MONO}`;g.textBaseline='top';g.textAlign='left';g.fillText('FROST',6,5);
  crystal(Object.assign(g,{strokeStyle:ice}),96,16,9,2);
  g.font=`600 13px ${MONO}`;g.textAlign='right';g.fillText(`${p.clock.toFixed(1)}GHz`,W-6,4);g.fillStyle=p.throttle>.3?'#ffb060':dim;g.fillText(p.throttle>.3?'THROTTLE':`${p.watts.toFixed(1)} W`,W-6,19);
  // Load bar.
  g.fillStyle=dim;g.textAlign='left';g.fillText('CPU',6,40);g.strokeStyle=ice;g.lineWidth=2;g.strokeRect(40,40,150,12);g.fillStyle=ice;for(let i=0;i<Math.round(p.load*24);i++)g.fillRect(43+i*6,43,4,6);
  g.textAlign='right';g.fillText(`${Math.round(p.load*100)}%`,W-6,40);
  // Temperature and its trace.
  g.fillStyle=p.temp>72?'#ffb060':ice;g.font=`700 30px ${MONO}`;g.textAlign='left';g.fillText(`${p.temp.toFixed(1)}`,6,64);g.font=`600 13px ${MONO}`;g.fillText('°C',6,98);
  g.strokeStyle=dim;g.lineWidth=1;g.strokeRect(118.5,62.5,131,58);
  g.strokeStyle=ice;g.lineWidth=2;g.beginPath();history.forEach((v,i)=>{const x=120+i*(128/120),y=118-Math.max(0,Math.min(1,(v-24)/64))*52;if(i)g.lineTo(x,y);else g.moveTo(x,y)});g.stroke();
  // Network tick.
  g.fillStyle=dim;g.font=`600 12px ${MONO}`;g.fillText(`${Math.round(p.rate)}pps`,40,100);
  texture.needsUpdate=true;
 }
 return {texture,draw};
}
// The display board's own small print.
export function modulePrint(w:number,d:number){
 const k=40,[c,g]=make(w*k,d*k);g.fillStyle='#ecedec';g.fillRect(0,0,w*k,d*k);
 g.fillStyle='#17181a';g.font=`700 ${Math.round(1.25*k)}px ${NARROW}`;g.textBaseline='middle';g.fillText('DSP-096  REV B',1.6*k,1.4*k);g.font=`500 ${Math.round(.9*k)}px ${NARROW}`;g.fillText('128x64  HVIT WERK',13.4*k,1.4*k);
 g.fillStyle='#d9b468';for(let i=0;i<30;i++)g.fillRect((w/2-7.25+i*.5-.13)*k,2.4*k,.26*k,1.5*k);
 for(const [x,y] of [[2,2.4],[w-2,2.4],[2,d-1.6],[w-2,d-1.6]]){g.fillStyle='#d9b468';g.beginPath();g.arc(x*k,(y+.2)*k,1.15*k,0,Math.PI*2);g.fill();g.fillStyle='#131416';g.beginPath();g.arc(x*k,(y+.2)*k,.6*k,0,Math.PI*2);g.fill()}
 return finish(c);
}
// Card label: a tiny printed face for the memory card.
export function cardLabel(){
 const [c,g]=make(440,600);g.fillStyle='#15161a';g.fillRect(0,0,440,600);g.strokeStyle='#bfeaff';crystal(g,220,190,90,12);
 g.fillStyle='#e9edf0';g.font=`700 84px ${NARROW}`;g.textAlign='center';g.fillText('FROST OS',220,400);g.font=`500 60px ${NARROW}`;g.fillStyle='#8f969c';g.fillText('32 GB · A1',220,490);
 return finish(c);
}
