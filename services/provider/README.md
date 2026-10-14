# dingonft-provider

This is the backend of the NFT platform.

## Setup
1) Install Node.js 24 LTS and npm 12.
2) Run `npm ci` from this directory.
3) Run `npm test` for the provider unit checks.
4) Run `npm start -- settings` only when external Postgres, object storage, and
   a synced Dingocoin RPC node are configured.

## Local development with Docker
From the monorepo root, `docker compose up -d --build` starts a Dingocoin
mainnet node, Postgres (schema loaded from `database/schema.sql`), MinIO with
the `dingo-nftc-0-*` buckets (`STORAGE_BUCKET_PREFIX`, same as production), and the provider on http://127.0.0.1:8090.

- The node syncs from scratch into the `dingo-data` volume. The provider's live sync starts at block 430000, so it idles until the node gets there.
- Dev secrets are generated on first start into the `provider-settings` volume. They are not the production secrets, so the dev platform and asset addresses are different, and production NFT transactions are not picked up.
- The source is bind-mounted; run `docker compose restart provider` after editing.
- Connection settings can be overridden with `DATABASE_URL`, `DINGO_RPC_HOST`, `DINGO_RPC_PORT`, `DINGO_COOKIE_PATH`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and `S3_FORCE_PATH_STYLE`. When unset, the previous hardcoded values are used.
- The dev platform key never matches production NFTs, so the dev index stays empty unless NFTs are created through the dev stack itself.
- Database writes that must be atomic go through `database.transaction(async () => ...)`. Queries made inside the callback run on the transaction's client; an error rolls back and is rethrown. Don't issue raw `BEGIN`/`COMMIT`.
- The live sync resumes at the last block that recorded a transaction, skips transactions it already recorded, and retries after errors such as RPC timeouts or a Postgres restart.
- `npm test` runs offline: the database tests replace `pg` with an in-memory fake.
- Presigned content URLs from `/nft/getContent` point at `http://minio:9000`, which is only resolvable inside the compose network.
