# Pocket evidence

Route: `/pocket`. Reference: `assets/pocket-reference.png` (1514 × 2000 px), a single top-down image. Pocket is a concept: nothing here is a real product.

Mapping: the shell spans image x 300–1190 and y 297–1767, so 1 px = 0.1 mm with the origin at pixel (745, 1032). X right, Z toward the image bottom, Y up. See `web/src/pocket/layout.ts`.

| Feature | Evidence | Implementation |
| --- | --- | --- |
| Clear portrait shell, 89 × 147 mm, bottom cut-out between two grips, violet toward the bottom | Visible | Outline traced; cut-out 35 mm wide and 7.5 mm deep; violet is a gradient sheet on each shell half |
| Two knurled silver posts on the top edge | Visible | Traced at x −35.2 and 34.3 mm; modelled as charge posts, which is invented |
| Clear bay across the top with gold comb, gold-and-black plug, black slot, gold rod | Visible | Traced, then moved up to 2 mm so each part clears the bay wall; "game capsule" role invented |
| Cyan screen module, dark bezel, bright LCD, slotted bar, small square keys, corner marks | Visible | Frame 72.7 × 51 mm, bezel 57.7 × 37.3 mm, active area 51.2 × 30.7 mm, all traced |
| Blue board, large processor, shield can, window chip, two gold-legged chips, small chips, jacks | Visible | Named parts traced to 0.1 mm; `DEVICE.GALLERY` silk-screen at the traced position |
| Small capacitors, resistors, test pads, traces, vias, reference labels | Visible as texture | Scattered by a fixed seed, so their exact positions are illustrative |
| Cyan pad with black cross, lilac two-lobe pill, yellow button in black ring, orange button, orange pill key | Visible | Traced centres and radii; the pill is two keys, B cut back 0.15 mm from A |
| Red-orange LEDs mid-left and lower right, brass screws | Visible | Traced |
| Tab and brass rod on the right edge | Visible | Modelled as a power slide and strap bar; roles invented |
| Thickness (25.6 mm) and every vertical dimension | Not in the reference | Invented |
| Parts under the screen, lithium cell, membranes, backlight stack, standoffs, bosses | Not in the reference | Invented, kept inside the traced envelope |
| Snake on a 20 × 12 grid, tick rates, key travel, what each button does | Not in the reference | Invented; all in `web/src/pocket/model.ts` |

Hand checks:

- The active LCD is 51.2 mm wide and 20 cells across, so a cell is 2.56 mm. At 8 ticks a second the snake crosses the glass at 8 × 2.56 = 20.48 mm/s. Starting at column 10 and running straight, it reaches column 18 after 1 s (8 ticks) and hits the wall on tick 10.
- The D-pad arm tip is 8.5 mm from the pivot and travels 0.8 mm, a tilt of atan(0.8 / 8.5) = 5.38°.
- Holding A doubles the rate (8 → 16 Hz); holding B halves it (8 → 4 Hz).

## Rebuild and verify

```sh
cd web && npx vitest run src/pocket
cd web && npx tsc -b
node scripts/devices/shot.mjs pocket shots/pocket Assembled 3D Top Side --page
node scripts/devices/shot.mjs pocket shots/pocket Exploded 3D Side
node scripts/devices/shot.mjs pocket shots/pocket Play 3D Top --wait=3500
node scripts/devices/shot.mjs pocket shots/pocket Assembled 3D --dark --page
```
