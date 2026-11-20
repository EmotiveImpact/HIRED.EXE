# Repository handoff

## What this package is for

The user asked to finish the game and visual exploration before moving the work into a repository. This package prepares that move. The chosen public repository is `EmotiveImpact/HIRED.EXE`, with the existing draft PR #1 (`feat/hired-exe-art-and-game-handoff`). The source and art remain inspectable before any push or public deployment.

The package preserves a playable build and the editable material that produced it. The release README identifies its entry points and build commands. The two standalone HTML files provide convenient browser delivery, while the source folder carries the art, manifests, documentation and earlier build.

## Structure and ownership

| Location | What belongs here | Treatment |
| --- | --- | --- |
| Root README | How to run, controls, current status and verification | Update each release |
| `src/` | Game simulation, level data, rendering, interface and edition content | Editable source of truth |
| `assets/reference/` | The four user-approved original images | Keep unchanged |
| `assets/production/` | Generated and processed runtime assets with manifests | Keep originals and reproducible processing notes |
| `assets/concepts/` | Boss character exploration | Label as concepts |
| `assets/previews/` | Four actual game captures | Label as runtime captures |
| `docs/` | Art rules, components, content, design decisions and provenance | Keep current with implementation |
| `tools/` | Asset processing and build scripts | Explain inputs and outputs |
| `tests/` | Meaningful simulation and browser checks | Record what each test proves |
| `archive/` | v0.3 build and earlier conversation attachments; the exact conversation export can be added later | Preserve historical versions and explicit version distinctions |
| Offline HTML build | A convenient playable delivery | Regenerate from source when source changes |

Generated runtime assets should be stored with the project rather than referenced from a temporary generation directory. All paths consumed by the game should resolve from the distributed source tree or be embedded in the standalone build.

## Delivered requested work

The source, production assets and records below are included. Verification scope is recorded separately so an implemented feature is not confused with a completed browser or device test.

| Requested outcome | Delivered evidence | Verification scope |
| --- | --- | --- |
| Preserve approved art | Four unchanged reference files and original hashes | Recovered originals inspected |
| Learn and document the style | Art bible with silhouette, palette, material and scale rules | Matched to approved references |
| Define reusable components | Component catalogue, atlases and engine contracts | Actual runtime integration in source |
| Produce playable hero art | 18-frame atlas, foot anchors and animation manifest | Hero visible in the browser's rendered worlds |
| Produce enemy and collectible art | 18-frame atlas and eight standalone icons | Included in renderer; enemy and pickup art visible in world captures |
| Produce environment kit | 16 terrain tiles and 16 props with crop metadata | Generated surfaces and props observed in all four world views |
| Create four world backgrounds | Four individual PNGs and generation prompts | All four displayed in the running browser preview |
| Create boss exploration | Boss directory concept and four runtime boss base poses | Combat behaviour tested in simulation; extra concept poses are not runtime frames |
| Show worlds 2, 3 and 4 visually | Actual captures at `assets/previews/world-2.jpg` through `world-4.jpg` | Captured from the running game |
| Build four distinct levels | Authored layouts, encounters and completion rules | 14 simulation tests pass, including normal and assisted input-only completion |
| Improve launch delivery | Complete relative site and embedded standalone builds | Preview loaded; offline asset, syntax and reference checks pass; final standalones were not visually rechecked |
| Support touch and assist | On-screen controls and Relaxed mode | Portrait iframe observed; move-right touch action changed position; assist tested in simulation |
| Preserve exploration | Curated history, seven verbatim visible requests, 27 attachment records and new prompts | 26 supplied originals recovered; one older standalone explicitly substituted with current authorised v1; full chat export unavailable |
| Prepare reusable employer editions | `src/edition.js` and content guide | Current edition implemented and its text observed in preview |

`art-book.html` presents the references and production assets through tabs, a world selector, lightbox and hero-atlas animation preview. It has inline styling and scripts, relative images and no remote dependencies. The standalone art book embeds its images, linked notes and atlas metadata. Offline bundle, syntax and reference checks passed; its complete interactive presentation was not visually tested in the final build.

The permitted browser preview also demonstrated world selection and the pause/help return flow. Further browser work was blocked by the environment's security policy. The final interview UI sequence, physical mobile devices and the source update preserving 16:9 on narrow screens were not re-observed. `RELEASE-CHECKLIST.md` records these practical limits with the evidence.

## Moving into the chosen repository

Once the destination is known, inspect its existing structure and instructions. Import the project as an isolated change, preserve existing unrelated work, and keep the historical references distinct from the latest runtime files. If the destination already contains an earlier HIRED.EXE build, compare the versions before overwriting it.

Use a small, readable first set of commits: preserved baseline and documentation, runtime art, then the implemented game and verification. The exact grouping can follow the repository's conventions. Large generated images may suit Git LFS if the destination already uses it; do not introduce a dependency on LFS without checking the hosting workflow.

Keep the existing art and its provenance with the source. Do not add an open-source licence or claim third-party rights on the user's behalf. If the repository is to be public, the owner can decide its licence and whether historical conversation exports should be public too.

## Conversation archive

`EXPLORATION-HISTORY.md` is a readable decision record. `VISIBLE-REQUEST-RECORD.md` preserves the seven available user requests verbatim. For the whole conversation, add the user's actual ChatGPT export unchanged under `archive/conversation-export/`, then link it from these records.

`ATTACHMENT-INDEX.json` covers 27 historical records. The four approved images and v0.3 archive are preserved alongside 22 earlier attachment records in `archive/conversation-files/`. Twenty-six of the supplied originals were recovered. One older `index.html` reference had a rejected file/version pairing; its current authorised v1 is clearly separated in `26-current-v1/` and is not labelled as the unavailable older content. The index preserves this distinction and the metadata's unverified chronological order.

## Handoff review

Before a public application is sent, the practical remaining review is editorial and experiential: confirm the target role, choose verified project links, confirm contact details, then play the normal and assist routes on the intended devices. Publishing and applying are separate actions from preparing this code package. This handoff does not submit a job application or send any message.
