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
const CONTENT_AUTHORIZATION_TIMEOUT = 30; // In seconds.

let s3 = null;

const createClient = () => {
  s3 = new S3Client(S3_CONFIG);
};


const uploadMeta = (address, meta) => {
  return s3.send(
    new PutObjectCommand({
      Bucket: META_BUCKET,
      ACL: "public-read",
      Key: address,
      Body: JSON.stringify(meta),
      ContentType: "application/json"
    })
  );
};

const uploadPreview = (address, data) => {
  return s3.send(
    new PutObjectCommand({
      Bucket: PREVIEW_BUCKET,
      ACL: "public-read",
      Key: address + ".png",
      Body: data,
      ContentType: "image/png"
    })
  );
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

const uploadState = async (address, data) => {
  return s3.send(
    new PutObjectCommand({
      Bucket: STATE_BUCKET,
      ACL: "public-read",
      CacheControl: "max-age=0",
      Key: address,
      Body: JSON.stringify(data),
      ContentType: "application/json"
    })
  );
};

const uploadProfile = (owner, data) => {
  return s3.send(
    new PutObjectCommand({
      Bucket: PROFILE_BUCKET,
      ACL: "public-read",
      CacheControl: "max-age=0",
      Key: owner,
      Body: JSON.stringify(data),
      ContentType: "application/json"
    })
  );
};

const uploadCollection = (handle, data) => {
  return s3.send(
    new PutObjectCommand({
      Bucket: COLLECTION_BUCKET,
      ACL: "public-read",
      CacheControl: "max-age=0",
      Key: handle,
      Body: JSON.stringify(data),
      ContentType: "application/json"
    })
  );
};

module.exports = {
  createClient,
  uploadMeta,
  uploadPreview,
  uploadContent,
  authorizeContent,
  uploadState,
  uploadProfile,
  uploadCollection
};
