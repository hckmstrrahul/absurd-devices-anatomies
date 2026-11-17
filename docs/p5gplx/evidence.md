# P5GPL-X SE: evidence

Sources: `assets/p5gplx-reference.png` (top, taken at a tilt) and `assets/p5gplx-reference-angle.png` (from the rear I/O edge, about 50° up).

## Scale

- Board outline: ASUS narrow ATX, 12 × 7.2 in (305 × 183 mm). The ASUS P5GPL-X specification summary gives this size. The photo agrees with it: across the PCI slot row, 937 px of board width ÷ 5.18 px/mm (from the 85 mm PCI slot) = 181 mm.
- The top photo was rectified with a homography that maps four photo corners to plan corners: TL (364,175), TR (1192,132), BR (1372,1480), BL (392,1540) → (0,0), (183,0), (183,305), (0,305) mm. The script is `scripts/devices/rectify-p5gplx.mjs`, and the plan was traced at 8 px/mm.
- Hand checks on the rectified plan:

| Feature | Measured | Standard |
|---|---|---|
| PCI slot body | 86.9 mm | 85 mm plus end walls |
| PCIe x16 | 89.5 mm | 89 mm |
| PCIe x1 | 25 mm | 25 mm |
| Slot pitch | 20.4 mm | 20.32 mm |
| LGA775 cooler holes | 72.5 × 73.2 mm | 72 × 72 mm |
| 24-pin ATX row pitch | 4.4 mm | 4.2 mm |
| Pin-header caps | 2.54 mm pitch | 2.54 mm |

- Tall parts lean toward the top of the photo by about ⅓ of their height (tan 18°). Their bases were therefore taken from the nearer (lower) visible edge.

## Traced / estimated / invented

| Feature | Status |
|---|---|
| Board outline, 7 plated mounting holes, 2 plain holes, 4 cooler holes | traced |
| LGA775 socket position, load plate, lever path with hook and cam crank | traced; plate heights estimated (6.6 mm) |
| North-bridge heat sink: 43 × 42 mm, 8 fins cut in 4 (4 × 8 blocks in the angled photo), 2 white push pins | traced; height (27 mm) from the angled photo |
| ICH7 (31 mm BGA, intel / FW82801GB / TAIWAN, gold pin-1 mark) | traced; the second and third marking lines are not legible, so plausible text is used |
| 2 DDR2 sockets (black, white latches open), 10 mm pitch | traced |
| PCIe x16 (black), PCI ×3 (cream), PCIe x1 (cream), x16 retention arm, black wire from the x16 end | traced |
| 24-pin and 4-pin ATX, floppy (2×17), IDE (2×20), 4 SATA (2 black upright, 2 red flat), CHA_FAN header | traced |
| Header caps: mint 2×5, dark green, orange 2×8, two blue 2×5, the 20-pin multicolour PANEL row (colours read pin by pin) | traced |
| 6 jumpers (5 blue, 1 green), green SB_PWR lamp, CR2032 holder, PLCC32 BIOS in socket with label | traced |
| Super I/O, LAN and audio QFPs; clock SSOP; 10 SO-8s; 15 DPAKs; 2 crystals; axial part; 2 green film caps | traced positions; part numbers are plausible where not legible |
| 18 electrolytic capacitors (counted) with diameters 8/6.3/5 mm | traced; heights estimated |
| 3 flat copper toroids, 1 toroid on edge, 1 drum choke, 1 rod choke | traced |
| 28 unpopulated capacitor footprints (half-filled silk circles) | traced |
| Rear I/O: PS/2 stack (green over purple, yellow sticker), DB25 magenta with barcode label, coax, DB9 teal, brass-tinted USB pair, RJ45 over 2 USB, audio blue/lime/pink | traced z spans from the top photo; heights from the angled photo |
| Silk lettering: "P5GPL-X SE", outlined ASUS logo, FCC, CE, UL "E241810", connector names | traced positions; small text not legible in the photo is plausible |
| Copper pours, trace fields | traced as regions; individual traces are invented, routed by rule |
| ~1000 small passives and SOT-23s | invented, placed by rule in the open board |
| Board colours | sampled from the photo and matched within about 10% per region (`scripts/devices/tone-p5gplx.mjs`) |
| Motion: standby lamp, then PS_ON, load → VRM and north-bridge temperatures, Vcore droop | model; the board has no fan |

## Hand check of a number

At full load the CPU draws 22 + 62 = 84 W. At 86% regulator efficiency, the VRM loses 84 × (1/0.86 − 1) = 13.67 W. At 4.2 K/W, the VRM settles at 25 + 13.67 × 4.2 = 82.4 °C (tested in `model.test.ts`).

## Round two: lighting and finishes

- Lighting: a broader, softer key (1024 shadow map), with the room level now set through `frame.key.environment` (0.5) since the kit fix; the device's own workaround was removed. Contact shading also in the 3D and Side views (still 61 fps).
- Soldermask: satin clearcoat (0.18, roughness 0.68), a fine pebble in the relief so the sheen breaks up, copper pours slightly raised and smoother than bare laminate; the deep slot-field laminate stays flat.
- Metal: tinned shells duller warm grey (#dad8d2, rougher brush, own room map at 0.72), aluminium slightly darker and rougher, gold and tin contacts softer, enamelled copper windings with per-turn tone and occasional oxidation.
- Plastics: slots, sockets and connectors with almost no clearcoat and a soft sheen for a moulded edge; capacitor sleeves less glossy; vent tops matte brushed; chip epoxy rougher.
- Checked at dpr 2: Top and 3D against both photos, Close, Layers, dark theme. No glare on chip tops, capacitor tops, slots or the I/O shells.
