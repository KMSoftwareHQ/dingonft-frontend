// Central runtime config. Every value can be overridden with an environment
// variable; a local `.env` file is loaded if present (see .env.example).
const path = require("path");
const fs = require("fs");

const envFile = path.resolve(__dirname, ".env");
if (fs.existsSync(envFile)) {
  require("dotenv").config({ path: envFile });
}

const NODE_ENV = process.env.NODE_ENV || "production";
const isDev = NODE_ENV === "development";
const rawBasePath = process.env.BASE_PATH || "";
const trimmedBasePath = rawBasePath.replace(/^\/+|\/+$/g, "");
// "" for a root deployment, otherwise "/<path>" without a trailing slash.
const BASE_PATH = trimmedBasePath ? `/${trimmedBasePath}` : "";

const config = {
  NODE_ENV,
  isDev,
  BASE_PATH,
  // Port to listen on. Production historically bound 80; dev defaults to an
  // unprivileged port so no sudo is needed.
  PORT: Number(process.env.PORT) || (isDev ? 3000 : 80),
  // Directory containing a built frontend (index.html + assets) when the
  // independently deployed FRONTEND_URL mode is not used.
  BUILD_DIR: path.resolve(
    __dirname,
    process.env.BUILD_DIR || (isDev ? "./dev/frontend" : "../../apps/frontend/dist")
  ),
  // Public origin used in og:url tags.
  ROOT_PATH: process.env.ROOT_PATH || "https://nft.dingocoin.com",
  LOGO: process.env.LOGO || "https://nft.dingocoin.com/dingocoin.png",
  // In the monorepo the frontend is independently deployed. The edge fetches
  // its index template and proxies assets/API requests to this origin.
  FRONTEND_URL: process.env.FRONTEND_URL || "",
  // Optional second frontend (apps/frontend-v2), served at <BASE_PATH>/v2/.
  FRONTEND_V2_URL: process.env.FRONTEND_V2_URL || "",
  // When set, <BASE_PATH>/api/* is proxied to the provider so the browser can
  // use a same-origin API (production sets VITE_API_URL=/api).
  // Comma-separated IPs/CIDRs. When set, every route except /healthz returns
  // 403 for other clients (pre-launch lockdown). Empty disables it.
  ALLOWED_IPS: (process.env.ALLOWED_IPS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
  // Same format, applied only to <BASE_PATH>/v2/ (on top of ALLOWED_IPS).
  V2_ALLOWED_IPS: (process.env.V2_ALLOWED_IPS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
  API_PROXY_URL: (process.env.API_PROXY_URL || "").replace(/\/+$/, ""),
  // Object storage base; bucket names are appended in storage.js. Dev defaults
  // to local MinIO when running the root Compose stack.
  STORAGE_BASE:
    process.env.STORAGE_BASE || (isDev ? "http://localhost:9000" : "https://nyc3.digitaloceanspaces.com"),
  STORAGE_BUCKET_PREFIX: process.env.STORAGE_BUCKET_PREFIX || "dingo-nftc-0",
  API_URL: process.env.API_URL || "https://nftp0.dingocoin.io",
  FETCH_TIMEOUT_MS: Number(process.env.FETCH_TIMEOUT_MS) || 30000,
};

module.exports = config;
