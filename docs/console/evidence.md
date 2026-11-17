# Console: evidence

Reference: `assets/board-3-reference.png`, 1887 × 2589 px, one top view. The image is the card, edge to edge.

Mapping: 0.1 mm per pixel, so the card is 188.7 × 258.9 mm with 10.5 mm corners.
`x = (px − 943.5) × 0.1`, `z = (py − 1294.5) × 0.1`. Every position in `web/src/console/layout.ts` is written in reference pixels.

The reference's pixels are never shown, and since round four nothing printed on the deck is traced from it either.
Part positions were measured on a 3 × 5 grid of 2× crops.

## Deck print: designed, not traced (round four)

The reference's small print is garbled glyph fragments. Tracing it faithfully reproduced scribbles and half-letters, soft when
zoomed. So the reference now decides only **where** print sits and **which ink** it uses (pale, orange, amber); what is drawn
there is authored.

- `web/src/console/print.ts` is the print list: panel fields with rounded corners, hairline rules, 270° tick scales with
  numerals round knobs A, C and J, rings round every bezel, bracket and manifold rules in orange, amber link lines to the
  trigger column, small icons (bar graph, speaker, waveforms, warning, phase, drop), and labels in one sans face. Strokes are 0.2, 0.26 or 0.32 mm, straight or true arcs.
  Labels are real words (GAIN, PAN, MASTER, LEVEL, CLOCK, FILTER, …), never smaller than 1.3 mm.
- `textures.ts` draws that list with canvas path calls at 25 px/mm (12.5 on phones) into 2 × 3 tiles, each with a gutter of
  its neighbours' print, mipmapped, anisotropy 16. At the orbit's minimum distance one texel is about one screen pixel.
- Under each large part the deck carries a seat outline and shaft hole, and a hole under each grommet. They are hidden
  until the deck is taken apart.
- Layout tests keep every label and icon clear of parts, tubes, leads, other labels, every stroke and the card edge.
- `scripts/devices/trace-console.mjs` still measures the reference, but only as a placement guide written to
  `shots/console/trace-guide*.{png,json}`. The page imports none of it; `traced.ts` and `traced-mask.ts` are gone.
- Wording on the displays, knob rings and cup dials was nonsense in the image; it is now plausible words (TEMPO, Volume,
  Transport, MASTER OUTPUT LEVEL, SINE/SQR/SAW/TRI …). The two cap logos ("Lotner", "Glam") are kept as maker's marks.

## Wiring: authored terminal to terminal (round four)

`web/src/console/wiring.ts` lists 24 leads. Each names both terminals: a socket on the outline of a part in `layout.ts`, or
a grommet in open deck. Routes follow the reference's wires; ends were chosen from real parts. Each lead is one tube of one
radius with a boot and bright ferrule seated on the part (it carries on 1.2 mm inside), or a rubber grommet where it enters
the deck. Red heat-shrink is a short collar on a continuous black lead. Heights are computed: a lead rests on the deck or the
plate under it, rises to its socket, and climbs over any lead laid before it. Tests check seating, clearance from every part
and tube, continuity of height, and the one crossing.

Known limits of the wiring: fewer strands than the image (24 against roughly 40 visible), the thin blue leads are left out,
and a lead that plugs into a part of another assembly separates from it in the exploded view.

## Explosion (round four)

Only the printed plate stays put. Strip, wire loops, sub-panel disc, wells, slot bezels and fixing screws lift 26 mm as a
layer of the Panel assembly; the leads rise with the wiring assembly (58 mm). The painted contact shadows are gone by
separation 0.33, and the deck stops receiving cast shadows once anything has lifted, so nothing dark is left where parts sat.

## Layers view (rounds six and seven)

A fifth camera button, **Layers**, stands the console upright on its lower edge on a white studio sweep and floats its own
assemblies off the face toward the viewer as parallel planes. **Nothing is added and nothing is hidden**: the round-five
sheets (harness drawing, temperature map, cutout drawing, signal-path page), the supplier cards and the tint shells were
removed with their data, tests and files (`layers.ts`, `sheets.ts`).

Camera: `dir [-.7, .22, .68]` (about 46° round to the left of square-on and 13° above level), lens 5°, zoom 1.14,
`upright: 165`. The standing deck with its planes fills about 88% of a landscape frame's height.

Each assembly has a `layer` offset in `model.ts`, in the deck's own axes: x across, rise off the face, z down the screen.

| Plane | Rise | Slide x | Slide z |
| --- | --- | --- | --- |
| Panel (printed deck, strip, disc, screws) | 0 | 0 | 0 |
| Edge rail | 8 | 12 | −2 |
| Wiring (loom, probes, leads) | 14 | −18 | −3 |
| Pipework | 30 | 14 | −7 |
| Buttons and keys | 46 | −24 | −10 |
| Displays | 62 | 12 | −11 |
| Knobs | 76 | −30 | −18 |

The rises follow the explosion's stack order; each gap is taller than the tallest part on the plane beneath, and each rise is
under half that assembly's explosion move. Slides alternate left and right. Every assembly has parts near the lower edge and
the camera looks slightly down, so a nearer plane would appear to sag below the deck: each slides up by about a quarter of
its rise to cancel that. Layout tests check order, clearance, alternation and that no part ends past the lower edge.

Light in this view: `light:{environment:2.6, key:1.3}`. Upright, the deck's face turns away from the overhead softboxes and
read near black whatever the multipliers, so its own print texture is also used as a little self-light (0.8 × the view's
ease), returning to zero on leaving. The painted contact shadows fade and the deck stops taking cast shadows, as in Exploded.
Contact shading (`frame.ao`, radius 4 mm) runs in this view only: on for every view it took the headless Play frame rate
from 41 to 28 fps in back-to-back runs.

## What comes from where

| Feature | Source |
| --- | --- |
| Card outline, aspect, corner radius | Visible, measured |
| Seven large rotaries: centres, bezel, skirt and cap radii | Visible, measured |
| Red ring with silver sector (knob A), tick scale (B), 16 orange blocks (D), 12 bars (H), orange pills (J) | Visible; counts of blocks, bars and pills estimated |
| Six black cup dials and their legends | Visible; legend wording is mine, real words |
| Three displays: bezel boxes, lit areas, column layout of the text | Visible, measured |
| Display wording and figures | Placement, size, weight and colour follow the image; wording is invented, plausible words |
| 2 × 3 yellow caps, one amber cap, column of seven yellow caps | Visible, measured |
| Pill keys, small knobs, toggles, modules, canister, silver block | Visible, measured in plan |
| Six conical valve knobs, copper lines, steel loop, unions, hoses | Visible; exact tube routes simplified |
| Cable loom, fan of eight cables, probes | Visible; fewer strands than the image |
| Loose red, orange and black leads | Visible; 24 authored leads follow the image's routes, ends chosen from real parts (see above) |
| Clear edge rail and twelve chrome studs | Visible; stud pitch measured (83 px), rail section estimated |
| Panel legends, outlines, scales, icons, link lines | Designed: placement and ink follow the image, wording and shapes are authored vectors |
| Fixing screws, grommets | Invented |
| All heights | Estimated: the image has no side view |
| Underside, panel thickness (6 mm) | Invented |
| Lighting | Deliberately not the image's: even, soft environment light with a weak key. The image's diagonal light streaks are left out. Depth comes from soft contact shadows printed under each part, tube and wire |
| Knob heights | Lowered to 8–10.5 mm so the caps do not lean in the perspective top view |
| Wear (dust, scratches, smudges), glass sheen | Invented, faint |
| Connector fan | Eleven rows, y measured on a 2.4× crop (419, 437, then nine at about 35 px pitch) |
| Steel and copper banding | Painted into the metal textures: under even light bare metal reads flat. Invented, not sampled |
| Contact shadows | On their own sheet, faded out as the parts lift in the exploded view |
| Knob ribs | A mipmapped colour-and-height texture; rib count estimated from a 1.3 mm pitch |
| Canister steps and slots, silver block seam and key, bracket screws, rail channel, clips and screws | Visible; proportions estimated |
| Loom of 14 cables in two layers, ties | Visible; cable count and exact routes estimated |
| Knob profiles, knurling, sunk cap lettering, icon segments on knob D | Visible; step heights and knurl pitch estimated |
| Play sequence | Invented and representational: nothing in it is a real function of the device |

## Hand check

Tempo 120 bpm for 2 s is 120 / 60 × 2 = 4 beats. Knob A turns 1/16 rev per beat, so 4 / 16 = 0.25 rev = π/2 rad.
Flow swells once per 8 beats as `0.5 − 0.5 cos(2π · beats / 8)`; at beat 4 that is 0.5 − 0.5 × (−1) = 1, so the gauge needle is at +half its 1.2π sweep.
Both are asserted in `model.test.ts`.

Clearance check: the canister stem is a 1.7 mm radius rod on a 6.2 mm axis, so its underside is at 4.5 mm; the touch glass it crosses is 2.6 mm high.
