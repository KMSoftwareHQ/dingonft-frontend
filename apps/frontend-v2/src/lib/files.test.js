import { describe, expect, it } from "vitest";
import { formatBytes, isPng, isWebp, validateContent } from "./files";

describe("files", () => {
  it("detects PNG and WEBP signatures", () => {
    expect(isPng(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe(true);
    expect(isWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]))).toBe(true);
    expect(isPng(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
    expect(isWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBe(false);
  });

  it("validates content size", () => {
    expect(validateContent(null)).toBe("Choose the original file");
    expect(validateContent({ size: 0 })).toBe("The file is empty");
    expect(validateContent({ size: 11e6 })).toMatch(/limit is 10 MB/);
    expect(validateContent({ size: 5e6 })).toBe("");
  });

  it("formats sizes", () => {
    expect(formatBytes(1_500_000)).toBe("1.5 MB");
    expect(formatBytes(420)).toBe("1 KB");
  });
});
