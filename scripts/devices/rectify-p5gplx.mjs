// Rectify the P5GPL-X SE top photograph to an orthographic board plan, from the four board corners.
//   node scripts/devices/rectify-p5gplx.mjs <in.png> <out.png> <pxPerMm> [x0,y0,x1,y1,x2,y2,x3,y3] [--grid]
// Corners in order: top-left, top-right, bottom-right, bottom-left (photo pixels). The board is 183 × 305 mm.
// --grid overlays a 10 mm grid with labels every 20 mm, for reading positions off the plan.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),grid=args.includes("--grid"),M=Number((args.find(a=>a.startsWith("--margin="))??"--margin=0").split("=")[1]),[src,out,k='5',corners='364,175,1192,132,1372,1480,392,1540']=args.filter(a=>!a.startsWith('--'));
const W=183,H=305,c=corners.split(',').map(Number);
// Homography mapping plan (u,v) in mm to photo (x,y): solve the 8 × 8 system.
function homography(src,dst){
 const A=[],b=[];
 for(let i=0;i<4;i++){const [u,v]=src[i],[x,y]=dst[i];A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y)}
 for(let i=0;i<8;i++){let p=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
  for(let j=i+1;j<8;j++){const f=A[j][i]/A[i][i];for(let q=i;q<8;q++)A[j][q]-=f*A[i][q];b[j]-=f*b[i]}}
 const h=Array(8).fill(0);for(let i=7;i>=0;i--){let s=b[i];for(let q=i+1;q<8;q++)s-=A[i][q]*h[q];h[i]=s/A[i][i]}
 return [...h,1];
}
const Hm=homography([[0,0],[W,0],[W,H],[0,H]],[[c[0],c[1]],[c[2],c[3]],[c[4],c[5]],[c[6],c[7]]]);
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const png=await page.evaluate(async({uri,Hm,W,H,k,grid,M})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const s=document.createElement('canvas');s.width=img.width;s.height=img.height;const sg=s.getContext('2d');sg.drawImage(img,0,0);const sd=sg.getImageData(0,0,s.width,s.height).data;
 const ow=Math.round((W+2*M)*k),oh=Math.round((H+2*M)*k),o=document.createElement('canvas');o.width=ow;o.height=oh;const og=o.getContext('2d'),od=og.createImageData(ow,oh);
 for(let j=0;j<oh;j++)for(let i=0;i<ow;i++){
  const u=(i+.5)/k-M,v=(j+.5)/k-M,w=Hm[6]*u+Hm[7]*v+1,x=(Hm[0]*u+Hm[1]*v+Hm[2])/w,y=(Hm[3]*u+Hm[4]*v+Hm[5])/w;
  const x0=Math.floor(x-.5),y0=Math.floor(y-.5),fx=x-.5-x0,fy=y-.5-y0,q=(j*ow+i)*4;
  for(let ch=0;ch<3;ch++){const p=(xx,yy)=>sd[((Math.min(s.height-1,Math.max(0,yy)))*s.width+Math.min(s.width-1,Math.max(0,xx)))*4+ch];
   od.data[q+ch]=(p(x0,y0)*(1-fx)+p(x0+1,y0)*fx)*(1-fy)+(p(x0,y0+1)*(1-fx)+p(x0+1,y0+1)*fx)*fy}
  od.data[q+3]=255;
 }
 og.putImageData(od,0,0);
 if(grid){og.lineWidth=1;og.font='10px sans-serif';
  for(let mm=0;mm<=Math.max(W,H);mm+=10){og.strokeStyle=mm%50===0?'rgba(0,255,255,.8)':'rgba(0,255,255,.35)';
   og.beginPath();og.moveTo((mm+M)*k,0);og.lineTo((mm+M)*k,oh);og.moveTo(0,(mm+M)*k);og.lineTo(ow,(mm+M)*k);og.stroke();
   if(mm%20===0){og.fillStyle='#0ff';og.fillText(String(mm),(mm+M)*k+2,10);og.fillText(String(mm),2,(mm+M)*k-2)}}}
 return o.toDataURL('image/png');
},{uri:'data:image/png;base64,'+readFileSync(src).toString('base64'),Hm,W,H,k:+k,grid,M});
writeFileSync(out,Buffer.from(png.split(',')[1],'base64'));console.log('wrote',out);
await browser.close();
