# Environment asset production

## Delivered kit

The environment pack contains **16 terrain tiles, 16 props and four individual world backdrops**, generated from the approved visual direction and processed for the runtime renderer.

| Asset | Dimensions | Contents |
| --- | --- | --- |
| `assets/source/terrain-generated.png` | 1254 × 1254 | Original generated terrain sheet |
| `assets/source/props-generated.png` | 1254 × 1254 | Original generated prop sheet |
| `assets/production/environment/terrain-atlas.png` | 384 × 384 | Sixteen 96 × 96 terrain cells |
| `assets/production/environment/props-atlas.png` | 768 × 768 | Sixteen props in 192 × 192 storage cells |
| `assets/production/backgrounds/application-alley.png` | 1672 × 941 | Daytime city, railway and leafy neighbourhood |
| `assets/production/backgrounds/ship-it-city.png` | 1672 × 941 | Warm industrial district and workshops |
| `assets/production/backgrounds/growth-run.png` | 1672 × 941 | Twilight towers, transit and neon signals |
| `assets/production/backgrounds/interview-hq.png` | 1672 × 941 | Airy glass atrium, gardens and city view |

Each production atlas has a matching `.json` file. Full generation prompts are retained in `assets/source/environment-prompts.json` and `assets/source/background-prompts.json`. These are the prompts for this production pass, not reconstructed prompts for the older approved references.

## Semantic names

| Terrain family | Manifest names |
| --- | --- |
| Grass and brick | `grass`, `grass_flower`, `brick`, `vine` |
| Industrial | `hazard`, `metal`, `brick_metal`, `vent` |
| Technology | `neon`, `tech`, `magenta`, `window` |
| HQ stone and glass | `stone_gold`, `stone`, `stone_ivy`, `glass` |

| Prop family | Manifest names |
| --- | --- |
| Street and planting | `cafe`, `tree`, `pink_tree`, `arch` |
| Interactive-looking objects | `career_block`, `crate`, `terminal`, `ladder` |
| Platform silhouettes | `grass_platform`, `metal_platform`, `neon_platform`, `stone_platform` |
| Landmarks and destination | `banner`, `satellite`, `lamp`, `portal` |

The names identify visual assets, not automatic gameplay capabilities. A ladder in the kit does not enable climbing. The simulation currently uses axis-aligned ground and one-way platforms; arches are decorative. Checkpoints use the terminal asset, and the exit uses the portal asset.

## From generated sheet to atlas

The image-generation tool produced the original artwork, including transparent separation around the individual objects. `tools/build-environment-atlas.py` performs the engineering step. It does not draw replacement scenery.

Generated grids are visually regular but cannot be assumed to have exact mathematical cell boundaries. The script therefore uses inspected column edges and row bands for each source sheet. Within each band, the alpha channel identifies the occupied bounds. The resulting `sourceRect` records the original region used for each asset.

Terrain crops are resized to 96 × 96 with nearest-neighbour sampling and packed into a 4 × 4 atlas. Props preserve their aspect ratio, fit within a 176-pixel maximum extent, and are centred near the bottom of 192 × 192 storage cells. Their frames record the actual occupied rectangle rather than the whole padded cell.

Every frame includes `x`, `y`, `w`, `h`, an `[x, y]` anchor and `sourceRect`. The anchor is the horizontal centre at the bottom of the frame. The atlas metadata also identifies the original source image. Keep these source rectangles with the images so future corrections are reproducible.

## Runtime use

The renderer repeats 96-pixel terrain artwork along each ground segment. Theme mappings are:

| World | Top | Fill | Accent variation | Floating platform |
| --- | --- | --- | --- | --- |
| Application Alley | `grass` | `brick` | `vine` | `grass_platform` |
| Ship It City | `hazard` | `brick_metal` | `vent` | `metal_platform` |
| Growth Run | `neon` | `tech` | `window` | `neon_platform` |
| Final Interview HQ | `stone_gold` | `stone` | `stone_ivy` | `stone_platform` |

Ground is clipped to the simulation's geometry. The visual top can slightly overlap a collision surface to show grass or ornamental trim. Props are independently positioned around safe ground anchors. Moving platforms receive additional indicators from the renderer.

Each world backdrop is a single painted image containing several perceived depths. The current renderer scrolls that plate at 0.12 of camera speed and alternates mirrored copies at its edges. Ambient particles and foreground props add independent movement. This is not a claim that three separately generated background layers were delivered. The artwork, physical platforms and actors remain separate, so gameplay geometry is never taken from the painted scenery.

## Provenance and future changes

The approved environment and gameplay images remain unchanged under `assets/reference/`. The new source sheets remain under `assets/source/`. The production atlases and individual backdrops live under `assets/production/`. `docs/ASSET-MANIFEST.json` provides the package's origin and integrity record; the per-atlas JSON files provide exact crop lineage.

To regenerate the packed assets, install Pillow in the development environment and run:

```bash
python3 tools/build-environment-atlas.py
python3 tools/build.py
```

Review the atlas and rendered world afterwards. Pay attention to neighbouring-cell contamination, transparent gutters, repeated tile edges, platform-top alignment and props that obscure a landing. Preserve a new generated source as a new version when changing the artwork, rather than overwriting an approved historical reference.
