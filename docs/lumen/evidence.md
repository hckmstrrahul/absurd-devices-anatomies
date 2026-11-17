# Lumen: evidence

Reference: `assets/lumen-reference.png` (2000 × 1328 px, front view from slightly above).
Scale: the chrome frame spans x 462–1540 px and is taken as 240 mm, so 1 px = 0.2226 mm (`layout.ts`, `px`).
The device is fictional; sizes are a consistent guess, not measurements of a real object.

| Feature | Status | Notes |
| --- | --- | --- |
| Rounded chrome frame, 240 × 164 mm front, corner radius 24 mm | Visible | Traced. Depth (68 mm) and the plain chrome band behind the bezel are invented; the image shows no side. |
| Clear front glass | Visible | A 3.2 mm refracting pane with rounded edges; flat, where the reference pane may be slightly domed. |
| Rear bezel, back glass, eight rear screws | Invented | The reference shows light through the case, so the back is glazed. |
| Carry handle, two ball finials, gold right collar | Visible | Traced. The grip is a closed two-rail loop; its exact section is estimated. |
| Gold knob on the right flank | Visible | Function (brightness) invented. |
| Two dome feet | Visible | Built as four (two more behind) so the case can stand. |
| LED strip inside the frame, colours by position | Visible | 120 emitters is an estimate; colour stops traced by eye (`model.ts`, `STOPS.prism`). Gap and connector at top centre are visible. The opal diffuser tube over the emitters is inferred from the continuous glow. |
| Backdrop and floor | Visible | Sweep sampled from the reference (wall #a9a8ac, floor #f1f0f1); the mirror floor follows the coloured reflection under the reference. |
| Square silver dial, ridged top and bottom bars | Visible | Traced position and size. |
| Scattered Roman numerals and marks | Visible, approximated | Same kind and rough placement of marks; not a copy of each glyph. Wording at the bottom is invented. |
| Oval recess, chrome X strut | Visible | Traced centre and radii. |
| Two orange skeleton hands, thin orange second hand, slim dark hand | Visible | Drawn at 10:10:02. The dark hand is treated as a set hand parked at 10:30. |
| Motion works and transfer idlers behind the dial | Invented | Hidden in the reference. |
| Left column: black disc with white bar, green glow, gear cluster, gold wire loops | Visible, reinterpreted | Read as a dark screwed balance under a white enamel cock, with a beat lamp behind and a full going train below. The image shows a gear cluster, not this train; every tooth count is invented. Wire outline follows the keyhole shape in the image. |
| Left glass globe with cyan-lit gauge | Visible | Read as a 24-hour gauge. |
| Right glowing cyan bulb | Visible | Mushroom-shaped element as in the image. |
| Right brass fittings and small white gauge | Visible, simplified | Gauge shows ring level. The bellows pump, flap valve, sector and capsule behind the gauge are invented. |
| Right flask with cyan glow and gold bell cap | Visible | Glowing stack inside is a simplified version of the cyan structure in the image. |
| Gold circuit strip along the bottom | Visible | Component layout invented. |
| Driver board lying on the floor, wiring, stands and spine posts | Invented | Needed to hold and feed the visible parts. |
| Motion: hands, ring rotation, beat, pulses | Invented | The still image shows none of it. |

## Wheel work (all invented, all asserted in `model.test.ts`)

| Pair | Teeth | Module | Centre distance |
| --- | --- | --- | --- |
| Barrel → centre pinion | 72 → 12 | 0.32 | 13.44 mm |
| Centre wheel → third pinion | 64 → 8 | 0.32 | 11.52 mm |
| Third wheel → fourth pinion | 60 → 8 | 0.32 | 10.88 mm |
| Fourth wheel → escape pinion | 64 → 8 | 0.32 | 11.52 mm |
| Escape wheel | 15 club teeth | – | – |
| Centre arbor → idler → minute drive wheel | 48 → 120 → 48 | 0.5 | 42 mm each |
| Fourth arbor → idler → seconds wheel | 48 → 120 → 48 | 0.5 | 42 mm each |
| Cannon pinion → minute wheel | 10 → 30 | 0.6 | 12 mm |
| Minute pinion → hour wheel | 8 → 32 | 0.6 | 12 mm |
| Gauge pinion → sector | 10 → 60 | 0.25 | 8.75 mm |

- Centre arbor to escape wheel: 64/8 × 60/8 × 64/8 = 8 × 7.5 × 8 = 480 turns an hour. 480 × 15 teeth × 2 beats = 14 400 beats an hour = 4 a second.
- Fourth arbor: 64/8 × 60/8 = 60 turns an hour, so it carries the seconds. Barrel: 72/12 = 6 hours a turn.
- Motion works: 30/10 × 32/8 = 3 × 4 = 12, and 10 + 30 = 8 + 32, so the hour wheel sits on the cannon pinion's axis.
- The cannon pinion is a friction fit on its drive wheel. At 1× nothing slips. The Rate input sets the hour and minute hands forward through that fit while the train, the seconds hand and the escapement keep their real 4 Hz beat.
- Gauge: 240° of needle over 6:1 is 40° of sector; its 4 mm pin moves the capsule plunger 4 × sin 20° = 1.37 mm either side of mid-scale.
- Pump: 2 mm crank, 8 mm rod, one turn a second; the bellows board rides 6 to 10 mm above the crank and is highest on the second, when the tube pulses.

## Hand check

Start time 10:10:02 is 36 602 s after midnight.

- Hour hand: 36 602 / 43 200 × 360° = 305.02°.
- Minute hand and ring phase (one lap per hour): 602 / 3600 × 360° = 60.2°.
- Escape wheel: 15 teeth, one tooth per two beats, so 30 beats per turn; at 4 beats per second that is 7.5 s per turn (8 rpm). The fourth wheel runs on an 8:1 pair, so 1 rpm.
- Seconds hand: 1.5° a beat (360° / 240 beats a minute), so 12° at :02.
- Ring level stopped at 80 % brightness: 0.8 × 0.5 = 0.40. Playing, half a second after a tick: 0.8 × (0.5 + 0.5 × (0.7 + 0.3 × e^−1.5)) = 0.707.

All of these are asserted in `web/src/lumen/model.test.ts`.
