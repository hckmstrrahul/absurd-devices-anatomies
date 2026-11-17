# Ember: evidence

Reference: `assets/board-2-reference.png` (1740 × 2589 px), a rounded card that the board fills edge to edge.

Scale: 1 px = 0.1 mm, so the board is 174 × 258.9 mm with 10 mm corners. Origin at the image centre, pixel (870, 1294.5). X right, Z toward the image bottom, Y up. Every part in `web/src/ember/layout.ts` is written as a pixel box and converted once.

The reference image itself is not shipped or used as a texture. Two things are measured from it by `scripts/devices/trace-ember.mjs`: `web/src/ember/traced.ts` (every compact bright blob as a rectangle with mean colour and class) and `web/src/ember/traced-mask.png`, of which only the red channel inside the core window is still used (the glowing circuit lines). The board's print is no longer shown from the mask: it is drawn from vectors (see "Fourth pass"). Everything else — metals, chip tops, the shroud, the bracket, the lenses — is drawn on canvas in code; colours were sampled from the image with `crop.mjs`.

## What comes from where

| Feature | Source | Notes |
| --- | --- | --- |
| Card outline, corner radius | Visible | Traced; radius about 100 px |
| Bracket outline, opening, shoulder tabs, four brass screws, four corner studs | Visible | Outline (with ears) and the chamfered opening traced as polygons; pressed steps, seats and wear are painted on, and the four fasteners differ as in the image |
| Processor package and heat-spreader | Visible | Boxes traced; lettering is invented text in the same positions and direction |
| Load plate round the package | Visible | Simplified to a rounded frame with two tabs |
| Both heat pipes, their collars and banjo ends | Visible | Centre lines traced as 9 and 11 points; 7 mm diameter from the 70 px width. The two saddle straps are invented |
| Cross bar and its two clamps | Visible | Traced |
| Angled black block the right pipe enters | Visible | Outline traced as six points |
| Glowing window, die, circuit lines | Visible | Window and die boxes traced by hand; the line routes are traced by script (see below) |
| Shroud: top bar, two wings, bottom bar, rim, clamps, fins | Visible | Boxes traced; one cast body with raised plates. Blotches and stains are painted at the positions the image has them; shoulders are simplified slabs |
| Four fittings round the core, four washers, two fan discs, six lit dots | Visible | Centres and radii traced; internal profiles estimated |
| Eight memory slots (four thin upright, two long upright, two across), latches, clips | Visible | Traced |
| Sixteen chips, thermal pad, labelled module and its cap | Visible | Boxes traced; package types and markings estimated or invented |
| Top-edge housings, six capacitors, steel socket, towers, edge connectors | Visible | Boxes traced; internal detail simplified |
| Small components | Traced position and size, invented type | Each traced blob that does not fall on a modelled part becomes one real part (`pcb.ts`): chip resistor, capacitor, banded capacitor, lamp, small chip, crystal can or bare land. Which type is a guess from the blob's colour and shape |
| Pads, vias, routing, silk-screen, designators, labels | Invented | The reference's own print is soft and its lettering unreadable. Pads follow the parts; traces, vias and label positions are generated (`route.ts`). Only the density follows the reference |
| Circuit lines in the core window | Traced | The mask's red channel inside the window; the Play run is rings of light masked by the same lines |
| Lettering in the core window, on chips, the heat-spreader, housings and washers | Invented | Maker, part number and date code in place of the reference's unreadable strings. The makers are made up |
| All heights | Estimated | There is no side view; nothing is taller than 16 mm |
| Undersides, posts under the bracket, parts' sides | Invented | Not visible from above |
| Play behaviour, temperatures, flow | Invented | Representational, as asked |

## Hand check

The die spans pixels x 495–700 and y 1800–1972, so it is 205 × 172 px = 20.5 × 17.2 mm, centred at ((597.5 − 870) × 0.1, (1886 − 1294.5) × 0.1) = (−27.25, 59.15) mm. The test `maps 0.1 mm per pixel` asserts the size.

Model: idle heat is 0.45, so the idle core temperature is 31 + 64 × 0.45 = 59.8 °C, which is what the page shows (60 °C). At full power heat tends to 1: 95 °C and 4.2 L/min. Heat follows power with a 1.8 s time constant, so after 1.8 s at 100% it is 0.45 + 0.55 × (1 − e⁻¹) = 0.798.

## Light

Even and diffuse, as asked: most light comes from the room (`FILL` in `parts.ts`), with a low parallel key from the upper left and a 1024 px shadow map. No spot lamp and no falloff. Nothing but the one core lamp (24 mm above the board, off by full separation) is a point light; the orange spill on the shroud, the rim and the board is painted into emissive maps that fade as the parts lift apart. Form comes from painted shading (bracket, pipes, shroud, turned metal) and from contact shadows baked into the board.

Evenness check on a Top capture: bare board reads #0f0c0e and #100d0e (top left), #0c0a0c (top right), #120f11 and #0d0a0d (centre), #0d0b0d and #0f0c0e (bottom left), #0c090c and #121012 (bottom right), before the last small lift of the board tone. The reference itself is not even (its bare board runs from about #30 at the top to #05 at the bottom); that falloff is deliberately not copied.

## Registration

Traced features cannot drift: pixels map to millimetres by the one scale above. Overlays (`compare.mjs`) were read for the column right of the bracket, the area right of the core, the lower right and the strip under the bracket; pads, components and routing sit on the reference's with no doubled edges. Hand-traced parts are within a few pixels, except the lower fan disc, which sits about 14 px left of the reference's (the reference's disc runs off the card edge; ours is kept inside it).

Where tracing fails: a component with a dark body and bright ends is traced as its two ends only; dark chips on the dark board are not detected (the larger ones are in `layout.ts` by hand); glow halos round the lit fittings are excluded rather than traced; text is kept as print, not as parts.

## Second pass

- Tracer now also emits class `body`: 73 dark bodies found between matching bright end pairs (214 pairs matched by shape; a body is kept only where the gap is measurably paler than the board beside it). Traced blocks are bevelled.
- Shroud rebuilt from traced outlines: top plate with swept left shoulder, black right arm, a rounded cap and flat plate on each wing, the angled black bracket lower right, the bottom plate with its painted socket. Mottling is hard-edged flake patches at the reference's positions.
- Lit fittings have two stepped bezel rings, a lathed stepped reflector carrying the glow, and a domed transparent amber lens. The brass cone is fluted; its screw ring sits on the bezel.
- The right pipe has a flattened, ribbed end; the black block is re-traced with a painted faceted face and an orange plate under its cut.
- Contact shadows are smaller and lighter; the mask starts decoding at module load and the print fades in if it is late.

## Third pass

- Tracer adds class `chip` (a dark package between two facing lead rows): 4 found. Larger tan and gold parts carry a darker end band.
- Memory slots are geometry: a low body, two raised lands with contact-band texture either side of a channel, rim walls, a key bar; latches have a hinge pin and catch.
- Shroud plates have rounded five-segment bevels, taller steps and painted form shading; side clips are a black comb with separate pins.
- Lenses: three painted variants with machined-step rings, an off-centre highlight and a dark rim; the steel fitting is rebuilt with a knurled base, stepped rings and an off-centre eye.
- Hinge bar is one lathed rod with neck, waists and O-ring; end blocks have a round boss. Two standoffs carry ring lettering.
- Known defect: the shroud's bottom plate renders pale grey with no visible socket, although its painted tone is dark; the reference's is dark charcoal.

## Remaining differences from the reference (Top view)

- Shroud plates are correct in outline and tone but still read as flat plates with painted edges, not a heavy casting with rolled shoulders; the flaking is softer than the reference's.
- Lenses are deeper but still flatter and more evenly orange than the reference's glassy, swept highlights. Bezels carry no lettering.
- Even light by instruction: metals are flatter and the top of the board darker than the reference's.
- Standoffs are stepped rings with square, cross-slot and round centres, but lack the reference's engraved lettering and bright machined faces.
- Memory slot ticks are a tiling texture, coarser than the reference; they fade to black at Top-view scale. Latches are plain blocks; the orange tabs are simple lit slabs.
- Top-edge housings are still mostly plain blocks with printed labels, three slots and a keyhole; connector openings and pins are not modelled.
- Traced components have no leads or two-tone caps of their own beyond the traced print on their tops. Small dark chips without bright ends are still missed.
- Heat-spreader glyphs and chip markings are invented or blank. The left pipe is cut at the card edge.

## Fourth pass: the board as vectors, small parts lift

Asked for: board markings that are not blurry, and small parts that leave the board in the exploded view.

- **Components assembly.** Every part that is not laminate is out of the Board assembly: the generated small parts, the larger capacitors, chokes, ribbed block and lamps. They lift 34 mm as a sheet under the Controllers (50 mm). The Board keeps copper, mask, silk and holes only. A test asserts no part has `asm: 'board'`.
- **`pcb.ts` (runs in the page).** Traced blobs become parts: a dark body between two bright ends, or two alike blobs facing each other with no third in line, is one chip resistor; a dark package between lead rows is a small chip with leads; orange is a lamp; long thin bars are bare lands; the rest are capacitors or crystal cans by colour and shape. Centres within 0.1 mm are pulled onto one line. Runs of letter-shaped blobs are dropped and become label positions. Each part gets its footprint (two pads, or a pad per lead). Modelled parts get theirs: land grids under both sockets, pad rows under the memory slots, pads under chip leads, ball grids under leadless chips, plated holes under housings, capacitors, fittings and bracket posts, a stitched copper square under the thermal pad.
- **`route.ts` (offline, `node scripts/devices/trace-ember.mjs --route`, about 20 s) writes `routed.ts`.** 33 bundles of 3 to 14 parallel traces between parts (one wide corridor found on a lattice that only allows 0/45/90 moves, then offset once per trace, each end on a staggered via); a trace for every pad that has room (754 pad to pad by a maze search with the same angle rule, 766 straight to a via, 196 chip pins fanned to two rows of vias; 315 pads have no room and stay unrouted); 204 designators, 108 silk side lines and 69 labels placed where nothing is in the way. Trace 0.12 mm, bundle pitch 0.34 mm, via 0.42 mm. A fingerprint in `routed.ts` makes the tests fail if it is stale.
- **`print.ts` draws it** at 25 px/mm (12 on phones) on six tiles of 2183 × 2168 px with gutters, mipmapped, anisotropy 16. Lettering is one face (Inter, weight 600), cap height 0.45 mm and up. Board colour (#1b1a1b under the same gain) and pad gold are as before; traces are one shade paler than the mask. The contact shadows are now the board's occlusion map and fade as parts lift, so the bare board is clean when exploded.
- **Small parts as geometry.** Body and two metal terminals, banded capacitors, lamps with a lit lens, chips with leads; one vertex-coloured mesh. Resistor values, capacitor codes and crystal frequencies are printed from one atlas where the body is big enough.
- **Markings.** Chips, housings, module, heat-spreader, washers and the core window carry a maker, part number and date code. No string from the reference is kept.

Hand check: bundle pitch 0.34 mm with a 0.12 mm trace leaves 0.22 mm between traces; a 0.42 mm via beside a neighbouring trace leaves 0.34 − 0.21 − 0.06 = 0.07 mm, which is why the via rows are staggered by 0.56 mm and never side by side. At the closest zoom (0.2 of fit) on a 2.5× display the stage shows about 28 px/mm, so 25 px/mm of texture is magnified 1.1×.

Still short after this pass:

- Routing is plausible, not electrical: nets do not mean anything, 15 of 48 wanted bundles found no corridor, bundles end on via rows a few millimetres from the part they serve rather than on its pins, and there are no copper pours, length-matching meanders or differential pairs.
- Part types are guessed from blob colour; some rows of tiny pale parts are probably the reference's lettering or pad rows. Bare lands (the columns of bars right of the bracket) have no part on them.
- The core's circuit lines are still the traced raster (10 px/mm, upsampled); they are glowing lines, so the softness reads as glow, but they are not vectors.
- Memory-slot contact texture is unchanged and shows moiré at some zooms.
- The camera cannot pan, so only the board's centre can be seen at the very closest zoom.

## Fifth to seventh pass: the Layers view

A fifth camera button, "Layers". The first version (fifth pass) floated out drawn sheets (routing, thermal map, assembly drawing, schematic), supplier cards and tinted shells. The user rejected all of that as fake, so it was removed (sixth pass): `layers.ts`, the per-trace net classes in `routed.ts`, their tests and captures are gone. **Nothing exists in Layers that is not in Top, 3D and Exploded, and nothing disappears.**

What Layers does now (seventh pass: upright and close): the view stands the board on its lower edge (`upright: 175`) and looks from the front left, slightly above (`dir [-0.6, 0.26, 0.76]`, 5° lens, zoom 1.09). The board's own nine assemblies ease to a `layer` offset (in `model.ts`) and hang as planes parallel to the board face, each 14 to 16 mm nearer the viewer than the last. From this camera a plane that comes forward by r is seen 0.62 r further right and 0.26 r lower, so the nearer planes are slid back left by different amounts and lifted a little; each then lands in its own place, still over the board, with its footprint showing on the board beside it. Everything, the board included, is shifted 26 mm left so the fanned stack sits in the middle of the frame.

| Assembly | Offset x, toward viewer, down (mm) | Seen right of home, below home (mm) |
| --- | --- | --- |
| Board | −26, 0, 0 | 0, 0 |
| Components | −27, 14, −4 | 8, 0 |
| Controllers | −27, 28, −2 | 17, 5 |
| Memory | −8, 42, −16 | 40, −5 |
| Ports | −50, 56, −18 | 16, −3 |
| Core | −51, 70, −16 | 24, 2 |
| Processor | −49, 84, −10 | 34, 12 |
| Fittings | −39, 100, −26 | 52, 0 |
| Heat pipes | −62, 116, −22 | 44, 8 |

The depths keep the explosion's stacking order, so Layers and Exploded add without reordering; every depth is at most 0.85 of that assembly's explosion move. The tallest part is 16 mm and the planes are 14 mm or more apart with different slides, so once out they do not share space. The core keeps glowing in its own plane. The orange spill painted on the board, the core lamp and the board's contact shadows fade in Layers exactly as they do in Exploded, because the parts that cause them have left the board.

Hand check: the Processor plane is 84 mm forward and slid −49 − (−26) = −23 mm relative to the board, so it is seen 0.785 × (−23) + 0.62 × 84 = 34 mm right of its footprint and −10 + 0.26 × 84 = 12 mm below it.

Framing, read from `shots/ember/r7/assembled-layers.png`: the standing board with its planes fills about 92 % of the frame height and is centred; with Exploded the camera pulls back and everything stays in frame. The light multipliers were left as they were: the upright face reads no darker than in Top.

Set: white (three of the four references; the black board keeps its silhouette). Frame rate with contact shading was not measured reliably: headless readings on a shared GPU swung between 20 and 60 fps with the same settings.

Short of the references:

- The references show solid overlay sheets; here the planes are the real assemblies, and Components, Controllers and Fittings are scattered parts, so they read as loose groups in front of the board rather than sheets.
- All planes cascade to the same side (right), because the fan comes from the camera angle; the references mix directions.
- The floating planes throw no shadow on the upright board face, so depth reads from overlap and the oblique angle only.
- Nearest assemblies overlap the lower-depth ones heavily near the right edge (memory, pipes and the manifold stack up there).
- Mid-transition was not captured; neighbouring parts may clip corners while the planes separate.
