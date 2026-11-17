// Trace Verdant's small components from its reference image, then route the board's copper as vectors.
//   node scripts/devices/trace-verdant.mjs [--print-only] [--preview=x,y,w,h[,scale]]...
// Step 1 (skipped by --print-only) measures the reference: where small parts sit, their kind and colour.
// Step 2 runs web/src/verdant/router.ts over the lands in web/src/verdant/print.ts and writes web/src/verdant/routed.ts.
// --preview paints a window of the finished print (reference pixels) to shots/verdant/print-<x>-<y>.png with the page's own painter.
// Reads  assets/board-1-reference.png (1605 × 2589) and, when present, docs/verdant/reference-centre.png
//        (a sharper crop of the middle of the same picture; it is registered on the lime cover and laid over the reference).
// Writes shots/verdant/traced-mask.png    red = copper under mask, green = pads and tinned metal, blue = silkscreen (for checking only; the page no longer shows it)
//        web/src/verdant/traced.ts        component rectangles in reference pixels
//        web/src/verdant/routed.ts        copper traces, vias and the pulse routes
//        shots/verdant/trace-debug.png    the classification drawn over the source, for checking by eye
// Everything is measured at the board texture's resolution (4096 px on the long side, 1.582 × the reference).
// Areas covered by parts that are modelled as geometry are skipped, using the rectangles in web/src/verdant/layout.ts.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),at=p=>resolve(root,p);
const esbuild=createRequire(at('web/package.json'))('esbuild');
// The layout is TypeScript; bundle it in memory to read its rectangles. `spots` there depends on traced.ts, which is left out here.
const bundled=await esbuild.build({entryPoints:[at('web/src/verdant/layout.ts')],bundle:true,format:'esm',write:false,logLevel:'silent',
 plugins:[{name:'no-traced',setup(b){b.onResolve({filter:/\/traced$/},()=>({path:'traced',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:'export const TRACED=[];export const TRACED_ICS=[];',loader:'js'}))}}]});
const tmp=at('shots/verdant/.layout.mjs');mkdirSync(dirname(tmp),{recursive:true});writeFileSync(tmp,bundled.outputFiles[0].text);
const L=await import(pathToFileURL(tmp).href+'?'+Date.now());
const uri=p=>'data:image/png;base64,'+readFileSync(p).toString('base64');
const flags=process.argv.slice(2);
if(!flags.includes('--print-only')){
const centre=at('docs/verdant/reference-centre.png');
// Shapes that hide the board. Footprints first; then hoses, cables and the pressed bracket as thick lines; then whole regions.
const cover={
 rects:L.footprints.filter(f=>!f.on).map(f=>({b:f.b,round:!!f.round})),
 lines:[...L.HOSES.map(h=>({pts:h.pts.map(([x,y])=>[x,y]),w:h.r*2/L.PX+10})),...L.PLATE.map(([x1,y1,x2,y2,w])=>({pts:[[x1,y1],[x2,y2]],w:w+8}))],
 regions:L.TRACE_SKIP,
 // Printed legends are kept as silkscreen but must not be mistaken for parts.
 text:[...L.TEXT_ZONES,...L.SILK.map(s=>{const len=s.t.length*s.s*.66+6,h=s.s*1.2;return s.turn?[s.x-h/2,s.y-len,s.x+h/2,s.y+4]:[s.x-3,s.y-h/2,s.x+len,s.y+h/2]})],
};
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
page.on('console',m=>console.log('  page:',m.text()));
const out=await page.evaluate(async({ref,centre,cover,IMGW,IMGH})=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
 const H=4096,K=H/IMGH,W=Math.round(IMGW*K),N=W*H;
 const make=(w,h)=>{const k=document.createElement('canvas');k.width=w;k.height=h;return [k,k.getContext('2d',{willReadFrequently:true})]};
 const refImg=await load(ref),[srcC,sg]=make(W,H);sg.imageSmoothingQuality='high';sg.drawImage(refImg,0,0,W,H);
 // Register the sharper crop on the lime cover: its bounding box is found in both pictures, which gives scale and offset.
 let registration=null;
 if(centre){
  const cImg=await load(centre);
  const lime=(img,x0,y0,x1,y1)=>{const [k,g]=make(img.width,img.height);g.drawImage(img,0,0);const d=g.getImageData(0,0,img.width,img.height).data,w=img.width;
   const cols=new Int32Array(img.width),rows=new Int32Array(img.height);
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*w+x)*4,r=d[i],gg=d[i+1],b=d[i+2];if(gg>120&&r>80&&r<gg*.92&&b<gg*.55){cols[x]++;rows[y]++}}
   // Edges: where the count of lime pixels crosses half of the plateau.
   const edge=(a,lo,hi)=>{let m=0;for(let i=lo;i<hi;i++)m=Math.max(m,a[i]);const t=m*.5;let s=lo,e=hi-1;while(s<hi&&a[s]<t)s++;while(e>lo&&a[e]<t)e--;
    const sub=(i,dir)=>{const p=a[i-dir],q=a[i];return i-dir*(q-t)/Math.max(1,q-p)};return [sub(s,1),sub(e,-1)+1]};
   const [xa,xb]=edge(cols,x0,x1),[ya,yb]=edge(rows,y0,y1);return {xa,xb,ya,yb}};
  const a=lime(refImg,440,1000,1000,1650),b=lime(cImg,150,150,cImg.width-150,cImg.height-100);
  // The side edges are crisp in both pictures, so they set the scale. The top and bottom edges are shaded in the softer reference and read
  // about 2 px short there, so the vertical scale is taken to be the same and only the centre line is matched.
  const sx=(a.xb-a.xa)/(b.xb-b.xa),sy=sx,ox=a.xa-b.xa*sx,oy=(a.ya+a.yb)/2-(b.ya+b.yb)/2*sy;console.log('lime cover ref',JSON.stringify(a),'crop',JSON.stringify(b));
  registration={sx,sy,ox,oy,ref:a,crop:b,box:[ox,oy,ox+cImg.width*sx,oy+cImg.height*sy]};
  // Local refinement: the crop is not an exact scaled copy of the reference, so each cell of a grid is slid a few pixels to where it
  // best matches the reference underneath (least absolute difference of luminance about the cell mean), then laid at that offset.
  const bx=Math.round(ox*K),by=Math.round(oy*K),bw=Math.round(cImg.width*sx*K),bh=Math.round(cImg.height*sy*K);
  const [tC,tg]=make(bw,bh);tg.imageSmoothingQuality='high';tg.drawImage(cImg,0,0,bw,bh);
  const lumOf=d=>{const l=new Float32Array(d.length/4);for(let i=0;i<l.length;i++)l[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;return l};
  const A=lumOf(sg.getImageData(bx,by,bw,bh).data),B=lumOf(tg.getImageData(0,0,bw,bh).data);
  const cells=9,cw=Math.floor(bw/cells),ch=Math.floor(bh/cells),R=6,shifts=[];
  for(let cy=0;cy<cells;cy++)for(let cx=0;cx<cells;cx++){
   const x0=cx*cw,y0=cy*ch;let best=1e18,bd=[0,0],flat=0;
   let mb=0,n=0;for(let y=y0+R;y<y0+ch-R;y+=2)for(let x=x0+R;x<x0+cw-R;x+=2){mb+=B[y*bw+x];n++}mb/=n;
   for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
    let ma=0;for(let y=y0+R;y<y0+ch-R;y+=2)for(let x=x0+R;x<x0+cw-R;x+=2)ma+=A[(y+dy)*bw+x+dx];ma/=n;
    let sad=0;for(let y=y0+R;y<y0+ch-R;y+=2)for(let x=x0+R;x<x0+cw-R;x+=2)sad+=Math.abs(A[(y+dy)*bw+x+dx]-ma-B[y*bw+x]+mb);
    sad+=n*.02*(dx*dx+dy*dy);if(sad<best){best=sad;bd=[dx,dy]}
   }
   shifts.push(bd);
  }
  // A cell that disagrees with all its neighbours has matched noise (the plain cover, for one); take the neighbourhood median instead.
  const med=a=>a.sort((p,q)=>p-q)[a.length>>1],smooth=shifts.map((_,i)=>{const cx=i%cells,cy=(i-cx)/cells,xs=[],ys=[];for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const q=shifts[(cy+j)*cells+cx+k];if(cx+k>=0&&cx+k<cells&&cy+j>=0&&cy+j<cells&&q){xs.push(q[0]);ys.push(q[1])}}return [med(xs),med(ys)]});
  console.log('local shifts (texture px, rows top to bottom):');for(let cy=0;cy<cells;cy++)console.log('   '+smooth.slice(cy*cells,cy*cells+cells).map(q=>q.join(',').padStart(6)).join(' '));
  sg.drawImage(tC,bx,by);
  for(let cy=0;cy<cells;cy++)for(let cx=0;cx<cells;cx++){const [dx,dy]=smooth[cy*cells+cx],w=cx===cells-1?bw-cx*cw:cw,h=cy===cells-1?bh-cy*ch:ch;if(dx||dy)sg.drawImage(tC,cx*cw,cy*ch,w,h,bx+cx*cw+dx,by+cy*ch+dy,w,h)}
 }
 const src=sg.getImageData(0,0,W,H).data;
 // Covered areas.
 const [exC,eg]=make(W,H);eg.scale(K,K);eg.fillStyle='#fff';eg.strokeStyle='#fff';eg.lineCap='round';eg.lineJoin='round';
 const G=3;
 for(const f of cover.rects){const [x0,y0,x1,y1]=f.b;eg.beginPath();if(f.round)eg.arc((x0+x1)/2,(y0+y1)/2,(x1-x0)/2+G,0,7);else eg.roundRect(x0-G,y0-G,x1-x0+G*2,y1-y0+G*2,4);eg.fill()}
 for(const l of cover.lines){eg.lineWidth=l.w;eg.beginPath();l.pts.forEach(([x,y],i)=>i?eg.lineTo(x,y):eg.moveTo(x,y));eg.stroke()}
 for(const [x0,y0,x1,y1] of cover.regions)eg.fillRect(x0,y0,x1-x0,y1-y0);
 const exD=eg.getImageData(0,0,W,H).data,ex=new Uint8Array(N);for(let i=0;i<N;i++)ex[i]=exD[i*4]>100?1:0;
 // Card outline: nothing outside the rounded corners.
 {const [k,g]=make(W,H);g.scale(K,K);g.fillStyle='#fff';g.beginPath();g.roundRect(5,5,IMGW-10,IMGH-10,62);g.fill();const d=g.getImageData(0,0,W,H).data;for(let i=0;i<N;i++)if(d[i*4]<100)ex[i]=1}
 const lum=new Uint8Array(N);for(let i=0;i<N;i++)lum[i]=(src[i*4]*77+src[i*4+1]*150+src[i*4+2]*29)>>8;
 // Square min / max filters, one axis at a time.
 const pass=(a,r,max,horizontal)=>{const o=new Uint8Array(N);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){let v=max?0:255;
   if(horizontal){const lo=Math.max(0,x-r),hi=Math.min(W-1,x+r);for(let k=lo;k<=hi;k++){const q=a[y*W+k];if(max?q>v:q<v)v=q}}
   else{const lo=Math.max(0,y-r),hi=Math.min(H-1,y+r);for(let k=lo;k<=hi;k++){const q=a[k*W+x];if(max?q>v:q<v)v=q}}
   o[y*W+x]=v}return o};
 const erode=(a,r)=>pass(pass(a,r,false,true),r,false,false),dilate=(a,r)=>pass(pass(a,r,true,true),r,true,false);
 const opening=(a,r)=>dilate(erode(a,r),r);
 // Thin bright features are what an opening removes: the white top-hat. Radius about 4 reference pixels.
 const open=opening(lum,Math.round(4*K));
 // The darkest the board gets nearby: where the picture is brightly lit, lit copper can look as pale as print, so the bar for 'pale' rises with it.
 const floor=erode(lum,Math.round(9*K));
 const trace=new Uint8Array(N),pale=new Uint8Array(N),warm=new Uint8Array(N),dark=new Uint8Array(N);
 for(let i=0;i<N;i++){
  if(ex[i])continue;
  const r=src[i*4],g=src[i*4+1],b=src[i*4+2],l=lum[i],hat=l-open[i];
  const isPale=l>Math.max(84,floor[i]*2.2+12)&&r>g*.86&&b>g*.7&&b>r*.5,isWarm=l>62&&r>g*1.04&&b<r*.82;
  // Strengths are graded, not on/off, so edges stay soft where the picture is soft.
  if(isPale)pale[i]=Math.min(255,Math.max(60,(l-70)*4.2));else if(isWarm)warm[i]=Math.min(255,Math.max(90,(l-40)*4));
  else if(g>r*1.12&&g>b*1.2){const need=7+open[i]*.18;if(hat>need)trace[i]=Math.min(255,Math.round((hat-need)*6.5+40))}
  if(l<46&&g<Math.max(r,b)+14)dark[i]=255;
 }
 // Connected regions of a mask, with bounding box and pixel count.
 const label=(mask)=>{const seen=new Uint8Array(N),stack=new Int32Array(N),list=[];
  for(let s=0;s<N;s++){if(!mask[s]||seen[s])continue;let n=0,top=0,x0=W,y0=H,x1=0,y1=0;stack[top++]=s;seen[s]=1;const px=[];
   while(top){const p=stack[--top],x=p%W,y=(p-x)/W;n++;if(px.length<60000)px.push(p);if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=W||yy>=H)continue;const q=yy*W+xx;if(mask[q]&&!seen[q]){seen[q]=1;stack[top++]=q}}}
   list.push({n,x0,y0,x1:x1+1,y1:y1+1,px})}
  return list};
 // Copper: drop specks, which are noise in the mask rather than routing.
 {const bin=new Uint8Array(N);for(let i=0;i<N;i++)bin[i]=trace[i]?1:0;for(const c of label(bin))if(c.n<26&&c.px.length===c.n)for(const p of c.px)trace[p]=0}
 // Pale marks split into solid ones (pads, tinned lands, bodies) and thin ones (silk lines and lettering).
 const paleAll=new Uint8Array(N),paleBin=new Uint8Array(N);for(let i=0;i<N;i++){paleAll[i]=pale[i]||warm[i];paleBin[i]=paleAll[i]?255:0}
 const solid=opening(paleBin,2),pad=new Uint8Array(N),silk=new Uint8Array(N);
 for(let i=0;i<N;i++){if(!paleAll[i])continue;if(solid[i]||!pale[i])pad[i]=paleAll[i];else silk[i]=pale[i]}

 // ── Components ──
 const noPart=new Uint8Array(N);{const [k,g]=make(W,H);g.scale(K,K);g.fillStyle='#fff';for(const [x0,y0,x1,y1] of cover.text)g.fillRect(x0,y0,x1-x0,y1-y0);const d=g.getImageData(0,0,W,H).data;for(let i=0;i<N;i++)noPart[i]=d[i*4]>100?1:0}
 const mean=(x0,y0,x1,y1,skipPale)=>{let s=[0,0,0],n=0;for(let y=Math.max(0,y0|0);y<Math.min(H,y1);y++)for(let x=Math.max(0,x0|0);x<Math.min(W,x1);x++){const i=y*W+x;if(skipPale&&pale[i])continue;s[0]+=src[i*4];s[1]+=src[i*4+1];s[2]+=src[i*4+2];n++}return n?[s[0]/n,s[1]/n,s[2]/n,n]:null};
 const parts=[],ics=[];
 const darker=(x0,y0,x1,y1)=>{const px=[];for(let y=Math.max(0,Math.round(y0));y<Math.min(H,y1);y++)for(let x=Math.max(0,Math.round(x0));x<Math.min(W,x1);x++)px.push(y*W+x);if(!px.length)return null;
  px.sort((p,q)=>lum[p]-lum[q]);const n=Math.max(1,Math.round(px.length*.35)),s=[0,0,0];for(let k=0;k<n;k++){const i=px[k]*4;s[0]+=src[i];s[1]+=src[i+1];s[2]+=src[i+2]}return [s[0]/n,s[1]/n,s[2]/n]};
 // Solid pale blobs are either whole bodies (cream, silver, tan) or the two end lands of a small part with its body between them.
 const blobs=[];
 for(const c of label(pad)){
  const x0=c.x0/K,y0=c.y0/K,x1=c.x1/K,y1=c.y1/K,w=x1-x0,h=y1-y0,short=Math.min(w,h),long=Math.max(w,h);
  const fill=c.n/((c.x1-c.x0)*(c.y1-c.y0));if(short<1.7||long>64||short>40||fill<.6)continue;
  if(noPart[Math.round((c.y0+c.y1)/2)*W+Math.round((c.x0+c.x1)/2)])continue;
  blobs.push({x0,y0,x1,y1,w,h,short,long,fill,used:false});
 }
 const classify=(r,g,b)=>{const l=r*.3+g*.59+b*.11;return g>r*1.18&&g>b*1.15?'pad':l<74?'res':r>g*1.1&&b<r*.72?(r>150&&b<r*.5?'gold':'tan'):Math.max(r,g,b)-Math.min(r,g,b)<46?'metal':'tan'};
 const pack=c=>(Math.round(c[0])<<16|Math.round(c[1])<<8|Math.round(c[2]));
 const small=blobs.filter(q=>q.short<7&&q.long<13);
 for(const a of small){
  if(a.used)continue;let best=null,gapBest=9;
  for(const q of small){
   if(q===a||q.used)continue;
   // Side by side, or one above the other, with a body-sized gap and matching size.
   const gx=q.x0-a.x1,oy=Math.min(a.y1,q.y1)-Math.max(a.y0,q.y0),gy=q.y0-a.y1,ox=Math.min(a.x1,q.x1)-Math.max(a.x0,q.x0);
   const horizontal=gx>=.8&&gx<=8&&oy>=Math.min(a.h,q.h)*.65&&Math.max(a.h,q.h)<Math.min(a.h,q.h)*1.7,vertical=gy>=.8&&gy<=8&&ox>=Math.min(a.w,q.w)*.65&&Math.max(a.w,q.w)<Math.min(a.w,q.w)*1.7;
   const gap=horizontal?gx:vertical?gy:9;if(gap<gapBest){gapBest=gap;best={q,horizontal}}
  }
  if(!best)continue;
  const q=best.q;a.used=q.used=true;
  const x0=Math.min(a.x0,q.x0),y0=Math.min(a.y0,q.y0),x1=Math.max(a.x1,q.x1),y1=Math.max(a.y1,q.y1);
  const body=best.horizontal?mean((a.x1+.3)*K,(Math.max(a.y0,q.y0)+.6)*K,(q.x0-.3)*K,(Math.min(a.y1,q.y1)-.6)*K,true):mean((Math.max(a.x0,q.x0)+.6)*K,(a.y1+.3)*K,(Math.min(a.x1,q.x1)-.6)*K,(q.y0-.3)*K,true);
  if(!body)continue;
  parts.push([+x0.toFixed(1),+y0.toFixed(1),+x1.toFixed(1),+y1.toFixed(1),classify(body[0],body[1],body[2]),pack(body),best.horizontal?0:1]);
 }
 for(const a of blobs){
  if(a.used||a.short<3.2||a.long<4.6||a.fill<.72)continue;
  // A wide blob may be a row of parts that touch. Along its long axis the brightness dips at every seam between neighbours;
  // cut there when the dips are regular enough to be seams rather than markings.
  const vertical=a.h>a.w,cuts=[0];
  if(a.long>a.short*1.55&&a.short<=22){
   const n=Math.round(a.long*K),prof=new Float32Array(n);
   for(let k=0;k<n;k++){let sum=0,m=0;for(let j=Math.round(a.short*K*.2);j<a.short*K*.8;j++){const x=Math.round(a.x0*K)+(vertical?j:k),y=Math.round(a.y0*K)+(vertical?k:j);if(x<W&&y<H){sum+=lum[y*W+x];m++}}prof[k]=m?sum/m:0}
   let lo=255,hi=0;for(let k=2;k<n-2;k++){if(prof[k]<lo)lo=prof[k];if(prof[k]>hi)hi=prof[k]}
   const dips=[];for(let k=3;k<n-3;k++)if(prof[k]<hi-(hi-lo)*.45&&hi-lo>26&&prof[k]<=prof[k-1]&&prof[k]<=prof[k+1]&&prof[k]<prof[k-3]-6&&prof[k]<prof[k+3]-6)dips.push(k/K);
   // Keep dips that leave pieces at least 3.5 px long.
   for(const d of dips)if(d-cuts[cuts.length-1]>=3.5&&a.long-d>=3.5)cuts.push(d);
  }
  cuts.push(a.long);
  // Body colour: the darker third of the piece's middle, which is the body between pale ends when there is one, and the whole part when it is uniform.
  for(let k=0;k<cuts.length-1;k++){
   const g=cuts.length>2?.5:0,x0=vertical?a.x0:a.x0+cuts[k]+(k?g:0),x1=vertical?a.x1:a.x0+cuts[k+1]-(k<cuts.length-2?g:0),y0=vertical?a.y0+cuts[k]+(k?g:0):a.y0,y1=vertical?a.y0+cuts[k+1]-(k<cuts.length-2?g:0):a.y1;
   // Large bodies are metal cans whose darkest pixels are slots and shade, so they take their plain mean instead.
   const all=a.short>=10?mean((x0+(x1-x0)*.15)*K,(y0+(y1-y0)*.15)*K,(x1-(x1-x0)*.15)*K,(y1-(y1-y0)*.15)*K,false):darker((x0+(x1-x0)*.15)*K,(y0+(y1-y0)*.15)*K,(x1-(x1-x0)*.15)*K,(y1-(y1-y0)*.15)*K);if(!all)continue;
   const kind=classify(all[0],all[1],all[2]);
   parts.push([+x0.toFixed(1),+y0.toFixed(1),+x1.toFixed(1),+y1.toFixed(1),kind==='pad'?'metal':kind,pack(all),2]);
  }
 }
 // Printed outlines: a small patch of board fully enclosed by pale print is the inside of a part's outline box.
 // The print is thickened by a pixel first, so an outline with a hairline break still encloses its part (this is what separates the dense arrays).
 {const thick=dilate(paleBin,1);
  const has=(cx,cy)=>parts.some(p=>cx>p[0]-1&&cx<p[2]+1&&cy>p[1]-1&&cy<p[3]+1);
  for(const [maskOf,pad] of [[paleBin,.8],[thick,1.4]]){
  const inv=new Uint8Array(N);for(let i=0;i<N;i++)inv[i]=maskOf[i]?0:1;
  for(const c of label(inv)){
   const area=c.n/(K*K);if(area<4||area>300)continue;
   const x0=c.x0/K,y0=c.y0/K,x1=c.x1/K,y1=c.y1/K,w=x1-x0,h=y1-y0,short=Math.min(w,h),long=Math.max(w,h);
   if(short<1.8||long>22||c.n/((c.x1-c.x0)*(c.y1-c.y0))<.72)continue;
   const cx=(x0+x1)/2,cy=(y0+y1)/2;if(ex[Math.round(cy*K)*W+Math.round(cx*K)]||noPart[Math.round(cy*K)*W+Math.round(cx*K)]||has(cx,cy))continue;
   const body=mean(c.x0,c.y0,c.x1,c.y1,true);if(!body)continue;
   parts.push([+(x0-pad).toFixed(1),+(y0-pad).toFixed(1),+(x1+pad).toFixed(1),+(y1+pad).toFixed(1),classify(body[0],body[1],body[2]),pack(body),3]);
  }}}
 // Small dark packages: compact, rectangular, and darker than the board around them.
 for(const c of label(opening(dark,3))){
  const x0=c.x0/K,y0=c.y0/K,x1=c.x1/K,y1=c.y1/K,w=x1-x0,h=y1-y0,short=Math.min(w,h),long=Math.max(w,h);
  if(short<5.5||long>80||long/short>3.2)continue;
  if(c.n/((c.x1-c.x0)*(c.y1-c.y0))<.8)continue;
  const inner=mean(c.x0,c.y0,c.x1,c.y1,false),m=Math.round(5*K);
  let s=0,n=0,covered=0;for(let y=c.y0-m;y<c.y1+m;y++)for(let x=c.x0-m;x<c.x1+m;x++){if(x<0||y<0||x>=W||y>=H)continue;if(x>=c.x0&&x<c.x1&&y>=c.y0&&y<c.y1)continue;n++;s+=lum[y*W+x];if(ex[y*W+x])covered++}
  if(!n||covered/n>.3||s/n<(inner[0]*.3+inner[1]*.59+inner[2]*.11)+16)continue;
  // A package is neutral black or navy; a dark green patch is shadow on the board.
  if(inner[1]>Math.max(inner[0],inner[2])+8)continue;
  // Leads: a side has them when a good share of the strip just outside it is solid pale metal (a printed outline alone does not count).
  const strip=(sx0,sy0,sx1,sy1)=>{let p=0,t=0;for(let y=Math.max(0,Math.round(sy0));y<Math.min(H,sy1);y++)for(let x=Math.max(0,Math.round(sx0));x<Math.min(W,sx1);x++){t++;if(pad[y*W+x])p++}return t?p/t:0};
  const band=4.5*K,share={l:strip(c.x0-band,c.y0,c.x0,c.y1),r:strip(c.x1,c.y0,c.x1+band,c.y1),t:strip(c.x0,c.y0-band,c.x1,c.y0),b:strip(c.x0,c.y1,c.x1,c.y1+band)};
  const sides=Object.entries(share).filter(([,v])=>v>.22).map(([k])=>k).join('');
  ics.push([+x0.toFixed(1),+y0.toFixed(1),+x1.toFixed(1),+y1.toFixed(1),(Math.round(inner[0])<<16|Math.round(inner[1])<<8|Math.round(inner[2])),sides]);
 }
 // A part found inside a dark package is its marking, not a part.
 const inside=(p,q)=>p[0]>=q[0]-2&&p[1]>=q[1]-2&&p[2]<=q[2]+2&&p[3]<=q[3]+2;
 const kept=parts.filter(p=>!ics.some(q=>inside(p,q)));

 // ── Outputs ──
 const [maskC,mg]=make(W,H),md=mg.createImageData(W,H);
 for(let i=0;i<N;i++){md.data[i*4]=trace[i];md.data[i*4+1]=pad[i];md.data[i*4+2]=silk[i];md.data[i*4+3]=255}
 mg.putImageData(md,0,0);
 const [dbgC,dg]=make(W,H),dd=dg.createImageData(W,H);
 for(let i=0;i<N;i++){const k=ex[i]?.25:.45;let r=src[i*4]*k,g=src[i*4+1]*k,b=src[i*4+2]*k;if(trace[i]){r=40;g=255;b=40}if(pad[i]){r=255;g=190;b=40}if(silk[i]){r=120;g=200;b=255}dd.data[i*4]=r;dd.data[i*4+1]=g;dd.data[i*4+2]=b;dd.data[i*4+3]=255}
 dg.putImageData(dd,0,0);dg.lineWidth=1.5;
 const tint={metal:'#fff',tan:'#f80',gold:'#ff0',res:'#f0f',pad:'#8f8'};
 for(const p of kept){dg.strokeStyle=tint[p[4]];dg.strokeRect(p[0]*K,p[1]*K,(p[2]-p[0])*K,(p[3]-p[1])*K)}
 dg.strokeStyle='#f33';for(const p of ics)dg.strokeRect(p[0]*K,p[1]*K,(p[2]-p[0])*K,(p[3]-p[1])*K);
 let tr=0,pd=0,sk=0,free=0;for(let i=0;i<N;i++){if(!ex[i])free++;if(trace[i])tr++;if(pad[i])pd++;if(silk[i])sk++}
 return {source:srcC.toDataURL('image/png'),mask:maskC.toDataURL('image/png'),debug:dbgC.toDataURL('image/png'),parts:kept,ics,registration,size:[W,H],share:{free:free/N,trace:tr/free,pad:pd/free,silk:sk/free}};
},{ref:uri(at('assets/board-1-reference.png')),centre:existsSync(centre)?uri(centre):null,cover,IMGW:L.IMG.w,IMGH:L.IMG.h});
await browser.close();
const png=d=>Buffer.from(d.split(',')[1],'base64');
writeFileSync(at('shots/verdant/traced-mask.png'),png(out.mask));writeFileSync(at('shots/verdant/trace-debug.png'),png(out.debug));writeFileSync(at('shots/verdant/trace-source.png'),png(out.source));
const kinds=['metal','tan','gold','res','pad'];
const rows=out.parts.map(p=>`[${p[0]},${p[1]},${p[2]},${p[3]},${kinds.indexOf(p[4])},0x${p[5].toString(16).padStart(6,'0')},${p[6]}]`);
const icRows=out.ics.map(p=>`[${p[0]},${p[1]},${p[2]},${p[3]},0x${p[4].toString(16).padStart(6,'0')},'${p[5]}']`);
writeFileSync(at('web/src/verdant/traced.ts'),`// GENERATED by scripts/devices/trace-verdant.mjs from assets/board-1-reference.png. Do not edit by hand; run the script again.
// Rectangles are [x0, y0, x1, y1] in reference pixels (0.1 mm each). Measured on a ${out.size[0]} × ${out.size[1]} enlargement.
export const TRACED_KINDS=${JSON.stringify(kinds)} as const;
// Small parts: [x0, y0, x1, y1, kind index, body colour, form]. Form 0 has its end lands left and right, 1 above and below, 2 is a single solid body, 3 is the inside of a printed outline box.
export const TRACED:[number,number,number,number,number,number,number][]=[
${rows.join(',\n')}
];
// Small dark packages: [x0, y0, x1, y1, body colour, sides with leads (l, r, t, b)].
export const TRACED_ICS:[number,number,number,number,number,string][]=[
${icRows.join(',\n')}
];
`);
const by=Object.fromEntries(kinds.map(k=>[k,out.parts.filter(p=>p[4]===k).length]));
console.log('mask',out.size.join('×'),'| free board',(out.share.free*100).toFixed(1)+'%','| of it: copper',(out.share.trace*100).toFixed(1)+'%','pads',(out.share.pad*100).toFixed(1)+'%','silk',(out.share.silk*100).toFixed(1)+'%');
console.log('parts',out.parts.length,JSON.stringify(by),'| dark packages',out.ics.length);
if(out.registration)console.log('centre crop registered: scale',out.registration.sx.toFixed(4),out.registration.sy.toFixed(4),'offset',out.registration.ox.toFixed(1),out.registration.oy.toFixed(1),'covers',out.registration.box.map(v=>Math.round(v)).join(','));
}

// ── Step 2: route the copper. ──
const bundle=async(entry,options={})=>(await esbuild.build({entryPoints:[at(entry)],bundle:true,format:'esm',write:false,logLevel:'silent',...options})).outputFiles[0].text;
{
 const file=at('shots/verdant/.router.mjs');writeFileSync(file,await bundle('web/src/verdant/router.ts'));
 const {routeBoard}=await import(pathToFileURL(file).href+'?'+Date.now()),t0=Date.now(),r=routeBoard();
 writeFileSync(at('web/src/verdant/routed.ts'),`// GENERATED by scripts/devices/trace-verdant.mjs with web/src/verdant/router.ts. Do not edit by hand; run the script again.
// Copper on the top layer, in reference pixels (0.1 mm) on a 0.2 mm lattice. Every segment runs at 0°, 45° or 90°.
// A trace is [width × 10, x, y, x, y, …] and ends on a land or a via. Vias are [x, y, x, y, …]. Pulse routes are [x, y, …] and are also traces.
export const TRACES:number[][]=[
${r.traces.map(t=>'['+t.join(',')+']').join(',\n')}
];
export const VIAS:number[]=[${r.vias.join(',')}];
export const PULSES:number[][]=[
${r.pulses.map(t=>'['+t.join(',')+']').join(',\n')}
];
`);
 console.log('routed in',Date.now()-t0,'ms',JSON.stringify(r.stats));
}
// ── Previews of the finished print. ──
const previews=flags.filter(f=>f.startsWith('--preview=')).map(f=>f.slice(10).split(',').map(Number));
if(previews.length){
 const code=await bundle('web/src/verdant/paint.ts',{format:'iife',globalName:'P',footer:{js:'window.P=P;'},entryPoints:undefined,stdin:{contents:"export * from './paint';export {buildPrint} from './print';",resolveDir:at('web/src/verdant'),loader:'ts'}});
 const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();await page.addScriptTag({content:code});
 const info=await page.evaluate(()=>{const p=window.P.buildPrint();return {pads:p.pads.length,silk:p.silk.length,names:p.names.length,missed:p.missed,count:p.count}});
 console.log('print',JSON.stringify(info));
 for(const [x,y,w,h,k=2.55] of previews){
  const data=await page.evaluate(({x,y,w,h,k})=>{const c=document.createElement('canvas'),s=document.createElement('canvas');c.width=s.width=Math.round(w*k);c.height=s.height=Math.round(h*k);window.P.paintColour(c.getContext('2d'),s,[x,y,x+w,y+h],k,k);return c.toDataURL('image/png')},{x,y,w,h,k});
  const file=at(`shots/verdant/print-${x}-${y}.png`);writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));console.log('wrote',file);
 }
 await browser.close();
}
