import '@testing-library/jest-dom/vitest';
import {afterEach,vi} from 'vitest';
import {cleanup} from '@testing-library/react';
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()});
Object.defineProperty(window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}}),configurable:true});
globalThis.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}} as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView=vi.fn();
