// GA-P35-S3G canvas textures: the board print in tiles (from print.ts), its relief, and the small printed faces
// (capacitor tops and sleeves, choke values, package markings, the cooler's hub label, the heat sink's band,
// the port stickers, the processor lid). Colours were sampled from the photographs with scripts/devices/crop.mjs.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {BOARD,MARKS} from './layout';
import {buildPrint,type Text} from './print';

type G=CanvasRenderingContext2D;
export const make=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};
const finish=(c:HTMLCanvasElement,colour=true,repeat=false)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
const phone=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
export const SANS='Arial, "Helvetica Neue", Helvetica, sans-serif',HEAVY='"Arial Black", "Arial", "Helvetica Neue", sans-serif',NARROW='"Arial Narrow", Arial, sans-serif';

// ── Board colours (photo samples under the studio light: open mask #0f3c68…#1b2f4d, silk #e4e7ec, tinned lands #c4c4bd). ──
export const INK={mask:'#061f3e',plane:'#09294d',trace:'#0c2e57',traceDark:'#071730',via:'#173a66',open:'#081629',tin:'#9a9b97',silk:'#dfe3e9',hole:'#07090c'};
// The relief sheet packs height (red), roughness (green) and metalness (blue) for one material.
const RELIEF={mask:[96,150,0],plane:[112,128,0],trace:[132,118,0],silk:[150,200,0],pad:[132,110,150],hole:[0,255,0],via:[112,130,0]} as const;
const rel=(k:keyof typeof RELIEF)=>`rgb(${RELIEF[k].join(',')})`;
type View=[number,number,number,number];                     // x0, z0, x1, z1 in board mm
const place=(g:G,v:View,k:number)=>g.setTransform(k,0,0,k,-v[0]*k,-v[1]*k);
const poly=(g:G,p:number[])=>{g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1])};

function font(t:Text){
 const px=t.s*1.38;
 if(t.style==='logo')return `900 ${px}px ${HEAVY}`;
 if(t.style==='italic')return `italic 700 ${px}px ${SANS}`;
 if(t.style==='bold')return `700 ${px}px ${SANS}`;
 return `${t.style==='ref'?400:600} ${px}px ${SANS}`;
}
function lettering(g:G){
 g.textAlign='center';g.textBaseline='middle';
 for(const t of buildPrint().texts){
  g.save();g.translate(t.x,t.z);if(t.rot)g.rotate(-t.rot*Math.PI/180);g.font=font(t);
  if(t.style==='logo'){try{(g as unknown as {letterSpacing:string}).letterSpacing=`${t.s*.06}px`}catch{/* older canvas */}}
  g.fillText(t.t,0,t.s*.04);g.restore();
 }
 try{(g as unknown as {letterSpacing:string}).letterSpacing='0px'}catch{/* older canvas */}
}
// Regulatory marks between PCI1 and the x16 slot, the FCC mark and the round logo by D33C98, in silk.
function marks(g:G,w:number){
 g.lineWidth=w;g.lineCap='round';g.lineJoin='round';
 const ring=(x:number,z:number,r:number)=>{g.beginPath();g.arc(x,z,r,0,Math.PI*2);g.stroke()};
 {const [x,z]=MARKS.eco;ring(x,z,4.2);g.beginPath();g.arc(x,z,5.3,-2.3,1.7);g.stroke();g.beginPath();g.moveTo(x+5.3*Math.cos(1.7)+1,z+5.3*Math.sin(1.7)-.4);g.lineTo(x+5.3*Math.cos(1.7),z+5.3*Math.sin(1.7));g.lineTo(x+5.3*Math.cos(1.7)+.2,z+5.3*Math.sin(1.7)-1.2);g.stroke();g.font=`700 4.2px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('10',x,z+.2)}
 {const [x,z]=MARKS.weee;g.beginPath();g.moveTo(x-2.6,z-3.4);g.lineTo(x+2.6,z-3.4);g.lineTo(x+2,z+3);g.lineTo(x-2,z+3);g.closePath();g.stroke();g.beginPath();g.moveTo(x-3.4,z-4.4);g.lineTo(x+3.4,z+4);g.moveTo(x+3.4,z-4.4);g.lineTo(x-3.4,z+4);g.stroke();g.fillRect(x-3.6,z+5,7.2,1.3)}
 {const [x,z]=MARKS.pb;ring(x,z,5.2);g.font=`700 6.4px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Pb',x,z+.3);g.beginPath();g.moveTo(x-3.7,z+3.7);g.lineTo(x+3.7,z-3.7);g.stroke()}
 {const [x,z]=MARKS.ce;g.lineWidth=w*1.5;g.beginPath();g.arc(x-1.9,z,3.1,Math.PI*.3,Math.PI*1.7);g.stroke();g.beginPath();g.arc(x+3.2,z,3.1,Math.PI*.3,Math.PI*1.7);g.stroke();g.beginPath();g.moveTo(x+.6,z);g.lineTo(x+2.9,z);g.stroke();g.lineWidth=w}
 {const [x,z]=MARKS.fcc;g.lineWidth=w*2.2;g.beginPath();g.moveTo(x-1.4,z-4.6);g.lineTo(x-4.6,z-4.6);g.lineTo(x-4.6,z+4.8);g.moveTo(x-4.6,z);g.lineTo(x-2,z);g.stroke();
  g.beginPath();g.arc(x+2.4,z,4.4,Math.PI*.28,Math.PI*1.72);g.stroke();g.beginPath();g.arc(x+2.4,z,2.2,Math.PI*.3,Math.PI*1.7);g.stroke();g.lineWidth=w}
 {const [x,z]=MARKS.gear;ring(x,z,3.6);g.beginPath();g.moveTo(x-2.6,z);g.lineTo(x+2.6,z);g.moveTo(x,z-3.6);g.lineTo(x,z-1.2);g.stroke();g.beginPath();g.arc(x,z,1.4,0,Math.PI);g.stroke()}
}

// One window of the print at k px/mm: colour or relief.
function paint(g:G,v:View,k:number,mode:'colour'|'relief'){
 const pr=buildPrint(),random=rng(17),c=mode==='colour';
 const see=(x0:number,z0:number,x1:number,z1:number)=>x1>=v[0]&&x0<=v[2]&&z1>=v[1]&&z0<=v[3];
 g.setTransform(1,0,0,1,0,0);g.fillStyle=c?INK.mask:rel('mask');g.fillRect(0,0,g.canvas.width,g.canvas.height);place(g,v,k);
 if(c){
  // Mask is never even: broad clouds, paler toward the top-left as the photo's light falls.
  const glow=g.createLinearGradient(-BOARD.w/2,-BOARD.d/2,BOARD.w/2,BOARD.d/2);glow.addColorStop(0,'rgba(40,110,190,.16)');glow.addColorStop(.5,'rgba(40,110,190,0)');glow.addColorStop(1,'rgba(0,0,20,.08)');g.fillStyle=glow;g.fillRect(v[0],v[1],v[2]-v[0],v[3]-v[1]);
  for(let i=0;i<160;i++){const x=(random()-.5)*BOARD.w,z=(random()-.5)*BOARD.d,r=8+random()*30,a=.02+random()*.035,col=random()<.5?'60,120,200':'5,15,35';if(!see(x-r,z-r,x+r,z+r))continue;const f=g.createRadialGradient(x,z,0,x,z,r);f.addColorStop(0,`rgba(${col},${a})`);f.addColorStop(1,`rgba(${col},0)`);g.fillStyle=f;g.fillRect(x-r,z-r,r*2,r*2)}
 }
 // Very fine surface texture: a speckle in colour and in roughness (satin, not mirror).
 {const rr=rng(5),n=Math.min(260000,(v[2]-v[0])*(v[3]-v[1])*1.2);for(let i=0;i<n;i++){const x=v[0]+rr()*(v[2]-v[0]),z=v[1]+rr()*(v[3]-v[1]),q=rr();g.fillStyle=c?(q<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.06)'):(q<.5?'rgba(96,170,0,.5)':'rgba(96,110,0,.5)');g.fillRect(x,z,.25+rr()*.3,.25+rr()*.3)}}
 // Copper pours under the mask, with a darker moat at the edge.
 for(const p of pr.planes){g.beginPath();poly(g,p);g.closePath();g.fillStyle=c?INK.plane:rel('plane');g.fill();if(c){g.strokeStyle=INK.traceDark;g.lineWidth=.35;g.stroke()}}
 // Traces: grouped by width, a dark moat first so they read as raised copper under the mask.
 g.lineCap='round';g.lineJoin='round';
 const widths=new Map<number,number[][]>();for(const t of pr.traces)(widths.get(t.w)??(widths.set(t.w,[]),widths.get(t.w)!)).push(t.p);
 if(c){g.strokeStyle='rgba(8,24,48,.55)';for(const [w,list] of widths){g.lineWidth=w+.22;g.beginPath();for(const p of list)poly(g,p);g.stroke()}}
 g.strokeStyle=c?INK.trace:rel('trace');for(const [w,list] of widths){g.lineWidth=w;g.beginPath();for(const p of list)poly(g,p);g.stroke()}
 // Tented vias: a pale ring with the drill as a dimple.
 g.fillStyle=c?INK.via:rel('via');g.beginPath();for(let i=0;i<pr.vias.length;i+=2){const x=pr.vias[i],z=pr.vias[i+1];if(!see(x-1,z-1,x+1,z+1))continue;g.moveTo(x+.34,z);g.arc(x,z,.34,0,Math.PI*2)}g.fill();
 if(c){g.fillStyle='#0c2443';g.beginPath();for(let i=0;i<pr.vias.length;i+=2){const x=pr.vias[i],z=pr.vias[i+1];if(!see(x-1,z-1,x+1,z+1))continue;g.moveTo(x+.13,z);g.arc(x,z,.13,0,Math.PI*2)}g.fill()}
 // Silkscreen: lines, rings, fills, marks and lettering.
 g.strokeStyle=g.fillStyle=c?INK.silk:rel('silk');
 const sw=new Map<number,number[][]>();for(const l of pr.silk)(sw.get(l.w)??(sw.set(l.w,[]),sw.get(l.w)!)).push(l.p);
 for(const [w,list] of sw){g.lineWidth=w;g.beginPath();for(const p of list)poly(g,p);g.stroke()}
 for(const r of pr.rings){
  if(!see(r.x-r.r-1,r.z-r.r-1,r.x+r.r+1,r.z+r.r+1))continue;
  g.beginPath();g.arc(r.x,r.z,r.r,0,Math.PI*2);if(r.fill)g.fill();else{g.lineWidth=r.w;g.stroke()}
  if(r.half!==undefined){g.save();g.beginPath();g.arc(r.x,r.z,r.r,r.half,r.half+Math.PI);g.closePath();g.clip();g.lineWidth=.16;for(let o=-r.r;o<r.r;o+=.7){g.beginPath();g.moveTo(r.x+o,r.z-r.r);g.lineTo(r.x+o+r.r,r.z+r.r*.0+r.r);g.stroke()}g.restore()}
 }
 for(const [x0,z0,x1,z1] of pr.fills)g.fillRect(x0,z0,x1-x0,z1-z0);
 marks(g,.3);lettering(g);
 // Lands: the mask opening a hair larger, then the tinned copper, then any drill.
 const shape=(x:number,z:number,w:number,d:number,r:number,grow:number)=>{if(r*2>=Math.min(w,d)-.01&&Math.abs(w-d)<.01){g.moveTo(x+w/2+grow,z);g.arc(x,z,w/2+grow,0,Math.PI*2)}else g.roundRect(x-w/2-grow,z-d/2-grow,w+grow*2,d+grow*2,Math.max(0,r+grow*.5))};
 const vis=pr.pads.filter(p=>see(p.x-p.w,p.z-p.d,p.x+p.w,p.z+p.d));
 if(c){g.fillStyle=INK.open;g.beginPath();for(const p of vis)shape(p.x,p.z,p.w,p.d,p.r,.12);g.fill()}
 g.fillStyle=c?INK.tin:rel('pad');g.beginPath();for(const p of vis)shape(p.x,p.z,p.w,p.d,p.r,0);g.fill();
 if(c){g.fillStyle='rgba(255,255,255,.22)';g.beginPath();for(const p of vis)if(Math.min(p.w,p.d)>1.2&&!p.hole)shape(p.x-p.w*.08,p.z-p.d*.08,p.w*.6,p.d*.6,p.r*.6,0);g.fill()}
 g.fillStyle=c?INK.hole:rel('hole');g.beginPath();for(const p of vis)if(p.hole){g.moveTo(p.x+p.hole,p.z);g.arc(p.x,p.z,p.hole,0,Math.PI*2)}g.fill();
 // The six stitching vias in each large mounting ring (as photographed).
 if(c){g.fillStyle='#3a3d40';for(const p of vis)if(p.hole&&p.hole>=1.9&&p.w>8){for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.PI/6;g.beginPath();g.arc(p.x+Math.cos(a)*p.w*.36,p.z+Math.sin(a)*p.w*.36,.45,0,Math.PI*2);g.fill()}}}
}

// ── The print in tiles: 3 × 2 at 20 px/mm (10 on phones), each with a gutter so mip levels do not bleed at the joins. ──
export type Tile={map:THREE.CanvasTexture;box:View;gutter:number};
export function boardMaps(){
 const k=phone()?10:20,cols=3,rows=2,gut=2,tw=BOARD.w/cols,th=BOARD.d/rows,tiles:Tile[]=[];
 for(let r=0;r<rows;r++)for(let q=0;q<cols;q++){
  const box:View=[-BOARD.w/2+q*tw,-BOARD.d/2+r*th,-BOARD.w/2+(q+1)*tw,-BOARD.d/2+(r+1)*th];
  const view:View=[box[0]-gut,box[1]-gut,box[2]+gut,box[3]+gut],[cv,g]=make((tw+gut*2)*k,(th+gut*2)*k);
  paint(g,view,k,'colour');const map=finish(cv);map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;tiles.push({map,box,gutter:gut});
 }
 // Relief for the whole board through the second UV set, at 7 px/mm.
 const kr=phone()?4:7,[rc,rg]=make(BOARD.w*kr,BOARD.d*kr);paint(rg,[-BOARD.w/2,-BOARD.d/2,BOARD.w/2,BOARD.d/2],kr,'relief');
 const relief=finish(rc,false);relief.channel=1;
 return {tiles,relief};
}
// The underside: the bottom layer's copper under the same mask, low resolution (seen edge-on and when exploded).
export function undersideMap(){
 const k=2,[c,g]=make(BOARD.w*k,BOARD.d*k),random=rng(44);place(g,[-BOARD.w/2,-BOARD.d/2,BOARD.w/2,BOARD.d/2],k);
 g.fillStyle='#14365f';g.fillRect(-BOARD.w/2,-BOARD.d/2,BOARD.w,BOARD.d);g.strokeStyle='#1d4a7f';g.lineCap='round';
 for(let i=0;i<1600;i++){const x=(random()-.5)*BOARD.w,z=(random()-.5)*BOARD.d,a=Math.floor(random()*4)*Math.PI/2,l=3+random()*14;g.lineWidth=random()<.2?.6:.3;g.beginPath();g.moveTo(x,z);g.lineTo(x+Math.cos(a)*l,z+Math.sin(a)*l);g.stroke()}
 g.fillStyle='#bdbdb6';for(let i=0;i<2400;i++){g.beginPath();g.arc((random()-.5)*BOARD.w,(random()-.5)*BOARD.d,.45,0,Math.PI*2);g.fill()}
 const t=finish(c);return t;
}
// The board's cut edge: glass-epoxy plies between the masks.
export function edgeMap(){
 const [c,g]=make(256,64),random=rng(5);g.fillStyle='#4b5a4c';g.fillRect(0,0,256,64);
 for(let x=0;x<256;x+=2){g.fillStyle=`rgba(${random()<.5?'200,210,180':'40,50,40'},${.08+random()*.12})`;g.fillRect(x,0,1+random()*2,64)}
 g.fillStyle='#9a7a4c';for(const y of [.08,.36,.64,.92])g.fillRect(0,64*y-1.5,256,3);
 g.fillStyle='#163b68';g.fillRect(0,0,256,4);g.fillRect(0,60,256,4);return finish(c,true,true);
}

// ── Small printed faces ─────────────────────────────────────────────────
// Electrolytic top: spun aluminium with a stamped K-shaped vent and a rolled lip. Drawn once and shared.
export function capTop(){
 const N=256,[c,g]=make(N,N),random=rng(8);g.fillStyle='#c9ccd0';g.fillRect(0,0,N,N);
 for(let i=0;i<220;i++){const r=random()*N*.5,a=.03+random()*.07;g.strokeStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(60,64,70,${a})`;g.beginPath();g.arc(N/2,N/2,r,0,Math.PI*2);g.stroke()}
 g.strokeStyle='rgba(70,74,80,.75)';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(N*.5,N*.18);g.lineTo(N*.5,N*.82);g.moveTo(N*.5,N*.5);g.lineTo(N*.22,N*.3);g.moveTo(N*.5,N*.5);g.lineTo(N*.78,N*.3);g.stroke();
 g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=2;g.beginPath();g.moveTo(N*.5+4,N*.2);g.lineTo(N*.5+4,N*.8);g.stroke();
 const f=g.createRadialGradient(N/2,N/2,N*.36,N/2,N/2,N*.5);f.addColorStop(0,'rgba(0,0,0,0)');f.addColorStop(.7,'rgba(40,40,44,.35)');f.addColorStop(1,'rgba(20,20,24,.75)');g.fillStyle=f;g.fillRect(0,0,N,N);
 return finish(c);
}
// Sleeve: u round the can, v up it. A pale polarity band with minus signs, and a little printed value.
export function capSleeve(kind:'black'|'green'|'red'|'brown'){
 const W=512,H=256,[c,g]=make(W,H),base={black:'#1b1a1f',green:'#16241e',red:'#6a1820',brown:'#2e221d'}[kind],band={black:'#8c8f96',green:'#8fae8f',red:'#e8e2dc',brown:'#b49a6a'}[kind];
 g.fillStyle=base;g.fillRect(0,0,W,H);
 const sheen=g.createLinearGradient(0,0,0,H);sheen.addColorStop(0,'rgba(255,255,255,.06)');sheen.addColorStop(.5,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(0,0,0,.18)');g.fillStyle=sheen;g.fillRect(0,0,W,H);
 g.fillStyle=band;g.fillRect(W*.04,0,W*.13,H);g.fillStyle=base;for(let i=0;i<5;i++)g.fillRect(W*.085,H*(.12+i*.17),W*.04,H*.035);
 g.fillStyle=kind==='red'?'#f1ece6':kind==='black'?'#c9a548':'#d8d0b0';g.font=`700 ${H*.16}px ${NARROW}`;g.textAlign='center';g.textBaseline='middle';
 g.save();g.translate(W*.42,H*.5);g.rotate(-Math.PI/2);g.fillText(kind==='red'?'1500μF':'1000μF',0,0);g.restore();
 g.save();g.translate(W*.62,H*.5);g.rotate(-Math.PI/2);g.fillText(kind==='red'?'6.3V 105°C':'16V',0,0);g.restore();
 g.save();g.translate(W*.8,H*.5);g.rotate(-Math.PI/2);g.font=`700 ${H*.13}px ${NARROW}`;g.fillText(kind==='red'?'KZG':'GSC',0,0);g.restore();
 // A dark rim where the sleeve folds over the top.
 g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,0,W,H*.05);
 return finish(c,true,true);
}
// A printed value on a choke top (yellow on black, as photographed).
export function chokeTop(value:string,turn:boolean){
 const N=256,[c,g]=make(N,N),random=rng(value.charCodeAt(0)*7+(turn?1:0));g.fillStyle='#17181b';g.fillRect(0,0,N,N);
 for(let i=0;i<900;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.25)';g.fillRect(random()*N,random()*N,2,2)}
 g.save();g.translate(N/2,N/2);if(turn)g.rotate(Math.PI/2);g.fillStyle='#e8c33a';g.font=`700 ${N*.3}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText(value,0,0);g.restore();
 return finish(c);
}
// A moulded package top with laser marking. `w`, `d` in mm.
export function chipTop(w:number,d:number,lines:string[],logo?:string,seed=1){
 const k=40,W=Math.max(64,w*k),H=Math.max(64,d*k),[c,g]=make(W,H),random=rng(seed);
 g.fillStyle='#1c1d20';g.fillRect(0,0,W,H);for(let i=0;i<W*H/60;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.3)';g.fillRect(random()*W,random()*H,1.5,1.5)}
 const ink='rgba(196,198,202,.82)',size=Math.min(H/(lines.length+(logo?2.2:1.2)),W/(Math.max(...lines.map(l=>l.length))*.62));
 g.fillStyle=ink;g.textAlign='center';g.textBaseline='middle';let y=H/2-(lines.length-1)*size*.62+(logo?size*.7:0);
 if(logo){
  const ls=size*1.6;g.font=`900 ${ls}px ${HEAVY}`;
  if(logo==='ite'){g.fillText('iTE',W/2,y-size*1.6)}
  else if(logo==='realtek'){g.font=`italic 700 ${size*1.1}px ${SANS}`;g.fillText('REALTEK',W/2,y-size*1.3)}
  else if(logo==='ics'){g.font=`700 ${size*1.2}px ${SANS}`;g.fillText('ICS',W/2,y-size*1.3)}
  else g.fillText('MX',W/2,y-size*1.4);
 }
 lines.forEach((t,i)=>{g.font=`${i===0?700:500} ${size}px ${NARROW}`;g.fillText(t,W/2,y+i*size*1.22)});
 g.fillStyle='#0d0e10';g.beginPath();g.arc(W*.1,H*.86,Math.min(W,H)*.05,0,Math.PI*2);g.fill();
 return finish(c);
}
// The cooler's hub label: white half with the logo, black half with the ratings. Its "up" (canvas −y) faces +x on the board.
export function hubLabel(){
 const N=1024,[c,g]=make(N,N);g.fillStyle='#17181a';g.fillRect(0,0,N,N);
 g.save();g.beginPath();g.arc(N/2,N/2,N/2-2,0,Math.PI*2);g.clip();
 g.fillStyle='#e9ebef';g.fillRect(0,0,N,N*.5);g.fillStyle='#141517';g.fillRect(0,N*.5,N,N*.5);
 // The swoosh and the word.
 g.strokeStyle='#1559b8';g.lineWidth=20;g.beginPath();g.ellipse(N/2,N*.29,N*.3,N*.13,-.12,Math.PI*.95,Math.PI*2.72);g.stroke();
 g.fillStyle='#1559b8';g.font=`700 ${N*.16}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('intel',N/2,N*.3);
 g.fillStyle='#d6d8dc';g.font=`600 ${N*.042}px ${SANS}`;
 ['D79792-001','DC 12V 0.60A','FOXCONN','PVA080G12H'].forEach((t,i)=>g.fillText(t,N*.5,N*(.58+i*.06)));
 g.font=`700 ${N*.07}px ${SANS}`;g.fillText('CE',N*.36,N*.86);g.font=`600 ${N*.05}px ${SANS}`;g.fillText('UL',N*.62,N*.86);
 g.restore();return finish(c);
}
// The northbridge sink's flat band with GIGABYTE stamped in black.
export function bandTop(w:number,d:number){
 const k=24,[c,g]=make(w*k,d*k),f=g.createLinearGradient(0,0,0,d*k);f.addColorStop(0,'#f2b83e');f.addColorStop(.5,'#e4a52c');f.addColorStop(1,'#c88a1e');g.fillStyle=f;g.fillRect(0,0,w*k,d*k);
 const random=rng(3);for(let i=0;i<4000;i++){g.fillStyle=random()<.5?'rgba(255,240,200,.06)':'rgba(90,50,0,.08)';g.fillRect(random()*w*k,random()*d*k,6+random()*30,1)}
 g.fillStyle='#17140f';g.font=`900 ${d*k*.5}px ${HEAVY}`;g.textAlign='center';g.textBaseline='middle';try{(g as unknown as {letterSpacing:string}).letterSpacing=`${k*.25}px`}catch{/* older canvas */}g.fillText('GIGABYTE',w*k/2,d*k*.53);
 return finish(c);
}
// Brushed gold anodising for the fins: streaks along the fin.
export function anodised(){
 const N=512,[c,g]=make(N,N),random=rng(12);g.fillStyle='#dfae2c';g.fillRect(0,0,N,N);
 for(let i=0;i<5000;i++){const y=random()*N,x=random()*N,l=20+random()*200;g.fillStyle=random()<.5?`rgba(255,226,150,${.04+random()*.06})`:`rgba(110,60,0,${.04+random()*.06})`;g.fillRect(x,y,l,1);if(x+l>N)g.fillRect(x-N,y,l,1)}
 return finish(c,true,true);
}
// The parallel port's green test sticker: a grid of boxes with ICT / FOC / dates.
export function lptSticker(){
 const W=1024,H=256,[c,g]=make(W,H);g.fillStyle='#a8d86a';g.fillRect(0,0,W,H);g.strokeStyle='#5e8a33';g.lineWidth=5;
 const cols=[0,.13,.42,.68,1];for(const x of cols){g.beginPath();g.moveTo(x*W,0);g.lineTo(x*W,H*.74);g.stroke()}g.beginPath();g.moveTo(0,H*.37);g.lineTo(W,H*.37);g.moveTo(0,H*.74);g.lineTo(W,H*.74);g.stroke();
 g.fillStyle='#263a14';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${H*.22}px ${SANS}`;
 [['QA','ICT','FOC','OK/OK']].forEach(r=>r.forEach((t,i)=>g.fillText(t,(cols[i]+cols[i+1])/2*W,H*.56)));
 g.font=`600 ${H*.18}px ${SANS}`;['S/B','3806','2840','0723 11'].forEach((t,i)=>g.fillText(t,(cols[i]+cols[i+1])/2*W,H*.19));
 g.fillStyle='rgba(60,90,30,.6)';for(let i=0;i<40;i++)g.fillRect(i*W/40+4,H*.8,W/40*.6,H*.14);
 return finish(c);
}
// The barcode sticker on the USB/LAN stack.
export function barcode(){
 const W=1024,H=320,[c,g]=make(W,H),random=rng(77);g.fillStyle='#f3f3f0';g.fillRect(0,0,W,H);g.fillStyle='#111';
 let x=60;while(x<W-60){const w=2+Math.floor(random()*3)*3;if(random()<.6)g.fillRect(x,H*.1,w,H*.55);x+=w+2+Math.floor(random()*2)*3}
 g.font=`600 ${H*.2}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('1107004A5C0',W/2,H*.82);return finish(c);
}
// The processor lid: nickel-plated copper with laser marking.
export function ihsTop(){
 const N=512,[c,g]=make(N,N),random=rng(21);g.fillStyle='#c4c7ca';g.fillRect(0,0,N,N);
 for(let i=0;i<2200;i++){const y=random()*N;g.fillStyle=random()<.5?'rgba(255,255,255,.05)':'rgba(60,64,70,.05)';g.fillRect(0,y,N,1)}
 g.fillStyle='#4c5056';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${N*.065}px ${SANS}`;
 ['INTEL® CORE™2 QUAD','Q6600','SL9UM  2.40GHZ/8M/1066','MALAY','L726B477'].forEach((t,i)=>g.fillText(t,N/2,N*(.3+i*.1)));
 g.strokeStyle='#4c5056';g.lineWidth=3;g.beginPath();g.moveTo(N*.08,N*.92);g.lineTo(N*.16,N*.92);g.lineTo(N*.08,N*.84);g.closePath();g.stroke();
 return finish(c);
}
// The white assembly label next to ASSEM: (a printed sticker on the real board).
export function moulding(seed:number){
 const N=128,[c,g]=make(N,N),random=rng(seed),img=g.createImageData(N,N),d=img.data;
 for(let i=0;i<N*N;i++){const n=random();d[i*4]=120+n*40;d[i*4+1]=150+random()*60;d[i*4+2]=0;d[i*4+3]=255}
 g.putImageData(img,0,0);return finish(c,false,true);
}
// Stamped tin-plated steel: fine brushing along u, faint lighter/darker streaks; doubles as a roughness map.
export function brushed(){
 const N=512,[c,g]=make(N,N),random=rng(31);g.fillStyle='#b8bbbe';g.fillRect(0,0,N,N);
 for(let i=0;i<9000;i++){const y=random()*N,x=random()*N,l=30+random()*260,a=.04+random()*.08;g.fillStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(60,64,70,${a})`;g.fillRect(x,y,l,1);if(x+l>N)g.fillRect(x-N,y,l,1)}
 for(let i=0;i<6;i++){const y=random()*N;g.fillStyle='rgba(40,44,50,.25)';g.fillRect(0,y,N,1.5)}
 return finish(c,true,true);
}
