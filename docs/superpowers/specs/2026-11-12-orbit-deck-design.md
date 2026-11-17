# Orbit Deck — design

Date: 2026-11-12. Route: `/orbit`. Reference: `assets/orbit-deck-reference.png` (user-supplied top-down image).

## Intent

A second device for Absurd Devices Anatomies. The user supplied one top-down image of a fictional transparent device and asked for it to be imagined as a working machine and built as a detailed, interactive 3D teardown with three states: assembled, exploded and playing. Success means:

- The top camera reads as the reference image: same layout, colours and proportions.
- The device looks like a lit product, with environment reflections on acrylic and chrome.
- The page uses the home page's interface styling and carries very little text.

Stated by the user: teardown skill, full 3D, three states, top view resembles the image, proper environment lighting, existing UI styling, minimal text. Assumed by me: the device identity, all internals, all dimensions and all readouts.

## Skills

Elvar's teardown (`vendor/elvar-teardown/SKILL.md`) supplies the method: a pure motion model in real units, one input driving every pose and readout, geometry built from code, a pale studio, one accent, collisions fixed with numbers. The other installed teardown skill (`~/.agents/skills/teardown`, technical illustration) supplies two rules: parts separate along a credible assembly axis, and `docs/orbit/evidence.md` classifies every feature as seen, estimated or invented.

Out of scope: the recorded film, the soundtrack and the auto tour.

## The device

Orbit Deck is a transparent desktop loop player. A belt-driven platter carries a disc; an optical head reads it; a copper induction coil senses the signal; a small blue flywheel rotor, driven from the platter by a belt, smooths the speed. All of this is fictional.

Envelope: 260 × 242 × 46 mm. Axes: X right, Y up, Z toward the bottom of the reference image. Image-to-world mapping: the case spans image x 330–1640 and y 325–1545 (of 1957 × 1904), so `X = (u − 0.5) × 260`, `Z = (v − 0.5) × 242`.

Seven assemblies:

| Id | Name | Main parts | Explodes |
|---|---|---|---|
| `case` | Case | acrylic tray, lid, 12 clips, 4 posts, 4 feet | lid lifts 230 mm, tray stays |
| `platter` | Platter | white disc Ø92, orange label Ø53, hub, spindle, pulley Ø84, bearing, bezel ring Ø112, optical head, belt | up 95 mm, parts fan out vertically |
| `coil` | Induction coil | copper spiral, clear lens, frosted bracket, screws | up 70 mm |
| `rotor` | Rotor | blue disc Ø34, vanes, toothed mount, pulley Ø14 | up 55 mm |
| `controls` | Controls | 5 knobs, encoder, level knob, jack, heat sink, orange button, switches | up 80 mm, caps lift off shafts |
| `memory` | Memory | cartridge body, chip row, contacts, shield module | up 45 mm and 30 mm forward |
| `board` | Logic board | white PCB, chips, capacitors, connectors, wiring, LEDs | up 22 mm |

## Motion model

One input: platter revolutions. Everything else is a function of it.

- Speeds: 33⅓ and 45 rpm, pitch ±8%.
- Belt ratio 84 mm / 14 mm = 6, so the rotor turns at 200 rpm at 33⅓ and 270 rpm at 45.
- Four beats per revolution: 133.3 BPM at 33⅓, 180 BPM at 45. Sixteen steps per revolution drive the LED row.
- Level is an envelope of the beat phase; it drives the coil glow and the level readout.
- The platter has inertia: speed approaches its target with a 0.6 s time constant, so it spins up on play and coasts down on stop.

## Page

- `web/orbit/index.html` and `web/src/orbit/`, a third Vite entry beside `/` and `/flora`.
- Styling: the home page's `globals.css` and `app.css` classes and its Untitled UI buttons, button groups, sliders and badges, in light and dark themes.
- Viewer card: a mode control (Assembled, Exploded, Play), a camera control (3D, Top, Side), a reset button, a caption with dimensions and part count.
- Exploded mode shows a separation slider. Play mode shows play/pause, 33/45, pitch, and three readouts: RPM, BPM, level.
- Inspector: the seven assemblies. Selecting one ghosts the others and shows one short line about it. Clicking a part in 3D selects its assembly.
- Text on the page is limited to the title, a concept badge, the control labels, the seven names and their one-line notes.
- Keyboard: Space play/stop, E explode, T top view, R reset, 1–7 select, Escape clear.

## Rendering

three.js 0.187. Perspective camera, 22° field of view, orbit and zoom. A prefiltered studio environment map lights every material; a key light casts soft shadows onto a shadow-catcher floor; ACES tone mapping. Acrylic uses physical transmission on capable hardware and plain transparency on the lower tier. Background colour follows the theme.

Reduced motion: no automatic spin-up, instant transitions. Rendering pauses when the tab is hidden or the viewer is off screen. A WebGL failure shows the reference image and a short message.

## Verification

- Unit tests for the motion model and for the layout: every part inside the case envelope, no footprint overlapping the platter.
- A Playwright script captures top, 3D, exploded and play states in both themes and at phone width; the top capture is compared by eye with the reference image.
- Existing tests and the production build keep passing.
