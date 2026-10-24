# Absurd Devices Anatomies / XNOS Flora Interface Unit

Interactive Figure built with wheresryan22/anatomy. A user-controlled scan energizes the antenna and samples an imagined alien plant; separating the enclosure reveals the assemblies that receive, process, display, and announce the sample.

## Reference and truth

The two user-supplied images establish the green enclosure, exposed circuit motifs, bronze circular audio emitter, flexible antenna with luminous tip, botanical display, and three front buttons. The schematic labels 19.4 cm, 12.0 cm, and approximately 12.3 cm; use a 194 × 120 × 123 mm enclosure, with the long side extending behind the display. Neither image supplies internal engineering, actual electronics, or scientific measurements. All internals and biological telemetry are explicitly a fictional concept simulation, not verified product specifications.

## Parts planned before geometry

Six selectable assemblies. At least 60 distinct solid parts, plus surface details.

1. Chassis: floor plate, four feet, rear wall, far wall, four corner posts, two mounting rails, four rail seats (17).
2. Signal processor: circuit board, four board standoffs, processor package, four memory packages, six connector blocks, eight capacitor packages, shielding cover (25).
3. Power module: battery housing, upper cap, two terminals, retaining strap, regulator package (6).
4. Audio assembly: side cover, speaker surround, inner grille, two trim rings, four mounting screws (9).
5. Display assembly: front frame, display backing, inner bezel, glass, three button seats, three button caps, four mount screws (14).
6. Receiver assembly: lid, antenna foot, base collar, flexible antenna shaft, emitter ball, emitter collar, four lid screws (10).

Surface detail: terminal-rooted PCB traces, closed grille perforations, ventilation slots, panel seams, screw slots, etched model tag, chip leads, scanlines, specimen leaves, and live screen instrumentation.

## Interaction and verification

Assembled / exploded toggle and continuous separation slider; selectable component list and matching geometry; repeating scan while Specimen display is selected; reset; icon-only light/dark themes; keyboard shortcuts; reduced-motion support; visibility-paused animation. The static SVG remains visible without scripts and the generated HTML opens without a server or network.

Use the skill's camera and solid builders, record real geometry for auditing, inspect full desktop/mobile views and assembly closeups, and exercise controls in a browser.

## Cuboid and wireframe revision

The enclosure now has square, flush outer panels and a 194 × 120 × 123 mm body (z = 4–127). The camera azimuth is 44° so the longer side reads clearly. The screen bezel and speaker retain their curved component geometry.

Wireframe is a monochrome technical line drawing with opaque paper-colored faces, following the skill examples' hidden-line treatment. It preserves depth ordering while removing material colors, shading, halos, and emitter glow. It works independently of assembled/exploded position and page theme. It is the default drawing style; Rendered restores the reference colors, and W toggles the two.

## Whole-device cuboid revision

The assembled object, including all components, now fits the exact 194 × 120 × 123 mm cuboid boundary. The external mast is replaced by a three-part planar receiver under the lid and a flush status window. The speaker driver is entirely behind the side panel with its grille at the surface. The screen and three touch controls share the front plane. The base is continuous and flat, with no feet below it. There are 53 solids across the original six assemblies. A bounds test rejects any solid protruding outside the assembled envelope.

## Equal-sided cube (current design)

The user clarified that all three dimensions must be equal. The final envelope is 120 × 120 × 120 mm: x = −60…60, y = −60…60, z = 4…124. Geometry is rebuilt at these world dimensions, including interior modules and movement vectors; it is not an SVG stretch. The speaker retains a circular profile. The camera uses a 45° azimuth and a 35.264° elevation, giving equal foreshortening along all three axes. Tests verify the exact envelope, all six continuous outer faces, and equal projected edge lengths.


## Gallery styling revision

Reference: https://x.com/wheresryan22/status/2109731806115201167. Inspected frames across the 52-second gallery demo, including the film projector, Game Boy, and controller. Carry over its compact navigation, modest typography, whitespace, subtly framed model, fine gray edges and softly shaded white surfaces. Keep the green screen as the one active accent, like the Game Boy display in the video.

The former editorial headline, dot grid, decorative badges, and persistent inspector are replaced by a small title, quiet model canvas, controls below the figure, compact live readings, and expandable component and intensity sections. Selecting a model part opens its details. The rendered olive/bronze mode is preserved. Both themes retain readable controls and the same interactions. All six outer faces remain equal; the assembled preview is enlarged uniformly, easing back as the assemblies separate.

Verification: pure model and cube tests, built-page DOM interaction checks, and offline SVG previews. No new browser screenshots were captured because prior preview access was declined.

## Untitled UI rebuild

The user rejected the enlarged typography pass and requested actual Untitled UI MCP components. The interface now uses React, Tailwind, React Aria, and official Untitled UI buttons, button groups, sliders, toggles, badges, tooltips, icons, and theme tokens. These were retrieved through the Untitled UI MCP and installed with its CLI. No Figma file was needed.

Use the library's compact `sm` component variants: 14 px interactive labels, 12–14 px supporting text, a 24 px page title, and 24 px metric values. Keep the model prominent in the main column and group components and scan controls in the right inspector, stacking on mobile. The original cube geometry, wireframe appearance, and simulation remain shared with the prior implementation. Component selection, scan cancellation, keyboard sliders, and theme switching are verified through React integration tests.

## October 2026 interface

The page is titled XNOS Flora Interface Unit and uses the supplied interstellar-botany description. Details contains the two reference images without captions or attribution prose. The footer displays Oct 2026. The live-readings section and Specimen link controls have been removed. The model card has a 20 px radius; selected assembly, drawing, and theme segments use the primary accent with white labels or icons.

Selecting Specimen display starts a five-second repeating screen scan. The scan beam, vitality bars, toxicity radar, growth trace, absorption bars, recording indicator, and readouts update directly within the SVG. The loop stops on deselection/reset, pauses offscreen or in hidden tabs, and uses a static scan state under reduced motion. Legacy standalone controls remain available only in the standalone build.

The project brand is Absurd Devices Anatomies, with a typographic ✲ mark. Theme icons are 18 px. Details uses the updated concept and schematic images at their natural aspect ratios, filling the columns without side gutters, with 12 px corners. The keyboard-shortcuts disclosure has been removed; model keyboard interactions remain available.

The Details previews open accessible full-image dialogs. A magnifier appears on hover or keyboard focus and is always visible on touch devices. Escape, the close button, and the backdrop dismiss the dialog and restore focus to the preview.
