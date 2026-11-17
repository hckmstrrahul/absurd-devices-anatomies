import * as THREE from 'three';
import {MASTER,DIALS,type Orb} from './layout';

// Master numerals are raised gold solids built in parts.ts; only the track and sub-dial are printed.
const DECO='"Bodoni 72","Didot","Playfair Display",Georgia,"Times New Roman",serif';
const MONO='ui-monospace,Menlo,monospace';
function sheet(w:number,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return {c,g:c.getContext('2d')!}}
function finish(c:HTMLCanvasElement){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t}

// White master dial: gold Art Deco numerals, thin gold minute track, 24-hour sub-dial.
export function masterDial(){
 const S=2048,R=S/2,{c,g}=sheet(S);g.translate(R,R);
 const face=g.createRadialGradient(-R*.2,-R*.25,R*.1,0,0,R);face.addColorStop(0,'#fdfdfc');face.addColorStop(.7,'#f3f3f1');face.addColorStop(1,'#e2e3e3');
 g.fillStyle=face;g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fill();
 g.strokeStyle='#c8973a';g.lineWidth=7;g.beginPath();g.arc(0,0,R*.93,0,Math.PI*2);g.stroke();
 g.lineWidth=3;g.beginPath();g.arc(0,0,R*.965,0,Math.PI*2);g.stroke();
 for(let i=0;i<60;i++){
  g.save();g.rotate(i*Math.PI/30);g.fillStyle=i%5?'#3a3a3c':'#a8741c';
  if(i%5)g.fillRect(-2.5,-R*.962,5,R*.03);else{g.beginPath();g.arc(0,-R*.947,9,0,Math.PI*2);g.fill()}
  g.restore();
 }
 g.textAlign='center';g.textBaseline='middle';
 // Sub-dial: one turn per day.
 const sy=-MASTER.sub.y/MASTER.dial*R,sr=MASTER.sub.r/MASTER.dial*R;
 g.save();g.translate(0,sy);
 const well=g.createRadialGradient(0,0,sr*.2,0,0,sr);well.addColorStop(0,'#eeeeec');well.addColorStop(1,'#d5d6d7');g.fillStyle=well;g.beginPath();g.arc(0,0,sr,0,Math.PI*2);g.fill();
 g.strokeStyle='#8d9094';g.lineWidth=4;g.stroke();
 for(let i=0;i<24;i++){g.save();g.rotate(i*Math.PI/12);g.fillStyle='#55585c';g.fillRect(-1.5,-sr*.94,3,sr*(i%6?.12:.24));g.restore()}
 g.fillStyle='#55585c';g.font=`600 ${Math.round(sr*.3)}px ${MONO}`;g.fillText('24',0,-sr*.5);g.fillText('12',0,sr*.52);
 g.restore();
 g.fillStyle='#8a8c90';g.font=`600 ${Math.round(R*.042)}px ${MONO}`;
 [...'CHORUS'].forEach((ch,i)=>g.fillText(ch,(i-2.5)*R*.05,-R*.34));
 return finish(c);
}

// Satellite dial, tinted to its orb.
export function orbDial(o:Orb){
 const S=512,R=S/2,{c,g}=sheet(S);g.translate(R,R);
 const face=g.createRadialGradient(-R*.25,-R*.3,R*.05,0,0,R);face.addColorStop(0,'#ffffff');face.addColorStop(.25,o.bg);face.addColorStop(1,o.bg);
 g.fillStyle=o.bg;g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fill();g.globalAlpha=.55;g.fillStyle=face;g.fill();g.globalAlpha=1;
 g.strokeStyle=o.ink;g.lineWidth=5;g.beginPath();g.arc(0,0,R*.95,0,Math.PI*2);g.stroke();
 g.lineWidth=2;g.beginPath();g.arc(0,0,R*.6,0,Math.PI*2);g.globalAlpha=.35;g.stroke();g.globalAlpha=1;
 g.fillStyle=o.ink;
 for(let i=0;i<60;i++){g.save();g.rotate(i*Math.PI/30);g.fillRect(i%5?-1.5:-4,-R*.94,i%5?3:8,R*(i%5?.06:.12));g.restore()}
 g.textAlign='center';g.textBaseline='middle';
 const roman=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
 for(let n=0;n<12;n++){
  g.save();g.rotate(n*Math.PI/6);
  if(o.style==='frame'||o.style==='scroll'){g.font=`700 ${R*.2}px ${DECO}`;g.fillText(roman[n],0,-R*.68)}
  else if(n%3===0){g.rotate(-n*Math.PI/6);g.font=`700 ${R*.26}px ${DECO}`;g.fillText(String(n||12),Math.sin(n*Math.PI/6)*R*.66,-Math.cos(n*Math.PI/6)*R*.66)}
  g.restore();
 }
 g.font=`700 ${R*.11}px ${MONO}`;g.globalAlpha=.8;g.fillText(o.code,0,R*.34);g.globalAlpha=1;
 return finish(c);
}

// Fine perforated deck for the plinth top.
export function deckTexture(){
 const {c,g}=sheet(1024,512);g.fillStyle='#d9dcdf';g.fillRect(0,0,1024,512);
 g.fillStyle='rgba(40,44,50,.55)';
 for(let y=0;y<64;y++)for(let x=0;x<128;x++){g.beginPath();g.arc(x*8+(y%2?4:0)+2,y*8+4,1.5,0,Math.PI*2);g.fill()}
 const t=finish(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// Seven-segment display. `draw` repaints only when the text or lamps change.
const SEGMENTS:Record<string,string>={'0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg'};
export function lcdScreen(){
 const W=1024,H=168,{c,g}=sheet(W,H);const texture=finish(c);let shown='';
 function digit(x:number,y:number,w:number,h:number,ch:string){
  const t=w*.17,on=SEGMENTS[ch]??'';
  const bars:Record<string,[number,number,number,number]>={a:[x+t,y,w-2*t,t],b:[x+w-t,y+t,t,h/2-t*1.5],c:[x+w-t,y+h/2+t*.5,t,h/2-t*1.5],d:[x+t,y+h-t,w-2*t,t],e:[x,y+h/2+t*.5,t,h/2-t*1.5],f:[x,y+t,t,h/2-t*1.5],g:[x+t,y+h/2-t/2,w-2*t,t]};
  for(const k of 'abcdefg'){g.fillStyle=on.includes(k)?'rgba(34,44,32,.86)':'rgba(40,52,36,.07)';g.beginPath();g.roundRect(...bars[k],t*.3);g.fill()}
 }
 function draw(text:string,lamps:boolean[]){
  const key=text+lamps.map(l=>l?1:0).join('');if(key===shown)return;shown=key;
  const fade=g.createLinearGradient(0,0,0,H);fade.addColorStop(0,'#c9d1b9');fade.addColorStop(1,'#b4bea4');g.fillStyle=fade;g.fillRect(0,0,W,H);
  let x=250;const h=104,w=54,y=(H-h)/2;
  for(const ch of text){
   if(ch===':'){g.fillStyle='rgba(34,44,32,.86)';g.fillRect(x+4,y+h*.28,11,11);g.fillRect(x+4,y+h*.64,11,11);x+=34}
   else{digit(x,y,w,h,ch);x+=w+18}
  }
  // One lamp per satellite dial, lit while it chimes.
  lamps.forEach((lit,i)=>{g.fillStyle=lit?'rgba(34,44,32,.86)':'rgba(40,52,36,.1)';g.beginPath();g.roundRect(800+i*26,y+h-22,17,22,3);g.fill()});
  g.fillStyle='rgba(34,44,32,.6)';g.font=`700 24px ${MONO}`;g.textAlign='left';g.textBaseline='top';g.fillText('MASTER',96,y);g.fillText('CHIME',800,y);
  texture.needsUpdate=true;
 }
 draw('00:00:00',DIALS.map(()=>false));
 return {texture,draw};
}
