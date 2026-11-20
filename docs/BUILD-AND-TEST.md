# Build and test

## Runtime and entry points

HIRED.EXE uses browser-native HTML, CSS, JavaScript, Canvas 2D and Web Audio. All game artwork is included. No package installation, API key, backend, CDN or remote font is needed to play.

| Entry point | Use |
| --- | --- |
| `index.html` | Editable source game, with relative project files |
| `art-book.html` | Editable visual catalogue, with relative assets and docs |
| `dist/index.html` | Built static-site entry point |
| `dist/art-book.html` | Built static-site art catalogue |
| `dist/HIRED-EXE-v0.4-PLAY.html` | Standalone game with embedded code and gameplay images |
| `dist/HIRED-EXE-v0.4-ART-BOOK.html` | Standalone visual catalogue with embedded assets |

Open a standalone file directly in a modern browser. Keep both files in the same directory for the game/art-book cross-links. A local source page needs its folder intact. If a file-preview application displays the HTML as text or suppresses scripts, download the file and open it in the browser.

## Rebuild the delivery

From the project root:

```bash
python3 tools/build.py
```

The build assembles the static site and standalone files from the editable source and included artwork. Rebuild after changing the edition, interface, renderer, level data or asset manifests. Do not hand-edit the generated standalone HTML as the main source of truth.

Verify the generated delivery:

```bash
python3 tests/build-check.py
```

**Observed result: offline bundle checks passed.** The game contains 17 embedded images and seven inline scripts. The art book contains 26 embedded images and two inline scripts, including the four actual JPG world captures. Its 20 embedded download-link occurrences cover seven unique Markdown documents and four unique atlas JSON files. Across the source, static site and standalone files, 23 scripts parsed through Node's JavaScript parser and 154 relative HTML references resolved.

The check also verifies embedded image headers and exact source bytes, dynamic world-image and zoom lookup, and the hero preview's embedded atlas source. No required font, stylesheet or script loads from a remote service. The only companion-file navigation is between the supplied game and art-book HTML files. These are structural and syntax checks, not a visual browser rerun.

Building requires Python 3 and its standard library. The browser runtime has no npm dependency. Node is used for simulation tests and the bundle check's JavaScript syntax validation. Pillow is needed only when regenerating atlases.

For local source development, an optional server can be started from the project root:

```bash
python3 -m http.server 8000
```

Use `http://localhost:8000/` for the source or `http://localhost:8000/dist/` for the built site. Stop the server with Ctrl+C. Serving over HTTP also gives browser storage a consistent origin; `localStorage` behaviour for downloaded files can vary by browser.

## Regenerate the atlases

The included source PNGs preserve the generated artwork. The processing scripts crop inspected regions, normalise sizes and anchors, and write the production PNG and JSON atlases.

```bash
python3 tools/build-character-atlas.py
python3 tools/build-environment-atlas.py
python3 tools/build.py
```

These processing scripts require Pillow. They do not call image-generation services or require an API key. Source crops are documented in the JSON manifests through `sourceRect`. Review the resulting sprites and repeating terrain at gameplay size after changing a source image or crop specification.

## Simulation verification

```bash
node --test tests/simulation.test.js
```

**Observed result: 14 tests passed.** The suite checks:

- Distinct layouts, two checkpoints and three skills in each world.
- Movement parity at 30, 60 and 120 Hz rendering inputs.
- Variable jump height, double jump, coyote time and jump buffering.
- Moving-platform carrying, one-way collision and enemy stomps.
- Checkpoint healing, preserved progress, bounded damage and assistance.
- Reversing direction on a boost lane and boss vulnerability rules.
- Input-only completion of all four levels in normal and assisted modes.

The traversal controller starts at the actual spawn and uses movement, jump and dash inputs. It defeats bosses through their normal damage rules and reaches the actual exit. It does not teleport, change boss health or force a completion state.

| World | Assisted route | Assisted falls | Normal route | Normal retries |
| --- | ---: | ---: | ---: | ---: |
| Application Alley | 20.7 s | 0 | 22.4 s | 0 |
| Ship It City | 20.6 s | 0 | 23.9 s | 0 |
| Growth Run | 20.9 s | 0 | 28.4 s | 1 |
| Final Interview HQ | 19.5 s | 0 | 21.6 s | 0 |

These are fast, deterministic runs with known geometry. They demonstrate reachability and progression. They do not measure a human player's completion time, subjective difficulty or success in collecting every optional skill token.

## Interface and visual verification

The assembled game was opened in the permitted browser preview. The title screen and all four worlds loaded with generated art and the HUD. World selection, pausing and returning from help were observed. A 390 × 844 portrait iframe displayed the interface, and activating its move-right touch control changed the player's position. These are browser observations, not a physical-phone test or a complete human playthrough.

The four images at `assets/previews/world-1.jpg` through `world-4.jpg` are actual captures of the running game. They supply the visual level views for this release. The approved reference image and generated boss directory remain labelled as concepts.

The art catalogue's JavaScript and embedded assets passed the bundle checks above. An earlier local Playwright attempt could not launch Chromium because the environment denied a required socket operation. The later permitted browser preview provided the observations above. Further window switching and preview reloads were then blocked by the environment's security policy, and browser work stopped without bypassing it.

The final rebuilt standalone files and art book were not visually rechecked after that block. The complete three-topic interview UI flow, physical mobile devices and the later source fix preserving 16:9 on narrow screens were not re-observed. These limits are recorded alongside the delivered implementation in `RELEASE-CHECKLIST.md`.

## What changes need rechecking

Run the simulation suite after changes to physics, collisions, boss rules or layouts. Recheck asset loading and visual alignment after changes to manifests or artwork. Check the relevant menu flow after changing interface state or interview content. A new employer edition usually needs copy and link review, plus a launch and navigation check, rather than a new physics system.

The current portfolio entries have no public project URLs configured. Add verified URLs in `src/edition.js` when appropriate. Contact actions open an email draft, and project links open only when configured with an accepted URL scheme.
