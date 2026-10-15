-- Idempotent: safe to re-run against an existing database. Never add DROP
-- statements here; it is applied to production.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  owner TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  thumbnail TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_owner ON profiles (owner);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles (name);

CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  thumbnail TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_collections_handle ON collections(handle);
CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  collection TEXT,
  contentHash TEXT UNIQUE NOT NULL,
  address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_assets_collection ON assets (collection);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_contentHash ON assets (contentHash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_address ON assets (address);
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets (name);
CREATE INDEX IF NOT EXISTS idx_assets_tags ON assets (tags);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  owner TEXT NOT NULL,
  txid TEXT NOT NULL UNIQUE,
  height INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_address ON transactions (address);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions (owner);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_txid ON transactions (txid);
CREATE INDEX IF NOT EXISTS idx_transactions_height ON transactions (height);

CREATE TABLE IF NOT EXISTS nftStats (
  id SERIAL PRIMARY KEY,
  address TEXT UNIQUE NOT NULL,
  creator TEXT NOT NULL,
  owner TEXT NOT NULL,
  listHeight INTEGER NOT NULL,
  tradeHeight INTEGER,
  tradeCount INTEGER NOT NULL,
  tradeVolume TEXT NOT NULL,
  price TEXT NOT NULL,
  tradeCountScaled REAL NOT NULL,
  tradeVolumeScaled REAL NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nftStats_address ON nftStats (address);
CREATE INDEX IF NOT EXISTS idx_nftStats_creator ON nftStats (creator);
CREATE INDEX IF NOT EXISTS idx_nftStats_owner ON nftStats (owner);
CREATE INDEX IF NOT EXISTS idx_nftStats_listHeight ON nftStats (listHeight);
CREATE INDEX IF NOT EXISTS idx_nftStats_tradeHeight ON nftStats (tradeHeight);
CREATE INDEX IF NOT EXISTS idx_nftStats_tradeCount ON nftStats (tradeCount);
CREATE INDEX IF NOT EXISTS idx_nftStats_tradeVolume ON nftStats (tradeVolume);
CREATE INDEX IF NOT EXISTS idx_nftStats_price ON nftStats (price);

CREATE TABLE IF NOT EXISTS profileStats (
  id SERIAL PRIMARY KEY,
  owner TEXT UNIQUE NOT NULL,
  firstListHeight INTEGER,
  lastListHeight INTEGER,
  listCount INTEGER NOT NULL,
  tradeHeight INTEGER,
  tradeCount INTEGER NOT NULL,
  sellVolume TEXT NOT NULL,
  buyVolume TEXT NOT NULL,
  listSoldCount INTEGER NOT NULL DEFAULT 0,
  royaltyVolume TEXT NOT NULL DEFAULT '0'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profileStats_owner ON profileStats (owner);
CREATE INDEX IF NOT EXISTS idx_profileStats_firstListHeight ON profileStats (firstListHeight);
CREATE INDEX IF NOT EXISTS idx_profileStats_lastListHeight ON profileStats (lastListHeight);
CREATE INDEX IF NOT EXISTS idx_profileStats_listCount ON profileStats (listCount);
CREATE INDEX IF NOT EXISTS idx_profileStats_tradeHeight ON profileStats (tradeHeight);
CREATE INDEX IF NOT EXISTS idx_profileStats_tradeCount ON profileStats (tradeCount);
CREATE INDEX IF NOT EXISTS idx_profileStats_sellVolume ON profileStats (sellVolume);
CREATE INDEX IF NOT EXISTS idx_profileStats_buyVolume ON profileStats (buyVolume);


