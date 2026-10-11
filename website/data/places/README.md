# Places near both UIC campuses

Snapshot checked 2026-10-10. New coverage is the union of two **straight-line one-mile circles** (hard limit, accepted 2026-10-10; was two miles), centered on Student Center East (-87.647964, 41.871967) and Student Center West (-87.674561, 41.870762), from the project's UIC facility registry. Existing curated Chicago destinations are retained even if farther away.

`uic-nearby-osm.json` is the public OpenStreetMap source snapshot (ODbL). The source query covers a bounding rectangle; the importer clips every added place to the exact circles, excludes private/disused/abandoned listings and deduplicates nearby normalized names against the existing directory. Nearby branches with the same name can be coalesced within roughly 105 metres; review ambiguous cases before changing the threshold. OSM is community-maintained and is not an exhaustive or independently confirmed business registry. A fetched listing does not certify that the business is still open, has study seats, or offers a discount.

Sources:
- https://www.openstreetmap.org/copyright — attribution and ODbL terms; retained in the UI and each source record.
- https://studentcenters.uic.edu/about/locations/ — East/West campus centers.
- https://studentcenters.uic.edu/be-here/be-here-sce/ — Headrest Barber Shop, location and student price.
- https://library.uic.edu/libraries/daley/ — Daley Library study rooms/access.

Refresh the source with `python3 website/data/importers/uic-nearby-places.py` from the repository root. A failed download leaves the last-good snapshot intact.

Run from `website/frontend`:

```sh
node scripts/fetch-venue-websites.mjs   # optional refresh of venue-websites.json
node scripts/import-nearby-places.mjs
node scripts/build-review-places.mjs
npm test
```

`nearbyPlaces.json` is generated, separate from the hand-edited `added_sites.md` and `placeDetails.js`. The source snapshot and this documentation provide the derived database in reusable form. New facts should be corrected in the source/overrides, then regenerated. For later production updates, create a **new** catalog migration rather than editing an already-applied migration. Do not delete old review catalog IDs: reviews refer to those stable IDs.

`overrides.json` supplies individually checked additions; `photos.json` supplies coordinate-matched Wikimedia Commons photographs and attribution. The downloaded photographs retain their credited licenses; source links point to the original file/license pages. The remaining new records have original, explicitly labeled **category illustrations**, not purported venue photographs. Never substitute an unrelated chain photo for a branch. Actual venue-photo coverage remains partial (10 photographs across new records in this release); existing curated photos remain unchanged.

Imported hours retain source wording and are not parsed into a claim that a venue is currently open. Missing hours and dietary facts ask the student to check. No ratings, visitors, discounts, prices or testimonials are fabricated. Only reviewed official/UIC discount evidence sets `student: true`; no discount is required for inclusion. Student reviews are independent user opinions and never automatically set a discount badge.

## Hours and photos from venue websites

`venue-websites.json` is a dated snapshot from `scripts/fetch-venue-websites.mjs`. For each new place with a website in OpenStreetMap, the script reads the venue's own page (respecting robots.txt, identifying as KampuscapeBot) and, where a place has a `wikidata` tag, its Wikimedia Commons image.

- OpenStreetMap `opening_hours` are parsed into weekly schedules by `src/openingHours.js`. Rules outside the plain weekly subset (months, open-ended times, sunrise) stay as text.
- Website hours are used only when the page's schema.org data carries opening hours and its street address matches the place. Some sites carry leftover template data for other businesses, so unmatched hours are ignored.
- Website images come from the page's `og:image`. They are skipped for chain or shared websites, `brand:wikidata` listings, logos/icons, and anything under 480×270 or outside a photo-like aspect ratio. They are credited to the venue site, linked to the page, and served through `/uic/api/place-photo/<id>`, which fetches only allowlisted URLs from `src/placePhotoSources.json`.
- Commons photos load directly from Wikimedia with the author and license from Commons metadata.

These images belong to the venues or their authors. Remove an image on request by deleting its entry and rerunning the importer.

## What the app shows

Every nearby place ships to the app (accepted 2026-10-10, replacing a short-lived photo-and-hours gate). The map opens on **For students**: only places with a documented UIC student discount or perk. Picking a category in Explore (Cafes, Groceries, All places…) shows every matching place on the map, and the choice stays on that device until another is picked. Places without a real photo keep their labeled category illustration; places without hours say so.

The generated block at the end of [added_sites.md](../../../added_sites.md) lists every nearby place, grouped by what is still missing (photo, hours, or both). To fill a gap, add a credited photo to `photos.json`, hand-checked hours to `overrides.json` under `hours` (`{"<id>": {"opening_hours": "Mo-Fr 08:00-17:00", "source": "https://…"}}`), or fix the listing in OpenStreetMap, then rerun the importer. The review catalog only ever grows, so reviews survive any change in the directory.
