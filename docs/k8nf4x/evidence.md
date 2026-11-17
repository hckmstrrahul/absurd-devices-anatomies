# K8NF4X: evidence

Source photos: `assets/k8nf4x-reference.png` (top, keystoned) and `assets/k8nf4x-reference-angle.png` (oblique, rear I/O toward the camera).
Board size 293 × 198 mm is Albatron's published size for the K8NF4X (Socket 939, nForce4 4X, 4 × DDR, 1 × PCIe x16, 3 × PCIe x1, 2 × PCI).

## Scale calibration

The top photo is not a true top view: the far edge is 22 % narrower than the near edge. `scripts/devices/rectify-k8nf4x.mjs` maps it through the
homography of the four board corners — photo px (364,199) (1200,187) (1355,1450) (277,1467) → mm (0,0) (198,0) (198,293) (0,293) — onto a
5–8 px/mm top view with a 10 mm grid. Positions in `web/src/k8nf4x/layout.ts` are read off that image (X from the rear edge, Z down the photo).

Hand checks against standards, measured in the rectified photo:

| Feature | Measured | Standard | Error |
| --- | --- | --- | --- |
| PCI slot body | 88.6 mm | 84.8 mm | +4 % |
| Slot pitch (6 slots, 5 gaps) | 101.6 / 5 = 20.3 mm | 20.32 mm | 0 % |
| DDR DIMM socket body | 132.4 mm | 133.35 mm | −1 % |
| CR2032 holder | 22 mm | ≈ 23 mm | −4 % |
| nForce4 package across flats (45° diagonal 43 mm / √2) | 30.4 mm | 31 mm | −2 % |
| Retention-frame screws | 92 mm apart | 96.5 mm | −5 % |
| Rear I/O span | 137 mm | ≤ 158.75 mm shield opening | fits |

## Decision: photo proportions over standard sizes

The page is judged against these photographs, so where the photo and a connector standard disagree for a part visible from the Top or 3D
view, the photo wins: the red x16 slot (116 mm), the three blue PCIe slots (37 mm) and the SATA housings (17 mm) are built to the photo.
The overall scale still comes from the board's published size, and it agrees with the PCI slots, DIMM sockets and slot pitch (table above).

## Traced, estimated, invented

| Item | Source |
| --- | --- |
| Board outline, 6 mounting holes, 2 chipset heat-sink holes | traced |
| 4 DIMM sockets (lime, lime, purple, purple), key position, open white latches | traced; latch shape estimated from the angled photo |
| Slots: positions, colours, lengths, x16 latch | traced, at the photo's proportions: x16 116 mm (standard 89), blue slots 37 mm (x1 standard 25), aligned at the bracket end; contact pairs fill the longer bodies at the standard pitch |
| Socket 939, lever side, cam box, retention frame with side screws | traced; frame wall heights from the angled photo |
| nForce4 at 45°, bare die with old paste, no heat sink (as photographed) | traced |
| ATX 24-pin, 4-pin ATX12V, IDE1 red / IDE2 white, black FDD, 4 SATA (black, red, red, black) | traced; SATA housings 17 mm long as photographed (standard ≈ 11) |
| Yellow USB headers ×2, coloured front-panel caps, orange and red-capped audio headers, red CMOS jumper, lavender speaker header, PLCC BIOS + black header, CR2032 holder (empty, as photographed) | traced |
| 6 toroidal chokes (orientation, size), 12 electrolytics + 1 solid cap, 27 empty capacitor sites, DPAKs, square power inductors | traced (counts from the photo); heights from the angled photo |
| Rear I/O order: PS/2 (VRTU label), magenta LPT over teal COM + yellow coax (lot sticker), 2×USB, RJ45+2×USB, 3 audio jacks | traced from both photos; bases placed from the rear edge because the top photo shows their tops displaced by parallax |
| Super I/O, LAN, audio codec, clock-gen positions; empty QFP and SOIC sites | traced; part numbers (IT8712F, RTL8201CL, ALC850, ICS951462, Pm49FL004T) are plausible for this board, not legible in the photo |
| Albatron logo, K8NF4X badge, FCC and CE marks, PCIE1/2/3, PCI1/2, ASSEM., CHASSIS FAN, SPEAKER labels | traced as printed |
| Other silk text, designators, small passives (≈ 600 incl. SOT-23), trace fields, vias, copper pours | estimated: placed in the fields the photo shows, shapes invented |
| Motion model (load → CPU W → VRM loss and temperature, chipset temperature, lever interlock) | invented, hand-checkable (see model.test.ts) |

## Hand check of a number

At full load the processor draws 12 + 77 = 89 W. At 84 % efficiency the VRM loses 89 × 0.16 / 0.84 = 16.95 W; at 2.3 K/W that is +39.0 K,
so the VRM settles at 25 + 39.0 = 64.0 °C (test: `settles where the arithmetic says`).

## Round two: lighting and finishes

Kept (each read better against the photos, with no glare):
- Light: key 1.6 from nearly overhead (`dir [-.3,3,.7]`), environment 1, shadow map 1024 for softer shadows, exposure 0.82. Contact shading (`frame.ao`, radius 6 mm) now also in the 3D and Top views, so sockets, slots and chokes sit on the board.
- Soldermask: a satin finish (clearcoat 0.15 at roughness 0.55, low specular, faint blue sheen). The relief map now has copper pours a touch smoother and raised, traces raised, and a fine orange-peel speckle in height and roughness. Mask colours desaturated slightly toward the photo's blue.
- Metal: tin-plated shells are darker, duller brushed grey (base #b4b8bb, roughness ≈ 0.55) instead of near-white. Tin and gold contacts are rougher (0.48 and 0.42). Capacitor tops are duller aluminium with the stamped vent, and sleeves have a soft clearcoat.
- Copper windings: per-turn tone variation with dull oxidised patches (texture along the wire), a warmer copper.
- Plastics: white nylon moulding grain with almost no clearcoat; coloured plastics' clearcoat lowered and roughened, so slots and DIMMs have no white glare.

Tried and dropped: contact shading at 3.2 mm radius (no visible effect at board scale; raised to 6 mm).
