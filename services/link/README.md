# dingonft-link

This runs in front of the [static frontend](https://github.com/rkbling/dingonft-frontend) but preloads Open Graph metadata onto pages before sending them to the client.

## Setup
1) Install Node 16 or newer.
2) Clone this repo.
3) Run `yarn install` to install dependencies.

## Development
Requires Docker (for local object storage). Python 3 + Pillow is only needed to regenerate fixtures.
```sh
yarn dev:storage       # start MinIO in Docker, create the 5 buckets, upload dev/seed/
yarn dev               # http://localhost:3000, restarts on file changes
```
Development is fully self-contained:
- `dev/frontend/` is a stand-in frontend page that renders the substituted OG values (and the og:image itself) and links to every seeded route.
- `dev/seed/` holds test NFTs, collections, profiles and preview images, laid out exactly like the production buckets. `dev/generate-fixtures.py` defines and regenerates them (`yarn dev:fixtures`); re-upload with `yarn dev:seed`.
- The MinIO console is at http://localhost:9001 (minioadmin / minioadmin). `yarn dev:storage:down` stops it; `yarn dev:storage:reset` also wipes the data volume.

To test against real production metadata instead, set `STORAGE_BASE=https://ewr1.vultrobjects.com` in `.env`. To test against a real frontend build, set `BUILD_DIR`. See `.env.example`.

## Production
```sh
yarn start             # port 80, serves ../dingonft-frontend-private
```
All settings (port, build dir, public origin, storage/API endpoints, fetch timeout) can be overridden with environment variables; see `.env.example` and `config.js`.
