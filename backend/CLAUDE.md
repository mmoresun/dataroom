# Project instructions

NestJS boilerplate (relational/TypeORM/PostgreSQL persistence only; the Mongoose/document variant and its CLI generators/hygen templates have been removed — this is a deployed app, not a template, so entities are hand-written directly).

## Deployment

Deployed to Heroku (app `dataroom-backend1`), triggered by `.github/workflows/deploy-backend.yml` on push to `main` — but **only** when the diff touches `backend/**` (path filter), so frontend-only changes never redeploy it. Uses `akhileshns/heroku-deploy` with `appdir: backend` (the repo root's `package.json` is the frontend's, so this action's subtree handling is what lets Heroku's Node buildpack see `backend/` as its own app root).

Notes specific to this setup:
- **Heroku CLI isn't preinstalled on `ubuntu-latest` runners anymore** — the workflow installs it explicitly before the deploy action runs. If a deploy ever fails with `heroku: not found`, that step is what to check first.
- **Config vars**: synced from a local `backend/.env` via `deploy/set-heroku-config.sh <app-name>` (uses the `heroku-config` plugin's `config:push`, not per-variable `config:set` — Windows/Git Bash mangles long argument lists containing quoted/space-containing values like `APP_NAME="NestJS API"` when passed as raw CLI args to heroku's `.cmd` shim). `APP_PORT` is deliberately excluded so the app falls back to Heroku's own dynamic `PORT` (see `src/config/app.config.ts`).
- **Migrations run automatically** via the vendored `Procfile`'s `release` phase (`echo '' > .env && npm run migration:run && npm run seed:run:relational`) before each new dyno takes traffic — no manual migration step needed post-deploy. The seed step is idempotent (checks-then-inserts), safe to run on every release.
- **The `.github/workflows/deploy-backend.yml` file itself lives outside `backend/`**, so editing *only* the workflow file does not retrigger it — needs an accompanying change under `backend/**` (or a manual re-run from the Actions tab) to test workflow edits.
