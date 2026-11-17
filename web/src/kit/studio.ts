import * as THREE from 'three';

// A product-photography room for polished metal: mid-grey walls, a few bright softboxes and black flags.
// Chrome only looks like chrome when it has both light and dark to mirror; an evenly lit room turns it pale.
export function studioRoom(){
 const scene=new THREE.Scene();
 const panel=(w:number,h:number,level:number,at:[number,number,number],turn:[number,number,number]=[0,0,0])=>{
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setScalar(level),side:THREE.DoubleSide}));
  mesh.position.set(...at);mesh.rotation.set(...turn);scene.add(mesh);return mesh;
 };
 const H=Math.PI/2;
 // Shell: pale floor, dim ceiling, grey walls.
 panel(40,40,.62,[0,-10,0],[-H,0,0]);panel(40,40,.2,[0,10,0],[H,0,0]);
 panel(40,20,.34,[0,0,-20]);panel(40,20,.3,[0,0,20],[0,Math.PI,0]);
 panel(40,20,.26,[-20,0,0],[0,H,0]);panel(40,20,.26,[20,0,0],[0,-H,0]);
 // Softboxes: a broad overhead, a tall key behind the camera to the left, a strip to the right, a low rim behind.
 panel(16,12,5.5,[0,9.9,2],[H,0,0]);
 panel(7,13,6,[-9,1,19.8],[0,Math.PI,0]);
 panel(3,14,4.5,[11,0,19.7],[0,Math.PI,0]);
 panel(5,12,3.2,[19.8,1,4],[0,-H,0]);
 panel(4,12,2.4,[-19.8,1,-3],[0,H,0]);
 panel(18,3,1.6,[0,-4,-19.8]);
 // Flags: black cards that put dark bands into the reflections.
 panel(2.4,18,.015,[-2.5,0,19.6],[0,Math.PI,0]);panel(3,18,.015,[5.5,0,19.6],[0,Math.PI,0]);
 panel(6,18,.02,[-19.6,0,8],[0,H,0]);panel(6,18,.02,[19.6,0,-6],[0,-H,0]);
 panel(40,2.2,.02,[0,-7.5,19.5],[0,Math.PI,0]);
 const dispose=()=>scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();(m.material as THREE.Material).dispose()}});
 return {scene,dispose};
}
