import { getItemCollectionHandle } from "./api";
import { getCollectionRecord, getMeta, getProfileRecord, getState } from "./storage";

export const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

export const nftTitle = (meta) => (meta?.name ? meta.name : "Untitled");

export const profileTitle = (profile) => profile?.name || shortAddress(profile?.address);

// Tags are stored as one space-separated string.
export const nftTags = (meta) =>
  (meta?.tags || "")
    .split(/\s+/)
    .map((tag) => tag.replace(/^#/, ""))
    .filter(Boolean);

export const loadProfile = async (address) => ({
  ...(await getProfileRecord(address)),
  address,
});

export const loadCollection = async (handle) => {
  const record = await getCollectionRecord(handle);
  return record === null ? null : { ...record, handle };
};

// What a card or the NFT page needs: meta, state, collection, and the people.
export const loadNft = async (address) => {
  const [meta, state, handle] = await Promise.all([
    getMeta(address),
    getState(address),
    getItemCollectionHandle(address).catch(() => null),
  ]);
  const [collection, creator, owner] = await Promise.all([
    handle ? loadCollection(handle) : null,
    state ? loadProfile(state.creator) : null,
    state && state.owner !== state.creator ? loadProfile(state.owner) : null,
  ]);
  return { address, meta, state, collection, creator, owner: owner ?? creator };
};
