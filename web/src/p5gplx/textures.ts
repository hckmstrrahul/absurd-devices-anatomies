// P5GPL-X SE canvas textures: the board print in tiles, and the small sheets for package markings, labels, the socket's
// contact field, capacitor sleeves and tops, slot tops and the finishes. Markings follow what the photo shows; where it is
// not legible the text is plausible for this board and period.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {BOARD} from './layout';
import {paintBoard} from './print';

type G=CanvasRenderingContext2D;
export const make=(w:number,h:number):[HTMLCanvasElement,G]=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return [c,c.getContext('2d')!]};
const finish=(c:HTMLCanvasElement,colour=true,repeat=false)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
const phone=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
const SANS='"Helvetica Neue", Helvetica, Arial, sans-serif',NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// ── Board print: two colour tiles at 20 px/mm (3,660 × 3,050 each) and two relief tiles at 8 px/mm. ──
export type Tile={u0:number;v0:number;u1:number;v1:number;map:THREE.Texture;relief:THREE.Texture};
export const TILES:[number,number,number,number][]=[[0,0,BOARD.w,BOARD.d/2],[0,BOARD.d/2,BOARD.w,BOARD.d]];
export function boardTiles():Tile[]{
 const k=phone()?10:20,kr=phone()?5:8;
 return TILES.map(t=>{
  const [u0,v0,u1,v1]=t,[c,g]=make((u1-u0)*k,(v1-v0)*k),[r,h]=make((u1-u0)*kr,(v1-v0)*kr);
  paintBoard(g,'colour',k,t);paintBoard(h,'relief',kr,t);
  return {u0,v0,u1,v1,map:finish(c),relief:finish(r,false)};
 });
}
// The underside: plain mask with faint trace fields, at 3 px/mm.
export function boardUnder(){
 const k=3,[c,g]=make(BOARD.w*k,BOARD.d*k),random=rng(8);
 g.fillStyle='#8a6a30';g.fillRect(0,0,c.width,c.height);g.strokeStyle='rgba(200,150,60,.35)';g.lineWidth=.6;
 for(let i=0;i<900;i++){let x=random()*c.width,y=random()*c.height;g.beginPath();g.moveTo(x,y);for(let s=0;s<3;s++){const a=Math.floor(random()*8)*Math.PI/4,l=10+random()*50;x+=Math.cos(a)*l;y+=Math.sin(a)*l;g.lineTo(x,y)}g.stroke()}
 return finish(c);
}
// The board edge: mask lip, copper, glass-epoxy plies.
export function edgeTexture(){
 const W=256,H=64,[c,g]=make(W,H),random=rng(5);
 g.fillStyle='#c9b98c';g.fillRect(0,0,W,H);
 for(let x=0;x<W;x+=2){g.fillStyle=`rgba(${random()<.5?'255,250,220':'120,100,60'},${.06+random()*.12})`;g.fillRect(x,0,1+random()*2,H)}
 g.fillStyle='#b98422';g.fillRect(0,0,W,H*.12);g.fillRect(0,H*.88,W,H*.12);
 g.fillStyle='rgba(120,96,50,.4)';for(const y of [.35,.65])g.fillRect(0,H*y-1,W,2);
 return finish(c,true,true);
}

// ── Finishes ──
// Moulding grain for matte plastics: height in red, roughness in green.
export function grain(seed:number,rough=196,spread=34){
 const N=256,random=rng(seed),[c,g]=make(N,N),image=g.createImageData(N,N),d=image.data;
 for(let i=0;i<N*N;i++){const n=random(),m=random();d[i*4]=110+n*60;d[i*4+1]=rough-spread/2+m*spread;d[i*4+2]=0;d[i*4+3]=255}
 g.putImageData(image,0,0);const [s,q]=make(N,N);q.filter='blur(.6px)';q.drawImage(c,0,0);q.filter='none';
 return finish(s,false,true);
}
// Brushed or extruded metal: streaks along u. `relief` red is height, green roughness.
export function brushed(seed:number,base:string,rough=110){
 const N=512,random=rng(seed),[c,g]=make(N,N),[r,h]=make(N,N);
 g.fillStyle=base;g.fillRect(0,0,N,N);h.fillStyle=`rgb(128,${rough},0)`;h.fillRect(0,0,N,N);
 for(let i=0;i<7000;i++){const y=Math.floor(random()*N),x=random()*N,len=30+random()*240,light=random()<.5,a=.01+random()*.03;
  g.fillStyle=light?`rgba(255,255,255,${a})`:`rgba(40,40,40,${a})`;g.fillRect(x,y,len,1);if(x+len>N)g.fillRect(x-N,y,len,1);
  h.fillStyle=`rgba(${light?160:96},${light?rough-20:rough+30},0,${a*6})`;h.fillRect(x,y,len,1);if(x+len>N)h.fillRect(x-N,y,len,1)}
 // A few dull blotches: handling marks on bare metal.
 for(let i=0;i<10;i++){const x=random()*N,y=random()*N,q=30+random()*90,f=g.createRadialGradient(x,y,0,x,y,q);f.addColorStop(0,'rgba(120,110,95,.12)');f.addColorStop(1,'rgba(120,110,95,0)');g.fillStyle=f;g.fillRect(x-q,y-q,q*2,q*2)}
 return {map:finish(c,true,true),relief:finish(r,false,true)};
}

// ── Package markings ──
export type Marking={w:number;d:number;lines:string[];logo?:string;body?:string;ink?:string;pin?:[number,number];turn?:boolean;size?:number};
function logo(g:G,kind:string,x:number,y:number,s:number){
 g.save();g.translate(x,y);
 if(kind==='attansic'){g.lineWidth=s*.16;g.beginPath();g.moveTo(-s*.5,s*.5);g.lineTo(0,-s*.5);g.lineTo(s*.2,0);g.moveTo(s*.05,s*.5);g.lineTo(s*.55,-s*.5);g.stroke()}
 else if(kind==='ite'){g.lineWidth=s*.12;g.beginPath();g.arc(0,0,s*.45,0,Math.PI*2);g.stroke();g.font=`700 ${s*.5}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('ITE',0,0)}
 else if(kind==='adi'){g.beginPath();g.moveTo(-s*.4,-s*.45);g.lineTo(s*.45,0);g.lineTo(-s*.4,s*.45);g.closePath();g.fill()}
 else if(kind==='intel'){g.font=`500 ${s}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('intel',0,0)}
 g.restore();
}
export function packageTop(m:Marking,seed=1){
 const k=48,W=m.w*k,H=m.d*k,random=rng(seed),[c,g]=make(W,H),body=m.body??'#1c1d1f',ink=m.ink??'#a3a5a6';
 g.fillStyle=body;g.fillRect(0,0,W,H);
 for(let i=0;i<W*H/60;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.08)';g.fillRect(random()*W,random()*H,1.4,1.4)}
 g.save();if(m.turn){g.translate(W/2,H/2);g.rotate(-Math.PI/2);g.translate(-H/2,-W/2)}
 const w=m.turn?H:W,h=m.turn?W:H,n=m.lines.length+(m.logo?1.4:0),size=m.size??Math.min(h/(n+1.4),w/(Math.max(...m.lines.map(l=>l.length))*.62));
 g.fillStyle=g.strokeStyle=ink;g.textAlign='center';g.textBaseline='middle';let y=h/2-(n-1)*size*.6;
 if(m.logo){logo(g,m.logo,w/2,y+size*.2,size*1.5);y+=size*1.5}
 m.lines.forEach((t,i)=>{g.font=`${i===0?700:500} ${Math.round(size*(i===0?1:.84))}px ${NARROW}`;g.fillText(t,w/2,y+i*size*1.22)});
 g.restore();
 if(m.pin){g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.arc(m.pin[0]*W,m.pin[1]*H,Math.min(W,H)*.05,0,Math.PI*2);g.fill();g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;g.stroke()}
 return finish(c);
}
// ICH7: dark mould cap on a green laminate rim, the intel mark, lines, and the gold pin-one triangle in the corner.
export function ichTop(s:number,lid:number){
 const k=40,W=s*k,[c,g]=make(W,W),random=rng(4),o=(s-lid)/2*k;
 g.fillStyle='#1f3c35';g.fillRect(0,0,W,W);
 for(let i=0;i<2600;i++){g.fillStyle=random()<.5?'rgba(120,170,150,.08)':'rgba(0,0,0,.1)';g.fillRect(random()*W,random()*W,2,2)}
 // Fine solder-mask grid on the rim.
 g.strokeStyle='rgba(90,140,120,.25)';g.lineWidth=1;for(let x=o*.3;x<W;x+=k*.8){g.beginPath();g.moveTo(x,0);g.lineTo(x,o*.9);g.moveTo(x,W-o*.9);g.lineTo(x,W);g.stroke()}
 g.fillStyle='#363738';g.beginPath();g.roundRect(o,o,W-o*2,W-o*2,k*.6);g.fill();
 for(let i=0;i<4000;i++){g.fillStyle=random()<.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.08)';g.fillRect(o+random()*(W-o*2),o+random()*(W-o*2),1.5,1.5)}
 g.fillStyle='#b9bbba';g.textAlign='left';g.textBaseline='middle';const L=o+k*2.4;
 g.font=`500 ${k*4.2}px ${SANS}`;g.fillText('intel',L+k*1.5,o+k*3.6);g.beginPath();g.arc(L+k*13.6,o+k*1.9,k*.45,0,Math.PI*2);g.fill();
 g.font=`500 ${k*1.6}px ${NARROW}`;['FW82801GB','L608B888','SL8FX','INTEL©\'04'].forEach((t,i)=>g.fillText(t,L+k*1.4,o+k*(7.4+i*2.2)));
 g.beginPath();g.arc(L+k*.4,o+k*16.4,k*.35,0,Math.PI*2);g.stroke();g.fillText('TAIWAN',L+k*1.6,o+k*16.4);
 g.fillStyle='#d8b23a';g.beginPath();g.moveTo(0,W);g.lineTo(k*2.4,W);g.lineTo(0,W-k*2.4);g.closePath();g.fill();
 return finish(c);
}

// ── Labels and stickers ──
function barcode(g:G,x:number,y:number,w:number,h:number,random:()=>number){g.fillStyle='#222';for(let p=x;p<x+w;){const b=1+Math.floor(random()*3);if(random()<.55)g.fillRect(p,y,b,h);p+=b+1}}
// The parallel port's white barcode label, landscape.
export function lptLabel(){
 const W=900,H=230,[c,g]=make(W,H),random=rng(77);g.fillStyle='#f4f2ee';g.fillRect(0,0,W,H);g.fillStyle='#222';g.textBaseline='middle';
 g.font=`700 34px ${NARROW}`;g.fillText('L.13',60,36);g.fillText('15',60,76);g.fillText('ꟷ00l32',380,38);g.font=`600 30px ${NARROW}`;g.fillText('Gdd0OO',600,38);
 g.fillText('T1MA0A',40,170);barcode(g,180,92,620,70,random);g.font=`500 24px ${NARROW}`;g.fillText('E00H5   11 D3   1  00550A',260,190);
 return finish(c);
}
// The yellow inspection sticker on top of the PS/2 shield.
export function yellowSticker(){
 const W=256,H=200,[c,g]=make(W,H);g.fillStyle='#e8d43a';g.fillRect(0,0,W,H);g.fillStyle='#6b5e14';g.font=`700 26px ${NARROW}`;g.textBaseline='middle';
 g.fillText('LIT',150,40);['xx||| |||','| || |||| ','||| | ||'].forEach((t,i)=>g.fillText(t,40,90+i*30));g.fillText('QC',150,170);
 return finish(c);
}
// The BIOS chip's white label.
export function biosLabel(){
 const W=300,H=360,[c,g]=make(W,H);g.fillStyle='#f2efe6';g.fillRect(0,0,W,H);g.fillStyle='#2a2a2a';g.textAlign='center';g.textBaseline='middle';
 g.font=`700 48px ${NARROW}`;g.fillText('P5GPL-X',W/2,90);g.font=`700 44px ${NARROW}`;g.fillText('SE 0302',W/2,160);g.font=`500 34px ${NARROW}`;g.fillText('ASUS',W/2,230);
 g.fillStyle='#3b6bb5';g.fillRect(40,270,W-80,40);return finish(c);
}

// ── Socket contact field: a grid of gold spring tips on dark brown, with the bare window in the middle. ──
export function contactField(field:number,window:number){
 const k=24,W=field*k,[c,g]=make(W,W),[r,h]=make(W,W),pitch=1.0922,n=Math.round(field/pitch);
 g.fillStyle='#1f1812';g.fillRect(0,0,W,W);h.fillStyle='rgb(90,200,0)';h.fillRect(0,0,W,W);
 const o=(W-n*pitch*k)/2,wo=(field-window)/2*k;
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=o+(i+.5+(j%2)*.0)*pitch*k,y=o+(j+.5)*pitch*k;if(x>wo&&x<W-wo&&y>wo&&y<W-wo)continue;
  g.fillStyle='#a8844c';g.beginPath();g.arc(x,y,k*.2,0,Math.PI*2);g.fill();g.fillStyle='rgba(255,236,180,.6)';g.beginPath();g.arc(x-k*.06,y-k*.06,k*.1,0,Math.PI*2);g.fill();
  h.fillStyle='rgb(200,80,255)';h.beginPath();h.arc(x,y,k*.28,0,Math.PI*2);h.fill();
 }
 g.clearRect(wo,wo,W-wo*2,W-wo*2);h.clearRect(wo,wo,W-wo*2,W-wo*2);
 return {map:finish(c),relief:finish(r,false)};
}

// ── Capacitors: a sleeve wrap (u around, v up) with the polarity band and print, and the scored aluminium top. ──
export function sleeve(seed:number){
 const W=512,H=256,[c,g]=make(W,H),random=rng(seed);
 g.fillStyle='#2f2522';g.fillRect(0,0,W,H);
 for(let i=0;i<400;i++){g.fillStyle=random()<.5?'rgba(255,240,230,.03)':'rgba(0,0,0,.06)';g.fillRect(random()*W,random()*H,3,1)}
 // Polarity band: a pale grey stripe with minus signs.
 g.fillStyle='#8f8a87';g.fillRect(W*.08,0,W*.13,H);g.fillStyle='#2f2522';for(let y=H*.15;y<H*.9;y+=H*.18)g.fillRect(W*.11,y,W*.07,H*.04);
 g.fillStyle='rgba(220,210,200,.75)';g.font=`600 26px ${NARROW}`;g.textBaseline='middle';
 g.save();g.translate(W*.55,H*.5);g.rotate(-Math.PI/2);g.textAlign='center';g.fillText('1000μF 6.3V',0,-18);g.fillText('105°C  KZG',0,18);g.restore();
 // Top shoulder: the rolled bead shows a lighter rim.
 g.fillStyle='rgba(200,190,180,.25)';g.fillRect(0,H*.94,W,H*.06);
 return finish(c);
}
export function capTop(){
 const W=256,[c,g]=make(W,W),[r,h]=make(W,W),random=rng(2);
 const f=g.createRadialGradient(W/2,W/2,0,W/2,W/2,W/2);f.addColorStop(0,'#e9e8e4');f.addColorStop(.85,'#d2d1cc');f.addColorStop(1,'#a9a7a2');g.fillStyle=f;g.fillRect(0,0,W,W);
 for(let i=0;i<220;i++){g.strokeStyle=`rgba(${random()<.5?'255,255,255':'90,90,90'},${.05+random()*.05})`;g.beginPath();g.arc(W/2,W/2,random()*W/2,0,Math.PI*2);g.stroke()}
 h.fillStyle='rgb(128,90,0)';h.fillRect(0,0,W,W);
 // The K vent: three scored lines meeting at the centre (the photo shows a K or cross on these tops).
 for(const q of [g,h]){q.strokeStyle=q===g?'rgba(80,80,78,.8)':'rgb(60,110,0)';q.lineWidth=W*.03;q.lineCap='round';q.beginPath();q.moveTo(W*.5,W*.16);q.lineTo(W*.5,W*.84);q.moveTo(W*.5,W*.5);q.lineTo(W*.8,W*.26);q.moveTo(W*.5,W*.5);q.lineTo(W*.8,W*.74);q.stroke()}
 return {map:finish(c),relief:finish(r,false)};
}

// ── Slot and socket tops: two rows of contact cavities either side of the card channel. `n` per row, dark on the body colour. ──
export function slotTop(lenMm:number,wMm:number,n:number,body:string,cavity:string,key:number|null){
 const k=24,W=lenMm*k,H=wMm*k,[c,g]=make(W,H);g.fillStyle=body;g.fillRect(0,0,W,H);
 const pitch=(lenMm-5)/n*k,cw=pitch*.55;
 g.fillStyle=cavity;for(let i=0;i<n;i++){const x=2.5*k+(i+.2)*pitch;if(key!==null&&Math.abs(x/k-key)<1.4)continue;g.fillRect(x,H*.1,cw,H*.22);g.fillRect(x,H*.68,cw,H*.22)}
 return finish(c);
}
// Barcode on the edge sticker by the 24-pin connector and on the I/O shield handled in the print; this is the RJ45 shell's stamp.
export function stamp(lines:string[]){
 const W=256,H=128,[c,g]=make(W,H);g.clearRect(0,0,W,H);g.fillStyle='rgba(60,60,60,.55)';g.font=`600 30px ${NARROW}`;g.textAlign='center';g.textBaseline='middle';
 lines.forEach((t,i)=>g.fillText(t,W/2,H/2+(i-(lines.length-1)/2)*36));return finish(c);
}

// Enamelled copper wire along its length (u): per-turn tone variation, with a little oxidation here and there.
export function winding(){
 const W=256,H=16,[c,g]=make(W,H),random=rng(41);
 for(let x=0;x<W;x++){const t=random(),warm=180+Math.round(t*50),ox=random()<.08;g.fillStyle=ox?`rgb(${warm-60},${warm-110},70)`:`rgb(${warm+20},${Math.round((warm+20)*.58)},${Math.round((warm+20)*.34)})`;g.fillRect(x,0,1,H)}
 return finish(c,true,true);
}
