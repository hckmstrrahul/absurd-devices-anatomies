// Compare a P5G-MX capture with its photograph in the photograph's own geometry.
//   node scripts/devices/compare-p5gmx.mjs <capture.png> <out> --corners=x0,y0,x1,y1[,x2,y2,x3,y3] [--crop=x,y,w,h] [--scale=1] [--ref=assets/p5gmx-reference.png] [--photo=135,300,1460,300,1503,1323,110,1342]
// `corners` are the board's corners in the capture: rear-left and front-right for a straight top view (a rectangle), or all four
// (rear-left, rear-right, front-right, front-left). The capture is warped onto the photograph's board corners, so features line up
// wherever the model is placed right. Writes <out>-side.png (photograph | capture) and <out>-overlay.png (50 % blend), cropped to `crop`
// (photograph pixels) if given.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('='))),[cap,out]=args.filter(a=>!a.startsWith('--'));
const root=new URL('../../',import.meta.url).pathname,ref=flags.ref??root+'assets/p5gmx-reference.png';
let c=flags.corners.split(',').map(Number);if(c.length===4)c=[c[0],c[1],c[2],c[1],c[2],c[3],c[0],c[3]];
const photo=(flags.photo??'135,300,1460,300,1503,1323,110,1342').split(',').map(Number);
const crop=flags.crop?flags.crop.split(',').map(Number):null,scale=Number(flags.scale??1),mix=Number(flags.mix??.5);
const uri=p=>'data:image/png;base64,'+readFileSync(p).toString('base64');
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async({ref,cap,c,photo,crop,scale,mix})=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
 const [ri,ci]=await Promise.all([load(ref),load(cap)]);
 const px=img=>{const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);return g.getImageData(0,0,img.width,img.height)};
 const R=px(ri),C=px(ci);
 const solve=(A,b)=>{const n=b.length;for(let i=0;i<n;i++){let p=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let j=i+1;j<n;j++){const f=A[j][i]/A[i][i];for(let q=i;q<n;q++)A[j][q]-=f*A[i][q];b[j]-=f*b[i]}}const x=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let q=i+1;q<n;q++)s-=A[i][q]*x[q];x[i]=s/A[i][i]}return x};
 // Photograph pixel → capture pixel.
 const A=[],b=[];for(let i=0;i<4;i++){const u=photo[i*2],v=photo[i*2+1],x=c[i*2],y=c[i*2+1];A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y)}
 const h=solve(A,b);
 const [x0,y0,w,hh]=crop??[0,0,R.width,R.height],W=Math.round(w*scale),H=Math.round(hh*scale);
 const side=new ImageData(W*2+8,H),over=new ImageData(W,H);
 const at=(img,x,y)=>{x=Math.max(0,Math.min(img.width-1.001,x));y=Math.max(0,Math.min(img.height-1.001,y));const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,o=[0,0,0];for(let k=0;k<3;k++){const p=(yy,xx)=>img.data[(yy*img.width+xx)*4+k];o[k]=p(yi,xi)*(1-fx)*(1-fy)+p(yi,xi+1)*fx*(1-fy)+p(yi+1,xi)*(1-fx)*fy+p(yi+1,xi+1)*fx*fy}return o};
 for(let j=0;j<H;j++)for(let i=0;i<W;i++){
  const u=x0+i/scale,v=y0+j/scale,q=h[6]*u+h[7]*v+1,cx=(h[0]*u+h[1]*v+h[2])/q,cy=(h[3]*u+h[4]*v+h[5])/q;
  const a=at(R,u,v),bb=at(C,cx,cy),o1=(j*(W*2+8)+i)*4,o2=(j*(W*2+8)+i+W+8)*4,o3=(j*W+i)*4;
  for(let k=0;k<3;k++){side.data[o1+k]=a[k];side.data[o2+k]=bb[k];over.data[o3+k]=a[k]*(1-mix)+bb[k]*mix}side.data[o1+3]=side.data[o2+3]=over.data[o3+3]=255;
 }
 const toUrl=img=>{const k=document.createElement('canvas');k.width=img.width;k.height=img.height;k.getContext('2d').putImageData(img,0,0);return k.toDataURL('image/png')};
 return {side:toUrl(side),over:toUrl(over)};
},{ref:uri(ref),cap:uri(cap),c,photo,crop,scale,mix});
writeFileSync(out+'-side.png',Buffer.from(r.side.split(',')[1],'base64'));writeFileSync(out+'-overlay.png',Buffer.from(r.over.split(',')[1],'base64'));
console.log('wrote',out+'-side.png',out+'-overlay.png');await browser.close();
