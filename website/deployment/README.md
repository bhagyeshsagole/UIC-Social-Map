# Deployment and cloud setup · Hassan

> [!info] Current state
> No provider, cloud account, domain, environments, or deployment is configured. No paid services have been started.

## Decisions to record

| Item | Current decision |
| --- | --- |
| Map provider / quota / cost cap | Pending B02 |
| Frontend hosting / build root / build command | Pending frontend stack and B03 |
| Backend hosting / start command | Pending B03 |
| Database / migration procedure | Pending B03 |
| Email verification service | Pending membership decision and B05 |
| Preview and production URLs | Not created |
| Budget, account owner, recovery access | Team decision pending |

## Setup checklist · B08

- [ ] Document exact local setup commands in each app's README.
- [ ] Configure frontend/backend build roots beneath `website/`; exclude parent planning files from published assets.
- [ ] List required configuration names in secret-free example files after choosing the stack.
- [ ] Put credentials in hosting secret storage; restrict browser map keys by allowed origins and APIs.
- [ ] Set preview/production auth callbacks and permitted API origins.
- [ ] Separate test data from production data; document migrations and backup/restore procedure.
- [ ] Configure useful logs without storing message content or credentials unnecessarily.
- [ ] Set usage alerts/quotas and record expected recurring costs.
- [ ] Deploy preview and record its URL, commit, build commands, and verification results.
- [ ] Document release and rollback commands before the pilot.

## Release record

No deployments yet. For each release, add: date, environment, commit, deployer, outcome, and rollback reference. Public launch scope and timing remain a team decision.
