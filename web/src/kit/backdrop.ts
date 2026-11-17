import * as THREE from 'three';

// A studio sweep: wall colour at the top, a soft horizon, floor colour at the bottom, darker toward the corners.
export type Gradient={top:number;mid:number;bottom:number;horizon?:number;vignette?:number};
export type Paint=number|Gradient;

const css=(c:number)=>'#'+c.toString(16).padStart(6,'0');
// Returns something `scene.background` accepts. Textures are drawn in screen space, so the sweep stays put as the camera orbits.
export function paint(p:Paint):THREE.Color|THREE.Texture{
 if(typeof p==='number')return new THREE.Color(p);
 const size=512,c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')!;
 const h=p.horizon??.6,sweep=g.createLinearGradient(0,0,0,size);
 sweep.addColorStop(0,css(p.top));sweep.addColorStop(Math.max(.05,h-.22),css(p.top));sweep.addColorStop(h,css(p.mid));sweep.addColorStop(Math.min(.98,h+.24),css(p.bottom));sweep.addColorStop(1,css(p.bottom));
 g.fillStyle=sweep;g.fillRect(0,0,size,size);
 const v=p.vignette??.22;
 if(v>0){const shade=g.createRadialGradient(size/2,size*.52,size*.28,size/2,size*.52,size*.78);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,`rgba(0,0,0,${v})`);g.fillStyle=shade;g.fillRect(0,0,size,size)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
