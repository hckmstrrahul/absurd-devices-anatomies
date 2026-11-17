// Trace the P5G-MX board print from its top photograph.
//   node scripts/devices/trace-p5gmx.mjs
// Rectifies assets/p5gmx-reference.png onto the 244 × 183 mm board with the same four-corner homography as web/src/p5gmx/layout.ts,
// at 6 px/mm, and writes two generated files into web/src/p5gmx/:
//   traced-mask.png  1464 × 1098. R = copper pour under the mask (the bright ochre areas, 255) against bare laminate (the dark olive, 0),
//                    with silk-screen and parts filled in from their surroundings. G = routing: thin lines a little paler than their
//                    0.7 mm neighbourhood. B = silk-screen and other near-white print.
//   traced.ts        a 2 mm grid of how busy each cell is with small parts (0–9), which places the small-component sheet.
// The device paints parts it models over this, so stray imprints of tall parts under their own bodies do not show.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url).pathname,src=root+'assets/p5gmx-reference.png',out=root+'web/src/p5gmx/';
// Keep in step with layout.ts CORNERS and BOARD.
const CORNERS=[[135,300],[1460,300],[1503,1323],[110,1342]],BW=244,BD=183,K=6,CELL=2;
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async({uri,CORNERS,BW,BD,K,CELL})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const SW=img.width,SH=img.height,k=document.createElement('canvas');k.width=SW;k.height=SH;const g=k.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const sd=g.getImageData(0,0,SW,SH).data;
 // Homography from board (u, v) in mm to photo pixels.
 const solve=(A,b)=>{const n=b.length;for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let j=i+1;j<n;j++){const f=A[j][i]/A[i][i];for(let c=i;c<n;c++)A[j][c]-=f*A[i][c];b[j]-=f*b[i]}}const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x};
 const B=[[0,0],[BW,0],[BW,BD],[0,BD]],A=[],bb=[];
 B.forEach(([u,v],i)=>{const [x,y]=CORNERS[i];A.push([u,v,1,0,0,0,-u*x,-v*x]);bb.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);bb.push(y)});
 const h=solve(A,bb);const map=(u,v)=>{const w=h[6]*u+h[7]*v+1;return [(h[0]*u+h[1]*v+h[2])/w,(h[3]*u+h[4]*v+h[5])/w]};
 const W=BW*K,H=BD*K,N=W*H,R=new Float32Array(N),G=new Float32Array(N),Bl=new Float32Array(N);
 const sample=(x,y,c)=>{const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,at=(xx,yy)=>sd[(Math.min(SH-1,Math.max(0,yy))*SW+Math.min(SW-1,Math.max(0,xx)))*4+c];
  return at(x0,y0)*(1-fx)*(1-fy)+at(x0+1,y0)*fx*(1-fy)+at(x0,y0+1)*(1-fx)*fy+at(x0+1,y0+1)*fx*fy};
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){const [x,y]=map((i+.5)/K,(j+.5)/K),o=j*W+i;R[o]=sample(x,y,0);G[o]=sample(x,y,1);Bl[o]=sample(x,y,2)}
 const L=new Float32Array(N),white=new Float32Array(N),ochre=new Float32Array(N),valid=new Float32Array(N);
 for(let o=0;o<N;o++){
  const r=R[o],g=G[o],b=Bl[o],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?(mx-mn)/mx:0;L[o]=.299*r+.587*g+.114*b;
  // Near-white, unsaturated print: silk-screen, plastics, metal.
  white[o]=Math.min(1,Math.max(0,(L[o]-120)/50))*Math.min(1,Math.max(0,(.45-sat)/.2));
  // Ochre: copper under amber mask reads bright and strongly orange; bare laminate is darker and olive.
  ochre[o]=Math.min(1,Math.max(0,(r-118)/40))*Math.min(1,Math.max(0,(sat-.55)/.2));
  // Board pixels that are neither print nor black parts count toward the pour estimate.
  valid[o]=(1-white[o])*Math.min(1,Math.max(0,(L[o]-40)/25))*Math.min(1,Math.max(0,(sat-.35)/.15));
 }
 // Normalised box blur of a field weighted by `valid`, via summed-area tables.
 const blurW=(f,wt,rad)=>{const S=new Float64Array((W+1)*(H+1)),T=new Float64Array((W+1)*(H+1));
  for(let y=0;y<H;y++){let a=0,c=0;for(let x=0;x<W;x++){const o=y*W+x;a+=f[o]*wt[o];c+=wt[o];S[(y+1)*(W+1)+x+1]=S[y*(W+1)+x+1]+a;T[(y+1)*(W+1)+x+1]=T[y*(W+1)+x+1]+c}}
  const outF=new Float32Array(N);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const x0=Math.max(0,x-rad),y0=Math.max(0,y-rad),x1=Math.min(W,x+rad+1),y1=Math.min(H,y+rad+1);
   const s=S[y1*(W+1)+x1]-S[y0*(W+1)+x1]-S[y1*(W+1)+x0]+S[y0*(W+1)+x0],t=T[y1*(W+1)+x1]-T[y0*(W+1)+x1]-T[y1*(W+1)+x0]+T[y0*(W+1)+x0];outF[y*W+x]=t>.5?s/t:-1}return outF};
 // Pour: ochre smoothed over 1.2 mm of valid board, holes filled from 4 mm and then 12 mm neighbourhoods.
 let pour=blurW(ochre,valid,3);const wide=blurW(ochre,valid,12),wider=blurW(ochre,valid,36);
 for(let o=0;o<N;o++){const cover=valid[o];if(pour[o]<0||cover<.3){const fill=wide[o]>=0?wide[o]:wider[o]>=0?wider[o]:.5;pour[o]=pour[o]<0?fill:pour[o]*cover+fill*(1-cover)}}
 // Routing: thin lines paler than their neighbourhood, on valid board only.
 const ones=new Float32Array(N).fill(1),near=blurW(L,ones,4);
 const img2=new Uint8ClampedArray(N*4);
 for(let o=0;o<N;o++){
  const c=(L[o]-near[o]-2)*valid[o];
  img2[o*4]=Math.round(Math.min(1,Math.max(0,(pour[o]-.3)/.4))*255);
  img2[o*4+1]=Math.round(Math.min(255,Math.max(0,c*14)));
  img2[o*4+2]=Math.round(white[o]*255);img2[o*4+3]=255;
 }
 const oc=document.createElement('canvas');oc.width=W;oc.height=H;oc.getContext('2d').putImageData(new ImageData(img2,W,H),0,0);
 // Busy cells: fraction of white-ish print (small-part silk outlines and terminals) per 2 mm cell, quantised 0–9.
 const CW=Math.round(BW/CELL),CH=Math.round(BD/CELL),busy=[];
 for(let cy=0;cy<CH;cy++){let row='';for(let cx=0;cx<CW;cx++){let s=0,n=0;for(let y=cy*CELL*K;y<(cy+1)*CELL*K;y++)for(let x=cx*CELL*K;x<(cx+1)*CELL*K;x++){s+=white[y*W+x]+.6*Math.max(0,Math.min(1,(L[y*W+x]-150)/60));n++}row+=Math.min(9,Math.round(s/n*22))}busy.push(row)}
 return {png:oc.toDataURL('image/png'),busy,CW,CH};
},{uri:'data:image/png;base64,'+readFileSync(src).toString('base64'),CORNERS,BW,BD,K,CELL});
writeFileSync(out+'traced-mask.png',Buffer.from(r.png.split(',')[1],'base64'));
writeFileSync(out+'traced.ts',`// GENERATED by scripts/devices/trace-p5gmx.mjs from assets/p5gmx-reference.png. Do not edit by hand.
// How busy each ${CELL} mm cell of the board is with small parts in the photograph, 0 (bare) to 9 (crowded), rows from the rear (I/O) edge.
export const BUSY_CELL=${CELL};
export const BUSY:readonly string[]=${JSON.stringify(r.busy,null,0).replace(/","/g,'",\n "')};
`);
console.log('wrote traced-mask.png',r.CW,'x',r.CH,'cells');
await browser.close();
