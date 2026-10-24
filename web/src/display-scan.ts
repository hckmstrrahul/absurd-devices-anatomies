import {SCAN_SECONDS,telemetry} from '../../model.mjs';

/** Animate only the selected display; keep per-frame work outside React. */
export function startDisplayScan(host:HTMLElement,active:boolean,reduced:boolean){
  const find=(selector:string)=>host.querySelector<SVGElement>(selector)!;
  const beam=find('#scan-beam'),radar=find('#radar-needle'),wave=find('#crt-wave');
  const plant=find('#specimen'),record=find('#crt-record'),status=find('#crt-status');
  const vitality=find('#crt-vitality'),toxicity=find('#crt-toxicity');
  const growth=find('#crt-growth'),absorption=find('#crt-absorption');
  const vitalBars=[...host.querySelectorAll<SVGElement>('.vital-bar')];
  const absorptionBars=[...host.querySelectorAll<SVGElement>('.absorption-bar')];
  const restingWave=wave.getAttribute('d')!;
  const text=(node:SVGElement,value:string)=>{if(node.textContent!==value)node.textContent=value};

  const paint=(elapsed:number,scanning:boolean)=>{
    const progress=(elapsed%(SCAN_SECONDS*1000))/(SCAN_SECONDS*1000);
    const angle=progress*Math.PI*2;
    const m=telemetry(scanning?58+26*Math.sin(angle):58,progress);
    text(vitality,`${m.vitality}%`);text(toxicity,String(m.toxicity));
    text(growth,m.growth.toFixed(2));text(absorption,`${m.absorption}%`);
    text(status,scanning?`> SAMPLING / ${m.progress}%`:active&&reduced?'> SCAN ACTIVE / X-42':'> SPECIMEN LINK ESTABLISHED');
    beam.setAttribute('opacity',scanning?String(.75*Math.min(1,progress*12,(1-progress)*12)):'0');
    beam.setAttribute('transform',`translate(0 ${scanning?progress*63:0})`);
    radar.setAttribute('transform',`rotate(${scanning?progress*360:m.toxicity*2.4} 75 55)`);
    plant.setAttribute('opacity',String(scanning?.86+.14*Math.cos(angle):1));
    record.setAttribute('opacity',String(scanning?.6+.4*Math.cos(angle*2):1));
    for(const [i,bar] of vitalBars.entries()){
      bar.setAttribute('opacity',i<m.vitality/10?'1':'.2');
      const scale=scanning?.75+.25*Math.sin(angle-i*.45):1;
      bar.setAttribute('transform',`translate(0 ${36*(1-scale)}) scale(1 ${scale})`);
    }
    for(const [i,bar] of absorptionBars.entries())bar.setAttribute('opacity',i<m.absorption/10?'1':'.2');
    wave.setAttribute('d',scanning?Array.from({length:9},(_,i)=>`${i?'L':'M'}${64+i*4} ${(77-i*.6+Math.sin(angle*2-i*.9)*1.5).toFixed(2)}`).join(' '):restingWave);
  };

  paint(0,false);
  if(!active||reduced)return;

  let raf=0,elapsed=0,last:number|null=null,lastPaint=-Infinity,visible=true;
  const tick=(now:number)=>{
    raf=0;
    if(!visible||document.hidden)return;
    if(last!==null)elapsed+=Math.min(now-last,100);
    last=now;
    // The small SVG screen needs at most 30 updates per second.
    if(now-lastPaint>=1000/30){paint(elapsed,true);lastPaint=now}
    raf=requestAnimationFrame(tick);
  };
  const pause=()=>{cancelAnimationFrame(raf);raf=0;last=null};
  const resume=()=>{if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick)};
  const visibility=()=>{if(document.hidden)pause();else resume()};
  const observer=new IntersectionObserver(entries=>{
    visible=entries.at(-1)?.isIntersecting??false;
    if(visible)resume();else pause();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange',visibility);
  resume();
  return ()=>{
    pause();observer.disconnect();document.removeEventListener('visibilitychange',visibility);
    paint(0,false);
  };
}
