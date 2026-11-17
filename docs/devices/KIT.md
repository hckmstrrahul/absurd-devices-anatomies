# Building a 3D device page

Each device is one folder, `web/src/<slug>/`, built on the shared kit in `web/src/kit/`. Orbit Deck (`web/src/orbit/`) is the worked example: read it before starting.

## Files a device owns

| File | Job |
| --- | --- |
| `model.ts` | The motion model. Real units (mm, seconds, degrees or radians). One state, advanced by `step`, turned into a `pose` that drives every moving part and every readout. No three.js. |
| `layout.ts` | Positions and sizes traced from the reference image, in mm, with the pixel-to-mm mapping written down. No three.js. Optional if `parts.ts` stays readable without it. |
| `model.test.ts` | Vitest tests for the model (hand-checkable numbers, determinism, limits) and the layout (parts inside the envelope, nothing that should be clear overlapping). |
| `textures.ts` | Canvas textures: dials, labels, screens, circuit boards. |
| `parts.ts` | Geometry, built with the kit's `Builder`. Returns handles to the nodes and materials that move or glow. |
| `device.ts` | The `DeviceDef` (see `kit/types.ts`): metadata, assemblies, views, framing, inputs, `sim`, `readouts`, `build`. |
| `main.tsx` | `mount(def)`. Three lines; copy Orbit's. |

`web/<slug>/index.html`, the Vite entry, the route rewrites and the menu entry already exist for `belljar`, `chorus`, `lumen` and `pocket`. Also write `docs/<slug>/evidence.md`: a table of which features are visible in the image, which are estimated and which are invented, plus one hand check of a number.

## Kit contract

- `kit/types.ts`: `DeviceDef<S,P>`. `S` is sim state, `P` is the pose.
- `kit/builder.ts`: `layer`, `pivot`, `put`, `box`, `cyl`, `ball`, `torus`, `wire`, `screw`, `adopt`, plus shape helpers `plate`, `roundPlate`, `frame`, `roundFrame`, `annulus`, `arc`, `gear`, `slab`, `lathe`. Read the comments there.
- `kit/materials.ts`: named finishes through `b.m.mat(asm, kind)` (or pass the kind string to `put`/`box`/`cyl`). For anything else create a three.js material and register it with `b.m.own(asm, material)` so selection ghosting works. Register textures with `b.m.texture(t)`.
- `kit/stage.ts` owns the renderer, environment lighting, shadows, camera, picking, explosion and selection. `kit/DevicePage.tsx` owns the interface. Do not edit anything in `kit/`, `orbit/` or shared config: other devices are being built against them at the same time. If the kit lacks something, use three.js directly inside your own folder and mention the gap in your report.

How explosion works: each assembly has a `move` vector and an `order`. Every `layer(asm, lift, base)` adds its own `lift` on top. Parts must separate along a believable assembly axis and sit in a credible place when assembled. A layer's `base` is its origin, so rotate a layer (or a `pivot` inside it) in `update` to turn something about that point.

How selection works: the page ghosts every material not owned by the selected assembly. So a material must belong to exactly one assembly: get it from `mat(asm, kind)` with the right `asm`, or `own` it.

## Coordinates

Millimetres. X right, Y up. For a device that stands upright and is photographed from the front, the face points toward +Z and the matching view is roughly `dir: [0, small, 1]`. For a device photographed lying flat from above, +Z is toward the bottom of the image and the matching view is `[0, 1, .0015]`. `slab` extrudes a plan shape upward (shape +y becomes world −Z); to stand a shape upright, build it with three.js `ExtrudeGeometry` directly (shape x → X, shape y → Y, depth → Z).

## Rules that decide whether it works

1. Build against the reference image. Read it first, write down the pixel-to-mm mapping, and trace positions and radii. Compare a capture from the matching view with the reference after every round, and fix the largest visible difference first.
2. One motion model drives everything. No hand keyframes; every readout comes from the same pose that moves the parts.
3. Fix collisions with numbers in the layout, never by hiding them.
4. One accent that means something: whatever is working right now glows or moves.
5. Keep emissive intensity under about 2.5. Keep roughness at or above about 0.1 on large chrome so it does not blow out.
6. Page text is minimal: assembly names, a note of at most eight words each, control labels, two to four readouts.

## Traps already hit

- The `acrylic` and `glass` kinds are clear pass-through materials with depth writing off. Ordinary transparent materials (`transparent:true`, `opacity`) show correctly through them. Coloured or frosted glass should be an ordinary transparent `MeshPhysicalMaterial` with `opacity`, not `transmission`: transmissive surfaces do not show other transmissive surfaces behind them.
- An opaque or depth-writing shell hides transparent parts inside it. Clear shells need `depthWrite:false`.
- Polished metal mirrors the studio room. If a surface turns flat white from the matching view, raise its roughness, darken its colour, or set `frame.envRotation`.
- `lathe` profiles go anticlockwise in (radius, height): bottom centre, outward, up, back to the top centre. A wrong order shows as a dark inside-out surface.
- Clear parts cast no useful shadow; set `castShadow=false` on them.
- A flat decal on a surface needs `polygonOffset` on its material or it flickers.
- Something spinning must have a visible mark, or the motion cannot be seen.
- Text on the object goes in a canvas texture. Draw dials at 1024 px or more and set `colorSpace = THREE.SRGBColorSpace`.

## Commands

The dev server is already running at http://127.0.0.1:49381 with live reload. Do not start, stop or rebuild it, and do not run `npm run build`.

```sh
cd web && npx vitest run src/<slug>          # your tests
cd web && npx tsc -b                         # type-check; ignore errors in other devices' folders
node scripts/devices/shot.mjs <slug> shots/<slug> Assembled 3D Front Side --page
node scripts/devices/shot.mjs <slug> shots/<slug> Exploded 3D Side
node scripts/devices/shot.mjs <slug> shots/<slug> Play 3D Front --wait=3500
node scripts/devices/shot.mjs <slug> shots/<slug> Assembled 3D --dark --page
node scripts/devices/shot.mjs <slug> shots/<slug> Assembled 3D --select=<Assembly name>
```

View names are the labels you gave the camera buttons. The script prints the pose and any page errors. Read every capture you take: a file being written is not evidence that it looks right.

## Done means

- Tests pass and your folder type-checks.
- Captures of the matching view, 3D view, exploded, play and dark mode have been read, with no page errors.
- The matching view has been compared with the reference and the remaining differences are listed in your report.
- `docs/<slug>/evidence.md` exists.

## Studio look (added after the first five devices)

Set these in `device.ts`; see Orbit Deck for a working example.

- **Thick glass:** the `crystal` kind is refracting glass. Put it on a closed solid with real wall thickness (an extruded frame, a lathed shell with an inner and outer wall, a bevelled pane), with rounded or bevelled edges so the rims catch the softboxes. To change `thickness` or add `dispersion` for a small curved piece, clone the material and register the clone with `b.m.own`. Refraction only shows opaque things behind it; clear or coloured parts inside still draw, just unrefracted. Keep the `glass` or `acrylic` kind for thin panes where you want no bending at all.
- **Backdrop:** `backdrop.light` and `.dark` take a colour or a studio sweep `{top, mid, bottom, horizon?, vignette?}`. The sweep is drawn in screen space.
- **Mirror floor:** `frame.reflection` (0–1, try 0.3–0.5) adds a blurred, fading mirror on the floor at y = 0. Only objects are mirrored. It is switched off on phones.
- **Glow:** `frame.bloom: {strength, radius, threshold}` adds a glow pass. With a threshold near 1, only emissive parts above 1 and the hottest highlights bloom. Start around `{strength:.5, radius:.6, threshold:1}` and read a capture; too much turns chrome highlights into fog.
- **Studio room:** `frame.environment: 'studio'` (above) suits polished metal.

## Clock movements: `kit/horology.ts`

Involute wheels and pinions with crossings (`wheelShape`, `wheelGeometry`), plain discs (`discShape`), a club-tooth escape wheel (`escapeWheelShape`), a ratchet (`ratchetShape`), `extrudeFlat`, a `spiral` for hairsprings and mainsprings, and the arithmetic: `pitchRadius`, `tipRadius`, `centreDistance`, `trainRatio`. Shapes lie in XY with the arbor along Z and a tooth centred on local angle 0.

`meshed(theta1, z1, z2, phi)` returns the rotation of a driven gear so its teeth interlock with the driver's, where `phi` is the direction from the driver's arbor to the driven one's. Use it in `update` for every mesh, so gears visibly engage and never pass through each other. Two gears mesh only if they share a module and sit exactly `centreDistance` apart; put that in a layout test.

## Tracing tools

```sh
# Enlarge a region of the reference or a capture; also prints the region's average colour.
node scripts/devices/crop.mjs assets/<file>.png shots/<slug>/ref-a.png <x> <y> <w> <h> [scale]
# Side-by-side and 50% overlay of a capture against the reference.
node scripts/devices/compare.mjs assets/<file>.png shots/<slug>/assembled-top.png shots/<slug>/cmp --crop=x,y,w,h [--ref=x,y,w,h] [--mix=0.5]
```

`--crop` is the device's bounding box in the capture and `--ref` the matching box in the reference, both in pixels. Without `--crop` the tool guesses the box, which is unreliable on gradient backdrops. Read both outputs: the overlay shows misplacement as doubled edges.

## Lighting and view state (added for the board pieces)

- `frame.key: {dir, intensity, environment}` sets the key light's direction (from the target toward the light), its strength (default 2.3) and the environment light's strength (default 1). For a low-key, moody piece lower `environment` and raise `intensity`. Do not reach into the stage's scene to change lights.
- `update(pose, view)` now receives `view.separation` (the eased explosion, 0..1) and `view.dark`, for effects that should fade as parts lift or follow the theme.
- `envMapIntensity` on a material has no effect while the material relies on the scene's environment: in this three.js version it only applies when the material has its own `envMap`. To make one finish mirror the room more or less than the rest, assign the scene's environment texture to that material's `envMap` on the first `update` and set `envMapIntensity` there. Such a material no longer follows the kit's dark-theme dimming, so scale it yourself using `view.dark`.

## Reference-match round (added for the board pieces, round two)

- **Close-up view:** a view may set `zoom` (camera distance multiplier). Add `{id:'close',label:'Close',dir:[0,1,.0015],zoom:.45}`-style views so the frame is filled the way the reference crop is. The camera always looks at `frame.target`.
- **Spot key:** `frame.key.spot: {distance, angle, penumbra, cookie}` makes the key a lamp at a finite distance (in radii), so brightness falls off across the board. `intensity` is still the strength at the target. `cookie: () => THREE.Texture` projects a texture through the lamp (streaks, blinds); draw it on a canvas, mostly white with dark bands. `frame.key.shadowSize` sets the shadow map size; 1024 gives softer shadows than 2048.
- **Glow is for emitters only:** with `frame.bloom` set, the kit holds reflected light on every standard or physical material just under the bloom threshold. Only `emissive` light (or an unlit `MeshBasicMaterial` with colour above 1) can glow. Do not rely on highlights blooming.
- **Flashing, already fixed once, do not bring it back:** a small `PointLight` a millimetre or two above a part makes a hard hot spot on anything that passes near it, especially lifted parts in the exploded view. Keep such lamps at least ~10 mm from surfaces they light, and fade them with `view.separation`.
- `scripts/devices/flicker.mjs <slug>` orbits the camera in sub-pixel steps and writes a heat map of pixels that flash. It reads fine moving detail as noise, so use it to compare before and after, and look for blobs and halos.

## Presentation round: isometric lens, Layers view, sheets, contact shading

- **Lens:** a view may set `lens` (field of view in degrees, default 22). `lens:5` is close to an isometric drawing. The stage keeps the device the same size on screen and eases between lenses.
- **Layers view:** a view with `layers:true` rearranges the device's OWN assemblies into floating, staggered planes: give each assembly a `layer: [x, y, z]` offset in `model.ts` (a modest rise, well under its explosion `move`, plus a sideways slide so planes partly overlap like a fanned stack). The stage eases each assembly there; `update` also receives `view.layers` (0..1). **Nothing is added in this view** — no drawings, cards, overlays or tints that do not exist in the other views. The user rejected those as fake.
- **Per-view set:** a view may set `backdrop` (replaces the theme backdrop while active; the scene is then lit as in the light theme, and `view.dark` is false) and `light: {key, environment}` multipliers. A white studio set is `backdrop:{top:0xf6f7f8,mid:0xffffff,bottom:0xeef0f2,horizon:.6,vignette:.04}` with `light:{environment:1.4}`.
- **Contact shading:** `frame.ao: {radius, intensity}` adds soft shading in creases and under parts. Radius in mm, 2–4% of the device radius. Costs frame rate; switched off on phones.
- Reference set for this look: `docs/devices/presentation/` (ref-1..4). White seamless studio, soft even light with gentle contact shadows, near-isometric lens, planes floating parallel to the board at staggered heights and partly overlapping. Take the staging from them, not the overlay drawings or cards.
- `frame.ao.views: ['layers', ...]` limits contact shading to those views, since it costs roughly a quarter of the frame rate. A view backdrop is held under the bloom threshold, so a white set does not fog.
- **Upright:** a view may set `upright: <mm>` to stand the whole device on its lower edge, facing +Z, with its centre that many mm above the floor (half the device depth plus ~15). Use it for the Layers view with a camera from the front, a little to one side and slightly above (e.g. `dir:[-.5,.28,.82]`), framed close in portrait like docs/devices/presentation/ref-2.png. Layer offsets and explosion then come toward the viewer.

## Performance (added after the board round)

- **Still scenes are not redrawn.** The stage draws a frame only when the camera, an easing, the theme, the selection, the size or the pose changes, plus twice a second as a safety net. Anything that changes on screen must therefore be driven by the pose or by `view`; a device that animates from its own clock will look frozen. Add `?draw=always` to the page URL to turn this off when debugging.
- **Large canvases are freed after upload.** About eight seconds after load (once fonts are in), every canvas texture of 2 megapixels or more whose version has not changed is uploaded, then its canvas is shrunk to 1×1. If such a texture is redrawn later, the page logs an error instead of showing it empty; keep redrawn canvases (displays, chase lines) under 2 megapixels.
- With `frame.bloom` or `frame.ao` the canvas has no multisampling of its own; the composer's target does the antialiasing.
