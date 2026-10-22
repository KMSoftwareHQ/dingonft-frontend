import { createHash, webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { sha256Fallback, sha256Hex } from "./crypto";

beforeAll(() => {
  globalThis.crypto ??= webcrypto;
});

describe("sha256Hex", () => {
  it("hashes text as UTF-8", async () => {
    const value = "Dingocoin 🐕";
    const expected = createHash("sha256").update(value, "utf8").digest("hex");
    await expect(sha256Hex(value)).resolves.toBe(expected);
  });

  it("hashes blobs as their original bytes", async () => {
    const bytes = Uint8Array.from([0, 1, 2, 254, 255]);
    const expected = createHash("sha256").update(bytes).digest("hex");
    await expect(sha256Hex(new Blob([bytes]))).resolves.toBe(expected);
  });
});

describe("sha256Fallback", () => {
  const hex = (buffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join("");
  it("matches the standard test vectors", () => {
    const enc = (s) => new TextEncoder().encode(s);
    expect(hex(sha256Fallback(enc("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256Fallback(enc("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256Fallback(enc("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
    );
  });

  it("agrees with Web Crypto on longer input", async () => {
    const data = new Uint8Array(100_000).map((_, i) => (i * 31) & 0xff);
    expect(hex(sha256Fallback(data))).toBe(hex(await crypto.subtle.digest("SHA-256", data)));
  });
});
