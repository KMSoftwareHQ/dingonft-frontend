"use strict";

// Posts confirmed marketplace events (list, reprice, buy) to a Discord
// webhook. Disabled unless DISCORD_WEBHOOK_URL is set. Never throws: a Discord
// outage must not stall the chain sync.

const { fromSatoshi } = require("./dingo");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const PUBLIC_URL = (process.env.PUBLIC_URL || "https://nft.dingocoin.com").replace(/\/+$/, "");
const EXPLORER_TX_URL = "https://explorer.dingocoin.com/tx/";
const PREVIEW_BASE = `${(process.env.STORAGE_PUBLIC_BASE || "https://nyc3.digitaloceanspaces.com").replace(/\/+$/, "")}/${process.env.STORAGE_BUCKET_PREFIX || "dingo-nftc-0"}-preview`;
const TIMEOUT_MS = 10_000;

const EVENTS = {
  list: { title: "New listing", color: 0x2ea043 },
  reprice: { title: "Price updated", color: 0xd29922 },
  buy: { title: "Sold", color: 0x1f6feb },
};

const withCommas = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Display price from satoshis: 1,111 / 1,111.5 below 100k, then 333k, 1.3M,
// 2.5B. Rounding carries into the next unit (999,999 -> 1M).
function formatPrice(satoshis) {
  const exact = fromSatoshi(String(satoshis));
  const [whole, fraction] = exact.split(".");
  const value = Number(exact);
  if (value < 100_000) {
    return fraction ? `${withCommas(whole)}.${fraction}` : withCommas(whole);
  }
  const units = [
    [1e9, "B", 1],
    [1e6, "M", 1],
    [1e3, "k", 0],
  ];
  for (let i = 0; i < units.length; i++) {
    const [size, suffix, decimals] = units[i];
    if (value < size) {
      continue;
    }
    const rounded = Number((value / size).toFixed(decimals));
    if (rounded >= 1000 && i > 0) {
      const [biggerSize, biggerSuffix] = units[i - 1];
      return `${Number((value / biggerSize).toFixed(1))}${biggerSuffix}`;
    }
    return `${rounded}${suffix}`;
  }
  return exact;
}

const shortAddress = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const profileLink = (address) => `[${shortAddress(address)}](${PUBLIC_URL}/profile/${address})`;

// NFT names are user-controlled; keep them from breaking out of the title.
const cleanName = (name) =>
  String(name || "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);

function buildPayload({ kind, address, name, txid, price, seller, buyer, owner }) {
  const event = EVENTS[kind];
  const fields = [{ name: "Price", value: `${formatPrice(price)} DINGO`, inline: true }];
  if (kind === "buy") {
    fields.push({ name: "Seller", value: profileLink(seller), inline: true });
    fields.push({ name: "Buyer", value: profileLink(buyer), inline: true });
  } else {
    fields.push({ name: "Owner", value: profileLink(owner), inline: true });
  }
  fields.push({ name: "Transaction", value: `[View on explorer](${EXPLORER_TX_URL}${txid})` });

  return {
    // Names can contain "@everyone"/role mentions; never ping anyone.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${event.title}: ${cleanName(name) || shortAddress(address)}`,
        url: `${PUBLIC_URL}/nft/${address}`,
        color: event.color,
        fields,
        thumbnail: { url: `${PREVIEW_BASE}/${address}.png` },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function notify(event, { fetchImpl = fetch } = {}) {
  if (!WEBHOOK_URL) {
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(event)),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.log(`[Discord] Webhook returned HTTP ${response.status} for ${event.kind} ${event.txid}`);
    }
  } catch (err) {
    console.log(`[Discord] Webhook failed for ${event.kind} ${event.txid}: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { notify, buildPayload, formatPrice };
