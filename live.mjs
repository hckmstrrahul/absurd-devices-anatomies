const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={separation:0,target:0,renderMode:'wireframe',intensity:58,powered:true,scanning:false,progress:0,completed:false,selected:null,sound:false,clock:0};
const parts=$$('.device-part').map(el=>({el,key:Number(el.dataset.key),move:el.dataset.move.split(',').map(Number)}));
const camera=DATA.P, radians=Math.PI/180, scale=camera.scale*Math.sqrt(1.6), a=camera.azimuth*radians, e=camera.elevation*radians;
const projectDelta=([x,y,z])=>[(x*Math.sin(a)-y*Math.cos(a))*scale,((x*Math.cos(a)+y*Math.sin(a))*Math.sin(e)-z*Math.cos(e))*scale];
const depth=([x,y,z])=>(x*Math.cos(a)+y*Math.sin(a))*Math.cos(e)+z*Math.sin(e);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let raf=0,last=0,visible=true,paintedSeparation=-1,metricKey='',lastOrder='',audioContext=null;
let scanTimer=null,idleTimer=null,scanStarted=0;
const announce=text=>$('#announcement').textContent=text;
function setRenderMode(mode){
  state.renderMode=mode==='wireframe'?'wireframe':'rendered';
  $('#stage').dataset.render=state.renderMode;
  for(const name of ['rendered','wireframe']){
    $('#'+name).classList.toggle('selected',name===state.renderMode);
    $('#'+name).setAttribute('aria-pressed',String(name===state.renderMode));
  }
  announce(state.renderMode==='wireframe'?'Wireframe drawing.':'Rendered materials.');
}

function pose() {
  const t=state.separation;
  if(Math.abs(t-paintedSeparation)<.00001)return;
  paintedSeparation=t;
  for(const part of parts){const [x,y]=projectDelta(part.move.map(v=>v*t));part.el.setAttribute('transform',`translate(${x.toFixed(3)} ${y.toFixed(3)})`)}
  const sorted=[...parts].sort((x,y)=>(x.key+depth(x.move)*t)-(y.key+depth(y.move)*t));
  const order=sorted.map(p=>p.el.dataset.item).join(',');
  if(order!==lastOrder){for(const part of sorted)$('#device-parts').append(part.el);lastOrder=order}
  // Scale the whole model back as its assemblies fan out, keeping all parts in view.
  const zoom=1.16-t*.35;
  $('#device-parts').setAttribute('transform',`translate(${450*(1-zoom)} ${340*(1-zoom)+t*30}) scale(${zoom})`);
  $('#pose-readout').textContent=Math.abs(t-state.target)>.002?'Separating · '+Math.round(t*100)+'%':t<.005?DATA.count+' parts':t>.995?DATA.count+' parts · Exploded':Math.round(t*100)+'% separated';
  $('#view-label').textContent=t<.005?'Assembled':t>.995?'Exploded':'Section study';
}
function readings() {
  const m=telemetry(state.intensity,state.progress,state.powered);
  const key=[state.intensity,state.powered].join(':');
  if(key!==metricKey) {
    metricKey=key;
    for(const name of ['vitality','toxicity','growth','absorption'])$('#metric-'+name).textContent=state.powered?(name==='growth'?m[name].toFixed(2):m[name]):'—';
    $('#vitality-meter').style.width=m.vitality+'%';$('#toxicity-meter').style.width=m.toxicity+'%';
    $('#power-readout').textContent=state.powered?m.power.toFixed(1)+' W · Active':'0.0 W · Standby';
    $('#crt-vitality').textContent=m.vitality+'%';$('#crt-toxicity').textContent=m.toxicity;
    $$('.vital-bar').forEach((el,i)=>el.setAttribute('opacity',i<m.vitality/10?'1':'.2'));
    $('#radar-needle').setAttribute('transform',`rotate(${m.toxicity*2.4} 75 55)`);
    $('#screen-live').setAttribute('opacity',state.powered?'1':'0');$('#screen-off').setAttribute('opacity',state.powered?'0':'1');
    document.body.dataset.powered=String(state.powered);
    $('.material-emitter').style.filter=state.powered?`drop-shadow(0 0 ${2+m.energy*7}px #c5d87b88)`:'none';
    $('.material-emitter').style.opacity=state.powered?'1':'.25';
  }
  $('#progress-bar').style.width=m.progress+'%';
  if(state.scanning) {
    $('#scan-label').textContent='Scanning… '+m.progress+'%';
    $('#crt-status').textContent='> SAMPLING / '+String(m.progress).padStart(3,'0')+'%';
    $('#scan-beam').setAttribute('opacity',reduced.matches?'0':'.75');
    $('#scan-beam').setAttribute('transform',`translate(0 ${state.progress*63})`);
  } else $('#scan-beam').setAttribute('opacity','0');
}
function tick(now) {
  raf=0;
  const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;
  state.clock+=dt;
  state.separation=reduced.matches?state.target:state.separation+(state.target-state.separation)*(1-Math.exp(-dt/.22));
  if(Math.abs(state.target-state.separation)<.0001)state.separation=state.target;
  if(state.scanning&&!reduced.matches){state.progress=Math.min(1,(performance.now()-scanStarted)/(SCAN_SECONDS*1000));if(state.progress>=1)completeScan()}
  pose();readings();
  if(visible&&!document.hidden&&(state.separation!==state.target||(state.scanning&&!reduced.matches)))raf=requestAnimationFrame(tick);
}
function run(){if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick)}}
function setSeparation(value){
  state.target=Math.max(0,Math.min(1,value));
  $('#separation').value=String(Math.round(state.target*100));$('#separation-value').textContent=Math.round(state.target*100)+'%';
  $('#separation').setAttribute('aria-valuetext',state.target===0?'Fully assembled':state.target===1?'Fully exploded':Math.round(state.target*100)+' percent separated');
  for(const [id,on] of [['assembled',state.target===0],['exploded',state.target>0]]){$('#'+id).classList.toggle('selected',on);$('#'+id).setAttribute('aria-pressed',String(on))}
  run();
}
function select(id){
  const next=state.selected===id?null:id;state.selected=next;
  const item=DATA.assemblies.find(x=>x.id===next);
  $$('[data-select]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.select===next)));
  for(const {el} of parts)el.classList.toggle('is-selected',el.dataset.assembly===next);
  $('#detail-category').textContent=item?item.category:'System overview';
  $('#detail-number').textContent=item?'0'+(DATA.assemblies.indexOf(item)+1)+' / 06':'XN–01';
  $('#detail-title').textContent=item?item.name:'Inside the cube';
  $('#detail-description').textContent=item?item.desc:'Select a part to see its role and materials.';
  $('#detail-material').textContent=item?item.material:'120 × 120 × 120 mm cube';
  if(item){$('#components').open=true;setSeparation(1);announce(item.name+' selected. '+item.desc)}
}
function finishLabels(text){$('#scan-label').textContent='Run scan';$('#scan-arrow').textContent='↗';$('#scan-status').textContent=text;$('#scan').disabled=!state.powered}
function completeScan(){
  if(!state.scanning)return;
  clearTimeout(scanTimer);state.scanning=false;state.progress=1;state.completed=true;
  finishLabels('Scan complete · X–42 saved');$('#crt-status').textContent='> SAMPLE CAPTURED / X-42';
  announce('Specimen scan complete. X-42 catalogued.');playTone();readings();
}
function startScan(){
  if(!state.powered||state.scanning)return;
  state.scanning=true;state.completed=false;state.progress=0;$('#scan').disabled=true;
  $('#scan-status').textContent='Sampling X–42';$('#scan-arrow').textContent='·';
  announce('Specimen scan started.');scanStarted=performance.now();
  scheduleScan();
  readings();run();
}
function scheduleScan(){
  clearTimeout(scanTimer);
  if(reduced.matches){state.progress=.5;scanTimer=setTimeout(completeScan,Math.max(0,SCAN_SECONDS*1000-(performance.now()-scanStarted)))}
  else scanTimer=setInterval(()=>{
    state.progress=Math.min(1,(performance.now()-scanStarted)/(SCAN_SECONDS*1000));
    if(state.progress>=1)completeScan();else if(!visible||document.hidden)readings();
  },100);
}
function power(){
  state.powered=!state.powered;state.scanning=false;state.progress=0;state.completed=false;clearTimeout(scanTimer);
  $('#power').setAttribute('aria-pressed',String(state.powered));$('#intensity').disabled=!state.powered;
  $('#link-status').innerHTML=state.powered?'<i></i> Connected':'<i></i> Offline';
  finishLabels(state.powered?'Ready':'Standby');$('#crt-status').textContent='> SPECIMEN LINK ESTABLISHED';
  announce(state.powered?'Device powered on.':'Device in standby.');readings();run();
}
function reset(){
  clearTimeout(idleTimer);clearTimeout(scanTimer);state.scanning=false;state.progress=0;state.completed=false;state.intensity=58;
  if(!state.powered)power();
  $('#intensity').value='58';$('#intensity-value').textContent='58';
  if(state.selected)select(state.selected);setSeparation(0);finishLabels('Ready');$('#crt-status').textContent='> SPECIMEN LINK ESTABLISHED';
  readings();announce('Device reset. Assembled, powered on, field intensity 58 percent.');
}
function playTone(){
  if(!state.sound||!audioContext)return;
  const now=audioContext.currentTime;
  for(const [i,freq] of [660,880].entries()){
    const osc=audioContext.createOscillator(), gain=audioContext.createGain();osc.type='sine';osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,now+i*.13);gain.gain.linearRampToValueAtTime(.045,now+i*.13+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.13+.24);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now+i*.13);osc.stop(now+i*.13+.25);
  }
}
$('#components-link').onclick=()=>{$('#components').open=true};
$('#assembled').onclick=()=>setSeparation(0);$('#exploded').onclick=()=>setSeparation(1);
$('#rendered').onclick=()=>setRenderMode('rendered');$('#wireframe').onclick=()=>setRenderMode('wireframe');
$('#separation').oninput=ev=>setSeparation(Number(ev.target.value)/100);
$('#intensity').oninput=ev=>{state.intensity=Number(ev.target.value);$('#intensity-value').textContent=ev.target.value;readings();run()};
$('#scan').onclick=startScan;$('#power').onclick=power;$('#reset').onclick=reset;
$$('[data-select]').forEach(el=>{el.onclick=()=>select(el.dataset.select);el.onpointerenter=()=>{for(const {el:p}of parts)p.classList.toggle('is-hovered',p.dataset.assembly===el.dataset.select)};el.onpointerleave=()=>parts.forEach(({el:p})=>p.classList.remove('is-hovered'))});
$('.device-svg').addEventListener('click',ev=>{
  const button=ev.target.closest('[data-device-action]');
  if(button){deviceAction(button.dataset.deviceAction);return}
  const part=ev.target.closest('[data-assembly]');if(part)select(part.dataset.assembly);
});
function deviceAction(action){if(action==='power')power();if(action==='scan')startScan();if(action==='explode')setSeparation(state.target>.5?0:1)}
$$('[data-device-action]').forEach(el=>el.addEventListener('keydown',ev=>{if(ev.key===' '||ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();deviceAction(el.dataset.deviceAction)}}));
$('#sound').onclick=async()=>{
  state.sound=!state.sound;
  if(state.sound){try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume()}catch{state.sound=false;$('#scan-status').textContent='Sound is unavailable in this browser'}}
  $('#sound').setAttribute('aria-pressed',String(state.sound));$('#sound').setAttribute('aria-label',state.sound?'Disable scan sounds':'Enable scan sounds');$('#sound').innerHTML='Sound <span>'+(state.sound?'on':'off')+'</span>';
};
$('#theme').onclick=()=>{const next=document.body.dataset.theme==='light'?'dark':'light';document.body.dataset.theme=next;$('#theme').setAttribute('aria-label','Switch to '+(next==='light'?'dark':'light')+' theme')};
$('#reference-open').onclick=()=>$('#reference-dialog').showModal();$('#reference-close').onclick=()=>$('#reference-dialog').close();
$('#reference-dialog').addEventListener('click',ev=>{if(ev.target===$('#reference-dialog')){const box=ev.target.getBoundingClientRect();if(ev.clientX<box.left||ev.clientX>box.right||ev.clientY<box.top||ev.clientY>box.bottom)ev.target.close()}});
document.addEventListener('keydown',ev=>{
  if(ev.target!==$('#stage')||ev.target.matches('input,textarea,select')||ev.metaKey||ev.ctrlKey||ev.altKey||$('#reference-dialog').open)return;
  const key=ev.key.toLowerCase();
  if(key==='e'){ev.preventDefault();setSeparation(state.target>.5?0:1)}
  else if(key==='w'){ev.preventDefault();setRenderMode(state.renderMode==='wireframe'?'rendered':'wireframe')}
  else if(key==='s')startScan();else if(key==='p')power();else if(key==='r')reset();
  else if(/^[1-6]$/.test(key))select(DATA.assemblies[Number(key)-1].id);
  else if(key==='escape'){if(state.selected)select(state.selected);setSeparation(0)}
  else if(ev.target===$('#stage')&&['ArrowLeft','ArrowRight','Home','End',' '].includes(ev.key)){ev.preventDefault();setSeparation(ev.key==='Home'?0:ev.key==='End'?1:ev.key===' '?state.target>.5?0:1:state.target+(ev.key==='ArrowRight'?.1:-.1))}
});
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();else if(raf){cancelAnimationFrame(raf);raf=0}},{rootMargin:'100px'}).observe($('#stage'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else run()});
reduced.addEventListener('change',()=>{if(state.scanning)scheduleScan();run()});
// The idle demonstration samples the specimen once; user interaction cancels it.
const cancelTour=()=>{clearTimeout(idleTimer)};
document.addEventListener('pointerdown',cancelTour,{once:true});document.addEventListener('keydown',cancelTour,{once:true});
if(!reduced.matches)idleTimer=setTimeout(()=>{if(visible&&!document.hidden&&!state.scanning&&state.powered)startScan()},12000);
pose();readings();run();
window.xnos={get state(){return {...state}},telemetry:()=>telemetry(state.intensity,state.progress,state.powered)};
