import { sha256Hex } from "./crypto";

// The Dingocoin browser wallet injects window.dingo with getActiveAccountAddress,
// requestSign (signs a SHA-256 hex digest), and requestSignTransaction.

export class WalletError extends Error {
  constructor(message) {
    super(message);
    this.name = "WalletError";
  }
}

export const hasWallet = () => typeof window !== "undefined" && window.dingo !== undefined;

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

// The active account's address, or null (no wallet, locked, or no answer).
export const getActiveAddress = async () => {
  if (!hasWallet() || typeof window.dingo.getActiveAccountAddress !== "function") {
    return null;
  }
  const response = await withTimeout(window.dingo.getActiveAccountAddress(), 2_000);
  return typeof response?.result === "string" ? response.result : null;
};

const requireWallet = () => {
  if (!hasWallet()) {
    throw new WalletError("No Dingocoin wallet found");
  }
};

// Signs SHA-256(message) and returns the hex signature.
export const signMessage = async (message) => {
  requireWallet();
  const response = await window.dingo.requestSign(await sha256Hex(message));
  if (!response || response.error !== undefined || !response.result) {
    throw new WalletError(response?.error || "Signing was cancelled");
  }
  return response.result;
};

// Signs JSON.stringify(payload). The server rebuilds the message from the same
// fields in the same order, so callers must keep the key order the API expects.
export const signPayload = async (payload) => ({
  ...payload,
  signature: await signMessage(JSON.stringify(payload)),
});

export const signTransaction = async (vins, vouts) => {
  requireWallet();
  const response = await window.dingo.requestSignTransaction(vins, vouts);
  if (!response || response.result === null || response.result === undefined) {
    throw new WalletError(response?.error || "Transaction signing was cancelled");
  }
  return response.result;
};
