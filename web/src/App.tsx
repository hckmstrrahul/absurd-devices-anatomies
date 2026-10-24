import {useCallback,useEffect,useReducer,useState,type KeyboardEvent} from 'react';
import {Cube01,LayersThree01,RefreshCcw01,Sun,Moon01,ArrowUpRight} from '@untitledui/icons';
import {Button} from '@/components/base/buttons/button';
import {ButtonGroup,ButtonGroupItem} from '@/components/base/button-group/button-group';
import {Slider} from '@/components/base/slider/slider';
import {Badge} from '@/components/base/badges/badges';
import {Tooltip} from '@/components/base/tooltip/tooltip';
import {Device} from './Device';
import {ReferenceImage} from './ReferenceImage';
import {initialState,instrumentReducer} from './instrument';
import data from './generated/device.json';

export function App(){
  const [state,dispatch]=useReducer(instrumentReducer,initialState);
  const [theme,setTheme]=useState<'light'|'dark'>(()=>location.pathname.includes('index-dark')?'dark':'light');
  const selected=data.assemblies.find(a=>a.id===state.selected);
  const pose=state.target===0?'Assembled':state.target===1?'Exploded':'Separated';
  useEffect(()=>{document.documentElement.classList.toggle('dark-mode',theme==='dark');document.documentElement.style.colorScheme=theme},[theme]);
  const onSelect=useCallback((id:string)=>dispatch({type:'select',id}),[]);
  const onKey=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.metaKey||event.ctrlKey||event.altKey)return;const key=event.key.toLowerCase();
    if(key==='w')dispatch({type:'mode',value:state.mode==='wireframe'?'rendered':'wireframe'});
    else if(key==='e'||key===' ')dispatch({type:'separate',value:state.target>.5?0:1});
    else if(key==='r')dispatch({type:'reset'});
    else if(key==='escape')dispatch({type:'assemble'});
    else if(/^[1-6]$/.test(key))onSelect(data.assemblies[Number(key)-1].id);
    else if(['arrowleft','arrowright','home','end'].includes(key))dispatch({type:'separate',value:key==='home'?0:key==='end'?1:state.target+(key==='arrowright'?.1:-.1)});
    else return;event.preventDefault();
  };
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="app-container">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Absurd Devices Anatomies home"><span className="brand-mark" aria-hidden="true">✲</span><span>Absurd Devices Anatomies</span></a>
        <ButtonGroup size="sm" className="theme-control accent-segments" aria-label="Color theme" disallowEmptySelection selectedKeys={new Set([theme])} onSelectionChange={keys=>setTheme(keys.has('dark')?'dark':'light')}>
          <ButtonGroupItem id="light" aria-label="Light" iconLeading={Sun}/>
          <ButtonGroupItem id="dark" aria-label="Dark" iconLeading={Moon01}/>
        </ButtonGroup>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="page-heading" aria-labelledby="page-title"><div><h1 id="page-title">XNOS Flora Interface Unit</h1><p>A pivotal advance in extra-terrestrial biological observation. Real-time data on alien flora’s vital statistics, growth, and genetic changes with sub-nanometer accuracy.</p></div><Badge size="sm" type="modern" color="gray">Interactive model</Badge></section>
        <div className="workbench">
          <div className="model-column">
            <section className="model-card" aria-label="Device viewer">
              <div className="model-toolbar"><ButtonGroup size="sm" className="accent-segments" aria-label="Assembly view" disallowEmptySelection selectedKeys={new Set([state.target===0?'assembled':'exploded'])} onSelectionChange={keys=>dispatch({type:'separate',value:keys.has('assembled')?0:1})}><ButtonGroupItem id="assembled" iconLeading={Cube01}>Assembled</ButtonGroupItem><ButtonGroupItem id="exploded" iconLeading={LayersThree01}>Exploded</ButtonGroupItem></ButtonGroup><Tooltip title="Reset device"><Button color="tertiary" size="sm" aria-label="Reset device" iconLeading={RefreshCcw01} onPress={()=>dispatch({type:'reset'})}/></Tooltip></div>
              <Device state={state} theme={theme} onSelect={onSelect} onKey={onKey}/>
              <div className="model-caption"><span>120 × 120 × 120 mm</span><span>{data.count} parts <span className="caption-dot">·</span> {pose}</span></div>
              <div className="viewer-controls"><div className="separation-control"><div className="control-label"><span id="separation-label">Separation</span><output>{Math.round(state.target*100)}%</output></div><Slider label="Separation" value={Math.round(state.target*100)} onChange={value=>dispatch({type:'separate',value:Number(value)/100})} formatOptions={{style:'decimal'}}/></div><ButtonGroup size="sm" className="accent-segments" aria-label="Drawing style" disallowEmptySelection selectedKeys={new Set([state.mode])} onSelectionChange={keys=>dispatch({type:'mode',value:keys.has('wireframe')?'wireframe':'rendered'})}><ButtonGroupItem id="wireframe">Wireframe</ButtonGroupItem><ButtonGroupItem id="rendered">Rendered</ButtonGroupItem></ButtonGroup></div>
            </section>
            <section id="details" className="details-section" aria-labelledby="details-title">
              <h2 id="details-title">Details</h2>
              <div className="reference-grid">
                <ReferenceImage src="/assets/xnos-flora-unit.png" alt="XNOS Flora Interface Unit with olive casing, bronze speaker and botanical display" name="device concept"/>
                <ReferenceImage src="/assets/xnos-flora-schematic.png" alt="Annotated XNOS Flora Interface Unit schematic" name="device schematic"/>
              </div>
            </section>
          </div>
          <aside className="inspector" aria-label="Device inspector">
            <section className="component-panel"><div className="panel-heading"><h2>Components</h2><Badge type="modern" size="sm" color="gray">06</Badge></div><div className="component-list">{data.assemblies.map((part,i)=><Button key={part.id} size="sm" color="tertiary" className="component-button" aria-pressed={state.selected===part.id} data-selected={state.selected===part.id||undefined} onPress={()=>onSelect(part.id)}><span className="component-content"><span className="component-number">0{i+1}</span><span>{part.name}</span><ArrowUpRight className="component-arrow"/></span></Button>)}</div><div className="component-details" aria-live="polite">{selected?<><h3>{selected.name}</h3><p>{selected.desc}</p><span className="material-label">{selected.material}</span></>:<p>Select a part to explore its role and materials.</p>}</div></section>
          </aside>
        </div>
      </main>
      <footer><time dateTime="2026-10">Oct 2026</time><a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Built with Anatomy <ArrowUpRight/></a></footer>
    </div>
  </>;
}
