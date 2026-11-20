# HIRED.EXE 0.4

**A four-world pixel-art platformer and playable introduction by Augustus Edem.**

Run, jump and dash through a fictional hiring journey, then meet the person behind the game. The first edition is written for Solved Studio. Employer content is separate from the engine so the same game can support future applications.

The game combines an original illustrated hero, generated terrain and character atlases, four distinct city backdrops and a retro desktop interface. The approved art exploration, production sources, prompts and design decisions travel with the project.

## Open the game

Download and open **`HIRED-EXE-v0.4-PLAY.html`** in a modern browser. It contains the game's scripts, styles and images, so gameplay needs no installation, account, API key or internet connection. Browser preview panes in chat or document viewers may not execute the game; open the downloaded file in the browser itself.

Open **`HIRED-EXE-v0.4-ART-BOOK.html`** to browse the original concepts, production components, world art and live hero animation preview. Keep the two standalone files beside each other to use their cross-links.

For the editable source, open `index.html` with the complete project folder intact. The art catalogue is `art-book.html`. The distributed site under `dist/` has the same relative structure. A local web server is optional:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser. See [Build and test](docs/BUILD-AND-TEST.md) for rebuilding the delivery files.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A / D or Left / Right | Arrow buttons |
| Jump | Space, W or Up | Jump |
| Double jump | Release, then press jump again in the air | Tap Jump again |
| Jump higher | Hold the jump button | Hold Jump |
| Dash | Shift or X | Dash |
| Drop through a floating platform | Down or S, plus jump | Keyboard action only |
| Pause / resume | P or Escape | Pause in the top menu |

Collect lightbulbs for ideas and find three optional skill tokens in each world. Stomp or dash through ordinary enemies. Bosses warn, attack and then expose an opening; stomp or dash while their shield is down. Defeat the boss to open the exit. Collectible totals do not block completion.

Computer checkpoints heal and save your position within the current level session. Retries are unlimited. Falls and damage preserve collected ideas, skill tokens, defeated enemies and boss damage until the level is restarted.

## Four worlds

| World | The route | The encounter |
| --- | --- | --- |
| **Application Alley** | Grassy brick streets, simple gaps and optional upper paths | Recruitment bot |
| **Ship It City** | Industrial terraces, moving platforms and construction routes | Scope Creep |
| **Growth Run** | Boost lanes, wider gaps and paper planes | The Algorithm |
| **Final Interview HQ** | A terraced approach through an airy headquarters | Final review guardian |

Every world is available from **Choose a world**. Enable **Relaxed mode** there or in the pause menu to turn off contact and projectile damage. Falling still returns you to a checkpoint, so movement remains part of the experience.

The last world leads to three conversational topics, with three choices per topic and no wrong answers. The ending invites a portfolio walkthrough or a conversation. It represents completing a fictional journey, not a real hiring decision.

## Portfolio and saved progress

The **Portfolio** menu and **Meet Augustus** button let visitors see the work without playing. The included project descriptions cover Emotive Impact, Vlume, Commune and Cairn. Public project URLs are currently unset, so the interface offers descriptions and walkthroughs on request. **Let's talk** opens the configured email draft; it does not send a message automatically.

The browser stores completed-world results, best scores and times, collected skill IDs, the last selected world and the Relaxed mode preference in `localStorage`, under an edition-specific key. This does not save a live position halfway through a level. Storage restrictions are handled without preventing play. Sound starts off each time the page is reopened; use **Sound on** for the original synthesised music and effects.

## Make another employer edition

Edit `src/edition.js` to change the edition ID, company, role, introduction, profile, portfolio and interview copy. Use a new ID to keep progress separate. Add only accurate project descriptions and verified links. The platforming engine and art can remain shared.

The current edition is an independent application project. It does not imply Solved Studio involvement or approval. [Content guidance](docs/CONTENT.md) explains the reuse boundary and provenance of the candidate copy.

## Build and checks

```bash
python3 tools/build.py
node --test tests/simulation.test.js
python3 tests/build-check.py
```

Building uses Python's standard library. The game itself has no npm packages, framework, backend or remote font dependency. Regenerating the atlases from their included source images additionally uses Pillow; normal building and playing do not.

The simulation suite has **14 passing tests**, including actual input-only traversal of every world in normal and assisted modes. In the permitted browser preview, the title screen, all four rendered worlds, world selection and pause/help return flow were observed. A 390 × 844 portrait iframe was also inspected, and its move-right touch control changed the player's position.

Offline bundle checks passed for the embedded assets, inline-script syntax and local references. The standalone game includes 17 images, and the art book includes 26 images, the four actual game captures and its linked notes and atlas metadata.

The final rebuilt standalone files and art book were not visually rechecked after browser access became blocked. The complete interview UI flow and physical mobile devices were not tested. A later narrow-screen aspect-ratio fix is included in source but was not re-observed in the browser. [Build and test](docs/BUILD-AND-TEST.md) and the [release checklist](docs/RELEASE-CHECKLIST.md) distinguish the implemented work from these verification limits.

## Explore the project

| File or directory | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `src/` | Editable game and employer edition |
| `art-book.html` | Visual catalogue with animation and image inspection |
| `assets/reference/` | Four unchanged user-approved concept images |
| `assets/production/` | Runtime atlases, icons and four backgrounds |
| `assets/previews/world-1.jpg` to `world-4.jpg` | Actual captures of the four rendered worlds |
| `assets/source/`, `assets/concepts/` | Generation sources, prompts and further exploration |
| `tools/`, `tests/` | Reproducible builds and simulation verification |
| `docs/ASSET-MANIFEST.json` | Asset paths, origin and integrity information |
| `archive/HIRED-EXE-v0.3.zip` | Recovered earlier build |
| `archive/conversation-files/`, `docs/ATTACHMENT-INDEX.json` | Earlier attachments, original metadata and explicit version notes |

Start with [the art bible](docs/ART-BIBLE.md), [component catalogue](docs/COMPONENTS.md), [level design](docs/LEVEL-DESIGN.md), [character assets](docs/CHARACTER-ASSETS.md) or [environment assets](docs/ENVIRONMENT-ASSETS.md).

[Exploration history](docs/EXPLORATION-HISTORY.md) records the decisions, and [the visible request record](docs/VISIBLE-REQUEST-RECORD.md) preserves seven user requests verbatim. The attachment index covers 27 historical records: 26 supplied originals were recovered, while one older `index.html` reference is explicitly represented by its current authorised v1 rather than the unavailable requested version. A verbatim whole-conversation export was not available. [Repository handoff](docs/REPO-HANDOFF.md) explains the next step; the code and asset integration is being prepared on the `feat/hired-exe-art-and-game-handoff` branch in [EmotiveImpact/HIRED.EXE](https://github.com/EmotiveImpact/HIRED.EXE), tracked in draft [PR #1](https://github.com/EmotiveImpact/HIRED.EXE/pull/1). Check the PR and Vercel deployment status before describing the online game as updated.

## Work mode handoff

Open [`docs/WORKMODE-HANDOFF.md`](docs/WORKMODE-HANDOFF.md) for the next execution brief, [`docs/CONVERSATION-CONTEXT.md`](docs/CONVERSATION-CONTEXT.md) for the user-approved requirements and project conversation, and [`docs/DELIVERY-INCIDENT.md`](docs/DELIVERY-INCIDENT.md) for why the old URL served the previous art. The canonical live site is **not** considered the illustrated version until browser-verified.
