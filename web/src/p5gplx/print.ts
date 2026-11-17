// The P5GPL-X SE board print, drawn as vectors in plan millimetres (u right, v down) so it stays crisp at any scale.
// One function paints either the colour sheet or the relief sheet (red height, green roughness, blue metalness) for any
// tile of the board. Pours, trace fields and lettering are traced from the rectified top photograph (see layout.ts).
import {rng} from '../kit/util';
import {BOARD,MOUNTS,MOUNT,PLAIN,COOLER,SOCKET,NB,ICH,DIMM,DIMMS,SLOTS,SLOT,ATX24,ATX12V,FLOPPY,IDE,SATA,SATA_BODY,FAN,HEADERS,HEADER,JUMPERS,LED,
 QFPS,SOICS,DPAKS,DPAK,BIOS,BATTERY,CRYSTALS,AXIAL,CAPS,TOROIDS,EDGE_TOROID,DRUM,ROD,FILMS,EMPTY,MODEL_NAME,LOGO,MARKS,STICKER,IO,IO_FACE,
 passives,SIZES,boxRect,headerRect,sataRect,type Rect} from './layout';

type G=CanvasRenderingContext2D;
export type Sheet='colour'|'relief';
const SANS='"Helvetica Neue", Helvetica, Arial, sans-serif',HEAVY='"Arial Black", "Helvetica Neue", Arial, sans-serif',NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif';

// Colours sampled from the photo (crop.mjs means), lifted a little because the studio light is softer than the photo's.
export const INK={
 bare:'#5c4724',      // mask over bare laminate: olive-brown
 pour:'#a3701e',      // mask over copper pour: amber
 half:'#8c6420',
 deep:'#4f3c1c',      // mask over laminate in the slot field: the darkest olive-brown      // mask over thin or hatched copper
 trace:'#a27628',     // a trace seen through the mask on laminate
 traceDark:'#6f5427', // a trace's shadow edge on a pour
 silk:'#ddd4b9',
 tin:'#aaa59a',
 gold:'#d9b764',
 hole:'#2a241a',
};
// Relief channels: height 0..255 around 128, roughness, metalness.
const REL={mask:[118,158,0],pour:[132,138,0],trace:[150,136,0],silk:[176,205,0],pad:[168,120,225],hole:[0,220,0]};
const rgb=(r:number[])=>`rgb(${r[0]},${r[1]},${r[2]})`;

type Pt=[number,number];
// ── Copper pours, traced from the plan. Bright amber where the mask lies on copper. ──
const POURS:{pts:Pt[];ink:'pour'|'half'|'deep'}[]=[
 {ink:'deep',pts:[[34,208],[126,208],[126,292],[34,292]]},
 {ink:'deep',pts:[[2,152],[34,152],[34,292],[2,292]]},
 {ink:'pour',pts:[[16,2],[142,2],[142,30],[124,30],[114,40],[57,40],[57,92],[63,96],[63,118],[41,120],[16,120]]},
 {ink:'pour',pts:[[162,2],[181,2],[181,168],[162,168]]},
 {ink:'half',pts:[[57,92],[112,92],[112,116],[63,118],[63,96]]},
 {ink:'pour',pts:[[90,168],[171,168],[171,199],[152,206],[132,206],[124,198],[90,198]]},
 {ink:'half',pts:[[16,120],[42,120],[42,150],[16,150]]},
 {ink:'half',pts:[[160,226],[181,226],[181,300],[160,300]]},
 {ink:'half',pts:[[40,289],[160,289],[160,303],[40,303]]},
 {ink:'pour',pts:[[118,196],[132,206],[132,224],[118,224]]},
 {ink:'half',pts:[[2,2],[16,2],[16,150],[2,150]]},
];
// The diamond pours round the left cooler holes and the plain hole by the x16 slot (bright in the photo).
const DIAMONDS:[number,number,number][]=[[46.5,105.2,13],[46.6,32,10],[119,31.6,9],[118.6,104,9],[130.1,216.3,7]];

// ── Trace fields: families of parallel lines clipped to a region, at an angle (degrees, 0 runs along u). ──
const FIELDS:{pts:Pt[];angle:number;pitch:number;w:number;gap?:number}[]=[
 {pts:[[112,40],[142,30],[142,168],[118,168],[112,120]],angle:-45,pitch:.62,w:.2,gap:5},       // DDR2 bus to the sockets
 {pts:[[63,92],[112,92],[112,116],[63,116]],angle:90,pitch:.7,w:.18,gap:6},                     // front-side bus
 {pts:[[44,150],[70,150],[70,168],[44,168]],angle:0,pitch:.6,w:.18,gap:4},
 {pts:[[2,152],[40,152],[40,288],[2,288]],angle:90,pitch:.75,w:.2,gap:3.4},                      // Super I/O to the rear panel
 {pts:[[36,200],[124,200],[124,288],[36,288]],angle:90,pitch:2.2,w:.22,gap:2},                  // PCI bus under the slots
 {pts:[[124,224],[168,224],[168,258],[124,258]],angle:0,pitch:.55,w:.16,gap:3},                 // south bridge fan-out
 {pts:[[96,224],[124,224],[124,262],[96,262]],angle:45,pitch:.66,w:.18,gap:5},
 {pts:[[118,168],[140,168],[140,196],[118,196]],angle:45,pitch:.7,w:.18,gap:5},
 {pts:[[142,168],[162,168],[162,226],[142,226]],angle:90,pitch:.66,w:.18,gap:4},
 {pts:[[63,170],[90,170],[90,198],[63,198]],angle:0,pitch:.8,w:.16,gap:5},
 {pts:[[16,120],[42,120],[42,150],[16,150]],angle:-45,pitch:.9,w:.22,gap:6},
];

// A rough, repeatable outline wobble so fields do not look ruled.
function clipPath(g:G,pts:Pt[]){g.beginPath();pts.forEach(([u,v],i)=>i?g.lineTo(u,v):g.moveTo(u,v));g.closePath()}

// Footprint pads: [u, v, w, d].
type Pad=[number,number,number,number];
function pads():Pad[]{
 const out:Pad[]=[];
 for(const q of QFPS){const lu=(q.nu-1)*q.pitch/2,lv=(q.nv-1)*q.pitch/2;
  for(let i=0;i<q.nu;i++){const u=q.u-lu+i*q.pitch;out.push([u,q.v-q.d/2-1.1,.28,1.4],[u,q.v+q.d/2+1.1,.28,1.4])}
  for(let i=0;i<q.nv;i++){const v=q.v-lv+i*q.pitch;out.push([q.u-q.w/2-1.1,v,1.4,.28],[q.u+q.w/2+1.1,v,1.4,.28])}}
 for(const s of SOICS){const l=(s.n-1)*s.pitch/2;for(let i=0;i<s.n;i++){const t=-l+i*s.pitch;
  if(s.turn)out.push([s.u-s.d/2-1,s.v+t,1.5,s.pitch*.55],[s.u+s.d/2+1,s.v+t,1.5,s.pitch*.55]);else out.push([s.u+t,s.v-s.d/2-1,s.pitch*.55,1.5],[s.u+t,s.v+s.d/2+1,s.pitch*.55,1.5])}}
 for(const p of DPAKS){const du=[1,0,-1,0][p.legs],dv=[0,1,0,-1][p.legs];
  out.push([p.u-du*.6,p.v-dv*.6,p.legs%2?6.2:6.4,p.legs%2?6.4:6.2]);
  for(const t of [-2.28,2.28])out.push([p.u+du*5.2+(p.legs%2?t:0),p.v+dv*5.2+(p.legs%2?0:t),p.legs%2?1.2:1.8,p.legs%2?1.8:1.2])}
 for(const c of passives()){const s=SIZES[c.kind];
  if(c.kind==='sot'){for(const [a,b] of [[-.95,1.1],[.95,1.1],[0,-1.1]])out.push(c.turn?[c.u+b,c.v+a,1,.9]:[c.u+a,c.v+b,.9,1]);continue}
  for(const sg of [-1,1])out.push(c.turn?[c.u,c.v+sg*s[3],s[5],s[4]]:[c.u+sg*s[3],c.v,s[4],s[5]])}
 for(const x of CRYSTALS)for(const sg of [-1,1])out.push([x.u,x.v+sg*x.len*.36,2.2,2.6]);
 out.push([BATTERY.u-BATTERY.r-1.6,BATTERY.v,3,4],[BATTERY.u+BATTERY.r+1.6,BATTERY.v,3,4]);
 for(const sg of [-1,1])out.push([AXIAL.u+sg*(AXIAL.len/2+1.6),AXIAL.v,1.6,1.6]);
 for(const f of FILMS)for(const sg of [-1,1])out.push([f.u,f.v+sg*2.2,2.4,1.4]);
 return out;
}
// Plated through-holes: [u, v, ring radius, drill radius].
type Via=[number,number,number,number];
function holes():Via[]{
 const out:Via[]=[];
 const grid=(u0:number,v0:number,cols:number,rows:number,du:number,dv:number,r=.85,d=.5)=>{for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)out.push([u0+i*du,v0+j*dv,r,d])};
 for(const c of CAPS){const s=c.d>6?3.5:2.5;out.push([c.u,c.v-s/2,.9,.45],[c.u,c.v+s/2,.9,.45])}
 for(const e of EMPTY){const s=e.r>3?3.5:2.5;if(e.side==='T')out.push([e.u,e.v-s/2,.85,.42],[e.u,e.v+s/2,.85,.42]);else out.push([e.u-s/2,e.v,.85,.42],[e.u+s/2,e.v,.85,.42])}
 for(const h of HEADERS)grid(h.u0,h.v-1.27,h.cols,2,2.54,2.54,.85,.5);
 for(const j of JUMPERS){for(const t of [-2.54,0,2.54])out.push(j.turn?[j.u+t,j.v,.8,.5]:[j.u,j.v+t,.8,.5])}
 const n=ATX24.rows;grid(ATX24.u-2.1,ATX24.v-(n-1)*2.1,2,n,4.2,4.2,1.5,.9);grid(ATX12V.u-2.1,ATX12V.v-2.1,2,2,4.2,4.2,1.5,.9);
 for(const t of TOROIDS)for(const a of [.3,Math.PI+.3])out.push([t.u+Math.cos(a)*(t.r+.9),t.v+Math.sin(a)*(t.r+.9),1.1,.6]);
 out.push([EDGE_TOROID.u,EDGE_TOROID.v-EDGE_TOROID.r+1,1,.55],[EDGE_TOROID.u,EDGE_TOROID.v+EDGE_TOROID.r-1,1,.55],[DRUM.u,DRUM.v-2.5,.9,.5],[DRUM.u,DRUM.v+2.5,.9,.5],[ROD.u,ROD.v+ROD.r+2.4,1,.55],[ROD.u,ROD.v-ROD.r-1,1,.55]);
 out.push([LED.u-1.27,LED.v,.8,.45],[LED.u+1.27,LED.v,.8,.45]);
 out.push([FAN.u-2.54,FAN.v,.85,.5],[FAN.u,FAN.v,.85,.5],[FAN.u+2.54,FAN.v,.85,.5]);
 // Stitching vias, and fields of vias under the socket and chipset.
 const random=rng(91);
 for(let i=0;i<520;i++){const u=3+random()*177,v=3+random()*299;out.push([u,v,.32,.15])}
 return out;
}
let cachedPads:Pad[]|null=null,cachedHoles:Via[]|null=null;

// ── Lettering ──
function text(g:G,s:string,u:number,v:number,size:number,o:{align?:CanvasTextAlign;font?:string;weight?:number;rot?:number;stretch?:number;spacing?:number}={}){
 g.save();g.translate(u,v);if(o.rot)g.rotate(o.rot);if(o.stretch)g.scale(o.stretch,1);
 g.font=`${o.weight??600} ${size}px ${o.font??SANS}`;g.textAlign=o.align??'left';g.textBaseline='middle';
 if(o.spacing){try{(g as unknown as {letterSpacing:string}).letterSpacing=`${o.spacing}px`}catch{/* older canvas */}}
 g.fillText(s,0,0);g.restore();
}
function outline(g:G,b:Rect,lw=.18){g.lineWidth=lw;g.strokeRect(b[0],b[1],b[2]-b[0],b[3]-b[1])}

// The FCC and CE marks, drawn as strokes.
function fcc(g:G,u:number,v:number,h:number){
 g.save();g.translate(u,v);g.lineWidth=h*.16;g.lineCap='butt';
 g.beginPath();g.moveTo(-h*.55,-h*.5);g.lineTo(-h*.95,-h*.5);g.lineTo(-h*.95,h*.5);g.moveTo(-h*.95,0);g.lineTo(-h*.65,0);g.stroke();
 for(const [cx,r] of [[0,.42],[.75,.42]] as [number,number][]){g.beginPath();g.arc(cx*h,0,r*h,Math.PI*.3,Math.PI*1.7);g.stroke()}
 g.restore();
}
function ce(g:G,u:number,v:number,h:number){
 g.save();g.translate(u,v);g.lineWidth=h*.16;
 g.beginPath();g.arc(-h*.35,0,h*.45,Math.PI*.42,Math.PI*1.58);g.stroke();
 g.beginPath();g.arc(h*.45,0,h*.45,Math.PI*.42,Math.PI*1.58);g.stroke();g.beginPath();g.moveTo(h*.12,0);g.lineTo(h*.6,0);g.stroke();
 g.restore();
}
// ASUS wordmark: the slanted, crossbar-less A and the squared S's of the period logo, as filled paths in a unit box.
function asus(g:G,u0:number,v:number,u1:number,h:number,hollow=false){
 const fillFn=g.fill.bind(g);if(hollow)g.fill=(()=>g.stroke()) as typeof g.fill;
 const w=(u1-u0)/4.3;g.save();g.translate(u0,v-h/2);
 const s=w*.24,H=h;
 // A: a slanted stem rising right, with a short foot.
 g.beginPath();g.moveTo(0,H);g.lineTo(w*.62,0);g.lineTo(w*.95,0);g.lineTo(w*.95,H);g.lineTo(w*.95-s,H);g.lineTo(w*.95-s,H*.3);g.lineTo(s*1.2,H);g.closePath();g.fill();
 const S=(x:number)=>{g.beginPath();g.moveTo(x+w*.15,0);g.lineTo(x+w*.95,0);g.lineTo(x+w*.95,s);g.lineTo(x+w*.15+s*.6,s);g.lineTo(x+w*.15+s*.6,H/2-s/2);g.lineTo(x+w*.95,H/2-s/2);g.lineTo(x+w*.95,H);g.lineTo(x,H);g.lineTo(x,H-s);g.lineTo(x+w*.95-s,H-s);g.lineTo(x+w*.95-s,H/2+s/2);g.lineTo(x+w*.15,H/2+s/2);g.closePath();g.fill()};
 S(w*1.1);
 // U
 const x=w*2.2;g.beginPath();g.moveTo(x,0);g.lineTo(x+s,0);g.lineTo(x+s,H-s);g.lineTo(x+w*.95-s,H-s);g.lineTo(x+w*.95-s,0);g.lineTo(x+w*.95,0);g.lineTo(x+w*.95,H);g.lineTo(x,H);g.closePath();g.fill();
 S(w*3.3);
 g.restore();g.fill=fillFn;
}
// The intel-style UL recognition and recycling marks are small; drawn as a ringed U and three chasing arrows.
function ul(g:G,u:number,v:number,r:number){g.save();g.lineWidth=r*.18;g.beginPath();g.arc(u,v,r,0,Math.PI*2);g.stroke();g.font=`700 ${r*1.4}px ${SANS}`;g.textAlign='center';g.textBaseline='middle';g.fillText('U',u,v+r*.1);g.restore()}
function recycle(g:G,u:number,v:number,r:number){g.save();g.lineWidth=r*.2;g.beginPath();g.arc(u,v,r,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(u-r*.55,v+r*.3);g.lineTo(u,v-r*.55);g.lineTo(u+r*.55,v+r*.3);g.closePath();g.stroke();g.restore()}

// ── The painter ──
export function paintBoard(g:G,sheet:Sheet,k:number,tile:[number,number,number,number]){
 const [tu0,tv0]=tile,colour=sheet==='colour';
 g.save();g.scale(k,k);g.translate(-tu0,-tv0);
 const fill=(c:string,r:number[])=>colour?c:rgb(r);
 const random=rng(17);

 // Base: mask on laminate.
 g.fillStyle=fill(INK.bare,REL.mask);g.fillRect(-2,-2,BOARD.w+4,BOARD.d+4);
 if(colour){
  // Broad tone drift, as a mask's thickness varies across a panel.
  const drift=rng(23);
  for(let i=0;i<60;i++){const u=drift()*BOARD.w,v=drift()*BOARD.d,r=15+drift()*40,f=g.createRadialGradient(u,v,0,u,v,r),a=.04+drift()*.05,col=drift()<.5?'60,44,16':'190,150,80';f.addColorStop(0,`rgba(${col},${a})`);f.addColorStop(1,`rgba(${col},0)`);g.fillStyle=f;g.fillRect(u-r,v-r,r*2,r*2)}
 }
 // Pours: copper under the mask is a touch smoother and raised; the deep laminate field stays flat.
 for(const p of POURS){g.fillStyle=fill(INK[p.ink],p.ink==='deep'?REL.mask:REL.pour);clipPath(g,p.pts);g.fill()}
 for(const [u,v,r] of DIAMONDS){g.fillStyle=fill('#b97e1a',REL.pour);g.beginPath();g.moveTo(u,v-r);g.lineTo(u+r,v);g.lineTo(u,v+r);g.lineTo(u-r,v);g.closePath();g.fill()}
 // Pour edges read as a thin darker line where the mask thins over the copper step.
 if(colour){g.strokeStyle='rgba(90,60,20,.35)';g.lineWidth=.22;for(const p of POURS){clipPath(g,p.pts);g.stroke()}}

 // Trace fields: seen through the mask they are subtler than the pours.
 g.globalAlpha=colour?.6:1;
 for(const f of FIELDS){
  g.save();clipPath(g,f.pts);g.clip();
  const a=f.angle*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),xs=f.pts.map(p=>p[0]),ys=f.pts.map(p=>p[1]);
  const cu=(Math.min(...xs)+Math.max(...xs))/2,cv=(Math.min(...ys)+Math.max(...ys))/2,R=Math.hypot(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))/2+2;
  g.strokeStyle=fill(INK.trace,REL.trace);g.lineWidth=f.w;g.lineCap='round';
  for(let o=-R;o<=R;o+=f.pitch){
   // Bundles: every so often skip a few lines, and break lines into runs.
   if(f.gap&&((o+R)%(f.gap*2.2))>f.gap*1.7)continue;
   const nu=-sa,nv=ca;let t=-R;
   while(t<R){const len=8+random()*40,skip=random()<.25?2+random()*6:0;
    g.beginPath();g.moveTo(cu+nu*o+ca*t,cv+nv*o+sa*t);g.lineTo(cu+nu*o+ca*(t+len),cv+nv*o+sa*(t+len));g.stroke();t+=len+skip}
  }
  g.restore();
 }
 // Routed traces: orthogonal and 45° runs between random pads in the open, as fanout from every package.
 {
  g.strokeStyle=fill(INK.trace,REL.trace);g.lineCap='round';g.lineJoin='round';
  for(let i=0;i<1400;i++){
   let u=3+random()*177,v=3+random()*299;g.lineWidth=random()<.15?.5:.2;g.beginPath();g.moveTo(u,v);
   for(let s=0;s<3;s++){const len=3+random()*14,d=Math.floor(random()*8),a=d*Math.PI/4;u+=Math.cos(a)*len;v+=Math.sin(a)*len;g.lineTo(u,v)}
   g.stroke();
  }
 }
 g.globalAlpha=1;
 // Wide power traces from the VRM toward the socket.
 g.lineWidth=2.4;g.strokeStyle=fill(INK.pour,REL.pour);g.lineCap='round';
 for(const run of [[[30,40],[52,62]],[[24,110],[48,128]],[[150,190],[168,210]]] as Pt[][]){g.beginPath();run.forEach(([u,v],i)=>i?g.lineTo(u,v):g.moveTo(u,v));g.stroke()}

 // Copper under the socket shows through the window: gold pads and small capacitors drawn as pads.
 {
  const w=SOCKET.window;g.fillStyle=fill(INK.pour,REL.pour);g.fillRect(SOCKET.u-w/2,SOCKET.v-w/2,w,w);
  g.fillStyle=fill(INK.gold,REL.pad);for(let i=0;i<8;i++)for(let j=0;j<6;j++)if(random()<.7)g.fillRect(SOCKET.u-w/2+1.2+i*1.8,SOCKET.v-w/2+1.4+j*2.4,1,.8);
 }

 // Pads (tin) and plated holes.
 cachedPads??=pads();cachedHoles??=holes();
 g.fillStyle=fill(INK.tin,REL.pad);for(const [u,v,w,d] of cachedPads)g.fillRect(u-w/2,v-d/2,w,d);
 for(const [u,v,r,d] of cachedHoles){g.fillStyle=fill(INK.tin,REL.pad);g.beginPath();g.arc(u,v,r,0,Math.PI*2);g.fill();g.fillStyle=fill(INK.hole,REL.hole);g.beginPath();g.arc(u,v,d,0,Math.PI*2);g.fill()}
 // Pin fields under through-hole connectors.
 const pinRow=(u0:number,v0:number,cols:number,rows:number,du:number,dv:number,r=.8)=>{for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){g.fillStyle=fill(INK.tin,REL.pad);g.beginPath();g.arc(u0+i*du,v0+j*dv,r,0,Math.PI*2);g.fill()}};
 for(const s of SLOTS){const n=s.kind==='pci'?60:s.kind==='x16'?82:18,p=s.kind==='pci'?1.27:1;pinRow(s.u0+3,s.v-1.4,n,2,(s.len-6)/(n-1),2.8,.42)}
 for(const d of DIMMS)pinRow(d.u-1.6,DIMM.v-DIMM.len/2+4,2,120,3.2,(DIMM.len-8)/119,.38);
 for(const b of [FLOPPY,IDE]){const n=b.n;if(b.along==='u')pinRow(b.u-(n-1)*1.27,b.v-1.27,n,2,2.54,2.54,.8);else pinRow(b.u-1.27,b.v-(n-1)*1.27,2,n,2.54,2.54,.8)}

 // Mounting holes: a wide plated ring with eight vias; the cooler holes and plain holes are bare.
 for(const [u,v] of MOUNTS){
  g.fillStyle=fill(INK.tin,REL.pad);g.beginPath();g.arc(u,v,MOUNT.ring,0,Math.PI*2);g.fill();
  g.fillStyle=fill(INK.hole,REL.hole);for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.arc(u+Math.cos(a)*MOUNT.ring*.72,v+Math.sin(a)*MOUNT.ring*.72,.32,0,Math.PI*2);g.fill()}
  g.strokeStyle=fill(INK.silk,REL.silk);g.lineWidth=.25;g.beginPath();g.arc(u,v,MOUNT.ring+.7,0,Math.PI*2);g.stroke();
 }
 for(const [u,v] of COOLER){g.fillStyle=fill('#9a6e22',REL.pour);g.beginPath();g.arc(u,v,3.6,0,Math.PI*2);g.fill()}
 for(const [u,v,r] of PLAIN){g.strokeStyle=fill(INK.silk,REL.silk);g.lineWidth=.3;g.beginPath();g.arc(u,v,r+1.6,0,Math.PI*2);g.stroke()}

 // ── Silkscreen ──
 g.strokeStyle=g.fillStyle=fill(INK.silk,REL.silk);
 // Unpopulated electrolytic footprints: circle, the negative half filled.
 for(const e of EMPTY){
  g.lineWidth=.24;g.beginPath();g.arc(e.u,e.v,e.r,0,Math.PI*2);g.stroke();
  g.beginPath();if(e.side==='T'){g.arc(e.u,e.v,e.r,Math.PI,0);g.lineTo(e.u+e.r,e.v-.15)}else{g.arc(e.u,e.v,e.r,Math.PI/2,Math.PI*1.5)}g.closePath();g.fill();
 }
 // Populated caps sit on the same footprint; only the ring outside the sleeve shows.
 for(const c of CAPS){g.lineWidth=.22;g.beginPath();g.arc(c.u,c.v,c.d/2+.5,0,Math.PI*2);g.stroke()}
 for(const t of TOROIDS){g.lineWidth=.22;g.beginPath();g.arc(t.u,t.v,t.r+1.1,0,Math.PI*2);g.stroke()}
 // Body outlines.
 const ol=(b:Rect,m=.6)=>outline(g,[b[0]-m,b[1]-m,b[2]+m,b[3]+m],.2);
 for(const q of QFPS){ol([q.u-q.w/2,q.v-q.d/2,q.u+q.w/2,q.v+q.d/2],.4);g.beginPath();g.arc(q.u-q.w/2+1.4,q.v-q.d/2+1.4,.45,0,Math.PI*2);g.fill()}
 for(const s of SOICS)ol([s.u-s.w/2,s.v-s.d/2,s.u+s.w/2,s.v+s.d/2],.3);
 for(const p of DPAKS)ol([p.u-DPAK.w/2,p.v-DPAK.d/2,p.u+DPAK.w/2,p.v+DPAK.d/2],.8);
 ol([ICH.u-ICH.s/2,ICH.v-ICH.s/2,ICH.u+ICH.s/2,ICH.v+ICH.s/2],1.4);ol([ICH.u-ICH.s/2,ICH.v-ICH.s/2,ICH.u+ICH.s/2,ICH.v+ICH.s/2],2.4);
 ol([NB.u-NB.w/2,NB.v-NB.d/2,NB.u+NB.w/2,NB.v+NB.d/2],1.2);
 // Socket keep-out: the stepped outline round the retention frame.
 {const [w,d]=SOCKET.plate;ol([SOCKET.u-w/2,SOCKET.v-d/2,SOCKET.u+w/2,SOCKET.v+d/2],2.2);g.lineWidth=.2;g.beginPath();g.moveTo(SOCKET.u-w/2-6,SOCKET.v+d/2+8);g.lineTo(SOCKET.u+w/2+8,SOCKET.v+d/2+8);g.lineTo(SOCKET.u+w/2+8,SOCKET.v-d/2-4);g.stroke()}
 for(const d of DIMMS)ol([d.u-DIMM.w/2,DIMM.v-DIMM.len/2-8,d.u+DIMM.w/2,DIMM.v+DIMM.len/2+8],.3);
 for(const s of SLOTS){const w=SLOT[s.kind].w;ol([s.u0,s.v-w/2,s.u0+s.len,s.v+w/2],.5)}
 ol([ATX24.u-ATX24.w/2,ATX24.v-ATX24.d/2,ATX24.u+ATX24.w/2,ATX24.v+ATX24.d/2],.5);ol([ATX12V.u-ATX12V.w/2,ATX12V.v-ATX12V.d/2,ATX12V.u+ATX12V.w/2,ATX12V.v+ATX12V.d/2],.5);
 ol(boxRect(FLOPPY),.4);ol(boxRect(IDE),.4);for(const s of SATA)ol(sataRect(s),.5);
 for(const h of HEADERS)ol(headerRect(h),.5);
 ol([BIOS.u-BIOS.socket[0]/2,BIOS.v-BIOS.socket[1]/2,BIOS.u+BIOS.socket[0]/2,BIOS.v+BIOS.socket[1]/2],.6);
 g.lineWidth=.24;g.beginPath();g.arc(BATTERY.u,BATTERY.v,BATTERY.r+.8,0,Math.PI*2);g.stroke();
 g.beginPath();g.arc(LED.u,LED.v,LED.r+.5,0,Math.PI*2);g.stroke();
 for(const x of CRYSTALS){g.lineWidth=.2;g.beginPath();g.roundRect(x.u-x.w/2-.6,x.v-x.len/2-.6,x.w+1.2,x.len+1.2,x.w/2+.6);g.stroke()}
 ol([FAN.u-4.4,FAN.v-2.9,FAN.u+4.4,FAN.v+2.9],.2);
 // The I/O edge carries a dashed keep-out line.
 g.setLineDash([1.2,.8]);g.lineWidth=.2;g.beginPath();g.moveTo(IO.ps2.depth+IO_FACE+1.2,1);g.lineTo(IO.ps2.depth+IO_FACE+1.2,IO.audio.v1+2);g.stroke();g.setLineDash([]);

 // Big lettering.
 g.fillStyle=fill(INK.silk,REL.silk);
 {const m=MODEL_NAME;g.save();g.font=`900 ${m.h*1.2}px ${HEAVY}`;const w=g.measureText(m.text).width;g.restore();text(g,m.text,m.u0,m.v,m.h*1.2,{font:HEAVY,weight:900,stretch:(m.u1-m.u0)/w,spacing:0});}
 g.lineWidth=.35;asus(g,LOGO.u0,LOGO.v,LOGO.u1,LOGO.h,true);
 g.strokeStyle=fill(INK.silk,REL.silk);fcc(g,MARKS.fcc[0],MARKS.fcc[1],3.6);ce(g,MARKS.ce[0],MARKS.ce[1],3.6);
 ul(g,MARKS.ul[0],MARKS.ul[1],1.3);text(g,':0S9e40C2',MARKS.ul[0]+2,MARKS.ul[1],1.9,{weight:600});text(g,'E241810  B4F0',MARKS.ul[0]+1.2,MARKS.ul[1]+3,1.7,{weight:600});
 recycle(g,MARKS.recycle[0],MARKS.recycle[1],1.4);text(g,'S-HM',MARKS.recycle[0]+2.4,MARKS.recycle[1],1.8,{weight:700});
 text(g,'94V-0',MARKS.ul[0]+12,MARKS.ul[1]+3,1.5,{weight:600});

 // Connector and part names, small, as printed beside each part.
 const lab=(s:string,u:number,v:number,size=1.5,rot=0,align:CanvasTextAlign='left')=>text(g,s,u,v,size,{rot,align,font:NARROW,weight:700});
 lab('ATX12V',19,28.6,1.5);lab('EATXPWR',176.2,111,1.6,-Math.PI/2,'center');lab('DDR2 DIMM_A1 (64 bit,240-pin module)',142,88,1.2,-Math.PI/2,'center');lab('DDR2 DIMM_B1 (64 bit,240-pin module)',161.4,88,1.2,-Math.PI/2,'center');
 lab('CD 13E',168,79.4,1.4);lab('PCIEX16',44,199.2,1.5);lab('PCI1',37,219.6,1.4);lab('PCI2',37,240,1.4);lab('PCI3',37,260.4,1.4);lab('PCIEX1_1',42.6,280.4,1.4);
 lab('FLOPPY1',70,269.4,1.5);lab('PRI_IDE',172.6,198.3,1.6,-Math.PI/2,'center');
 lab('SATA1',181.3,242.6,1.5,-Math.PI/2,'center');lab('SATA2',181.3,259.6,1.5,-Math.PI/2,'center');lab('SATA3',163,268.4,1.3);lab('SATA4',163,285.4,1.3);
 lab('CHA_FAN1',15.6,268.6,1.3);lab('AAFP',25,302.6,1.5);lab('F_PANEL',45,302.6,1.5);lab('USB56',79,302.6,1.5);lab('USB78',106,302.6,1.5);
 lab('PANEL',150,302.6,1.5);lab('ADD.L',172,302.6,1.3);lab('SB_PWR',108,289.4,1.3);lab('CLRTC',146.6,293.4,1.3);lab('CR2032 3V',124,293.6,1.3);
 lab('MASTER',168.8,287.6,1.5);lab('SATA',170.4,290,1.5);lab('POWER',169.2,292.4,1.5);lab('LAMP',170.6,294.8,1.5);
 lab('LGA775',60,94.6,1.6);lab('CPU_FAN',112,96,1.3);lab('ICH7',129,256.4,1.4);lab('SB',129,258.6,1.3);lab('BIOS',143,286.6,1.4);
 lab('PWRSW',148,304,1);lab('RESET',158,304,1);lab('IDE_LED',163.6,304,1);
 // Reference designators beside parts.
 {const r2=rng(3);for(const c of CAPS)lab('EC'+Math.floor(1+r2()*60),c.u+c.d/2+.6,c.v+c.d/2,1.1);
  SOICS.forEach(s=>lab(s.id,s.u-s.w/2,s.v-s.d/2-2,1.1));DPAKS.forEach((p,i)=>lab('Q'+(i+1),p.u+DPAK.w/2+.8,p.v-DPAK.d/2,1.1));
  QFPS.forEach(q=>lab(q.id.replace('U_','U'),q.u-q.w/2,q.v+q.d/2+3.2,1.2));JUMPERS.forEach((j,i)=>lab('JP'+(i+1),j.u+1.6,j.v-2.6,1.1))}
 // Fine silk text left of the Super I/O and down the left edge, as in the photo (illegible there, plausible here).
 lab('LAN_USB1',2.2,96,1.2);lab('KBMS',2.4,28,1.2);lab('PARALLEL',3,60,1.2);lab('AUDIO1',3,152,1.2);lab('COM1',3,84,1.2);
 lab('PRO M ROTS',3.4,190,1.3,-Math.PI/2,'center');lab('LAN',6,226,1.3,-Math.PI/2,'center');

 // Light-green barcode sticker on the right edge.
 if(colour){g.fillStyle='#a8d4b8';g.fillRect(STICKER.u-STICKER.w/2,STICKER.v-STICKER.d/2,STICKER.w,STICKER.d);g.fillStyle='#2a3a30';
  for(let v=STICKER.v-STICKER.d/2+2;v<STICKER.v+STICKER.d/2-8;v+=.25+random()*.55)g.fillRect(STICKER.u-1,v,1.6,.12+random()*.25);
  text(g,'P5GPL-X SE  MB 06',STICKER.u+1.3,STICKER.v+8,1,{rot:-Math.PI/2,align:'center',font:NARROW});}
 else{g.fillStyle=rgb([158,150,0]);g.fillRect(STICKER.u-STICKER.w/2,STICKER.v-STICKER.d/2,STICKER.w,STICKER.d)}

 // Under-socket gold dots in the window already drawn; finish with the slot key marks and board edge.
 g.strokeStyle=fill('#5a4520',[96,100,0]);g.lineWidth=.6;g.strokeRect(.3,.3,BOARD.w-.6,BOARD.d-.6);
 g.restore();
 // Very fine mask texture: a faint pebble in height and roughness (relief only), so the sheen breaks up instead of mirroring.
 if(!colour){const W=g.canvas.width,H=g.canvas.height,sp=rng(61);for(let i=0;i<W*H/30;i++){g.fillStyle=sp()<.5?'rgba(150,175,0,.10)':'rgba(100,140,0,.10)';g.fillRect(sp()*W,sp()*H,1.5,1.5)}}
}
