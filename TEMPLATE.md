# Wiki.js 2.5 Wiki with Admin Preconfigured (Postgres): composer spec

## Listing

| Field | Value |
|---|---|
| Name | **Wiki.js 2.5 Wiki with Admin Preconfigured (Postgres)** |
| Description | Markdown and visual wiki on Postgres; admin ready, setup wizard closed. (71 chars) |
| Category | Other |
| Icon | `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/wikijs.svg` |
| Repo | `baranberkay96/wikijs-railway`, root `/services/wikijs` |

## Base market templates (checked 2026-11-24)

| Code | Active | Notes |
|---|---|---|
| `1ASvMI` | 115 | `requarks/wiki:2` floating tag, Postgres; setup wizard open to the first visitor; no healthcheck |
| `wikijs` | 21 | `requarks/wiki:latest` (now Wiki.js 3, a different major), Postgres 17 |
| `mS67ic` | 17 | `requarks/wiki:2.5`, Postgres 16, open wizard |

## Services

| Service | Source | Port | Healthcheck | Volume |
|---|---|---|---|---|
| Wiki.js | repo `/services/wikijs` (`FROM requarks/wiki:2.5.315@sha256:af71a17d…`, `CONFIG_FILE=/wiki/railway/config.yml`), pre-deploy `node /wiki/railway/predeploy.js` (1200 s) | 3000 public | `/healthz` (600 s) | — (content in Postgres) |
| Postgres | `postgres-ssl:18.6` | 5432 private | — | `/var/lib/postgresql/data` |

## Design

1. **Setup wizard finished before serving (8.37).** On a database without settings, the pre-deploy step starts Wiki.js on port 3999 inside the pre-deploy container, posts Wiki.js' own `/finalize` (admin e-mail/password from variables, site URL, telemetry off) and stops it. Later deploys see the settings and skip it.
2. **Private by default.** Unless `WIKI_GUEST_ACCESS=true`, the Guests group (id 2, system) loses its default read permissions and page rules on the first deploy, so visitors get the login page.
3. **Password handling (8.29).** A password under 12 characters is never applied: first deploy locks the admin with a random password; `WIKI_ADMIN_RESET=true` re-applies `WIKI_ADMIN_PASSWORD` (bcrypt, Wiki.js' own `bcryptjs-then`) on the next deploy.
4. **Stateless app.** Wiki.js 2 keeps pages and uploads in Postgres; `./data` is cache only, so no volume.
5. **Version choice.** Wiki.js 3 went stable on 2026-11-01 and has released 3.0–3.6 in three weeks; this template pins the long-standing 2.5 line (2.5.315, 2026-09-21).

## Improvements over market templates

- No open setup wizard, pinned digest, healthcheck, private-by-default wiki, password reset variable, telemetry off.

## Resources

Measured on Railway (2026-11-24, idle after setup, a page and searches):

| Service | Idle RAM | Peak seen | CPU idle |
|---|---|---|---|
| Wiki.js | 0.19 GB | 0.20 GB | < 0.01 vCPU |
| Postgres | 0.06 GB | 0.08 GB | < 0.01 |

Total ≈ 0.25 GB → ≈ $2.5/month idle RAM. Fits Trial (1 GB/service) and Free (0.5 GB).

## Verification checklist

- [x] Pre-deploy log `setup finished; admin admin@example.com`, `guests have no access`; both services SUCCESS; `/healthz` 200.
- [x] Guest `/` → `/login`; guest GraphQL `pages.list` Forbidden; guest page view 403.
- [x] Admin login (GraphQL, local strategy); page create; search by title (basic DB engine searches title/description); wrong password refused.
- [x] `WIKI_ADMIN_RESET=true` re-applied the password; with `WIKI_ADMIN_PASSWORD=abc` the reset is skipped with a warning and the deploy stays SUCCESS.

## Open questions

- Wiki.js 3 migration path for users who want the new major.
