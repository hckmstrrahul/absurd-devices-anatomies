# GA-P35-S3G — evidence

Sources: `assets/gap35-reference.png` (top, near-orthographic, rear I/O at the top) and `assets/gap35-reference-angle.png`
(the same board turned 180°, seen from the I/O side at about 55° elevation). Both 1588 px square; the "Varian 4" caption is ignored.
Tracing crops with a pixel grid: `scripts/devices/grid-gap35.mjs` → `shots/gap35/ref/`.

## Scale and mapping (layout.ts)

The top photo is a slight keystone (the camera leans toward the I/O edge). Board corners in px: TL (145, 313), TR (1455, 313),
BR (1491, 1206), BL (126, 1218). A pixel is converted to millimetres by inverting the bilinear map of that quad onto a
305 × 200 mm rectangle (`mm()` / `px()` in layout.ts; round trip tested).

| Standard seen on the board | Photo | Model | Standard |
| --- | --- | --- | --- |
| ATX 24-pin housing width | 856→1090 px | 52.4 mm | ≈ 52 mm |
| IDE shrouded header | 829→1092 px | 58.9 mm | ≈ 57 mm with ears |
| PCI slot length | 451→838 px | 86.0 mm | 84.8 mm body + ends |
| PCIe x16 length | 478→872 px | 87.6 mm | ≈ 89 mm |
| PCIe x1 length | 480→600 px | 26.7 mm | ≈ 25 mm |
| Slot pitch | 91–92 px | 20.6 mm → snapped to 20.32 | 20.32 mm |
| DIMM socket with latches | 722→1398 px | 151 mm | ≈ 150 mm |
| CR2032 holder | Ø 112 px | 24.8 mm | ≈ 25 mm |

Hand check: board width 305 mm is the real GA-P35-S3G width; the bottom edge spans 1365 px → 4.47 px/mm, and the ATX housing
(234 px / 4.47) = 52.3 mm agrees with the standard. The depth then follows from the photo as 200 mm; the PCI slot length agrees within 1 %.

## What is traced, estimated, invented

| Feature | Status |
| --- | --- |
| Board outline, corner radius, 3 large plated mounting rings with 6 vias, 4 small holes | traced |
| 5 PCI (white), PCIe x16 (light blue, with latch hook), PCIe x1 (black) — positions, lengths, key positions | traced; x positions snapped to 20.32 mm pitch |
| 4 DDR2 sockets (yellow/red/yellow/red), white latches, offset pairs as photographed | traced centres; standard length |
| Northbridge sink 45 × 48 mm, GIGABYTE band, fin pitch ≈ 2 mm, split channel, 2 white push pins | traced plan; height 22 mm estimated from the angled photo |
| Southbridge sink 36 × 35 mm with corner tabs and pins at TL/BR | traced plan; height 10.5 mm estimated |
| Intel boxed cooler: centre, Ø ≈ 91 mm shroud, 4 legs on a 72 mm square, half white/half black hub label, 7 blades, fan cable route and loose loop over the DIMMs, white plug lying off the bottom edge | traced in plan; heights (58 mm overall) estimated from the angled photo; blade/fin counts estimated |
| ATX 24-pin, ATX 12V 4-pin, IDE (green), FDD (black), 3 orange SATA + 1 empty SATAII1 footprint | traced |
| F_USB1–3 (yellow), F_PANEL (multicolour pin pairs), F_AUDIO (mint), CD_IN, SPDIF_O, SYS_FAN1/2, PWR_FAN, CPU_FAN | traced; pin counts from standards |
| Rear I/O: audio 3-stack (blue/green/pink), USB+LAN with barcode sticker, 2-USB stack, magenta parallel over teal serial with green sticker and brass standoffs, PS/2 green over purple | traced plan; heights from the angled photo. The angled photo shows a 4-high USB stack; the top photo's 2-high stack is followed |
| Super I/O (ITE, QFP), codec, clock generator (TSSOP) + crystal, LAN QFP, BIOS SOIC-8 in a dashed DIP outline, other SOICs | traced positions/sizes; marking text plausible (not legible in the photo) |
| 4 chokes with yellow 2R0 / 1R2 / 2R2 / 2R2 | traced (values legible) |
| 35 electrolytic capacitors (incl. 2 maroon-sleeved VRM caps at the right edge) | traced positions and radii; heights from radius |
| 10 D-PAK / D2-PAK transistors | traced |
| CR2032 holder with clip | traced |
| Silkscreen: REV:1.0, PCB MADE IN CHINA, ASSEM label, connector names, the four slogans, FSB1333 DDRII800/1066, FCC/GIGABYTE/GA-P35-S3G, D33C98, eco/WEEE/Pb/CE marks | traced (positions, sizes, rotations) |
| Model name | read as GA-P35-S3G (photo partly garbled) |
| Copper pours, trace bundles, vias | estimated: buses routed between the parts that connect, pours where the photo reads lighter; local short traces generated |
| Small SMD passives (~700) | invented placement by rule, in the zones where the photo shows them |
| LGA775 socket, load plate, lever and processor under the cooler | invented (hidden in both photos) |
| Underside copper | invented |

Colours sampled with the crop tool: background #d2d2d2, open mask #0f3c68 (lit) to #1b2f4d, yellow DIMM #c7ad25, red DIMM ≈ #8a1515,
PCIe blue ≈ #5fb0d8, gold sink mean #c38527 (highlights ≈ #e8b030), IDE green #4f8c1f, SATA orange ≈ #c46e15–#f09a1c, magenta #c14984.

## Round two: lighting and finishes

Lighting now takes effect after the kit fix: key 1.7, room 0.85, shadow map 1024 (softer), contact shading in 3D, Close, Side and Layers.
Changes kept because they read closer to the photos: mask a deeper, slightly greener navy with a fine satin speckle in colour and roughness,
traces and pours raised a little in the bump and slightly smoother; clearcoat rougher (0.6) so no softbox streak crosses the board;
rear I/O shells brushed tin-plated steel (grey, not white) with faint seams; gold sinks with machining streaks in the roughness, no clearcoat;
SATA orange given a matte finish (it washed to salmon under the room light); package tops and markings matte (0.7–0.72); capacitor tops duller;
shroud near-black; fan blades a shade lighter so they read against the hub; cooler legs turned into slim round push-pin posts; fin lower edge
brought down toward the board as in the angled photo. Tried and dropped: darker gold tint (went copper), clearcoat on gold (peach haze).
Still short: the mask reads a touch lighter than the top photo's navy and darker than the angled photo's royal blue (the photos disagree).
