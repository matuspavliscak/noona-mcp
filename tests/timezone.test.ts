import { describe, it, expect } from "vitest";
import { buildStartsAt, getUtcOffset } from "../src/tools/book-appointment.js";

describe("getUtcOffset", () => {
  it("returns +01:00 for CET in winter", () => {
    expect(getUtcOffset("Europe/Prague", "2026-01-15", "14:00")).toBe("+01:00");
  });

  it("returns +02:00 for CEST in summer", () => {
    expect(getUtcOffset("Europe/Prague", "2026-07-15", "14:00")).toBe("+02:00");
  });

  it("returns +00:00 for UTC", () => {
    expect(getUtcOffset("UTC", "2026-03-15", "14:00")).toBe("+00:00");
  });

  it("returns -05:00 for US Eastern in winter", () => {
    expect(getUtcOffset("America/New_York", "2026-01-15", "14:00")).toBe("-05:00");
  });

  it("returns +05:30 for India", () => {
    expect(getUtcOffset("Asia/Kolkata", "2026-03-15", "14:00")).toBe("+05:30");
  });
});

describe("buildStartsAt", () => {
  it("appends +00:00 when no timezone given", () => {
    expect(buildStartsAt("2026-03-21", "14:00")).toBe(
      "2026-03-21T14:00:00.000+00:00"
    );
  });

  it("appends correct offset for CET", () => {
    expect(buildStartsAt("2026-01-15", "14:00", "Europe/Prague")).toBe(
      "2026-01-15T14:00:00.000+01:00"
    );
  });

  it("appends correct offset for CEST", () => {
    expect(buildStartsAt("2026-07-15", "14:00", "Europe/Prague")).toBe(
      "2026-07-15T14:00:00.000+02:00"
    );
  });

  it("falls back to +00:00 for invalid timezone", () => {
    expect(buildStartsAt("2026-03-21", "14:00", "Invalid/Zone")).toBe(
      "2026-03-21T14:00:00.000+00:00"
    );
  });
});
