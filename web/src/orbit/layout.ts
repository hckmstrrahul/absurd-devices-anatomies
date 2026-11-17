import type {AssemblyId} from './model';

// Positions traced from assets/orbit-deck-reference.png. The case spans image
// x 330–1640 and y 325–1545, so 1 px ≈ 0.198 mm. X right, Z toward the image bottom, Y up.
export const px=(x:number,y:number):[number,number]=>[Math.round((x-985)*260/1310*10)/10,Math.round((y-935)*242/1220*10)/10];

export const TRAY={x:260,z:242,chamfer:10,wall:3,feet:2,floorTop:5,rim:30,lidInner:43,top:46,innerX:127,innerZ:118};
export const PCB={x0:-112,x1:116,z0:-98,z1:108,y0:10.4,y1:12};
export const PLATTER={x:5,z:3,bezel:56,disc:46,label:26.5,hub:12.5,spindle:4.5,pulley:42};
export const COIL={x:-68.5,z:-53.6,bracket:30,outer:23,inner:13.5};
export const ROTOR={x:-85.3,z:53.6,mount:22,disc:17,pulley:7};
export const KNOB_X=71.4;
export const KNOB_Z=[-68.4,-53.6,-38.7,-22.8,-10.9];

export type Footprint={id:string;asm:AssemblyId;x:number;z:number;r?:number;w?:number;d?:number;y0:number;y1:number};
const B=PCB.y1;
const disc=(id:string,asm:AssemblyId,x:number,z:number,r:number,y0:number,y1:number):Footprint=>({id,asm,x,z,r,y0,y1});
const box=(id:string,asm:AssemblyId,x:number,z:number,w:number,d:number,y0:number,y1:number):Footprint=>({id,asm,x,z,w,d,y0,y1});

export const footprints:Footprint[]=[
 // Case: four clear posts tie the tray to the lid.
 ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i)=>disc(`post-${i}`,'case',sx*119,sz*110,3.5,TRAY.floorTop,TRAY.lidInner)),

 // Platter. The bezel stands on posts so the belt can pass beneath it.
 disc('bearing','platter',PLATTER.x,PLATTER.z,9,B,15),
 disc('pulley','platter',PLATTER.x,PLATTER.z,PLATTER.pulley,15,19),
 disc('bezel','platter',PLATTER.x,PLATTER.z,PLATTER.bezel,20,27),
 disc('disc','platter',PLATTER.x,PLATTER.z,PLATTER.disc,24,28),
 disc('label','platter',PLATTER.x,PLATTER.z,PLATTER.label,28,28.6),
 disc('hub','platter',PLATTER.x,PLATTER.z,PLATTER.hub,28,33),
 disc('spindle','platter',PLATTER.x,PLATTER.z,PLATTER.spindle,28,37),
 box('head','platter',-58,2,12,7,20,27),

 disc('coil-bracket','coil',COIL.x,COIL.z,COIL.bracket,15,17),
 disc('coil-winding','coil',COIL.x,COIL.z,COIL.outer,17,18.4),
 disc('coil-lens','coil',COIL.x,COIL.z,COIL.inner,17,25),

 disc('rotor-mount','rotor',ROTOR.x,ROTOR.z,ROTOR.mount,B,14.5),
 disc('rotor-pulley','rotor',ROTOR.x,ROTOR.z,ROTOR.pulley,15,19),
 disc('rotor-disc','rotor',ROTOR.x,ROTOR.z,ROTOR.disc,20,23.5),

 ...KNOB_Z.map((z,i)=>disc(`knob-${i}`,'controls',KNOB_X,z,4.8,B,25)),
 disc('encoder','controls',72.8,5.4,6.5,B,25),
 disc('level','controls',30.4,-80.7,6,B,26),
 disc('jack','controls',47.6,-50.6,4.5,B,22),
 box('heatsink','controls',91.3,-53,10,45,B,26),
 box('button','controls',70,-93,9,8,B,22),
 box('button-driver','controls',70,-82.3,8,8,B,18),
 box('toggle','controls',103.2,-74.4,5,10,B,21),
 box('slot-switch','controls',72,24.8,5,11,B,17),

 box('cartridge','memory',-21.3,86.8,70.5,20.8,13,21),
 box('shield','memory',96.2,69.4,20,28,B,22),

 box('slot','board',-21.3,70,70.5,5,B,17),
 box('leds','board',-22,62.5,69,2,B,13),
 disc('cap-0','board',-31.7,-77.4,6,B,22),
 disc('cap-1','board',-31.7,-61.5,6,B,22),
 disc('cap-2','board',-31.7,-47.6,6,B,22),
 disc('cap-3','board',-102.6,-21.4,5.5,B,21),
 disc('cap-4','board',-86.7,-20.2,5.5,B,21),
 disc('pad-ring','board',-59.9,-16.9,5,B,14),
 box('chip-0','board',47.6,59.5,8,6,B,14),
 box('chip-1','board',60.5,59.5,8,6,B,14),
 box('chip-2','board',47.6,72.4,8,6,B,14),
 box('chip-3','board',58.5,88.3,11,11,B,14.5),
 box('chip-4','board',74.4,88.3,11,11,B,14.5),
 box('chip-5','board',45.6,87.3,5,9,B,14),
 box('sensor','board',60.5,72.4,6,6,B,16),
 disc('buzzer','board',98.8,100,5.5,B,17),
 disc('test-jack','board',23.8,104.5,2.5,B,16),
 ...[-76.4,-44.7,-19.8,23.8,39.7,84.3].map((x,i)=>box(`conn-${i}`,'board',x,-93.2,6,6,B,18)),
 disc('grommet-0','board',-107,-93.2,3.5,B,14),
 disc('grommet-1','board',107.2,-93.2,3.5,B,14),
 box('relay','board',-103.8,-58.5,5,10,B,19),
 box('regulator','board',-93,24.8,20,10,B,18),
 box('header','board',92,30.7,9,7,B,17),
];
export const at=(id:string)=>{const f=footprints.find(f=>f.id===id);if(!f)throw new Error(`Unknown part ${id}`);return f};
