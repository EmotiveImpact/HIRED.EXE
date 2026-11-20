# WORK MODE HANDOVER | HIRED.EXE

**Historical handover.** For the implemented game and current test evidence, see [the playtest report](PLAYTEST.md) and [draft PR #1](https://github.com/EmotiveImpact/HIRED.EXE/pull/1).

**Read this first.** The user has approved the visual direction and wants a proper, polished four-world side-scrolling platformer, not just a concept mock-up. Complete development in this GitHub repository.

**Repository:** https://github.com/EmotiveImpact/HIRED.EXE
**Working branch:** `feat/hired-exe-art-and-game-handoff`
**Draft PR:** https://github.com/EmotiveImpact/HIRED.EXE/pull/1
**Legacy procedural preview:** https://hired-exe-augustus-preview.vercel.app/

## Delivered on this branch
- Standalone four-world playable v0.3 `index.html` and split source in `prototype/source/`.
- Four original illustrated environment backgrounds.
- Hero, enemies, environment and terrain atlas images, plus 32 extracted terrain/prop components.
- Four full original approved concept reference boards.
- Art style guide, four world-level briefs, asset manifest and previous design decisions.
- Preserved screenshot of the old prototype (not final art-integrated gameplay).

## Outstanding work
- **Actually integrate** the new artwork into the playable game. The old v0.3 renderer is still procedurally drawn.
- Inspect and normalise character/enemy atlases, assign trustworthy frame mappings, animate idle/run/jump/fall/dash/hurt/victory and enemy states. The labelled sheets are concept references.
- Build distinct traversal, obstacles, controls, collectibles, secrets, checkpoints and bosses in all four levels using new art.
- Smooth platform physics (acceleration, deceleration, buffered jump/coyote time, double jump, dash, stomp knockback, collisions/respawns and camera) with readable boss telegraphs.
- Build a witty, authentic final interview and verified portfolio/contact buttons. **Do not fabricate an offer** or employer endorsement.
- Keep a reusable edition configuration layer for other job applications, rather than hard-coding every job into the game.
- Visually test start-to-finish across all worlds on desktop and iPhone-sized viewports. Repair all loading, interaction, animation and runtime issues. Capture screenshots of actual gameplay.
- Create a verified preview and update PR with tests/screenshots; **do not merge into main or promote production until user approves**.

## Starting workflow
1. Checkout branch, audit source, existing files and PR. Run old prototype in browser; check console and gameplay baseline.
2. Inspect `assets/manifest.json`, `references/`, `assets/production/`, `assets/tiles/` and `assets/props/`. Use the original PNGs as source, not static composites pretending to be gameplay.
3. Choose the smallest maintainable game architecture that achieves the quality bar. Refactor source if justified, with tests and comparison against working v0.3.
4. Implement runtime assets, animations, separate world collisions, layered parallax and camera.
5. Build all world mechanics and boss states. Tune pacing for a 4–6 minute recruiter experience; supply a skip-to-portfolio action.
6. Add or verify portfolio evidence for real user products. Every name, live link and claim must be evidenced.
7. Test using real browser interactions; include mobile touch tests, keyboard, audio toggle, pause, restart, saved progress, lost life, boss completion, portals and final interview.
8. Commit incremental results to the existing development branch, update draft PR and provide verified preview and QA report for review.

## Definition of finished
A person opens a stable browser URL, plays four visually distinct worlds with an animated Augustus, encounters original enemies and bosses, finishes the interview, and can open authentic project links/contact. Art is actually rendered in-game, not merely generated as concept sheets. No missing assets or console errors in desktop/mobile testing; clear evidence in PR.

## Public access and restrictions
The current repo is **public**, and the legacy preview is public. Treat that fact as intentional until user changes it; do not assume private. Do not expose tokens, secrets, private repositories or personal data. This is independent original art, not licensed Mario/Sonic content or an employer-endorsed game.

## Suggested next Work instruction
> Continue HIRED.EXE using this branch and PR #1. Read docs/WORK_MODE_HANDOVER.md, docs/DECISION_LOG.md and assets/manifest.json. Integrate the approved art into the actual four-world game, produce clean animated protagonist/enemy sprites, test every level and boss on desktop and mobile, and push your changes to this branch. Keep it edition-configurable for future job applications. Provide a verified preview and QA report. Do not merge or deploy to production without my approval.
