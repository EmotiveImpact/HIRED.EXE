# HIRED.EXE simulation API

The game simulation is dependency-free JavaScript. Load `src/levels.js` before `src/simulation.js`. Both extend `globalThis.Hired`. They also expose CommonJS exports for Node tests.

```js
const game = new Hired.Game();
game.start(0, { assist: false });

// Call from the rendering loop. The engine accumulates time into 60 Hz steps.
game.step({
  left: false,
  right: true,
  jumpPressed: false,
  jumpHeld: false,
  dashPressed: false,
  down: false
}, elapsedSeconds);

for (const event of game.drainEvents()) {
  // Play sound, show a hint, update progress or open the completion dialogue.
}
```

`jumpPressed` and `dashPressed` are edge events. `jumpHeld`, `left`, `right` and `down` are held states. The first two are retained until a simulation step is available, so 120 Hz render loops do not lose inputs between ticks. Elapsed time is clamped to 0.1 seconds per call to avoid destructive catch-up after a suspended tab. Pause by withholding `step`; the UI owns menu and focus state. Keyboard, touch and gamepad mappings belong to the UI.

`start(index, options)` makes a fresh deep copy of one level and resets that level's score, time and collectibles. The UI owns campaign totals, unlocked levels and persistent best results. `setAssist(true)` restores health and prevents contact/projectile damage. Falls still return the player to the most recent checkpoint. Assist can be changed during play.

## State and coordinates

Logical viewport: **960 × 540**. World coordinates use a top-left origin, positive x rightwards and positive y downwards. Rectangles use `x`, `y`, `w`, `h`. All collision geometry is independent of visual sprite bounds.

| Field | Meaning |
| --- | --- |
| `mode` | `playing` or `complete`. The UI manages menus and pause. |
| `levelIndex`, `world` | Selected level index and mutable level copy. |
| `player` | Collision body and movement/animation state. |
| `camera` | `{x, y: 0}` with a smoothed horizontal lead; clamp to world bounds. |
| `score`, `coins` | Per-level score and collected ideas. |
| `skills` | Array of collected skill IDs. Descriptions live in `world.collectibles`. |
| `checkpoint` | Current respawn `{x, y, id}`. |
| `enemies`, `boss` | Live actors; enemies are also shared with `world.enemies`. |
| `particles`, `projectiles` | Simulation effects in world coordinates. |
| `time`, `tick` | Elapsed seconds and integer 60 Hz step count. |
| `deaths`, `assist`, `completed` | Per-level retry count, assistance setting and finish flag. |

The player has `w: 34`, `h: 58`. The renderer draws the delivered **80 × 96** hero atlas cells at native size, placing their shared `[40, 92]` foot anchor at the body's horizontal centre and bottom edge. The visible standing character is approximately 78 pixels tall; transparent padding and extended limbs do not change the collision body. Feet alignment matters more than matching the body width.

Player fields are `x`, `y`, `w`, `h`, `vx`, `vy`, `facing` (-1/1), `grounded`, `groundId`, `jumps`, `health`, `invulnerable`, `dashTime`, `dashCooldown`, `coyote`, `jumpBuffer`, `boostTime`, `dropTime`, `springCooldown`, `animation`, `animationTime`. Velocity uses pixels per simulation tick. Timers are in ticks unless explicitly stated otherwise.

Animation names: `idle`, `run`, `jump`, `fall`, `dash`, `crouch`, `hurt`, `victory`. Crouch is a visual pose; the body does not shrink. Holding down and pressing jump while standing on a one-way platform drops through it. There are no ladders or wall jumps.

## Level geometry

`Hired.LEVELS` contains four authored templates. `Hired.createLevel(index)` returns a mutable deep copy. The templates are not changed by normal gameplay.

| World | Width | Main ground heights | Checkpoints x | Boss |
| --- | ---: | --- | --- | --- |
| Application Alley | 7800 | 440, 420 | 1370, 3770, 5180, 6440 | Recruitment Bot |
| Ship It City | 8780 | 440, 400, 384 | 1100, 4000, 5230, 7460 | Scope Creep |
| Growth Run | 8720 | 440 | 1250, 4270, 7600 | The Algorithm |
| Final Interview HQ | 7420 | 440, 400, 360, 350 to 320 | 1100, 3400, 4450, 5510, 6590 | Three rounds, then Final Review |

Every world has three optional skill tokens, three to five checkpoints, a main route with gaps of at most 200 pixels, and additional platforms above the main route. No score or skill threshold gates the exit. The exit unlocks after the boss is defeated. Application Alley's Keyword Gate needs its three `key` collectibles, which sit on the route to it.

Optional level fields drive the set pieces: `gates` (solid `gate` platforms removed when `needs` is met, either `'keys'` or a round index), `fakeExit` (state at `state.fakeExit`, event `fakeExit`), `chase` (state at `state.chase`, events `chaseStart` and `chaseEnd`, respawn reason `feed`) and `rounds` (bosses fought before `boss`; `state.bossQueue`, `state.bossIndex`, event `roundCleared`). `state.boss` is always the current encounter and carries its own `signoffs` and `arena`. See [LEVEL-DESIGN.md](LEVEL-DESIGN.md) for the rules. The final interview dialogue is a UI responsibility after world four completes.

### Platforms

Each platform has `{id, x, y, w, h, type, oneWay, dx, dy}`.

- `type: 'ground'`: solid sides/top/underside. Extends below the visible viewport.
- `type: 'platform'`: stationary one-way ledge.
- `type: 'moving'`: one-way ledge with `baseX`, `baseY`, `rangeX`, `rangeY`, `speed`, `phase`. Its actual `x`, `y`, `dx`, `dy` update every tick. A grounded rider is carried by the same displacement.

Collision surfaces are axis-aligned. Art may decorate the top edge, but slopes, arches and ladders must not imply collision geometry that the simulation does not support. Arches are decorative.

### Collectibles and world objects

- Collectible: `{id, x, y, kind: 'coin'|'skill', collected, skill?}`. Its x/y is its centre. A skill contains `{id, title, project}`.
- Checkpoint: `{id, x, y, active}`. Its x/y is its ground anchor. Crossing the vertical save line from any high route activates it and heals the player.
- Spring: `{id, x, y, w, h}` with y at the floor. Launches the player upwards and leaves one air jump available.
- Boost lane: `{id, x, y, w}` with y at the floor. It accelerates rightward travel and retains speed briefly after leaving the lane.
- Exit: `{x, y, w, h}`; render a closed/locked state while `boss.alive` and an open state afterwards.
- Hint: `{x, text}`. Triggers once as the player passes x.

Decor objects have a **base/ground anchor** `{type, x, y, text?}`. The supported semantic types are `cafe`, `sign`, `tree`, `banner`, `arch`, `terminal`, `crate`, `crane`, `satellite`. They are visual scenery, not collisions. A `sign` supplies text. The renderer may add repeated flowers, vents, lights and foliage without adding collision bodies.

## Actors and combat

Enemies have `id`, `type` (`cv`, `inbox`, `plane`), rectangle coordinates, `minX`, `maxX`, `speed`, `facing`, `baseY`, `phase`, `alive`. Walking enemies patrol within bounds. Planes also bob vertically. Landing from above or contacting during a dash defeats an enemy. A stomp bounces the player; contact otherwise costs one heart unless assistance or invulnerability applies.

Boss fields include `type`, `name`, rectangle coordinates, `originX`, `baseY`, `floor`, `health`, `maxHealth`, `phase`, `timer`, `active`, `alive`, `hitCooldown`, `facing`, `cycle`.

Boss types: `recruitmentbot`, `scopecreep`, `algorithm`, `finalreview`. The three main bosses have five health points and set `enraged` after two hits (event `bossPhase`); interview rounds have one and start enraged. The first, third and fourth shoot aimed projectiles; the second charges horizontally. The Algorithm floats and fires more frequently.

The boss activates when the player approaches. Its sequence is `dormant → patrol → telegraph → attack → vulnerable`, repeating until `defeated`. Render the warning and vulnerability clearly. Telegraph lasts 54 ticks. Attack lasts 65 ticks for Scope Creep and 72 for others. Vulnerability lasts 110 ticks. A successful stomp or dash during vulnerability removes one health point, bounces the player, then starts a new cycle. Contact with an active shield does not damage the boss.

Projectiles have `{x, y, w, h, vx, vy, life, kind}`. A dash dissolves a projectile. Other contact causes damage and removes it. Particles have `{x, y, vx, vy, life, maxLife, kind, size}`. Colours are semantic: `dust`, `cyan`, `purple`, `gold`, `pink`, `confetti`.

## Recovery and completion

Health starts at three. Normal damage grants 90 ticks of invulnerability. A fall below y650 or losing all hearts respawns the player at the last checkpoint with full health and 100 ticks of invulnerability. There is no lives limit and no timer-based failure. Coins, skill tokens, defeated enemies and boss damage survive retries within that play session. Starting/restarting a level resets those states.

On boss defeat, projectiles are cleared and the exit opens. Overlapping the exit sets `mode: 'complete'`, stops movement and emits `complete`. The UI should record the result and offer the next world or final interview. Level completion does not represent any real employer decision.

## Events

Call `drainEvents()` once per render loop. It returns and clears the queued events.

| Type | Additional data |
| --- | --- |
| `start` | `levelIndex` |
| `jump` | `double` |
| `dash`, `land`, `spring`, `boost`, `shot` | No required payload |
| `coin` | `x`, `y` |
| `skill` | `skill`, `item` |
| `stomp` | `enemy` type |
| `hurt` | `health` |
| `respawn` | `reason: 'fall'|'health'`, `checkpoint`, `deaths` |
| `checkpoint` | `checkpoint` object |
| `hint` | `text` |
| `bossStart`, `bossOpening`, `bossDefeated` | `name` |
| `bossTelegraph` | Boss `type` |
| `bossHit` | `health`, `maxHealth` |
| `complete` | `levelIndex`, `score`, `coins`, `skills`, `time`, `deaths` |

## Verification

Run `node --test tests/simulation.test.js`. The 14-test suite checks frame-rate independence at 30, 60 and 120 Hz, variable jump height, double jump, coyote time, jump buffering, moving-platform carrying, one-way collision, enemy stomp, checkpoint recovery, invulnerability, assistance, reversing on boost lanes and boss openings.

The final two tests use an input-only controller from the real start position through the real exit in all four worlds. They do not teleport the player, reduce boss health or force completion. The assisted traversal demonstrates geometry and progression reachability: all four routes complete with zero falls in approximately 19–21 seconds each.

The normal-mode traversal reads the boss phase, retreats during attacks, jumps near projectiles and returns during the opening. Worlds one, two and four finish without a retry; world three uses one checkpoint retry. Normal runs take approximately 22–28 seconds. These are deterministic scripted runs with known geometry; human exploratory play time and subjective difficulty have not been measured. The controller does not collect every optional skill. Browser rendering, touch controls, asset loading and interview UI require separate UI checks.
