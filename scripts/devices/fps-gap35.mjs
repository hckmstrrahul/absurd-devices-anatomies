// Frame rate of gap35 while playing, per view: node scripts/devices/fps-gap35.mjs [views...]
import {chromium} from '../../web/node_modules/playwright/index.mjs';
const views=process.argv.slice(2).length?process.argv.slice(2):['Top','3D','Close','Side','Layers'];
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('http://127.0.0.1:49381/gap35/');await page.waitForFunction(()=>window.__device?.ready,null,{timeout:40000});
await page.getByRole('radio',{name:'Play',exact:true}).click();
for(const v of views){await page.getByRole('radio',{name:v,exact:true}).click();await page.waitForTimeout(1500);
 const fps=await page.evaluate(()=>new Promise(done=>{let n=0;const t=performance.now();const f=()=>{n++;performance.now()-t<2000?requestAnimationFrame(f):done(Math.round(n/2))};requestAnimationFrame(f)}));console.log(v,fps)}
await browser.close();
