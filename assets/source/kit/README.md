# Sources for the layered backgrounds and the painted kit

Seventeen pictures made with Dreamina (Seedream 5.0 Lite, 2K) on 26 November 2026, each guided by the
game's existing art as reference. They are kept exactly as generated: the badge top left and the
logo bottom right are the generator's own marks, and `tools/build-art-kit.py` cuts them away or
paints them out.

| File | What it is | Ground |
| --- | --- | --- |
| `alley-sky.png` | Application Alley's sky | none: a full picture |
| `alley-far.png` | Its far skyline | green |
| `alley-near.png` | Its viaduct and treetops | red, since the trees are green and pink |
| `alley-movers.png` | Plane, blank banner, train, two gulls, balloon | green |
| `signs.png` | Four blank signs, one for each world | green |
| `machinery-a.png` | Press head and rod, spring up and down, conveyor, speed strip, two orbs | green |
| `machinery-b.png` | Gate pillar, blank tag, bell, padlock, warning sign | green |
| `pickups.png` | Two subscription cards, cold coffee, zipped folder | pink |
| `title-hero.png` | The hero running, for the title screen | pink |
| `city-sky.png` | Ship It City's evening sky | none: a full picture |
| `city-far.png` | Its far skyline of cranes and works | green |
| `city-near.png` | Its girder bridge, chimneys and treetops | magenta |
| `city-movers.png` | Airship, two drones, freight train, three puffs of smoke | hot pink |
| `growth-sky.png` | Growth Run's twilight sky | none: a full picture |
| `growth-far.png` | Its far skyline of chart screens and dishes | green |
| `growth-near.png` | Its monorail track, chart screens and blossom trees | green |
| `growth-movers.png` | Chart airship, two couriers, rocket, bullet train | green |

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

- Ship It City's bridge, chimneys and treetops came out as flat shapes. The bridge gets flanges
  and rivets and the chimneys a lit side and courses of brick. The treetops take their leaves from
  Application Alley's canopy, mirrored and turned green, which also serves as the nearer layer.
- A rank of blank lilac blocks stands behind Ship It City's far skyline. It is melted most of the
  way into the sky. A scrap of a building painted into its clouds is painted out.
- Growth Run's back row of blossom is flat pink. It takes its light and shade from the blossom
  drawn below it. Three of its eight identical chart screens are removed.
- Growth Run's nearer layer is its own blossom trees twice over, a row and the same row again
  lower and shifted along, with trunks, pillars and pale slivers kept out.
- Growth Run's train is three carriages long as drawn. Its middle carriage rides three times.
- Cut-outs with a green rim from the ground colour have it shaved off.

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

`city-far-2`, `city-near-2` and `growth-near-2` ask again for Ship It City's skyline and bridge
and Growth Run's track without the layout sketch, which made the first pictures come back as flat
shapes. They have not been run yet.
