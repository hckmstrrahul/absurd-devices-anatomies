import {memo,useEffect,useRef,useState,type KeyboardEvent} from 'react';
import data from './generated/device.json';
import {startDisplayScan} from './display-scan';
import type {InstrumentState} from './instrument';

export function useReducedMotion(){
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(media.matches);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)},[]);
  return reduced;
}
interface Props {state:InstrumentState;theme:'light'|'dark';onSelect:(id:string)=>void;onKey:(event:KeyboardEvent<HTMLDivElement>)=>void;}
export const Device=memo(function Device({state,theme,onSelect,onKey}:Props){
  const root=useRef<HTMLDivElement>(null),target=useRef(state.target),current=useRef(0),start=useRef(()=>{});
  const reduced=useReducedMotion();
  target.current=state.target;
  useEffect(()=>{
    const host=root.current!;
    const parts=[...host.querySelectorAll<SVGGElement>('.device-part')].map(el=>({el,key:Number(el.dataset.key),move:el.dataset.move!.split(',').map(Number)}));
    const parent=host.querySelector('#device-parts')!;
    const {P}=data,a=P.azimuth*Math.PI/180,e=P.elevation*Math.PI/180,s=P.scale*Math.sqrt(1.6);
    let raf=0,last=0,visible=true,lastOrder='';
    const paint=()=>{
      const t=current.current;
      for(const part of parts){const [x,y,z]=part.move.map(v=>v*t);part.el.setAttribute('transform',`translate(${(x*Math.sin(a)-y*Math.cos(a))*s} ${((x*Math.cos(a)+y*Math.sin(a))*Math.sin(e)-z*Math.cos(e))*s})`)}
      const depth=(p:typeof parts[number])=>p.key+((p.move[0]*Math.cos(a)+p.move[1]*Math.sin(a))*Math.cos(e)+p.move[2]*Math.sin(e))*t;
      const sorted=[...parts].sort((x,y)=>depth(x)-depth(y));const order=sorted.map(p=>p.el.dataset.item).join(',');
      if(order!==lastOrder){for(const part of sorted)parent.append(part.el);lastOrder=order}
      const zoom=1.16-t*.35;parent.setAttribute('transform',`translate(${450*(1-zoom)} ${340*(1-zoom)+t*30}) scale(${zoom})`);
    };
    const tick=(now:number)=>{raf=0;const dt=last?Math.min((now-last)/1000,1/30):1/60;last=now;current.current=reduced?target.current:current.current+(target.current-current.current)*(1-Math.exp(-dt/.22));if(Math.abs(current.current-target.current)<.0001)current.current=target.current;paint();if(current.current!==target.current&&visible&&!document.hidden)raf=requestAnimationFrame(tick)};
    const run=()=>{if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick)}};start.current=run;
    const observer=new IntersectionObserver(entries=>{visible=entries.at(-1)!.isIntersecting;if(visible)run();else{cancelAnimationFrame(raf);raf=0}},{rootMargin:'100px'});observer.observe(host);
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else run()};document.addEventListener('visibilitychange',visibility);run();
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);cancelAnimationFrame(raf);start.current=()=>{}};
  },[reduced]);
  useEffect(()=>start.current(),[state.target]);
  useEffect(()=>{root.current?.querySelectorAll<SVGGElement>('.device-part').forEach(el=>el.classList.toggle('is-selected',el.dataset.assembly===state.selected))},[state.selected]);
  useEffect(()=>startDisplayScan(root.current!,state.selected==='display',reduced),[state.selected,reduced]);
  return <div ref={root} id="stage" className="iso model-stage" data-theme={theme} data-render={state.mode} tabIndex={0} role="group" aria-label="Interactive XNOS model. Focus for keyboard shortcuts, or use the view and component controls." onKeyDown={event=>{
    if(event.target===event.currentTarget)onKey(event);
  }} onClick={event=>{
    const el=event.target as Element;
    const part=el.closest('[data-assembly]') as SVGGElement|null;if(part)onSelect(part.dataset.assembly!);
  }} dangerouslySetInnerHTML={{__html:data.svg}} />;
});
