// Console loose wiring, authored. Every lead runs in one piece from one named terminal to another: a socket on a part
// from `layout.ts`, or a grommet where it dives into the deck. The routes follow the reference image's wires, but the list is
// designed, not traced: the traced centre lines stopped wherever a wire passed a part. No three.js in here.
// Positions are reference pixels (0.1 mm each); heights are millimetres above the panel face.
import {footprints,at,RUNS,MM,type P2,type Foot} from './layout';

export type Tone='red'|'orange'|'black';
// `on` names the footprint the lead plugs into; `p` is the socket, on that footprint's outline (or `gap` px outside it, where
// the part has a skirt or a moulded tab); `h` is the socket's height when it is not at deck level.
export type End={on:string;p:P2;gap?:number;h?:number}|{grommet:P2};
export type Lead={id:string;c:Tone;r:number;a:End;b:End;via:P2[]};

// A point on a round footprint's outline, `deg` clockwise from three o'clock as seen in the image.
const rim=(id:string,deg:number,gap=0):End=>{const f=at(id),a=deg*Math.PI/180,r=f.r!+gap;return {on:id,p:[f.x+Math.cos(a)*r,f.y+Math.sin(a)*r],gap}};
// A point on a rectangular footprint's side: `t` runs 0..1 along that side, left to right or top to bottom.
const side=(id:string,s:'l'|'r'|'t'|'b',t=.5,o:{gap?:number;h?:number}={}):End=>{
 const f=at(id),w=f.w!,h=f.h!,g=o.gap??0;
 const p:P2=s==='l'?[f.x-w/2-g,f.y-h/2+h*t]:s==='r'?[f.x+w/2+g,f.y-h/2+h*t]:s==='t'?[f.x-w/2+w*t,f.y-h/2-g]:[f.x-w/2+w*t,f.y+h/2+g];
 return {on:id,p,...o};
};
const hole=(x:number,y:number):End=>({grommet:[x,y]});

export const LEADS:Lead[]=[
 // Top left: the jack beside knob A, and the leads to the LCD's side tabs.
 {id:'jack-feed',c:'red',r:3,a:hole(372,120),via:[[357,150],[350,190]],b:side('conn-a','t',.5,{h:1.6})},
 {id:'a-to-lcd',c:'orange',r:3,a:rim('knob-a',60),via:[[298,356],[338,404],[360,426]],b:{on:'lcd',p:[370,441],gap:5}},
 {id:'scan-loop',c:'red',r:3,a:hole(318,792),via:[[200,800],[92,776],[42,690],[40,560],[74,462],[150,418],[240,436],[318,474]],b:{on:'lcd',p:[363,484],gap:12}},
 {id:'b-to-lcd',c:'orange',r:3,a:rim('knob-b',100),via:[[552,357]],b:side('lcd','t',.453)},
 // Centre column: the upright probe, the toggle under it and knob G.
 {id:'probe-v-feed',c:'red',r:3.2,a:hole(836,548),via:[[827,584]],b:side('probe-v','t',.5,{h:.9})},
 {id:'probe-v-out',c:'black',r:4,a:side('probe-v','b',.5,{h:.9}),via:[[810,752],[790,774]],b:rim('toggle-4',-80,3)},
 {id:'toggle-to-g',c:'black',r:4,a:rim('toggle-4',85,3),via:[[780,862],[786,930],[766,986]],b:rim('knob-g',23)},
 {id:'g-feed',c:'red',r:3,a:hole(814,930),via:[[808,966],[782,1004],[738,1031]],b:rim('knob-g',32)},
 {id:'amber-to-bus',c:'black',r:5,a:rim('button-6',172,5),via:[[958,904],[950,960],[950,1014]],b:side('square-mod','t',.758,{gap:6})},
 // Middle left: the probes and the small modules they serve.
 {id:'probe-a-in',c:'red',r:3.4,a:side('orange-conn','t',.5),via:[[150,1118],[200,1100],[300,1086]],b:side('probe-a','l',.5,{h:.9})},
 {id:'probe-a-out',c:'black',r:4,a:side('probe-a','r',.5,{h:.9}),via:[[498,1085]],b:rim('knob-g',106)},
 {id:'probe-b-in',c:'red',r:3.4,a:side('probe-b','l',.5,{h:1}),via:[[440,1160],[350,1184],[270,1236],[196,1270]],b:side('pair-mod','r',.51)},
 {id:'probe-red-out',c:'black',r:4,a:side('probe-red','r',.5,{h:1.4}),via:[[742,1158]],b:side('square-mod','l',.6,{gap:6})},
 {id:'cell-to-clip',c:'black',r:3.6,a:side('clip-mod','l',.3),via:[[430,1256],[340,1252],[272,1228]],b:side('orange-cell','r',.5,{h:1.5})},
 {id:'pair-to-clip',c:'red',r:3,a:side('pair-mod','r',.82),via:[[180,1298],[260,1300],[400,1306],[458,1290]],b:side('clip-mod','l',.82)},
 {id:'bus-to-clip',c:'red',r:3,a:side('square-mod','l',.85,{gap:6}),via:[[720,1216],[620,1208],[565,1224]],b:side('clip-mod','r',.46)},
 // Lower left: knob J, the cup dials and the long probe.
 {id:'probe-c-in',c:'red',r:3.4,a:side('probe-c','l',.5,{h:1.1}),via:[[310,1652],[200,1650],[128,1632],[84,1672],[70,1740]],b:hole(70,1802)},
 {id:'j-to-cup',c:'red',r:3.4,a:rim('knob-j',126),via:[[400,1590],[260,1592],[180,1590]],b:rim('cup-i',111.5)},
 {id:'j-to-probe',c:'orange',r:3,a:rim('knob-j',68),via:[[640,1618],[612,1640]],b:side('probe-c','r',.5,{h:1.1})},
 // Centre: the pair that drops from the square module, and the leads round the small square knob.
 {id:'bus-drop-k',c:'black',r:5,a:side('square-mod','b',.166,{gap:6}),via:[[820,1300],[816,1352],[826,1450],[830,1560],[826,1650],[832,1740],[872,1808],[940,1842]],b:hole(992,1850)},
 {id:'bus-drop-o',c:'orange',r:4,a:side('square-mod','b',.05,{gap:6}),via:[[800,1300],[797,1352],[807,1450],[811,1560],[807,1650],[812,1750],[852,1826],[930,1864]],b:hole(982,1877)},
 {id:'bus-to-sq',c:'orange',r:4.4,a:side('square-mod','b',.88,{gap:6}),via:[[1010,1272],[1040,1322],[1052,1380],[1060,1412]],b:side('knob-sq','l',.45)},
 {id:'sq-to-sub',c:'black',r:4,a:side('knob-sq','b',.5),via:[[1106,1510],[1088,1556],[1062,1590]],b:side('sub-mod','r',.45,{h:2.4})},
 // Right: knob H to the touch panel.
 {id:'h-to-touch',c:'orange',r:3,a:rim('knob-h',106),via:[[1492,812],[1522,838]],b:side('touch-tab','t',.067,{h:1.2})},
];

// ── Geometry of the routes ────────────────────────────────────────────────
export const endPoint=(e:End):P2=>'grommet' in e?e.grommet:e.p;
// Signed distance from a point to a footprint's outline, px (negative inside).
export function outlineDistance(f:Foot,[x,y]:P2){
 if(f.r!==undefined)return Math.hypot(x-f.x,y-f.y)-f.r;
 const dx=Math.abs(x-f.x)-f.w!/2,dy=Math.abs(y-f.y)-f.h!/2;
 return dx>0||dy>0?Math.hypot(Math.max(dx,0),Math.max(dy,0)):Math.max(dx,dy);
}
// Catmull-Rom through the control points, resampled about every `step` px.
function smoothLine(pts:P2[],step=6):P2[]{
 const out:P2[]=[pts[0]],n=pts.length;
 for(let i=0;i<n-1;i++){
  const p0=pts[Math.max(i-1,0)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(i+2,n-1)],k=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
  for(let j=1;j<=k;j++){const t=j/k,t2=t*t,t3=t2*t;
   out.push([0,1].map(a=>.5*(2*p1[a]+(p2[a]-p0[a])*t+(2*p0[a]-5*p1[a]+4*p2[a]-p3[a])*t2+(3*p1[a]-p0[a]-3*p2[a]+p3[a])*t3)) as P2)}
 }
 return out;
}
// Plates a wire may lie on: the raised sub-panel disc and the steel strip down the left edge.
const GROUND=new Set(['disc','strip']);
const ground=(x:number,y:number)=>footprints.reduce((top,f)=>GROUND.has(f.kind)&&outlineDistance(f,[x,y])<0?Math.max(top,f.y1):top,0);

export type Route={lead:Lead;pts:P2[];h:number[];along:number[];length:number};   // h: centre height above the panel face, mm
let cache:Route[]|null=null;
// Every lead as a smooth centre line with heights: it rests on the deck (or the plate under it), lifts to its sockets, and
// climbs over any lead laid before it. The heights are relaxed so each hop is a gentle rise and never a step.
export function routes():Route[]{
 if(cache)return cache;
 const done:Route[]=[];
 for(const lead of LEADS){
  const pts=smoothLine([endPoint(lead.a),...lead.via,endPoint(lead.b)]),r=lead.r*MM,n=pts.length;
  const along=[0];for(let i=1;i<n;i++)along.push(along[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  const need=pts.map(([x,y])=>ground(x,y)+r+.06);
  for(const other of done){const reach=lead.r+other.lead.r+1,lift=(lead.r+other.lead.r)*MM+.04;
   for(let i=0;i<n;i++)for(let j=0;j<other.pts.length;j++)if(Math.abs(pts[i][0]-other.pts[j][0])<reach&&Math.hypot(pts[i][0]-other.pts[j][0],pts[i][1]-other.pts[j][1])<reach)need[i]=Math.max(need[i],other.h[j]+lift)}
  const socket=(e:End)=>'grommet' in e?r+.06:Math.max(e.h??0,r+.06);
  need[0]=Math.max(need[0],socket(lead.a));need[n-1]=Math.max(need[n-1],socket(lead.b));
  let h=[...need];
  for(let pass=0;pass<60;pass++){const next=h.map((v,i)=>i===0||i===n-1?v:Math.max(need[i],(h[i-1]+v*2+h[i+1])/4));h=next}
  done.push({lead,pts,h,along,length:along[n-1]});
 }
 return cache=done;
}
// Footprints a route passes through, ignoring `reach` px at each end where it plugs in. A part clashes when the wire's
// section overlaps it in plan and in height; the plates a wire lies on never clash.
export function routeClashes(route:Route,reach=30){
 const hits=new Set<string>(),r=route.lead.r,ends=[route.lead.a,route.lead.b].map(e=>'on' in e?e.on:'');
 route.pts.forEach((p,i)=>{
  const mid=route.along[i]>=reach&&route.along[i]<=route.length-reach;
  for(const f of footprints){
   if(f.kind==='rail'||GROUND.has(f.kind)||(!mid&&ends.includes(f.id)))continue;
   if(outlineDistance(f,p)<r&&route.h[i]-r*MM<f.y1-1e-6&&route.h[i]+r*MM>f.y0+1e-6)hits.add(f.id);
  }
 });
 return [...hits];
}
// Distance from a point to a polyline, px.
export function lineDistance(pts:readonly P2[],[x,y]:P2){
 let best=Infinity;
 for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t))}
 return best;
}
// Tubes a route touches (it must pass clear of every pipe and hose).
export const routeTubes=(route:Route)=>RUNS.filter(run=>route.pts.some(p=>lineDistance(run.pts,p)<run.r+route.lead.r+2)).map(run=>run.id);
// Red heat-shrink collars on the black leads: [start, end] distances along the route, px. One near each end.
export const sleeves=(route:Route):[number,number][]=>route.lead.c!=='black'||route.length<110?[]:route.length<230?[[route.length/2-16,route.length/2+16]]:[[42,74],[route.length-74,route.length-42]];
