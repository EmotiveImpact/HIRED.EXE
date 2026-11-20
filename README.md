# HIRED.EXE 🎮

**A job application you can play.** An original, four-world 16-bit-inspired browser platform game starring Augustus, with a hiring-process adventure and employer-specific editions.

**Current status (20 November 2026):** The v0.3 game is playable as a standalone HTML file with procedurally drawn graphics. A new original 16-bit-inspired art direction and 53-file artwork/source handover bundle have been produced separately. **The new generated artwork is not yet integrated into this checked-in game.** Do not present this branch as the finished art-rich release.

## Play

- [Existing hosted v0.3 prototype](https://hired-exe-augustus-preview.vercel.app/)
- Open `index.html` in a modern browser or serve the repository: `python3 -m http.server 8000`, then visit `http://localhost:8000/`.
- Keyboard: **A/D** or **arrows** to move, **Space/W/Up** to jump and double-jump, **Shift/X** to dash, **P/Escape** to pause. Touch controls are shown on mobile.

## Four worlds

| World | Edition 001 concept | Theme |
| --- | --- | --- |
| 1. Application Alley | The CV Filter | Recruitment, tutorial, moving CV enemies |
| 2. Ship It City | Scope Creep | Building, deadlines, moving platforms |
| 3. Growth Run | The Algorithm | Momentum, speed, reach |
| 4. Final Interview HQ | The Interview | Precision, portfolio evidence, conversation |

The game is a **demonstration of creative and product-building capability**, not a promise or claim that a job offer has been made.

## Design system

Original 16-bit-inspired pixel art with a retro Windows application frame. Core visual direction: teal-jacket hero, warm terracotta/grass terrain, violet architectural outlines, cyan technology, gold pickups and blossom-coloured city backdrops. See `docs/ART_STYLE_BIBLE.md`, `docs/LEVEL_BLUEPRINT.md`, `docs/IMPLEMENTATION_PLAN.md`.

The original approved gameplay concept, hero/enemy sheets, four background plates, 4×4 terrain atlas, 4×4 props atlas, 32 extracted tiles/props and asset manifest are included in the **HIRED-EXE-work-handoff.zip** delivered in the project conversation. Those binary graphics must be imported into `assets/` in the next repository pass. `docs/ASSET_IMPORT.md` lists the expected paths.

## Project layout

- `index.html`: fully self-contained playable v0.3 (no dependencies)
- `prototype/HIRED-EXE-PLAY.html`: original packaged v0.3 snapshot
- `docs/`: visual bible, level design, development acceptance tests, handoff
- `assets/`: planned target location for the production image assets

## Ownership and accuracy

Original game and generated art assets created for Emotive Impact. Mario/Sonic are historical genre references only, not assets or character designs used here. No third-party licence is granted merely by this public repository; all rights reserved unless separately stated. The Solved Studio edition is an independent application and is **not endorsed by Solved Studio**.

## Next production milestone

1. Import and normalise the approved PNG backgrounds, tile atlas, prop atlas and isolated components.
2. Export usable, uniform-frame transparent Augustus and enemy sprite atlases from the reference illustrations; do not slice labelled presentation sheets as if they were ready-made frames.
3. Wire background parallax, terrain sprites, foreground props and animation states into the actual renderer.
4. Test all four worlds, checkpoints, enemy and boss collisions, mobile controls and final interview in a visible browser.
5. Publish a verified preview with screenshots and a reviewable PR.

**Do not claim the art-rich build is finished until those tests have actually passed.**
