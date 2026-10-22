import { describe, expect, it } from "vitest";
import { formatCompact, formatSats, formatWhole, satsToWhole, toSatoshi } from "./money";

describe("money", () => {
  it("converts decimal strings to satoshis exactly", () => {
    expect(toSatoshi("1")).toBe("100000000");
    expect(toSatoshi("0.00000001")).toBe("1");
    expect(toSatoshi("275000")).toBe("27500000000000");
    expect(() => toSatoshi("1.000000001")).toThrow();
    expect(() => toSatoshi("1e3")).toThrow();
  });

  it("formats whole coins and satoshis", () => {
    expect(formatWhole("917089858")).toBe("917,089,858");
    expect(formatWhole("-1000")).toBe("-1,000");
    expect(formatSats("27500000000000")).toBe("275,000");
    expect(formatSats("99999999")).toBe("0");
    expect(satsToWhole("27500000000000")).toBe("275000");
  });

  it("formats compact numbers", () => {
    expect(formatCompact("917089858")).toBe("917.1M");
    expect(formatCompact("1300")).toBe("1.3K");
  });
});
