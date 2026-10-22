# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React 19 frontend for the Dingocoin NFT platform, built with Vite 8, react-bootstrap, react-router-dom, and Sass. Plain JavaScript/JSX, no TypeScript. Node 24 LTS and npm 12 are expected.

## Commands

```bash
npm ci              # install locked dependencies
npm run dev         # Vite dev server
npm run build       # production build into dist/
npm run lint        # ESLint
npm test            # Vitest, once
npm run test:watch  # Vitest watch mode
```

### Docker dev environment

```bash
docker compose up -d --build     # from repo root; full stack at http://localhost:3020/testing-nft-platform/
docker compose logs -f frontend
docker compose down              # add -v to also drop the node_modules volume
```

The root `scripts/dev-up.sh` reports the state of every root Compose service and, if anything is down, starts the stack detached with logs in `/tmp/dingonft-dev/` (`--status` only reports). A SessionStart hook in the root `.claude/settings.local.json` (machine-local, gitignored) runs it with `--status` on every startup and resume, so the status appears at the top of the session without kicking off a build or chain sync.

`Dockerfile.dev` uses Node 24 LTS. The source is bind-mounted, and `node_modules` lives in a named volume. `npm ci` runs on every container start. Settings are in the root `compose.yaml`; override them with the root `.env` file.

- **Sub-path:** the dev app is served under `BASE_PATH=/testing-nft-platform`. Vite uses it as its base URL; it becomes the Router `basename`, prefixes assets, and every app-internal link goes through `link()` in `utils.js`. Always use `link("/...")` for new internal `href`s and `window.location.assign` calls, never a bare `"/..."`. Production builds default to `/`, so `link()` is a no-op there.
- **Storage and API** in dev are same-origin paths (`<prefix>/storage`, `<prefix>/api`), which `vite.config.js` proxies in both dev and preview. Root Compose targets the `provider` and `minio` containers. Every environment uses the production bucket names `dingo-nftc-0-*`; root Compose derives `VITE_STORAGE_BUCKET_PREFIX` from `STORAGE_BUCKET_PREFIX`.
- **Machine-local edge:** a reverse proxy in front of the dev stack is machine-specific; it's configured in untracked `compose.override.yaml`/`.env`, and notes about it go in `CLAUDE.local.md`.

Linting and tests are explicit commands; Vite does not run them as part of `dev` or `build`.

## Git remotes

`origin` is the `KMSoftwareHQ` fork and is the only remote to push to. `upstream` is the Dingocoin repository and is fetch-only. Open PRs from fork feature branches; never push directly to upstream or a protected branch.

## Architecture

All source files live flat in `src/`. Routing is defined in `src/App.jsx`, which also renders the navbar/search/footer. It has a hardcoded `const maintenance = false` toggle that swaps the whole app for `<Maintenance />`.

**Controllers vs. cards/modals:** Files named `*Controller.jsx` are route-level pages that fetch data. `*Card.jsx` and `*Modal.jsx` are presentational pieces. `ProfileController.jsx` (~1100 lines) is overloaded: it serves `/profile/:profileAddress` (plus `/owned` and `/stats` sub-tabs), `/collection/:collectionHandle`, and `/nft/:nftAddress`. It decides which view to show from whichever `useParams()` value is defined and from `location.pathname` suffixes. Changes to profile, collection, or NFT pages all go there.

**Two data sources:**
- `src/api.js` makes POST calls (via `post` in `utils.js`, axios) to the backend at `API_URL`. It comes from `VITE_API_URL` and falls back to the literal placeholder `"api_url"`. The API handles queries, stats, and all writes/transactions.
- `src/storage.js` makes direct GETs against the `dingo-nftc-0-*` DigitalOcean Spaces buckets, or against path-style `${VITE_STORAGE_BASE}/dingo-nftc-0-*` when that variable is set (which it is in Docker dev), for static JSON: NFT meta, NFT state, profiles, collections, and preview PNGs. Each returns `null` on a non-200 response, so callers must null-check.

**Wallet integration:** The app expects a browser-injected wallet at `window.dingo`. If it is `undefined`, the app shows `GetWalletModal`. It uses two methods:
- `window.dingo.requestSign(hexSha256(JSON.stringify(payload)))` for authenticated off-chain edits (profile update, collection create/update/setItem, content access). The pattern: build a payload with `timestamp`, sign the SHA-256 hex of its JSON, attach the result as `payload.signature`, then POST it.
- `window.dingo.requestSignTransaction(...)` for on-chain actions (list, buy, reprice). The pattern: call `get*Transaction` on the API, have the wallet sign it, then call `send*Transaction`.

**Amounts:** Prices are handled as satoshi strings using `BigInt` (`toSatoshi`, `satoshiToLocaleString` in `utils.js`). Don't use JS floats for coin amounts.

**Open Graph:** root `index.html` contains `%%_OG_TITLE_%%`-style placeholders. `services/link` fills them and runs in front of this app.
