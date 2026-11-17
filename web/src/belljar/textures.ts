import * as THREE from 'three';
import {rng} from '../kit/util';
import {CLOCK} from './layout';

const INK='#15171a',ORANGE='#e96a00',RED='#e2452b',FONT='"Helvetica Neue",Helvetica,Arial,sans-serif',TURN=Math.PI*2;
const finish=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};

// Chapter ring: orange hours, a minute track, an inner scale and dense small print, as in the reference.
// The canvas spans the dial diameter; angles run clockwise from twelve.
export function dialTexture(){
 const size=2048,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')!;
 const R=CLOCK.dial,mm=(v:number)=>v*size/2/R,random=rng(1009);
 g.fillStyle='#f4f4f0';g.fillRect(0,0,size,size);g.translate(size/2,size/2);
 const shade=g.createRadialGradient(0,0,mm(CLOCK.open),0,0,mm(R));
 shade.addColorStop(0,'rgba(110,118,126,.2)');shade.addColorStop(.18,'rgba(255,255,255,0)');shade.addColorStop(.86,'rgba(255,255,255,0)');shade.addColorStop(1,'rgba(110,118,126,.22)');
 g.fillStyle=shade;g.fillRect(-size/2,-size/2,size,size);
 g.textAlign='center';g.textBaseline='middle';g.lineCap='butt';
 const ring=(r:number,w:number,style=INK)=>{g.strokeStyle=style;g.lineWidth=w;g.beginPath();g.arc(0,0,mm(r),0,TURN);g.stroke()};
 const tick=(a:number,r0:number,r1:number,w:number,style=INK)=>{g.strokeStyle=style;g.lineWidth=w;g.beginPath();g.moveTo(Math.sin(a)*mm(r0),-Math.cos(a)*mm(r0));g.lineTo(Math.sin(a)*mm(r1),-Math.cos(a)*mm(r1));g.stroke()};
 const at=(a:number,r:number,turn:number,draw:()=>void)=>{g.save();g.translate(Math.sin(a)*mm(r),-Math.cos(a)*mm(r));g.rotate(turn);draw();g.restore()};
 // Text along the rim reads from outside in the lower half, so it is never upside down.
 const radial=(a:number)=>Math.cos(a)<-.2?a+Math.PI:a;
 const text=(s:string,height:number,weight=500,style=INK)=>{g.fillStyle=style;g.font=`${weight} ${mm(height)}px ${FONT}`;g.fillText(s,0,0)};

 // Minute track.
 ring(50.6,9);ring(47.2,6);
 for(let i=0;i<300;i++){const a=i/300*TURN;if(i%25===0)tick(a,45.6,50.6,20);else if(i%5===0)tick(a,47.2,50.6,11);else tick(a,48.5,50.6,6.5)}
 for(let i=1;i<=12;i++){if(i>=5&&i<=7)continue;const a=i/12*TURN;at(a,44.4,radial(a),()=>text(String(i*5).padStart(2,'0'),3.5,700))}
 // Inner scale round the opening.
 ring(33.3,6);ring(30.5,5);ring(CLOCK.open+.9,4,'#8b929a');
 for(let i=0;i<144;i++){const a=i/144*TURN;tick(a,i%6?31.2:29.4,33.3,i%6?6:11)}
 for(let i=0;i<12;i++){const a=(i+.5)/12*TURN;at(a,28.5,radial(a),()=>text(String(13+i),2.7,700))}
 // Slide-rule ladders and rows of figures in the gaps between the hours.
 for(let i=0;i<12;i++){
  const a0=(i+.2)/12*TURN,a1=(i+.8)/12*TURN,r=i%2?35.2:41.4;
  g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.arc(0,0,mm(r),a0-Math.PI/2,a1-Math.PI/2);g.stroke();
  for(let k=0;k<=18;k++)tick(a0+(a1-a0)*k/18,r,r+(k%3?1.5:2.8),5.5);
  for(let k=0;k<3;k++){const a=(i+.3+k*.2)/12*TURN;at(a,i%2?40.6:36.4,radial(a),()=>text(String(Math.floor(random()*90)+10+(k===1?100:0)),2.9,700))}
 }
 for(let i=0;i<40;i++){
  const a=random()*TURN,r=34.6+random()*9;
  if(Math.abs(frac12(a)-.5)>.34)continue;
  if(random()<.6){g.fillStyle=INK;g.beginPath();g.arc(Math.sin(a)*mm(r),-Math.cos(a)*mm(r),mm(.45),0,TURN);g.fill()}
  else at(a,r,a,()=>{g.fillStyle=INK;g.beginPath();g.moveTo(0,-mm(1.3));g.lineTo(mm(1),mm(.9));g.lineTo(-mm(1),mm(.9));g.fill()});
 }
 // Hour numerals.
 for(let i=1;i<=12;i++){
  const a=i/12*TURN;
  at(a,38.5,0,()=>{g.font=`700 ${mm(9.2)}px ${FONT}`;g.lineWidth=mm(.9);g.strokeStyle='#f4f4f0';g.strokeText(String(i),0,0);g.lineWidth=mm(.22);g.strokeStyle='#c96508';g.fillStyle=ORANGE;g.fillText(String(i),0,0);g.strokeText(String(i),0,0)});
 }
 // Accents: orange bars at nine, red pointers by three, a legend under six.
 for(const a of [.742,.758])tick(a*TURN,46.4,51.4,7,ORANGE);
 for(const a of [.226,.262,.3])at(a*TURN,51.4,a*TURN,()=>{g.fillStyle=RED;g.beginPath();g.moveTo(0,mm(1.7));g.lineTo(mm(1.1),-mm(.9));g.lineTo(-mm(1.1),-mm(.9));g.fill()});
 tick(.5*TURN,43.2,46.4,7,ORANGE);
 const legend='BELLJAR · 28 800 A/H · ALARM';
 [...legend].forEach((ch,i)=>{const a=Math.PI-(i-(legend.length-1)/2)*.045;at(a,44.6,a+Math.PI,()=>text(ch,3,700))});
 return finish(c);
}
const frac12=(a:number)=>{const h=a/TURN*12;return h-Math.floor(h)};

// Seconds sub-dial.
export function subdialTexture(){
 const size=256,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')!;
 g.fillStyle='#f6f6f2';g.fillRect(0,0,size,size);g.translate(size/2,size/2);
 g.strokeStyle=INK;g.lineWidth=5;g.beginPath();g.arc(0,0,112,0,TURN);g.stroke();
 for(let i=0;i<12;i++){const a=i/12*TURN;g.lineWidth=i%3?5:10;g.beginPath();g.moveTo(Math.sin(a)*(i%3?92:80),-Math.cos(a)*(i%3?92:80));g.lineTo(Math.sin(a)*110,-Math.cos(a)*110);g.stroke()}
 return finish(c);
}
