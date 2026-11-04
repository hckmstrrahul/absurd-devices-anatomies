import {chromium} from '../../web/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdirSync,readFileSync} from 'node:fs';
const timeline=JSON.parse(readFileSync(new URL('../../web/src/flora/timeline.json',import.meta.url)));
const base=process.env.FLORA_URL||'http://127.0.0.1:49381';
const output='shots/flora';mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chromium',headless:true,args:[...(process.platform==='darwin'?['--use-angle=metal']:[]),'--ignore-gpu-blocklist','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.2});
page.on('pageerror',error=>{console.error(error);process.exitCode=1});
await page.goto(base+'/flora/?capture=1');await page.waitForFunction(()=>window.__flora?.ready);await page.evaluate(()=>document.fonts.ready);
console.log('Capture GPU:',await page.evaluate(()=>window.__flora.gpu()));
const video=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','60','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','20','-vf','scale=in_range=pc:out_range=tv','-color_range','tv','-pix_fmt','yuv420p','-movflags','+faststart',output+'/silent.mp4'],{stdio:['pipe','inherit','inherit']});
const done=once(video,'exit');
try{
 for(let frame=0;frame<timeline.duration*60;frame++){
  const t=frame/60;await page.evaluate(t=>window.__flora.render(t),t);
  const bytes=await page.screenshot({type:'jpeg',quality:94});
  if(!video.stdin.write(bytes))await once(video.stdin,'drain');
  if(frame%240===0)console.log(`Rendered ${frame/60}/${timeline.duration}s`);
 }
 video.stdin.end();const [code]=await done;if(code!==0)throw Error('Encoder failed: '+code);
 console.log('1920 × 1080, 60 fps film captured.');
}finally{await browser.close()}
