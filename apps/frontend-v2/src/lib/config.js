const env = import.meta.env;

// "" in a root deployment, "/v2" under the sub-path. Router basename.
export const BASE_PATH = env.BASE_URL.replace(/\/$/, "");

export const API_URL = env.VITE_API_URL || "/api";

// VITE_STORAGE_BASE switches to path-style storage URLs (a dev proxy or MinIO).
const STORAGE_BASE = env.VITE_STORAGE_BASE;
const BUCKET_PREFIX = env.VITE_STORAGE_BUCKET_PREFIX || "dingo-nftc-0-";
export const bucketUrl = (name) =>
  STORAGE_BASE
    ? `${STORAGE_BASE}/${BUCKET_PREFIX}${name}`
    : `https://${BUCKET_PREFIX}${name}.nyc3.digitaloceanspaces.com`;

export const EXPLORER_TX_URL = "https://explorer.dingocoin.com/tx/";
export const WALLET_URL = "https://dingocoin.com/wallets";
export const DINGOCOIN_URL = "https://dingocoin.com";
export const REPORT_URL = "https://forms.gle/jxhWR7EMWV7fivn46";
