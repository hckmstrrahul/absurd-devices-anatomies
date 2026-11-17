# Verdant: evidence

Reference: `assets/board-1-reference.png`, 1605 × 2589 px. The image is a rounded card that the board fills, so the card is modelled as the board.

Scale: 0.1 mm per pixel, giving 160.5 × 258.9 mm. Pixel (802.5, 1294.5) is the origin; image x is world +X and image y is world +Z. Every traced box in `web/src/verdant/layout.ts` is in reference pixels, read from a 3 × 5 grid of 2× crops plus four closer crops (hoses, right edge, lime field).

Hand check: the processor cover spans x 498–942 and y 1059–1585 px, so it is 444 × 526 px = 44.4 × 52.6 mm, centred at x = (720 − 802.5) × 0.1 = −8.25 mm. The test `maps the reference at 0.1 mm per pixel` asserts these numbers.

| Feature | Status | Notes |
| --- | --- | --- |
| Card outline, aspect, rounded corners | Visible | Corner radius 6.5 mm is an estimate; the image's corners differ slightly from each other. |
| Lime processor cover, window, ten edge holes | Visible | Positions traced. Thickness (3.2 mm) estimated. |
| Two vertical memory-slot pairs, four horizontal slots | Visible | Boxes traced; contact combs and printed part number are drawn, not copied. Height 4.6 mm estimated. |
| Two weathered steel blocks, base plate, clamp | Visible | Outlines traced. Weathering is procedural canvas noise, so the blotch pattern does not match the photograph. Heights (13 and 10.5 mm) kept low to limit parallax from the top camera. |
| Machined cylinder assembly, top right | Visible, simplified | A rounded head, two lying cylinders and a clip stand in for a more intricate assembly. |
| Hose bundle, brass pipe, ferrules, printed hose text | Visible | Centre lines traced by eye at about ten points each; the exact weave between hoses is approximate. Text is invented glyphs. |
| Silver can capacitors (4), black can, gold-topped cans | Visible | Centres and radii traced; markings are approximations. |
| Round posts with the black ribbon between them | Visible | Traced. |
| Lower socket (black chip, pale pad, grey ribbed sides, lime frame) | Visible | Traced. |
| Lower-left socket (pitted frame, black chip, pale label) | Visible | Traced. |
| Left bracket with four round bosses | Visible, simplified | Bosses traced; the flat arm is a flattened tube rather than a pressed plate. |
| Right-edge connectors, jacks and housings | Visible, simplified | Each is placed and sized from the image, but built from rounded blocks, rings and lying cylinders; fine detail (screws, springs, knurling) is mostly absent. Parts that run off the card are clipped at its edge. |
| 57 chips: QFP with gold or silver leads, plain packages, gold-framed chip, pale emblem chip, dial chip | Visible | Boxes traced. Lead counts follow each package's edge length at a fixed pitch, not counted from the image. Markings are invented. |
| Inductors, ferrite comb, terminal blocks, fins, headers, oscillators | Visible | Traced as blocks with drawn top detail. |
| Tiny passives and their pads | Traced, then regularised (round seven) | Position, kind and colour are measured from the image; size is the nearest standard chip size and the centre is put on a 0.2 mm grid (up to 0.1 mm from the measured place, 0.4 mm when nudged). |
| Traces, vias | Invented (round seven) | Routed by a grid router between the lands; pitch, width and colour follow the reference, individual routes do not. |
| Silk-screen legends and outlines | Invented (round seven) | Drawn footprints, designators and net names in one stroke typeface. The reference's lettering is illegible, so none of it is copied. |
| Lime field, dark mask areas, yellow edge stripe | Visible | Zones traced as polygons and soft boxes. |
| Soft contact shade under parts | Estimated | Painted on a separate sheet, offset to the lower right like the photograph's key light; hidden when the board is exploded. |
| Status LEDs, pulses along traces, glowing die, pad and pipe | Invented | Representational Play animation only. |
| Workload model (load, clock, power, temperature) | Invented | First-order lags; 4.2 GHz and 67.04 °C at full load by construction (see tests). |

No pixel colour from the reference image is shown in the scene. From round four to round six the board print was painted from a mask measured from the image; since round seven it is drawn from vectors and the mask is only a checking aid (`shots/verdant/traced-mask.png`).

## Round two

- Lighting uses the kit's `frame.key` (key from the upper left, low environment); nothing reaches into the stage. Exposure and mask tones were set by comparing mean colours of twelve matching regions (`shots/verdant/means.sh`); after the last calibration they agreed to within about 10 levels per channel, the model slightly darker and less blue in the top third.
- Rebuilt from closer crops (`ref/top-a.png`, `top-b.png`, `edge-a.png`, `edge-b.png`): the large block as an L of pitted steel with a sunk panel and a pocket holding a U-shaped machined clamp; the cylinder assembly as turned parts with two bright bands and a white clip; a pointed leaf clip; eight hoses with layered ferrules; flanged jacks with collars, stepped barrels, counterbores and corner screws; a pressed-plate left bracket.
- Every package except the fifteen the image shows as leadless now carries individual leads (default: silver, along the two long sides). Lead counts still follow edge length at a fixed pitch.
- Memory slots have modelled rails and latch hooks over a shelf that carries the drawn contact combs.
- About 5,200 passive footprints and 70 via fields are sown from fixed seeds; these remain estimates of density, not traced positions.

## Round three (board print)

- The random copper pours and mask grain are gone; the mask is a clean dark gradient with brightness kept for the upper-left corner and the lime field. Tone was checked on a 6 × 10 grid of luminance means (`shots/verdant/grid.mjs`): 52 of 60 cells are within 16 levels of the reference, overall mean RGB 49,64,45 against 52,66,52.
- Traces are thin parallel buses on a 45° grid: square exits from the processor and lower socket that turn diagonal, and long diagonal runs in the lower right. Directions follow the photograph; individual routes do not.
- Passives are sown as whole aligned blocks (one to three rows on a 4 px grid) with a clear gap between blocks: about 2,300 footprints, down from 5,200.
- The die window carries a drawn, faint diagonal reflection. Black housings, slot bodies and round caps use a clearcoat.

## Round four (traced print, even light)

- **Tracing.** `node scripts/devices/trace-verdant.mjs` reads `assets/board-1-reference.png` and, for the middle of the board, the sharper crop `docs/verdant/reference-centre.png` (1370 × 1366 px, 0.6 reference px per pixel). The crop is registered on the lime cover: scale 0.6000 from its crisp side edges, offset (307.4, 901.2), covering reference x 307–1129, y 901–1721. Everything is measured at the board texture's resolution, 2539 × 4096 (1.58 × the reference, 15.8 px per mm); outside the crop that is an upscale of an image with 10 px per mm, so the finest lines there are soft.
- **What is measured.** Copper under the mask is the white top-hat of luminance (radius 4 reference px) on green pixels, so it follows local contrast rather than a global threshold; specks under 26 px are dropped. Pale pixels are split by a 2 px opening into solid marks (pads, tinned lands, bodies) and thin ones (silkscreen). These go to `web/src/verdant/traced-mask.png` as red, green and blue. 40.6% of the image is bare board; of that 9.6% is copper, 9.3% pads, 6.1% silk.
- **Parts.** `web/src/verdant/traced.ts` lists 1,701 small-part rectangles (pairs of lands with a body between them, solid pale bodies, and the insides of printed outline boxes) and 22 small dark packages. After dropping bare footprints and anything touching a hand-modelled part, the scene places 1,462 small parts (625 pale or metal, 611 dark-bodied, 225 tan, 1 gold; 1,042 of them with metal end caps) and 21 leaded packages, as instanced meshes in the sampled body colours.
- **Skipped.** Every hand-modelled footprint (grown 4 px), the hose and cable runs, the pressed bracket, the right connector column and the machinery field at the top right. The board under those is plain mask.
- **Checked.** Overlays of the Close capture on the reference for the four sides of the cover (`shots/verdant/r/{top,bottom,left,right}-overlay.png`). After the registration fix (the reference's shaded top and bottom cover edges read about 2 px short, which had stretched the crop vertically) parts and lines land on the reference's within about 1–2 reference px on the top, bottom and left; some lines beside the right memory slot still show a 1–2 px double edge.
- **Known failures of the tracing.** Many of the smallest parts are found only as print (lands and outline) with no 3D body, because at 10 px per mm they do not separate; rows of parts that touch sometimes come out as one wider body; a few marks inside silkscreen lettering become parts; shadows beside tall parts hide copper that is really there; colour classes are coarse (pale, dark, tan, gold).
- **Light.** The key is a gentle parallel light and most light comes from the environment (`key.intensity` 1.3, `environment` 1.15, 1024 shadow map). Median bare-mask luminance in a dpr-3 Top capture: top left 50, top right 45, centre 45, bottom left 47, bottom right 46 (spread 11% of the mean). Depth comes from the baked contact shade (a tight seat plus a soft skirt under every footprint, hose and the bracket).
- **Finishes.** Steel blocks use a cloud-based oxide map (colour, roughness, bump); smooth metals, black housings, chip bodies and the cover share a wear roughness map; the cover has a drawn radial sheen; the die sits 2.9 mm down its well; hoses are 20% thicker with ribbed sleeves.
- The cover has ten edge holes in the reference (three top, three bottom, two each side), and ten are modelled.

## Round five (second pass on the traced board)

- **Mask and copper colour.** Sampled from `reference-centre.png` by percentile over green pixels: bare mask median (4,69,34) in the upper half and (4,49,23) in the lower; copper lines around (81–98, 109–144, 80–99). The drawn mask is `#063a1b`, which renders at about (8,58,28) everywhere; copper renders at about (88–109, 117–156, 81–97). Evenness after the change: median bare-mask luminance 43.7 / 39.7 / 39.9 / 41.2 / 40.0 (top left, top right, centre, bottom left, bottom right), a 10% spread.
- **Registration.** After the cover-based fit, each cell of a 9 × 9 grid over the sharper crop is slid to its best match against the reference (least absolute luminance difference). Every cell asked for the same move, 0–1 px left and 3–4 texture px up (about 2 reference px), so the crop is now laid 2 px higher than the cover fit alone put it. The right-hand overlay no longer shows doubled lines.
- **Tracing changes.** Wide pale blobs are cut into individual parts at the regular brightness dips between neighbours. Outline-box interiors must be rectangular (fill ≥ 0.72), which removes most lettering. The pale threshold rises with local brightness, which stopped lit copper in the upper-left being read as pads. Dark packages must be neutral in colour (dark green patches are shadow) and take leads only on sides where solid pale metal is found; a printed outline alone does not count. Nothing traced is placed within lead reach of a hand-laid leaded package.
- **Counts now.** The tracer finds 1,826 small-part rectangles and 15 dark packages; the scene places 1,493 small parts (779 pale or metal, 440 dark-bodied, 272 tan, 2 gold; 1,181 with metal terminations) and 13 packages. Bodies have an eased top edge; tan and gold parts stand 1.5 × taller. The page caption reads 5,410 parts.
- **Invented, lower confidence.** Under every hand-modelled footprint and in the skipped regions the reference cannot show the board, so routing of similar pitch and density is drawn there procedurally (620 seeded runs, clipped to those areas, fainter than traced copper). It is not measured from anything. It exists so the exploded view does not show blank mask.
- **Still weak.** Small parts are still boxes with terminations, not modelled bodies. Many of the very smallest remain print only. A few lead rows of traced packages are wrong (sides missed or outline-fooled). The dense resistor arrays right of the cover are partly merged.
- **Pop-in.** A plain copy of the board covers the print until the mask has been decoded and painted, then fades over 350 ms.
- **Other parts.** Jacks have a flat dark face with a centre pip (dark jacks: black ring, bright inner ring, hollow) as in the reference; lying barrels carry a drawn tone round their girth and an engraved mark; the `k-yoke` block was removed because the reference shows dark board with test lands there; steel patina is finer and lower in contrast; the cover's ten holes all read as bores (the four side ones did not cut before); the left clip is pale brass in five leaves; leadless hand-laid packages have a fine row of edge lands; the large QFP has long gold leads on all four sides.

## Round six (shapes, connectors, patina)

- **Small-part shapes.** Chip resistors are a pale ceramic base with a dark film on top and metal ends; ceramic capacitors a tan body between metal ends; larger tan and gold blocks stand taller and carry a polarity stripe; small dark packages under 1.7 mm are transistor outlines with three leads (two and one) or five (three and two); navy chips have rounder corners and a wider bevel. All are instanced.
- **Lead rule for traced packages.** Leads go on the edges where the tracing finds solid pale metal. When it finds none, a package gets leads on both long edges, unless it is a large square, which is left leadless. So lead sides on those are a rule, not a measurement.
- **Tracing.** Outline interiors are also searched after thickening the print by one pixel, which closes hairline breaks. Hand-marked lettering blocks (`TEXT_ZONES` in layout.ts) are kept as silkscreen but never produce parts. The strip of printed text at the lower right edge is now traced instead of skipped.
- **Connector column.** Flanges are two layers with domed screws; sockets have an outer barrel (knurled where the reference's is), a proud inner ring and a face or bore; the twin-jack block has two raised plates; there is a threaded screw, a hex nut with a washer, an oval link and a pivot boss. Forms are still simplified from the reference.
- **Steel.** Oxide blooms now have granular edges (per-pixel jitter) and the plate is mid-to-dark grey. The ribbed hose sleeves added in round four were removed; they are not in the reference.

## Round seven (the print as vectors)

The print was soft because it was shown from a mask that is only as sharp as the reference (10 px per mm, with AI-garbled edges). It is now drawn from vectors and nothing on the board is shown from that mask.

- **Small parts.** `sow()` in `layout.ts` fits each traced part to the nearest of five chip sizes (0201, 0402, 0603, 0805, 1206; larger bodies keep their size rounded to 0.2 mm) and puts its centre on a 0.2 mm grid. A part that then fouls a neighbour, a package's leads or a hand-laid footprint is nudged up to 0.4 mm, else dropped: 1,447 placed (was 1,543). Traced packages (39) have their boxes on the same grid.
- **Lands and silk (`print.ts`).** 8,234 lands, each under a modelled terminal or lead: two per chip part, one per lead of every package, fine rows and a centre land under leadless packages, a 1.2 mm land grid under the processor (1,143, open in the middle), contact rows and a grid under the lower socket, a ball grid under the lower-left socket, a comb under every memory-slot contact row, two lands and a polarity mark under each can, plated holes under connectors, posts and bosses. Outlines, pin-1 marks and 805 pieces of lettering: designators (R, C, L, U, Q, D, J, Y, FB, HS, TP, numbered in order) wherever clear board lies beside the part, net names (`CPU_VRM`, `DIMM_A1`…`DIMM_C4`, `JTAG`, `+12V`, …) and a part-number block (`VERDANT MB-160`, `PN 60-0417-02 REV 1.07`, `94V-0 2614`). All of this is invented; no real maker's marks are used. Lettering is one stroke typeface defined in `print.ts` (capitals, digits, punctuation on a 4 × 6 grid), drawn as round-ended lines.
- **Copper (`router.ts` → `routed.ts`).** `node scripts/devices/trace-verdant.mjs --print-only` runs an A* router on a 0.2 mm lattice over the lands: 2,665 traces and 786 vias. Every segment is at 0°, 45° or 90°, turns are 45°, and every trace starts and ends on a land or a via (asserted by the tests). Buses run from the processor's edge lands to the slots, the header and the lower socket (100 of 176 wanted found a way; the left side is the poorest, 7 of 40); 1,640 short runs join neighbouring lands; 786 lands drop to a via on a stub; 133 longer runs join vias. The six Play pulses each follow one routed trace. Routes are not measured from the reference.
- **Painting (`paint.ts`, `textures.ts`).** The board top is 2 × 4 tiles, each a 2,046 × 1,651 px colour sheet (25.5 px per mm; the old sheet was 15.8, and effectively 10) with a half-size relief sheet, mipmapped, anisotropy 16. With the camera at its nearest (0.2 of fit) on a 2.5× display the Top view shows about 26 screen px per mm, so the print is drawn about one to one. Phones (under 700 px wide) get half that. Mask `#063a1b` and the copper screen colour (116,140,90) are unchanged; lands are tin (208,202,180) or gold (212,174,92). The lime field now has a crisp edge. There is no image to wait for, so the fade-in veil is gone.
- **Exploded.** The small parts and status LEDs are a layer of the board assembly that lifts 13 mm, so they hang as a sheet between the board and the ports. Copper, mask, silk and the pulse sprites stay. Checked in `shots/verdant/r7/exploded-3d.png` and `exploded-side.png`: nothing else is left on the board (the bracket and bosses that look seated in the side view are 24 mm up, nearer the camera).
- **Text on parts.** Nonsense strings are replaced: slot rails read `DIMM_A2 DDR5 288P 1.1 V SMT`; packages carry a part number and a date and lot code (`TR902 / 2533`); cans read `16 470 105C` and `POLY 680`; hoses `COOLANT HOSE EPDM 3/8 ID WP 1.0 MPA`; housings `VERDANT MODEL 3 · IO-2`, `USB3`. All invented.
- **Checked by eye.** `shots/verdant/r7/`: `assembled-close.png`, `assembled-top.png` (dpr 2.5), `z-centre.png` and three tilted captures at the zoom limit, crops `zc-a` to `zc-d` (both strips between the cover and the slots, the regulator cluster, the left package field), and painter previews of regions the zoomed camera cannot centre on (`shots/verdant/print-*.png`). `scripts/devices/check.mjs verdant`: pass, 56 fps, load 3.0 s, no page errors.
- **Still short.** The camera cannot pan, so away from the centre the print is only seen at the zoom limit obliquely. Routing is plausible, not a real netlist: some traces hook round a land to enter from behind, a few wrap a package in nested loops, and under the slots some run between contacts. Designators are missing where parts are packed tight (0201s never get one). A few traced parts abut a hand-laid part. The relief (bump and roughness) is half resolution, so the sheen at a trace edge is softer than the colour edge. Board routes no longer follow the reference's routes at all.

## Round eight and nine (Layers view)

Round eight added a Layers view with four drawn sheets (routing, thermal, assembly, schematic), three supplier cards and tinted parts. The user rejected all of it as fake, and round nine removed it: `layers.ts`, the sheets and their shades, the cards, the tint shells, the invented inner routing layer, the thermal field and their tests are gone. Nothing exists in Layers that is not in Top, 3D and Exploded, and nothing is hidden there except the baked contact shade (which also fades in Exploded, since it would otherwise stay under parts that have moved).

Layers now only rearranges the six real assemblies, using the kit's `layer` offset in `model.ts` (mm from the assembled place: slide x, rise, slide z):

| Assembly | Layer offset | Explosion rise | Slides toward |
| --- | --- | --- | --- |
| Cooling | −8, 54, −22 | 150 | top of the board |
| Processor | 14, 48, −16 | 122 | top right |
| Power | −22, 38, −8 | 96 | left |
| Memory | −18, 32, 16 | 72 | lower left |
| Controllers | 10, 24, 22 | 48 | bottom |
| Ports | 24, 11, 4 | 24 | right |
| Board | none | 0 | stays, with its print, footprints and small parts |

Each rise clears the tallest part of the plane below (hand check: ports reach 10.5 mm, 11 + 10.5 = 21.5 ≤ 24 for the controllers), is under 70% of the explosion move, and every pair of slide directions is at least 30° apart; a test asserts all three. The view is `dir [-.4,1,.68]`, `lens 5`, `zoom 1.14`, the white studio backdrop and contact shading for this view only (`ao.views:['layers']`).

Checked in `shots/verdant/r9/`: `assembled-layers.png`, `exploded-layers.png` (both inside the frame), `assembled-layers-dark.png`, `assembled-top-dark.png`, `assembled-3d.png`. No page errors; 20 tests pass.

Still short: the assemblies are groups of separate parts, not sheets, so Power and Controllers read as scattered parts floating at one height more than as a plane. During the half-second ease, rises and slides run together, so a sliding part can briefly pass through a taller neighbour from the plane below; at rest nothing intersects. Small parts stay on the board in Layers (they belong to the board assembly), and lift only in Exploded.

## Round ten (Layers upright)

The Layers view now stands the board upright (`upright:170`) and looks at it three-quarter from the front left, slightly above: `dir [-.68,.16,.72]`, `lens 5`, `zoom 1.06`, `light {environment 1.6, key 1.2}`. Still only the six real assemblies; the table in the round-nine section is superseded by this one (mm: sideways, off the face toward the viewer, down the board):

| Assembly | Layer offset | Explosion move |
| --- | --- | --- |
| Cooling | −14, 84, 10 | 150 |
| Processor | −6, 72, 2 | 122 |
| Power | −24, 58, 4 | 96 |
| Memory | 10, 44, −10 | 72 |
| Controllers | −14, 30, −8 | 48 |
| Ports | 6, 14, −3 | 24 |

Each comes off the face at least the tallest part of the one below further (hand check: memory 44 + 5.4 = 49.4 ≤ 58 for power), no more than 70% of its explosion move, slides more sideways than up or down, differs from every other slide by at least 8 mm, and none moves down past the board's lower edge (memory, controllers and ports, which reach that edge, slide up). The test asserts these. From this camera a plane nearer the viewer also shifts right on screen by about 0.68 mm per mm of depth, which is what makes the depth read; the slides are kept small so that shift is not cancelled.

Checked in `shots/verdant/r10/`: `assembled-layers.png` (board with planes fills about 90% of the frame height), `exploded-layers.png` (pulls back, all in frame), `assembled-3d.png` after leaving Layers. No page errors.

Still short: the board's edge thickness shows only as a thin line on the left; the assembled stack sits slightly right of centre because every plane shifts right with depth; Power and Controllers still read as scattered parts, not sheets.
