# HIRE.EXE

An original four-world platformer and playable job application by Augustus Edem. The default edition introduces Augustus to Solved Studio. Use **Meet Augustus** for the portfolio or **View CV** for a one-page CV with a downloadable PDF. Both are available on the title screen.

Play it at [hireexe.me](https://hireexe.me).

## Play

Open `index.html` from a complete checkout, or run `python3 -m http.server 8000` and visit `http://localhost:8000/`. Open `art-book.html` for the original concept boards, transparent production atlases and captured gameplay.

| World | What to do |
| --- | --- |
| Application Alley | Learn the double jump, dodge the CV Filter's scan, then stomp or dash when its shield opens. |
| Ship It City | Ride the lifts, avoid Scope Creep's charge and dash through the lit Brief, Build and Ship terminals in order. |
| Growth Run | Carry speed across the rooftops. Dodge the Algorithm's spread of shots and strike during its cooldown. |
| Final Interview HQ | Climb the garden terraces, pass the reception robot and enter the room. Pick the three topics you want to discuss with Augustus. |

Use A/D or the arrow keys to move, Space to jump, Shift or X to dash and P to pause. Hold jump for height and press it a second time for a double jump. Down plus Jump drops through a floating platform. Touch controls support simultaneous presses. The world directory and pause menu offer Relaxed mode.

An opening comic and four interludes follow the making of the application. In the Solved Studio edition, James Morgenstern appears in the interview and the fictional offer scene. Use **Next panel**, **Previous** or **Skip cutscene** to read at your own pace. After clearing a world, **Continue the story** brings you back to the next cutscene. The world directory takes you straight to gameplay.

Each world has two checkpoint terminals, three optional skill tokens, a hidden portfolio field note and a bonus collectible. The bonus items include in-game ChatGPT and Claude subscription cards. A checkpoint restores health and saves a snapshot on this browser. After reloading, **Continue from checkpoint** restores that snapshot. Within the same run, retries also keep pickups and boss progress earned since the checkpoint. **Restart this world** begins the level again. When storage is unavailable the run still works in memory.

The interview ending records the visitor's chosen topics, links to the selected project when a public page is configured, and opens a pre-filled email draft. The employer receives nothing through gameplay. This is an independent application.

## Reuse for another application

The default URL selects `solved-001`. Use `?edition=portfolio` for the employer-neutral version. Add another entry to the edition map in [src/edition.js](src/edition.js) and give it a distinct ID. Set its company, role, opening, closing, projects, field notes, contact and interview questions. The same built site serves each registered edition by URL and keeps results under separate keys. Unknown IDs fall back to the default. Keep private project walkthroughs as descriptions.

The portfolio currently links to [Vlume](https://vlumeaudio.com/) and the [SALEANE demo](https://saleane.vercel.app/demo).

## Build and verify

```sh
node --test tests/simulation.test.js
python3 tools/build.py
python3 tests/build-check.py
python3 tools/package.py
```

The two offline editions are generated in `dist/`. Open `HIRE-EXE-v0.4-PLAY.html` directly in a browser for the standalone game. The standalone game includes the CV as a PDF download. Keep `HIRE-EXE-v0.4-ART-BOOK.html` beside it to follow the catalogue link offline.

## Read more

| Document | What it covers |
| --- | --- |
| [Art bible](docs/ART-BIBLE.md) | The visual direction, palette, character, materials and the production asset kit. |
| [Level design](docs/LEVEL-DESIGN.md) | The four worlds, the boss pattern, difficulty and accessibility. |
| [Engine API](docs/ENGINE-API.md) | Simulation state, level data, actors and events. |
| [Playtest report](docs/PLAYTEST.md) | Browser captures, automated routes and device coverage. |

The approved concept boards are in [`references/`](references/) and the asset inventory is [`assets/manifest.json`](assets/manifest.json).
