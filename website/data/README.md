# Places, events, and benefits · Hassan

**Status:** Local UIC Connections importer produces normalized JSON; no database/storage integration or scheduler is active.

Keep curated seed data and import/update scripts here. Bhagesh can suggest places in his handoff log; Hassan maintains the committed records.

## Proposed record checklist

- Stable ID and record type: place, dated event, or student meetup; subject to EV02 agreement.
- Name, description, coordinates, address, and official source URL.
- For dated records: start/end time, time zone, venue, and cancellation/status information.
- For benefits: exact eligibility, exclusions, price/admission conditions, booking link, and expiry if known.
- Last verified date and next review date.

Keep permanent venues separate from specific outings so one pin does not imply everyone is attending at the same time. Confirm this model in B01.

Clearly distinguish synthetic development fixtures from real listings. Do not import personal attendance or chats here. Verify claims before publishing; a student example is not a confirmed discount or event.

The official UIC Connections ICS importer is documented in [importers/README.md](importers/README.md). Its local output is a snapshot for later review/integration, not yet published event data.
