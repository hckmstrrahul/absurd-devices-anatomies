// Ember's routing, done offline: `node scripts/devices/trace-ember.mjs --route` runs `route()` and writes routed.ts.
// Input is the vector board (pcb.ts): every pad and hole. Output, in reference pixels (0.1 mm):
//   buses    bundles of parallel traces between two parts. One wide corridor is found on a coarse lattice that only
//            allows moves at 0, 45 and 90 degrees with at most a 45 degree turn per step; the bundle is that path offset
//            sideways once per trace, and every trace ends on a via, staggered so the vias clear each other.
//   nets     every part pad gets a trace: to a nearby pad of another part (a small maze search on the 0.1 mm grid, same
//            angle rules) or straight out to a via. Chip pins fan out to two staggered rows of vias.
//   silk     side lines beside the larger parts, and labels (designators and the wanted list) wherever there is room.
// Clearances are kept: a trace centre stays 0.26 mm from any pad that is not its own and 0.3 mm from other traces.
import {IMG,inCard,at} from './layout';
import {pads,comps,wants,hidden,fingerprint,type Pad} from './pcb';

const W=IMG.w,H=IMG.h,N=W*H;
const DX=[1,1,0,-1,-1,-1,0,1],DY=[0,1,1,1,0,-1,-1,-1],DL=[1,Math.SQRT2,1,Math.SQRT2,1,Math.SQRT2,1,Math.SQRT2];
const hash=(n:number)=>{let t=Math.imul(n|0,0x9e3779b1)>>>0;t^=t>>>15;t=Math.imul(t,0x85ebca6b)>>>0;t^=t>>>13;t=Math.imul(t,0xc2b2ae35)>>>0;t^=t>>>16;return (t>>>0)/4294967296};
class Heap{
 k=new Float64Array(1024);v=new Int32Array(1024);n=0;
 push(key:number,val:number){
  if(this.n===this.k.length){const k=new Float64Array(this.n*2),v=new Int32Array(this.n*2);k.set(this.k);v.set(this.v);this.k=k;this.v=v}
  let i=this.n++;const K=this.k,V=this.v;
  while(i>0){const p=(i-1)>>1;if(K[p]<=key)break;K[i]=K[p];V[i]=V[p];i=p}
  K[i]=key;V[i]=val;
 }
 pop(){
  const K=this.k,V=this.v,top=V[0],key=K[--this.n],val=V[this.n];let i=0;
  for(;;){let c=i*2+1;if(c>=this.n)break;if(c+1<this.n&&K[c+1]<K[c])c++;if(K[c]>=key)break;K[i]=K[c];V[i]=V[c];i=c}
  K[i]=key;V[i]=val;return top;
 }
}
// Bundles wanted, most important first: from part, to part, traces. Fewer are laid if the corridor is too tight.
const BUSES:[string,string,number][]=[
 ['socket','slot-s0',14],['socket','slot-l0',12],['socket','core-socket',14],['socket','slot-s3',10],['core-socket','slot-h0',14],['socket','ctl-a',10],
 ['socket','ctl-d',10],['socket','ctl-c',8],['core-socket','ctl-label',8],['slot-l1','ctl-q3',8],['slot-l0','ctl-q2',8],['core-socket','ctl-q5',8],['core-socket','ctl-q6',6],
 ['ctl-a','tower-0',8],['ctl-a','tower-1',8],['block-a','socket',8],['block-c','socket',8],['steel-socket','socket',6],['jack','socket',6],['edge-0','socket',8],
 ['edge-1','core-socket',10],['edge-0','core-socket',8],['slot-h1','edge-4',8],['ctl-q2','edge-4',6],['ctl-label','ctl-q5',6],['ctl-q6','slot-h0',6],['module','ctl-q2',6],
 ['ctl-d','slot-s0',6],['ctl-b','slot-l0',6],['ctl-soic','ctl-a',4],['ctl-vr','socket',6],['ctl-vr','core-socket',6],['core-socket','slot-s1',10],['socket','slot-l1',8],
 ['ctl-q1','core-socket',6],['ctl-q1','slot-s2',6],['edge-2','slot-h0',6],['corner-block','socket',6],['ctl-c','ctl-d',6],['ctl-label','slot-h0',6],['ctl-q5','ctl-q6',5],['ctl-ic','ctl-q6',4],
 ['edge-3','ctl-q3',4],['ctl-q4','module',4],['slot-s3','ctl-label',8],['tower-0','slot-l0',6],['tower-1','slot-l1',6],['core-socket','edge-4',6],
];
const PITCH=3.4,TW=1.2,VIA=4.2;

export function route(log:(s:string)=>void=()=>{}){
 const ob=new Uint8Array(N),own=new Int32Array(N).fill(-1),d1=new Float32Array(N),id1=new Int32Array(N);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(!inCard(x+.5,y+.5,9))ob[y*W+x]=1;
 const box=(p:Pad,grow=0)=>[Math.max(0,Math.floor(p.x-p.w/2-grow)),Math.max(0,Math.floor(p.y-p.h/2-grow)),Math.min(W-1,Math.ceil(p.x+p.w/2+grow)-1),Math.min(H-1,Math.ceil(p.y+p.h/2+grow)-1)];
 pads.forEach((p,i)=>{const [x0,y0,x1,y1]=box(p);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){ob[y*W+x]=1;own[y*W+x]=i}});
 // Distance (in cells) from every cell to the nearest obstacle, and which pad that is.
 function chamfer(){
  for(let i=0;i<N;i++){if(ob[i]){d1[i]=0;id1[i]=own[i]}else{d1[i]=1e6;id1[i]=-1}}
  const relax=(i:number,j:number,c:number)=>{const v=d1[j]+c;if(v<d1[i]){d1[i]=v;id1[i]=id1[j]}};
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!d1[i])continue;if(x)relax(i,i-1,1);if(y){relax(i,i-W,1);if(x)relax(i,i-W-1,Math.SQRT2);if(x<W-1)relax(i,i-W+1,Math.SQRT2)}}
  for(let y=H-1;y>=0;y--)for(let x=W-1;x>=0;x--){const i=y*W+x;if(!d1[i])continue;if(x<W-1)relax(i,i+1,1);if(y<H-1){relax(i,i+W,1);if(x<W-1)relax(i,i+W+1,Math.SQRT2);if(x)relax(i,i+W-1,Math.SQRT2)}}
 }
 const traces:number[][]=[],vias:number[]=[];
 const disc=(grid:Uint8Array,cx:number,cy:number,r:number,v=1)=>{const x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(W-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(H-1,Math.ceil(cy+r));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if((x+.5-cx)**2+(y+.5-cy)**2<=r*r)grid[y*W+x]=v};
 const along=(pts:number[],step:number,fn:(x:number,y:number)=>void)=>{for(let i=0;i+3<pts.length;i+=2){const ax=pts[i],ay=pts[i+1],bx=pts[i+2],by=pts[i+3],n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/step));for(let k=0;k<=n;k++)fn(ax+(bx-ax)*k/n,ay+(by-ay)*k/n)}};

 // ── Buses ────────────────────────────────────────────────────────────────
 chamfer();
 let laid=0,lines=0;
 for(const [from,to,want] of BUSES){
  const A=at(from).box,Bx=at(to).box;let done=false;
  for(let n=want;n>=3&&!done;n-=n>8?2:1){
   const half=(n-1)*PITCH/2,need=half+3,G=Math.max(10,Math.ceil(half)),gw=Math.floor(W/G),gh=Math.floor(H/G),ox=G/2,oy=G/2;
   const px=(g:number)=>Math.round(ox+g*G),clear=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&d1[y*W+x]>=need;
   const rd=(b:readonly number[],x:number,y:number)=>Math.hypot(Math.max(b[0]-x,0,x-b[2]),Math.max(b[1]-y,0,y-b[3]));
   const S=gw*gh*16,g=new Float32Array(S).fill(1e9),par=new Int32Array(S).fill(-1),heap=new Heap();
   for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){const x=px(gx),y=px(gy),r=rd(A,x,y);if(r>=need-1&&r<=need+G*1.7&&clear(x,y))for(let d=0;d<8;d++){const s=(gy*gw+gx)*16+d*2;g[s]=0;heap.push(rd(Bx,x,y),s)}}
   let end=-1,pops=0;
   while(heap.n){
    const s=heap.pop(),cell=s>>4,d=(s>>1)&7,must=s&1,gx=cell%gw,gy=(cell-gx)/gw,x=px(gx),y=px(gy);
    const r=rd(Bx,x,y);if(r>=need-1&&r<=need+G*1.7&&!must){end=s;break}
    if(++pops>400000)break;
    for(const turn of must?[0]:[0,1,-1]){
     const nd=(d+turn+8)&7,nx=gx+DX[nd],ny=gy+DY[nd];if(nx<0||ny<0||nx>=gw||ny>=gh)continue;
     let ok=true;for(let k=1;k<=G&&ok;k++)ok=clear(x+DX[nd]*k,y+DY[nd]*k);if(!ok)continue;
     const ns=(ny*gw+nx)*16+nd*2+(turn?1:0),ng=g[s]+DL[nd]*G+(turn?G*2:0);
     if(ng<g[ns]){g[ns]=ng;par[ns]=s;heap.push(ng+rd(Bx,px(nx),px(ny))*1.15,ns)}
    }
   }
   if(end<0)continue;
   const path:number[]=[];for(let s=end;s>=0;s=par[s]){const cell=s>>4,gx=cell%gw;path.unshift(px(gx)+.5,px((cell-gx)/gw)+.5)}
   // Drop collinear points.
   const pts:number[]=[];for(let i=0;i<path.length;i+=2){const m=pts.length;if(m>=4&&Math.abs((pts[m-2]-pts[m-4])*(path[i+1]-pts[m-1])-(pts[m-1]-pts[m-3])*(path[i]-pts[m-2]))<1e-6){pts[m-2]=path[i];pts[m-1]=path[i+1]}else pts.push(path[i],path[i+1])}
   const k=pts.length/2;if(k<2)continue;
   const dir=(i:number)=>{const dx=pts[i*2+2]-pts[i*2],dy=pts[i*2+3]-pts[i*2+1],l=Math.hypot(dx,dy);return [dx/l,dy/l]};
   const bundle:number[][]=[];let valid=true;
   for(let i=0;i<n&&valid;i++){
    const o=(i-(n-1)/2)*PITCH,line:number[]=[];
    for(let j=0;j<k;j++){
     const a=dir(Math.max(0,j-1)),b=dir(Math.min(k-2,j)),nx=-a[1]-b[1],ny=a[0]+b[0],den=1+a[0]*b[0]+a[1]*b[1];
     line.push(pts[j*2]+o*nx/den,pts[j*2+1]+o*ny/den);
    }
    for(let j=0;j<k-1;j++){const d=dir(j);if((line[j*2+2]-line[j*2])*d[0]+(line[j*2+3]-line[j*2+1])*d[1]<(j===0||j===k-2?9:2))valid=false}
    // Stagger the ends so neighbouring vias clear each other.
    const a=dir(0),b=dir(k-2),s0=(i%2)*5.6,s1=((n-1-i)%2)*5.6;
    line[0]+=a[0]*s0;line[1]+=a[1]*s0;line[k*2-2]-=b[0]*s1;line[k*2-1]-=b[1]*s1;
    bundle.push(line.map(v=>Math.round(v*10)/10));
   }
   if(!valid)continue;
   for(const line of bundle){
    traces.push([TW,...line]);vias.push(line[0],line[1],VIA,line[line.length-2],line[line.length-1],VIA);
    along(line,.5,(x,y)=>disc(ob,x,y,1.1));disc(ob,line[0],line[1],VIA/2+.4);disc(ob,line[line.length-2],line[line.length-1],VIA/2+.4);
   }
   chamfer();laid++;lines+=n;done=true;
  }
  if(!done)log(`bus ${from} → ${to}: no corridor`);
 }
 log(`buses ${laid}/${BUSES.length}, ${lines} traces`);

 // ── Nets ─────────────────────────────────────────────────────────────────
 const CL=2.6,occT=new Uint8Array(N),occV=new Uint8Array(N),BK=32,bw=Math.ceil(W/BK),bh=Math.ceil(H/BK),bucket:number[][]=Array.from({length:bw*bh},()=>[]);
 pads.forEach((p,i)=>{const [x0,y0,x1,y1]=box(p,CL+1);for(let by=y0>>5;by<=y1>>5;by++)for(let bx=x0>>5;bx<=x1>>5;bx++)bucket[by*bw+bx].push(i)});
 // Clear of every pad except the two the trace belongs to.
 const exact=(x:number,y:number,a:number,b:number)=>{for(const i of bucket[(y>>5)*bw+(x>>5)]){if(i===a||i===b)continue;const p=pads[i];if(Math.hypot(Math.max(p.x-p.w/2-x-.5,0,x+.5-p.x-p.w/2),Math.max(p.y-p.h/2-y-.5,0,y+.5-p.y-p.h/2))<CL-.5)return false}return true};
 const pass=(x:number,y:number,a:number,b:number)=>{
  if(x<0||y<0||x>=W||y>=H)return false;const i=y*W+x,o=own[i];
  if(o>=0)return o===a||o===b;
  if(ob[i])return false;
  if(d1[i]<CL){const n=id1[i];if(n<0||(n!==a&&n!==b)||!exact(x,y,a,b))return false}
  return !occT[i];
 };
 const commit=(pts:number[],via?:[number,number])=>{
  traces.push([TW,...pts]);along(pts,.5,(x,y)=>{disc(occT,x,y,2.6);disc(occV,x,y,4.7)});
  if(via){vias.push(via[0],via[1],VIA);disc(occT,via[0],via[1],VIA/2+2.4);disc(occV,via[0],via[1],VIA+1.8)}
 };
 const viaSite=(x:number,y:number)=>{if(x<0||y<0||x>=W||y>=H)return false;const i=y*W+x;return d1[i]>=VIA/2+1.9&&!occV[i]&&!occT[i]};
 chamfer();
 const cell=(p:Pad):[number,number]=>[Math.floor(p.x),Math.floor(p.y)];
 // Straight out to a via, trying the pad's own direction first, then sideways, then the diagonals.
 const stub=(i:number,lengths:number[],dirs:number[])=>{
  const p=pads[i],[sx,sy]=cell(p);
  for(const d of dirs)for(const len of lengths){
   const n=Math.round(len/DL[d]);let ok=true;
   for(let k=1;k<=n&&ok;k++)ok=pass(sx+DX[d]*k,sy+DY[d]*k,i,-9);
   const vx=sx+DX[d]*n,vy=sy+DY[d]*n;
   if(ok&&viaSite(vx,vy)){commit([sx+.5,sy+.5,vx+.5,vy+.5],[vx+.5,vy+.5]);return true}
  }
  return false;
 };
 const octant=(o:[number,number])=>((Math.round(Math.atan2(o[1],o[0])/(Math.PI/4))%8)+8)%8;
 let fanned=0,joined=0,stubbed=0,open=0;
 // Chip pins.
 pads.forEach((p,i)=>{if(!p.fan||!p.out)return;const d=octant(p.out),half=(p.out[0]?p.w:p.h)/2;if(stub(i,[half+p.fan,half+p.fan+4,half+p.fan-4],[d]))fanned++;else open++});
 // Part pads, in a fixed shuffled order so no region is favoured.
 const order=pads.map((p,i)=>i).filter(i=>pads[i].out&&!pads[i].fan).sort((a,b)=>hash(a*13+5)-hash(b*13+5)),degree=new Uint8Array(pads.length);
 const pbucket:number[][]=Array.from({length:bw*bh},()=>[]);for(const i of order)pbucket[(Math.floor(pads[i].y)>>5)*bw+(Math.floor(pads[i].x)>>5)].push(i);
 const maze=(a:number,b:number)=>{
  const [sx,sy]=cell(pads[a]),[tx,ty]=cell(pads[b]),m=14,x0=Math.max(0,Math.min(sx,tx)-m),y0=Math.max(0,Math.min(sy,ty)-m),w=Math.min(W-1,Math.max(sx,tx)+m)-x0+1,h=Math.min(H-1,Math.max(sy,ty)+m)-y0+1;
  const g=new Float32Array(w*h*8).fill(1e9),par=new Int32Array(w*h*8).fill(-1),heap=new Heap(),est=(x:number,y:number)=>{const dx=Math.abs(x-tx),dy=Math.abs(y-ty);return (Math.max(dx,dy)+.414*Math.min(dx,dy))*1.2};
  for(let d=0;d<8;d++){const s=((sy-y0)*w+sx-x0)*8+d;g[s]=0;heap.push(est(sx,sy),s)}
  let pops=0,end=-1;
  while(heap.n){
   const s=heap.pop(),d=s&7,c=s>>3,cx=c%w,x=cx+x0,y=(c-cx)/w+y0;
   if(x===tx&&y===ty){end=s;break}
   if(++pops>9000)return null;
   for(const turn of [0,1,-1]){
    const nd=(d+turn+8)&7,nx=x+DX[nd],ny=y+DY[nd];if(nx<x0||ny<y0||nx>=x0+w||ny>=y0+h||!pass(nx,ny,a,b))continue;
    const ns=((ny-y0)*w+nx-x0)*8+nd,ng=g[s]+DL[nd]+(turn?3:0);if(ng<g[ns]){g[ns]=ng;par[ns]=s;heap.push(ng+est(nx,ny),ns)}
   }
  }
  if(end<0)return null;
  const pts:number[]=[];let last=-1;
  for(let s=end;s>=0;s=par[s]){const d=s&7,c=s>>3,cx=c%w;if(d!==last||par[s]<0){pts.unshift(cx+x0+.5,(c-cx)/w+y0+.5);last=d}}
  return pts;
 };
 for(const i of order){
  const p=pads[i],d=octant(p.out!),half=(p.out![0]?p.w:p.h)/2,side=(p.out![0]?p.h:p.w)/2,r=hash(i*7+1);
  if(r<.42&&degree[i]<2){
   const [cx,cy]=cell(p),near:[number,number][]=[];
   for(let by=Math.max(0,(cy-48)>>5);by<=Math.min(bh-1,(cy+48)>>5);by++)for(let bx=Math.max(0,(cx-48)>>5);bx<=Math.min(bw-1,(cx+48)>>5);bx++)for(const j of pbucket[by*bw+bx]){const q=pads[j];if(j===i||q.grp===p.grp||degree[j]>=2)continue;const dist=Math.hypot(q.x-p.x,q.y-p.y);if(dist<46&&dist>6)near.push([dist,j])}
   near.sort((a,b)=>a[0]-b[0]);let made=false;
   for(const [,j] of near.slice(0,3)){const pts=maze(i,j);if(pts&&pts.length>=4){commit(pts);degree[i]++;degree[j]++;joined++;made=true;break}}
   if(made)continue;
  }
  if(degree[i])continue;
  const base=VIA/2+2.2+Math.floor(r*37%1*7),lengths=[half+base,half+base+3,half+base-2,half+base+6],sideways=[side+base,side+base+3,side+base+6];
  if(stub(i,lengths,[d])||stub(i,sideways,r<.5?[(d+2)&7,(d+6)&7]:[(d+6)&7,(d+2)&7])||stub(i,[half+base+2,half+base+6],[(d+1)&7,(d+7)&7])){stubbed++;degree[i]++}else open++;
 }
 log(`pins fanned ${fanned}, pad to pad ${joined}, pad to via ${stubbed}, left open ${open}; traces ${traces.length}, vias ${vias.length/3}`);

 // ── Silk ─────────────────────────────────────────────────────────────────
 const lab=new Uint8Array(N);
 const mark=(x0:number,y0:number,x1:number,y1:number)=>{for(let y=Math.max(0,Math.floor(y0));y<=Math.min(H-1,Math.ceil(y1)-1);y++)for(let x=Math.max(0,Math.floor(x0));x<=Math.min(W-1,Math.ceil(x1)-1);x++)lab[y*W+x]=1};
 const free=(x0:number,y0:number,x1:number,y1:number)=>{
  if(x0<10||y0<10||x1>W-10||y1>H-10||!inCard(x0,y0,10)||!inCard(x1,y1,10)||!inCard(x0,y1,10)||!inCard(x1,y0,10))return false;
  for(let y=Math.floor(y0);y<Math.ceil(y1);y++)for(let x=Math.floor(x0);x<Math.ceil(x1);x++)if(lab[y*W+x])return false;
  for(let y=y0;y<=y1;y+=4)for(let x=x0;x<=x1;x+=4)if(hidden(x,y))return false;
  return !hidden(x1,y1)&&!hidden(x0,y1)&&!hidden(x1,y0);
 };
 for(const p of pads)mark(p.x-p.w/2-1.2,p.y-p.h/2-1.2,p.x+p.w/2+1.2,p.y+p.h/2+1.2);
 for(let i=0;i<vias.length;i+=3)mark(vias[i]-VIA/2-1,vias[i+1]-VIA/2-1,vias[i]+VIA/2+1,vias[i+1]+VIA/2+1);
 for(const q of comps)mark(q.box[0]-.5,q.box[1]-.5,q.box[2]+.5,q.box[3]+.5);
 const labels:[number,number,number,number,string][]=[],silk:number[]=[];
 const WIDE=.66;
 const place=(text:string,x:number,y:number,size:number,rot:number)=>{const w=text.length*size*WIDE+1,h=size*.86,bw2=rot?h:w,bh2=rot?w:h;if(!free(x-bw2/2-1,y-bh2/2-1,x+bw2/2+1,y+bh2/2+1))return false;mark(x-bw2/2-.6,y-bh2/2-.6,x+bw2/2+.6,y+bh2/2+.6);labels.push([Math.round(x*10)/10,Math.round(y*10)/10,size,rot,text]);return true};
 // Wanted labels first (they are the large ones), each nudged outward in rings until it fits.
 let placed=0;const lost:string[]=[];
 for(const q of wants){
  let ok=false;const reach=q.reach??30;
  for(let r=0;r<=reach&&!ok;r+=3)for(let k=0;k<(r?12:1)&&!ok;k++){const a=k/12*Math.PI*2;ok=place(q.text,q.x+Math.cos(a)*r,q.y+Math.sin(a)*r,q.size,q.rot??0)}
  if(ok)placed++;else lost.push(q.text);
 }
 // Side lines and designators for the parts big enough to carry them.
 let named=0;
 for(const q of comps){
  if(q.kind==='land')continue;
  const [x0,y0,x1,y1]=q.box,w=x1-x0,h=y1-y0,L=Math.max(w,h),S=Math.min(w,h);
  if(S>=8&&L>=14)for(const e of [-1,1]){
   const o=2.6,c=q.term+2.2,seg=q.axis?[e<0?x0-o:x1+o,y0+c,e<0?x0-o:x1+o,y1-c]:[x0+c,e<0?y0-o:y1+o,x1-c,e<0?y0-o:y1+o];
   if(free(Math.min(seg[0],seg[2])-.7,Math.min(seg[1],seg[3])-.7,Math.max(seg[0],seg[2])+.7,Math.max(seg[1],seg[3])+.7)){silk.push(...seg);mark(Math.min(seg[0],seg[2])-.7,Math.min(seg[1],seg[3])-.7,Math.max(seg[0],seg[2])+.7,Math.max(seg[1],seg[3])+.7)}
  }
  if(L<9)continue;
  const size=L>=22?7:L>=13?5.6:4.8,tw=q.ref.length*size*WIDE/2+2,th=size/2+2,cx=(x0+x1)/2,cy=(y0+y1)/2;
  const spots:[number,number][]=q.axis?[[x1+tw+1.5,cy],[x0-tw-1.5,cy],[cx,y0-th-1.5],[cx,y1+th+1.5]]:[[cx,y0-th-1.5],[cx,y1+th+1.5],[x1+tw+1.5,cy],[x0-tw-1.5,cy]];
  for(const [x,y] of spots)if(place(q.ref,x,y,size,0)){named++;break}
 }
 log(`labels: ${placed}/${wants.length} wanted (${lost.length?'no room for '+lost.join(', '):'all placed'}), ${named} designators, ${silk.length/4} side lines`);
 return {traces,vias,labels,silk,fingerprint};
}
