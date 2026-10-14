# dingonft-link

This runs in front of `apps/frontend`, injects route-specific Open Graph
metadata, and proxies browser traffic to the independently running frontend
container.

## Setup
1) Install Node.js 24 LTS and npm 12.
2) Run `npm ci` from this directory.

## Development
The supported development topologies are defined at the monorepo root:
```sh
docker compose up -d --build  # real provider and chain node
npm run test:e2e              # deterministic provider fixture + Playwright
```

`dev/seed/` holds deterministic NFTs, collections, profiles, and preview
images. Python 3 + Pillow is only needed to regenerate these fixtures with
`npm run dev:fixtures`.

See `.env.example` and `config.js` for direct service overrides.

## Production
```sh
npm start
```
Set `FRONTEND_URL` to the frontend container/origin. Public metadata defaults to
`https://nft.dingocoin.com`. All settings can be overridden with environment
variables; see `.env.example` and `config.js`.
