# Four-world level design

## Shared play contract

The game uses a 960 × 540 logical view, with the camera following a side-scrolling world. Movement combines acceleration, air control, variable jump height, a second jump and a short dash. Coyote time and a jump buffer make near-edge input forgiving. Each world gives three lives. A death returns the player to the last checkpoint, and losing the last life restarts the world. Fifty ideas earn an extra life, and Relaxed mode never loses one.

The main route should be understandable through platform shape and lightbulb placement. Optional upper routes contain skill evidence and reward confident movement. Collecting three skill tokens adds a completion goal without making the portfolio inaccessible to a visitor who prefers a direct route. Exact engine rules and final coordinates live in `src/levels.js` and `ENGINE-API.md`.

Every world needs a safe opening, a clear mechanic introduction, a section that combines familiar actions and an arena with a readable boss pattern. Place a checkpoint before an extended challenge and another before the final encounter. Give the player room to stop after a dash and see the next landing before committing to a jump.

### Implemented layout measurements

These measurements come from the delivered `src/levels.js`. Coordinates are logical pixels, with x measured from the left edge of the world.

| World | Width | Ground heights | Checkpoints x | Optional skills x |
| --- | ---: | --- | --- | --- |
| Application Alley | 9350 | 440, 420, 200 | 1810, 4620, 6730, 7990 | 540, 3106, 4110 |
| Ship It City | 12880 | 440, 400, 384 | 1100, 2560, 4850, 7460, 8410, 9920, 11560 | 682, 2176, 4370 |
| Growth Run | 12920 | 440, bars 400 to 200 | 1590, 3300, 4690, 6890, 8470, 11800 | 524, 2906, 7866 |
| Final Interview HQ | 10500 | 440, 400, 360, 350 on floor 1; 440 in each room | 750, 1950, 2930, 5160, 6360, 7860, 9360 | 466, 2586, 4766 |

Final coordinates are produced when the level loads: `INSERTS` in `src/levels.js` splices each added stretch into the authored layout and moves everything after it to the right. Read live values from `Hired.LEVELS` when exact numbers matter.

The level build keeps signs readable and save points apart. An idea that would hang across a sign's words or inside a ledge is dropped, a street lamp or tree is not drawn in front of a sign or a save point, and of two save points fewer than 500 pixels apart the earlier one is removed (`checkpointAliases` sends an old save made there to the one that stays). The dropped ideas' IDs are kept in `retiredPickups`, so a game saved with them still counts them. A test fails if a sign has a leg over a gap, or a pickup or save point in front of it.

The exit sits at `world.width - 160`. Defeating the boss opens it; score and skill counts do not gate completion. The largest main-route ground gap is 200 pixels. Raised optional routes supply additional movement challenges. Checkpoints heal on activation. A fall or loss of health returns the player to the most recent checkpoint while preserving collected ideas, skills, defeated enemies and boss damage within that level session.

### Extended route set pieces

Each world carries three set pieces and one secret room, none of which adds a new control. The automated input route now takes about 3 minutes 7 seconds across the four worlds in normal mode, up from about 1 minute. That figure is a perfect, never-stopping run; no human first-play timing has been taken yet.

| World | Set piece | Engine data | Rule |
| --- | --- | --- | --- |
| Application Alley | Keyword Gate | `gates` with `needs: 'keys'`, three `key` collectibles | A solid gate before the arena opens when all three keyword tags are collected. The keys sit low, on a ledge and above a spring within one courtyard, so backtracking is never more than a screen and a half. |
| Ship It City | Phase 2 | signs only | The 'NEARLY DONE' and 'PHASE 2 (QUICK TWEAK)' signs mark where the level used to end, and a second half of lifts and terraces leads to the arena. The decoy finish portal was removed after playtesting because it read as a bug. |
| Growth Run | The Feed | `chase` | A wall of content pursues the player through the sprint that ends at the YOU’RE ALL CAUGHT UP sign. It slides in from off screen, then keeps a set distance behind a runner, shorter on a narrow screen so that it is always in sight, and it surges forward and eases back so it never sits still against the edge of the screen. Its pace shrinks with that distance, so a player who stops has the same time to get moving on any screen. Being overtaken returns the player to the checkpoint before the sprint and resets the wall. Once outrun it is harmless: it falls behind and drops out of view. Assist mode slows it by a fifth. The numbers are `chase` in `src/levels.js` and `Hired.FEED` in `src/simulation.js`. It is drawn from painted art, its leading face standing on its position, with a wall of posts scrolling behind and likes and alerts flying off the front (`feedArt()` in `src/renderer.js`, art from `tools/build-feed-art.py`). |
| Final Interview HQ | Three rounds | `rounds`, `gates` with a round index | One-hit rematches with the CV Filter, Scope Creep and the Algorithm, each on its own floor and reached by lift, before the host welcomes the player without combat. |

| Application Alley | Cover Letter Climb | a 240-pixel rooftop | Taller than a single jump, so it needs the second jump or the lift and ledge before it. |
| Application Alley | The Spam Folder | secret room | See secret rooms below. The first design was a basement, but the camera does not scroll vertically, so it is a walled room above the street. |
| Ship It City | Conveyors and presses | `belt` on a ground, `crushers` | One conveyor carries the player forward at 2.2 pixels per tick and one pushes back at 2.4. Two presses slam on a 150-tick cycle, half a cycle apart, with a floor warning before each slam. They hurt only while down. |
| Ship It City | Crane ride | a `ride` moving platform | The only main-route gap wider than a jump (620 pixels). The platform docks level with both banks. |
| Growth Run | A/B test | spring, upper ledges with boosts | Lane A is high and fast with gaps; lane B stays on the ground with more ideas and two enemies. Both rejoin. |
| Growth Run | Bar chart climb | five rising grounds, `crumble` ledge | Bars rise 50 pixels at a time. The ledge at the top holds for 26 ticks, then drops its rider safely to the floor. |
| Final Interview HQ | Waiting room | gate with `needs: 'keys'`, a `key` flagged `bell` | The door opens when the bell on the high ledge is collected. |
| Final Interview HQ | The lift | `floorDoors`, `floorScenes`, gate with a round index | One lift at the end of each of floors 1 to 3. Clearing the round calls it: the car comes down the shaft, the indicator counts, it chimes and the doors open. Walking up to the open doors boards it. The player steps in, the doors close, the car leaves, and the doors open on the next floor, where the player steps out beside a save point. Input is ignored for the ride, about three seconds. The gate behind the lift is the wall that ends the floor and never opens. Floors 2 to 4 are rooms with one unbroken floor at 440, and nothing is placed in a lift doorway. |
| Final Interview HQ | Furnished rooms | decor and platforms of type `furniture` | Floor 2 is a workshop, floor 3 a boardroom and floor 4 the reception. The back wall of each is a plate with no furniture painted on it, fixed to the floor and made of two different stretches of wall so nothing repeats across the room. The furniture is separate: every piece stands on the floor at a size that suits the hero, and the flat-topped ones (shelf, plan chest, desk, boardroom table, sideboard, coffee table, reception desk) can be stood on from above and walked past from the side. Furniture sits between the arriving lift and the round, so the arena stays clear. `FURNITURE` and `ROOMS` in `src/levels.js` hold the sizes and the layout. |

Secret rooms: each world has one walled room on a ledge 232 pixels above the ground, holding eight ideas. Its front panel is a `breakable` wall that is solid to a walk and breaks to a dash (event `secret`, 300 points). The panel shows a crack and, when the player stands beside it, the label "LOOKS THIN. DASH?".

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

Current test counts, route timings and device coverage are recorded in the [playtest report](PLAYTEST.md) so they are stated in one place. The route controller traverses every world from its real start with ordinary inputs, defeats the boss and overlaps the real exit. It never teleports the player or forces completion. Automated runs know the layout, so they say nothing about a human player's exploration time or enjoyment.

## Editions and pacing

Company, role, dialogue and portfolio evidence live in `src/edition.js`, outside the engine. Another employer's edition reuses the movement, enemies and worlds, and never implies that employer's endorsement. The target for a first play is four to six minutes, and the portfolio is always one click away for a busy reader.
