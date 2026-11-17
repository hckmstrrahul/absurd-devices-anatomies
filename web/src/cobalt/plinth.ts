// The set Cobalt stands on: a block of dark brushed steel with one corner cut away, a satin brass block in the cut,
// and a blurred mirror on the steel's top face. The kit's own mirror floor only works at y = 0, so this one is local:
// a three.js Reflector cut to the top face, sampled through a wide blur, laid over the brushed metal. It follows the
// plinth when the Layers view stands the whole set on edge.
import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import type {Builder} from '../kit/builder';
import {PLINTH} from './layout';
import {satin} from './textures';

const TILE=38;                                              // millimetres of metal one texture tile covers
// UVs in millimetres of surface, so the brushing has the same scale on every face and runs along each face's length.
const surfaceUV={
 generateTopUV(_g:THREE.ExtrudeGeometry,v:number[],a:number,b:number,c:number){return [a,b,c].map(i=>new THREE.Vector2(v[i*3]/TILE,v[i*3+1]/TILE))},
 generateSideWallUV(_g:THREE.ExtrudeGeometry,v:number[],a:number,b:number,c:number,d:number){
  const alongX=Math.abs(v[a*3+1]-v[b*3+1])<Math.abs(v[a*3]-v[b*3]);
  return [a,b,c,d].map(i=>new THREE.Vector2((alongX?v[i*3]:v[i*3+1])/TILE,v[i*3+2]/TILE));
 },
};
// A block from a plan outline, top face at `top`, standing `height` tall, with a crisp chamfer on every edge.
function block(shape:THREE.Shape,top:number,height:number,bevel:number){
 const g=new THREE.ExtrudeGeometry(shape,{depth:height-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:4,UVGenerator:surfaceUV});
 g.rotateX(-Math.PI/2);g.translate(0,top-height+bevel,0);return g;
}
const outline=(pts:[number,number][])=>{const s=new THREE.Shape();pts.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();return s};

const mirrorShader={
 name:'PlinthMirror',
 uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},strength:{value:.5},texel:{value:new THREE.Vector2(1/768,1/768)},face:{value:new THREE.Vector3(0,1,0)}},
 vertexShader:/* glsl */`
  uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWorld;
  void main(){vUv=textureMatrix*vec4(position,1.0);vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:/* glsl */`
  uniform sampler2D tDiffuse;uniform float strength;uniform vec2 texel;uniform vec3 face;
  varying vec4 vUv;varying vec3 vWorld;
  void main(){
   vec2 uv=vUv.xy/vUv.w;vec4 sum=vec4(0.0);float total=0.0;
   // A wide tent blur, longer up the screen than across it: brushed metal smears a reflection across its grain.
   for(int x=-3;x<=3;x++)for(int y=-3;y<=3;y++){
    float w=(4.0-abs(float(x)))*(4.0-abs(float(y)));
    sum+=texture2D(tDiffuse,uv+vec2(float(x)*1.5,float(y)*2.3)*texel)*w;total+=w;
   }
   sum/=total;
   // Stronger at a glancing angle, as any polished surface is.
   vec3 toEye=normalize(cameraPosition-vWorld);float glance=pow(1.0-clamp(dot(toEye,face),0.0,1.0),2.0);
   gl_FragColor=vec4(sum.rgb/max(sum.a,0.001)*1.15,sum.a*strength*(0.62+0.38*glance));
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`,
};

export function buildPlinth(b:Builder,parent:THREE.Object3D){
 const {x0,x1,z0,z1,h,bevel,notch,brass}=PLINTH,asm='plinth',tex=<T extends THREE.Texture>(t:T)=>b.m.texture(t);
 const streaks=tex(satin(5)),brassStreaks=tex(satin(17));
 // Steel: dark, even satin. The brushing is too fine to see except as a highlight stretched across the grain.
 const steel=b.m.own(asm,new THREE.MeshPhysicalMaterial({color:0x2c3038,metalness:1,roughness:.44,roughnessMap:streaks,anisotropy:.5,anisotropyRotation:Math.PI/2}));
 const i=bevel,plan:[number,number][]=[[x0+i,z0+i],[x1-i,z0+i],[x1-i,notch.z-i],[notch.x-i,notch.z-i],[notch.x-i,z1-i],[x0+i,z1-i]];
 const body=b.put(parent,asm,block(outline(plan),0,h,bevel),steel);
 // Brass: satin, standing lower in the cut and a little proud of the steel's faces.
 const gold=b.m.own(asm,new THREE.MeshPhysicalMaterial({color:0x9a7430,metalness:1,roughness:.46,roughnessMap:brassStreaks,anisotropy:.5,anisotropyRotation:Math.PI/2}));
 const bx0=notch.x+brass.gap+i,bz0=notch.z+brass.gap+i,bx1=x1+brass.out-i,bz1=z1+brass.out-i;
 b.put(parent,asm,block(outline([[bx0,bz0],[bx1,bz0],[bx1,bz1],[bx0,bz1]]),-brass.drop,h-brass.drop,bevel),gold);

 // The mirror, cut to the steel's top face and laid a hair above it.
 const m=bevel+.15,face=new THREE.ShapeGeometry(outline([[x0+m,z0+m],[x1-m,z0+m],[x1-m,notch.z-m],[notch.x-m,notch.z-m],[notch.x-m,z1-m],[x0+m,z1-m]]));
 const size=768,mirror=new Reflector(face,{textureWidth:size,textureHeight:size,clipBias:.003,shader:mirrorShader,multisample:0});
 mirror.rotation.x=-Math.PI/2;mirror.position.y=.08;mirror.renderOrder=2;
 const material=mirror.material as THREE.ShaderMaterial;material.transparent=true;material.depthWrite=false;material.uniforms.texel.value.set(1/size,1/size);
 const render=mirror.onBeforeRender;let frame=0;const seen=new THREE.Matrix4();
 mirror.onBeforeRender=function(renderer,scene,camera,...rest){
  // Depth and normal passes draw with an override material; they must not repaint the mirror.
  if((scene as THREE.Scene).overrideMaterial||material.uniforms.strength.value<=.001)return;
  // The mirror costs a second scene render, so a still camera refreshes it on alternate frames.
  const moved=!seen.equals(camera.matrixWorld);seen.copy(camera.matrixWorld);
  if(frame++%2&&!moved)return;
  // Mirror the device only: no backdrop, no floor, nothing of the plinth itself.
  const s=scene as THREE.Scene,background=s.background,alpha=renderer.getClearAlpha(),hide=s.children.filter(o=>o!==b.root&&(o as THREE.Mesh).isMesh&&o.visible);
  s.background=null;renderer.setClearAlpha(0);hide.forEach(o=>{o.visible=false});b.groups.plinth.visible=false;
  render.call(this,renderer,scene,camera,...rest);
  s.background=background;renderer.setClearAlpha(alpha);hide.forEach(o=>{o.visible=true});b.groups.plinth.visible=true;
 };
 parent.add(mirror);
 return {
  steel,body,
  // `level` 0..1; the mirror follows the steel when another assembly is in focus.
  setMirror(level:number){material.uniforms.strength.value=level*(steel.opacity<.99?0:1);(material.uniforms.face.value as THREE.Vector3).set(0,0,1).transformDirection(mirror.matrixWorld)},
  dispose(){mirror.dispose()},
 };
}
