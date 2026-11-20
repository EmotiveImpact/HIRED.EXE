# Build and verification plan | HIRED.EXE

## Current reliable baseline
The attached HTML v0.3 is playable with procedural graphics. The newly generated pixel-art pack exists in the handoff ZIP but has **not** yet been integrated or fully tested on the live web build. Use the sources in this repository to preserve v0.3 behaviour while implementing graphics incrementally.

## Implementation stages
1. **Recover assets** from the conversation's `HIRED-EXE-work-handoff.zip`. Preserve references alongside original binary PNGs and the JSON asset manifest. Audit files and provenance.
2. **Normalise atlases**: isolate transparent artwork, consistent frame size/anchor point, explicit sprite-state names, no visible presentation labels. Generate animation data.
3. **Renderer**: central asset manifest, preload/loading errors, nearest-neighbour scaling, background parallax, foreground tiles and props, separate collision masks.
4. **Game feel**: coyote time, buffered jump, double jump, dashing, acceleration/braking, stomp bounce, safe respawns and camera.
5. **World completion**: implement the four blueprints, boss cues, enemy states and hidden rewards. Use edition-specific content for Solved Studio.
6. **Content**: real and verified project portfolio links only. No fictional performance metrics, unapproved employer branding or simulated offers.
7. **QA**: visible browser testing on desktop and iPhone; keyboard/touch, start, pause, resume, audio toggle, terrain colliders, checkpoints, win/lose, all bosses, interview, portfolio CTAs, restart and saved progress. Log and repair console/network errors.
8. **Release**: capture screenshots of each integrated world and a complete successful gameplay test. Deploy a preview before requesting approval for final release.

## Definition of done
Full playable title-to-interview run without manual steps, all four environments visibly use generated asset art, protagonists/enemies have animation states with uniform frames, no broken loads, checkpoints/bosses reachable, mobile controls usable, legitimate portfolio/contact links, and tested public preview.

## Constraints
Avoid pushing tokens or secrets, keep user-owned repositories safe, distinguish concept art from actual captures and do not merge/deploy to public release without review.
