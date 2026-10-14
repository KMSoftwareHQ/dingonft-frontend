const { STORAGE_BASE, STORAGE_BUCKET_PREFIX } = require("./config");
const META_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-meta`;
const PREVIEW_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-preview`;
const STATE_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-state`;
const PROFILE_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-profile`;
const COLLECTION_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-collection`;

const { get } = require("./utils");

const getMeta = async (address) => {
    const response = await get(`${META_BUCKET}/${address}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getProfile = async (owner) => {
    const response = await get(`${PROFILE_BUCKET}/${owner}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getCollection = async (handle) => {
    const response = await get(`${COLLECTION_BUCKET}/${handle}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getPreviewLink = (address) => {
    return `${PREVIEW_BUCKET}/${address}.png`;
};


module.exports = {
  getMeta,
  getProfile,
  getPreviewLink,
  getCollection
}
