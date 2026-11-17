// The board's printed face, drawn from vectors (pcb.ts, routed.ts) and nothing else: traces under the solder mask,
// exposed pale-gold pads with their mask openings, plated holes and vias, silk-screen lines and lettering.
// One canvas cannot hold a 174 × 259 mm board at 25 px/mm, so the face is cut into tiles, each with a small gutter so
// mip levels do not bleed at the joins. Everything is in reference pixels (0.1 mm); a tile only sets the transform.
import * as THREE from 'three';
import {rng} from '../kit/util';
import {IMG,PIPE,BAR,MANIFOLD,BRACKET,parts} from './layout';
import {pads,drills,silkRects,silkRings,silkDots} from './pcb';
import {TRACES,VIAS,SILK,LABELS} from './routed';

type G=CanvasRenderingContext2D;
export const FONT='"Inter Variable","Inter","Helvetica Neue",Arial,sans-serif';
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return [c,c.getContext('2d')!] as const};
// Lettering drawn before the page font has loaded is drawn again once it has.
const redraws:(()=>void)[]=[];
let fontState=typeof document==='undefined'||!document.fonts?2:document.fonts.check(`600 20px "Inter Variable"`)?2:0;
export function lettered(draw:()=>void){
 draw();if(fontState===2)return;redraws.push(draw);
 if(fontState===0){fontState=1;document.fonts.load(`600 20px "Inter Variable"`).then(()=>document.fonts.ready).then(()=>{fontState=2;for(const r of redraws)r();redraws.length=0}).catch(()=>{})}
}

const MASK='#1b1a1b',TRACE='#353131',OPEN='#100f10',GOLD='#cfb88c',GOLD_HI='rgba(255,246,222,.3)',COPPER='#b78048',HOLE='#060505',INK='#e2ddd6';
const traceBox=TRACES.map(t=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=1;i<t.length;i+=2){x0=Math.min(x0,t[i]);x1=Math.max(x1,t[i]);y0=Math.min(y0,t[i+1]);y1=Math.max(y1,t[i+1])}return [x0-1,y0-1,x1+1,y1+1]});
type View=readonly [number,number,number,number];
function paint(g:G,v:View,rough:boolean){
 const see=(x0:number,y0:number,x1:number,y1:number)=>x1>=v[0]&&x0<=v[2]&&y1>=v[1]&&y0<=v[3];
 const tone=(c:string,r:number)=>rough?`rgb(${r},${r},${r})`:c;
 g.fillStyle=tone(MASK,216);g.fillRect(v[0],v[1],v[2]-v[0],v[3]-v[1]);
 if(!rough){
  // Solder mask is never perfectly even: broad faint clouds.
  const random=rng(7);
  for(let i=0;i<260;i++){const x=random()*IMG.w,y=random()*IMG.h,r=60+random()*220,a=.005+random()*.008,c=random()<.5?'255,244,236':'0,0,0';if(!see(x-r,y-r,x+r,y+r))continue;const f=g.createRadialGradient(x,y,0,x,y,r);f.addColorStop(0,`rgba(${c},${a})`);f.addColorStop(1,`rgba(${c},0)`);g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)}
 }
 // Traces: copper under the mask reads a shade paler and a little glossier than bare laminate.
 g.strokeStyle=tone(TRACE,150);g.lineCap='round';g.lineJoin='round';
 TRACES.forEach((t,i)=>{const b=traceBox[i];if(!see(b[0],b[1],b[2],b[3]))return;g.lineWidth=t[0];g.beginPath();g.moveTo(t[1],t[2]);for(let k=3;k<t.length;k+=2)g.lineTo(t[k],t[k+1]);g.stroke()});
 // Silk-screen lines.
 g.strokeStyle=g.fillStyle=tone(INK,235);g.lineWidth=1.1;g.lineCap='butt';
 for(const [x0,y0,x1,y1,r] of silkRects){if(!see(x0,y0,x1,y1))continue;g.beginPath();g.roundRect(x0,y0,x1-x0,y1-y0,r);g.stroke()}
 for(const [x,y,r,half] of silkRings){if(!see(x-r,y-r,x+r,y+r))continue;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();if(half){g.beginPath();g.arc(x,y,r,-Math.PI/2,Math.PI/2);g.closePath();g.fill()}}
 for(const [x,y,r] of silkDots){if(!see(x-r,y-r,x+r,y+r))continue;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill()}
 g.lineWidth=1.2;g.lineCap='round';g.beginPath();for(let i=0;i<SILK.length;i+=4){if(!see(Math.min(SILK[i],SILK[i+2])-1,Math.min(SILK[i+1],SILK[i+3])-1,Math.max(SILK[i],SILK[i+2])+1,Math.max(SILK[i+1],SILK[i+3])+1))continue;g.moveTo(SILK[i],SILK[i+1]);g.lineTo(SILK[i+2],SILK[i+3])}g.stroke();
 // Pads: the opening in the mask first (a hair larger than the copper), then the copper, then any hole.
 const shape=(x:number,y:number,w:number,h:number,r:number,grow:number)=>{g.beginPath();if(r>=Math.min(w,h)/2-.01&&Math.abs(w-h)<.01)g.arc(x,y,w/2+grow,0,Math.PI*2);else g.roundRect(x-w/2-grow,y-h/2-grow,w+grow*2,h+grow*2,r+grow)};
 for(const p of pads){
  if(!see(p.x-p.w/2-1,p.y-p.h/2-1,p.x+p.w/2+1,p.y+p.h/2+1))continue;
  g.fillStyle=tone(OPEN,235);shape(p.x,p.y,p.w,p.h,p.r,.55);g.fill();
  g.fillStyle=tone(p.bare?COPPER:GOLD,p.bare?120:96);shape(p.x,p.y,p.w,p.h,p.r,0);g.fill();
  if(!rough&&Math.min(p.w,p.h)>=3.4&&!p.hole){g.strokeStyle=GOLD_HI;g.lineWidth=.35;shape(p.x,p.y,p.w-1.1,p.h-1.1,Math.max(.1,p.r-.5),0);g.stroke()}
  if(p.hole){g.fillStyle=tone(HOLE,240);g.beginPath();g.arc(p.x,p.y,p.hole,0,Math.PI*2);g.fill();if(!rough){g.strokeStyle='rgba(120,100,70,.7)';g.lineWidth=.4;g.beginPath();g.arc(p.x,p.y,p.hole+.2,0,Math.PI*2);g.stroke()}}
 }
 for(let i=0;i<VIAS.length;i+=3){
  const x=VIAS[i],y=VIAS[i+1],r=VIAS[i+2]/2;if(!see(x-r-1,y-r-1,x+r+1,y+r+1))continue;
  g.fillStyle=tone(OPEN,235);g.beginPath();g.arc(x,y,r+.45,0,Math.PI*2);g.fill();
  g.fillStyle=tone(GOLD,96);g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
  g.fillStyle=tone(HOLE,240);g.beginPath();g.arc(x,y,r*.48,0,Math.PI*2);g.fill();
 }
 for(const [x,y,r] of drills){if(!see(x-r,y-r,x+r,y+r))continue;g.fillStyle=tone(HOLE,240);g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();if(!rough&&r>2){g.strokeStyle='rgba(90,84,80,.6)';g.lineWidth=.4;g.stroke()}}
 // Lettering: one face, one weight, cap height 0.5 mm and up.
 g.fillStyle=tone(INK,235);g.textAlign='center';g.textBaseline='middle';
 for(const [x,y,size,turned,text] of LABELS){
  const w=text.length*size*.66,h=size;if(!see(x-Math.max(w,h),y-Math.max(w,h),x+Math.max(w,h),y+Math.max(w,h)))continue;
  g.save();g.translate(x,y);if(turned)g.rotate(-Math.PI/2);g.font=`600 ${size}px ${FONT}`;g.fillText(text,0,size*.04,w);g.restore();
 }
}
export function boardMaps(){
 const phone=typeof matchMedia!=='undefined'&&matchMedia('(max-width: 700px)').matches;
 const S=phone?1.2:2.5,cols=2,rows=3,gut=4,tw=IMG.w/cols,th=IMG.h/rows;
 const tiles:{map:THREE.CanvasTexture;box:[number,number,number,number];gutter:number}[]=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const box:[number,number,number,number]=[c*tw,r*th,(c+1)*tw,(r+1)*th],[cv,g]=canvas((tw+gut*2)*S,(th+gut*2)*S),map=new THREE.CanvasTexture(cv);
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=16;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;
  lettered(()=>{g.setTransform(S,0,0,S,-(box[0]-gut)*S,-(box[1]-gut)*S);paint(g,[box[0]-gut,box[1]-gut,box[2]+gut,box[3]+gut],false);map.needsUpdate=true});
  tiles.push({map,box,gutter:gut});
 }
 // Roughness, for the whole board at once: pads and traces are glossier than the mask, silk is flatter.
 const k=2048/IMG.h,[rc,rg]=canvas(IMG.w*k,2048),rough=new THREE.CanvasTexture(rc);rough.anisotropy=8;rough.channel=1;
 lettered(()=>{rg.setTransform(k,0,0,k,0,0);paint(rg,[0,0,IMG.w,IMG.h],true);rough.needsUpdate=true});
 return {tiles,rough,occlusion:occlusion()};
}
// Soft occlusion round everything that stands on the board, so parts sit in it instead of floating on it. It is the
// board's ambient-occlusion map, so the device can fade it out as the parts lift away.
function occlusion(){
 const k=.4,[c,g]=canvas(IMG.w*k,IMG.h*k),FAR=4000;g.scale(k,k);g.fillStyle='#fff';g.fillRect(0,0,IMG.w,IMG.h);
 const outline=(pts:readonly (readonly number[])[],close=true)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x-FAR,y):g.moveTo(x-FAR,y));if(close)g.closePath()};
 g.fillStyle=g.strokeStyle='#000';g.lineCap='round';g.lineJoin='round';
 // Only the shadow is wanted, so each shape is drawn off the canvas and its shadow thrown back on.
 const cast=(a:number,blur:number,dx:number,dy:number)=>{g.shadowColor=`rgba(0,0,0,${a})`;g.shadowBlur=blur*k;g.shadowOffsetX=(FAR+dx)*k;g.shadowOffsetY=dy*k};
 for(const p of parts){
  if(p.on)continue;const h=p.y1-1.6,[x0,y0,x1,y1]=p.box;cast(Math.min(.8,.4+h*.045),Math.min(22,4+h*2),h*.25,h*.5);
  g.beginPath();if(p.r!==undefined)g.arc((x0+x1)/2-FAR,(y0+y1)/2,p.r*10,0,Math.PI*2);else g.roundRect(x0-FAR,y0,x1-x0,y1-y0,3);g.fill();
 }
 cast(.7,16,2,4);g.lineWidth=PIPE.r*20;
 for(const path of [PIPE.left,PIPE.right]){outline(path,false);g.stroke()}
 g.beginPath();g.moveTo(BAR.x0-FAR,BAR.y);g.lineTo(BAR.x1-FAR,BAR.y);g.stroke();
 outline(BRACKET.plate);g.fill();outline(MANIFOLD);g.fill();
 const t=new THREE.CanvasTexture(c);t.channel=1;return t;
}
// Markings for the small parts: one cell per code, pale ink for dark bodies and dark ink for pale ones.
export function codeAtlas(codes:readonly {text:string;dark:boolean}[]){
 const cw=160,ch=64,cols=8,rows=Math.ceil(codes.length/cols),[c,g]=canvas(cols*cw,rows*ch),t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
 lettered(()=>{
  g.clearRect(0,0,c.width,c.height);g.textAlign='center';g.textBaseline='middle';g.font=`600 46px ${FONT}`;
  codes.forEach((q,i)=>{g.fillStyle=q.dark?'rgba(40,32,26,.9)':'rgba(236,232,226,.95)';g.fillText(q.text,(i%cols+.5)*cw,(Math.floor(i/cols)+.5)*ch+2,cw-22)});
  t.needsUpdate=true;
 });
 return {texture:t,uv:(i:number):[number,number,number,number]=>{const x=i%cols,y=Math.floor(i/cols);return [x/cols,1-(y+1)/rows,(x+1)/cols,1-y/rows]}};
}
