// Routes Frost's copper between the lands in print.ts. Run by scripts/devices/trace-frost.mjs, which writes the result to routed.ts;
// the page never runs this. A grid router on a 0.2 mm lattice: every trace runs only at 0°, 45° or 90°, turns by 45° at a time,
// starts and ends on a land or a via, and keeps a clear lattice step from every other net. Deterministic (fixed seed).
// The top layer joins lands; the bottom layer joins vias, and is what the underside shows.
import {HOLES,HOLE} from './layout';
import {IMG,U,V,buildPrint} from './print';
import {rng} from '../kit/util';

// A trace is [width × 10, x, y, x, y, …] in print units. `vias` is flat [x, y, …].
export type Routed={traces:number[][];vias:number[];bottom:number[][];stats:Record<string,number>};
export function routeBoard():Routed{
 const print=buildPrint(),{pads}=print,random=rng(9031);
 const W=Math.floor(IMG.w/2)+1,H=Math.floor(IMG.h/2)+1,N=W*H;
 // 0 free, −1 closed to everyone, k > 0 held by net k (a land's clearance, a trace, or the lattice step beside a trace).
 const layer=()=>{
  const own=new Int32Array(N),wire=new Uint8Array(N+4*W);
  const block=(x0:number,y0:number,x1:number,y1:number,id:number,force=true)=>{for(let j=Math.max(0,Math.ceil(y0/2));j<=Math.min(H-1,Math.floor(y1/2));j++)for(let i=Math.max(0,Math.ceil(x0/2));i<=Math.min(W-1,Math.floor(x1/2));i++)if(force||own[j*W+i]>=0)own[j*W+i]=id};
  // Board edge with its rounded corners, and the mounting rings.
  const m=8,r=30;
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){const x=i*2,y=j*2,dx=Math.max(m+r-x,0,x-(IMG.w-m-r)),dy=Math.max(m+r-y,0,y-(IMG.h-m-r));if(x<m||y<m||x>IMG.w-m||y>IMG.h-m||Math.hypot(dx,dy)>r)own[j*W+i]=-1}
  for(const [x,z] of HOLES){const q=HOLE.ring*10+5;block(U(x)-q,V(z)-q,U(x)+q,V(z)+q,-1)}
  return {own,wire,block};
 };
 const top=layer(),bot=layer();
 const C=1.7,nodeOf=(i:number)=>Math.round(pads[i].y/2)*W+Math.round(pads[i].x/2);
 pads.forEach((p,i)=>{if(p.route)top.block(p.x-p.w/2-C,p.y-p.h/2-C,p.x+p.w/2+C,p.y+p.h/2+C,i+1,false)});
 pads.forEach(p=>{if(!p.route)top.block(p.x-p.w/2-C,p.y-p.h/2-C,p.x+p.w/2+C,p.y+p.h/2+C,-1)});
 pads.forEach((p,i)=>{if(p.route&&top.own[nodeOf(i)]>=0)top.own[nodeOf(i)]=i+1});
 // Plated holes go through: they are closed on the bottom layer too.
 pads.forEach(p=>{if(p.hole)bot.block(p.x-p.w/2-C,p.y-p.h/2-C,p.x+p.w/2+C,p.y+p.h/2+C,-1)});
 const noVia=new Uint8Array(N);
 for(const t of print.names)for(let j=Math.max(0,Math.floor(t.b[1]/2));j<=Math.min(H-1,Math.ceil(t.b[3]/2));j++)for(let i=Math.max(0,Math.floor(t.b[0]/2));i<=Math.min(W-1,Math.ceil(t.b[2]/2));i++)noVia[j*W+i]=1;
 for(const o of print.outlines)for(let j=Math.max(0,Math.floor(o.b[1]/2));j<=Math.min(H-1,Math.ceil(o.b[3]/2));j++)for(let i=Math.max(0,Math.floor(o.b[0]/2));i<=Math.min(W-1,Math.ceil(o.b[2]/2));i++)noVia[j*W+i]=1;

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
  const first=hs[0];popF=hf[0];const f=hf[--hn],s=hs[hn];let i=0;
  for(;;){let c=i*2+1;if(c>=hn)break;if(c+1<hn&&hf[c+1]<hf[c])c++;if(hf[c]>=f)break;hf[i]=hf[c];hs[i]=hs[c];i=c}
  hf[i]=f;hs[i]=s;return first;
 };
 type Layer=ReturnType<typeof layer>;
 function find(L:Layer,a:number,b:number,na:number,nb:number,limit:number):number[]|null{
  const {own,wire}=L;epoch++;hn=0;const bx=b%W,by=(b/W)|0;
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
    const nd=(d+t)&7,xx=x+DX[nd],yy=y+DY[nd];if(xx<2||yy<2||xx>=W-2||yy>=H-2)continue;
    const m=yy*W+xx;if(!ok(m))continue;
    if(nd&1&&(!ok(y*W+xx)||!ok(yy*W+x)))continue;
    // A step beside a trace already there is a little cheaper, so traces gather into bundles and leave open board open.
    const beside=wire[m+2]|wire[m-2]|wire[m+2*W]|wire[m-2*W];
    const c=g[s]+(nd&1?14:10)+(t?TURN:0)-(beside?2:0),q=m*8+nd;
    if(seen[q]===epoch&&g[q]<=c)continue;seen[q]=epoch;g[q]=c;from[q]=s;push(c+est(m),q);
   }
  }
  return null;
 }
 const traces:number[][]=[],bottom:number[][]=[],vias:number[]=[],viaNodes:{n:number;net:number;links:number}[]=[];
 const claim=(L:Layer,path:number[],net:number)=>{const {own,wire}=L;for(const n of path){own[n]=net;wire[n]=1;for(let d=0;d<8;d++){const q=n+DX[d]+DY[d]*W;if(own[q]===0)own[q]=net}}};
 // Corner points of a node path. A land that sits off the lattice gets a short jog from its true centre, hidden under the land.
 const emit=(into:number[][],path:number[],width:number,a=-1,b=-1)=>{
  const out=[Math.round(width*10)];
  if(a>=0&&(pads[a].x!==(path[0]%W)*2||pads[a].y!==((path[0]/W)|0)*2))out.push(pads[a].x,pads[a].y);
  path.forEach((n,i)=>{if(i>0&&i<path.length-1&&path[i+1]-n===n-path[i-1])return;out.push((n%W)*2,((n/W)|0)*2)});
  const e=path[path.length-1];if(b>=0&&(pads[b].x!==(e%W)*2||pads[b].y!==((e/W)|0)*2))out.push(pads[b].x,pads[b].y);
  into.push(out);return out;
 };
 const used=new Uint8Array(pads.length);
 const connect=(i:number,j:number,limit:number,width:number)=>{
  const path=find(top,nodeOf(i),nodeOf(j),i+1,j+1,limit);if(!path||path.length<2)return null;
  claim(top,path,i+1);used[i]=used[j]=1;return emit(traces,path,width,i,j);
 };
 const stats:Record<string,number>={bus:0,pair:0,stub:0,link:0,bottom:0,failed:0};

 // ── 1. Buses: rows of lands joined in order, so a bundle never has to cross itself. ──
 const group=(name:string,range?:[number,number])=>pads.map((_,i)=>i).filter(i=>pads[i].grp===name&&!used[i]&&(!range||(pads[i].k!>=range[0]&&pads[i].k!<=range[1]))).sort((p,q)=>pads[p].k!-pads[q].k!);
 const pickN=(list:number[],n:number)=>n>=list.length?list:Array.from({length:n},(_,i)=>list[Math.round(i*(list.length-1)/(n-1))]);
 const bus=(A:string,ra:[number,number],B:string,rb:[number,number],n:number,flip=false,width=1.3)=>{
  const a=pickN(group(A,ra),n),b=pickN(group(B,rb),n);if(flip)b.reverse();
  // The first of a bundle takes the outside lane; start from whichever end is nearer its partner so later ones nest inside.
  for(let k=0;k<Math.min(a.length,b.length);k++){if(connect(a[k],b[k],400000,width)){stats.bus++;stats[A+'>'+B]=(stats[A+'>'+B]??0)+1}else stats.failed++}
 };
 bus('soc:t',[3,13],'hdr',[5,15],10);
 bus('soc:l',[4,12],'emmc:r',[0,13],7);
 bus('soc:r',[0,3],'U2:b',[0,9],4);
 bus('soc:r',[4,8],'U3:t',[0,10],5,true);
 bus('soc:r',[10,16],'U3:b',[0,12],6);
 bus('U2:t',[2,13],'hdr',[16,19],4);
 bus('soc:b',[10,15],'phy:l',[0,11],6,true);
 bus('phy:r',[0,11],'eth',[0,7],6);
 bus('lvl:r',[0,6],'hdmi',[4,14],7);
 bus('soc:b',[2,8],'lvl:l',[0,6],4);
 bus('soc:l',[13,16],'sd',[0,8],4);
 bus('phy:t',[2,9],'usb',[0,7],3);

 // ── 2. Everything else: a land joins a near neighbour of another part, or drops to a via on a short stub. ──
 const fpCount=new Map<number,number>(),fpAt=new Map<number,[number,number,number]>();
 pads.forEach(p=>{fpCount.set(p.fp,(fpCount.get(p.fp)??0)+1);const c=fpAt.get(p.fp)??[0,0,0];c[0]+=p.x;c[1]+=p.y;c[2]++;fpAt.set(p.fp,c)});
 const cell=40,hash=new Map<number,number[]>();
 pads.forEach((p,i)=>{if(!p.route)return;const key=((p.y/cell)|0)*100+((p.x/cell)|0);(hash.get(key)??(hash.set(key,[]),hash.get(key)!)).push(i)});
 const around=(i:number,reach:number)=>{
  const p=pads[i],out:[number,number][]=[],r=Math.ceil(reach/cell);
  for(let cy=((p.y/cell)|0)-r;cy<=((p.y/cell)|0)+r;cy++)for(let cx=((p.x/cell)|0)-r;cx<=((p.x/cell)|0)+r;cx++)for(const j of hash.get(cy*100+cx)??[]){
   if(used[j]||pads[j].fp===p.fp||pads[j].ball)continue;const d=Math.hypot(pads[j].x-p.x,pads[j].y-p.y);if(d<=reach&&d>6)out.push([d,j]);
  }
  return out.sort((a,b)=>a[0]-b[0]);
 };
 const viaFree=(n:number,net:number)=>{if(noVia[n])return false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const o=top.own[n+dx+dy*W];if(o!==0&&o!==net)return false}return true};
 const placeVia=(n:number,net:number)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(top.own[n+dx+dy*W]===0)top.own[n+dx+dy*W]=net;top.own[n]=net;vias.push((n%W)*2,((n/W)|0)*2);viaNodes.push({n,net,links:0})};
 const stub=(i:number,width:number,far=false)=>{
  const p=pads[i],c=fpAt.get(p.fp)!,out=Math.round(Math.atan2(p.y-c[1]/c[2],p.x-c[0]/c[2])/(Math.PI/4))&7,a=nodeOf(i),net=i+1;
  for(const turn of [0,1,7,2,6,3,5])for(const len of far?[9+Math.floor(random()*14),6,14,4]:[4+Math.floor(random()*4),3,7]){
   const d=(out+turn)&7,path=[a];let n=a,good=true;
   for(let s=0;s<len&&good;s++){const m=n+DX[d]+DY[d]*W,x=m%W,y=(m/W)|0;const o=top.own[m];if(x<5||y<5||x>W-6||y>H-6||(o!==0&&o!==net))good=false;else if(d&1){const o1=top.own[n+DX[d]],o2=top.own[n+DY[d]*W];if((o1!==0&&o1!==net)||(o2!==0&&o2!==net))good=false}n=m;path.push(m)}
   if(!good||!viaFree(n,net))continue;
   claim(top,path,net);placeVia(n,net);used[i]=1;emit(traces,path,width,i);stats.stub++;return true;
  }
  return false;
 };
 const order=pads.map((_,i)=>i).filter(i=>pads[i].route&&!used[i]);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 // Package pins and connector holes first: they reach further and should get the short, direct runs.
 order.sort((a,b)=>Number((fpCount.get(pads[b].fp)??0)>2)-Number((fpCount.get(pads[a].fp)??0)>2));
 for(const i of order){
  if(used[i])continue;
  const p=pads[i],pin=(fpCount.get(p.fp)??0)>2,width=p.power?3.2:p.w*p.h>90&&random()<.5?2.2:1.3;
  // Balls on a package edge fan straight out to a via.
  if(p.ball){if(random()<.8)stub(i,1.3,true);continue}
  if(random()<(pin?.8:.6)){
   let tries=0;for(const [,j] of around(i,pin?140:60)){if(++tries>3)break;if(connect(i,j,pin?20000:6000,pads[j].power?Math.max(width,2.2):width)){stats.pair++;break}}
  }
  if(!used[i]&&random()<.85)stub(i,width,pin&&random()<.5);
 }
 // Stitching and layer-change vias in the open board, so both layers carry wiring everywhere and not only round the packages.
 for(let tries=0,made=0;tries<5000&&made<190;tries++){
  const n=(6+Math.floor(random()*(H-12)))*W+6+Math.floor(random()*(W-12)),net=pads.length+1+made;
  if(top.own[n]!==0||bot.own[n]!==0||!viaFree(n,net))continue;
  let near=false;for(const v of viaNodes){const dx=(v.n%W)-(n%W),dy=((v.n/W)|0)-((n/W)|0);if(dx*dx+dy*dy<64){near=true;break}}
  if(near)continue;placeVia(n,net);made++;
 }
 // ── 3. Longer runs from via to via: on top where there is room, and nearly all of them again on the bottom layer. ──
 const vcell=60,vhash=new Map<number,number[]>();
 viaNodes.forEach((v,i)=>{const key=((((v.n/W)|0)*2/vcell)|0)*100+(((v.n%W)*2/vcell)|0);(vhash.get(key)??(vhash.set(key,[]),vhash.get(key)!)).push(i)});
 const partners=(i:number,lo:number,hi:number)=>{
  const v=viaNodes[i],x=(v.n%W)*2,y=((v.n/W)|0)*2,options:number[]=[],r=Math.ceil(hi/vcell);
  for(let cy=((y/vcell)|0)-r;cy<=((y/vcell)|0)+r;cy++)for(let cx=((x/vcell)|0)-r;cx<=((x/vcell)|0)+r;cx++)for(const j of vhash.get(cy*100+cx)??[]){
   const u=viaNodes[j];if(j===i)continue;const d=Math.hypot((u.n%W)*2-x,((u.n/W)|0)*2-y);if(d>=lo&&d<=hi)options.push(j);
  }
  return options;
 };
 viaNodes.forEach((v,i)=>{
  if(v.links||random()>.8)return;
  const options=partners(i,44,200).filter(j=>!viaNodes[j].links);if(!options.length)return;
  for(let t=0;t<2;t++){
   const u=viaNodes[options[Math.floor(random()*options.length)]];if(u.links)continue;
   const path=find(top,v.n,u.n,v.net,u.net,30000);if(!path)continue;
   claim(top,path,v.net);emit(traces,path,1.3);v.links++;u.links++;stats.link++;break;
  }
 });
 // Bottom layer: every via is an obstacle to the others; each joins one further off, mostly along the board's length.
 viaNodes.forEach(v=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const q=v.n+dx+dy*W;if(bot.own[q]===0)bot.own[q]=v.net}});
 const done=new Uint8Array(viaNodes.length);
 viaNodes.forEach((v,i)=>{
  if(done[i]>1||random()>.95)return;
  const options=partners(i,60,420).filter(j=>done[j]<2);if(!options.length)return;
  for(let t=0;t<3;t++){
   const j=options[Math.floor(random()*options.length)],u=viaNodes[j];if(done[j]>1)continue;
   const path=find(bot,v.n,u.n,v.net,u.net,60000);if(!path)continue;
   claim(bot,path,v.net);emit(bottom,path,random()<.15?2.4:1.4);done[i]++;done[j]++;stats.bottom++;break;
  }
 });
 stats.traces=traces.length;stats.vias=vias.length/2;stats.pads=pads.length;stats.unrouted=pads.filter((p,i)=>p.route&&!used[i]).length;
 return {traces,vias,bottom,stats};
}
