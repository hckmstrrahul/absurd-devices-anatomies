// Positions traced from assets/chorus-reference.png (2000 × 1289 px, front view).
// The plinth spans image x 350–1650, taken as 390 mm, so 1 px = 0.3 mm.
// X right from image x 1000, Y up from the underside of the feet (image y 1150), Z toward the viewer.
export const MM=.3;
export const px=(x:number,y:number):[number,number]=>[Math.round((x-1000)*MM*10)/10,Math.round((1150-y)*MM*10)/10];
export type V=[number,number,number];

export const PLINTH={w:390,d:176,r:22,foot:12,step:23,top:30,deckW:368,deckD:156};
// Glass arch: flat bottom, straight sides, rounded top corners.
export const ARCH={w:355,h:274,r:80,d:132,wall:4,tube:3.6,y0:PLINTH.top};
// Master clock. The hood is a larger drum set a little higher, so it shows as a crescent above the bezel.
export const MASTER={x:0,y:160.5,dial:70,bezel:76,bezelTube:6,hood:86,hoodRise:12,hoodZ0:-46,hoodZ1:12,dialZ:13,sub:{y:-18,r:11.2},finial:283.5,finialR:7.5};
export const PEDESTAL={w:190,h:48,d:70,y0:PLINTH.top,top:78,r:22};
export const LCD={w:130,h:27,y:51,screenW:122,screenH:20};
export const POST={x:160,z:-40,r:2.2,top:252};
// Synchronising drive: a line shaft behind the pedestal turns an upright shaft beside each post, once a minute.
export const SYNC={x:152,z:-44,y:38,crownY:34,top:250,r:1.1};

export type OrbStyle='gears'|'frame'|'solid'|'scroll'|'plain';
export type Orb={
 id:string;asm:'left'|'right';city:string;code:string;
 offset:number|null;            // hours ahead of the master; null means no dial
 x:number;y:number;r:number;
 pivotY?:number;                // hanging orbs swing about this height
 style:OrbStyle;dial:number;    // dial radius as a fraction of the orb radius
 tint:number;opacity:number;bg:string;ink:string;
 lift:V;
};
export const ORBS:Orb[]=[
 {id:'tokyo',asm:'left',city:'Tokyo',code:'TYO',offset:9,x:-121,y:215,r:36,pivotY:288,style:'gears',dial:.5,tint:0x52d68a,opacity:.46,bg:'#7fdc9c',ink:'#0c3a22',lift:[0,40,0]},
 {id:'delhi',asm:'left',city:'Delhi',code:'DEL',offset:5.5,x:-123,y:114,r:37.5,pivotY:160,style:'frame',dial:.44,tint:0xffffff,opacity:.13,bg:'#f6f5f0',ink:'#1b1b1d',lift:[-30,0,0]},
 {id:'cell',asm:'left',city:'Cell',code:'',offset:null,x:-124,y:52.5,r:22,style:'solid',dial:0,tint:0xf5c400,opacity:.93,bg:'',ink:'',lift:[0,-6,0]},
 {id:'kathmandu',asm:'right',city:'Kathmandu',code:'KTM',offset:5.75,x:123,y:213,r:33.6,pivotY:285,style:'scroll',dial:.36,tint:0xffffff,opacity:.13,bg:'#f6f5f0',ink:'#2a2a2d',lift:[0,40,0]},
 {id:'stjohns',asm:'right',city:"St John's",code:'YYT',offset:-3.5,x:125.4,y:153,r:26,style:'plain',dial:.8,tint:0x1fc4f2,opacity:.5,bg:'#35c6ee',ink:'#06364f',lift:[50,18,0]},
 {id:'newyork',asm:'right',city:'New York',code:'NYC',offset:-5,x:124,y:100.5,r:26,style:'plain',dial:.8,tint:0xc9a0ea,opacity:.48,bg:'#cba6e8',ink:'#3a2356',lift:[0,0,0]},
 {id:'chatham',asm:'right',city:'Chatham',code:'CHT',offset:12.75,x:124,y:52,r:21.5,style:'plain',dial:.8,tint:0x1fd67c,opacity:.5,bg:'#31d683',ink:'#06381f',lift:[50,-6,0]},
];
export const DIALS=ORBS.filter(o=>o.offset!==null);
export const HANGING=ORBS.filter(o=>o.pivotY!==undefined);
export const orb=(id:string)=>{const o=ORBS.find(o=>o.id===id);if(!o)throw new Error(`Unknown orb ${id}`);return o};
export const rodLength=(o:Orb)=>o.pivotY!-o.y;   // pivot to orb centre, mm

// Centre of an orb when its rod is at `angle` radians from vertical.
export function orbCentre(o:Orb,angle=0):[number,number]{
 if(o.pivotY===undefined)return [o.x,o.y];
 const L=rodLength(o);return [o.x+L*Math.sin(angle),o.pivotY-L*Math.cos(angle)];
}
// Clearance to the inside of the glass arch in the front plane; negative means outside.
export function archInset(x:number,y:number){
 const hw=ARCH.w/2-ARCH.wall,top=ARCH.y0+ARCH.h-ARCH.wall,r=ARCH.r-ARCH.wall,cx=hw-r,cy=top-r,ax=Math.abs(x);
 if(ax>cx&&y>cy)return r-Math.hypot(ax-cx,y-cy);
 return Math.min(hw-ax,top-y,y-ARCH.y0);
}
// Outline of the arch from the bottom left, over the top, to the bottom right; y starts at 0.
export function archOutline(w:number,h:number,r:number,step=10){
 const x=w/2,pts:[number,number][]=[];
 const line=(x0:number,y0:number,x1:number,y1:number)=>{const n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/step));for(let i=0;i<n;i++)pts.push([x0+(x1-x0)*i/n,y0+(y1-y0)*i/n])};
 const turn=(cx:number,cy:number,a0:number,a1:number)=>{for(let i=0;i<18;i++){const a=a0+(a1-a0)*i/18;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}};
 line(-x,0,-x,h-r);turn(-x+r,h-r,Math.PI,Math.PI/2);line(-x+r,h,x-r,h);turn(x-r,h-r,Math.PI/2,0);line(x,h-r,x,0);pts.push([x,0]);return pts;
}
