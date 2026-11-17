# Belljar evidence

Route: `/belljar`. Reference: `assets/belljar-reference.png`, one front view from slightly above. Belljar is a concept: nothing here is a real product.

Scale: the chrome bezel spans image x 753–1327 and is taken as 120 mm, so 1 px = 0.209 mm. Image point (1040, 1090) is the middle of the base top, at Y = 25 mm. The mapping is `px()` in `web/src/belljar/layout.ts`.

| Feature | Evidence | Implementation |
| --- | --- | --- |
| Glass cloche, rounded-arch front, thick wall, tinted foot | Visible | One closed solid, 4.5 mm wall, in the kit's refracting `crystal` (optical thickness cut to 1.5 so the dial stays sharp). Walls to a spring line at 119 mm, then half an ellipse 163 mm wide and 44 mm high, traced. Depth (90 mm) and squircle plan estimated. A pale blue band at the foot stands in for the tint |
| Grey studio backdrop, glossy floor | Visible | Sweep sampled from the image (#adaead top, #dedede floor) and the kit mirror floor at 0.42 |
| Chrome base, rounded rectangle, four feet | Visible | 168 mm wide, 19 mm thick, traced; 96 mm depth estimated from the visible top face |
| Round chrome bezel, copper rim | Visible | 120 mm bezel, 104 mm sight opening, traced; a 124 mm copper flange behind it and a copper lip inside it |
| Two chrome bells on angled posts, wire handle, black knurled crown | Visible | Rim centres, nut tops and handle path traced. Bell and post share one 23° axis (the image shows about 18° and 28°). The rims rest within 1 mm of the glass |
| Two chrome-and-copper legs | Visible | 40° off vertical, length solved so the feet stand on the base. A rear strut is invented so the clock can stand |
| White chapter ring, orange 1–12, black scales and small print | Visible | Canvas texture. The image's numerals are scrambled; these are placed correctly. Scale layout and legend are invented |
| Open centre with grey movement, rings, bridges, gears | Visible, not legible | 26 mm opening with a window above it, traced. Everything behind it is invented |
| Orange wiring over the movement | Visible | Four tubes traced from the image; called trip links, function invented |
| Two cyan vertical marks near the top | Visible | Modelled as alarm marks that light while the bells ring; function invented |
| White sword hands at about 10:09, sub-dial above centre, large centre boss | Visible | Start time 10:09:00; the sub-dial is the seconds dial on the fourth-wheel arbor |
| Hammer, stop lever, ports through the glass | Not in the reference | Invented. The hammer rests behind the crown and swings in a slot; ports are drawn as collars, the glass is not cut |
| Every wheel, tooth count, the 4 Hz beat, the alarm run | Not in the reference | Invented; in `layout.ts`, `model.ts`, `gearing.ts` |
| Case depth, back cover, keys, every dimension along the clock axis | Not in the reference | Invented |

## Movement

Involute teeth from `kit/horology.ts`. Every mesh shares a module and sits at exactly `centreDistance` (asserted in `model.test.ts`), and `gearing.ts` phases every driven arbor with `meshed()`.

| Train | Wheels (teeth) | Module | Result |
| --- | --- | --- | --- |
| Going | barrel 84 → centre pinion 12; centre 80 → third pinion 10; third 75 → fourth pinion 10; fourth 96 → escape pinion 8; escape wheel 20 club teeth | 0.45, 0.3, 0.3, 0.2 | 28,800 beats an hour |
| Motion works | cannon 12 → minute wheel 36; minute pinion 10 → hour wheel 40 | 0.3, 0.288 | 12 : 1 |
| Setting | stem clutch 16 (face teeth) · clutch wheel 28 and setting pinion 14 on one arbor ← idlers 60, 40, 40, 40 ← minute wheel 36 | 0.3 | setting arbor 12/14 turn an hour; idles with the motion works |
| Winding | stem pinion 20 (face teeth) → crown wheel 28 → 40 → 44 → ratchet wheel 56 on the barrel arbor; 30-tooth click wheel and pawl | 0.5 | 20/56 barrel-arbor turn per crown turn |
| Alarm setting | back knob pinion 12 → idler 48 → idler 48 → alarm wheel 48 round the hour pipe | 0.3 | knob turns 4× the alarm wheel |
| Alarm | alarm barrel 40 → strike pinion 10; 12-tooth strike wheel rocks the hammer verge | 0.4 | one tooth per hammer cycle |

Hand checks. Going train: 80/10 = 8, 75/10 = 7.5, so the fourth wheel turns 8 × 7.5 = 60 times an hour (the seconds hand). 96/8 = 12, so the escape wheel turns 720 times an hour; 20 teeth × 2 beats = 40 beats a turn; 720 × 40 = 28,800 beats an hour = 8 a second = 4 Hz. Motion works: 12/36 × 10/40 = 1/12. Barrel: 12/84 = 1/7 turn an hour, one turn in 7 hours. Winding: 20/28 × 28/40 × 40/44 × 44/56 = 20/56 = 0.357. Alarm: 6 s × 8 cycles = 48 cycles = 4 turns of the 12-tooth strike wheel = 1 turn of the alarm barrel, 96 strikes.

Centre distances: barrel–centre 0.45 × 96/2 = 21.6 mm; centre–third 0.3 × 90/2 = 13.5; third–fourth 0.3 × 85/2 = 12.75; fourth–escape 0.2 × 104/2 = 10.4; cannon–minute wheel 0.3 × 48/2 = 7.2; minute pinion–hour wheel 0.288 × 50/2 = 7.2, so the hour wheel is coaxial with the cannon.

Shown in real time, not clock time: the balance, hairspring, pallet fork and escape wheel always run at the true 4 Hz, whatever the rate. Everything else (hands, barrel, centre, third and fourth wheels, motion works, setting idlers) follows clock time. At 1× the two agree and the fourth wheel and escape pinion are in mesh; at 60× and 360× that one mesh is where the time-lapse splits. The alarm run (hammer, strike wheel, alarm barrel, stop lever, bells) is also in real seconds.

Simplified: the stem pinions are face-toothed rings, phased to the crown wheel by construction rather than by `meshed()`; the clutch stays in the winding position, so the crown never drives the setting train; the mainspring does not gate the clock; the escape wheel and pallets are not positioned tooth-to-jewel; the alarm cam and trip links are drawn but the trip is decided in the model.

## Verify

```sh
cd web && npx vitest run src/belljar
cd web && npx tsc -b
node scripts/devices/shot.mjs belljar shots/belljar Assembled 3D Front Side --page
node scripts/devices/shot.mjs belljar shots/belljar Exploded 3D Side
node scripts/devices/shot.mjs belljar shots/belljar Play 3D Front --wait=3500
node scripts/devices/shot.mjs belljar shots/belljar Assembled 3D --dark
node scripts/devices/compare.mjs assets/belljar-reference.png shots/belljar/assembled-front.png shots/belljar/cmp --crop=330,55,612,800 --ref=638,235,802,1000
```
