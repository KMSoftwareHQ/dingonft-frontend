# CLAUDE.md

## Repository layout

This is the Dingocoin NFT monorepo. Keep the three runtime components as
independently deployable containers:

- `apps/frontend` — React 19/Vite 8 frontend
- `services/link` — Express edge and Open Graph renderer
- `services/provider` — Express API and Dingocoin chain indexer
- `e2e` — deterministic API fixture and Playwright browser tests

Read a component's own `CLAUDE.md` before changing it. Root orchestration is in
`compose.yaml`; deterministic browser testing is in `compose.e2e.yaml`.

## Commands

```sh
docker compose up -d --build
npm run lint
npm test
npm run build
npm run test:e2e
scripts/dev-up.sh --status   # one-screen state of the root Compose stack
```

The full stack uses a real `dingocoind` and persistent state. E2E uses seeded
MinIO data and a fixture API so it is fast and reproducible.

`scripts/dev-up.sh` without `--status` starts the full stack detached if any
service is down; the machine-local SessionStart hook only runs `--status`.

CI is `.github/workflows/ci.yml`: a `unit` job (frontend lint/test/build,
link install, provider tests) and an `e2e` job (`npm run test:e2e`). It runs on
pull requests and pushes to `master`. Keep it in sync with the root commands.

## Git and releases

Push feature branches only to the `KMSoftwareHQ` fork and open pull requests
against `dingocoin/dingonft`. Never push directly to the Dingocoin repository or
to a protected branch. Changes spanning an API contract must update the
provider, frontend, and E2E coverage in the same PR.

Production is `https://nft.dingocoin.com`. Do not introduce Dingocoin `.org`
URLs; standards-body domains such as `sitemaps.org` are unrelated and valid.
