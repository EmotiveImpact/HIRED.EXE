# Component catalogue

HIRED.EXE separates reusable visual assets, simulation data and employer content. This lets a new application change its story without changing the platforming engine.

## Asset classes

| Class | Source of truth | Contract |
| --- | --- | --- |
| Approved references | `assets/reference/` | Preserve original pixels and filenames; never load a presentation sheet as a gameplay atlas |
| Runtime art | `assets/production/` | Explicit source rectangles, dimensions, anchors and transparency where required |
| World concepts | `assets/concepts/`, where included | Visual exploration, labelled as concepts rather than playable screenshots |
| Asset provenance | Asset documentation and manifests | Prompt, source reference, processing method and final path |
| Engine state | `src/simulation.js` | Gameplay positions, health, collision and events |
| Level layouts | `src/levels.js` | Platform, enemy, collectible, checkpoint and exit placement |
| Employer copy | `src/edition.js` | Candidate, employer, role, introduction, portfolio and contact data |

The final asset-specific manifests describe the delivered atlas coordinates. The component sizes below explain the intended relationship to gameplay; they do not override those manifests.

## Character and encounters

| Component | Rendering contract | Behaviour owner |
| --- | --- | --- |
| Augustus | 18 frames in 80 × 96 cells, `[40, 92]` foot anchor, approximately 78-pixel standing height, mirrored facing | Simulation selects animation from movement, dash, damage and completion |
| CV bot | Paper body, small screen/face and short legs | Ground patrol, turn, stomp or dash defeat |
| Inbox | Cream envelope, red alert badge, readable feet | Ground patrol with a visibly different silhouette |
| Paper plane | White/lilac swept shape, compact eyes | Aerial movement and predictable approach |
| Recruitment bot | White/lilac chassis, cyan face, amber beacon | Application Alley boss phases |
| Scope Creep | Heavier tools or construction form | Ship It City charge encounter |
| Algorithm | Floating data or signal form | Growth Run ranged encounter |
| Final review guardian | HQ technology and calm, readable silhouette | Final Interview HQ encounter |

Gameplay rectangles belong to the simulation. Transparent padding, an extended arm or a cosmetic effect must not silently change collision bounds. Damage and vulnerability must have distinct feedback. A flash is feedback; the simulation's phase is the rule.

The three ordinary enemy families have two frames each. Each runtime boss has one base pose; the engine and renderer animate its position and combat feedback. The separate boss directory is concept exploration, so additional attack variants there should not be described as delivered runtime animation frames.

## Environment kit

| Family | Reusable pieces | Assembly rule |
| --- | --- | --- |
| Warm terrain | Turf top, brick fill, left/right termination | Repeat fill beneath a continuous walkable top |
| Industrial terrain | Steel surface, hazard trim, panel fill | Reserve striped edges for industrial mechanics |
| Tech terrain | Lit top strip, indigo panel, cyan detail | Stronger light marks the playable top |
| Floating platforms | Turf, industrial and tech variants | Align the art's top lip with the collision surface |
| Structures | Shop, arch, windows, doors, vents | Decorative unless explicitly given gameplay behaviour |
| Foliage | Trees, shrubs, vines, grass and flowers | Place in front of or behind terrain without hiding gap edges |
| Street props | Lamps, banners, benches, crates | Keep silhouettes below important landing sightlines |
| Checkpoint | Friendly computer or beacon | Clear inactive/active presentation, respawn placed safely beside it |
| Exit | Door, portal or finish marker | Locked/ready feedback comes from the completion condition |

The logical viewport is 960 × 540. A 48-pixel rhythm can guide layout increments, while the delivered terrain textures are 96 × 96 and repeat at 96 pixels in the renderer. Props occupy 192 × 192 storage cells with individual occupied bounds in the manifest. Platform collision dimensions remain independent of those texture sizes. Crop atlas cells by an explicit manifest; do not assume a generated presentation grid is mathematically even. Preserve genuinely transparent borders when exporting standalone sprites.

The four backgrounds are single painted plates, each scrolling at 0.12 of camera speed. Their perceived atmospheric depths are baked into the image. Foreground props, playable surfaces, actors and ambient effects provide separate layers in the renderer.

## Collectibles and effects

Lightbulbs form routes and reward movement. Three named skill tokens per world provide optional evidence milestones. Skill collection should appear in both the HUD and an accessible text view. The route must remain understandable without reading every label while jumping.

Keep effects transient and subordinate: dash streaks behind the hero, landing dust at the feet, pickup sparkles around the collected object and impact particles at the contact point. The simulation publishes events so sound, particles and status text can respond without changing gameplay.

## Interface components

| Component | Purpose |
| --- | --- |
| Desktop window frame | Establish the retro application identity |
| Main menu | Start, level selection, controls, assist choice and portfolio access |
| Gameplay HUD | Health, score, skill count, dash availability and level name |
| Boss status | Enemy name, remaining health and readable attack state |
| Pause panel | Resume, restart, sound and route back to menu |
| Stage completion | Celebrate progress and continue to the next world |
| Portfolio panel | Present real projects without forcing completion of the game |
| Contact action | Open the configured candidate contact destination |
| Touch controls | Separate direction, jump and dash, with reliable release/cancel behaviour |

Interface text belongs in HTML where possible. Keep controls keyboard-operable and focus visible. The canvas is an interactive game scene, so provide instructions and a direct text portfolio route outside it. Do not label that as complete screen-reader access to the platforming itself.

## Reuse boundary

Keep the engine, asset manifest and shared components stable across employer editions. Give each edition a unique ID for saved progress. Change the employer, role, introduction, portfolio emphasis and contact wording in `src/edition.js`. A specialised world or bespoke mechanic is a deliberate content extension and should be tested as such.

The actual implementation interface is documented in `ENGINE-API.md`. Visual production details are documented with their generated asset pack. This catalogue defines the shared language for extending them.
