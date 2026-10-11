# Places near both UIC campuses

Snapshot checked 2026-10-10. New coverage is the union of two **straight-line two-mile circles**, centered on Student Center East (-87.647964, 41.871967) and Student Center West (-87.674561, 41.870762), from the project's UIC facility registry. Existing curated Chicago destinations are retained even if farther away.

`uic-nearby-osm.json` is the public OpenStreetMap source snapshot (ODbL). The source query covers a bounding rectangle; the importer clips every added place to the exact circles, excludes private/disused/abandoned listings and deduplicates nearby normalized names against the existing directory. Nearby branches with the same name can be coalesced within roughly 105 metres; review ambiguous cases before changing the threshold. OSM is community-maintained and is not an exhaustive or independently confirmed business registry. A fetched listing does not certify that the business is still open, has study seats, or offers a discount.

Sources:
- https://www.openstreetmap.org/copyright — attribution and ODbL terms; retained in the UI and each source record.
- https://studentcenters.uic.edu/about/locations/ — East/West campus centers.
- https://studentcenters.uic.edu/be-here/be-here-sce/ — Headrest Barber Shop, location and student price.
- https://library.uic.edu/libraries/daley/ — Daley Library study rooms/access.

Refresh the source with `python3 website/data/importers/uic-nearby-places.py` from the repository root. A failed download leaves the last-good snapshot intact.

Run from `website/frontend`:

```sh
node scripts/import-nearby-places.mjs
node scripts/build-review-places.mjs
npm test
```

`nearbyPlaces.json` is generated, separate from the hand-edited `added_sites.md` and `placeDetails.js`. The source snapshot and this documentation provide the derived database in reusable form. New facts should be corrected in the source/overrides, then regenerated. For later production updates, create a **new** catalog migration rather than editing an already-applied migration. Do not delete old review catalog IDs: reviews refer to those stable IDs.

`overrides.json` supplies individually checked additions; `photos.json` supplies coordinate-matched Wikimedia Commons photographs and attribution. The downloaded photographs retain their credited licenses; source links point to the original file/license pages. The remaining new records have original, explicitly labeled **category illustrations**, not purported venue photographs. Never substitute an unrelated chain photo for a branch. Actual venue-photo coverage remains partial (10 photographs across new records in this release); existing curated photos remain unchanged.

Imported hours retain source wording and are not parsed into a claim that a venue is currently open. Missing hours and dietary facts ask the student to check. No ratings, visitors, discounts, prices or testimonials are fabricated. Only reviewed official/UIC discount evidence sets `student: true`; no discount is required for inclusion. Student reviews are independent user opinions and never automatically set a discount badge.
