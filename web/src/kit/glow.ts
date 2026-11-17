import * as THREE from 'three';

// Keep the glow pass for things that emit light. Reflected light on every lit material is held just under the
// bloom threshold, so a highlight on polished metal can never flare; emissive light is added back on top untouched.
// Without this, small specular hot spots cross the threshold for a frame at a time as the camera moves and flash.
export function emittersOnly(root:THREE.Object3D,cap:number){
 const limit=cap.toFixed(3),seen=new Set<THREE.Material>();
 const chunk=`{vec3 litOnly=outgoingLight-totalEmissiveRadiance;float litPeak=max(litOnly.r,max(litOnly.g,litOnly.b));if(litPeak>${limit})litOnly*=${limit}/litPeak;outgoingLight=litOnly+totalEmissiveRadiance;}\n#include <opaque_fragment>`;
 root.traverse(o=>{
  const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
  for(const material of [mesh.material].flat()){
   const m=material as THREE.MeshPhysicalMaterial;
   // Clear glass passes on whatever glows behind it, so it is left alone.
   if(!m.isMeshStandardMaterial||seen.has(m)||(m.transmission??0)>0)continue;
   seen.add(m);
   const before=m.onBeforeCompile,key=m.customProgramCacheKey();
   m.onBeforeCompile=(shader,renderer)=>{before.call(m,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',chunk)};
   m.customProgramCacheKey=()=>`${key}|lit<${limit}`;m.needsUpdate=true;
  }
 });
}
