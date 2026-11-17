// Frost layout. An original board: nothing here is traced from a photograph. Millimetres, origin at the board centre,
// x to the right, z toward the viewer (down the page in a top view). Heights are measured from the board's top face.
// No three.js in here: the print, the router, the geometry and the tests all read these numbers.
import {rng} from '../kit/util';

export type Rect=[number,number,number,number];                 // x0, z0, x1, z1
export const rect=(cx:number,cz:number,w:number,d:number):Rect=>[cx-w/2,cz-d/2,cx+w/2,cz+d/2];
export const grow=(b:Rect,m:number):Rect=>[b[0]-m,b[1]-m,b[2]+m,b[3]+m];
export const overlap=(a:Rect,b:Rect)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];

// The card: 90 × 70 mm, 1.6 mm thick, on four 8 mm brass standoffs.
export const BOARD={w:90,d:70,t:1.6,r:3,lift:8};
export const TOP=BOARD.lift+BOARD.t;                            // world height of the top face
export const HOLE={drill:1.6,ring:3.1};
export const HOLES:[number,number][]=[[-41,-31],[41,-31],[-41,31],[41,31]];

// A land: centre, size, and which way its lead leaves the body (0 +x, 1 +z, 2 −x, 3 −z).
export type Land={x:number;z:number;w:number;h:number;out:number};
const DX=[1,0,-1,0],DZ=[0,1,0,-1];
// `n` lands on each listed side of a package, centred `reach` from the middle, `len` long (outward) and `wid` wide.
export function sides(cx:number,cz:number,n:number,pitch:number,reach:number,len:number,wid:number,which=[0,1,2,3],reachZ=reach):Land[]{
 const out:Land[]=[];
 for(const s of which)for(let i=0;i<n;i++){
  const t=(i-(n-1)/2)*pitch,r=s&1?reachZ:reach;
  out.push({x:cx+DX[s]*r+(s&1?t:0),z:cz+DZ[s]*r+(s&1?0:t),w:s&1?wid:len,h:s&1?len:wid,out:s});
 }
 return out;
}

// ── Connectors ───────────────────────────────────────────────────────────
export const HEADER={x:-4,z:-30.5,cols:20,pitch:2.54,body:2.54,pin:8.4};
export const headerPins=():[number,number][]=>Array.from({length:HEADER.cols*2},(_,i)=>[HEADER.x+((i>>1)-(HEADER.cols-1)/2)*HEADER.pitch,HEADER.z+(i&1?1.27:-1.27)]);
export const JUMPER={pins:[[29.23,31],[31.77,31]] as [number,number][]};
// Edge connectors: body rectangle (they overhang the edge), height, and the side they face.
export const ETH={b:[26.5,-24,47.5,-8] as Rect,h:13.5};
export const USB={b:[29.5,-4.6,47.5,8.6] as Rect,h:15.6};
export const HDMI={b:[35,11.5,46.5,26.5] as Rect,h:6.2};
export const BARREL={b:[-46.5,-24,-32.5,-15] as Rect,h:11};
export const MICRO={b:[-46.2,-9.5,-40.4,-2] as Rect,h:2.7};
export const SD={b:[-45.5,3,-31,15] as Rect,h:1.9};
export const FFC={x:-21,z:26.8,w:18,d:5.6,h:2,n:30,pitch:.5,ribbon:15,tails:30.3};
// Through-hole pins of the edge connectors: [x, z, ring radius].
export const ETH_PINS:[number,number,number][]=[...Array.from({length:8},(_,i)=>[i&1?32.04:29.5,-16+(i-3.5)*1.27,.72] as [number,number,number]),[38,-23.7,1.35],[38,-8.3,1.35],[44.6,-21.6,.68],[44.6,-19.4,.68],[44.6,-12.6,.68],[44.6,-10.4,.68]];
export const USB_PINS:[number,number,number][]=[...[-3.5,-1,1,3.5].flatMap(t=>[[31,2+t,.75],[33.6,2+t,.75]] as [number,number,number][]),[35.5,-4.6,1.3],[35.5,8.6,1.3],[42.5,-4.6,1.3],[42.5,8.6,1.3]];
export const HDMI_LANDS=():Land[]=>Array.from({length:19},(_,i)=>({x:34.3,z:19+(i-9)*.5,w:1.7,h:.28,out:2}));
export const HDMI_PINS:[number,number,number][]=[[37.5,11.5,1.1],[37.5,26.5,1.1],[43.5,11.5,1.1],[43.5,26.5,1.1]];
export const BARREL_PINS:[number,number,number][]=[[-34,-19.5,1.5],[-40.2,-19.5,1.5],[-37.4,-23.9,1.4]];
export const MICRO_LANDS=():Land[]=>Array.from({length:5},(_,i)=>({x:-39.9,z:-5.75+(i-2)*.65,w:1.5,h:.4,out:0}));
export const MICRO_TABS:Land[]=[[-44.1,-9.6],[-44.1,-1.9],[-41.6,-9.6],[-41.6,-1.9]].map(([x,z])=>({x,z,w:1.6,h:1.5,out:z<-5?3:1}));
export const SD_LANDS=():Land[]=>Array.from({length:9},(_,i)=>({x:-30.6,z:9+(i-4)*1.1,w:1.5,h:.7,out:0}));
export const SD_TABS:Land[]=[[-44,2.7],[-44,15.3],[-33.5,2.7],[-33.5,15.3]].map(([x,z])=>({x,z,w:1.6,h:1.3,out:z<9?3:1}));
export const FFC_LANDS=():Land[]=>Array.from({length:FFC.n},(_,i)=>({x:FFC.x+(i-(FFC.n-1)/2)*FFC.pitch,z:FFC.tails,w:.28,h:1.3,out:1}));
export const FFC_TABS:Land[]=[{x:FFC.x-FFC.w/2-.2,z:27.2,w:1.8,h:2.6,out:2},{x:FFC.x+FFC.w/2+.2,z:27.2,w:1.8,h:2.6,out:0}];

// ── Packages ─────────────────────────────────────────────────────────────
export const SOC={id:'U1',x:0,z:-6,s:15,n:17,pitch:.8,lid:11.4,h:1.55};
export const SINK={x:0,z:-6,s:19,base:1.3,h:8.6,legs:12};
export const CLIP:[number,number][]=[[-10.8,-17.6],[10.8,5.6]];
export const RAM={w:13,d:9,h:1.05,cols:16,pitch:.8,rows:[-3.2,-2.4,-1.6,1.6,2.4,3.2]};
export const RAMS=[{id:'U2',x:18,z:-20.5},{id:'U3',x:18,z:-9.5}];
export const EMMC={id:'U4',x:-18.75,z:-1.5,w:11.5,d:13,h:.95,n:14,pitch:.5};
export const PMIC={id:'U5',x:-21,z:-14.5,s:5,h:.85};
export const PHY={id:'U6',x:17.5,z:4.5,s:7,h:1.4};
export const FLASH={id:'U7',x:-24,z:12,w:4.9,d:3.9,h:1.5};
export const LEVEL={id:'U8',x:29.2,z:21.5,w:4.4,d:5,h:1.1};
export const USBSW={id:'U9',x:25.5,z:-2,w:2.9,d:1.6,h:1.1};
export const LDO={id:'U10',x:-36,z:20.5,w:6.5,d:3.5,h:1.6};
export const pmicLands=()=>sides(PMIC.x,PMIC.z,8,.5,2.4,.75,.26);
export const phyLands=()=>sides(PHY.x,PHY.z,12,.5,4.25,1.3,.28);
export const flashLands=()=>sides(FLASH.x,FLASH.z,4,1.27,0,1.5,.6,[1,3],2.75);
export const levelLands=()=>sides(LEVEL.x,LEVEL.z,7,.65,2.95,1.3,.38,[0,2]);
export const usbswLands=():Land[]=>[...[-.95,0,.95].map(t=>({x:USBSW.x+t,z:USBSW.z+1.3,w:.55,h:1,out:1})),...[-.95,.95].map(t=>({x:USBSW.x+t,z:USBSW.z-1.3,w:.55,h:1,out:3}))];
export const ldoLands=():Land[]=>[...[-2.3,0,2.3].map(t=>({x:LDO.x+t,z:LDO.z+3.1,w:1,h:1.9,out:1})),{x:LDO.x,z:LDO.z-3.1,w:3.3,h:1.9,out:3}];

export const INDUCTOR={s:5,h:3};
export const INDUCTORS:[number,number][]=[[-28,-23],[-21.5,-23],[-15,-23]];
export const TANTALUM={l:7.3,w:4.3,h:2.9};
// `turn` lays the long axis along z.
export const TANTALUMS=[{id:'C1',x:-29,z:-13.5,turn:true},{id:'C2',x:-35.5,z:-9,turn:true},{id:'C3',x:27,z:12.8,turn:false}];
export const tantalumLands=(t:{x:number;z:number;turn:boolean}):Land[]=>[-1,1].map(s=>t.turn?{x:t.x,z:t.z+s*2.95,w:2.6,h:2,out:s>0?1:3}:{x:t.x+s*2.95,z:t.z,w:2,h:2.6,out:s>0?0:2});
export const XTAL={id:'Y1',x:25,z:3.5,w:3.2,d:2.5,h:.8};
export const COIN={id:'BT1',x:-9.5,z:13,r:6.4,h:3.2};
export const BUTTON={s:6,h:3.4,z:29,cap:5.1};
export const BUTTONS=[{id:'SW1',x:-4,red:false,name:'RST'},{id:'SW2',x:4.5,red:false,name:'BOOT'},{id:'SW3',x:13,red:true,name:'USR1'},{id:'SW4',x:21.5,red:true,name:'USR2'}];
export const buttonLands=(x:number):Land[]=>[[-2.25,-3.9],[2.25,-3.9],[-2.25,3.9],[2.25,3.9]].map(([dx,dz])=>({x:x+dx,z:BUTTON.z+dz,w:1.2,h:1.5,out:dz>0?1:3}));
export const LEDS={n:8,x0:0,pitch:3.4,z:19.2,rz:16.9,label:21.3};
export const ledX=(i:number)=>LEDS.x0+i*LEDS.pitch;

// ── The display on its ribbon ───────────────────────────────────────────
// The ribbon leaves the connector inboard, folds back over itself, crosses the front edge, curls under it and runs out
// along the bench to a small display. Path points are [z, height above the board top]; the bench is at −TOP.
export const MODULE={x:-21,z0:41.5,w:26,d:24,t:1,glass:[24.4,16.4] as [number,number],glassZ:55.6,screen:[21.8,10.9] as [number,number]};
export const RIBBON={x:FFC.x,w:FFC.ribbon,t:.14};
export function ribbonPath():[number,number][]{
 const p:[number,number][]=[],arc=(cz:number,cy:number,r:number,a0:number,a1:number,n=14)=>{for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;p.push([cz+Math.cos(a)*r,cy+Math.sin(a)*r])}};
 const floor=-TOP+MODULE.t+.12;
 p.push([26.2,1],[24,1],[21.6,1]);
 arc(20.6,3.7,2.7,-Math.PI/2,-Math.PI*1.5);                 // the fold-over above the board
 p.push([24,6.35],[29,6.1],[33.5,5.5]);
 arc(36.2,.75,4.6,Math.PI/2,-Math.PI/2);                    // round the front edge
 p.push([34.5,-3.85],[33.4,-3.85]);
 arc(33,(floor-3.85)/2,(-3.85-floor)/2,Math.PI/2,Math.PI*1.5); // back out along the bench
 p.push([36,floor],[40,floor],[MODULE.z0+3.6,floor]);
 return p;
}

// ── Everything that stands on the board: used to keep parts, lettering and small components apart, and by the tests. ──
export type Body={id:string;name:string;b:Rect;h:number;asm:string;over?:boolean};
export function bodies():Body[]{
 const hp=headerPins(),list:Body[]=[
  {id:'J1',name:'header',b:[hp[0][0]-1.27,HEADER.z-2.54,hp[39][0]+1.27,HEADER.z+2.54],h:HEADER.pin,asm:'header'},
  {id:'J9',name:'jumper',b:[27.96,29.73,33.04,32.27],h:8.4,asm:'header'},
  {id:'J2',name:'ethernet',b:ETH.b,h:ETH.h,asm:'ports',over:true},{id:'J3',name:'usb',b:USB.b,h:USB.h,asm:'ports',over:true},{id:'J4',name:'hdmi',b:HDMI.b,h:HDMI.h,asm:'ports',over:true},
  {id:'J5',name:'power',b:BARREL.b,h:BARREL.h,asm:'ports',over:true},{id:'J6',name:'micro-usb',b:MICRO.b,h:MICRO.h,asm:'ports',over:true},{id:'J7',name:'microsd',b:SD.b,h:SD.h,asm:'ports',over:true},
  {id:'J8',name:'ffc',b:[FFC.x-FFC.w/2-1.1,FFC.z-FFC.d/2,FFC.x+FFC.w/2+1.1,FFC.tails+.75],h:FFC.h,asm:'flex'},
  // The heat sink's footprint includes the processor under it.
  {id:SOC.id,name:'processor',b:rect(SINK.x,SINK.z,SINK.s,SINK.s),h:SINK.base+SINK.h+SOC.h,asm:'heatsink'},
  ...RAMS.map(r=>({id:r.id,name:'memory',b:rect(r.x,r.z,RAM.w,RAM.d),h:RAM.h,asm:'chips'})),
  {id:EMMC.id,name:'flash',b:rect(EMMC.x,EMMC.z,EMMC.w,EMMC.d),h:EMMC.h,asm:'chips'},
  {id:PMIC.id,name:'pmic',b:rect(PMIC.x,PMIC.z,PMIC.s+.5,PMIC.s+.5),h:PMIC.h,asm:'chips'},
  {id:PHY.id,name:'phy',b:rect(PHY.x,PHY.z,9.9,9.9),h:PHY.h,asm:'chips'},
  {id:FLASH.id,name:'boot flash',b:rect(FLASH.x,FLASH.z,FLASH.w,7),h:FLASH.h,asm:'chips'},
  {id:LEVEL.id,name:'level shifter',b:rect(LEVEL.x,LEVEL.z,7.3,LEVEL.d),h:LEVEL.h,asm:'chips'},
  {id:USBSW.id,name:'usb switch',b:rect(USBSW.x,USBSW.z,USBSW.w,3.7),h:USBSW.h,asm:'chips'},
  {id:LDO.id,name:'regulator',b:rect(LDO.x,LDO.z,LDO.w,8.2),h:LDO.h,asm:'chips'},
  ...INDUCTORS.map(([x,z],i)=>({id:'L'+(i+1),name:'inductor',b:rect(x,z,INDUCTOR.s+.4,INDUCTOR.s),h:INDUCTOR.h,asm:'parts'})),
  ...TANTALUMS.map(t=>({id:t.id,name:'tantalum',b:t.turn?rect(t.x,t.z,TANTALUM.w,TANTALUM.l+.6):rect(t.x,t.z,TANTALUM.l+.6,TANTALUM.w),h:TANTALUM.h,asm:'parts'})),
  {id:XTAL.id,name:'crystal',b:rect(XTAL.x,XTAL.z,XTAL.w+.3,XTAL.d+.3),h:XTAL.h,asm:'parts'},
  {id:COIN.id,name:'coin cell',b:[COIN.x-COIN.r-2.6,COIN.z-COIN.r,COIN.x+COIN.r+2.6,COIN.z+COIN.r],h:COIN.h,asm:'parts'},
  ...BUTTONS.map(s=>({id:s.id,name:'button',b:rect(s.x,BUTTON.z,BUTTON.s,9.3),h:BUTTON.cap,asm:'parts'})),
  ...CLIP.map(([x,z],i)=>({id:'H'+(i+1),name:'clip anchor',b:rect(x,z,2.6,2.6),h:1.4,asm:'heatsink'})),
 ];
 return list;
}
// Lettering and bus corridors that small components must leave alone.
export const TITLE:Rect=[22.6,-34,37.4,-26.2];
export const KEEP:Rect[]=[TITLE,[-8.5,-27.6,8.5,-16],[-12.8,-8,-9.8,4.6],[LEDS.x0-1.4,LEDS.rz-1.3,ledX(7)+1.4,LEDS.label+1.2],[-8.2,22.6,25.8,24.2],[RIBBON.x-RIBBON.w/2-.6,29.6,RIBBON.x+RIBBON.w/2+.6,35]];

// ── Small two-terminal components, placed by rule: decoupling round each package, then tidy rows in the open board. ──
export type Chip2={x:number;z:number;kind:keyof typeof SIZES;turn:boolean};
// [length, width, height, land offset from centre, land length, land width]
export const SIZES={c04:[1,.5,.5,.5,.55,.6],r04:[1,.5,.35,.5,.55,.6],c06:[1.6,.8,.8,.8,.8,.95],r06:[1.6,.8,.45,.8,.8,.95],c08:[2,1.25,.95,1,1,1.4],d:[1.7,1.25,.9,1.15,.8,.9]} as const;
export const footOf=(c:Chip2):Rect=>{const s=SIZES[c.kind],l=(s[3]+s[4]/2)*2,w=Math.max(s[1],s[5]);return c.turn?rect(c.x,c.z,w,l):rect(c.x,c.z,l,w)};
let made:Chip2[]|null=null;
export function passives():Chip2[]{
 if(made)return made;
 const random=rng(4107),out:Chip2[]=[],taken:Rect[]=[...bodies().map(b=>grow(b.b,.45)),...KEEP,...HOLES.map(([x,z])=>rect(x,z,HOLE.ring*2+1.6,HOLE.ring*2+1.6)),
  ...[...ETH_PINS,...USB_PINS,...HDMI_PINS,...BARREL_PINS].map(([x,z,r])=>rect(x,z,r*2+.8,r*2+.8)),
  ...[...HDMI_LANDS(),...MICRO_LANDS(),...MICRO_TABS,...SD_LANDS(),...SD_TABS,...FFC_TABS,...flashLands(),...levelLands(),...ldoLands(),...usbswLands(),...phyLands(),...TANTALUMS.flatMap(tantalumLands),...BUTTONS.flatMap(s=>buttonLands(s.x))].map(l=>rect(l.x,l.z,l.w+.7,l.h+.7)),
  ...Array.from({length:LEDS.n},(_,i)=>rect(ledX(i),(LEDS.z+LEDS.rz)/2,1.6,5)),rect(COIN.x,COIN.z,COIN.r*2+7,3.6)];
 const edge=1.7,hx=BOARD.w/2-edge,hz=BOARD.d/2-edge;
 const tryPut=(c:Chip2)=>{const f=grow(footOf(c),.26);if(f[0]<-hx||f[2]>hx||f[1]<-hz||f[3]>hz)return false;for(const t of taken)if(overlap(f,t))return false;taken.push(f);out.push(c);return true};
 // Decoupling: 0402 parts shoulder to shoulder along each side of the big packages.
 const ring=(b:Rect,gap:number,fill:number)=>{
  const [x0,z0,x1,z1]=b;
  for(let x=x0+.9;x<=x1-.9;x+=1.25){if(random()<fill)tryPut({x,z:z0-gap,kind:random()<.75?'c04':'r04',turn:true});if(random()<fill)tryPut({x,z:z1+gap,kind:random()<.75?'c04':'r04',turn:true})}
  for(let z=z0+.9;z<=z1-.9;z+=1.25){if(random()<fill)tryPut({x:x0-gap,z,kind:random()<.75?'c04':'r04',turn:false});if(random()<fill)tryPut({x:x1+gap,z,kind:random()<.75?'c04':'r04',turn:false})}
 };
 ring(rect(SINK.x,SINK.z,SINK.s,SINK.s),1.5,.62);
 for(const r of RAMS)ring(rect(r.x,r.z,RAM.w,RAM.d),1.25,.7);
 ring(rect(EMMC.x,EMMC.z,EMMC.w,EMMC.d),1.3,.55);ring(rect(PMIC.x,PMIC.z,PMIC.s+.6,PMIC.s+.6),1.25,.6);ring(rect(PHY.x,PHY.z,9.9,9.9),1.3,.4);
 // Rows: two to six of a kind on a common pitch, as a layout engineer would set them.
 const kinds:(keyof typeof SIZES)[]=['c04','c04','r04','r04','c06','c06','r06','r06','c08','d'];
 for(let tries=0;tries<9000&&out.length<300;tries++){
  const kind=kinds[Math.floor(random()*kinds.length)],s=SIZES[kind],turn=random()<.5,n=kind==='c08'||kind==='d'?1+Math.floor(random()*3):2+Math.floor(random()*5);
  const step=Math.max(s[1],s[5])+.55,x=Math.round((-hx+random()*hx*2)*4)/4,z=Math.round((-hz+random()*hz*2)*4)/4;
  let run=0;for(let i=0;i<n;i++){const ok=tryPut({x:turn?x+i*step:x,z:turn?z:z+i*step,kind,turn});if(ok)run++;else if(run)break}
 }
 return made=out;
}
