# CLAUDE.md

## Repository layout

This is the Dingocoin NFT monorepo. Keep the three runtime components as
independently deployable containers:

- `apps/frontend` — React 19/Vite 8 frontend
- `apps/frontend-v2` — redesigned frontend under `/v2/`, full parity with `apps/frontend`; dev runs on fake data from `apps/frontend-v2/mock` at http://localhost:3022/testing-nft-platform/v2/ (see `apps/frontend-v2/README.md`)
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

**This repository is PUBLIC.** Everything pushed or posted to GitHub (code,
commit messages, PR descriptions, comments, reviews) is world-readable,
emailed to watchers, and kept in edit history even after you change it.

- Never publish infrastructure details: server or origin IP addresses,
  hostnames of non-public machines, SSH users, ports, paths on servers,
  firewall or allowlist contents, or anything from an `.env` file. The
  production origin is behind Cloudflare and its IP must stay secret. Refer to
  machines generically ("the production host").
- Before every push, `gh pr create`, `gh pr edit`, or comment, grep the
  outgoing text and diff for IPv4/IPv6 addresses, hostnames, and key-like
  strings, and remove them. If in doubt, leave it out and tell the user
  privately instead.
- PR descriptions describe code changes and how they were tested, not
  deployment state, server inventory, or operational details.
- Machine-specific setup (reverse proxies, fixed container addresses, host
  names) goes in untracked `compose.override.yaml`, `.env`, and
  `CLAUDE.local.md`, never in tracked files.

Push feature branches only to the `KMSoftwareHQ` fork and open pull requests
against `dingocoin/dingonft`. Never push directly to the Dingocoin repository or
to a protected branch. Changes spanning an API contract must update the
provider, frontend, and E2E coverage in the same PR.

Production is `https://nft.dingocoin.com`. Do not introduce Dingocoin `.org`
URLs; standards-body domains such as `sitemaps.org` are unrelated and valid.
