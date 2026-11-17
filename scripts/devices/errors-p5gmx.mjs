// Load the P5G-MX page and print console errors and load time, for debugging.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1200,height:800}});
page.on('pageerror',e=>console.log('PAGEERROR',e.message,e.stack?.split('\n').slice(0,4).join(' | ')));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log(m.type(),m.text().slice(0,300))});
const t=Date.now();await page.goto('http://127.0.0.1:49381/p5gmx/');
try{await page.waitForFunction(()=>window.__device?.ready,null,{timeout:30000});console.log('ready',Date.now()-t,'ms')}catch(e){console.log('not ready',await page.evaluate(()=>document.body.innerText.slice(0,300)))}
await browser.close();
