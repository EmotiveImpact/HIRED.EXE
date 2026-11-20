# HIRED.EXE: Project conversation context and decision log

> **Scope:** Project-specific history recreated from the visible project conversation and recovered attachments, not an export of private model reasoning or unrelated chats. The precise full ChatGPT transcript has not been exported. This document is an indexed handover for ChatGPT Work and future engineers, not a claim of verbatim assistant messages.

## Product and intent

HIRED.EXE is an original 16-bit-inspired side-scrolling platformer by Augustus Edem. The first employer edition is a playful application for Solved Studio, whose website aesthetics suggested an old Windows 3.11 / Netscape-era operating system. The game embodies an unconventional hiring process in four short side-scrolling worlds and should show product judgement, AI-assisted delivery, design and creative leadership. It must not claim a job has been offered or endorsed by Solved Studio.

**End-user experience:** Reviewer opens a simple shared URL, immediately sees a beautiful, functioning game, plays if desired, or skips straight to the portfolio and contact. The game should be short enough to finish in one sitting (target 4-6 minutes). The humorous hiring obstacles are the game, not an ornamental CV overlaid on generic obstacles. It needs smooth run/jump/dash gameplay, achievements, four visually distinctive levels, genuinely useful portfolio evidence and a strong final interview with a real contact action. It must be reusable across employers, with an edition-specific content layer rather than duplicated code.

## User direction, in order (verbatim where quoted)

1. **Original pitch:** "i want to make a game to apply for solved.studio considering their style of the website loking like a widnows 3.11 operating style... so im thinking about making a 3-4 level game where its me going through the hiring process!" The resulting concept was HIRED.EXE, with Windows application chrome, a pixel Augustus character, four hiring stages and a strong comedic ending.
2. **Reusability:** "lets do this and should i create a game that eventually can be used to apply for all of the jobs". Requirement: shared engine, employer editions, portable portfolio and employer-specific dialogue/theme. Solved Studio is Edition 001, not the entire product.
3. **True platformer:** "o this i s a good start but i need a proper game now a side scroller in the style of snoic and mario actually o lets go ahead and create the game properly!". Sonic/Mario are movement and pacing references, not licensed assets; implement original artwork and mechanics.
4. **Broken delivery / misleading images:** "its not loading.... also did you make the gam with these styles". Earlier assistant showed inspiration images while the actual build was procedurally drawn. New requirement: accurately distinguish illustration from the running game and verify links/visual assets.
5. **Art direction:** "ok now improve the graphics and sprites i want you to make some image generations lets choose an art style i want more super mario world level graphics so better looking sprites and world but this is a good start!! lets see what you can do visually with the image generator". User preferred the generated colourful, lush 16-bit world: vivid green grassy terracotta brick, violet borders/shadows, lavender city skylines, cyan tech highlights, gold lightbulbs, and an original smiling dark-skinned hero Augustus in teal jacket and sneakers. Windows UI should frame the game, not dominate the scenery.
6. **Explicit visual approval:** "ok save this now and get this design properly learn the art style and put it together as components and then build out the levels this is excellent". Approval refers to four original generated concept images and asset-sheet ideas. Preserve `assets/reference/` and the rules in `docs/ART-BIBLE.md` as canon. Export production-friendly isolated assets and sprite animation frames, not labelled reference-poster crops as frame atlas.
7. **Complete art/game then migrate:** "get all of these done and well then we will move the entire conversation and exploration on the repo". Outcome: the illustrated v0.4 source kit, art book, assets, level designs, runnable builds, QA, source prompts and provenance should be in GitHub, not stranded in a downloadable ZIP.
8. **Report of a real delivery failure:** "The new art isn’t in the game it’s the old style what happened to the where is the new game and did you copy this conversation as context into the repo !! Do it". The old `hired-exe-augustus-preview.vercel.app` address was still serving procedurally drawn v0.3, while v0.4 was a separate package. Existing draft PR #1 had documentation + old game only and even said new artwork was *not* in the repo. The assistant had not actually published v0.4 to that URL, creating understandable confusion. This is a shipping defect, not user error.
9. **Work mode handoff:** "what were you doing did you finish?get it all ready to be handed off to workmode". Goal is a single reviewable repository with the new illustration, testable source, accurate status and ready-to-run next-work instructions.

## Four world specifications

- **01 Application Alley:** Sunny, colourful retro-tech city. Tutorial for running, variable jump, double jump, dash, stomping; CV-bots, angry inboxes and paper planes. Recruiter Filter / Recruitment Bot. Grassy terracotta, coffee shop facades, signs, tunnels, ladders, trees; ideas/skills collectibles.
- **02 Ship It City:** Warm industrial sunset, cranes, conveyors, mechanical walkways. Faster build-and-ship puzzles, moving platforms, tool crates, problem-solving pickups. Scope Creep boss.
- **03 Growth Run:** Twilight neon growth district, fast rail, graphs and promotion motifs. More momentum, dashing, aerial threats and risk/reward lanes. The Algorithm boss.
- **04 Final Interview HQ:** Calm elegant rooftop/glasshouse ascent with violet stone and cyan glass. Precision platforming, final guardian, then a playful conversation about real products. The user should be able to see genuine portfolio evidence and request a call. No simulated job offer.

## Canonical character and visual treatment

- Hero: expressive Black British/Nigerian man, short dark curly hair and beard, medium-brown skin, teal jacket, cream shirt, dark trousers and teal/white trainers. He is not Sonic or Mario; facial proportions and outfit should remain consistent across animations.
- Original enemies are personifications of recruitment bureaucracy (CV-Bot, Inbox Envelope, Paper Plane Scout, Recruitment Bot) plus employer-themed bosses. Do not copy game franchise characters.
- Camera: true 2D side-scrolling, obvious playable surfaces, rich non-collidable parallax, bright legible pickups, maintain contrast between foreground and background.
- Source of truth: approved original artworks under `assets/reference/`, scripts + runtime atlases under `assets/production/`, work notes under `docs/`. Generated art references are *not* production sprite frames until extracted with alignment metadata.
- UI: playful desktop/Windows-era look with blue title bar, bevels, readable HUD and accessible mobile controls. The game world itself should feel rich and cinematic, not a plain desktop.

## Architecture and implementation status

The initial v0.3 was a single HTML platformer using simplified procedural graphics. v0.4 is a modular, framework-free Canvas 2D game whose actual renderer draws production sprites/tiles and four real backgrounds. Source modules: `src/edition.js`, `src/assets.js`, `src/levels.js`, `src/simulation.js`, `src/renderer.js`, `src/app.js`, plus `styles.css`, `index.html`, and `art-book.html`. All four levels, checkpoint, enemies, bosses and portfolio are implemented. Built offline HTML bundles exist separately and must always be regenerated from source (never hand-edit the generated bundle).

14 simulation tests passed on 20 Nov 2026, including input-only traversal in both normal and assisted modes; the modular structure/static check also passed. Browser preview previously observed the title screen, four rendered worlds and touch controls, with explicit limitations in `docs/RELEASE-CHECKLIST.md`. Do **not** conflate the test harness with real iPhone/Safari play-through.

The earlier v0.3 GitHub branch did not contain the production artwork. The user saw old visuals on the existing hosted URL because it had not been updated. This incident is documented in `docs/DELIVERY-INCIDENT.md`. The corrected PR branch must contain source + image assets + instructions. A live deployment is verified only if the URL demonstrably serves v0.4 with visible new sprites and backgrounds.

## Portfolio truth and user positioning

Show real shipped/design work, without claiming independent advanced Python/TypeScript coding ability. The user describes themself as an AI-native product builder and creative director who directs AI coding agents, thinks in product/systems architecture, tests outputs, makes design decisions and ships. Experience includes web/graphic/interactive design and more than 20 years in video, editing and creative direction. Projects referenced in this conversation: Vlume, Commune, Cairn and Emotive Impact. Their repos may be private and public proof/links must be verified before claiming evidence. Current source intentionally leaves unverified portfolio URLs blank and offers a walkthrough route.

## Verification and handoff rules

- Do not claim something is live unless the hosted URL has been checked and shows the v0.4 illustrated renderer. If a hosted site still runs v0.3, say so plainly.
- Keep the branch in draft until all art assets are present and full user journey has been tested; do not silently merge to main.
- Build and test: `node --test tests/simulation.test.js`, `python3 tools/build.py`, `python3 tests/build-check.py`.
- Regression acceptance: fresh visitor can start game, play and complete 4 worlds, pause/restart/checkpoint, open portfolio before play, get to interview and contact, and use touch controls; offline edition must load all art; Windows chrome must not hide key mobile controls.
- Preserve full provenance, generated prompts and original references; keep tool/QA reports and status candid.
- This document covers **visible project-specific discussion**. The full exported ChatGPT conversation, if desired verbatim, needs the actual user-provided export. Do not invent absent messages or private chain-of-thought.
