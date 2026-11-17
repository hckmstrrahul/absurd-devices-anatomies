// Trace Ember's small components, print and routing from its reference image.
//   node scripts/devices/trace-ember.mjs
// Reads assets/board-2-reference.png and writes three generated files into web/src/ember/:
//   traced-mask.png  same size as the reference. R = routing (faint lines a little paler than the bare board, from local
//                    contrast against a blurred copy), G = print strength (pads, silk-screen, anything small and bright),
//                    B = warmth of that print (0 white … 255 orange). Values are quantised so the file stays small.
//                    Inside the core window, R is the glowing circuit lines instead.
//   traced.ts        every compact bright blob as a rectangle: x0, y0, w, h (reference pixels), mean colour, class;
//                    plus class 'body': the dark body found between two matching bright ends, and class 'chip':
//                    the dark package found between two facing rows of leads.
//   routed.ts       the board's routing, vias, labels and silk lines, found by web/src/ember/route.ts from the vector
//                    board in pcb.ts (which is built from traced.ts and layout.ts). `--route` redoes only this step;
//                    run it after any change to layout.ts, pcb.ts or route.ts.
// The tracing step knows nothing of the layout: the device drops whatever falls on a modelled part (layout.ts `blocked`) and paints
// the mask out under those parts when it draws the board.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url).pathname,src=root+'assets/board-2-reference.png',out=root+'web/src/ember/';
if(!process.argv.includes('--route')){
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async uri=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const W=img.width,H=img.height,k=document.createElement('canvas');k.width=W;k.height=H;const g=k.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const image=g.getImageData(0,0,W,H),d=image.data,N=W*H;
 const L=new Float32Array(N),M=new Uint8Array(N);
 for(let i=0;i<N;i++){const a=d[i*4+3]<128;L[i]=a?0:.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];M[i]=a?0:Math.max(d[i*4],d[i*4+1],d[i*4+2])}
 // Summed-area table, for local means.
 const S=new Float64Array((W+1)*(H+1));
 for(let y=0;y<H;y++){let row=0;for(let x=0;x<W;x++){row+=L[y*W+x];S[(y+1)*(W+1)+x+1]=S[y*(W+1)+x+1]+row}}
 const mean=(x,y,r)=>{const x0=Math.max(0,x-r),y0=Math.max(0,y-r),x1=Math.min(W,x+r+1),y1=Math.min(H,y+r+1);return (S[y1*(W+1)+x1]-S[y0*(W+1)+x1]-S[y1*(W+1)+x0]+S[y0*(W+1)+x0])/((x1-x0)*(y1-y0))};
 const mask=new Uint8ClampedArray(N*4),CORE=[368,1642,825,2180];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=y*W+x,o=i*4,l=L[i],m=M[i];mask[o+3]=255;
  // Inside the core's glowing window (layout.ts WINDOW) the red channel instead carries the thin bright circuit lines and
  // lettering: whatever stands well above its 15 px neighbourhood. The board print is blanked there anyway.
  if(x>=CORE[0]&&x<CORE[2]&&y>=CORE[1]&&y<CORE[3]){const c=l-mean(x,y,7)-5;if(c>0)mask[o]=Math.min(255,c*3.4)&0xf8;continue}
  // Routing: a pixel on dark board that stands a few levels above its 17 px neighbourhood.
  const near=mean(x,y,8);if(l<74&&near<52){const c=l-near-1.6;if(c>1.4)mask[o]=Math.min(255,c*13)&0xf0}
  // Print: anything bright. Warmth separates white silk-screen from tan, gold and orange pads.
  if(m>96){mask[o+1]=Math.min(255,(m-78)*1.5)&0xf8;mask[o+2]=Math.min(255,Math.max(0,(d[o]-d[o+2])/m/.7)*255)&0xe0}
 }
 // Components: connected bright blobs that fill their bounding box.
 const seen=new Uint8Array(N),stack=new Int32Array(N),parts=[],specks=[],classes={pale:0,tan:0,gold:0,orange:0},bright=i=>M[i]>100;
 for(let s=0;s<N;s++){
  if(seen[s]||!bright(s))continue;
  let top=0,area=0,x0=W,y0=H,x1=0,y1=0,cr=0,cg=0,cb=0;stack[top++]=s;seen[s]=1;
  while(top){
   const i=stack[--top],x=i%W,y=(i-x)/W;area++;cr+=d[i*4];cg+=d[i*4+1];cb+=d[i*4+2];
   if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
   if(x>0&&!seen[i-1]&&bright(i-1)){seen[i-1]=1;stack[top++]=i-1}
   if(x<W-1&&!seen[i+1]&&bright(i+1)){seen[i+1]=1;stack[top++]=i+1}
   if(y>0&&!seen[i-W]&&bright(i-W)){seen[i-W]=1;stack[top++]=i-W}
   if(y<H-1&&!seen[i+W]&&bright(i+W)){seen[i+W]=1;stack[top++]=i+W}
  }
  const w=x1-x0+1,h=y1-y0+1;
  // Big solid bright areas are bodies the device models as geometry (bracket, pipes, housings), not print: drop them from the mask.
  if(area>3500&&area/(w*h)>.3){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*W+x;if(M[i]>96){mask[i*4+1]=0;mask[i*4+2]=0}}continue}
  if(w<=14&&h<=14&&area>=4)specks.push([x0,y0,w,h]);
  if(w>110||h>110||Math.min(w,h)<4||area<22||area/(w*h)<.58)continue;
  const R=Math.round(cr/area),G=Math.round(cg/area),B=Math.round(cb/area),warm=(R-B)/Math.max(R,G,B);
  const cls=warm<.1?'pale':warm<.3?'tan':warm<.58?'gold':'orange';classes[cls]++;
  parts.push([x0,y0,w,h,(R<<16)|(G<<8)|B,['pale','tan','gold','orange'].indexOf(cls)]);
 }
 // Dark bodies: a small part with a dark body shows only as its two bright ends. Two like-sized blobs facing each other
 // across a short gap, with no third in line (that would be a pad row), are taken as one part, and the body is added
 // between them when the gap really is a touch paler than the bare board beside the pair.
 const rect=(x0,y0,x1,y1)=>{x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(W,x1);y1=Math.min(H,y1);if(x1<=x0||y1<=y0)return 0;return (S[y1*(W+1)+x1]-S[y0*(W+1)+x1]-S[y1*(W+1)+x0]+S[y0*(W+1)+x0])/((x1-x0)*(y1-y0))};
 const small=parts.filter(p=>Math.max(p[2],p[3])<=24),bodies=[];let geometric=0;
 for(const axis of [0,1]){
  const along=axis,cross=1-axis;
  const mate=(a,dir)=>small.filter(b=>b!==a&&Math.abs((a[cross]+a[2+cross]/2)-(b[cross]+b[2+cross]/2))<=2.5&&Math.abs(a[2+cross]-b[2+cross])<=4&&Math.abs(a[2+along]-b[2+along])<=5).filter(b=>{const gap=dir>0?b[along]-(a[along]+a[2+along]):a[along]-(b[along]+b[2+along]);return gap>=3&&gap<=Math.max(9,2.4*Math.max(a[2+along],a[2+cross]))});
  for(const a of small){
   const next=mate(a,1);if(next.length!==1||mate(a,-1).length)continue;
   const b=next[0];if(mate(b,1).length||mate(b,-1).length!==1)continue;
   geometric++;
   const g0=a[along]+a[2+along],g1=b[along],c0=Math.min(a[cross],b[cross]),c1=Math.max(a[cross]+a[2+cross],b[cross]+b[2+cross]);
   const inside=axis?rect(c0,g0,c1,g1):rect(g0,c0,g1,c1),beside=axis?(rect(c0-8,g0,c0-3,g1)+rect(c1+3,g0,c1+8,g1))/2:(rect(g0,c0-8,g1,c0-3)+rect(g0,c1+3,g1,c1+8))/2;
   if(inside<beside+2.5||inside>90)continue;
   const box=axis?[c0,g0-1,c1-c0,g1-g0+2]:[g0-1,c0,g1-g0+2,c1-c0],v=Math.round(Math.min(70,inside));
   bodies.push([...box,(v<<16)|(v<<8)|v,4]);
  }
 }
 // Small dark chips: found by their leads. A lead row is four or more small like-sized blobs in a line at an even
 // pitch; two such rows facing each other across a dark gap have a chip body between them.
 const tiny=specks,chips=[];
 for(const axis of [0,1]){
  const along=axis,cross=1-axis,rows=[],used=new Set();
  const sorted=[...tiny].sort((a,b)=>a[cross]-b[cross]||a[along]-b[along]);
  for(const start of sorted){
   if(used.has(start))continue;const row=[start];
   for(;;){
    const last=row[row.length-1],next=tiny.filter(b=>!used.has(b)&&!row.includes(b)&&Math.abs(b[cross]-last[cross])<=2&&Math.abs(b[2+cross]-last[2+cross])<=3&&b[along]>last[along]&&b[along]-last[along]<=18).sort((a,b)=>a[along]-b[along])[0];
    if(!next)break;
    if(row.length>1&&Math.abs((next[along]-last[along])-(row[1][along]-row[0][along]))>2.5)break;
    row.push(next);
   }
   if(row.length>=4){row.forEach(b=>used.add(b));const last=row[row.length-1];rows.push({a0:row[0][along],a1:last[along]+last[2+along],c0:Math.min(...row.map(b=>b[cross])),c1:Math.max(...row.map(b=>b[cross]+b[2+cross])),n:row.length})}
  }
  for(let i=0;i<rows.length;i++)for(let j=0;j<rows.length;j++){
   const r=rows[i],q=rows[j];if(q.c0<=r.c1)continue;const gap=q.c0-r.c1;
   if(gap<12||gap>80||Math.abs(r.a0-q.a0)>6||Math.abs(r.a1-q.a1)>6)continue;
   if(rows.some(o=>o!==r&&o!==q&&o.c0>r.c1&&o.c1<q.c0&&o.a0<r.a1&&o.a1>r.a0))continue;
   const a0=Math.min(r.a0,q.a0)-1,a1=Math.max(r.a1,q.a1)+1,inside=axis?rect(r.c1+1,a0,q.c0-1,a1):rect(a0,r.c1+1,a1,q.c0-1);
   if(inside>62)continue;
   const v=Math.round(Math.max(30,Math.min(70,inside))),box=axis?[r.c1+1,a0,gap-2,a1-a0]:[a0,r.c1+1,a1-a0,gap-2];
   chips.push([...box,(v<<16)|(v<<8)|v,5]);
  }
 }
 classes.body=bodies.length;classes.chip=chips.length;parts.push(...bodies,...chips);
 g.putImageData(new ImageData(mask,W,H),0,0);
 return {png:k.toDataURL('image/png').split(',')[1],parts,classes,geometric,size:[W,H]};
},'data:image/png;base64,'+readFileSync(src).toString('base64'));
writeFileSync(out+'traced-mask.png',Buffer.from(r.png,'base64'));
writeFileSync(out+'traced.ts',`// GENERATED by scripts/devices/trace-ember.mjs from assets/board-2-reference.png. Do not edit by hand.
// Each row is one compact bright blob in the reference: x0, y0, width, height (reference pixels), mean colour, class.
export const TRACED_CLASSES=['pale','tan','gold','orange','body','chip'] as const;
export const TRACED:readonly (readonly [number,number,number,number,number,number])[]=[
${r.parts.map(p=>`[${p.slice(0,4).join(',')},0x${p[4].toString(16).padStart(6,'0')},${p[5]}]`).join(',\n')},
];
`);
console.log('image',r.size.join('x'),'rows',r.parts.length,JSON.stringify(r.classes),'end pairs by shape',r.geometric);
await browser.close();
}

// Routing. The modules are TypeScript, so they are loaded through Vite (no server is started, nothing listens).
{
 const {createServer}=await import('../../web/node_modules/vite/dist/node/index.js');
 const server=await createServer({root:root+'web',configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true,hmr:false,watch:null,ws:false},optimizeDeps:{noDiscovery:true,include:[]}});
 try{
  const {route}=await server.ssrLoadModule('/src/ember/route.ts'),t=Date.now(),r=route(s=>console.log(s));
  const flat=a=>a.map(v=>Math.round(v*10)/10).join(',');
  writeFileSync(out+'routed.ts',`// GENERATED by scripts/devices/trace-ember.mjs (web/src/ember/route.ts). Do not edit by hand.
// Reference pixels (0.1 mm). TRACES: width, then x, y pairs. VIAS: x, y, diameter. SILK: x0, y0, x1, y1. LABELS: x, y, size, turned, text.
export const FINGERPRINT=${r.fingerprint};
export const TRACES:readonly (readonly number[])[]=[
${r.traces.map(t=>'['+flat(t)+']').join(',\n')},
];
export const VIAS:readonly number[]=[${flat(r.vias)}];
export const SILK:readonly number[]=[${flat(r.silk)}];
export const LABELS:readonly (readonly [number,number,number,number,string])[]=[
${r.labels.map(l=>JSON.stringify(l)).join(',\n')},
];
`);
  console.log('routed in',((Date.now()-t)/1000).toFixed(1),'s');
 }finally{await server.close()}
}
