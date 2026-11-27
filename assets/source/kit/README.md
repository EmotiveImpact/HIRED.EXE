# Sources for the layered backgrounds and the painted kit

Fourteen pictures made with Dreamina (Seedream 5.0 Lite, 2K) on 26 November 2026, each guided by the
game's existing art as reference, and three made on CapCut (Seedream 5.5, 2K) on 27 November 2026
from a written description alone. They are kept as generated. The Dreamina pictures carry the
generator's own marks, a badge top left and a logo bottom right, which `tools/build-art-kit.py`
cuts away or paints out. The three from CapCut, whose names end in `-2`, have no marks.

| File | What it is | Ground |
| --- | --- | --- |
| `alley-sky.png` | Application Alley's sky | none: a full picture |
| `alley-far.png` | Its far skyline | green |
| `alley-near.png` | Its viaduct and treetops | red, since the trees are green and pink |
| `alley-movers.png` | Plane, blank banner, train (no longer used: Application Alley has no train), two gulls, balloon | green |
| `signs.png` | Four blank signs, one for each world | green |
| `machinery-a.png` | Press head and rod, spring up and down, conveyor, speed strip, two orbs | green |
| `machinery-b.png` | Gate pillar, blank tag, bell, padlock, warning sign | green |
| `pickups.png` | Two subscription cards, cold coffee, zipped folder | pink |
| `title-hero.png` | The hero running, for the title screen | pink |
| `city-sky.png` | Ship It City's evening sky | none: a full picture |
| `city-far-2.png` | Its far skyline of towers and cranes | green |
| `city-near-2.png` | Its girder bridge, brick factories, chimneys and treetops | magenta |
| `city-movers.png` | Airship, two drones, freight train, three puffs of smoke | hot pink |
| `growth-sky.png` | Growth Run's twilight sky | none: a full picture |
| `growth-far.png` | Its far skyline of chart screens and dishes | green |
| `growth-near-2.png` | Its monorail track, neon buildings and blossom trees | green |
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

- Ship It City's bridge, factories and trees are one picture, and so are Growth Run's track,
  buildings and blossom. Each is used whole as the layer the train runs along. Its front bank of
  trees is also lifted out to slide by itself as a nearer layer: whatever is leaf or petal
  coloured and as wide as a tree's crown, with the boughs and trunks it closes round.
- Growth Run's far trees show at either end of its picture, cut off by pillars. Those ends are
  left out of the nearer layer.
- A scrap of a building painted into Ship It City's clouds is painted out.
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

`city-far-2`, `city-near-2` and `growth-near-2` replaced the first pictures of Ship It City's
skyline and bridge and Growth Run's track, which were asked for with a layout sketch and came
back as flat shapes. They were asked for with these prompts, with the sentences about a reference
picture swapped for a plain description of the style, since none was attached.
