/* global BigInt */

import Web3Utils from "web3-utils";
import axios from "axios";

const toSatoshi = (x) => {
  if (x === null || x === undefined || typeof x !== "string" || x === "") {
    throw new Error("Expected string input");
  }
  return (BigInt(Web3Utils.toWei(x, "gwei")) / 10n).toString();
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

// Prefix an app-absolute path with PUBLIC_URL (empty in production) so the app
// also works when served under a sub-path, e.g. /testing-nft-platform.
const link = (path) => `${process.env.PUBLIC_URL}${path}`;

export { link, toSatoshi, toLocaleString, satoshiToLocaleString, post, get };
