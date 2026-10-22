import { API_URL } from "./config";
import { cached } from "./cache";
import { postJson, postJsonWithProgress } from "./http";

const post = (route, data = {}) => postJson(`${API_URL}/${route}`, data);
const read = (route, data = {}, ttl) =>
  cached(`api:${route}:${JSON.stringify(data)}`, () => post(route, data), ttl);

// --- NFTs -----------------------------------------------------------------

export const NFT_PAGE_SIZE = 100;

// [{ id, address }], newest first; pass the last id to page.
export const queryNftsByNewest = (beforeId = null) =>
  read("nft/queryByNewest", { beforeId }).then((r) => r.results);

// Addresses sorted by an nftStats column, paged by offset.
export const queryNfts = ({ key, direction, offset = 0, limit = NFT_PAGE_SIZE }) =>
  read("nft/query", { key, direction, offset, limit }).then((r) => r.results);

export const searchNfts = (search) =>
  read("nft/queryBySearch", { search }).then((r) => r.results ?? []);

// { txid } while a transaction for the NFT is unconfirmed, else null.
export const getNftBusy = (address) =>
  post("nft/getBusy", { address }).then((r) => r.busy);

// Resolves to a short-lived presigned URL for the original file.
export const getNftContent = ({ address, timestamp, signature }) =>
  post("nft/getContent", { address, timestamp, signature }).then((r) => r.content);

export const getBuyTransaction = ({ address, price }) =>
  post("nft/getBuyTransaction", { address, price });
export const sendBuyTransaction = (transaction) =>
  post("nft/sendBuyTransaction", { transaction });

export const getRepriceTransaction = ({ address, price }) =>
  post("nft/getRepriceTransaction", { address, price });
export const sendRepriceTransaction = (transaction) =>
  post("nft/sendRepriceTransaction", { transaction });

export const getListTransaction = ({ contentHash, price, royalty }) =>
  post("nft/getListTransaction", { contentHash, price, royalty });
export const sendListTransaction = (data, onProgress) =>
  postJsonWithProgress(`${API_URL}/nft/sendListTransaction`, data, onProgress);

// --- Profiles -------------------------------------------------------------

export const getProfileCreatedNfts = (owner) =>
  read("profile/getCreatedNfts", { owner }).then((r) => r.results);
export const getProfileOwnedNfts = (owner) =>
  read("profile/getOwnedNfts", { owner }).then((r) => r.results);
export const getProfileHistoricalNfts = (owner) =>
  read("profile/getHistoricalNfts", { owner }).then((r) => r.results);
export const getProfileStats = (owner) => read("profile/getStats", { owner });
export const getProfileCreatedCount = (owner) =>
  read("profile/getCreatedCount", { owner }).then(Number);
export const getProfileCollectionCount = (owner) =>
  read("profile/getCollectionCount", { owner }).then(Number);
export const getProfileHistoricalCount = (owner) =>
  read("profile/getHistoricalCount", { owner }).then(Number);

export const searchProfiles = (search) =>
  read("profile/queryBySearch", { search }).then((r) => r.results ?? []);
export const queryProfilesByTradeCount = () =>
  read("profile/queryByTradeCount").then((r) => r.results);
export const queryProfilesByEarnings = () =>
  read("profile/queryByEarnings").then((r) => r.results);

export const updateProfile = (signedPayload) => post("profile/update", signedPayload);

// --- Collections ----------------------------------------------------------

// { count, tradeCount, tradeVolume } with tradeVolume in whole coins.
export const getCollectionStats = (handle) => read("collection/getStats", { handle });
export const getCollectionItems = (handle) => read("collection/getItems", { handle });
// The handle of the NFT's collection, or null.
export const getItemCollectionHandle = (address) =>
  read("collection/getItemCollection", { address }, 5 * 60_000).then((r) => r.handle);

export const queryCollectionsByOwner = (owner) => read("collection/queryByOwner", { owner });
export const queryUnassignedNftsByOwner = (owner) =>
  read("collection/queryUnassignedNftsByOwner", { owner });
export const searchCollections = (search) =>
  read("collection/queryBySearch", { search }).then((r) => r.results ?? []);
export const queryCollectionsTrending = (limit) =>
  read("collection/queryByTradeCountScaled", { limit }).then((r) => r.results);
export const queryCollectionsByVolume = () =>
  read("collection/queryByTradeVolume").then((r) => r.results);

export const createCollection = (signedPayload) => post("collection/create", signedPayload);
export const updateCollection = (signedPayload) => post("collection/update", signedPayload);
export const setCollectionItem = (signedPayload) => post("collection/setItem", signedPayload);

// --- Platform -------------------------------------------------------------

// { totalVolume } in whole coins; null before the first trade.
export const getPlatformStats = () => read("getPlatformStats");
