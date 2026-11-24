# Final Interview HQ rooms: sources

`tools/build-room-art.py` turns these into the wall plates and the furniture atlas the game loads.
The sources are kept as generated and are never edited.

| File | What it is | Made with | Date |
| --- | --- | --- | --- |
| `wall-workshop.png` | Back wall of the floor 2 workshop | Antigravity CLI image generator | 24 November 2026 |
| `wall-boardroom.png` | Back wall of the floor 3 boardroom | Seedream 5.0 Lite on Dreamina | 24 November 2026 |
| `wall-reception.png` | Back wall of the floor 4 reception | Seedream 5.0 Lite on Dreamina | 24 November 2026 |
| `furniture-workshop.png` | Desk, drawers, work chair, bin, shelf unit, desk lamp | Seedream 5.0 Lite on Dreamina | 24 November 2026 |
| `furniture-boardroom.png` | Boardroom table, two chairs, palm, sideboard | Seedream 5.0 Lite on Dreamina | 24 November 2026 |
| `furniture-reception.png` | Reception desk, armchair, coffee table, planter, tree, floor lamp | Seedream 5.0 Lite on Dreamina | 24 November 2026 |

Each was generated with the matching earlier room painting as a style reference.

The five Seedream images are a test set. They carry Dreamina's free-account badge and watermark in
two corners. The build keeps those out of the game: `WALLS` crops each wall to the part that is
shown, which also drops a painted strip of floor and, in the reception, a painted lift door, and
`SHEET_MARKS` blanks the two corners of each furniture sheet. A replacement set is planned.

`previous/` holds the room paintings used before, which had furniture painted into them. The game
no longer loads them.
