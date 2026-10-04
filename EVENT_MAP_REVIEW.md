# UIC social discovery map — concept review

Researched October 4, 2026. Direction selected by the team; implementation decisions below are proposals, not a finalized build plan.

**Product:** Discover places and events around Chicago, understand the student benefits, and find UIC people to go with. The useful interaction is **find somewhere → choose a specific plan → meet people before arriving**.

## 1. Check these assumptions first

| Assumption | What the evidence supports | Product consequence |
| --- | --- | --- |
| A UIC email proves someone is a current student | UIC email is available to students, faculty, and staff; eligible alumni can retain forwarding. [UIC email service](https://help.uillinois.edu/TDClient/37/uic/Requests/Service/712/Email-and-Calendaring), [alumni forwarding](https://advance.uic.edu/uic-email-forwarding-faq/) | Email verification proves control of an address, not enrollment, age, identity, or good behavior. A periodic email check does not solve alumni eligibility. |
| UIC email keeps predators out | It creates a barrier to entry, not a safety guarantee. A harmful user can be university-affiliated or use a compromised/shared account. | Say “UIC email verified,” not “safe,” “background checked,” or “verified current student.” Decide whether actual enrollment verification is required before calling membership students-only. |
| The Art Institute is free for UIC students | UIC confirms free admission for undergraduate, graduate, and professional students presenting their student i-card. [Flames in the City](https://involvement.uic.edu/events-2/flames-in-the-city/) | This is a legitimate seed benefit. Record proof required, admission scope, official link, and date checked. Verify opening hours and any event-specific conditions separately. |
| Chicago Botanic Garden is free for students generally | Its official page lists Illinois-resident free days and other qualifying groups; I did not find blanket UIC/college-student eligibility. Free days require tickets for nonmembers and exclude certain ticketed events; parking charges remain. [Garden admission](https://www.chicagobotanic.org/visit/free-admission-opportunities) | Do not seed it as “free with UIC ID.” Use the actual eligibility/date conditions. Being a UIC student does not itself establish Illinois residency. |
| Eventbrite is necessarily expensive for this use | Eventbrite currently permits free event publishing and charges no fees for free tickets. [Official pricing](https://www.eventbrite.com/organizer/pricing/) | Compete on relevance and meeting UIC people, rather than claiming free-event hosting is unavailable elsewhere. |

“For UIC students” can describe your audience. “Exclusive UIC discount,” “official UIC event,” and “UIC-approved” require separate evidence. Do not present a general student/resident benefit as an exclusive partnership.

## 2. What already exists and where yours can differ

| Product | Relevant overlap | Proposed distinction to test |
| --- | --- | --- |
| [Radiate](https://www.radiatetheworld.com/) | Event discovery, seeing who is going, plans, and group chat | UIC community plus everyday Chicago activities, including food, museums, outdoors, and student benefits |
| [Partiful Explore](https://help.partiful.com/en-us/articles/15525568-what-is-the-partiful-explore-page) | Local events, social discovery, and friends' attendance | Map-led discovery and specific UIC meetups around third-party events/places |
| [UIC Loop](https://uicloop.com/) | UIC community, campus feed, events, and messaging among broader tools | Make the dated outing and its group the primary experience; map styling alone is a weak distinction |
| [UIC Connection](https://apps.apple.com/us/app/uic-connection/id6744154766) and [Flames in the City](https://involvement.uic.edu/events-2/flames-in-the-city/) | UIC events, organizations, and Chicago experiences | Student-created small meetups alongside existing official events; also potential partners and listing sources |

These sources establish advertised functionality, not a current adoption ranking. The combination is worth testing, but map + RSVP + chat is not itself a new category.

## 3. The most important product decision: place, event, and meetup are different

- **Place:** Art Institute, Busy Burger, or a music venue. Persistent pin, description, practical information, verified benefits.
- **Event:** A particular exhibition session, concert, or other occurrence with dates, admission rules, organizer, and ticket link.
- **Meetup:** “Visit the Art Institute Sunday at 2 p.m.; meet outside the Michigan Avenue entrance; six spots.” Has a student host, membership, visibility settings, and chat. It may reference a place directly or an external event.

“Four people going to Radius” is ambiguous unless they mean the same event and time. A venue can contain several events; one concert can have multiple small meetup groups. Use unique records and show each group clearly. A museum outing can exist even without a museum-organized event.

An RSVP on your app **does not buy a ticket, reserve museum admission, or guarantee entry**. Keep the official booking link and entry requirements visible. Event organizer and student meetup host are different roles.

## 4. Loopholes and how to address them

### A. “Anonymous” can quietly become identifiable

A random username can still be linked through a profile URL, avatar, shared account ID, notifications, or repeated attendance. A small group can also infer who someone is.

**Recommendation:** Call it **“Join with an event nickname.”** Keep one internal account, with a stable nickname within that meetup and no peer-visible link to their other meetups. Moderators retain restricted account linkage for reports. Do not regenerate nicknames to evade a block or ban. Explain that this hides identity from other attendees, not from the platform, and cannot prevent recognition or screenshots.

Keep attendance and participant details behind login. Define “public name” as visible to the relevant verified community, not automatically to the open web. Never expose email addresses in attendee/chat responses. Changing visibility later cannot retract screenshots or messages already delivered.

### B. Attendance can expose future whereabouts

An attendee list says where someone plans to be. Turning the app into a live people map increases that exposure.

**Recommendation:** Put venues and meetups on the map, not moving people. Do not collect background GPS or publish a user's cross-event attendance history. Use an optional location permission only to find nearby venues; allow manual map browsing. Make visibility explicit before joining. A private saved place should not announce attendance.

### C. Unrestricted anonymous messages invite harassment

Requiring a UIC address does not make unsolicited messages welcome.

**Recommendation:** Start with meetup group chat; allow one-to-one chat only after a message request is accepted. Include report, block, leave, and moderator suspension at launch. Enforce blocks against the underlying account, including after nickname changes. Define what blocking does inside a shared group; it cannot guarantee two people will never attend the same physical event. Restrict invitations and posting rates.

One of the two builders must own report handling and an escalation process. Do not promise round-the-clock moderation unless it actually exists.

### D. Anonymous hosts can organize misleading meetups

Someone could impersonate a venue, advertise a nonexistent party, change a meeting address, or use chat to promote fake tickets.

**Recommendation:** For the pilot, review student-created meetup listings, require hosts to use a consistent community profile, and start at public venues. Anonymous participation can remain available to attendees. Label student-hosted plans separately from official venue events. Notify joined users about cancellation or material time/location changes and request reconfirmation. Link to official ticket sellers; do not introduce peer ticket resale in version one.

Nightlife age restrictions belong on the event card. UIC membership is not proof of being 18 or 21. Decide the app's own age policy before launch rather than treating all students as adults.

### E. “Going” counts can be misleading

People tap casually, plans change, and repeated signups can inflate counts. Four RSVPs might mean nobody actually meets.

**Recommendation:** Separate “Interested” from “Planning to go”; count each account once per meetup, with aliases not creating extra votes. Never seed fake attendees. Give groups a meeting time/place and an explicit “open to new people” signal. Use reminders and easy withdrawal; only call attendance confirmed if you define what that means. Avoid public no-show rankings.

### F. A populated map can still have no social activity

Your local knowledge solves initial place discovery. It does not create people willing to go together.

**Recommendation:** Seed useful places plus a handful of real, dated outings that you or willing friends will host. Concentrate launch activity into a few times and areas, rather than scattering users across hundreds of empty chats. Show useful place information even when no meetup exists and provide “Start a plan.” Never imply friends are attending unless they actually joined.

### G. Old information will damage trust quickly

Benefits expire, an event sells out, the museum is closed that day, or a restaurant deal has exclusions.

**Recommendation:** Store the official source, eligibility, exclusions, checked date, booking requirement, and expiry where applicable. Separate your personal recommendation from a verified factual claim. Expire completed events, handle rescheduled ones, and offer “Report incorrect information.” At launch, curate manually from official sources instead of relying on an unattended scrape. Your Sunday museum story is a use case, not a scheduled event already verified.

### H. Authentication alone does not protect private data

A hidden name can still leak if an API returns it; a removed member may keep receiving chat updates unless authorization is rechecked.

**Recommendation:** Validate permissions for every attendee, chat, profile, and moderator request, including realtime subscriptions. Reject reads/writes after removal or suspension. Verify mailbox ownership using expiring, single-use links/codes; parse the exact permitted email domain server-side. `uic.edu.example.com` must not pass. Never ask for a UIC password on your own login form. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

UIC offers an institutional authentication service, but availability to your student-run app and access to an enrollment attribute are not established. Do not assume adding Microsoft login solves eligibility. [UIC authentication service](https://help.uillinois.edu/TDClient/37/uic/Requests/ServiceOfferingDet?ID=62)

### I. “Like Google Maps” does not require rebuilding Google Maps

Use a map provider and store your own editorial pins/meetups. Compare map loading, geocoding, and search costs before selecting one; Google documents separate billable usage and quotas. Restrict API keys and set usage controls. [Google Maps usage and billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing)

Keep a synchronized list view and date filters: “Today,” “This weekend,” and a selected date. A map without time filters becomes a pile of stale pins. Full navigation, ticket checkout, and AI recommendations can wait.

## 5. Decisions to settle before the build plan

| Decision | Recommended starting position |
| --- | --- |
| Current students only, or anyone with a UIC email? | Preserve the students-only goal, but explicitly resolve how current enrollment is verified. Email-only verification must be labeled accurately. |
| Who sees names and attendance? | Login required; default to meetup-scoped nicknames, with explicit opt-in to display a profile name. No public attendance history. |
| Can anonymous attendees chat? | Yes in their meetup; direct-message requests require acceptance; identity stays linked internally for moderation. |
| Who can create plans? | Verified accounts can submit them; team reviews pilot listings. Consistent host profiles; public venues initially. |
| What does “Going” mean? | Intent to attend the specific meetup; separate from ticket purchase and physical presence. |
| Age policy and nightlife? | Decide supported ages; display venue/event age rules and never infer eligibility from UIC email. |
| How long are attendance and chats kept? | Define a short post-event availability window and deletion schedule; handle reported-abuse evidence separately with limited access. No indefinite default. |
| Who runs content and moderation? | Assign both duties explicitly between the builders; account for that work alongside coding. |

## 6. Suggested first release and evidence of value

**Include:** UIC account verification with truthful eligibility wording, curated map plus list, place/benefit cards, dated meetup creation and review, RSVP visibility choice, meetup chat, accepted DM requests if included, cancellation notifications, reporting/blocking, and a small moderator console.

**Keep outside the first release:** Live tracking, ticket sales/resale, private house-party addresses, background location, AI recommendations, and automatic large-scale event scraping. These are proposed scope choices, not changes already approved by the team.

Watch whether students join a specific plan, speak with other participants, voluntarily report meeting someone, and return for another outing. Map views and signup totals alone do not establish the social value. A brief after-event question can measure outcomes without collecting GPS trails.

For an eventual university pitch, the best initial contact is the **Center for Student Involvement / Flames in the City**, whose published mission already includes exploring Chicago. Demonstrate participation and use of existing benefits, plus how identity and moderation work. This review sent no outreach and created no live listings.
