// REACT_APP_STORAGE_BASE switches to a path-style S3 endpoint (e.g. the
// dingonft-provider dev MinIO) where buckets are URL paths.
// REACT_APP_STORAGE_BUCKET_PREFIX matches the backend's bucket names.
const STORAGE_BASE = process.env.REACT_APP_STORAGE_BASE;
const BUCKET_PREFIX =
  process.env.REACT_APP_STORAGE_BUCKET_PREFIX || "dingo-nftc-0-";
const bucket = (name) =>
  STORAGE_BASE
    ? `${STORAGE_BASE}/${BUCKET_PREFIX}${name}`
    : `https://${BUCKET_PREFIX}${name}.nyc3.digitaloceanspaces.com`;

const META_BUCKET = bucket("meta");
const PREVIEW_BUCKET = bucket("preview");
const STATE_BUCKET = bucket("state");
const PROFILE_BUCKET = bucket("profile");
const COLLECTION_BUCKET = bucket("collection");

const get = (link) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 5000);
  return fetch(link, {
    withCredentials: true,
    method: "GET",
    signal: controller.signal,
  });
};

const getMeta = async (address) => {
  const response = await get(`${META_BUCKET}/${address}`);
  if (response.status === 200) {
    return response.json();
  } else {
    return null;
  }
};

const getPreviewLink = (address) => {
  return `${PREVIEW_BUCKET}/${address}.png`;
};

const getState = async (address) => {
  const response = await get(`${STATE_BUCKET}/${address}`);
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

export { getMeta, getPreviewLink, getState, getProfile, getCollection };
