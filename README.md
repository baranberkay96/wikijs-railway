# Deploy and Host Wiki.js with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/wikijs-25-wiki-with-admin-preconfigured-?referralCode=20H68q)

Wiki.js is a modern open-source wiki with Markdown, visual and HTML editors, page history, fine-grained permissions, built-in search and many login providers. This template runs Wiki.js 2.5 on PostgreSQL 18 with the administrator created for you and the setup wizard already completed, so nobody else can claim your wiki.

## About Hosting Wiki.js

Wiki.js 2 starts with a setup wizard on a fresh database, and whoever completes it first becomes the administrator. On a public URL that is a race. This template finishes the wizard in a pre-deploy step on a private port, using the e-mail and generated password from your variables, before the public site serves.

Pages, uploads, users and settings are stored in PostgreSQL, so the Wiki.js service itself is stateless and redeploys without data loss. By default the new wiki is private: guests must sign in. Upstream's default (public read access) is one variable away.

## Common Use Cases

- Internal company wiki and knowledge base with group permissions
- Product and API documentation written in Markdown
- Team handbooks, runbooks and onboarding guides
- Public documentation site with a private editing workflow
- Personal or club wiki with page history and search

## Dependencies for Wiki.js Hosting

- Wiki.js 2.5.315 (official image, pinned by digest)
- PostgreSQL 18 (Railway's `postgres-ssl` image)

### Deployment Dependencies

- Wiki.js source: https://github.com/requarks/wiki
- Documentation: https://docs.requarks.io
- Docker installation guide: https://docs.requarks.io/install/docker

### Implementation Details

| Service | What it does | Public |
|---|---|---|
| Wiki.js | Wiki web app; pre-deploy completes the setup wizard on the first deploy | yes |
| Postgres | Pages, uploads, users and settings | no |

**First login**

1. Before deploying, set `WIKI_ADMIN_EMAIL` to your address (default `admin@example.com`).
2. Open the Wiki.js URL and sign in with `WIKI_ADMIN_EMAIL` and the generated `WIKI_ADMIN_PASSWORD` from the service's Variables tab.
3. Create your home page. Add users under Administration > Users, or enable self-registration and other login providers under Administration > Authentication.

**Guest access.** With `WIKI_GUEST_ACCESS=false` (default) the Guests group has no rights, so visitors see the login page. Set it to `true` before the first deploy for upstream's public read access, or change the Guests group later under Administration > Groups. The variable is only applied on the first deploy.

**Admin password.** The variables are used on the first deploy; afterwards change the password in your profile. To reset a forgotten password, set a new `WIKI_ADMIN_PASSWORD` (12+ characters), set `WIKI_ADMIN_RESET=true`, redeploy, then set it back to `false`. A password under 12 characters is never applied: on the first deploy the admin is locked with a random password until you reset it this way (the pre-deploy log explains).

**Search and e-mail.** The built-in database search works out of the box; switch to "Database - PostgreSQL" under Administration > Search Engine for better results. E-mail (password resets, invitations) is set under Administration > Mail; Railway allows SMTP only on Pro.

**Custom domain.** Add it to the Wiki.js service, then set the Site URL under Administration > General.

**Versions.** The image is pinned by digest in `services/wikijs/Dockerfile`. To upgrade within 2.5, change the tag and digest, back up Postgres and redeploy. Wiki.js 3 is a different major version with its own migration path; this template stays on the mature 2.5 line.

**Resources.** About 0.2–0.3 GB RAM idle in total (Wiki.js ~0.2 GB, Postgres ~0.05 GB), roughly $3 per month. Runs on the Trial plan.

**License.** Wiki.js is AGPL-3.0. This is a community template, not affiliated with Requarks.

### Why Deploy Wiki.js on Railway?

Railway runs Wiki.js and PostgreSQL in one project with private networking, HTTPS and automatic deploys. The admin account and a private-by-default wiki are ready on the first deploy, and you can add a custom domain or scale resources from the dashboard.
