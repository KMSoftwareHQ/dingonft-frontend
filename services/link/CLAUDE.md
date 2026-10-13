# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small Express server (plain CommonJS, Node 16+) that sits in front of the static Dingocoin NFT frontend. It serves the frontend's `index.html` with Open Graph meta tags filled in per-route so link previews (Twitter, Discord, etc.) show the right title/description/image, then falls back to serving the frontend build as static files.

## Git remotes

- `origin` = `KMSoftwareHQ/dingonft-link` (the user's fork). **All pushes go here.**
- `upstream` = `dingocoin/dingonft-link` (the parent). Fetch/rebase from it only; its push URL is set to `DISABLED` and `remote.pushDefault=origin`, so `git push` always targets the fork. Never re-enable upstream pushes or open PRs from a branch pushed anywhere but origin.

## Commands

```sh
yarn install           # install deps (yarn.lock is committed; use yarn, not npm)
yarn dev:storage       # docker compose up: MinIO on :9000 (+console :9001), buckets created and seeded
yarn dev               # NODE_ENV=development + nodemon; port 3000, serves dev/frontend fixture
yarn dev:seed          # re-upload dev/seed/ to MinIO (idempotent; run after changing fixtures)
yarn dev:fixtures      # regenerate dev/seed/ from dev/generate-fixtures.py (needs python3 + Pillow)
yarn dev:storage:down  # stop MinIO; dev:storage:reset also deletes the data volume
yarn start             # production: port 80, serves ../dingonft-frontend-private, real buckets
```

There are no tests, linters, or build steps. Manual verification: start storage + dev server, then open http://localhost:3000/ and follow the "Seeded fixture routes" links, or curl a route and grep the `og:` meta tags.

## Configuration

All runtime settings live in `config.js` and are read from environment variables with sensible defaults; a `.env` file in the repo root is loaded if present (`.env` is gitignored; `.env.example` documents the keys). Defaults differ by `NODE_ENV`: development uses port 3000, `./dev/frontend`, and `STORAGE_BASE=http://localhost:9000` (local MinIO); anything else uses port 80, `../dingonft-frontend-private`, and the real Vultr endpoint. Add new tunables to `config.js` rather than hardcoding them in modules.

## Local object storage (dev)

`docker-compose.yml` runs MinIO plus a one-shot `seed` sidecar (`minio/mc`) that creates the five `dingo-nftc-0-*` buckets, sets anonymous download (matching the public production buckets), and mirrors `dev/seed/<bucket>/` into each. Because MinIO uses path-style URLs, `http://localhost:9000/<bucket>/<key>` is a drop-in for `https://ewr1.vultrobjects.com/<bucket>/<key>`, so `storage.js` needs no dev-specific code. Images are pulled from `quay.io/minio/*` because the Docker Hub `minio/*` repos were not pullable from this machine.

`dev/seed/` is generated and committed. The single source of truth for fixture ids and their JSON shape is `dev/generate-fixtures.py`; edit it, run `yarn dev:fixtures`, then `yarn dev:seed`. Keys are extensionless (the server fetches `${bucket}/${id}` for JSON) and previews are `${id}.png`. The fixtures deliberately cover each fallback branch in `app.js`: an NFT with no name, one with no description, a collection with no name, a profile with `thumbnail: null`, and links to ids that do not exist. If you change the JSON shape the server reads, update the generator too; the fixture page in `dev/frontend/index.html` hardcodes the seeded ids in its link list.

`dev/frontend/` is a fixture, not a real frontend: its `index.html` contains the OG placeholder tokens and echoes the substituted values (and renders the og:image) so you can eyeball what the server injected.

## Runtime dependency on a sibling repo (production)

`BUILD_DIR` is resolved relative to the repo directory (not cwd). It must contain a built frontend whose `index.html` includes the placeholder tokens:

- `%%_OG_TITLE_%%`
- `%%_OG_URL_%%`
- `%%_OG_DESCRIPTION_%%`
- `%%_OG_IMAGE_%%`

`makeHtml()` re-reads `index.html` from disk on every request (via the `INDEX_FILE()` thunk), so frontend rebuilds are picked up without restarting. The server exits at startup with a clear message if the file is missing.

## Architecture

- `app.js` — all routing. Static routes (`/`, `/create`, `/collections*`, `/nfts*`, `/profiles*`, `/search`) use fixed copy and the site logo. Dynamic routes (`/nft/:nftAddress`, `/collection/:collectionHandle`, `/profile/:profileAddress[/owned|/stats]`) fetch metadata and build OG tags from it. Anything else falls through to `express.static(BUILD_DIR)`. Public URLs in OG tags are built from `ROOT_PATH = https://nft.dingocoin.org`.
- `config.js` — env-driven settings (see Configuration above). Required by every other module; no module should read `process.env` directly.
- `storage.js` — reads JSON metadata directly from public Vultr object-storage buckets (`${STORAGE_BASE}/dingo-nftc-0-{meta,preview,state,profile,collection}`). Each getter returns the parsed JSON or `null` on non-200. `getPreviewLink(id)` just formats a `.png` URL in the preview bucket; it is used for NFT addresses and for collection/profile `thumbnail` ids alike.
- `api.js` — a `getCollection` POST against the `nftp0.dingocoin.io` API. Currently unused; `app.js` imports `getCollection` from `storage.js` instead.
- `utils.js` — `get`/`post` wrappers around `node-fetch` v2 with a 30s `AbortController` timeout. Note `get` returns the raw Response (callers check `.status`), while `post` returns parsed JSON.

Async route handlers are wrapped in the `asyncHandler` helper in `app.js`, which logs and returns a 500 on a rejected fetch (timeout, network error). Wrap any new async route the same way; an unwrapped rejection would crash the process on Node 15+.

## Conventions

- Missing NFT or collection → `404` with a plain-text error. Missing profile → still `200` with the address used as title and an empty image; keep this asymmetry unless intentionally changing it.
- The mixed/odd indentation in `storage.js` and `utils.js` is pre-existing; don't reformat unrelated files when making changes.
