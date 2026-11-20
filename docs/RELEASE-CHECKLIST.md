# HIRED.EXE 0.4 release evidence

**Historical handover.** For the implemented game and current test evidence, see [the playtest report](PLAYTEST.md) and [draft PR #1](https://github.com/EmotiveImpact/HIRED.EXE/pull/1).

The game, visual component kit and exploration archive are assembled for review and a later repository move. This record separates delivered implementation from observed tests.

## Included in the release

| Area | Delivered work |
| --- | --- |
| Playable game | Four authored side-scrolling worlds, acceleration, variable and double jump, dash, checkpoints, springs, moving platforms, boost lanes, enemies and boss encounters |
| Presentation | Retro desktop interface, original hero, generated world art, HUD, sound toggle and original synthesised audio |
| Visitor flow | Open world selection, three lives per world with checkpoint respawns, Relaxed mode, direct portfolio access and a three-topic final conversation |
| Reuse | Central employer/candidate edition file and edition-specific local progress |
| Hero | 18 production frames in an 80 × 96 fixed-cell atlas, with animation metadata and a shared foot anchor |
| Enemies and rewards | Three two-frame enemy families, four boss base poses, eight icons and matching metadata |
| Environment | 16 terrain tiles, 16 props and four individual world backdrops |
| Visual exploration | Four unchanged approved references, original generation sources and prompts, boss concepts and an interactive art catalogue |
| Level views | Four actual browser captures at `assets/previews/world-1.jpg` through `world-4.jpg` |
| Delivery | Relative static site, standalone game, standalone art book, editable source, build scripts and asset origin manifest |
| History | Art bible, component catalogue, level/content notes, curated exploration, seven verbatim visible requests and 27 historical attachment records |

The boss atlas provides **one base pose per boss**. Their movement and combat feedback are implemented through the simulation and renderer. Additional attack variants in concept artwork remain concept exploration.

## Simulation evidence

`node --test tests/simulation.test.js` reports **14 passing tests**. The suite covers frame-rate independence, jump behaviours, collisions, moving-platform carrying, enemy stomps, checkpoints, assistance, reversing on boost lanes and boss openings.

Input-only controllers completed all four worlds in both assisted and normal modes from their real starting positions. They defeated bosses through ordinary inputs and reached the actual exits. Assisted routes had zero falls. Normal routes had no retry in worlds one, two and four, and one retry in world three. Scripted route times were approximately 19 to 28 seconds; these are not measured human play times or complete optional-token collection runs.

## Browser evidence

The permitted browser preview showed:

- A successfully loaded title screen and all four rendered worlds.
- Generated hero, scenery, terrain, props and HUD in the game scene.
- Working world selection and the pause/help return flow.
- The interface inside a 390 × 844 portrait iframe.
- A move-right action on the touch control changing the player's position.

The four supplied world captures come from this running preview. They are not generated mockups. The original approved gameplay-style image and boss directory remain labelled as concepts in the catalogue.

## Build and source evidence

`python3 tests/build-check.py` passed after building the delivery. It verified:

| Check | Observed result |
| --- | --- |
| Standalone game | 17 embedded images and seven inline scripts |
| Standalone art book | 26 embedded images and two inline scripts, including four actual JPG world captures |
| Embedded downloads | 20 link occurrences covering seven unique Markdown documents and four unique atlas JSON files |
| JavaScript syntax | 23 scripts parsed across source, static site and standalones |
| Relative references | 154 HTML references resolve |
| Image integrity | Embedded image signatures and exact bytes match the source files |
| Dynamic gallery assets | World images, zooms and hero animation read the embedded asset map |
| Runtime dependencies | No required remote fonts, scripts or stylesheets |

The two standalone files retain companion navigation to each other, and both are supplied. The checks are offline structural and syntax verification, not a visual rerun. Production atlas manifests preserve dimensions, frame bounds, anchors and source crops. `ASSET-MANIFEST.json` records asset origin and integrity information.

Build and test commands are documented in `BUILD-AND-TEST.md`. The build uses Python's standard library; Pillow is only needed to regenerate atlases. The browser game has no npm package or remote asset dependency.

## Scope of this verification

Browser access later blocked window switching and preview reloads through the environment's security policy. Work stopped at that boundary. The final rebuilt standalone files and art book were not visually rechecked, and the complete final-interview UI sequence was not exercised. A source fix preserving 16:9 on narrow screens is included but was not re-observed after the block.

The portrait iframe and touch-button check are useful interface evidence, not a physical-mobile test. A human playthrough on the intended browsers and devices remains the appropriate final experience review before sending an application.

Public project URLs are intentionally unset until verified links are supplied. The email action opens a draft to the configured candidate address. No job application, email, repository push or new public deployment was performed as part of this package.

## Repository handoff

The repository migration is prepared, not pushed. The destination remains the user's next step. The available conversation is preserved as a curated decision history and seven verbatim user requests. The attachment index covers 27 historical records, with 26 supplied originals recovered and one older `index.html` explicitly represented by its current authorised v1 after a version mismatch. A verbatim export of the entire chat was unavailable; it can be added unchanged when supplied.
