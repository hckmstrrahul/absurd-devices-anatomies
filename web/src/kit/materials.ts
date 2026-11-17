import * as THREE from 'three';

export type Kind='acrylic'|'lens'|'frost'|'white'|'black'|'rubber'|'chip'|'slate'|'chrome'|'steel'|'darksteel'|'gloss'|'belt'|'aluminium'|'copper'|'gold'|'blue'|'navy'|'orange'|'wireOrange'|'wireBlue'|'wireGrey'|'tick'|'glass'|'brass'|'crystal';


const recipes:Record<Kind,()=>THREE.Material>={
 // Zero roughness and thickness keep the view through the lid sharp; the reflections still read as acrylic.
 acrylic:()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0,transmission:1,thickness:0,ior:1.47,envMapIntensity:.55,depthWrite:false}),
 lens:()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.03,transparent:true,opacity:.24,envMapIntensity:1.6,clearcoat:1,depthWrite:false}),
 frost:()=>new THREE.MeshPhysicalMaterial({color:0xf3f5f7,roughness:.6,transparent:true,opacity:.86,envMapIntensity:.7}),
 white:()=>new THREE.MeshPhysicalMaterial({color:0xf2f3f4,roughness:.36,clearcoat:.35,clearcoatRoughness:.3,envMapIntensity:.75}),
 black:()=>new THREE.MeshStandardMaterial({color:0x16181b,roughness:.42,envMapIntensity:.9}),
 rubber:()=>new THREE.MeshStandardMaterial({color:0x1d1f22,roughness:.9}),
 chip:()=>new THREE.MeshStandardMaterial({color:0x1b1d21,roughness:.34,envMapIntensity:.8}),
 slate:()=>new THREE.MeshStandardMaterial({color:0x646c75,roughness:.55,metalness:.2}),
 chrome:()=>new THREE.MeshStandardMaterial({color:0xffffff,roughness:.1,metalness:1}),
 steel:()=>new THREE.MeshStandardMaterial({color:0xd4d8dc,roughness:.34,metalness:1}),
 darksteel:()=>new THREE.MeshStandardMaterial({color:0x3d4249,roughness:.26,metalness:1}),
 gloss:()=>new THREE.MeshPhysicalMaterial({color:0x121417,roughness:.22,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.1}),
 belt:()=>new THREE.MeshStandardMaterial({color:0x8d939b,roughness:.8}),
 aluminium:()=>new THREE.MeshStandardMaterial({color:0xdfe2e5,roughness:.46,metalness:.9}),
 copper:()=>new THREE.MeshStandardMaterial({color:0xdf8a45,roughness:.27,metalness:1,emissive:0xff6a14,emissiveIntensity:0}),
 gold:()=>new THREE.MeshStandardMaterial({color:0xdcb45c,roughness:.3,metalness:1}),
 blue:()=>new THREE.MeshPhysicalMaterial({color:0x38b6f2,roughness:.14,transparent:true,opacity:.78,clearcoat:1,envMapIntensity:1.2}),
 navy:()=>new THREE.MeshStandardMaterial({color:0x2a6f9f,roughness:.4}),
 orange:()=>new THREE.MeshStandardMaterial({color:0xf2691c,roughness:.38,emissive:0xff5a10,emissiveIntensity:.05}),
 wireOrange:()=>new THREE.MeshStandardMaterial({color:0xef7a3d,roughness:.5}),
 wireBlue:()=>new THREE.MeshStandardMaterial({color:0x3f95dc,roughness:.5}),
 wireGrey:()=>new THREE.MeshStandardMaterial({color:0x3a3f46,roughness:.5}),
 tick:()=>new THREE.MeshStandardMaterial({color:0xb9bfc6,roughness:.6}),
 // Blown or moulded glass: the same clear pass-through as acrylic, with stronger reflections.
 glass:()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0,transmission:1,thickness:0,ior:1.5,envMapIntensity:1,depthWrite:false}),
 // Thick glass. Put it on a closed solid with real wall thickness and set `thickness` near that wall (mm):
 // the view bends at rims and curved edges, and bright softboxes sparkle along them. Round or bevel the edges, or there is nothing to catch the light.
 // Dispersion is left off because it blurs everything seen through a flat pane; add a little on a clone for small curved pieces.
 crystal:()=>new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0,transmission:1,thickness:4,ior:1.5,attenuationColor:0xd3e7ee,attenuationDistance:160,envMapIntensity:1,specularIntensity:1,side:THREE.DoubleSide,depthWrite:false}),
 brass:()=>new THREE.MeshStandardMaterial({color:0xc9a04e,roughness:.24,metalness:1}),
};

type Saved={transparent:boolean;opacity:number;depthWrite:boolean;transmission?:number};
export type Materials=ReturnType<typeof makeMaterials>;
export function makeMaterials(){
 // Kinds cover common finishes. For anything else, build a three.js material and pass it through `own`.
 const cache=new Map<string,THREE.Material>();
 const owners=new Map<THREE.Material,string>();
 const saved=new Map<THREE.Material,Saved>();
 const textures:THREE.Texture[]=[];
 let transmission=true,focus:string|null=null;
 // A material registered here follows its assembly when another one is in focus.
 function own<T extends THREE.Material>(asm:string,material:T){
  owners.set(material,asm);
  saved.set(material,{transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite,transmission:(material as unknown as THREE.MeshPhysicalMaterial).transmission});
  return material;
 }
 function mat(asm:string,kind:Kind){
  const key=asm+':'+kind;let m=cache.get(key);
  if(!m){m=own(asm,recipes[kind]());cache.set(key,m)}
  return m;
 }
 function apply(){
  for(const [m,asm] of owners){
   const base=saved.get(m)!;const ghost=focus!==null&&asm!==focus;const physical=m as THREE.MeshPhysicalMaterial;
   const glass=(base.transmission??0)>0;
   if(glass)physical.transmission=ghost||!transmission?0:base.transmission!;
   const plainGlass=glass&&!transmission;
   m.transparent=ghost||plainGlass||base.transparent;
   m.opacity=ghost?(glass?.05:base.opacity*.1):plainGlass?.16:base.opacity;
   m.depthWrite=ghost||plainGlass?false:base.depthWrite;
   m.needsUpdate=true;
  }
 }
 return {
  mat,own,
  texture(t:THREE.Texture){textures.push(t);return t},
  setFocus(id:string|null){if(id!==focus){focus=id;apply()}},
  setTransmission(on:boolean){if(on!==transmission){transmission=on;apply()}},
  dispose(){owners.forEach((_,m)=>m.dispose());textures.forEach(t=>t.dispose())},
 };
}

