# Contributing to SimsLens

Thanks for your interest in SimsLens. Contributions are welcome in **English or French**:
issues, pull requests and comments can be written in either language.

By taking part in this project you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues are **never** reported in public
issues: see [`SECURITY.md`](SECURITY.md).

## Getting started

Follow the [Quickstart](README.md#quickstart) of the README: it runs the API and the front
end locally with Docker (PostgreSQL and Redis), without any account or API key. A more
detailed guide, in French, is in [`docs/development.fr.md`](docs/development.fr.md).

### Known limitations of the setup without credentials

These two issues are known and not fixed yet:

- **The server does not start when `BNET_ID` is empty**: it fails with
  `OAuth2Strategy requires a clientID option`. Keep the placeholder values of `BNET_ID`
  and `BNET_SECRET` from [`.env.example`](.env.example) if you have no Battle.net client.
- **The development login does not accept the fake users.** `/auth/dev-login` only
  accepts numeric Battle.net IDs, while `npm run server:init-fake-data` creates users such
  as `user_fake_owner_1`, which it rejects with `400`. You need a user stored under a
  numeric ID, for example after one real Battle.net login with your own client.

## Finding something to work on

- Issues labelled [`good first issue`](https://github.com/GuillaumeBarreau/simslens_app/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
  are small and well scoped: a good place to start.
- For anything larger, open an issue (or comment on an existing one) before writing code,
  so that we can agree on the approach.
- [`docs/TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md) lists known problems. Items marked
  "⏸ Reporté" (postponed) are deliberate decisions: please do not send fixes for them.

## Proposing a change

1. Fork the repository and create a branch with any name.
2. Make your change, with tests (see below).
3. Run the full check locally: `npm run verify`. It runs Prettier, ESLint, type checks,
   the tests of every workspace and the build, exactly as CI does. It is a plain Node
   script: it needs nothing but `npm ci`, no AI agent or extra setup.
4. Open a pull request against `master`, describe the change and link the related issue
   (`Closes #123`) if there is one.

The maintainers use internal conventions (branch `feat/SIMS-NNN`, title
`SIMS-NNN : [Type] Title`, labels). **You do not need to follow them**: on a pull request
coming from a fork, the "Conventions" check only reports warnings, and a maintainer
applies the conventions (title, labels, linked issue) when merging.

## Quality rules

- **Lint and Prettier**: `npm run lint` and `npm run format` currently fail on legacy
  code. The rule is: every file you touch must pass ESLint and Prettier, and the total
  number of problems must not increase. `npm run verify` checks this for you.
- **Tests**: every change in logic comes with tests (Vitest). Never delete, skip or weaken
  an existing test to make a check pass.
- **Type checks**: `cd app && npm run typecheck` and `cd server && npx tsc --noEmit`.
- **Generated docs**: do not edit `docs/api/reference.md` or `docs/database/schema.md`;
  run `npm run docs` instead.
- **Environment files**: the `.env` files of the workspaces are generated from
  `.env.local` by `npm run env:local`. Never edit or commit them.

## Front-end conventions

- **Translations**: every text shown to users goes through i18next, with keys in **both**
  `app/src/locales/fr` and `app/src/locales/en`.
- **Unfinished features**: a visible feature that is not ready yet is hidden behind
  `FEATURES_IN_DEVELOPMENT` and `<FeatureGuard>` (`app/src/config/featureFlags.ts`).
- **Data loading**: component, then a hook in `hooks/queries`, then a service, then
  `apiClient`. No `useEffect` to load data. See
  [`docs/frontend/data-fetching.md`](docs/frontend/data-fetching.md).

## Product decisions to know

- **Loot voting happens in the game**, in the RCLootCouncil addon, not in SimsLens. The
  desktop companion reads the addon data and imports it. Please do not propose a voting
  screen in the web app; build on the imported data instead.
- **New API modules** follow the target pattern (`usecases/` and TypeScript, with
  `character` as the reference): see [`docs/api/routes.md`](docs/api/routes.md). Do not
  extend a legacy `.service.js` file with a new feature.

## Internal tooling you can ignore

The `agents:*` npm scripts and `CLAUDE.md` belong to an internal system of AI
agents used by the maintainer. You do not need them to contribute. `scripts/agents/`
also holds the plain Node scripts behind `npm run verify` and the CI checks; you only run
them through `npm run verify`.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE) of the project.
