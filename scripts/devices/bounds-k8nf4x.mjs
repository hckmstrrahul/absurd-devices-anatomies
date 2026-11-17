// Find the blue board's bounding box in a capture (pixels where blue clearly dominates), for compare.mjs --crop.
//   node scripts/devices/bounds-k8nf4x.mjs <capture.png>
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';
const [src]=process.argv.slice(2);
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const box=await page.evaluate(async uri=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);const d=g.getImageData(0,0,img.width,img.height).data;
 const rows=new Array(img.height).fill(0),cols=new Array(img.width).fill(0);
 for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){const i=(y*img.width+x)*4;if(d[i+2]>d[i]+45&&d[i+2]>d[i+1]+25){rows[y]++;cols[x]++}}
 // A row or column belongs to the board when a good share of it is blue.
 const edge=(a,n)=>{const t=Math.max(...a)*.35;let lo=0,hi=a.length-1;while(lo<hi&&a[lo]<t)lo++;while(hi>lo&&a[hi]<t)hi--;return [lo,hi]};
 const [y0,y1]=edge(rows),[x0,x1]=edge(cols);return [x0,y0,x1-x0,y1-y0];
},'data:image/png;base64,'+readFileSync(src).toString('base64'));
console.log(box.join(','));await browser.close();
