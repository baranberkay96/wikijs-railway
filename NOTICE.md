# Notice

This repository is a Railway template package for Wiki.js. It contains configuration and a small pre-deploy script written for this template (MIT-licensed); it does not contain Wiki.js source code.

| Component | License | Used as |
|---|---|---|
| Wiki.js 2.5.315 | AGPL-3.0 | Official image `requarks/wiki:2.5.315@sha256:af71a17d…`, extended with our config file and pre-deploy script |
| PostgreSQL 18 | PostgreSQL License | `ghcr.io/railwayapp-templates/postgres-ssl:18.6` (Railway) |

## Our own code

- `services/wikijs/railway/config.yml`: Wiki.js configuration reading the database settings and port from variables (same keys as upstream's `dev/build/config.yml`).
- `services/wikijs/railway/predeploy.js`: waits for Postgres and, on a fresh database, completes Wiki.js' own setup wizard (`POST /finalize`) on a private port, then removes the Guests group's read rights unless `WIKI_GUEST_ACCESS=true`.

## Upstream files checked (tag v2.5.315)

- `dev/build/Dockerfile`, `dev/build/config.yml`, `server/setup.js`, `server/core/kernel.js`, `server/core/config.js`, `server/core/db.js`, `server/helpers/config.js`, `server/controllers/common.js`, `package.json`

Wiki.js is a trademark of Requarks.io. This community template is not affiliated with or endorsed by Requarks.io.
