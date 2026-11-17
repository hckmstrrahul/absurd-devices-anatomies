// Compare a capture with a reference image: writes <out>-side.png (side by side) and <out>-overlay.png (50% blend).
//   node scripts/devices/compare.mjs <reference.png> <capture.png> <out> [--crop=x,y,w,h] [--ref=x,y,w,h] [--mix=0.5]
// Without --crop the capture is cropped to whatever differs from its corner colour (the device on its backdrop).
// --ref crops the reference the same way (pixels). Both crops are stretched to the same box, so use it to check
// placement and proportion of features, not overall aspect.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('='))),[ref,cap,out='compare']=args.filter(a=>!a.startsWith('--'));
const uri=p=>'data:image/png;base64,'+readFileSync(p).toString('base64');
const browser=await chromium.launch({channel:'chromium',headless:true});const page=await browser.newPage();
const result=await page.evaluate(async({ref,cap,crop,refCrop,mix})=>{
 const load=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src});
 const [r,c]=await Promise.all([load(ref),load(cap)]);
 const pixels=img=>{const k=document.createElement('canvas');k.width=img.width;k.height=img.height;const g=k.getContext('2d');g.drawImage(img,0,0);return g.getImageData(0,0,img.width,img.height)};
 let box=crop?crop.split(',').map(Number):null;
 if(!box){
  // The backdrop may be a vertical sweep, so judge each row against its own left-edge colour.
  const d=pixels(c),w=d.width,h=d.height;let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y+=2){const e=(y*w+4)*4;for(let x=0;x<w;x+=2){const i=(y*w+x)*4;if(Math.abs(d.data[i]-d.data[e])+Math.abs(d.data[i+1]-d.data[e+1])+Math.abs(d.data[i+2]-d.data[e+2])>42){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}}
  box=[x0,y0,x1-x0,y1-y0];
 }
 const rb=refCrop?refCrop.split(',').map(Number):[0,0,r.width,r.height];
 const H=1400,W=Math.round(H*rb[2]/rb[3]);
 const make=(w,h)=>{const k=document.createElement('canvas');k.width=w;k.height=h;return k};
 const side=make(W*2+20,H),sg=side.getContext('2d');sg.fillStyle='#202020';sg.fillRect(0,0,side.width,H);
 sg.drawImage(r,...rb,0,0,W,H);sg.drawImage(c,...box,W+20,0,W,H);
 const over=make(W,H),og=over.getContext('2d');og.drawImage(r,...rb,0,0,W,H);og.globalAlpha=Number(mix);og.drawImage(c,...box,0,0,W,H);
 return {side:side.toDataURL('image/png'),overlay:over.toDataURL('image/png'),box};
},{ref:uri(ref),cap:uri(cap),crop:flags.crop,refCrop:flags.ref,mix:flags.mix??'0.5'});
for(const k of ['side','overlay'])writeFileSync(`${out}-${k}.png`,Buffer.from(result[k].split(',')[1],'base64'));
console.log('capture crop',result.box.join(','),'->',`${out}-side.png`,`${out}-overlay.png`);
await browser.close();
