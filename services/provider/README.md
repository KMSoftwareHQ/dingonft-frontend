# dingonft-provider

This is the backend of the NFT platform.

## Setup
1) Install node v16.
2) Clone this repo.
3) Run `yarn install` to install dependencies.
4) Run `node app` to run the app.

## Local development with Docker
`docker compose up -d --build` starts a Dingocoin mainnet node, Postgres (schema loaded from `database/schema.sql`), MinIO with the `dingo-nft-*` buckets, and the provider on http://127.0.0.1:8090.

- The node syncs from scratch into the `dingo-data` volume. The provider's live sync starts at block 430000, so it idles until the node gets there.
- Dev secrets are generated on first start into the `app-settings` volume. They are not the production secrets, so the dev platform and asset addresses are different, and production NFT transactions are not picked up.
- The source is bind-mounted; run `docker compose restart app` after editing.
- Connection settings can be overridden with `DATABASE_URL`, `DINGO_RPC_HOST`, `DINGO_RPC_PORT`, `DINGO_COOKIE_PATH`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_FORCE_PATH_STYLE`. When unset, the previous hardcoded values are used.
- Presigned content URLs from `/nft/getContent` point at `http://minio:9000`, which is only resolvable inside the compose network.
