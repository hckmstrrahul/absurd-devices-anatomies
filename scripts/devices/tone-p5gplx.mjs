// Mean colour of matching plan regions in a Top capture and in the rectified reference, for colour calibration.
//   node scripts/devices/tone-p5gplx.mjs <capture.png> <x0,y0,x1,y1 of the board in the capture> [rect8.png]
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';
const [cap,box,ref='shots/p5gplx/rect8.png']=process.argv.slice(2),[x0,y0,x1,y1]=box.split(',').map(Number);
const regions=[['pour VRM',20,122,20,25],['slot field',60,240,40,30],['left column',4,150,22,60],['DDR field',115,45,15,40],['right lower',165,175,15,45],['top band',100,36,10,4],['south bridge',140,232,10,10],['dimm',146,60,2,40],['pci',50,224,40,1.5],['heatsink',80,130,25,25]];
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const out=await page.evaluate(async({a,b,regions,box})=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
 const [A,B]=await Promise.all([load(a),load(b)]);
 const px=img=>{const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);return g};
 const ga=px(A),gb=px(B),[x0,y0,x1,y1]=box,ka=(x1-x0)/183,kb=B.width/183;
 const mean=(g,x,y,w,h)=>{const d=g.getImageData(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))).data;let s=[0,0,0];for(let i=0;i<d.length;i+=4){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2]}const n=d.length/4;return s.map(v=>Math.round(v/n))};
 return regions.map(([name,u,v,w,h])=>[name,mean(ga,x0+u*ka,y0+v*ka,w*ka,h*ka),mean(gb,u*kb,v*kb,w*kb,h*kb)]);
},{a:'data:image/png;base64,'+readFileSync(cap).toString('base64'),b:'data:image/png;base64,'+readFileSync(ref).toString('base64'),regions,box:[x0,y0,x1,y1]});
const hex=c=>'#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');
for(const [n,a,b] of out)console.log(n.padEnd(14),'render',hex(a),'photo',hex(b),'ratio',a.map((v,i)=>(v/Math.max(1,b[i])).toFixed(2)).join(' '));
await browser.close();
