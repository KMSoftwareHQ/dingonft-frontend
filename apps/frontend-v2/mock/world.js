// A deterministic fake NFT platform: profiles, collections, NFTs, and trade
// history, with the aggregates the provider would compute from them.
import { PALETTES, rng } from "./art.js";

const SATS = 100_000_000n;
export const TIP_HEIGHT = 2_795_000;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const rand = rng(20261015);
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
export const fakeAddress = (r = rand) =>
  "D" + Array.from({ length: 33 }, () => BASE58[Math.floor(r() * BASE58.length)]).join("");
export const fakeTxid = (r = rand) =>
  Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(r() * 16)]).join("");

// Prices in whole coins, rounded to look like human choices.
const humanPrice = (min, max) => {
  const raw = Math.exp(Math.log(min) + rand() * (Math.log(max) - Math.log(min)));
  const step = 10 ** Math.max(0, Math.floor(Math.log10(raw)) - 1);
  return BigInt(Math.max(1, Math.round(raw / step) * step));
};

const PROFILE_NAMES = [
  "Pixel Pup Studio", "Marina Okafor", "dingoverse", "Hollow Pine", "Kestrel Works", "Ada Lindqvist",
  "Tidewater", "neon.mutt", "Juno Arcade", "The Copper Shed", "Sol Ramírez", "", "", "Mintwright",
  "Ferris Kai", "",
];

// Collections: [handle, name, style, palette, description, size, price range]
const COLLECTIONS = [
  ["pixelpups", "Pixel Pups", "critter", 0, "Twelve-by-twelve companions, each one hand-tuned (by a random number generator).", 36, [500, 40_000]],
  ["tidelines", "Tide Lines", "waves", 6, "The sea, flattened into its bands.", 24, [1_000, 120_000]],
  ["lowpeaks", "Low Peaks", "peaks", 3, "Ranges at golden hour. No two horizons repeat.", 28, [2_000, 250_000]],
  ["chromaorbs", "Chroma Orbs", "orbs", 8, "Soft light, soft focus.", 20, [800, 60_000]],
  ["bauhaustiles", "Bauhaus Tiles", "tiles", 2, "Quarter circles on a four-by-four grid, after the school.", 30, [1_500, 90_000]],
  ["orbitstudies", "Orbit Studies", "rings", 9, "Interference between two imaginary moons.", 18, [5_000, 400_000]],
  ["plasmagarden", "Plasma Garden", "plasma", 5, "", 16, [300, 25_000]],
  ["midnightmutts", "Midnight Mutts", "critter", 8, "Nocturnal cousins of the Pixel Pups.", 14, [2_500, 75_000]],
  ["copperwaves", "Copper Waves", "waves", 10, "Warm metals, slow currents.", 12, [1_000, 30_000]],
  ["dawnseries", "The Dawn Series", "peaks", 4, "Mornings over imaginary mountains.", 10, [10_000, 900_000]],
];

const ADJECTIVES = ["Quiet", "Golden", "Restless", "Velvet", "Electric", "Hollow", "Lucky", "Distant", "Paper", "Midnight", "Amber", "Salted"];
const NOUNS = ["Harbor", "Signal", "Garden", "Comet", "Dingo", "Lantern", "Echo", "Meadow", "Circuit", "Atlas", "Tide", "Ember"];
const TAGS = ["art", "generative", "pixel", "abstract", "dingo", "landscape", "color", "minimal", "retro", "geometry", "ocean", "dog"];

export const createWorld = () => {
  const profiles = new Map();
  const collections = new Map();
  const nfts = new Map();
  const ownership = new Map(); // address -> Set of everyone who has owned it

  const people = PROFILE_NAMES.map((name) => {
    const address = fakeAddress();
    profiles.set(address, { address, name, thumbnail: null });
    return address;
  });
  // The demo wallet: purchases and new NFTs made in the mock land here.
  const demo = fakeAddress();
  profiles.set(demo, { address: demo, name: "You (demo wallet)", thumbnail: null });

  const creators = people.slice(0, 10);
  let height = 600_000;
  const pending = [];

  const addNft = ({ creator, collection, name, art, priceWhole, listHeight, royalty }) => {
    const address = fakeAddress();
    const meta = {
      name,
      description: rand() < 0.5 ? `${pick(["A study in", "Notes on", "An evening of", "Variations on"])} ${pick(NOUNS).toLowerCase()} and ${pick(NOUNS).toLowerCase()}.` : "",
      tags: Array.from({ length: int(0, 3) }, () => pick(TAGS)).filter((t, i, a) => a.indexOf(t) === i).join(" "),
    };
    const nft = {
      id: 0,
      address,
      meta,
      art,
      creator,
      owner: creator,
      collection,
      royalty,
      price: priceWhole * SATS,
      listHeight,
      trades: [],
    };
    nfts.set(address, nft);
    ownership.set(address, new Set([creator]));
    return nft;
  };

  // Collections and their items.
  COLLECTIONS.forEach(([handle, name, style, palette, description, size, [lo, hi]], index) => {
    const owner = creators[index % creators.length];
    collections.set(handle, { handle, owner, name, description, thumbnail: null, items: [] });
    for (let i = 1; i <= size; i++) {
      height += int(500, 25_000);
      const nft = addNft({
        creator: owner,
        collection: handle,
        name: `${name.replace(/^The /, "")} #${i}`,
        art: { style, palette: palette + (rand() < 0.2 ? 1 : 0), seed: int(1, 1e9) },
        priceWhole: humanPrice(lo, hi),
        listHeight: Math.min(height, TIP_HEIGHT - 5_000),
        royalty: int(25, 100),
      });
      collections.get(handle).items.push(nft.address);
      pending.push(nft);
    }
    collections.get(handle).thumbnail = collections.get(handle).items[int(0, Math.min(5, size - 1))];
  });

  // One-off pieces outside any collection.
  for (let i = 0; i < 30; i++) {
    height += int(500, 20_000);
    const nft = addNft({
      creator: pick(people.slice(0, 13)),
      collection: null,
      name: rand() < 0.15 ? "" : `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
      art: { style: pick(["orbs", "plasma", "rings", "tiles", "waves", "peaks"]), palette: int(0, PALETTES.length - 1), seed: int(1, 1e9) },
      priceWhole: humanPrice(100, 150_000),
      listHeight: Math.min(height, TIP_HEIGHT - 5_000),
      royalty: int(25, 100),
    });
    pending.push(nft);
  }

  // Ids follow listing order, like the provider's serial id.
  [...nfts.values()].sort((a, b) => a.listHeight - b.listHeight).forEach((nft, i) => (nft.id = i + 1));

  // Trade history: each sale is at the listed price, relisted at up to 3x.
  for (const nft of pending) {
    let at = nft.listHeight;
    const trades = rand() < 0.35 ? 0 : int(1, 6);
    for (let t = 0; t < trades; t++) {
      at += int(200, 120_000);
      if (at >= TIP_HEIGHT) {
        break;
      }
      const buyer = pick(people.filter((p) => p !== nft.owner));
      nft.trades.push({ height: at, seller: nft.owner, buyer, price: nft.price });
      nft.owner = buyer;
      ownership.get(nft.address).add(buyer);
      nft.price = (nft.price * BigInt(int(100, 300))) / 100n;
    }
  }

  // Profile pictures: one of each person's own creations or purchases.
  for (const profile of profiles.values()) {
    if (profile.address === demo || rand() < 0.2) {
      continue;
    }
    const mine = [...nfts.values()].filter((n) => ownership.get(n.address).has(profile.address));
    profile.thumbnail = mine.length ? pick(mine).address : null;
  }

  // Two NFTs are mid-transaction, to show the busy state.
  const busy = new Map();
  [...nfts.values()].filter((n) => n.trades.length > 0).slice(3, 5).forEach((n) => busy.set(n.address, { txid: fakeTxid(), until: Infinity }));

  return { profiles, collections, nfts, ownership, busy, demo };
};

// --- Aggregates ------------------------------------------------------------------

// Recent trades count for more, like the provider's decayed "scaled" stats.
const decay = (height) => Math.exp(-(TIP_HEIGHT - height) / 400_000);

export const nftStats = (nft) => {
  const last = nft.trades.at(-1);
  const volume = nft.trades.reduce((sum, t) => sum + t.price, 0n);
  return {
    address: nft.address,
    creator: nft.creator,
    owner: nft.owner,
    listHeight: nft.listHeight,
    tradeHeight: last ? last.height : null,
    tradeCount: nft.trades.length,
    tradeVolume: volume.toString(),
    price: nft.price.toString(),
    tradeCountScaled: nft.trades.reduce((s, t) => s + decay(t.height), 0),
    tradeVolumeScaled: nft.trades.reduce((s, t) => s + Number(t.price / SATS) * decay(t.height), 0),
  };
};

export const profileStats = (world, owner) => {
  const s = {
    owner,
    firstListHeight: null,
    lastListHeight: null,
    listCount: 0,
    tradeHeight: null,
    tradeCount: 0,
    sellVolume: 0n,
    buyVolume: 0n,
    listSoldCount: 0,
    royaltyVolume: 0n,
  };
  for (const nft of world.nfts.values()) {
    if (nft.creator === owner) {
      s.listCount++;
      s.firstListHeight = Math.min(s.firstListHeight ?? Infinity, nft.listHeight);
      s.lastListHeight = Math.max(s.lastListHeight ?? 0, nft.listHeight);
    }
    nft.trades.forEach((t, i) => {
      if (nft.creator === owner) {
        s.listSoldCount++;
        // The first sale pays the creator as seller; later ones pay royalties.
        if (i > 0) {
          s.royaltyVolume += (t.price * BigInt(nft.royalty)) / 1000n;
        }
      }
      if (t.seller === owner || t.buyer === owner) {
        s.tradeCount++;
        s.tradeHeight = Math.max(s.tradeHeight ?? 0, t.height);
      }
      if (t.seller === owner) {
        s.sellVolume += t.price;
      }
      if (t.buyer === owner) {
        s.buyVolume += t.price;
      }
    });
  }
  return {
    ...s,
    sellVolume: s.sellVolume.toString(),
    buyVolume: s.buyVolume.toString(),
    royaltyVolume: s.royaltyVolume.toString(),
  };
};

export const collectionStats = (world, handle) => {
  const items = world.collections.get(handle)?.items || [];
  let tradeCount = 0;
  let volume = 0n;
  for (const address of items) {
    for (const t of world.nfts.get(address).trades) {
      tradeCount++;
      volume += t.price;
    }
  }
  return { count: String(items.length), tradeCount: String(tradeCount), tradeVolume: (volume / SATS).toString() };
};
