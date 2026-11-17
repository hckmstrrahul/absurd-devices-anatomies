// Cut a reference (or capture) into enlarged crops with a labelled pixel grid, for tracing gap35.
//   node scripts/devices/grid-gap35.mjs <image.png> <outDir> <x> <y> <w> <h> [scale=2.5] [step=50] [name=crop]
// Also: --sample=x,y,w,h;x,y,w,h... prints the mean colour of each box.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const args=process.argv.slice(2),flags=args.filter(a=>a.startsWith('--')),pos=args.filter(a=>!a.startsWith('--'));
const [src,out,x,y,w,h,scale='2.5',step='50',name='crop']=pos;
const sample=flags.find(f=>f.startsWith('--sample='))?.slice(9);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const r=await page.evaluate(async({uri,x,y,w,h,scale,step,sample})=>{
 const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
 const means=[];
 if(sample){const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);
  for(const b of sample.split(';')){const [bx,by,bw,bh]=b.split(',').map(Number);const d=g.getImageData(bx,by,bw,bh).data;const s=[0,0,0];for(let i=0;i<d.length;i+=4){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2]}const n=d.length/4;means.push(b+' -> #'+s.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join(''))}}
 if(!w)return {means};
 const k=document.createElement('canvas');k.width=Math.round(w*scale);k.height=Math.round(h*scale);const g=k.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,x,y,w,h,0,0,k.width,k.height);
 g.font='bold 13px monospace';g.lineWidth=1;
 for(let gx=Math.ceil(x/step)*step;gx<x+w;gx+=step){const px=(gx-x)*scale;g.strokeStyle='rgba(255,0,255,.55)';g.beginPath();g.moveTo(px,0);g.lineTo(px,k.height);g.stroke();g.fillStyle='#ff00ff';g.fillText(String(gx),px+2,13)}
 for(let gy=Math.ceil(y/step)*step;gy<y+h;gy+=step){const py=(gy-y)*scale;g.strokeStyle='rgba(0,255,255,.55)';g.beginPath();g.moveTo(0,py);g.lineTo(k.width,py);g.stroke();g.fillStyle='#00ffff';g.fillText(String(gy),2,py-2)}
 return {png:k.toDataURL('image/png'),means};
},{uri:'data:image/png;base64,'+readFileSync(src).toString('base64'),x:+x||0,y:+y||0,w:+w||0,h:+h||0,scale:+scale,step:+step,sample});
if(r.png){writeFileSync(`${out}/${name}.png`,Buffer.from(r.png.split(',')[1],'base64'));console.log('->',`${out}/${name}.png`)}
for(const m of r.means)console.log(m);
await browser.close();
