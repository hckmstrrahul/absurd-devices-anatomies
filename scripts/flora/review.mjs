import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.FLORA_URL||'http://127.0.0.1:49381';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl','--enable-gpu-rasterization']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/flora/?capture=1');await page.waitForFunction(()=>window.__flora?.ready);await page.evaluate(()=>document.fonts.ready);
console.log('GPU:',await page.evaluate(()=>window.__flora.gpu()));
mkdirSync('shots/flora',{recursive:true});
for(const t of [0,4.8,8.8,12.8,16.8,20.8,24.8,28.8]){await page.evaluate(t=>window.__flora.render(t),t);await page.screenshot({path:`shots/flora/beat-${t}.png`});}
await page.goto(base+'/flora/');await page.waitForFunction(()=>window.__flora?.ready);await page.getByRole('button',{name:'Pause tour',exact:true}).click();
await page.getByRole('button',{name:'Reset instrument',exact:true}).click();
await page.screenshot({path:'shots/flora/desktop.png',fullPage:true});
console.log('Errors:',errors);console.log('Overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'shots/flora/mobile.png',fullPage:true});
console.log('Mobile overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
writeFileSync('shots/flora/review.json',JSON.stringify({errors},null,2));await browser.close();
