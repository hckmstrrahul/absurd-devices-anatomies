// Console deck print, authored as vectors. The reference image decides where print sits and which ink it uses (pale, orange,
// amber); what is drawn there is designed: outlines, rules, scales, icons and labels in one sans face. Nothing here is traced.
// Positions are reference pixels (0.1 mm each). No three.js and no canvas in here; `textures.ts` draws the list.
import {footprints,KNOBS,CUPS,YELLOW_GRID,YELLOW_COLUMN,CONICS,CONIC,LOOM,RUNS,DISC,SCREWS,inside,at,type P2,type Foot} from './layout';
import {routes,endPoint,outlineDistance,lineDistance,LEADS} from './wiring';

export type Ink='pale'|'dim'|'ghost'|'orange'|'amber'|'hole'|'panel';
export type IconName='warning'|'bars'|'power'|'arrow'|'speaker'|'phase'|'sine'|'square'|'play'|'drop';
type Base={c:Ink;on?:'disc'};
export type Mark=Base&(
 |{k:'line';pts:P2[];w:number;round?:number;butt?:boolean}
 |{k:'box';x0:number;y0:number;x1:number;y1:number;r:number;w:number;fill?:boolean}
 |{k:'circle';x:number;y:number;r:number;w:number;fill?:boolean}
 |{k:'arc';x:number;y:number;r:number;from:number;to:number;w:number}
 |{k:'ticks';x:number;y:number;r0:number;r1:number;at:number[];w:number}
 |{k:'text';s:string;x:number;y:number;size:number;rot:number;weight:number}
 |{k:'icon';name:IconName;x:number;y:number;size:number;rot:number;w:number});
export const HAIR=2,RULE=2.6,ACCENT=3.2;      // stroke widths, px: 0.2, 0.26 and 0.32 mm
export const MIN_TEXT=13;                      // smallest label, px: 1.3 mm, readable in the Close view
const DEG=Math.PI/180;

// ── What already occupies the deck ────────────────────────────────────────
const COVER=(f:Foot)=>f.kind!=='rail';        // the clear rail shows the print under it
// Is this deck point under a part, a tube, the loom or (optionally) a loose lead? `pad` grows every obstacle, px.
export function blocked(x:number,y:number,pad=0,leads=true,onDisc=false):string|null{
 if(!inside(x-pad-10,y-pad-10)||!inside(x+pad+10,y+pad+10)||!inside(x-pad-10,y+pad+10)||!inside(x+pad+10,y-pad-10))return 'edge';
 for(const f of footprints){
  if(!COVER(f)||(onDisc?f.on!==DISC.id&&f.id!=='disc-port':!!f.on||f.y0!==0))continue;
  if(outlineDistance(f,[x,y])<pad+(f.kind==='square'||f.kind==='button'?6:f.kind==='slotChrome'?16:0))return f.id;
 }
 if(onDisc)return Math.hypot(x-DISC.x,y-DISC.y)>DISC.r-8-pad?'disc-edge':null;
 for(const run of RUNS)if(lineDistance(run.pts,[x,y])<run.r+6+pad)return run.id;
 if(x>1040-pad&&x<1148+pad&&y>345-pad&&y<LOOM.y1+4+pad)return 'loom';
 if(x>1140-pad&&x<LOOM.fanX+6+pad&&y>395-pad&&y<760+pad)return 'fan';
 if(leads){
  for(const route of routes())if(lineDistance(route.pts,[x,y])<route.lead.r+pad)return route.lead.id;
  for(const lead of LEADS)for(const e of [lead.a,lead.b])if('grommet' in e&&Math.hypot(x-e.grommet[0],y-e.grommet[1])<12+pad)return lead.id+' grommet';
  for(const [sx,sy] of SCREWS)if(Math.hypot(x-sx,y-sy)<12+pad)return 'screw';
 }
 return null;
}
// The box a label covers, px. Width per character is an upper estimate for an upper-case sans with light tracking.
export function textBox(m:{s:string;x:number;y:number;size:number;rot:number}){
 const len=m.s.length*m.size*.68,thick=m.size*.78,upright=Math.abs(m.rot%180)===90;
 return {x0:m.x-(upright?thick:len)/2,x1:m.x+(upright?thick:len)/2,y0:m.y-(upright?len:thick)/2,y1:m.y+(upright?len:thick)/2};
}
export function boxBlocked(b:{x0:number;y0:number;x1:number;y1:number},pad=3,onDisc=false){
 for(let x=b.x0;x<=b.x1+.01;x+=Math.max(2,(b.x1-b.x0)/Math.ceil((b.x1-b.x0)/5)))for(let y=b.y0;y<=b.y1+.01;y+=Math.max(2,(b.y1-b.y0)/Math.ceil((b.y1-b.y0)/5))){const hit=blocked(x,y,pad,true,onDisc);if(hit)return hit}
 return null;
}

let cache:Mark[]|null=null;
export function printMarks():Mark[]{
 if(cache)return cache;
 const marks:Mark[]=[];
 const line=(pts:P2[],c:Ink='dim',w=HAIR,round=0,butt=false)=>marks.push({k:'line',pts,c,w,round,butt});
 const box=(x0:number,y0:number,x1:number,y1:number,r:number,c:Ink='dim',w=HAIR,fill=false)=>marks.push({k:'box',x0,y0,x1,y1,r,c,w,fill});
 const circle=(x:number,y:number,r:number,c:Ink='dim',w=HAIR,fill=false)=>marks.push({k:'circle',x,y,r,c,w,fill});
 const arc=(x:number,y:number,r:number,from:number,to:number,c:Ink='dim',w=HAIR)=>marks.push({k:'arc',x,y,r,from,to,c,w});
 // Labels read from the side, as in the reference: a quarter turn clockwise unless `rot` says otherwise.
 const label=(s:string,x:number,y:number,size=15,c:Ink='pale',rot=90,weight=600)=>marks.push({k:'text',s,x,y,size,c,rot,weight});
 const icon=(name:IconName,x:number,y:number,size=30,c:Ink='pale',rot=90)=>marks.push({k:'icon',name,x,y,size,c,rot,w:HAIR});

 // ── Panels: slightly darker fields with a hairline edge, one per group of controls ──
 const panel=(x0:number,y0:number,x1:number,y1:number,r=22)=>{box(x0,y0,x1,y1,r,'panel',0,true);box(x0,y0,x1,y1,r,'dim',HAIR)};
 panel(792,30,1246,364,26);          // knob C, the rocker switch and the grey block
 panel(356,366,772,799,36);          // LCD
 panel(856,376,1034,1036);           // cue buttons, tap button and its three toggles
 panel(58,1680,370,2318,24);         // filter and resonance dials
 panel(782,1950,1168,2572,24);       // valves and pipework
 panel(1292,1884,1566,2212);         // transport keys
 panel(1574,1884,1766,2566);         // trigger column

 // ── Seats: an outline and a shaft hole under every large part. Hidden until the deck is taken apart. ──
 for(const f of footprints){
  if(f.on||f.y0!==0)continue;
  if(['knob','cup','button','conic'].includes(f.kind)){circle(f.x,f.y,f.r!-6,'ghost',HAIR);circle(f.x,f.y,Math.min(22,f.r!*.3),'hole',0,true);for(const a of [45,135,225,315])circle(f.x+Math.cos(a*DEG)*(f.r!-16),f.y+Math.sin(a*DEG)*(f.r!-16),3,'hole',0,true)}
  else if(f.kind==='display'&&f.id!=='touch-tab'||['square','silver','satin','greySwitch'].includes(f.kind)){box(f.x-f.w!/2+7,f.y-f.h!/2+7,f.x+f.w!/2-7,f.y+f.h!/2-7,14,'ghost',HAIR);box(f.x-16,f.y-7,f.x+16,f.y+7,7,'hole',0,true)}
 }
 // Where each lead meets the deck: the hole its grommet sits in.
 for(const lead of LEADS)for(const e of [lead.a,lead.b])if('grommet' in e){const [x,y]=endPoint(e);circle(x,y,lead.r*1.3,'hole',0,true)}
 for(const [x,y] of SCREWS)circle(x,y,5,'hole',0,true);

 // ── Rotaries: a hairline ring round each bezel; a 270° scale with numerals where there is room for one ──
 const SCALE=new Set(['knob-a','knob-c','knob-j']);
 for(const k of KNOBS){
  circle(k.x,k.y,k.r+7,'dim',HAIR);
  if(!SCALE.has(k.id))continue;
  const minor:number[]=[],major:number[]=[];
  for(let i=0;i<=30;i++){const a=225+i*9,big=i%5===0,r1=k.r+(big?26:20),x=k.x+Math.cos(a*DEG)*r1,y=k.y+Math.sin(a*DEG)*r1;
   if(blocked(x,y,5,false))continue;(big?major:minor).push(a);
   if(big){const n={k:'text' as const,s:String(i/5*2),x:k.x+Math.cos(a*DEG)*(k.r+41),y:k.y+Math.sin(a*DEG)*(k.r+41),size:15,rot:90,weight:600,c:'pale' as Ink};if(!boxBlocked(textBox(n),4))marks.push(n)}}
  marks.push({k:'ticks',x:k.x,y:k.y,r0:k.r+12,r1:k.r+20,at:minor,w:HAIR,c:'dim'});marks.push({k:'ticks',x:k.x,y:k.y,r0:k.r+12,r1:k.r+26,at:major,w:RULE,c:'pale'});
 }
 for(const c of CUPS)circle(c.x,c.y,c.r+6,'dim',HAIR);
 arc(583,190,162+6,22,150,'orange',ACCENT);                                   // knob B's orange sweep

 // ── Titles ──
 label('OUT A',763,190,44,'dim',90,800);label('02',1322,395,64,'dim',90,800);line([[1368,356],[1368,434]],'orange',ACCENT);
 label('GAIN',58,372,22);label('TUNE',760,330,20);label('PAN',880,312,22);label('MASTER',1345,215,26);label('LEVEL',1722,560,22);
 label('CLOCK',735,880,20);label('RATE',722,1640,20);label('BUS',762,1278,24);
 label('FILTER',346,1799,26);label('RESO',346,2164,26);label('DRIVE',346,2440,26);label('LFO 1',270,1985,20,'dim');
 label('SEQUENCER',640,1690,16,'dim',0);

 // ── Top band ──
 // The knob C panel, with its orange lower and right edge running from the rocker switch round to the red toggle.
 line([[812,364],[1246,364],[1246,112]],'orange',ACCENT,26);
 label('VENT',392,58,15,'dim');label('PHONES',406,240,15);label('LINE',418,335,15);
 for(const [i,s] of ['CONSOLE MK III','24 V DC  2.5 A','SER. 0417-B'].entries())label(s,1764-i*22,84,13,'dim');
 label('TONE',1748,272,15);label('TALK',1773,398,15);label('AUX 1',1735,385,15);label('AUX 2',1735,472,15);
 // Level rule beside the right-hand column, and the long rule seen through the clear strip.
 line([[1766,452],[1766,640]],'dim',HAIR);for(let y=452;y<=640;y+=18.8)line([[1766,y],[(Math.round((y-452)/18.8)%5===0?1746:1754),y]],'dim',HAIR,0,true);label('dB',1786,546,14,'dim');
 line([[1842,140],[1842,640]],'dim',HAIR);for(let i=0;i<=20;i++){const y=140+i*25;line([[1842,y],[i%4===0?1822:1832,y]],'dim',HAIR,0,true);if(i%4===0&&i<20)label(String(i/4*10),1860,y,13,'dim')}

 // ── LCD surround and the six cue buttons ──
 line([[964,364],[964,792]],'orange',RULE);
 const cue=['CUE','LOOP','SYNC','TAP','HOLD','MUTE'];YELLOW_GRID.forEach(([x,y],i)=>label(cue[i],x,y+74,15,'orange'));
 box(884,848,926,912,8,'pale',HAIR);label('BPM',905,880,20);
 for(const [i,y] of [933,962,1018].entries())label(String(i+1),974,y,14,'dim');
 box(343,798,383,838,9,'orange',RULE);label('PWR',399,818,14);

 // ── Left column ──
 icon('phase',90,846,34);label('PHASE',60,908,15);label('FLOW',60,1074,15);
 label('IN 1',424,1046,14);label('IN 2',560,1187,14);
 label('MODE',370,1334,15);(['bars','speaker','sine','square'] as IconName[]).forEach((name,i)=>{const y=1380+i*48;box(352,y-18,388,y+18,6,'pale',HAIR);icon(name,370,y,22)});
 line([[46,1700],[46,2330],[368,2330]],'orange',ACCENT,22);

 // ── Centre ──
 box(747,1344,781,1378,6,'pale',HAIR);icon('bars',764,1361,22);icon('warning',770,1502,34);
 box(880,1410,972,1540,12,'orange',RULE);for(const [i,s] of ['INPUT 24 V','MAX 2.5 A','CLASS 2'].entries())label(s,948-i*22,1475,13);
 // The scale under knob H.
 line([[1584,792],[1736,792]],'dim',HAIR);[-40,-30,-20,-10,0].forEach((v,i)=>{const x=1590+i*35;line([[x,792],[x,806]],'pale',RULE,0,true);if(i<4)for(let j=1;j<5;j++)line([[x+j*7,792],[x+j*7,800]],'dim',HAIR,0,true);label(String(v).replace('-','−'),x,828,13,v===0?'orange':'pale')});

 // ── Pipework, lower centre ──
 // The orange manifold rule runs from the tube cap down the column of six valves, with a branch to each.
 line([[772,1908],[772,2562]],'orange',ACCENT);CONICS.forEach(([x,y],i)=>{line([[772,y],[x-CONIC.r-5,y]],'orange',ACCENT,0,true);label(String(i+1),800,y-55,14)});
 (['A','B','C'] as const).forEach((s,i)=>{const f=at(`valve-${i+1}`);label(s,f.x-38,f.y-38,16)});
 label('FEED',1138,2040,20);label('PUMP',1183,2548,18);label('DRAIN',1256,2542,14,'dim');icon('drop',1138,1990,26);
 label('36',1310,2398,30);label('PSI',1310,2448,14,'dim');

 // ── Keys and the trigger column, lower right ──
 ['REC','PLAY','STOP'].forEach((s,i)=>label(s,1369,[1939,2041,2149][i],16));['A','B','C'].forEach((s,i)=>label(s,1476,[1939,2041,2147][i],16,'dim'));
 label('GATE',1476,2540,16);
 const trig=['KICK','SNARE','HAT','TOM','CLAP','PERC','FX'];
 line([[1722,YELLOW_COLUMN[0][1]],[1722,YELLOW_COLUMN[6][1]]],'amber',RULE);
 YELLOW_COLUMN.forEach(([x,y],i)=>{line([[x+44,y],[1722,y]],'amber',RULE,0,true);label(trig[i],1594,y,15)});
 label('TRIGGER',1748,2000,20);label('SEQUENCE',1748,2300,20);

 // ── The raised sub-panel disc (drawn on its own texture) ──
 const disc=(m:Mark)=>marks.push({...m,on:'disc'});
 disc({k:'circle',x:DISC.x,y:DISC.y,r:DISC.r-11,w:HAIR,c:'dim'});disc({k:'arc',x:DISC.x,y:DISC.y,r:DISC.r-22,from:20,to:100,w:ACCENT,c:'orange'});
 disc({k:'text',s:'AUX',x:1052,y:1742,size:17,rot:90,weight:600,c:'pale'});disc({k:'ticks',x:DISC.x,y:DISC.y,r0:DISC.r-34,r1:DISC.r-26,at:Array.from({length:9},(_,i)=>110+i*8),w:HAIR,c:'dim'});
 return cache=marks;
}
