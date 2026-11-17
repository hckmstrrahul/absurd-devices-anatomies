// Routes Cobalt's copper between the lands in layout.ts. No three.js, no canvas. A grid router on the 0.25 mm lattice:
// every trace runs at 0°, 45° or 90°, turns 45° at a time, starts and ends on a land or a via and keeps one clear
// lattice step from every other net. A second pass routes an inner layer from via to via, which shows faintly on the
// underside. Deterministic (fixed seed); the result is cached, so the top print and the underside draw the same copper.
import {BOARD,GRID,HOLES,HOLE,U1,layout,onBoard,type Pad} from './layout';
import {rng} from '../kit/util';

// `cls` groups nets: 0 signal, 1 flex bus, 2 mezzanine bus, 3 power, 4 radio, 5 header.
export type Trace={w:number;cls:number;p:number[]};                       // flat [x, z, x, z, …] in mm
export type Routed={traces:Trace[];inner:Trace[];vias:number[];stitch:number[];stats:Record<string,number>};

const W=Math.round(BOARD.w/GRID)+1,H=Math.round(BOARD.d/GRID)+1,N=W*H;
const X=(i:number)=>i*GRID-BOARD.w/2,Z=(j:number)=>j*GRID-BOARD.d/2;
const I=(x:number)=>Math.round((x+BOARD.w/2)/GRID),J=(z:number)=>Math.round((z+BOARD.d/2)/GRID);
const DX=[1,1,0,-1,-1,-1,0,1],DY=[0,1,1,1,0,-1,-1,-1],TURN=14;

function makeGrid(){
 // 0 free, −1 closed to everyone, k > 0 held by net k.
 const own=new Int32Array(N),wire=new Uint8Array(N);
 const g=new Int32Array(N*8),seen=new Int32Array(N*8),from=new Int32Array(N*8);let epoch=0;
 let hf=new Int32Array(1<<14),hs=new Int32Array(1<<14),hn=0,popF=0;
 const push=(f:number,s:number)=>{
  if(hn===hf.length){const a=new Int32Array(hn*2),b=new Int32Array(hn*2);a.set(hf);b.set(hs);hf=a;hs=b}
  let i=hn++;while(i>0){const p=(i-1)>>1;if(hf[p]<=f)break;hf[i]=hf[p];hs[i]=hs[p];i=p}hf[i]=f;hs[i]=s;
 };
 const pop=()=>{
  const top=hs[0];popF=hf[0];const f=hf[--hn],s=hs[hn];let i=0;
  for(;;){let c=i*2+1;if(c>=hn)break;if(c+1<hn&&hf[c+1]<hf[c])c++;if(hf[c]>=f)break;hf[i]=hf[c];hs[i]=hs[c];i=c}
  hf[i]=f;hs[i]=s;return top;
 };
 const block=(x0:number,z0:number,x1:number,z1:number,id:number,force=true)=>{
  for(let j=Math.max(0,Math.ceil((z0+BOARD.d/2)/GRID-1e-6));j<=Math.min(H-1,Math.floor((z1+BOARD.d/2)/GRID+1e-6));j++)
   for(let i=Math.max(0,Math.ceil((x0+BOARD.w/2)/GRID-1e-6));i<=Math.min(W-1,Math.floor((x1+BOARD.w/2)/GRID+1e-6));i++)if(force||own[j*W+i]===0)own[j*W+i]=id;
 };
 // A* over (node, heading): the path from node `a` to node `b` through cells that are free or belong to either end's net.
 function find(a:number,b:number,na:number,nb:number,limit:number):number[]|null{
  epoch++;hn=0;const bx=b%W,by=(b/W)|0;
  const ok=(m:number)=>{const o=own[m];return o===0||o===na||o===nb};
  const est=(n:number)=>{const dx=Math.abs(n%W-bx),dy=Math.abs(((n/W)|0)-by);return dx>dy?10*dx+4*dy:10*dy+4*dx};
  for(let d=0;d<8;d++){const s=a*8+d;g[s]=0;seen[s]=epoch;from[s]=-1;push(est(a),s)}
  let count=0;
  while(hn){
   const s=pop(),n=s>>>3,d=s&7;if(g[s]+est(n)<popF)continue;
   if(n===b){const path=[n];let q=s;while(from[q]>=0){q=from[q];if(path[path.length-1]!==q>>>3)path.push(q>>>3)}return path.reverse()}
   if(++count>limit)return null;
   const x=n%W,y=(n/W)|0;
   for(let t=-1;t<=1;t++){
    const nd=(d+t)&7,xx=x+DX[nd],yy=y+DY[nd];if(xx<1||yy<1||xx>=W-1||yy>=H-1)continue;
    const m=yy*W+xx;if(!ok(m))continue;
    if(nd&1&&(!ok(y*W+xx)||!ok(yy*W+x)))continue;
    // Running two steps from a trace already laid is a little cheaper, so traces gather into bundles.
    const beside=wire[m+2]|wire[m-2]|wire[Math.min(N-1,m+2*W)]|wire[Math.max(0,m-2*W)];
    const c=g[s]+(nd&1?14:10)+(t?TURN:0)-(beside?2:0),q=m*8+nd;
    if(seen[q]===epoch&&g[q]<=c)continue;seen[q]=epoch;g[q]=c;from[q]=s;push(c+est(m),q);
   }
  }
  return null;
 }
 const claim=(path:number[],net:number)=>{for(const n of path){own[n]=net;wire[n]=1;for(let d=0;d<8;d++){const q=n+DX[d]+DY[d]*W;if(q>=0&&q<N&&own[q]===0)own[q]=net}}};
 return {own,wire,block,find,claim};
}
// Corner points of a node path, in mm.
const corners=(path:number[])=>{const out:number[]=[];path.forEach((n,i)=>{if(i>0&&i<path.length-1&&path[i+1]-n===n-path[i-1])return;out.push(X(n%W),Z((n/W)|0))});return out};

let cached:Routed|null=null;
export function routed():Routed{
 if(cached)return cached;
 const {pads,parts}=layout(),random=rng(4607),top=makeGrid(),{own}=top;
 const traces:Trace[]=[],vias:number[]=[],stitch:number[]=[],stats:Record<string,number>={bus:0,pair:0,stub:0,inner:0,failed:0};
 // Board edge, mounting holes.
 for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(!onBoard(X(i),Z(j),.7))own[j*W+i]=-1;
 for(const [x,z] of HOLES)for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(Math.hypot(X(i)-x,Z(j)-z)<HOLE.ring+.3)own[j*W+i]=-1;
 // Ground stitching along the edge, one via a millimetre, left out where a land or a hole is in the way.
 {
  const inset=1.1,hw=BOARD.w/2-inset,hd=BOARD.d/2-inset,r=BOARD.r-inset,near=(x:number,z:number)=>HOLES.some(h=>Math.hypot(h[0]-x,h[1]-z)<HOLE.ring+.7)||pads.some(p=>Math.abs(p.x-x)<p.w/2+.75&&Math.abs(p.z-z)<p.d/2+.75);
  const add=(x:number,z:number)=>{if(!near(x,z)){stitch.push(x,z);top.block(x-.3,z-.3,x+.3,z+.3,-1)}};
  for(let x=-hw+r;x<=hw-r+1e-6;x+=1){add(x,-hd);add(x,hd)}
  for(let z=-hd+r;z<=hd-r+1e-6;z+=1){add(-hw,z);add(hw,z)}
  for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]])for(const a of [22.5,45,67.5]){const q=a*Math.PI/180;add(sx*(hw-r+Math.cos(q)*r),sz*(hd-r+Math.sin(q)*r))}
 }
 // Lands: each holds itself and a clearance; lands that take no trace are closed.
 const C=.2,nodeOf=(i:number)=>J(pads[i].z)*W+I(pads[i].x);
 pads.forEach((p,i)=>{if(p.route)top.block(p.x-p.w/2-C,p.z-p.d/2-C,p.x+p.w/2+C,p.z+p.d/2+C,i+1,false)});
 pads.forEach(p=>{if(!p.route)top.block(p.x-p.w/2-C,p.z-p.d/2-C,p.x+p.w/2+C,p.z+p.d/2+C,-1)});
 pads.forEach((p,i)=>{if(p.route&&own[nodeOf(i)]>=0)own[nodeOf(i)]=i+1});
 // Nothing routes on this layer under the big packages.
 const shut=(x0:number,z0:number,x1:number,z1:number)=>{for(let j=J(z0);j<=J(z1);j++)for(let i=I(x0);i<=I(x1);i++)if(own[j*W+i]===0)own[j*W+i]=-1};
 shut(U1.x-5.6,U1.z-5.6,U1.x+5.6,U1.z+5.6);
 for(const p of parts){if(p.kind==='shield'||p.kind==='ind'||p.kind==='xtal')shut(p.x-p.w/2+.5,p.z-p.d/2+.5,p.x+p.w/2-.5,p.z+p.d/2-.5);if(p.kind==='b2b')shut(p.x-p.w/2,p.z-.6,p.x+p.w/2,p.z+.6)}
 // Vias stay out from under bodies.
 const noVia=new Uint8Array(N);for(const p of parts)for(let j=Math.max(0,J(p.z-p.d/2-.3));j<=Math.min(H-1,J(p.z+p.d/2+.3));j++)for(let i=Math.max(0,I(p.x-p.w/2-.3));i<=Math.min(W-1,I(p.x+p.w/2+.3));i++)noVia[j*W+i]=1;

 const used=new Uint8Array(pads.length);
 const connect=(i:number,j:number,limit:number,w:number,cls:number)=>{
  const path=top.find(nodeOf(i),nodeOf(j),i+1,j+1,limit);if(!path||path.length<2)return false;
  top.claim(path,i+1);used[i]=used[j]=1;traces.push({w,cls,p:corners(path)});return true;
 };
 // ── 1. Buses: ordered rows joined in order, so a bundle never has to cross itself. ──
 const group=(name:string)=>pads.map((_,i)=>i).filter(i=>pads[i].grp===name).sort((a,b)=>pads[a].k!-pads[b].k!);
 const bus=(A:string,B:string,skip:number,n:number,axis:'x'|'z',cls:number)=>{
  const a=group(A),b=group(B);let last=-1;
  for(let k=0;k<n&&skip+k<a.length;k++){
   const i=a[skip+k],at=pads[i][axis];let best=-1,bd=1e9;
   for(let q=last+1;q<b.length;q++){const d=Math.abs(pads[b[q]][axis]-at);if(d<bd){bd=d;best=q}}
   // Leave enough lands for the pins still to come.
   best=Math.max(last+1,Math.min(best,b.length-(n-k)));if(best<0||best>=b.length)break;
   let made=false;for(let q=best;q<Math.min(b.length,best+4)&&!made;q++)if(!used[b[q]]&&connect(i,b[q],60000,.13,cls)){made=true;last=q}
   if(made){stats.bus++;stats[A]=(stats[A]??0)+1}else stats.failed++;
  }
 };
 bus('u1:b','j2',3,14,'x',1);bus('u1:f','j3:t',6,14,'x',2);bus('u1:l','u3:r',4,5,'z',4);bus('u1:r','j1',5,4,'z',5);

 // ── 2. Everything else: a land joins a near land of another part, or drops to a via on a short stub. ──
 const centre=new Map<string,[number,number]>(parts.map(p=>[p.ref,[p.x,p.z]])),pins=new Map<string,number>();
 pads.forEach(p=>pins.set(p.part,(pins.get(p.part)??0)+1));
 const around=(i:number,reach:number)=>{
  const p=pads[i],out:[number,number][]=[];
  pads.forEach((q,j)=>{if(!q.route||used[j]||q.part===p.part||q.grp?.startsWith('j3:b'))return;const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<=reach&&d>.8)out.push([d,j])});
  return out.sort((a,b)=>a[0]-b[0]);
 };
 const viaFree=(n:number,net:number)=>{if(noVia[n])return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const o=own[n+dx+dy*W];if(o!==0&&o!==net)return false}return true};
 const viaNodes:{n:number;net:number;links:number}[]=[];
 const placeVia=(n:number,net:number)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(own[n+dx+dy*W]===0)own[n+dx+dy*W]=net;own[n]=net;vias.push(X(n%W),Z((n/W)|0));viaNodes.push({n,net,links:0})};
 const stub=(i:number,w:number,cls:number)=>{
  const p=pads[i],c=centre.get(p.part)!,out=Math.round(Math.atan2(p.z-c[1],p.x-c[0])/(Math.PI/4))&7,a=nodeOf(i),net=i+1;
  for(const turn of [0,1,7,2,6])for(const len of [3+Math.floor(random()*5),3,8,5,11,14]){
   const d=(out+turn)&7,path=[a];let n=a,good=true;
   for(let s=0;s<len&&good;s++){
    const m=n+DX[d]+DY[d]*W,x=m%W,y=(m/W)|0,o=own[m];
    if(x<3||y<3||x>W-4||y>H-4||(o!==0&&o!==net))good=false;
    else if(d&1){const o1=own[n+DX[d]],o2=own[n+DY[d]*W];if((o1!==0&&o1!==net)||(o2!==0&&o2!==net))good=false}
    n=m;path.push(m);
   }
   if(!good||!viaFree(n,net))continue;
   top.claim(path,net);placeVia(n,net);used[i]=1;traces.push({w,cls,p:corners(path)});stats.stub++;return true;
  }
  return false;
 };
 const order=pads.map((_,i)=>i).filter(i=>pads[i].route&&!used[i]);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 // Package pins first: they should get the short, direct runs.
 order.sort((a,b)=>Number((pins.get(pads[b].part)??0)>2)-Number((pins.get(pads[a].part)??0)>2));
 for(const i of order){
  if(used[i])continue;
  const p=pads[i],pin=(pins.get(p.part)??0)>2,power=p.w*p.d>.9,w=power?.36:pin?.13:.16,cls=power?3:0;
  if(random()<(pin?.5:.6)){let tries=0;for(const [,j] of around(i,pin?7:4)){if(++tries>3)break;if(connect(i,j,pin?9000:4000,w,cls)){stats.pair++;break}}}
  if(!used[i]&&random()<.92)stub(i,w,cls);
 }
 // ── 3. Ground stitching in the open board, in loose clusters. ──
 {
  const far=(n:number)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(own[n+dx+dy*W]!==0)return false;return !noVia[n]};
  for(let j=5;j<H-5;j+=4)for(let i=5+((j>>2)&1)*2;i<W-5;i+=4){
   const n=j*W+i,patch=Math.sin(i*.11+1.3)*Math.cos(j*.13+.4)+Math.sin((i+j)*.05);
   if(patch>-.15&&far(n)&&random()<.8){stitch.push(X(i),Z(j));for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)own[n+dx+dy*W]=-1}
  }
 }
 // ── 4. Inner layer: its own lattice, closed only at the holes and at other nets' vias. ──
 const inner:Trace[]=[],low=makeGrid();
 for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(!onBoard(X(i),Z(j),.9))low.own[j*W+i]=-1;
 for(const [x,z] of HOLES)for(let j=0;j<H;j++)for(let i=0;i<W;i++)if(Math.hypot(X(i)-x,Z(j)-z)<HOLE.drill+.6)low.own[j*W+i]=-1;
 for(const v of viaNodes)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)low.own[v.n+dx+dy*W]=v.net;
 pads.forEach((p,i)=>{if(p.hole)low.block(p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2,i+1)});
 viaNodes.forEach((v,i)=>{
  if(v.links)return;
  const x=X(v.n%W),z=Z((v.n/W)|0),options:number[]=[];
  viaNodes.forEach((u,j)=>{if(j===i||u.links)return;const d=Math.hypot(X(u.n%W)-x,Z((u.n/W)|0)-z);if(d>=3&&d<=18)options.push(j)});
  for(let t=0;t<3&&options.length;t++){
   const u=viaNodes[options[Math.floor(random()*options.length)]];if(u.links)continue;
   const path=low.find(v.n,u.n,v.net,u.net,12000);if(!path)continue;
   low.claim(path,v.net);inner.push({w:.15,cls:(v.net%2)?6:7,p:corners(path)});v.links++;u.links++;stats.inner++;break;
  }
 });
 stats.traces=traces.length;stats.vias=vias.length/2;stats.stitch=stitch.length/2;
 return cached={traces,inner,vias,stitch,stats};
}
