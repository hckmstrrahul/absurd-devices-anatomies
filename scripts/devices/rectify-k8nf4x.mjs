// Rectify a K8NF4X photograph to a true top view, so positions can be read straight off in millimetres.
//   node scripts/devices/rectify-k8nf4x.mjs <photo.png> <out.png> <x,y of TL,TR,BR,BL board corners: 8 numbers> [w=244] [d=305] [px/mm=4] [margin=30]
// Board corners are clockwise from the back-left (top-left in the top photo). Prints the focal length and board aspect the
// four corners imply for a centred pinhole camera, which checks the board's standard size independently.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const [src,out,corners,w='244',d='305',s='4',m='30']=process.argv.slice(2);
const P=corners.split(',').map(Number);
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async({uri,P,W,D,S,M})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 // Homography from (u,v) to (x,y) through four point pairs: solve the 8×8 system by Gaussian elimination.
 function homography(from,to){
  const A=[],b=[];
  for(let i=0;i<4;i++){const [u,v]=from[i],[x,y]=to[i];A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y)}
  for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;[A[c],A[p]]=[A[p],A[c]];[b[c],b[p]]=[b[p],b[c]];
   for(let r=0;r<8;r++)if(r!==c){const f=A[r][c]/A[c][c];for(let k=c;k<8;k++)A[r][k]-=f*A[c][k];b[r]-=f*b[c]}}
  const h=b.map((v,i)=>v/A[i][i]);return [[h[0],h[1],h[2]],[h[3],h[4],h[5]],[h[6],h[7],1]];
 }
 const pts=[[P[0],P[1]],[P[2],P[3]],[P[4],P[5]],[P[6],P[7]]];
 const cx=img.width/2,cy=img.height/2;
 const Hu=homography([[0,0],[1,0],[1,1],[0,1]],pts.map(([x,y])=>[x-cx,y-cy]));
 const col=j=>[Hu[0][j],Hu[1][j],Hu[2][j]];const [a1,b1,c1]=col(0),[a2,b2,c2]=col(1);
 const f2=-(a1*a2+b1*b2)/(c1*c2),f=Math.sqrt(Math.abs(f2));
 const n=(a,b,c)=>Math.hypot(a/f,b/f,c),aspect=n(a1,b1,c1)/n(a2,b2,c2);
 // Board mm (x right, z down from the back-left corner) to image pixels.
 const H=homography([[0,0],[W,0],[W,D],[0,D]],pts);
 const ow=Math.round((W+2*M)*S),oh=Math.round((D+2*M)*S);
 const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);const sd=g.getImageData(0,0,img.width,img.height).data;
 const o=document.createElement('canvas');o.width=ow;o.height=oh;const og=o.getContext('2d');const od=og.createImageData(ow,oh);
 for(let j=0;j<oh;j++)for(let i=0;i<ow;i++){
  const X=i/S-M,Z=j/S-M,q=H[2][0]*X+H[2][1]*Z+1,x=(H[0][0]*X+H[0][1]*Z+H[0][2])/q,y=(H[1][0]*X+H[1][1]*Z+H[1][2])/q;
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0,t=(j*ow+i)*4;
  if(x0<0||y0<0||x0>=img.width-1||y0>=img.height-1){od.data[t+3]=255;continue}
  for(let c=0;c<3;c++){const at=(xx,yy)=>sd[(yy*img.width+xx)*4+c];od.data[t+c]=(at(x0,y0)*(1-fx)+at(x0+1,y0)*fx)*(1-fy)+(at(x0,y0+1)*(1-fx)+at(x0+1,y0+1)*fx)*fy}
  od.data[t+3]=255;
 }
 og.putImageData(od,0,0);
 // A 10 mm grid with labels every 50 mm, faint, for reading positions.
 og.lineWidth=1;
 for(let X=0;X<=W;X+=10){og.strokeStyle=X%50?'rgba(255,255,0,.18)':'rgba(255,255,0,.5)';og.beginPath();og.moveTo((X+M)*S,M*S-6);og.lineTo((X+M)*S,(D+M)*S+6);og.stroke();if(X%50===0||S>=8){og.fillStyle="#ff0";og.font="14px sans-serif";og.fillText(String(X),(X+M)*S+2,M*S-10)}}
 for(let Z=0;Z<=D;Z+=10){og.strokeStyle=Z%50?'rgba(255,255,0,.18)':'rgba(255,255,0,.5)';og.beginPath();og.moveTo(M*S-6,(Z+M)*S);og.lineTo((W+M)*S+6,(Z+M)*S);og.stroke();if(Z%50===0||S>=8){og.fillStyle="#ff0";og.font="14px sans-serif";og.fillText(String(Z),M*S-34,(Z+M)*S+5)}}
 return {png:o.toDataURL('image/png'),f,aspect,H};
},{uri:'data:image/png;base64,'+readFileSync(src).toString('base64'),P,W:+w,D:+d,S:+s,M:+m});
writeFileSync(out,Buffer.from(r.png.split(',')[1],'base64'));
console.log('focal',r.f.toFixed(0),'px; implied board width/depth',r.aspect.toFixed(4),'(244/305 =',(244/305).toFixed(4)+')');
console.log('H',JSON.stringify(r.H.map(row=>row.map(v=>+v.toPrecision(6)))));
await browser.close();
