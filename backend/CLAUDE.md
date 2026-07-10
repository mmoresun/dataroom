# Project instructions

NestJS boilerplate supporting both relational (TypeORM/PostgreSQL) and document (Mongoose/MongoDB) persistence.

## When adding entities, schemas, or properties

Use the `generate` skill (auto-loaded from [.claude/skills/generate/SKILL.md](.claude/skills/generate/SKILL.md)). It documents the project's CLI generators (`npm run generate:resource:*`, `npm run add:property:to-*`) which keep both database variants, DTOs, modules, and migrations in sync. Do not hand-write entity files.

## Deployment

Deployed to Heroku (app `dataroom-backend1`), triggered by `.github/workflows/deploy-backend.yml` on push to `main` — but **only** when the diff touches `backend/**` (path filter), so frontend-only changes never redeploy it. Uses `akhileshns/heroku-deploy` with `appdir: backend` (the repo root's `package.json` is the frontend's, so this action's subtree handling is what lets Heroku's Node buildpack see `backend/` as its own app root).

Notes specific to this setup:
- **Heroku CLI isn't preinstalled on `ubuntu-latest` runners anymore** — the workflow installs it explicitly before the deploy action runs. If a deploy ever fails with `heroku: not found`, that step is what to check first.
- **Config vars**: synced from a local `backend/.env` via `deploy/set-heroku-config.sh <app-name>` (uses the `heroku-config` plugin's `config:push`, not per-variable `config:set` — Windows/Git Bash mangles long argument lists containing quoted/space-containing values like `APP_NAME="NestJS API"` when passed as raw CLI args to heroku's `.cmd` shim). `APP_PORT` is deliberately excluded so the app falls back to Heroku's own dynamic `PORT` (see `src/config/app.config.ts`).
- **Migrations run automatically** via the vendored `Procfile`'s `release` phase (`echo '' > .env && npm run migration:run && npm run seed:run:relational`) before each new dyno takes traffic — no manual migration step needed post-deploy. The seed step is idempotent (checks-then-inserts), safe to run on every release.
- **The `.github/workflows/deploy-backend.yml` file itself lives outside `backend/`**, so editing *only* the workflow file does not retrigger it — needs an accompanying change under `backend/**` (or a manual re-run from the Actions tab) to test workflow edits.
