# Dingocoin NFT platform

This monorepo contains the three deployable parts of the Dingocoin NFT
platform:

- `apps/frontend` — React/Vite browser application
- `apps/frontend-v2` — redesigned frontend, served under `/v2/` (see its README)
- `services/link` — public edge server and Open Graph renderer
- `services/provider` — API and blockchain indexer

Production is <https://nft.dingocoin.com>. The components remain separate
containers so they can be built, deployed, restarted, and scaled independently.

## Full development stack

The full stack runs the real provider with Postgres, MinIO, and `dingocoind`:

```sh
docker compose up -d --build
```

Open <http://localhost:3020/testing-nft-platform/>; the v2 frontend runs on
fake data at <http://localhost:3022/testing-nft-platform/v2/>. Both bind
loopback only. Machine-specific setup, such as a reverse proxy in front of the
dev servers, goes in an untracked `compose.override.yaml` and `.env`.
`scripts/dev-up.sh --status`
prints the state of every service; without `--status` it also starts the stack
in the background if anything is down. The first node sync can take
a long time; its chain data is kept in a named volume. API, object-storage, and
database ports bind to loopback only.

Copy `.env.example` to `.env` to override ports or the test sub-path. The
checked-in defaults are development-only; production remains
`https://nft.dingocoin.com` and is not started by this Compose file.

## Deterministic E2E stack

The browser suite uses the real frontend and link containers with seeded object
storage and a deterministic API fixture. It does not wait for blockchain sync:

```sh
npm run test:e2e
```

The command builds the E2E topology, runs Playwright in Chromium, and tears the
stack down. Set `E2E_KEEP_STACK=1` to leave it running for inspection at
<http://localhost:3020/testing-nft-platform/>. Set `E2E_PORT` (for example
`E2E_PORT=3021`) to run it while the development stack holds port 3020.

## Frontend checks

Node 24 LTS and npm 12 are expected when running checks without Docker:

```sh
npm --prefix apps/frontend ci
npm run lint
npm test
npm run build
```

The provider and edge use the same Node/npm baseline:

```sh
npm --prefix services/provider ci
npm --prefix services/provider test
npm --prefix services/link ci
```

## Production

`compose.prod.yaml` runs the production topology behind Cloudflare (SSL mode
Flexible): link is the only published service (port 80), serves the static
frontend with Open Graph metadata, and proxies `/api` to the provider. Object
storage is DigitalOcean Spaces (`dingo-nftc-0-*`).

```sh
cp .env.prod.example .env.prod   # fill in, chmod 600
docker compose -f compose.prod.yaml --env-file .env.prod up -d --build
```

The provider refuses to start without the original production
`ADDRESSING_SECRET` and `PLATFORM_PRIVATE_KEY`. `database/schema.sql` is
idempotent and never drops tables.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to
`master`:

- `unit` — frontend lint, Vitest, and production build; link dependency
  install; provider unit and compatibility tests.
- `e2e` — validates `compose.e2e.yaml` and runs the Playwright suite.

Both jobs run the same commands as the local checks above, so a green local run
should match CI.

## Repository migration

The imported component histories are preserved under their new paths. The
GitHub repository is `dingocoin/dingonft`, renamed from `dingonft-frontend`;
GitHub redirects old clone and PR URLs, but deployment and automation should
use the new name. Archive the old `dingonft-provider` and `dingonft-link` repositories only
after production has been cut over and rollback is no longer needed.

Component-specific architecture notes live beside each component. Never commit
production secrets; all checked-in credentials and chain keys are development
fixtures only.
