# SimsLens server

REST API and background jobs of SimsLens: Express 5, Prisma 7 on PostgreSQL, Redis and
BullMQ queues, Joi validation.

This workspace is not set up on its own. Install, configure and start it from the
repository root by following the [Quickstart](../README.md#quickstart) of the main
README (a detailed guide in French is in
[`docs/development.fr.md`](../docs/development.fr.md)).

## Configuration

`server/.env` is **generated** from the root `.env.local` by `npm run env:local`
([`scripts/env-manager.js`](../scripts/env-manager.js)): never edit it by hand. Every
variable, including the optional Battle.net, Clerk and Discord settings, is described in
[`.env.example`](../.env.example).

## Commands

Run from `server/`:

| Command                  | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `npm run dev`            | API with reload (`tsx watch`), on http://localhost:5000  |
| `npm test`               | Vitest test suite                                        |
| `npx tsc --noEmit`       | Type check                                               |
| `npm run build`          | Compile to `dist/` (used by the production image)        |
| `npm run init-data`      | Seed the reference data (classes, specs, realms, items…) |
| `npm run init-fake-data` | Seed a complete test guild                               |

From the root, `npm run dev` starts the server together with the other workspaces.

## Layout

| Path                          | Content                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `src/api/<module>/`           | One folder per API module (routes, validation, use cases) |
| `src/middleware/`             | Authentication, permissions and request context           |
| `src/integrations/`           | Battle.net, Discord and Raider.IO clients                 |
| `src/queues/`, `src/workers/` | BullMQ queues and workers                                 |
| `src/scheduler/`              | Scheduled jobs (reminders, event series)                  |
| `src/scripts/`                | Seeding and data maintenance scripts                      |
| `prisma/`                     | Database schema and migrations                            |

## Documentation

- [`docs/api/architecture.md`](../docs/api/architecture.md): module organization and the
  ongoing migration to the target pattern.
- [`docs/api/routes.md`](../docs/api/routes.md): adding an API module (`usecases/` and
  TypeScript, with `character` as the reference).
- [`docs/api/validation-errors.md`](../docs/api/validation-errors.md): validation, errors
  and HTTP status codes.
- [`docs/api/reference.md`](../docs/api/reference.md): generated list of every route.
- [`docs/database/index.md`](../docs/database/index.md): Prisma, migrations and seeding.

These documents are written in French.
