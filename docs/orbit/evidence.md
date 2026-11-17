# Orbit Deck evidence

Route: `/orbit`. Reference: `assets/orbit-deck-reference.png`, a single top-down image supplied by the user. Orbit Deck is a concept: nothing here is a real product.

Method: Elvar's [Teardown skill](https://github.com/elvarofficial/teardown) (`vendor/elvar-teardown/SKILL.md`) for the simulator, plus the exploded-view and evidence rules of the technical-illustration teardown skill installed at `~/.agents/skills/teardown`.

| Feature | Evidence | Implementation |
| --- | --- | --- |
| Square clear case, chamfered corners, edge clips | Visible in the reference | Acrylic tray and lid, 260 × 242 mm in plan, estimated from the image's proportions |
| Platter: white disc, orange label, dark hub, chrome spindle, segmented ring | Visible | Positions and radii traced at 0.198 mm per pixel |
| Copper ring with clear centre, top left | Visible | Modelled as a spiral winding under a lens; its role as an induction coil is invented |
| Blue disc on a toothed mount, bottom left | Visible | Modelled as a flywheel rotor; the belt to the platter is invented |
| Five black knobs, chrome parts, finned block, orange button | Visible | Traced positions; functions invented |
| Long black slot with a chip module, shielded block | Visible | Modelled as a memory cartridge and shield; function invented |
| White board, chips, capacitors, orange and blue wiring | Visible | Named parts traced; small parts and traces scattered by a fixed seed, so they are illustrative |
| Height, 46 mm, and every vertical dimension | Not in the reference | Invented |
| Speeds, belt ratio 6, 4 beats and 16 steps per turn, level | Not in the reference | Invented; all derived from platter revolutions in `web/src/orbit/model.ts` |

Hand check: the 84 mm platter pulley over the 14 mm rotor pulley is 6, so 33⅓ rpm gives a 200 rpm rotor; 4 beats per turn gives 133.3 BPM.

## Rebuild and verify

```sh
npm run dev                      # http://127.0.0.1:49381/orbit/
npm test                         # includes web/src/orbit/model.test.ts
npm run build
node scripts/orbit/review.mjs    # writes shots/orbit/*.png; needs the dev server
node scripts/orbit/quick.mjs shots/orbit/quick Exploded 3D Side
```
