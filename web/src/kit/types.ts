import type {Builder} from './builder';
import type {Paint} from './backdrop';

export type V3=[number,number,number];
// `move` is the explosion path in mm; `order` staggers it, 0 first.
// `layer` is where the assembly floats in a `layers:true` view, in mm from its assembled place: a modest rise plus a sideways slide, so the device's own
// assemblies hang as staggered, partly overlapping planes. Leave it out for an assembly that stays put.
export type Assembly={id:string;name:string;note:string;move:V3;order:number;layer?:V3};
// `dir` points from the target toward the camera. Straight down is [0,1,.0015], which keeps −Z at the top of the screen.
// `zoom` scales the camera distance for this view: below 1 moves in for a close-up (0.45 roughly fills a landscape viewport with a portrait board's width).
// `lens` is the field of view in degrees (default 22); 4 to 6 is close to an isometric drawing, with parallel edges staying parallel.
// `layers` marks a presentation view: each assembly eases to its `layer` offset while it is active, and `update` receives `view.layers` easing 0..1. Nothing may be added in this view: it only rearranges what the device already has.
// `backdrop` replaces the theme backdrop while the view is active (the scene is then lit as in the light theme); `light` scales the key and environment light.
// `upright` stands the whole device on its lower edge facing the camera side (+Z), like a board held up for a product shot: the value is the height in mm
// of the device's centre above the floor once stood up (half its depth plus a margin). Assembly offsets and explosion then run toward the viewer.
export type ViewDef={id:string;label:string;dir:V3;zoom?:number;lens?:number;layers?:boolean;upright?:number;backdrop?:Paint;light?:{key?:number;environment?:number}};
export type Input=
 |{kind:'segment';id:string;label:string;options:{id:string;label:string}[]}
 |{kind:'slider';id:string;label:string;min:number;max:number;step:number;format:(value:number)=>string};
export type Values=Record<string,number|string>;
// A readout is a number (`value`) or a 0..1 bar (`meter`).
export type Readout={label:string;value?:string;meter?:number};
// `view` tells the device how far the explosion has eased (0..1) and which theme is showing, for effects that should follow them.
// `layers` eases 0..1 while a view with `layers:true` is active; `view` is the active view's id.
export type ViewState={separation:number;dark:boolean;layers:number;view:string};
export type Built<P>={update(pose:P,view:ViewState):void;anchors:Record<string,V3>};

export type DeviceDef<S,P>={
 slug:string;title:string;
 size:string;                 // caption, e.g. "260 × 242 × 46 mm"
 reference:string;            // image shown if WebGL is unavailable
 assemblies:Assembly[];
 shell?:string;               // assembly that encloses the rest; clicks prefer what is inside it
 views:ViewDef[];             // the first is the default
 frame:{
  radius:number;              // half-extent of the assembled device, mm
  target:V3;                  // point the camera looks at when assembled
  explodeScale:number;        // extra camera distance at full separation, as a fraction
  explodeLift:number;         // how far the target rises at full separation, mm
  shadow?:[number,number];    // contact-shadow size on the floor, mm
  environment?:'room'|'studio'; // 'studio' adds softboxes and black flags, for devices that are mostly polished metal
  envRotation?:V3;            // tilt of the environment
  shadowStrength?:number;     // darkness of the cast floor shadow, default .12
  // `spot` turns the key from a parallel light into a lamp at a finite distance, so light falls off across the device:
  // `distance` in radii from the target (default 3.05; nearer means stronger falloff), cone `angle` in degrees (default 26),
  // `penumbra` 0..1 (default .6), and an optional `cookie` texture projected through the lamp (blinds, streaks, a window).
  // `intensity` still means the strength at the target. `shadowSize` is the shadow map size; a smaller map gives softer shadows.
  key?:{dir?:V3;intensity?:number;environment?:number;shadowSize?:number;spot?:{distance?:number;angle?:number;penumbra?:number;cookie?:()=>import('three').Texture}}; // key light: direction from the target toward the light, its strength (default 2.3), and the strength of the environment light (default 1)
  reflection?:number;         // 0..1 strength of a glossy mirror floor; leave out for a matte floor
  bloom?:{strength:number;radius:number;threshold:number}; // glow around emitters only; reflected light is held under the threshold
  // Soft contact shading in creases and under parts (screen-space ambient occlusion). `radius` in mm, about 2–4% of the device radius; `intensity` 0..1 (default 1).
  ao?:{radius:number;intensity?:number;views?:string[]}; // `views` limits it to those view ids (it costs frame rate)
  exposure?:number;
 };
 // Each theme takes a flat colour or a studio sweep `{top, mid, bottom, horizon?, vignette?}`.
 backdrop?:{light:Paint;dark:Paint};
 inputs:Input[];defaults:Values;
 // The motion model. `step` advances state; `pose` turns it into everything the scene and readouts show.
 sim:{start:S;step(state:S,dt:number,playing:boolean,values:Values):S;pose(state:S,values:Values):P};
 // Optional keyboard control while in Play mode (arrow keys and letters the page does not use).
 // Return the same state object for a key you do not handle, so the browser keeps it.
 control?(state:S,key:string,down:boolean):S;
 readouts(pose:P):Readout[];
 build(b:Builder):Built<P>;
};
