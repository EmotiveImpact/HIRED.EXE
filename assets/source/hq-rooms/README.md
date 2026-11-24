# Final Interview HQ rooms: sources

`tools/build-room-art.py` turns these into the wall plates and the furniture atlas the game loads.
The sources are kept as generated and are never edited.

| File | What it is |
| --- | --- |
| `wall-workshop.png`, `wall-workshop-b.png` | Two stretches of the back wall of the floor 2 workshop |
| `wall-boardroom.png`, `wall-boardroom-b.png` | Two stretches of the back wall of the floor 3 boardroom |
| `wall-reception.png`, `wall-reception-b.png` | Two stretches of the back wall of the floor 4 reception |
| `furniture-workshop.png` | Drafting desk, plan chest, stool, bin of drawing rolls, shelf unit, desk lamp |
| `furniture-boardroom.png` | Boardroom table, two chairs, palm, sideboard with a vase |
| `furniture-reception.png` | Reception desk, armchair, coffee table, planter, tree, floor lamp |

All nine were made on 24 November 2026 with the Antigravity CLI's image generator (`agy`), which
does not name its image model. Walls are 1376 x 768 and sheets 1200 x 896 on flat magenta. Each
was generated with the matching earlier room painting as a style reference, and each second
stretch of wall with the first as its reference.

A room is wider than one image, so its wall is two stretches joined; `WALLS` in the build tool
says which part of each is used. The first reception wall has a painted lift door at its left
edge, which is left out because the game draws its own lifts.

An earlier test set made with Seedream 5.0 Lite on Dreamina is in the git history at commit
74375f2. It carried Dreamina's watermark and is not used.

`previous/` holds the room paintings used before, which had furniture painted into them. The game
no longer loads them.
