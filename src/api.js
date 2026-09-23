import { post } from "./utils";

const API_URL = process.env.REACT_APP_API_URL || "api_url";

const getBusy = async (data) => {
  const result = await post(`${API_URL}/nft/getBusy`, {
    address: data.address,
  });
  if (result === null) {
    return null;
  } else {
    return result.busy;
  }
};

const getContent = (data) => {
  return post(`${API_URL}/nft/getContent`, {
    address: data.address,
    timestamp: data.timestamp,
    signature: data.signature,
  });
};

const getBuyTransaction = (data) => {
  return post(`${API_URL}/nft/getBuyTransaction`, {
    address: data.address,
    price: data.price,
  });
};

const sendBuyTransaction = (data) => {
  return post(`${API_URL}/nft/sendBuyTransaction`, {
    transaction: data.transaction,
  });
};

const getRepriceTransaction = (data) => {
  return post(`${API_URL}/nft/getRepriceTransaction`, {
    address: data.address,
    price: data.price,
  });
};

const sendRepriceTransaction = (data) => {
  return post(`${API_URL}/nft/sendRepriceTransaction`, {
    transaction: data.transaction,
  });
};

const getListTransaction = (data) => {
  return post(`${API_URL}/nft/getListTransaction`, {
    contentHash: data.contentHash,
    price: data.price,
    royalty: data.royalty,
  });
};

const sendListTransaction = (data, onUploadProgress) => {
  return post(
    `${API_URL}/nft/sendListTransaction`,
    {
      content: data.content,
      preview: data.preview,
      name: data.name,
      description: data.description,
      tags: data.tags,
      transaction: data.transaction,
    },
    onUploadProgress
  );
};

const updateProfile = (data) => {
  return post(`${API_URL}/profile/update`, {
    timestamp: data.timestamp,
    owner: data.owner,
    name: data.name,
    thumbnail: data.thumbnail,
    signature: data.signature,
  });
};

const getProfileCreatedNfts = (data) => {
  return post(`${API_URL}/profile/getCreatedNfts`, {
    owner: data.owner,
  });
};

const getProfileOwnedNfts = (data) => {
  return post(`${API_URL}/profile/getOwnedNfts`, {
    owner: data.owner,
  });
};

const getProfileHistoricalNfts = (data) => {
  return post(`${API_URL}/profile/getHistoricalNfts`, {
    owner: data.owner,
  });
};

const getProfileStats = (data) => {
  return post(`${API_URL}/profile/getStats`, {
    owner: data.owner,
  });
};

const getProfileCreatedCount = (data) => {
  return post(`${API_URL}/profile/getCreatedCount`, {
    owner: data.owner,
  });
};

const getProfileCollectionCount = (data) => {
  return post(`${API_URL}/profile/getCollectionCount`, {
    owner: data.owner,
  });
};

const getProfileHistoricalCount = (data) => {
  return post(`${API_URL}/profile/getHistoricalCount`, {
    owner: data.owner,
  });
};

const queryProfileBySearch = (data) => {
  return post(`${API_URL}/profile/queryBySearch`, {
    search: data.search,
  });
};

const queryProfileByTradeCount = (data) => {
  return post(`${API_URL}/profile/queryByTradeCount`, {});
};

const queryProfileByEarnings = (data) => {
  return post(`${API_URL}/profile/queryByEarnings`, {});
};

const queryNft = (data) => {
  return post(`${API_URL}/nft/query`, {
    key: data.key,
    direction: data.direction,
    offset: data.offset,
    limit: data.limit,
  });
};

const queryNftBySearch = (data) => {
  return post(`${API_URL}/nft/queryBySearch`, {
    search: data.search,
  });
};

const queryNftByNewest = (data) => {
  return post(`${API_URL}/nft/queryByNewest`, {
    beforeId: data.beforeId,
  });
};

const getCollectionStats = (data) => {
  return post(`${API_URL}/collection/getStats`, {
    handle: data.handle,
  });
};

const queryCollectionByOwner = (data) => {
  return post(`${API_URL}/collection/queryByOwner`, {
    owner: data.owner,
  });
};

const queryCollectionBySearch = (data) => {
  return post(`${API_URL}/collection/queryBySearch`, {
    search: data.search,
  });
};

const queryUnassignedNftsByOwner = (data) => {
  return post(`${API_URL}/collection/queryUnassignedNftsByOwner`, {
    owner: data.owner,
  });
};

const createCollection = (data) => {
  return post(`${API_URL}/collection/create`, {
    timestamp: data.timestamp,
    owner: data.owner,
    handle: data.handle,
    name: data.name,
    thumbnail: data.thumbnail,
    description: data.description,
    signature: data.signature,
  });
};

const updateCollection = (data) => {
  return post(`${API_URL}/collection/update`, {
    timestamp: data.timestamp,
    handle: data.handle,
    name: data.name,
    thumbnail: data.thumbnail,
    description: data.description,
    signature: data.signature,
  });
};

const setCollectionItem = (data) => {
  return post(`${API_URL}/collection/setItem`, {
    timestamp: data.timestamp,
    address: data.address,
    handle: data.handle,
    signature: data.signature,
  });
};

const getCollectionItems = (data) => {
  return post(`${API_URL}/collection/getItems`, {
    handle: data.handle,
  });
};

const getItemCollection = (data) => {
  return post(`${API_URL}/collection/getItemCollection`, {
    address: data.address,
  });
};

const queryCollectionByTradeCountScaled = (limit) => {
  return post(`${API_URL}/collection/queryByTradeCountScaled`, {
    limit: limit,
  });
};

const queryCollectionByTradeVolumeScaled = () => {
  return post(`${API_URL}/collection/queryByTradeVolumeScaled`, {});
};

const queryCollectionByTradeVolume = () => {
  return post(`${API_URL}/collection/queryByTradeVolume`, {});
};

const queryCollectionByValuable = () => {
  return post(`${API_URL}/collection/queryByValuable`, {});
};

const getPlatformStats = () => {
  return post(`${API_URL}/getPlatformStats`, {});
};

export {
  getBusy,
  getContent,
  getBuyTransaction,
  sendBuyTransaction,
  getRepriceTransaction,
  sendRepriceTransaction,
  getListTransaction,
  sendListTransaction,
  updateProfile,
  getProfileCreatedNfts,
  getProfileOwnedNfts,
  getProfileHistoricalNfts,
  getProfileStats,
  getProfileCreatedCount,
  getProfileCollectionCount,
  getProfileHistoricalCount,
  queryProfileBySearch,
  queryProfileByTradeCount,
  queryProfileByEarnings,
  queryNft,
  queryNftBySearch,
  queryNftByNewest,
  createCollection,
  updateCollection,
  getCollectionStats,
  queryCollectionByOwner,
  queryCollectionBySearch,
  queryUnassignedNftsByOwner,
  setCollectionItem,
  getCollectionItems,
  getItemCollection,
  queryCollectionByTradeCountScaled,
  queryCollectionByTradeVolumeScaled,
  queryCollectionByTradeVolume,
  queryCollectionByValuable,
  getPlatformStats,
};
