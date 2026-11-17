// Cobalt's canvas textures: the board print (painted in paint.ts), and the surface finishes drawn here:
// brushed metal, moulded-plastic grain, package markings, the flex ribbon, the embossed cover plate.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {BOARD,COVER} from './layout';
import {boardCanvas,paintColour,paintRelief,paintBottom,FONT} from './paint';

type G=CanvasRenderingContext2D;
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')!] as const};
function wrap(c:HTMLCanvasElement,srgb:boolean,repeat=false){
 const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=16;
 if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
// Map a texture across a plan of w × d mm centred on the origin, for geometry whose UVs are plan millimetres.
export function planUV<T extends THREE.Texture>(t:T,w:number,d:number){t.repeat.set(1/w,1/d);t.offset.set(.5,.5);return t}

export const PRINT=48;                                    // board print, pixels per millimetre
export function boardTextures(){
 const colour=boardCanvas(PRINT),relief=boardCanvas(PRINT),bottom=boardCanvas(24);
 paintColour(colour.getContext('2d')!,PRINT);paintRelief(relief.getContext('2d')!,PRINT);paintBottom(bottom.getContext('2d')!,24);
 return {colour:planUV(wrap(colour,true),BOARD.w,BOARD.d),relief:planUV(wrap(relief,false),BOARD.w,BOARD.d),bottom:planUV(wrap(bottom,true),BOARD.w,BOARD.d)};
}
// ── Brushed metal: fine streaks along u. Red is tone and height, green roughness. Tiles in both directions. ──
export function brushed(seed:number,size=1024){
 const [c,g]=canvas(size,size),img=g.createImageData(size,size),random=rng(seed),row=new Float32Array(size);
 for(let y=0;y<size;y++){
  // Each row is a slow random walk, closed into a loop so the tile has no seam.
  let v=0;for(let x=0;x<size;x++){v=v*.985+(random()-.5)*.5;row[x]=v}
  const drift=(row[size-1]-row[0]);for(let x=0;x<size;x++)row[x]-=drift*x/(size-1);
  const base=(random()-.5)*.9,fine=random();
  for(let x=0;x<size;x++){
   const t=Math.max(0,Math.min(1,.5+.08*row[x]+.1*base+(random()-.5)*.04)),o=(y*size+x)*4;
   img.data[o]=t*255;img.data[o+1]=Math.max(0,Math.min(255,(.58+.3*(t-.5)+.18*(fine-.5))*255));img.data[o+2]=t*255;img.data[o+3]=255;
  }
 }
 g.putImageData(img,0,0);
 // A few longer scratches.
 for(let i=0;i<70;i++){const y=random()*size,x=random()*size,l=60+random()*400,light=random()<.6;g.strokeStyle=light?`rgba(235,235,235,${.1+random()*.25})`:`rgba(20,20,20,${.1+random()*.2})`;g.lineWidth=.6+random();g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y+(random()-.5)*2);g.stroke()}
 return wrap(c,false,true);
}
// Satin metal: brushing so fine and even that it only shows as a stretched highlight. Green is roughness, within a few percent.
export function satin(seed:number,size=512){
 const [c,g]=canvas(8,size),random=rng(seed);let v=0;
 for(let y=0;y<size;y++){v=v*.5+(random()-.5);const t=Math.round(244+9*Math.max(-1,Math.min(1,v)));g.fillStyle=`rgb(${t},${t},${t})`;g.fillRect(0,y,8,1)}
 return wrap(c,false,true);
}
// ── Moulded plastic and matte coatings: a fine grain. Red is height, green roughness. ──
export function grain(seed:number,rough=.55,spread=.3,size=256){
 const [c,g]=canvas(size,size),img=g.createImageData(size,size),random=rng(seed);
 for(let i=0;i<size*size;i++){const v=random(),o=i*4;img.data[o]=110+v*90;img.data[o+1]=Math.max(0,Math.min(255,(rough+(v-.5)*spread)*255));img.data[o+2]=0;img.data[o+3]=255}
 g.putImageData(img,0,0);return wrap(c,false,true);
}
// ── Package tops: laser marking on black epoxy, with the pin-one dimple. `w`/`d` in mm. ──
export function marking(w:number,d:number,lines:string[],o:{dot?:boolean;body?:string;ink?:string;size?:number;stripe?:boolean}={}){
 const k=Math.min(96,Math.floor(1536/Math.max(w,d))),[c,g]=canvas(Math.round(w*k),Math.round(d*k)),random=rng(lines.join('').length+Math.round(w*10));
 g.fillStyle=o.body??'#17181b';g.fillRect(0,0,c.width,c.height);
 // Mould speckle.
 for(let i=0;i<w*d*60;i++){const v=random();g.fillStyle=v<.5?`rgba(255,255,255,${.015+random()*.03})`:`rgba(0,0,0,${.05+random()*.1})`;const s=(.02+random()*.04)*k;g.fillRect(random()*c.width,random()*c.height,s,s)}
 g.setTransform(k,0,0,k,c.width/2,c.height/2);
 if(o.stripe){g.fillStyle='rgba(206,210,214,.85)';g.fillRect(-w/2+.25,-d/2,.5,d)}
 const size=o.size??Math.min(d/(lines.length+1.6),w/7);g.fillStyle=o.ink??'rgba(190,194,198,.82)';g.textAlign='center';g.textBaseline='middle';
 lines.forEach((t,i)=>{g.font=`${i===0?700:500} ${size*(i===0?1.15:.86)}px ${FONT}`;g.fillText(t,o.stripe?.25:0,(i-(lines.length-1)/2)*size*1.25)});
 if(o.dot){const x=-w/2+Math.min(1.1,w*.16),y=d/2-Math.min(1.1,d*.2),r=Math.min(.42,d*.09),shade=g.createRadialGradient(x-r*.2,y-r*.2,0,x,y,r);shade.addColorStop(0,'#08090a');shade.addColorStop(.8,'#0d0e10');shade.addColorStop(1,'#2a2c30');g.fillStyle=shade;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill()}
 const t=wrap(c,true);return planUV(t,w,d);
}
// ── Shield can: a grid of pressed dimples and a stamped part number. Red is height. ──
export function dimples(w:number,d:number){
 const k=64,[c,g]=canvas(Math.round(w*k),Math.round(d*k));g.fillStyle='rgb(150,150,150)';g.fillRect(0,0,c.width,c.height);g.setTransform(k,0,0,k,c.width/2,c.height/2);
 for(let i=-3;i<=3;i++)for(let j=-2;j<=2;j++){
  if(Math.abs(i)<=1&&j===2)continue;
  const x=i*1.05+(j%2?0:0),y=j*1.05-.5,r=.34,shade=g.createRadialGradient(x,y,0,x,y,r);shade.addColorStop(0,'rgb(40,40,40)');shade.addColorStop(.7,'rgb(70,70,70)');shade.addColorStop(1,'rgb(150,150,150)');g.fillStyle=shade;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
 }
 g.fillStyle='rgb(112,112,112)';g.textAlign='center';g.textBaseline='middle';g.font=`700 .62px ${FONT}`;g.fillText('RF-0912',0,d/2-1.25);g.font=`500 .42px ${FONT}`;g.fillText('HX 2644',0,d/2-.6);
 return planUV(wrap(c,false),w,d);
}
// ── Flex ribbon. u runs across the width, v along the length from the board connector (canvas bottom) to the cover plate. ──
export function flexTextures(){
 const W=512,H=2048,[c,g]=canvas(W,H),[r,q]=canvas(W,H);
 g.fillStyle='#c4520a';g.fillRect(0,0,W,H);q.fillStyle='rgb(110,96,0)';q.fillRect(0,0,W,H);
 // Fourteen conductors in two bundles, with a ground strip either side.
 const lanes:[number,number][]=[];lanes.push([26,22]);for(let i=0;i<14;i++)lanes.push([78+i*26+(i>6?14:0),11]);lanes.push([W-48,22]);
 for(const [x,w] of lanes){g.fillStyle='#7c3406';g.fillRect(x-1,0,w+2,H);g.fillStyle='#ff8a1c';g.fillRect(x,0,w,H);g.fillStyle='rgba(255,196,120,.16)';g.fillRect(x+1,0,2,H);q.fillStyle='rgb(170,70,0)';q.fillRect(x,0,w,H)}
 // Stiffener and gold fingers at the board end.
 const tail=96;g.fillStyle='#2a4f9a';g.fillRect(0,H-tail,W,tail);q.fillStyle='rgb(200,120,0)';q.fillRect(0,H-tail,W,tail);
 for(const [x,w] of lanes.slice(1,-1)){g.fillStyle='#d8ae5c';g.fillRect(x-2,H-tail+8,w+4,tail-8);q.fillStyle='rgb(230,60,255)';q.fillRect(x-2,H-tail+8,w+4,tail-8)}
 // Registration marks and a printed part number.
 g.fillStyle='rgba(240,225,200,.8)';g.save();g.translate(W-14,H*.42);g.rotate(-Math.PI/2);g.font=`600 15px ${FONT}`;g.textAlign='center';g.fillText('FX14-0.5  94V-0   CBLT-A2',0,0);g.restore();
 // Mask for the travelling burst: only the fourteen signal conductors light.
 const [e,p]=canvas(W,8);p.fillStyle='#000';p.fillRect(0,0,W,8);
 for(const [x,w] of lanes.slice(1,-1)){p.fillStyle='#fff';p.fillRect(x,0,w,8)}
 const pulse=wrap(e,true);
 return {colour:wrap(c,true),relief:wrap(r,false),pulse};
}
// ── Cover plate: a dark glass panel carrying an invented, luminous circuit. Three sheets from the same vectors:
// `colour` (the ink, also what glows), `phase` (where along its trace each pixel lies, as a unit vector in red and blue with
// green as the mask, so pulses can travel the traces in the shader) and `film` (thin-film thickness for the iridescent sheen).
export const HOLO={cycle:8,pitch:.3};                      // mm of trace one pulse cycle covers; trace pitch in a bundle
export function coverTextures(){
 const {w,d}=COVER,k=110,W=Math.round(w*k),H=Math.round(d*k),[c,g]=canvas(W,H),[ph,q]=canvas(W,H),[th,tq]=canvas(256,256);
 const CY='#27e8ff',BL='#2f6cff',MG='#ff3fd8',VI='#9b5cff',AM='#ffb22e',INK='#04060c',TAU=Math.PI*2;
 g.fillStyle=INK;g.fillRect(0,0,W,H);q.fillStyle='rgb(128,0,128)';q.fillRect(0,0,W,H);
 for(const x of [g,q]){x.setTransform(k,0,0,k,W/2,H/2);x.lineJoin='round'}
 // A faint lattice under everything.
 g.strokeStyle='#0a1836';g.lineWidth=.03;g.beginPath();for(let i=0;i<=28;i++){g.moveTo(-8.4+i*.6,-6.9);g.lineTo(-8.4+i*.6,6.9)}for(let i=0;i<=23;i++){g.moveTo(-8.4,-6.9+i*.6);g.lineTo(8.4,-6.9+i*.6)}g.stroke();
 // A polyline moved sideways by `o`, mitred at each corner so a bundle stays parallel through its 45° turns.
 const offset=(p:number[],o:number)=>{
  const n=p.length/2,out:number[]=[],normal=(i:number)=>{const x=p[i*2+2]-p[i*2],y=p[i*2+3]-p[i*2+1],l=Math.hypot(x,y);return [-y/l,x/l]};
  for(let i=0;i<n;i++){const a=normal(Math.max(0,i-1)),b=normal(Math.min(n-2,i)),m=1+a[0]*b[0]+a[1]*b[1];out.push(p[i*2]+o*(a[0]+b[0])/m,p[i*2+1]+o*(a[1]+b[1])/m)}
  return out;
 };
 const via=(x:number,y:number,r=.17)=>{g.beginPath();g.arc(x,y,r,0,TAU);g.fill();const f=g.fillStyle;g.fillStyle=INK;g.beginPath();g.arc(x,y,r*.42,0,TAU);g.fill();g.fillStyle=f};
 const trace=(p:number[],colour:string,start:number,width=.12)=>{
  g.strokeStyle=g.fillStyle=colour;g.lineWidth=width;g.lineCap='round';g.beginPath();g.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.stroke();
  via(p[p.length-2],p[p.length-1]);
  // Phase along the trace, in short steps.
  let s=start*HOLO.cycle;q.lineWidth=width*1.4;q.lineCap='butt';
  for(let i=2;i<p.length;i+=2){
   const x0=p[i-2],y0=p[i-1],dx=p[i]-x0,dy=p[i+1]-y0,len=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(len/.08));
   for(let j=0;j<steps;j++){const a=(s+len*(j+.5)/steps)/HOLO.cycle*TAU,t0=j/steps,t1=Math.min(1,(j+1.2)/steps);q.strokeStyle=`rgb(${Math.round(128+127*Math.cos(a))},255,${Math.round(128+127*Math.sin(a))})`;q.beginPath();q.moveTo(x0+dx*t0,y0+dy*t0);q.lineTo(x0+dx*t1,y0+dy*t1);q.stroke()}
   s+=len;
  }
 };
 // Parallel traces either side of a centre line; alternate ones stop short so their end vias do not touch.
 const bundle=(p:number[],n:number,colour:string,start:number)=>{
  for(let i=0;i<n;i++){
   const t=offset(p,(i-(n-1)/2)*HOLO.pitch),m=t.length;
   if(i%2){const dx=t[m-2]-t[m-4],dy=t[m-1]-t[m-3],l=Math.hypot(dx,dy);t[m-2]-=dx/l*.45;t[m-1]-=dy/l*.45}
   trace(t,colour,start+i*.045);
  }
 };
 // Everything but the labels has half-turn symmetry, in a second set of colours.
 [1,-1].forEach((s,h)=>{
  const turn=(p:number[])=>p.map(v=>v*s);
  bundle(turn([0,-2.2,0,-3.4,-1.8,-5.2,-7.5,-5.2]),8,h?BL:CY,h*.5);
  bundle(turn([2.2,0,3.6,0,5.4,-1.8,5.4,-6.3]),8,h?VI:MG,.25+h*.5);
  bundle(turn([7.8,-6.4,7.8,2.6]),4,h?CY:BL,.1+h*.5);
  // A square coil.
  {const p=[1.8,-5.7],L=2.2,gap=.36,dir=[[1,0],[0,1],[-1,0],[0,-1]];let x=p[0],y=p[1];for(let i=0;i<11;i++){const len=L-Math.max(0,Math.floor((i-1)/2))*gap;x+=dir[i%4][0]*len;y+=dir[i%4][1]*len;p.push(x,y)}trace(turn(p),AM,.6+h*.5,.1)}
 });
 // The core the bundles leave from.
 g.lineWidth=.1;g.strokeStyle=CY;g.beginPath();g.roundRect(-2.2,-2.2,4.4,4.4,.35);g.stroke();
 g.lineWidth=.06;g.strokeStyle=BL;g.beginPath();g.roundRect(-1.6,-1.6,3.2,3.2,.2);g.stroke();
 g.strokeStyle=MG;g.lineWidth=.08;g.beginPath();g.arc(0,0,1.05,0,TAU);g.stroke();g.strokeStyle=CY;g.beginPath();g.arc(0,0,.6,0,TAU);g.stroke();
 g.fillStyle=AM;g.beginPath();g.arc(0,0,.2,0,TAU);g.fill();
 g.fillStyle=VI;for(const [x,y] of [[-1.3,-1.3],[1.3,-1.3],[-1.3,1.3],[1.3,1.3]]){g.beginPath();g.arc(x,y,.12,0,TAU);g.fill()}
 // A field of vias, upper left.
 for(let i=0;i<11;i++)for(let j=0;j<4;j++){g.fillStyle=(i*2+j)%5===0?MG:(i+j)%2?VI:BL;g.beginPath();g.arc(-6.8+i*.42,-3.2+j*.42,.09,0,TAU);g.fill()}
 // Part number and a tick scale, lower right.
 g.fillStyle=CY;g.font=`700 .62px ${FONT}`;g.textAlign='left';g.textBaseline='middle';g.fillText('CBLT-HX A2',2.4,2.15);
 g.fillStyle=AM;{let x=2.4;for(const wd of [.3,.1,.18,.1,.42,.1,.1,.26,.14,.1,.34,.1,.2]){g.fillRect(x,2.85,wd,.42);x+=wd+.12}}
 // Border with brighter corner brackets.
 g.strokeStyle='rgba(39,232,255,.45)';g.lineWidth=.05;g.beginPath();g.roundRect(-w/2+.6,-d/2+.6,w-1.2,d-1.2,COVER.r-.5);g.stroke();
 // Thin-film thickness: a slow diagonal drift, so the sheen's colour changes across the plate as well as with the angle.
 for(let y=0;y<256;y++)for(let x=0;x<256;x+=4){const v=Math.round(127+110*Math.sin((x+y*.7)/256*Math.PI*2.2)+16*Math.sin(x*.09)*Math.cos(y*.07));tq.fillStyle=`rgb(${v},${v},${v})`;tq.fillRect(x,y,4,1)}
 const film=wrap(th,false);film.wrapS=film.wrapT=THREE.ClampToEdgeWrapping;
 return {colour:planUV(wrap(c,true),w,d),phase:planUV(wrap(ph,false),w,d),film:planUV(film,w,d)};
}
// Tiny numerals for chip resistors.
export function chipMark(text:string,w:number,d:number){
 const k=128,[c,g]=canvas(Math.round(w*k),Math.round(d*k));g.fillStyle='#141517';g.fillRect(0,0,c.width,c.height);
 g.fillStyle='rgba(226,228,230,.9)';g.textAlign='center';g.textBaseline='middle';g.font=`700 ${d*k*.62}px ${FONT}`;g.fillText(text,c.width/2,c.height/2+1);
 return planUV(wrap(c,true),w,d);
}
