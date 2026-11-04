import assert from 'node:assert/strict';
import {chromium} from '../../web/node_modules/playwright/index.mjs';
const base=process.env.FLORA_URL||'http://127.0.0.1:49381';
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/flora/');await page.waitForFunction(()=>window.__flora?.ready);
 await page.getByRole('button',{name:'Pause tour',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Take a tour',exact:true}).getAttribute('aria-pressed'),'false');
 for(const id of ['receiver','display','processor','audio','power','chassis']){
  const button=page.locator(`[data-tour="part-${id}"]`);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Isolate this assembly',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Show all assemblies',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Show all assemblies',exact:true}).click();
 }
 await page.getByRole('button',{name:'Pause scan',exact:true}).click();
 const frozen=await page.evaluate(()=>window.__flora.state().sample.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__flora.state().sample.time),frozen);
 await page.locator('#intensity').fill('100');await page.waitForFunction(()=>window.__flora.state().sample.intensity===100);assert.equal(await page.evaluate(()=>window.__flora.state().sample.stress),1);
 await page.locator('#intensity').fill('0');await page.waitForFunction(()=>window.__flora.state().sample.intensity===0);assert.equal(await page.evaluate(()=>window.__flora.state().sample.energy),0);
 for(const mode of ['solid','xray','section']){const b=page.locator(`[data-tour="mode-${mode}"]`);await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true')}
 for(const view of ['front','side','top','inside','hero']){const b=page.locator(`[data-tour="view-${view}"]`);await b.click();assert.equal(await b.getAttribute('aria-pressed'),'true')}
 await page.getByRole('button',{name:'Hide panels',exact:true}).click();assert.equal(await page.locator('.telemetry').isVisible(),false);await page.getByRole('button',{name:'Show panels',exact:true}).click();
 await page.getByRole('button',{name:'Reset instrument',exact:true}).click();await page.waitForTimeout(750);assert.equal(await page.locator('#separation').inputValue(),'0');assert.equal(await page.locator('#intensity').inputValue(),'58');
 await page.getByRole('button',{name:'Take a tour',exact:true}).click();await page.locator('#intensity').fill('40');assert.equal(await page.getByRole('button',{name:'Take a tour',exact:true}).getAttribute('aria-pressed'),'false');
 await page.waitForTimeout(25600);assert.equal(await page.getByRole('button',{name:'Pause tour',exact:true}).getAttribute('aria-pressed'),'true');
 console.log('PASS: all six assemblies, isolation, modes, cameras, pause, ranges, reset, panels, and 25-second handover.');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.__flora?.ready);assert.equal(await page.getByRole('button',{name:'Take a tour',exact:true}).getAttribute('aria-pressed'),'false');assert.equal(await page.getByRole('button',{name:'Resume scan',exact:true}).count(),1);
 for(const width of [360,390,768,1024,1600]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 console.log('PASS: reduced-motion defaults and five responsive widths.');
 await page.goto(base+'/');await page.getByRole('heading',{name:'XNOS Flora Interface Unit',exact:true}).waitFor({state:'visible'});assert.match(await page.title(),/Absurd Devices Anatomies/);assert.equal(await page.getByRole('heading',{name:'XNOS Flora Interface Unit',exact:true}).count(),1);assert.equal(await page.getByRole('radio',{name:'Rendered',exact:true}).count(),1);
 console.log('PASS: original homepage remains intact.');assert.deepEqual(errors,[]);console.log('PASS: no browser exceptions.');
}finally{await browser.close()}
