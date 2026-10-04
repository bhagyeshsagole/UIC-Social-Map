# UIC Social Map

> [!abstract] The project
> Discover places and events around Chicago, find other UIC students planning to go, and connect before attending.

**Team:** Bhagesh — frontend · Hassan — backend, data, deployment  
**Stage:** Planning and workspace setup. Application development has not started.

## Start here

- [Living project plan](PROJECT_PLAN.md) — requirements, shared decisions, milestones.
- [Workflow A · Bhagesh](WORKFLOW_A_BHAGESH.md) — UI work, progress, messages to Hassan.
- [Workflow B · Hassan](WORKFLOW_B_HASSAN.md) — backend work, progress, messages to Bhagesh.
- [Concept review](EVENT_MAP_REVIEW.md) — research, sources, loopholes, proposed safeguards.
- [Website workspace](website/README.md) — code boundaries and integration.
- [Deployment notes](website/deployment/README.md) — hosting, environments, release checklist.

## Folder layout

```text
UIC-Social-Map/                 ← shared project / future Git repository root
├── README.md
├── AGENTS.md                   ← instructions for future assistant sessions
├── PROJECT_PLAN.md
├── EVENT_MAP_REVIEW.md
├── WORKFLOW_A_BHAGESH.md
├── WORKFLOW_B_HASSAN.md
└── website/                    ← application and deployment workspace
    ├── frontend/               ← Bhagesh
    ├── backend/                ← Hassan
    ├── data/                   ← Hassan
    ├── contracts/              ← Hassan; both agree on the interface
    └── deployment/             ← Hassan
```

Open this parent folder as an Obsidian vault if desired. Keep planning and partner messages here; keep implementation inside `website/`.

## Working independently

1. Update your own workflow file when starting, finishing, or handing off a task.
2. Work inside your assigned folders. Put requests for your partner in **your own** handoff log; they record their response in theirs.
3. Hassan maintains the shared API contract. Agree on changes before either side depends on them. Bhagesh can build against sample responses immediately after that interface is agreed.
4. Keep frontend and backend dependencies and lockfiles in their respective folders. Avoid shared root package files initially.
5. Sync before integration. Separate paths reduce Git conflicts; they do not remove the need to test the two sides together.

**Coordination default:** Hassan maintains shared project/configuration files. This is a suggested single-editor responsibility, separate from the agreed A/B split; change it here if the team prefers Bhagesh. Assistants update affected trackers when asked to work, and shared decisions when requirements change.

When Git is initialized, track this parent folder so both people receive the notes and code. Suggested work branches: `bhagesh/frontend` and `hassan/backend`. No Git repository, remote, hosting account, or deployment has been created by this setup.

> [!important] Keep deployment scoped
> Configure hosting to build the application under `website/`, using the actual frontend/backend build roots. Do not publish the parent notes or partner messages as website assets.
