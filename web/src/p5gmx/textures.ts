// P5G-MX canvas textures: the board print in tiles, and the finishes and markings of its parts.
// The board's own markings (ASUS, P5G-MX, REV. 2.00G, PCB MADE IN CHINA, LAN_USB12, HEATSINK1, CLIP1, the regulatory marks and
// the connector names) are drawn as vectors where the photograph shows them. Chip part numbers are plausible where the
// photograph is not legible; see docs/p5gmx/evidence.md.
import * as THREE from 'three';
import {rng} from '../kit/util';
import maskUrl from './traced-mask.png';
import {BOARD,HOLES,HOLE,coolerHoles,COOLER,SOCKET,NB,SINK,SLOTS,DIMM,DIMMS,ATX24,ATX4,IDE,SATA,SATA_SIZE,FANS,FAN_SIZE,HEADERS,ECAPS,SOLIDS,TOROIDS,ROD,GREEN,DPAKS,DPAK,CHIPS,CRYSTALS,CRYSTAL,
 BATTERY,LED,EMPTY,BUZZER,IO,EDGE_Z,P,passives,SIZES,leadReach,bodies,type Rect} from './layout';

type G=CanvasRenderingContext2D;
export const make=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=Math.max(2,Math.round(w));c.height=Math.max(2,Math.round(h));return [c,c.getContext('2d')!] as const};
export const finish=(c:HTMLCanvasElement,colour=true,repeat=false)=>{const t=new THREE.CanvasTexture(c);if(colour)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=16;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;return t};
const phone=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 700px)').matches;
const SANS='"Helvetica Neue", Helvetica, Arial, sans-serif',NARROW='"Arial Narrow", "Helvetica Neue", Arial, sans-serif',BOLD='"Arial Black", "Helvetica Neue", Arial, sans-serif';
const letter=(g:G,px:number)=>{try{(g as unknown as {letterSpacing:string}).letterSpacing=`${px}px`}catch{/* older canvas */}};

// ── Board colours, sampled from the photograph under its soft light and lifted a little for the renderer's tone curve. ──
export const MASK={laminate:'#544506',pour:'#b6870c',trace:'#b8920e',rim:'#b89c0a',silk:'#ece8d6',tin:'#cfccc3',gold:'#d8b45c',via:'#4c3a10',edge:'#a89216'};

// The board in tiles: 4 × 3 tiles of 61 mm, the colour at 24 px/mm (12 on a phone), the relief at half that.
export const TILES={cols:4,rows:3,mm:61};
type Tile={map:THREE.CanvasTexture;relief:THREE.CanvasTexture;u0:number;v0:number};
let maskData:Promise<HTMLImageElement>|null=null;
const loadMask=()=>maskData??=new Promise((ok,no)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=no;img.src=maskUrl});

export function boardTiles(){
 const k=phone()?12:24,kr=k/2,n=TILES.mm,tiles:Tile[]=[];
 for(let j=0;j<TILES.rows;j++)for(let i=0;i<TILES.cols;i++){
  const [c,g]=make(n*k,n*k),[r,h]=make(n*kr,n*kr);g.fillStyle=MASK.laminate;g.fillRect(0,0,c.width,c.height);h.fillStyle='rgb(110,120,0)';h.fillRect(0,0,r.width,r.height);
  tiles.push({map:finish(c),relief:finish(r,false),u0:i*n,v0:j*n});
 }
 // The traced pour and routing arrive with the mask; the tiles are painted once, then never again.
 const ready=loadMask().then(img=>{
  const layers=maskLayers(img);
  for(const t of tiles){
   const g=(t.map.image as HTMLCanvasElement).getContext('2d')!,h=(t.relief.image as HTMLCanvasElement).getContext('2d')!;
   paintColour(g,t.u0,t.v0,k,layers);paintRelief(h,t.u0,t.v0,kr,layers);t.map.needsUpdate=true;t.relief.needsUpdate=true;
  }
 });
 return {tiles,ready};
}

// The traced mask split into drawable layers: the pour as an alpha shape, the routing as pale lines.
function maskLayers(img:HTMLImageElement){
 const W=img.width,H=img.height,[mc,mg]=make(W,H);mg.drawImage(img,0,0);const d=mg.getImageData(0,0,W,H).data;
 const [pc,pg]=make(W,H),[rc,rg]=make(W,H),pour=pg.createImageData(W,H),route=rg.createImageData(W,H);
 const s=(e0:number,e1:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t)};
 for(let i=0;i<W*H;i++){
  const p=s(.36,.64,d[i*4]/255);pour.data[i*4]=pour.data[i*4+1]=pour.data[i*4+2]=255;pour.data[i*4+3]=Math.round(p*255);
  route.data[i*4]=route.data[i*4+1]=route.data[i*4+2]=255;route.data[i*4+3]=Math.round(s(.18,.7,d[i*4+1]/255)*255);
 }
 pg.putImageData(pour,0,0);rg.putImageData(route,0,0);mc.width=mc.height=1;
 const tint=(src:HTMLCanvasElement,colour:string)=>{const [c,g]=make(W,H);g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=colour;g.fillRect(0,0,W,H);return c};
 return {W,H,pour:pc,route:rc,tint};
}
type Layers=ReturnType<typeof maskLayers>;
// Board millimetres from the rear-left corner: u = x + 122, v = z + 91.5.
const U=(x:number)=>x+BOARD.w/2,V=(z:number)=>z+BOARD.d/2;
const place=(g:G,u0:number,v0:number,k:number)=>g.setTransform(k,0,0,k,-u0*k,-v0*k);

// ── Vector print: everything drawn in board millimetres. ──
type Silk={lines:[number,number][][];rects:Rect[];circles:{x:number;z:number;r:number;half?:number}[];texts:{t:string;x:number;z:number;s:number;turn?:number;font?:string;weight?:number;spacing?:number}[]};
let silkCache:Silk|null=null;
function silk():Silk{
 if(silkCache)return silkCache;
 const lines:Silk['lines']=[],rects:Rect[]=[],circles:Silk['circles']=[],texts:Silk['texts']=[];
 const T=(t:string,xp:number,yp:number,s:number,o:Partial<Silk['texts'][0]>={})=>{const [x,z]=P(xp,yp);texts.push({t,x,z,s,...o})};
 const poly=(pts:[number,number][])=>lines.push(pts.map(([x,y])=>P(x,y)));
 // Outlines round the parts the board carries.
 for(const s of SLOTS)rects.push([s.x-s.w/2-.5,s.z0-.5,s.x+s.w/2+.5,s.z1+.5]);
 for(const d of DIMMS)rects.push([DIMM.x0-.4,d.z-DIMM.w/2-.5,DIMM.x1+.4,d.z+DIMM.w/2+.5]);
 rects.push([ATX24.x-ATX24.w/2-.6,ATX24.z-ATX24.d/2-.6,ATX24.x+ATX24.w/2+.6,ATX24.z+ATX24.d/2+.6],[ATX4.x-ATX4.w/2-.6,ATX4.z-ATX4.d/2-.6,ATX4.x+ATX4.w/2+.6,ATX4.z+ATX4.d/2+.6]);
 rects.push([IDE.x-IDE.w/2,IDE.pinZ-2.6,IDE.x+IDE.w/2,BOARD.d/2-.6]);
 for(const s of SATA)rects.push([s.x-SATA_SIZE.w/2-.5,s.z-SATA_SIZE.d/2-.5,s.x+SATA_SIZE.w/2+.5,s.z+SATA_SIZE.d/2+.5]);
 for(const f of FANS)rects.push([f.x-FAN_SIZE.w/2-.4,f.z-FAN_SIZE.d/2-.4,f.x+FAN_SIZE.w/2+.4,f.z+FAN_SIZE.d/2+.4]);
 for(const h of HEADERS){const w=h.cols*2.54/2+.4,d=h.rows*2.54/2+.4;rects.push(h.turn?[h.x-d,h.z-w,h.x+d,h.z+w]:[h.x-w,h.z-d,h.x+w,h.z+d])}
 for(const c of [...ECAPS,...SOLIDS])circles.push({x:c.x,z:c.z,r:c.d/2+.45,half:c.d/2+.45});
 for(const t of TOROIDS)if(!t.upright)circles.push({x:t.x,z:t.z,r:t.od/2+1.2});
 circles.push({x:ROD.x,z:ROD.z,r:ROD.d/2+.5},{x:GREEN.x,z:GREEN.z,r:GREEN.d/2+.4});
 for(const c of CHIPS){const r=leadReach(c),w=(c.turn?c.d:c.w)+(c.kind==='qfp'||c.turn?2*r:0)+1,d=(c.turn?c.w:c.d)+(c.kind==='qfp'||!c.turn?2*r:0)+1;rects.push([c.x-w/2,c.z-d/2,c.x+w/2,c.z+d/2])}
 for(const c of CRYSTALS)rects.push([c.x-CRYSTAL.w/2-.6,c.z-CRYSTAL.d/2-.6,c.x+CRYSTAL.w/2+.6,c.z+CRYSTAL.d/2+.6]);
 for(const q of DPAKS){const a=q.out&1?[DPAK.w,DPAK.d+3]:[DPAK.d+3,DPAK.w];rects.push([q.x-a[0]/2-.4,q.z-a[1]/2-.4,q.x+a[0]/2+.4,q.z+a[1]/2+.4])}
 circles.push({x:BATTERY.x,z:BATTERY.z,r:BATTERY.r+.6},{x:BUZZER.x,z:BUZZER.z,r:BUZZER.r},{x:LED.x,z:LED.z,r:2.1});
 for(const e of EMPTY)circles.push({x:e.x,z:e.z,r:e.r,half:e.r});
 // Northbridge: package outline and the keep-out for its (absent) heat sink, traced.
 rects.push([NB.x-NB.s/2-1,NB.z-NB.s/2-1,NB.x+NB.s/2+1,NB.z+NB.s/2+1]);
 poly([[685,705],[905,705],[905,945],[685,945],[685,705]]);
 poly([[915,652],[932,652],[932,722],[915,722],[915,652]]);
 // Socket: the outline of the loading mechanism and the octagonal cooler keep-out, traced.
 rects.push([SOCKET.x-SOCKET.plate[0]/2-1.2,SOCKET.z+SOCKET.plateZ-SOCKET.plate[1]/2-1.2,SOCKET.x+SOCKET.plate[0]/2+1.2,SOCKET.z+SOCKET.plateZ+SOCKET.plate[1]/2+1.2]);
 poly([[1048,592],[1355,592],[1355,958],[1048,958],[1048,592]]);
 poly([[960,505],[1418,505],[1462,550]]);poly([[1462,985],[1412,1030],[985,1030],[938,982],[938,560],[960,505]]);
 poly([[938,610],[985,560],[1040,505]]);poly([[1400,1030],[1462,968]]);
 // Lettering, as printed.
 T('PCB MADE IN CHINA',443,313,2.3,{weight:700,spacing:.35});
 T('AUDIO',612,314,1.35,{weight:700});T('LAN_USB12',875,447,1.7,{weight:700,spacing:.1});
 T('HEATSINK1',880,700,1.45,{weight:700});T('CLIP1',923,688,1.4,{weight:700,turn:1});
 T('REV. 2.00G',905,1009,1.6,{weight:700,spacing:.1});
 T('DIMM_A1',690,1137,1.2,{weight:700});T('DIMM_B1',690,1150,1.2,{weight:700});
 T('PRI_IDE',465,1289,1.6,{weight:700});T('F_PANEL',735,1337,1.7,{weight:700});T('PANEL',595,1266,1.3,{weight:700});
 T('SB_PWR',146,740,1.2,{weight:700,turn:-1});T('USB34',134,808,1.3,{weight:700,turn:-1});T('USB56',132,1020,1.3,{weight:700,turn:-1});
 T('AAFP',140,437,1.3,{weight:700,turn:-1});T('CD',300,446,1.3,{weight:700});T('SATA1',117,1135,1.3,{weight:700,turn:-1});T('SATA2',117,1240,1.3,{weight:700,turn:-1});
 T('CLRTC',150,1330,1.2,{weight:700});T('CPU_FAN',1488,1121,1.2,{weight:700,turn:1});T('CHA_FAN1',1490,1166,1.2,{weight:700,turn:1});
 T('ATX12V',1420,420,1.3,{weight:700});T('EATXPWR',900,1256,1.3,{weight:700});T('CPU',1448,640,1.4,{weight:700,turn:1});
 T('PCI1',296,930,1.4,{weight:700,turn:-1});T('PCIEX16',530,700,1.4,{weight:700,turn:-1});T('PCIEX1_1',640,600,1.3,{weight:700,turn:-1});
 T('C9088',372,684,1.6,{weight:700,turn:1});T('N1630',396,800,1.6,{weight:700,turn:1});T('BUZZ1',735,1213,1.2,{weight:700});
 T('CR2032 3V',560,800,1.15,{weight:700,turn:-1});
 return silkCache={lines,rects,circles,texts};
}
function drawText(g:G,t:Silk['texts'][0]){
 g.save();g.translate(U(t.x),V(t.z));if(t.turn)g.rotate(t.turn*Math.PI/2);
 // Fonts are sized in pixels; draw at 10× and scale down so small letters keep their shape.
 g.scale(.1,.1);g.font=`${t.weight??700} ${t.s*10*1.36}px ${t.font??SANS}`;letter(g,(t.spacing??0)*10);g.textAlign='center';g.textBaseline='middle';g.fillText(t.t,0,0);g.restore();
}
// The ASUS wordmark of the period: forward-leaning capitals, the A without its bar. Box in mm, centred on (cx, cz).
function asusLogo(g:G,cx:number,cz:number,w:number,h:number){
 g.save();g.translate(U(cx),V(cz));g.transform(1,0,-.18,1,0,0);const u=w/26.5,s=h,t=s*.2;g.beginPath();
 // A: two legs, no crossbar.
 g.moveTo(-w/2,s/2);g.lineTo(-w/2+5.3*u,-s/2);g.lineTo(-w/2+5.3*u+t*1.1,-s/2);g.lineTo(-w/2+t*1.1,s/2);g.closePath();
 g.moveTo(-w/2+5.3*u+t*1.1,-s/2);g.lineTo(-w/2+7.9*u,-s/2);g.lineTo(-w/2+7.9*u,s/2);g.lineTo(-w/2+7.9*u-t,s/2);g.lineTo(-w/2+7.9*u-t,-s/2+t*1.4);g.closePath();
 g.fill();
 g.font=`700 ${s*1.32}px ${SANS}`;g.textBaseline='middle';g.textAlign='left';letter(g,0);
 const sx=-w/2+8.9*u;g.save();g.translate(sx,s*.04);g.scale(1.18,1);g.fillText('SUS',0,0);g.restore();
 g.restore();
}
function marks(g:G){
 const draw=(xp:number,yp:number,fn:(x:number,y:number)=>void)=>{const [x,z]=P(xp,yp);fn(U(x),V(z))};
 g.lineCap='round';g.lineJoin='round';
 // FCC: the F and the C over a small ring.
 draw(195,612,(x,y)=>{g.lineWidth=.42;g.beginPath();g.moveTo(x-1.2,y+2.4);g.lineTo(x-1.2,y-2.4);g.lineTo(x+1.1,y-2.4);g.moveTo(x-1.2,y-.6);g.lineTo(x+.6,y-.6);g.stroke();g.beginPath();g.arc(x+1.2,y+1.5,2,Math.PI*.3,Math.PI*1.7);g.stroke();g.beginPath();g.arc(x+1.2,y+1.5,1,0,Math.PI*2);g.stroke()});
 // CE.
 draw(378,890,(x,y)=>{g.lineWidth=.5;g.beginPath();g.arc(x-1.4,y,1.9,Math.PI*.42,Math.PI*1.58);g.stroke();g.beginPath();g.arc(x+1.8,y,1.9,Math.PI*.42,Math.PI*1.58);g.stroke();g.beginPath();g.moveTo(x+.3,y);g.lineTo(x+1.6,y);g.stroke()});
 // C-tick: a ring with a tick through it.
 draw(372,778,(x,y)=>{g.lineWidth=.48;g.beginPath();g.arc(x,y,2.4,Math.PI*.25,Math.PI*1.9);g.stroke();g.beginPath();g.moveTo(x-.9,y);g.lineTo(x,y+1);g.lineTo(x+2.2,y-1.6);g.stroke()});
 // Crossed-out wheeled bin.
 draw(358,558,(x,y)=>{g.lineWidth=.3;g.strokeRect(x-1,y-1.2,2,2.6);g.beginPath();g.moveTo(x-1.3,y-1.4);g.lineTo(x+1.3,y-1.4);g.moveTo(x-1.9,y-2);g.lineTo(x+1.9,y+2);g.moveTo(x+1.9,y-2);g.lineTo(x-1.9,y+2);g.stroke()});
 // The model name, heavy and outlined in silk, and the ASUS wordmark.
 {const [x,z]=P(783,988);g.save();g.translate(U(x),V(z));g.font=`900 ${6.6}px ${BOLD}`;letter(g,.7);g.textAlign='center';g.textBaseline='middle';g.scale(1.06,1);g.fillText('P5G-MX',0,0);g.restore()}
 {const [x,z]=P(690,1053);asusLogo(g,x,z,25.4,5.4)}
}
function drawSilk(g:G,w=1){
 const s=silk();g.lineCap='round';g.lineJoin='round';g.lineWidth=.17*w;
 g.beginPath();for(const [x0,z0,x1,z1] of s.rects)g.rect(U(x0),V(z0),x1-x0,z1-z0);for(const l of s.lines){l.forEach(([x,z],i)=>i?g.lineTo(U(x),V(z)):g.moveTo(U(x),V(z)))}g.stroke();
 for(const c of s.circles){g.beginPath();g.arc(U(c.x),V(c.z),c.r,0,Math.PI*2);g.stroke();if(c.half){g.beginPath();g.arc(U(c.x),V(c.z),c.half,Math.PI*.5,Math.PI*1.5);g.closePath();g.globalAlpha=.9;g.fill();g.globalAlpha=1}}
 for(const t of s.texts)drawText(g,t);
 marks(g);
}
// Lands: tinned copper where parts are soldered. Small parts', the leaded chips', the D-PAKs', the empty footprints' and the plated holes.
function drawLands(g:G,colour:string){
 g.fillStyle=colour;
 for(const c of passives()){const s=SIZES[c.kind];for(const sg of [-1,1]){const lx=c.turn?0:sg*s[3],lz=c.turn?sg*s[3]:0,w=c.turn?s[5]:s[4],d=c.turn?s[4]:s[5];g.fillRect(U(c.x+lx)-w/2,V(c.z+lz)-d/2,w,d)}}
 for(const c of CHIPS){
  const r=leadReach(c),long=c.turn?'z':'x',half=(c.kind==='qfp'?(c.turn?c.d:c.w):c.d)/2+r*.55;
  const row=(n:number,len:number,side:number,along:'x'|'z',offset:number)=>{for(let i=0;i<n;i++){const t=(i-(n-1)/2)*c.pitch,lx=along==='x'?t:side*offset,lz=along==='x'?side*offset:t,w=along==='x'?c.pitch*.55:len,d=along==='x'?len:c.pitch*.55;g.fillRect(U(c.x+lx)-w/2,V(c.z+lz)-d/2,w,d)}};
  if(c.kind==='qfp'){const nL=c.n,nS=c.kind==='qfp'&&c.w!==c.d?Math.round(c.n*c.d/c.w):c.n;const a=c.turn?'z':'x',b=a==='x'?'z':'x';
   for(const sd of [-1,1]){row(nL,r*1.2,sd,a,(a==='x'?(c.turn?c.w:c.d):(c.turn?c.d:c.w))/2+r*.55);row(nS,r*1.2,sd,b,(b==='x'?(c.turn?c.d:c.w):(c.turn?c.w:c.d))/2+r*.55)}}
  else for(const sd of [-1,1])row(c.n,r*1.3,sd,long,half);
 }
 for(const q of DPAKS){const dx=[1,0,-1,0][q.out],dz=[0,1,0,-1][q.out];
  g.fillRect(U(q.x-dx*.9)-(q.out&1?DPAK.w*.9:DPAK.d*.9)/2,V(q.z-dz*.9)-(q.out&1?DPAK.d*.9:DPAK.w*.9)/2,q.out&1?DPAK.w*.9:DPAK.d*.9,q.out&1?DPAK.d*.9:DPAK.w*.9);
  for(const s of [-1,1]){const px=q.x+dx*(DPAK.d/2+1.6)+(q.out&1?s*2.28:0),pz=q.z+dz*(DPAK.d/2+1.6)+(q.out&1?0:s*2.28);g.fillRect(U(px)-.6,V(pz)-.6,1.2,1.2)}}
 for(const e of EMPTY){g.fillRect(U(e.x-e.r*.42)-.9,V(e.z)-.9,1.8,1.8);g.beginPath();g.arc(U(e.x+e.r*.42),V(e.z),.9,0,Math.PI*2);g.fill()}
}
// Vias: tented dimples, scattered where there is board to spare.
let viaCache:[number,number][]|null=null;
function vias(){
 if(viaCache)return viaCache;
 const random=rng(91),out:[number,number][]=[],keep=bodies().map(b=>b.b);
 for(let i=0;i<5200&&out.length<2400;i++){const x=(random()-.5)*(BOARD.w-6),z=(random()-.5)*(BOARD.d-6);if(keep.some(b=>x>b[0]-.6&&x<b[2]+.6&&z>b[1]-.6&&z<b[3]+.6))continue;out.push([x,z])}
 return viaCache=out;
}
function paintColour(g:G,u0:number,v0:number,k:number,L:Layers){
 const n=TILES.mm,mk=L.W/BOARD.w;
 g.setTransform(1,0,0,1,0,0);g.fillStyle=MASK.laminate;g.fillRect(0,0,n*k,n*k);
 // Traced copper pour, then the routing as paler lines, sampled smoothly out of the 6 px/mm mask.
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 const blit=(src:HTMLCanvasElement,alpha:number)=>{g.globalAlpha=alpha;g.drawImage(src,u0*mk,v0*mk,n*mk,n*mk,0,0,n*k,n*k);g.globalAlpha=1};
 blit(L.tint(L.pour,MASK.pour),1);blit(L.tint(L.route,MASK.trace),1);
 place(g,u0,v0,k);
 // The bare rim: no copper under the mask along the edges, so it reads yellow.
 g.strokeStyle=MASK.rim;g.lineWidth=3.2;g.beginPath();g.roundRect(0,0,BOARD.w,BOARD.d,BOARD.r);g.stroke();
 // A faint mottle so the mask reads as a coated surface.
 const random=rng(u0*7+v0*13+1);for(let i=0;i<40;i++){const x=u0+random()*n,y=v0+random()*n,r=4+random()*14,f=g.createRadialGradient(x,y,0,x,y,r),c=random()<.5?'255,226,150':'40,30,8',a=.03+random()*.04;f.addColorStop(0,`rgba(${c},${a})`);f.addColorStop(1,`rgba(${c},0)`);g.fillStyle=f;g.fillRect(x-r,y-r,r*2,r*2)}
 g.fillStyle=MASK.via;for(const [x,z] of vias()){const u=U(x),v=V(z);if(u<u0-1||u>u0+n+1||v<v0-1||v>v0+n+1)continue;g.beginPath();g.arc(u,v,.32,0,Math.PI*2);g.fill()}
 g.fillStyle=g.strokeStyle=MASK.silk;drawSilk(g);
 drawLands(g,MASK.tin);
 // Plated mounting rings with eight stitching vias; the cooler holes are bare.
 for(const [x,z] of HOLES){const u=U(x),v=V(z),f=g.createRadialGradient(u-1,v-1,.5,u,v,HOLE.ring*1.2);f.addColorStop(0,'#ecd08a');f.addColorStop(1,'#c99f4c');
  g.strokeStyle=MASK.silk;g.lineWidth=.18;g.beginPath();g.arc(u,v,HOLE.ring+1.1,0,Math.PI*2);g.stroke();
  g.fillStyle=f;g.beginPath();g.arc(u,v,HOLE.ring,0,Math.PI*2);g.fill();g.fillStyle='#7a6230';for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.beginPath();g.arc(u+Math.cos(a)*2.75,v+Math.sin(a)*2.75,.28,0,Math.PI*2);g.fill()}
  g.fillStyle='#211a0c';g.beginPath();g.arc(u,v,HOLE.drill,0,Math.PI*2);g.fill()}
 g.fillStyle='#2a2210';for(const [x,z] of coolerHoles()){g.beginPath();g.arc(U(x),V(z),COOLER.drill+.25,0,Math.PI*2);g.fill()}
 g.setTransform(1,0,0,1,0,0);
}
function paintRelief(h:G,u0:number,v0:number,k:number,L:Layers){
 // Red: height. Green: roughness. Blue: metalness.
 const n=TILES.mm,mk=L.W/BOARD.w;
 h.setTransform(1,0,0,1,0,0);h.fillStyle='rgb(100,178,0)';h.fillRect(0,0,n*k,n*k);
 h.imageSmoothingEnabled=true;h.drawImage(L.tint(L.pour,'rgb(140,160,0)'),u0*mk,v0*mk,n*mk,n*mk,0,0,n*k,n*k);
 h.globalAlpha=.6;h.drawImage(L.tint(L.route,'rgb(150,165,0)'),u0*mk,v0*mk,n*mk,n*mk,0,0,n*k,n*k);h.globalAlpha=1;
 place(h,u0,v0,k);
 h.fillStyle='rgb(70,130,0)';for(const [x,z] of vias()){h.beginPath();h.arc(U(x),V(z),.32,0,Math.PI*2);h.fill()}
 h.fillStyle=h.strokeStyle='rgb(190,215,0)';drawSilk(h);
 drawLands(h,'rgb(150,90,230)');
 for(const [x,z] of HOLES){h.fillStyle='rgb(160,80,255)';h.beginPath();h.arc(U(x),V(z),HOLE.ring,0,Math.PI*2);h.fill()}
 // Very fine orange-peel in the mask: faint height and roughness grain so the satin sheen breaks up instead of mirroring.
 h.setTransform(1,0,0,1,0,0);h.globalCompositeOperation='overlay';h.fillStyle=h.createPattern(peel(),'repeat')!;h.fillRect(0,0,n*k,n*k);h.globalCompositeOperation='source-over';
}
let peelTile:HTMLCanvasElement|null=null;
function peel(){
 if(peelTile)return peelTile;const N=96,random=rng(31),[c,g]=make(N,N),img=g.createImageData(N,N);
 for(let i=0;i<N*N;i++){const v=random(),w=random();img.data[i*4]=118+v*20;img.data[i*4+1]=114+w*28;img.data[i*4+2]=128;img.data[i*4+3]=255}
 g.putImageData(img,0,0);const [s2,q]=make(N,N);q.filter='blur(.7px)';q.drawImage(c,0,0);for(const dx of [-N,N])q.drawImage(c,dx,0);return peelTile=s2;
}

// The underside and the board's edge: plain mask, low resolution.
export function underside(){
 const k=3,[c,g]=make(BOARD.w*k,BOARD.d*k),random=rng(4);g.fillStyle='#6a5218';g.fillRect(0,0,c.width,c.height);
 g.strokeStyle='#8a6a22';g.lineWidth=.7;for(let i=0;i<500;i++){const x=random()*c.width,y=random()*c.height,l=10+random()*90,horiz=random()<.5;g.beginPath();g.moveTo(x,y);g.lineTo(horiz?x+l:x,horiz?y:y+l);g.stroke()}
 g.fillStyle='#cfccc3';for(let i=0;i<2600;i++){g.fillRect(random()*c.width,random()*c.height,1.2,1.2)}
 return finish(c);
}

// ── Finishes ─────────────────────────────────────────────────────────────
// Brushed metal: streaks along u. Red is tone and height, green roughness. Tiles both ways.
export function brushed(seed:number,base='#d8dadc'){
 const N=512,random=rng(seed),[c,g]=make(N,N),[r,h]=make(N,N);
 g.fillStyle=base;g.fillRect(0,0,N,N);h.fillStyle='rgb(128,96,0)';h.fillRect(0,0,N,N);
 for(let i=0;i<9000;i++){const y=Math.floor(random()*N),x=random()*N,len=20+random()*220,light=random()<.5,a=.01+random()*.03;
  g.fillStyle=light?`rgba(255,255,255,${a})`:`rgba(40,44,50,${a})`;g.fillRect(x,y,len,1);if(x+len>N)g.fillRect(x-N,y,len,1);
  h.fillStyle=`rgba(${light?160:100},${light?70:120},0,${a*6})`;h.fillRect(x,y,len,1);if(x+len>N)h.fillRect(x-N,y,len,1)}
 return {map:finish(c,true,true),relief:finish(r,false,true)};
}
// Matte moulding: a fine pebble in height and roughness.
export function grain(seed:number,rough=200,spread=36){
 const N=256,random=rng(seed),[c,g]=make(N,N),image=g.createImageData(N,N),d=image.data;
 for(let i=0;i<N*N;i++){d[i*4]=110+random()*60;d[i*4+1]=rough-spread/2+random()*spread;d[i*4+2]=0;d[i*4+3]=255}
 g.putImageData(image,0,0);const [s,q]=make(N,N);q.filter='blur(.6px)';q.drawImage(c,0,0);q.filter='none';return finish(s,false,true);
}
// A laser-marked package top. Sizes in mm, drawn at `k` px/mm. Returns colour and a relief (red height, green roughness).
export type Marking={w:number;d:number;lines:string[];logo?:'ite'|'realtek'|'ics';turn?:boolean;body?:string;ink?:string;pin?:[number,number];size?:number};
export function packageTop(m:Marking,seed=1,k=48){
 const W=m.w*k,H=m.d*k,random=rng(seed),[c,g]=make(W,H),[r,h]=make(W,H),body=m.body??'#202124',ink=m.ink??'#8e9093';
 g.fillStyle=body;g.fillRect(0,0,W,H);for(let i=0;i<W*H/60;i++){g.fillStyle=random()<.5?'rgba(80,82,88,.35)':'rgba(5,5,6,.35)';g.fillRect(random()*W,random()*H,1.5,1.5)}
 h.fillStyle='rgb(128,180,0)';h.fillRect(0,0,W,H);
 if(m.pin){for(const [q,col] of [[g,'rgba(255,255,255,.08)'],[h,'rgb(120,90,0)']] as [G,string][]){q.fillStyle=col;q.beginPath();q.arc(m.pin[0]*W,m.pin[1]*H,Math.min(W,H)*.06,0,Math.PI*2);q.fill()}}
 const draw=(q:G,style:string)=>{
  q.save();if(m.turn){q.translate(W/2,H/2);q.rotate(Math.PI/2);q.translate(-H/2,-W/2)}
  const w=m.turn?H:W,ht=m.turn?W:H,lines=m.lines.length+(m.logo?1.3:0),size=m.size?m.size*k:Math.min(ht/(lines+1),w/(Math.max(...m.lines.map(t=>t.length))*.62+1));
  q.fillStyle=q.strokeStyle=style;q.textAlign='center';q.textBaseline='middle';let y=ht/2-(lines-1)*size*.62;
  if(m.logo){
   const lx=w/2;q.lineWidth=size*.12;
   if(m.logo==='ite'){q.beginPath();q.arc(lx-size*1.3,y,size*.55,Math.PI*.2,Math.PI*1.8);q.stroke();q.font=`700 ${size*1.15}px ${SANS}`;q.fillText('ITE',lx+size*.35,y)}
   else if(m.logo==='realtek'){q.beginPath();q.moveTo(lx,y-size*.75);q.lineTo(lx+size*.85,y+size*.7);q.lineTo(lx-size*.85,y+size*.7);q.closePath();q.stroke();q.beginPath();q.moveTo(lx,y-size*.3);q.lineTo(lx,y+size*.55);q.moveTo(lx-size*.35,y+size*.2);q.lineTo(lx+size*.35,y+size*.2);q.stroke()}
   else{q.font=`italic 800 ${size*1.25}px ${SANS}`;q.fillText(m.lines[0]==='ICS'?'':'ICS',lx,y)}
   y+=size*1.3;
  }
  m.lines.forEach((t,i)=>{q.font=`${i===0?700:500} ${size*(i===0?1:.82)}px ${NARROW}`;letter(q,size*.05);q.fillText(t,w/2,y+i*size*1.22)});
  q.restore();
 };
 draw(g,ink);draw(h,'rgb(100,232,0)');
 return {map:finish(c),relief:finish(r,false)};
}
// The top of a slot or memory socket: moulded plastic with two rows of contact windows and the card channel between.
export function slotTop(o:{len:number;w:number;pitch:number;n:number;keys:number[];colour:string;window:string;channel:string;start?:number},k=14){
 const W=o.len*k,H=o.w*k,[c,g]=make(W,H);g.fillStyle=o.colour;g.fillRect(0,0,W,H);
 const start=o.start??(o.len-(o.n-1)*o.pitch-o.keys.length*o.pitch*1.4)/2;
 g.fillStyle=o.channel;g.fillRect(start*k-.5*k,H/2-.4*k,(o.len-start*2+1)*k,.8*k);
 g.fillStyle=o.window;let x=start,keyIdx=0;
 for(let i=0;i<o.n;i++){if(keyIdx<o.keys.length&&x>=o.keys[keyIdx]){x+=o.pitch*1.6;keyIdx++}
  for(const s of [-1,1])g.fillRect((x-o.pitch*.28)*k,H/2+s*1.15*k-(s<0?1.3*k:0),o.pitch*.56*k,1.3*k);x+=o.pitch}
 return finish(c);
}
// LGA775 contact field: sprung contacts as bright points on dark moulding, in the 37.5 mm pattern with its open centre.
export function lgaField(field:number,cavity:[number,number],k=28){
 const W=field*k,[c,g]=make(W,W),random=rng(77);g.fillStyle='#24201c';g.fillRect(0,0,W,W);
 const pitch=1.09,n=Math.floor(field/pitch);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=(i+.5)*pitch+(field-n*pitch)/2,y=(j+.5)*pitch+(field-n*pitch)/2;
  if(Math.abs(x-field/2)<cavity[0]/2+.7&&Math.abs(y-field/2)<cavity[1]/2+.7)continue;
  g.fillStyle='#0d0b09';g.fillRect((x-.36)*k,(y-.36)*k,.72*k,.72*k);
  const b=150+random()*80;g.fillStyle=`rgb(${b},${b*.86},${b*.62})`;g.beginPath();g.arc(x*k,y*k,.17*k,0,Math.PI*2);g.fill();
 }
 return finish(c);
}
// Electrolytic vent top: pressed aluminium with a cross score.
export function capTop(){
 const N=256,[c,g]=make(N,N),f=g.createRadialGradient(N*.42,N*.4,4,N/2,N/2,N*.5);f.addColorStop(0,'#aeb2b6');f.addColorStop(1,'#80858b');g.fillStyle=f;g.fillRect(0,0,N,N);
 g.strokeStyle='rgba(60,64,70,.55)';g.lineWidth=5;g.beginPath();g.moveTo(N*.2,N/2);g.lineTo(N*.8,N/2);g.moveTo(N/2,N*.2);g.lineTo(N/2,N*.8);g.stroke();
 g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2;g.beginPath();g.moveTo(N*.2,N/2+4);g.lineTo(N*.8,N/2+4);g.moveTo(N/2+4,N*.2);g.lineTo(N/2+4,N*.8);g.stroke();
 g.strokeStyle='rgba(70,74,80,.4)';g.lineWidth=4;g.beginPath();g.arc(N/2,N/2,N*.47,0,Math.PI*2);g.stroke();
 return finish(c);
}
// PVC sleeve round an electrolytic: base colour, the pale negative stripe and printing. u runs round the can.
export function sleeve(base:string,stripe:string,text:string){
 const W=512,H=128,[c,g]=make(W,H);g.fillStyle=base;g.fillRect(0,0,W,H);g.fillStyle=stripe;g.fillRect(W*.06,0,W*.13,H);
 g.fillStyle='rgba(20,20,20,.75)';g.font=`700 22px ${SANS}`;g.textAlign='center';for(let i=0;i<3;i++)g.fillText('—',W*.125,H*.25+i*H*.25);
 g.fillStyle='rgba(225,225,225,.55)';g.font=`600 20px ${NARROW}`;g.save();g.translate(W*.6,H/2);g.rotate(-Math.PI/2);g.fillText(text,0,0);g.restore();
 g.save();g.translate(W*.42,H/2);g.rotate(-Math.PI/2);g.fillText('105°C',0,0);g.restore();
 return finish(c);
}
// Solid polymer cap: aluminium top printed white with a red polarity band, as on this board.
export function solidTop(){
 const N=256,[c,g]=make(N,N);g.fillStyle='#e9e6e2';g.beginPath();g.arc(N/2,N/2,N/2,0,Math.PI*2);g.fill();
 g.fillStyle='#d8342c';g.beginPath();g.arc(N/2,N/2,N/2,Math.PI*.62,Math.PI*1.38);g.closePath();g.fill();
 g.fillStyle='#c4c0bc';g.fillRect(0,0,1,1);
 g.fillStyle='rgba(120,40,40,.8)';g.font=`700 30px ${NARROW}`;g.textAlign='center';g.textBaseline='middle';g.fillText('270',N*.6,N*.38);g.fillText('16V',N*.6,N*.55);g.font=`700 22px ${NARROW}`;g.fillText('6SV',N*.6,N*.7);
 return finish(c);
}
export function solidSleeve(){
 const W=512,H=128,[c,g]=make(W,H);g.fillStyle='#e7e4df';g.fillRect(0,0,W,H);g.fillStyle='#d6342b';g.fillRect(W*.62,0,W*.38,H);
 g.fillStyle='rgba(120,30,30,.75)';g.font=`700 24px ${NARROW}`;g.textAlign='center';g.textBaseline='middle';g.fillText('270µF 16V',W*.3,H*.5);
 return finish(c);
}
// White barcode stickers, printed with the board's codes; the yellow inspection sticker on the PS/2 stack.
export function sticker(w:number,d:number,lines:string[],seed:number){
 const k=24,W=w*k,H=d*k,random=rng(seed),[c,g]=make(W,H);g.fillStyle='#f3f2ee';g.fillRect(0,0,W,H);
 g.save();g.translate(W/2,H/2);g.rotate(Math.PI/2);
 g.fillStyle='#202020';let x=-H*.42;const bw=H*.62;
 for(;x<-H*.42+bw;){const t=1+Math.floor(random()*3.5);g.fillRect(x,-W*.38,t,W*.42);x+=t+1+Math.floor(random()*3)}
 g.font=`600 ${W*.17}px ${NARROW}`;g.textAlign='left';g.textBaseline='middle';lines.forEach((t,i)=>g.fillText(t,-H*.42,W*.16+i*W*.0+i*W*.19-(lines.length>2?W*.06:0)));
 g.restore();return finish(c);
}
export function ps2Sticker(){
 const W=320,H=300,[c,g]=make(W,H);g.fillStyle='#e8d24a';g.fillRect(0,0,W,H);g.fillStyle='#5a4a10';g.textAlign='center';
 g.font=`600 34px ${NARROW}`;g.fillText('A-E1ELLE',W/2,60);g.font=`500 30px ${NARROW}`;g.fillText('ZBZ8F80',W/2,110);g.fillText('5.0Y08',W/2,160);g.font=`700 64px ${SANS}`;g.fillText('2 I L S G',W/2,250);
 return finish(c);
}
// Front faces of the D-subminiature ports: the moulded insert with its contacts.
export function dsubFace(rows:number[],female:boolean,colour:string){
 const W=320,H=128,[c,g]=make(W,H);g.fillStyle=colour;g.fillRect(0,0,W,H);
 const total=Math.max(...rows);rows.forEach((n,j)=>{const y=H*(rows.length===2?.36+j*.3:.27+j*.23);for(let i=0;i<n;i++){const x=W/2+(i-(n-1)/2)*W*.82/total;g.fillStyle=female?'#0e1420':'#d9b45a';g.beginPath();g.arc(x,y,female?7:9,0,Math.PI*2);g.fill();if(!female){g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(x-2,y-2,3,0,Math.PI*2);g.fill()}}});
 return finish(c);
}
// Mini-DIN (PS/2) face: coloured moulding, the six pin holes and the keyed centre.
export function dinFace(colour:string){
 const N=256,[c,g]=make(N,N);g.fillStyle=colour;g.fillRect(0,0,N,N);g.fillStyle='rgba(0,0,0,.55)';
 g.beginPath();g.arc(N/2,N/2,N*.36,0,Math.PI*2);g.fill();g.fillStyle=colour;g.beginPath();g.arc(N/2,N/2,N*.3,0,Math.PI*2);g.fill();
 g.fillStyle='#14161a';for(const [a,r] of [[.2,.2],[.8,.2],[.05,.2],[.95,.2],[.32,.14],[.68,.14]] as [number,number][]){const t=Math.PI*(1+a);g.beginPath();g.arc(N/2+Math.cos(t)*N*r,N/2-Math.sin(t)*N*r+N*.04,N*.025,0,Math.PI*2);g.fill()}
 g.fillRect(N*.45,N*.16,N*.1,N*.14);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(N*.44,N*.62,N*.12,N*.1);
 return finish(c);
}
