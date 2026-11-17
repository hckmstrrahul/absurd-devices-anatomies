import {useEffect,useRef,useState} from 'react';
import {Cube01,LayersThree01,Play,Stop,RefreshCcw01,Sun,Moon01,ArrowUpRight} from '@untitledui/icons';
import {Button} from '@/components/base/buttons/button';
import {ButtonGroup,ButtonGroupItem} from '@/components/base/button-group/button-group';
import {Slider} from '@/components/base/slider/slider';
import {Badge} from '@/components/base/badges/badges';
import {Tooltip} from '@/components/base/tooltip/tooltip';
import {makeStage} from './stage';
import {devices} from './registry';
import type {DeviceDef,Readout,Values} from './types';

type Mode='assembled'|'exploded'|'play';
type Controls={mode:Mode;separation:number;selected:string|null;playing:boolean;dark:boolean;values:Values};
declare global {interface Window {__device?:{ready:boolean;state:()=>{controls:Controls;pose:unknown;separation:number;view:string}}}}
const only=<T extends string>(keys:Iterable<unknown>)=>[...keys][0] as T;

export function DevicePage<S,P>({def}:{def:DeviceDef<S,P>}){
 const {assemblies}=def;
 const reduced=useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [controls,setControls]=useState<Controls>({mode:'assembled',separation:0,selected:null,playing:false,dark:false,values:{...def.defaults}});
 const live=useRef(controls);
 const [view,setView]=useState(def.views[0].id);
 const [readouts,setReadouts]=useState<Readout[]>(()=>def.readouts(def.sim.pose(def.sim.start,def.defaults)));
 const [anchor,setAnchor]=useState<{x:number;y:number}|null>(null);
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [count,setCount]=useState(0);
 const host=useRef<HTMLDivElement>(null);const stage=useRef<{setView(id:string):void}|null>(null);
 const sim=useRef<S>(def.sim.start);

 function change(patch:Partial<Controls>){const next={...live.current,...patch};live.current=next;setControls(next)}
 function setMode(mode:Mode){change({mode,separation:mode==='exploded'?1:0,playing:mode==='play'&&!reduced.current})}
 function select(id:string){change({selected:live.current.selected===id?null:id})}
 function look(next:string){setView(next);stage.current?.setView(next)}
 function reset(){sim.current=def.sim.start;change({mode:'assembled',separation:0,selected:null,playing:false,values:{...def.defaults}});look(def.views[0].id)}
 function setValue(id:string,value:number|string){change({values:{...live.current.values,[id]:value}})}

 useEffect(()=>{document.documentElement.classList.toggle('dark-mode',controls.dark);document.documentElement.style.colorScheme=controls.dark?'dark':'light'},[controls.dark]);
 useEffect(()=>{
  const el=host.current;if(!el)return;
  let frame=0,previous=0,painted=0,visible=true,lost=false,disposed=false,slow=0,elapsed=0;
  let made;try{made=makeStage(el,def,select,reduced.current)}catch{setError('3D needs WebGL, which this browser has turned off.');return}
  const current=made;stage.current=current;const canvas=current.renderer.domElement;setCount(current.count);
  const onLost=(e:Event)=>{e.preventDefault();lost=true;setError('3D paused. Reload to resume.')};canvas.addEventListener('webglcontextlost',onLost);
  const watcher=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting},{threshold:.01});watcher.observe(el);
  let shownReadouts='',shownAnchor='-';
  const tick=(now:number)=>{
   frame=requestAnimationFrame(tick);
   // Clamp long gaps so the platter never jumps after the tab was hidden.
   const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;
   if(document.hidden||!visible||lost)return;
   const c=live.current;
   sim.current=def.sim.step(sim.current,dt,c.playing,c.values);
   const pose=def.sim.pose(sim.current,c.values);
   const point=current.draw({separation:c.separation,selected:c.selected,pose,dark:c.dark},dt);
   if(now-painted>100){painted=now;const next=def.readouts(pose),key=JSON.stringify(next);if(key!==shownReadouts){shownReadouts=key;setReadouts(next)}const at=point?`${Math.round(point.x)},${Math.round(point.y)}`:'';if(at!==shownAnchor){shownAnchor=at;setAnchor(point)}}
   if(dt>.04)slow++;elapsed+=dt;if(elapsed>4){if(slow>90)current.qualityDown();slow=0;elapsed=0}
  };
  current.ready.then(()=>{
   if(disposed)return;setReady(true);
   window.__device={ready:true,state:()=>({controls:live.current,pose:def.sim.pose(sim.current,live.current.values),separation:current.separation,view:current.view})};
   frame=requestAnimationFrame(tick);
  }).catch(()=>{});
  const keys=(e:KeyboardEvent)=>{
   const target=e.target as HTMLElement;
   if(e.metaKey||e.ctrlKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
   const key=e.key.toLowerCase();
   // A device that takes keys in Play gets the arrows even when a toolbar button still has focus; sliders keep theirs.
   const steering=!!def.control&&live.current.mode==='play'&&key.startsWith('arrow')&&!target.closest('[role=slider]');
   // Otherwise space and arrows belong to whichever control has focus.
   if(!steering&&(key===' '||key.startsWith('arrow'))&&target.closest('button,[role=radio],[role=slider]'))return;
   if(key===' ')setMode(live.current.mode==='play'&&live.current.playing?'assembled':'play');
   else if(key==='e')setMode(live.current.mode==='exploded'?'assembled':'exploded');
   else if(key==='r')reset();
   else if(key==='escape')change({selected:null});
   else if(/^[1-9]$/.test(key)&&assemblies[Number(key)-1])select(assemblies[Number(key)-1].id);
   else if(def.control&&live.current.mode==='play'){
    // A device returns the same state for a key it does not use; leave that key to the browser.
    const next=def.control(sim.current,key,true);if(next===sim.current&&!steering)return;sim.current=next;
   }else return;
   e.preventDefault();
  };
  const keyup=(e:KeyboardEvent)=>{if(def.control&&live.current.mode==='play')sim.current=def.control(sim.current,e.key.toLowerCase(),false)};
  window.addEventListener('keyup',keyup);
  window.addEventListener('keydown',keys);
  return()=>{disposed=true;cancelAnimationFrame(frame);watcher.disconnect();window.removeEventListener('keydown',keys);window.removeEventListener('keyup',keyup);canvas.removeEventListener('webglcontextlost',onLost);current.dispose();stage.current=null;delete window.__device};
 // One scene for the page lifetime; the loop reads the latest controls from a ref.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 const selected=assemblies.find(a=>a.id===controls.selected);
 return <>
  <a className="skip-link" href="#main">Skip to content</a>
  <div className="app-container">
   <header className="app-header">
    <a className="brand" href="/" aria-label="Absurd Devices Anatomies home"><span className="brand-mark" aria-hidden="true">✲</span><span>Absurd Devices Anatomies</span></a>
    <div className="header-actions">
     <nav className="device-nav" aria-label="Devices">{devices.map(d=><a key={d.slug} href={`/${d.slug}/`} aria-current={d.slug===def.slug?'page':undefined}>{d.title}</a>)}</nav>
     <ButtonGroup size="sm" className="theme-control accent-segments" aria-label="Color theme" disallowEmptySelection selectedKeys={new Set([controls.dark?'dark':'light'])} onSelectionChange={keys=>change({dark:keys.has('dark')})}>
      <ButtonGroupItem id="light" aria-label="Light" iconLeading={Sun}/>
      <ButtonGroupItem id="dark" aria-label="Dark" iconLeading={Moon01}/>
     </ButtonGroup>
    </div>
   </header>
   <main id="main" tabIndex={-1}>
    <section className="page-heading" aria-labelledby="page-title"><h1 id="page-title">{def.title}</h1><Badge size="sm" type="modern" color="gray">Concept</Badge></section>
    <div className="workbench">
     <div className="model-column">
      <section className="model-card" aria-label="Device viewer">
       <div className="model-toolbar">
        <ButtonGroup size="sm" className="accent-segments" aria-label="Mode" disallowEmptySelection selectedKeys={new Set([controls.mode])} onSelectionChange={keys=>setMode(only<Mode>(keys))}>
         <ButtonGroupItem id="assembled" iconLeading={Cube01}>Assembled</ButtonGroupItem>
         <ButtonGroupItem id="exploded" iconLeading={LayersThree01}>Exploded</ButtonGroupItem>
         <ButtonGroupItem id="play" iconLeading={Play}>Play</ButtonGroupItem>
        </ButtonGroup>
        <div className="orbit-toolbar-end">
         <ButtonGroup size="sm" aria-label="Camera" disallowEmptySelection selectedKeys={new Set([view])} onSelectionChange={keys=>look(only<string>(keys))}>
          {def.views.map(v=><ButtonGroupItem key={v.id} id={v.id}>{v.label}</ButtonGroupItem>)}
         </ButtonGroup>
         <Tooltip title="Reset"><Button color="tertiary" size="sm" aria-label="Reset" iconLeading={RefreshCcw01} onPress={reset}/></Tooltip>
        </div>
       </div>
       <div className="orbit-stage" ref={host} data-testid="device-stage">
        {!ready&&!error&&<div className="orbit-loading" role="status">Loading…</div>}
        {error&&<div className="orbit-error"><img src={def.reference} alt={`${def.title} reference image`}/><p>{error}</p></div>}
        {selected&&anchor&&<span className="orbit-callout" style={{left:anchor.x,top:anchor.y}} aria-hidden="true">{selected.name}</span>}
       </div>
       <div className="model-caption"><span>{def.size}</span><span>{count} parts</span></div>
       <div className="viewer-controls orbit-controls">
        {controls.mode==='exploded'&&<div className="separation-control"><div className="control-label"><span>Separation</span><output>{Math.round(controls.separation*100)}%</output></div><Slider label="Separation" value={Math.round(controls.separation*100)} onChange={value=>change({separation:Number(value)/100})} formatOptions={{style:'decimal'}}/></div>}
        {controls.mode==='play'&&<>
         <Button size="sm" color="secondary" iconLeading={controls.playing?Stop:Play} onPress={()=>change({playing:!controls.playing})}>{controls.playing?'Stop':'Start'}</Button>
         {def.inputs.map(input=>input.kind==='segment'
          ?<ButtonGroup key={input.id} size="sm" className="accent-segments" aria-label={input.label} disallowEmptySelection selectedKeys={new Set([String(controls.values[input.id])])} onSelectionChange={keys=>setValue(input.id,only<string>(keys))}>
            {input.options.map(o=><ButtonGroupItem key={o.id} id={o.id}>{o.label}</ButtonGroupItem>)}
           </ButtonGroup>
          :<div key={input.id} className="separation-control"><div className="control-label"><span>{input.label}</span><output>{input.format(Number(controls.values[input.id]))}</output></div><Slider label={input.label} minValue={input.min} maxValue={input.max} step={input.step} value={Number(controls.values[input.id])} onChange={value=>setValue(input.id,Number(value))} formatOptions={{style:'decimal'}}/></div>)}
        </>}
        {controls.mode==='assembled'&&<span className="orbit-hint">Drag to orbit · Scroll to zoom</span>}
       </div>
      </section>
     </div>
     <aside className="inspector" aria-label="Device inspector">
      <section className="component-panel">
       <div className="panel-heading"><h2>Components</h2><Badge type="modern" size="sm" color="gray">0{assemblies.length}</Badge></div>
       <div className="component-list">{assemblies.map((part,i)=><Button key={part.id} size="sm" color="tertiary" className="component-button" aria-pressed={controls.selected===part.id} data-selected={controls.selected===part.id||undefined} onPress={()=>select(part.id)}><span className="component-content"><span className="component-number">0{i+1}</span><span>{part.name}</span><ArrowUpRight className="component-arrow"/></span></Button>)}</div>
       <div className="component-details" aria-live="polite"><p>{selected?selected.note:'Select a part.'}</p></div>
      </section>
      <section className="component-panel orbit-readouts" aria-label="Live readings">
       {readouts.map(r=>r.meter===undefined
        ?<div key={r.label}><span>{r.label}</span><output data-reading={r.label}>{r.value}</output></div>
        :<div key={r.label} className="wide"><span>{r.label}</span><div className="orbit-meter" role="meter" aria-label={r.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.meter*100)}>{Array.from({length:12},(_,i)=><i key={i} className={i<Math.round(r.meter!*12)?'on':''}/>)}</div></div>)}
      </section>
     </aside>
    </div>
   </main>
   <footer><div className="footer-meta"><time dateTime="2026-11">Nov 2026</time><span aria-hidden="true">·</span><a href="/">Anatomies</a></div><a href="https://github.com/elvarofficial/teardown" target="_blank" rel="noreferrer">Built with Teardown <ArrowUpRight/></a></footer>
  </div>
 </>;
}
