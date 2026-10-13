const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require('fs');
const { getMeta, getProfile, getPreviewLink, getCollection } = require("./storage");
const { PORT, BUILD_DIR, ROOT_PATH, LOGO, NODE_ENV, isDev } = require("./config");

const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const INDEX_FILE = () => fs.readFileSync(INDEX_PATH, 'utf8');
const ERROR_FILE = 'Error: unknown path or asset';

const makeHtml = (title, url, description, image) => {
  return INDEX_FILE()
    .replace(/%%_OG_TITLE_%%/g, title) 
    .replace(/%%_OG_URL_%%/g, url) 
    .replace(/%%_OG_DESCRIPTION_%%/g, description) 
    .replace(/%%_OG_IMAGE_%%/g, image);
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

  app.get('/', (req, res) => {
    res.send(makeHtml('Dingocoin NFT Platform', `${ROOT_PATH}/`, "Create and trade NFTs on Dingocoin's blockchain", LOGO));
  });
  
  app.get('/create', (req, res) => {
    res.send(makeHtml('Create NFT', `${ROOT_PATH}/create`, "Create NFT | Dingocoin NFT Platform", LOGO));
  });
  
  app.get(['/collections', '/collections/top', '/collections/search'], (req, res) => {
    res.send(makeHtml('Explore collections', `${ROOT_PATH}/collections`, "Explore collections | Dingocoin NFT Platform", LOGO)); 
  });
  
  app.get(['/nfts', '/nfts/search'], (req, res) => {
    res.send(makeHtml('Explore NFTs', `${ROOT_PATH}/nfts`, "Explore NFTs | Dingocoin NFT Platform", LOGO)); 
  });
  
  app.get(['/profiles', '/profiles/earnings', '/profiles/search'], (req, res) => {
    res.send(makeHtml('Explore profiles', `${ROOT_PATH}/profiles`, "Explore profiles | Dingocoin NFT Platform", LOGO)); 
  });
  
  app.get(['/search'], (req, res) => {
    res.send(makeHtml('Search', `${ROOT_PATH}/search`, "Search collections, nfts, profiles | Dingocoin NFT Platform", LOGO)); 
  });


  
  app.get('/nft/:nftAddress', asyncHandler(async (req, res) => {  
    const nftAddress = req.params.nftAddress;

    const meta = await getMeta(nftAddress);
    if (meta === null) {
      return res.status(404).send(ERROR_FILE);
    }

    res.send(makeHtml(meta.name || nftAddress, `${ROOT_PATH}/nft/${nftAddress}`, `${meta.description || nftAddress} | Dingocoin NFT Platform`, getPreviewLink(nftAddress))); 
  }));
  
  app.get('/collection/:collectionHandle', asyncHandler(async (req, res) => {
    const collectionHandle = req.params.collectionHandle;

    const collection = await getCollection(collectionHandle);
    if (collection === null) {
      return res.status(404).send(ERROR_FILE);
    }

    res.send(makeHtml(collection.name || collection.handle, `${ROOT_PATH}/collection/${collectionHandle}`, `${collection.description || collectionHandle} | Dingocoin NFT Platform`, getPreviewLink(collection.thumbnail))); 
  }));
  
  app.get(['/profile/:profileAddress', '/profile/:profileAddress/owned', '/profile/:profileAddress/stats'], asyncHandler(async (req, res) => {
    const profileAddress = req.params.profileAddress;

    const profile = await getProfile(profileAddress);
    if (profile === null) {
      return res.send(makeHtml(profileAddress, `${ROOT_PATH}/profile/${profileAddress}`, `${profileAddress} | Dingocoin NFT Platform`, "")); 
    }

    res.send(makeHtml(profile.name || profileAddress, `${ROOT_PATH}/profile/${profileAddress}`, `${profile.name || profileAddress} | Dingocoin NFT Platform`, (profile.thumbnail === undefined || profile.thumbnail === null) ? "" : getPreviewLink(profile.thumbnail))); 
  }));



  app.use(express.static(BUILD_DIR));

  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`Frontend build not found: ${INDEX_PATH}`);
    console.error("Set BUILD_DIR (see .env.example) or run with NODE_ENV=development to use the bundled fixture.");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Started [${NODE_ENV}] on http://localhost:${PORT} serving ${BUILD_DIR}`);
    if (isDev) console.log(`og:url will use ROOT_PATH=${ROOT_PATH}`);
  });
})();
