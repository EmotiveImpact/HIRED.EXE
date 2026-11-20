# Asset import checklist

The original 53-file bundle **HIRED-EXE-work-handoff.zip** was generated in this project's ChatGPT conversation. The binary images are **not yet present on this Git branch**. In Work mode, take that archive as the input and import these paths:

- `assets/backgrounds/01-application-alley.png`
- `assets/backgrounds/02-ship-it-city.png`
- `assets/backgrounds/03-growth-run.png`
- `assets/backgrounds/04-final-interview-hq.png`
- `assets/atlases/terrain-4x4.png`
- `assets/atlases/props-4x4.png`
- `assets/tiles/*.png` (16 individual generated tile crops)
- `assets/props/*.png` (16 individual generated prop crops)
- `assets/manifest.json` (atlas coordinates)
- `references/approved-gameplay-target.png`
- `references/augustus-character-concepts.png`
- `references/enemies-hud-concepts.png`
- `references/environment-concepts.png`

The background plates are parallax artwork, **not physical colliders**. The 4×4 source art sheets are separate from the visually labelled character and enemy *concept* sheets. Do not crop character animation blindly. Normalise sprites and verify them at real game size.

This document exists so the correct art can be imported without fabricating missing files or claiming assets are already committed.
