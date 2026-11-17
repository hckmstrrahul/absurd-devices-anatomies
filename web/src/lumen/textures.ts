import * as THREE from 'three';
import {rng} from '../kit/util';
import {DIAL,RECESS,ARBOR,STRIP,BASE} from './layout';

const finish=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return [c,c.getContext('2d')!] as const};
const SERIF='"Bodoni 72","Didot","Playfair Display","Times New Roman",serif';
const MONO='ui-monospace,Menlo,monospace';

// Silver dial with scattered Roman numerals. The oval recess is cut out as transparency.
export function dialTexture(){
 const k=12.5,[c,g]=canvas(DIAL.w*k,DIAL.h*k);
 // Canvas position of a point given in mm relative to the arbor (x right, y up).
 const X=(x:number)=>(ARBOR.x+x-DIAL.x+DIAL.w/2)*k,Y=(y:number)=>(DIAL.h/2-(ARBOR.y+y-DIAL.y))*k;
 const base=g.createLinearGradient(c.width,0,0,c.height);base.addColorStop(0,'#eceef0');base.addColorStop(.3,'#dfe2e5');base.addColorStop(.52,'#c4c8cc');base.addColorStop(.66,'#d6d9dc');base.addColorStop(.85,'#b3b8bd');base.addColorStop(1,'#a4a9af');
 g.fillStyle=base;g.fillRect(0,0,c.width,c.height);
 // Soft sunray sheen and a fine horizontal grain.
 const sheen=g.createConicGradient(.5,X(0),Y(0));
 for(let i=0;i<=12;i++)sheen.addColorStop(i/12,i%2?'rgba(255,255,255,.34)':'rgba(120,128,136,.14)');
 g.fillStyle=sheen;g.fillRect(0,0,c.width,c.height);
 const random=rng(11);
 for(let i=0;i<900;i++){g.strokeStyle=`rgba(${random()<.5?255:90},${random()<.5?255:96},${random()<.5?255:104},.05)`;g.lineWidth=1;const y=random()*c.height,x=random()*c.width;g.beginPath();g.moveTo(x,y);g.lineTo(x+60+random()*240,y);g.stroke()}
 g.strokeStyle='rgba(60,66,74,.55)';g.lineWidth=2.5;g.strokeRect(k*1.6,k*1.6,c.width-k*3.2,c.height-k*3.2);

 const ink='#15171a';g.fillStyle=ink;g.strokeStyle=ink;g.textAlign='center';g.textBaseline='middle';
 const text=(s:string,x:number,y:number,size:number,turn=0,font=SERIF,weight='400')=>{g.save();g.translate(X(x),Y(y));g.rotate(turn);g.font=`${weight} ${size*k}px ${font}`;g.fillText(s,0,0);g.restore()};
 // A long hollow wedge pointing away from the arbor: the stylised hour marks.
 const wedge=(x:number,y:number,len:number,w:number,hollow=true)=>{
  g.save();g.translate(X(x),Y(y));g.rotate(Math.atan2(x,y));g.beginPath();g.moveTo(0,len*k/2);g.lineTo(-w*k/2,-len*k*.3);g.lineTo(0,-len*k/2);g.lineTo(w*k/2,-len*k*.3);g.closePath();
  g.lineWidth=k*.55;if(hollow)g.stroke();else g.fill();g.restore();
 };
 const stroke=(x0:number,y0:number,x1:number,y1:number,w=.4)=>{g.lineWidth=w*k;g.beginPath();g.moveTo(X(x0),Y(y0));g.lineTo(X(x1),Y(y1));g.stroke()};

 // Top left: an overlapping XII, as in the reference.
 text('XII',-27,40,20,-.12,SERIF,'700');text('R',-35,43,14,.25,SERIF,'700');text('S',-49,32,11,-.5,SERIF,'700');
 g.lineWidth=k*.35;g.beginPath();g.arc(X(-44),Y(30),k*5.5,Math.PI*.9,Math.PI*1.9);g.stroke();
 text('I',1,44,20,0,SERIF,'700');text('F',-3,42,14,0,SERIF,'700');stroke(-6,35.6,9,35.6,.6);
 stroke(26,31,32,51,1.3);                                 // the lone slash at one o'clock
 // Right: small technical marks.
 for(const [x,y,turn] of [[53,33,-.5],[50,21,-.45],[45,14,-.4]] as const){g.save();g.translate(X(x),Y(y));g.rotate(turn);g.fillRect(-k*3.4,-k*.25,k*6.8,k*.5);g.strokeRect(-k*1.2,-k*.9,k*2.4,k*1.8);g.restore()}
 stroke(53,2,58,2,.35);stroke(53,-3.5,58,-3.5,.35);
 // Left: hook marks and a laddered VIII.
 stroke(-57,1.5,-52,1.5,.4);text('F',-40,1,4.2,0,MONO,'300');g.lineWidth=k*.35;g.beginPath();g.arc(X(-52),Y(-2.2),k*1.5,0,Math.PI*2);g.stroke();stroke(-50.5,-2.2,-44,-2.2,.35);
 text('2',-55,-17.5,10,0,SERIF,'700');
 g.save();g.translate(X(-41),Y(-17));g.rotate(-.5);for(let i=0;i<4;i++)g.fillRect(-k*9,(i*2.9-5.6)*k,k*18,k*1.4);g.fillRect(-k*9.6,-k*6.2,k*1.3,k*11.4);g.restore();
 text('3',-38,-30,6.5,0,SERIF,'700');wedge(-30,-34,19,3.8);wedge(-21,-42,11,2.8);text('6',-30,-46,7,0,SERIF,'700');
 // Bottom: maker's line and a II.
 text('LUMEN  HORA  COLORIS',2,-42.5,3,0,MONO,'600');text('one lap per hour',-10,-46.6,2.1,0,MONO,'400');text('II',2,-48.5,12,0,SERIF,'700');
 // Lower right: long wedges at four and five o'clock, ticks beyond.
 wedge(27,-38,22,3.6);wedge(43,-27,24,3.4,false);wedge(41,-14,13,2.2);
 // Minute track round the recess: an arc of ticks top left, lighter ticks elsewhere.
 for(let i=0;i<60;i++){
  const a=i*Math.PI/30,rx=RECESS.rx+5,ry=RECESS.ry+5,cy=RECESS.y-ARBOR.y;
  const x0=Math.sin(a)*rx,y0=cy+Math.cos(a)*ry,len=i%5?1.3:3;
  g.globalAlpha=i>47&&i<58?.95:.55;stroke(x0,y0,x0+Math.sin(a)*len,y0+Math.cos(a)*len,i%5?.22:.42);
 }
 g.globalAlpha=1;
 g.lineWidth=k*.3;g.beginPath();g.ellipse(X(RECESS.x-ARBOR.x),Y(RECESS.y-ARBOR.y),(RECESS.rx+4.4)*k,(RECESS.ry+4.4)*k,0,Math.PI*1.1,Math.PI*1.45);g.stroke();
 // Cut the recess out.
 g.globalCompositeOperation='destination-out';g.beginPath();g.ellipse(X(RECESS.x-ARBOR.x),Y(RECESS.y-ARBOR.y),RECESS.rx*k,RECESS.ry*k,0,0,Math.PI*2);g.fill();
 return finish(c);
}

// Round gauge face. `cyan` draws the lit day gauge in the globe; otherwise the white level gauge.
export function gaugeTexture(cyan:boolean){
 const size=512,[c,g]=canvas(size,size),h=size/2;
 g.translate(h,h);
 g.fillStyle=cyan?'#eef6f7':'#f7f6f1';g.beginPath();g.arc(0,0,h,0,Math.PI*2);g.fill();
 if(cyan){const core=g.createRadialGradient(0,0,10,0,0,h*.62);core.addColorStop(0,'#7ff4ff');core.addColorStop(.75,'#27d3ea');core.addColorStop(1,'rgba(39,211,234,0)');g.fillStyle=core;g.beginPath();g.arc(0,0,h*.62,0,Math.PI*2);g.fill()}
 g.strokeStyle=g.fillStyle='#1b1e22';g.textAlign='center';g.textBaseline='middle';g.font=`600 ${cyan?34:44}px ${MONO}`;
 const count=cyan?24:12,sweep=cyan?Math.PI*2:Math.PI*4/3,from=cyan?0:-Math.PI*2/3;
 for(let i=0;i<=(cyan?count-1:count);i++){
  const a=from+i/count*sweep,major=cyan?i%6===0:i%3===0;
  g.lineWidth=major?9:4;g.beginPath();g.moveTo(Math.sin(a)*h*.93,-Math.cos(a)*h*.93);g.lineTo(Math.sin(a)*h*(major?.74:.82),-Math.cos(a)*h*(major?.74:.82));g.stroke();
  if(major&&cyan)g.fillText(String(i),Math.sin(a)*h*.58,-Math.cos(a)*h*.58);
 }
 if(!cyan){g.font=`600 40px ${MONO}`;g.fillText('LUX',0,h*.42)}
 return finish(c);
}

// Gold-toned circuit boards: `strip` is the upright bus strip, otherwise the driver board lying on the floor.
export function boardTexture(strip:boolean){
 const k=strip?18:10,w=strip?STRIP.x1-STRIP.x0:BASE.x1-BASE.x0,h=strip?STRIP.y1-STRIP.y0:BASE.z1-BASE.z0;
 const [c,g]=canvas(w*k,h*k),random=rng(strip?5:23);
 const base=g.createLinearGradient(0,0,0,c.height);base.addColorStop(0,strip?'#d9a23a':'#8a6420');base.addColorStop(1,strip?'#b9791c':'#6f4f18');
 g.fillStyle=base;g.fillRect(0,0,c.width,c.height);
 g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<(strip?90:170);i++){
  let x=random()*c.width,y=random()*c.height;
  g.strokeStyle=`rgba(255,${214+random()*30|0},${120+random()*60|0},${.45+random()*.4})`;g.lineWidth=random()<.25?k*.42:k*.2;
  g.beginPath();g.moveTo(x,y);
  for(let j=0;j<2+random()*3;j++){const run=(2+random()*(strip?14:10))*k*(random()<.5?1:-1);if(random()<(strip?.75:.5))x+=run;else y+=run*.35;g.lineTo(x,y);const jog=k*(.6+random()*1.4);x+=jog*(random()<.5?1:-1);y+=jog*(random()<.5?1:-1);g.lineTo(x,y)}
  g.stroke();
  g.fillStyle='rgba(255,236,170,.95)';g.beginPath();g.arc(x,y,k*.42,0,Math.PI*2);g.fill();g.fillStyle='rgba(90,58,10,.9)';g.beginPath();g.arc(x,y,k*.17,0,Math.PI*2);g.fill();
 }
 g.fillStyle='rgba(60,36,4,.8)';g.font=`600 ${k*1.25}px ${MONO}`;
 if(strip){g.fillText('LUMEN BUS',k*1.2,k*1.8);g.fillText('120 CH',c.width-k*8.5,c.height-k*.8)}
 else{g.fillText('LUMEN DRIVER  REV B',k*2,c.height-k*1.4);g.fillText('4 Hz REF',c.width-k*12,k*2.2)}
 return finish(c);
}

// Studio surround for the polished metal and glass: dark overhead with soft boxes, pale floor below the horizon.
// Equirectangular; x = .75 of the width is straight behind the front camera, the top edge is straight up.
export function studioTexture(){
 const w=1024,h=512,[c,g]=canvas(w,h);
 const sky=g.createLinearGradient(0,0,0,h/2);sky.addColorStop(0,'#2b2e33');sky.addColorStop(.55,'#0d0e11');sky.addColorStop(.9,'#15171b');sky.addColorStop(1,'#6b7077');
 g.fillStyle=sky;g.fillRect(0,0,w,h/2);
 const floor=g.createLinearGradient(0,h/2,0,h);floor.addColorStop(0,'#bcc0c4');floor.addColorStop(.3,'#a6abb0');floor.addColorStop(1,'#5f646b');
 g.fillStyle=floor;g.fillRect(0,h/2,w,h/2);
 // Boxes are given as azimuth (0..1 across), elevation in degrees above the horizon, and a tone.
 const E=(deg:number)=>h/2-deg/90*h/2;
 const softbox=(u0:number,u1:number,e0:number,e1:number,tone:string)=>{g.fillStyle=tone;for(const shift of [-w,0,w])g.fillRect(u0*w+shift,E(e1),(u1-u0)*w,E(e0)-E(e1))};
 g.filter='blur(7px)';
 softbox(.57,.7,16,58,'#ffffff');softbox(.79,.84,8,66,'#f2f4f6');softbox(.9,1.06,24,44,'#dfe3e8');
 softbox(.12,.4,3,24,'#d5d9de');softbox(.44,.5,10,50,'#aeb4bb');softbox(0,1,74,90,'#eef0f2');
 softbox(0,1,-.6,1.6,'#e8eaec');
 // Behind the front camera: a grey floor and one defined fill just above the horizon, so flat chrome reads mid-grey
 // and flat brass still has something pale to mirror.
 softbox(.69,.81,10,32,'#f4f6f8');
 g.filter='blur(3px)';
 softbox(.6,.9,-30,5,'#7d8288');
 // Black flags either side of that fill and one above it: the dark bands in the chrome seen from the front.
 softbox(.63,.675,-10,62,'#040506');softbox(.825,.87,-10,62,'#040506');softbox(.68,.82,34,48,'#040506');
 g.filter='none';
 const t=finish(c);t.mapping=THREE.EquirectangularReflectionMapping;return t;
}
