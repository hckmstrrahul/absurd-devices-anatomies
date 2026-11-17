import * as THREE from 'three';
import {rng} from '../kit/util';
import {footprints,PCB,PLATTER,COIL,ROTOR} from './layout';

// Orange record label: the reference fades from deep orange at the top to amber at the bottom.
export function labelTexture(){
 const size=1024,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')!;
 const fade=g.createLinearGradient(0,0,size*.25,size);fade.addColorStop(0,'#e2560f');fade.addColorStop(.55,'#f07c17');fade.addColorStop(1,'#f8ae22');
 g.fillStyle=fade;g.fillRect(0,0,size,size);
 g.translate(size/2,size/2);
 for(let r=70;r<size/2;r+=5){g.strokeStyle=`rgba(${r%15?120:255},${r%15?40:220},0,${r%15?.1:.16})`;g.lineWidth=1.4;g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke()}
 // One pale sweep and a lettered arc, so the spin is visible.
 const sheen=g.createConicGradient(-.6,0,0);sheen.addColorStop(0,'rgba(255,255,255,0)');sheen.addColorStop(.04,'rgba(255,244,214,.5)');sheen.addColorStop(.09,'rgba(255,255,255,0)');sheen.addColorStop(.5,'rgba(255,255,255,0)');sheen.addColorStop(.54,'rgba(255,236,190,.28)');sheen.addColorStop(.59,'rgba(255,255,255,0)');sheen.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=sheen;g.beginPath();g.arc(0,0,size/2,0,Math.PI*2);g.fill();
 g.fillStyle='rgba(70,24,0,.72)';g.font='600 30px ui-monospace,Menlo,monospace';g.textAlign='center';
 const text='ORBIT DECK  ·  SIDE A  ·  33⅓  ·  LOOP 04';const radius=size/2-74;const step=.062;
 [...text].forEach((ch,i)=>{g.save();g.rotate((i-text.length/2)*step);g.fillText(ch,0,-radius);g.restore()});
 g.fillRect(-2,radius-58,4,46);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}

// Silk-screen and copper for the white board. Outlines come from the same footprints as the parts.
export function boardTexture(){
 const scale=9,w=PCB.x1-PCB.x0,d=PCB.z1-PCB.z0;
 const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(d*scale);const g=c.getContext('2d')!;
 const X=(x:number)=>(x-PCB.x0)*scale,Z=(z:number)=>(z-PCB.z0)*scale;
 g.fillStyle='#eff1f3';g.fillRect(0,0,c.width,c.height);
 const random=rng(42);
 // Cool tint toward the lower edge, as in the reference.
 const tint=g.createLinearGradient(0,c.height*.55,0,c.height);tint.addColorStop(0,'rgba(190,206,220,0)');tint.addColorStop(1,'rgba(176,196,214,.42)');g.fillStyle=tint;g.fillRect(0,0,c.width,c.height);
 // Traces: runs with 45° jogs between pads.
 g.lineCap='round';g.lineJoin='round';
 for(let i=0;i<230;i++){
  let x=PCB.x0+6+random()*(w-12),z=PCB.z0+6+random()*(d-12);
  g.strokeStyle=`rgba(${150+random()*40|0},${160+random()*36|0},${172+random()*30|0},${.5+random()*.35})`;g.lineWidth=random()<.2?3.2:1.8;
  g.beginPath();g.moveTo(X(x),Z(z));
  for(let k=0;k<2+random()*3;k++){
   const run=4+random()*22,dir=random()<.5?1:-1;
   if(random()<.5)x+=run*dir;else z+=run*dir;g.lineTo(X(x),Z(z));
   const jog=1.5+random()*4,sx=random()<.5?1:-1,sz=random()<.5?1:-1;x+=jog*sx;z+=jog*sz;g.lineTo(X(x),Z(z));
  }
  g.stroke();
  g.fillStyle='rgba(120,130,142,.8)';g.beginPath();g.arc(X(x),Z(z),4.2,0,Math.PI*2);g.fill();g.fillStyle='#eff1f3';g.beginPath();g.arc(X(x),Z(z),1.7,0,Math.PI*2);g.fill();
 }
 // Courtyards around placed parts.
 g.strokeStyle='rgba(96,106,118,.75)';g.lineWidth=1.6;
 for(const f of footprints){
  if(f.asm==='case'||f.asm==='platter'||f.asm==='coil'||f.asm==='rotor')continue;
  if(f.r!==undefined){g.beginPath();g.arc(X(f.x),Z(f.z),(f.r+1.4)*scale,0,Math.PI*2);g.stroke()}
  else g.strokeRect(X(f.x-f.w!/2-1.2),Z(f.z-f.d!/2-1.2),(f.w!+2.4)*scale,(f.d!+2.4)*scale);
 }
 // Wells for the three round assemblies.
 for(const [cx,cz,r] of [[PLATTER.x,PLATTER.z,PLATTER.bezel+2.5],[COIL.x,COIL.z,COIL.bracket+2],[ROTOR.x,ROTOR.z,ROTOR.mount+2.5]]){
  g.fillStyle='rgba(226,230,234,.9)';g.beginPath();g.arc(X(cx),Z(cz),r*scale,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(120,130,142,.7)';g.lineWidth=2;g.stroke();
 }
 // Control strip panels and legends.
 g.strokeStyle='rgba(70,78,88,.8)';g.lineWidth=1.8;
 g.strokeRect(X(62),Z(-76),19*scale,31*scale);g.strokeRect(X(62),Z(-31),19*scale,28*scale);
 g.beginPath();g.moveTo(X(58),Z(-72));g.lineTo(X(58),Z(-8));g.moveTo(X(60),Z(20));g.lineTo(X(60),Z(52));g.stroke();
 g.fillStyle='rgba(60,68,78,.78)';
 for(let i=0;i<70;i++){const x=PCB.x0+8+random()*(w-30),z=PCB.z0+8+random()*(d-16);g.fillRect(X(x),Z(z),(3+random()*9)*scale*.55,2.6)}
 g.font='600 13px ui-monospace,Menlo,monospace';
 [['ORBIT DECK',-104,100],['REV C',-104,103.5],['BELT 6:1',-104,36],['PICKUP',-70,-4],['SEQ 16',-56,58],['TONE',63,-78.5],['PITCH',63,-33.5],['MEM',-56,100]].forEach(([s,x,z])=>g.fillText(s as string,X(x as number),Z(z as number)));
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
}
