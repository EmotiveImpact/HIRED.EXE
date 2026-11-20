# HIRED.EXE exploration history

This is a curated record of the available conversation and recovered files. It preserves the design decisions and their provenance. `VISIBLE-REQUEST-RECORD.md` separately preserves the seven visible user requests verbatim, and `ATTACHMENT-INDEX.json` records the 27 supplied historical attachment entries. This is not a verbatim export of every message, tool call or earlier assistant response; a complete ChatGPT conversation export was not available.

## The decisions, in order

### 1. A personal application becomes a game

The user proposed a three or four level game about going through the hiring process, initially for Solved Studio. Their starting reference was the company's Windows 3.11-style website. This establishes the playful desktop wrapper and the application narrative. It does not establish a verified current vacancy or official company involvement.

### 2. Build something reusable

The user asked whether the game could eventually be used for all job applications. The resulting architecture separates the applicant and employer content from shared gameplay. Each employer edition can have its own introduction, role, project selection and saved-progress ID. The Solved Studio edition remains the concrete first use.

### 3. Commit to a real side-scroller

The user asked for a “proper game”, referring to Sonic and Mario as examples of side-scrolling play. That directs the experience towards momentum, jumping, varied routes, enemies and levels. The hero, world, sprites and story remain original.

### 4. Address loading and presentation

The user reported that the game was not loading and asked whether the requested styles had been used. The supplied file list contains several standalone HTML and zipped builds. The recovered v0.3 README describes an offline single-file build and a hosted preview. That is evidence of an earlier implementation and delivery approach, not proof that the old hosted address is currently available or that every device works.

### 5. Approve a richer art direction

The user requested image generation, better sprites and a world closer in visual richness to Super Mario World. Four generated concepts were supplied: an Application Alley gameplay-style composition, a hero animation sheet, an environment sheet and an enemies/collectibles sheet. These images are preserved unchanged in `assets/reference/`.

### 6. Turn the direction into a production kit

The user approved the result with: “ok save this now and get this design properly learn the art style and put it together as components and then build out the levels this is excellent”. This is the basis for the art bible, production atlases, world backdrops, reusable component catalogue and new level implementation.

### 7. Finish the work, then move to a repository

The latest instruction was: “get all of these done and well then we will move the entire conversation and exploration on the repo”. The current delivery is prepared for that later repository move. No remote repository or target branch was supplied as part of this instruction. The package should carry the source, art, prompts, documentation and verification evidence so the next step does not lose the design history.

## Recovered baseline

The supplied `HIRED-EXE-v0.3.zip` was recovered and inspected. It contains a standalone playable HTML file, a screenshot and the earlier editable HTML/CSS/JavaScript source. Its README describes a four-world Canvas game using procedural art, momentum, double jump, dash, checkpoints, enemies, bosses and a portfolio ending.

The source confirms the basic game and employer edition structure. It also exposes implementation limits that motivated this revision: frame-based movement tied to the rendering loop, loosely handled moving platforms, repeated layout structure, procedural character graphics and portfolio URLs left blank. The earlier test narrative covers menu, movement and completion flows, but it does not establish a human end-to-end playthrough. New verification should say exactly what was exercised.

The baseline archive's SHA-256 is:

```text
e6143345d3753bf4503477be71982f2ae2e0af050e2487aede2c7711f0504fe9
```

## Preserved approved references

All four files below are byte-for-byte copies of the supplied originals. They were materialised from the supplied file metadata and inspected on 19 November 2026. Their original generation dates and exact original prompts are not available in the provided file metadata. Do not reconstruct those prompts and label them as exact originals.

| Local reference | Dimensions | Original file ID |
| --- | --- | --- |
| `assets/reference/gameplay-approved.png` | 1672 × 941 | `file_0000000007e88243b7cd85f2d66d2497` |
| `assets/reference/hero-approved.png` | 1254 × 1254 | `file_0000000071e881f4aab9282b43cdb256` |
| `assets/reference/environment-approved.png` | 1254 × 1254 | `file_00000000ee6c8246b980b8b0c00d5a61` |
| `assets/reference/enemies-approved.png` | 1254 × 1254 | `file_000000009e6881f49bb52584f35821f6` |

### Original image hashes

```text
gameplay-approved.png
cf7daf12e96e8a31a00fc1170976a1fedd58b7463e5b769012a98a2ef4a73fd7

hero-approved.png
0de7933d48c2186b1545bfebf0521fd922f724a6230b6b01e903ae98e2182110

environment-approved.png
5cd3637c2c81804417e56c0eee7c402a4eb24e6c9b25b62a514b448dfa619e2d

enemies-approved.png
6b295020017762f94d10aa1113913fb5abe1ccbbbec6909a46214dcecb512bcb
```

## Other supplied historical files

The user supplied metadata for multiple `HIRED-EXE-PLAY.html`, `hired-exe-platformer.zip`, `index.html` and `README.md` versions, plus `hired-exe-prototype.zip` and screenshots of menus, movement, mobile, victory and four worlds. The four approved references and v0.3 archive formed the development baseline. The other 22 attachment records were subsequently recovered into `archive/conversation-files/`, with paths, sizes, hashes and original metadata recorded in `ATTACHMENT-INDEX.json`.

Of the 27 records, 26 preserve the supplied original content. Item 26, an older `index.html`, had a stale file/library version pair that the file service rejected. Its current authorised version was archived explicitly under `26-current-v1/`, with the original request and materialised v1 identities both retained in the index. The requested older standalone content is not represented as recovered. The original prototype ZIP is preserved unchanged as a separate historical file.

The metadata list order is not a verified chronological creation order. Preserve that distinction when browsing identically named versions. An official conversation export can later sit alongside this archive without relabelling newer content as an older original.

## New work and traceability

New image prompts belong with the production asset notes. Any resizing, cell extraction or anchor normalisation must be recorded separately from image generation. A final atlas should be traceable to its generated original. Level mockups should be identified as concepts; runtime screenshots should be identified as captures from the actual build.

`ART-BIBLE.md` records the visual rules, `COMPONENTS.md` records the reusable systems, `LEVEL-DESIGN.md` records the four-stage design, `CONTENT.md` records candidate and employer copy, and `REPO-HANDOFF.md` describes the migration boundary. The release README and verification output record what was completed and tested in this revision.

## Completing the conversation archive later

An exact whole-conversation archive requires the user's exported conversation, including messages that are not visible in this working context. Keep that export unchanged under `archive/conversation-export/`, then link it from this curated record. The visible request record and attachment index already preserve the available requests and file history without presenting a reconstruction as an exact transcript.
