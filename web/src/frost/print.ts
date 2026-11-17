// Frost's board print as vectors: lands, plated holes, silkscreen outlines and lettering. No three.js, no canvas.
// Print units are 0.1 mm with the origin at the board's back-left corner (so the board is 900 × 700). Every land sits exactly
// where parts.ts puts a lead, ball or terminal, because both read layout.ts. Copper between the lands is in routed.ts
// (made by scripts/devices/trace-frost.mjs with router.ts from this same list). Lettering is a single-stroke typeface.
import {BOARD,HOLES,HOLE,HEADER,headerPins,JUMPER,ETH,USB,HDMI,BARREL,MICRO,SD,FFC,ETH_PINS,USB_PINS,HDMI_LANDS,HDMI_PINS,BARREL_PINS,MICRO_LANDS,MICRO_TABS,SD_LANDS,SD_TABS,FFC_LANDS,FFC_TABS,
 SOC,SINK,CLIP,RAM,RAMS,EMMC,PMIC,PHY,FLASH,LEVEL,USBSW,LDO,pmicLands,phyLands,flashLands,levelLands,usbswLands,ldoLands,INDUCTORS,INDUCTOR,TANTALUMS,TANTALUM,tantalumLands,XTAL,COIN,BUTTONS,BUTTON,buttonLands,LEDS,ledX,
 passives,SIZES,footOf,TITLE,type Land,type Rect} from './layout';

export const IMG={w:BOARD.w*10,h:BOARD.d*10};
export const U=(x:number)=>(x+BOARD.w/2)*10,V=(z:number)=>(z+BOARD.d/2)*10;
export type Box=[number,number,number,number];
// `hole` makes a plated through-hole. `grp` names a row the router takes buses from, in order of `k`. `route` is false for lands
// that take no surface trace. `power` asks for a wide trace. `mask` false leaves the land covered (a tented test land).
export type Pad={x:number;y:number;w:number;h:number;r:number;hole?:number;fp:number;grp?:string;k?:number;route:boolean;power?:boolean;ball?:boolean};
export type Line={p:number[];w:number};
export type Circle={x:number;y:number;r:number;w:number};
export type Print={pads:Pad[];silk:Line[];circles:Circle[];fills:Box[];names:{t:string;x:number;y:number;b:Box}[];outlines:{id:string;b:Box;round?:boolean}[];missed:string[];count:Record<string,number>};

// ── Stroke typeface: capitals, digits and a little punctuation on a 4 × 6 grid. Each stroke is a run of xy digit pairs. ──
const GLYPHS:Record<string,string>={
 A:'0004264440 0242',B:'000636454433033342413000',C:'4536160501103041',D:'00062645412000',E:'40000646 0333',F:'000646 0333',G:'45361605011030414323',H:'0006 4046 0343',
 I:'1030 2026 1636',J:'0110304146',K:'0006 460340',L:'060040',M:'0006234640',N:'00064046',O:'103041453616050110',P:'00063645443303',Q:'103041453616050110 2240',R:'00063645443303 2340',
 S:'453616050413334241301001',T:'0646 2026',U:'060110304146',V:'062046',W:'0610233046',X:'0046 0640',Y:'062346 2320',Z:'06460040',
 0:'103041453616050110 0145',1:'152620 1030',2:'05163645440040',3:'0516364544334241301001 2333',4:'30360242',5:'460603334241301001',6:'36160501103041423303',7:'064620',
 8:'163645443313040516 1302011030414233',9:'10304145361605041343',_:'0040','-':'1333','.':'2020','/':'0046','+':'0343 2125',':':'2121 2424','=':'0242 0444','(':'36252130',')':'16252110','>':'054301','<':'450341','#':'1016 3036 0242 0444',' ':'',
};
const strokes=new Map<string,number[][]>(Object.entries(GLYPHS).map(([ch,code])=>[ch,code.split(' ').filter(Boolean).map(run=>Array.from({length:run.length/2},(_,i)=>[+run[i*2],+run[i*2+1]]).flat())]));
const ADVANCE=5.6;
export const textWidth=(t:string,s:number)=>Math.max(0,t.length*ADVANCE-1.6)*s/6;
// Strokes for text centred on (cx, cy), capitals `s` tall. `turn` reads bottom to top.
export function textStrokes(t:string,cx:number,cy:number,s:number,turn=false):number[][]{
 const u=s/6,x0=-textWidth(t,s)/2,out:number[][]=[];
 [...t.toUpperCase()].forEach((ch,i)=>{
  for(const run of strokes.get(ch)??[]){
   const p:number[]=[];
   for(let k=0;k<run.length;k+=2){const lx=x0+(i*ADVANCE+run[k])*u,ly=s/2-run[k+1]*u;if(turn)p.push(cx+ly,cy-lx);else p.push(cx+lx,cy+ly)}
   out.push(p);
  }
 });
 return out;
}

const BODY=0x7ffffff0,TEXT=0x7ffffff1;
let cached:Print|null=null;
export function buildPrint():Print{
 if(cached)return cached;
 const pads:Pad[]=[],silk:Line[]=[],circles:Circle[]=[],fills:Box[]=[],names:Print['names']=[],outlines:Print['outlines']=[],missed:string[]=[],count:Record<string,number>={};
 // Who holds each 0.2 mm cell: a footprint number, a body, lettering, or nothing. Silk and lettering only go where nothing else is.
 const GW=Math.ceil(IMG.w/2)+1,GH=Math.ceil(IMG.h/2)+1,held=new Int32Array(GW*GH);
 const cells=(x0:number,y0:number,x1:number,y1:number)=>[Math.max(0,Math.floor(x0/2)),Math.max(0,Math.floor(y0/2)),Math.min(GW-1,Math.ceil(x1/2)),Math.min(GH-1,Math.ceil(y1/2))];
 const mark=(x0:number,y0:number,x1:number,y1:number,id:number)=>{const [a,b,c,d]=cells(x0,y0,x1,y1);for(let j=b;j<=d;j++)for(let i=a;i<=c;i++)held[j*GW+i]=id};
 const free=(x0:number,y0:number,x1:number,y1:number,id=0)=>{
  if(x0<9||y0<9||x1>IMG.w-9||y1>IMG.h-9)return false;
  const [a,b,c,d]=cells(x0,y0,x1,y1);for(let j=b;j<=d;j++)for(let i=a;i<=c;i++){const v=held[j*GW+i];if(v&&v!==id)return false}return true;
 };
 let fp=0;
 const pad=(x:number,y:number,w:number,h:number,o:Partial<Pad>={})=>{pads.push({x,y,w,h,r:Math.min(w,h)*.2,fp,route:true,...o});mark(x-w/2-1.2,y-h/2-1.2,x+w/2+1.2,y+h/2+1.2,fp)};
 const land=(l:Land,o:Partial<Pad>={})=>pad(U(l.x),V(l.z),l.w*10,l.h*10,o);
 const hole=(x:number,z:number,r:number,o:Partial<Pad>={})=>pad(U(x),V(z),r*20,r*20,{r:r*10,hole:r*5.6,...o});
 const line=(p:number[],w=1.4)=>{silk.push({p,w})};
 const frame=(b:Box,w=1.4)=>line([b[0],b[1],b[2],b[1],b[2],b[3],b[0],b[3],b[0],b[1]],w);
 const corners=(b:Box,arm:number,w=1.4)=>{for(const [x,y,sx,sy] of [[b[0],b[1],1,1],[b[2],b[1],-1,1],[b[2],b[3],-1,-1],[b[0],b[3],1,-1]])line([x+sx*arm,y,x,y,x,y+sy*arm],w)};
 const dot=(x:number,y:number,r:number)=>{circles.push({x,y,r,w:0})};
 const ring=(x:number,y:number,r:number,w=1.4)=>{circles.push({x,y,r,w})};
 const box=(b:Rect,m=0):Box=>[U(b[0])-m,V(b[1])-m,U(b[2])+m,V(b[3])+m];
 const text=(t:string,cx:number,cy:number,s:number,turn=false,weight=.16)=>{
  for(const p of textStrokes(t,cx,cy,s,turn))line(p,Math.max(1.3,s*weight));
  const w=textWidth(t,s)/2+1.5,h=s/2+1.5,b:Box=turn?[cx-h,cy-w,cx+h,cy+w]:[cx-w,cy-h,cx+w,cy+h];mark(b[0],b[1],b[2],b[3],TEXT);names.push({t,x:cx,y:cy,b});
 };
 const fits=(t:string,cx:number,cy:number,s:number,turn=false,id=0)=>{const w=textWidth(t,s)/2+1.2,h=s/2+1.2;return turn?free(cx-h,cy-w,cx+h,cy+w,id):free(cx-w,cy-h,cx+w,cy+h,id)};
 const must=(t:string,cx:number,cy:number,s:number,turn=false)=>{if(fits(t,cx,cy,s,turn))text(t,cx,cy,s,turn);else missed.push(t)};
 // Try a label beside a box: above, below, left, right, then the same turned on its side.
 const label=(t:string,b:Box,size:number,gap=3,id=0)=>{
  const mx=(b[0]+b[2])/2,my=(b[1]+b[3])/2;
  // Full size first; a crowded corner gets a smaller designator rather than none.
  for(const s of [size,size*.8,size*.66])for(const turn of [false,true]){
   const w=textWidth(t,s),hw=(turn?s:w)/2,hh=(turn?w:s)/2;
   for(const [cx,cy] of [[mx,b[1]-gap-hh],[mx,b[3]+gap+hh],[b[0]-gap-hw,my],[b[2]+gap+hw,my],[b[0]+hw,b[1]-gap-hh],[b[2]-hw,b[3]+gap+hh],[b[0]+hw,b[3]+gap+hh],[b[2]-hw,b[1]-gap-hh]])if(fits(t,cx,cy,s,turn,id)){text(t,cx,cy,s,turn);return true}
  }
  return false;
 };
 const next=(prefix:string)=>{count[prefix]=(count[prefix]??0)+1;return prefix+count[prefix]};
 const wanted:{name:string;b:Box;s:number;id:number}[]=[];
 const want=(name:string,b:Box,s=9)=>{wanted.push({name,b,s,id:fp})};
 const part=(id:string,b:Box,round=false)=>{outlines.push({id,b,round});mark(b[0],b[1],b[2],b[3],fp)};

 // The four mounting holes and the lettering blocks hold their ground first.
 for(const [x,z] of HOLES)mark(U(x)-HOLE.ring*10-8,V(z)-HOLE.ring*10-8,U(x)+HOLE.ring*10+8,V(z)+HOLE.ring*10+8,BODY);

 // ── Processor: a 17 × 17 ball grid at 0.8 mm. Only the outer ring is routed on this layer. ──
 {
  fp++;const n=SOC.n,half=(n-1)/2;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const edge=i===0?'l':i===n-1?'r':j===0?'t':j===n-1?'b':'';
   pads.push({x:U(SOC.x+(i-half)*SOC.pitch),y:V(SOC.z+(j-half)*SOC.pitch),w:3.8,h:3.8,r:1.9,fp,ball:true,route:!!edge,grp:edge?'soc:'+edge:undefined,k:edge==='l'||edge==='r'?j:i});
  }
  const b=box([SOC.x-SOC.s/2,SOC.z-SOC.s/2,SOC.x+SOC.s/2,SOC.z+SOC.s/2]);part(SOC.id,b);corners([b[0]-3,b[1]-3,b[2]+3,b[3]+3],14);line([b[0]-9,b[1]-3,b[0]-3,b[1]-9]);
  const s=box([SINK.x-SINK.s/2,SINK.z-SINK.s/2,SINK.x+SINK.s/2,SINK.z+SINK.s/2]);mark(s[0],s[1],s[2],s[3],fp);
  CLIP.forEach(([x,z],i)=>{fp++;pad(U(x),V(z),24,24,{r:5,route:false});ring(U(x),V(z),19,1.2);part('H'+(i+1),[U(x)-13,V(z)-13,U(x)+13,V(z)+13])});
 }
 // ── Memory: two 96-ball packages. The outer rows are routed. ──
 for(const r of RAMS){
  fp++;
  RAM.rows.forEach((dz,j)=>{for(let i=0;i<RAM.cols;i++){const outer=j===0||j===RAM.rows.length-1;pads.push({x:U(r.x+(i-(RAM.cols-1)/2)*RAM.pitch),y:V(r.z+dz),w:3.8,h:3.8,r:1.9,fp,ball:true,route:outer,grp:outer?`${r.id}:${j===0?'t':'b'}`:undefined,k:i})}});
  const b=box([r.x-RAM.w/2,r.z-RAM.d/2,r.x+RAM.w/2,r.z+RAM.d/2]);part(r.id,b);corners([b[0]-2.5,b[1]-2.5,b[2]+2.5,b[3]+2.5],10);dot(b[0]-5,b[3]+5,1.6);
 }
 // ── Storage: a 0.5 mm ball grid, a ring three deep round a 6 × 6 block. Every other ball of the right-hand column is routed. ──
 {
  fp++;const n=EMMC.n,half=(n-1)/2;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
   const ringed=i<3||j<3||i>=n-3||j>=n-3,core=i>=4&&i<=9&&j>=4&&j<=9;if(!ringed&&!core)continue;
   const bus=i===n-1&&j%2===1;
   pads.push({x:U(EMMC.x+(i-half)*EMMC.pitch),y:V(EMMC.z+(j-half)*EMMC.pitch),w:2.6,h:2.6,r:1.3,fp,ball:true,route:bus,grp:bus?'emmc:r':undefined,k:j});
  }
  const b=box([EMMC.x-EMMC.w/2,EMMC.z-EMMC.d/2,EMMC.x+EMMC.w/2,EMMC.z+EMMC.d/2]);part(EMMC.id,b);corners([b[0]-2.5,b[1]-2.5,b[2]+2.5,b[3]+2.5],10);dot(b[0]-5,b[1]-5,1.6);
 }
 // ── Leaded and leadless packages. ──
 const pack=(id:string,cx:number,cz:number,w:number,d:number,lands:Land[],extra?:()=>void,grp?:(l:Land,i:number)=>Partial<Pad>)=>{
  fp++;lands.forEach((l,i)=>land(l,grp?.(l,i)));extra?.();
  let b:Box=[U(cx-w/2),V(cz-d/2),U(cx+w/2),V(cz+d/2)];part(id,b);
  for(const l of lands)b=[Math.min(b[0],U(l.x-l.w/2)),Math.min(b[1],V(l.z-l.h/2)),Math.max(b[2],U(l.x+l.w/2)),Math.max(b[3],V(l.z+l.h/2))];
  corners([b[0]-3,b[1]-3,b[2]+3,b[3]+3],8);dot(b[0]-4.5,b[1]-4.5,1.5);want(id,[b[0]-4,b[1]-4,b[2]+4,b[3]+4]);
 };
 const sideName=['r','b','l','t'];
 pack(PMIC.id,PMIC.x,PMIC.z,PMIC.s,PMIC.s,pmicLands(),()=>pads.push({x:U(PMIC.x),y:V(PMIC.z),w:33,h:33,r:2,fp,route:false}));
 pack(PHY.id,PHY.x,PHY.z,PHY.s,PHY.s,phyLands(),undefined,(l,i)=>({grp:'phy:'+sideName[l.out],k:i%12}));
 pack(FLASH.id,FLASH.x,FLASH.z,FLASH.w,FLASH.d,flashLands());
 pack(LEVEL.id,LEVEL.x,LEVEL.z,LEVEL.w,LEVEL.d,levelLands(),undefined,(l,i)=>({grp:'lvl:'+sideName[l.out],k:i%7}));
 pack(USBSW.id,USBSW.x,USBSW.z,USBSW.w,USBSW.d,usbswLands());
 pack(LDO.id,LDO.x,LDO.z,LDO.w,LDO.d,ldoLands(),undefined,()=>({power:true}));
 // ── Power parts. ──
 INDUCTORS.forEach(([x,z],i)=>{fp++;for(const s of [-1,1])pad(U(x+s*1.85),V(z),15,42,{power:true});const b=box([x-INDUCTOR.s/2,z-INDUCTOR.s/2,x+INDUCTOR.s/2,z+INDUCTOR.s/2]);part('L'+(i+1),b);line([b[0]+8,b[1]-3,b[2]-8,b[1]-3]);line([b[0]+8,b[3]+3,b[2]-8,b[3]+3]);want('L'+(i+1),[b[0]-6,b[1]-4,b[2]+6,b[3]+4])});
 for(const t of TANTALUMS){
  fp++;const ls=tantalumLands(t);ls.forEach(l=>land(l,{power:true}));
  const b:Box=t.turn?[U(t.x-TANTALUM.w/2),V(t.z-TANTALUM.l/2),U(t.x+TANTALUM.w/2),V(t.z+TANTALUM.l/2)]:[U(t.x-TANTALUM.l/2),V(t.z-TANTALUM.w/2),U(t.x+TANTALUM.l/2),V(t.z+TANTALUM.w/2)];part(t.id,b);
  // Outline with a doubled bar at the positive end.
  if(t.turn){line([b[0]-3,b[1]+14,b[0]-3,b[3]-14]);line([b[2]+3,b[1]+14,b[2]+3,b[3]-14]);line([b[0]-3,b[1]-10,b[2]+3,b[1]-10],2)}else{line([b[0]+14,b[1]-3,b[2]-14,b[1]-3]);line([b[0]+14,b[3]+3,b[2]-14,b[3]+3]);line([b[0]-10,b[1]-3,b[0]-10,b[3]+3],2)}
  want(t.id,t.turn?[b[0]-5,b[1]-13,b[2]+5,b[3]+10]:[b[0]-13,b[1]-5,b[2]+10,b[3]+5]);
 }
 {fp++;const x=XTAL.x,z=XTAL.z;for(const [dx,dz] of [[-1.1,-.8],[1.1,-.8],[-1.1,.8],[1.1,.8]])pad(U(x+dx),V(z+dz),12,10);const b=box([x-XTAL.w/2,z-XTAL.d/2,x+XTAL.w/2,z+XTAL.d/2]);part(XTAL.id,b);corners([b[0]-3,b[1]-3,b[2]+3,b[3]+3],6);want(XTAL.id,[b[0]-4,b[1]-4,b[2]+4,b[3]+4],8)}
 {
  fp++;const x=U(COIN.x),y=V(COIN.z),r=COIN.r*10;
  pad(x-r-14,y,20,30,{power:true});pad(x+r+14,y,20,30,{power:true});pads.push({x,y,w:60,h:60,r:30,fp,route:false});
  mark(x-r-2,y-r-2,x+r+2,y+r+2,fp);outlines.push({id:COIN.id,b:[x-r,y-r,x+r,y+r],round:true});ring(x,y,r+3);
  line([x-r-30,y-22,x-r-30,y-12]);line([x-r-35,y-17,x-r-25,y-17]);want(COIN.id,[x-r-4,y-r-4,x+r+4,y+r+4]);
 }
 // ── Buttons, with their names above. ──
 for(const s of BUTTONS){
  fp++;buttonLands(s.x).forEach(l=>land(l));const b=box([s.x-BUTTON.s/2,BUTTON.z-BUTTON.s/2,s.x+BUTTON.s/2,BUTTON.z+BUTTON.s/2]);part(s.id,b);
  line([b[0]-3,b[1]+6,b[0]-3,b[3]-6]);line([b[2]+3,b[1]+6,b[2]+3,b[3]-6]);
  text(s.name,U(s.x),V(BUTTON.z)-56,10);
 }
 // ── Status LEDs: land pair, series resistor behind, a numeral in front and a cathode bar. ──
 for(let i=0;i<LEDS.n;i++){
  fp++;const x=U(ledX(i)),y=V(LEDS.z);pad(x,y-7.5,8,7);pad(x,y+7.5,8,7);mark(x-5,y-12,x+5,y+12,fp);outlines.push({id:'D'+(i+1),b:[x-4,y-8,x+4,y+8]});
  line([x-6.5,y+12.5,x+6.5,y+12.5],1.3);line([x-6.5,y-11,x-6.5,y+11],1);line([x+6.5,y-11,x+6.5,y+11],1);
  fp++;const ry=V(LEDS.rz);pad(x,ry-5,6,5.5);pad(x,ry+5,6,5.5);outlines.push({id:'R'+(i+1),b:[x-2.5,ry-5,x+2.5,ry+5]});
  text(String(i+1),x,V(LEDS.label),13,false,.15);
 }
 text('STATUS',U(ledX(0))-36,V(LEDS.z),8,true);
 // ── Connectors. ──
 {
  fp++;headerPins().forEach(([x,z],i)=>hole(x,z,.86,i&1?{grp:'hdr',k:i>>1}:{}));
  const hp=headerPins(),b:Box=[U(hp[0][0])-13,V(HEADER.z)-26,U(hp[39][0])+13,V(HEADER.z)+26];part('J1',b);frame([b[0]-2,b[1]-2,b[2]+2,b[3]+2]);
  // Pin one is square-marked; every fifth column carries its number in front.
  fills.push([b[0]-9,b[1]+30,b[0]-4,b[3]-4]);
  for(const n of [1,10,20,30,40]){const c=Math.floor((n-1)/2);text(String(n),U(hp[c*2][0]),b[3]+13,8)}
  text('GPIO',b[0]-18,V(HEADER.z),9,true);
 }
 {fp++;JUMPER.pins.forEach(([x,z])=>hole(x,z,.86));const b:Box=[U(JUMPER.pins[0][0])-13,V(31)-13,U(JUMPER.pins[1][0])+13,V(31)+13];part('J9',b);frame([b[0]-2,b[1]-2,b[2]+2,b[3]+2]);text('BOOT SEL',(b[0]+b[2])/2,b[1]-11,7)}
 const conn=(id:string,r:Rect,pins:[number,number,number][],lands:Land[],tabs:Land[],name:string,grp?:string)=>{
  fp++;pins.forEach(([x,z,q],i)=>hole(x,z,q,q>1?{power:true,route:false}:grp&&i<8?{grp,k:i}:{}));lands.forEach((l,i)=>land(l,grp?{grp,k:i}:{}));tabs.forEach(l=>land(l,{route:false}));
  const b=box(r);b[0]=Math.max(b[0],6);b[2]=Math.min(b[2],IMG.w-6);part(id,b);
  // Outline on the three inboard sides; the open side is the board edge.
  const left=r[0]<-BOARD.w/2,right=r[2]>BOARD.w/2;
  if(right)line([b[2],b[1]-3,b[0]-3,b[1]-3,b[0]-3,b[3]+3,b[2],b[3]+3]);else if(left)line([b[0],b[1]-3,b[2]+3,b[1]-3,b[2]+3,b[3]+3,b[0],b[3]+3]);else frame([b[0]-3,b[1]-3,b[2]+3,b[3]+3]);
  want(name,[b[0]-5,b[1]-5,b[2]+5,b[3]+5],10);
 };
 conn('J2',ETH.b,ETH_PINS,[],[],'LAN','eth');conn('J3',USB.b,USB_PINS,[],[],'USB','usb');conn('J4',HDMI.b,HDMI_PINS,HDMI_LANDS(),[],'HDMI','hdmi');
 conn('J5',BARREL.b,BARREL_PINS,[],[],'5V IN');conn('J6',MICRO.b,[],MICRO_LANDS(),MICRO_TABS,'OTG','otg');conn('J7',SD.b,[],SD_LANDS(),SD_TABS,'SD','sd');
 {
  fp++;FFC_LANDS().forEach((l,i)=>land(l,i%3===0?{grp:'ffc',k:i}:{route:i%3===1}));FFC_TABS.forEach(l=>land(l,{route:false}));
  const b=box([FFC.x-FFC.w/2,FFC.z-FFC.d/2,FFC.x+FFC.w/2,FFC.z+FFC.d/2]);part('J8',b);line([b[0]-3,b[3],b[0]-3,b[1]-3,b[2]+3,b[1]-3,b[2]+3,b[3]]);
  text('DSI',b[2]+16,b[1]+10,9);text('1',b[0]-8,V(FFC.tails),7);text('30',b[2]+10,V(FFC.tails),7);
 }

 // ── Small components: two lands each, exactly under the terminals, with side rails where they foul nobody. ──
 const firstChip=fp+1,chips=passives();
 for(const c of chips){
  fp++;const s=SIZES[c.kind],x=U(c.x),y=V(c.z),o=s[3]*10,l=s[4]*10,w=s[5]*10;
  if(c.turn){pad(x,y-o,w,l);pad(x,y+o,w,l)}else{pad(x-o,y,l,w);pad(x+o,y,l,w)}
  const f=footOf(c);mark(U(f[0]),V(f[1]),U(f[2]),V(f[3]),fp);
 }
 chips.forEach((c,i)=>{
  if(c.kind==='c04'||c.kind==='r04')return;
  const f=footOf(c),b:Box=[U(f[0])-2.2,V(f[1])-2.2,U(f[2])+2.2,V(f[3])+2.2],s=SIZES[c.kind],gap=(s[3]-s[4]/2)*10-1;
  if(!free(b[0]-.6,b[1]-.6,b[2]+.6,b[3]+.6,firstChip+i))return;
  const x=U(c.x),y=V(c.z);
  if(c.turn){line([b[0],y-gap,b[0],y+gap],1.1);line([b[2],y-gap,b[2],y+gap],1.1);if(c.kind==='d')line([b[0],b[1],b[2],b[1]],1.6)}
  else{line([x-gap,b[1],x+gap,b[1]],1.1);line([x-gap,b[3],x+gap,b[3]],1.1);if(c.kind==='d')line([b[0],b[1],b[0],b[3]],1.6)}
 });

 // ── The board's own lettering. ──
 {
  const b=box(TITLE);
  must('FROST',(b[0]+b[2])/2,b[1]+24,30);must('SBC-1  REV C',(b[0]+b[2])/2,b[1]+50,9);must('HVIT WERK 2634',(b[0]+b[2])/2,b[1]+65,8);
  mark(b[0],b[1],b[2],b[3],TEXT);
 }
 // ── Reference designators, where there is clear board. Numbering carries on from the hand-placed parts. ──
 count.C=TANTALUMS.length;count.R=LEDS.n;count.D=LEDS.n;
 for(const w of wanted)if(!label(w.name,w.b,w.s,3,w.id))missed.push(w.name);
 // Net names, where room is left.
 const NAMES:[string,number,number,number,boolean?][]=[['+5V',-39,-26.6,9],['GND',-28.5,-26.9,8],['VDD_CORE',-21.5,-18.6,7],['DDR',9.6,-15,7,true],['EMMC',-18.75,6.6,7],['ETH_PHY',17.5,10.4,7],['25M',25,6.2,7],['3V0',-9.5,20.8,8],['SPI',-24,7.6,7],['94V-0',-38,27,7],['TP1',6,-2.2,6]];
 for(const [t,x,z,s,turn] of NAMES){let done=false;for(let r=0;r<=40&&!done;r+=8)for(let a=0;a<(r?8:1)&&!done;a++){const cx=U(x)+Math.round(Math.cos(a*Math.PI/4)*r),cy=V(z)+Math.round(Math.sin(a*Math.PI/4)*r);if(fits(t,cx,cy,s,!!turn)){text(t,cx,cy,s,!!turn);done=true}}void done}
 chips.forEach((c,i)=>{
  const prefix=c.kind[0]==='c'?'C':c.kind[0]==='r'?'R':'D',name=next(prefix),f=footOf(c);
  if(c.kind==='c04'||c.kind==='r04')return;
  label(name,[U(f[0])-2,V(f[1])-2,U(f[2])+2,V(f[3])+2],6,2.6,firstChip+i);
 });
 // Fiducials: a bare dot in a clear ring, three of them.
 for(const [x,z] of [[-43,-25.5],[-35.5,31.5],[36.5,31.5]] as [number,number][])if(free(U(x)-11,V(z)-11,U(x)+11,V(z)+11)){fp++;pads.push({x:U(x),y:V(z),w:10,h:10,r:5,fp,route:false});ring(U(x),V(z),9,.8);mark(U(x)-11,V(z)-11,U(x)+11,V(z)+11,TEXT)}
 return cached={pads,silk,circles,fills,names,outlines,missed,count};
}
