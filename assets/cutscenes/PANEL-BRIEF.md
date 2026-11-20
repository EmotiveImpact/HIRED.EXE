# HIRE.EXE cutscene panels: the brief

This file is everything needed to draw the cutscene panels and put them in the game. It is written for whoever draws them: the ChatGPT image model on Edem's Mac (through the `gpt-image-bridge` skill) or ChatGPT used directly.

The first batch of ten panels was rejected because it looked like ten different comics: Augustus's face and outfit changed, the rooms changed and the finish changed. This brief fixes that by locking the characters, the rooms and the look before anything is drawn. Do not improvise on any of them.

## Reference files

Attach all three of these to every single generation, plus `p01` once it is approved (see the process).

| File | What it locks |
| --- | --- |
| [`assets/cutscenes/model-sheet.png`](model-sheet.png) | Augustus, the four bosses, the interview host, the palette and the finish |
| [`assets/cutscenes/locations-sheet.png`](locations-sheet.png) | The only two rooms, with floor plans, and the window light for each scene |
| [`assets/production/story/manga-panels.webp`](../production/story/manga-panels.webp) | The six panels already in the game. New panels must look like the same comic |

Both sheets are built only from art already in the game. `tools/cutscene-model-sheet.py` and `tools/cutscene-locations-sheet.py` rebuild them.

## The process

1. **Draw `p01` first.** Use its prompt below, word for word, with the three reference files attached. Check it against the checklist. Redo it until it passes.
2. **Lock `p01` as the style anchor.** From now on attach it as a fourth reference to every other panel.
3. **Draw `p02` to `p11` in order**, each with its full prompt pasted word for word. The shared blocks (style, characters, room) are repeated inside every prompt on purpose. Never shorten them.
4. **Compare them side by side.** Make one contact sheet of all eleven, cropped to 2:1, and check every one against the checklist and against each other. Redo any panel that drifts.
5. **Show Edem the contact sheet** before anything goes into the game. Nothing is wired in without Edem's yes.
6. **Save, wire in, test and push**, as described at the end.

On Edem's Mac: use the `gpt-image-bridge` skill with the model `gpt-5.6-terra`, pass the reference files as input images, save the originals as PNG in `~/imagetemp/hire-exe/panels-v2/` and never delete anything on the Mac.

## Size and framing

- Generate each panel at **1536 x 1024** (landscape 3:2).
- The game shows the panel in a **2:1 frame**, so it crops the top and bottom sixth (roughly 170 pixels off each). Heads, hands and key props stay in the middle band.
- The game puts a tilted sound-effect sticker over the **top-left corner** (about the left third and top quarter of the visible frame). Keep faces out of it.
- The dialogue sits below the picture, so panels never need speech bubbles or text.

## The checklist (every panel)

- [ ] Augustus matches the model sheet: same face, warm brown skin, short dark curly hair, close beard, teal open jacket with sleeves pushed up, cream T-shirt, charcoal trousers, orange strap over his left shoulder.
- [ ] Bosses keep their game shapes and colours, drawn as comic-ink versions of themselves. No new characters.
- [ ] The room matches the locations sheet and floor plan: desk under the big window, laptop in the middle, monitor to its right, orange lamp at the right end, grey chair, film-reel shelf on the left wall, two plants, door on the left.
- [ ] Only the window light changes between scenes: night (1), sunset (2), twilight (3), dawn (4). Scene 5 is the interview room in morning daylight.
- [ ] Same ink and halftone as the existing panels. Deep plum outlines. No brown or beige sepia cast.
- [ ] No words, letters, numbers, logos or speech bubbles anywhere. Screens show shapes only.
- [ ] Faces are out of the top-left corner. Nothing important sits in the top or bottom sixth.

## Where each panel appears

Beats in `src/scenes.js` already name their panel. Beats not listed here keep the existing art.

| Panel | Scene | Shown on these lines |
| --- | --- | --- |
| `p01-forty-boxes` | 1. Forty boxes | CV Filter: “Thank you for uploading your CV. To continue, please type your entire CV into these forty boxes.” / CV Filter: “Please select a value between nought and five.” / CV Filter: “Four applications received. Unfortunately, three of you have been unsuccessful.” / CV Filter: “The one with the least experience.” |
| `p02-four-of-me` | 1. Forty boxes | Augustus: “Fine. Five years each. Put me down as four people.” / Augustus: “Which one of me got through?” |
| `p03-few-changes` | 2. A few changes | Scope Creep: “Love it. Wouldn’t change a thing. I’ve just got a few changes.” / Augustus: “That would take a normal person five weeks.” / Augustus: “Lucky for you, it’d take me five minutes.” |
| `p04-small-ocean` | 2. A few changes | Scope Creep: “Could it have a swimming level? Nothing major. Just a small ocean.” / Scope Creep: “Really? It only took me five seconds to ask.” / Scope Creep: “Brilliant! So that’s a yes.” |
| `p05-two-players` | 3. Your numbers are in | The Algorithm: “Your demo has had two players so far. Both of them were you.” / Augustus: “Right. And did we like it?” / The Algorithm: “One of you did. The other one reported eleven bugs.” / Augustus: “Good. He’s the one you want.” |
| `p06-every-day` | 3. Your numbers are in | The Algorithm: “To grow your audience, you need to post every single day.” / Augustus: “About what?” / The Algorithm: “About how you post every single day.” |
| `p07-pester` | 3. Your numbers are in | Augustus: “I’ll do it the old-fashioned way. Make something good, then pester people until they look.” |
| `p08-draft-nineteen` | 4. Please find attached | Augustus: “I built the game quicker than this. I’ve been on the word ‘Hi’ since Tuesday.” / Augustus: “‘Dear Sir or Madam’ sounds like I’m complaining about the bins. ‘Hey’ sounds like I’m selling them a gym membership.” / Augustus: “Read it nineteen times. Not one typo. Send.” |
| `p09-nothing-attached` | 4. Please find attached | Augustus: “‘Please find attached.’ I haven’t attached anything.” / Augustus: “Second email. ‘Now with attachment.’ Call it version two. Nobody ships a perfect version one.” |
| `p10-traffic` | 5. You’re up | Augustus: “Not bad. Four worlds, three bosses. Bit of traffic round the Algorithm.” / Augustus: “In my defence, she has known me the longest.” / Augustus: “You asked for a CV and I built you a video game.” |
| `p11-same-answer` | 5. You’re up | Augustus: “Same answer.” |

Existing panels stay where they are: panel 0 (Augustus at the desk, scene 1), panel 1 (the button press, scene 1), panel 3 (the film edit, scene 2), panel 4 (the glowing cube, scene 4) and panel 5 (the interview host, scene 5). Panel 2, the scanner with film cans, stops being used once `p01` and `p04` are in, because the CV Filter is the robot, not a scanner.

## The eleven prompts

Each prompt is complete. Paste the whole block, attach the references, and generate at 1536 x 1024.

### `p01-forty-boxes`

Scene 1, *Forty boxes*. Room: home studio. Save as `assets/production/story/panels/p01-forty-boxes.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

CV Filter: the chunky white and lilac robot from the game, drawn in the same comic ink. Yellow siren light on top of its head, a dark visor with glowing cyan eyes, a purple tie, a blank chest plate, rounded lilac arms and legs. About Augustus's height. Polite and smug.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: night. Navy sky, a crescent moon and lit windows across the skyline.

The moment: Medium-wide shot from the front right of the room. Augustus sits at the desk, turned halfway round in his chair towards us with a flat, disbelieving look, one hand still resting on the laptop. The large monitor shows a long online form made of forty identical empty boxes in a neat grid (plain rectangles, no writing). CV Filter stands just behind his shoulder on the right of the frame, leaning in helpfully, one finger pointing at the screen, visor eyes curved in a pleased smile, siren light glowing yellow.
```

### `p02-four-of-me`

Scene 1, *Forty boxes*. Room: home studio. Save as `assets/production/story/panels/p02-four-of-me.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: night. Navy sky, a crescent moon and lit windows across the skyline.

The moment: Wide shot, straight on to the desk. Four identical copies of Augustus crowd round the one laptop: one in the grey desk chair typing, the other three crammed in behind and beside him, leaning over his shoulders. All four are exactly the same man in exactly the same outfit, and all four are glancing sideways at each other with the same suspicious expression.
```

### `p03-few-changes`

Scene 2, *A few changes*. Room: home studio. Save as `assets/production/story/panels/p03-few-changes.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

Scope Creep: the waist-high orange tracked machine from the game, drawn in the same comic ink. Boxy orange body with yellow and black hazard stripes, rubber tank treads, two purple grabbing claws on jointed arms and a yellow siren light on top. It has no face; it shows enthusiasm by waving its claws.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: sunset. A warm orange sun low over the skyline, throwing long shadows across the floor.

The moment: Medium-wide shot. Scope Creep has rolled in through the door on the left on its treads, claws held high, clutching an enormous unravelling roll of blank sticky notes that trails across the floor behind it, siren light flashing. Augustus has swivelled his chair round to face it, arms folded, one eyebrow raised. The large monitor shows a simple pixel-art game level (a tree, a green hill, blue sky).
```

### `p04-small-ocean`

Scene 2, *A few changes*. Room: home studio. Save as `assets/production/story/panels/p04-small-ocean.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

Scope Creep: the waist-high orange tracked machine from the game, drawn in the same comic ink. Boxy orange body with yellow and black hazard stripes, rubber tank treads, two purple grabbing claws on jointed arms and a yellow siren light on top. It has no face; it shows enthusiasm by waving its claws.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: sunset. A warm orange sun low over the skyline, throwing long shadows across the floor.

The moment: Closer shot at the desk. Scope Creep holds a sloshing goldfish bowl up over the desk with one claw, a single orange goldfish inside, water slopping over the rim towards the keyboard. With the other claw it points eagerly at the pixel-art level on the monitor, as if to say put this in there. Augustus leans back away from the splash, one hand shielding the laptop, giving us a deadpan stare.
```

### `p05-two-players`

Scene 3, *Your numbers are in*. Room: home studio. Save as `assets/production/story/panels/p05-two-players.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

The Algorithm: the floating lilac and white sphere from the game, drawn in the same comic ink, about the size of a beach ball. One large glowing blue eye in the centre, a small antenna on top, and a dashed violet ring around it with gold dots orbiting. It hovers and never touches the ground.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: twilight. Violet and magenta sky with cyan and pink neon signs across the skyline.

The moment: Medium shot. The Algorithm floats above the desk, its eye half-closed in boredom, projecting a cyan hologram above the keyboard: a tiny bar chart with only two short bars. On top of each bar stands a tiny, identical hologram Augustus, one giving a thumbs-up, the other holding out a long blank scroll. The real Augustus leans back in the grey chair with his hands behind his head, completely unbothered.
```

### `p06-every-day`

Scene 3, *Your numbers are in*. Room: home studio. Save as `assets/production/story/panels/p06-every-day.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

The Algorithm: the floating lilac and white sphere from the game, drawn in the same comic ink, about the size of a beach ball. One large glowing blue eye in the centre, a small antenna on top, and a dashed violet ring around it with gold dots orbiting. It hovers and never touches the ground.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: twilight. Violet and magenta sky with cyan and pink neon signs across the skyline.

The moment: Close two-shot at the desk. The Algorithm has drifted right up beside Augustus's head like a conspirator sharing a secret, its eye narrowed, its ring of gold dots tilted. Behind it, a tower of identical blank phone screens rises out of the top of the frame. Augustus squints sideways at it, deeply unconvinced, chin resting on his fist.
```

### `p07-pester`

Scene 3, *Your numbers are in*. Room: home studio. Action panel. Save as `assets/production/story/panels/p07-pester.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

The Algorithm: the floating lilac and white sphere from the game, drawn in the same comic ink, about the size of a beach ball. One large glowing blue eye in the centre, a small antenna on top, and a dashed violet ring around it with gold dots orbiting. It hovers and never touches the ground.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: twilight. Violet and magenta sky with cyan and pink neon signs across the skyline.

The moment: Action panel. Augustus springs up from the desk and strides towards the door on the left, backpack on, holding a glowing game cartridge high in one hand and a red megaphone in the other, grinning with determination. The grey chair is still spinning behind him. The Algorithm hangs by the desk, eye wide in alarm. Teal and gold speed lines radiate behind Augustus, like the existing button-press panel, with the room still recognisable.
```

### `p08-draft-nineteen`

Scene 4, *Please find attached*. Room: home studio. Save as `assets/production/story/panels/p08-draft-nineteen.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: dawn. A pale pink and gold sunrise; the desk lamp is still on from the night.

The moment: Medium shot. Augustus is slumped over the desk, chin on his folded arms, staring at the laptop, which shows an almost empty email window: one blinking cursor and a single short squiggle (no letters). Crumpled paper balls cover the desk and spill onto the floor, and three empty mugs stand beside the laptop. The desk lamp is still on.
```

### `p09-nothing-attached`

Scene 4, *Please find attached*. Room: home studio. Save as `assets/production/story/panels/p09-nothing-attached.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

Setting, Augustus's home studio (match the attached locations sheet and floor plan exactly): a small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus's chair is a dark grey desk chair. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. The room is lit by the lamp (a warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.

Window light for this scene: dawn. A pale pink and gold sunrise; the desk lamp is still on from the night.

The moment: Comedy reaction shot. The big window is pushed open and a white paper plane, the sent email, is shooting away into the sunrise, leaving a thin cyan trail. Left behind on the desk sits a chunky teal folder that was clearly meant to go with it. Augustus is half out of his chair, both hands on his head, eyes wide, mouth open in a silent oh no.
```

### `p10-traffic`

Scene 5, *You’re up*. Room: interview room. Save as `assets/production/story/panels/p10-traffic.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

The interview host: a warm, sharp woman with dark curly hair tied up, gold hoop earrings, a cream blouse with rolled sleeves, black trousers and a black belt, exactly as in the attached existing interview panel.

Setting, the interview room at Solved Studio (match the attached locations sheet and floor plan exactly): a bright, airy studio office in clear morning daylight. A tall multi-pane window on the left looks out on sunny red-brick buildings and trees. Big leafy plants stand either side of the window. On the right, a white desk with a monitor showing a simple pixel-art level (a tree, a green hill, blue sky), a pen pot and a white mug. Augustus sits in a teal office chair facing the desk. The host stands or sits behind it. Warm white walls and one framed picture with no readable text. No company logo anywhere.

The moment: Medium shot across the desk. Augustus sits upright in the teal chair with his backpack on his lap, a little worse for wear after four worlds: a leaf in his hair, a scuff on one jacket sleeve and a small plaster on his cheek, but smiling politely. The interview host sits behind her desk opposite him, pen in hand, one eyebrow raised, amused.
```

### `p11-same-answer`

Scene 5, *You’re up*. Room: interview room. Action panel. Save as `assets/production/story/panels/p11-same-answer.jpg`.

```text
Style: one comic-book panel that matches the attached existing panels exactly. Bold deep-plum ink outlines (never pure black), flat colour with halftone dot shading, a light printed texture, expressive faces and clean, readable shapes. Palette: teal, cyan, warm orange, gold, coral and lilac, with deep navy and plum shadows and cream highlights. No brown or beige sepia cast over the image. Landscape 3:2. The top and bottom sixth of the image will be cropped away, so keep every head, hand and key prop inside the middle two-thirds of the height. Keep faces out of the top-left corner, where the game places a sound-effect sticker. No words, letters, numbers, speech bubbles, captions, signatures or logos anywhere; screens show simple shapes only. No panel border.

Augustus: an adult man with warm medium-brown skin, short dense dark curly hair, a close full beard and big expressive brown eyes. He wears a teal jacket worn open with the sleeves pushed up, a cream T-shirt, charcoal trousers, white and teal trainers, and a teal backpack with an orange strap over his left shoulder. No glasses, no hat, no jewellery. He must look exactly like the man on the attached model sheet and in the attached existing panels: same face, same build, same head size.

The interview host: a warm, sharp woman with dark curly hair tied up, gold hoop earrings, a cream blouse with rolled sleeves, black trousers and a black belt, exactly as in the attached existing interview panel.

Setting, the interview room at Solved Studio (match the attached locations sheet and floor plan exactly): a bright, airy studio office in clear morning daylight. A tall multi-pane window on the left looks out on sunny red-brick buildings and trees. Big leafy plants stand either side of the window. On the right, a white desk with a monitor showing a simple pixel-art level (a tree, a green hill, blue sky), a pen pot and a white mug. Augustus sits in a teal office chair facing the desk. The host stands or sits behind it. Warm white walls and one framed picture with no readable text. No company logo anywhere.

The moment: The host has just asked for his biggest strength, straight after his biggest weakness. Closer, celebratory shot. Augustus leans forward in the teal chair with a confident grin and a thumbs-up. On the desk behind him the monitor shows the pixel-art level (a tree, a green hill, blue sky). The host is laughing behind her hand. A soft teal and gold burst radiates behind them, like the existing button-press panel, with the room still clearly visible.
```

## Putting them in the game

1. Convert each approved PNG to JPEG at the same size and save it under its id. On a Mac:

   ```bash
   mkdir -p assets/production/story/panels
   sips -s format jpeg -s formatOptions 82 ~/imagetemp/hire-exe/panels-v2/p01-forty-boxes.png --out assets/production/story/panels/p01-forty-boxes.jpg
   ```

2. In `src/scenes.js`, add each finished id to `H.PANELS.ready`, for example `ready: ['p01-forty-boxes', 'p02-four-of-me']`. A beat shows its panel only once its id is listed, so panels can go in one at a time.
3. Run the checks. The first one fails if a listed panel's file is missing.

   ```bash
   node --test tests/simulation.test.js
   python3 tools/build.py
   python3 tests/build-check.py
   ```

4. Commit on a branch, open a pull request to `main` and merge it.
5. Redeploy production from `main`. The Vercel project is not linked to GitHub, so merging alone does not update hireexe.me.

The cutscene frame crops each panel to 2:1 with `background-size: cover` (`.comic-panel` in `styles.css`). The offline edition embeds every JPEG in `assets/production/story/panels/` automatically.
