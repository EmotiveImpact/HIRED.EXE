# Character and enemy assets

## What is ready

The approved character identity is preserved: Augustus has medium-brown skin, short curly dark hair, a beard, a teal jacket, cream shirt, dark trousers, teal backpack and white/teal trainers. The game uses original generated artwork in the same cheerful, dark-outlined pixel-art language as the approved references.

| File | Purpose | Dimensions |
| --- | --- | --- |
| `assets/production/characters/hero-atlas.png` | Runtime animation atlas, 18 frames | 480 × 288 |
| `assets/production/characters/hero-atlas.json` | Animation names, frame rectangles and anchors | JSON |
| `assets/production/characters/hero-source.png` | Unmodified generated source | 1774 × 887 |
| `assets/production/characters/portrait-reference.png` | Lossless portrait crop from the approved character sheet | 197 × 174 |
| `assets/production/enemies/enemy-atlas.png` | Runtime minions, bosses, pickups and terminal | 768 × 384 |
| `assets/production/enemies/enemy-atlas.json` | Named content rectangles and foot anchors | JSON |
| `assets/production/enemies/enemy-source.png` | First generated version, retained for exploration history | 1774 × 887 |
| `assets/production/enemies/enemy-cutout.png` | Corrected generated alpha source used by the game | 1774 × 887 |
| `assets/production/enemies/icons/*.png` | Individual lossless pickup/terminal crops | Variable |
| `assets/concepts/bosses-directory.png` | Four-boss concept presentation with attack/cooldown ideas | 1672 × 941 |

The first enemy generation contained a translucent white and lavender backdrop. A second image-generation edit removed it. The runtime atlas uses the corrected cutout, not that initial source.

## Hero animation contract

All hero frames occupy an 80 × 96 cell and face right. Mirror the draw transform to face left. The anchor is `[40, 92]`: place that point at the player's centre-foot position. Keep the fixed collision body independent of the changing pose silhouettes.

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

At a native 80 × 96 draw size the standing character is about 78 pixels high, with transparent safety margins. This suits a 960 × 540 viewport and a narrower, forgiving collision body. The source has been scaled uniformly at 0.30 across all hero frames, so crouching and running proportions are preserved instead of stretching every pose to a common height.

Example rendering:

```js
const f = heroManifest.frames[frameName];
ctx.save();
ctx.translate(Math.round(playerCentreX), Math.round(playerFeetY));
ctx.scale(facingLeft ? -1 : 1, 1);
ctx.drawImage(heroImage, f.x, f.y, f.w, f.h,
              -f.anchor[0], -f.anchor[1], f.w, f.h);
ctx.restore();
```

## Enemy and pickup contract

The enemy atlas uses 128 × 128 storage cells. Its manifest points to the trimmed content rectangle within each cell, so draw the `x/y/w/h` rectangle with its aspect ratio preserved. Each frame's anchor is its bottom centre. `cell` records the containing storage cell; `sourceRect` records the source crop.

| Group | Frame names | Suggested visual height |
| --- | --- | --- |
| CV bot | `cv_0`, `cv_1` | 52 to 62 px |
| Inbox envelope | `envelope_0`, `envelope_1` | 40 to 50 px |
| Paper plane | `plane_0`, `plane_1` | 28 to 38 px |
| Gatekeeper | `recruitmentbot` | 100 to 120 px |
| Scope Creep | `scopecreep` | 100 to 120 px |
| Algorithm | `algorithm` | 90 to 110 px |
| Final Review | `finalreview` | 110 to 130 px |
| Idea and skill pickups | `bulb`, `code`, `bricks`, `palette`, `cube` | 24 to 34 px |
| Health / checkpoint / exit | `heart`, `terminal`, `briefcase` | UI or world-specific |

Boss production frames are single base poses. The renderer can animate their position, scale, face tint, telegraph and effects around that pose. The smaller attack and cooldown illustrations on the boss directory are **concepts**, not extracted animation frames. This distinction prevents concept-board art from being mistaken for a complete battle-animation export.

The final guardian is a fictional game character. Its satisfied pose represents the end of the game, not a claim that an employer has made a hiring decision.

## Rebuilding

Run from the project root:

```bash
python3 tools/build-character-atlas.py
```

The tool needs Pillow. It deterministically crops invisible padding, scales with nearest-neighbour sampling and packs the generated assets. It does not draw replacement artwork, remove backgrounds or synthesise animation frames. Generated sources are kept unchanged.

Alpha values are used to identify crop bounds. Original alpha is preserved inside each crop. Use `imageSmoothingEnabled = false` in Canvas and `image-rendering: pixelated` where appropriate. Avoid JPEG export.

## Verification performed

- Inspected the approved hero, enemy and gameplay references before generation.
- Inspected the full generated hero sheet and corrected enemy sheet.
- Confirmed both sources have real alpha channels and empty gutters.
- Inspected the packed atlases at actual pixel dimensions.
- Confirmed all 18 hero frames fit their 80 × 96 cells and use the same foot anchor.
- Confirmed the enemy manifest contains all 18 named assets and eight separately exported icons.
- Recorded source SHA-256 hashes in each manifest for reproducible rebuilding.

These checks establish asset integrity. They do not by themselves establish that every animation is used in the running game; see the game integration and test report for that.

## Generation provenance and prompt record

All new images below were made with the built-in image-generation tool. The source artwork is original to this project, guided by the approved references. No Nintendo or Sega sprite was used.

### Hero atlas

Reference: `assets/reference/hero-approved.png`

```text
Use case: stylized-concept.
Asset type: production animation sprite sheet for a polished original 16-bit side-scrolling platform game.
Input image: approved character reference, use the same character identity, proportions, palette and crisp purple-black outlines. Retain the warm medium-brown skin, short curly dark hair, beard, teal jacket over cream tee, dark indigo trousers, teal backpack, white teal trainers.
Create exactly EIGHTEEN separate full body sprites in a strict 6 columns by 3 rows evenly spaced invisible grid on a genuinely transparent background. Each character faces RIGHT. No labels, no words, no panels, no borders, no numbers, no grid lines, no shadows on ground, no environment, no effects particles. Equal apparent body scale across all cells, centred horizontally, all feet align to cell baseline. Use clean pixel art clusters and hard edges, no gradients or blur. Every sprite entirely inside its cell with generous transparent padding.
Row1 columns1-6: idle normal, idle subtle breathing, run contact left leg forward, run passing, run flight right leg forward, run contact right leg forward.
Row2 columns1-6: run passing opposite, run flight left leg forward, jump launch knees lifting, jump ascending fist up, falling legs bent arms out, dash forward leaning.
Row3 columns1-6: dash extended forward, hurt recoil, crouch down, victory fist up, victory smile both arms up, idle blink.
Keep the jacket, head, face, beard and backpack highly consistent. Distinct easy-to-read poses. Character should occupy about70% of each cell width and80% height in ordinary standing poses; crouch is shorter. Transparent pixels between every asset. This is an animation atlas for extraction, not a presentation poster.
```

### Enemy, boss and pickup source

Reference: `assets/reference/enemies-approved.png`

```text
Use case: stylized-concept.
Asset type: production pixel-art game enemy, boss and collectible atlas. Reference image supplies the EXACT visual style and shapes of the small enemies and recruitment bot, not its sheet presentation.
Create precisely 18 isolated assets in a strict invisible 6-column by 3-row grid, each asset wholly inside its own equally sized cell, no overlaps, generous empty margins. Genuine transparent background, no labels, titles, text boxes, grid lines, ground planes or cast shadows.
Row1 left to right: 1 cream CV document robot with dark cyan monitor and yellow tick, left foot forward; 2 same CV robot right foot forward; 3 angry cream envelope with tiny red trainers and red notification badge, left foot forward; 4 same angry envelope other foot forward; 5 white lavender origami paper-plane with tiny expressive eyes, banking upward; 6 same paper-plane banking downward.
Row2: 1 chunky white and lavender recruitment robot with cyan face, yellow beacon, tie and tiny badge, friendly determined face; 2 Scope Creep boss, rusty orange and purple squat wheeled toolbox mech with huge tool arms and orange beacon, no organic face; 3 Algorithm boss, hovering purple data-eye machine with big cyan round eye, four orbiting yellow pixel squares and purple segmented ring; 4 Final Review guardian, elegant navy and white rounded robot with teal visor, golden shoulder panels and holographic folder; 5 bright golden glowing lightbulb idea pickup; 6 chunky purple octagonal code-token with simple white angle brackets.
Row3: 1 pink heart health pickup; 2 stack of three orange terracotta bricks; 3 colourful painter palette; 4 blue yellow purple puzzle cube; 5 a small pale lavender computer terminal with cyan smiling monitor; 6 golden briefcase pickup.
Polished colourful 16-bit platformer aesthetic from reference: sharp pixel clusters, dark indigo outlines, upper-left highlights, three-tone shading, cute chunky clear silhouettes. All bosses fully visible in their cells. No realistic rendering, no blur, no watermark. This is a technical sprite atlas, not an infographic.
```

### Alpha correction

Edit target: `assets/production/enemies/enemy-source.png`

```text
Use case: background-extraction. This is the exact enemy and collectible atlas to fix, not a style reference. Preserve all 18 assets, their positions and individual pixel designs unchanged. Remove the entire paper-white and lavender noisy background, ALL shadows cast behind sprites, ALL grey clouds, ALL glow halos and stray low-opacity coloured pixels between sprites. Every pixel outside the clean silhouette of each sprite must be fully transparent (alpha0), not a translucent white-grey colour. The 18 sprites themselves must remain opaque with crisp edges. Transparent background checkerboard should not be painted into output. No new objects, no text, no layout changes, no rescaling individual assets. Deliver a true clean alpha cutout sprite atlas for use over a brightly coloured game scene.
```

### Boss concept board

Reference: `assets/production/enemies/enemy-cutout.png`

```text
Use case: stylized-concept.
Asset type: polished art-direction boss concept board for original game HIRED.EXE.
Use supplied reference sheet for the exact chunky dark-indigo outline pixel-art material language and bright cyan/yellow/purple colour palette. Create a premium LANDSCAPE four-column design board, titled "HIRED.EXE / BOSS DIRECTORY" in restrained crisp pixel lettering, on very dark ink-blue background with thin lavender window-frame rules. Each column has one large hero illustration and two smaller poses below. All are pixel-art machine enemies, no real people.
Column1 title "THE GATEKEEPER": white/lavender squat recruitment robot, cyan face, yellow beacon, lavender tie, tiny ID card. Main stance scanning with one arm, smaller attack beam and stunned beacon states. Theme pale blue.
Column2 title "SCOPE CREEP": orange toolbox crawler robot, purple tool arms with spanner hands, hazard stripes, yellow beacon. Main stance overburdened with tools, smaller expanding arms attack and stalled cooldown. Theme warm amber.
Column3 title "THE ALGORITHM": floating purple segmented ring machine with cyan centre eye and orbiting golden square data blocks. Main ominous scan pose, smaller horizontal data wave and dim exposed core. Theme magenta/violet.
Column4 title "FINAL REVIEW": elegant white and navy guardian robot, gold shoulder panels, teal visor, a cyan holographic portfolio folder. Main attentive calm stance, smaller holographic question cards and satisfied green check pose. Theme gold/cyan.
Give each column small three-word captions "READ / REACT / RESOLVE". Keep bosses in same consistent detailed 16-bit graphic style as reference. Evenly balanced spacing and clear silhouettes. Strong top-left highlights, hard pixel clusters, no painterly blur. This is a concept presentation board, not a game screenshot or production atlas. No unrelated icons or licensed characters.
```

