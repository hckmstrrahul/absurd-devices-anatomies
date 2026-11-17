import * as THREE from 'three';
import type {Assembly,V3} from './types';
import type {Kind,Materials} from './materials';

export type Mover={node:THREE.Object3D;base:THREE.Vector3;lift:THREE.Vector3;asm:string};
export type Builder=ReturnType<typeof makeBuilder>;

// ── Plan shapes. A shape's +y maps to world −Z once it is extruded with `slab`. ──
export function chamferPath<T extends THREE.Path>(path:T,w:number,d:number,c:number){
 const x=w/2,z=d/2;
 path.moveTo(-x+c,-z);path.lineTo(x-c,-z);path.lineTo(x,-z+c);path.lineTo(x,z-c);path.lineTo(x-c,z);path.lineTo(-x+c,z);path.lineTo(-x,z-c);path.lineTo(-x,-z+c);path.closePath();return path;
}
export function roundPath<T extends THREE.Path>(path:T,w:number,d:number,r:number){
 const x=w/2,z=d/2;
 path.moveTo(-x+r,-z);path.lineTo(x-r,-z);path.absarc(x-r,-z+r,r,-Math.PI/2,0,false);path.lineTo(x,z-r);path.absarc(x-r,z-r,r,0,Math.PI/2,false);
 path.lineTo(-x+r,z);path.absarc(-x+r,z-r,r,Math.PI/2,Math.PI,false);path.lineTo(-x,-z+r);path.absarc(-x+r,-z+r,r,Math.PI,Math.PI*1.5,false);path.closePath();return path;
}
// Chamfered and rounded rectangles, solid or as a wall of the given thickness.
export const plate=(w:number,d:number,c:number)=>chamferPath(new THREE.Shape(),w,d,c);
export const roundPlate=(w:number,d:number,r:number)=>roundPath(new THREE.Shape(),w,d,r);
export function frame(w:number,d:number,c:number,wall:number){
 const s=plate(w,d,c);s.holes.push(chamferPath(new THREE.Path(),w-wall*2,d-wall*2,Math.max(1,c-wall*.6)));return s;
}
export function roundFrame(w:number,d:number,r:number,wall:number){
 const s=roundPlate(w,d,r);s.holes.push(roundPath(new THREE.Path(),w-wall*2,d-wall*2,Math.max(.5,r-wall)));return s;
}
export function annulus(inner:number,outer:number){
 const s=new THREE.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);return s;
}
export function arc(inner:number,outer:number,from:number,to:number){
 const s=new THREE.Shape();s.absarc(0,0,outer,from,to,false);s.absarc(0,0,inner,to,from,true);s.closePath();return s;
}
export function gear(root:number,tip:number,teeth:number){
 const s=new THREE.Shape(),pitch=Math.PI*2/teeth;
 for(let i=0;i<teeth;i++)[[root,0],[tip,.22],[tip,.5],[root,.72]].forEach(([r,f],k)=>{const a=(i+f)*pitch,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0&&k===0)s.moveTo(x,y);else s.lineTo(x,y)});
 s.closePath();return s;
}
// Extrude a plan shape upward between two heights.
export function slab(shape:THREE.Shape,y0:number,y1:number,segments=32){
 const g=new THREE.ExtrudeGeometry(shape,{depth:y1-y0,bevelEnabled:false,curveSegments:segments});
 g.rotateX(-Math.PI/2);g.translate(0,y0,0);return g;
}
// Revolve a profile of [radius, height] points about the Y axis. List the points anticlockwise (bottom centre, out, up, back to the top centre) so faces point outward.
export const lathe=(profile:[number,number][],segments=64)=>new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),segments);

export function makeBuilder(m:Materials,assemblies:Assembly[]){
 const root=new THREE.Group();
 const groups=Object.fromEntries(assemblies.map(a=>[a.id,new THREE.Group()])) as Record<string,THREE.Group>;
 for(const a of assemblies){groups[a.id].name=a.id;root.add(groups[a.id])}
 const movers:Mover[]=[];let count=0;

 // A layer is a node inside an assembly. `lift` is its own extra explosion path on top of the assembly's `move`;
 // `base` is where its origin sits, which is also the pivot if you rotate the node in `update`.
 function layer(asm:string,lift:V3=[0,0,0],base:V3=[0,0,0]){
  if(!groups[asm])throw new Error(`Unknown assembly ${asm}`);
  const node=new THREE.Group();node.position.set(...base);groups[asm].add(node);
  movers.push({node,base:new THREE.Vector3(...base),lift:new THREE.Vector3(...lift),asm});return node;
 }
 // A plain pivot inside a layer (or another pivot), for parts that turn about their own point.
 function pivot(parent:THREE.Object3D,at:V3=[0,0,0]){const node=new THREE.Group();node.position.set(...at);parent.add(node);return node}
 function put(parent:THREE.Object3D,asm:string,geometry:THREE.BufferGeometry,material:Kind|THREE.Material,shadow=true){
  const mesh=new THREE.Mesh(geometry,typeof material==='string'?m.mat(asm,material):material);
  mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.userData.asm=asm;parent.add(mesh);count++;return mesh;
 }
 // Box centred on (x, z), spanning heights y0..y1. Coordinates are relative to `parent`.
 function box(parent:THREE.Object3D,asm:string,kind:Kind|THREE.Material,x:number,z:number,w:number,d:number,y0:number,y1:number){
  const mesh=put(parent,asm,new THREE.BoxGeometry(w,y1-y0,d),kind);mesh.position.set(x,(y0+y1)/2,z);return mesh;
 }
 // Upright cylinder centred on (x, z), spanning heights y0..y1.
 function cyl(parent:THREE.Object3D,asm:string,kind:Kind|THREE.Material,x:number,z:number,r:number,y0:number,y1:number,segments=40){
  const mesh=put(parent,asm,new THREE.CylinderGeometry(r,r,y1-y0,segments),kind);mesh.position.set(x,(y0+y1)/2,z);return mesh;
 }
 function ball(parent:THREE.Object3D,asm:string,kind:Kind|THREE.Material,at:V3,r:number,segments=40){
  const mesh=put(parent,asm,new THREE.SphereGeometry(r,segments,Math.round(segments*.6)),kind);mesh.position.set(...at);return mesh;
 }
 // Ring lying flat (axis along Y) unless you rotate the returned mesh.
 function torus(parent:THREE.Object3D,asm:string,kind:Kind|THREE.Material,at:V3,r:number,tube:number,segments=64){
  const mesh=put(parent,asm,new THREE.TorusGeometry(r,tube,12,segments),kind);mesh.rotation.x=Math.PI/2;mesh.position.set(...at);return mesh;
 }
 // Round tube through the given points: wires, rods, handles. `closed` joins the ends.
 function wire(parent:THREE.Object3D,asm:string,kind:Kind|THREE.Material,points:V3[],r=.55,closed=false){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);
  return put(parent,asm,new THREE.TubeGeometry(curve,points.length*12,r,r>1.5?12:6,closed),kind);
 }
 function screw(parent:THREE.Object3D,asm:string,x:number,z:number,y:number,r=1.6,shadow=true){
  cyl(parent,asm,'chrome',x,z,r,y,y+.9,20).castShadow=shadow;box(parent,asm,'darksteel',x,z,r*1.4,.3,y+.75,y+.95).castShadow=shadow;
 }
 // Add an InstancedMesh or other object you built yourself; `parts` is how many solids it represents.
 function adopt(parent:THREE.Object3D,asm:string,object:THREE.Object3D,parts=1){
  object.userData.asm=asm;object.castShadow=true;object.receiveShadow=true;parent.add(object);count+=parts;return object;
 }
 return {m,root,groups,movers,layer,pivot,put,box,cyl,ball,torus,wire,screw,adopt,get count(){return count}};
}
