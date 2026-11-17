// Routes Verdant's copper between the lands in print.ts. Run by scripts/devices/trace-verdant.mjs, which writes the result to routed.ts;
// the page never runs this. A grid router on a 0.2 mm lattice: every trace runs only at 0°, 45° or 90°, turns by 45° at a time,
// starts and ends on a land or a via, and keeps a clear lattice step from every other net. Deterministic (fixed seed).
import {IMG,CARD,PX,ROUTES,SLOTS,SOCKET2,SOCKET3,COVER} from './layout';
import {buildPrint} from './print';
import {rng} from '../kit/util';

export type Routed={traces:number[][];vias:number[];pulses:number[][];stats:Record<string,number>};
export function routeBoard():Routed{
 const print=buildPrint(),{pads}=print,random=rng(2607);
 const W=Math.floor(IMG.w/2)+1,H=Math.floor(IMG.h/2)+1,N=W*H,own=new Int32Array(N);
 // 0 free, −1 closed to everyone, k > 0 held by net k (a land's clearance, a trace, or the lattice step beside a trace).
 const block=(x0:number,y0:number,x1:number,y1:number,id:number,force=true)=>{for(let j=Math.max(0,Math.ceil(y0/2));j<=Math.min(H-1,Math.floor(y1/2));j++)for(let i=Math.max(0,Math.ceil(x0/2));i<=Math.min(W-1,Math.floor(x1/2));i++)if(force||own[j*W+i]>=0)own[j*W+i]=id};
 {
  // Board edge with its rounded corners, the mounting ring and the tinned lands the painter draws.
  const r=CARD.r/PX,m=7;
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const x=i*2,y=j*2,dx=Math.max(m+r-x,0,x-(IMG.w-m-r)),dy=Math.max(m+r-y,0,y-(IMG.h-m-r));if(x<m||y<m||x>IMG.w-m||y>IMG.h-m||Math.hypot(dx,dy)>r)own[j*W+i]=-1}
  for(const [x,y,q] of [[30,193,23],[1032,246,14],[1038,284,14],[1125,268,14]])block(x-q,y-q,x+q,y+q,-1);
  for(const [x0,y0,x1,y1] of [[1492,22,1504,110],[1492,244,1504,462],[1492,598,1504,752],[1492,1592,1503,1816]])block(x0,y0,x1,y1,-1);
 }
 const noVia=new Uint8Array(N);for(const t of print.names)for(let j=Math.max(0,Math.floor(t.b[1]/2));j<=Math.min(H-1,Math.ceil(t.b[3]/2));j++)for(let i=Math.max(0,Math.floor(t.b[0]/2));i<=Math.min(W-1,Math.ceil(t.b[2]/2));i++)noVia[j*W+i]=1;
 const C=1.7,nodeOf=(i:number)=>Math.round(pads[i].y/2)*W+Math.round(pads[i].x/2);
 pads.forEach((p,i)=>{if(p.route)block(p.x-p.w/2-C,p.y-p.h/2-C,p.x+p.w/2+C,p.y+p.h/2+C,i+1,false)});
 pads.forEach(p=>{if(!p.route)block(p.x-p.w/2-C,p.y-p.h/2-C,p.x+p.w/2+C,p.y+p.h/2+C,-1)});
 pads.forEach((p,i)=>{if(p.route&&own[nodeOf(i)]>=0)own[nodeOf(i)]=i+1});
 // Nothing routes on this layer under the sockets, the slots or the header, or inside the land grid: a trace reaches a contact row straight from outside.
 const shut=(x0:number,y0:number,x1:number,y1:number)=>{for(let j=Math.max(0,Math.ceil(y0/2));j<=Math.min(H-1,Math.floor(y1/2));j++)for(let i=Math.max(0,Math.ceil(x0/2));i<=Math.min(W-1,Math.floor(x1/2));i++)if(own[j*W+i]===0)own[j*W+i]=-1};
 for(const s of SLOTS)shut(s.b[0],s.b[1],s.b[2],s.b[3]);
 shut(SOCKET2.chip[0]-4,SOCKET2.chip[1]+5,SOCKET2.chip[2]+4,SOCKET2.chip[3]-5);shut(SOCKET3.chip[0],SOCKET3.chip[1],SOCKET3.chip[2],SOCKET3.chip[3]);
 shut(COVER.b[0]+24,COVER.b[1]+24,COVER.b[2]-24,COVER.b[3]-24);shut(642,893,870,920);

 const wire=new Uint8Array(N+4*W);
 // ── A* over (node, heading). ──
 const DX=[1,1,0,-1,-1,-1,0,1],DY=[0,1,1,1,0,-1,-1,-1],TURN=26;
 const g=new Int32Array(N*8),seen=new Int32Array(N*8),from=new Int32Array(N*8);let epoch=0;
 let hf=new Int32Array(1<<16),hs=new Int32Array(1<<16),hn=0;
 const push=(f:number,s:number)=>{
  if(hn===hf.length){const a=new Int32Array(hn*2),b=new Int32Array(hn*2);a.set(hf);b.set(hs);hf=a;hs=b}
  let i=hn++;while(i>0){const p=(i-1)>>1;if(hf[p]<=f)break;hf[i]=hf[p];hs[i]=hs[p];i=p}hf[i]=f;hs[i]=s;
 };
 let popF=0;
 const pop=()=>{
  const top=hs[0];popF=hf[0];const f=hf[--hn],s=hs[hn];let i=0;
  for(;;){let c=i*2+1;if(c>=hn)break;if(c+1<hn&&hf[c+1]<hf[c])c++;if(hf[c]>=f)break;hf[i]=hf[c];hs[i]=hs[c];i=c}
  hf[i]=f;hs[i]=s;return top;
 };
 let lastFail='';
 function find(a:number,b:number,na:number,nb:number,limit:number):number[]|null{
  epoch++;hn=0;const bx=b%W,by=(b/W)|0;
  const ok=(m:number)=>{const o=own[m];return o===0||o===na||o===nb};
  const est=(n:number)=>{const dx=Math.abs(n%W-bx),dy=Math.abs(((n/W)|0)-by);return dx>dy?10*dx+4*dy:10*dy+4*dx};
  for(let d=0;d<8;d++){const s=a*8+d;g[s]=0;seen[s]=epoch;from[s]=-1;push(est(a),s)}
  let count=0;
  while(hn){
   const s=pop(),n=s>>>3,d=s&7;if(g[s]+est(n)<popF)continue;
   if(n===b){const path=[n];let q=s;while(from[q]>=0){q=from[q];if(path[path.length-1]!==q>>>3)path.push(q>>>3)}return path.reverse()}
   if(++count>limit){lastFail='limit';return null}
   const x=n%W,y=(n/W)|0;
   for(let t=-1;t<=1;t++){
    const nd=(d+t)&7,xx=x+DX[nd],yy=y+DY[nd];if(xx<2||yy<2||xx>=W-2||yy>=H-2)continue;
    const m=yy*W+xx;if(!ok(m))continue;
    if(nd&1&&(!ok(y*W+xx)||!ok(yy*W+x)))continue;
    // A step beside something already there is a little cheaper, so traces gather into bundles and leave open board open.
    // A step right against someone else's land costs more, so a trace does not run along a row of lands and wall it in.
    const beside=wire[m+2]|wire[m-2]|wire[m+2*W]|wire[m-2*W],crowd=(own[m+1]>0&&own[m+1]!==na&&own[m+1]!==nb&&!wire[m+1])||(own[m-1]>0&&own[m-1]!==na&&own[m-1]!==nb&&!wire[m-1])||(own[m+W]>0&&own[m+W]!==na&&own[m+W]!==nb&&!wire[m+W])||(own[m-W]>0&&own[m-W]!==na&&own[m-W]!==nb&&!wire[m-W]);
    const c=g[s]+(nd&1?14:10)+(t?TURN:0)-(beside?2:0)+(crowd?6:0),q=m*8+nd;
    if(seen[q]===epoch&&g[q]<=c)continue;seen[q]=epoch;g[q]=c;from[q]=s;push(c+est(m),q);
   }
  }
  lastFail='empty after '+count;return null;
 }
 const traces:number[][]=[];const vias:number[]=[],viaNodes:{n:number;net:number;links:number}[]=[];
 const claim=(path:number[],net:number)=>{for(const n of path){own[n]=net;wire[n]=1;for(let d=0;d<8;d++){const q=n+DX[d]+DY[d]*W;if(own[q]===0)own[q]=net}}};
 // Corner points of a node path, as pixel coordinates behind the width.
 const emit=(path:number[],width:number)=>{
  const out=[Math.round(width*10)];
  path.forEach((n,i)=>{if(i>0&&i<path.length-1&&path[i+1]-n===n-path[i-1])return;out.push((n%W)*2,((n/W)|0)*2)});
  traces.push(out);return out;
 };
 const used=new Uint8Array(pads.length);
 const connect=(i:number,j:number,limit:number,width:number)=>{
  const path=find(nodeOf(i),nodeOf(j),i+1,j+1,limit);if(!path||path.length<2)return null;
  claim(path,i+1);used[i]=used[j]=1;return emit(path,width);
 };
 const stats:Record<string,number>={pulse:0,bus:0,pair:0,stub:0,link:0,failed:0};

 // ── 1. The six pulse routes: from the processor's edge lands to the lands nearest where each route should arrive. ──
 const px=(p:[number,number]):[number,number]=>[p[0]/PX+IMG.w/2,p[1]/PX+IMG.h/2];
 const nearest=(x:number,y:number,pick:(i:number)=>boolean,reach:number)=>{let best=-1,bd=reach*reach;pads.forEach((p,i)=>{if(!p.route||used[i]||!pick(i))return;const d=(p.x-x)**2+(p.y-y)**2;if(d<bd){bd=d;best=i}});return best};
 const pulses:number[][]=[];
 for(const route of ROUTES){
  const [sx,sy]=px(route[0]),[ex,ey]=px(route[route.length-1]);
  const a=nearest(sx,sy,i=>!!pads[i].grp?.startsWith('cpu:'),80),b=nearest(ex,ey,i=>!pads[i].grp?.startsWith('cpu:'),90);
  const t=a>=0&&b>=0?connect(a,b,900000,1.5):null;
  if(t){pulses.push(t.slice(1));stats.pulse++}else{pulses.push([sx,sy,ex,ey].map(v=>Math.round(v/2)*2));stats.failed++}
 }
 // ── 2. Buses: rows of lands joined in order, so the bundle never has to cross itself. ──
 const group=(name:string)=>pads.map((p,i)=>i).filter(i=>pads[i].grp===name&&!used[i]).sort((p,q)=>pads[p].k!-pads[q].k!);
 // Each source land takes the nearest free land of the other row that keeps the order, so the bundle runs straight across where it can.
 const bus=(A:string,B:string,n:number,axis:'x'|'y')=>{
  const a=group(A),b=group(B);let last=-1,done=0;
  for(let k=0;k<a.length&&done<n;k++){
   const i=a[Math.round(k*(a.length-1)/(Math.min(n,a.length)-1))]??a[k],at=pads[i][axis];let best=-1,bd=1e9;
   for(let q=last+1;q<b.length;q++){const d=Math.abs(pads[b[q]][axis]-at);if(d<bd){bd=d;best=q}else break}
   if(best<0)break;done++;
   // If that land cannot be reached (a part sits in front of it), the next few along are tried.
   let made=false;for(let q=best;q<Math.min(b.length,best+6)&&!made;q++)if(connect(i,b[q],120000,1.3)){made=true;last=q}
   if(made){stats.bus++;stats[A]=(stats[A]??0)+1}else stats.failed++;
  }
 };
 bus('cpu:r','dimm-right:0',40,'y');bus('cpu:l','dimm-left:2',40,'y');bus('cpu:b','sock2:t',30,'x');bus('sock2:b','dimm-bottom:0',40,'x');bus('cpu:t','hdr',26,'x');

 // ── 3. Everything else: a land joins a near neighbour of another part, or drops to a via on a short stub. ──
 const fpCount=new Map<number,number>(),fpAt=new Map<number,[number,number,number]>();
 pads.forEach(p=>{fpCount.set(p.fp,(fpCount.get(p.fp)??0)+1);const c=fpAt.get(p.fp)??[0,0,0];c[0]+=p.x;c[1]+=p.y;c[2]++;fpAt.set(p.fp,c)});
 const cell=40,hash=new Map<number,number[]>();
 pads.forEach((p,i)=>{if(!p.route||p.grp)return;const key=((p.y/cell)|0)*100+((p.x/cell)|0);(hash.get(key)??(hash.set(key,[]),hash.get(key)!)).push(i)});
 const around=(i:number,reach:number)=>{
  const p=pads[i],out:[number,number][]=[],r=Math.ceil(reach/cell);
  for(let cy=((p.y/cell)|0)-r;cy<=((p.y/cell)|0)+r;cy++)for(let cx=((p.x/cell)|0)-r;cx<=((p.x/cell)|0)+r;cx++)for(const j of hash.get(cy*100+cx)??[]){
   if(used[j]||pads[j].fp===p.fp)continue;const d=Math.hypot(pads[j].x-p.x,pads[j].y-p.y);if(d<=reach&&d>6)out.push([d,j]);
  }
  return out.sort((a,b)=>a[0]-b[0]);
 };
 const viaFree=(n:number,net:number)=>{if(noVia[n])return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const o=own[n+dx+dy*W];if(o!==0&&o!==net)return false}return true};
 const placeVia=(n:number,net:number)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(own[n+dx+dy*W]===0)own[n+dx+dy*W]=net;own[n]=net;vias.push((n%W)*2,((n/W)|0)*2);viaNodes.push({n,net,links:0})};
 const stub=(i:number,width:number)=>{
  const p=pads[i],c=fpAt.get(p.fp)!,out=Math.round(Math.atan2(p.y-c[1]/c[2],p.x-c[0]/c[2])/(Math.PI/4))&7,a=nodeOf(i),net=i+1;
  for(const turn of [0,1,7,2,6,3,5])for(const len of [3+Math.floor(random()*3),2,6]){
   const d=(out+turn)&7,path=[a];let n=a,good=true;
   for(let s=0;s<len&&good;s++){const m=n+DX[d]+DY[d]*W,x=m%W,y=(m/W)|0;const o=own[m];if(x<3||y<3||x>W-4||y>H-4||(o!==0&&o!==net))good=false;else if(d&1){const o1=own[n+DX[d]],o2=own[n+DY[d]*W];if((o1!==0&&o1!==net)||(o2!==0&&o2!==net))good=false}n=m;path.push(m)}
   if(!good||!viaFree(n,net))continue;
   claim(path,net);placeVia(n,net);used[i]=1;emit(path,width);stats.stub++;return true;
  }
  return false;
 };
 const order=pads.map((p,i)=>i).filter(i=>pads[i].route&&!pads[i].grp);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 // Package pins and connector holes first: they reach further and should get the short, direct runs.
 order.sort((a,b)=>Number((fpCount.get(pads[b].fp)??0)>2)-Number((fpCount.get(pads[a].fp)??0)>2));
 for(const i of order){
  if(used[i])continue;
  const pin=(fpCount.get(pads[i].fp)??0)>2,power=!pin&&pads[i].w*pads[i].h>30&&random()<.5;
  if(random()<(pin?.8:.55)){
   let tries=0;for(const [,j] of around(i,pin?120:52)){if(++tries>3)break;if(connect(i,j,pin?16000:5000,power?2.2:1.5)){stats.pair++;break}}
  }
  if(!used[i]&&random()<(pin?.75:.85))stub(i,power?2.4:1.5);
 }
 // ── 4. Longer runs from via to via, so the open board carries wiring between its clusters. ──
 const vcell=60,vhash=new Map<number,number[]>();
 viaNodes.forEach((v,i)=>{const key=((((v.n/W)|0)*2/vcell)|0)*100+(((v.n%W)*2/vcell)|0);(vhash.get(key)??(vhash.set(key,[]),vhash.get(key)!)).push(i)});
 viaNodes.forEach((v,i)=>{
  if(v.links||random()>.5)return;
  const x=(v.n%W)*2,y=((v.n/W)|0)*2,options:[number,number][]=[];
  for(let cy=((y/vcell)|0)-4;cy<=((y/vcell)|0)+4;cy++)for(let cx=((x/vcell)|0)-4;cx<=((x/vcell)|0)+4;cx++)for(const j of vhash.get(cy*100+cx)??[]){
   const u=viaNodes[j];if(j===i||u.links)continue;const d=Math.hypot((u.n%W)*2-x,((u.n/W)|0)*2-y);if(d>=44&&d<=230)options.push([d,j]);
  }
  if(!options.length)return;
  for(let t=0;t<2;t++){
   const [,j]=options[Math.floor(random()*options.length)],u=viaNodes[j];if(u.links)continue;
   const path=find(v.n,u.n,v.net,u.net,30000);if(!path)continue;
   claim(path,v.net);emit(path,1.5);v.links++;u.links++;stats.link++;break;
  }
 });
 stats.traces=traces.length;stats.vias=vias.length/2;
 return {traces,vias,pulses,stats};
}
