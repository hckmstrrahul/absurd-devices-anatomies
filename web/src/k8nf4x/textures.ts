// K8NF4X canvas textures: the board print in tiles, moulded-plastic grain, laser-marked package tops, the contact combs of the
// sockets and slots, the Socket 939 pin field, the bare die with its old thermal paste, and the paper labels on the rear I/O.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {BOARD,SOCKET} from './layout';
import {paintColour,paintRelief,type View} from './print';

type G=CanvasRenderingContext2D;
export const make=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};
const finish=(c:HTMLCanvasElement,colour=true,repeat=false)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
const phone=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
const NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif',SANS='"Helvetica Neue", Helvetica, Arial, sans-serif',HAND='"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';

// ── The board print: the face in 2 × 3 tiles at 24 px per mm (each about 2.4 MP, 33 MP in all), relief at 6 px per mm. ──
export const TILES={cols:2,rows:3};
export function boardTextures(){
 const k=phone()?9:24,tw=BOARD.w/TILES.cols,td=BOARD.d/TILES.rows,tiles:{map:THREE.CanvasTexture;view:View}[]=[];
 for(let j=0;j<TILES.rows;j++)for(let i=0;i<TILES.cols;i++){
  const view:View=[i*tw,j*td,(i+1)*tw,(j+1)*td],[c,g]=make(tw*k,td*k);paintColour(g,view,k);
  const map=finish(c);map.anisotropy=16;tiles.push({map,view});
 }
 const kr=phone()?3:6,[r,h]=make(BOARD.w*kr,BOARD.d*kr);paintRelief(h,[0,0,BOARD.w,BOARD.d],kr);
 const relief=finish(r,false);
 // Underside: bare blue mask with the solder side's through-hole joints as tinned dots, low resolution (seen only edge-on).
 const kb=2,[bc,bg]=make(BOARD.w*kb,BOARD.d*kb),random=rng(8);bg.fillStyle='#183693';bg.fillRect(0,0,bc.width,bc.height);
 bg.fillStyle='#b9bcbf';for(let i=0;i<5000;i++){bg.fillRect(random()*bc.width,random()*bc.height,1.2,1.2)}
 return {tiles,relief,bottom:finish(bc)};
}

// ── Finishes ──
// Moulding texture for matte plastics: a fine pebble in height (red) and roughness (green).
export function grain(seed:number,rough=170,spread=40){
 const N=256,random=rng(seed),[c,g]=make(N,N),image=g.createImageData(N,N),d=image.data;
 for(let i=0;i<N*N;i++){const n=random(),m=random();d[i*4]=110+n*60;d[i*4+1]=rough-spread/2+m*spread;d[i*4+2]=0;d[i*4+3]=255}
 g.putImageData(image,0,0);const [s,q]=make(N,N);q.filter='blur(.6px)';q.drawImage(c,0,0);q.filter='none';
 return finish(s,false,true);
}
// Brushed or stamped tin plate: fine streaks along u, wrapped.
export function brushed(seed:number,base='#b4b8bb'){
 const N=512,random=rng(seed),[c,g]=make(N,N),[r,h]=make(N,N);
 g.fillStyle=base;g.fillRect(0,0,N,N);h.fillStyle='rgb(128,140,0)';h.fillRect(0,0,N,N);
 for(let i=0;i<6000;i++){const y=Math.floor(random()*N),x=random()*N,len=20+random()*160,light=random()<.5,a=.01+random()*.03;
  g.fillStyle=light?`rgba(255,255,255,${a})`:`rgba(40,46,56,${a})`;g.fillRect(x,y,len,1);if(x+len>N)g.fillRect(x-N,y,len,1);
  h.fillStyle=`rgba(${light?160:100},${light?60:110},0,${a*6})`;h.fillRect(x,y,len,1);if(x+len>N)h.fillRect(x-N,y,len,1)}
 // Handling marks: soft dull patches, as on a board that has been in a case.
 for(let i=0;i<10;i++){const x=random()*N,y=random()*N,q=40+random()*90;for(const ox of [-N,0,N])for(const oy of [-N,0,N]){const f=h.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,q);f.addColorStop(0,'rgba(128,150,0,.4)');f.addColorStop(1,'rgba(128,150,0,0)');h.fillStyle=f;h.fillRect(x+ox-q,y+oy-q,q*2,q*2)}}
 return {map:finish(c,true,true),relief:finish(r,false,true)};
}
const speckle=(g:G,w:number,h:number,random:()=>number,n:number,light:string,dark:string,a=.5)=>{for(let i=0;i<n;i++){g.fillStyle=random()<.5?light:dark;g.globalAlpha=random()*a;g.fillRect(random()*w,random()*h,1+random()*1.4,1+random()*1.4)}g.globalAlpha=1};

// A moulded package top with laser marking, `k` px per mm. The marking is paler and rougher than the compound; pin one is a dimple.
export type Marking={w:number;d:number;lines:string[];size?:number;pin?:[number,number];ink?:string;body?:string;turn?:boolean;logo?:'ite'|'realtek'|'ics'};
export function packageTop(m:Marking,seed=1){
 const k=Math.min(64,2048/Math.max(m.w,m.d)),W=m.w*k,H=m.d*k,random=rng(seed),[c,g]=make(W,H),[r,h]=make(W,H),body=m.body??'#1b1c1f',ink=m.ink??'#a4a6a8';
 g.fillStyle=body;g.fillRect(0,0,W,H);speckle(g,W,H,random,W*H/50,'#36383c','#0b0c0d',.5);
 h.fillStyle='rgb(128,182,0)';h.fillRect(0,0,W,H);speckle(h,W,H,random,W*H/40,'rgb(160,205,0)','rgb(96,160,0)',.6);
 const draw=(q:G,style:string)=>{
  q.save();if(m.turn){q.translate(W/2,H/2);q.rotate(-Math.PI/2);q.translate(-H/2,-W/2)}
  const w=m.turn?H:W,ht=m.turn?W:H,n=m.lines.length+(m.logo?1.2:0),size=m.size?m.size*k:Math.min(ht/(n+1.2),w/(Math.max(...m.lines.map(t=>t.length))*.62+1));
  q.fillStyle=q.strokeStyle=style;q.textBaseline='middle';q.textAlign='center';
  let y=ht/2-(n-1)*size*.62;
  if(m.logo==='ite'){q.lineWidth=size*.12;q.beginPath();q.arc(w/2-size*1.3,y,size*.5,0,Math.PI*2);q.stroke();q.font=`italic 800 ${size*1.05}px ${SANS}`;q.fillText('ITE',w/2+size*.5,y);y+=size*1.4}
  m.lines.forEach((t,i)=>{q.font=`${i===0?700:500} ${Math.round(size*(i===0?1:.84))}px ${NARROW}`;q.fillText(t,w/2,y+i*size*1.24)});
  q.restore();
 };
 g.globalAlpha=.86;draw(g,ink);g.globalAlpha=1;draw(h,'rgb(104,236,0)');
 if(m.pin){const [px,py]=m.pin,x=px*W,y=py*H,q=Math.min(W,H)*.05;g.fillStyle='#0e0f11';g.beginPath();g.arc(x,y,q,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1.5;g.stroke();h.fillStyle='rgb(60,90,0)';h.beginPath();h.arc(x,y,q,0,Math.PI*2);h.fill()}
 return {map:finish(c),relief:finish(r,false)};
}

// Contact comb on the top of a socket or slot: a white sheet (so the plastic's own colour shows) with a dark window per contact
// either side of the card groove, `pitch` mm apart, across `len` mm. v runs across the slot (0 = −z side).
export function comb(len:number,width:number,pitch:number,groove:number,breaks:number[]=[],keyAt:number[]=[]){
 const k=16,W=Math.round(len*k),H=Math.round(width*k),[c,g]=make(W,H),[r,h]=make(W,H);
 g.fillStyle='#ffffff';g.fillRect(0,0,W,H);h.fillStyle='rgb(150,150,0)';h.fillRect(0,0,W,H);
 const gy0=(width-groove)/2*k,gy1=(width+groove)/2*k;
 const n=Math.floor((len-4)/pitch);
 for(let i=0;i<n;i++){
  const x=(2+i*pitch+pitch*.5)*k;if(breaks.some(b=>Math.abs(x/k-b)<pitch*1.2))continue;
  for(const [y0,y1] of [[gy0-1.05*k,gy0-.2*k],[gy1+.2*k,gy1+1.05*k]]){g.fillStyle='#2a2a2a';g.fillRect(x-pitch*.28*k,y0,pitch*.56*k,y1-y0);h.fillStyle='rgb(40,200,0)';h.fillRect(x-pitch*.28*k,y0,pitch*.56*k,y1-y0)}
 }
 g.fillStyle='#141414';g.fillRect(1.2*k,gy0,W-2.4*k,gy1-gy0);h.fillStyle='rgb(0,220,0)';h.fillRect(1.2*k,gy0,W-2.4*k,gy1-gy0);
 for(const x of keyAt){g.fillStyle='#ffffff';g.fillRect((x-.7)*k,gy0,1.4*k,gy1-gy0);h.fillStyle='rgb(150,150,0)';h.fillRect((x-.7)*k,gy0,1.4*k,gy1-gy0)}
 return {map:finish(c),relief:finish(r,false)};
}
// The flank of a socket or slot: a row of moulded windows over each contact's tail, white so the plastic colour shows.
export function flank(len:number,height:number,pitch:number){
 const k=16,W=Math.round(len*k),H=Math.round(height*k),[c,g]=make(W,H);
 g.fillStyle='#ffffff';g.fillRect(0,0,W,H);
 const n=Math.floor((len-4)/(pitch*2));
 for(let i=0;i<n;i++){const x=(2+i*pitch*2+pitch)*k;g.fillStyle='#3a3a3a';g.fillRect(x-pitch*.55*k,H*.3,pitch*1.1*k,H*.36)}
 g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,H*.88,W,H*.12);
 return finish(c);
}

// The Socket 939 top: 939 holes on a 1.27 mm grid, 31 × 31 less the corners and a cleared centre, with the gold triangle at pin one.
export function socketTop(){
 const w=SOCKET.x1-SOCKET.x0,d=SOCKET.z1-SOCKET.cam.z1,k=28,W=w*k,H=d*k,[c,g]=make(W,H),[r,h]=make(W,H),random=rng(39);
 g.fillStyle='#ece8de';g.fillRect(0,0,W,H);h.fillStyle='rgb(140,170,0)';h.fillRect(0,0,W,H);
 speckle(g,W,H,random,W*H/90,'#f6f3ea','#d8d3c6',.4);
 const n=31,p=1.27,x0=w/2-(n-1)/2*p,y0=d/2-(n-1)/2*p+.6;
 g.fillStyle='#4a463f';h.fillStyle='rgb(20,220,0)';
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const ci=Math.abs(i-15),cj=Math.abs(j-15);if(ci<3&&cj<3)continue;if(ci+cj>27)continue;if((i===0||j===0)&&ci+cj>25)continue;
  const x=(x0+i*p)*k,y=(y0+j*p)*k,s=.5*k;g.fillRect(x-s/2,y-s/2,s,s);h.fillRect(x-s/2,y-s/2,s,s);
 }
 // Moulded mould-flow marks and the pin-one triangle.
 g.fillStyle='#d6c79a';g.beginPath();g.moveTo(1.2*k,H-1.2*k);g.lineTo(3.4*k,H-1.2*k);g.lineTo(1.2*k,H-3.4*k);g.closePath();g.fill();
 g.strokeStyle='rgba(120,110,90,.25)';g.lineWidth=k*.15;g.strokeRect(.4*k,.4*k,W-.8*k,H-.8*k);
 return {map:finish(c),relief:finish(r,false)};
}
// Bare flip-chip die with the dried ring of old paste round it, as photographed.
export function dieTop(s:number){
 const k=96,N=s*k,random=rng(41),[c,g]=make(N,N);
 const f=g.createLinearGradient(0,0,N,N);f.addColorStop(0,'#9da1a6');f.addColorStop(.5,'#7f848a');f.addColorStop(1,'#a3a7ab');g.fillStyle=f;g.fillRect(0,0,N,N);
 for(let i=0;i<60;i++){const x=random()*N,y=random()*N,q=N*(.08+random()*.22),a=.05+random()*.12,col=random()<.6?'205,206,204':'90,94,98',r=g.createRadialGradient(x,y,0,x,y,q);r.addColorStop(0,`rgba(${col},${a})`);r.addColorStop(1,`rgba(${col},0)`);g.fillStyle=r;g.fillRect(x-q,y-q,q*2,q*2)}
 g.strokeStyle='rgba(225,226,222,.55)';g.lineWidth=N*.035;g.strokeRect(N*.02,N*.02,N*.96,N*.96);
 return finish(c);
}
// The chipset's green substrate: a fine copper grid under the green resist, a ring of decoupling lands and a corner mark.
export function substrate(s:number){
 const k=48,N=s*k,random=rng(43),[c,g]=make(N,N);
 g.fillStyle='#2c4632';g.fillRect(0,0,N,N);
 g.strokeStyle='rgba(120,150,96,.18)';g.lineWidth=1.2;for(let i=0;i<s*2;i++){g.beginPath();g.moveTo(i*k/2,0);g.lineTo(i*k/2,N);g.moveTo(0,i*k/2);g.lineTo(N,i*k/2);g.stroke()}
 speckle(g,N,N,random,N*N/60,'#3f5c44','#1c2d20',.5);
 g.fillStyle='#c9b46d';g.beginPath();g.moveTo(k,k);g.lineTo(3*k,k);g.lineTo(k,3*k);g.closePath();g.fill();
 g.fillStyle='#e6e1d4';g.font=`600 ${k*.9}px ${NARROW}`;g.textAlign='left';g.fillText('NF4-4X-A3',N*.08,N*.92);g.textAlign='right';g.fillText('0532A2  TAIWAN',N*.94,N*.92);
 return finish(c);
}
// Etched coin-cell face.
export function cellTop(r:number){
 const k=64,N=r*2*k,random=rng(47),[c,g]=make(N,N);
 g.fillStyle='#cfd2d4';g.fillRect(0,0,N,N);
 for(let i=0;i<300;i++){const q=random()*N*.5,a=.03+random()*.06;g.strokeStyle=random()<.5?`rgba(255,255,255,${a})`:`rgba(50,56,66,${a})`;g.lineWidth=1;g.beginPath();g.arc(N/2,N/2,q,0,Math.PI*2);g.stroke()}
 g.fillStyle='rgba(70,74,80,.85)';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${N*.13}px ${NARROW}`;g.fillText('CR2032',N/2,N*.62);g.font=`500 ${N*.07}px ${NARROW}`;g.fillText('LITHIUM BATTERY  3V',N/2,N*.75);
 g.lineWidth=N*.025;g.strokeStyle='rgba(70,74,80,.85)';g.beginPath();g.moveTo(N*.44,N*.36);g.lineTo(N*.56,N*.36);g.moveTo(N/2,N*.3);g.lineTo(N/2,N*.42);g.stroke();
 return finish(c);
}
// Paper labels on the rear I/O, as photographed: "VRTU" on the PS/2 stack, and a ruled lot sticker on the parallel port.
export function label(kind:'vrtu'|'lpt',w:number,d:number){
 const k=48,W=w*k,H=d*k,random=rng(kind==='vrtu'?51:52),[c,g]=make(W,H);
 g.fillStyle='#eeeeea';g.fillRect(0,0,W,H);speckle(g,W,H,random,W*H/80,'#ffffff','#cfcfc8',.3);
 g.fillStyle='#202124';g.textAlign='center';g.textBaseline='middle';
 if(kind==='vrtu'){g.font=`800 ${H*.38}px ${SANS}`;g.fillText('VRTU',W/2,H/2)}
 else{
  // Ruled into a 2 × 4 grid: printed headings and hand-written lot marks.
  g.strokeStyle='#4a4b50';g.lineWidth=k*.12;g.strokeRect(k*.4,k*.4,W-k*.8,H-k*.8);
  for(let i=1;i<4;i++){g.beginPath();g.moveTo(k*.4+i*(W-k*.8)/4,k*.4);g.lineTo(k*.4+i*(W-k*.8)/4,H-k*.4);g.stroke()}
  g.beginPath();g.moveTo(k*.4,H*.55);g.lineTo(W-k*.4,H*.55);g.stroke();
  const cw=(W-k*.8)/4;['MO','OO','FT','RT'].forEach((t,i)=>{g.font=`700 ${H*.24}px ${SANS}`;g.fillText(t,k*.4+cw*(i+.5),H*.76)});
  ['K8N4','','8C8','18S'].forEach((t,i)=>{g.font=`${H*.24}px ${HAND}`;g.fillStyle=i===0?'#3a4a8a':'#202124';g.fillText(t,k*.4+cw*(i+.5),H*.3)});
 }
 return finish(c);
}
// BIOS chip: a black PLCC with a silver-and-white paper label carrying the version.
export function biosLabel(w:number,d:number){
 const k=64,W=w*k,H=d*k,[c,g]=make(W,H);
 g.fillStyle='#e9e7e0';g.fillRect(0,0,W,H);g.fillStyle='#b7bcc2';g.fillRect(0,0,W,H*.22);
 g.fillStyle='#1f2024';g.textAlign='center';g.textBaseline='middle';g.font=`800 ${H*.14}px ${NARROW}`;g.fillText('K8NF4X',W/2,H*.42);g.font=`600 ${H*.1}px ${NARROW}`;g.fillText('BIOS  R1.01',W/2,H*.6);g.fillText('Pm49FL004T',W/2,H*.76);
 return finish(c);
}

// Enamelled copper along a winding: u runs along the wire. Each turn a slightly different tone, with dull oxidised patches.
export function winding(turns:number,seed:number){
 const W=1024,H=8,random=rng(seed),[c,g]=make(W,H),[r,h]=make(W,H);
 h.fillStyle='rgb(128,100,0)';h.fillRect(0,0,W,H);
 for(let i=0;i<turns;i++){const x0=i/turns*W,x1=(i+1)/turns*W,t=random();g.fillStyle=`rgb(${Math.round(225+t*30)},${Math.round(200+t*35)},${Math.round(185+t*40)})`;g.fillRect(x0,0,x1-x0,H)}
 for(let i=0;i<turns*3;i++){const x=random()*W,w=4+random()*30,a=.15+random()*.25;g.fillStyle=`rgba(${random()<.5?'90,60,40':'120,110,80'},${a})`;g.fillRect(x,0,w,H);h.fillStyle=`rgba(128,190,0,${a*1.6})`;h.fillRect(x,0,w,H)}
 return {map:finish(c),relief:finish(r,false)};
}
