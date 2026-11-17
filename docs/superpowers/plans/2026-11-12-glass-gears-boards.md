# Glass, gears and boards — plan

Date: 2026-11-12. Follows `2026-11-12-orbit-deck.md`. Execution: kit work in the main session, then one sub-agent per device in parallel, then a review pass in the main session. No commits unless asked.

## Goal

1. Push Orbit Deck, Belljar, Chorus and Lumen toward the reference renders with thick refractive glass, gradient backdrops and a reflective floor. Pocket is left as it is.
2. Give the three clocks refined gear shapes and more working machinery, with correct ratios and meshing.
3. Add three circuit-board art pieces from `~/Downloads/Device.Gallery`, matched closely to their images, each with a representational play animation.

## Reference images

| Slug | Image | What it is |
| --- | --- | --- |
| `verdant` | `assets/board-1-reference.png` (1605 × 2589) | Green motherboard: lime CPU cover, memory slots, steel heat blocks, black hoses, right-edge connectors |
| `ember` | `assets/board-2-reference.png` (1740 × 2589) | Black board: brushed-steel CPU bracket with heat pipes, a second socket glowing orange, brass fittings |
| `console` | `assets/board-3-reference.png` (1887 × 2589) | Charcoal control deck: large knobs, orange displays, yellow buttons, a blue-grey touch panel, pipework |

## Phase 1 — kit (main session)

| Change | File | Contract |
| --- | --- | --- |
| Thick glass | `kit/materials.ts` | New kind `crystal`: physical transmission with thickness, index 1.5, faint tint, dispersion. Used on closed solids with real wall thickness; refraction then shows at rims and curved edges. |
| Gradient backdrop | `kit/backdrop.ts`, `kit/types.ts` | `backdrop.light` and `.dark` accept a colour or `{top, mid, bottom, vignette}`; drawn as a screen-space gradient. |
| Reflective floor | `kit/floor.ts`, `kit/types.ts` | `frame.reflection` (0–1) adds a blurred planar mirror that fades with distance. Off on the low-power tier. |
| Bloom | `kit/stage.ts`, `kit/types.ts` | `frame.bloom {strength, radius, threshold}` adds a glow pass for emitters. Opt-in. |
| Horology | `kit/horology.ts` + tests | Involute wheel and pinion shapes with crossings, club-tooth escape wheel, hairspring curve, and `meshed()` to phase one gear against another. |
| Compare tool | `scripts/devices/compare.mjs` | Side-by-side and 50% overlay of a capture against the reference, for tracing work. |

Orbit Deck is converted in this phase as the proof.

## Phase 2 — devices (one sub-agent each, in parallel)

- **Belljar, Chorus, Lumen:** solid-wall glass with `crystal`, gradient backdrop, reflective floor, and a rebuilt movement on `kit/horology.ts` with more wheels and working parts, phased so teeth interlock.
- **Verdant, Ember, Console:** new device folders. Trace the image at a stated scale; sample colours from the image; build every visible component as geometry with canvas-drawn markings; compare with the overlay tool each round.

## Phase 3 — review (main session)

Read captures of every device against its reference, fix what is off, then run all tests, the production build and a browser check of every page (play, explode, select, dark, phone width).

## Risks

- Transmissive glass does not show other transmissive or transparent surfaces through its refraction; inner clear parts stay ordinary transparent materials and render unrefracted.
- The mirror floor and the glow pass each cost an extra scene render. Both are off on the low-power tier.
- An exact pixel match of a rendered image is not achievable with procedural geometry; the target is the same layout, shapes, colours and lighting from the matching camera.
