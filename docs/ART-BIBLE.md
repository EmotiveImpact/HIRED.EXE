# HIRE.EXE art bible

## The approved direction

A cheerful, detailed pixel city frames an original platforming adventure about applying, making, learning and showing the work. The four approved concept boards live in `references/`. They are the visual authority for this build. The goal is the richness and readability of a classic 16-bit platform game, with original characters and scenery.

The desktop interface gives the application its identity: grey bevels, a deep blue title bar, compact menus and crisp window controls. Inside that frame the world is colourful and alive. Windows styling belongs to the interface; the landscape should still feel like a place to explore.

### Reference roles

| Preserved image | Governs | Does not establish |
| --- | --- | --- |
| `approved-gameplay-target.png` | Overall composition, colour balance, character scale, material richness and city atmosphere | Collision geometry or a working game screenshot |
| `augustus-character-concepts.png` | Augustus's appearance, silhouette, outfit and animation vocabulary | A perfectly aligned exportable animation atlas |
| `environment-concepts.png` | Terrain materials, vegetation, architecture and modular prop family | A tested seamless tile set |
| `enemies-hud-concepts.png` | Enemy personalities, pickups, boss proportions and HUD icon language | Working enemy logic or final frame timing |

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

The production set contains 18 frames across idle, run, jump, fall, dash, hurt, crouch and victory. This is a fictional illustrated avatar approved for the game, not a photographic likeness claim. The frames are listed under [Production assets](#production-assets).

## Materials and reusable construction

**Grass and brick:** use a strong green upper lip, hanging irregular tufts, dark root shadow and warm staggered bricks. Keep the top surface visually continuous. Add sparse flowers and vines as separate decoration so tile repetition does not turn into a regular flower pattern.

**Industrial:** blue and violet steel, bolts, vents, yellow hazard stripes and warm crates extend the same outline and highlight system. Moving platforms need a distinct underside or light strip, making their role visible before they move.

**Technology:** cyan edge light, deep indigo panels and small bright indicators. Reserve the strongest glow for objects that matter to the player. Dense background circuitry should not look like a collectible trail.

**Architecture:** build shopfronts, arches, rooftop machinery, signs and planting as separate silhouettes. Decorative arches and ladders must not imply a usable route unless gameplay supports one.

The delivered environment kit uses 96 × 96 terrain textures and 192 × 192 prop storage cells. A 48-pixel rhythm can guide smaller layout increments, while the renderer repeats the actual terrain texture every 96 pixels. Level collision geometry remains independent of both sizes.

## Four worlds, one family

| World | Dominant impression | Light | Foreground material | Background rhythm |
| --- | --- | --- | --- | --- |
| Application Alley | Welcoming daytime city | Bright blue sky | Turf and terracotta | Shops, trees, pastel towers and rail bridge |
| Ship It City | Energetic construction and delivery | Warm sunset | Steel, brick, crates | Workshops, cranes, conveyors and warm industrial light |
| Growth Run | Fast, open, connected city | Violet and magenta twilight | Lit platforms and speed lanes | Rail lines, layered towers and cyan/violet signals |
| Final Interview HQ | Clearer, calmer destination | Calm sunrise | Polished stone, glass and gold trim | HQ silhouette, glass, elevated gardens and spacious sky |

Each world suggests distant atmosphere, a middle city and local decoration. Application Alley, Ship It City and Growth Run are each painted in four layers that slide at their own speeds: sky (0.02 of camera speed, with clouds that drift by themselves), far skyline (0.07), a bridge with what stands under it (0.18) and a nearer bank of treetops (0.3). Something floats across the sky with a small flock beside it, and a plane tows a cloth banner whose line comes from `banners` in `src/edition.js`. In Ship It City and Growth Run a train runs along the top of the bridge, in front of what stands on it: always forwards, left to right, the first a few seconds into the level and the next 22 seconds after the last has gone. Train sprites are averaged down, sharpened, held to a small palette and outlined in dark violet so they stay crisp at game size. Application Alley has a lilac stone viaduct, three pictures joined into one, with a row of treetops painted on its own in front; a balloon and gulls; and no train. Ship It City has a steel girder bridge, a freight train, an airship, two delivery drones and chimneys that smoke. Growth Run has a monorail track, a bullet train, an airship carrying a chart, two couriers and a rocket that climbs out of the skyline now and then. Final Interview HQ's ground floor is an atrium in two layers: the view of the city at sunrise (0.03), seen through the glass, and the atrium's frame of arches, balconies and planters in front of it (0.15), two pictures joined into one. The plane, a balloon and gulls pass outside the glass, between the two. Each boss has four painted poses in the kit atlas, chosen by its phase: at rest, winding up, attacking and open to a stomp, turned to face the player. Final Review is calm, asking and reading while you climb, and gives a thumbs up with a green tick once the room is yours. Each world starts at one painted door and ends at another, chosen for the world: a Now Hiring shopfront and a post box marked APPLY in Application Alley, a loading bay with a Deploy button and a shipping container marked SHIPPED in Ship It City, a Next Round chart arch and a rocket lift marked TO THE MOON in Growth Run, and a gold lift and the Hiring Manager's door at Final Interview HQ. Foreground props, platforms, actors and ambient particles are separate. Keep playable surfaces in the clearest foreground plane; painted architecture does not define collision geometry.

The three upper floors of Final Interview HQ are rooms, and a room's backdrop is its back wall only: a flat elevation with windows, lamps and panelling, fixed to the floor. Furniture is never painted into a wall. It is cut from separate sheets into the furniture atlas and placed in the level, so anything that looks like a desk is a desk the hero can reach.

## HUD and feedback

Use a compact portrait, hearts, lightbulb counter, skill progress and a clearly labelled dash state. Hearts communicate health; lightbulbs communicate score; skill tokens communicate optional evidence. A red icon alone is insufficient for a boss warning, so pair colour with a label or a recognisable animation. Every gameplay cue has to work without colour alone, and the HUD stays clear of critical jumps.

The game can be playful about bureaucracy without mocking a real company's staff or implying that the candidate has received an offer. A completion screen celebrates finishing the game and invites a conversation.

The runtime boss atlas provides one base pose for each of the four bosses. The renderer supplies movement, shields, warnings, flashes, projectiles and vulnerability labels. Additional attack variants shown in concept exploration remain concepts, rather than a frame-by-frame runtime animation set.

## Acceptance standard

Check assets at actual gameplay scale, including against bright sky and dark architecture. Check animation feet, transparency, silhouette and collision alignment. Inspect a full repeated terrain strip, not just one tile. Check that the same hero appears in all worlds. Keep the concept originals unchanged and retain the prompts and processing notes for production derivatives. Runtime and verification status belong in the [README](../README.md) and the [playtest report](PLAYTEST.md); this document defines the design standard.

## Production assets

The concept boards in `references/` are never loaded by the game. Everything the renderer draws comes from `assets/production/`, and each atlas has a JSON file beside it with frame rectangles and anchors. [`assets/manifest.json`](../assets/manifest.json) is the path inventory.

| File | Purpose | Dimensions |
| --- | --- | --- |
| `assets/production/characters/hero-atlas.png` | Augustus, 18 frames | 480 × 288 |
| `assets/production/characters/portrait-reference.png` | HUD portrait, a lossless crop from `references/augustus-character-concepts.png` | 197 × 174 |
| `assets/production/enemies/enemy-atlas.png` | Minions, bosses, pickups and the checkpoint terminal | 768 × 384 |
| `assets/production/enemies/icons/*.png` | Individual pickup and terminal crops | Variable |
| `assets/production/environment/terrain-atlas.png` | Sixteen 96 × 96 terrain cells | 384 × 384 |
| `assets/production/environment/props-atlas.png` | Sixteen props in 192 × 192 storage cells | 768 × 768 |
| `assets/production/backgrounds/*.png` | One painted backdrop per world | 1672 × 941 |
| `assets/production/backgrounds/*.webp` | The 960 × 540 copies the game loads | 960 × 540 |
| `assets/production/backgrounds/application-alley-sky.webp`, `-far`, `-near`, `-trees` | Application Alley's four layers, each a strip as tall as the screen, clear where the layer behind shows through | 960, 960, 2254 and 1126 wide; 540 tall |
| `assets/production/backgrounds/ship-it-city-sky.webp`, `-far`, `-near`, `-trees` | Ship It City's four layers, made the same way; the skyline is joined from two stretches of painting and the bridge from four | 960, 1390, 2758 and 3678 wide; 540 tall |
| `assets/production/backgrounds/growth-run-sky.webp`, `-far`, `-near`, `-trees` | Growth Run's four layers, made the same way; the track is joined from three stretches of painting | 960, 960, 2826 and 2790 wide; 540 tall |
| `assets/production/backgrounds/interview-hq-view.webp`, `-atrium` | Final Interview HQ's ground floor: the view through the glass, and the atrium joined from two stretches of painting, clear in every pane | 960 and 1419 wide; 540 tall |
| `assets/production/environment/kit-atlas.png` | The painted kit, every piece at the size it is drawn: plane, banner cloth, and each layered world's train, floater, flock and extras (smoke puffs, a rocket); a sign for each world; press, rod, spring, conveyor, speed strip, gate, keyword tag, bell, padlock, warning sign and the bosses' two shots; the four bonus pickups. Its JSON also says which layers a world has and where its traffic runs | 512 wide |
| `assets/production/characters/title-hero.webp` | The hero on the title screen | 480 tall |
| `assets/production/backgrounds/interview-room-2.webp` to `-4.webp` | The back walls of the workshop, boardroom and reception | 1190 × 448 |
| `assets/production/environment/furniture-atlas.png` | Seventeen pieces of room furniture at the size they are drawn | 512 wide |
| `assets/production/enemies/feed-atlas.png`, `feed-body.webp` | The Feed's leading edge and six icons, cut out, and one repeating tile of its wall of posts | 560 tall; 320 × 256 |
| `assets/source/feed/` | Generated sources for the Feed on a flat green ground; `tools/build-feed-art.py` cuts them out | Variable |
| `assets/source/kit/` | Generated sources for the layers and the kit, each on one flat key colour; `tools/build-art-kit.py` cuts them out | 2560 × 1440 and smaller |
| `assets/source/hq-rooms/` | Generated wall and furniture sources, their provenance, and the earlier room paintings | Variable |
| `assets/source-atlases/terrain-4x4.png`, `props-4x4.png` | Generated source sheets for the two environment atlases | 1254 × 1254 |

### Hero animations

All hero frames occupy an 80 × 96 cell and face right. The renderer mirrors the draw transform to face left and places the `[40, 92]` anchor at the player's centre-foot position.

| Animation | Frames | Playback |
| --- | --- | --- |
| Idle | `idle_0`, `idle_1`, `idle_0`, `idle_2` | 3 fps, loop |
| Run | `run_0` to `run_5` | 12 fps, loop |
| Jump | `jump_0`, `jump_1` | 7 fps, clamp at final frame |
| Fall | `fall_0` | Held pose |
| Dash | `dash_0`, `dash_1` | 12 fps, loop |
| Hurt | `hurt_0` | Held pose |
| Crouch | `crouch_0` | Held pose |
| Victory | `victory_0`, `victory_1` | 4 fps, loop |

### Enemies and pickups

The enemy atlas uses 128 × 128 storage cells. Its JSON points to the trimmed rectangle inside each cell, and each frame's anchor is its bottom centre.

| Group | Frame names |
| --- | --- |
| CV bot | `cv_0`, `cv_1` |
| Inbox envelope | `envelope_0`, `envelope_1` |
| Paper plane | `plane_0`, `plane_1` |
| Bosses | `recruitmentbot`, `scopecreep`, `algorithm`, `finalreview` |
| Idea and skill pickups | `bulb`, `code`, `bricks`, `palette`, `cube` |
| Health, checkpoint and exit | `heart`, `terminal`, `briefcase` |

### Terrain and props

| Terrain family | Frame names |
| --- | --- |
| Grass and brick | `grass`, `grass_flower`, `brick`, `vine` |
| Industrial | `hazard`, `metal`, `brick_metal`, `vent` |
| Technology | `neon`, `tech`, `magenta`, `window` |
| HQ stone and glass | `stone_gold`, `stone`, `stone_ivy`, `glass` |

| Prop family | Frame names |
| --- | --- |
| Street and planting | `cafe`, `tree`, `pink_tree`, `arch` |
| Interactive-looking objects | `career_block`, `crate`, `terminal`, `ladder` |
| Platform silhouettes | `grass_platform`, `metal_platform`, `neon_platform`, `stone_platform` |
| Landmarks and destination | `banner`, `satellite`, `lamp`, `portal` |

The names identify artwork. They grant no gameplay behaviour: a ladder in the kit does not enable climbing, and arches are decorative. Checkpoints use the terminal and the exit uses the portal.

| World | Top | Fill | Accent | Floating platform |
| --- | --- | --- | --- | --- |
| Application Alley | `grass` | `brick` | `vine` | `grass_platform` |
| Ship It City | `hazard` | `brick_metal` | `vent` | `metal_platform` |
| Growth Run | `neon` | `tech` | `window` | `neon_platform` |
| Final Interview HQ | `stone_gold` | `stone` | `stone_ivy` | `stone_platform` |

### Provenance and rebuilding

All artwork was made for this project with an image-generation tool, guided by the approved boards. No sprite from an existing game was used. The prompts are kept in `assets/source/`: `environment-prompts.json`, `background-prompts.json` and `character-prompts.md`.

The atlas tools only crop, scale with nearest-neighbour sampling and pack. They need Pillow.

```bash
python3 tools/build-environment-atlas.py
python3 tools/build-character-atlas.py
python3 tools/build.py
```

`build-environment-atlas.py` reproduces the committed terrain and prop atlases byte for byte from `assets/source-atlases/`. `build-character-atlas.py` expects the generated hero and enemy sheets (`hero-source.png` and `enemy-cutout.png`), which are not in this repository, so the committed hero and enemy atlases are the working originals. When artwork changes, add the new generated source as a new file and keep the approved boards untouched.
