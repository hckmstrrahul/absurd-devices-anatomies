import * as THREE from 'three';
import {rng} from '../kit/util';
import {footprints,spots,PCB,DPAD,BTN,TEXT,SHELL,SMD,type Footprint} from './layout';
import {GRID,type Pose} from './model';

const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return [c,c.getContext('2d')!] as const};
const finish=(c:HTMLCanvasElement)=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};

// Blue logic board: copper pours, bussed traces, vias, pads and white silk-screen. Outlines and
// pads come from the same footprints as the parts, so the two always line up.
export function boardTexture(){
 const scale=16,w=PCB.x1-PCB.x0,d=PCB.z1-PCB.z0,[c,g]=canvas(w*scale,d*scale);
 const X=(x:number)=>(x-PCB.x0)*scale,Z=(z:number)=>(z-PCB.z0)*scale,random=rng(5);
 const base=g.createLinearGradient(0,0,c.width,c.height);base.addColorStop(0,'#11559c');base.addColorStop(.55,'#0e478c');base.addColorStop(1,'#0f4186');
 g.fillStyle=base;g.fillRect(0,0,c.width,c.height);
 // Darker pours, including the quiet field the title sits on.
 g.fillStyle='rgba(6,28,76,.55)';
 const pour=(x:number,z:number,pw:number,pd:number)=>{g.beginPath();g.roundRect(X(x-pw/2),Z(z-pd/2),pw*scale,pd*scale,scale*1.2);g.fill()};
 pour(6,22,22,9);pour(4,36,24,9);pour(18,48.8,24,21);pour(-20,44.6,23,21);pour(7,9.8,18,14);
 for(let i=0;i<26;i++)pour(PCB.x0+random()*w,PCB.z0+random()*d,4+random()*14,3+random()*9);
 // Bussed traces: parallel runs that turn through 45° jogs.
 g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<70;i++){
  const lines=2+Math.floor(random()*6),pitch=.5,horizontal=random()<.5;
  let x=PCB.x0+3+random()*(w-6),z=PCB.z0+3+random()*(d-6);
  const path:[number,number][]=[[x,z]];
  for(let k=0;k<2+random()*3;k++){
   const run=(5+random()*20)*(random()<.5?1:-1);
   if((k%2===0)===horizontal)x+=run;else z+=run;path.push([x,z]);
   const jog=(1.5+random()*3.5),sx=random()<.5?1:-1,sz=random()<.5?1:-1;x+=jog*sx;z+=jog*sz;path.push([x,z]);
  }
  g.strokeStyle=`rgba(${50+random()*40|0},${150+random()*50|0},${225+random()*30|0},${.42+random()*.3})`;g.lineWidth=.2*scale;
  for(let n=0;n<lines;n++){const o=(n-(lines-1)/2)*pitch;g.beginPath();path.forEach(([px,pz],k)=>k?g.lineTo(X(px+o),Z(pz+o)):g.moveTo(X(px+o),Z(pz+o)));g.stroke()}
 }
 // Vias.
 for(let i=0;i<420;i++){
  const x=X(PCB.x0+1.5+random()*(w-3)),z=Z(PCB.z0+1.5+random()*(d-3)),gold=random()<.3;
  g.fillStyle=gold?'rgba(226,186,104,.9)':'rgba(120,196,244,.75)';g.beginPath();g.arc(x,z,.3*scale,0,Math.PI*2);g.fill();
  g.fillStyle='#0f3f7c';g.beginPath();g.arc(x,z,.12*scale,0,Math.PI*2);g.fill();
 }
 // Solder pads under every scattered part.
 g.fillStyle='rgba(214,190,140,.85)';
 for(const s of spots){const t=SMD[s.type],pw=(s.turn?t.d:t.w)+.5,pd=(s.turn?t.w:t.d)+.5;g.fillRect(X(s.x-pw/2),Z(s.z-pd/2),pw*scale,pd*scale)}
 // Key contacts: gold fingers the membranes bridge.
 const contact=(x:number,z:number,r:number)=>{
  g.fillStyle='#0f3f7c';g.beginPath();g.arc(X(x),Z(z),(r+.5)*scale,0,Math.PI*2);g.fill();
  g.save();g.beginPath();g.arc(X(x),Z(z),r*scale,0,Math.PI*2);g.clip();g.fillStyle='#d9b45e';
  for(let k=-6;k<=6;k++)g.fillRect(X(x-r),Z(z)+k*.62*scale-.17*scale,r*2*scale,.34*scale);
  g.restore();
 };
 for(const [dx,dz] of [[0,-6],[6,0],[0,6],[-6,0]])contact(DPAD.x+dx,DPAD.z+dz,2.3);
 contact(BTN.a.x,BTN.a.z,2.6);contact(BTN.b.x+1,BTN.b.z,2.4);contact(BTN.start.x,BTN.start.z,2.2);contact(BTN.select.x,BTN.select.z,2.4);
 g.strokeStyle='rgba(235,244,255,.7)';g.lineWidth=.16*scale;g.beginPath();g.arc(X(DPAD.x),Z(DPAD.z),11.8*scale,0,Math.PI*2);g.stroke();
 // Pads and courtyards for placed parts.
 const boardParts=footprints.filter(f=>f.asm==='board');
 for(const f of boardParts){
  if(f.r!==undefined){g.fillStyle='#d9b45e';g.beginPath();g.arc(X(f.x),Z(f.z),(f.r+.5)*scale,0,Math.PI*2);g.fill();continue}
  const fw=f.w!,fd=f.d!;
  if(f.pins){
   g.fillStyle='rgba(222,192,120,.95)';const sides=f.kind==='qfp'||f.kind==='cpu'?4:2;
   for(let side=0;side<sides;side++){
    const along=side<2?fw:fd,pitch=along/(f.pins+1);
    for(let i=1;i<=f.pins;i++){
     const o=-along/2+i*pitch,q=(side%2?1:-1)*((side<2?fd:fw)/2+.75);
     if(side<2)g.fillRect(X(f.x+o-pitch*.3),Z(f.z+q-.6),pitch*.6*scale,1.2*scale);else g.fillRect(X(f.x+q-.6),Z(f.z+o-pitch*.3),1.2*scale,pitch*.6*scale);
    }
   }
  }
  g.strokeStyle='rgba(238,246,255,.78)';g.lineWidth=.15*scale;const m=f.pins?1.7:.7;
  g.strokeRect(X(f.x-fw/2-m),Z(f.z-fd/2-m),(fw+m*2)*scale,(fd+m*2)*scale);
 }
 // Silk-screen legends. The title and the number block under the window chip are in the reference.
 const text=(s:string,x:number,z:number,size:number,align:CanvasTextAlign='left',alpha=.9)=>{g.font=`600 ${size*scale}px ui-monospace,Menlo,Consolas,monospace`;g.textAlign=align;g.textBaseline='middle';g.fillStyle=`rgba(240,247,255,${alpha})`;g.fillText(s,X(x),Z(z))};
 g.fillStyle='#103f80';g.fillRect(X(TEXT.x-TEXT.w/2),Z(TEXT.z-TEXT.d/2),TEXT.w*scale,TEXT.d*scale);
 g.font=`700 ${1.25*scale}px Inter,Helvetica,Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f4f9ff';g.fillText('DEVICE.GALLERY',X(TEXT.x),Z(TEXT.z));
 text('3·503937',7,16.6,1.5,'center');text('QBA1  MSTR  3R',7,18.3,.8,'center',.8);text('3123',12,19.6,.9,'center',.8);
 g.fillStyle='#e2b85e';for(const x of [8.6,9.9,11.2]){g.beginPath();g.arc(X(x),Z(20.9),.4*scale,0,Math.PI*2);g.fill()}
 text('POCKET  REV C',-37,61.4,.9);text('CPU',-29.6,34.5,.9);text('RF',9,39.2,.9);text('CART',-36,-53.5,.9);text('LCD',9.5,-11,.9);text('BT+',27.5,-27,.9);text('809',17,62.2,.9,'center');
 const refs=['R','C','U','L','D','Q','TP'];
 for(const [i,f] of boardParts.entries()){if(f.r===undefined&&f.w!>3.2)text(`${f.pins?'U':'J'}${i+1}`,f.x-f.w!/2-(f.pins?1.7:.7),f.z-f.d!/2-(f.pins?2.4:1.4),.75,'left',.75)}
 for(let i=0;i<spots.length;i+=3){const s=spots[i];text(`${refs[i%refs.length]}${i%97+1}`,s.x+1.2,s.z-.9,.6,'left',.6)}
 // Board edge and mounting holes.
 g.strokeStyle='rgba(226,186,104,.55)';g.lineWidth=.3*scale;g.strokeRect(.5*scale,.5*scale,c.width-scale,c.height-scale);
 return finish(c);
}

// The LCD: 20 × 12 cells of dark liquid crystal over a lit panel. Redrawn only when the picture changes.
export const PALETTES:Record<string,{lit:[string,string];ink:string;ghost:string}>={
 cyan:{lit:['#10c0c0','#00cdee'],ink:'#073a47',ghost:'rgba(7,58,71,.07)'},
 lime:{lit:['#a9cf3c','#c3e04e'],ink:'#22390f',ghost:'rgba(34,57,15,.08)'},
 amber:{lit:['#f6a21c','#ffbd3a'],ink:'#4a2203',ghost:'rgba(74,34,3,.08)'},
};
export function makeLcd(){
 const cell=32,[c,g]=canvas(GRID.w*cell,GRID.h*cell),texture=finish(c);texture.anisotropy=4;
 let last='';
 function draw(p:Pose){
  const key=[p.on,p.ticks,p.games,p.dead,p.grid,p.palette,p.foodOn,p.score].join('|');if(key===last)return;last=key;
  const tone=PALETTES[p.palette]??PALETTES.cyan,flash=p.dead>0&&p.dead%2===0;
  const lit=g.createLinearGradient(0,0,c.width,0);lit.addColorStop(0,tone.lit[0]);lit.addColorStop(.35,tone.lit[1]);lit.addColorStop(1,tone.lit[1]);
  g.fillStyle=flash?tone.ink:lit;g.fillRect(0,0,c.width,c.height);
  if(p.on||p.ticks>0){
   const ink=flash?tone.lit[1]:tone.ink;
   // Unlit cells show faintly, as on a real passive LCD.
   g.fillStyle=tone.ghost;
   if(p.grid&&!flash)for(let y=0;y<GRID.h;y++)for(let x=0;x<GRID.w;x++)g.fillRect(x*cell+3,y*cell+3,cell-6,cell-6);
   g.fillStyle=ink;
   p.snake.forEach((k,i)=>{const x=k%GRID.w,y=Math.floor(k/GRID.w),inset=i?3:1;g.fillRect(x*cell+inset,y*cell+inset,cell-inset*2,cell-inset*2)});
   if(p.food>=0&&(p.foodOn||p.dead>0)){const x=p.food%GRID.w,y=Math.floor(p.food/GRID.w);g.fillRect(x*cell+7,y*cell+7,cell-14,cell-14);g.clearRect(x*cell+13,y*cell+13,cell-26,cell-26);g.fillStyle=flash?tone.ink:tone.lit[1];g.fillRect(x*cell+13,y*cell+13,cell-26,cell-26)}
   g.fillStyle=ink;g.globalAlpha=.8;g.font='700 22px ui-monospace,Menlo,Consolas,monospace';g.textBaseline='top';g.textAlign='left';
   g.fillText(String(p.score).padStart(3,'0'),8,6);
   if(p.dead>0){g.textAlign='center';g.font='700 40px ui-monospace,Menlo,Consolas,monospace';g.fillText('GAME OVER',c.width/2,c.height/2-22)}
   g.globalAlpha=1;
  }
  texture.needsUpdate=true;
 }
 return {texture,draw};
}

// Violet that deepens toward the grips, with a warm patch where the lower-left light sits.
export function tintTexture(strength=1){
 const [c,g]=canvas(256,512),Zv=(z:number)=>(z+SHELL.h/2)/SHELL.h*c.height,Xu=(x:number)=>(x+SHELL.w/2)/SHELL.w*c.width;
 const fade=g.createLinearGradient(0,Zv(8),0,c.height);
 fade.addColorStop(0,'rgba(120,110,255,0)');fade.addColorStop(.4,`rgba(124,104,250,${.07*strength})`);fade.addColorStop(.78,`rgba(140,100,246,${.16*strength})`);fade.addColorStop(.9,`rgba(160,108,248,${.36*strength})`);fade.addColorStop(1,`rgba(184,124,252,${.55*strength})`);
 g.fillStyle=fade;g.fillRect(0,0,c.width,c.height);
 const warm=g.createRadialGradient(Xu(-29),Zv(64),2,Xu(-29),Zv(64),52);warm.addColorStop(0,`rgba(255,84,56,${.36*strength})`);warm.addColorStop(1,'rgba(255,84,56,0)');
 g.fillStyle=warm;g.fillRect(0,0,c.width,c.height);
 return finish(c);
}

// Soft halo for an LED, drawn additively over the board.
export function haloTexture(){
 const [c,g]=canvas(128,128),fade=g.createRadialGradient(64,64,2,64,64,64);
 fade.addColorStop(0,'rgba(255,170,120,1)');fade.addColorStop(.18,'rgba(255,84,40,.7)');fade.addColorStop(.5,'rgba(255,50,24,.22)');fade.addColorStop(1,'rgba(255,40,20,0)');
 g.fillStyle=fade;g.fillRect(0,0,128,128);return finish(c);
}

export function cellLabel(f:Footprint){
 const scale=14,[c,g]=canvas(f.w!*scale,f.d!*scale);
 g.fillStyle='#c9ced4';g.fillRect(0,0,c.width,c.height);
 g.fillStyle='#16191d';g.fillRect(0,c.height*.3,c.width,c.height*.52);
 g.fillStyle='#f08a1c';g.fillRect(0,c.height*.3,c.width,scale*1.2);
 g.fillStyle='#eef2f5';g.textAlign='center';g.font=`700 ${scale*3.2}px Inter,Helvetica,Arial,sans-serif`;g.fillText('POCKET CELL',c.width/2,c.height*.5);
 g.font=`600 ${scale*1.9}px ui-monospace,Menlo,monospace`;g.fillText('Li-ion  3.7 V  1800 mAh  6.66 Wh',c.width/2,c.height*.6);
 g.fillStyle='#3a4048';g.font=`600 ${scale*1.4}px ui-monospace,Menlo,monospace`;g.fillText('+  T  −',c.width/2,c.height*.12);
 return finish(c);
}
