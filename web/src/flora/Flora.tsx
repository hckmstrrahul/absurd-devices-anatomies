import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {flushSync} from 'react-dom';
import {makeStage,type Stage} from './scene';
import {defaults,sampleAt,tourAt,parts,geometry,timeline,SCAN_SECONDS,type Controls,type Sample,type Part,type View,type Mode} from './model';

declare global {interface Window {__flora?:{ready:boolean;render:(time:number)=>void;state:()=>{controls:Controls;sample:Sample};gpu:()=>string}}}
const capture=new URLSearchParams(location.search).has('capture');
const notes:Record<Part,string>= {
 receiver:'Receives specimen signals through an antenna beneath the lid.',
 display:'Displays the specimen and its vital readings.',
 processor:'Converts field signals into biological readings.',
 audio:'Turns specimen signals into sound.',
 power:'Powers the receiver, processor and display.',
 chassis:'Holds the six assemblies in a 120 mm cube.',
};
function Icon({name,...props}:{name:string;style?:CSSProperties;className?:string}){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{name==='play'?<path d="m8 5 11 7-11 7Z"/>:name==='pause'?<><path d="M8 5v14M16 5v14"/></>:name==='arrow'?<path d="M5 12h14m-6-6 6 6-6 6"/>:name==='back'?<path d="M19 12H5m6-6-6 6 6 6"/>:name==='reset'?<><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>:name==='expand'?<><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></>:name==='download'?<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>:name==='cube'?<><path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5m-9 5v9M7 5.8l9 5"/></>:<><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4v16"/></>}</svg>}
function Wave({sample,kind}:{sample:Sample;kind:'field'|'growth'}){
 const points=Array.from({length:90},(_,i)=>{const s=sampleAt(Math.max(0,sample.time-5)+i/89*5,sample.intensity);const y=kind==='field'?47-(s.energy*.45+.08*Math.sin((s.phase*8+i/30)*Math.PI))*58:52-s.growth*41;return `${i*2.54},${y}`}).join(' ');
 return <svg viewBox="0 0 226 65" role="img" aria-label={kind==='field'?'Field response over the last five seconds':'Simulated growth response over the last five seconds'}><path d="M0 16H226M0 38H226M0 60H226" stroke="currentColor" opacity=".12"/><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.7"/><line x1="225" y1="5" x2="225" y2="60" stroke="currentColor" opacity=".3" strokeDasharray="2 3"/></svg>
}
function Schematic({controls,sample}:{controls:Controls;sample:Sample}){
 return <svg viewBox="-180 -208 300 242" role="img" aria-label="Live front section projected from the original assembly geometry"><g fill="none" stroke="currentColor" strokeWidth=".8">{geometry.parts.map(p=>{const b=p.shape._b;const x=-b.max[1]-p.move[1]*controls.separation;const y=b.min[2]-4+p.move[2]*controls.separation;const w=b.max[1]-b.min[1],h=b.max[2]-b.min[2];return <rect key={p.name} x={x} y={-y-h} width={w} height={h} opacity={controls.selected===p.piece?1:.45} stroke={controls.selected===p.piece?'#567734':undefined}/>})}<path d="M-60 14H60m-120-4v8m120-8v8"/><path d={`M-60 ${-16-sample.phase*78}H60`} stroke="#739445" strokeDasharray="3 2"/></g><text x="0" y="29" textAnchor="middle" fill="currentColor" fontSize="10" fontFamily="monospace">{geometry.side} mm</text></svg>
}
export function Flora(){
 const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [controls,setControls]=useState<Controls>({...defaults});const controlsRef=useRef(controls);
 const [sample,setSample]=useState(()=>sampleAt(0,58));const sampleRef=useRef(sample);
 const [tour,setTour]=useState(false);const tourRef=useRef(tour);
 const [playing,setPlaying]=useState(!reduced.current);const playingRef=useRef(playing);
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [quality,setQuality]=useState('High');
 const [beatIndex,setBeatIndex]=useState(0);const [hidden,setHidden]=useState(false);
 const [anchor,setAnchor]=useState<{x:number;y:number}|null>(null);const [cursor,setCursor]=useState<{x:number;y:number;click:boolean}|null>(null);
 const movement=useRef({from:0,to:0,at:0});const shownSeparation=useRef(0);
 const container=useRef<HTMLDivElement>(null);const stage=useRef<Stage|null>(null);const clock=useRef(0);const tourStart=useRef(0);
 const selected=controls.selected?parts.find(p=>p.id===controls.selected):null;
 function stopTour(){if(tourRef.current){movement.current={from:shownSeparation.current,to:shownSeparation.current,at:0};tourRef.current=false;setTour(false);setCursor(null)}}
 function change(patch:Partial<Controls>){stopTour();if(patch.separation!==undefined)movement.current={from:shownSeparation.current,to:patch.separation,at:performance.now()};const next={...controlsRef.current,...patch};controlsRef.current=next;setControls(next)}
 function select(id:Part){const selected=controlsRef.current.selected===id?null:id;change({selected,separation:selected?1:0,isolated:false})}
 function toggleTour(){const next=!tourRef.current;tourRef.current=next;setTour(next);if(next){tourStart.current=clock.current;playingRef.current=true;setPlaying(true)}else setCursor(null)}
 function reset(){change({...defaults});stage.current?.resetCamera()}
 function togglePlaying(){stopTour();const next=!playingRef.current;playingRef.current=next;setPlaying(next)}
 function liveControls(){const m=movement.current;const x=reduced.current?1:Math.min(1,(performance.now()-m.at)/650);const ease=x*x*(3-2*x);return {...controlsRef.current,separation:m.from+(m.to-m.from)*ease}}
 function placeCursor(time:number){
  const state=tourAt(time);const next=timeline.beats[(state.index+1)%timeline.beats.length];
  const el=document.querySelector(`[data-tour="${state.beat.target}"]`);const nextEl=document.querySelector(`[data-tour="${next.target}"]`);if(!el)return;
  const r=el.getBoundingClientRect(),n=nextEl?.getBoundingClientRect()??r;const within=time%4;const f=within>3.15?Math.min(1,(within-3.15)/.85):0;const ease=f*f*(3-2*f);
  setCursor({x:r.left+r.width*.7+(n.left+n.width*.7-r.left-r.width*.7)*ease,y:r.top+r.height*.65+(n.top+n.height*.65-r.top-r.height*.65)*ease,click:within<.25});
 }
 useEffect(()=>{
  if(!container.current)return;
  let disposed=false,raf=0,previous=0,uiTime=0,badFrames=0,elapsed=0,visible=true,contextLost=false;
  try{stage.current=makeStage(container.current,id=>select(id),(ok,tier)=>{if(!disposed){setReady(ok);setQuality(tier)}})}catch{setError('3D unavailable. Try a WebGL-enabled browser.');setReady(true)}
  const surface=stage.current?.renderer.domElement;
  const lose=(e:Event)=>{e.preventDefault();contextLost=true;setError('3D paused. Reload the page to resume.')};surface?.addEventListener('webglcontextlost',lose);
  const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:.01});io.observe(container.current);
  const activity=(e:Event)=>{if((e.target as HTMLElement)?.closest?.('.tour-button'))return;stopTour()};for(const event of ['pointerdown','wheel','keydown','scroll'])window.addEventListener(event,activity,{passive:true});
  const keys=(e:KeyboardEvent)=>{if(e.metaKey||e.ctrlKey||e.altKey||(/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)||(e.key===' '&&(e.target as HTMLElement).tagName==='BUTTON')))return;const key=e.key.toLowerCase();if(key==='h'){setHidden(v=>!v)}else if(key==='r'){reset()}else if(key===' '){togglePlaying();e.preventDefault()}else if(key==='escape'){change({selected:null,isolated:false,separation:0})}else if(/^[1-6]$/.test(key))select(parts[Number(key)-1].id as Part)};window.addEventListener('keydown',keys);
  const paint=(time:number,film=false)=>{
   let c=liveControls();const tourTime=film?time:time-tourStart.current;
   if(film||tourRef.current){const state=tourAt(tourTime);c=state.controls;controlsRef.current=c;setControls(c);setBeatIndex(state.index)}
   shownSeparation.current=c.separation;if(!film&&!tourRef.current)setControls(c);const s=sampleAt(time,c.intensity);sampleRef.current=s;setSample(s);
   const target=stage.current?.draw(s,c,film||tourRef.current?tourTime:undefined,film);setAnchor(target??null);
   if(film||tourRef.current)placeCursor(tourTime);
  };
  const frame=(now:number)=>{
   raf=requestAnimationFrame(frame);const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;
   if(document.hidden||!visible||capture||contextLost)return;
   if(playingRef.current)clock.current+=dt;
   if(tourRef.current)controlsRef.current=tourAt(clock.current-tourStart.current).controls;
   const live=tourRef.current?controlsRef.current:liveControls();shownSeparation.current=live.separation;const s=sampleAt(clock.current,live.intensity);sampleRef.current=s;
   stage.current?.draw(s,live,tourRef.current?clock.current-tourStart.current:undefined);
   if(now-uiTime>90){paint(clock.current);uiTime=now}
   if(dt>.034)badFrames++;elapsed+=dt;if(elapsed>5){if(badFrames>80)stage.current?.qualityDown();badFrames=0;elapsed=0}
  };
  const init=async()=>{await stage.current?.ready;if(disposed)return;paint(0);window.__flora={ready:true,render:(t:number)=>{flushSync(()=>{tourRef.current=true;setTour(true);paint(t,true)});stage.current?.draw(sampleAt(t,tourAt(t).controls.intensity),tourAt(t).controls,t,true)},state:()=>({controls:controlsRef.current,sample:sampleRef.current}),gpu:()=>{const gl=stage.current?.renderer.getContext();const ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl&&ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'Unavailable'}};raf=requestAnimationFrame(frame)};void init();
  return()=>{disposed=true;cancelAnimationFrame(raf);io.disconnect();for(const event of ['pointerdown','wheel','keydown','scroll'])window.removeEventListener(event,activity);window.removeEventListener('keydown',keys);surface?.removeEventListener('webglcontextlost',lose);stage.current?.dispose();delete window.__flora};
 // The animation loop reads mutable refs, keeping one scene for the page lifetime.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <div className={`flora-page ${hidden?'panels-hidden':''} ${capture?'flora-film':''}`}>
  <a className="skip" href="#instrument">Skip to instrument</a>
  <header className="site-header"><a className="flora-brand" href="/" aria-label="Absurd Devices Anatomies home"><span className="brand-star">✲</span><span>ABSURD<br/>DEVICES</span></a><a className="archive-link" href="/"><Icon name="back"/>Back to anatomies</a></header>
  <main>
   <section className="field-study" id="instrument" aria-labelledby="flora-title">
    <div className="study-heading"><div><div className="eyebrow">FIELD STUDY <span>/</span> 001</div><h1 id="flora-title">XNOS Flora<span className="title-dot">.</span></h1></div><div className="heading-aside"><span className="concept-badge"><i/>CONCEPT</span></div></div>
    <div className="console">
     <aside className="telemetry panel" aria-label="Live specimen readings">
      <div className="panel-kicker"><span>SPECIMEN X–42</span><span className="live-dot">{playing?'LIVE':'HELD'}</span></div>
      <div className="vitality"><span className="metric-label">Vitality index</span><div><output data-reading="vitality">{sample.vitality}</output><span>%</span></div><div className="segmented-meter" aria-hidden="true">{Array.from({length:25},(_,i)=><i key={i} className={i<sample.vitality/4?'filled':''}/>)}</div><p>{sample.stress>0?'Field saturation':'Specimen linked'}</p></div>
      <div className="metric-pair"><div><span className="metric-label">Absorption</span><strong data-reading="absorption">{sample.absorption}<small>%</small></strong></div><div><span className="metric-label">Toxicity</span><strong data-reading="toxicity">{sample.toxicity}<small>idx</small></strong></div></div>
      <div className="chart"><div className="chart-heading"><span>FIELD RESPONSE</span><output>{sample.frequency.toFixed(2)} <small>MHz</small></output></div><Wave sample={sample} kind="field"/><div className="axis"><span>−{SCAN_SECONDS} s</span><span>NOW</span></div></div>
      <div className="chart growth-chart"><div className="chart-heading"><span>GROWTH RESPONSE</span><output>{sample.growth.toFixed(2)} <small>idx</small></output></div><Wave sample={sample} kind="growth"/></div>
      <div className="scan-status"><span>SCAN {String(sample.cycle).padStart(3,'0')}</span><span>{Math.round(sample.phase*100)}%</span><div><i style={{width:`${sample.phase*100}%`}}/></div></div>
      <div className="simulation-note">Simulated readings.</div>
     </aside>
     <div className="viewport-wrap">
      <div className="viewport-meta"><span><i/> {controls.mode==='section'?'SECTION A—A':controls.mode==='xray'?'X-RAY STUDY':'ASSEMBLY STUDY'}</span><span>{geometry.parts.length} PARTS / {parts.length} SYSTEMS</span></div>
      <div className="stage" ref={container} data-testid="flora-stage"/>
      {!ready&&!error&&<div className="loading"><span className="loading-star">✲</span>Loading instrument…</div>}
      {error&&<div className="stage-error"><img src="/assets/xnos-flora-unit.png" alt="XNOS Flora concept reference"/><p>{error}</p></div>}
      {selected&&anchor&&<div className="callout-layer" aria-hidden="true"><svg><path d={`M${anchor.x} ${anchor.y}L${(container.current?.clientWidth??700)-195} 75H${(container.current?.clientWidth??700)-25}`}/><circle cx={anchor.x} cy={anchor.y} r="3"/></svg><span style={{left:(container.current?.clientWidth??700)-175,top:52}}>{selected.name}</span></div>}
      <div className="stage-bottom"><span>DRAG TO ORBIT <b>·</b> SCROLL TO ZOOM</span><button className="icon-button" onClick={()=>setHidden(v=>!v)} aria-label={hidden?'Show panels':'Hide panels'} title="Hide panels (H)"><Icon name="expand"/></button></div>
      <div className="camera-controls" role="group" aria-label="Camera views">{(['hero','front','side','top','inside'] as View[]).map((v,i)=><button key={v} data-tour={`view-${v}`} onClick={()=>{change(v==='inside'?{view:v,mode:'section',separation:.3}:{view:v});if(v==='hero')stage.current?.resetCamera()}} aria-pressed={controls.view===v}><span>{String(i+1).padStart(2,'0')}</span>{v==='hero'?'Perspective':v==='inside'?'Interior':v[0].toUpperCase()+v.slice(1)}</button>)}</div>
     </div>
     <aside className="systems panel" aria-label="Assembly inspector">
      <div className="panel-kicker"><span>ASSEMBLIES</span><span>06</span></div>
      <div className="system-list">{parts.map((p,i)=><button key={p.id} data-tour={`part-${p.id}`} onClick={()=>select(p.id as Part)} aria-pressed={controls.selected===p.id}><span className="system-number">0{i+1}</span><span>{p.name}</span><span className="system-plus">{controls.selected===p.id?'−':'+'}</span></button>)}</div>
      <div className="part-description" aria-live="polite"><p>{controls.selected?notes[controls.selected]:'Select an assembly to inspect it.'}</p>{controls.selected&&<button className="isolate-button" onClick={()=>change({isolated:!controls.isolated})} aria-pressed={controls.isolated}><Icon name="cube"/>{controls.isolated?'Show all assemblies':'Isolate this assembly'}</button>}</div>
      <div className="schematic"><div className="chart-heading"><span>LIVE SECTION</span><span>A—A</span></div><Schematic controls={controls} sample={sample}/></div>
     </aside>
    </div>
    <div className="control-desk">
     <div className="desk-group view-modes"><span className="desk-label">SURFACE</span><div role="group" aria-label="Surface mode">{(['solid','xray','section'] as Mode[]).map(mode=><button key={mode} data-tour={`mode-${mode}`} aria-pressed={controls.mode===mode} onClick={()=>change({mode})}>{mode==='solid'?'Solid':mode==='xray'?'X-ray':'Cutaway'}</button>)}</div></div>
     <div className="desk-group range-group"><label className="desk-label" htmlFor="separation">SEPARATION <output>{Math.round(controls.separation*100)}%</output></label><input id="separation" type="range" min="0" max="100" step="1" value={Math.round(controls.separation*100)} onChange={e=>change({separation:Number(e.target.value)/100})}/></div>
     <div className={`desk-group range-group ${sample.stress>0?'saturated':''}`}><label className="desk-label" htmlFor="intensity">FIELD INTENSITY <output>{Math.round(controls.intensity)}%</output></label><input id="intensity" type="range" min="0" max="100" value={Math.round(controls.intensity)} onChange={e=>change({intensity:Number(e.target.value)})}/></div>
     <div className="desk-actions"><button className="icon-button" onClick={togglePlaying} aria-label={playing?'Pause scan':'Resume scan'} title={playing?'Pause scan':'Resume scan'}><Icon name={playing?'pause':'play'}/></button><button className="icon-button" data-tour="reset" onClick={reset} aria-label="Reset instrument" title="Reset instrument (R)"><Icon name="reset"/></button><button className={`tour-button ${tour?'active':''}`} onClick={toggleTour} aria-pressed={tour}><Icon name={tour?'pause':'play'}/>{tour?'Pause tour':'Take a tour'}</button></div>
    </div>
    <div className="console-footer"><span><i className={tour?'on':''}/>{tour?`AUTO TOUR / ${String(beatIndex+1).padStart(2,'0')} — ${timeline.beats[beatIndex].title}`:'MANUAL CONTROL'}</span><span>{geometry.side} × {geometry.side} × {geometry.side} mm <b>·</b> {quality} detail <b>·</b> <kbd>H</kbd> Hide panels</span></div>
   </section>


   <section className="film-section"><div><h2>Assembly tour</h2><p>32 seconds with sound.</p><a className="text-link" href="/flora/xnos-flora.mp4" download><Icon name="download"/>Download film</a></div><video controls preload="none" poster="/flora/film-poster.jpg" aria-label="XNOS Flora assembly tour"><source src="/flora/xnos-flora.mp4" type="video/mp4"/>Your browser does not support video. Use the download link.</video></section>

  </main>
  <footer className="site-footer"><a className="flora-brand" href="/"><span className="brand-star">✲</span><span>ABSURD DEVICES</span></a><a href="https://github.com/elvarofficial/teardown" target="_blank" rel="noreferrer">Teardown ↗</a></footer>
  {tour&&cursor&&!hidden&&<div className={`tour-cursor ${cursor.click?'press':''}`} style={{left:cursor.x,top:cursor.y}} aria-hidden="true"><svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v22l6-6 5 9 4-2-5-9 8-1Z" fill="#283c23" stroke="#f5f6ee" strokeWidth="1.5"/></svg><span>AUTO TOUR</span></div>}
 </div>
}
