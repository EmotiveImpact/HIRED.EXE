# HIRED.EXE modular v0.3 source

This is a mechanical extraction of the working standalone browser game in `../../HIRED-EXE-PLAY.html` into individual HTML, CSS and JS files. It is intentionally the procedural-art prototype, not the new image-integrated release.

Run `python3 -m http.server 8000` at repository root and open `/prototype/source/`.

`js/editions.js` stores edition-level content and target company settings. `js/game.js` contains the existing game logic. Keep game-engine code separate from new employer-specific editions.
