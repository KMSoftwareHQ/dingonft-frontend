# Dingocoin NFT frontend

React frontend for the Dingocoin NFT platform. Production is served at
[nft.dingocoin.com](https://nft.dingocoin.com/).

## Local setup

Requires Node.js 24 LTS and npm 12.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
npm run build
```

The full monorepo test environment runs under Docker at
`http://localhost:3020/testing-nft-platform/`:

```bash
docker compose up -d --build
```

Run that command from the repository root; it starts the provider, storage,
database, chain node, link edge, and frontend as separate containers. For the
fast deterministic browser topology, run `npm run test:e2e` from the root.

Open Graph placeholders in `index.html` are populated by
`services/link` in production.
