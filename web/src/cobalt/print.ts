// Cobalt's silkscreen as vectors: outlines, pin-one marks and lettering, in mm. No three.js, no canvas.
// Lettering is only placed where it is clear of every land, body, mounting ring and other lettering.
import {HOLES,HOLE,layout,onBoard,type Rect} from './layout';

export type Label={t:string;x:number;z:number;h:number;turn:boolean};
export type Silk={lines:{p:number[];w:number}[];dots:[number,number,number][];labels:Label[];missed:string[]};
// Monospace lettering: each character is 0.6 of the cap height wide.
export const textWidth=(t:string,h:number)=>t.length*h*.71;
export const labelBox=(l:Label):Rect=>{const w=textWidth(l.t,l.h)/2,h=l.h/2;return l.turn?[l.x-h,l.z-w,l.x+h,l.z+w]:[l.x-w,l.z-h,l.x+w,l.z+h]};

let cached:Silk|null=null;
export function silk():Silk{
 if(cached)return cached;
 const {parts,pads}=layout(),lines:Silk['lines']=[],dots:Silk['dots']=[],labels:Label[]=[],missed:string[]=[];
 const taken:Rect[]=[];
 for(const p of pads)taken.push([p.x-p.w/2-.12,p.z-p.d/2-.12,p.x+p.w/2+.12,p.z+p.d/2+.12]);
 for(const p of parts)if(p.kind!=='tp')taken.push([p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2]);
 for(const [x,z] of HOLES)taken.push([x-HOLE.ring,z-HOLE.ring,x+HOLE.ring,z+HOLE.ring]);
 const free=(b:Rect)=>onBoard(b[0],b[1],.9)&&onBoard(b[2],b[1],.9)&&onBoard(b[0],b[3],.9)&&onBoard(b[2],b[3],.9)&&!taken.some(t=>b[0]<t[2]&&b[2]>t[0]&&b[1]<t[3]&&b[3]>t[1]);
 const text=(t:string,x:number,z:number,h:number,turn=false)=>{const l={t,x,z,h,turn};labels.push(l);const b=labelBox(l);taken.push([b[0]-.1,b[1]-.1,b[2]+.1,b[3]+.1])};
 // Try a label beside a box: right, left, above, below, then turned.
 const beside=(t:string,b:Rect,h:number,gap=.3)=>{
  const w=textWidth(t,h),mx=(b[0]+b[2])/2,mz=(b[1]+b[3])/2;
  for(const turn of [false,true]){
   const hw=(turn?h:w)/2,hh=(turn?w:h)/2;
   for(const [x,z] of [[b[2]+gap+hw,mz],[b[0]-gap-hw,mz],[mx,b[1]-gap-hh],[mx,b[3]+gap+hh]])if(free([x-hw-.05,z-hh-.05,x+hw+.05,z+hh+.05])){text(t,x,z,h,turn);return true}
  }
  return false;
 };
 const frame=(x0:number,z0:number,x1:number,z1:number,w=.12)=>lines.push({p:[x0,z0,x1,z0,x1,z1,x0,z1,x0,z0],w});
 const marks=(x0:number,z0:number,x1:number,z1:number,arm:number,w=.12)=>{for(const [x,z,sx,sz] of [[x0,z0,1,1],[x1,z0,-1,1],[x1,z1,-1,-1],[x0,z1,1,-1]])lines.push({p:[x+sx*arm,z,x,z,x,z+sz*arm],w})};

 // Authored lettering first, so it gets its place.
 text('COBALT M1',-12.6,17.9,1.1);text('REV C',14.9,18.3,.7);text('PN 46-4007',-21,-6.2,.7,true);
 text('ACT',-20.4,-.1,.5);text('PWR',-20.4,6.6,.5);
 for(const p of parts){
  const b:Rect=[p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2];
  switch(p.kind){
   case 'qfp':marks(b[0]-1.85,b[1]-1.85,b[2]+1.85,b[3]+1.85,1.1,.15);dots.push([b[0]-1.5,b[3]+1.5,.22]);break;
   case 'soic':lines.push({p:[b[0]-.2,b[1],b[0]-.2,b[3]],w:.12},{p:[b[2]+.2,b[1],b[2]+.2,b[3]],w:.12});dots.push([b[0]-.2,b[3]+1.3,.17]);break;
   case 'shield':marks(b[0]-.95,b[1]-.95,b[2]+.95,b[3]+.95,.8);break;
   case 'w2b':frame(b[0]-.25,b[1]-.25,b[2]+.25,b[3]+.25,.14);break;
   case 'fpc':lines.push({p:[b[0]-.2,b[3]+.25,b[0]-.2,b[1]],w:.12},{p:[b[2]+.2,b[3]+.25,b[2]+.2,b[1]],w:.12});break;
   case 'b2b':lines.push({p:[b[0]-.3,b[1]+.3,b[0]-.3,b[3]-.3],w:.12},{p:[b[2]+.3,b[1]+.3,b[2]+.3,b[3]-.3],w:.12});dots.push([b[0]-.5,b[1]-.9,.15]);break;
   case 'ind':case 'xtal':marks(b[0]-.3,b[1]-.3,b[2]+.3,b[3]+.3,.6);break;
   case 'sot5':case 'sot3':lines.push({p:[b[0]-.15,b[1]+.2,b[0]-.15,b[3]-.2],w:.12},{p:[b[2]+.15,b[1]+.2,b[2]+.15,b[3]-.2],w:.12});break;
   case 'tant':lines.push({p:[b[0]-.75,b[1]-.2,b[0]-.75,b[3]+.2],w:.2});break;
   default:
  }
 }
 // Designators: packages first, then the small parts wherever there is room.
 const big=parts.filter(p=>!/^(c0|r0|led|tp)/.test(p.kind)),small=parts.filter(p=>/^(c0|r0|led)/.test(p.kind));
 for(const p of big){
  const m=p.kind==='qfp'?1.95:p.kind==='shield'?1:p.kind==='soic'?1.6:p.kind==='ind'?.5:.4;
  if(!beside(p.ref,[p.x-p.w/2-m,p.z-p.d/2-m,p.x+p.w/2+m,p.z+p.d/2+m],p.kind==='qfp'?.9:.7,.25))missed.push(p.ref);
 }
 for(const p of parts)if(p.kind==='tp')beside(p.ref.replace('TP','T'),[p.x-.6,p.z-.6,p.x+.6,p.z+.6],.45,.15);
 for(const p of small){const a=p.rot?[p.x-p.w/2-.1,p.z-p.d/2-.45,p.x+p.w/2+.1,p.z+p.d/2+.45]:[p.x-p.w/2-.45,p.z-p.d/2-.1,p.x+p.w/2+.45,p.z+p.d/2+.1];beside(p.ref,a as Rect,.45,.15)}

 return cached={lines,dots,labels,missed};
}
