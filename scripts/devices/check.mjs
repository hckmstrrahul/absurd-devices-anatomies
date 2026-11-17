// Browser check of every 3D device page: play, explode, click-select, dark theme, phone width. Needs `npm run dev`.
//   node scripts/devices/check.mjs [slug...]
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {mkdirSync} from 'node:fs';
const all=['orbit','belljar','chorus','lumen','pocket','verdant','ember','console','frost','cobalt','k8nf4x','p5gplx','p5gmx','gap35'],slugs=process.argv.slice(2).length?process.argv.slice(2):all;
const out='shots/check';mkdirSync(out,{recursive:true});let failed=0;
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl']});
for(const slug of slugs){
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const ready=()=>page.waitForFunction(()=>window.__device?.ready,null,{timeout:40000});
 const st=()=>page.evaluate(()=>window.__device.state());
 const pick=async name=>{await ready();const r=page.getByRole('radio',{name,exact:true});if(!(await r.isChecked()))await r.click()};
 const t0=Date.now();await page.goto(`http://127.0.0.1:49381/${slug}/`);await ready();const load=Date.now()-t0;
 await pick('Play');await page.waitForTimeout(2500);
 const a=JSON.stringify((await st()).pose);await page.waitForTimeout(800);const moving=a!==JSON.stringify((await st()).pose);
 // Frame rate while playing, measured in the page.
 const fps=await page.evaluate(()=>new Promise(done=>{let n=0;const t=performance.now();const f=()=>{n++;performance.now()-t<2000?requestAnimationFrame(f):done(Math.round(n/2))};requestAnimationFrame(f)}));
 await pick('Dark');await page.waitForTimeout(1500);await page.locator('.orbit-stage').screenshot({path:`${out}/${slug}-dark-play.png`});
 await pick('Light');await pick('Exploded');await page.waitForTimeout(2200);const sep=(await st()).separation;
 await page.locator('.orbit-stage').screenshot({path:`${out}/${slug}-exploded.png`});
 await pick('Assembled');await page.waitForTimeout(1600);
 const box=await page.locator('.orbit-stage canvas').boundingBox();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await page.waitForTimeout(200);
 const picked=(await st()).controls.selected;await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1200);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.screenshot({path:`${out}/${slug}-phone.png`});
 const ok=moving&&sep>.99&&picked&&!overflow&&!errors.length;if(!ok)failed++;
 console.log(`${ok?'PASS':'FAIL'} ${slug.padEnd(8)} load ${String(load).padStart(5)}ms | ${String(fps).padStart(3)} fps | plays ${moving} | explodes ${sep.toFixed(2)} | click → ${picked} | phone overflow ${overflow} | errors ${errors.length} ${errors.slice(0,2).join(' ; ').slice(0,160)}`);
 await page.close();
}
await browser.close();process.exit(failed?1:0);
