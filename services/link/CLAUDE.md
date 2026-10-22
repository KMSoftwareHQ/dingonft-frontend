# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small Express server (plain CommonJS, Node 24) that sits in front of the Dingocoin NFT frontend. It serves the frontend's `index.html` with Open Graph metadata filled in per route, then proxies remaining traffic to the independently running frontend container.

## Git remotes

Git operations are managed at the monorepo root. Push feature branches only to the `KMSoftwareHQ` fork and open PRs against the Dingocoin upstream.

## Commands

```sh
npm ci
npm run dev
npm start
# From the repository root:
npm run test:e2e
```

The root Playwright suite covers link/frontend integration, proxying, metadata, and failure behavior using seeded storage.

## Configuration

All runtime settings live in `config.js` and are read from environment variables with sensible defaults; a service-local `.env` file is loaded if present (`.env` is gitignored; `.env.example` documents the keys). Root Compose supplies `FRONTEND_URL`, `BASE_PATH`, storage, and public-origin values. Add new tunables to `config.js` rather than hardcoding them in modules.

## Local object storage (dev)

Root `compose.e2e.yaml` runs MinIO plus a one-shot `seed` sidecar (`minio/mc`) that creates the six `dingo-nftc-0-*` buckets, sets anonymous download on all but `content`, and mirrors `dev/seed/<bucket>/` into each. Because MinIO uses path-style URLs, `http://minio:9000/<bucket>/<key>` matches the path structure of production object storage.

`dev/seed/` is generated and committed. The single source of truth for fixture ids and their JSON shape is `dev/generate-fixtures.py`; edit it, run `npm run dev:fixtures`, then rerun `npm run test:e2e` from the root. Keys are extensionless and previews are `${id}.png`.

`dev/frontend/` is a fixture, not a real frontend: its `index.html` contains the OG placeholder tokens and echoes the substituted values (and renders the og:image) so you can eyeball what the server injected.

## Frontend runtime dependency

`BUILD_DIR` is resolved relative to the repo directory (not cwd). It must contain a built frontend whose `index.html` includes the placeholder tokens:

- `%%_OG_TITLE_%%`
- `%%_OG_URL_%%`
- `%%_OG_DESCRIPTION_%%`
- `%%_OG_IMAGE_%%`

`makeHtml()` re-reads `index.html` from disk on every request (via the `INDEX_FILE()` thunk), so frontend rebuilds are picked up without restarting. The server exits at startup with a clear message if the file is missing.

## Architecture

- `app.js` — all routing. Static routes (`/`, `/create`, `/collections*`, `/nfts*`, `/profiles*`, `/search`) use fixed copy and the site logo. Dynamic routes (`/nft/:nftAddress`, `/collection/:collectionHandle`, `/profile/:profileAddress[/owned|/stats]`) fetch metadata and build OG tags from it. Anything else proxies to `FRONTEND_URL` or falls through to `express.static(BUILD_DIR)`. `createSiteRouter` builds these routes per frontend: when `FRONTEND_V2_URL` is set, the same routes are mounted at `/v2` for `apps/frontend-v2` (optionally limited by `V2_ALLOWED_IPS`), sharing `/api`. Public URLs in OG tags default to `ROOT_PATH = https://nft.dingocoin.com`.
- `config.js` — env-driven settings (see Configuration above). Required by every other module; no module should read `process.env` directly.
- `storage.js` — reads JSON metadata directly from public object-storage buckets (`${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-{meta,preview,state,profile,collection}`). Production defaults are DigitalOcean Spaces `https://nyc3.digitaloceanspaces.com` (path-style) and `dingo-nftc-0`; the root dev stack uses MinIO with the same bucket names. Each getter returns the parsed JSON or `null` on non-200. `getPreviewLink(id)` just formats a `.png` URL in the preview bucket; it is used for NFT addresses and for collection/profile `thumbnail` ids alike.
- `api.js` — a `getCollection` POST against the `nftp0.dingocoin.io` API. Currently unused; `app.js` imports `getCollection` from `storage.js` instead.
- `utils.js` — `get`/`post` wrappers around Node's native `fetch` with an `AbortController` timeout (`FETCH_TIMEOUT_MS`, default 30s). Note `get` returns the raw Response (callers check `.status`), while `post` returns parsed JSON.

Async route handlers are wrapped in the `asyncHandler` helper in `app.js`, which logs and returns a 500 on a rejected fetch (timeout, network error). Wrap any new async route the same way; an unwrapped rejection would crash the process on Node 15+.

## Conventions

- OG values (titles, descriptions, route params) are user-controlled. `makeHtml()` HTML-escapes every value and substitutes with a replacer function so `$&`-style patterns are not expanded; keep new template values going through it. The E2E suite has stored and reflected injection cases.
- Missing NFT or collection → `404` with a plain-text error. Missing profile → still `200` with the address used as title and an empty image; keep this asymmetry unless intentionally changing it.
- The mixed/odd indentation in `storage.js` and `utils.js` is pre-existing; don't reformat unrelated files when making changes.
