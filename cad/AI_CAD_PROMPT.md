# Prompt for Zoo Design Studio / Zookeeper

Paste this as the first prompt, then iterate on individual components. All dimensions are in millimeters.

> Create an editable, parametric CAD assembly for a countertop **concept prototype** of a smart pill dispenser. Overall envelope: 150 mm wide × 120 mm deep × 210 mm high, with rounded corners of about 8 mm. Make separate named components: main enclosure (3 mm nominal wall), removable top refill lid, front display bezel for a 100 × 52 mm screen, camera mount centered above the screen with an 8 mm aperture, large tactile dispense button (30 mm diameter) centered below the screen, speaker grille below the button, internal modular cartridge placeholder, an isolated dispensing chute, and a removable shallow catch cup near the base. Camera and display face forward. The chute must be shielded from the electronics compartment. Include mounting bosses and access to the cartridge, but keep all mechanism parts as clearly labeled placeholders. Show an exploded view and an assembled view. Use simple planar and cylindrical features that remain editable. Do not generate pills, dose measurements, or a functioning medication mechanism. Check that the cup can be removed from the front and the lid can open without intersecting other parts. Export the assembled STEP file and a GLB or STL visualization mesh.

Follow-up prompts:

1. “Show a section view from the right. Label the camera field of view, cartridge, chute, catch cup, electronics bay, and speaker.”
2. “Separate the refill lid, cup, and enclosure as printable components. Add reasonable clearance to the removable cup and keep the screen, lens, and button cutouts unchanged.”
3. “Produce an exploded assembly rendering on a light background and export an assembled STL or GLB for the website.”

The included `dispenser.scad` is an independent concept fallback. It models the external enclosure and controls, not a dose-safe mechanism.
