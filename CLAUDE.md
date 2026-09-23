# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React 17 frontend for the Dingocoin NFT platform, built with Create React App (`react-scripts` 4.0.3), react-bootstrap, react-router-dom v6, and Sass. Plain JavaScript/JSX, no TypeScript. Node v16 is expected.

## Commands

```bash
yarn install        # install dependencies
yarn start          # dev server (react-scripts start)
yarn build          # production build into build/
yarn test           # jest via react-scripts (watch mode); no test files exist yet
yarn test -- -t "name" --watchAll=false   # run a single test by name, once
yarn deploy         # builds, then publishes build/ to GitHub Pages via gh-pages
```

### Docker dev environment

```bash
docker compose up -d --build     # dev server at http://localhost:3020/testing-nft-platform/, with hot reload
docker compose logs -f frontend
docker compose down              # add -v to also drop the node_modules volume
```

`scripts/dev-up.sh` checks the whole environment and starts whatever is down, detached, logging to `/tmp/dingonft-dev/` (`--status` only reports). A SessionStart hook in `.claude/settings.local.json` (machine-local, gitignored) runs it on every startup and resume, so its status appears at the top of the session.

`Dockerfile.dev` uses Node 16 (react-scripts 4 breaks on Node 17+). The source is bind-mounted, and `node_modules` lives in a named volume. `yarn install` runs on every container start. The container runs as uid 1001, not root: root's 128 inotify instances are used up by the rest of this box, and the dev server dies with `EMFILE` on `fs.watch` when it runs as root. File watching uses native inotify, not polling. Settings are in `docker-compose.yml`; override them with a `.env` file (see `.env.example`).

- **Sub-path:** the dev app is served under `PUBLIC_URL=/testing-nft-platform`. That value becomes the Router `basename`, prefixes the asset URLs, and every app-internal link goes through `link()` in `utils.js`. Always use `link("/...")` for new internal `href`s and `window.location.assign` calls, never a bare `"/..."`. In production `PUBLIC_URL` is empty, so `link()` is a no-op.
- **Storage and API** in dev are same-origin paths (`<prefix>/storage`, `<prefix>/api`), which `src/setupProxy.js` proxies (dev server only). Both go to the `../dingonft-provider` Docker stack, reached by container name on its external `dingonft-provider_default` network: the API at `dingonft-provider-app-1:80` (host :8090) and MinIO at `dingonft-provider-minio-1:9000` (host :9210). Start that stack first. The provider's buckets are named `dingo-nft-*` (production uses `dingo-nftc-0-*`), which is why `REACT_APP_STORAGE_BUCKET_PREFIX` exists. The provider uses dev secrets, so its data starts empty and only contains what you create through this environment.
- **ccnodes.net edge:** `https://ccnodes.net/testing-nft-platform/` reverse-proxies to :3020. The route lives in `~/ccnodes.net/caddy/ccnodes.net.caddy`, is locked to the operator's IP (`import private`), and is noindex. Reload with `docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile` from `~/web`. Changing `BASE_PATH` means changing that route too.

The README says to run `node app`, but there is no `app` entry file in this repo; use `yarn start`. Linting is only CRA's built-in ESLint (`react-app` config), which runs during `start`/`build`.

## Git remotes

`origin` is the fork at `KMSoftwareHQ/dingonft-frontend`, and it is the only remote to push to. `upstream` is `dingocoin/dingonft-frontend` and is fetch-only; its push URL is deliberately set to an invalid value. Never push to `upstream` or open PRs against it unless the user explicitly asks.

## Architecture

All source files live flat in `src/`. Routing is defined in `src/App.jsx`, which also renders the navbar/search/footer. It has a hardcoded `const maintenance = false` toggle that swaps the whole app for `<Maintenance />`.

**Controllers vs. cards/modals:** Files named `*Controller.jsx` are route-level pages that fetch data. `*Card.jsx` and `*Modal.jsx` are presentational pieces. `ProfileController.jsx` (~1100 lines) is overloaded: it serves `/profile/:profileAddress` (plus `/owned` and `/stats` sub-tabs), `/collection/:collectionHandle`, and `/nft/:nftAddress`. It decides which view to show from whichever `useParams()` value is defined and from `location.pathname` suffixes. Changes to profile, collection, or NFT pages all go there.

**Two data sources:**
- `src/api.js` makes POST calls (via `post` in `utils.js`, axios) to the backend at `API_URL`. It comes from `REACT_APP_API_URL` and falls back to the literal placeholder `"api_url"`. The API handles queries, stats, and all writes/transactions.
- `src/storage.js` makes direct GETs against the `dingo-nftc-0-*` DigitalOcean Spaces buckets, or against path-style `${REACT_APP_STORAGE_BASE}/dingo-nftc-0-*` when that variable is set (which it is in Docker dev), for static JSON: NFT meta, NFT state, profiles, collections, and preview PNGs. Each returns `null` on a non-200 response, so callers must null-check (see recent commit "null check getMeta()").

**Wallet integration:** The app expects a browser-injected wallet at `window.dingo`. If it is `undefined`, the app shows `GetWalletModal`. It uses two methods:
- `window.dingo.requestSign(hexSha256(JSON.stringify(payload)))` for authenticated off-chain edits (profile update, collection create/update/setItem, content access). The pattern: build a payload with `timestamp`, sign the SHA-256 hex of its JSON, attach the result as `payload.signature`, then POST it.
- `window.dingo.requestSignTransaction(...)` for on-chain actions (list, buy, reprice). The pattern: call `get*Transaction` on the API, have the wallet sign it, then call `send*Transaction`.

**Amounts:** Prices are handled as satoshi strings using `BigInt` (`toSatoshi`, `satoshiToLocaleString` in `utils.js`). Don't use JS floats for coin amounts.

**Open Graph:** `public/index.html` contains `%%_OG_TITLE_%%`-style placeholders. These get filled by a separate proxy service, [dingonft-link](https://github.com/rkbling/dingonft-link), which runs in front of this app, so they appear verbatim in local dev.
