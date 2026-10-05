# Afterclass frontend

A local React + Vite prototype for the UIC social discovery map. “Afterclass” is a working name.

## Run

Node 22.12+ recommended.

```sh
cd website/frontend
npm ci
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` creates `dist/`; `npm run preview` serves the built app. No API key is needed for this prototype.

## Content

Edit [added_sites.md](../../added_sites.md) to change a place name or description. Vite imports it directly, including in production builds: changes appear with hot reload in development and on rebuild in production. Stable IDs connect copy with metadata, bookmarks, pins, and draft plans. Names are never duplicated in metadata.

Hours, source links, coordinates, menu highlights, dietary tags, benefits, and date-bounded exhibitions are in [placeDetails.js](src/placeDetails.js). Coordinates are approximate entrance locations; Google Maps links resolve the place and address. Venue schedules are regular hours and do not guarantee holiday opening. Art Institute hours still need primary-source re-verification and show “Check schedule” instead of an open/closed claim.

Initial places: Art Institute, Busy Burger, Two Shades Cafe, Gallery 400, First Ascent Block 37, 3RUN2 University Village, and Cairo Kebab. The UI links to the source for every listing. Read [research notes](RESEARCH.md) before refreshing offers.

## Interaction scope

- Search names, descriptions, cuisine, and dietary tags; filter by category or free admission.
- Select pins or cards; view hours, benefit conditions, menus, exhibitions, and Google Maps links.
- Bookmarks and private event drafts persist in localStorage. No accounts, shared events, messages, invitations, or real attendance data are implemented.
- Reload always centers on UIC, never device location. The map supports worldwide panning and zooming.
- Drag to pan; right-drag to rotate/tilt; pinch to zoom; two-finger scrolling pans. Twist follows finger direction. Shift-horizontal scrolling controls roll. The small 2D/3D control changes pitch without hijacking scrolling. N aligns north up/east right, resets roll, and sets 3D tilt to 45° while preserving location and zoom; a flat view stays flat. The 3D toggle also uses 45°.
- Open Explore for the lower-center glass sheet; selecting a place opens its details. Both close with X. Guest dialogs use the same glass treatment.
- Saved contains only bookmarked places. My Events contains private event drafts; creating a draft opens My Events. Existing localStorage records are preserved.
- UIC labels have no dot/halo; road labels and decorative map cards are removed. The location pill has no clock.
- Building heights use map data with a 7m display fallback; these are visual estimates, not survey data.
- Day/night follows calculated Chicago sunrise/sunset, updating every minute even when the visitor is in another timezone. Solar calculations are approximate, without a weather API.
- Keyboard access, native modal focus trapping, reduced-motion handling, phone layout, and a usable list when maps fail.

## Map prototype

MapLibre GL JS 6 with OpenFreeMap vector tiles. This is a reversible frontend prototype choice; Hassan still owns production provider/budget/hosting approval. [MapLibre setup](https://maplibre.org/maplibre-gl-js/docs/) and [OpenFreeMap quick start](https://openfreemap.org/quick_start/) were checked for implementation. The worker uses Vite's `?worker&url` bundling.

`src/base-style.json` is derived from OpenFreeMap Liberty. Map attribution is retained from the tile source. [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://openmaptiles.org/), and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) supply the map resources. Keep attribution visible when restyling. External map/font services need internet access; text falls back to system fonts. The map bundle is relatively large and should be split/lazy-loaded before production optimization.

## Campus building colors

[UIC's official campus directory](https://maps.uic.edu/Maps) supplies 113 locations in `src/uic-buildings.json` (checked October 5, 2026). The matcher associates 112 locations with tile footprints; Flames Field Press Box has no matching footprint. Four entrance points use the nearest footprint within 35m. Matching and connected-wing affiliation are geometric estimates, not a property ownership inventory.

`node scripts/match-uic-buildings.mjs` fetches OpenFreeMap tiles and rebuilds seven attributed local vector tiles in `public/uic-tiles/`. Buildings are split before assigning UIC affiliation because original feature IDs group unrelated polygons. Campus parts are merged globally across tile boundaries; overlapping roofs become non-overlapping steps. The red material uses the original extrusion layer, not an overlay. Courtyard holes and different roof heights are retained. Elevated campus parts are simplified into ground-based stepped solids. Buildings outside the matched footprints remain neutral.

The tiles are derived from OpenStreetMap/OpenMapTiles via OpenFreeMap; retain the map attribution and the provenance in `src/uic-tile-index.json`. Geometry/source versions are recorded there; content hashes invalidate cached tiles. Refresh these curated tiles when updating campus data. Campus colors appear at building-detail zoom (14+) while the world map continues to use provider tiles.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
# With the dev server running:
node tests/smoke.mjs
```

Unit checks cover Markdown propagation, data IDs, sunrise/sunset across seasons and DST, Chicago hours, and expired exhibitions. The browser smoke flow checks loaded maps, search, details, bookmark persistence, draft creation, free filtering, and phone overflow. Screenshots are in `artifacts/`.

[Frontend tracker](../../WORKFLOW_A_BHAGYESH.md) · [Sunday refresh handoff](../../SUNDAY_REFRESH_TASK.md)
