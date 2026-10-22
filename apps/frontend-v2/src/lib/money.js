// Coin amounts are satoshi strings handled as BigInt; never JS floats.
const SATOSHIS = 100_000_000n;

export const toSatoshi = (x) => {
  if (x === null || x === undefined || typeof x !== "string" || x === "") {
    throw new Error("Expected string input");
  }
  const match = x.match(/^([+-]?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!match) {
    throw new Error("Expected a decimal string with at most 8 decimal places");
  }
  const [, sign, whole, fraction = ""] = match;
  const satoshis = BigInt(whole) * SATOSHIS + BigInt(fraction.padEnd(8, "0"));
  return (sign === "-" ? -satoshis : satoshis).toString();
};

const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Whole-coin amount with thousands separators, e.g. "1,250,000".
export const formatWhole = (x) => {
  const value = BigInt(x);
  return (value < 0n ? "-" : "") + group((value < 0n ? -value : value).toString());
};

// Satoshis -> whole coins, truncated like the original site ("275,000").
export const formatSats = (sats) => formatWhole(BigInt(sats) / SATOSHIS);

// Short form for stat tiles: "917M", "1.3K". Display only.
export const formatCompact = (wholeCoins) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(BigInt(wholeCoins))
  );

export const satsToWhole = (sats) => (BigInt(sats) / SATOSHIS).toString();
