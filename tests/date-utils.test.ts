import { describe, it, expect } from "vitest";
import { getLocalDateString } from "../src/tools/get-availability.js";

describe("getLocalDateString", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 2, 15); // March 15, 2026
    expect(getLocalDateString(date)).toBe("2026-03-15");
  });

  it("zero-pads single-digit months", () => {
    const date = new Date(2026, 0, 5); // January 5
    expect(getLocalDateString(date)).toBe("2026-01-05");
  });

  it("zero-pads single-digit days", () => {
    const date = new Date(2026, 11, 1); // December 1
    expect(getLocalDateString(date)).toBe("2026-12-01");
  });
});
