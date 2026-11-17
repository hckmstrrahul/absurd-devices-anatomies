# Orbit Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/orbit`, an interactive 3D teardown of the fictional Orbit Deck with assembled, exploded and play states.

**Architecture:** A pure motion model (`model.ts`) and a layout table in millimetres (`layout.ts`) are the single source for poses, readouts and part positions. `parts.ts` turns the layout into three.js meshes grouped by assembly; `scene.ts` owns the renderer, lighting, cameras and per-frame drawing; `Orbit.tsx` is the React interface built from the home page's components.

**Tech Stack:** React 19, three.js 0.187, Vite 7, Tailwind 4 with Untitled UI components, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-orbit-deck-design.md`

## Global Constraints

- Envelope 260 × 242 × 46 mm; X right, Y up, Z toward the image bottom; `X=(u−0.5)×260`, `Z=(v−0.5)×242`.
- Belt ratio 6; 4 beats and 16 steps per revolution; speeds 100/3 and 45 rpm; pitch ±8%; spin time constant 0.6 s.
- No new dependencies. No network requests at runtime.
- Page text: title, concept badge, control labels, seven assembly names and one short note each.
- `/` and `/flora` keep working; existing tests keep passing.
- Execution: native, in this session, as the user asked ("plan it … and then start building"). No commits unless the user asks.

## Review Focus

1. WebGL unavailable or context lost: the page shows the reference image and a message instead of a blank card.
2. Reduced motion: the platter does not start on its own.
3. Phone width (390 px): no horizontal scroll; controls wrap.
4. Tab hidden or viewer off screen: the loop stops advancing; no jump in platter angle on return (`dt` clamped to 0.1 s).
5. Rapid mode switching mid-transition: separation eases from its current value, never snaps.

Items 1–3 are checked by `scripts/orbit/review.mjs`; 4–5 are covered by `advance` tests (dt clamp) and the separation easing in `scene.ts`.

## File Structure

| File | Responsibility |
|---|---|
| `web/src/orbit/model.ts` | Constants, `advance`, `poseAt`, assembly metadata, explode easing. No three.js. |
| `web/src/orbit/layout.ts` | Footprints of every placed part in mm, traced from the reference. No three.js. |
| `web/src/orbit/model.test.ts` | Tests for both of the above. |
| `web/src/orbit/materials.ts` | Material factory, cached per assembly, plus canvas textures. |
| `web/src/orbit/parts.ts` | Builds the seven assembly groups from the layout; returns handles for moving parts. |
| `web/src/orbit/scene.ts` | Renderer, environment, lights, floor, cameras, picking, `draw`. |
| `web/src/orbit/Orbit.tsx`, `main.tsx`, `orbit.css` | Interface. |
| `web/orbit/index.html` | Entry page. |
| `scripts/orbit/review.mjs` | Screenshot review. |
| `docs/orbit/evidence.md` | Evidence table and rebuild commands. |
| Modify `web/vite.config.ts`, `vercel.json`, `server.mjs`, `web/src/App.tsx` | Route wiring and a header link. |

---

### Task 1: Motion model and layout

**Files:** Create `web/src/orbit/model.ts`, `web/src/orbit/layout.ts`, `web/src/orbit/model.test.ts`.

**Produces:**

```ts
// model.ts
export type AssemblyId='case'|'platter'|'coil'|'rotor'|'controls'|'memory'|'board';
export type Mode='assembled'|'exploded'|'play';
export type View='hero'|'top'|'side';
export const SPEEDS:{id:'33'|'45';rpm:number}[];
export const BELT_RATIO=6, BEATS_PER_REV=4, STEPS_PER_REV=16, SPIN_TAU=0.6;
export const SIZE={x:260,y:46,z:242};
export const assemblies:{id:AssemblyId;name:string;note:string;move:[number,number,number];order:number}[];
export type Spin={revs:number;rpm:number};
export function targetRpm(playing:boolean,speed:'33'|'45',pitch:number):number;
export function advance(spin:Spin,dt:number,target:number):Spin;
export function poseAt(revs:number,rpm:number):Pose; // platter, rotor (rad), bpm, rotorRpm, beat, step, level, knobs[5]
export function spread(separation:number,order:number):number; // staggered ease, 0..1
// layout.ts
export type Footprint={id:string;asm:AssemblyId;x:number;z:number;r?:number;w?:number;d?:number;y0:number;y1:number};
export const footprints:Footprint[];
export const PCB={x0:-110,x1:114,z0:-88,z1:106,y0:10.4,y1:12};
```

- [ ] **Step 1: Write the failing tests** in `model.test.ts`:
  - `poseAt(1,100/3)`: `platter ≈ 2π`, `rotor ≈ 12π`, `bpm ≈ 133.33`, `rotorRpm ≈ 200`; `poseAt(1,45).bpm === 180`.
  - `poseAt` is deterministic and `level` stays within 0…1 for 200 sampled inputs; `level` is 0 when `rpm` is 0.
  - `step` runs 0…15 across one revolution.
  - `advance` from rest toward 45 for 3 s in 1/60 s steps reaches within 1% of 45; toward 0 it coasts below 0.5 rpm within 3 s and never goes negative; a `dt` of 5 s is treated as 0.1 s.
  - `targetRpm(false,…)` is 0; `targetRpm(true,'33',8) ≈ 36`; pitch outside ±8 is clamped.
  - `spread(0,o)` is 0 and `spread(1,o)` is 1 for every order; monotonic in separation.
  - Every footprint lies inside the tray interior (|x| ≤ 126, |z| ≤ 117) and between y 5 and 43.
  - No footprint outside the `platter` assembly overlaps the bezel circle (centre 5, 3; radius 56) unless its `y1` is at or below the PCB top.
  - All seven assemblies have at least one footprint.
- [ ] **Step 2:** `npm --prefix web test -- src/orbit` fails with module not found.
- [ ] **Step 3:** Implement `model.ts` and `layout.ts` to the signatures above. `advance`: `rpm += (target−rpm)·(1−exp(−dt/SPIN_TAU))`, `revs += rpm/60·dt`, with `dt` clamped to 0…0.1. `level = min(1,rpm/30)·(0.25+0.75·exp(−4·beat))`.
- [ ] **Step 4:** Tests pass.

### Task 2: Scene

**Files:** Create `materials.ts`, `parts.ts`, `scene.ts`.

**Consumes:** everything from Task 1.

**Produces:**

```ts
// parts.ts
export function buildDevice(m:Materials):{root:THREE.Group;groups:Record<AssemblyId,THREE.Group>;movers:{node:THREE.Object3D;base:THREE.Vector3;lift:THREE.Vector3;asm:AssemblyId}[];spin:{platter:THREE.Object3D;rotor:THREE.Object3D;knobs:THREE.Object3D[]};glow:{coil:THREE.MeshStandardMaterial;leds:THREE.MeshStandardMaterial[];button:THREE.MeshStandardMaterial};count:number};
// scene.ts
export type Frame={separation:number;selected:AssemblyId|null;view:View;pose:Pose;dark:boolean};
export function makeStage(el:HTMLElement,onSelect:(id:AssemblyId)=>void):{ready:Promise<void>;draw(f:Frame,dt:number):{x:number;y:number}|null;setView(v:View):void;dispose():void;count:number;renderer:THREE.WebGLRenderer};
```

- [ ] **Step 1:** `materials.ts`: one factory `mat(asm,kind)` returning a cached material per assembly and kind (`acrylic`, `frost`, `white`, `pcb`, `black`, `chip`, `chrome`, `steel`, `copper`, `orange`, `blue`, `gold`, `wireOrange`, `wireBlue`, `led`). Canvas textures for the PCB silk-screen and the orange label.
- [ ] **Step 2:** `parts.ts`: build each assembly from `footprints` plus hand-shaped hero parts (chamfered tray and lid, lathed disc, hub and knobs, spiral coil tube, gear mount, heat-sink fins, wire tubes, instanced SMD parts). Each node that separates on its own is registered in `movers` with a `lift`.
- [ ] **Step 3:** `scene.ts`: renderer with ACES tone mapping and soft shadows, `RoomEnvironment` through `PMREMGenerator`, key and fill lights, shadow-catcher floor, perspective camera (fov 22), orbit controls, view presets with eased moves, raycast picking, ghosting of unselected assemblies, `draw` applying `spread`, spin angles and glow.
- [ ] **Step 4:** Type-check with `npx tsc -b` in `web/`.

### Task 3: Interface and routing

**Files:** Create `Orbit.tsx`, `main.tsx`, `orbit.css`, `web/orbit/index.html`. Modify `web/vite.config.ts` (add `orbit` input), `vercel.json` (rewrite `/orbit` and exclude `orbit/` from the catch-all), `server.mjs` (serve `/orbit`), `web/src/App.tsx` (header link "Orbit Deck in 3D").

- [ ] **Step 1:** Build the page from the home page's classes (`app-container`, `app-header`, `page-heading`, `workbench`, `model-card`, `model-toolbar`, `model-caption`, `viewer-controls`, `inspector`, `component-panel`) and its `ButtonGroup`, `Button`, `Slider`, `Badge`, `Tooltip`.
- [ ] **Step 2:** Animation loop: `advance` then `poseAt` then `stage.draw`; readouts refreshed about ten times a second; paused when hidden or off screen. Expose `window.__orbit={ready,state()}` for the review script.
- [ ] **Step 3:** Wire the route and the header link; `npm test` and `npm run build` pass.

### Task 4: Review and evidence

**Files:** Create `scripts/orbit/review.mjs`, `docs/orbit/evidence.md`.

- [ ] **Step 1:** `review.mjs` captures `shots/orbit/{top,hero,exploded,play,dark,mobile}.png`, logs page errors and horizontal overflow at 390 px.
- [ ] **Step 2:** Read every capture. Compare `top.png` with `assets/orbit-deck-reference.png`. Fix the largest visible fault, rebuild, repeat until a pass finds nothing.
- [ ] **Step 3:** Write `evidence.md` with the evidence table and the rebuild commands.
