import {act,fireEvent,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe,it,expect,vi} from 'vitest';
import {App} from './App';
import data from './generated/device.json';
import {initialState,instrumentReducer} from './instrument';

function enableMotion(){
  vi.spyOn(window,'matchMedia').mockReturnValue({matches:false,addEventListener(){},removeEventListener(){}} as unknown as MediaQueryList);
}
function displayFrame(stage:HTMLElement){
  return ['#scan-beam','#radar-needle','#crt-wave','#specimen','#crt-record','.vital-bar','#crt-vitality','#crt-toxicity','#crt-growth','#crt-absorption'].map(selector=>{
    const node=stage.querySelector(selector)!;
    return [node.getAttribute('transform'),node.getAttribute('opacity'),node.getAttribute('d'),node.textContent].join('|');
  });
}

describe('Untitled UI anatomy controls',()=>{
  it('switches styles, opens every assembly and resets without changing the drawing style',async()=>{
    const user=userEvent.setup();render(<App/>);
    const stage=screen.getByRole('group',{name:/Interactive XNOS model/});
    expect(stage).toHaveAttribute('data-render','wireframe');
    await user.click(screen.getByRole('radio',{name:'Rendered'}));expect(stage).toHaveAttribute('data-render','rendered');
    for(const part of data.assemblies){const button=screen.getByRole('button',{name:new RegExp(part.name)});await user.click(button);expect(button).toHaveAttribute('aria-pressed','true');expect(screen.getByText(part.desc)).toBeVisible();expect(screen.getByRole('radio',{name:'Exploded'})).toHaveAttribute('aria-checked','true')}
    await user.click(screen.getByRole('button',{name:'Reset device'}));expect(stage).toHaveAttribute('data-render','rendered');expect(screen.getByRole('radio',{name:'Assembled'})).toHaveAttribute('aria-checked','true');
  });
  it('loops every screen visualization only while the specimen display is selected',()=>{
    vi.useFakeTimers();enableMotion();render(<App/>);
    const stage=screen.getByRole('group',{name:/Interactive XNOS model/});
    const resting=displayFrame(stage);
    fireEvent.click(screen.getByRole('button',{name:/Specimen display/}));
    act(()=>vi.advanceTimersByTime(1100));
    const scanning=displayFrame(stage);
    scanning.forEach((value,i)=>expect(value).not.toBe(resting[i]));
    expect(stage.querySelector('#crt-status')).toHaveTextContent('SAMPLING');
    act(()=>vi.advanceTimersByTime(5500));
    const nextCycle=displayFrame(stage);
    expect(nextCycle).not.toEqual(scanning);
    expect(stage.querySelector('#crt-status')).toHaveTextContent('SAMPLING');
    fireEvent.click(screen.getByRole('button',{name:/Signal processor/}));
    expect(displayFrame(stage)).toEqual(resting);
    act(()=>vi.advanceTimersByTime(6000));expect(displayFrame(stage)).toEqual(resting);
    fireEvent.click(screen.getByRole('button',{name:/Specimen display/}));
    act(()=>vi.advanceTimersByTime(800));expect(displayFrame(stage)).not.toEqual(resting);
    fireEvent.click(screen.getByRole('button',{name:'Reset device'}));
    act(()=>vi.advanceTimersByTime(6000));expect(displayFrame(stage)).toEqual(resting);
  });
  it('pauses display motion outside the viewport or in a hidden tab, and resumes on return',()=>{
    vi.useFakeTimers();enableMotion();
    let hidden=false;
    vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
    const observers:IntersectionObserverCallback[]=[];
    vi.stubGlobal('IntersectionObserver',class{
      constructor(callback:IntersectionObserverCallback){observers.push(callback)}
      observe(){}disconnect(){}unobserve(){}
    });
    render(<App/>);
    const stage=screen.getByRole('group',{name:/Interactive XNOS model/});
    fireEvent.click(screen.getByRole('button',{name:/Specimen display/}));
    act(()=>vi.advanceTimersByTime(900));
    hidden=true;fireEvent(document,new Event('visibilitychange'));
    const paused=displayFrame(stage);
    act(()=>vi.advanceTimersByTime(6000));expect(displayFrame(stage)).toEqual(paused);
    hidden=false;fireEvent(document,new Event('visibilitychange'));
    act(()=>vi.advanceTimersByTime(900));expect(displayFrame(stage)).not.toEqual(paused);
    act(()=>observers.forEach(callback=>callback([{isIntersecting:false}] as IntersectionObserverEntry[],{} as IntersectionObserver)));
    const offscreen=displayFrame(stage);
    act(()=>vi.advanceTimersByTime(6000));expect(displayFrame(stage)).toEqual(offscreen);
    act(()=>observers.forEach(callback=>callback([{isIntersecting:true}] as IntersectionObserverEntry[],{} as IntersectionObserver)));
    act(()=>vi.advanceTimersByTime(900));expect(displayFrame(stage)).not.toEqual(offscreen);
  });
  it('keeps a static scan indication when reduced motion is requested',()=>{
    vi.useFakeTimers();render(<App/>);
    const stage=screen.getByRole('group',{name:/Interactive XNOS model/});
    fireEvent.click(screen.getByRole('button',{name:/Specimen display/}));
    const snapshot=displayFrame(stage);
    act(()=>vi.advanceTimersByTime(12000));expect(displayFrame(stage)).toEqual(snapshot);
    expect(stage.querySelector('#scan-beam')).toHaveAttribute('opacity','0');
    expect(stage.querySelector('#crt-status')).toHaveTextContent('SCAN ACTIVE');
  });
  it('supports model-scoped shortcuts, the separation slider, icon themes and inline details',async()=>{
    const user=userEvent.setup();render(<App/>);const stage=screen.getByRole('group',{name:/Interactive XNOS model/});
    fireEvent.keyDown(document.body,{key:'w'});expect(stage).toHaveAttribute('data-render','wireframe');
    stage.focus();await user.keyboard('w');expect(stage).toHaveAttribute('data-render','rendered');await user.keyboard('2');expect(screen.getByText(data.assemblies[1].desc)).toBeVisible();await user.keyboard('{Escape}');
    const slider=screen.getByRole('slider',{name:'Separation'});slider.focus();await user.keyboard('{End}');expect(slider).toHaveValue('100');
    await user.click(screen.getByRole('radio',{name:'Dark'}));expect(document.documentElement).toHaveClass('dark-mode');expect(stage).toHaveAttribute('data-theme','dark');expect(screen.getByRole('radio',{name:'Dark'})).toHaveAttribute('aria-checked','true');
    await user.keyboard('{ArrowLeft} ');expect(screen.getByRole('radio',{name:'Light'})).toHaveAttribute('aria-checked','true');expect(document.documentElement).not.toHaveClass('dark-mode');expect(stage).toHaveAttribute('data-theme','light');
    const details=screen.getByRole('region',{name:'Details'});expect(within(details).getAllByRole('img')).toHaveLength(2);
  });
  it('clamps separation and clears selection when assembling or resetting',()=>{
    expect(instrumentReducer(initialState,{type:'separate',value:4}).target).toBe(1);
    expect(instrumentReducer(initialState,{type:'separate',value:-2}).target).toBe(0);
    expect(instrumentReducer({...initialState,selected:'display',target:1},{type:'assemble'})).toEqual(initialState);
    expect(instrumentReducer({...initialState,mode:'rendered',selected:'audio',target:1},{type:'reset'})).toEqual({...initialState,mode:'rendered'});
  });
});
