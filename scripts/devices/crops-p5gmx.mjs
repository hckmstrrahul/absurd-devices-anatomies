// Many crops of one image in one browser session, each with a labelled pixel grid, for tracing the P5G-MX reference.
//   node scripts/devices/crops-p5gmx.mjs <image.png> <outDir> <name:x,y,w,h[,scale[,grid]]>...
// Prints each region's mean colour. `grid` is the spacing of the labelled lines in source pixels (0 for none).
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const [src,out,...specs]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const uri='data:image/png;base64,'+readFileSync(src).toString('base64');
for(const spec of specs){
 const [name,rest]=spec.split(':'),[x,y,w,h,scale=2,grid=50]=rest.split(',').map(Number);
 const r=await page.evaluate(async({uri,x,y,w,h,scale,grid})=>{
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=uri});
  const k=document.createElement('canvas');k.width=Math.round(w*scale);k.height=Math.round(h*scale);const g=k.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(img,x,y,w,h,0,0,k.width,k.height);
  const d=g.getImageData(0,0,k.width,k.height).data;let s=[0,0,0];for(let i=0;i<d.length;i+=4){s[0]+=d[i];s[1]+=d[i+1];s[2]+=d[i+2]}
  const n=d.length/4;const mean='#'+s.map(v=>Math.round(v/n).toString(16).padStart(2,'0')).join('');
  if(grid>0){g.font=`${Math.max(10,12)}px monospace`;g.lineWidth=1;
   for(let gx=Math.ceil(x/grid)*grid;gx<x+w;gx+=grid){const px=(gx-x)*scale;g.strokeStyle=gx%(grid*2)?'rgba(0,255,255,.45)':'rgba(255,0,255,.6)';g.beginPath();g.moveTo(px+.5,0);g.lineTo(px+.5,k.height);g.stroke();g.fillStyle='#0ff';g.fillText(String(gx),px+2,11)}
   for(let gy=Math.ceil(y/grid)*grid;gy<y+h;gy+=grid){const py=(gy-y)*scale;g.strokeStyle=gy%(grid*2)?'rgba(0,255,255,.45)':'rgba(255,0,255,.6)';g.beginPath();g.moveTo(0,py+.5);g.lineTo(k.width,py+.5);g.stroke();g.fillStyle='#0ff';g.fillText(String(gy),2,py-2)}}
  return {png:k.toDataURL('image/png'),mean};
 },{uri,x,y,w,h,scale,grid});
 writeFileSync(`${out}/${name}.png`,Buffer.from(r.png.split(',')[1],'base64'));console.log(name,'mean',r.mean);
}
await browser.close();
