// Find surfaces that flash while the camera moves. Needs `npm run dev`.
//   node scripts/devices/flicker.mjs <slug> [outDir] [--view=Label] [--mode=Assembled] [--steps=16] [--step=0.25] [--dy] [--still] [--dark]
// Drags the camera a quarter pixel at a time (sub-pixel image motion) and captures each step. A pixel that jumps away from both of its neighbours in time
// (rather than changing steadily) is counted as flicker. Writes <out>/<slug>-flicker.png: the frame on the left, the heat map on the right.
// --still holds the camera instead, to show anything that changes with no motion at all.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,v='1']=a.slice(2).split('=');return [k,v]})),[slug,out='shots/flicker']=args.filter(a=>!a.startsWith('--'));
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
await page.goto((process.env.DEVICE_URL||'http://127.0.0.1:49381')+`/${slug}/`);
await page.waitForFunction(()=>window.__device?.ready,null,{timeout:40000});
const pick=async name=>{const radio=page.getByRole('radio',{name,exact:true});if(!(await radio.isChecked()))await radio.click()};
await pick(flags.dark?'Dark':'Light');await pick(flags.mode??'Assembled');if(flags.view)await pick(flags.view);
await page.waitForTimeout(2600);
const stage=page.locator('.orbit-stage canvas'),box=await stage.boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
const steps=Number(flags.steps??16),stride=Number(flags.step??.25),frames=[];
if(!flags.still){await page.mouse.move(cx,cy);await page.mouse.down()}
for(let i=0;i<steps;i++){
 if(!flags.still)await page.mouse.move(cx+(flags.dy?0:(i+1)*stride),cy+(flags.dy?(i+1)*stride:0));
 await page.waitForTimeout(140);
 frames.push((await stage.screenshot()).toString('base64'));
}
if(!flags.still)await page.mouse.up();
const sheet=await browser.newPage();
const result=await sheet.evaluate(async frames=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src='data:image/png;base64,'+src});
 const images=await Promise.all(frames.map(load)),w=images[0].width,h=images[0].height;
 const k=document.createElement('canvas');k.width=w*2;k.height=h;const g=k.getContext('2d',{willReadFrequently:true});
 const luma=images.map(img=>{g.drawImage(img,0,0);const d=g.getImageData(0,0,w,h).data,l=new Float32Array(w*h);for(let i=0;i<w*h;i++)l[i]=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];return l});
 const heat=new Float32Array(w*h);
 for(let t=1;t<luma.length-1;t++){const a=luma[t-1],b=luma[t],c=luma[t+1];for(let i=0;i<w*h;i++){const m=Math.abs(b[i]-(a[i]+c[i])/2)-Math.abs(c[i]-a[i])/2-6;if(m>0)heat[i]+=m}}
 let total=0,hot=0;for(let i=0;i<w*h;i++){total+=heat[i];if(heat[i]>40)hot++}
 // Coarse grid of the worst cells, to point at where to look.
 const cell=40,cols=Math.ceil(w/cell),rows=Math.ceil(h/cell),grid=new Float32Array(cols*rows);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)grid[(y/cell|0)*cols+(x/cell|0)]+=heat[y*w+x];
 const worst=[...grid].map((v,i)=>({v:Math.round(v),x:(i%cols)*cell,y:(i/cols|0)*cell})).sort((p,q)=>q.v-p.v).slice(0,8);
 g.drawImage(images[images.length>>1],0,0);const img=g.getImageData(w,0,w,h);
 for(let i=0;i<w*h;i++){const v=Math.min(255,heat[i]*3);img.data[i*4]=v;img.data[i*4+1]=v*.5;img.data[i*4+2]=20;img.data[i*4+3]=255}
 g.putImageData(img,w,0);
 return {png:k.toDataURL('image/png').split(',')[1],total:Math.round(total),hot,worst,size:[w,h]};
},frames);
const name=`${out}/${slug}-flicker${flags.still?'-still':''}${flags.view?'-'+flags.view.toLowerCase():''}${flags.dy?'-dy':''}.png`;
writeFileSync(name,Buffer.from(result.png,'base64'));
console.log(slug.padEnd(8),'total',String(result.total).padStart(9),'hot px',String(result.hot).padStart(6),'worst',result.worst.slice(0,5).map(c=>`${c.x},${c.y}:${c.v}`).join(' '),'→',name);
await browser.close();
