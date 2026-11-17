# Chorus evidence

Route: `/chorus`. Reference: `assets/chorus-reference.png` (2000 × 1289 px, one front view). Chorus is a concept: nothing here is a real product.

Mapping: the plinth spans image x 350–1650 and is taken as 390 mm, so 1 px = 0.3 mm. X is measured from image x 1000, Y from the underside of the feet (image y 1150). See `web/src/chorus/layout.ts`.

| Feature | Evidence | Implementation |
| --- | --- | --- |
| Glass arch, flat bottom, rounded top corners, chrome tube edge | Visible | 355 × 274 mm, corner radius 80 mm, traced. Depth 132 mm is invented |
| Chrome plinth, stepped rounded edge, black feet, dotted deck | Visible | 390 mm wide, traced; 176 mm depth invented |
| Master clock: chrome hood, clear ring bezel, white dial, gold numerals, gold minute track, leaf hands, thin second and alarm hands, ball finial | Visible | Centre and radii traced (bezel 82 mm outer radius, dial 70 mm). Hands start at 08:10:16, alarm at 5:28, read off the image |
| Date sub-dial at the centre | Visible, unreadable | Rebuilt as a 24-hour sub-dial 18 mm below centre, driven by its own wheel |
| Gold Art Deco numerals | Visible | Raised gold solids built from bar and arc strokes; a geometric face, not the reference's exact letterforms |
| Pedestal with pale-green LCD | Visible | Traced; the reference LCD is blank, ours shows master time |
| Seven orbs: large green, clear Roman-dial, yellow, clear skeleton, cyan, lilac, small green | Visible | Centres and radii traced, then nudged by up to 3 mm so nothing touches |
| Rods, hooks, wires | Visible, vague | Two rear posts with goosenecks, brackets and collars: estimated |
| Movements inside the hood and orbs, back of the hood and pedestal | Not in the reference | Invented |
| Cities, offsets, chime, pendulum swing | Not in the reference | Invented; all in `web/src/chorus/model.ts` |

The brief mentions eight orbs; the image shows seven, one of which (yellow) has no dial. Chorus therefore has six satellite dials plus the master.

## Motion model

One input: master time in seconds, advanced at 1×, 60× or 600×. Offsets in hours from the master: Tokyo +9, Delhi +5.5, Kathmandu +5.75, St John's −3.5, New York −5, Chatham +12.75. A dial glows for five of its own minutes after each hour, so the dials chime at master :00 (Tokyo, New York, master LCD), :15 (Kathmandu, Chatham) and :30 (Delhi, St John's).

Hanging orbs swing ±3° in real time as simple pendulums, T = 2π√(L/g), g = 9.80665 m/s²:

| Orb | L (pivot to centre) | T |
| --- | --- | --- |
| Tokyo | 73 mm | 0.542 s |
| Kathmandu | 72 mm | 0.538 s |
| Delhi | 46 mm | 0.430 s |

Hand check: √(0.073 / 9.80665) = 0.08628; × 2π = 0.5421 s. At 08:10:16 the minute hand is at 616/3600 × 360° = 61.6°; Kathmandu reads 13:55:16, so the next chime is in 284 s (shown as "in 4:44").

## Clockwork (round two)

All gears are involutes from `web/src/kit/horology.ts`, defined in `web/src/chorus/works.ts`. Every mesh shares one module and sits at exactly `centreDistance` (asserted in `works.test.ts`), and is phased with `meshed()` each frame. None of this is in the reference; it is invented but arithmetically real.

Master movement (direct centre seconds: the fourth wheel is at the centre and carries the second hand).

| Mesh | Teeth | Module | Result |
| --- | --- | --- | --- |
| Barrel → centre pinion | 72 → 12 | 0.5 | barrel turns once in 6 h |
| Centre wheel → third pinion | 64 → 8 | 0.5 | third: 8 turns/h |
| Third wheel → fourth pinion | 60 → 8 | 0.4 | fourth: 60 turns/h = 1 rpm |
| Fourth wheel → escape pinion | 60 → 6 | 0.35 | escape: 10 rpm |
| Escape wheel | 15 club teeth | – | 10 × 15 × 2 = 300 beats/min = 18,000/h (2.5 Hz) |
| Centre → idler → cannon | 10 → 48 → 10 | 0.5 | 1:1, same sense: minute hand |
| Cannon pinion → minute wheel | 12 → 36 | 0.3 | 1/3 |
| Minute pinion → hour wheel | 10 → 40 | 0.288 | 1/4, so hour hand 1/12 |
| Hour pipe → idler → day wheel | 24 → 20 → 48 | 0.4 | 1/2 of the hour wheel: sub-dial hand once in 24 h |

Hand checks: 64/8 × 60/8 = 8 × 7.5 = 60. 12/36 × 10/40 = 1/12. Cannon and hour wheels are coaxial: 0.3 × (12+36)/2 = 7.2 mm = 0.288 × (10+40)/2. Also a ratchet (24 teeth) and click on the barrel arbor, a pallet fork with two stones, and a balance with a hairspring whose inner end turns with the balance.

Orb movements (Tokyo, Delhi, Kathmandu; scaled by orb radius / 36): barrel 60 → 10 (once in 6 h); centre 80 → 10; third 75 → 10 (80/10 × 75/10 = 60, fourth at 1 rpm); fourth 72 → 6 (escape 12 rpm); escape 15 teeth: 12 × 15 × 2 = 360 beats/min = 21,600/h (3 Hz); motion work 12 → 36 and 10 → 40 (1/12). The three plain orbs (St John's, New York, Chatham) are sealed slave dials.

Sync drive (linkage): a motor pinion on the back of the pedestal (8 teeth) drives a 24-tooth wheel on a line shaft behind the pedestal, so the shaft turns once per master minute with the motor at 3 rpm. A 16:16 crown pair at each end turns an upright shaft beside each post. The motor mesh is phased with `meshed()`; the crown pairs are drawn as crossed spur wheels and are not phase-checked.

Fast rates: the escape wheels, pallet forks and balances always run at their true real-time beat (5 and 6 beats a second), while hands and the other wheels follow clock time. At 1× the two agree exactly; at 60× and 600× the fourth-wheel-to-escape-pinion mesh therefore slips on screen, and fourth wheels (1 and 10 turns a second) may strobe.

## Glass and studio (round two)

The back pane and bent wrap of the enclosure are 4 mm `crystal` solids with rounded edges; the master bezel ring is a `crystal` clone (thickness 14, dispersion 0.5). The front pane is an ordinary clear solid with a brightened rim, because refracting glass in front would hide the refracting bezel and the orbs. Orbs are ordinary transparent shells with an inner wall and a rim that thickens at grazing angles. Backdrop sweep sampled from the reference (#c0c0c0 wall, lighter floor); mirror floor at 0.42.

## Verify

```sh
cd web && npx vitest run src/chorus
node scripts/devices/compare.mjs assets/chorus-reference.png shots/chorus/assembled-front.png shots/chorus/cmp --crop=218,100,832,672 --ref=345,130,1310,1025
node scripts/devices/shot.mjs chorus shots/chorus Assembled 3D Front Side --page
```
