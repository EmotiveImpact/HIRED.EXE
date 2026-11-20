# HIRED.EXE art bible

## The approved direction

A cheerful, detailed pixel city frames an original platforming adventure about applying, making, learning and showing the work. The user approved the four images in `assets/reference/`. They are the visual authority for this build. The goal is the richness and readability of a classic 16-bit platform game, with original characters and scenery.

The desktop interface gives the application its identity: grey bevels, a deep blue title bar, compact menus and crisp window controls. Inside that frame the world is colourful and alive. Windows styling belongs to the interface; the landscape should still feel like a place to explore.

### Reference roles

| Preserved image | Governs | Does not establish |
| --- | --- | --- |
| `gameplay-approved.png` | Overall composition, colour balance, character scale, material richness and city atmosphere | Collision geometry or a working game screenshot |
| `hero-approved.png` | Augustus's appearance, silhouette, outfit and animation vocabulary | A perfectly aligned exportable animation atlas |
| `environment-approved.png` | Terrain materials, vegetation, architecture and modular prop family | A tested seamless tile set |
| `enemies-approved.png` | Enemy personalities, pickups, boss proportions and HUD icon language | Working enemy logic or final frame timing |

Presentation borders, labels and baked shadows remain in these originals. Production assets are derived separately and stored under `assets/production/`.

## Shape, light and pixels

Use broad readable silhouettes with compact internal detail. A dark plum outline separates the main subject from the world. Build surfaces from a small number of clear shadow, midtone and highlight clusters. Light generally comes from the upper left. Bright edges sit on grass, hair, shoulders, brick tops and metal bevels; the undersides fall into violet or navy shadow.

Preserve crisp pixel edges in the renderer with image smoothing disabled. The reference is a modern, detailed interpretation of 16-bit art, so this project does not claim to obey a historical console palette or hardware limit. Scale related assets consistently. A soft, painterly tree beside a sharply pixelled hero breaks the family even when both are individually attractive.

Keep the player and dangerous objects more contrasty than distant buildings. Distant layers become lighter, cooler and less detailed. Animated effects should clarify an action: a short dust puff for landing, a cyan streak for dash, a gold burst for a pickup and a visible warning for a boss attack.

### Working palette

These are production targets chosen from the approved colour relationships, not an assertion that the reference uses only these exact values.

| Role | Colour | Usage |
| --- | --- | --- |
| Outline | `#251A43` | Character contours, foreground separation |
| Deep shadow | `#343064` | Brick recesses, metal undersides, UI recesses |
| Interface blue | `#173AC3` | Title bars, focused actions, desktop identity |
| Lilac | `#B8ADF0` | Distant city, pale metal shading, soft separation |
| Cyan | `#45DDFC` | Tech surfaces, hero accents, active effects |
| Teal | `#17AFA8` | Hero jacket and friendly technology |
| Turf green | `#72CD38` | Foreground grass and shrubs |
| Lime highlight | `#D2EF62` | Sunlit grass edges and readable ledges |
| Terracotta | `#BD594F` | Primary brick surfaces |
| Brick highlight | `#F39A60` | Warm upper edges and sunlit masonry |
| Gold | `#FFD35A` | Collectibles and interaction accents |
| Cream | `#FFF1CF` | Paper, lit windows and warm highlights |
| Alert coral | `#FA5777` | Health, damage and danger cues |

## Augustus

The approved hero has medium brown skin, short curly dark hair, a close beard, expressive eyes, a teal jacket over a cream shirt, charcoal trousers, white and teal trainers and a compact teal backpack. Keep these features consistent across every pose. The face should remain legible at gameplay scale, without increasing the head between frames.

Gameplay uses a 34 × 58 logical collision body. The delivered hero atlas uses 80 × 96 cells rendered at their native size, with a shared foot anchor at `[40, 92]`. The visible standing character is approximately 78 pixels tall; transparent padding and extended limbs sit outside the collision rectangle. Align frames by the centre of the feet, not the bounding box. A running leg or raised fist must not make the torso drift. The right-facing set is mirrored for leftward movement.

The production set contains 18 frames across idle, run, jump, fall, dash, hurt, crouch and victory. This is a fictional illustrated avatar approved for the game, not a photographic likeness claim. See `CHARACTER-ASSETS.md` for the frames and their provenance.

## Materials and reusable construction

**Grass and brick:** use a strong green upper lip, hanging irregular tufts, dark root shadow and warm staggered bricks. Keep the top surface visually continuous. Add sparse flowers and vines as separate decoration so tile repetition does not turn into a regular flower pattern.

**Industrial:** blue and violet steel, bolts, vents, yellow hazard stripes and warm crates extend the same outline and highlight system. Moving platforms need a distinct underside or light strip, making their role visible before they move.

**Technology:** cyan edge light, deep indigo panels and small bright indicators. Reserve the strongest glow for objects that matter to the player. Dense background circuitry should not look like a collectible trail.

**Architecture:** build shopfronts, arches, rooftop machinery, signs and planting as separate silhouettes. Decorative arches and ladders must not imply a usable route unless gameplay supports one.

The delivered environment kit uses 96 × 96 terrain textures and 192 × 192 prop storage cells. A 48-pixel rhythm can guide smaller layout increments, while the renderer repeats the actual terrain texture every 96 pixels. Level collision geometry remains independent of both sizes.

## Four worlds, one family

| World | Dominant impression | Foreground material | Background rhythm |
| --- | --- | --- | --- |
| Application Alley | Welcoming daytime city | Turf and terracotta | Shops, trees, pastel towers and rail bridge |
| Ship It City | Energetic construction and delivery | Steel, brick, crates | Workshops, cranes, conveyors and warm industrial light |
| Growth Run | Fast, open, connected city | Lit platforms and speed lanes | Rail lines, layered towers and cyan/violet signals |
| Final Interview HQ | Clearer, calmer destination | Polished tech terraces | HQ silhouette, glass, elevated gardens and spacious sky |

Each world suggests distant atmosphere, a middle city and local decoration. The delivered backdrop is one painted plate per world, drifting at 0.12 of camera speed. Foreground props, platforms, actors and ambient particles are separate. Three independent background source layers were not generated. Keep playable surfaces in the clearest foreground plane; painted architecture does not define collision geometry.

## HUD and feedback

Use a compact portrait, hearts, lightbulb counter, skill progress and a clearly labelled dash state. Hearts communicate health; lightbulbs communicate score; skill tokens communicate optional evidence. A red icon alone is insufficient for a boss warning, so pair colour with a label or a recognisable animation.

The game can be playful about bureaucracy without mocking a real company's staff or implying that the candidate has received an offer. A completion screen celebrates finishing the game and invites a conversation.

The runtime boss atlas provides one base pose for each of the four bosses. The renderer supplies movement, shields, warnings, flashes, projectiles and vulnerability labels. Additional attack variants shown in concept exploration remain concepts, rather than a frame-by-frame runtime animation set.

## Acceptance standard

Check assets at actual gameplay scale, including against bright sky and dark architecture. Check animation feet, transparency, silhouette and collision alignment. Inspect a full repeated terrain strip, not just one tile. Check that the same hero appears in all worlds. Keep the concept originals unchanged and retain the prompts and processing notes for production derivatives. Runtime and verification status belong in the release README and test report; this document defines the design standard.
