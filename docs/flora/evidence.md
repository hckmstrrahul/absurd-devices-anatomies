# XNOS Flora field study

New route: `/flora`. The existing `/` and `/index-dark.html` remain independent entry points. Their header links to the Flora page.

## Sources and scope

The requested workflow is Elvar’s [article](https://x.com/elvar_official/status/2116174609355571402) and [Teardown skill](https://github.com/elvarofficial/teardown). The exact skill read is retained at `vendor/elvar-teardown/SKILL.md`, with its MIT license. This is distinct from the unrelated illustration skill also named teardown installed on this computer.

| Feature | Evidence | Implementation |
| --- | --- | --- |
| Olive enclosure, bronze grille, specimen display, circuitry | Supplied `assets/xnos-flora-unit.png` | Procedural materials and display texture reconstructed from the reference |
| Earlier enclosure and external antenna | Supplied schematic | Retained on the original anatomy page; the Flora page omits the reference gallery |
| 120 mm cube, six assemblies, 53 solids | Existing `geometry.mjs`, its exact bounds and audit | Original geometry exported without resizing to `flora-geometry.json`; the Three.js view and 2D section use these solids |
| Hidden internals | Existing illustrative assembly design | Conceptual, not a manufacturing model |
| Field response, vitality, toxicity, growth, absorption | Existing fictional `model.mjs` telemetry | `sampleAt(time, intensity)` feeds the screen, all panels and the scan; readings labelled simulated |
| Tour, camera moves, recording, audio events | New shared `timeline.json` | Eight beats, 32 seconds, deterministic arbitrary-time rendering |

The dimensional check is direct: max minus min across all exported solids is 120 mm on every world axis. The display and other graphic decals sit at most 0.2 mm off their parent surfaces solely to avoid depth conflict; they are not additional physical solids. The original audit checks the physical geometry through 101 separation states.

## Prompt coverage

1. Machine: reuse the reference-based solid geometry, add real 3D orbiting, and drive observations from one pure sample function.
2. Console: large vitality readout, live field/growth traces, actual front projection, six subsystem controls, five cameras, part leader lines.
3. Studio: pale ground, olive accent, roughness of at least 0.6 for metal surfaces, fine edges, 3/4 hero camera.
4. Review: tour beat stills, transitions sampled at 0.2-second steps, original collision/envelope audit and browser interaction checks.
5. Live page: cursor-led tour, immediate input handover, 25-second idle return, orbit/zoom, H to hide panels, shader warm-up, three quality tiers and reduced-motion defaults.
6. Film: pure `window.__flora.render(t)`, 1600×900 CSS at 1.2 pixel ratio, 60 fps H.264/yuv420p/faststart.
7. Sound: Am9 at 92 bpm, scan-cycle pulses, beat-linked clicks and field-change air. Two-pass mastering to −14 LUFS, peak capped at −2 dBTP.
8. Publication: a separate HTML entry under 2 KB, external bundles, a 1200×630 share image and explicit Vercel route rewrites. Deploy to the existing Vercel project when authentication is available.
9. Bonus: a 0–100% intensity slider changes all readings together and exposes a saturation state above 85%.

## Rebuild and verify

```sh
npm run dev
npm test
npm run build
node scripts/flora/check.mjs
node scripts/flora/review.mjs
node scripts/flora/capture.mjs
python3 scripts/flora/score.py
```

Review and recording scripts use Playwright Chromium with Metal on macOS. The live renderer requests low-power graphics and caps pixel ratio; it lowers pixel ratio and shadow resolution after sustained slow frames. Offscreen or hidden tabs suspend simulation work. Audio is only in the opt-in video player; the web page never autoplays sound.

`shots/flora/` contains local review frames, transition sheets and audio mastering reports. Film, poster and share image are published from `web/public/flora/`.

## Verification completed

- Production build passes TypeScript. All 15 existing and new automated tests pass.
- Browser checks pass for the six selections, isolation, surface modes, five cameras, scan pause, intensity extremes, reset, panel visibility, explicit tour pause and automatic 25-second handover.
- No horizontal overflow at 360, 390, 768, 1024 or 1600 pixels; reduced motion starts with tour and scan paused.
- Hardware render verified on ANGLE Metal / Apple M5 Max integrated graphics. Software rendering was also exercised during the initial review.
- All eight tour beats and all seven transitions inspected, with each transition sampled at 0.2-second increments. The encoded-film contact sheet was inspected too.
- Fixed reflected triangle winding, fixed captured canvases clearing after layout resize, and moved callout labels away from the model.
- Production `/`, `/index-dark.html`, `/flora`, `/flora/`, and `/flora/index.html` return their intended pages. Original dark mode and original UI remain intact.
- Production video playback and byte-range seeking verified. Final film is H.264, 1920×1080, 60 fps, 1,920 frames, 32 seconds, yuv420p, AAC audio, and faststart.
- Final encoded audio measures −14.11 LUFS integrated and −2.01 dB true peak.
- Share image is exactly 1200×630. New page HTML is 1,823 bytes; its large renderer and assets are external.

Final media packaging: `node scripts/flora/package-media.mjs` (requires the local preview server).

The Flora page contains the simulator and film. The introductory story, reference gallery and lab note were removed at the user’s request; assembly descriptions are one sentence each.
