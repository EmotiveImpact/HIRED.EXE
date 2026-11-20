# HIRED.EXE | Approved art-style bible

**Visual target:** an original, cheerful, polished SNES-era-style platformer with retro desktop/window UI around the playfield. No copyrighted Nintendo/Sega sprites or maps.

## Style pillars
1. Readable, chunky pixel-art silhouettes with strong outlines.
2. Saturated yet controlled palette: indigo `#28214f`, violet `#5f429f`, blue `#388def`, cyan `#36d8ee`, grass `#82d44c`, terracotta `#c96a56`, gold `#ffc65c`, lilac `#b7a6e7`, blossom `#f5a4df`.
3. Lush environment detail without hiding gameplay collisions.
4. World-specific materials: terracotta and grass in World 1; metal and hazard trims in World 2; cyan/magenta tech in World 3; polished pale stone and cyan glass in World 4.
5. Layered city parallax with soft atmospheric fall-off behind crisp collidable foregrounds.
6. All gameplay cues must work without colour alone.

## Characters
Augustus: medium-brown skin, short dark curly hair, expressive face, teal jacket, pale T-shirt, dark trousers, white/teal trainers, optional backpack. Frame-perfect animations required for idle, run, jump, fall, dash, crouch, hurt and victory. Reference sheet is a **concept/presentation**, not a production-ready atlas. Character scale and collision bounds are independent.

Enemies: CV-bot, angry unread envelope, paper-plane drone and stylised recruiting miniboss. Each needs idle/move/attack/hit/defeat states, readable telegraphs and consistent anchors.

## Terrain / UI
Use a canonical gameplay tile size (recommend 48 logical units in a 960×540 virtual viewport). Source 4×4 atlases are 1254×1254 px and their extracted images contain padding; trim and normalise before drawing. Pixel interpolation should use `image-rendering: pixelated`/nearest-neighbour. UI has indigo blue retro-window header, purple accents, three-heart health, lightbulb/build/code counters and minimal intrusion into play.

## Audio and accessibility
Sound optional and muted by default, reduce-motion option, keyboard + touch controls, dependable resume/pause. Important prompts and boss tells must be distinguishable by shape and animation.
