// Cobalt layout, in millimetres. No three.js. Origin at the board centre; x runs right and z toward the viewer
// (down the page in a top view). Heights are measured from the plinth's top face unless a comment says otherwise.
// Everything on the board is generated here once: parts, the lands under their terminals, and every gull-wing lead.
// The 0.25 mm routing lattice is chosen so the 0.5 mm pitch rows of U1, J2 and J3 sit exactly on it.

export type Rect=[number,number,number,number];                         // x0, z0, x1, z1
export type Asm='cover'|'flex'|'screws'|'chips'|'connectors'|'passives'|'board'|'standoffs'|'plinth';
export const BOARD={w:46,d:40,r:3,t:1.6};
export const GRID=.25;
export const STAND=5;                                                    // standoff height
export const TOP=STAND+BOARD.t;                                          // board top face above the plinth
export const HOLES:[number,number][]=[[-19.5,-16.5],[19.5,-16.5],[-19.5,16.5],[19.5,16.5]];
export const HOLE={drill:1.15,ring:2.6};
// The plinth: a steel block with its front-right corner cut away, and a brass block standing in the cut.
export const PLINTH={x0:-40,x1:38,z0:-36,z1:37,h:160,bevel:.55,notch:{x:26.5,z:24},brass:{drop:13,out:6,gap:.35}};

export type Kind='qfp'|'soic'|'sot5'|'sot3'|'shield'|'w2b'|'fpc'|'b2b'|'led'|'xtal'|'ind'|'tant'|'c0402'|'r0402'|'c0603'|'r0603'|'tp';
// `w` and `d` are the body's size along x and z as placed; `rot` 90 means its terminals lie along z.
export type Part={ref:string;kind:Kind;x:number;z:number;w:number;d:number;h:number;rot:0|90;asm:Asm;value:string};
// A land. `grp`/`k` name an ordered row the router takes buses from. `route` is false for lands that take no surface trace.
export type Pad={x:number;z:number;w:number;d:number;r:number;part:string;grp?:string;k?:number;route:boolean;hole?:number};
// A gull-wing lead: where it leaves the body and which way it points.
export type Lead={part:string;fam:'qfp'|'soic'|'sot';x:number;z:number;dx:number;dz:number};
export const LEAD={
 qfp:{span:1,rise:.72,w:.22,t:.13},
 soic:{span:1.05,rise:.78,w:.42,t:.2},
 sot:{span:.62,rise:.5,w:.4,t:.15},
} as const;
export const CHIP={c0402:[1,.5,.5],r0402:[1,.5,.35],c0603:[1.6,.8,.8],r0603:[1.6,.8,.45]} as const;
const LAND={c0402:[.5,.6,.48],r0402:[.5,.6,.48],c0603:[.75,.9,.78],r0603:[.75,.9,.78]} as const; // along, across, centre offset

// U1, the 80-lead flat pack the flex ribbon loops over.
export const U1={x:4,z:-1.5,body:12,h:1.4,pins:20,pitch:.5};
// The flex ribbon, as a centre line in (z, height above the board top). It leaves J2 toward the viewer, climbs over U1,
// turns back on itself and ends under the cover plate.
export const FLEX={x:4,w:7.5,t:.14,low:.75,over:3.6,loop:{z:5.8,r:2.4},end:-11.5};
export const COVER={x:4,z:-6.5,w:18,d:15,t:1.3,r:2.2};
export const coverBase=()=>FLEX.over+FLEX.loop.r*2+FLEX.t/2;             // underside of the cover plate above the board top
export function flexPath(step=.25):[number,number][]{
 const {low,over,loop,end}=FLEX,raw:[number,number][]=[];
 const line=(a:[number,number],b:[number,number])=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05));for(let i=0;i<=n;i++)raw.push([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n])};
 line([-15.4,low],[-13,low]);
 // An S-bend up to the height it crosses the chip at.
 {const p0=[-13,low],p1=[-10.9,low],p2=[-10.6,over],p3=[-8.5,over];for(let i=1;i<=60;i++){const t=i/60,u=1-t;raw.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]])}}
 line([-8.5,over],[loop.z,over]);
 for(let i=1;i<=90;i++){const a=-Math.PI/2+Math.PI*i/90;raw.push([loop.z+Math.cos(a)*loop.r,over+loop.r+Math.sin(a)*loop.r])}
 line([loop.z,over+loop.r*2],[end,over+loop.r*2]);
 // Resample evenly along the length.
 const out:[number,number][]=[raw[0]];let carry=0;
 for(let i=1;i<raw.length;i++){
  const a=raw[i-1],b=raw[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);let at=step-carry;
  while(at<=len){out.push([a[0]+(b[0]-a[0])*at/len,a[1]+(b[1]-a[1])*at/len]);at+=step}
  carry=len-(at-step);
 }
 out.push(raw[raw.length-1]);return out;
}

export type Layout={parts:Part[];pads:Pad[];leads:Lead[]};
let cached:Layout|null=null;
export function layout():Layout{
 if(cached)return cached;
 const parts:Part[]=[],pads:Pad[]=[],leads:Lead[]=[],count:Record<string,number>={};
 const next=(prefix:string)=>{count[prefix]=(count[prefix]??0)+1;return prefix+count[prefix]};
 const part=(ref:string,kind:Kind,x:number,z:number,w:number,d:number,h:number,asm:Asm,value:string,rot:0|90=0)=>{parts.push({ref,kind,x,z,w,d,h,rot,asm,value});return ref};
 const pad=(p:string,x:number,z:number,w:number,d:number,o:Partial<Pad>={})=>pads.push({x,z,w,d,r:Math.min(w,d)*.2,part:p,route:true,...o});
 // Two-terminal chips.
 const chip=(kind:'c0402'|'r0402'|'c0603'|'r0603',x:number,z:number,rot:0|90,value:string)=>{
  const [l,a,h]=CHIP[kind],[pl,pa,pc]=LAND[kind],ref=part(next(kind[0]==='c'?'C':'R'),kind,x,z,rot?a:l,rot?l:a,h,'passives',value,rot);
  for(const s of [-1,1])rot?pad(ref,x,z+s*pc,pa,pl):pad(ref,x+s*pc,z,pl,pa);
 };

 // ── U1: 80-lead flat pack, 12 mm body, 0.5 mm pitch. Sides: front (+z), right (+x), back (−z), left (−x). ──
 {
  const {x,z,body,pins,pitch}=U1,e=body/2;part('U1','qfp',x,z,body,body,U1.h,'chips','ORYN Q80');
  const sides:[string,number,number][]=[['f',0,1],['r',1,0],['b',0,-1],['l',-1,0]];
  for(const [name,dx,dz] of sides)for(let i=0;i<pins;i++){
   const o=(i-(pins-1)/2)*pitch,lx=x+dx*e+(dx?0:o),lz=z+dz*e+(dz?0:o);
   leads.push({part:'U1',fam:'qfp',x:lx,z:lz,dx,dz});
   pad('U1',lx+dx*.85,lz+dz*.85,dx?1.5:.28,dz?1.5:.28,{grp:'u1:'+name,k:i,r:.08});
  }
 }
 // ── U2: eight-lead small-outline amplifier. ──
 {
  const x=-12.5,z=9.2;part('U2','soic',x,z,4.9,3.9,1.5,'chips','L4718');
  for(const s of [-1,1])for(let i=0;i<4;i++){const lx=x+(i-1.5)*1.27;leads.push({part:'U2',fam:'soic',x:lx,z:z+s*1.95,dx:0,dz:s});pad('U2',lx,z+s*2.7,.6,1.5)}
 }
 // ── U3: shielded radio block with a soldered fence of lands. Only the right and front rows carry signals. ──
 {
  const x=-14,z=-5,w=9,d=8;part('U3','shield',x,z,w,d,2.4,'chips','RF-0912');
  for(let i=0;i<6;i++){const o=(i-2.5)*1.4;pad('U3',x+o,z-d/2-.15,.8,.7,{route:false});pad('U3',x+o,z+d/2+.15,.8,.7,{grp:'u3:f',k:i})}
  for(let i=0;i<5;i++){const o=(i-2)*1.4;pad('U3',x-w/2-.15,z+o,.7,.8,{route:false});pad('U3',x+w/2+.15,z+o,.7,.8,{grp:'u3:r',k:i})}
 }
 // ── U4 regulator (five leads) and Q1 switch (three). ──
 {
  const x=17.5,z=4.8;part('U4','sot5',x,z,2.9,1.6,1.1,'chips','K5J');
  for(const [o,s] of [[-.95,1],[0,1],[.95,1],[-.95,-1],[.95,-1]]){leads.push({part:'U4',fam:'sot',x:x+o,z:z+s*.8,dx:0,dz:s});pad('U4',x+o,z+s*1.3,.55,1)}
 }
 {
  const x=-3.5,z=11.25;part('Q1','sot3',x,z,2.9,1.3,1,'chips','A7');
  for(const [o,s] of [[-.95,1],[.95,1],[0,-1]]){leads.push({part:'Q1',fam:'sot',x:x+o,z:z+s*.65,dx:0,dz:s});pad('Q1',x+o,z+s*1.15,.55,1)}
 }
 // ── J1: white four-way wire-to-board header, pins through the board. ──
 {const x=18.4,z=-3.5;part('J1','w2b',x,z,5.6,10.4,5.6,'connectors','4W');for(let i=0;i<4;i++)pad('J1',x,z+(i-1.5)*2,1.7,1.7,{r:.85,hole:.45,grp:'j1',k:i})}
 // ── J2: flex connector, fourteen contacts with their tails along the back. ──
 {
  const x=FLEX.x,z=-15.6;part('J2','fpc',x,z,10.5,3.6,1.3,'connectors','14F');
  for(let i=0;i<14;i++)pad('J2',x+(i-6.5)*.5,z-2.25,.28,1.1,{grp:'j2',k:i,r:.08});
  for(const s of [-1,1])pad('J2',x+s*5.6,z+.6,.7,1.6,{route:false});
 }
 // ── J3: board-to-board connector, two rows of thirty at 0.5 mm. ──
 {
  const x=2,z=17.1;part('J3','b2b',x,z,21,2.8,1.25,'connectors','60M');
  for(let i=0;i<30;i++){const lx=x+(i-14.5)*.5;pad('J3',lx,z-1.65,.26,1.1,{grp:'j3:t',k:i,r:.08});pad('J3',lx,z+1.65,.26,1.1,{grp:'j3:b',k:i,r:.08})}
  for(const s of [-1,1])pad('J3',x+s*10.2,z,.9,1.6,{route:false});
 }
 // ── Indicators with their series resistors. ──
 for(const [z,name] of [[1.6,'ACT'],[4.6,'PWR']] as [number,string][]){
  const ref=part(next('D'),'led',-20.4,z,.8,1.6,.6,'passives',name,90);for(const s of [-1,1])pad(ref,-20.4,z+s*.78,.9,.75);
  chip('r0603',-18.4,z,90,'472');
 }
 // ── Crystal, power inductor, tantalum capacitors. ──
 {const x=11.4,z=11.1;part('Y1','xtal',x,z,3.2,2.5,.8,'chips','24.000');for(const sx of [-1,1])for(const sz of [-1,1])pad('Y1',x+sx*1.1,z+sz*.8,1,.8)}
 {const x=16.3,z=10.4;part('L1','ind',x,z,4,4,2.1,'chips','4R7');for(const s of [-1,1])pad('L1',x+s*1.75,z,1.2,3.6)}
 for(const z of [-15.3,-12.3]){const ref=part(next('C'),'tant',-11.5,z,3.2,1.6,1.6,'passives','107A');for(const s of [-1,1])pad(ref,-11.5+s*1.35,z,1,1.3)}
 // ── Rows of small chips. ──
 for(const z of [-7.5,-6,-4.5,3,4.5])chip(z===-6?'r0402':'c0402',-5.5,z,0,'104');                        // left of U1
 for(const z of [-8,-6.5,-5,2.5,4,5.5])chip(z===4?'r0402':'c0402',13.25,z,0,'104');                          // right of U1
 for(let i=0;i<3;i++)chip('c0402',-2.5+1.5*i,8.25,90,'104');                                          // in front of U1
 for(let i=0;i<3;i++)chip('r0603',-6+2.5*i,13.75,0,'472');                                              // behind J3
 for(const z of [7.25,9.25,11.25])chip('r0603',-17.75,z,0,'472');
 for(const z of [7.5,9.25,11])chip('c0402',-8.25,z,90,'104');
 for(const z of [1.5,4.25])for(let i=0;i<4;i++)chip(i%2?'c0603':'r0603',-15.5+2*i,z,90,i%2?'106':'472');
 for(const x of [-7.25,-5.25,-3.25])for(const z of [-16.5,-14.75,-13])chip(x===-5.25?'r0402':'c0402',x,z,0,'104');
 for(const x of [12.25,14.75])for(const z of [-15.5,-13.75])chip('c0402',x,z,0,'104');
 chip('r0603',15.75,-11.25,0,'472');chip('r0603',18.5,-11.25,0,'472');
 // ── Test points. ──
 for(let i=0;i<5;i++){const ref=part(next('TP'),'tp',-15.5+1.5*i,15.5,1,1,.03,'board','');pad(ref,-15.5+1.5*i,15.5,1,1,{r:.5})}
 return cached={parts,pads,leads};
}

// The body's box including its lands and leads: what must stay clear of the next part.
export function keepout(p:Part,l:Layout):Rect{
 let r:Rect=[p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2];
 for(const q of l.pads)if(q.part===p.ref)r=[Math.min(r[0],q.x-q.w/2),Math.min(r[1],q.z-q.d/2),Math.max(r[2],q.x+q.w/2),Math.max(r[3],q.z+q.d/2)];
 return r;
}
export const overlap=(a:Rect,b:Rect,gap=0)=>a[0]<b[2]+gap&&a[2]>b[0]-gap&&a[1]<b[3]+gap&&a[3]>b[1]-gap;
// Whether a point is on the board, at least `inset` from its rounded edge.
export function onBoard(x:number,z:number,inset=0){
 const hw=BOARD.w/2-inset,hd=BOARD.d/2-inset,r=Math.max(0,BOARD.r-inset);
 if(Math.abs(x)>hw||Math.abs(z)>hd)return false;
 const dx=Math.abs(x)-(hw-r),dz=Math.abs(z)-(hd-r);return !(dx>0&&dz>0&&Math.hypot(dx,dz)>r);
}
// Copper pours: plan polygons that show as lighter fields under the mask.
export const POURS:number[][]=[
 [11.5,7.25, 20.5,7.25, 21.75,8.5, 21.75,13, 16.5,13, 15.25,14.25, 12.75,14.25, 11.5,13],
 [-16.5,-17.75, -9,-17.75, -8,-16.75, -8,-11.25, -9,-10.25, -15,-10.25, -16.5,-11.75],
 [-21.75,-.25, -19.25,-.25, -19.25,6.5, -20.5,7.75, -21.75,7.75],
 [10.75,-18.25, 15.5,-18.25, 15.5,-13.5, 14.25,-12.25, 10.75,-12.25],
];
