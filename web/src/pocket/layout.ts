import {rng} from '../kit/util';
import type {AssemblyId} from './model';

// Positions traced from assets/pocket-reference.png (1514 × 2000 px). The shell spans image
// x 300–1190 and y 297–1767, so 1 px = 0.1 mm with the origin at pixel (745, 1032).
// X right, Z toward the image bottom, Y up from the table.
export const px=(x:number,y:number):[number,number]=>[Math.round(x-745)/10,Math.round(y-1032)/10];

export type P2=[number,number];   // plan point (x, z)

export const SHELL={w:89,h:147,rTop:7,rBot:13,wall:2,floor:1.6,split:12.5,plate:22.5,top:24,notch:{x:-.5,half:17.5,depth:7.5}};
export const PCB={x0:-38.5,x1:38.5,z0:-55,z1:63,y0:10.8,y1:12,r:2};
export const SCREEN={x:.15,z:-31.2,w:72.7,d:51,r:3.5,y0:14,y1:21,
 bezel:{x:-.05,z:-33.35,w:57.7,d:37.3},window:{w:53.6,d:33.1},lcd:{x:-.05,z:-33.05,w:51.2,d:30.72}};
export const DPAD={x:-25.5,z:8.8,r:12.8,arm:6,span:17,pivot:20.6,top:25.6};
export const BTN={a:{x:26,z:5.3,r:5.4},b:{x:35,z:5.8,r:5.2},start:{x:24.5,z:21.1,r:3.5,ring:5.6},select:{x:34.5,z:20.8,r:4.3},y0:14.7,y1:25.2,gap:.15};
export const MENU={x:-23.8,z:64.6,w:8,d:3};
export const BAY={x:1,z:-64.1,w:78,d:14.2,r:4,wall:1.2,y0:4,y1:21,axis:{y:12.5,z:-62.5}};
export const POSTS=[-35.2,34.3];
export const BATTERY={x:0,z:10,w:36,d:52,y0:2.6,y1:8.2};
export const SCREWS:P2[]=[[-40.4,-4.7],[40.4,-4.7],[-36.7,55.6],[33.8,59]];
export const LEDS:P2[]=[[-36,26.1],[34,52.3]];
export const TEXT={x:6.5,z:22.9,w:12,d:2.8};

// ── Shell outline ─────────────────────────────────────────────────────────
// Clockwise in the image, as (x, z) points, inset by `inset` mm. The bottom edge has a
// cut-out between the two grips: steep shoulders, then a shallow arch.
const arch=(u:number)=>(1-u**6)*(.6+.4*(1-u*u));
export function outline(inset=0,steps=12):P2[]{
 const hw=SHELL.w/2-inset,zt=-SHELL.h/2+inset,zb=SHELL.h/2-inset,rt=Math.max(.5,SHELL.rTop-inset),rb=Math.max(.5,SHELL.rBot-inset);
 const pts:P2[]=[],corner=(cx:number,cz:number,r:number,from:number)=>{for(let i=0;i<=steps;i++){const a=(from+i/steps*90)*Math.PI/180;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}};
 corner(hw-rt,zt+rt,rt,-90);corner(hw-rb,zb-rb,rb,0);
 const n=SHELL.notch,half=n.half+inset,rise=n.depth;
 for(let i=0;i<=steps*4;i++){const u=1-i/(steps*2);pts.push([n.x+half*u,zb-rise*arch(u)])}
 corner(-hw+rb,zb-rb,rb,90);corner(-hw+rt,zt+rt,rt,180);
 return pts;
}
export function inside(x:number,z:number,poly:P2[]){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)hit=!hit}
 return hit;
}

// ── Placed parts ──────────────────────────────────────────────────────────
// `pins` is the lead count per side: on four sides for 'qfp', on the two Z sides for 'soic'.
export type Kind='cpu'|'shield'|'window'|'qfp'|'soic'|'plain'|'osc'|'header'|'choke'|'conn'|'jack'|'xtal'|'trim'|'well'|'membrane'|'led'|'rail'|'frame'|'cell'|'tube'|'key';
export type Footprint={id:string;asm:AssemblyId;kind:Kind;x:number;z:number;r?:number;w?:number;d?:number;y0:number;y1:number;pins?:number};
const B=PCB.y1;
const box=(id:string,asm:AssemblyId,kind:Kind,x:number,z:number,w:number,d:number,y0:number,y1:number,pins?:number):Footprint=>({id,asm,kind,x,z,w,d,y0,y1,pins});
const disc=(id:string,asm:AssemblyId,kind:Kind,x:number,z:number,r:number,y0:number,y1:number):Footprint=>({id,asm,kind,x,z,r,y0,y1});

export const footprints:Footprint[]=[
 // Logic board, lower half: everything here is visible in the reference.
 box('cpu','board','cpu',-20,44.6,16,14.5,B,14,28),
 box('shield','board','shield',17.6,48.8,19.8,17,B,15.4),
 box('window','board','window',7,9.8,14,10,B,14.2),
 box('twin-0','board','soic',2.5,30.5,5.5,5.5,B,13.8,6),
 box('twin-1','board','soic',9.8,30.5,5.5,5.5,B,13.8,6),
 box('qfp-0','board','qfp',-10.3,21.5,5.5,5.5,B,13.5,8),
 box('qfp-1','board','qfp',-30.5,30.3,5,5,B,13.5,7),
 box('qfp-2','board','qfp',-18.3,28.3,4.5,4.5,B,13.5,6),
 box('qfp-3','board','qfp',-11.7,30.3,5,5,B,13.5,7),
 box('qfp-4','board','qfp',-34.9,37.8,4.5,4.5,B,13.5,6),
 box('qfp-5','board','qfp',25.3,33.8,4.5,4.5,B,13.5,6),
 box('osc','board','osc',-15.2,21.8,2.5,2.5,B,13.2),
 box('top-0','board','plain',-7.3,-3.5,4.5,3.4,B,13.6),
 box('top-1','board','plain',16.3,-3.7,4.5,3.4,B,13.6),
 box('diode','board','plain',-13,-3.3,2.2,2.2,B,13.4),
 box('header','board','header',6,-2.7,7,3.6,B,13.8,6),
 box('choke','board','choke',35,31.8,6,9,B,16),
 box('jst','board','conn',34,44.8,6,2.5,B,14),
 box('reg','board','plain',-17,59.8,4,3,B,13.4),
 box('amp','board','qfp',-10.7,57.2,3.5,3.5,B,13.4,5),
 box('so8','board','soic',-5.3,59,4,4.2,B,13.5,4),
 box('gyro','board','qfp',3,59.3,3.5,3.5,B,13.4,5),
 disc('xtal','board','xtal',-10,61.1,1.4,B,13.6),
 box('trim','board','trim',-5.7,49.3,3,3,B,13.6),
 disc('jack-0','board','jack',9.7,60.8,1.9,B,14.2),
 disc('jack-1','board','jack',21.5,60.8,1.9,B,14.2),
 // Under the screen module: invented, and kept below its 14 mm underside.
 box('lcd-conn','board','conn',0,-11,16,2.6,B,13.6),
 box('vram','board','qfp',-16,-36,9,9,B,13.6,12),
 box('pmic','board','qfp',14,-40,7,7,B,13.6,9),
 box('flash','board','soic',16,-24,6,7,B,13.6,7),
 box('batt-conn','board','conn',34,-29,5,4,B,13.8),

 // Controls: wells and caps above the board, membranes on it.
 disc('dpad','controls','well',DPAD.x,DPAD.z,DPAD.r,14,DPAD.top),
 disc('a','controls','well',BTN.a.x,BTN.a.z,BTN.a.r,BTN.y0,BTN.y1),
 disc('start','controls','well',BTN.start.x,BTN.start.z,BTN.start.ring,BTN.y0,BTN.y1),
 disc('select','controls','well',BTN.select.x,BTN.select.z,BTN.select.r,BTN.y0,BTN.y1),
 disc('mem-dpad','controls','membrane',DPAD.x,DPAD.z,11.5,B+.05,13.6),
 box('mem-ab','controls','membrane',30.5,5.55,20.4,11.4,B+.05,13.6),
 box('mem-ss','controls','membrane',29.5,21,20.5,11,B+.05,13.6),
 box('menu','controls','key',MENU.x,MENU.z,MENU.w,MENU.d,14.7,25),

 box('frame','screen','frame',SCREEN.x,SCREEN.z,SCREEN.w,SCREEN.d,SCREEN.y0,SCREEN.y1),
 box('tube','bay','tube',BAY.x,BAY.z,BAY.w,BAY.d,BAY.y0,BAY.y1),

 box('cell','power','cell',BATTERY.x,BATTERY.z,BATTERY.w,BATTERY.d,BATTERY.y0,BATTERY.y1),
 box('rail','power','rail',-37.6,-31,.8,48,B,13),
 ...LEDS.map(([x,z],i)=>disc(`led-${i}`,'power','led',x,z,1.6,B,13.6)),
];
// The B button is a crescent that hugs A, so it is checked on its own in the tests rather than as a disc.
export const at=(id:string)=>{const f=footprints.find(f=>f.id===id);if(!f)throw new Error(`Unknown part ${id}`);return f};
export const half=(f:Footprint):P2=>f.r!==undefined?[f.r,f.r]:[f.w!/2,f.d!/2];

// ── Small surface-mount parts ─────────────────────────────────────────────
// Scattered by a fixed seed and kept off every placed footprint, well, screw boss and the silk-screen title.
export const SMD=[
 {name:'chip',w:1.7,d:1,h:.6,count:80},
 {name:'tan',w:1.1,d:.6,h:.55,count:95},
 {name:'orange',w:1.3,d:.7,h:.6,count:60},
 {name:'grey',w:.9,d:.5,h:.35,count:70},
 {name:'pad',w:.9,d:.9,h:.06,count:55},
] as const;
export type Spot={x:number;z:number;type:number;turn:boolean};
function blocked(x:number,z:number,m:number){
 if(x<PCB.x0+1.2||x>PCB.x1-1.2||z<PCB.z0+1.2||z>PCB.z1-1.2)return true;
 if(Math.abs(x-TEXT.x)<TEXT.w/2+m&&Math.abs(z-TEXT.z)<TEXT.d/2+m)return true;
 if(Math.hypot(x-BTN.b.x,z-BTN.b.z)<BTN.b.r+1.3+m)return true;
 if(SCREWS.some(([sx,sz])=>Math.hypot(x-sx,z-sz)<2.4+m))return true;
 return footprints.some(f=>{
  if(f.y0>=14&&f.kind!=='well')return false;
  const pad=m+(f.pins?1:0)+(f.kind==='well'?1.3:0)+(f.kind==='cpu'?2:0);
  return f.r!==undefined?Math.hypot(x-f.x,z-f.z)<f.r+pad:Math.abs(x-f.x)<f.w!/2+pad&&Math.abs(z-f.z)<f.d!/2+pad;
 });
}
export const spots:Spot[]=(()=>{
 const random=rng(11),out:Spot[]=[],total=SMD.reduce((n,s)=>n+s.count,0);
 for(let tries=0;out.length<total&&tries<40000;tries++){
  const x=PCB.x0+random()*(PCB.x1-PCB.x0),z=PCB.z0+random()*(PCB.z1-PCB.z0);
  // Under the screen the board is sparse; the visible lower half is dense, as in the reference.
  if(z<-6&&random()<.7)continue;
  if(blocked(x,z,1.1)||out.some(s=>Math.abs(s.x-x)<2&&Math.abs(s.z-z)<1.6))continue;
  let type=0,n=out.length;while(n>=SMD[type].count){n-=SMD[type].count;type++}
  out.push({x:Math.round(x*4)/4,z:Math.round(z*4)/4,type,turn:random()<.5});
 }
 return out;
})();
