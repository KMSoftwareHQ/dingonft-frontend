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

const config = {
  NODE_ENV,
  isDev,
  // Port to listen on. Production historically bound 80; dev defaults to an
  // unprivileged port so no sudo is needed.
  PORT: Number(process.env.PORT) || (isDev ? 3000 : 80),
  // Directory containing the built frontend (index.html + assets). Dev
  // defaults to the bundled fixture so the server runs without the private
  // frontend repo checked out alongside.
  BUILD_DIR: path.resolve(
    __dirname,
    process.env.BUILD_DIR || (isDev ? "./dev/frontend" : "../dingonft-frontend-private")
  ),
  // Public origin used in og:url tags.
  ROOT_PATH: process.env.ROOT_PATH || "https://nft.dingocoin.org",
  LOGO: process.env.LOGO || "https://nft.dingocoin.org/dingocoin.png",
  // Object storage base; bucket names are appended in storage.js. Dev defaults
  // to the local MinIO from docker-compose.yml (`yarn dev:storage`).
  STORAGE_BASE:
    process.env.STORAGE_BASE || (isDev ? "http://localhost:9000" : "https://ewr1.vultrobjects.com"),
  API_URL: process.env.API_URL || "https://nftp0.dingocoin.io",
  FETCH_TIMEOUT_MS: Number(process.env.FETCH_TIMEOUT_MS) || 30000,
};

module.exports = config;
