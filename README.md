# BamBoozle

Installable map of Vegas happy hours, brunch, late-night / reverse happy hours, and inKind restaurants.
Open it on your phone and use **Add to Home Screen** (iPhone: Safari → Share → Add to Home Screen; Android: Chrome → Install BamBoozle).

Live: https://xosoftware.github.io/vegas-happy-hours/

Features: category modes, “Use my location” with nearest-first sorting, day / “happening now” / rating / ZIP / text filters,
inKind badges and filter, works offline after the first load (map tiles you've viewed are cached).

Data is public restaurant info gathered from venue sites and third-party guides (Oct 2026); many entries are unverified —
confirm deals before you go.

Design (Oct 2026 redesign): dark neon theme by default with light / system modes, Inter font (self-hosted),
OpenFreeMap vector basemap (Dark, tinted, and Positron) rendered with MapLibre GL inside Leaflet, with an OSM raster fallback when WebGL
isn't available. Mobile uses a draggable bottom sheet (peek / half / full) and a detail sheet; desktop uses side panels.

## Updating
- **App code:** `index.html`, `app.css`, `app.js` are edited directly. Run `python3 tools/build.py` afterwards to bump the service-worker cache version.
- **Data only:** replace `data.json` (array of venue records), then run `python3 tools/build.py`, commit, push.
- **From a regenerated single-file map:** `python3 tools/build.py --from-html path/to/vegas_hh_map_inkind.html`.
- **Test:** `python3 -m http.server 8765` then `node tools/test_pwa.mjs` (writes screenshots to /workspace).
- **Icons:** `python3 tools/make_icons.py`.

Third-party: Leaflet, Leaflet.markercluster, MapLibre GL JS (BSD-3, see vendor/maplibre-gl.LICENSE.txt), maplibre-gl-leaflet, Inter (SIL OFL).
