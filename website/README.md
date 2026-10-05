# Website workspace

**Status:** Folder structure only. No runnable application yet.  
**Shared planning:** [Project plan](../PROJECT_PLAN.md)

## File ownership

| Folder | Editor | Responsibility |
| --- | --- | --- |
| [frontend/](frontend/README.md) | Bhagesh | UI, map rendering, client integration, frontend dependencies/tests |
| [backend/](backend/README.md) | Hassan | Authentication, API, storage, chat, permissions, backend dependencies/tests |
| [data/](data/README.md) | Hassan | Curated places, events, benefits, seeds/imports |
| [contracts/](contracts/README.md) | Hassan | Agreed interface and synthetic API fixtures |
| [deployment/](deployment/README.md) | Hassan | Hosting/configuration, environments, release runbook |

## How the two halves connect

1. Bhagesh sketches the screens while Hassan drafts the interface.
2. Agree on the first contract and commit sample responses.
3. Bhagesh uses those responses in the UI; Hassan implements matching behavior.
4. Hassan records the map-provider decision. Bhagesh integrates its browser SDK.
5. Connect a complete journey on preview, then test it together.

**Frontend map rendering belongs to Bhagesh.** Map/provider selection, billing configuration, event records, and any backend map calls belong to Hassan. This avoids both people editing the same map component.

## Setup status

- Frontend framework and commands: **not selected** — record in `frontend/README.md`.
- Backend/database and commands: **not selected** — record in `backend/README.md`.
- API contract: **not drafted** — B01.
- Provider: **not selected** — B02.
- Hosting and environments: **not configured** — B03/B08.

Each app keeps its own manifest and lockfile. Put server secrets only in the backend/hosting environment. Browser configuration must contain only values intended to be public.

## Added Instructions (Claude/ Codex Always Read this)
- For any tasks given, download relevant skills and store them in skills but reputable repos, not generic non popular repos.