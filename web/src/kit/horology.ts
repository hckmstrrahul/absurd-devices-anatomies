import * as THREE from 'three';
import type {V3} from './types';

// Gear geometry for clock movements. Shapes lie in the XY plane with the arbor along Z, which suits a clock facing +Z;
// rotate the geometry (or its parent) for anything else. A tooth is centred on local angle 0.
// Teeth are true involutes at a 20° pressure angle. Clockmakers traditionally cut cycloidal teeth, but the involute
// meshes correctly at the stated centre distance, which is what matters here.

export type WheelSpec={
 module:number;        // pitch diameter / teeth, mm
 teeth:number;
 pressure?:number;     // radians, default 20°
 bore?:number;         // arbor hole radius, mm
 crossings?:number;    // number of spokes; leave out for a solid wheel
 hub?:number;          // hub radius, mm (needed with crossings)
 rim?:number;          // radial depth of the rim below the tooth roots, mm
 spoke?:number;        // spoke width, mm
};
export const pitchRadius=(module:number,teeth:number)=>module*teeth/2;
export const tipRadius=(module:number,teeth:number)=>module*(teeth/2+1);
export const rootRadius=(module:number,teeth:number)=>module*(teeth/2-1.25);
// Distance between the arbors of two meshing gears of the same module.
export const centreDistance=(module:number,a:number,b:number)=>module*(a+b)/2;
// Overall ratio of a train given [driver, driven] tooth counts per mesh: turns of the last per turn of the first.
export const trainRatio=(pairs:[number,number][])=>pairs.reduce((r,[driver,driven])=>r*driver/driven,1);

const inv=(a:number)=>Math.tan(a)-a;
// Outline of an involute gear as [x, y] points, anticlockwise.
export function wheelOutline({module:m,teeth:z,pressure=Math.PI/9}:WheelSpec,flankSteps=6){
 const r=pitchRadius(m,z),rb=r*Math.cos(pressure),rf=Math.max(rootRadius(m,z),m*.4),pitch=Math.PI*2/z;
 // Half the tooth's angular thickness at radius rho (it is a quarter pitch at the pitch circle).
 const half=(rho:number)=>pitch/4+inv(pressure)-inv(Math.acos(Math.min(1,rb/rho)));
 // Small pinions come to a point before the full addendum; stop where the tooth is still a little wide.
 let ra=tipRadius(m,z);while(half(ra)<.04*pitch&&ra>r)ra-=m*.02;
 const start=Math.max(rb,rf),points:[number,number][]=[];
 const at=(rho:number,angle:number)=>points.push([Math.cos(angle)*rho,Math.sin(angle)*rho]);
 for(let i=0;i<z;i++){
  const c=i*pitch;
  if(rf<start)at(rf,c-half(start));
  for(let k=0;k<=flankSteps;k++){const rho=start+(ra-start)*k/flankSteps;at(rho,c-half(rho))}
  for(let k=flankSteps;k>=0;k--){const rho=start+(ra-start)*k/flankSteps;at(rho,c+half(rho))}
  if(rf<start)at(rf,c+half(start));
  // Root land, as a short arc toward the next tooth.
  const from=c+half(start),to=c+pitch-half(start);for(let k=1;k<3;k++)at(rf,from+(to-from)*k/3);
 }
 return {points,pitch:r,tip:ra,root:rf,base:rb};
}
function addBore(shape:THREE.Shape,bore?:number){
 if(bore){const hole=new THREE.Path();hole.absarc(0,0,bore,0,Math.PI*2,true);shape.holes.push(hole)}
}
// Windows between spokes, cut between a hub and a rim, with parallel-sided spokes.
function addCrossings(shape:THREE.Shape,count:number,inner:number,outer:number,spoke:number){
 const step=Math.PI*2/count,gap=(r:number)=>Math.asin(Math.min(.95,spoke/2/r));
 if(outer-inner<spoke)return;
 for(let i=0;i<count;i++){
  const a0=i*step,a1=a0+step,hole=new THREE.Path();
  hole.absarc(0,0,outer,a0+gap(outer),a1-gap(outer),false);
  hole.absarc(0,0,inner,a1-gap(inner),a0+gap(inner),true);
  hole.closePath();shape.holes.push(hole);
 }
}
export function wheelShape(spec:WheelSpec){
 const {points,root}=wheelOutline(spec),shape=new THREE.Shape();
 points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 addBore(shape,spec.bore);
 if(spec.crossings){
  const hub=spec.hub??Math.max((spec.bore??0)*2.2,root*.2),rim=spec.rim??spec.module*1.6;
  addCrossings(shape,spec.crossings,hub,root-rim,spec.spoke??spec.module*1.5);
 }
 return shape;
}
// A plain disc with a bore and optional crossings: barrels, balance rims, bridges.
export function discShape(radius:number,opts:{bore?:number;crossings?:number;hub?:number;rim?:number;spoke?:number}={}){
 const shape=new THREE.Shape();shape.absarc(0,0,radius,0,Math.PI*2,false);addBore(shape,opts.bore);
 if(opts.crossings)addCrossings(shape,opts.crossings,opts.hub??radius*.22,radius-(opts.rim??radius*.14),opts.spoke??radius*.1);
 return shape;
}
// Club-tooth escape wheel: teeth lean forward (anticlockwise) with an undercut back.
export function escapeWheelShape(teeth:number,radius:number,opts:{bore?:number;crossings?:number;hub?:number}={}){
 const shape=new THREE.Shape(),pitch=Math.PI*2/teeth,root=radius*.74;
 for(let i=0;i<teeth;i++)[[root,0],[radius*.965,.5],[radius,.58],[radius,.68],[radius*.9,.66],[root,.6]].forEach(([r,f],k)=>{
  const a=(i+f)*pitch,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0&&k===0)shape.moveTo(x,y);else shape.lineTo(x,y);
 });
 shape.closePath();addBore(shape,opts.bore);
 if(opts.crossings)addCrossings(shape,opts.crossings,opts.hub??radius*.2,root-radius*.08,radius*.09);
 return shape;
}
// Ratchet wheel for a mainspring click: saw teeth leaning one way.
export function ratchetShape(teeth:number,radius:number,bore?:number){
 const shape=new THREE.Shape(),pitch=Math.PI*2/teeth,root=radius*.84;
 for(let i=0;i<teeth;i++)[[root,0],[radius,.86],[root,1]].slice(0,2).forEach(([r,f],k)=>{
  const a=(i+f)*pitch,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0&&k===0)shape.moveTo(x,y);else shape.lineTo(x,y);
 });
 shape.closePath();addBore(shape,bore);return shape;
}
// Extrude any of the shapes above to a thickness, centred on z = 0, with a fine chamfer that keeps the outline size.
export function extrudeFlat(shape:THREE.Shape,thickness:number,chamfer=Math.min(.15,thickness*.2),curveSegments=24){
 const g=new THREE.ExtrudeGeometry(shape,{depth:thickness-chamfer*2,bevelEnabled:chamfer>0,bevelThickness:chamfer,bevelSize:chamfer,bevelOffset:-chamfer,bevelSegments:1,curveSegments});
 g.translate(0,0,-thickness/2+chamfer);return g;
}
export const wheelGeometry=(spec:WheelSpec,thickness:number)=>extrudeFlat(wheelShape(spec),thickness);

// Rotation of a driven gear so its teeth interlock with a driver.
// `theta1` is the driver's rotation, `phi` the direction from the driver's arbor to the driven one's (both radians, in the gears' plane).
export function meshed(theta1:number,z1:number,z2:number,phi:number){
 return phi+Math.PI-Math.PI/z2-(theta1-phi)*z1/z2;
}
// Flat spiral for a hairspring or mainspring, as points for the builder's `wire`.
// `wind` (radians) tightens or loosens the coil about its centre, for a breathing balance spring.
export function spiral(turns:number,inner:number,outer:number,z=0,wind=0,steps=48):V3[]{
 const n=Math.ceil(turns*steps),points:V3[]=[];
 // The outer end is the fixed stud at angle 0; winding turns the inner end.
 for(let i=0;i<=n;i++){const t=i/n,a=(turns*Math.PI*2+wind)*t,r=outer+(inner-outer)*t;points.push([Math.cos(a)*r,Math.sin(a)*r,z])}
 return points;
}
