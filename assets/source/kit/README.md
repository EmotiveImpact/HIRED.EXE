# Sources for the layered backgrounds and the painted kit

Nine pictures made with Dreamina (Seedream 5.0 Lite, 2K) on 26 November 2026, each guided by the
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

Signs, machinery, pickups and the title hero are not yet used by the game.
