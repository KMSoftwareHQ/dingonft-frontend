const { STORAGE_BASE, STORAGE_BUCKET_PREFIX } = require("./config");
const META_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-meta`;
const PREVIEW_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-preview`;
const STATE_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-state`;
const PROFILE_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-profile`;
const COLLECTION_BUCKET = `${STORAGE_BASE}/${STORAGE_BUCKET_PREFIX}-collection`;

const { get } = require("./utils");

// Object keys come from request paths, which Express has already decoded, so
// encode them again: a key such as "../other-bucket/x" or "x?y" must stay one
// key in this bucket.

const getMeta = async (address) => {
    const response = await get(`${META_BUCKET}/${encodeURIComponent(address)}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getProfile = async (owner) => {
    const response = await get(`${PROFILE_BUCKET}/${encodeURIComponent(owner)}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getCollection = async (handle) => {
    const response = await get(`${COLLECTION_BUCKET}/${encodeURIComponent(handle)}`);
      if (response.status === 200) {
            return response.json();
              } else {
                    return null;
                      }
};

const getPreviewLink = (address) => {
    return `${PREVIEW_BUCKET}/${encodeURIComponent(address)}.png`;
};


module.exports = {
  getMeta,
  getProfile,
  getPreviewLink,
  getCollection
}
