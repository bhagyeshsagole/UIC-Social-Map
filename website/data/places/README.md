# Places near both UIC campuses

Snapshot checked 2026-10-16. Coverage is the union of two **straight-line one-mile circles** (hard limit, accepted 2026-10-10), centered on Student Center East (-87.647964, 41.871967) and Student Center West (-87.674561, 41.870762), plus **half a mile around every East, West and South campus building** in `src/uic-buildings.json` (added 2026-10-16, so Pilsen's 18th Street and the West Loop edge of campus are covered). Existing curated Chicago destinations are retained even if farther away.

The source query covers food and drink, coffee and tea shops, groceries, pharmacies, department and dollar stores, delis and bakeries, services (laundry, dry cleaning, print and post offices), books and stationery, bars and nightclubs, museums, galleries, theatres and cinemas, gyms, and parks. Parks and sports grounds count only when the Chicago Park District, a website or Wikidata stands behind them, so campus courtyards and school fields stay out. `overrides.json` → `excluded` keeps out listings that are not places a student can use (a highway viewpoint, VA hospital services); `duplicates` drops a listing that is the same place as a hand-edited entry.

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
node scripts/fetch-park-district.mjs     # optional refresh of park-district.json
node scripts/fetch-brand-photos.mjs      # optional refresh of brand-photos.json
node scripts/import-nearby-places.mjs
node scripts/build-review-places.mjs
npm test
```

`nearbyPlaces.json` is generated, separate from the hand-edited `added_sites.md` and `placeDetails.js`. The source snapshot and this documentation provide the derived database in reusable form. New facts should be corrected in the source/overrides, then regenerated. For later production updates, create a **new** catalog migration rather than editing an already-applied migration. Do not delete old review catalog IDs: reviews refer to those stable IDs.

`overrides.json` supplies individually checked additions; `photos.json` supplies coordinate-matched Wikimedia Commons photographs and attribution. The downloaded photographs retain their credited licenses; source links point to the original file/license pages. The remaining new records have original, explicitly labeled **category illustrations**, not purported venue photographs. A chain photo that is not of this branch is only ever shown captioned as a brand photo (see Hours and photos below).

Imported hours retain source wording and are not parsed into a claim that a venue is currently open. Missing hours and dietary facts ask the student to check. No ratings, visitors, discounts, prices or testimonials are fabricated. Only reviewed official/UIC discount evidence sets `student: true`; no discount is required for inclusion. Student reviews are independent user opinions and never automatically set a discount badge.

## Hours and photos

Run from `website/frontend`, then rerun the importer. Every fetcher identifies itself as KampuscapeBot, follows robots.txt (standard matching: wildcards, `$`, Allow), and writes a dated snapshot here.

| Snapshot | Script | What it adds |
| --- | --- | --- |
| `venue-websites.json` | `fetch-venue-websites.mjs` | Hours and a photo from each place's own website. |
| `chain-hours.json` | `fetch-chain-hours.mjs` | Branch hours from chain store-locator pages. |
| `commons-photos.json` | `fetch-commons-photos.mjs` | Freely licensed photos from Wikidata and Wikimedia Commons. |
| `park-district.json` | `fetch-park-district.mjs` | Weekly park hours and the park's own photo from chicagoparkdistrict.com. |
| `brand-photos.json` | `fetch-brand-photos.mjs` | One photo per chain: the brand's Wikidata image on Commons (or one picked by hand), else the brand website's share image. |
| `google-photos.json` | by hand (browser) | A photo from the place's own Google Maps listing, saved under `public/places/google/`, for places with no other photo. |
| `photo-review.json` | by hand | `rejected`: photos that never ship. `approved` (Commons) and `approvedWebsite` (a venue's own site, served through the proxy): photos picked on contact sheets. |
| `overrides.json` | by hand | `hours`: hand-checked hours in OpenStreetMap syntax with a source link. `details`: corrected `name` or `address`. `closed`: places confirmed closed or moved, kept out of the app and listed in `added_sites.md`. |

Rules that keep this honest:

- **Hours, in order of trust:** OpenStreetMap `opening_hours` (parsed by `src/openingHours.js`), the venue site's schema.org data when its street address matches, single-branch page markup, then hours written as text on the page (`scripts/lib/hoursText.mjs`). The text reader refuses rather than guesses: a closing time needs am/pm, conflicting blocks fail, a block cut short before a section that names missing days fails, and on a page listing several addresses the hours must follow this branch's address.
- **Same name, different business:** a site must name the venue and place itself in Chicago (city, state, 606 ZIP, or this street address).
- **Chains and shared sites:** chain store pages count only when the page's own address matches the branch. A branch without its own photo shows the **brand photo**, captioned "brand photo, not this branch" (accepted 2026-10-16, replacing the earlier no-brand-photo rule). Brand photos must still look like photos: logos, ads, headquarters buildings and closed stores are rejected in `photo-review.json` → `rejectedBrands`; `brandPicks` names a Commons file picked by eye instead.
- **Photos:** must look like photos (size, aspect, compression, colour variety), not logos or banners. Every new photo is checked by eye on a contact sheet before release; rejections go in `photo-review.json`. Commons photos must be geotagged at the place or named for it, never street scenes, buildings or people at events, and carry their author and license.

These images belong to the venues or their authors. Remove one on request by adding it to `photo-review.json` and rerunning the importer.

## What the app shows

Every nearby place ships to the app (accepted 2026-10-10, replacing a short-lived photo-and-hours gate). The map opens on **All places** with every pin shown (accepted 2026-10-16; it opened on For students before). Picking a category in Explore (Cafes, Groceries, For students…) narrows the map, and the choice stays on that device until another is picked. Places without a real photo keep their labeled category illustration; places without hours say so.

The generated block at the end of [added_sites.md](../../../added_sites.md) lists every nearby place, grouped by what is still missing (photo, hours, or both). To fill a gap, add a credited photo to `photos.json`, hand-checked hours to `overrides.json` under `hours` (`{"<id>": {"opening_hours": "Mo-Fr 08:00-17:00", "source": "https://…"}}`), or fix the listing in OpenStreetMap, then rerun the importer. The review catalog only ever grows, so reviews survive any change in the directory.

## Hand-checked batches

On 2026-10-12, 50 of the places closest to campus were completed by hand: each got a photo picked by eye from the venue's own website (a resized copy from the same host when the original was heavy) and weekly hours from the business's Google listing, its website, or the UIC Library hours page. Hours that already matched the app were left alone. The same pass found 9 listings that are permanently or temporarily closed or have moved; they are in `overrides.json` → `closed`. Expiring image links (signed Google Sites URLs) and photos from shared or event-venue sites are not used.

On 2026-10-16 (A44/B27, at the user's request) every place within half a mile of a campus building was worked through:

- **Hours** for 213 places from their Google business listings, read in the browser and accepted only when the listing's name and street number match the OpenStreetMap entry (wrong branches and sponsored panels are dropped); UIC Dining's Fall 2026 hours for the Student Center, JST, Morgan Street and campus cafés; Chicago Park District pages for parks; and official sites for the new sights. Google's hours are a snapshot: they say "Confirm before visiting" like every other source.
- **Photos**: venue websites first, then Commons, then the Park District, then the place's own **Google Maps listing photo** (accepted 2026-10-16 for places with nothing else; 115 saved locally at 720 px and credited "Google Maps listing photo"), then a labeled brand photo for chain branches. Every photo was checked by eye on contact sheets; rejected ones (renderings, signs, ads, wrong branches, generic street views) never ship.
- **Closures**: 17 more listings found permanently or temporarily closed, moved, or catering-only, kept out of the app under `closed`.

Afterwards 365 of the 417 places within half a mile have both a photo and hours. The rest are listed in [added_sites.md](../../../added_sites.md); most are campus counters or tiny shops without any listing.

