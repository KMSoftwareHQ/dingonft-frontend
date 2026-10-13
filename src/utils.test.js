import { describe, expect, it } from "vitest";
import {
  link,
  satoshiToLocaleString,
  toLocaleString,
  toSatoshi,
} from "./utils";

describe("amount utilities", () => {
  it("converts DINGO decimal strings to satoshis exactly", () => {
    expect(toSatoshi("1")).toBe("100000000");
    expect(toSatoshi("123.45")).toBe("12345000000");
    expect(toSatoshi("0.00000001")).toBe("1");
    expect(toSatoshi("-1.5")).toBe("-150000000");
    expect(toSatoshi("-0")).toBe("0");
  });

  it("rejects malformed or over-precise amounts", () => {
    expect(() => toSatoshi(1)).toThrow("Expected string input");
    expect(() => toSatoshi("1.000000001")).toThrow("at most 8 decimal places");
  });

  it("formats integer and satoshi values", () => {
    expect(toLocaleString("1234567")).toBe("1,234,567");
    expect(satoshiToLocaleString("123456789000000")).toBe("1,234,567");
  });
});

describe("link", () => {
  it("prefixes an app-absolute path with Vite's base path", () => {
    expect(link("/collections")).toBe("/collections");
  });
});
