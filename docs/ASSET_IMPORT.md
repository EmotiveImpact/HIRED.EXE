# Actual game assets | current state

The original artwork **has been uploaded to this GitHub branch**, not left in a handover ZIP. `assets/manifest.json` is the path inventory.

## Art currently committed
- Four world backgrounds in `assets/production/backgrounds/`.
- An Augustus hero atlas, enemies atlas, terrain atlas and props atlas under `assets/production/`.
- Source 4×4 terrain/prop atlases in `assets/source-atlases/`.
- 16 extracted, transparent terrain PNGs in `assets/tiles/` and 16 extracted prop PNGs in `assets/props/`.
- Four approved concept sheets in `references/`.

## Integration cautions
The four labelled concept sheets are reference artwork, not guaranteed uniformly dimensioned animation strips. Review the new production atlases before assigning frame rectangles, pivot points and collision bodies. Normalise tile and prop padding, use nearest-neighbour sprite rendering, keep parallax backgrounds behind physical colliders, and test foreground clarity across all four worlds.

The current `index.html` still uses its **original procedurally drawn graphics**. Do not describe the new illustrated worlds as implemented in-game until screenshots from an end-to-end playthrough prove it.

## Recover if needed
`HIRED-EXE-work-handoff.zip` exists in the originating ChatGPT conversation as a backup. The **repository branch** is the source for continuation.
