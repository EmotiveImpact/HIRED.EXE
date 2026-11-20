# Incident: illustrated game not reflected in live link

## User-visible failure

At approximately 20 November 2026 the user reported that the new image-generated 16-bit art was not visible in the playable game. The browser URL they had been opening, `https://hired-exe-augustus-preview.vercel.app/`, was served from an independently created Vercel project with the *old* v0.3 single-file application. A newer v0.4 illustrated game and offline/art-book bundles were created separately and never connected to the old deployment or the GitHub branch shown to the user.

The first draft PR (`#1`) contained v0.3 source and an art-specification handoff, not the new runtime images. The PR accurately stated it was not an illustrated release, but the separate chat messaging described the art/game as 'now in place' and created the expectation the existing link had changed. This mismatch caused the report and should not recur.

## Corrective controls

1. Commit the entire modular v0.4 source tree, tests, manifests and actual referenced assets onto the same PR branch. Check that `assets/production/...` is present and the `index.html` imports the modular v0.4 scripts.
2. Keep `docs/CONVERSATION-CONTEXT.md`, `docs/WORKMODE-HANDOFF.md`, original `assets/reference/` and art bible in the repo.
3. Build using `python3 tools/build.py`; run `node --test tests/simulation.test.js` and `python3 tests/build-check.py`.
4. Deploy **from the same reviewed commit** or explicitly compare source hashes; verify the public URL contains `HIRED.EXE 0.4` and serves 17 actual images, then capture a screenshot of the v0.4 gameplay.
5. If Vercel or browser verification fails, supply the correct offline v0.4 file and clearly say the existing hosted URL is old.
6. Never use concept images from asynchronous searches as evidence of game runtime artwork.

## Scope of this repository change

This is a staging fix and Work mode handoff. No claim of applying for the role, a job offer, Solved Studio endorsement or a finished production release. The site source must be verified on actual devices before submitting to employers.
