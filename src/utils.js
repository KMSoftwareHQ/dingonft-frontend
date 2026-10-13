import axios from "axios";

const toSatoshi = (x) => {
  if (x === null || x === undefined || typeof x !== "string" || x === "") {
    throw new Error("Expected string input");
  }
  const match = x.match(/^([+-]?)(\d+)(?:\.(\d{1,8}))?$/);
  if (!match) {
    throw new Error("Expected a decimal string with at most 8 decimal places");
  }
  const [, sign, whole, fraction = ""] = match;
  const satoshis =
    BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
  return (sign === "-" ? -satoshis : satoshis).toString();
};

const toLocaleString = (x) => {
  const isNegative = BigInt(x) < 0n;
  if (isNegative) {
    x = -x;
  }
  const integer = BigInt(x).toString();
  return (
    (isNegative ? "-" : "") + `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  );
};

const satoshiToLocaleString = (x) => {
  const isNegative = BigInt(x) < 0n;
  if (isNegative) {
    x = -x;
  }
  const integer = (BigInt(x) / 100000000n).toString();
  return (
    (isNegative ? "-" : "") + `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
  );
};

const post = async (link, data, onUploadProgress) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 300000);
  return (
    await axios({
      url: link,
      method: "POST",
      withCredentials: false,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: data,
      onUploadProgress: onUploadProgress
    })
  ).data;
};

const get = (link) => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 300000);
  return fetch(link, {
    withCredentials: true,
    method: "GET",
    signal: controller.signal,
  });
};

// BASE_URL is "/" in production and includes the configured test sub-path in
// development. Strip the trailing slash before joining app-absolute paths.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const link = (path) => `${basePath}${path}`;

export {
  basePath,
  link,
  toSatoshi,
  toLocaleString,
  satoshiToLocaleString,
  post,
  get,
};
