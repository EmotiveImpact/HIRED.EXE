# Four-world level design

## Shared play contract

The game uses a 960 × 540 logical view, with the camera following a side-scrolling world. Movement combines acceleration, air control, variable jump height, a second jump and a short dash. Coyote time and a jump buffer make near-edge input forgiving. Checkpoints support unlimited retries rather than exhausting a small stock of lives.

The main route should be understandable through platform shape and lightbulb placement. Optional upper routes contain skill evidence and reward confident movement. Collecting three skill tokens adds a completion goal without making the portfolio inaccessible to a visitor who prefers a direct route. Exact engine rules and final coordinates live in `src/levels.js` and `ENGINE-API.md`.

Every world needs a safe opening, a clear mechanic introduction, a section that combines familiar actions and an arena with a readable boss pattern. Place a checkpoint before an extended challenge and another before the final encounter. Give the player room to stop after a dash and see the next landing before committing to a jump.

### Implemented layout measurements

These measurements come from the delivered `src/levels.js`. Coordinates are logical pixels, with x measured from the left edge of the world.

| World | Width | Ground heights | Checkpoints x | Optional skills x |
| --- | ---: | --- | --- | --- |
| Application Alley | 7800 | 440, 420 | 1370, 3770, 5180, 6440 | 540, 2256, 3260 |
| Ship It City | 8780 | 440, 400, 384 | 1100, 4000, 5230, 7460 | 682, 2176, 3520 |
| Growth Run | 8720 | 440 | 1250, 4270, 7600 | 524, 2056, 3666 |
| Final Interview HQ | 7420 | 440, 400, 360, 350, 340, 330, 320 | 1100, 3400, 4450, 5510, 6590 | 466, 1736, 3006 |

The exit sits at `world.width - 160`. Defeating the boss opens it; score and skill counts do not gate completion. The largest main-route ground gap is 200 pixels. Raised optional routes supply additional movement challenges. Checkpoints heal on activation. A fall or loss of health returns the player to the most recent checkpoint while preserving collected ideas, skills, defeated enemies and boss damage within that level session.

### Extended route set pieces

Each world carries one set piece that lengthens the route without adding a new control. The automated input route now takes about 2 minutes 10 seconds across the four worlds, up from about 1 minute. That figure is a perfect, never-stopping run; no human first-play timing has been taken yet.

| World | Set piece | Engine data | Rule |
| --- | --- | --- | --- |
| Application Alley | Keyword Gate | `gates` with `needs: 'keys'`, three `key` collectibles | A solid gate before the arena opens when all three keyword tags are collected. The keys sit low, on a ledge and above a spring within one courtyard, so backtracking is never more than a screen and a half. |
| Ship It City | False finish | `fakeExit` | A finish portal stands where the level used to end. Touching it fires `fakeExit`, Scope Creep hauls it away, and a second half of lifts and terraces leads to the real arena. |
| Growth Run | The Feed | `chase` | A wall of content pursues the player from x 4560 to x 7440 at 4.7 pixels per tick against a run speed of 6.2. It never trails by more than 380 pixels. Being overtaken returns the player to the checkpoint before the sprint and resets the wall. Assist mode slows it by a fifth. |
| Final Interview HQ | Three rounds | `rounds`, `gates` with a round index | One-hit rematches with the CV Filter, Scope Creep and the Algorithm, each in its own terrace arena behind a gate, before the host welcomes the player without combat. |

The three main bosses have five health units. After two hits a boss escalates: the warning shortens from 54 to 42 ticks, the opening from 110 to 95, and each gains one move. The CV Filter adds a floor-level scan that must be jumped, Scope Creep charges faster and opens with a thrown requirement, and the Algorithm widens its fan from three shots to five. Interview rounds start escalated.

## World identities

| World | Purpose | Signature play | Visual setting |
| --- | --- | --- | --- |
| 1. Application Alley | Learn the controls and enter the process | Simple gaps, low platforms, CV bots and inboxes | Grass-topped brick streets, coffee shop, trees and pastel city |
| 2. Ship It City | Show execution and adaptation | Changing elevation, moving lifts and construction routes | Workshops, steel, crates, cranes and industrial warmth |
| 3. Growth Run | Build a rhythm and get noticed | Longer lanes, boost pads, aerial enemies and wider gaps | Connected towers, rail lines, lit data routes and bright signals |
| 4. Final Interview HQ | Bring the work together | Terraced ascent, mixed encounters and final review | Clearer terraces, glass, greenery and the HQ destination |

## 1. Application Alley

Start Augustus on a generous flat street. Let a short lightbulb trail establish movement before the first obstacle. Introduce one low platform, then a manageable gap, then a walking CV bot. Avoid presenting the first enemy and the first gap at the same instant. A higher route can introduce the second jump without making it mandatory immediately.

The world is warm and welcoming. Shops and banners make the hiring theme visible, while repeating brick and grass keep the landscape consistent with the approved reference. Decorative arches sit below the walking surface, with a distinct exit beyond the boss arena.

**Recruitment bot:** an amber beacon announces a scan attack. The bot pauses after attacking, exposing a vulnerability. Teach the phase language here so later bosses can reuse it. An encounter should feel like learning a pattern, not guessing which pixels are safe.

## 2. Ship It City

Change the route's vertical rhythm. Ground sections at different heights lead to steel platforms and moving lifts. Provide stable waiting areas beside moving platforms so the player can watch their travel. Optional upper platforms offer a more direct route and skill token, while the lower route preserves forward progress.

Crates, tools, hazard trims and factory structures communicate building and delivery. Background machinery creates atmosphere; a conveyor-looking object only implies a moving surface when that behaviour is implemented. Do not decorate a stationary floor as a mandatory conveyor puzzle by accident.

**Scope Creep:** a heavier construction creature prepares a horizontal charge. A visible wind-up gives the player time to jump or move clear. Its recovery window supports a deliberate counterattack. The larger body changes the encounter's spacing, while the shared vulnerability rule remains familiar.

## 3. Growth Run

Open the terrain into longer stretches. Boost lanes create speed, with landing zones wide enough to recover. Use flying paper planes as predictable moving obstacles rather than sudden off-screen collisions. Wider gaps should have a readable take-off point, an optional spring or enough approach distance for the intended jump.

The visual rhythm becomes more horizontal: rail lines, signal lights, billboards and connected towers. Keep the foreground platform edge brighter than the middle scenery. Speed does not justify concealing gaps behind highly detailed decoration.

**The Algorithm:** a floating data-form enemy sends a readable volley, then pauses. The fight asks for timing and position more than brute force. Projectiles must remain distinct against both cyan lighting and pale sky. Include space to retreat without falling off the arena.

## 4. Final Interview HQ

Use terraces and elevated gardens to create the feeling of reaching a destination. Combine the player's familiar tools without introducing a surprise mandatory mechanic in the last minutes. Calmer composition and a clear HQ silhouette make this world feel like a conclusion.

Mixed enemies can revisit earlier lessons, but their placement must still leave room to react. The last checkpoint should shorten the loop between learning the final encounter and trying again. After the encounter, the game moves to a candidate-owned portfolio and contact invitation.

**Final review guardian:** a fictional technology encounter at the HQ entrance. It is not a real founder, a claim about an actual interview or a representation of company approval. Its readable scan pattern provides the final gameplay challenge; the closing content lets the work speak for itself.

## Boss presentation contract

The engine exposes the sequence `dormant → patrol → telegraph → attack → vulnerable`, followed by `defeated` when health reaches zero. Stomping or dashing damages the boss only when the simulation marks it vulnerable. Show the warning, attack and opening differently. Pair colour changes with words or pose changes so the player can understand the rule.

The first encounter teaches the shared grammar. Later encounters change movement, silhouette and projectile pattern. Each main boss has five health units and escalates after two hits, as described above. Telegraphing lasts 54 simulation ticks before escalation, attacks last 65 ticks for Scope Creep and 72 for the other bosses, and the opening lasts 110 ticks. At 60 simulation ticks per second, these provide visible reaction and counterattack windows. Boss damage and defeat survive checkpoint retries within the current level session.

The runtime boss atlas currently provides one base pose per boss. Movement, warning, projectiles, flashes and vulnerability feedback are applied by the engine and renderer. The separate boss concept sheet is character exploration, not an unimplemented promise of frame-by-frame attack animations.

## Difficulty and accessibility

Assist mode prevents damage while retaining movement and checkpoint recovery after falling. It is a way to experience the art and story, not a substitute for testing the normal mode. A direct portfolio view must also exist because some visitors cannot or do not want to play an action game.

The time display should motivate a personal run, not force a visitor out of the application. Avoid a hard timer unless explicitly designed and tested. Keep retry messages friendly and brief. Show the current control scheme before the first challenge, and keep pause available on touch devices as well as a keyboard.

## Verification boundary

Initialisation tests prove that each level can load. A controller or manual route test proves something more specific about traversal. Directly positioning a character at the exit only tests the ending condition. Report these separately. Final layout measurements, automated route results and browser findings must be taken from the implemented build, rather than inferred from the concept images.

The delivered simulation suite was run with `node tests/simulation.test.js`: 14 tests passed. They cover frame-rate independence at 30, 60 and 120 Hz, movement and jump behaviours, reversing on boost lanes, collision, moving-platform carrying, enemy stomps, checkpoints, assistance and boss openings. Two controller tests traverse every world from its actual start, defeat the boss through ordinary inputs and overlap the real exit. They do not teleport the player or force completion.

Assisted routes completed without falling in approximately 19 to 21 seconds per world. Normal routes took approximately 22 to 28 seconds, with zero retries in worlds one, two and four and one retry in world three. These are fast deterministic runs with knowledge of the layout. They do not measure a human player's exploration time, enjoyment, ability to find every skill token, or browser and touch-interface quality. The release's separate UI verification covers the assembled game.
