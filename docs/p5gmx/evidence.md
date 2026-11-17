# P5G-MX: evidence

What the model takes from the two photographs (`assets/p5gmx-reference.png`, top; `assets/p5gmx-reference-angle.png`, from the rear I/O side), what is estimated, and what is invented.

## Scale and mapping

The board is 244 × 183 mm (9.6 × 7.2 in; that is the micro-ATX width, and the ASUS manual gives the depth). The top photo is a trapezoid because the camera was tilted a little toward the front edge. A four-corner homography (`layout.ts` `CORNERS`, `toPx`/`fromPx`) maps photo pixels to board millimetres:

| photo px | board mm |
| --- | --- |
| (135, 300) rear-left | (0, 0) |
| (1460, 300) rear-right | (244, 0) |
| (1503, 1323) front-right | (244, 183) |
| (110, 1342) front-left | (0, 183) |

That gives 5.43 px/mm along the rear edge and 5.71 px/mm along the front edge. Tall parts lean away from the lens axis in the photo. `base()` corrects for that with a pinhole estimate (axis at photo (780, 900), lens about 450 mm up, taken from how far the PS/2 stack and the capacitor tops lean).

### Hand checks against standard parts

| Standard | Photo | Through the mapping | Nominal |
| --- | --- | --- | --- |
| ATX 24-pin, outer pin centres, 11 × 4.2 mm | x 797 → 1063 (266 px) | 46.6 mm | 46.2 mm |
| LGA775 cooler holes, a 72 mm square | 382–392 px across, 398–401 px down | 70.3 × 71.0 mm | 72 × 72 |
| PCIe ×1 slot | 137 px | 24.7 mm | 25 mm |
| PCIe ×16 slot | y 507 → 1015 | ≈ 90 mm | 89 mm |
| Northbridge FC-BGA | 188 × 191 px | 34.2 × 34.6 mm | 34 mm |
| CR2032 holder | 129 px | 23.3 mm | ≈ 23–24 mm |
| PCIe ×16 → ×1 pitch | 116 px | 20.6 mm | 20.32 mm |

These are checked in `model.test.ts`. The cooler holes come out 1–2 mm short of 72 mm, which suggests the photo has a little residual lens distortion. In the model the four holes sit on an exact 72 mm square, centred on the mean of the traced holes.

Worked example (24-pin): at the front edge the homography gives 1393 px / 244 mm = 5.71 px/mm. 266 px / 5.71 = 46.6 mm, against 11 × 4.2 = 46.2 mm, so 0.9 % long.

## Traced from the top photo (position and footprint)

| Feature | Notes |
| --- | --- |
| Board outline, 6 plated mounting holes (gold ring and 8 stitching vias), 4 bare cooler holes | holes from their centres |
| LGA775 socket: contact field, open centre, load plate closed, lever down the left side with the curled handle at the rear | field centre (1201, 751) |
| Northbridge: green substrate, bare die, no heat sink (the silk still reads HEATSINK1 and CLIP1) | (798, 826) |
| Southbridge heat sink: ribbed aluminium, fins running along x, two white push pins on the diagonal | (234–448, 1030–1240) |
| PCI (white), PCIe ×16 (black, with retention arm), PCIe ×1 (white) | ends traced |
| Two yellow DDR2 sockets, key break, white latches standing open at both ends | |
| ATX 24-pin and ATX12V 2×2 (white), right-angle blue IDE overhanging the front edge with its key notch, two red vertical SATA, two white 3-pin fan headers | |
| Pin headers: green AAFP, black SPDIF, shrouded CD, blue USB34 and USB56, F_PANEL, CHASSIS, small green 2×2, blue jumper caps on CLRTC and USBPW, COM2 | |
| 24 aluminium electrolytics (sizes 5, 6.3 and 8 mm; three with purple sleeves), 7 solid polymer caps (red/white tops) round the socket | count matches the photo |
| 2 flat toroids and 1 standing toroid, drum choke on the 12 V input, small green inductor, 9 D-PAKs | |
| Super I/O QFP-128, audio codec LQFP-48, clock generator SSOP, an SOIC by the LAN stack, the RS-232 SSOP by the serial port, two small SOICs, 2 HC-49 crystals | |
| Empty CR2032 holder (no cell fitted in the photo), SB_PWR green LED | |
| Two barcode stickers on the right edge, yellow sticker on the PS/2 stack | |
| 12 empty capacitor footprints (half-filled silk circles) and the empty buzzer circle | |
| Rear I/O, left to right: audio (blue, green, pink), RJ45 over two USB, VGA (blue, female), serial (teal, male), PS/2 (green over purple) | order and colours from both photos |
| Copper pour and routing, as they show through the mask | from the photo: `scripts/devices/trace-p5gmx.mjs` rectifies it into `traced-mask.png` |
| Silk: PCB MADE IN CHINA, AUDIO, LAN_USB12, HEATSINK1, CLIP1, P5G-MX, REV. 2.00G, ASUS wordmark, FCC, CE, C-tick, WEEE bin, socket keep-out octagon, northbridge outline | vector |

## Estimated

- Heights: I/O stacks (LAN 31.5, audio 27, PS/2 26, D-subs 12.5 mm), capacitor heights (11–15.5 mm), slot and DIMM heights. These come from the angled photo and standard parts.
- How dense the small passives are comes from the photo (`traced.ts`, a 2 mm grid of how busy each cell is). Their exact positions are placed by rule, not traced one by one.
- The colours were sampled from the photo and then adjusted so they render the same under the studio lights. For example, the pour reads #b07405 in the photo and the laminate #5f4a16.
- Connector names that are too small to read in the photo use ASUS's usual names (USB34, AAFP, CLRTC, CPU_FAN, CHA_FAN1, PRI_IDE, ATX12V, EATXPWR).

## Invented (not legible in the photo)

- Chip part numbers (IT8716F-S, ALC660-VC, ICS 954119CF, L2, ST3243EC, 74LVC14A), crystal frequencies and capacitor ratings. The ITE, Realtek and ICS logo shapes can just be made out in the photos.
- The 20 capacitors in the socket's open centre, set out as a grid.
- Sticker codes.
- The motion model (power-on sequence, the regulator and northbridge temperatures). The only lamp is the board's real SB_PWR LED.

## Not modelled

- The brief mentions a PLCC BIOS socket, but none is visible on this board in either photo, so there is none in the model.

## Lighting and finish (round two)

The changes below were made side by side with both photos, and all of them aim at soft studio light with no glare:

- **Light.** The shadow map is 1024 for softer shadows. Contact shading now also runs in the 3D and Side views, not only Close and Layers. The key light keeps the same direction; the room level is set to 1 now that the kit applies it.
- **Soldermask.**
  - There is a very fine orange-peel grain in height and roughness, so the satin sheen breaks up instead of mirroring the studio.
  - Copper areas are slightly smoother and raised in the bump.
  - The copper tone is a little less bright (#b6870c), to match the Top compare.
  - The mask still takes a dimmed copy of the room as its own environment map (0.12).
- **Metal.**
  - Solder and tin are duller grey (roughness 0.45–0.5), and gold contacts are softer.
  - The D-sub flanges and shells are grey nickel with brushed roughness, no longer near-white.
  - The heat sink is rougher, with deeper machining lines.
  - The toroid and drum-choke windings vary tone per turn, and about a quarter of the turns are dulled toward brown oxide.
- **Capacitors.** Electrolytic tops are grey aluminium with a fine roughness grain and a dimmed reflection.
- **Plastics.** The PS/2 colour rings are toned down; they had read as lit.
