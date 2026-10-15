const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  GetBucketCorsCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const detectFileType = require("detect-file-type");
const util = require('util');

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT || "",
  region: process.env.S3_REGION || "",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
};
// Everything except content is read directly by browsers and link, and
// DigitalOcean Spaces objects are private unless uploaded public-read.
// Same variable and default as services/link: production buckets are
// dingo-nftc-0-{meta,preview,content,state,profile,collection}.
const BUCKET_PREFIX = process.env.STORAGE_BUCKET_PREFIX || "dingo-nftc-0";
const META_BUCKET = `${BUCKET_PREFIX}-meta`;
const PREVIEW_BUCKET = `${BUCKET_PREFIX}-preview`;
const CONTENT_BUCKET = `${BUCKET_PREFIX}-content`;
const STATE_BUCKET = `${BUCKET_PREFIX}-state`;
const PROFILE_BUCKET = `${BUCKET_PREFIX}-profile`;
const COLLECTION_BUCKET = `${BUCKET_PREFIX}-collection`;
// Buckets whose objects must all be publicly readable (scripts/repair-acl.js checks these).
const PUBLIC_BUCKETS = [
  META_BUCKET,
  PREVIEW_BUCKET,
  STATE_BUCKET,
  PROFILE_BUCKET,
  COLLECTION_BUCKET,
];
const CONTENT_AUTHORIZATION_TIMEOUT = 30; // In seconds.

let s3 = null;

// Tests pass a stub client.
const createClient = (client = new S3Client(S3_CONFIG)) => {
  s3 = client;
};

// Every upload to a public bucket goes through here, so none can omit the
// ACL: overwriting an object without it makes the object private again.
const putPublic = (bucket, key, body, contentType, extra = {}) => {
  return s3.send(
    new PutObjectCommand({
      ...extra,
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
};

const uploadMeta = (address, meta) => {
  return putPublic(META_BUCKET, address, JSON.stringify(meta), "application/json");
};

const uploadPreview = (address, data) => {
  return putPublic(PREVIEW_BUCKET, address + ".png", data, "image/png");
};

const uploadContent = async (address, data) => {
  const type = await util.promisify((callback) => {
    detectFileType.fromBuffer(data, (err, res) => {
      if (res === null) {
        callback(null,  { mime: "application/octet-stream" });
      } else {
        callback(null, res);
      }
    });
  })();

  return await s3.send(
    new PutObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: address,
      Body: data,
      ContentType: type.mime
    })
  );
};

const authorizeContent = (address) => {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: address,
    }),
    {
      expiresIn: CONTENT_AUTHORIZATION_TIMEOUT,
    }
  );
};

const uploadState = (address, data) => {
  return putPublic(STATE_BUCKET, address, JSON.stringify(data), "application/json", { CacheControl: "max-age=0" });
};

const uploadProfile = (owner, data) => {
  return putPublic(PROFILE_BUCKET, owner, JSON.stringify(data), "application/json", { CacheControl: "max-age=0" });
};

const uploadCollection = (handle, data) => {
  return putPublic(COLLECTION_BUCKET, handle, JSON.stringify(data), "application/json", { CacheControl: "max-age=0" });
};

module.exports = {
  S3_CONFIG,
  PUBLIC_BUCKETS,
  createClient,
  uploadMeta,
  uploadPreview,
  uploadContent,
  authorizeContent,
  uploadState,
  uploadProfile,
  uploadCollection
};
