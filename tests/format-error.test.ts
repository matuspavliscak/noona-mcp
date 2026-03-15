import { describe, it, expect } from "vitest";
import { formatError } from "../src/resolve.js";

describe("formatError", () => {
  it("extracts message from Error", () => {
    expect(formatError(new Error("something broke"))).toBe("something broke");
  });

  it("extracts message from Axios-like error", () => {
    const error = Object.assign(new Error("Request failed"), {
      response: { status: 404, data: { message: "Not found" } },
    });
    expect(formatError(error)).toBe("Not found");
  });

  it("converts non-Error to string", () => {
    expect(formatError("raw string error")).toBe("raw string error");
    expect(formatError(42)).toBe("42");
  });

  it("handles null", () => {
    expect(formatError(null)).toBe("null");
  });
});
