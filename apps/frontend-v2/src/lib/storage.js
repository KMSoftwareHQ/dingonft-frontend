import { bucketUrl } from "./config";
import { cached } from "./cache";
import { getJson } from "./http";

const META = bucketUrl("meta");
const PREVIEW = bucketUrl("preview");
const STATE = bucketUrl("state");
const PROFILE = bucketUrl("profile");
const COLLECTION = bucketUrl("collection");

// Each resolves to the stored JSON, or null when the object is missing.

// { name, description, tags }. Written once at mint.
export const getMeta = (address) =>
  cached(`meta:${address}`, () => getJson(`${META}/${address}`), 30 * 60_000);

// { creator, owner, stats: { price, tradeCount, tradeVolume, listHeight, tradeHeight, ... } }
export const getState = (address) =>
  cached(`state:${address}`, () => getJson(`${STATE}/${address}`), 30_000);

// { name, thumbnail }
export const getProfileRecord = (address) =>
  cached(`profile:${address}`, () => getJson(`${PROFILE}/${address}`));

// { owner, name, thumbnail, description }
export const getCollectionRecord = (handle) =>
  cached(`collection:${handle}`, () => getJson(`${COLLECTION}/${handle}`));

export const previewUrl = (address) => `${PREVIEW}/${address}.png`;
