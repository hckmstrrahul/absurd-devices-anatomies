import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {chromium} from '../../web/node_modules/playwright/index.mjs';
const media='web/public/flora',out='shots/flora';mkdirSync(media,{recursive:true});
function ffmpeg(args){const r=spawnSync('ffmpeg',['-y','-hide_banner','-loglevel','error',...args],{stdio:'inherit'});if(r.status!==0)throw Error('ffmpeg failed')}
ffmpeg(['-i',out+'/silent.mp4','-i',out+'/score.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',media+'/xnos-flora.mp4']);
ffmpeg(['-i',media+'/xnos-flora.mp4','-ss','1.2','-frames:v','1','-q:v','2',media+'/film-poster.jpg']);
// The contact sheet is extracted from the encoded file, one frame per tour beat.
ffmpeg(['-i',media+'/xnos-flora.mp4','-vf',"select='eq(n,18)+eq(n,258)+eq(n,498)+eq(n,738)+eq(n,978)+eq(n,1218)+eq(n,1458)+eq(n,1698)',scale=600:338,tile=2x4",'-frames:v','1',out+'/film-contact-sheet.jpg']);
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:.75});await page.goto('http://127.0.0.1:49381/flora/?capture=1');await page.waitForFunction(()=>window.__flora?.ready);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>window.__flora.render(1.2));await page.screenshot({path:media+'/og-image.png',clip:{x:0,y:0,width:1600,height:840}});
 // Read every transition at 0.2-second steps; store one sheet for each change.
 for(const start of [4,8,12,16,20,24,28]){
  for(let i=0;i<=6;i++){await page.evaluate(t=>window.__flora.render(t),start+i*.2);await page.screenshot({path:`${out}/transition-${start}-${i}.jpg`,type:'jpeg',quality:87})}
  ffmpeg(['-framerate','1','-i',`${out}/transition-${start}-%d.jpg`,'-vf','scale=400:225,tile=4x2','-frames:v','1',`${out}/transition-${start}-sheet.jpg`]);
 }
}finally{await browser.close()}
const probe=spawnSync('ffprobe',['-v','quiet','-show_streams','-show_format','-of','json',media+'/xnos-flora.mp4'],{encoding:'utf8'});writeFileSync(out+'/film-probe.json',probe.stdout);const stream=JSON.parse(probe.stdout).streams[0];console.log({width:stream.width,height:stream.height,fps:stream.r_frame_rate,frames:stream.nb_frames,pix_fmt:stream.pix_fmt,duration:stream.duration});
