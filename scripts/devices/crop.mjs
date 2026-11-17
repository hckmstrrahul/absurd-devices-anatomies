// Cut a region out of an image and enlarge it, for close study of a reference or a capture.
//   node scripts/devices/crop.mjs <image.png> <out.png> <x> <y> <w> <h> [scale=2]
// Also prints the average colour of the region, for sampling materials from the reference.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const [src,out,x,y,w,h,scale='2']=process.argv.slice(2);
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async({uri,x,y,w,h,scale})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const k=document.createElement('canvas');k.width=Math.round(w*scale);k.height=Math.round(h*scale);const g=k.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,x,y,w,h,0,0,k.width,k.height);
 const d=g.getImageData(0,0,k.width,k.height).data;let s=[0,0,0];for(let i=0;i<d.length;i+=4){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2]}
 const n=d.length/4;return {png:k.toDataURL('image/png'),mean:'#'+s.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join(''),size:[img.width,img.height]};
},{uri:'data:image/png;base64,'+readFileSync(src).toString('base64'),x:+x,y:+y,w:+w,h:+h,scale:+scale});
writeFileSync(out,Buffer.from(r.png.split(',')[1],'base64'));console.log('image',r.size.join('x'),'mean colour',r.mean,'->',out);
await browser.close();
