const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const { Readable } = require("node:stream");
const { getMeta, getProfile, getPreviewLink, getCollection } = require("./storage");
const {
  PORT,
  BUILD_DIR,
  ROOT_PATH,
  LOGO,
  NODE_ENV,
  isDev,
  BASE_PATH,
  FRONTEND_URL,
  API_PROXY_URL,
  ALLOWED_IPS,
  FETCH_TIMEOUT_MS,
} = require("./config");
const { createAllowlist } = require("./allowlist");

const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const NOT_FOUND_PAGE = fs.readFileSync(path.join(__dirname, 'not-found.html'), 'utf8');

const getIndexFile = async () => {
  if (!FRONTEND_URL) {
    return fs.readFileSync(INDEX_PATH, "utf8");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${FRONTEND_URL}${BASE_PATH}/`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Frontend index returned HTTP ${response.status}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

// Titles, descriptions, and route params are user-controlled. Escape them for
// the HTML attribute/text contexts in index.html, and use replacer functions so
// `$&`-style patterns in the values are not expanded by String.replace.
const makeHtml = async (title, url, description, image) => {
  const values = {
    TITLE: escapeHtml(title),
    URL: escapeHtml(url),
    DESCRIPTION: escapeHtml(description),
    IMAGE: escapeHtml(image),
  };
  return (await getIndexFile()).replace(
    /%%_OG_(TITLE|URL|DESCRIPTION|IMAGE)_%%/g,
    (_match, key) => values[key]
  );
};

// 404 page for paths that aren't app routes, and for NFTs and collections that
// don't exist. Without it, unknown paths got the SPA shell with HTTP 200 and
// unfilled Open Graph placeholders.
const sendNotFound = (req, res) => {
  const values = { PATH: escapeHtml(req.originalUrl.split('?')[0]), HOME: escapeHtml(`${BASE_PATH}/`) };
  res
    .status(404)
    .set('Cache-Control', 'no-store')
    .type('html')
    .send(NOT_FOUND_PAGE.replace(/%%_(PATH|HOME)_%%/g, (_match, key) => values[key]));
};

// Requests the frontend container answers itself: files (build assets and
// public files all have an extension, app routes never do), the same-origin
// storage proxy of the dev and e2e frontends (object keys have no extension),
// and the Vite dev server's module and HMR paths.
const isFrontendPath = (urlPath) =>
  /\.[A-Za-z0-9]+$/.test(urlPath) || /^\/(storage\/|@|__vite|node_modules\/|src\/)/.test(urlPath);

const proxyFrontend = (req, res) =>
  proxyRequest(new URL(req.originalUrl, `${FRONTEND_URL}/`), req, res);

// Same-origin API: <BASE_PATH>/api/<route> -> <API_PROXY_URL>/<route>.
const proxyApi = (req, res) =>
  proxyRequest(new URL(req.url.replace(/^\/+/, ''), `${API_PROXY_URL}/`), req, res);

const proxyRequest = async (target, req, res) => {
  const headers = { ...req.headers, host: target.host };
  const options = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req,
    redirect: "manual",
  };
  if (options.body) {
    options.duplex = "half";
  }
  const response = await fetch(target, options);

  res.status(response.status);
  response.headers.forEach((value, name) => {
    // Fetch decodes compressed response bodies before exposing the stream.
    // Do not forward headers that describe the upstream wire representation.
    if (![
      'connection',
      'content-encoding',
      'content-length',
      'keep-alive',
      'transfer-encoding',
    ].includes(name.toLowerCase())) {
      res.setHeader(name, value);
    }
  });
  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else {
    res.end();
  }
};

function asyncHandler(fn) {
  return async function (req, res) {
    try {
      return await fn(req, res);
    } catch (err) {
      console.log(`>>>>> ERROR START [${new Date().toUTCString()}] >>>>>\n`);
      console.log(err);
      console.log("<<<<<< ERROR END <<<<<<\n");
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  };
}

(async function () {
  const app = express();
  app.use(cors());
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  const allowlist = createAllowlist(ALLOWED_IPS);
  if (allowlist) {
    app.use(allowlist);
  }
  const router = express.Router();
  if (API_PROXY_URL) {
    router.use('/api', asyncHandler(proxyApi));
  }

  router.get('/', asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Dingocoin NFT Platform', `${ROOT_PATH}/`, "Create and trade NFTs on Dingocoin's blockchain", LOGO));
  }));
  
  router.get('/create', asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Create NFT', `${ROOT_PATH}/create`, "Create NFT | Dingocoin NFT Platform", LOGO));
  }));
  
  router.get(['/collections', '/collections/', '/collections/hot', '/collections/top', '/collections/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Explore collections', `${ROOT_PATH}/collections`, "Explore collections | Dingocoin NFT Platform", LOGO));
  }));
  
  router.get(['/nfts', '/nfts/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Explore NFTs', `${ROOT_PATH}/nfts`, "Explore NFTs | Dingocoin NFT Platform", LOGO));
  }));
  
  router.get(['/profiles', '/profiles/earnings', '/profiles/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Explore profiles', `${ROOT_PATH}/profiles`, "Explore profiles | Dingocoin NFT Platform", LOGO));
  }));
  
  router.get('/search', asyncHandler(async (_req, res) => {
    res.send(await makeHtml('Search', `${ROOT_PATH}/search`, "Search collections, nfts, profiles | Dingocoin NFT Platform", LOGO));
  }));


  
  router.get('/nft/:nftAddress', asyncHandler(async (req, res) => {
    const nftAddress = req.params.nftAddress;

    const meta = await getMeta(nftAddress);
    if (meta === null) {
      return sendNotFound(req, res);
    }

    res.send(await makeHtml(meta.name || nftAddress, `${ROOT_PATH}/nft/${nftAddress}`, `${meta.description || nftAddress} | Dingocoin NFT Platform`, getPreviewLink(nftAddress)));
  }));
  
  router.get('/collection/:collectionHandle', asyncHandler(async (req, res) => {
    const collectionHandle = req.params.collectionHandle;

    const collection = await getCollection(collectionHandle);
    if (collection === null) {
      return sendNotFound(req, res);
    }

    res.send(await makeHtml(collection.name || collection.handle, `${ROOT_PATH}/collection/${collectionHandle}`, `${collection.description || collectionHandle} | Dingocoin NFT Platform`, getPreviewLink(collection.thumbnail)));
  }));
  
  router.get(['/profile/:profileAddress', '/profile/:profileAddress/owned', '/profile/:profileAddress/stats'], asyncHandler(async (req, res) => {
    const profileAddress = req.params.profileAddress;

    const profile = await getProfile(profileAddress);
    if (profile === null) {
      return res.send(await makeHtml(profileAddress, `${ROOT_PATH}/profile/${profileAddress}`, `${profileAddress} | Dingocoin NFT Platform`, ""));
    }

    res.send(await makeHtml(profile.name || profileAddress, `${ROOT_PATH}/profile/${profileAddress}`, `${profile.name || profileAddress} | Dingocoin NFT Platform`, (profile.thumbnail === undefined || profile.thumbnail === null) ? "" : getPreviewLink(profile.thumbnail)));
  }));

  // Everything below serves files; any other page path is a 404.
  router.use((req, res, next) =>
    ['GET', 'HEAD'].includes(req.method) && !isFrontendPath(req.path) ? sendNotFound(req, res) : next()
  );

  if (FRONTEND_URL) {
    router.use(asyncHandler(proxyFrontend));
  } else {
    router.use(express.static(BUILD_DIR));
  }
  app.use(BASE_PATH || '/', router);

  if (!FRONTEND_URL && !fs.existsSync(INDEX_PATH)) {
    console.error(`Frontend build not found: ${INDEX_PATH}`);
    console.error("Set BUILD_DIR (see .env.example) or run with NODE_ENV=development to use the bundled fixture.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    const source = FRONTEND_URL ? `proxying ${FRONTEND_URL}` : `serving ${BUILD_DIR}`;
    console.log(`Started [${NODE_ENV}] on http://localhost:${PORT}${BASE_PATH || '/'} ${source}`);
    if (isDev) console.log(`og:url will use ROOT_PATH=${ROOT_PATH}`);
  });
})();
