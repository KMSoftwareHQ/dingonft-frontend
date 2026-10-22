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
  FRONTEND_V2_URL,
  API_PROXY_URL,
  ALLOWED_IPS,
  V2_ALLOWED_IPS,
  FETCH_TIMEOUT_MS,
} = require("./config");
const { createAllowlist } = require("./allowlist");

const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const NOT_FOUND_PAGE = fs.readFileSync(path.join(__dirname, 'not-found.html'), 'utf8');

// `site` is { frontendUrl, prefix, image }: the main frontend (prefix "") or v2
// ("/v2"); `image` is the Open Graph image of pages without their own.
const getIndexFile = async (site) => {
  if (!site.frontendUrl) {
    return fs.readFileSync(INDEX_PATH, "utf8");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${site.frontendUrl}${BASE_PATH}${site.prefix}/`, {
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
const makeHtml = async (site, title, url, description, image) => {
  const values = {
    TITLE: escapeHtml(title),
    URL: escapeHtml(url),
    DESCRIPTION: escapeHtml(description),
    IMAGE: escapeHtml(image),
  };
  return (await getIndexFile(site)).replace(
    /%%_OG_(TITLE|URL|DESCRIPTION|IMAGE)_%%/g,
    (_match, key) => values[key]
  );
};

// 404 page for paths that aren't app routes, and for NFTs and collections that
// don't exist. Without it, unknown paths got the SPA shell with HTTP 200 and
// unfilled Open Graph placeholders.
const sendNotFound = (site, req, res) => {
  const values = { PATH: escapeHtml(req.originalUrl.split('?')[0]), HOME: escapeHtml(`${BASE_PATH}${site.prefix}/`) };
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

const proxyFrontend = (site) => (req, res) =>
  proxyRequest(new URL(req.originalUrl, `${site.frontendUrl}/`), req, res);

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

// Page routes with Open Graph tags, the 404 page, and file proxying for one
// frontend. Both frontends use the same app paths and the same /api.
const createSiteRouter = (site) => {
  const router = express.Router();
  // v2 duplicates every page of the main site; keep it out of search results.
  if (site.prefix) {
    router.use((_req, res, next) => {
      res.set('X-Robots-Tag', 'noindex');
      next();
    });
  }

  router.get('/', asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Dingocoin NFT Platform', `${ROOT_PATH}${site.prefix}/`, "Create and trade NFTs on Dingocoin's blockchain", site.image));
  }));

  router.get('/create', asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Create NFT', `${ROOT_PATH}${site.prefix}/create`, "Create NFT | Dingocoin NFT Platform", site.image));
  }));

  router.get(['/collections', '/collections/', '/collections/hot', '/collections/top', '/collections/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Explore collections', `${ROOT_PATH}${site.prefix}/collections`, "Explore collections | Dingocoin NFT Platform", site.image));
  }));

  router.get(['/nfts', '/nfts/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Explore NFTs', `${ROOT_PATH}${site.prefix}/nfts`, "Explore NFTs | Dingocoin NFT Platform", site.image));
  }));

  router.get(['/profiles', '/profiles/earnings', '/profiles/search'], asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Explore profiles', `${ROOT_PATH}${site.prefix}/profiles`, "Explore profiles | Dingocoin NFT Platform", site.image));
  }));

  router.get('/search', asyncHandler(async (_req, res) => {
    res.send(await makeHtml(site, 'Search', `${ROOT_PATH}${site.prefix}/search`, "Search collections, nfts, profiles | Dingocoin NFT Platform", site.image));
  }));

  router.get('/nft/:nftAddress', asyncHandler(async (req, res) => {
    const nftAddress = req.params.nftAddress;

    const meta = await getMeta(nftAddress);
    if (meta === null) {
      return sendNotFound(site, req, res);
    }

    res.send(await makeHtml(site, meta.name || nftAddress, `${ROOT_PATH}${site.prefix}/nft/${nftAddress}`, `${meta.description || nftAddress} | Dingocoin NFT Platform`, getPreviewLink(nftAddress)));
  }));

  router.get('/collection/:collectionHandle', asyncHandler(async (req, res) => {
    const collectionHandle = req.params.collectionHandle;

    const collection = await getCollection(collectionHandle);
    if (collection === null) {
      return sendNotFound(site, req, res);
    }

    res.send(await makeHtml(site, collection.name || collection.handle, `${ROOT_PATH}${site.prefix}/collection/${collectionHandle}`, `${collection.description || collectionHandle} | Dingocoin NFT Platform`, getPreviewLink(collection.thumbnail)));
  }));

  router.get(['/profile/:profileAddress', '/profile/:profileAddress/owned', '/profile/:profileAddress/stats'], asyncHandler(async (req, res) => {
    const profileAddress = req.params.profileAddress;

    const profile = await getProfile(profileAddress);
    if (profile === null) {
      return res.send(await makeHtml(site, profileAddress, `${ROOT_PATH}${site.prefix}/profile/${profileAddress}`, `${profileAddress} | Dingocoin NFT Platform`, ""));
    }

    res.send(await makeHtml(site, profile.name || profileAddress, `${ROOT_PATH}${site.prefix}/profile/${profileAddress}`, `${profile.name || profileAddress} | Dingocoin NFT Platform`, (profile.thumbnail === undefined || profile.thumbnail === null) ? "" : getPreviewLink(profile.thumbnail)));
  }));

  // Everything below serves files; any other page path is a 404.
  router.use((req, res, next) =>
    ['GET', 'HEAD'].includes(req.method) && !isFrontendPath(req.path) ? sendNotFound(site, req, res) : next()
  );

  if (site.frontendUrl) {
    router.use(asyncHandler(proxyFrontend(site)));
  } else {
    router.use(express.static(BUILD_DIR));
  }
  return router;
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
  // The redesigned frontend (apps/frontend-v2) at <BASE_PATH>/v2/, optionally
  // limited to V2_ALLOWED_IPS while it's being tried on production.
  if (FRONTEND_V2_URL) {
    const v2Allowlist = createAllowlist(V2_ALLOWED_IPS);
    if (v2Allowlist) {
      router.use('/v2', v2Allowlist);
    }
    router.use('/v2', createSiteRouter({ frontendUrl: FRONTEND_V2_URL, prefix: '/v2', image: `${ROOT_PATH}/v2/og-image.jpg` }));
  }
  router.use(createSiteRouter({ frontendUrl: FRONTEND_URL, prefix: '', image: LOGO }));
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
