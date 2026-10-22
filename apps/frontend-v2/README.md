# Dingocoin NFT frontend v2

A rebuild of `apps/frontend` with feature parity: browsing, search, NFT,
collection, and profile pages, creating NFTs, buying, lowering prices,
downloading originals, and editing profiles and collections. It is served under
`/v2/` so it can run beside the current site.

React 19, React Router 7, and Vite 8 on Node 24; no UI framework. Styles are
plain CSS on design tokens (`src/styles/tokens.css`) with light and dark themes.

## Development

From the monorepo root, `docker compose up -d frontend-v2` starts the app and
its mock backend at <http://localhost:3022/testing-nft-platform/v2/> (loopback
only; `V2_PORT` and `V2_BASE_PATH` change it). Behind a reverse proxy, list its
host name in `V2_ALLOWED_HOSTS`; hot reload works through the proxy.

Outside Docker: `npm ci`, `npm run mock` in one terminal, then copy
`.env.example` to `.env` and `npm run dev`.

### Fake data

`mock/` is a dependency-free stand-in for the provider API and the storage
buckets: a seeded world of 17 profiles, 10 collections, and ~240 NFTs with
generated cover art (`mock/art.js`) and trade histories, plus two NFTs that are
mid-transaction. Everything the app calls is implemented, including writes:
creating, buying, lowering prices, and profile/collection edits apply in memory.
Transactions stay "busy" for 20 seconds (`CONFIRM_SECONDS`), then confirm.
Purchases and new NFTs go to the "You (demo wallet)" profile, since the mock
doesn't verify signatures. Restarting the mock resets the world.

A browser wallet is still what triggers signing. Message signing (edits,
downloads) works with the real extension; transaction signing may be refused,
because the mock's inputs don't exist on chain.

To use other data, set `V2_API_PROXY_TARGET`/`V2_STORAGE_PROXY_TARGET`
(Compose) or `DEV_*_PROXY_TARGET` (`.env`): the local stack is
`http://provider:80` and `http://minio:9000`; production is
`https://nft.dingocoin.com/api` and `https://nyc3.digitaloceanspaces.com`
(real mainnet transactions).

```sh
npm run lint    # ESLint, zero warnings
npm test        # Vitest (lib/ unit tests)
npm run build   # production build into dist/
```

## Layout

- `src/lib/` — no React: `api.js` (provider endpoints), `storage.js` (bucket
  JSON), `wallet.js` (`window.dingo`), `money.js` (BigInt coin math), `files.js`
  (upload validation), `cache.js` (shared promise cache), `models.js` (composite
  loaders), `hooks.js`.
- `src/components/` — layout, cards, dialogs, form fields, wallet and toast
  contexts.
- `mock/` — fake provider and storage (see above).
- `src/pages/` — one file per route. `src/dialogs/` — trade, profile, and
  collection forms.

## Things to keep in mind

- **Signed payloads:** `signPayload` signs `JSON.stringify(payload)`, and the
  provider rebuilds the message from the same fields in the same order. Keep the
  key order of each payload as the endpoint expects (see
  `services/provider/app.js`). Names must be trimmed; signatures expire after 60
  seconds.
- **Units:** NFT prices and profile volumes are satoshi strings (`formatSats`);
  platform and collection volumes are whole coins (`formatWhole`). Never use JS
  floats for amounts.
- **Price rules** (enforced by the provider): at least 1 DINGO; a purchase
  relists at no more than 10× the current price; a reprice can only lower it.
- **Wallet:** `getActiveAccountAddress` tells the app who's connected, so
  owner-only actions show only to the owner. When the address is unknown
  (locked wallet), they show to everyone and the server's signature check
  decides.
- **Errors:** the provider answers most failures with HTTP 200 and
  `{ error }`; `http.js` turns that into a thrown `ApiError`.
- **Routes** match the current site's paths (`/nft/:address`,
  `/collection/:handle`, `/profile/:address[/owned|/stats]`, ...), so links and
  the link service's Open Graph rendering carry over under `/v2`.

## Production

`Dockerfile` builds the app with `BASE_PATH=/v2/` and serves it from nginx at
`/v2/`. It isn't wired into `compose.prod.yaml` or the link service yet.
