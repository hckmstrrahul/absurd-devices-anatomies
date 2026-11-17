// Measure the Console reference image as a PLACEMENT GUIDE: where deck print, panel grooves, thin red/orange wires and small
// hardware sit, and in which ink. The page no longer shows any of this. The reference's small print is garbled glyph fragments,
// so the deck print is authored as vectors (web/src/console/print.ts) and the leads are authored terminal to terminal
// (web/src/console/wiring.ts); this script only tells an author where the reference has a label block, a rule or an outline.
//   node scripts/devices/trace-console.mjs [--out=shots/console/trace-guide]
// Reads assets/board-3-reference.png and web/src/console/layout.ts (for the regions covered by modelled parts), and writes
//   <out>.png        the reference with the classified print, wires and hardware drawn over it
//   <out>-mask.png   the print classes alone (pale, orange, groove, yellow)
//   <out>.json       hardware blobs [x, y, w, h, class] and wire centre lines, in reference pixels
// Every class is judged against a blurred local background, because the reference has light and shadow streaks across it.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {footprints,RUNS,LOOM,RAIL,LEFT_STRIP,CARD,MM,PX,DISC,loom} from '../../web/src/console/layout.ts';

const flags=Object.fromEntries(process.argv.slice(2).filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('=')));
const root=new URL('../../',import.meta.url).pathname;
// Regions the 3D model covers. `pad` grows each shape; print is not traced there.
const {trunk,fan}=loom();
const shapes={
 foot:footprints.filter(f=>f.kind!=='rail'&&f.kind!=='strip'&&f.kind!=='disc').map(f=>f.r!==undefined?{c:[f.x,f.y,f.r]}:{r:[f.x-f.w/2,f.y-f.h/2,f.w,f.h]}),
 runs:RUNS.map(r=>({p:r.pts,w:r.r*2+(r.kind==='hose'?8:10)})),
 loom:[...trunk.map(t=>({p:t.pts,w:LOOM.r*2+6})),...fan.map(p=>({p,w:22}))],
 black:[],
 fixed:[{r:[RAIL.x0-4,RAIL.y0-10,PX.w-RAIL.x0+4,RAIL.y1-RAIL.y0+20]},{r:[LEFT_STRIP.x0-8,LEFT_STRIP.y0-6,LEFT_STRIP.x1-LEFT_STRIP.x0+14,LEFT_STRIP.y1-LEFT_STRIP.y0+12]},{r:[1158,395,150,375]},{r:[1285,872,240,190]},
  // The raised disc's rim: its edge highlight is not print. (A closed polyline stroked 18 px wide.)
  {p:Array.from({length:65},(_,i)=>[DISC.x+Math.cos(i/64*Math.PI*2)*DISC.r,DISC.y+Math.sin(i/64*Math.PI*2)*DISC.r]),w:18}],
 card:{w:PX.w,h:PX.h,r:CARD.r/MM},
};

const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const out=await page.evaluate(async({uri,shapes})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const W=img.width,H=img.height,N=W*H;
 const make=(w=W,h=H)=>{const k=document.createElement('canvas');k.width=w;k.height=h;return k};
 const src=make(),sg=src.getContext('2d',{willReadFrequently:true});sg.drawImage(img,0,0);const px=sg.getImageData(0,0,W,H).data;

 // ── Exclusion masks, drawn from the layout ──
 const mask=(pad,groups)=>{
  const k=make(),g=k.getContext('2d',{willReadFrequently:true});g.fillStyle='#fff';g.fillRect(0,0,W,H);
  // Outside the rounded card, and a margin inside its edge.
  g.globalCompositeOperation='destination-out';g.beginPath();g.roundRect(16,16,W-32,H-32,shapes.card.r+36);g.fill();g.globalCompositeOperation='source-over';
  g.fillStyle=g.strokeStyle='#fff';g.lineCap=g.lineJoin='round';
  for(const name of groups)for(const s of shapes[name]){
   if(s.c){g.beginPath();g.arc(s.c[0],s.c[1],s.c[2]+pad,0,Math.PI*2);g.fill()}
   else if(s.r){g.beginPath();g.roundRect(s.r[0]-pad,s.r[1]-pad,s.r[2]+pad*2,s.r[3]+pad*2,6);g.fill()}
   else{g.beginPath();s.p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.lineWidth=s.w+pad*2;g.stroke()}
  }
  const d=g.getImageData(0,0,W,H).data,m=new Uint8Array(N);for(let i=0;i<N;i++)m[i]=d[i*4+3]>127&&d[i*4]>127?1:0;return m;
 };
 const exPrint=mask(7,['foot','runs','loom','black','fixed']),exWire=mask(3,['foot','runs','loom','fixed']),exHard=mask(10,['foot','runs','loom','black','fixed']);

 // ── Luminance and a local background that ignores bright print ──
 const lum=new Float32Array(N),sat=new Float32Array(N);
 for(let i=0;i<N;i++){const r=px[i*4],g=px[i*4+1],b=px[i*4+2];lum[i]=.299*r+.587*g+.114*b;sat[i]=Math.max(r,g,b)-Math.min(r,g,b)}
 const blur=(a,rad)=>{
  const tmp=new Float32Array(N),o=new Float32Array(N);
  for(let y=0;y<H;y++){let s=0,n=0;for(let x=-rad;x<W+rad;x++){const xi=x+rad,xo=x-rad-1;if(xi<W){s+=a[y*W+xi];n++}if(xo>=0){s-=a[y*W+xo];n--}if(x>=0&&x<W)tmp[y*W+x]=s/n}}
  for(let x=0;x<W;x++){let s=0,n=0;for(let y=-rad;y<H+rad;y++){const yi=y+rad,yo=y-rad-1;if(yi<H){s+=tmp[yi*W+x];n++}if(yo>=0){s-=tmp[yo*W+x];n--}if(y>=0&&y<H)o[y*W+x]=s/n}}
  return o;
 };
 const b1=blur(blur(lum,18),18),clampd=new Float32Array(N);for(let i=0;i<N;i++)clampd[i]=Math.min(lum[i],b1[i]*1.15);
 const bg=blur(blur(clampd,14),14);

 // ── Pixel classes ──
 const orange=new Uint8Array(N),red=new Uint8Array(N),yline=new Uint8Array(N),pale=new Float32Array(N),dark=new Uint8Array(N),metal=new Uint8Array(N),blue=new Uint8Array(N),yellow=new Uint8Array(N);
 for(let i=0;i<N;i++){
  const r=px[i*4],g=px[i*4+1],b=px[i*4+2],L=lum[i],B=bg[i];
  // Orange and red are judged by chroma, not brightness, so line work in the shaded bands still counts.
  // Wires are red (little green, green close to blue); printed lines are orange.
  if(r-b>32&&r-g>15&&r>B*1.08+6&&g<r*.8){if(g<r*.47||g-b<12)red[i]=1;else orange[i]=1}
  else if(b>105&&b>r*1.45&&b>g*1.08)blue[i]=1;
  else if(r>205&&g>150&&b<120&&g>r*.68)yellow[i]=1;
  // Thin yellow line work (the links beside the button column): yellow by chroma against the local background.
  if(!orange[i]&&!red[i]&&r-b>34&&g>=r*.8&&g-b>26&&r>B*1.08+6)yline[i]=1;
  if(!orange[i]&&!red[i]&&!yline[i]&&sat[i]<46){const v=(L-B*1.22-10)/(B*.42+16);if(v>0)pale[i]=Math.min(1,v)}
  if(sat[i]<40&&L>150&&L>B*1.5)metal[i]=1;
  if(L<B*.5-2&&sat[i]<36)dark[i]=1;
 }
 const erode=(m,rad)=>{const o=new Uint8Array(N);for(let y=rad;y<H-rad;y++)for(let x=rad;x<W-rad;x++){let ok=1;for(let dy=-rad;dy<=rad&&ok;dy++)for(let dx=-rad;dx<=rad;dx++)if(!m[(y+dy)*W+x+dx]){ok=0;break}o[y*W+x]=ok}return o};
 const dilate=(m,rad)=>{const o=new Uint8Array(N);for(let y=rad;y<H-rad;y++)for(let x=rad;x<W-rad;x++)if(m[y*W+x])for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++)o[(y+dy)*W+x+dx]=1;return o};
 // Connected components (8-neighbour) with bounding box, area and mean colour.
 const components=(m,min=1)=>{
  const label=new Int32Array(N),list=[],stack=new Int32Array(N);let id=0;
  for(let s=0;s<N;s++){
   if(!m[s]||label[s])continue;id++;let top=0;stack[top++]=s;label[s]=id;
   const c={id,area:0,x0:W,y0:H,x1:0,y1:0,sx:0,sy:0,r:0,g:0,b:0,pix:[]};
   while(top){const i=stack[--top],x=i%W,y=(i-x)/W;c.area++;c.sx+=x;c.sy+=y;c.r+=px[i*4];c.g+=px[i*4+1];c.b+=px[i*4+2];c.pix.push(i);
    if(x<c.x0)c.x0=x;if(x>c.x1)c.x1=x;if(y<c.y0)c.y0=y;if(y>c.y1)c.y1=y;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(m[j]&&!label[j]){label[j]=id;stack[top++]=j}}}
   if(c.area>=min){c.w=c.x1-c.x0+1;c.h=c.y1-c.y0+1;c.cx=c.sx/c.area;c.cy=c.sy/c.area;c.fill=c.area/(c.w*c.h);c.rgb=[c.r/c.area,c.g/c.area,c.b/c.area].map(Math.round);list.push(c)}
  }
  return list;
 };

 // ── Orange: split thick strokes (wires, caps) from thin printed line work ──
 // Components of everything orange or red are judged whole: mostly red, or mostly thick, means a wire (or a cap, if compact);
 // anything else is thin printed line work, whose dim edges may read as red pixel by pixel.
 const thick=dilate(erode(orange,3),4),wireMask=new Uint8Array(N),orangePrint=new Uint8Array(N),warm=new Uint8Array(N);
 for(let i=0;i<N;i++)warm[i]=(red[i]||orange[i])&&!exWire[i]?1:0;
 const hardware=[],wires=[];
 const hard=(c,cls)=>hardware.push({x:Math.round(c.cx),y:Math.round(c.cy),w:c.w,h:c.h,cls,rgb:c.rgb});
 const compact=(c,fill=.6,aspect=2.6)=>c.fill>fill&&Math.max(c.w,c.h)/Math.min(c.w,c.h)<aspect;
 for(const c of components(warm,6)){
  let nRed=0,nThick=0;for(const i of c.pix){if(red[i])nRed++;else if(thick[i])nThick++}
  const long=Math.max(c.w,c.h);
  if(c.area>90&&c.area<2600&&compact(c,.62,2.2)&&Math.min(c.w,c.h)>8){hard(c,c.rgb[1]/c.rgb[0]>.45?'orange':'red');continue}
  if(long>=40&&c.area>=70&&(nRed/c.area>.5||nThick/c.area>.5)&&c.area/long<=26){for(const i of c.pix)wireMask[i]=1;c.tone=nRed/c.area>.5?'red':'orange';wires.push(c);continue}
  if(nRed/c.area>.5&&long<40)continue;
  for(const i of c.pix)if(!exPrint[i])orangePrint[i]=1;
 }
 // Skeletonise each wire component (Zhang–Suen) and take its longest paths.
 const skel=new Uint8Array(N);for(const c of wires)for(const i of c.pix)skel[i]=1;
 {let changed=true;const at=(x,y)=>skel[y*W+x];
  while(changed){changed=false;for(const pass of [0,1]){const kill=[];
   for(const c of wires)for(const i of c.pix){if(!skel[i])continue;const x=i%W,y=(i-x)/W;if(x<1||y<1||x>=W-1||y>=H-1)continue;
    const p=[at(x,y-1),at(x+1,y-1),at(x+1,y),at(x+1,y+1),at(x,y+1),at(x-1,y+1),at(x-1,y),at(x-1,y-1)];
    const n=p.reduce((a,v)=>a+v,0);if(n<2||n>6)continue;let t=0;for(let k=0;k<8;k++)if(!p[k]&&p[(k+1)%8])t++;if(t!==1)continue;
    if(pass===0?(p[0]*p[2]*p[4]||p[2]*p[4]*p[6]):(p[0]*p[2]*p[6]||p[0]*p[4]*p[6]))continue;kill.push(i)}
   for(const i of kill)skel[i]=0;if(kill.length)changed=true}}}
 const polylines=[];
 const rdp=(pts,eps)=>{if(pts.length<3)return pts;const [a,b]=[pts[0],pts[pts.length-1]];let far=0,idx=0;const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
  for(let i=1;i<pts.length-1;i++){const d=Math.abs((b[0]-a[0])*(a[1]-pts[i][1])-(a[0]-pts[i][0])*(b[1]-a[1]))/len;if(d>far){far=d;idx=i}}
  return far>eps?[...rdp(pts.slice(0,idx+1),eps).slice(0,-1),...rdp(pts.slice(idx),eps)]:[a,b]};
 const prev=new Int32Array(N).fill(-1),seen=new Int32Array(N);let stamp=0;
 const farthest=start=>{stamp++;const q=[start];seen[start]=stamp;prev[start]=-1;let last=start;
  for(let h=0;h<q.length;h++){const i=q[h];last=i;const x=i%W,y=(i-x)/W;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=(y+dy)*W+x+dx;if(skel[j]&&seen[j]!==stamp){seen[j]=stamp;prev[j]=i;q.push(j)}}}
  return last};
 // Mean stroke width separates wires (5 px and up) from printed outlines that read red in the shaded bands (about 3 px).
 for(const c of wires){let n=0;for(const i of c.pix)if(skel[i])n++;c.width=c.area/Math.max(1,n);if(c.width<4.3){c.print=true;for(const i of c.pix){skel[i]=0;wireMask[i]=0;if(!exPrint[i])orangePrint[i]=1}}}
 for(const c of wires){
  if(c.print)continue;
  const thicknessOf=c.area;let total=0;const found=[];
  for(let round=0;round<6;round++){
   const seed=c.pix.find(i=>skel[i]);if(seed===undefined)break;
   const a=farthest(seed),bEnd=farthest(a),path=[];for(let i=bEnd;i!==-1;i=prev[i])path.push(i);
   // Remove the path (and its near neighbours) so a branch can be picked up next round.
   for(const i of path){const x=i%W,y=(i-x)/W;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)skel[(y+dy)*W+x+dx]=0}
   if(path.length<26){if(round===0)break;continue}
   total+=path.length;found.push(path);
  }
  const radius=Math.max(2.2,Math.min(5,thicknessOf/Math.max(1,total)/2));
  // A thin stroke made almost entirely of long horizontal and vertical runs is a printed outline, not a wire.
  {let aligned=0,all=0;for(const path of found){const pts=rdp(path.filter((_,k)=>k%3===0||k===path.length-1).map(i=>[i%W,Math.floor(i/W)]),1.6);
    for(let k=1;k<pts.length;k++){const dx=Math.abs(pts[k][0]-pts[k-1][0]),dy=Math.abs(pts[k][1]-pts[k-1][1]),len=Math.hypot(dx,dy);all+=len;if(len>40&&Math.min(dx,dy)/len<.07)aligned+=len}}
   if(radius<3&&all>100&&aligned/all>.8){for(const i of c.pix){wireMask[i]=0;if(!exPrint[i])orangePrint[i]=1}c.print=true;continue}}
  for(const path of found){const pts=rdp(path.filter((_,k)=>k%3===0||k===path.length-1).map(i=>[i%W,Math.floor(i/W)]),1.6);
   polylines.push({c:c.tone,r:Math.round(radius*10)/10,pts,len:path.length})}
 }

 // ── Small hardware from the other classes ──
 for(const c of components(blue,14))if(!exHard[Math.round(c.cy)*W+Math.round(c.cx)]&&c.area<1500)hard(c,'blue');
 for(const c of components(yellow,20))if(!exHard[Math.round(c.cy)*W+Math.round(c.cx)]&&c.area<900)hard(c,'amber');
 const metalFree=new Uint8Array(N);for(let i=0;i<N;i++)metalFree[i]=metal[i]&&!exHard[i]?1:0;
 const paleCut=new Uint8Array(N);
 for(const c of components(erode(metalFree,1),18)){if(c.area>2200||!compact(c,.68,1.7)||Math.min(c.w,c.h)<6)continue;hard({...c,w:c.w+2,h:c.h+2},'metal');for(let y=c.y0-3;y<=c.y1+3;y++)for(let x=c.x0-3;x<=c.x1+3;x++)paleCut[y*W+x]=1}
 const darkFree=new Uint8Array(N);for(let i=0;i<N;i++)darkFree[i]=dark[i]&&!exHard[i]?1:0;
 const darkCore=erode(darkFree,3);
 for(const c of components(darkCore,40)){if(c.area>3200||!compact(c,.72,2.6)||Math.min(c.w,c.h)<8)continue;hard({...c,w:c.w+6,h:c.h+6},'dark')}

 // ── Grooves: thin dark lines on the bare deck ──
 const groove=new Uint8Array(N);{const wide=dilate(erode(darkFree,2),3);for(let i=0;i<N;i++)groove[i]=darkFree[i]&&!wide[i]?1:0}
 // Drop specks: grooves and print strokes are connected runs.
 const keep=(m,min)=>{const o=new Uint8Array(N);for(const c of components(m,min))if(Math.max(c.w,c.h)>=min/2)for(const i of c.pix)o[i]=1;return o};
 const grooveKeep=keep(groove,26),orangeKeep=keep(orangePrint,7);
 const yThin=new Uint8Array(N);{const wide=dilate(erode(yline,3),4);for(let i=0;i<N;i++)yThin[i]=yline[i]&&!wide[i]&&!exPrint[i]?1:0}
 const yKeep=keep(yThin,10);
 const paleBin=new Uint8Array(N);for(let i=0;i<N;i++)paleBin[i]=pale[i]>.3&&!exPrint[i]&&!paleCut[i]?1:0;
 // Big solid pale blobs are highlights on unmodelled parts, not print.
 for(const c of components(paleBin,700))if(c.fill>.5&&Math.min(c.w,c.h)>22)for(const i of c.pix)paleBin[i]=0;
 const paleKeep=keep(paleBin,5);const paleNear=dilate(paleKeep,1);

 // ── Outputs ──
 const mk=make(),mg=mk.getContext('2d'),md=mg.createImageData(W,H);let counts={orange:0,pale:0,groove:0,yellow:0};
 for(let i=0;i<N;i++){
  const chroma=((px[i*4]-px[i*4+2])/(px[i*4]+10)-.2)/.22,o=orangeKeep[i]?Math.round(Math.max(.25,Math.min(1,chroma))*255):0,p=paleNear[i]&&!exPrint[i]&&!paleCut[i]?Math.round(Math.min(1,pale[i]*1.25)*255):0,gv=yKeep[i]?255:grooveKeep[i]?100:0;
  md.data[i*4]=o;md.data[i*4+1]=p;md.data[i*4+2]=gv;md.data[i*4+3]=255;if(o)counts.orange++;if(p>80)counts.pale++;if(gv===100)counts.groove++;if(gv===255)counts.yellow++;
 }
 mg.putImageData(md,0,0);
 // Debug sheet: classes drawn over a dimmed reference.
 const dk=make(),dg=dk.getContext('2d');dg.drawImage(img,0,0);dg.fillStyle='rgba(0,0,0,.72)';dg.fillRect(0,0,W,H);
 const od=dg.getImageData(0,0,W,H);for(let i=0;i<N;i++){const d=od.data;if(md.data[i*4]){d[i*4]=255;d[i*4+1]=120;d[i*4+2]=20}else if(md.data[i*4+1]>60){d[i*4]=d[i*4+1]=d[i*4+2]=md.data[i*4+1]}else if(md.data[i*4+2]===255){d[i*4]=255;d[i*4+1]=240;d[i*4+2]=0}else if(md.data[i*4+2]){d[i*4]=40;d[i*4+1]=90;d[i*4+2]=255}}
 dg.putImageData(od,0,0);
 dg.lineWidth=3;for(const w of polylines){dg.strokeStyle=w.c==='red'?'#ff2060':'#ffd000';dg.beginPath();w.pts.forEach(([x,y],i)=>i?dg.lineTo(x,y):dg.moveTo(x,y));dg.stroke()}
 dg.lineWidth=2;for(const h of hardware){dg.strokeStyle={metal:'#00ffa0',blue:'#40a0ff',amber:'#ffff00',red:'#ff4040',orange:'#ff9040',dark:'#c060ff'}[h.cls];dg.strokeRect(h.x-h.w/2,h.y-h.h/2,h.w,h.h)}
 // Class bytes for the packed mask.
 const cls=new Uint8Array(N);for(let i=0;i<N;i++){const o=md.data[i*4],p=md.data[i*4+1],k=md.data[i*4+2];cls[i]=k===255?255:o?129+Math.round(o/255*99):p>12?1+Math.round(p/255*119):k?250:0}
 let bin='';for(let i=0;i<N;i+=8192)bin+=String.fromCharCode(...cls.subarray(i,i+8192));
 return {mask:mk.toDataURL('image/png'),cls:btoa(bin),size:[W,H],debug:dk.toDataURL('image/png'),hardware,polylines:polylines.map(({len,...w})=>w),counts};
},{uri:'data:image/png;base64,'+readFileSync(root+'assets/board-3-reference.png').toString('base64'),shapes});
await browser.close();

const png=d=>Buffer.from(d.split(',')[1],'base64');
const base=flags.out??'shots/console/trace-guide';
writeFileSync(base+'.png',png(out.debug));writeFileSync(base+'-mask.png',png(out.mask));
const byClass={};for(const h of out.hardware)byClass[h.cls]=(byClass[h.cls]??0)+1;
writeFileSync(base+'.json',JSON.stringify({size:out.size,counts:out.counts,hardware:out.hardware,wires:out.polylines},null,1));
console.log('guide written to',base,'| mask pixels',JSON.stringify(out.counts),'| hardware',out.hardware.length,JSON.stringify(byClass),'| wires',out.polylines.length);
