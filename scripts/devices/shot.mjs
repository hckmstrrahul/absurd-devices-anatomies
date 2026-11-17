// Capture a 3D device page for visual review. Needs `npm run dev` running.
//   node scripts/devices/shot.mjs <slug> <outDir> [Mode] [View label...] [--page] [--dark] [--wait=ms] [--select=Name]
// Mode is Assembled, Exploded or Play. Views are the labels on the camera buttons. --page also saves the full page.
import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {mkdirSync} from 'node:fs';
const args=process.argv.slice(2),flags=args.filter(a=>a.startsWith('--')),[slug,out=`shots/${slug}`,mode='Assembled',...views]=args.filter(a=>!a.startsWith('--'));
const flag=name=>flags.find(f=>f===`--${name}`||f.startsWith(`--${name}=`))?.split('=')[1]??(flags.includes(`--${name}`)?'1':undefined);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:Number(flag('dpr')??1.5)});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto((process.env.DEVICE_URL||'http://127.0.0.1:49381')+`/${slug}/`);
await page.waitForFunction(()=>window.__device?.ready,null,{timeout:30000});
// Other work on the dev server can live-reload this page mid-capture, which resets mode, theme and camera.
// So set everything, wait, then confirm nothing was reset before shooting; otherwise set it all again.
const pick=async name=>{const radio=page.getByRole('radio',{name,exact:true});if(!(await radio.isChecked()))await radio.click()};
const arrange=async view=>{
 await page.waitForFunction(()=>window.__device?.ready,null,{timeout:30000});
 await pick(flag('dark')?'Dark':'Light');await pick(mode);
 if(flag('select')){const button=page.locator('.component-button',{hasText:flag('select')});if(await button.getAttribute('aria-pressed')!=='true')await button.click()}
 if(view)await pick(view);
};
const settled=async view=>(await page.evaluate(()=>!!window.__device?.ready))&&await page.getByRole('radio',{name:mode,exact:true}).isChecked()&&(!view||await page.getByRole('radio',{name:view,exact:true}).isChecked())&&await page.getByRole('radio',{name:flag('dark')?'Dark':'Light',exact:true}).isChecked();
for(const view of views.length?views:[null]){
 let ok=false;
 for(let tries=0;tries<5&&!ok;tries++){await arrange(view);await page.waitForTimeout(Number(flag('wait')??2200));ok=await settled(view).catch(()=>false)}
 if(!ok)throw new Error(`The page kept reloading; could not hold ${mode} / ${view??'default'}`);
 const name=`${out}/${mode}-${view??'default'}${flag('dark')?'-dark':''}`.toLowerCase().replace(/\s+/g,'-');
 await page.locator('.orbit-stage').screenshot({path:name+'.png'});
 if(flag('page'))await page.screenshot({path:name+'-page.png',fullPage:true});
 console.log('wrote',name+'.png');
}
console.log('state',JSON.stringify(await page.evaluate(()=>{const s=window.__device.state();return {separation:s.separation,view:s.view,pose:s.pose}})).slice(0,600));
console.log('errors',JSON.stringify(errors));
await browser.close();
