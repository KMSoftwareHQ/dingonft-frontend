// Mock provider + object storage for developing frontend-v2 against fake data.
//
//   POST /api/<route>            the provider endpoints the app calls
//   GET  /storage/<bucket>/<key> meta, state, profile, collection JSON; previews
//
// Writes (create, buy, reprice, edits) apply in memory: transactions show as
// busy for CONFIRM_SECONDS, then "confirm". Purchases and new NFTs go to the
// "You (demo wallet)" profile, since the mock can't verify who signed.
// Restarting resets everything to the same seeded world.
import http from "node:http";
import { renderArt } from "./art.js";
import { collectionStats, createWorld, fakeAddress, fakeTxid, nftStats, profileStats, TIP_HEIGHT } from "./world.js";

const PORT = Number(process.env.PORT || 4000);
const PREFIX = process.env.STORAGE_BUCKET_PREFIX || "dingo-nftc-0";
// Browser-facing storage path, for the "original file" link.
const PUBLIC_STORAGE = (process.env.PUBLIC_STORAGE || "/v2/storage").replace(/\/$/, "");
const CONFIRM_SECONDS = Number(process.env.CONFIRM_SECONDS || 20);
const SATS = 100_000_000n;

const world = createWorld();
const uploads = new Map(); // address -> PNG buffer from the create flow
const artCache = new Map();
let height = TIP_HEIGHT;

const all = () => [...world.nfts.values()];
const nft = (address) => world.nfts.get(address);
const historical = (owner) => all().filter((n) => world.ownership.get(n.address).has(owner));
const collectionOf = (address) => [...world.collections.values()].find((c) => c.items.includes(address)) || null;
const includes = (text, q) => (text || "").toLowerCase().includes(q);

const isBusy = (address) => {
  const b = world.busy.get(address);
  return b && b.until > Date.now() ? { txid: b.txid } : null;
};

// Marks the NFT busy, then applies the change once "confirmed".
const submit = (address, apply) => {
  const txid = fakeTxid(Math.random);
  world.busy.set(address, { txid, until: Date.now() + CONFIRM_SECONDS * 1000 });
  setTimeout(() => {
    height += 1;
    apply();
  }, CONFIRM_SECONDS * 1000);
  return { txid };
};

// Transactions are opaque here; the mock remembers what each one would do.
const prepared = new Map();
const prepare = (op) => {
  const transaction = `mock-${fakeTxid(Math.random)}`;
  prepared.set(transaction, op);
  return transaction;
};

const routes = {
  "getPlatformStats": () => {
    const total = all().reduce((s, n) => s + n.trades.reduce((t, x) => t + x.price, 0n), 0n);
    return { totalVolume: total === 0n ? null : (total / SATS).toString() };
  },

  // --- NFTs ---
  "nft/queryByNewest": ({ beforeId }) => ({
    results: all()
      .filter((n) => beforeId === null || beforeId === undefined || n.id < beforeId)
      .sort((a, b) => b.id - a.id)
      .slice(0, 100)
      .map((n) => ({ id: n.id, address: n.address })),
  }),
  "nft/query": ({ key, direction, offset = 0, limit = 100 }) => {
    if (!["listHeight", "tradeHeight", "price", "tradeCount", "tradeVolume"].includes(key) || limit > 100) {
      return { error: "Invalid query" };
    }
    const rows = all()
      .map(nftStats)
      .filter((s) => s[key] !== null)
      .sort((a, b) => (Number(a[key]) - Number(b[key])) * (direction === "ASC" ? 1 : -1));
    return { results: rows.slice(offset, offset + limit).map((s) => s.address) };
  },
  "nft/queryBySearch": ({ search }) => {
    const q = (search || "").trim().toLowerCase();
    return {
      results: q
        ? all()
            .filter((n) => includes(n.meta.name, q) || includes(n.meta.description, q) || includes(n.meta.tags, q) || n.address.toLowerCase() === q)
            .map((n) => n.address)
        : null,
    };
  },
  "nft/getBusy": ({ address }) => ({ busy: isBusy(address) }),
  "nft/getContent": ({ address }) =>
    nft(address) ? { content: `${PUBLIC_STORAGE}/${PREFIX}-preview/${address}.png` } : { error: "Asset has no owner" },

  "nft/getBuyTransaction": ({ address, price }) => {
    const n = nft(address);
    if (!n) {
      return { error: "Asset is not listed" };
    }
    const p = BigInt(price);
    if (p < SATS || p > n.price * 10n || isBusy(address)) {
      return { error: "Invalid transaction" };
    }
    return { vins: [{ txid: fakeTxid(Math.random), vout: 0 }], vouts: { [n.owner]: n.price.toString(), data: prepare({ kind: "buy", address, price: p }) } };
  },
  "nft/getRepriceTransaction": ({ address, price }) => {
    const n = nft(address);
    if (!n) {
      return { error: "Asset is not listed" };
    }
    const p = BigInt(price);
    if (p < SATS || p > n.price || isBusy(address)) {
      return { error: "Invalid transaction" };
    }
    return { vins: [{ txid: fakeTxid(Math.random), vout: 0 }], vouts: { [n.owner]: "0", data: prepare({ kind: "reprice", address, price: p }) } };
  },
  "nft/getListTransaction": ({ price, royalty }) => ({
    vouts: { [world.demo]: "0", data: prepare({ kind: "list", price: BigInt(price), royalty }) },
  }),

  // The wallet returns a signed hex blob; the mock looks the operation up by
  // the data output it handed out, which a mock wallet echoes back unchanged.
  "nft/sendBuyTransaction": ({ transaction }) => send(transaction, "buy"),
  "nft/sendRepriceTransaction": ({ transaction }) => send(transaction, "reprice"),
  "nft/sendListTransaction": (body) => list(body),

  // --- Profiles ---
  "profile/getCreatedNfts": ({ owner }) => ({ results: all().filter((n) => n.creator === owner).sort((a, b) => a.id - b.id).map((n) => n.address) }),
  "profile/getOwnedNfts": ({ owner }) => ({ results: all().filter((n) => n.owner === owner).sort((a, b) => a.id - b.id).map((n) => n.address) }),
  "profile/getHistoricalNfts": ({ owner }) => ({ results: historical(owner).sort((a, b) => a.id - b.id).map((n) => n.address) }),
  "profile/getStats": ({ owner }) => profileStats(world, owner),
  "profile/getCreatedCount": ({ owner }) => all().filter((n) => n.creator === owner).length,
  "profile/getCollectionCount": ({ owner }) => [...world.collections.values()].filter((c) => c.owner === owner).length,
  "profile/getHistoricalCount": ({ owner }) => historical(owner).length,
  "profile/queryBySearch": ({ search }) => {
    const q = (search || "").trim().toLowerCase();
    return { results: q ? [...world.profiles.values()].filter((p) => includes(p.name, q) || p.address.toLowerCase() === q).map((p) => p.address) : null };
  },
  "profile/queryByTradeCount": () => ({
    results: [...world.profiles.keys()]
      .map((a) => [a, profileStats(world, a)])
      .filter(([, s]) => s.tradeCount > 0 || s.listCount > 0)
      .sort((a, b) => b[1].tradeCount - a[1].tradeCount)
      .map(([a]) => a),
  }),
  "profile/queryByEarnings": () => ({
    results: [...world.profiles.keys()]
      .map((a) => {
        const s = profileStats(world, a);
        return [a, BigInt(s.royaltyVolume) + BigInt(s.sellVolume) - BigInt(s.buyVolume)];
      })
      .filter(([, e]) => e > 0n)
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .map(([a]) => a),
  }),
  "profile/update": ({ owner, name, thumbnail }) => {
    if (typeof name === "string" && (name.trim() !== name || name.length > 40)) {
      return { error: name.length > 40 ? "Name too long" : "Name has trailing spaces" };
    }
    if (thumbnail !== null && !world.ownership.get(thumbnail)?.has(owner)) {
      return { error: "Wrong thumbnail creator" };
    }
    const profile = world.profiles.get(owner) || { address: owner };
    world.profiles.set(owner, { ...profile, name: name ?? profile.name ?? "", thumbnail });
    return {};
  },

  // --- Collections ---
  "collection/getStats": ({ handle }) => collectionStats(world, handle),
  "collection/getItems": ({ handle }) => world.collections.get(handle)?.items || [],
  "collection/getItemCollection": ({ address }) => ({ handle: collectionOf(address)?.handle ?? null }),
  "collection/queryByOwner": ({ owner }) => [...world.collections.values()].filter((c) => c.owner === owner).map((c) => c.handle),
  "collection/queryUnassignedNftsByOwner": ({ owner }) =>
    all().filter((n) => n.creator === owner && !collectionOf(n.address)).sort((a, b) => a.id - b.id).map((n) => n.address),
  "collection/queryBySearch": ({ search }) => {
    const q = (search || "").trim().toLowerCase();
    return {
      results: q
        ? [...world.collections.values()].filter((c) => includes(c.name, q) || includes(c.handle, q) || includes(c.description, q)).map((c) => c.handle)
        : null,
    };
  },
  "collection/queryByTradeCountScaled": ({ limit = 20 }) => ({ results: rankCollections((s) => s.tradeCountScaled).slice(0, limit) }),
  "collection/queryByTradeVolume": () => ({ results: rankCollections((s) => Number(BigInt(s.tradeVolume) / SATS)) }),
  "collection/create": ({ owner, handle, name, thumbnail, description }) => {
    if (!/^[a-z0-9]+$/.test(handle || "") || handle.length > 40) {
      return { error: "Bad handle format" };
    }
    if (world.collections.has(handle)) {
      return { error: "Handle already taken" };
    }
    if (nft(thumbnail)?.creator !== owner) {
      return { error: "Wrong thumbnail creator" };
    }
    world.collections.set(handle, { handle, owner, name, description, thumbnail, items: [] });
    return {};
  },
  "collection/update": ({ handle, name, thumbnail, description }) => {
    const c = world.collections.get(handle);
    if (!c) {
      return { error: "Invalid collection" };
    }
    Object.assign(c, { name, thumbnail, description });
    return {};
  },
  "collection/setItem": ({ address, handle }) => {
    const c = world.collections.get(handle);
    if (!c || !nft(address)) {
      return { error: !c ? "Invalid collection" : "Invalid NFT" };
    }
    for (const other of world.collections.values()) {
      other.items = other.items.filter((a) => a !== address);
    }
    c.items.push(address);
    return {};
  },
};

const rankCollections = (score) =>
  [...world.collections.values()]
    .map((c) => [c.handle, c.items.reduce((s, a) => s + score(nftStats(nft(a))), 0)])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([h]) => h);

// A real wallet returns signed hex the mock can't decode, so fall back to the
// most recently prepared operation of the same kind.
const operation = (transaction, kind) =>
  prepared.get(transaction) || [...prepared.values()].reverse().find((op) => op.kind === kind);

const send = (transaction, kind) => {
  const op = operation(transaction, kind);
  if (!op || op.kind !== kind) {
    return { error: "Invalid transaction" };
  }
  prepared.clear();
  const n = nft(op.address);
  return submit(op.address, () => {
    if (kind === "buy") {
      n.trades.push({ height, seller: n.owner, buyer: world.demo, price: n.price });
      n.owner = world.demo;
      world.ownership.get(n.address).add(world.demo);
    }
    n.price = op.price;
  });
};

const list = ({ content, preview, name, description, tags }) => {
  const op = [...prepared.values()].reverse().find((o) => o.kind === "list");
  if (!op) {
    return { error: "Invalid transaction" };
  }
  if (!content) {
    return { error: "Content empty" };
  }
  prepared.clear();
  const address = fakeAddress(Math.random);
  world.nfts.set(address, {
    id: Math.max(...all().map((n) => n.id)) + 1,
    address,
    meta: { name: name || "", description: description || "", tags: tags || "" },
    art: null,
    creator: world.demo,
    owner: world.demo,
    collection: null,
    royalty: op.royalty,
    price: op.price,
    listHeight: ++height,
    trades: [],
  });
  world.ownership.set(address, new Set([world.demo]));
  uploads.set(address, Buffer.from(preview, "base64"));
  return { address, ...submit(address, () => {}) };
};

// --- Storage -------------------------------------------------------------------

const storage = (bucket, key) => {
  switch (bucket) {
    case `${PREFIX}-meta`:
      return nft(key) && { json: nft(key).meta };
    case `${PREFIX}-state`: {
      const n = nft(key);
      return n && { json: { creator: n.creator, owner: n.owner, stats: nftStats(n) } };
    }
    case `${PREFIX}-profile`: {
      const p = world.profiles.get(key);
      return p && (p.name || p.thumbnail) && { json: { name: p.name, thumbnail: p.thumbnail } };
    }
    case `${PREFIX}-collection`: {
      const c = world.collections.get(key);
      return c && { json: { owner: c.owner, name: c.name, thumbnail: c.thumbnail, description: c.description } };
    }
    case `${PREFIX}-preview`: {
      const address = key.replace(/\.png$/, "");
      if (uploads.has(address)) {
        return { png: uploads.get(address) };
      }
      const n = nft(address);
      if (!n?.art) {
        return null;
      }
      if (!artCache.has(address)) {
        artCache.set(address, renderArt(n.art));
      }
      return { png: artCache.get(address) };
    }
    default:
      return null;
  }
};

// --- HTTP ------------------------------------------------------------------------

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const parts = [];
    req.on("data", (part) => parts.push(part));
    req.on("end", () => {
      try {
        resolve(parts.length ? JSON.parse(Buffer.concat(parts).toString("utf8")) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://mock");
    try {
      if (url.pathname === "/healthz") {
        return json(res, 200, { status: "ok" });
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/")) {
        const handler = routes[url.pathname.slice(5)];
        if (!handler) {
          return json(res, 404, { error: "Unknown route" });
        }
        // A little latency, so loading states are visible.
        await new Promise((r) => setTimeout(r, 60 + Math.random() * 140));
        return json(res, 200, handler(await readBody(req)));
      }
      const match = url.pathname.match(/^\/storage\/([^/]+)\/(.+)$/);
      if ((req.method === "GET" || req.method === "HEAD") && match) {
        const object = storage(match[1], decodeURIComponent(match[2]));
        if (!object) {
          res.writeHead(404, { "Content-Type": "application/xml" });
          return res.end("<Error><Code>NoSuchKey</Code></Error>");
        }
        if (object.png) {
          res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" });
          return res.end(object.png);
        }
        return json(res, 200, object.json);
      }
      json(res, 404, { error: "Not found" });
    } catch (err) {
      console.error(err);
      json(res, 500, { error: "Internal server error" });
    }
  })
  .listen(PORT, () => {
    console.log(
      `mock provider on :${PORT}: ${world.nfts.size} NFTs, ${world.collections.size} collections, ${world.profiles.size} profiles; demo wallet ${world.demo}`
    );
  });
