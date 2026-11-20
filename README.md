# HIRED.EXE 🎮

**The application is the application.** A genuine four-level, side-scrolling, 16-bit-inspired platform game where Augustus travels through the hiring process, starting with a Solved Studio edition. The intention is a *memorable playable demonstration of creative judgement and AI-assisted product building*, with reusable editions for future employers.

## Current status | 20 November 2026

**Playable baseline:** the old four-world v0.3 browser platformer with procedurally drawn art at `index.html` and `prototype/source/`. **New art:** the four original illustrated backgrounds, hero/enemy/environment atlases, 32 separate ground/prop PNGs and approved style sheets are committed to this branch. **Not yet proven:** those images are integrated into the actual playable worlds; complete game/physics/boss/mobile QA and a final public release remain unfinished.

**Start with [the Work mode handover](docs/WORK_MODE_HANDOFF.md)**. It includes the remaining work, implementation order, tests and release restrictions.

## Try the existing prototype

Legacy v0.3 URL: https://hired-exe-augustus-preview.vercel.app/ (this still uses procedural art).

Local: `python3 -m http.server 8000` at the repository root, then open `http://localhost:8000/`; alternatively open the standalone `index.html`. Controls: A/D or arrows move; Space/W/Up jump; Shift/X dash; P/Escape pause. Touch controls appear on mobile.

## The four levels

1. **Application Alley:** tutorials, CV bots and the CV Filter.
2. **Ship It City:** industrial traversal, delivery constraints and Scope Creep.
3. **Growth Run:** dash routes, flying threats and The Algorithm.
4. **Final Interview HQ:** ascending into the studio and discovering authentic portfolio evidence and a real contact CTA.

### Source and design

- **Game:** `index.html` (standalone), `prototype/source/` (HTML/CSS/JS components), `prototype/HIRED-EXE-PLAY.html` (preserved snapshot).
- **Art:** `assets/production/` (new world backdrops and atlas sources), `assets/tiles/` and `assets/props/` (32 individually extracted original PNGs), `assets/source-atlases/` (original source sheets), `assets/manifest.json` (paths and intended uses).
- **Approved exploration:** `references/` (gameplay target, Augustus character art, enemy and HUD concepts, environment concepts).
- **Specs:** `docs/ART_STYLE_BIBLE.md`, `docs/LEVEL_BLUEPRINT.md`, `docs/DECISION_LOG.md`, `docs/WORK_MODE_HANDOFF.md`, `docs/IMPLEMENTATION_PLAN.md`.

The visual target is lush, detailed, bright **original** SNES-era-style pixel art with a restrained Windows-style frame. Mario and Sonic are genre inspirations, never source sprites or level layouts. The game is an independent application, **not affiliated with or endorsed by Solved Studio**. All rights reserved unless separately licensed.

## Review and release

Work on branch `feat/hired-exe-art-and-game-handoff` and [draft PR #1](https://github.com/EmotiveImpact/HIRED.EXE/pull/1). The repository is currently **public**. Do not merge, announce a finished art-integrated game, or promote a new production build until gameplay and assets are verified and the user approves.
