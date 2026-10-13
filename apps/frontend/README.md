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

The full test environment runs under Docker at
`http://localhost:3020/testing-nft-platform/`:

```bash
docker compose up -d --build
```

Start the sibling `dingonft-provider` stack first so the API and storage
proxies have live targets. See [.env.example](.env.example) for overrides.

Open Graph placeholders in `index.html` are populated by
[dingonft-link](https://github.com/rkbling/dingonft-link) in production.
