import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// A glossy studio floor: a planar mirror, blurred a little, fading out with distance from the device.
// Only what stands on the floor is mirrored; the backdrop is left out so the sweep shows through.
const shader={
 name:'GlossFloor',
 uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},strength:{value:.3},radius:{value:300},centre:{value:new THREE.Vector2()},texel:{value:new THREE.Vector2(1/512,1/512)}},
 vertexShader:/* glsl */`
  uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;
  void main(){vUv=textureMatrix*vec4(position,1.0);vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;uniform float strength;uniform float radius;uniform vec2 centre;uniform vec2 texel;
  varying vec4 vUv;varying vec3 vWorld;
  void main(){
   vec2 uv=vUv.xy/vUv.w;float reach=length(vWorld.xz-centre)/radius;
   // Blur grows away from the device, as it does on a satin floor.
   vec2 step=texel*(.8+3.5*reach);vec4 sum=vec4(0.0);
   for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++)sum+=texture2D(tDiffuse,uv+vec2(float(x),float(y))*step);
   sum/=25.0;
   float fade=1.0-smoothstep(0.25,1.0,reach);
   gl_FragColor=vec4(sum.rgb/max(sum.a,0.001),sum.a*strength*fade);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`,
};

export function glossFloor(renderer:THREE.WebGLRenderer,radius:number,centre:[number,number],hide:THREE.Object3D[]){
 const size=1024;
 const mirror=new Reflector(new THREE.PlaneGeometry(radius*8,radius*8),{textureWidth:size,textureHeight:size,clipBias:.003,shader,multisample:4});
 mirror.rotation.x=-Math.PI/2;mirror.position.set(centre[0],.02,centre[1]);
 const material=mirror.material as THREE.ShaderMaterial;material.transparent=true;material.depthWrite=false;
 material.uniforms.radius.value=radius*2.6;material.uniforms.centre.value.set(centre[0],centre[1]);material.uniforms.texel.value.set(1/size,1/size);
 const render=mirror.onBeforeRender;
 let frame=0;const seen=new THREE.Matrix4();
 mirror.onBeforeRender=function(r,scene,camera,...rest){
  // The mirror costs a second scene render, so a still camera refreshes it on alternate frames.
  // A moving camera refreshes it every frame: a reflection one frame behind the object above it visibly judders.
  const moved=!seen.equals(camera.matrixWorld);seen.copy(camera.matrixWorld);
  if(frame++%2&&!moved)return;
  // Mirror the objects only: no backdrop, no floor shadows, cleared to transparent.
  const background=scene.background,alpha=renderer.getClearAlpha(),shown=hide.map(o=>o.visible);
  scene.background=null;renderer.setClearAlpha(0);hide.forEach(o=>{o.visible=false});
  render.call(this,r,scene,camera,...rest);
  scene.background=background;renderer.setClearAlpha(alpha);hide.forEach((o,i)=>{o.visible=shown[i]});
 };
 return {mirror,setStrength(value:number){material.uniforms.strength.value=value},dispose(){mirror.dispose();mirror.geometry.dispose()}};
}
