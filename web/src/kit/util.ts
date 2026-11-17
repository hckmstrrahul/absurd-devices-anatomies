export const clamp=(x:number,min=0,max=1)=>Math.min(max,Math.max(min,x));
export const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
export const frac=(x:number)=>x-Math.floor(x);
// Deterministic pseudo-random numbers, so every load draws the same details.
export function rng(seed:number){let s=seed>>>0;return()=>{s=(s+0x6d2b79f5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
// Staggered explosion: assemblies with a lower `order` start moving first.
const STAGGER=.06;
export function spread(separation:number,order:number,lastOrder:number){
 return smooth((clamp(separation)-order*STAGGER)/(1-lastOrder*STAGGER));
}
