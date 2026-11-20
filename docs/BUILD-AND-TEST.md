# Build and test

Use the [README](../README.md) for the build commands and [PLAYTEST.md](PLAYTEST.md) for the actual browser evidence, timings and device coverage. `python3 tools/build.py` produces the static site and both self-contained editions from the checked-in assets. The game has no remote runtime dependencies.

The original environment PNGs stay in the art book. The web game uses 960 × 540 WebP copies exported with nearest-neighbour resampling and quality 93. The four game backdrops total 942,250 bytes. The character and environment atlases retain their transparency and their JSON frame and foot-anchor maps.

`tests/build-check.py` verifies all 17 embedded gameplay images, the art catalogue, the four gameplay captures, local links and script syntax. `tools/package.py` checks ZIP integrity and copies the offline editions into the sibling deliverables directory. The exact production artwork inputs are catalogued in [assets/manifest.json](../assets/manifest.json).
