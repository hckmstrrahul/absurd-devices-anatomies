import type {AssemblyId} from './model';

// Positions traced from assets/lumen-reference.png (2000 × 1328 px), a front view from slightly above.
// The chrome frame spans image x 462–1540 (240 mm), so 1 px = 0.2226 mm. Its front face spans y 343–1070
// (the band above y 343 is the top surface seen in perspective). X right, Y up from the floor, Z toward the viewer.
export const SCALE=240/1078;
const round=(v:number)=>Math.round(v*10)/10;
export const px=(x:number,y:number):[number,number]=>[round((x-1001)*SCALE),round(95-(y-706.5)*SCALE)];

// Chrome frame: a rounded band standing on four feet.
export const FRAME={w:240,h:164,r:24,cy:95,face:9.5,wall:3,bezel:10,z:34,floor:17,bottom:13,top:177};
// Clear space inside the band, between the two panes.
export const INSIDE={x:116,y0:17,y1:173,z0:-27,z1:27};
export const GLASS={w:220,h:144,r:14,z0:27,z1:30.2};

// Light ring: centreline of the emitter strip, just inside the front bezel.
export const RING={w:214.6,h:138.6,r:11.6,width:7,z0:17,z1:20,led:{along:3.8,across:3.4,deep:1.2}};
// Emitters are spread evenly, leaving a gap for the connector at top centre.
export const RING_GAP=.009;
export const ledU=(i:number,count:number)=>RING_GAP+(i+.5)/count*(1-2*RING_GAP);
export const ringLength=()=>2*(RING.w-2*RING.r)+2*(RING.h-2*RING.r)+2*Math.PI*RING.r;
// Point on a rounded rectangle (w × h, corner radius r, centred on the origin) at perimeter fraction u,
// clockwise from top centre as seen from the front, with the outward normal.
export function roundedPoint(u:number,w:number,h:number,r:number){
 const sx=w/2-r,sy=h/2-r,arc=Math.PI*r/2;
 let d=(u-Math.floor(u))*4*(sx+sy+arc);
 const corner=(cx:number,cy:number,from:number)=>{const a=from-d/r;return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r,nx:Math.cos(a),ny:Math.sin(a)}};
 if(d<sx)return {x:d,y:h/2,nx:0,ny:1};d-=sx;
 if(d<arc)return corner(sx,sy,Math.PI/2);d-=arc;
 if(d<2*sy)return {x:w/2,y:sy-d,nx:1,ny:0};d-=2*sy;
 if(d<arc)return corner(sx,-sy,0);d-=arc;
 if(d<2*sx)return {x:sx-d,y:-h/2,nx:0,ny:-1};d-=2*sx;
 if(d<arc)return corner(-sx,-sy,-Math.PI/2);d-=arc;
 if(d<2*sy)return {x:-w/2,y:-sy+d,nx:-1,ny:0};d-=2*sy;
 if(d<arc)return corner(-sx,sy,Math.PI);d-=arc;
 return {x:-sx+d,y:h/2,nx:0,ny:1};
}
// The ring centreline, relative to the frame centre.
export const ringPoint=(u:number)=>roundedPoint(u,RING.w,RING.h,RING.r);

// Dial plate (image x 730–1283, y 430–945), its oval recess and the hand arbor.
export const DIAL={x:1.2,y:99.2,w:123,h:114.6,z0:2,z1:4};
export const RECESS={x:.4,y:99.1,rx:38.3,ry:26.7};
export const ARBOR={x:.4,y:102.7};
export const HANDS={hour:41,minute:45,second:40,set:28};
export const SET_ANGLE=315;    // the slim dark hand, parked at 10:30

// Left column. The going train's arbors are placed in train.ts; this is the plate they stand on.
export const PLATE={x0:-104,x1:-66,y0:85,y1:155,z0:-7.4,z1:-6.6};
export const GLOBE={x:-82.1,y:62,r:17.8};
// Right column.
export const BULB={x:82.1,y:134.3,r:15.5};
export const GAUGE={x:91,y:99.8,r:6.7};
export const FLASK={x:84.4,y:60.8,r:19};
// Bellows pump: a crank under a bellows that hangs from the manifold.
export const PUMP={x:70.5,y:82,crank:2,rod:8,top:98.5,r:4.6};
// Vessel walls.
export const WALL=1.5;
// Boards.
export const BASE={x0:-66,x1:66,z0:-22,z1:13,y0:18.5,y1:20};
export const STRIP={x0:-47,x1:62,y0:28.6,y1:39.7,z0:11,z1:12.2};
// Outside the frame.
export const HANDLE={x:62,ball:11.2,ballY:200,top:214};
export const KNOB={y:124,r:13,x0:119,x1:128.5};
export const FEET={x:72,z:18,r:13,h:13};

// Space each placed group takes up, for the tests. Boxes are centre and half-extents; spheres are centre and radius.
export type Zone={id:string;asm:AssemblyId;x:number;y:number;z:number;hx?:number;hy?:number;hz?:number;r?:number};
export const zones:Zone[]=[
 {id:'dial-plate',asm:'dial',x:DIAL.x,y:DIAL.y,z:3,hx:DIAL.w/2,hy:DIAL.h/2,hz:1},
 {id:'hand-stack',asm:'dial',x:ARBOR.x,y:ARBOR.y,z:8.5,hx:HANDS.minute,hy:HANDS.minute,hz:4.5},
 {id:'motion-works',asm:'dial',x:4,y:102.5,z:-5.7,hx:16.5,hy:24.5,hz:7.7},
 {id:'going-train',asm:'left',x:(PLATE.x0+PLATE.x1)/2,y:(PLATE.y0+PLATE.y1)/2,z:.8,hx:(PLATE.x1-PLATE.x0)/2,hy:(PLATE.y1-PLATE.y0)/2,hz:8.2},
 {id:'globe',asm:'left',x:GLOBE.x,y:GLOBE.y,z:0,r:GLOBE.r},
 {id:'bulb',asm:'right',x:BULB.x,y:BULB.y,z:0,r:BULB.r},
 {id:'gauge',asm:'right',x:GAUGE.x,y:GAUGE.y,z:3,hx:GAUGE.r+1,hy:GAUGE.r+1,hz:3.5},
 {id:'gauge-sector',asm:'right',x:97.75,y:108.3,z:-1.2,hx:7.75,hy:10.7,hz:.8},
 {id:'pump',asm:'right',x:PUMP.x,y:88.7,z:-2,hx:5,hy:10.3,hz:6},
 {id:'flask',asm:'right',x:FLASK.x,y:FLASK.y,z:0,r:FLASK.r},
 {id:'base-board',asm:'board',x:(BASE.x0+BASE.x1)/2,y:(BASE.y0+BASE.y1)/2,z:(BASE.z0+BASE.z1)/2,hx:(BASE.x1-BASE.x0)/2,hy:(BASE.y1-BASE.y0)/2,hz:(BASE.z1-BASE.z0)/2},
 {id:'bus-strip',asm:'board',x:(STRIP.x0+STRIP.x1)/2,y:(STRIP.y0+STRIP.y1)/2,z:13,hx:(STRIP.x1-STRIP.x0)/2,hy:(STRIP.y1-STRIP.y0)/2,hz:2},
];
export const half=(z:Zone):[number,number,number]=>z.r!==undefined?[z.r,z.r,z.r]:[z.hx!,z.hy!,z.hz!];
// Shortest gap between two zones (negative when they intersect). Spheres are tested against boxes exactly.
export function gap(a:Zone,b:Zone){
 if(a.r!==undefined&&b.r!==undefined)return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)-a.r-b.r;
 if(a.r!==undefined)return gap(b,a);
 const [hx,hy,hz]=half(a),[bx,by,bz]=b.r!==undefined?[0,0,0]:half(b);
 const dx=Math.max(Math.abs(a.x-b.x)-hx-bx,0),dy=Math.max(Math.abs(a.y-b.y)-hy-by,0),dz=Math.max(Math.abs(a.z-b.z)-hz-bz,0);
 const d=Math.hypot(dx,dy,dz)-(b.r??0);
 if(d>0||b.r!==undefined)return d;
 return Math.max(Math.abs(a.x-b.x)-hx-bx,Math.abs(a.y-b.y)-hy-by,Math.abs(a.z-b.z)-hz-bz);
}
