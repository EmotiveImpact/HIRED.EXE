# Working on HIRE.EXE

## Keep the direction recognisable

- Read `docs/ART-BIBLE.md` and inspect `references/` before changing the visual language.
- Keep Augustus's approved character design, violet outlines, warm brick, bright foliage and cyan technology. The desktop chrome frames the game.
- Use the existing production atlases and manifests. Preserve original references and generated sources. Put new visual versions alongside them and update their provenance.
- Keep collision surfaces readable. Decoration, arches and ladder props do not imply mechanics that the engine does not implement.

## Code and content

- Use British English. Keep candidate claims accurate and make employer changes in `src/edition.js`.
- Keep the game usable without completing it: the world directory and portfolio remain accessible.
- Keep simulation, rendering, edition content and UI in their existing separate files.
- Physics use a fixed 60 Hz simulation. Preserve keyboard edge events, touch cancellation, pause behaviour and checkpoint recovery.
- The runtime is dependency-free and works with local image/script files. Keep offline editions self-contained for their core experience.
- Do not edit the generated standalone HTML directly. Change source, then rebuild.

## Build and verification

```bash
node --test tests/simulation.test.js
python3 tools/build.py
python3 tests/build-check.py
python3 tools/package.py
```

Pillow is required only for regenerating atlases. The normal build uses Python's standard library.

Inspect important visual changes in a permitted browser surface when available. Report the scope of observed checks accurately. Input-only engine traversal, DOM interaction and a physical-device play-through are different evidence.

## Documents

`docs/` holds the art bible, the level design, the engine API and the playtest report. `assets/cutscenes/PANEL-BRIEF.md` is the brief for the full-panel cutscene art: reference sheets, locked rooms, one prompt per panel and how to wire panels in. `docs/ASSET-MANIFEST.json` is written by `tools/build.py`. Keep facts that change with the code, such as test counts and timings, in `docs/PLAYTEST.md` only.
