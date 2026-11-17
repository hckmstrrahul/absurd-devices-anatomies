# Frost: evidence

Frost is an original board. Nothing is traced from a photograph: the four renders in `docs/devices/presentation/` set the genre (white-mask single-board computer, near-isometric, white studio, parts staged as floating parallel planes) and the level of finish, not the layout. The layout, names and markings below are invented for this page.

## What comes from where

| Feature | Source |
| --- | --- |
| White solder mask, pale copper under it, black legend, gold mounting rings | Genre of ref-1 and ref-3; drawn from our own vectors (`print.ts`, `routed.ts`, `paint.ts`) |
| 90 × 70 × 1.6 mm card, four M3 holes on 82 × 62 mm centres, 8 mm brass standoffs | Invented; sizes typical of the class |
| 2 × 20 header on 2.54 mm pitch, 0.64 mm square pins 8.4 mm proud | Standard part dimensions |
| Stacked USB-A (13.2 × 18 × 15.6 mm), HDMI (15 × 11.5 × 6.2), 8P8C jack (16 × 21 × 13.5), barrel jack, micro-USB, microSD cage | Standard part envelopes, estimated to within about a millimetre; shells, cut-outs and tabs are our own drawing |
| Processor (15 mm, 17 × 17 balls at 0.8 mm) under a folded black fin with a wire clip | Invented; the references show a black serpentine clip, ours is a folded fin |
| Two 13 × 9 mm memory packages, one 11.5 × 13 mm storage package, PHY, PMIC, flash, level shifter, regulator | Invented placement; package sizes are typical |
| Tantalum capacitors (7.3 × 4.3 mm, amber), 5 mm inductors, crystal, CR1220 cell under a strap | Invented placement; standard case sizes |
| Four tactile buttons (two red), eight status lamps numbered 1–8 | Genre of ref-3; our own positions and names |
| Orange polyimide ribbon: out of a flip-lock connector, folded over, round the front edge, under it, out to a display | Genre of ref-2; the path and the 128 × 64 display board are invented |
| ~230 small components | Placed by rule in `layout.ts` (decoupling round packages, then rows); not hand-placed |
| Copper | Routed by `router.ts` on a 0.2 mm lattice at 0/45/90°, written to `routed.ts` by `scripts/devices/trace-frost.mjs` |
| Markings: FROST, HVIT WERK, GLACIER G4 GX4208-QB, KV4G16-093E, NF32G-E51, HW8211F, PQ3310, NQ25128, LS7719, HR1117-33 | All invented. The six-armed crystal mark is our own |

## Layers view

The Layers view adds nothing. The stage stands the whole device upright, facing the viewer, with the ribbon edge down so the ribbon hangs and curls under as it would if the board were held up. The camera is three-quarter from the front right and a little above (`dir [.55, .22, .8]`, 5° lens), on the white set. The seven assemblies the other views show then come off the face by the `layer` offsets in `model.ts` (mm; x sideways, y toward the viewer, z down the face):

| Assembly | Offset [x, y, z] | Where it hangs |
| --- | --- | --- |
| Board | 0, 0, 0 | Stays put, bare, showing its print and footprints |
| Ribbon & display | 0, 2, 0 | Eases 2 mm off the face only: it wraps the lower edge, with 2.25 mm to spare under the card |
| Ports | 0, 8, 0, then 20 right / 10 left | Off their holes and drawn outward, beside the card |
| Small components | 2, 12, −9 | A plane 12 mm off the face, slid up so their lands show below them |
| Header | 6, 20, −10 | Proud of the top edge, pin tails clear of the holes |
| Processor & memory | 24, 26, −10 | A plane 26 mm off the face |
| Heat sink | 18, 42, −16 | Nearest the viewer, beside the processor lid it covers when assembled |

Every rise is under two thirds of that assembly's explosion move, and the planes are ordered by depth so none shares depth where it shares ground. The outward slide of the two port groups is the one split of an assembly; it uses the assembly's two existing layers and is applied in `device.ts`. The stage holds the card's centre 115 mm up, so the display stays above the floor even with the explosion added. Leaving the view eases every offset back to zero.

## Motion model

Representational, in real units (`model.ts`). The load slider sets a demand that breathes between 75 % and 100 % of its set point. Power is 1.1 W idle plus 5.4 W × load; the die follows it through 9.5 K/W to a 24 °C room with a 5 s lag (sped up to be watchable). Between 72 and 80 °C the governor trims power by up to 38 % and steps the clock down. The pose drives the eight lamps (power, heartbeat, a four-step load bar, storage, network), the jack's link and activity lamps (one blink per 120 packets), the display and the four readouts.

## Hand check

Full load with no throttling: P = 1.1 + 5.4 × 1 = 6.5 W. Rise = 6.5 W × 9.5 K/W = 61.75 K. Die = 24 + 61.75 = **85.75 °C**, which is above the 80 °C hard limit, so the governor must act; `model.test.ts` asserts `steadyTemp(1) = 85.75` and that the simulated die stays under 80.5 °C at a 100 % set point. Idle: 24 + 1.1 × 9.5 = 34.45 °C.

## Known limits

- Real-time rasterisation: reflections come from one prefiltered studio room, so steel does not mirror neighbouring parts, and there is no bounced colour (a red button does not tint the mask beside it).
- Contact shading is screen-space and runs on the Layers and Close views only; shadows are a single soft shadow map.
- The ribbon is a thin tinted solid, not a scattering film.
- Lettering smaller than about 0.6 mm on the board is drawn but softens at the default camera distance.
