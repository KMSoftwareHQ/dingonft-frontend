import { createHash, webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { sha256Hex } from "./crypto";

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
