# Sources for the layered backgrounds and the painted kit

Fourteen pictures made with Dreamina (Seedream 5.0 Lite, 2K) on 26 November 2026, each guided by the
game's existing art as reference, and twenty made on CapCut (Seedream 5.5, 2K) on 27 November 2026.
The first three, whose names end in `-2`, came from a written description alone. The other six
carry those scenes on to the right: each was asked for with the stretch before it attached from
CapCut's canvas as its reference. They are kept as generated. The Dreamina pictures carry the
generator's own marks, a badge top left and a logo bottom right, which `tools/build-art-kit.py`
cuts away or paints out. The CapCut pictures have no marks.

| File | What it is | Ground |
| --- | --- | --- |
| `alley-sky.png` | Application Alley's sky | none: a full picture |
| `alley-far.png` | Its far skyline | green |
| `alley-near.png` | Its first viaduct and treetops (no longer used) | red, since the trees are green and pink |
| `alley-near-2.png` to `alley-near-4.png` | Its lilac stone viaduct, lamps, arches and treetops, in three stretches: a clock pier, a wide arch over a lane and a footbridge stair further along | red |
| `alley-trees-1.png` | A row of treetops close up, for the nearest layer | red |
| `alley-movers.png` | Plane, blank banner, train (no longer used: Application Alley has no train), two gulls, balloon | green |
| `signs.png` | Four blank signs, one for each world | green |
| `machinery-a.png` | Press head and rod, spring up and down, conveyor, speed strip, two orbs | green |
| `machinery-b.png` | Gate pillar, blank tag, bell, padlock, warning sign | green |
| `pickups.png` | Two subscription cards, cold coffee, zipped folder | pink |
| `title-hero.png` | The hero running, for the title screen | pink |
| `city-sky.png` | Ship It City's evening sky | none: a full picture |
| `city-far-2.png`, `city-far-3.png` | Its far skyline of towers and cranes, in two stretches | green |
| `city-near-2.png` to `city-near-5.png` | Its girder bridge, brick factories, chimneys and treetops, in four stretches: a crane yard, gas holder, warehouses and storage tanks further along | magenta |
| `city-movers.png` | Airship, two drones, freight train, three puffs of smoke | hot pink |
| `growth-sky.png` | Growth Run's twilight sky | none: a full picture |
| `growth-far.png` | Its far skyline of chart screens and dishes | green |
| `growth-near-2.png` to `growth-near-4.png` | Its monorail track, neon buildings and blossom trees, in three stretches | green |
| `growth-movers.png` | Chart airship, two couriers, rocket, bullet train | green |
| `hq-view-1.png` | Final Interview HQ's view of the city at sunrise, seen through the atrium's glass | none: a full picture |
| `hq-near-1.png`, `hq-near-2.png` | The atrium's arches, balconies, banners and planters, in two stretches | red, in every pane of glass |
| `boss-recruitmentbot.png`, `boss-scopecreep.png`, `boss-algorithm.png`, `boss-finalreview.png` | Each boss in four poses: at rest, winding up, attacking and open to a stomp (Final Review: calm, asking, reading and satisfied) | green |

What the tool changes on the way in, and why:

- The viaduct's deck is drawn very deep, so a plain band of it is taken out.
- Three treetops came out as flat pink shapes. They take their light and shade from the green
  canopy below them.
- The canopy is used twice: once with the viaduct, and again, larger, as a nearer layer.
- The banner's cloth is pulled straight and its stitching removed. The game ripples the cloth and
  sews an even hem, so one short piece of cloth serves a line of any length.
- The balloon's basket lay half under the logo. Its clean left side is run out to the right.
- The second gull is drawn at a different angle from the first, so the second beat of the wings is
  the first gull with its wings pressed flat.

- The stretches of one scene are joined into one long picture, so a layer runs for nearly three
  screens before it comes round again. Each pair is cut where the two match best, found by
  comparing narrow strips of the right end of one with the left end of the next, and
  cross-faded over 48 pixels. The columns are written down in `CITY_ART` and `GROWTH_ART`.
- Ship It City's bridge, factories and trees are one long picture, and so are Growth Run's track,
  buildings and blossom. Each is used whole as the layer the train runs along. Its front bank of
  trees is also lifted out to slide by itself as a nearer layer: whatever is leaf or petal
  coloured and as wide as a tree's crown, with the boughs and trunks it closes round.
- Growth Run's far trees show at either end of its long picture, cut off by pillars. Those ends
  are left out of the nearer layer.
- Application Alley's red ground also shows in a few red trees and terracotta roofs. Only red that
  reaches the top of the picture, or is as big as an arch's opening, is keyed out; the rest keeps
  its colour.
- The magenta ground leaves a pink cast along Ship It City's railing and rooftops. It is taken
  out.
- Train sprites are averaged down rather than resampled, sharpened, held to 28 colours and ringed
  with a dark violet outline, so they stay crisp at game size.
- The movers were painted with a thin white or cream line outside their dark outline, like a
  sticker's edge, which showed as a white ring in the game. Light pixels are peeled off each
  cut-out's rim until the dark outline is reached. The plane, airship, chart airship, balloon,
  drones, couriers, rocket and gull are then brought down the same way as the trains (64 colours),
  so every mover has the same dark violet edge.
- A scrap of a building painted into Ship It City's clouds is painted out.
- Growth Run's train is three carriages long as drawn. Its middle carriage rides three times.
- Cut-outs with a green rim from the ground colour have it shaved off.
- The bosses' poses are found by the clear columns between them and kept at the scale of the first
  pose, then brought down like the trains. Final Review's green tick was painted on the green
  ground and keys out with it, so the game draws the tick.

- Signs are pressed to the height the levels allow: the frame keeps its thickness and the dark
  face is squeezed to two lines of text. The game writes the text.
- The press uses the lower half of its head, and its rod repeats up to the ceiling. The spring's
  coil is pressed under a pad that keeps its thickness. The gate's shaft, the conveyor's chevrons
  and the speed strip's arrows are each cut so they repeat end to end.
- The keyword tag is drawn at a slant. It is turned to lie flat, and its plain middle stretches
  to the length of the word, which the game writes.
- The warning sign's right corner lay under the logo. It is its left corner, mirrored.
- The two subscription cards have a blank label. The game writes GPT and CLD on them.
- The title hero is reduced to 96 colours so it stays sharp when the page enlarges it.

## Prompts and layout sketches

`prompts/` holds the exact text each picture was asked for with, and `prompts/jobs.json` says
which reference pictures went with it. `layouts/` holds the flat-colour sketches that fix where a
skyline, bridge or bank of treetops sits. The style references are the game's own plates and
atlases, so they are not copied here.

The `city-*` and `growth-*` prompts are for Ship It City and Growth Run. Each picture came from
its prompt at the first attempt.

`city-far-2`, `city-near-2` and `growth-near-2` replaced the first pictures of Ship It City's
skyline and bridge and Growth Run's track, which were asked for with a layout sketch and came
back as flat shapes. They were asked for with these prompts, with the sentences about a reference
picture swapped for a plain description of the style, since none was attached.
