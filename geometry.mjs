import * as k from './vendor/anatomy/kit/iso-kit.mjs';
import * as G from './vendor/anatomy/kit/lathe.mjs';
import * as A from './vendor/anatomy/kit/audit.mjs';

export const assemblies = [
  { id: 'receiver', name: 'Field receiver', category: 'RECEPTION', desc: 'A planar antenna fits inside the lid. Its flush status window tracks field intensity.', material: 'Internal antenna / composite', move: [0, 0, 74] },
  { id: 'display', name: 'Specimen display', category: 'OBSERVATION', desc: 'A flush display shows vitality, toxicity, growth and absorption. Three touch keys sit on the flat front.', material: 'Flush glass / composite', move: [89, 0, 0] },
  { id: 'processor', name: 'Signal processor', category: 'INTERPRETATION', desc: 'A removable board converts samples into readings. Chips, memory and filters sit on a plated carrier.', material: 'Circuit substrate / silicon', move: [0, 0, 32] },
  { id: 'audio', name: 'Audio emitter', category: 'FEEDBACK', desc: 'A perforated bronze grille protects the circular speaker. The driver and magnet sit behind the flush perforated cover.', material: 'Perforated bronze / ferrite', move: [0, 96, 0] },
  { id: 'power', name: 'Power cell', category: 'ENERGY', desc: 'A removable cell powers the receiver and display. Its alloy strap holds the sealed cell inside the chassis.', material: 'Sealed cell / alloy strap', move: [0, 72, 0] },
  { id: 'chassis', name: 'Containment chassis', category: 'STRUCTURE', desc: 'Six square faces form a 120 mm cube. The flat base supports rails, the power cell and corner mounts.', material: 'Formed alloy', move: [0, 0, 0] },
];
export const CUBE_SIDE = 120;
export const ENVELOPE = { min: [-60, -60, 4], max: [60, 60, 124] };
// Resize the actual world geometry; the SVG is never stretched after projection.
const SX = CUBE_SIDE / 194, SZ = CUBE_SIDE / 123;
const world = ([x,y,z]) => [x*SX,y,4+(z-4)*SZ];
for(const assembly of assemblies)assembly.move=assembly.move.map((v,i)=>v*[SX,1,SZ][i]);
export const P = { origin: [450, 490], scale: 1.85, azimuth: 45, elevation: Math.atan(1/Math.sqrt(2))*180/Math.PI };
export const W = 900, H = 680;
const at = p => k.iso(p, P);
const group = (s, mat) => `<g class="material-${mat}">${s}</g>`;
const outline = (d, tone = 'lo') => k.lineSvg(d, { tone });
const front = (x, y, z) => k.sideMatrix(world([x,y,z]).slice(0,2),world([x,y,z])[2],P,'right')+` scale(1 ${SZ})`;
const side = (x, y, z) => k.sideMatrix(world([x,y,z]).slice(0,2),world([x,y,z])[2],P,'left')+` scale(${SX} ${SZ})`;
const top = (x,y,z) => k.topMatrix(world([x,y,z]).slice(0,2),world([x,y,z])[2],P)+` scale(${SX} 1)`;
// Circular speaker details stay circular after shortening the enclosure's depth.
const speakerFace = (x,y,z) => k.sideMatrix(world([x,y,z]).slice(0,2),world([x,y,z])[2],P,'left');
const rect = (x,y,w,h,r=1) => k.pathOf(k.roundedPlan({x,y,w,d:h,r},8),true);
const pad = (x,y,r=0.85) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="currentColor" stroke-width=".45"/>`;
function traces(w,h,seed=0) {
  let out = '';
  for(let i=0;i<12;i++) {
    const x=5+(i*13+seed*7)%(w-14), y=5+(i*17+seed*11)%(h-15);
    const end=Math.min(w-4,x+9+(i%4)*3), yy=Math.min(h-4,y+5+(i%3)*2);
    out+=`<path d="M${x} ${y}h3l4 4H${end}V${yy}" fill="none" stroke="currentColor" stroke-width=".38"/>${pad(x,y,.7)}${pad(end,yy,.7)}`;
  }
  return `<g class="circuits">${out}</g>`;
}
function screws2d(points) {
  return points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.35" fill="#233429" stroke="#a6ae8d" stroke-width=".35"/><path d="M${x-.7} ${y-.7}l1.4 1.4" stroke="#a6ae8d" stroke-width=".35"/>`).join('');
}
export function makeGeometry({interactiveControls=true}={}) {
  const R = A.recorder(P);
  function put(name,piece,paths,shape,material='green',details='') {
    const meta=assemblies.find(a=>a.id===piece);
    shape.name=name; shape.owner=piece;
    const b=A.boundsOf(shape), center=b.min.map((v,i)=>(v+b.max[i])/2);
    const svg=group(k.solidSvg(paths,{tone:'mid',inner:details?`<g class="surface-details">${details}</g>`:''}),material);
    return R.put({name,piece,move:meta.move,at:center,svg,shapes:[R.solid(shape)]});
  }
  function slab(name,piece,x,y,w,d,z,h,material='green',r=1,details='') {
    const plan={x:x*SX,y,w:w*SX,d,r:r*SX};
    const bottom=world([0,0,z])[2], height=h*SZ;
    return put(name,piece,k.slabOf(plan,bottom,height,P,8,.65),A.slab(plan,bottom,height),material,details);
  }
  function disc(name,piece,origin,axis,r,length,mat='brass',details='') {
    const F=G.frameAlong(world(origin),axis);
    return put(name,piece,G.solidOf([[0,r],[length,r]],F,P),A.disc(F,0,length,r),mat,details);
  }
  function prism(name,piece,F,polygon,s0,s1,mat,details='') {
    return put(name,piece,G.prismOf(F,polygon,s0,s1,P),A.prism(F,polygon,s0,s1),mat,details);
  }
  // Every removable module meets a physical seat in the assembled pose.
  slab('stand.floor','chassis',-97,-60,194,120,4,4,'metal',0);
  slab('chassis.rear','chassis',-97,-60,4,120,8,117,'green',0);
  slab('chassis.far','chassis',-93,-60,186,4,8,117,'green',0);
  for(const x of [-89,85])for(const y of [-52,48])slab(`chassis.post.${x}.${y}`,'chassis',x,y,8,8,8,117,'metal',1);
  for(const y of [-45,39]) {
    slab(`chassis.rail.${y}`,'chassis',-82,y,164,6,65,5,'metal',1);
    for(const x of [-81,79])slab(`chassis.rail-seat.${x}.${y}`,'chassis',x,y,6,6,58,7,'metal',.6);
  }
  // Power tray slides through the open speaker side when the shell is separated.
  slab('power.tray','power',-79,-39,118,72,8,3,'metal',2);
  slab('power.cell','power',-76,-36,95,66,11,35,'battery',4,
    `<g transform="${side(-76,30,46)}"><path d="${rect(8,9,63,16,1.5)}" fill="#28342f"/><text x="13" y="19" fill="#b2bd9c" font-family="monospace" font-size="5">XN / FIELD CELL</text></g>`);
  slab('power.cap','power',-76,-36,95,66,46,3,'metal',2);
  for(const x of [-60,-15])slab(`power.contact.${x}`,'power',x,-20,8,10,49,3,'brass',1);
  slab('power.regulator','power',23,-20,13,28,11,16,'rubber',1);
  // Processor board, posts, packages, and passive components.
  for(const x of [-74,68])for(const y of [-42,36])slab(`processor.spacer.${x}.${y}`,'processor',x,y,5,5,70,5,'brass',.8);
  const boardTrace=`<g transform="${top(-82,-45,77)}">${traces(164,90,4)}${screws2d([[5,5],[159,5],[5,85],[159,85]])}</g>`;
  slab('processor.board','processor',-82,-45,164,90,75,2,'pcb',2,boardTrace);
  slab('processor.cpu','processor',-30,-17,34,34,77,5,'rubber',1,
    `<g transform="${top(-30,-17,82)}"><path d="${rect(4,4,26,26,1)}" fill="none" stroke="#859589" stroke-width=".4"/><text x="8" y="18" fill="#9daf9e" font-size="5" font-family="monospace">XN-42</text></g>`);
  for(const x of [-66,-46,16,36])slab(`processor.memory.${x}`,'processor',x,18,13,20,77,3,'rubber',.7);
  for(let i=0;i<6;i++)slab(`processor.connector.${i}`,'processor',-68+i*23,-42,15,7,77,5,'brass',.5);
  for(let i=0;i<8;i++)slab(`processor.capacitor.${i}`,'processor',50+(i%2)*12,-20+Math.floor(i/2)*13,7,8,77,8,'metal',1.4);
  // Top lid and its plated surface.
  let lidDetail=`<g transform="${top(-97,-60,127)}">${traces(194,120,1)}${screws2d([[8,8],[186,8],[8,112],[186,112]])}`;
  for(let i=0;i<9;i++)lidDetail+=`<path d="${rect(12+i*4,23,1.7,31,.85)}" fill="#20322a" stroke="#61755c" stroke-width=".35"/>`;
  lidDetail+=`<path d="${rect(79,35,52,37,3)}" fill="#344937" stroke="#71825c" stroke-width=".45"/>${traces(62,35,2)}<text x="88" y="57" fill="#a7b48e" font-size="5" font-family="monospace">XNOS / 01</text><g class="material-emitter"><path d="${rect(152,26,23,6,1)}" fill="#cfdb8e" stroke="#e2e7b0" stroke-width=".4"/></g></g>`;
  slab('receiver.lid','receiver',-97,-60,194,120,125,2,'green',0,lidDetail);
  // The planar receiver is attached to the underside of the lid.
  slab('receiver.antenna-carrier','receiver',30,-38,48,32,123,2,'pcb',1);
  slab('receiver.patch','receiver',35,-33,38,22,122,1,'brass',1);
  slab('receiver.feed','receiver',49,-27,12,10,118,4,'rubber',.6);
  // Driver and magnet stay behind a grille drawn flush on the side cover.
  let audioDetail=`<g transform="${side(-93,60,125)}">${traces(186,117,7)}${screws2d([[5,5],[181,5],[5,111],[181,111]])}`;
  for(let i=0;i<5;i++)audioDetail+=`<path d="${rect(16,12+i*4,66,1.5,.7)}" fill="#243a2c" stroke="#78916a" stroke-width=".3"/>`;
  audioDetail+='</g>';
  let grill='';
  for(let y=-28;y<=28;y+=4.7)for(let x=-28;x<=28;x+=4.7)if(Math.hypot(x,y)<29)grill+=`<circle cx="${x}" cy="${y}" r="1.12" fill="#282720" stroke="#8c7250" stroke-width=".28"/>`;
  grill=`<g transform="${speakerFace(10,60,58)}"><circle class="flush-grille-background" r="34" fill="#283128" stroke="#b69b6e" stroke-width=".5"/><circle r="31" fill="#71563b" stroke="#b69b6e" stroke-width=".5"/>${grill}<circle r="32" fill="none" stroke="#c2a171" stroke-width=".55"/></g>`;
  slab('audio.side-cover','audio',-93,56,186,4,8,117,'green',0,audioDetail+grill);
  disc('audio.driver','audio',[10,53,58],[0,1,0],36,3,'rubber');
  disc('audio.magnet','audio',[10,51,58],[0,1,0],34,2,'metal');
  disc('audio.backplate','audio',[10,50,58],[0,1,0],33,1,'brass');
  // A single flat front face carries the inset screen and capacitive keys.
  slab('display.backing','display',88,-43,5,86,21,92,'rubber',1);
  let controls='';
  for(let i=0;i<3;i++) {
    const y=22-i*22;
    controls+=`<g transform="${front(97,y,18)}"><circle r="4.4" fill="#987746" stroke="#c3ab78" stroke-width=".45"/><g class="device-button"${interactiveControls?` data-device-action="${['power','scan','explode'][i]}" role="button" tabindex="0" aria-label="${['Toggle device power','Run specimen scan','Toggle exploded view'][i]}"`:""}><circle r="5" fill="transparent"/><text text-anchor="middle" y="1.3" fill="#3f3829" font-size="4" font-family="monospace">${['I','•','↗'][i]}</text></g></g>`;
  }
  slab('display.face','display',93,-60,4,120,8,117,'green',0,
    `<g transform="${front(97,60,125)}">${traces(120,117,3)}${screws2d([[5,5],[115,5],[5,111],[115,111]])}<path class="flush-window" d="${rect(9,8,102,91,6)}" fill="#1e2a22" stroke="#819270" stroke-width=".55"/>${screenMarkup()}</g>${controls}`);
  return {R};
}

function screenMarkup() {
  let plant='';
  for(let i=0;i<9;i++) {
    const y=70-i*4.7, direction=i%2?1:-1, length=9+(i%3)*3;
    plant+=`<path d="M38 ${y} Q${38+direction*length} ${y-2} ${38+direction*(length+2)} ${y-12} Q${38+direction*2} ${y-10} 38 ${y}" fill="${i%2?'#73ad8c':'#91c7b0'}" opacity="${.55+i*.04}"/><path d="M38 ${y}l${direction*(length+2)} -12" stroke="#c2e5b4" stroke-width=".32"/>`;
  }
  return `<g class="screen-face"><defs><clipPath id="screen-clip"><path d="${rect(13,12,94,83,5)}"/></clipPath><linearGradient id="screen-grad" x2="0" y2="1"><stop stop-color="#1b302b"/><stop offset="1" stop-color="#091a17"/></linearGradient><linearGradient id="screen-sheen" x2="1" y2="1"><stop stop-color="#c4e2bf" stop-opacity=".11"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <g clip-path="url(#screen-clip)"><path d="${rect(13,12,94,83,5)}" fill="url(#screen-grad)"/>
  <g id="screen-live"><text x="18" y="20" class="screen-type" font-size="3.5">X–42 / FLORA</text><circle id="crt-record" cx="89" cy="18.8" r=".9" fill="#c27b61"/><text x="92" y="20" class="screen-type" font-size="2.6">REC</text>
  <g id="specimen"><path d="M38 80Q32 60 40 30" fill="none" stroke="#9dbd87" stroke-width="1.2"/>${plant}<path d="M38 77q-9 7-7 12m7-12q9 7 6 12m-6-12v12" fill="none" stroke="#709b76" stroke-width=".7"/></g>
  <text x="64" y="30" class="screen-type" font-size="3">VITALITY</text><text id="crt-vitality" x="97" y="30" text-anchor="end" class="screen-type" font-size="3">91%</text>
  ${Array.from({length:10},(_,i)=>`<rect class="vital-bar" x="${64+i*3.2}" y="33" width="2.1" height="3" fill="#85b995"/>`).join('')}
  <text x="64" y="44" class="screen-type" font-size="3">TOXICITY</text><circle cx="75" cy="55" r="8" fill="none" stroke="#497961" stroke-width=".5"/><circle cx="75" cy="55" r="4.4" fill="none" stroke="#497961" stroke-width=".4"/><path d="M67 55h16M75 47v16" stroke="#497961" stroke-width=".4"/><path id="radar-needle" d="M75 55l5 -6" stroke="#8abd93" stroke-width=".6"/><text id="crt-toxicity" x="89" y="57" class="screen-type" font-size="3.6">37</text>
  <text x="64" y="68" class="screen-type" font-size="3">GROWTH</text><text id="crt-growth" x="97" y="68" text-anchor="end" class="screen-type" font-size="3">0.61</text><path id="crt-wave" d="M64 77l4-2 4 1 4-3 4 1 4-2 4 1 5-3" fill="none" stroke="#82b990" stroke-width=".6"/>
  <text x="64" y="83" class="screen-type" font-size="2.7">ABSORB</text><text id="crt-absorption" x="97" y="83" text-anchor="end" class="screen-type" font-size="2.7">61%</text>
  ${Array.from({length:10},(_,i)=>`<rect class="absorption-bar" x="${64+i*3.2}" y="85" width="2.1" height="1.5" fill="#85b995"/>`).join('')}
  <text id="crt-status" x="18" y="90" class="screen-type" font-size="2.7">&gt; SPECIMEN LINK ESTABLISHED</text>
  <path id="scan-beam" d="M14 25H106" stroke="#bcdf9e" stroke-width=".8" opacity="0"/>
  ${Array.from({length:42},(_,i)=>`<path class="scanline" d="M13 ${13+i*2}H108" stroke="#020f0a" stroke-width=".35" opacity=".3"/>`).join('')}</g>
  <text id="screen-off" x="60" y="56" text-anchor="middle" class="screen-type" font-size="4" opacity="0">STANDBY</text>
  <path class="screen-sheen" d="${rect(13,12,94,83,5)}" fill="url(#screen-sheen)"/></g></g>`;
}

export function settleGeometry(R) {
  // Motion has one shared separation scalar; these are the same poses rendered by the UI.
  const states=Array.from({length:21},(_,i)=>i/20);
  A.settle(R,P,{states});
  R.items.sort((a,b)=>a.key-b.key);
  return states;
}
export function svgMarkup(R) {
  return `<svg class="iso-svg device-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="device-title device-desc"><title id="device-title">XNOS Flora Interface Unit anatomy</title><desc id="device-desc">Equal-sided cube botanical instrument with a flush bronze speaker grille, flat specimen display, touch controls, and an internal antenna. Use the component list and separation controls to explore six assemblies.</desc><defs><radialGradient id="floor-shadow"><stop stop-color="#15231c" stop-opacity=".24"/><stop offset="1" stop-color="#15231c" stop-opacity="0"/></radialGradient></defs><ellipse cx="450" cy="495" rx="210" ry="80" fill="url(#floor-shadow)"/><g id="device-parts" transform="translate(-72 -54.4) scale(1.16)">${R.items.map((item,i)=>`<g class="device-part" data-item="${i}" data-assembly="${item.piece}" data-key="${item.key}" data-move="${item.move.join(',')}">${item.svg}</g>`).join('')}</g></svg>`;
}
export function auditGeometry(R) {
  A.auditOrExit(R,P,{apart:true,frames:Array.from({length:101},(_,i)=>i/100)});
}
