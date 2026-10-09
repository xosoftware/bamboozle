# Vegas Happy Hours (PWA)

Installable map of Las Vegas happy hours, brunch, late-night / reverse happy hours, and inKind restaurants.
Open it on your phone and use **Add to Home Screen** (iPhone: Safari → Share → Add to Home Screen; Android: Chrome → Install app).

Features: category modes, “Use my location” with nearest-first sorting, day / “happening now” / rating / ZIP / text filters,
inKind badges and filter, works offline after the first load (map tiles you've viewed are cached).

Data is public restaurant info gathered from venue sites and third-party guides (Oct 2026); many entries are unverified —
confirm deals before you go.

## Updating
- **Data only:** replace `data.json` (array of venue records), then run `python3 tools/build.py` to bump the service-worker cache version, commit, push.
- **From a regenerated single-file map:** `python3 tools/build.py --from-html path/to/vegas_hh_map_inkind.html`.
- **Test:** `python3 -m http.server 8765` then `node tools/test_pwa.mjs`.
