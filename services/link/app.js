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
  FETCH_TIMEOUT_MS,
} = require("./config");

const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const ERROR_FILE = 'Error: unknown path or asset';

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

const makeHtml = async (title, url, description, image) => {
  return (await getIndexFile())
    .replace(/%%_OG_TITLE_%%/g, title) 
    .replace(/%%_OG_URL_%%/g, url) 
    .replace(/%%_OG_DESCRIPTION_%%/g, description) 
    .replace(/%%_OG_IMAGE_%%/g, image);
};

const proxyFrontend = async (req, res) => {
  const target = new URL(req.originalUrl, `${FRONTEND_URL}/`);
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
      res.status(500).json(err.stack);
    }
  };
}

(async function () {
  const app = express();
  app.use(cors());
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  const router = express.Router();

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
      return res.status(404).send(ERROR_FILE);
    }

    res.send(await makeHtml(meta.name || nftAddress, `${ROOT_PATH}/nft/${nftAddress}`, `${meta.description || nftAddress} | Dingocoin NFT Platform`, getPreviewLink(nftAddress)));
  }));
  
  router.get('/collection/:collectionHandle', asyncHandler(async (req, res) => {
    const collectionHandle = req.params.collectionHandle;

    const collection = await getCollection(collectionHandle);
    if (collection === null) {
      return res.status(404).send(ERROR_FILE);
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
